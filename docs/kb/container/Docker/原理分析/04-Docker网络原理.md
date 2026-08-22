---
title: "Docker 网络原理"
permalink: /kb/container/Docker/原理分析/04-Docker网络原理/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Namespace、Cgroups 与容器隔离", link: /kb/container/Docker/原理分析/03-Namespace-Cgroups与容器隔离/ }
next: { text: "Docker 存储与挂载原理", link: /kb/container/Docker/原理分析/05-Docker存储与挂载原理/ }
knowledgeNote:
  series: "容器"
  group: "原理分析"
---
## 1. 从一张图开始

原生 Linux 上，默认 bridge 网络的常见数据路径如下：

```text
Container network namespace
┌───────────────────────────────┐
│ app :80                       │
│ eth0 172.17.0.2               │
└──────────────┬────────────────┘
               │ veth pair
               ▼
Linux host network namespace
┌───────────────────────────────────────────────┐
│ vethXXXX ── docker bridge ── host NIC         │
│                 │                             │
│          routing + netfilter                  │
│          NAT / filtering / port publishing    │
└───────────────────────────────────────────────┘
```

具体 bridge 名、地址段和防火墙后端都可以配置。

不要把 `docker0`、`172.17.0.0/16` 或 iptables 当作绝对固定值。

## 2. 平台边界

### 原生 Linux Engine

容器 network namespace、veth、bridge、路由和 netfilter 都在 Linux 主机上。

主机管理员可以使用 `ip`、`bridge`、`nft`、`iptables`、`ss`、`conntrack` 等观察。

### Docker Desktop

macOS/Windows 上的 Linux 容器运行于 Desktop Linux VM。

容器网络设备和 Linux netfilter 主要存在于 VM 内。

发布到 `localhost` 的端口还经过 Desktop 的转发或代理路径。

```text
macOS/Windows process
       │ localhost:8080
       ▼
Desktop host/VM forwarding boundary
       ▼
Linux VM network stack
       ▼
container endpoint:80
```

所以 Desktop 上不能在 macOS 执行 `ip link` 就期待看到容器 veth。

Desktop 网络功能也可能随后端和设置变化。

## 3. Docker network driver 是什么

Docker network 对象使用 driver 提供连接语义。

常见 driver：

- `bridge`：单个 Engine 主机上的常见容器网络。
- `host`：共享宿主 network namespace 或平台提供的对应能力。
- `none`：不给容器配置常规外部网络。
- `overlay`：多主机 Docker Swarm 网络。
- `macvlan`：让容器更直接出现在二层网络中。
- `ipvlan`：利用父接口和三层/二层模式组织连接。

插件还可以提供其他网络实现。

本文重点讲 Linux bridge。

## 4. network namespace 提供什么

每个普通 bridge 容器通常有独立 network namespace。

其中有自己的：

- loopback。
- 网卡和 IP。
- 路由表。
- 邻居表。
- socket 端口空间。
- 网络 sysctl 视图的一部分。

两个容器都可以监听 `0.0.0.0:80`。

只要它们在不同 network namespaces 中就不冲突。

冲突通常发生在把两者都发布到同一个宿主地址和端口时。

## 5. veth pair

veth 是成对出现的虚拟以太网设备。

一端收到的帧会从另一端出现。

Docker bridge 场景通常：

- 一端移动到容器 network namespace，命名为类似 `eth0`。
- 另一端留在宿主 namespace，并连接到 Linux bridge。

```text
container eth0  <====== veth pair ======>  host vethXXXX
```

观察容器 PID：

```bash
docker run -d --name net-demo nginx:alpine
pid=$(docker inspect -f '{{.State.Pid}}' net-demo)
sudo nsenter -t "$pid" -n ip link
sudo nsenter -t "$pid" -n ip addr
```

在宿主观察：

```bash
ip link
bridge link
```

这些命令适用于承载容器的 Linux 环境。

## 6. Linux bridge

Linux bridge 类似软件二层交换机。

连接到同一 bridge 的 veth 宿主端可以转发以太帧。

bridge 学习 MAC 地址与端口对应关系。

```bash
bridge link
bridge fdb show
```

Docker 还为 bridge 网络提供 IP 地址管理、路由与防火墙规则。

bridge 自身不是全部 Docker 网络逻辑。

## 7. 默认 bridge 与用户定义 bridge

### 默认 bridge

未显式指定网络的普通容器通常连接默认 bridge。

```bash
docker run -d --name a nginx
```

历史上默认 bridge 的容器名解析能力和隔离语义较弱。

### 用户定义 bridge

```bash
docker network create app-net
docker run -d --name api --network app-net nginx
docker run --rm --network app-net alpine ping -c 1 api
```

用户定义 bridge 通常提供：

- Docker 内置 DNS 的容器名/别名解析。
- 更清晰的应用网络边界。
- 可独立配置子网、网关和选项。
- 容器运行时连接和断开网络。

应用应优先使用用户定义 bridge，而不是依赖默认 bridge 的旧行为。

## 8. IP 地址管理

Docker 的 IPAM 为网络分配地址池并为 endpoint 分配地址。

```bash
docker network inspect app-net
```

可显式配置：

```bash
docker network create \
  --subnet 10.44.0.0/24 \
  --gateway 10.44.0.1 \
  app-net
```

选择子网时应避免与以下网络重叠：

- 宿主 LAN。
- VPN。
- 云 VPC。
- 其他 Docker networks。
- Desktop 内部网络。

重叠会导致路由选择错误或连接时断时续。

## 9. 容器出站流量

bridge 容器访问外部网络的概念路径：

```text
container app
  │ packet src=container-IP
  ▼
eth0 -> veth -> bridge
  │ routing/forwarding
  ▼
host egress NIC
  │ source NAT / masquerade（常见默认）
  ▼
external network
```

返回包通过连接跟踪和反向转换回到容器。

是否启用 masquerade、经过哪些表和链，取决于网络配置与防火墙后端。

不要直接依赖 Docker 私有 chain 名称作为稳定 API。

## 10. netfilter、iptables 与 nftables

Linux netfilter 是内核包过滤与 NAT 框架。

用户空间可通过 iptables 或 nftables 配置规则。

现代发行版中的 `iptables` 命令可能实际使用 nftables backend。

Docker Engine 版本和配置也可能支持不同 firewall backend。

所以排障时应先确认：

```bash
docker info
iptables --version
nft list ruleset
```

是否能执行以及输出内容取决于权限和平台。

不要同时用多个工具随意改 Docker 管理规则。

## 11. 端口发布不是 EXPOSE

Dockerfile：

```dockerfile
EXPOSE 80
```

只是声明镜像预期监听端口的元数据。

它不会自动让宿主端口可访问。

运行时发布：

```bash
docker run -p 8080:80 nginx
```

含义是把宿主某地址的 TCP 8080 映射到容器 80。

默认协议是 TCP。

UDP 需显式写：

```bash
docker run -p 5353:53/udp image-name
```

## 12. 端口发布的地址绑定

```bash
docker run -p 127.0.0.1:8080:80 nginx
```

只请求绑定宿主 loopback。

```bash
docker run -p 8080:80 nginx
```

未指定 host IP 时，常会发布到 daemon 配置决定的默认地址。

可能包括所有接口。

这会形成外部暴露风险。

检查实际映射：

```bash
docker port container-name
docker inspect container-name --format '{{json .NetworkSettings.Ports}}'
```

再检查宿主监听和防火墙：

```bash
ss -lntup
```

在某些实现中，端口转发可能主要通过 NAT 规则完成，未必表现为普通长期监听进程。

## 13. DNAT 与转发路径

原生 Linux bridge 场景下，端口发布通常需要：

- 匹配发往宿主发布地址/端口的流量。
- 将目标改写为容器 IP/端口。
- 允许流量转发到容器 bridge。
- 对返回包进行连接跟踪和反向转换。

概念上是：

```text
client -> host:8080
           │ DNAT
           ▼
       container:80
```

本机访问、本机 hairpin、外部访问和跨 bridge 访问可能走不同 hook。

Docker 会处理多类路径，但细节受版本与 backend 影响。

## 14. userland proxy

Docker 历史上可使用 userland proxy 辅助某些端口发布场景。

是否启用、用于哪些路径和默认值会随版本配置变化。

排障时可以观察：

```bash
docker info
ps -ef | grep docker-proxy
```

看不到 proxy 进程不代表端口发布失败。

规则可能完全由内核网络路径处理。

不要把 userland proxy 当成端口发布的唯一原理。

## 15. localhost 的含义

容器内的 `127.0.0.1` 指容器自己的 network namespace。

它不是宿主机。

应用 A 在容器 A 监听 localhost，容器 B 通常不能访问它。

即使两个容器在同一个 bridge 上也不行。

服务要供其他容器访问，通常应监听：

```text
0.0.0.0:&lt;port&gt;
```

或容器接口的具体地址。

同时通过网络策略限制访问范围。

## 16. 容器访问宿主

不要假设宿主永远是 `172.17.0.1`。

地址会随网络、平台和配置变化。

Docker Desktop 通常提供特殊 DNS 名称，例如：

```text
host.docker.internal
```

在支持的 Linux Engine 场景，可通过 host-gateway 映射：

```bash
docker run --add-host host.docker.internal:host-gateway image-name
```

是否默认存在应以平台文档和实际解析为准。

生产服务更适合使用明确的可路由 endpoint，而不是依赖桌面开发别名。

## 17. Docker 内置 DNS

用户定义网络中的容器通常使用 Docker 提供的嵌入式 DNS 转发/解析能力。

它可以解析同网络的容器名和网络别名。

```bash
docker network create dns-net
docker run -d --name db --network dns-net postgres:alpine
docker run --rm --network dns-net alpine getent hosts db
```

工具可用性取决于镜像。

Docker DNS 还会把外部查询转发到上游解析器。

上游来源会受宿主、daemon 和 Desktop 设置影响。

## 18. `/etc/resolv.conf`

Docker 会为容器准备 DNS 配置。

```bash
docker exec container-name cat /etc/resolv.conf
```

用户定义网络中经常能看到嵌入式 DNS 地址。

默认 bridge 或 host network 的表现可能不同。

不要在镜像构建时写死运行期 `/etc/resolv.conf`。

它通常由运行环境生成或挂载。

## 19. DNS 缓存与容器替换

容器 IP 不应被应用长期写死。

容器重建后 IP 可能变化。

应通过名称解析。

但应用和语言 runtime 可能缓存 DNS。

需要关注：

- DNS TTL。
- JVM 等运行时缓存策略。
- 连接池是否重建连接。
- 多副本服务的负载均衡语义。

Docker 单机 DNS 名称解析不等同于完整服务网格或全功能服务发现系统。

## 20. 多网络容器

一个容器可连接多个 Docker networks。

```bash
docker network connect backend web
docker network disconnect frontend web
```

容器会拥有多个接口/地址或对应 endpoint。

应明确默认路由和服务绑定地址。

多网络不自动构成防火墙策略。

应用若监听所有接口，可能同时暴露在多个网络上。

## 21. network alias

```bash
docker network connect --alias database app-net db-container
```

alias 是网络范围名称。

同一个容器在不同网络可以有不同 alias。

多个 endpoint 使用同一个 alias 时，解析结果和负载分配行为依赖 Docker 网络实现。

不要假设 DNS 返回顺序稳定。

## 22. inter-container communication

同一 bridge 上容器是否可直接通信受 Docker network 和防火墙配置影响。

用户定义网络用于建立逻辑隔离边界。

但它不是零信任策略引擎。

若需要细粒度服务到服务策略，应结合：

- 独立网络划分。
- 宿主防火墙规则。
- 应用认证与 TLS。
- 编排平台网络策略。

不要仅凭“不同容器”假设彼此不可达。

## 23. MTU 问题

容器网络 MTU 若高于实际路径可承载大小，可能出现：

- 小包正常，大包超时。
- TLS 握手或上传卡住。
- VPN 环境偶发失败。
- overlay 网络性能异常。

观察：

```bash
ip link
docker network inspect network-name
```

可用 `tracepath`、带 DF 的 ping 或抓包定位。

具体工具和参数随发行版不同。

不要随意统一改成一个小 MTU；应根据底层网络和封装开销计算。

## 24. IPv6

Docker 可在支持和正确配置的环境启用 IPv6。

需要同时考虑：

- daemon IPv6 配置。
- 地址池和路由。
- 宿主 forwarding。
- firewall backend。
- 上游网络可达性。
- 应用监听地址。

IPv6 下不能照搬所有 IPv4 NAT 假设。

检查实际 network：

```bash
docker network inspect network-name
```

## 25. host 网络

原生 Linux 的 host driver 通常意味着共享宿主 network namespace。

优点：

- 减少 bridge/NAT 路径。
- 应用可直接使用宿主接口和端口空间。

代价：

- 端口容易冲突。
- 网络隔离减弱。
- `-p` 通常不再提供普通映射语义。
- 服务更容易意外暴露。

Desktop 对 host networking 的支持和方向性受版本/设置约束。

必须按 Desktop 4.85.0 的实际文档和设置验证。

## 26. none 网络

```bash
docker run --network none image-name
```

容器通常只保留 loopback 等最小网络环境。

适用于不需要网络的批处理或高隔离任务。

它不阻止通过挂载、Docker socket、共享 IPC 等其他通道通信。

## 27. macvlan 与 ipvlan

macvlan 可给容器分配独立 MAC，使其更像局域网直接连接设备。

常见注意点：

- 交换机端口允许的 MAC 数量。
- 无线网络对多 MAC 的限制。
- 宿主与 macvlan 子接口的直接通信限制。
- IPAM 与现有 DHCP 地址冲突。

ipvlan 共享或简化 MAC 层表现，并有不同模式。

两者适用于特定网络集成，不是默认 bridge 的普遍替代品。

Desktop VM 环境下能力可能不同。

## 28. overlay 网络

Docker Swarm overlay 网络跨多个节点提供逻辑网络。

它通常涉及：

- 节点间隧道封装。
- 分布式网络状态。
- service discovery。
- ingress routing mesh 等可选路径。

overlay 增加 MTU、加密、控制面和排障复杂度。

本篇不把它与单机 OverlayFS 混淆。

两者只是在英文中都出现 overlay。

## 29. 抓包与分层观察

容器内部抓包：

```bash
docker exec container-name tcpdump -ni any
```

业务镜像通常没有 tcpdump，也不应临时安装。

可以使用独立诊断容器共享 network namespace：

```bash
docker run --rm -it --network container:container-name nicolaka/netshoot
```

镜像来源和供应链应自行审核。

Linux 主机可在 bridge、veth 或物理接口抓包：

```bash
sudo tcpdump -ni any port 8080
```

分别观察能判断包在哪一层消失。

## 30. 端口不通排障顺序

第一步，应用是否监听正确地址：

```bash
docker exec container-name ss -lntp
```

第二步，容器内本地访问是否成功：

```bash
docker exec container-name wget -qO- http://127.0.0.1:80
```

第三步，发布配置是否存在：

```bash
docker port container-name
docker inspect container-name --format '{{json .NetworkSettings.Ports}}'
```

第四步，宿主本机访问是否成功。

第五步，检查宿主防火墙、云安全组、路由和 Desktop forwarding。

第六步，用抓包确认请求和响应经过哪些接口。

## 31. DNS 排障顺序

```bash
docker exec container-name cat /etc/resolv.conf
docker exec container-name getent hosts service-name
docker network inspect network-name
```

然后区分：

- Docker 内部名称失败。
- 外部域名失败。
- DNS 成功但 TCP 连接失败。
- 应用缓存旧结果。

`ping` 失败不一定代表服务不可用。

ICMP 可能被禁，而 TCP 端口仍可连接。

## 32. 常见误区

### 误区一：EXPOSE 就是发布端口

`EXPOSE` 是镜像元数据，`-p` 才请求运行期发布。

### 误区二：容器 localhost 是宿主

localhost 属于当前 network namespace。

### 误区三：容器 IP 是稳定服务地址

容器重建后 IP 可变化，应使用名称和服务发现。

### 误区四：端口发布一定有代理进程监听

许多路径由 netfilter/NAT 完成。

### 误区五：iptables 与 nftables 完全互斥

iptables 命令可能使用 nft backend。

需要查看实际环境。

### 误区六：Desktop 网络就是 macOS bridge

Linux 容器网络主要存在 Desktop Linux VM 中。

### 误区七：同一 Docker network 等于安全可信

网络可达不代表身份可信。

应用仍需认证、授权和加密。

## 33. 实验与清理

```bash
docker network create tutorial-net
docker run -d --name tutorial-web --network tutorial-net nginx:alpine
docker run --rm --network tutorial-net alpine wget -qO- http://tutorial-web
docker network inspect tutorial-net
docker rm -f tutorial-web
docker network rm tutorial-net
```

这个实验验证：

- 用户定义 bridge 建立 endpoint。
- Docker DNS 解析容器名。
- 容器间无需发布端口即可通信。
- `-p` 是给网络外部访问，不是同网络通信的前提。

## 34. 总结

- 普通 bridge 容器通常拥有独立 network namespace。
- veth pair 把容器接口连接到宿主侧网络。
- Linux bridge 提供二层转发，Docker 叠加 IPAM、路由和规则管理。
- 出站常通过 forwarding 与 masquerade。
- 端口发布常通过 DNAT、过滤规则及按需代理完成。
- `EXPOSE` 不等于 `-p`。
- 用户定义 bridge 提供更好的名称解析和逻辑边界。
- 容器 localhost 只指容器自身。
- Docker 内置 DNS 负责网络范围名称并转发外部查询。
- iptables、nftables 和 backend 细节必须按环境确认。
- Desktop 的 Linux 网络位于 VM 内，宿主端口还要跨 VM 边界。
- 排障要依次检查应用监听、容器网络、发布规则、宿主/VM 和外部网络。

## 35. 官方资料

- Docker networking overview：https://docs.docker.com/engine/network/
- Bridge driver：https://docs.docker.com/engine/network/drivers/bridge/
- Host driver：https://docs.docker.com/engine/network/drivers/host/
- Port publishing：https://docs.docker.com/engine/network/port-publishing/
- Packet filtering and firewalls：https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Desktop networking：https://docs.docker.com/desktop/features/networking/
- Linux network namespaces：https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- Linux veth：https://man7.org/linux/man-pages/man4/veth.4.html
- Linux bridge documentation：https://docs.kernel.org/networking/bridge.html
- nftables project：https://www.netfilter.org/projects/nftables/
