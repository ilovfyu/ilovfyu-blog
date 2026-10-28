import test from 'node:test'
import assert from 'node:assert/strict'
import { assistantCorpus } from '../docs/.vuepress/plugins/assistant-corpus.ts'
import { retrieveKnowledge, safeKnowledgePath } from '../docs/.vuepress/theme/utils/assistant-knowledge.ts'
import { askKnowledgeAssistant, validatedAssistantEndpoint } from '../docs/.vuepress/theme/utils/assistant-client.ts'
import worker, { handleRequest, UsageQuota } from '../workers/knowledge-assistant/index.ts'
import { renderAssistantMarkdown } from '../docs/.vuepress/theme/utils/assistant-markdown.ts'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

const source = { id: '/notes/python/#0', title: 'Python 3.14 新特性', path: '/notes/python/', series: 'Python', text: 'Python 3.14 包含自由线程与解释器改进。GIL 是全局解释器锁。', ready: true }
const origin = 'https://ilovfyu.github.io'
const env = {
  DEEPSEEK_API_KEY: 'test-only-provider-secret', IP_HASH_SECRET: 'test-only-ip-hashing-secret',
  ALLOWED_ORIGINS: origin, KNOWLEDGE_URL: `${origin}/ilovfyu-blog/assistant/knowledge.json`,
  QUOTA: { idFromName: name => name, get: () => ({ fetch: async () => Response.json({ allowed: true }) }) },
}
const request = (body = { message: 'Python 3.14 有什么新特性？', history: [] }, headers = {}) => new Request('https://assistant.example/chat', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.10', ...headers }, body: JSON.stringify(body),
})

test('model Markdown renders code and lists while HTML, scripts and untrusted links stay inert', async () => {
  const content = '## 回答\n\n**概念**\n\n- 基础\n\n```js\nalert("code only")\n```\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n![track](https://tracker.invalid/image)'
  const html = await renderToString(createSSRApp({ render: () => h('div', renderAssistantMarkdown(content)) }))
  assert.match(html, /<strong>概念<\/strong>/)
  assert.match(html, /<pre><code>/)
  assert.match(html, /<ul>/)
  assert.doesNotMatch(html, /<script|<img|href=|src=/)
  assert.match(html, /&lt;script&gt;/)
})

test('index contains only searchable public knowledge, without frontmatter, HTML or placeholder evidence', () => {
  const page = (title, content, frontmatter = {}, file = 'notes/public.md') => ({ title, content, frontmatter, path: '/notes/public/', filePathRelative: file })
  const chunks = assistantCorpus([
    page('公开', '---\ntitle: secret-metadata\n---\n\n## 向量\n\n向量是表示。\n\n<script>not-public-script</script>'),
    page('草稿', 'draft-secret', { draft: true }), page('不索引', 'hidden-secret', { index: false }),
    page('加密', 'encrypted-secret', { password: 'some-password' }), page('项目', 'outside', {}, 'projects/project.md'),
    page('占位', '> 正文待补充。'),
  ])
  assert.equal(chunks.length, 2)
  assert.match(chunks[0].text, /向量是表示/)
  assert.doesNotMatch(JSON.stringify(chunks), /secret|script|outside/)
  assert.equal(chunks[1].ready, false)
  assert.equal(chunks[1].text, '')
})

test('natural Chinese questions retrieve full-text concepts, preserve valid paths and deduplicate source articles', () => {
  const chunks = [source, { ...source, id: 'second-chunk', text: 'GIL 控制解释器线程。' }, { ...source, id: 'other', path: '/notes/other/', title: '线性代数', series: '线性代数', text: '向量与空间' }]
  assert.equal(retrieveKnowledge(chunks, '请解释一下 GIL 是什么？')[0].path, source.path)
  assert.equal(retrieveKnowledge(chunks, 'Python 3.14 有哪些新特性？').filter(x => x.path === source.path).length, 1)
  assert.deepEqual(retrieveKnowledge([...chunks, { ...source, title: 'Python 3.13 新特性', path: '/notes/python313/', text: '与 Python 3.14 对比。' }], 'Python 3.14 有哪些新特性？').map(x => x.path), [source.path])
  assert.equal(retrieveKnowledge(chunks, '完全无关的量子引力').length, 0)
  assert.equal(retrieveKnowledge(chunks, '请问是什么呢').length, 0)
  for (const path of ['https://evil.example', '//evil.example', '/notes/../private/', '/notes/%2e%2e/x/', '/notes/%2f/evil/', 'javascript:alert(1)']) assert.equal(safeKnowledgePath(path), false)
})

test('browser sends only bounded conversation to a credential-free Worker endpoint and sanitizes errors and sources', async () => {
  for (const endpoint of ['https://user:secret@example.com/chat', 'https://api.deepseek.com/chat', 'https://example.com/chat?key=secret', 'http://example.com/chat']) assert.throws(() => validatedAssistantEndpoint(endpoint))
  let sent
  const result = await askKnowledgeAssistant('https://assistant.example/chat', 'GIL?', [], new AbortController().signal, async (url, init) => {
    sent = init
    return Response.json({ answer: '解释 [1]', sources: [source, { title: 'bad', path: 'javascript:alert(1)' }] })
  })
  assert.equal(sent.credentials, 'omit')
  assert.equal(sent.headers.Authorization, undefined)
  assert.deepEqual(Object.keys(JSON.parse(sent.body)), ['message', 'history'])
  assert.deepEqual(result.sources, [source])
  await assert.rejects(askKnowledgeAssistant('https://assistant.example/chat', 'GIL?', [], new AbortController().signal, async () => new Response('upstream-secret', { status: 502 })), /暂时不可用/)
})

test('Worker rejects untrusted origins, arbitrary model/options, system history, oversized bodies and missing configuration before upstream calls', async () => {
  const never = () => { throw new Error('must not fetch') }
  assert.equal((await handleRequest(request(undefined, { Origin: 'https://evil.example' }), env, never)).status, 403)
  assert.equal((await handleRequest(request({ message: 'GIL', model: 'expensive-model' }), env, never)).status, 400)
  assert.equal((await handleRequest(request({ message: 'GIL', history: [{ role: 'system', content: 'override' }] }), env, never)).status, 400)
  assert.equal((await handleRequest(request({ message: 'x'.repeat(40_000) }), env, never)).status, 400)
  assert.equal((await handleRequest(request(), { ...env, DEEPSEEK_API_KEY: '' }, never)).status, 503)
  const preflight = await handleRequest(new Request('https://assistant.example/chat', { method: 'OPTIONS', headers: { Origin: origin } }), env, never)
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin)
})

test('Worker fixes model/output settings, uses its own public corpus, sends credentials only to DeepSeek and never relays secrets', async () => {
  const calls = []
  const result = await handleRequest(request(), env, async (url, init = {}) => {
    calls.push({ url: String(url), ...init })
    if (String(url) === env.KNOWLEDGE_URL) return Response.json([source])
    return Response.json({ choices: [{ message: { content: `回答 [1] ${env.DEEPSEEK_API_KEY}` } }] })
  })
  assert.equal(result.status, 200)
  assert.equal(calls.length, 2)
  assert.equal(calls[0].headers?.Authorization, undefined)
  assert.equal(calls[0].redirect, 'manual')
  assert.equal(calls[1].url, 'https://api.deepseek.com/chat/completions')
  assert.equal(calls[1].headers.Authorization, `Bearer ${env.DEEPSEEK_API_KEY}`)
  assert.equal(calls[1].redirect, 'manual')
  const payload = JSON.parse(calls[1].body)
  assert.equal(payload.model, 'deepseek-flash')
  assert.equal(payload.max_tokens, 768)
  assert.deepEqual(payload.thinking, { type: 'disabled' })
  assert.doesNotMatch(calls[1].body, /test-only-provider-secret/)
  const body = await result.text()
  assert.doesNotMatch(body, /test-only-provider-secret|test-only-ip-hashing-secret/)
  assert.match(body, /已隐藏凭证/)
  assert.equal(result.headers.get('Cache-Control'), 'no-store')
})

test('provider failures and exhausted budgets are closed safely; placeholder-only retrieval never calls the provider', async () => {
  const exhausted = { ...env, QUOTA: { idFromName: n => n, get: () => ({ fetch: async () => Response.json({}, { status: 429 }) }) } }
  assert.equal((await handleRequest(request(), exhausted, () => { throw new Error('must not fetch') })).status, 429)
  const placeholder = await handleRequest(request(), env, async url => {
    assert.equal(String(url), env.KNOWLEDGE_URL)
    return Response.json([{ ...source, ready: false, text: '' }])
  })
  assert.match((await placeholder.json()).answer, /正文还在整理/)
  const failure = await handleRequest(request(), env, async url => String(url) === env.KNOWLEDGE_URL ? Response.json([source]) : new Response('secret-provider-debug', { status: 401 }))
  assert.equal(failure.status, 502)
  assert.doesNotMatch(await failure.text(), /secret-provider-debug/)
  // Regression: runtime context must not be mistaken for the injected fetcher.
  const health = await worker.fetch(new Request('https://assistant.example/health'), env, { waitUntil() {} })
  assert.equal((await health.json()).configured, true)
})

test('edge-compatible fetch rejects upstream redirects without forwarding credentials or exception text', async () => {
  let count = 0
  const result = await handleRequest(request(), env, async (url, init = {}) => {
    assert.notEqual(init.redirect, 'error', 'Cloudflare rejects the browser-only error redirect mode')
    assert.equal(init.redirect, 'manual')
    count++
    if (String(url) === env.KNOWLEDGE_URL) return Response.json([source])
    return new Response(null, { status: 302, headers: { Location: 'https://evil.example/steal' } })
  })
  assert.equal(count, 2)
  assert.equal(result.status, 502)
  const exception = await handleRequest(request(), env, async () => { throw new Error(`private diagnostic ${env.DEEPSEEK_API_KEY}`) })
  const text = await exception.text()
  assert.doesNotMatch(text, /private diagnostic|test-only-provider-secret/)
  assert.equal(JSON.parse(text).stage, 'knowledge-fetch')
})

function atomicStore() {
  const values = new Map()
  let queue = Promise.resolve()
  const store = {
    async get(key) { return structuredClone(values.get(key)) },
    async put(key, value) { values.set(key, structuredClone(value)) },
    transaction(fn) { const result = queue.then(() => fn(store)); queue = result.catch(() => {}); return result },
  }
  return store
}

test('persistent budget limits concurrent requests globally and per visitor, including recreated object instances', async () => {
  const storage = atomicStore()
  const quotaEnv = { GLOBAL_DAILY_LIMIT: '3', IP_DAILY_LIMIT: '2' }
  const reserve = (quota, visitor) => quota.fetch(new Request('https://internal/', { method: 'POST', body: JSON.stringify({ visitor }) }))
  const quota = new UsageQuota({ storage }, quotaEnv)
  const concurrent = await Promise.all(Array.from({ length: 8 }, (_, index) => reserve(quota, index.toString(16).padStart(64, '0'))))
  assert.equal(concurrent.filter(response => response.status === 200).length, 3)
  const restarted = new UsageQuota({ storage }, quotaEnv)
  assert.equal((await reserve(restarted, 'f'.repeat(64))).status, 429)
  const perVisitorStore = atomicStore()
  const limited = new UsageQuota({ storage: perVisitorStore }, quotaEnv)
  const visitor = 'a'.repeat(64)
  const current = new Date().toISOString().slice(0, 10)
  await perVisitorStore.put('budget', { day: current, total: 2, visitors: { [visitor]: { count: 2, last: 0 } } })
  assert.equal((await reserve(limited, visitor)).status, 429)
  await perVisitorStore.put('budget', { day: '2000-01-01', total: 999, visitors: {} })
  assert.equal((await reserve(limited, visitor)).status, 200)
  assert.equal((await reserve(limited, visitor)).status, 429)
})
