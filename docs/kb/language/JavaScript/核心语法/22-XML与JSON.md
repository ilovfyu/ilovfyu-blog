---
title: "XML 与 JSON"
permalink: /kb/language/JavaScript/核心语法/22-XML与JSON/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "错误处理与调试", link: /kb/language/JavaScript/核心语法/21-错误处理与调试/ }
next: { text: "网络请求与远程资源", link: /kb/language/JavaScript/核心语法/23-网络请求与远程资源/ }
knowledgeNote:
  series: "Language"
  group: "核心语法"
---
---
title: XML 与 JSON
tags:
  - javascript
  - js-core
  - json
  - data-format
---

# XML 与 JSON

> 上一章：[-错误处理与调试](/kb/language/JavaScript/核心语法/21-错误处理与调试/) · 下一章：[-网络请求与远程资源](/kb/language/JavaScript/核心语法/23-网络请求与远程资源/)

## 学习目标

- 理解 XML 与 JSON 的定位、适用场景和主要差异
- 熟练使用 `JSON.stringify()` 与 `JSON.parse()`
- 掌握 replacer、reviver、`toJSON()` 和序列化边界
- 能安全地处理外部 JSON，并设计稳定的数据交换格式

## 1. 数据格式而不是 JavaScript 对象

JSON（JavaScript Object Notation）是一种文本数据格式。它借用了 JavaScript 对象字面量的外观，但两者并不等价：JSON 的属性名必须使用双引号，字符串只能使用双引号，且不支持注释、函数、`undefined`、`Symbol`、`BigInt` 等值。

合法 JSON 值只有以下几类：

- 对象
- 数组
- 字符串
- 有限数字
- `true`、`false`
- `null`

```js
const text = '{"name":"Ada","skills":["math","code"],"active":true}';
const data = JSON.parse(text);

console.log(data.name);       // Ada
console.log(data.skills[1]);  // code
```

JSON 顶层不一定是对象，`"hello"`、`42`、`null` 和 `[1, 2]` 都是合法 JSON。接口是否要求顶层对象，应由接口契约决定。

## 2. XML 的角色

XML 使用标签表达层级结构，支持属性、命名空间、文档模式和混合文本。它仍常见于 SVG、SOAP、RSS/Atom、Office 文档和部分企业系统，但普通 Web API 多采用更轻量的 JSON。

```xml
&lt;book id="js-4"&gt;
  &lt;title&gt;JavaScript Guide&lt;/title&gt;
  &lt;available&gt;true&lt;/available&gt;
&lt;/book&gt;
```

浏览器可通过 `DOMParser` 解析 XML：

```js
const xml = `&lt;book id="js-4"&gt;&lt;title&gt;JavaScript Guide&lt;/title&gt;&lt;/book&gt;`;
const doc = new DOMParser().parseFromString(xml, "application/xml");
const parseError = doc.querySelector("parsererror");

if (parseError) throw new Error("XML 格式错误");
console.log(doc.querySelector("book")?.getAttribute("id")); // js-4
console.log(doc.querySelector("title")?.textContent);
```

解析不可信 XML 时不要把内容直接拼入 HTML。服务端 XML 解析器还应明确禁用外部实体，防止 XXE；浏览器的具体行为不能替代服务端安全配置。

## 3. JSON 序列化

`JSON.stringify(value, replacer, space)` 把可表示的数据转换为 JSON 文本。

```js
const user = {
  id: 7,
  name: "Lin",
  password: "secret",
  lastLogin: new Date("2026-08-02T08:00:00Z"),
  optional: undefined
};

const json = JSON.stringify(user, ["id", "name", "lastLogin"], 2);
console.log(json);
```

序列化时要注意：

- 对象属性中的 `undefined`、函数和 `Symbol` 会被忽略
- 数组中的上述值会变为 `null`，以保留位置
- `NaN`、`Infinity` 和 `-Infinity` 会变为 `null`
- `Date` 默认通过 `toJSON()` 变为 ISO 字符串
- 循环引用会抛出 `TypeError`
- `BigInt` 默认不能序列化

replacer 函数可过滤或转换值：

```js
const payload = {
  account: "A-100",
  token: "do-not-send",
  amount: 99n
};

const text = JSON.stringify(payload, (key, value) => {
  if (key === "token") return undefined;
  if (typeof value === "bigint") return { $bigint: value.toString() };
  return value;
});

console.log(text);
```

对象可以定义 `toJSON()`，但它会改变对象在所有 JSON 序列化场景中的表现，应谨慎使用：

```js
const point = {
  x: 3,
  y: 4,
  toJSON() {
    return [this.x, this.y];
  }
};

console.log(JSON.stringify({ point })); // {"point":[3,4]}
```

## 4. JSON 解析与恢复类型

`JSON.parse(text, reviver)` 先解析文本，再自底向上调用 reviver。可以借此恢复日期或自定义标记类型。

```js
const text = '{"createdAt":"2026-08-02T08:00:00.000Z","count":3}';
const value = JSON.parse(text, (key, current) => {
  if (key === "createdAt") return new Date(current);
  return current;
});

console.log(value.createdAt instanceof Date); // true
console.log(value.createdAt.getUTCFullYear()); // 2026
```

不要仅凭“看起来像日期”就转换所有字符串。字段白名单或明确的类型标记比宽泛正则更可靠。

恢复上一节的 `BigInt`：

```js
const text = '{"amount":{"$bigint":"99"}}';
const value = JSON.parse(text, (key, current) => {
  if (current && typeof current === "object" && "$bigint" in current) {
    return BigInt(current.$bigint);
  }
  return current;
});

console.log(value.amount + 1n); // 100n
```

## 5. 深拷贝不是 stringify 的主要职责

`JSON.parse(JSON.stringify(value))` 会丢失类型、共享引用、`undefined` 和不可枚举属性，也无法处理循环结构。现代环境中，复制结构化数据优先考虑 `structuredClone()`：

```js
const source = {
  createdAt: new Date(),
  tags: new Set(["js", "web"])
};
const copy = structuredClone(source);

console.log(copy.createdAt instanceof Date); // true
console.log(copy.tags instanceof Set);        // true
```

函数、DOM 节点等仍不能被结构化克隆。复制前应确认数据模型，而不是盲目尝试。

## 6. 安全与协议设计

JSON 解析不会执行其中的字符串，因此应使用 `JSON.parse()`，绝不能使用 `eval()`。但“不会执行”不代表数据可信：字段类型、长度、枚举范围和权限仍需验证。

```js
function parseProfile(text) {
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("资料必须是对象");
  }
  if (typeof value.name !== "string" || value.name.length > 80) {
    throw new TypeError("name 不合法");
  }
  return { name: value.name, bio: String(value.bio ?? "") };
}

console.log(parseProfile('{"name":"Ada","bio":"Programmer"}'));
```

稳定的数据格式还应明确版本、必填字段、空值语义、数字精度、时间格式和未知字段处理策略。金额不要依赖二进制浮点精确表示，可使用最小货币单位整数或明确的十进制字符串。

## 常见陷阱与最佳实践

- 不要把对象字面量直接当成 JSON；JSON 键名和字符串必须用双引号
- 不要用 `eval()` 解析 JSON
- 捕获 `JSON.parse()` 的 `SyntaxError`，但不要吞掉错误上下文
- 在边界处校验数据；TypeScript 类型不会自动验证运行时输入
- 序列化前明确敏感字段白名单，避免把密码、令牌或内部状态发出
- 日期统一使用带时区的 ISO 8601 字符串，并在协议中声明含义
- 大数据集可考虑流式格式、分页或 NDJSON，避免一次构造超大字符串
- 只有需要文档语义、命名空间或既有标准时才优先选择 XML

## 章节小结

JSON 是现代 JavaScript 数据交换的默认选择，但它只是有限类型的文本格式。可靠使用 JSON 的关键不只是调用 `parse` 和 `stringify`，而是明确类型恢复、敏感字段、运行时校验和协议版本。XML 不必作为日常主线深入，但需要能识别并安全处理仍广泛存在的标准格式。

> 上一章：[-错误处理与调试](/kb/language/JavaScript/核心语法/21-错误处理与调试/) · 下一章：[-网络请求与远程资源](/kb/language/JavaScript/核心语法/23-网络请求与远程资源/)
