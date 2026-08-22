---
title: "请求体与 Pydantic v2"
permalink: /kb/language/Python/服务框架/FastAPI/03-请求体与-Pydantic-v2/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "路径查询请求头与 Cookie", link: /kb/language/Python/服务框架/FastAPI/02-路径查询请求头与-Cookie/ }
next: { text: "表单与文件上传", link: /kb/language/Python/服务框架/FastAPI/04-表单与文件上传/ }
knowledgeNote:
  series: "Language"
  group: "FastAPI"
---
> 基线：FastAPI 0.141.1（2026-07-29 latest）、Python 3.10+、Pydantic v2。

请求体通常承载结构化 JSON。FastAPI 根据 Pydantic v2 模型解析输入、执行校验、生成 JSON Schema，并把验证后的模型交给路径操作函数。本篇覆盖嵌套模型、`Field`、`ConfigDict`、`json_schema_extra`、`model_dump()`、`model_copy()` 和正确的 PATCH 更新策略。

## 1. 请求体如何被识别

```python
from pydantic import BaseModel


class ItemCreate(BaseModel):
    name: str
    price: float


@app.post("/items")
async def create_item(item: ItemCreate):
    return item
```

`item` 是 Pydantic 模型，因此 FastAPI 默认把它识别为 JSON body。处理链路是：

1. Starlette 异步读取请求体。
2. JSON 解析器把字节转换成 Python 对象。
3. Pydantic Core 根据模型校验并转换。
4. FastAPI 将 `ItemCreate` 实例传给函数。
5. 模型 JSON Schema 被加入 OpenAPI。

客户端应发送 `Content-Type: application/json`。格式损坏、类型不匹配或约束失败通常返回 `422`，业务函数不会执行。

HTTP 规范并未绝对禁止 `GET` body，但中间代理、客户端和 OpenAPI 工具支持不一致。查询操作应优先使用 query，创建和复杂命令使用 `POST`/`PUT`/`PATCH` body。

## 2. `Field`：字段约束与文档

```python
from typing import Annotated

from pydantic import Field


name: Annotated[
    str,
    Field(min_length=1, max_length=100, description="商品名称"),
]
```

`Field` 同时影响运行时校验和 JSON Schema。常用配置：

- 数值约束：`gt`、`ge`、`lt`、`le`、`multiple_of`。
- 字符串约束：`min_length`、`max_length`、`pattern`。
- 默认工厂：`default_factory=list`。
- 文档信息：`title`、`description`、`examples`、`deprecated`。
- 序列化：`exclude`、`alias` 等，应明确区分输入和输出契约。

Pydantic 模型字段也推荐 `Annotated`，特别是需要多个元数据时。必须注意：静态类型检查器主要从赋值形式识别默认值；复杂默认值仍可使用 `field: T = Field(default=...)`。

## 3. 嵌套模型

```python
from pydantic import BaseModel, Field, HttpUrl


class Image(BaseModel):
    url: HttpUrl
    alt: str = ""


class ItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    price: float = Field(gt=0)
    tags: set[str] = Field(default_factory=set)
    images: list[Image] = Field(default_factory=list)
```

- 嵌套数据会递归校验；错误位置会包含完整路径，例如 `body.images.0.url`。
- `set[str]` 可去重，但 JSON 输出仍会变成数组，顺序不是业务契约。
- `HttpUrl` 是 Pydantic 类型，不会发起网络请求验证地址是否真实存在。
- 大量深层嵌套会增加验证成本和错误复杂度，API 模型应围绕实际用例设计，而非完整复制数据库对象图。

多个 body 参数默认会以参数名嵌入 JSON：

```python
@app.put("/items/{item_id}")
async def update_item(item_id: int, item: ItemCreate, importance: int):
    ...
```

这里 `importance` 是普通标量，默认被视为 query。要让它进入 body，应显式使用 `Body()`：

```python
from fastapi import Body

importance: Annotated[int, Body(gt=0)]
```

请求体将形如 `{"item": {...}, "importance": 5}`。

## 4. `ConfigDict` 与模型级策略

Pydantic v2 使用 `model_config = ConfigDict(...)`，取代 v1 风格的内部 `Config` 类：

```python
from pydantic import BaseModel, ConfigDict


class ItemCreate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

    name: str
    price: float
```

常见选项：

- `extra="forbid"`：拒绝模型未声明字段，适合严格写入 API。
- `extra="ignore"`：忽略未知字段，是常见默认行为，但可能掩盖拼写错误。
- `str_strip_whitespace=True`：统一去除字符串首尾空白。
- `from_attributes=True`：允许从对象属性构建模型，常用于 ORM/领域对象输出；它不负责数据库查询。
- `populate_by_name=True`：存在别名时也允许按字段名填充，使用前应明确输入契约。

禁止额外字段可能影响 API 演进：客户端提前发送服务端尚未认识的新字段会被拒绝。写入端通常值得严格，兼容性要求高的事件或代理接口则需权衡。

## 5. `json_schema_extra`：丰富 OpenAPI 示例

模型级示例：

```python
class ItemCreate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "name": "Mechanical Keyboard",
                    "price": 699.0,
                    "tags": ["keyboard", "wireless"],
                    "images": [],
                }
            ]
        },
    )
```

`json_schema_extra` 只扩展 JSON Schema/OpenAPI 元数据，不参与业务校验，也不会成为运行时默认值。字段级示例可通过 `Field(examples=[...])` 添加；特定路径操作的请求示例也可通过 `Body(openapi_examples=...)` 声明。

## 6. Pydantic v2 的导出与复制

### `model_dump()`

```python
data = item.model_dump()
```

它替代 Pydantic v1 的 `.dict()`。常用参数：

- `exclude_unset=True`：只导出客户端明确提供的字段，是 PATCH 的关键。
- `exclude_none=True`：排除值为 `None` 的字段，但不区分“未提供”与“明确提供 null”。
- `exclude_defaults=True`：排除等于默认值的字段。
- `mode="json"`：生成 JSON 兼容值，例如把日期转换为字符串；仍然返回 Python 对象。

### `model_copy()`

```python
updated = stored.model_copy(update={"price": 799.0})
```

它替代 `.copy()`。重要边界：`model_copy(update=...)` 信任更新数据，**不会重新校验更新值**。如果更新字典来自已经校验过的 PATCH 模型，通常可控；如果更新包含程序拼装或不可信值，应使用完整合并数据重新验证：

```python
merged = stored.model_dump()
merged.update(untrusted_update)
updated = Item.model_validate(merged)
```

## 7. PUT 与 PATCH

- `PUT` 通常表示用完整表示替换资源。省略字段可能恢复默认值。
- `PATCH` 表示部分更新，只修改客户端明确提交的字段。

不要用完整创建模型直接处理 PATCH，否则无法区分“字段未发送”和“字段发送了默认值”。应定义所有字段都有默认值的更新模型，然后使用 `exclude_unset=True`。

对于可空字段：

```python
description: str | None = None
```

- 未发送：不更新。
- 发送 `"description": null`：明确清空。

`exclude_none=True` 会破坏这个区别，所以 PATCH 通常使用 `exclude_unset=True`，而不是盲目排除 `None`。

## 8. 完整可运行示例

下面的 `main.py` 是一个内存 CRUD 示例，覆盖嵌套模型、严格输入、Schema 示例、PUT、PATCH、`model_dump()` 和 `model_copy()`：

```python
from typing import Annotated

from fastapi import Body, FastAPI, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator


app = FastAPI(title="Pydantic v2 商品 API")


class Image(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: HttpUrl
    alt: str = Field(default="", max_length=200)


class ItemBase(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        json_schema_extra={
            "examples": [
                {
                    "name": "Mechanical Keyboard",
                    "description": "75% layout",
                    "price": 699.0,
                    "tags": ["keyboard", "wireless"],
                    "images": [
                        {
                            "url": "https://example.com/keyboard.jpg",
                            "alt": "Keyboard",
                        }
                    ],
                }
            ]
        },
    )

    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    price: float = Field(gt=0, allow_inf_nan=False)
    tags: set[str] = Field(default_factory=set, max_length=20)
    images: list[Image] = Field(default_factory=list, max_length=10)


class ItemCreate(ItemBase):
    pass


class ItemPatch(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    price: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    tags: set[str] | None = Field(default=None, max_length=20)
    images: list[Image] | None = Field(default=None, max_length=10)

    @model_validator(mode="after")
    def reject_null_for_non_nullable_fields(self) -> "ItemPatch":
        for field_name in ("name", "price", "tags", "images"):
            if field_name in self.model_fields_set and getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        return self


class Item(ItemBase):
    id: int


DB: dict[int, Item] = {}


@app.post("/items", response_model=Item, status_code=status.HTTP_201_CREATED)
async def create_item(
    payload: Annotated[ItemCreate, Body()],
) -> Item:
    item_id = max(DB, default=0) + 1
    item = Item(id=item_id, **payload.model_dump())
    DB[item_id] = item
    return item


@app.get("/items/{item_id}", response_model=Item)
async def read_item(item_id: int) -> Item:
    if item_id not in DB:
        raise HTTPException(status_code=404, detail="Item not found")
    return DB[item_id]


@app.put("/items/{item_id}", response_model=Item)
async def replace_item(item_id: int, payload: ItemCreate) -> Item:
    if item_id not in DB:
        raise HTTPException(status_code=404, detail="Item not found")
    item = Item(id=item_id, **payload.model_dump())
    DB[item_id] = item
    return item


@app.patch("/items/{item_id}", response_model=Item)
async def patch_item(item_id: int, payload: ItemPatch) -> Item:
    stored = DB.get(item_id)
    if stored is None:
        raise HTTPException(status_code=404, detail="Item not found")

    changes = payload.model_dump(exclude_unset=True)
    # changes 已由 ItemPatch 校验；随后用 Item 再验证合并后的整体状态。
    merged = stored.model_dump()
    merged.update(changes)
    updated = Item.model_validate(merged)

    # 若确定 changes 已验证且不存在跨字段约束，也可写：
    # updated = stored.model_copy(update=changes)
    DB[item_id] = updated
    return updated
```

运行：

```bash
uv add "fastapi[standard]"
fastapi dev
```

创建并部分更新：

```bash
curl -X POST 'http://127.0.0.1:8000/items' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Keyboard","price":699,"tags":["wireless"]}'

curl -X PATCH 'http://127.0.0.1:8000/items/1' \
  -H 'Content-Type: application/json' \
  -d '{"description":null,"price":649}'
```

内存字典仅用于演示，进程重启后数据丢失，多 worker 之间也不共享。持久化、一致性和事务属于数据库及应用架构边界，不由 FastAPI 自动解决。

## 9. 常见错误

### 沿用 Pydantic v1 API

在 v2 中优先使用 `model_dump()`、`model_copy()`、`model_validate()` 和 `ConfigDict`，不要在新代码中继续以 `.dict()`、`.copy()`、`.parse_obj()` 或内部 `Config` 类为主。

### PATCH 使用普通 `model_dump()`

它会包含默认值，使未提交字段也被覆盖。部分更新应使用 `exclude_unset=True`。

### PATCH 使用 `exclude_none=True`

这会让客户端无法通过显式 `null` 清空字段。是否忽略 `None` 必须由业务语义决定。

### 认为 `model_copy(update=...)` 会校验

更新值不会自动重新验证。对不可信更新数据调用 `Item.model_validate()` 验证合并结果。

### 输入与持久化模型完全复用

数据库 ID、审计字段、密码哈希等不应由创建请求自由写入。分别定义 Create、Patch、Public/Response 模型，避免越权赋值与信息泄露。

## 10. 最佳实践

- 对写入模型使用 `extra="forbid"`，让拼写错误尽早失败。
- 输入模型、部分更新模型和公开输出模型按职责分离。
- 用嵌套模型表达真实结构，不用无约束 `dict[str, object]` 逃避契约。
- PATCH 通过 `exclude_unset=True` 保留“未发送”和“发送 null”的区别。
- 跨字段或合并后约束应验证最终完整模型。
- Schema 示例只用于文档；自动化测试才验证真实行为。

## 11. 官方资料

- [请求体](https://fastapi.tiangolo.com/tutorial/body/)
- [请求体字段](https://fastapi.tiangolo.com/tutorial/body-fields/)
- [嵌套模型](https://fastapi.tiangolo.com/tutorial/body-nested-models/)
- [更新数据](https://fastapi.tiangolo.com/tutorial/body-updates/)
- [Schema 额外信息](https://fastapi.tiangolo.com/tutorial/schema-extra-example/)
- [Pydantic Models](https://docs.pydantic.dev/latest/concepts/models/)
- [Pydantic Fields](https://docs.pydantic.dev/latest/concepts/fields/)
- [Pydantic Configuration](https://docs.pydantic.dev/latest/concepts/config/)
- [Pydantic Serialization](https://docs.pydantic.dev/latest/concepts/serialization/)

## 导航

学习路线：[FastAPI 学习路线](/kb/language/Python/服务框架/FastAPI/00-FastAPI-学习路线/)  
上一篇：[路径查询请求头与 Cookie](/kb/language/Python/服务框架/FastAPI/02-路径查询请求头与-Cookie/)  
下一篇：[表单与文件上传](/kb/language/Python/服务框架/FastAPI/04-表单与文件上传/)
