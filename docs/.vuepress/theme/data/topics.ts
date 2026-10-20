// Topics can appear in the catalog before their first article is published.
export const topicNames = ['微积分', '线性代数', '概率']

const mathTopics = {
  微积分: { kind: 'calculus', tone: 'cyan', caption: '极限 · 导数 · 积分', description: '从无穷小，理解连续的变化。' },
  线性代数: { kind: 'algebra', tone: 'violet', caption: '向量 · 矩阵 · 线性变换', description: '在向量与空间中，看见变换。' },
  概率: { kind: 'probability', tone: 'amber', caption: '随机变量 · 分布 · 期望', description: '从随机现象中，寻找确定的规律。' },
}

export function topicAppearance(name: string) {
  if (Object.hasOwn(mathTopics, name)) return mathTopics[name as keyof typeof mathTopics]
  if (/fastapi/i.test(name)) return { kind: 'api', tone: 'violet', caption: 'REQUEST → VALIDATE → RESPONSE', description: '' }
  if (/博客/.test(name)) return { kind: 'publish', tone: 'cyan', caption: '笔记成稿，让内容抵达读者', description: '' }
  return { kind: 'library', tone: 'violet', caption: '把零散知识，组织成体系', description: '' }
}
