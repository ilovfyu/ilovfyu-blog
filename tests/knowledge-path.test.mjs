import test from 'node:test'
import assert from 'node:assert/strict'
import { knowledgePath, knowledgeStructure } from '../docs/.vuepress/theme/utils/knowledge-path.ts'

test('folder paths derive a topic and arbitrary nested groups', () => {
  assert.deepEqual(knowledgeStructure(['FastAPI', '基础', '请求与响应']), { series: 'FastAPI', group: '基础 / 请求与响应', groupPath: ['基础', '请求与响应'] })
  assert.deepEqual(knowledgeStructure(['FastAPI']), { series: 'FastAPI', group: '', groupPath: [] })
  assert.deepEqual(knowledgeStructure([], undefined, undefined, '知识笔记'), { series: '知识笔记', group: '', groupPath: [] })
})

test('explicit series and groups stay compatible with existing single-level metadata', () => {
  assert.deepEqual(knowledgeStructure([], 'FastAPI', '入门'), { series: 'FastAPI', group: '入门', groupPath: ['入门'] })
  assert.deepEqual(knowledgeStructure(['FastAPI', '基础'], 'FastAPI'), { series: 'FastAPI', group: '基础', groupPath: ['基础'] })
  assert.deepEqual(knowledgeStructure(['基础', '路由'], 'FastAPI'), { series: 'FastAPI', group: '基础 / 路由', groupPath: ['基础', '路由'] })
  assert.deepEqual(knowledgeStructure(['FastAPI', '基础'], 'FastAPI', '高级 / 依赖'), { series: 'FastAPI', group: '高级 / 依赖', groupPath: ['高级', '依赖'] })
})

test('empty segments and path separators normalize without changing actual file locations', () => {
  assert.deepEqual(knowledgePath(' / 基础 // 请求\\参数 / '), ['基础', '请求', '参数'])
  assert.deepEqual(knowledgePath(['基础', '', '请求', null]), ['基础', '请求'])
  assert.deepEqual(knowledgePath(undefined), [])
  assert.deepEqual(knowledgePath('./基础/../请求'), ['基础', '请求'])
})


test('fixed topic roots keep a same-named nested directory rather than discarding it', () => {
  assert.deepEqual(knowledgeStructure(['FastAPI', '基础'], 'FastAPI', undefined, '知识笔记', true), {
    series: 'FastAPI', group: 'FastAPI / 基础', groupPath: ['FastAPI', '基础'],
  })
})
