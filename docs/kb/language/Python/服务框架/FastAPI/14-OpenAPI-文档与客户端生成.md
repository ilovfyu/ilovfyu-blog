---
title: "OpenAPI 文档与客户端生成"
permalink: /kb/language/Python/服务框架/FastAPI/14-OpenAPI-文档与客户端生成/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "测试与调试", link: /kb/language/Python/服务框架/FastAPI/13-测试与调试/ }
next: { text: "部署、容器、性能与生产实践", link: /kb/language/Python/服务框架/FastAPI/15-部署容器性能与生产实践/ }
knowledgeNote:
  series: "Language"
  group: "FastAPI"
---
> 基线：FastAPI 0.141.1，Python 3.10+，Pydantic v2。代理前缀见 [中间件 CORS 与反向代理](/kb/language/Python/服务框架/FastAPI/11-中间件-CORS-与反向代理/)，发布和版本锁定见 [部署容器性能与生产实践](/kb/language/Python/服务框架/FastAPI/15-部署容器性能与生产实践/)。

## 1. OpenAPI 是契约，Swagger UI 是查看器

FastAPI 根据路由、依赖、Pydantic 模型生成 OpenAPI 3.1 schema，默认在 `/openapi.json`；Swagger UI 默认 `/docs`，ReDoc 默认 `/redoc`。schema 才是 SDK、网关和契约测试的输入，文档页面只是消费它的前端。返回一个手工 `Response` 不会自动获得准确 schema，应通过 `response_model`、返回标注、`response_class` 和 `responses` 明确描述。

## 2. 完整可运行示例：metadata、operationId、responses、callback、webhook

```python
# main.py
from typing import Annotated, Any

from fastapi import APIRouter, Body, FastAPI, Header, status
from fastapi.openapi.utils import get_openapi
from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field


class Error(BaseModel):
    code: str
    message: str


class InvoiceIn(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [{"amount": "12.50", "callback_url": "https://client.example/hook"}]})
    amount: Annotated[str, Field(pattern=r"^\d+\.\d{2}$")]
    callback_url: AnyHttpUrl


class Invoice(BaseModel):
    id: str
    amount: str
    state: str


class PaymentEvent(BaseModel):
    invoice_id: str
    state: str


callback_router = APIRouter()


@callback_router.post("{$request.body#/callback_url}", operation_id="receivePaymentResult")
def payment_callback(body: PaymentEvent) -> None:
    """服务端未来会向客户提交的请求；此函数只用于生成契约，不会注册真实端点。"""


tags_metadata = [
    {"name": "invoices", "description": "发票创建与查询。"},
    {"name": "system", "description": "运行状态。"},
]

app = FastAPI(
    title="Billing API",
    summary="可生成 SDK 的计费接口",
    description="## 认证\n所有业务请求使用 `X-API-Key`。",
    version="1.4.0",
    terms_of_service="https://example.com/terms",
    contact={"name": "API Team", "url": "https://example.com/support", "email": "api@example.com"},
    license_info={"name": "Proprietary", "identifier": "LicenseRef-Proprietary"},
    openapi_tags=tags_metadata,
    servers=[{"url": "https://api.example.com/v1", "description": "Production"}],
    swagger_ui_parameters={"displayRequestDuration": True, "persistAuthorization": False},
)


@app.post(
    "/invoices",
    tags=["invoices"],
    operation_id="createInvoice",
    summary="创建发票",
    status_code=status.HTTP_201_CREATED,
    response_model=Invoice,
    responses={
        400: {"model": Error, "description": "业务参数错误"},
        409: {"model": Error, "description": "幂等键冲突"},
        201: {"headers": {"Location": {"schema": {"type": "string"}}}},
    },
    callbacks=callback_router.routes,
)
def create_invoice(
    body: InvoiceIn,
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key")],
) -> Invoice:
    return Invoice(id=f"inv-{idempotency_key}", amount=body.amount, state="pending")


@app.webhooks.post("payment-settled", operation_id="paymentSettled")
def payment_settled(body: PaymentEvent) -> None:
    """平台可能发给订阅者的 webhook 数据。URL 由订阅者另行登记。"""


@app.get("/health", tags=["system"], include_in_schema=False)
def health() -> dict[str, bool]:
    return {"ok": True}


def custom_openapi() -> dict[str, Any]:
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        openapi_version=app.openapi_version,
        summary=app.summary,
        description=app.description,
        terms_of_service=app.terms_of_service,
        contact=app.contact,
        license_info=app.license_info,
        routes=app.routes,
        webhooks=app.webhooks.routes,
        tags=app.openapi_tags,
        servers=app.servers,
        separate_input_output_schemas=app.separate_input_output_schemas,
        external_docs=app.openapi_external_docs,
    )
    schema["info"]["x-logo"] = {"url": "https://fastapi.tiangolo.com/img/logo-margin/logo-teal.png"}
    schema["x-api-id"] = "billing-public-v1"
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi
```

运行 `python -m pip install "fastapi[standard]==0.141.1"`、`fastapi dev main.py`，访问 `/docs` 与 `/openapi.json`。

### Callback 与 webhook 的区别

Callback 附着在某个操作上，表达“执行该操作后，服务端可能请求请求体中指定的 URL”，OpenAPI runtime expression 使用 JSON Pointer，例如 `{$request.body#/callback_url}` 指向请求体顶层的回调地址。Webhook 是 OpenAPI 3.1 顶层事件目录，不依附某次入站请求。二者都只生成文档，不会替你发送 HTTP、重试、签名或防 SSRF。

回调 URL 是用户输入时必须防 SSRF：只允许 HTTPS，解析并阻止 loopback、link-local、私网/云 metadata 地址，处理 DNS rebinding，限制重定向与响应大小。Webhook 应签名（时间戳 + 原始 body）、防重放、异步重试、幂等，并允许密钥轮换。

## 3. operationId 是 SDK 的函数名

默认 operationId 由函数名和路径组合生成，重构路由可能使 SDK 出现大面积破坏。公共 API 应显式设置稳定、全局唯一、语言友好的 camelCase 名。CI 中检查重复 operationId。也可在所有路由注册完后统一把 `APIRoute.name` 设为 ID，但函数名跨模块可能重复，必须验证。

`responses` 是对主响应的补充，可描述不同状态码、模型、媒体类型、headers 和 examples；它不会让运行时自动返回这些响应。实现、OpenAPI 和错误处理三者需契约测试保持一致。422 校验响应由 FastAPI自动加入；若自定义异常格式，也要覆盖 schema。

## 4. 自定义 schema 的正确姿势

调用 `get_openapi(...)`，只做小范围扩展，最后缓存到 `app.openapi_schema`。所有路由和 mount/include 完成后再生成。不要从零手写整个 schema，也不要每次请求重算。修改 Pydantic 模型 JSON Schema 优先使用 v2 `model_config = ConfigDict(json_schema_extra=...)` 或 `Field`。

OpenAPI 3.1 与 JSON Schema 2020-12 能表达 `null` 等新语义，但旧生成器可能不完全支持。SDK 工具报错时先升级工具，必要时通过专门的构建转换步骤降级，不要破坏线上真实 schema。将 `/openapi.json` 保存为构建产物做 breaking-change 检查，但用户要求的 vault 中不额外创建该产物。

## 5. docs URL、Swagger 配置与生产暴露

可以改路径或关闭：

```python
app = FastAPI(openapi_url="/api/openapi.json", docs_url="/api/docs", redoc_url=None)
# 全部关闭：FastAPI(openapi_url=None, docs_url=None, redoc_url=None)
```

`openapi_url=None` 会连带关闭 docs。隐藏 docs 不是访问控制，API 本身仍可探测；若 schema 含内部操作，生产应关闭或在网关做强认证/网络隔离。Swagger 的“Authorize”会在浏览器存放凭据，公共终端不要启用 `persistAuthorization`。OAuth redirect URL、CSP 和代理 `root_path` 要一起验证。

### 自托管 Swagger UI 资产

默认 UI 从 CDN 取 JS/CSS，离线、供应链控制或严格 CSP 场景应固定版本并自托管。先把 `swagger-ui-bundle.js`、`swagger-ui.css` 放进应用镜像的 `static/`，然后：

```python
from fastapi import FastAPI
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.staticfiles import StaticFiles

app = FastAPI(docs_url=None)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/docs", include_in_schema=False)
def docs():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - Swagger UI",
        swagger_js_url="/static/swagger-ui-bundle.js",
        swagger_css_url="/static/swagger-ui.css",
    )
```

这段需配套实际静态资产才可运行；资产版本与完整性应锁定，保留许可证。处于 `root_path` 下时，硬编码绝对 `/static` 可能绕过前缀，优先由部署环境验证并生成带前缀 URL。

## 6. SDK 生成与契约治理

FastAPI 官方推荐可使用 [Hey API](https://heyapi.dev/) 生成 TypeScript SDK；通用方案是 OpenAPI Generator：

```bash
curl -fsS http://127.0.0.1:8000/openapi.json -o openapi.json
npx @hey-api/openapi-ts -i openapi.json -o src/client
# 或：openapi-generator-cli generate -i openapi.json -g python -o generated/python
```

生成物应在 CI 基于固定 schema、固定 generator 版本重建。决定是否提交生成代码并保持团队一致；不要手改生成文件。发版流程建议：

1. lint OpenAPI，检查 operationId 唯一、示例可验证。
2. 与上个已发布 schema 做 breaking-change 检测：删除操作/字段、收紧输入、改变类型或状态码通常是破坏。
3. 生成 SDK，编译并跑一组 consumer contract test。
4. API 与 SDK 按语义化版本发布；弃用先加 `deprecated=True` 和迁移期，不直接删除。

OpenAPI 无法完整表达业务时序、分页一致性、幂等语义和最终一致性，需在 description 与独立指南说明。客户端超时、重试只对幂等操作安全；创建接口配合 Idempotency-Key。

## 7. 排错

- `/docs` 空白但 `/openapi.json` 正常：CDN/CSP/静态资源失败，查浏览器 Console。
- 代理前缀下 docs 请求错误路径：`root_path` 与剥前缀策略不一致。
- schema 生成时报 duplicate model/name：检查动态模型和同名类，保持稳定模块结构。
- SDK 方法名奇怪或变动：显式 operationId，并把 schema diff 纳入 CI。
- 实际返回未过滤：直接返回 `Response` 绕开了 response model；除非必要，返回模型对象。
- 自定义 `app.openapi` 递归：函数内调用 `get_openapi`，不要调用 `app.openapi()` 自己。

## 官方资料

- [Metadata and Docs URLs](https://fastapi.tiangolo.com/tutorial/metadata/)
- [Additional Responses](https://fastapi.tiangolo.com/advanced/additional-responses/)
- [OpenAPI Callbacks](https://fastapi.tiangolo.com/advanced/openapi-callbacks/)
- [OpenAPI Webhooks](https://fastapi.tiangolo.com/advanced/openapi-webhooks/)
- [Extending OpenAPI](https://fastapi.tiangolo.com/how-to/extending-openapi/)
- [Self-hosting Docs Assets](https://fastapi.tiangolo.com/how-to/custom-docs-ui-assets/)
- [Generating SDKs](https://fastapi.tiangolo.com/advanced/generate-clients/)
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)

## 导航

学习路线：[FastAPI 学习路线](/kb/language/Python/服务框架/FastAPI/00-FastAPI-学习路线/)  
上一篇：[测试与调试](/kb/language/Python/服务框架/FastAPI/13-测试与调试/)  
下一篇：[部署容器性能与生产实践](/kb/language/Python/服务框架/FastAPI/15-部署容器性能与生产实践/)
