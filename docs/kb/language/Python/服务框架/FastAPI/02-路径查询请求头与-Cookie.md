---
title: "路径查询请求头与 Cookie"
permalink: /kb/language/Python/服务框架/FastAPI/02-路径查询请求头与-Cookie/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "FastAPI 架构与第一个应用", link: /kb/language/Python/服务框架/FastAPI/01-FastAPI-架构与第一个应用/ }
next: { text: "请求体与 Pydantic v2", link: /kb/language/Python/服务框架/FastAPI/03-请求体与-Pydantic-v2/ }
knowledgeNote:
  series: "Language"
  group: "FastAPI"
---
> 基线：FastAPI 0.141.1（2026-07-29 latest）、Python 3.10+、Pydantic v2。

FastAPI 根据函数签名判断参数来源：路径模板中的同名参数来自 path；普通标量通常来自 query；`Header()` 和 `Cookie()` 则显式声明请求头和 Cookie。现代写法优先使用 `Annotated`，相关参数还可组合成 Pydantic 参数模型。

## 1. 参数来源与执行机制

```python
from typing import Annotated

from fastapi import Cookie, Header, Path, Query
```

| 声明方式 | HTTP 来源 | 示例 |
|---|---|---|
| 路径模板同名参数 | URL path | `/items/{item_id}` |
| `Annotated[T, Query(...)]` | 查询字符串 | `?limit=20` |
| `Annotated[T, Header(...)]` | 请求头 | `X-Trace-Id: abc` |
| `Annotated[T, Cookie(...)]` | Cookie 请求头中的键值 | `session_id=abc` |

FastAPI 先从指定位置提取原始字符串，再通过 Pydantic Core 转换和校验。如果转换失败，路径操作不会执行，框架返回 `422`。例如 `/items/not-an-int` 无法转换为 `int`。

## 2. 路径参数

```python
item_id: Annotated[int, Path(gt=0, description="正整数商品 ID")]
```

`Path()` 常用约束包括：

- 数值：`gt`、`ge`、`lt`、`le`、`multiple_of`。
- 文本：`min_length`、`max_length`、`pattern`。
- 文档：`title`、`description`、`deprecated`、`examples`。

路径参数永远是必填项，即使尝试给 `Path` 设置默认值也没有“省略 URL 片段”的含义。如果资源标识可能不存在，应在业务查询后返回 `404`，而不是把路径参数做成可选。

固定路径必须放在动态路径之前：

```python
@app.get("/users/me")
async def read_me(): ...

@app.get("/users/{user_id}")
async def read_user(user_id: str): ...
```

枚举适合限定路径值，并会进入 OpenAPI：

```python
from enum import Enum

class ModelName(str, Enum):
    alexnet = "alexnet"
    resnet = "resnet"
```

## 3. 查询参数

查询参数通常有三种状态：

```python
# 必填
q: Annotated[str, Query(min_length=1)]

# 可选，缺省为 None
q: Annotated[str | None, Query(min_length=1)] = None

# 有默认值
limit: Annotated[int, Query(ge=1, le=100)] = 20
```

“允许 `None`”和“可以省略”不是同一概念。`str | None` 描述值域，而是否存在默认值决定调用时是否必填。

重复查询键可解析为列表：

```python
tags: Annotated[list[str], Query()] = []
```

请求 `/items?tags=python&tags=api` 得到 `['python', 'api']`。不要依赖逗号自动拆分，`?tags=python,api` 默认只是一个字符串。

别名用于对外名称与 Python 标识符不一致的场景：

```python
order_by: Annotated[str, Query(alias="order-by")] = "created_at"
```

## 4. Query 参数模型与禁止额外参数

当分页、筛选参数成组出现时，可使用 Pydantic 模型。`extra="forbid"` 会拒绝拼错或未声明的查询键，避免客户端以为某个过滤条件已经生效。

```python
from typing import Annotated, Literal

from fastapi import Query
from pydantic import BaseModel, ConfigDict, Field


class FilterParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    limit: int = Field(20, gt=0, le=100)
    offset: int = Field(0, ge=0)
    order_by: Literal["created_at", "updated_at"] = "created_at"
    tags: list[str] = []


@app.get("/products")
async def list_products(
    filters: Annotated[FilterParams, Query()],
):
    return filters
```

例如 `?limti=10` 会因额外字段被拒绝。参数模型适合一组同来源参数；不要把请求体模型误标为 `Query()`。

## 5. 请求头

HTTP 请求头名称不区分大小写。FastAPI 默认把参数名中的下划线转换为连字符：

```python
user_agent: Annotated[str | None, Header()] = None
```

它读取 `User-Agent`。自定义请求头推荐使用明确别名：

```python
trace_id: Annotated[str, Header(alias="X-Trace-Id")]
```

重复请求头可声明为 `list[str]`。代理对重复头的合并行为可能不同，公开协议需要明确约定。

### Header 参数模型

```python
class CommonHeaders(BaseModel):
    model_config = ConfigDict(extra="forbid")

    host: str
    save_data: bool
    if_modified_since: str | None = None
    traceparent: str | None = None


@app.get("/inspect-headers")
async def inspect_headers(
    headers: Annotated[CommonHeaders, Header()],
):
    return headers
```

Header 模型默认也会把字段下划线映射为连字符。若外部协议真的使用下划线，可写 `Header(convert_underscores=False)`，但部分代理会拒绝或改写含下划线的请求头，应谨慎使用。

对 Header 模型设置 `extra="forbid"` 很严格：浏览器、代理和 ASGI 服务器通常会附加 `Accept`、`User-Agent` 等请求头。只有在完全受控客户端、模型覆盖所有允许头时才适合启用；普通公网接口通常不应禁止所有额外请求头。

## 6. Cookie

Cookie 是客户端通过 `Cookie` 请求头回传的键值。读取 Cookie：

```python
session_id: Annotated[str | None, Cookie()] = None
```

使用模型可以集中声明：

```python
class SessionCookies(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    csrftoken: str | None = None


@app.get("/session")
async def read_session(
    cookies: Annotated[SessionCookies, Cookie()],
):
    return {"session_id": cookies.session_id}
```

Cookie 参数用于**读取** Cookie。设置 Cookie 需要响应对象的 `set_cookie()`，见 [响应模型错误与状态码](/kb/language/Python/服务框架/FastAPI/05-响应模型错误与状态码/)。

边界与安全注意事项：

- Cookie 不天然等于安全会话；签名、加密、存储和撤销策略需要应用自行实现。
- 浏览器是否发送 Cookie 受 `Domain`、`Path`、`Secure`、`HttpOnly`、`SameSite` 和跨域策略影响。
- Cookie 模型使用 `extra="forbid"` 时，来自同域的其他 Cookie 也会导致 `422`；共享域场景往往不适用。
- 不要把敏感 Cookie 值写入日志或响应体。

## 7. 完整可运行示例

以下 `main.py` 同时演示 path、query 模型、header 模型和 cookie 模型：

```python
from typing import Annotated, Literal

from fastapi import Cookie, FastAPI, Header, Path, Query
from pydantic import BaseModel, ConfigDict, Field


app = FastAPI(title="请求参数 API")


class FilterParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    limit: int = Field(20, gt=0, le=100)
    offset: int = Field(0, ge=0)
    order_by: Literal["created_at", "updated_at"] = "created_at"
    tags: list[str] = []


class ClientHeaders(BaseModel):
    # 示例只约束模型声明的字段，不禁止浏览器附加的其他请求头。
    x_trace_id: str = Field(alias="X-Trace-Id")
    user_agent: str | None = Field(default=None, alias="User-Agent")


class SessionCookies(BaseModel):
    session_id: str
    theme: Literal["light", "dark"] = "light"


@app.get("/items/{item_id}")
async def read_item(
    item_id: Annotated[int, Path(gt=0, le=1_000_000)],
    filters: Annotated[FilterParams, Query()],
    headers: Annotated[ClientHeaders, Header()],
    cookies: Annotated[SessionCookies, Cookie()],
) -> dict[str, object]:
    return {
        "item_id": item_id,
        "filters": filters.model_dump(),
        "trace_id": headers.x_trace_id,
        "user_agent": headers.user_agent,
        "session_id": cookies.session_id,
        "theme": cookies.theme,
    }
```

安装并启动：

```bash
uv add "fastapi[standard]"
fastapi dev
```

测试：

```bash
curl \
  -H 'X-Trace-Id: trace-001' \
  -H 'Cookie: session_id=s-123; theme=dark' \
  'http://127.0.0.1:8000/items/42?limit=10&tags=python&tags=api'
```

测试拒绝未知 query 参数：

```bash
curl \
  -H 'X-Trace-Id: trace-001' \
  -H 'Cookie: session_id=s-123' \
  'http://127.0.0.1:8000/items/42?limti=10'
```

## 8. 常见错误

### 把 query 参数放进请求体

`GET` 筛选通常应使用 query。显式声明 Pydantic `BaseModel` 而不加 `Query()`，FastAPI 可能把它视作 body，导致客户端和 OpenAPI 与预期不符。

### 忘记 Query 模型的 `extra="forbid"`

默认情况下未知键可能被忽略。对于严格筛选 API，拼写错误会静默失效；使用 `ConfigDict(extra="forbid")` 可以尽早暴露问题。

### 对 Header/Cookie 盲目禁止额外字段

真实请求常有框架、浏览器或代理附加的数据。严格模式只适合可控协议，否则正常请求也可能被拒绝。

### 把 Cookie 当作响应参数设置

`Cookie()` 只读取请求。设置时应调用 `Response.set_cookie()`。

### 可变默认值的误解

Pydantic 会处理模型字段的可变默认值，但通用 Python 函数仍应避免 `items=[]` 这类共享默认对象。希望意图最明确时可用 `Field(default_factory=list)`。

## 9. 最佳实践

- 使用 `Annotated` 把 Python 类型和 FastAPI 参数元数据分离。
- 为公开查询接口设置数值边界、文本长度和明确默认值。
- 成组参数使用参数模型；外部协议需要严格时设置 `ConfigDict(extra="forbid")`。
- Header 使用标准名称或显式 `alias`，不要随意依赖下划线头。
- Cookie 只承载不可避免的标识，配合 HTTPS、`Secure`、`HttpOnly` 和合适的 `SameSite`。
- 在 `/docs` 中核对参数位于 path、query、header 还是 cookie。

## 10. 官方资料

- [路径参数](https://fastapi.tiangolo.com/tutorial/path-params/)
- [路径参数与数值校验](https://fastapi.tiangolo.com/tutorial/path-params-numeric-validations/)
- [查询参数](https://fastapi.tiangolo.com/tutorial/query-params/)
- [查询参数模型](https://fastapi.tiangolo.com/tutorial/query-param-models/)
- [Header 参数](https://fastapi.tiangolo.com/tutorial/header-params/)
- [Header 参数模型](https://fastapi.tiangolo.com/tutorial/header-param-models/)
- [Cookie 参数](https://fastapi.tiangolo.com/tutorial/cookie-params/)
- [Cookie 参数模型](https://fastapi.tiangolo.com/tutorial/cookie-param-models/)

## 导航

学习路线：[FastAPI 学习路线](/kb/language/Python/服务框架/FastAPI/00-FastAPI-学习路线/)  
上一篇：[FastAPI 架构与第一个应用](/kb/language/Python/服务框架/FastAPI/01-FastAPI-架构与第一个应用/)  
下一篇：[请求体与 Pydantic v2](/kb/language/Python/服务框架/FastAPI/03-请求体与-Pydantic-v2/)
