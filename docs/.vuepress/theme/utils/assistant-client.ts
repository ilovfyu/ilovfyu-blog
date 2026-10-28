import { safeKnowledgePath, type ChatTurn, type KnowledgeChunk } from './assistant-knowledge.ts'

export type AssistantAnswer = { answer: string; sources: KnowledgeChunk[] }

export function validatedAssistantEndpoint(value: string) {
  if (!value) return ''
  const url = new URL(value)
  if (url.username || url.password || url.search || url.hash || !url.pathname.endsWith('/chat')) throw new Error('AI 接口须为不含凭证或查询参数的 /chat 地址。')
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('AI 接口必须使用 HTTPS。')
  if (url.hostname === 'api.deepseek.com') throw new Error('浏览器不能配置供应商密钥，请连接博客的托管函数。')
  return url.href
}

export async function askKnowledgeAssistant(endpoint: string, message: string, history: ChatTurn[], signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<AssistantAnswer> {
  const url = validatedAssistantEndpoint(endpoint)
  if (!url) throw new Error('AI 回答服务尚未连接，当前可以检索知识库。')
  let response: Response
  try {
    response = await fetcher(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', redirect: 'error',
      body: JSON.stringify({ message, history: history.slice(-6).map(turn => ({ role: turn.role, content: turn.content.slice(0, 800) })) }), signal,
    })
  } catch (error) {
    if (signal.aborted) throw error
    throw new Error('暂时无法连接 AI 服务，仍可查看下方知识库来源。')
  }
  if (!response.ok) {
    // Do not display arbitrary upstream errors, headers, stack traces or credentials.
    const errors: Record<number, string> = { 400: '问题过长或会话格式不正确，请缩短后重试。', 429: '今天的对话额度或短时访问额度已用完，请稍后再试。', 503: 'AI 回答服务尚未就绪，仍可查看知识库来源。', 504: 'AI 回答超时，请稍后重试。' }
    throw new Error(errors[response.status] || 'AI 服务暂时不可用，仍可查看知识库来源。')
  }
  const result = await response.json()
  if (typeof result.answer !== 'string' || !Array.isArray(result.sources)) throw new Error('AI 服务返回了无法识别的内容，请稍后重试。')
  return { answer: result.answer.slice(0, 12_000), sources: result.sources.filter((source: KnowledgeChunk) => typeof source?.title === 'string' && typeof source?.path === 'string' && safeKnowledgePath(source.path)).slice(0, 4) }
}
