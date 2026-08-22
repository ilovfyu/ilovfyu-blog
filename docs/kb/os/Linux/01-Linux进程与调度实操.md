---
title: "Linux 进程与调度实操"
permalink: /kb/os/Linux/01-Linux进程与调度实操/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Linux 实操学习路线", link: /kb/os/Linux/00-Linux实操学习路线/ }
next: { text: "Linux 内存管理实操", link: /kb/os/Linux/02-Linux内存管理实操/ }
knowledgeNote:
  series: "OS"
  group: "Linux"
---
::: abstract 本章定位
把 Ch3 Processes 与 Ch5 CPU Scheduling 落到 Linux 上：用 `ps` 读出进程状态机（STAT 字母），用 `top`/`htop` 看懂 load average 与 CPU 时间片分布，用 `kill`/`nice`/`renice` 干预进程生命周期与优先级，最后亲手制造并清除一个僵尸进程，把"僵尸/孤儿"从概念变成亲眼所见。概念原理对应 [进程模型](/kb/os/进程线程/01-进程概念与状态模型/) 与 [调度算法](/kb/os/进程线程/05-CPU调度算法详解/)。
:::

教材里的 5 状态状态机（new/ready/running/waiting/terminated）在 Linux 里就是 `ps` 输出中的 `STAT` 列。这一篇的全部目标：**你看到任意一个进程的 STAT，能说出它此刻在内核里的状态；看到 `top` 的第一屏，能说出系统现在忙不忙、忙在什么地方。**

## 1. ps：进程快照

### 1.1 `ps -ef`：全进程列表

```bash
ps -ef
```
预期输出片段：
```
UID          PID    PPID  C STIME TTY          TIME CMD
root           1       0  0 20:15 ?        00:00:03 /sbin/init
root         523       1  0 20:16 ?        00:00:00 /usr/sbin/sshd -D
zhang       1500    1499  0 21:02 pts/1    00:00:00 -bash
zhang       2110    1500  0 21:10 pts/1    00:00:00 ps -ef
```
解读：
- **UID**：进程属主；**PID**：进程号；**PPID**：父进程号（`PID=1` 的 init/systemd 是"老祖宗"）。
- **C**：CPU 占用百分比（近似值）；**STIME**：启动时刻；**TTY**：关联终端（`?` 表示无终端，通常是守护进程）。
- **CMD**：完整命令行。`ps` 本身也在列表里——"ps 是进程，也有自己的 PID"。

### 1.2 `ps -eo`：自定义输出列

`-e` 表示所有进程，`-o` 指定列，这是读状态机的关键：

```bash
ps -eo pid,ppid,stat,pri,ni,comm --sort=-pid | head -15
```
预期输出片段：
```
    PID    PPID STAT PRI  NI COMMAND
   2115    1500 R+    80   0 ps
   2110    1500 S+    80   0 bash
   1499    1498 S     80   0 bash
    523       1 Ss    80   0 sshd
      2       0 S     80   0 kthreadd
      1       0 Ss    80   0 systemd
```
解读：
- `--sort=-pid`：按 PID 倒序，新进程排前面，方便观察刚启动的进程。
- **STAT 列**就是 Linux 版进程状态机，见下表；**PRI** 为内核优先级（数字越小越优先），**NI** 为 nice 值。

### 1.3 STAT 字母全解

| 字母 | 含义 | 对应教材状态 | 典型场景 |
|---|---|---|---|
| `R` | running / runnable | running/ready | 正在用 CPU，或在就绪队列等待被调度 |
| `S` | sleeping（可中断睡眠） | waiting | 等终端输入、等网络、`sleep` 命令——最常见 |
| `D` | uninterruptible sleep（不可中断） | waiting（特殊） | 等待磁盘 IO，不能被杀也不能被中断；大量 D 说明 IO 卡住 |
| `T` | stopped（被暂停） | （教材中的挂起态） | `kill -STOP` 或 Ctrl+Z 后的进程 |
| `t` | tracing stop | — | 被调试器（gdb）停住 |
| `Z` | zombie（僵尸） | terminated 但未回收 | 子进程已 exit，父进程没调用 wait() |
| `I` | idle（内核空闲线程） | — | 内核的空转线程，负载为 0 时最活跃 |

附加修饰符：
- `+`：属于**前台进程组**（直接挂在终端前的进程，如前台运行的 `vim`）。
- `<`：高优先级；`N`：低优先级（nice 为正）；`L`：有页面锁定在内存；`l`：多线程进程。
- 大小写组合如 `Ss` = 进程组长 + 睡眠，`S+` = 前台 + 睡眠。

```bash
# 亲眼看一次状态：sleep 是 S，自己这个 ps 是 R+，grep 自己也是 S
ps -eo stat,comm | grep -E 'sleep|ps'
```
::: tip 记忆口诀
R 在跑、S 在睡、D 等磁盘、T 被停、Z 是尸体、I 是空转。看到 `D` 和 `Z` 要警惕：`D` 查磁盘 IO，`Z` 查父进程的 `wait`。
:::

## 2. top / htop：动态看系统

### 2.1 top 第一屏

```bash
top -b -n1 | head -20
```
预期输出片段：
```
top - 21:15:03 up 1 day,  3:12,  2 users,  load average: 0.52, 0.43, 0.40
Tasks: 168 total,   2 running, 165 sleeping,   0 stopped,   1 zombie
%Cpu(s):  5.3 us,  1.8 sy,  0.0 ni, 92.3 id,  0.4 wa,  0.0 hi,  0.1 si,  0.0 st
MiB Mem :   7950.5 total,   1234.1 free,   2831.2 used,   3885.2 buff/cache
MiB Swap:   2048.0 total,   2048.0 free,      0.0 used.   4567.3 avail Mem

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
   1499 zhang     20   0  21156   4128   3104 S   0.0   0.1   0:00.03 bash
   1120 mysql     20   0 1875432 305432  11812 S   2.3   3.8   0:31.22 mysqld
      1 root      20   0  166468  13292   9428 S   0.0   0.2   0:03.11 systemd
```

解读第一行 `load average`：
- 三个数分别是**过去 1、5、15 分钟的负载**（正在运行 + 等待运行 + 不可中断的进程数）。
- 判断规则：`1 分钟 < 5 分钟` 说明负载在下降；持续大于 CPU 核数则说明"排队了"。4 核机器 load 4.0 才是"刚好满"。
- 但 **load 高 ≠ CPU 忙**：不可中断的磁盘 IO（D 状态）同样推高负载，需要结合 `%Cpu` 的 `wa` 一起看。

解读第二段 `%Cpu(s)`：
| 字段 | 含义 |
|---|---|
| `us` | user：用户态程序耗时 |
| `sy` | system：内核态耗时（系统调用、内核工作） |
| `ni` | nice：被 nice 降低优先级进程的用户态耗时 |
| `id` | idle：真正空闲 |
| `wa` | iowait：CPU 空闲但**在等磁盘 IO**，属于"干等着" |
| `hi`/`si` | 硬/软中断处理耗时 |
| `st` | steal：虚拟化中被宿主机抢占的时间 |

::: warning 不要只看 `id` 大就以为没事
`id` 大 + `wa` 大 = CPU 在等磁盘，属于 IO 瓶颈；`us` 高 = 计算密集；`sy` 高 = 系统调用频繁或锁竞争。这三类问题处理方向完全不同。
:::

### 2.2 交互式 top 常用键

| 按键 | 作用 |
|---|---|
| `P` | 按 CPU 排序（默认） |
| `M` | 按内存（RES）排序 |
| `1` | 展开/收起每个 CPU 核 |
| `t` / `m` | 切换 CPU / 内存条形图 |
| `c` | 切换完整命令行 |
| `k` | 输入 PID 发信号（默认 TERM） |
| `r` | 输入 PID 后改 nice 值 |
| `q` | 退出 |

### 2.3 htop：更好看的 top

```bash
htop
```
- 顶部彩色条：每个核的用量与颜色分界（红=内核，绿=用户，蓝=nice）。
- F6 排序、F5 进程树视图、F9 发送信号、F3 搜索。
- 列含义与 top 相同，但可直接用方向键选中进程操作。

## 3. pstree：进程树

```bash
pstree -p
```
预期输出片段：
```
systemd(1)─┬─NetworkManager(492)─┬─{NetworkManager}(513)
           ├─sshd(523)───sshd(1501)───bash(1500)───pstree(2120)
           └─mysqld(1120)─┬─{mysqld}(1121)
                          └─{mysqld}(1122)
```
解读：`{名字}` 是线程（前面说过，`l` 修饰符 = 多线程）。`sshd(523)` 派生出登录会话 `bash(1500)`，`bash` 派生出 `pstree`——这就是 PID 1 到你的命令之间的完整链条。

## 4. 信号与 kill 家族

### 4.1 常用信号

```bash
kill -l
```
输出 1-64 个信号名。最常用：

| 信号 | 编号 | 默认行为 | 何时用 |
|---|---|---|---|
| `SIGHUP` | 1 | 终止 | 终端挂断；守护进程常重载配置 |
| `SIGINT` | 2 | 终止 | Ctrl+C |
| `SIGKILL` | 9 | **立即杀死，不可捕获** | 进程无响应时的最后手段 |
| `SIGTERM` | 15 | 优雅终止 | 默认的 `kill` 信号，先给机会清理 |
| `SIGSTOP` | 19 | 暂停，不可捕获 | `kill -STOP`，等效 Ctrl+Z |
| `SIGCONT` | 18 | 继续 | 让被 STOP 的进程恢复 |

### 4.2 kill / killall / pkill

```bash
sleep 300 &
# 输出: [1] 2150

kill 2150          # 发送 SIGTERM（默认 15），进程优雅退出
kill -9 2150       # SIGKILL，强制杀
kill -STOP 2150    # 暂停进程（等效 Ctrl+Z）
kill -CONT 2150    # 恢复进程
```
解读：`kill` 的本质是"向进程发信号"，不是"杀死"——`kill -STOP` 甚至不会杀它。

```bash
killall sleep          # 按进程名发信号，杀掉所有名为 sleep 的进程
pkill -f "python app"  # 按命令行模式匹配
pkill -9 -u www-data   # 杀掉 www-data 用户的全部进程
```
::: warning 慎用 killall/pkill
匹配范围太大可能误杀（`killall python` 会杀掉所有 python 脚本）。先用 `pgrep -f 模式` 确认匹配名单，再动手。
:::

### 4.3 僵尸进程实验（必做）

僵尸 = 子进程先 exit、父进程不 wait。亲手制造：

```bash
# 文件: zombie.sh
#!/bin/bash
echo "parent PID = $$"
bash -c 'echo "child PID = $BASHPID"; sleep 5' &
sleep 1
echo "parent now sleeping 30s, ps will show zombie"
sleep 30
```
```bash
chmod +x zombie.sh && ./zombie.sh &
```
在另一个终端：
```bash
ps -eo pid,ppid,stat,comm | grep zombie
```
预期输出片段：
```
    PID   PPID STAT COMMAND
   2155   2154 S    zombie.sh        # 父进程，睡眠中
   2156   2155 Z    bash             # 子进程已死，STAT=Z 僵尸！
```
解读：
- 子进程 `bash -c` 只活 5 秒，exit 后父进程 `zombie.sh` 睡 30 秒没 `wait()`，于是子进程的 **task_struct 和 PID 还占着**，变成 `Z`。
- 清除方式：让父进程退出（`kill 2154`），僵尸被 init/systemd 收养并回收；或父进程调用 `wait()`。

```bash
# 观察父进程退出后，僵尸被收养：
kill 2154 && sleep 1 && ps -eo pid,ppid,stat,comm | grep 2156
# 现在 PPID 变成 1，STAT 变 Z 后很快被 systemd 回收消失
```
::: important 为什么必须讲僵尸
面试高频 + 生产事故源：父进程不 wait 且长期运行，僵尸会占满 PID（`pid_max` 默认 4194304）但更常见的问题是配合资源泄漏。`top` 第一屏 `Tasks` 行的 `1 zombie` 就是这个意思。
:::

### 4.4 孤儿进程

孤儿 = 父进程先死，子进程被 PID 1 收养：

```bash
# 文件: orphan.sh
#!/bin/bash
bash -c 'echo "child=$BASHPID ppid=$PPID"; sleep 10' &
echo "parent dies now"
exit 0
```
```bash
./orphan.sh && ps -o pid,ppid,stat,comm -C sleep
```
解读：父进程立刻退出，`sleep` 子进程的 PPID 会被改为 1（systemd 收养），不会变僵尸——孤儿由内核转交给 init，由 init 负责回收。

## 5. nice / renice：调整优先级

教材说 Linux 用 CFS 公平调度，但允许通过 **nice 值**（-20 ~ 19，数字越小越优先）调节"不公平"。

```bash
nice -n -10 ./heavy_task &     # 启动时给高优先级（负数=高，需要权限）
nice -n 10 ./heavy_task &      # 低优先级（不影响别人）
sleep 300 &
renice 5 $!                    # 把刚起的 sleep 的 nice 调成 5
ps -o pid,ni,pri,stat,comm -p $!
```
预期输出片段：
```
    PID  NI PRI STAT COMMAND
   2160   5  25 S    sleep
```
解读：NI 变 5 → PRI 从 20 变为 25（内核优先级数字大 = 低）。普通用户只能把 nice 调大（更谦让），调小（抢 CPU）需要 root。

```bash
# 查看每个核的调度策略
chrt -l
```
预期输出：
```
SCHED_OTHER  0   CFS，完全公平调度（默认）
SCHED_FIFO   1   实时策略，先到先做直到让出
SCHED_RR     2   实时策略，带时间片轮转
```

## 6. /proc：进程的内核档案

`/proc` 是伪文件系统，`/proc/&lt;pid&gt;/` 就是该进程的 PCB 快照。

### 6.1 /proc/&lt;pid&gt;/status

```bash
cat /proc/2150/status
```
预期输出片段：
```
Name:   sleep
State:  S (sleeping)          ← 状态机就在这
Tgid:   2150                  ← 线程组 ID
Pid:    2150
PPid:   2150
VmSize: 20364 kB              ← 虚拟地址空间大小
VmRSS:   1288 kB              ← 常驻物理内存
Threads: 1                    ← 线程数
voluntary_ctxt_switches: 12   ← 主动让出 CPU 的次数
nonvoluntary_ctxt_switches: 1 ← 被抢占的次数
```

### 6.2 /proc/&lt;pid&gt;/stat

机器可读的进程统计，第二字段是带括号的命令名，第三字段是状态：

```bash
awk '{print $1, $3, $22, $23}' /proc/2150/stat
```
```
2150 S 200000000 183000000
```
解读：`$3`=状态字母，`$22`/`$23` 分别是 utime/stime（以 tick 计的 CPU 时间）。`ps`、`top` 的原始数据就是从这里读的。

### 6.3 自己给自己看

```bash
echo "$$ 是我的 PID"
cat /proc/$$/status | grep -E 'Name|State'
ls /proc/$$/fd | head -5      # 打开的文件描述符表
ls /proc/$$/task               # 进程内的线程目录
```

## 7. watch：定时刷新观察

配合实验，动态观察进程状态：

```bash
watch -n 1 'ps -eo pid,stat,comm --sort=pid | grep -E "sleep|zombie|bash"'
```
解读：每秒刷新一次，适合观察僵尸从出现到被回收的全过程，比手动反复敲 `ps` 方便得多。退出按 `Ctrl+C`。

## 8. 本章小结

- 进程状态机在 Linux 里就是 `ps STAT` 列：R 在跑、S 在睡、D 等 IO、T 被停、Z 僵尸、I 空转，`+` 表示前台。
- `top` 第一屏两段关键信息：load average（1/5/15 分钟负载）与 `%Cpu(s)`（us/sy/wa/id 分布）。load 高要看是不是 `wa` 撑起来的。
- 信号是"给进程发指令"：SIGTERM 优雅、SIGKILL 强杀、SIGSTOP/CONT 暂停/恢复；`kill`/`killall`/`pkill` 只是三种发送方式。
- 僵尸 = 子先死父不 wait；孤儿 = 父先死被 init 收养。都能用脚本复现、用 `ps` 观察到。
- `/proc/&lt;pid&gt;/status` 是 PCB 的用户可见投影，`ps`/`top` 的一切输出都源于此。

## 9. 动手实验

1. **状态观察**：开一个终端跑 `sleep 300`，另一个终端用 `watch -n1 'ps -o pid,stat,comm -C sleep'` 观察它稳定在 `S`；按 `Ctrl+Z` 暂停后观察变 `T`，`kill -CONT` 后回到 `S`。
2. **僵尸制造与清除**：运行 4.3 节的 `zombie.sh`，用 `watch` 看到 `Z` 出现，然后 `kill` 父进程，观察僵尸消失。
3. **优先级实验**：写个死循环脚本 `while true; do :; done`，分别用 `nice -n -10` 和 `nice -n 19` 启动两个实例，用 `top -b -n1` 观察两个进程 `%CPU` 的差别。
4. **信号实验**：`sleep 100 &` 后用 `kill -STOP $!`、`kill -CONT $!`、`kill -TERM $!` 三连，每步用 `ps -o stat,comm -p $!` 确认状态变化。
5. **/proc 探索**：找一个在跑的进程（如 `pgrep sshd`），通读 `/proc/&lt;pid&gt;/status` 的 `State`、`VmRSS`、`Threads`、`voluntary_ctxt_switches`，并 `cat /proc/&lt;pid&gt;/cmdline | tr '\0' ' '` 看完整命令行。

## 10. 自测题

1. **STAT 为 `D` 的进程意味着什么？为什么不能 kill 掉？** D=不可中断睡眠，通常在等磁盘 IO；内核认为它还在执行内核态关键操作，发信号不会立刻处理。
2. **load average 1.5 在 4 核机器上代表什么？** 平均有 1.5 个任务在跑/等 CPU，远低于 4 核容量，说明 CPU 不忙；但要结合 `%Cpu` 的 `wa` 确认是不是磁盘在拖累。
3. **僵尸进程占用哪些资源？如何预防？** 占用 PCB 与 PID 号，不占内存和 CPU；预防=父进程调用 `wait()`（或用 SIGCHLD 信号处理），或让进程被杀时父进程及时回收。
4. **`kill -9` 与 `kill -15` 的区别？** 15 可被进程捕获并优雅清理后退出；9 直接被内核终止，进程无任何清理机会，可能留下脏数据或未写回的缓存。
5. **为什么普通用户不能把 nice 设为负数？** 负数表示抢占更多 CPU，属于特权操作（防止普通用户饿死他人），需要 CAP_SYS_NICE/root。
