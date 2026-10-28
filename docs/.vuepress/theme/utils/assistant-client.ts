import { serverEvents } from './assistant-stream.ts'
import { safeKnowledgePath, type ChatTurn, type KnowledgeChunk } from './assistant-knowledge.ts'

export type AssistantAnswer = { answer: string; sources: KnowledgeChunk[]; remaining?: number; resetsAt?: string; knowledgeAvailable?: boolean }

export function validatedAssistantEndpoint(value: string) {
  if (!value) return ''
  const url = new URL(value)
  if (url.username || url.password || url.search || url.hash || !url.pathname.endsWith('/chat')) throw new Error('AI 接口须为不含凭证或查询参数的 /chat 地址。')
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('AI 接口必须使用 HTTPS。')
  if (url.hostname === 'api.deepseek.com') throw new Error('浏览器不能配置供应商密钥，请连接博客的托管函数。')
  return url.href
}

export async function askKnowledgeAssistant(endpoint: string, message: string, history: ChatTurn[], signal: AbortSignal, fetcher: typeof fetch = fetch, options: { useKnowledge?: boolean; onUpdate?: (answer: AssistantAnswer) => void } = {}): Promise<AssistantAnswer> {
  const url = validatedAssistantEndpoint(endpoint)
  if (!url) throw new Error('AI 回答服务尚未连接，当前可以检索知识库。')
  let response: Response
  try {
    response = await fetcher(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', redirect: 'error',
      body: JSON.stringify({ message, useKnowledge: options.useKnowledge !== false, history: history.slice(-6).map(turn => ({ role: turn.role, content: turn.content.slice(0, 800) })) }), signal,
    })
  } catch (error) {
    if (signal.aborted) throw error
    throw new Error('暂时无法连接 AI 服务，仍可查看下方知识库来源。')
  }
  if (!response.ok) {
    // Do not display arbitrary upstream errors, headers, stack traces or credentials.
    const errors: Record<number, string> = { 400: '问题过长或会话格式不正确，请缩短后重试。', 429: '全站每天共 50 次对话。若已用完，请上海时间次日 00:00 再来；连续发送过快时请稍候重试。', 503: 'AI 回答服务尚未就绪，仍可查看知识库来源。', 504: 'AI 回答超时，请稍后重试。' }
    throw new Error(errors[response.status] || 'AI 服务暂时不可用，仍可查看知识库来源。')
  }
  const sources = (value: unknown): KnowledgeChunk[] => Array.isArray(value) ? value.filter((source: KnowledgeChunk) => typeof source?.title === 'string' && typeof source?.path === 'string' && safeKnowledgePath(source.path)).slice(0, 4) : []
  // Accept the previous JSON contract during a rolling frontend/Worker deployment.
  if (!response.headers.get('Content-Type')?.includes('text/event-stream')) {
    const result = await response.json()
    if (typeof result.answer !== 'string' || !Array.isArray(result.sources)) throw new Error('AI 服务返回了无法识别的内容，请稍后重试。')
    return { answer: result.answer.slice(0, 12_000), sources: sources(result.sources) }
  }
  if (!response.body) throw new Error('AI 服务返回了空回答，请稍后重试。')
  const answer: AssistantAnswer = { answer: '', sources: [] }
  let complete = false
  try {
    for await (const event of serverEvents(response.body, signal)) {
      const data = JSON.parse(event.data)
      if (event.event === 'meta') {
        answer.sources = sources(data.sources)
        if (Number.isInteger(data.remaining) && data.remaining >= 0 && data.remaining <= 50) answer.remaining = data.remaining
        if (typeof data.resetsAt === 'string' && Number.isFinite(Date.parse(data.resetsAt))) answer.resetsAt = data.resetsAt
        answer.knowledgeAvailable = data.knowledgeAvailable !== false
      } else if (event.event === 'delta') {
        if (typeof data.text !== 'string' || answer.answer.length + data.text.length > 12_000) throw new Error('invalid-delta')
        answer.answer += data.text
      } else if (event.event === 'done') { complete = true; break }
      else if (event.event === 'error') throw new Error('stream-interrupted')
      options.onUpdate?.({ ...answer })
    }
  } catch (error) {
    if (signal.aborted) throw error
    throw new Error('回答传输中断，已保留收到的内容，请稍后重试。')
  }
  if (!complete || !answer.answer.trim()) throw new Error('回答未完整接收，已保留收到的内容，请稍后重试。')
  return answer
}
