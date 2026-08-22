---
title: "SQL 数据库与事务"
permalink: /kb/language/Python/服务框架/FastAPI/08-SQL-数据库与事务/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "安全认证与授权", link: /kb/language/Python/服务框架/FastAPI/07-安全认证与授权/ }
next: { text: "异步并发后台任务与生命周期", link: /kb/language/Python/服务框架/FastAPI/09-异步并发后台任务与生命周期/ }
knowledgeNote:
  series: "Language"
  group: "FastAPI"
---
> 基线：FastAPI 0.141.1、Python 3.10+、Pydantic v2、`Annotated`。数据库功能**不是 FastAPI 内建能力**；FastAPI 只通过依赖系统方便地交付 Session。可使用 SQLModel、SQLAlchemy、Django ORM 或其他客户端。

本篇以 FastAPI 官方 SQLModel 同步示例为起点。SQLModel 建立在 SQLAlchemy 和 Pydantic 之上，适合展示模型、Session 与响应校验。

## 1. 完整同步 CRUD

`main.py`：

```python
from contextlib import asynccontextmanager
from typing import Annotated, Iterator

from fastapi import Depends, FastAPI, HTTPException, Query
from pydantic import model_validator
from sqlmodel import Field, Session, SQLModel, create_engine, select


class HeroBase(SQLModel):
    name: str = Field(index=True, min_length=1, max_length=100)
    age: int | None = Field(default=None, ge=0)


class Hero(HeroBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    secret_name: str


class HeroCreate(HeroBase):
    secret_name: str


class HeroPublic(HeroBase):
    id: int


class HeroUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    age: int | None = Field(default=None, ge=0)
    secret_name: str | None = None

    @model_validator(mode="after")
    def reject_null_for_required_columns(self) -> "HeroUpdate":
        for field_name in ("name", "secret_name"):
            if field_name in self.model_fields_set and getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        return self


sqlite_url = "sqlite:///database.db"
engine = create_engine(
    sqlite_url,
    connect_args={"check_same_thread": False},
)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield
    engine.dispose()


app = FastAPI(lifespan=lifespan)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        try:
            yield session
        except Exception:
            session.rollback()
            raise


SessionDep = Annotated[Session, Depends(get_session)]


@app.post("/heroes", response_model=HeroPublic, status_code=201)
def create_hero(hero: HeroCreate, session: SessionDep) -> Hero:
    db_hero = Hero.model_validate(hero)
    session.add(db_hero)
    try:
        session.commit()
    except Exception:
        session.rollback()
        raise
    session.refresh(db_hero)
    return db_hero


@app.get("/heroes", response_model=list[HeroPublic])
def read_heroes(
    session: SessionDep,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[Hero]:
    return list(session.exec(select(Hero).offset(offset).limit(limit)).all())


@app.get("/heroes/{hero_id}", response_model=HeroPublic)
def read_hero(hero_id: int, session: SessionDep) -> Hero:
    hero = session.get(Hero, hero_id)
    if hero is None:
        raise HTTPException(status_code=404, detail="Hero not found")
    return hero


@app.patch("/heroes/{hero_id}", response_model=HeroPublic)
def update_hero(hero_id: int, patch: HeroUpdate, session: SessionDep) -> Hero:
    hero = session.get(Hero, hero_id)
    if hero is None:
        raise HTTPException(status_code=404, detail="Hero not found")
    hero.sqlmodel_update(patch.model_dump(exclude_unset=True))
    session.add(hero)
    try:
        session.commit()
    except Exception:
        session.rollback()
        raise
    session.refresh(hero)
    return hero


@app.delete("/heroes/{hero_id}", status_code=204)
def delete_hero(hero_id: int, session: SessionDep) -> None:
    hero = session.get(Hero, hero_id)
    if hero is None:
        raise HTTPException(status_code=404, detail="Hero not found")
    session.delete(hero)
    try:
        session.commit()
    except Exception:
        session.rollback()
        raise
```

运行：

```bash
python -m venv .venv
source .venv/bin/activate
pip install "fastapi==0.141.1" "uvicorn[standard]" "sqlmodel>=0.0.22"
uvicorn main:app --reload
```

## 2. Session 与事务机制

Session 是 identity map、变更跟踪和事务工作单元，不是数据库本身，也不是可跨请求共享的线程安全全局对象。`get_session()` 为每个请求创建并关闭 Session；依赖默认请求内缓存，所以同一路径的子依赖通常取得同一 Session。

- `add()` 只把对象加入工作单元，不保证已经写入数据库。
- `flush()` 把 SQL 发送到当前事务，可取得数据库生成值，但仍未提交。
- `commit()` 提交事务；约束冲突、断连等可能在此抛出异常。
- `refresh(obj)` 从数据库重读对象，取得生成的主键、默认值或触发器结果。
- `rollback()` 撤销当前事务，并让失败后的 Session 恢复可用状态。捕获提交异常后若不 rollback，后续操作会继续失败。
- `close()` 归还连接和清理 Session，不等于提交。不要依赖关闭时隐式处理业务事务。

示例让写端点明确决定事务边界，依赖只负责异常兜底和关闭。另一种“依赖在 `yield` 后统一 commit”会让提交发生在路径函数返回后，错误映射和多阶段业务控制更隐蔽；除非团队统一约定并充分测试，否则优先显式提交。

一个请求若需原子完成多项写入，只在全部成功后 commit 一次。不要在仓储函数中各自 commit，否则上层无法整体回滚。可用 `session.begin()` 表达事务块；并发更新还需数据库约束、适当隔离级别、行锁或乐观版本字段，不能靠 Python 先查后写保证唯一性。

## 3. SQLite 的边界

SQLite 默认驱动检查连接只在创建它的线程使用，而同步 FastAPI 端点和依赖可能在线程池的不同线程执行，因此官方示例设置 `check_same_thread=False`。这只关闭驱动检查，不会让一个 Session 可以并发共享；仍需每请求一个 Session。

SQLite 适合本地、测试和低写入量单机应用，但写并发、锁、类型语义与 PostgreSQL 不同。生产目标是 PostgreSQL 时，应在 CI 中至少运行 PostgreSQL 集成测试，避免只在 SQLite 通过。

## 4. Async SQLAlchemy：不要混搭

同步 Session/驱动会阻塞，因此同步数据库代码放在普通 `def` 路径操作，由 FastAPI 在线程池执行。若采用 SQLAlchemy async，必须整条链路都异步：async driver、`create_async_engine`、`async_sessionmaker`、`AsyncSession` 和 `await session.execute/commit/refresh`。

```python
from collections.abc import AsyncIterator

from fastapi import Depends
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

async_engine = create_async_engine(
    "postgresql+asyncpg://app:password@localhost/app",
    pool_pre_ping=True,
)
SessionFactory = async_sessionmaker(async_engine, expire_on_commit=False)


async def get_async_session() -> AsyncIterator[AsyncSession]:
    async with SessionFactory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


AsyncSessionDep = Annotated[AsyncSession, Depends(get_async_session)]
```

async 不保证更快，只是在驱动真正非阻塞时提高 I/O 并发。不要在 `async def` 中调用同步 SQLAlchemy，否则会阻塞事件循环；也不要把 `AsyncSession` 给多个并发 task 同时使用。连接池上限还必须小于数据库承载能力，并乘以 worker 数量评估总连接数。

## 5. 迁移与生产

`SQLModel.metadata.create_all()` 不会修改已有列、可靠地重命名字段或维护版本，只适合教程和简单初始化。生产使用 Alembic：模型变更后生成 revision、人工检查 SQL、在部署流程中单独执行升级，并准备备份与回滚方案。不要让每个 Web worker 启动时竞争执行迁移。

生产建议还包括：

- 数据库 URL 由环境/secret manager 注入，不写进仓库；账号采用最小权限。
- 设置连接超时、statement timeout、pool size、`pool_pre_ping`，监控池等待和慢查询。
- 用唯一约束、外键和非空约束维护最终一致性，并把可预期的完整性异常转换为 409 等稳定 API 错误。
- 列表接口必须分页；防止 N+1 查询，按需使用 eager loading。
- 响应使用独立公共模型，避免 `secret_name` 等内部字段泄露。

## 6. 测试隔离

下面使用独立内存 SQLite engine，并通过 override 替换依赖。`StaticPool` 让多个 Session 看到同一个内存数据库：

```python
from collections.abc import Iterator

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from main import app, get_session

test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SQLModel.metadata.create_all(test_engine)


def test_session() -> Iterator[Session]:
    with Session(test_engine) as session:
        yield session


def test_create_hero() -> None:
    app.dependency_overrides[get_session] = test_session
    try:
        # 不进入主应用 lifespan，避免它初始化生产 engine；本测试没有其他启动依赖。
        client = TestClient(app)
        response = client.post(
            "/heroes",
            json={"name": "Deadpond", "secret_name": "Dive Wilson"},
        )
        assert response.status_code == 201
        assert response.json()["name"] == "Deadpond"
        assert "secret_name" not in response.json()
    finally:
        app.dependency_overrides.clear()
        SQLModel.metadata.drop_all(test_engine)
```

更强的隔离方式是每个测试新建 schema/database，或开启外层事务并在测试后 rollback；但应用代码自行 commit 时，测试 fixture 需通过 savepoint 正确承接。并行测试必须使用不同数据库。依赖 teardown 机制见 [依赖注入系统](/kb/language/Python/服务框架/FastAPI/06-依赖注入系统/)，生命周期与池关闭见 [异步并发后台任务与生命周期](/kb/language/Python/服务框架/FastAPI/09-异步并发后台任务与生命周期/)。

## 官方资料

- [FastAPI SQL databases](https://fastapi.tiangolo.com/tutorial/sql-databases/)
- [SQLModel FastAPI session dependency](https://sqlmodel.tiangolo.com/tutorial/fastapi/session-with-dependency/)
- [SQLAlchemy Session basics](https://docs.sqlalchemy.org/en/20/orm/session_basics.html)
- [SQLAlchemy asyncio](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [Alembic](https://alembic.sqlalchemy.org/en/latest/)

## 导航

学习路线：[FastAPI 学习路线](/kb/language/Python/服务框架/FastAPI/00-FastAPI-学习路线/)  
上一篇：[安全认证与授权](/kb/language/Python/服务框架/FastAPI/07-安全认证与授权/)  
下一篇：[异步并发后台任务与生命周期](/kb/language/Python/服务框架/FastAPI/09-异步并发后台任务与生命周期/)
