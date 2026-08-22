---
title: "第 12 章：模块、require 与受控环境"
permalink: /kb/language/Lua/语法教程/12-模块-require-与受控环境/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "第 11 章：标准库实用指南", link: /kb/language/Lua/语法教程/11-标准库实用指南/ }
next: { text: "第 13 章：垃圾回收、弱表与终结器", link: /kb/language/Lua/语法教程/13-垃圾回收弱表与终结器/ }
knowledgeNote:
  series: "Language"
  group: "语法教程"
---
## 模块就是返回值

现代 Lua 模块通常在文件中创建 local table 并 return，不向 `_G` 写入模块名。

```lua
-- geometry.lua
local M = {}

function M.area(width, height)
  assert(width >= 0 and height >= 0, "dimensions must be non-negative")
  return width * height
end

return M
```

使用：

```lua
local geometry = require("geometry")
print(geometry.area(3, 4))
```

模块内部函数和状态保持 local，只把稳定 API 放进返回表。不要使用 Lua 5.1 时代的 `module(...)`，现代标准库已无该函数。

## require 流程

`require(modname)` 大致执行：

1. 检查 `package.loaded[modname]`；已有真值则直接返回。
2. 依次调用 `package.searchers` 寻找 loader。
3. 调用 loader，参数包含模块名和搜索器提供的数据。
4. loader 返回非 nil 时存入 `package.loaded[modname]`。
5. 若最终缓存仍为 nil，写入 true。
6. 返回缓存值以及 loader data。

因此 require 默认只加载一次。测试热重载可清除 `package.loaded[name]`，但已有代码持有的旧模块引用不会自动更新；生产热更新需明确状态迁移协议。

## 搜索路径

Lua 文件由 `package.path` 模板查找，C 模块由 `package.cpath` 查找。`?` 替换为模块名转换后的路径。环境变量 `LUA_PATH_5_5`、`LUA_CPATH_5_5` 优先于无版本后缀变量；`;;` 可插入默认路径。

查看候选文件：

```lua
local path, err = package.searchpath("app.geometry", package.path)
print(path or err)
```

不要为了“修复模块找不到”在库中全局覆盖 `package.path`。入口程序可基于部署目录明确配置；更稳妥的是由构建/启动环境设置。

## 模块状态与依赖注入

模块顶层 local 在 require 缓存周期内形成单例状态：

```lua
local function new_counter()
  local value = 0
  return {
    next = function()
      value = value + 1
      return value
    end,
  }
end

return {new = new_counter}
```

优先导出 constructor，而不是让所有调用方共享隐藏可变状态。依赖可作为参数传入，便于测试和嵌入不同宿主。

## 循环依赖

A require B、B require A 时，初始化顺序和 `package.loaded` 中间状态会让 API 缺失或重复加载。解决方式：

- 提取共同接口到第三个模块。
- 让依赖方向单向。
- 延迟到函数调用时获取依赖，但仍需防止架构环。
- 在少数框架场景先放占位 table 到 `package.loaded`，并明确半初始化状态。

最后一种方式复杂，不应作为默认方案。

## load 与环境

`load(chunk, name, mode, env)` 可为动态 chunk 指定 `_ENV`：

```lua
local safe_math = {
  abs = math.abs,
  floor = math.floor,
  max = math.max,
  min = math.min,
}

local env = {math = safe_math}
local fn, err = load("return math.max(2, 5)", "policy", "t", env)
assert(fn, err)
print(fn())
```

白名单应复制允许函数，而不是把完整 `math`、`_G` 等表原样暴露后再尝试删除字段。若暴露可变对象，动态代码可能修改宿主共享状态。

## 受控环境不是完整安全沙箱

仅限制 `_ENV` 不能自动限制 CPU、内存、栈、死循环、宿主 userdata、C 函数副作用或二进制 chunk。真正运行不可信代码还需要：

- 只允许文本 chunk。
- 最小能力白名单，不暴露 debug、io、os、package、require、load。
- 宿主级内存分配限制。
- debug hook 或宿主机制限制指令/时间。
- 进程或系统级隔离处理崩溃和原生扩展风险。

安全边界最终由嵌入宿主设计，而不是 `_ENV` 单独提供。

## Lua 5.5 global 对模块的帮助

模块可在文件开头显式声明只读标准全局，捕获拼写错误：

```lua
global&lt;const&gt; assert, math, require, string, table

local M = {}
-- 模块实现
return M
```

这是 5.5-only 语法。若库要同时支持 5.4，不能直接使用。

## 常见错误

- 模块把 API 和内部状态全部写入 `_G`。
- 在库加载时修改全局 `package.path`。
- 以为清除 `package.loaded` 会替换所有旧引用。
- 忽略循环依赖造成的半初始化状态。
- 把完整 `_G` 暴露给“受限”代码。
- 加载不可信二进制 chunk。
- 把 `_ENV` 白名单误称为可抵御恶意代码的完整沙箱。

## 练习

1. 把全局工具函数重构成返回 table 的模块。
2. 设计 constructor 模块，避免 require 级共享可变状态。
3. 用 load 环境只开放 `math.abs` 和一个输入值。
4. 画出三个模块的单向依赖，消除原有循环 require。

## 导航与资料

- 上一章：[标准库实用指南](/kb/language/Lua/语法教程/11-标准库实用指南/)
- 下一章：[垃圾回收弱表与终结器](/kb/language/Lua/语法教程/13-垃圾回收弱表与终结器/)
- [官方手册：Modules](https://www.lua.org/manual/5.5/manual.html#6.4)
- [官方手册：load](https://www.lua.org/manual/5.5/manual.html#pdf-load)
