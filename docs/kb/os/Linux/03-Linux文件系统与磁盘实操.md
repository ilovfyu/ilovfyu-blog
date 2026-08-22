---
title: "Linux 文件系统与磁盘实操"
permalink: /kb/os/Linux/03-Linux文件系统与磁盘实操/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Linux 内存管理实操", link: /kb/os/Linux/02-Linux内存管理实操/ }
next: { text: "Linux IO 与性能监控实操", link: /kb/os/Linux/04-LinuxIO与性能监控实操/ }
knowledgeNote:
  series: "OS"
  group: "Linux"
---
::: abstract 本章定位
把 Ch13-15 文件系统落到 Linux 上：用 `df`/`du` 查空间、用 `df -i` 发现 inode 耗尽这种隐蔽坑，用 `stat` 读 inode 与三种时间戳，用 `ln` 实验硬链接与软链接的本质区别，用 `lsblk`/`blkid` 看磁盘布局与挂载，用 `find`/`locate` 找文件，用 `chattr`/`inotifywait` 做保护与监控。概念原理对应 [文件系统](/kb/os/存储/04-文件系统实现/) 与 [目录与链接](/kb/os/存储/03-文件系统接口与目录结构/)。
:::

教材里 inode 存储文件元数据与数据块指针、目录项存储文件名与 inode 号——这些抽象在 Linux 上用 `stat` 一行就能看到。这一篇的目标：**听到"磁盘满了"能立刻分清是块满了还是 inode 满了；看到 `ls -l` 能说出每个字段对应 inode 里的哪条信息。**

## 1. df 与 du：空间去哪了

### 1.1 df：文件系统级空间

```bash
df -h
```
预期输出片段：
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        40G   22G   17G  57% /
tmpfs           3.9G     0  3.9G   0% /dev/shm
/dev/sdb1       100G   80G   15G  85% /data
```
解读：
- `/dev/sda1` 挂载在 `/`，`tmpfs` 是内存文件系统（占的是 RAM），`/data` 是独立数据盘。
- **Use% 高 ≠ 马上出问题**：只要 `Avail` 够用即可；但接近 100% 要警惕，因为**还要留空间给 root 与日志**。

### 1.2 df -i：inode 耗尽（隐蔽坑）

```bash
df -i
```
预期输出片段：
```
Filesystem     Inodes  IUsed   IFree IUse% Mounted on
/dev/sda1     2621440 2492100 129340   95% /
/dev/sdb1     6553600   12000 6541600    1% /data
```
解读：
- 磁盘文件系统有**两块空间**：数据块空间 + inode 表空间。`df -h` 看前者，`df -i` 看后者。
- **inode 耗尽** = 每个文件都要占一个 inode，小文件（如日志碎片、缓存小文件）过多时块没满、inode 先满 → 系统报 "No space left on device" 却 `df -h` 显示有空间。

```bash
# 现场复现（虚拟机中）：创建海量小文件
mkdir /tmp/inodetest && cd /tmp/inodetest
seq 1 200000 | xargs -I{} touch f_{}
df -i /tmp        # 观察 IUse% 上升；满了之后 touch 会报错
```
::: warning inode 耗尽怎么救
删除海量小文件（`find /tmp/inodetest -type f -delete`）；长期方案是选 inode 数量合适的文件系统（mkfs 时用 `-i` 指定 inode 大小/比例）。
:::

### 1.3 du：目录级占用

```bash
du -sh /var/log          # 只看总占用
du -h --max-depth=1 /    # 根目录下每个一级子目录各占多少
```
预期输出片段：
```
 30M   /var/log
```
```bash
du -h --max-depth=1 / 2>/dev/null | sort -rh | head -8
```
解读：`du` 递归统计实际文件大小；`--max-depth=1` 只看一层，配合 `sort -rh` 快速找出"谁占满了磁盘"。排查"磁盘满"的标准起手式：`df -h` 定位到挂载点 → `du --max-depth=1` 逐层下钻。

## 2. stat：inode 与时间戳

```bash
stat /etc/passwd
```
预期输出片段：
```
  File: /etc/passwd
  Size: 2824            Blocks: 8          IO Block: 4096   regular file
Device: 8,1    Inode: 393221    Links: 1
Access: 2026-08-10 12:00:01.123456789 +0800   ← atime
Modify: 2026-07-01 10:20:30.456789012 +0800   ← mtime
Change: 2026-07-01 10:20:31.123456789 +0800   ← ctime
 Birth: 2024-03-15 09:00:00.000000000 +0800
```
解读：
- **Inode 号** `393221`：文件在文件系统中的"身份证号"，`stat` 第一行 `File:` 后跟的 `Links` = 硬链接数。
- 三种时间戳：

| 时间戳 | 全称 | 什么动作更新 | 面试常考 |
|---|---|---|---|
| `atime` | access time | 读取文件内容 | 大量读会频繁更新，`relatime`/`noatime` 挂载参数可优化 |
| `mtime` | modify time | 修改**文件内容** | `ls -l` 默认显示它 |
| `ctime` | change time | 修改**inode 元数据**（权限、链接数、内容块指针） | 改名、chmod 都会变；"改内容必然改 ctime" |

::: tip 为什么 `mv` 文件后 ctime 变而 mtime 不变？
`mv` 只改目录项（删除旧目录项+新建），改的是目录的元数据，文件 inode 的 mtime 不变；但若是改了文件本身内容，mtime 和 ctime 都会变。用实验验证：`touch f; stat f; echo x > f; stat f`。
:::

## 3. ln：硬链接与软链接实验

### 3.1 硬链接

```bash
echo "hello" > orig.txt
ln orig.txt hard.txt        # 创建硬链接
ls -li orig.txt hard.txt
```
预期输出片段：
```
393221 -rw-r--r-- 2 zhang zhang 6 Aug 10 12:30 hard.txt
393221 -rw-r--r-- 2 zhang zhang 6 Aug 10 12:30 orig.txt
```
解读：
- **inode 相同**（都是 393221），`Links` 列显示 `2`。硬链接就是"同一个 inode 的另一个目录项"。
- 修改任一文件，另一份同步可见；删除一个，另一个还在（引用计数减 1）。
- 限制：**不能跨文件系统**（inode 号只在同一文件系统内有意义）、**不能链接目录**。

### 3.2 软链接（符号链接）

```bash
ln -s orig.txt soft.txt
ls -li orig.txt soft.txt
```
预期输出片段：
```
393221 -rw-r--r-- 2 zhang zhang 6 Aug 10 12:30 orig.txt
393222 lrwxrwxrwx 1 zhang zhang 8 Aug 10 12:31 soft.txt -> orig.txt
```
解读：
- 软链接是**独立文件**（自己的 inode 393222），内容存的是目标路径 `orig.txt`（长度 8 字节）。
- `->` 标明指向；可以跨文件系统、可以指向目录；**目标被删除后软链接变成"悬空链接"（dangling）**。

| 维度 | 硬链接 | 软链接 |
|---|---|---|
| inode | 相同 | 各自独立 |
| 本质 | 同一 inode 的第二个目录项 | 存目标路径的文件 |
| 跨文件系统 | 不行 | 可以 |
| 链接目录 | 不行 | 可以 |
| 目标删除后 | 内容还在 | 变成死链 |
| 典型用途 | 同一文件多个入口 | 快捷方式、版本切换（如 `current -> v1.2`） |

```bash
# 验证删除效果
rm orig.txt
cat hard.txt    # 仍能读到 hello（硬链接）
cat soft.txt    # 报错 No such file or directory（悬空软链接）
```

## 4. 文件系统类型与挂载

### 4.1 lsblk 与 blkid

```bash
lsblk -f
```
预期输出片段：
```
NAME   FSTYPE  LABEL  UUID                                 MOUNTPOINT
sda
└─sda1 ext4            4f3b...e9d2                        /
sdb
└─sdb1 xfs             8a1c...0f7b                        /data
```
```bash
blkid /dev/sda1
```
预期输出：`/dev/sda1: UUID="..." TYPE="ext4" PARTUUID="..."`。
解读：`lsblk -f` 一屏看出磁盘层级、文件系统类型、UUID 与挂载点；`blkid` 查单个设备。UUID 是 `fstab` 里推荐使用的标识（比 `/dev/sda1` 稳定）。

### 4.2 mount / umount / fstab

```bash
sudo mount -t ext4 /dev/sdb1 /data       # 挂载到目录
sudo mount -o remount,ro /data           # 重新挂载为只读
sudo umount /data                         # 卸载
mount | grep sdb                          # 查看当前挂载选项
```
`/etc/fstab` 一行格式：`<设备/UUID>  <挂载点>  <类型>  <选项>  &lt;dump&gt;  &lt;fsck&gt;`

```
UUID=8a1c-...-0f7b  /data  ext4  defaults,noatime  0  2
```
解读：
- `noatime`：不更新 atime，减少读文件时的写盘（性能优化常见项）。
- `dump`（0=不备份）与 `fsck`（0=不检查、1=根、2=其余）是开机时的处理顺序。
- 改完 `fstab` 用 `sudo mount -a` 测试，**不要盲目 `reboot`**，fstab 写错会导致开机进不去。

::: warning umount 提示 busy
`umount /data` 报 `target is busy`，用 `lsof +D /data` 或 `fuser -mv /data` 找到占用进程再处理。
:::

## 5. 文件查找与批量操作

### 5.1 find：精确查找

```bash
find /var/log -name '*.log' -mtime -7          # 7 天内修改过的日志
find / -type f -size +100M 2>/dev/null          # 大于 100M 的文件
find / -user nobody -newer /etc/hostname        # 比某文件更新
find . -type d -empty                           # 空目录
```
```bash
find /var/log -name '*.log' -mtime +30 -delete  # 删除 30 天前的日志（慎用）
find /tmp -type f -exec chmod 600 {} \;         # 批量操作
find /tmp -type f -name '*.tmp' -print0 | xargs -0 rm   # 批量删除，防空格文件名
```
解读：`-exec ... {} \;` 与 `-print0 | xargs -0` 是两种批量处理方式，后者对含空格/换行的文件名更安全。

### 5.2 locate：秒级索引查找

```bash
sudo updatedb          # 先建立索引
locate sshd_config     # 秒级全盘搜索（靠索引，比 find 快但可能不是最新）
```
解读：`locate` 走预建索引数据库，快但不实时；`find` 实时扫描慢但准确。日常快速定位用 `locate`，精确按条件用 `find`。

## 6. fsck：磁盘检查

```bash
# 前提：先卸载或只读挂载，绝不能对挂载中的文件系统跑 fsck
sudo umount /dev/sdb1
sudo fsck -f /dev/sdb1
```
预期输出片段：
```
fsck from util-linux 2.34
e2fsck 1.45.6 (20-Mar-2020)
/dev/sdb1: clean, 12000/6553600 files, 124500/26214400 blocks
```
解读：
- `-f` 强制检查（即使标记 clean）。输出 `clean` = 无错误；有错误会打印修复过程并生成 `.lost+found`。
- 开机时 ext4 会自动做 "clean" 标志检查，非正常关机后自动 fsck。
::: warning 绝不要对已挂载磁盘 fsck
会损坏文件系统。必须 `umount` 或至少在只读挂载下执行。
:::

## 7. ext4 特性：lsattr / chattr

```bash
echo "secret" > s.txt
sudo chattr +i s.txt       # 不可变：连 root 都不能改、不能删、不能链接
lsattr s.txt
```
预期输出：`----i---------e---- s.txt`（`i` = immutable）。
```bash
sudo rm s.txt              # 报错: Operation not permitted
sudo chattr -i s.txt && rm s.txt   # 去掉 i 才能删
```
其他常用属性：
- `+a` append-only：只允许追加（日志文件保护利器）。
- `+e` extent 格式（ext4 默认，无需手动管）。

::: tip chattr 是"删除保护"的土办法
黑客拿到 root 也无法 `rm` 掉 `+i` 文件；同理防误删。恶意软件/勒索软件也常对配置加 `+i` 防篡改——排查"文件删不掉"记得 `lsattr`。
:::

## 8. inotifywait：监控文件变化

inotify 是内核的文件事件机制（对应教材"目录与文件操作的可观察性"）：

```bash
sudo apt install inotify-tools    # Debian/Ubuntu
inotifywait -m -r -e modify,create,delete /etc/nginx/
```
预期输出片段（另开终端 `touch /etc/nginx/test.conf` 后）：
```
/etc/nginx/ CREATE test.conf
/etc/nginx/ MODIFY test.conf
```
解读：`-m` 持续监控、`-r` 递归、`-e` 指定事件（modify/create/delete/access/close_write...）。适合：配置目录防篡改、脚本监听文件生成后自动处理、安全审计。

```bash
# 只看写入后关闭事件（文本编辑器保存会触发 close_write）
inotifywait -m -e close_write /tmp/
```
::: tip 教材里没有、但运维天天用的能力
`inotify` 也是 `rsync --daemon` 之外，`incron`/`systemd.path` 等自动化工具的底层机制。会看 `inotifywait` 输出，就能看懂这些工具在干嘛。
:::

## 9. 本章小结

- 磁盘有两套空间：数据块（`df -h`）与 inode（`df -i`），inode 耗尽是小文件灾难的隐蔽坑。
- `du --max-depth=1` 逐层下钻是排查"磁盘满"的标准流程。
- 三种时间戳：atime 读、mtime 改内容、ctime 改元数据；`ls -l` 显示 mtime。
- 硬链接共享 inode 不跨文件系统，软链接存路径可跨域；`stat`/`ls -li` 一眼看出区别。
- 挂载管理靠 `mount`/`umount`/`fstab`（用 UUID、加 noatime）；fsck 前必须卸载。
- `chattr +i` 提供"连 root 都动不了"的保护；`inotifywait` 让文件变更可观测。

## 10. 动手实验

1. **硬/软链接实验**：按第 3 节完整跑一遍：创建原文件 → 硬链接 → 软链接 → `ls -li` 对比 inode → 删原文件 → 分别 `cat` 两个链接观察差异。
2. **inode 耗尽模拟**（虚拟机）：第 1.2 节循环创建 20 万小文件，`df -i` 观察 IUse% 上升，最后 `find . -type f -delete` 清理并确认恢复。
3. **时间戳实验**：`touch f` → `echo hi > f` → `chmod 600 f` → `mv f f2`，每步后 `stat f2` 记录 atime/mtime/ctime 各自何时变化。
4. **fstab 练习**（虚拟机）：新增一块虚拟磁盘，`mkfs.ext4` 后用 UUID 写入 fstab、`mount -a` 挂载、`df -h` 验证，再练习 `umount` 与 `lsof +D` 处理 busy。
5. **inotify 监控**：启动 `inotifywait -m -r /tmp/monitor`，另开终端创建/修改/删除文件，观察事件输出，再尝试用 `close_write` 做"文件落地自动处理"的小脚本。

## 11. 自测题

1. **为什么会出现"磁盘有空间但写不进去"？** 两种可能：inode 耗尽（`df -i` 查）或达到管理员配额/只读挂载；小文件过多是最常见原因。
2. **硬链接为什么不能跨文件系统？** 硬链接是共享 inode 的目录项，inode 号只在同一文件系统内唯一，跨文件系统无法保证指向同一 inode。
3. **mtime 与 ctime 的区别，举一个"只改 ctime 不改 mtime"的例子？** mtime 表示内容被修改，ctime 表示 inode 元数据变更；`chmod 600 f`、`mv`、`chown` 都只改 ctime 不改 mtime。
4. **`ls -l` 显示的时间是什么，`find` 的 `-mtime -7` 用哪个？** 都是 mtime（内容修改时间）；`-mtime -7` 表示 7 天内修改过。
5. **什么情况下适合用 `chattr +i` 而不用普通 chmod？** 需要防 root 本身误删/篡改、防恶意程序删除时（如关键配置文件、签名文件）；普通用户权限限制用 chmod 就够。
