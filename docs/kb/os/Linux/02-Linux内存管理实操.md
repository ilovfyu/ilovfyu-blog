---
title: "Linux 内存管理实操"
permalink: /kb/os/Linux/02-Linux内存管理实操/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Linux 进程与调度实操", link: /kb/os/Linux/01-Linux进程与调度实操/ }
next: { text: "Linux 文件系统与磁盘实操", link: /kb/os/Linux/03-Linux文件系统与磁盘实操/ }
knowledgeNote:
  series: "OS"
  group: "Linux"
---
::: abstract 本章定位
把 Ch8 Main Memory 与 Ch9 Virtual Memory 落到 Linux 上：用 `free` 看懂内存去哪了，用 `vmstat` 观察换页与 CPU，用 `pmap`/`/proc/&lt;pid&gt;/maps` 拆解进程地址空间，用一段 `mmap` 的 C 代码亲手验证"虚拟内存是懒加载的"，最后理解 swap 策略与 OOM Killer 怎么选受害者。概念原理对应 [内存管理](/kb/os/内存/01-内存管理基础与连续分配/)、[虚拟内存](/kb/os/内存/04-虚拟内存与按需分页/) 与 [内存调优](/kb/os/内存/06-内存性能与系统调优/)。
:::

"内存不够了"是所有线上事故里最常听到的一句。但 Linux 的 `free` 告诉你：`free` 少 ≠ 内存不够，`buff/cache` 大 ≠ 泄漏。这一篇的目标：**拿到任何一台 Linux 机器，能准确说出内存被谁占了、多少可回收、swap 有没有在换、OOM 会不会来。**

## 1. free：内存总览

### 1.1 基本输出

```bash
free -h
```
预期输出片段：
```
              total        used        free      shared  buff/cache   available
Mem:          7.8Gi       2.8Gi       1.2Gi       9.0Mi       3.8Gi       4.5Gi
Swap:         2.0Gi          0B       2.0Gi
```
解读：
| 字段 | 含义 |
|---|---|
| `total` | 物理内存总量 |
| `used` | 实际已被程序占用的内存（不含可回收缓存） |
| `free` | **完全没被分配**的内存——这个数字小不代表内存紧张 |
| `shared` | tmpfs 等共享内存 |
| `buff/cache` | 内核拿来做缓冲与缓存的页，**随时可回收** |
| `available` | **真实可用** = free + 可回收的 cache，应用申请内存时看它 |
| `Swap` | 交换分区：`used`>0 说明内存曾/正在吃紧 |

::: important 判断内存健康看 `available`，不看 `free`
`free` 是"还没发出去的工资"，`available` 是"能立刻动用的现金"。Linux 把空闲内存尽量用作 cache，所以 `free` 常年很小是正常的，`available` 接近 0 才该报警。
:::

### 1.2 buffer 与 cache 的区别

教材把两者统称"缓冲区"，Linux 里严格区分：

| 维度 | buffer（缓冲区） | cache（缓存） |
|---|---|---|
| 服务对象 | 块设备（磁盘）读写 | 文件页缓存（page cache） |
| 本质 | 还没写完/没读完的数据暂存 | 已读文件的副本，下次直接命中 |
| 典型场景 | 写盘数据积攒批量刷盘 | 打开过的文件再次读取秒开 |
| 看哪列 | `free` 的 `buff` 列 | `free` 的 `cache` 列 |

```bash
# 亲眼看 cache 涨：读一个大文件，free 的 cache 会显著上升
free -h
dd if=/dev/zero of=/tmp/big bs=1M count=512
cat /tmp/big > /dev/null    # 读入 page cache
free -h                     # 对比 buff/cache 的变化
```
::: tip cache 不回收？回收命令
`sync` 先落盘，`echo 1 > /proc/sys/vm/drop_caches` 清 page cache（`2`=清 dentries/inodes，`3`=全清）。**生产环境慎用**，通常没必要——内存不足时内核会自动回收 cache。
:::

## 2. /proc/meminfo：细粒度真相

```bash
grep -E 'MemTotal|MemFree|MemAvailable|Buffers|^Cached|SwapTotal|SwapFree|Dirty|Writeback' /proc/meminfo
```
预期输出片段：
```
MemTotal:        8140772 kB
MemFree:         1254448 kB
MemAvailable:    4730432 kB
Buffers:          128032 kB
Cached:          3565248 kB
SwapTotal:       2097148 kB
SwapFree:        2097148 kB
Dirty:              4512 kB
Writeback:             0 kB
```
解读：
- `Cached` = page cache（文件页）；`Buffers` = 块设备缓冲。
- `Dirty`：已修改、还没写回磁盘的页。**Dirty 一直涨且落不下来** → 磁盘写太慢。
- `Writeback`：正在写回磁盘的页。
- 这些字段是 `free`、`vmstat` 的底层数据来源，诊断时直接读它更精确。

## 3. vmstat：内存 + 换页 + CPU 一屏看全

```bash
vmstat 1 5
```
预期输出片段：
```
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 2  0      0 1254448 128032 3565248    0    0    12    27  100  210  4  2 93  1  0
 1  0      0 1254400 128032 3565248    0    0     0     0   90  190  3  2 94  0  0
```
解读关键列：
| 列 | 含义 | 什么时候该紧张 |
|---|---|---|
| `r` | 就绪队列长度（等待 CPU 的进程数） | 长期 > 核数 → CPU 瓶颈 |
| `b` | 阻塞中的进程数 | 长期 > 0 → IO 卡住 |
| `swpd` | 已用 swap 量 | 长期 > 0 → 内存曾经/正在吃紧 |
| `si` / `so` | **swap in/out 每秒换入/换出 KB** | **>0 说明内存真的不够**，在"用磁盘当内存" |
| `bi`/`bo` | 块设备每秒读入/写出 KB | bi 大=读盘多，bo 大=写盘多 |
| `in`/`cs` | 每秒中断 / 上下文切换次数 | cs 激增可能锁竞争 |
| `us`/`sy`/`wa`/`id` | 用户/内核/等待 IO/空闲 CPU% | 同 [Linux进程与调度实操](/kb/os/Linux/01-Linux进程与调度实操/) |

::: warning `si`/`so` 是内存告警的硬指标
一旦出现 `si`/`so` 持续非 0，说明系统在内存与磁盘之间反复倒腾，性能断崖式下跌。先看是不是有进程内存泄漏，再看 swap 策略是否需要调整（`cat /proc/sys/vm/swappiness`）。
:::

## 4. top 里的内存三兄弟：VIRT / RES / SHR

```bash
top -b -n1 | grep -E 'PID|mysqld'
```
预期输出片段：
```
    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
   1120 mysql     20   0 1875432 305432  11812 S   2.3   3.8   0:31.22 mysqld
```
解读：
| 列 | 含义 | 与教材对应 | 注意 |
|---|---|---|---|
| `VIRT` | 虚拟地址空间总大小（text+data+heap+stack+mmap 映射） | 逻辑地址空间 | **只申请未使用的部分不计物理内存**，能到几个 GB 都正常 |
| `RES` | 常驻物理内存 = 此刻真实占用的 RAM | 驻留集 | **看内存占用就看 RES** |
| `SHR` | 共享内存页（库、page cache 共享部分） | 共享页 | SHR 计入 RES，但多人共享的库只占一份物理内存 |
| `%MEM` | RES / MemTotal | — | 多进程各自算，加起来可能超 100% |

::: tip VIRT 巨大不代表泄漏
Java/Python 进程 VIRT 几十 GB 很常见（预分配的堆、mmap 映射文件、共享库段）。判断泄漏用 RES 的变化趋势，见第 8 节实验。
:::

## 5. pmap：单进程地址空间全解

```bash
pmap -x 2150
```
预期输出片段：
```
2150:   sleep 300
Address           Kbytes     RSS   Dirty Mode  Mapping
0000556b3c000000      92      88       0 r-x--  sleep
0000556b3c520000       4       4       4 rw---  sleep
00007f4a80000000     160     148       0 r-x--  libc-2.31.so      ← 共享库（SHR）
00007f4a80280000    1460    1016       0 r----  libc-2.31.so
00007f4a80400000       8       8       8 rw---  libc-2.31.so
00007f4a80800000     132      12       0 rw---  [anon]            ← 匿名内存（堆/栈）
00007ffff7fe8000     132      12       0 rw---  [stack]           ← 栈
00007ffffffdd000       4       0       0 -----  [anon]
total kB            8116    2024      ?
```
解读：
- **Mapping 列**：可执行文件、共享库（映射进进程的页面）、`[anon]`（匿名页=堆、`mmap` 的私有内存）、`[stack]`、`[heap]`。
- **RSS 列** = 各段真实占用的物理内存，加总近似 RES。
- 教材说"进程 = text/data/heap/stack 四段"，`pmap` 让你看到远比四段更细的映射表。

## 6. /proc/&lt;pid&gt;/maps 与 smaps

```bash
cat /proc/2150/maps | head -8
```
预期输出片段：
```
556b3c000000-556b3c017000 r-xp 00000000 08:01 393221 /usr/bin/sleep
556b3c016000-556b3c017000 r--p 00001000 08:01 393221 /usr/bin/sleep
556b3c017000-556b3c018000 rw-p 00002000 08:01 393221 /usr/bin/sleep
7f4a7fdd7000-7f4a80000000 r-xp 00000000 08:01 130646 /usr/lib/x86_64-linux-gnu/libc.so.6
7ffde3f6d000-7ffde3f8e000 rw-p 00000000 00:00 0 [stack]
```
解读每段格式：`起始-结束  权限  偏移  设备号(inode 设备)  文件 inode  文件路径`。权限位 `r-xp` 的 `p`=私有、`s`=共享；文件映射（可执行、库、普通文件）与匿名映射（heap/stack）一目了然。

```bash
grep -E 'Rss|Pss|Size' /proc/2150/smaps | head -6
```
解读：`smaps` 对每段给出 `Size`（虚拟）、`Rss`（常驻）、**`Pss`（按共享比例折算的占用）**。多进程共享的库在 Pss 里只算"自己那份"，比 Rss 更能反映真实开销。诊断"谁占内存"用 `grep -m1 Pss` 逐进程求和。

## 7. mmap：用 C 代码验证虚拟内存

教材说"按需分页：只有访问到的页才进物理内存"。一段 C 代码即可验证：

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <unistd.h>

#define SIZE (1024*1024*1024)   /* 1 GiB */

int main(void) {
    /* MAP_ANONYMOUS | MAP_PRIVATE: 私有匿名映射，不关联文件 */
    char *p = mmap(NULL, SIZE, PROT_READ|PROT_WRITE,
                   MAP_PRIVATE|MAP_ANONYMOUS, -1, 0);
    if (p == MAP_FAILED) { perror("mmap"); exit(1); }

    printf("mmap 完成: 映射 %lu MiB, 尚未真正占用内存\n", SIZE/1024/1024);
    printf("按回车后逐页写内存, 观察 RES 增长...\n");
    getchar();

    for (size_t i = 0; i < SIZE; i += 4096) {  /* 每页写一个字节触发缺页 */
        p[i] = 1;
    }
    printf("已写入全部页, 现在内存被真实占用\n");
    getchar();

    munmap(p, SIZE);  /* 释放 */
    printf("munmap 完成\n");
    return 0;
}
```
```bash
gcc -o mmap_test mmap_test.c && ./mmap_test &
# 在另一个终端观察：mmap 后 RES 不涨，逐页写入后 RES 涨到 ~1GiB
watch -n1 'grep -E "VmSize|VmRSS" /proc/$(pgrep -n mmap_test)/status'
```
预期输出片段（写入后）：
```
VmSize:  1048624 kB      ← 虚拟地址空间一直有 1 GiB
VmRSS:   1048436 kB      ← 写入后常驻内存涨到 ~1 GiB
```
解读：**只 mmap 不访问时 VmRSS ≈ 0**，说明"按需分配"真实存在——虚拟地址空间先铺好，物理页等你摸到才落地。这就是教材里 demand paging 的现场演示。`MAP_SHARED` 则可用于多进程共享同一物理页。

## 8. 内存泄漏观察实验

内存泄漏 = RES 只涨不跌。用脚本模拟（真实程序同理）：

```bash
# 文件: leak.sh —— 每秒吃 64MB，10 秒后停止
#!/bin/bash
for i in $(seq 1 10); do
  head -c 67108864 /dev/zero > /dev/null &
  # 真实泄漏一般来自 malloc/引用未释放；这里用后台进程模拟"常驻增长"
  sleep 1
done
```
```bash
# 更直观：用 python 直接演示 RES 单调上升
python3 -c '
import time, os
data = []
for i in range(1, 11):
    data.append(bytearray(64 * 1024 * 1024))   # 每次 +64MB 且不释放
    print(i * 64, "MB", flush=True)
    time.sleep(1)
time.sleep(30)   # 保持 30 秒方便观察
'
# 在另一个终端：
watch -n1 'ps -o pid,rss,comm -p $(pgrep -n python3)'
```
预期输出片段：
```
    PID      RSS COMMAND
   2170 33554432 python3        # 约 32MB
   2170 67108864 python3        # 64MB ... 持续单调上升
   2170 100663296 python3       # 96MB
```
解读：
- 用 `top -M` 或 `ps -o rss` 盯 **RSS 的趋势**，而不是某个瞬间的值。
- 上升后**不回落** = 泄漏；上升后回落 = 只是 GC/缓存。配合 `pmap` 找出是 `[heap]` 还是 `[anon]` 段在涨，就能定位到代码。

::: warning OOM 前的最后防线
泄漏进程可能触发 OOM Killer。见下节，务必在虚拟机里做实验。
:::

## 9. swap 与 OOM

### 9.1 swap 使用策略

```bash
cat /proc/sys/vm/swappiness        # 默认 60
```
解读：`swappiness` 0~100，控制内核"多积极地用 swap"。**高** → 更早把冷页换出（省内存、保 cache）；**低** → 尽量不换，内存满才换。数据库/Redis 通常调低（如 10），避免关键数据被换出。

```bash
swapon -s        # 查看 swap 设备
sudo swapon /swapfile && sudo swapoff /swapfile    # 临时开/关 swap 文件
```
::: warning swap 不是越多越好
swap 是内存的"救火队"：平时 0 使用最好；但完全不配 swap 时，突发内存压力会直接触发 OOM。线上常见配置：内存的 1~2 倍或与内存相当，配合 `vm.overcommit_memory` 谨慎调整。
:::

### 9.2 OOM Killer 现场

内存耗尽时内核选一个进程杀。制造现场（虚拟机中）：

```bash
# 打开一个终端持续观察内核日志
dmesg -wT
# 另一个终端触发：分配远超物理内存的匿名内存
python3 -c 'x = bytearray(4 * 1024 * 1024 * 1024); input()'
```
预期输出片段（dmesg）：
```
[ 1234.56] Out of memory: Killed process 2210 (python3) total-vm:4258816kB,
           anon-rss:4182004kB, file-rss:0kB, shmem-rss:0kB, oom_score_adj:0
[ 1234.57] oom-kill:constraint=CONSTRAINT_NONE,nodemask=(null),...
```
解读：
- OOM Killer 按 **oom_score**（基于 RES 大小 + `oom_score_adj`）选"占内存多且不重要"的进程杀。
- `dmesg` 里能看到被杀进程的 PID 与内存细节——这是排查"进程莫名消失"的第一现场。
- 紧急干预：`echo 1 > /proc/sys/vm/panic_on_oom`（内核 panic 而非杀进程，按需）。

## 10. 本章小结

- 看内存总量用 `free -h`：`available` = `free` + 可回收 cache，是判断"够不够"的指标；`free` 小是常态。
- `buff`（块设备缓冲）与 `cache`（文件页缓存）服务对象不同，都可回收。
- `vmstat` 的 `si/so` > 0 是内存告警硬指标；`Dirty`/`Writeback` 反映写盘是否滞后。
- VIRT 是虚拟地址空间、RES 是常驻物理内存、SHR 是共享页；**诊断泄漏盯 RES 趋势**。
- `pmap`/`/proc/&lt;pid&gt;/maps`/`smaps` 把进程地址空间拆解到每一段，Pss 更能反映真实占用。
- `mmap` 实验证明"按需分页"真实存在；swap 是救火队，OOM 是最后的地狱——`dmesg` 会告诉你它杀了谁。

## 11. 动手实验

1. **cache 实验**：用 `free -h` 前后对比，观察 `dd` 生成大文件后 `buff/cache` 上升、`available` 变化，再 `echo 3 > /proc/sys/vm/drop_caches`（需要 root）观察 cache 回落。
2. **mmap 实验**：编译运行第 7 节 C 代码，用 `watch` 盯 `VmRSS` 从 0 涨到 1GiB，理解按需分页。
3. **泄漏观察**：跑第 8 节 python 泄漏脚本，用 `watch -n1 'ps -o pid,rss,comm -p &lt;pid&gt;'` 记录 RSS 上升曲线，再用 `pmap -x &lt;pid&gt;` 看哪一段在涨。
4. **swap 压力实验**（虚拟机）：把 swappiness 临时设 100（`sudo sysctl vm.swappiness=100`），跑大内存程序，观察 `vmstat 1` 的 `si/so` 出现。
5. **OOM 实验**（虚拟机）：用第 9 节的 python 命令触发 OOM，用 `dmesg -T | grep -i oom` 找到被杀进程的完整记录。

## 12. 自测题

1. **`free` 显示 `free` 只有 300MB、`used` 3GB，需要报警吗？** 不一定——要看 `available`。如果 `buff/cache` 有大量可回收页，`available` 充足，属于正常缓存策略。
2. **`vmstat` 的 `si` 和 `so` 突然飙升意味着什么？** 系统正在内存与 swap 之间高频倒腾，内存严重不足，性能会断崖下跌；需排查泄漏或调大内存。
3. **VIRT 巨大但 RES 很小，正常吗？** 正常。VIRT 只代表地址空间预留（含 mmap 映射、共享库），只有访问过的页才会变成 RES（按需分页）。
4. **怎样快速定位"哪个进程在泄漏内存"？** 用 `top -M` 或循环采样 `ps -o rss`，找 RSS 单调增长且不回落、`%MEM` 持续上升的进程，再用 `pmap` 定位增长的段。
5. **OOM Killer 如何选择被杀对象？** 按 oom_score 排序（默认与 RES 成正比，`oom_score_adj` 可手动加减），倾向于杀占用大且"不重要"的进程，日志在 `dmesg`。
