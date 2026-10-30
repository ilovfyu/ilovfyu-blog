// Topics can appear in the catalog before their first article is published.
const configuredTopics = {
  微积分: { kind: 'calculus', tone: 'cyan', caption: '极限 · 导数 · 积分', description: '从无穷小，理解连续的变化。' },
  线性代数: { kind: 'algebra', tone: 'violet', caption: '向量 · 矩阵 · 线性变换', description: '在向量与空间中，看见变换。' },
  概率: { kind: 'probability', tone: 'amber', caption: '随机变量 · 分布 · 期望', description: '从随机现象中，寻找确定的规律。' },
  MLearn: { kind: 'learning', tone: 'pink', caption: '数据 · 模型 · 训练 · 预测', description: '从数据出发，探索机器学习的原理与实践。' },
  数据分析: { kind: 'analysis', tone: 'cyan', caption: 'NumPy · pandas · Matplotlib', description: '学习 Python 数据分析常用库，整理数值计算、数据处理与可视化的方法。' },
  Python: { kind: 'python', tone: 'python', caption: 'Python · 语法 · 迭代 · 自动化', description: '从清晰的语法与迭代思维出发，用 Python 把想法写成可运行的程序。' },
  Go: { kind: 'go', tone: 'go', caption: 'goroutine · channel · 并发协作', description: '理解 goroutine 与 channel，让并发任务有序协作，构建简洁可靠的服务。' },
  算法与数据结构: { kind: 'algorithms', tone: 'algorithms', caption: '数组 · 树与图 · 搜索 · 动态规划', description: '从数据的组织方式出发，理解搜索、选择与状态转移，练习把问题拆成可验证的步骤。', readingOrder: ['数组链表', '字符串', '二分', '树', '搜索', '图论', '贪心', '动态规划', '大数'] },
  容器: { kind: 'containers', tone: 'containers', caption: '镜像分层 · 隔离 · Docker · Kubernetes', description: '从镜像分层与进程隔离出发，理解容器如何运行，再走向服务编排与交付。', readingOrder: ['Docker', 'Kubernetes', 'Kuberentes'] },
  OS: { kind: 'os', tone: 'os', caption: '进程 · 调度 · 内存 · IO', description: '沿着进程调度、内存管理与 IO 的路径，理解操作系统如何分配资源、协调执行。', readingOrder: ['进程线程', '内存死锁', '同步异步', 'IO', '存储', 'Linux', '安全', 'GPU', '问题排查'] },
  网络: { kind: 'network', tone: 'network', caption: '协议分层 · 数据包 · 路由 · 可靠传输', description: '跟随一个数据包，从协议封装到路由转发，理解连接、可靠传输与网络排障。' },
  GBDT: { kind: 'boosting', tone: 'boosting', caption: 'XGBoost · LightGBM · CatBoost', description: '从梯度提升树的原理出发，学习 XGBoost、LightGBM 与 CatBoost，梳理特征处理、模型训练与调参实践。' },
  SKLearn: { kind: 'sklearn', tone: 'sklearn', caption: 'Pipeline · 交叉验证 · 评估', description: '用 scikit-learn 串起数据预处理、特征工程、模型训练与评估，建立可复现、避免数据泄漏的机器学习流程。', readingOrder: ['数据与预处理', '特征工程与选择', '评估指标', '交叉验证与调参', 'pipeline与组合', '监督模型', '无监督模型', '解释与工程化', '表格赛'] },
}

export const topicNames = Object.keys(configuredTopics)

export function topicReadingRank(name: string, title: string): number {
  const topic = configuredTopics[name as keyof typeof configuredTopics]
  if (!topic || !('readingOrder' in topic)) return Number.MAX_SAFE_INTEGER
  const rank = topic.readingOrder.findIndex(item => item.toLocaleLowerCase() === title.trim().toLocaleLowerCase())
  return rank < 0 ? Number.MAX_SAFE_INTEGER : rank
}

export function topicAppearance(name: string) {
  if (Object.hasOwn(configuredTopics, name)) return configuredTopics[name as keyof typeof configuredTopics]
  return { kind: 'unconfigured', tone: 'violet', caption: '', description: '' }
}
