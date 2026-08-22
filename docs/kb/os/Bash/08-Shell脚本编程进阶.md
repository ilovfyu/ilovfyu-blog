---
title: "Shell 脚本编程进阶"
permalink: /kb/os/Bash/08-Shell脚本编程进阶/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "系统监控与性能命令", link: /kb/os/Bash/07-系统监控与性能命令/ }
next: { text: "高级命令与文本处理", link: /kb/os/Bash/09-高级命令与文本处理/ }
knowledgeNote:
  series: "OS"
  group: "Bash"
---
::: abstract 本章定位
从「会敲命令」到「会写脚本」：掌握执行方式、变量与展开、条件与循环、函数、重定向、数组这六大地基，再补上参数解析、日志、并发、安全等工程化技能，最终独立写出日志清理、系统采集这类生产级脚本。
:::

命令是积木，脚本是把积木钉成房子。读懂本篇后，[高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/) 的 xargs/管道流、[实用命令组合与技巧](/kb/os/Bash/10-实用命令组合与技巧/) 的一行流都能看穿本质。写脚本第一准则：**所有变量加双引号、所有输入不可信、永不 `eval`**。

## 1. 脚本基础
### 1.1 shebang、执行方式与当前 shell

`#!/bin/bash` 告诉内核用哪个解释器。三种执行方式行为完全不同：

| 方式 | 谁在执行 | 是否影响当前 shell | 依赖 shebang？ |
|---|---|---|---|
| `bash script.sh` | 新 bash 进程 | 否 | 否 |
| `./script.sh` | 新进程 | 否 | 是，且需可执行位 |
| `source script.sh` / `. script.sh` | **当前** shell | **是**（变量/`cd`/函数会留下） | 否 |
```bash
chmod +x script.sh && ./script.sh
bash script.sh     # 强制 bash，不管 shebang
source script.sh   # 当前 shell 执行，变量、函数、cd 等副作用会留下
```
::: warning source 的副作用
`source` 在当前 shell 执行，脚本里的 `exit` 会直接退出你的终端！不可信脚本永远不要 source。
:::

**用途**：选择脚本是“启动一个独立程序”还是“修改当前交互环境”。

**常用参数/写法**：`bash script.sh` 用新 Bash 进程执行；`./script.sh` 由 shebang 选择解释器并要求执行位；`source script.sh` 与 `. script.sh` 在当前 shell 读取执行。

**可运行示例**：

```bash
cat > /tmp/shell-scope-demo.sh <<'EOF'
DEMO_VALUE=from-script
cd /tmp
EOF

unset DEMO_VALUE
bash /tmp/shell-scope-demo.sh
printf '独立执行后: value=%s, dir=%s\n' "${DEMO_VALUE:-未设置}" "$PWD"
source /tmp/shell-scope-demo.sh
printf 'source 后: value=%s, dir=%s\n' "$DEMO_VALUE" "$PWD"
```

预期输出（当前目录取决于运行前的位置）：

```text
独立执行后: value=未设置, dir=原当前目录
source 后: value=from-script, dir=/tmp
```

**结果解读**：独立进程结束后变量和 `cd` 只在子进程里存在；`source` 没有子进程边界，所以修改直接落在当前 shell。`export` 只决定变量能否向子进程传递，不能把子进程修改传回父 shell。

**易错点**：`source` 找不到文件时可能只打印错误并继续，脚本库加载应写 `source "$lib" || exit 1`；在库文件中不要随意 `exit`，否则被 source 时会终止调用者。要运行而非加载，就使用 `bash file` 或 `./file`。

### 1.2 变量、引号与 exit code
```bash
name="Alice"          # 赋值：等号两侧不能有空格！
echo "$name"          # 推荐：作为一个整体词
echo $name            # 危险：会做词分割 + 通配展开
echo '${name}'        # 单引号：完全字面量
echo "${name}_suffix" # 花括号定界，否则读到 $name_suffix
```

**单引号字面，双引号展开但保护，无引号全裸奔**：

| 写法 | 展开 | 词分割 | 通配符 | 用途 |
|---|---|---|---|---|
| `$var` | 是 | 是 | 是 | 几乎不用 |
| `"$var"` | 是 | 否 | 否 | **默认** |
| `'$var'` | 否 | 否 | 否 | 要字面 `$` |

退出码：**0 成功，非 0 失败**，`$?` 拿上一条命令的结果。`true; echo $?` 出 0，`false; echo $?` 出 1。

### 1.3 `set -euo pipefail` 与调试

| 选项 | 作用 |
|---|---|
| `set -e` | 大多数未被条件语境接住的命令失败时退出 |
| `set -u` | 用未定义变量直接报错退出 |
| `set -o pipefail` | 管道退出码取最右失败命令的码 |
| `set -x` | 打印每条执行的命令（调试用） |
```bash
#!/bin/bash
set -euo pipefail    # 常用严格模式；仍需理解 -e 的例外语境
name=world
echo "hello $name"
```
::: tip 语法检查与跟踪

:::```bash
> bash -n script.sh   # 只查语法不执行
> bash -x script.sh   # 跟踪模式，逐行打印
> ```

`bash -n` 是**语法检查命令**：Bash 解析脚本但不执行命令；成功通常没有输出并返回 0，语法错误返回非 0。`bash -x` 是运行时跟踪，不是语法检查，可能把展开后的密码、token 打进终端或日志。

### 1.4 `shellcheck` 与 `shfmt`：静态检查和格式化

**用途**：`shellcheck` 发现引用、条件、未定义变量和常见 Bash 陷阱；`shfmt` 统一缩进、空格和换行，降低审查成本。二者都是额外安装的开发工具，不是 Bash 内建命令。

**常用参数**：

| 命令/参数 | 作用 |
| --- | --- |
| `shellcheck script.sh` | 检查脚本并按级别给出 SC 编号 |
| `shellcheck -x script.sh` | 跟踪 `source` 的外部脚本（需信任源码） |
| `shellcheck -S error script.sh` | 只显示 error 级别 |
| `shfmt -d script.sh` | 只显示格式差异，不改文件 |
| `shfmt -w script.sh` | 原地格式化 |
| `shfmt -i 4 -ci -sr` | 4 空格、缩进 case、简化重定向风格 |

**可运行示例**：

```bash
cat > /tmp/quality-demo.sh <<'EOF'
#!/usr/bin/env bash
name=$1
echo $name
EOF

bash -n /tmp/quality-demo.sh
shellcheck /tmp/quality-demo.sh
shfmt -d /tmp/quality-demo.sh
```

预期结果：`bash -n` 静默返回 0；ShellCheck 报告未引用 `$1` 等问题；shfmt 输出统一格式的 diff，但 `-d` 不修改文件。

**结果解读**：先用 `bash -n` 确认脚本能被解析，再读 ShellCheck 的具体警告并人工判断，最后用 `shfmt -d` 作为 CI 门禁。检查工具的建议不是无条件真理，必须结合目标 shell 和脚本语义审阅。

**易错点**：ShellCheck 默认按脚本 shebang 判断 shell，`#!/bin/sh` 不应使用 Bash 专属语法；`shfmt -w` 会改文件，提交前先看 `-d`；`shellcheck -x` 会跟随 source，不能对不可信的库盲目打开。安装示例：Debian/Ubuntu `apt install shellcheck shfmt`（`shfmt` 包名因发行版可能不同），macOS `brew install shellcheck shfmt`。

### 1.5 `set -E` 与 `ERR` trap：记录真正失败的位置

**用途**：用 `ERR` trap 在命令失败时统一记录退出码、行号和当前命令；`set -E`（`errtrace`）让这个 trap 继承到函数、命令替换和子 shell，适合排查较深的调用栈。

**常用参数/写法**：`set -E` 等价于 `set -o errtrace`；`trap 'handler' ERR` 注册失败处理器；在 handler 第一行保存 `$?`，因为后续命令会覆盖它。

**可运行示例**：

```bash
#!/usr/bin/env bash
set -Eeuo pipefail
trap 'rc=$?; printf "[ERR] rc=%d line=%d cmd=%s\n" "$rc" "$LINENO" "$BASH_COMMAND" >&2; exit "$rc"' ERR

fail_in_function() { false; }
fail_in_function
```

预期结果（行号可能随文件位置变化）：

```text
[ERR] rc=1 line=5 cmd=false
```

**结果解读**：函数里的 `false` 触发 ERR trap；`set -E` 使 trap 在函数边界内仍可见，最后保留原始退出码 1。

**易错点**：`ERR` trap 与 `set -e` 共享很多例外：`if cmd`、`while cmd`、`cmd1 && cmd2`、`cmd1 || cmd2`、被 `!` 取反的命令等失败不一定触发；它不是 try/catch，也不能替代明确的错误处理。不要在 handler 中调用会再次失败的复杂命令，日志输出也要避免泄露秘密。

### 1.6 最小完整脚本

```bash
#!/bin/bash
# hello.sh —— 参数 + 校验 + 退出码
set -euo pipefail
if [[ $# -lt 1 ]]; then
    echo "用法: $0 名字" >&2
    exit 1
fi
echo "你好, $1"
# 运行: chmod +x hello.sh && ./hello.sh 世界
```
## 2. 变量与展开
### 2.1 位置参数与特殊变量
```bash
echo "脚本名: $0  参数个数: $#"
echo "第1个: $1   第10个: ${10}"      # 10 以上必须花括号
for arg in "$@"; do echo "arg=$arg"; done

set -- "a b" c
for x in "$@"; do echo "[$x]"; done   # [a b] [c]，每个参数一个词
for x in "$*"; do echo "[$x]"; done   # [a b c]，合并成一个词
```

| 变量 | 含义 | 变量 | 含义 |
|---|---|---|---|
| `$0` | 脚本名 | `$$` | 当前 shell 的 PID |
| `$#` | 参数个数 | `$!` | 最近后台任务 PID |
| `$@` | 全部参数（逐词） | `$?` | 上条命令退出码 |
| `$*` | 全部参数（一坨） | `$-` | 当前 shell 选项 |
```bash
export PATH="$PATH:/opt/mybin"    # 环境变量，传给子进程
sleep 30 & kill "$!"              # $! 拿后台 PID 并杀掉
```
### 2.2 命令替换与算术展开
```bash
today=$(date +%F)          # 推荐 $( )；反引号 `date` 是旧写法，嵌套难
echo "今天是 $today"
files="$(ls /etc | head -3)"   # 命令替换结果要加引号！否则再分词/展开

a=10; b=3
echo $((a + b))       # 13，括号内不用 $
echo $((a / b))       # 3，bash 只有整数除法
echo $((a ** 2))      # 100
((a += 5)); echo "$a" # 15
```
::: warning `(( ))` 的退出码是"结果是否为 0"
计算得 0 时 `(( ))` 返回失败，非 0 成功。配合 `set -e` 时 `(( count++ ))` 首次执行（值为 0）会触发退出，应写 `(( count += 1 ))`。
:::

### 2.3 大括号展开与通配符
```bash
echo {1..5}          # 1 2 3 4 5（拼接，不关心文件是否存在）
cp file.txt{,.bak}   # 复制成 file.txt.bak 的经典技巧
echo *.sh            # glob：匹配真实文件名
echo file?.txt       # ? 单字符，[0-9] 字符集
set -f               # 关闭 glob（处理不可信文件名时用）
set +f               # 重新打开
```
::: warning 没匹配到会怎样
glob 一个都匹配不到时**原样保留**字面字符串，不会变空。遍历目录务必 `[[ -e "$f" ]] || continue`，或开 `shopt -s nullglob`。
:::

### 2.4 参数展开高级

| 写法 | 语义 | 写法 | 语义 |
|---|---|---|---|
| `${var:-def}` | 空则用 def | `${#var}` | 长度 |
| `${var:=def}` | 空则用并赋值 | `${var#pat}`/`${var##pat}` | 头去最短/最长 |
| `${var:+alt}` | 非空则用 alt | `${var%pat}`/`${var%%pat}` | 尾去最短/最长 |
| `${var:?msg}` | 空则报错退出 | `${var//a/b}` | 全局替换（单 `/` 只首个） |
```bash
port=${PORT:-8080}    # 未设 PORT 就用 8080
: "${REQUIRED:?必须设置 REQUIRED}"   # 硬校验，未设即退出
path="/home/user/project/file.txt"
echo "${path##*/}"    # file.txt
echo "${path%/*}"     # /home/user/project
echo "${path##*.}"    # txt（取扩展名）
```
::: tip `: "${var:?msg}"` 前的 `:` 是空命令
`:` 永远成功，用来"执行只有报错副作用的展开"，是 `set -u` 时代校验必填参数的标准姿势。
:::

## 3. 条件与判断
### 3.1 test / `[ ]` / `[[ ]]` 对比

| 能力 | `test` | `[ ]` | `[[ ]]` |
|---|---|---|---|
| 字符串/数值/文件判断 | 有 | 有 | 有 |
| 内部不做词分割 | 否 | 否 | **是** |
| 括号内写 `&&`/`\|\|`/`!` | 否 | 否 | **可以** |
| 正则 `=~`、glob 模式匹配 | 否 | 否 | **可以** |
| `<` `>` 字符串比较 | 要转义 | 要转义 | 直接用 |
::: important 一律用 `[[ ]]`
`[[ ]]` 是 bash 关键字，不分词、不展开通配符，引号可省，还支持正则。除非要兼容 POSIX sh，否则不要用 `[ ]`。
:::

### 3.2 字符串、数值与文件判断
```bash
name=""
[[ -z "$name" ]] && echo 空           # -z 空 / -n 非空
[[ "$name" == "Alice" ]] && echo 等于 # == 支持 glob 模式
[[ "hello" =~ ^h.*o$ ]] && echo 正则  # =~ 正则
[[ 10 -gt 9 ]] && echo 数值用 -gt     # -eq -ne -gt -ge -lt -le
[[ 10 > 9 ]] && echo 真 || echo 假      # 假！> 是字符串比较，'1'<'9'
[ "10" \> "9" ] || echo "字符串排序 10<9"
```

**规则：数字之间用 `-eq/-gt`，字符串之间用 `=`/`<`/`>`（且用 `[[ ]]`）。**

| 文件测试 | 含义 | 文件测试 | 含义 |
|---|---|---|---|
| `-e` | 存在 | `-f` | 普通文件 |
| `-d` | 目录 | `-L` | 符号链接 |
| `-r`/`-w`/`-x` | 可读/写/执行 | `-s` | 非空 |
| `-nt`/`-ot` | 比…新/旧 | `-p` | 命名管道 |

### 3.3 if / elif / case 与逻辑组合
```bash
if [[ -f "$1" ]]; then
    echo 普通文件
elif [[ -d "$1" ]]; then
    echo 目录
else
    echo 其他
fi
if grep -q root /etc/passwd; then echo 有root; fi   # 条件可放命令

case "$1" in
    start)   echo 启动服务 ;;
    stop | restart) echo 停止/重启 ;;
    [0-9]*) echo 数字开头: "$1" ;;
    *) echo "用法: $0 {start|stop|restart}" >&2; exit 1 ;;
esac
```
```bash
[[ -f "$cfg" ]] && echo 存在 || echo 不存在    # 简写三目
```
::: warning 三目的坑
`a && b || c`：**b 一旦失败，c 必然执行**。`[[ -d /tmp ]] && rm -rf /tmp/x || echo 回退` 里 rm 失败会触发回退。b 不保证成功时就写 if/else。
:::

### 3.4 `select`：快速生成交互菜单

**用途**：把候选词自动编号并循环读取选择，适合内部运维脚本的小型交互菜单。

**常用参数/变量**：`select name in items...; do ...; done` 本身没有命令行参数；`PS3` 控制提示符，选择编号保存在 `REPLY`，对应文本放入 `name`，用 `break` 退出菜单。

**可运行示例**：

```bash
PS3='请选择 [1-3]: '
select action in status restart quit; do
    case "$action" in
        status | restart) printf '将执行: %s\n' "$action"; break ;;
        quit) printf '退出\n'; break ;;
        *) printf '无效编号: %s\n' "$REPLY" >&2 ;;
    esac
done
```

输入 `2` 的结果：

```text
1) status
2) restart
3) quit
请选择 [1-3]: 2
将执行: restart
```

**结果解读**：`select` 自动打印菜单并把第 2 项赋给 `action`；非法编号会令 `action` 为空，但原始输入仍在 `REPLY`。

**易错点**：`select` 是 Bash/ksh 扩展，不是 POSIX sh；它默认从 stdin 读取，在 cron、CI、无 TTY 环境会立即遇到 EOF 或一直等输入。自动化脚本应优先使用明确的命令行参数，菜单只用于真人交互。

## 4. 循环
### 4.1 for 三种写法
```bash
for f in *.log; do echo "处理 $f"; done          # 1) in 列表
for ((i = 0; i < 10; i += 2)); do printf "%d " "$i"; done; echo  # 2) C 风格
for i in {1..5}; do echo -n "$i "; done; echo    # 3) 数值序列
```
### 4.2 while / until / break / continue
```bash
i=0
while (( i < 5 )); do echo "i=$i"; ((i += 1)); done

while true; do echo "心跳 $(date +%T)"; sleep 5; done   # 死循环/守护

until ping -c1 -W1 10.0.0.1 >/dev/null 2>&1; do echo 等待网络; sleep 2; done

for i in {1..10}; do
    (( i % 3 == 0 )) && continue   # 跳过 3 的倍数
    (( i >= 8 )) && break          # 到 8 停
    echo -n "$i "
done; echo                          # 1 2 4 5 7；break 2 可跳出两层
```
### 4.3 管道与子 shell 陷阱
```bash
count=0
printf 'a\nb\nc\n' | while read -r x; do count=$((count + 1)); done
echo "count=$count"       # 0！管道每段在子 shell，改不到外面
```

三种解法：
```bash
shopt -s lastpipe         # ① bash4.2+，管道最后一段回当前 shell
while read -r x; do ((count += 1)); done < <(printf 'a\nb\nc\n')  # ② 进程替换
count=$(printf "a\nb\nc\n" | wc -l)                       # ③ 把结果带出来
```
::: tip 口诀：变量进得去子 shell，出不来。`export` 只向下传，向上无门。`lastpipe` 只在作业控制关闭时让最后一段留在当前 shell，非交互脚本通常满足，交互终端不能想当然。
:::

### 4.4 `( )` 子 shell 与 `{; }` 当前 shell

**用途**：`( list )` 在子 shell 环境隔离 `cd`、变量、trap 等副作用；`{ list; }` 在当前 shell 分组，常用于让整组命令共享一次重定向。

**常用写法**：圆括号自动形成语法边界；花括号后要有空格，最后一条命令后必须有 `;` 或换行。

**可运行示例**：

```bash
start=$PWD
( cd /tmp; child=1; printf '子 shell: %s\n' "$PWD" )
printf '返回当前 shell: dir=%s child=%s\n' "$PWD" "${child:-未设置}"
{ printf 'line 1\n'; printf 'line 2\n'; } > /tmp/group.out
```

预期结果：圆括号内显示 `/tmp`，返回后目录仍为 `$start` 且 `child` 未设置；花括号内两行一起写入 `/tmp/group.out`。

**结果解读**：子 shell 继承父环境的副本，修改无法反向传播；当前 shell 分组没有隔离，因此变量修改会保留。

**易错点**：`{cmd;}` 是错误语法，应写 `{ cmd; }`；命令替换 `$(...)`、异步命令 `&` 和管道段也通常运行在独立执行环境。隔离能控制副作用，但子进程仍可修改共同文件、网络和其他外部资源。

### 4.5 `while IFS= read -r line`
```bash
while IFS= read -r line; do
    printf '行: %s\n' "$line"
done < /etc/hosts
# IFS=：防行首尾空白被 read 剥掉；read -r：禁用反斜杠转义
printf '  带空格  \nC:\\path\n' | while IFS= read -r line; do
    printf '<%s>\n' "$line"     # <  带空格  > 与 <C:\path>
done
```
## 5. 函数与作用域
```bash
greet() {                # 定义（function greet { 也行）
    local name="$1"      # local：函数私有，返回即消失
    echo "Hello, $name"
}
greet World              # 调用，参数用 $1 $2... 访问
counter=0
bump() { counter=$((counter + 1)); }   # 忘写 local 就是全局变量
```

- 函数内 `$1`/`$@` 是**函数**的参数，与脚本互不干扰；`$0` 始终是脚本名
- "返回值"是**退出码**，只能传 0–255；传字符串用 `echo` + 命令替换
```bash
is_file() { [[ -f "$1" ]]; }
is_file /etc/hosts && echo 是文件        # 直接当条件用
f() { return 3; }; f; echo $?           # 3
get_name() { echo Alice; }; name=$(get_name)
# 坑：local v=$(false) 时 $( ) 失败不会触发 set -e，要拆两行：
f() { local v; v=$(false); echo ok; }
```
```bash
# lib.sh —— 函数库，main 里 source 引入复用
log() { echo "[$(date '+%F %T')] $*"; }
die() { echo "[错误] $*" >&2; exit 1; }
# main.sh
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
source "$script_dir/lib.sh" || exit 1
log 开始任务
[[ -f /etc/passwd ]] || die passwd缺失
```
解读：`${BASH_SOURCE[0]}` 指当前 Bash 源文件，比 `$0` 更适合被 source 的库；`cd ... && pwd -P` 把目录规范化为物理绝对路径。`dirname`/路径规范化的命令细节见 [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/)。

### 5.1 getopts 参数解析
```bash
#!/bin/bash
# args.sh —— 解析 -f 文件、-n 数量、-v 开关
set -euo pipefail
file=""; verbose=0; count=1
while getopts "f:n:v" opt; do      # f: 和 n: 要参数，v 是开关
    case "$opt" in
        f) file="$OPTARG" ;;
        n) count="$OPTARG" ;;
        v) verbose=1 ;;
        *) echo "用法: $0 -f 文件 [-n N] [-v]" >&2; exit 1 ;;
    esac
done
shift $((OPTIND - 1))              # 挪掉已解析的参数
[[ -n "$file" ]] || { echo "必须 -f 指定文件" >&2; exit 1; }
if (( verbose )); then echo "文件=$file 次数=$count"; fi
# 运行: ./args.sh -vn 3 -f data.txt   （开关可合并）
```
## 6. 输入输出与重定向
### 6.1 基础重定向

| 符号 | 含义 | 符号 | 含义 |
|---|---|---|---|
| `>` / `>>` | 覆盖/追加 stdout | `2>` | 重定向 stderr |
| `<` | 文件当 stdin | `2>&1` | stderr 并入 stdout |
| `&>` / `&>>` | stdout+stderr 一起 | `|` | 管道 |
```bash
grep root /etc/passwd > found.txt 2>/dev/null   # 丢弃错误
./install.sh > install.log 2>&1                 # 日志全收
```
::: warning 顺序陷阱
重定向从左到右生效。`cmd > f 2>&1` 是"都进 f"；`cmd 2>&1 > f` 会把 stderr 留给终端。
:::

### 6.2 here doc 与 here string
```bash
cat <&lt;EOF                      # 不加引号：变量/命令替换生效
当前目录: $PWD
EOF
cat &lt;&lt;'EOF'                    # 加引号：完全字面量，适合输出模板
$PWD 不会被展开
EOF
cat &lt;&lt;-EOF                     # &lt;&lt;- 忽略行首 tab，缩进美观
    你好
EOF
grep -oE '[0-9]+' &lt;&lt;&lt; "订单 1024, 数量 5"    # here string：单字符串当 stdin
read -r a b &lt;&lt;&lt; "hello world"               # a=hello b=world
```
### 6.3 进程替换、tee 与 fd
```bash
diff &lt;(sort a.txt) &lt;(sort b.txt)     # &lt;( ) 命令输出当文件读：两路对比
while read -r line; do :; done &lt; &lt;(tail -f /var/log/syslog)   # 避开子 shell
tee &gt;(grep ERROR > errors.log) | wc -l    # >( ) 分流桶：屏幕看 + 收集
./build.sh 2>&1 | tee build.log      # tee：屏幕看 + 落盘
exec 3>&1                            # 自定义 fd：fd 3 复制 stdout
echo 写日志 >&3 && exec 3>&-         # 用 fd 3，用完关闭
```

### 6.4 `coproc`：与后台协程双向通信

**用途**：在 Bash 中启动一个异步协程，并同时获得它的 stdin/stdout 文件描述符；适合长时间运行、需要多次发送请求并读取回应的后台 worker。

**常用参数/变量**：`coproc NAME { commands; }` 启动命名协程；`${NAME[0]}` 是读取 stdout 的 fd，`${NAME[1]}` 是写入 stdin 的 fd，`${NAME_PID}` 是 PID；持久 worker 写完全部输入要关闭写端，否则它可能一直等 EOF；最后用 `wait "$NAME_PID"` 回收。

**可运行示例**（需要 Bash 4+，macOS 自带 Bash 3.2 不支持 `coproc`）：

```bash
coproc UPPER { awk '{ print toupper($0); exit }'; }
upper_pid=$UPPER_PID
printf 'hello coproc\n' >&"${UPPER[1]}"
IFS= read -r -u "${UPPER[0]}" reply
printf '收到: %s\n' "$reply"
wait "$upper_pid"
```

预期输出：

```text
收到: HELLO COPROC
```

**结果解读**：`awk` 在后台读取一条请求、转换后立即退出；主 shell 通过 Bash 自动分配的 fd 发送和读取数据，`wait` 得到协程最终退出码。持久协程需要自行约定请求边界，并在结束时关闭写端。

**易错点**：协程 stdout/stderr 的缓冲、死锁和 fd 生命周期都需要设计；不要在主 shell 一次写满管道却不读取回应。命名协程数组变量在 Bash 5.0+ 的行为更完善，旧 Bash 版本/不同发行版应先用小样本验证；macOS 可安装新版 Bash（如 Homebrew `bash`）后再使用。

## 7. 数组与关联数组
```bash
#!/bin/bash
fruits=(apple banana cherry)      # 定义，从 0 开始
echo "${fruits[0]}"               # apple
echo "${#fruits[@]}"              # 个数 3
fruits+=(date grape)              # 追加
echo "${fruits[@]:1:2}"           # 切片：下标 1 起取 2 个
for f in "${fruits[@]}"; do echo "水果: $f"; done
for i in "${!fruits[@]}"; do echo "$i -> ${fruits[$i]}"; done
```
::: important `"${arr[@]}"` 三要素：花括号、`[@]`、双引号，一个都不能少。写 `$arr` 只拿到第 0 个元素。
:::
```bash
declare -A server                     # 关联数组必须先声明
server[web]=10.0.0.11
server[db]=10.0.0.12
for name in "${!server[@]}"; do       # ! 取所有键
    printf '%-5s -> %s\n' "$name" "${server[$name]}"
done
```
```bash
mapfile -t lines < /etc/hosts         # 每行一个元素，-t 去换行
echo "共 ${#lines[@]} 行"
read -r -a nums <<< "10 20 30"        # read -a 按 IFS 拆行
echo "${nums[1]}"                     # 20
```
::: warning 别用 `arr=( $(cmd) )` 读文件：命令替换会分词，含空格的行被拆裂。读文件用 `mapfile -t`。
:::

## 8. 常用脚本模式
### 8.1 getopts 完整示例（备份脚本）
```bash
#!/bin/bash
# backup.sh —— 参数解析 + 默认值 + 必填校验 的完整样板
set -euo pipefail
usage() {
    cat <<'EOF'
用法: ./backup.sh -s 源目录 -d 目标目录 [-c] [-v]
  -s 源目录（必填）  -d 目标目录（必填）
  -c 压缩打包        -v 详细输出
EOF
    exit 1
}
src=""; dst=""; compress=0; verbose=0
while getopts ":s:d:cv" opt; do      # 前导 : 表示自行处理报错
    case "$opt" in
        s) src="$OPTARG" ;;
        d) dst="$OPTARG" ;;
        c) compress=1 ;;
        v) verbose=1 ;;
        :) echo "选项 -$OPTARG 需要参数" >&2; usage ;;
        \?) echo "未知选项: -$OPTARG" >&2; usage ;;
    esac
done
shift $((OPTIND - 1))
[[ -n "$src" && -n "$dst" ]] || { echo "源/目标必填" >&2; usage; }
[[ -d "$src" ]] || { echo "源目录不存在: $src" >&2; exit 1; }
ts=$(date +%Y%m%d%H%M%S)
out="$dst/backup-$ts"
if (( compress )); then
    mkdir -p "$dst" && tar czf "$out.tar.gz" -C "$src" .
    echo "已打包: $out.tar.gz"
else
    mkdir -p "$out" && cp -a "$src/." "$out/"
    echo "已复制到: $out"
fi
if (( verbose )); then echo "完成: $(date '+%F %T')"; fi
```
### 8.2 日志函数
```bash
#!/bin/bash
# 日志函数（放 lib.sh 供 source）
LOG_FILE=""
log() {
    local level="$1"; shift
    local msg="[$(date '+%F %T')] [$level] $*"
    if [[ -n "$LOG_FILE" ]]; then
        echo "$msg" >> "$LOG_FILE"
    else
        echo "$msg" >&2            # 默认打 stderr，和正常输出分开
    fi
}
log INFO  开始备份
log WARN  磁盘空间不足 10%
LOG_FILE=/tmp/myjob.log
log INFO  之后全落盘
```
### 8.3 错误处理、`trap` 清理与守护脚本
```bash
#!/bin/bash
set -euo pipefail
die() { echo "[FATAL] $*" >&2; exit 1; }
tmpfile=$(mktemp)
cleanup() {
    local rc=$?
    trap - EXIT
    rm -f -- "$tmpfile"
    exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

command -v rsync >/dev/null || die "未安装 rsync"   # 依赖校验
rsync -a /data /backup/ || die "rsync 失败"          # 关键操作
```

**用途**：`trap` 在 shell 收到信号或即将退出时执行清理逻辑，确保临时文件、锁、终端状态等资源被释放。

**常用参数/信号**：`trap handler EXIT` 在 shell 退出时执行；`INT` 对应 Ctrl+C（通常退出码 130），`TERM` 是常规终止信号（通常 143）；`trap - EXIT` 清除 trap；`trap -p` 查看已注册处理器。

**结果解读**：无论正常完成、`die`、Ctrl+C 还是 TERM，最终都会进入 `EXIT` cleanup；cleanup 第一行保存 `$?`，清理完再按原退出码结束，避免 `rm` 的结果掩盖真正失败。INT/TERM handler 只负责转成常见退出码，资源清理由 EXIT 统一完成，避免重复写两份。

**易错点**：trap 中的变量最好像上例一样在**执行时**展开；注册时若用双引号，值可能过早固定。`SIGKILL`（9）和 `SIGSTOP` 无法捕获，因此清理不能成为唯一的数据一致性保障。多个 `trap ... EXIT` 会覆盖而非自动叠加，应统一放进一个 cleanup 函数。

::: tip `set -e` 的边界
`set -e` 不拦 if/while 条件、`&&`/`||` 列表（末项规则另有细节）、`!` 等语境里的失败；可能失败但不致命的命令应放进明确的 `if` 或使用有注释的 `|| true`。不要把它当成完整异常处理。
:::
```bash
#!/bin/bash
# watcher.sh —— 守护型循环
set -u
while true; do
    pgrep -f myservice >/dev/null || { echo "[$(date '+%F %T')] 重启服务" >> /tmp/watcher.log; /opt/bin/myservice & }
    sleep 30
done
# 运行: nohup ./watcher.sh >> /tmp/watcher.log 2>&1 & disown
```
::: warning nohup 三要点：重定向写全（否则进 nohup.out）；`&` 不能少；日志用 `>>`，守护循环写 `>` 会撑爆磁盘。
:::

### 8.4 配置文件读取与 cron
```bash
# /etc/myapp.conf：# 注释行、server=10.0.0.5、port=8080
declare -A cfg
while IFS='=' read -r key value; do
    [[ -z "$key" ]] && continue
    [[ "$key" =~ ^[[:space:]]*# ]] && continue     # 跳过注释
    cfg["${key// /}"]="$value"
done < /etc/myapp.conf
echo "server=${cfg[server]:-未配置}"
```
::: warning 配置文件别 `eval $(cat config)`！混入 `$(rm -rf /)` 就会执行。用 `IFS='='` 解析，数据永远是数据。
:::
```bash
#!/bin/bash
# clean_old.sh —— cron 环境 PATH 极短，脚本要自足
set -euo pipefail
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
find /var/log/myapp -name "*.log" -mtime +30 -delete && echo "[$(date '+%F %T')] 清理完成"
# crontab -e：分 时 日 月 周  命令
# 15 3 * * * /opt/scripts/clean_old.sh >> /var/log/clean_old.log 2>&1
```
### 8.5 并发与安全检查
```bash
#!/bin/bash
set -euo pipefail
pids=()
for url in "$@"; do
    ( curl -fsSL "$url" -o "$(basename "$url")" ) &   # 后台并行
    pids+=("$!")                                      # 收集 PID
done
rc=0
for pid in "${pids[@]}"; do wait "$pid" || rc=1; done  # 收口，最坏结果
[[ $rc -eq 0 ]] && echo 全部成功 || { echo 有失败 >&2; exit 1; }
```
::: warning 并发要限量：无脑 `&` 一百个任务会打爆内存。生产用 `xargs -P` 或自己维护信号量。
:::
```bash
#!/bin/bash
set -euo pipefail                                 # ① 失败即停
[[ $# -ge 1 ]] || { echo "用法: $0 参数..." >&2; exit 1; }   # ② 查参数
export PATH="/usr/local/bin:/usr/bin:/bin"        # ③ cron 环境自足
for cmd in curl jq; do
    command -v "$cmd" >/dev/null || { echo "缺依赖: $cmd" >&2; exit 1; }
done                                              # ④ 查依赖
```
::: important 十条铁律
① 变量一律 `"$var"`；② 开头按需使用 `set -euo pipefail` 并理解例外；③ 输入先校验；④ 不用 `eval`；⑤ 临时文件 `mktemp` + `trap`；⑥ 读文件用 `while IFS= read -r`；⑦ 关键失败要明确处理；⑧ 密码不进脚本不进日志；⑨ 有用法提示和退出码；⑩ 改完跑 `bash -n`、ShellCheck 和 `shfmt -d`。
:::

## 9. 安全与陷阱
### 9.1 通配符与文件名
```bash
shopt -s nullglob          # 没匹配到展开为空列表，最稳
for f in *.txt; do
    [[ -e "$f" ]] || continue   # 双保险：防字面 "*.txt"
    echo "处理 $f"
done
set -f                     # 处理不可信文件名时关 glob
while IFS= read -r f; do
    rm -f -- "$f"          # -- 结束选项，防 - 开头文件名被当参数
done < bad_files.txt
set +f
```
### 9.2 命令注入与临时文件
```bash
# 反例：输入 "; rm -rf /" 之类会执行
eval "grep $input file"
# 正解：输入当"数据"不当"代码"
grep -- "$input" file
case "$action" in
    start|stop|restart) "$action" ;;
    *) echo 非法操作 >&2; exit 1 ;;
esac
```
::: warning 永不 eval 用户输入。白名单 + 引号 + 不 eval 是铁三角。
:::
```bash
#!/bin/bash
set -euo pipefail
tmpdir=$(mktemp -d /tmp/myapp.XXXXXX)   # 随机名，防固定路径被抢建
cleanup() { rm -rf -- "$tmpdir"; }
trap cleanup EXIT                       # shell 退出时清理
echo 数据 > "$tmpdir/data.txt"
```
### 9.3 `flock`：进程间文件锁深入

**用途**：利用内核 advisory lock 协调多个进程，防止定时任务重入、并发写同一文件或读写冲突。锁是“协作式”的：只有同样调用锁机制的进程才会遵守。

**常用参数**（util-linux `flock`）：

| 参数/形式 | 作用 |
|---|---|
| `flock FILE command...` | 运行 command 期间持有独占锁 |
| `flock FD` | 给已打开的文件描述符加锁，适合锁住脚本剩余部分 |
| `-n` | 非阻塞，拿不到锁立刻失败 |
| `-w SEC` | 最多等待指定秒数，支持小数的能力视版本而定 |
| `-s` / `-x` | 共享读锁 / 独占写锁（默认独占） |
| `-u` | 主动解锁；通常关闭 fd/进程退出会自动释放 |
| `-E CODE` | 冲突时使用指定退出码（util-linux） |

**可运行示例**：
```bash
#!/bin/bash
# cleaner.sh —— 只允许一个实例在跑
set -euo pipefail
lock=/tmp/cleaner.lock
exec 9> "$lock"                      # 打开 fd 9
flock -w 5 9 || { echo "5 秒内未取得锁" >&2; exit 75; }
find /var/log -name "*.tmp" -mtime +1 -delete   # 独占区
echo 清理完成                                      # fd 随脚本关闭自动释放锁
```

命令包装形式：

```bash
flock -n /tmp/report.lock sh -c 'generate-report > /tmp/report.txt'
flock -s /tmp/cache.lock cat /tmp/cache.data       # 多个读者可共享
flock -x /tmp/cache.lock sh -c 'update-cache'      # 写者独占
```

**结果解读**：fd 9 只要保持打开，锁就持续有效；脚本结束或 `exec 9>&-` 关闭 fd 后自动释放。锁文件通常可以留在磁盘，它只是稳定的锁定对象，不表示当前一定有人持锁。

**易错点**：不要在持锁期间删除并重建锁文件，否则其他进程可能锁住不同 inode，互斥失效；锁文件放在所有参与者可见的同一文件系统，并设置合适权限。NFS 等网络文件系统的锁语义取决于挂载和服务端。macOS 默认没有 util-linux `flock`，不能假设 Homebrew 同名工具行为完全一致；跨平台可考虑 `mkdir` 原子建目录锁并妥善处理陈旧锁，或使用语言级锁 API。cron 里的实际用法见 [实用命令组合与技巧](/kb/os/Bash/10-实用命令组合与技巧/)。

### 9.4 综合健壮性样板

把前面的校验、临时文件、`trap` 清理和原子替换拼在一起，就是日常可直接抄的骨架：

```bash
#!/bin/bash
# robust.sh —— 综合健壮性样板
set -euo pipefail
die() { echo "[FATAL] $*" >&2; exit 1; }
[[ $# -ge 1 ]] || die "用法: $0 <目录>"
dir="$1"
[[ -d "$dir" ]] || die "不是目录: $dir"
command -v tar >/dev/null || die "缺少 tar"
tmp=$(mktemp /tmp/backup.XXXXXX.tgz)
trap 'rm -f -- "$tmp"' EXIT
if ! tar czf "$tmp" -C "$dir" . 2>/dev/null; then die 打包失败; fi
out="/tmp/backup-$(date +%s).tgz"
mv -- "$tmp" "$out"
trap - EXIT
echo "完成: $out"
```

**结果解读**：先写 `mktemp` 临时文件，成功后才 `mv` 到最终名字，因此不会留下半份归档；`mv` 成功后 `trap - EXIT` 撤销清理钩子，避免误删已交付的产物。

## 10. 实战案例

### 10.1 日志清理脚本（按天归档 + 删除旧日志）

```bash
#!/bin/bash
# clean_logs.sh —— 归档昨天的日志，删除 N 天前的旧归档
# 用法: ./clean_logs.sh [保留天数]，默认 7 天
set -euo pipefail
LOG_DIR="/var/log/myapp"
KEEP_DAYS="${1:-7}"
LOCK="/tmp/clean_logs.lock"
log() { echo "[$(date '+%F %T')] $*"; }

exec 9>"$LOCK"
flock -n 9 || { log "已有清理任务在运行，退出"; exit 1; }

[[ -d "$LOG_DIR" ]] || { echo "目录不存在: $LOG_DIR" >&2; exit 1; }
(( KEEP_DAYS >= 0 )) || { echo "保留天数不能为负" >&2; exit 1; }

ARCHIVE_DIR="$LOG_DIR/archive"
mkdir -p "$ARCHIVE_DIR"
# 1) 归档昨天的日志（GNU date；macOS 用 date -v-1d）
yesterday=$(date -d "yesterday" +%Y%m%d)
moved=0
for f in "$LOG_DIR"/app-"$yesterday"*.log; do
    [[ -e "$f" ]] || continue
    mv "$f" "$ARCHIVE_DIR/" && moved=$((moved + 1))
done
log "归档昨天($yesterday)日志 $moved 个"
# 2) 删除超过 KEEP_DAYS 天的归档
deleted=$(find "$ARCHIVE_DIR" -name "app-*.log" -mtime +"$KEEP_DAYS" -delete -print | wc -l)
log "删除 $KEEP_DAYS 天前归档 $deleted 个"
log "清理完成"
# cron: 20 2 * * * /opt/scripts/clean_logs.sh 7 >> /var/log/clean_logs.log 2>&1
```
::: note GNU vs BSD date：`date -d "yesterday"` 是 GNU 语法，macOS 用 `date -v-1d +%Y%m%d`。
:::

### 10.2 系统信息采集脚本（CPU / 内存 / 磁盘汇总）
```bash
#!/bin/bash
# sysinfo.sh —— 一次性采集系统关键指标
set -euo pipefail
sep() { echo "----------------------------------------"; }

echo "===== 主机信息 ====="
echo "主机名: $(hostname)"
echo "内核:   $(uname -r) ($(uname -m))"
echo "时间:   $(date '+%Y-%m-%d %H:%M:%S')"; sep

echo "===== CPU ====="
echo "核心数: $(nproc)"
echo "负载:   $(cut -d' ' -f1-3 /proc/loadavg)"
echo "型号:   $(awk -F': ' '/model name/ {print $2; exit}' /proc/cpuinfo 2>/dev/null)"; sep

echo "===== 内存 ====="
free -h | awk 'NR==1 || NR==2'; sep

echo "===== 磁盘 ====="
df -h | grep -vE '^(Filesystem|tmpfs|udev|devtmpfs)'; sep

echo "===== 网络连接数 ====="
ss -s 2>/dev/null | head -2 || netstat -s 2>/dev/null | head -2 || true
echo "===== 采集完成 ====="
# 运行: ./sysinfo.sh > /tmp/report-$(date +%F).txt
```
::: tip 脚本进化方向
把采集逻辑抽成函数库，配合 [Linux 进程实操](/kb/os/Linux/01-Linux进程与调度实操/) 里的 `top`/`vmstat` 思路，就能做成"定时采样 + 超阈值告警"的监控雏形；排查线上问题时按 [排查方法论](/kb/os/问题排查/00-系统问题排查方法论/) 走流程。
:::

## 本章小结

- **脚本 = 命令编排 + 结构化控制 + 防御式编程**。执行脚本会创建独立环境，`source`/`.` 在当前 shell 运行；库路径优先用 `${BASH_SOURCE[0]}` 定位。
- 引号是安全线：`"$var"` 保平安，`$var` 裸奔，`'$var'` 字面。命令替换结果几乎总要加引号。
- `set -euo pipefail` 能及早暴露部分失败，但 `-e` 有条件语境例外；`set -E` 让 `ERR` trap 进入函数/子 shell，仍不能当 try/catch。
- 质量门禁按 `bash -n`（语法）→ ShellCheck（静态问题）→ `shfmt -d`（格式差异）执行；`bash -x` 是会真正运行且可能泄密的跟踪。
- `[[ ]]` 全面优于 `[ ]`；数字用 `-eq/-gt`，字符串才用 `=`/`<`/`>`。
- `select` 适合真人交互菜单；自动化入口应优先参数。`( )` 隔离副作用，`{; }` 在当前 shell 分组；管道/`$( )`/`&` 的变量通常“进得去出不来”。
- 函数用 `local` 管理作用域，返回 0–255 退出码，传字符串用 echo + 命令替换。
- `coproc` 提供异步双向 fd，但要求 Bash 4+ 且要管理缓冲、EOF、PID 与 `wait`；普通有限并发仍优先 `xargs -P`/后台任务池。
- 安全铁三角：**白名单、加引号、永不 eval**；临时资源用 `mktemp` + 单一 EXIT cleanup，INT/TERM 转换退出码，SIGKILL 无法清理。
- `flock` 是协作式锁：`-n` 立即失败、`-w` 限时等待、`-s/-x` 共享/独占；保持同一锁文件 inode 与 fd 生命周期，macOS 默认没有 util-linux `flock`。

## 动手实验

把以下脚本手写、运行、再拆了重写，直到能默写。

**练习 1：参数求和器**（校验只接受整数）
```bash
#!/bin/bash
set -euo pipefail
total=0
for n in "$@"; do
    [[ "$n" =~ ^-?[0-9]+$ ]] || { echo "非法数字: $n" >&2; exit 1; }
    total=$((total + n))
done
echo "总和 = $total"
```
**练习 2：目录备份器**
```bash
#!/bin/bash
set -euo pipefail
src="${1:?缺少源目录}"
dst="${2:-/tmp/backup}"
[[ -d "$src" ]] || { echo "源不存在" >&2; exit 1; }
mkdir -p "$dst"
name=$(basename "$src")
tar czf "$dst/$name-$(date +%F).tar.gz" -C "$(dirname "$src")" "$name"
echo "已备份: $dst/$name-$(date +%F).tar.gz"
```
**练习 3：逐行统计词数**
```bash
#!/bin/bash
set -euo pipefail
file="${1:?缺少文件}"
[[ -f "$file" ]] || { echo "文件不存在" >&2; exit 1; }
n=0
while IFS= read -r line; do
    n=$((n + 1))
    words=0
    for w in $line; do words=$((words + 1)); done
    printf '%3d 行, %3d 词: %s\n' "$n" "$words" "$line"
done < "$file"
echo "共 $n 行"
```
**练习 4：配置文件读取器**
```bash
#!/bin/bash
set -euo pipefail
conf="${1:?缺少配置文件}"
declare -A cfg
while IFS='=' read -r key value; do
    [[ -z "$key" ]] && continue
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    cfg["${key// /}"]="$value"
done < "$conf"
for k in "${!cfg[@]}"; do printf '%-12s = %s\n' "$k" "${cfg[$k]}"; done
```
**练习 5：秒表计时器**
```bash
#!/bin/bash
set -u
start=$(date +%s)
echo "开始计时，按 Ctrl-C 停止..."
trap 'echo; echo "用时: $(( $(date +%s) - start )) 秒"; exit 0' INT
while true; do
    printf '已过 %3d 秒\r' "$(( $(date +%s) - start ))"
    sleep 1
done
```

**练习 6：质量门禁**

给练习 1-5 逐个执行 `bash -n`、`shellcheck`、`shfmt -d`，记录三种工具分别发现“语法、语义风险、格式”的哪些问题；只在确认 diff 后再用 `shfmt -w`。

**练习 7：当前 shell 与子 shell**

写一个会赋值变量并 `cd /tmp` 的脚本，分别用 `bash file`、`./file`、`source file` 执行；再分别放进 `( )` 与 `{; }`，观察变量和目录是否保留。

**练习 8：错误与清理**

创建 `mktemp -d` 目录，注册 EXIT cleanup、INT=130、TERM=143；在脚本中依次测试正常退出、`false`、Ctrl+C，并确认退出码和目录清理结果。再加 `set -E`/ERR trap，验证函数内失败会记录行号。

**练习 9：锁竞争**

启动一个持有 `flock -x` 并 `sleep 10` 的脚本；第二个实例分别使用 `-n` 与 `-w 3`，记录立即失败和等待超时的退出行为。再测试两个 `-s` 读者可并存、`-x` 写者需等待。

**练习 10：select 与 coproc**

用 `select` 做 status/quit 菜单；若 Bash 版本至少 4，再用 `coproc` 启动一行大写转换 worker，保存 PID、写入请求、读取响应并 `wait`。macOS 系统 Bash 3.2 应记录“不支持”并用新版 Bash 复测。

## 自测题

**Q1. 输出推断：**
```bash
#!/bin/bash
s="abracadabra"
echo "${s//a/X}"
```
<details><summary>答案</summary> `XbrXcXdXbrX`。`//` 全局替换，5 个 `a` 全换 `X`。</details>
**Q2. 输出推断：`set -- one two three` 后执行 `echo "$# : ${2}"`。**
<details><summary>答案</summary> `3 : two`。`$#` 是 3，`${2}` 是 `two`。</details>
**Q3. 输出推断：**
```bash
#!/bin/bash
var=42
echo "${var:-99}"
echo "${var:+88}"
```
<details><summary>答案</summary> 第一行 `42`（非空用原值），第二行 `88`（`:+` 表示非空时用 alt）。</details>
**Q4. 输出推断：**
```bash
#!/bin/bash
n=0
printf 'a\nb\nc\n' | while read -r x; do n=$((n + 1)); done
echo "n=$n"
```
<details><summary>答案</summary> `n=0`。循环跑了 3 次，但管道里的 `while` 在子 shell 运行，`n` 传不回外层（4.3 节陷阱）。</details>
**Q5. 输出推断：**
```bash
#!/bin/bash
f() { return 3; }
f
echo $?
```
<details><summary>答案</summary> `3`。函数返回退出码，`$?` 直接拿到。</details>
**Q6. 输出推断：**
```bash
#!/bin/bash
for i in {1..4}; do
    (( i % 2 == 0 )) && echo -n "$i "
done
echo "done"
```
<details><summary>答案</summary> `2 4 done`。`{1..4}` 取偶数 2、4，`echo -n` 不换行。</details>
**Q7. 判断：`[[ 10 > 9 ]] && echo 真 || echo 假` 输出"真"吗？**
<details><summary>答案</summary> 输出"假"。`[[ ]]` 里 `>` 是字符串比较，`'1' < '9'`，`10 > 9` 为假；数值比较必须 `-gt`。</details>
**Q8. 为什么 `echo 'Hi ${name}'` 输出字面 `Hi ${name}`？**
<details><summary>答案</summary> 单引号内不做任何展开，`$`、`{`、`}` 全是字面字符。</details>

**Q9. `bash -n`、ShellCheck、`shfmt -d` 分别检查什么？**
<details><summary>答案</summary> `bash -n` 只解析语法、不执行；ShellCheck 做 shell 语义与常见陷阱静态分析；`shfmt -d` 只显示格式差异。三者互补，均不能替代运行测试。</details>

**Q10. 为什么 `set -E` 不能保证所有失败都触发 `ERR` trap？**
<details><summary>答案</summary> `set -E` 只扩大 ERR trap 到函数、命令替换和子 shell 的继承范围；if/while 条件、`&&`/`||`、`!` 等语境仍有 ERR/`set -e` 例外。</details>

**Q11. `( cd /tmp; x=1 )` 与 `{ cd /tmp; x=1; }` 执行后有何不同？**
<details><summary>答案</summary> 圆括号在子 shell 中执行，返回后目录与 x 不变；花括号在当前 shell 执行，`cd` 与变量赋值会保留。花括号内部最后一条命令前要有分号或换行。</details>

**Q12. EXIT cleanup 为什么要先保存 `$?`？哪些信号无法捕获？**
<details><summary>答案</summary> cleanup 内执行的 `rm`/`printf` 会覆盖 `$?`，所以先保存并在清理后 `exit "$rc"` 才能保留真正失败码。SIGKILL 与 SIGSTOP 无法捕获。</details>

**Q13. `flock` 的锁文件为什么不应在持锁期间删除重建？**
<details><summary>答案</summary> 锁落在已打开文件的 inode 上。删除重建会产生新 inode，旧进程和新进程可能各锁一个对象，从而同时进入临界区；锁文件留在磁盘并不代表锁仍被持有。</details>

**Q14. `coproc NAME` 生成哪些关键变量？什么时候必须 `wait`？**
<details><summary>答案</summary> `${NAME[0]}` 读协程 stdout，`${NAME[1]}` 写协程 stdin，`${NAME_PID}` 是 PID。保存 PID 后 `wait` 可回收进程并获得真实退出码；持久协程结束输入时还应关闭写端让它收到 EOF。</details>
::: success 学完这一篇，你应该能…
写出带 `set -Eeuo pipefail`、可靠 EXIT cleanup、`while IFS= read -r`、`flock`、`mktemp` 的健壮脚本；用 `getopts`/`select` 处理参数和交互，用函数库组织复用，用 `bash -n`/ShellCheck/shfmt 建立质量门禁；一眼看穿“source 副作用”“管道丢变量”“三目假象”“eval 注入”。
:::

本系列从命令行进入脚本编程的关键一步：[Bash命令学习路线总览](/kb/os/Bash/00-Bash命令学习路线总览/) 前七篇认识命令，本篇起用命令编程。下一步 [高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/) 把 xargs/tee 融入管道流，[实用命令组合与技巧](/kb/os/Bash/10-实用命令组合与技巧/) 是日常高频一行流速查。
