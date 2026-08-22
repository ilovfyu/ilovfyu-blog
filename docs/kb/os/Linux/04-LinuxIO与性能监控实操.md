---
title: "Linux IO 与性能监控实操"
permalink: /kb/os/Linux/04-LinuxIO与性能监控实操/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Linux 文件系统与磁盘实操", link: /kb/os/Linux/03-Linux文件系统与磁盘实操/ }
next: { text: "Linux 网络与系统调用实操", link: /kb/os/Linux/05-Linux网络与系统调用实操/ }
knowledgeNote:
  series: "OS"
  group: "Linux"
---
::: abstract 本章定位
把 Ch11 Mass-Storage 与 Ch12 I/O Systems 落到 Linux 上：用 `iostat`/`sar` 量化磁盘吞吐与利用率，用 `iotop`/`pidstat` 定位"哪个进程在读写"，用 `strace` 抓系统调用，用 `dd`/`fio` 亲手测磁盘速度，最后对比"页缓存 IO 与 direct IO"的真实差异，理解 IO 调度器在中间做了什么。概念原理对应 [IO子系统](/kb/os/IO/03-内核IO子系统与缓冲/) 与 [磁盘调度](/kb/os/存储/02-磁盘调度算法与RAID/)。
:::

教材里讲 DMA、中断、缓冲、调度算法，但"这台机器磁盘到底忙不忙、谁在拖慢它"要靠 `iostat` 这类工具回答。这一篇的目标：**看到任何一台机器，能判断瓶颈在 CPU 还是磁盘；看到 `%util`，能分清它到底代表什么。**

## 1. iostat：磁盘吞吐与利用率

### 1.1 基础输出

```bash
iostat -d 1 3
```
预期输出片段：
```
Device             tps    kB_read/s    kB_wrtn/s    kB_read    kB_wrtn
sda               12.4        256.0       1024.0    1024000    4096000
```
解读：
- `tps`：每秒 IO 请求次数（包含读+写）。
- `kB_read/s`/`kB_wrtn/s`：每秒读写吞吐（KB）。
- `kB_read`/`kB_wrtn`：本次统计区间内的累计量。

**怎么读**：`tps` 高 + `kB_read/s` 低 = 大量小 IO（随机读/写，比如数据库随机读写、小文件日志）；`tps` 低 + 吞吐高 = 大块顺序 IO。这两类瓶颈的优化方向完全不同。

### 1.2 -x 扩展：%util 与 await

```bash
iostat -x 1 3
```
预期输出片段：
```
Device   r/s   w/s   rkB/s   wkB/s  rrqm/s  wrqm/s  %rrqm  %wrqm r_await w_await aqu-sz rareq-sz wareq-sz  svctm  %util
sda      5.2   7.1   128.0   360.0    0.0     4.0    0.0    36.0   2.1     3.4    0.05    24.5     50.7    1.2   8.5
```
解读关键列：
- `r/s`/`w/s`：每秒读写请求数（=tps 拆分）。
- `r_await`/`w_await`：**平均每次读/写请求的等待时间（毫秒）**，是判断磁盘快慢的核心指标。
- `aqu-sz`：平均排队请求数。
- `svctm`：平均服务时间（已不推荐用于现代盘）。
- **`%util`**：设备忙绿百分比（有请求在服务的时间占比）。

::: warning %util 的经典误区
教材对磁盘调度讲"磁盘利用率"，但现代 SSD 支持队列并发（NCQ/NVMe 多队列），**`%util` 到 100% 不一定代表磁盘饱和**，固态盘经常 `%util` 虚高。判断真瓶颈看 **`await` 是否持续远大于盘的理论延迟**（机械盘 >30ms、SATA SSD >10ms、NVMe >2ms 就该警惕）。`iostat -x` 需要 root。
:::

## 2. sar -d：历史 IO 数据

```bash
sar -d 1 5
```
预期输出片段：
```
08:30:01    DEV       tps     rkB/s     wkB/s   areq-sz    aqu-sz     await     svctm     %util
08:30:02    sda       6.0     120.0      40.0    26.7      0.02      3.00     1.20      0.7
```
解读：`sar` 是 **sysstat** 包的历史采样工具，`sar -d` 列含义与 `iostat` 一致。配合 `sar -u`（CPU）、`sar -r`（内存）可以把时间回溯到"事故发生的那几分钟"，是做故障复盘的标准动作。若系统装了 `sysstat` 的 cron，`sar -d -f /var/log/sysstat/saXX` 可读历史文件。

## 3. iotop：谁在读写

```bash
sudo iotop -o          # -o 只显示有 IO 活动的进程
```
预期输出片段：
```
  TID  PRIO  USER     DISK READ  DISK WRITE  SWAPIN     IO>    COMMAND
 1120 be/4  mysql      120.0 K/s     40.0 K/s  0.00 %  5.10 %  mysqld
 3210 be/4  zhang        0.0 B/s     80.0 K/s  0.00 %  2.30 %  dd
```
解读：按 `IO>`（IO 等待占比）排序，一眼看出**哪个进程**在产生磁盘负载。`iotop` 是"进程视角"的磁盘监控，和 `iostat` 的"设备视角"互补：先 `iostat` 确认磁盘忙，再 `iotop` 找元凶。

## 4. pidstat -d：按进程统计 IO

```bash
pidstat -d 1 5
```
预期输出片段：
```
   PID   %usr %system   kB_rd/s   kB_wr/s kB_ccwr/s  Command
  1120   1.20    0.80    120.00    360.00      0.00  mysqld
  3210   0.00    0.10      0.00     80.00      0.00  dd
```
解读：`pidstat -d` 按进程给每秒读写量，是排查"哪个进程在疯狂写盘"的利器，且输出适合脚本化。常与 `pidstat -w`（上下文切换）、`pidstat -r`（内存）组合使用。

## 5. iowait 与 idle 的区别

```bash
vmstat 1 5          # 关注 wa 列
```
预期输出片段：
```
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 0  1      0 1234567 128032 3565248    0    0  2048   128  110  210  3  2 30 64  0
```
解读：`wa`(iowait) = 64% 但 `id` = 30%——CPU 大量时间在**等磁盘**。

| 字段 | 含义 | 说明 |
|---|---|---|
| `id` | CPU 空闲 | 无事可做，等新任务 |
| `wa` | iowait | CPU 想干活但**卡在等 IO 完成**，属于"忙等" |

::: important 判断标准
`id` 高 + `wa` 高 = 磁盘拖后腿（优化磁盘）；`id` 高 + `wa` 低 = 真的空闲；`id` 低 + `us` 高 = CPU 计算瓶颈。iowait 本质上"浪费的 CPU"，所以大 IO 负载机器上进程会显得"CPU 利用率不高但系统很慢"。
:::

## 6. strace：抓系统调用

```bash
strace -e trace=read,write dd if=/dev/zero of=/tmp/x bs=4k count=100
```
预期输出片段：
```
write(1, "\0\0\0\0...", 4096) = 4096
write(1, "\0\0\0\0...", 4096) = 4096
...
write(1, "\0\0\0\0...", 4096) = 4096
```
解读：`strace -e trace=read,write` 只跟踪两类系统调用。看到每次 `write` 都是 4096 字节（=块大小），进程层面就完成了 IO 请求的发起。**文件系统缓存层让 `write` 立刻返回**——数据只是进了 page cache，还没到磁盘，这就是第 8 节 `direct` 差异的根源。

```bash
# 追一个已有进程（例如卡住的 dd）
sudo strace -p 3210 -e trace=read,write -f
```
预期输出片段：
```
[pid 3210] write(1, "\0\0\0\0...", 4096) = 4096
[pid 3210] write(1, "\0\0\0\0...", 4096) = 4096
[pid 3210] fsync(1) = 0
```
解读：挂到进程上可以实时看到它"卡在哪个调用上"。`fsync` 出现说明程序在强制刷盘——`fsync` 慢几乎都意味着磁盘是瓶颈。

## 7. dd：测 IO 速度

### 7.1 基础测速

```bash
dd if=/dev/zero of=/tmp/testfile bs=1M count=1024 oflag=dsync
```
预期输出片段：
```
1024+0 records in
1024+0 records out
1073741824 bytes (1.1 GB, 1.0 GiB) copied, 2.832 s, 379 MB/s
```
解读：`oflag=dsync` 让每次写入都同步落盘（绕过缓冲），测出的是**真实磁盘写速度** 379 MB/s。

```bash
dd if=/tmp/testfile of=/dev/null bs=1M count=1024
```
预期输出片段：
```
1024+0 records in
1024+0 records out
1073741824 bytes (1.1 GB, 1.0 GiB) copied, 0.321 s, 3.3 GB/s
```
解读：读 3.3GB/s 远超写速——因为第二次读命中**页缓存**，测的是缓存速度而非磁盘。要测真实磁盘读，加 `iflag=direct` 绕过缓存（见 7.3）。

### 7.2 iflag / oflag 对结果的影响

| 参数 | 含义 | 影响 |
|---|---|---|
| 默认 | 走 page cache | 重复读快（命中缓存），写延迟写入 |
| `oflag=direct` | 写绕过页缓存直接到磁盘 | 测真实写速度，排除缓存干扰 |
| `iflag=direct` | 读绕过页缓存 | 测真实磁盘读速度 |
| `oflag=dsync` | 每次写入立即落盘 | 测"同步写"的代价 |
| `conv=fdatasync` | 结束时落盘 | 测吞吐 + 刷盘总耗时 |

::: warning 测速注意事项
`dd` 是**单线程**测试，真实负载往往是并发；且写满缓存后数据会迟到落盘，所以测"真实"速度必须加 `direct`/`dsync`。文件应放在目标磁盘上，别测到 tmpfs 上。
:::

### 7.3 缓存 vs direct IO 对比实验

```bash
# 预热：先把文件读进 cache
dd if=/tmp/testfile of=/dev/null bs=1M count=1024 > /dev/null 2>&1
# 1) 带缓存读（命中 page cache）
dd if=/tmp/testfile of=/dev/null bs=1M count=1024
# 2) 绕过缓存读（真正打磁盘）
dd if=/tmp/testfile of=/dev/null bs=1M count=1024 iflag=direct
```
预期输出对比：
```
1) 1073741824 bytes copied, 0.318 s, 3.38 GB/s     ← 缓存命中，极快
2) 1073741824 bytes copied, 1.642 s, 654 MB/s      ← 真实磁盘读
```
解读：同一文件、同一块大小，差 ~5 倍。**页缓存就是教材里"缓冲"的价值**。但大文件顺序读时缓存命中率低，`direct` 反而能省下"缓存搬运"的开销，所以数据库常配 `O_DIRECT`。

## 8. fio：专业基准测试

```bash
# 顺序写测试（128KiB 队列深度 32，模拟数据库日志写）
fio --name=seqwrite --rw=write --bs=128k --iodepth=32 --ioengine=libaio \
    --filename=/tmp/fiotest --size=1G --runtime=10 --direct=1
```
预期输出片段：
```
write: IOPS=3210, BW=401MiB/s (421MB/s)(4010MiB/10.00s)
  slat (nsec): min=3000, max=...
  clat (usec): p50=..., p99=...
```
解读：`IOPS`（每秒 IO 次数）、`BW`（带宽）、`clat` 的 p50/p99（完成延迟分位数）是衡量磁盘性能的完整指标。对比不同 `rw` 模式：
- `--rw=write/read`：顺序读写 → 看带宽。
- `--rw=randwrite/randread`：随机读写 → 看 IOPS（尤其小块 4k）。

::: tip fio 是"行业标准"测盘工具
云厂商/硬件厂商的磁盘规格书数字都出自 fio。生产环境评估磁盘性能、对比 `direct=1` 与 `direct=0`，用 fio 一套即可，别再用 dd 争论谁快。
:::

## 9. IO 调度器

```bash
cat /sys/block/sda/queue/scheduler
```
预期输出片段：
```
none [mq-deadline] bfq
```
解读：方括号内是当前调度器。现代内核（块层多队列）常用：
- `none`（noop）：不排序，直接把请求丢给设备，SSD/NVMe 用（设备自己并发调度更好）。
- `mq-deadline`：按截止时间排序，保证延迟上限，兼顾公平，机械盘/SSD 通用（多数发行版默认）。
- `bfq`：面向桌面/交互的公平调度。

```bash
# 临时切换（立即生效，重启还原）
echo bfq > /sys/block/sda/queue/scheduler
# 永久修改用 udev 规则或内核参数 elevator=...
```
::: important 教材 vs 现实
教材里的电梯算法（SCAN/C-SCAN）在单队列时代是内核做的，多队列时代调度器把排序权部分交给设备。但"合并请求、减少寻道"的思想仍在 `mq-deadline` 中——这是教材 [磁盘调度](/kb/os/存储/02-磁盘调度算法与RAID/) 在真实内核的延续。
:::

## 10. blktrace 简述

```bash
sudo blktrace -d /dev/sda -o - | blkparse -i -     # 抓块层 IO 事件流
```
预期输出片段（摘录）：
```
259,0   3        1   0.000123 3210  A   W 4392 + 8 <- (8,1) 4392
259,0   3        2   0.000145 3210  Q   W 4392 + 8 [dd]
259,0   3        3   0.000150 3210  D   W 4392 + 8 [dd]
259,0   3        4   0.000162 3210  C   W 4392 + 8 [dd]
```
解读：`blktrace` 在**块层**记录每个 IO 的完整生命周期：`A`（插入）、`Q`（入队）、`D`（下发设备）、`C`（完成）。教材讲的 IO 路径（进程 → 文件系统 → 块层 → 设备）在这里逐级可见。生产定位"IO 到底卡在文件系统还是块层"时用它。

## 11. 本章小结

- 设备视角用 `iostat`/`sar -d`：看 `tps`、`rkB/s`、`wkB/s`、`await`、`%util`。**判断瓶颈优先看 await，别迷信 %util**。
- 进程视角用 `iotop`/`pidstat -d`：找到"谁在写盘"。
- `iowait` 是"等 IO 的空闲"，与 `idle` 不同，`id` 高 + `wa` 高 = 磁盘瓶颈。
- `strace -e trace=read,write` 抓系统调用，`fsync` 慢 = 磁盘慢。
- 测速用 `dd`（加 `direct`/`dsync` 才真实）或 `fio`（更专业的 IOPS/延迟指标）。
- 页缓存带来巨大加速，`O_DIRECT` 在特定场景（大文件、数据库）反而更优；IO 调度器 `mq-deadline` 是默认主力。

## 12. 动手实验

1. **缓存 vs direct**：按 7.3 节做 `dd` 对比实验，把两次速度差记录下来，解释原因（页缓存 vs 真实磁盘读）。
2. **iostat 观察**：终端 A 跑 `iostat -x 1 5`，终端 B 跑 `dd if=/dev/zero of=/tmp/f bs=1M count=2048`，观察写入期间 `%util`/`await`/`w_s` 的变化。
3. **找元凶**：同时开 `iotop -o` 与两个 `dd` 进程，确认 iotop 能按进程分开显示各自的吞吐。
4. **strace 抓 write**：用 `strace -e trace=write dd if=/dev/zero of=/tmp/x bs=4k count=50` 数一数出现了多少次 write 调用、每次字节数。
5. **fio 四模式**：分别跑 `rw=write`、`rw=read`、`rw=randwrite`、`rw=randread` 各 5 秒，对比 IOPS 与带宽，写在笔记里。

## 13. 自测题

1. **`%util` 100% 一定代表磁盘饱和吗？为什么？** 不一定。现代 SSD 有内部队列并发，`%util` 只统计"有请求服务的时间占比"，可能虚高；应结合 `await` 与设备理论延迟判断。
2. **怎么判断系统瓶颈在 CPU 还是磁盘？** `vmstat`：`id` 高且 `wa` 高 → 磁盘瓶颈；`id` 低且 `us` 高 → CPU 计算瓶颈；`sy` 高 → 系统调用或锁。
3. **为什么 `dd` 重复读同一文件第二次快很多？** 第一次读进 page cache，第二次命中缓存，测到的是内存速度而非磁盘；加 `iflag=direct` 可测真实磁盘读。
4. **`strace` 的 `write` 返回很快，为什么磁盘还是很慢？** 因为 `write` 只把数据交给页缓存就返回了，真正落盘由内核异步刷盘；要看真实等待，跟踪 `fsync`/`fdatasync` 的耗时。
5. **什么场景适合 `O_DIRECT` 而不用页缓存？** 大文件顺序读写（缓存命中率低）、数据库要求数据可预知地落盘、或需要精确控制缓存时；小文件随机访问则页缓存收益更大。
