import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DETAIL_VERSION_LIMIT,
  collectMarket,
  installationOf,
  isDshRelated,
  isPackageName,
  normalizeSearchObject,
  presentMarket,
  queryMarket,
  readPackageDetail,
} from '../market-source.js'

/**
 * Build one registry search object.
 * @param {string} name - package name.
 * @param {object} [overrides] - fields to override.
 * @returns {object} search result.
 */
function searchObject(name, overrides = {}) {
  const date = overrides.date ?? '2026-10-01T00:00:00.000Z'
  const keywords = overrides.keywords ?? ['dsh', 'dsh-plugin']
  const description = overrides.description ?? 'A DeepSeek Harness plugin'
  return {
    package: {
      name,
      version: overrides.version ?? '1.0.0',
      description,
      keywords,
      publisher: { username: overrides.author ?? 'alice' },
      date,
      links: overrides.links ?? { npm: `https://www.npmjs.com/package/${name}` },
    },
    downloads: { weekly: overrides.weekly ?? 0, monthly: overrides.monthly ?? 0 },
  }
}

test('normalizeSearchObject keeps the fields the tab shows', () => {
  const item = normalizeSearchObject(searchObject('dsh-plugin-alpha', { weekly: 1200, monthly: 9000 }))
  assert.equal(item.name, 'dsh-plugin-alpha')
  assert.equal(item.version, '1.0.0')
  assert.equal(item.author, 'alice')
  assert.equal(item.weeklyDownloads, 1200)
  assert.equal(item.monthlyDownloads, 9000)
  assert.equal(item.npmUrl, 'https://www.npmjs.com/package/dsh-plugin-alpha')
})

test('normalizeSearchObject de-duplicates and lowercases keywords', () => {
  const item = normalizeSearchObject(searchObject('x', { keywords: ['DSH', 'dsh', 'plugin', 3] }))
  assert.deepEqual(item.keywords, ['dsh', 'plugin'])
})

test('normalizeSearchObject rejects entries without a package name', () => {
  assert.equal(normalizeSearchObject({ package: {} }), null)
  assert.equal(normalizeSearchObject(undefined), null)
})

test('isDshRelated accepts name, keyword, and description signals', () => {
  const base = normalizeSearchObject(searchObject('some-tool', { keywords: [], description: 'plain notes app' }))
  assert.equal(isDshRelated(base), false)
  assert.equal(isDshRelated({ ...base, name: 'my-dsh-tool' }), true)
  assert.equal(isDshRelated({ ...base, keywords: ['deepseek-harness'] }), true)
  assert.equal(isDshRelated({ ...base, description: 'built for DeepSeek Harness' }), true)
})

test('collectMarket merges queries, filters unrelated packages, and sorts newest first', async () => {
  const calls = []
  const fetchImpl = async (url) => {
    calls.push(String(url))
    const text = new URL(String(url)).searchParams.get('text')
    const objects =
      text === 'keywords:dsh-plugin'
        ? [
            searchObject('dsh-plugin-old', { date: '2026-01-01T00:00:00.000Z' }),
            searchObject('dsh-plugin-new', { date: '2026-10-20T00:00:00.000Z' }),
            searchObject('unrelated-notes', { keywords: [], description: 'a notes app' }),
          ]
        : [searchObject('dsh-plugin-old', { date: '2026-01-01T00:00:00.000Z' })]
    return { ok: true, status: 200, statusText: 'OK', json: async () => ({ objects }) }
  }
  const result = await collectMarket({ queries: ['keywords:dsh-plugin', 'keywords:dsh'], fetchImpl })
  assert.equal(calls.length, 2)
  assert.deepEqual(
    result.items.map((item) => item.name),
    ['dsh-plugin-new', 'dsh-plugin-old'],
  )
  assert.deepEqual(result.failures, [])
})

test('collectMarket reports a failure only when every query fails', async () => {
  const failing = async () => {
    throw new Error('offline')
  }
  await assert.rejects(() => collectMarket({ queries: ['a'], fetchImpl: failing }), /unreachable/)
  const partial = async (url) => {
    if (String(url).includes('text=b')) throw new Error('offline')
    return { ok: true, status: 200, statusText: 'OK', json: async () => ({ objects: [searchObject('dsh-a')] }) }
  }
  const result = await collectMarket({ queries: ['a', 'b'], fetchImpl: partial })
  assert.equal(result.items.length, 1)
  assert.equal(result.failures.length, 1)
})

test('collectMarket skips the packages the installation already ships', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({
      objects: [searchObject('@deepseek-ai/dsh-agent'), searchObject('dsh-plugin-community')],
    }),
  })
  const excluded = await collectMarket({ queries: ['q'], fetchImpl })
  assert.deepEqual(excluded.items.map((item) => item.name), ['dsh-plugin-community'])
  const included = await collectMarket({ queries: ['q'], fetchImpl, excludeScopes: [] })
  assert.equal(included.items.length, 2)
})

test('queryMarket filters, orders, and pages', () => {
  const items = [
    normalizeSearchObject(searchObject('dsh-plugin-a', { weekly: 10, date: '2026-01-01T00:00:00.000Z', description: 'terminal tools' })),
    normalizeSearchObject(searchObject('dsh-plugin-b', { weekly: 900, date: '2026-09-01T00:00:00.000Z', description: 'browser panel' })),
    normalizeSearchObject(searchObject('dsh-plugin-c', { weekly: 100, date: '2026-05-01T00:00:00.000Z', description: 'terminal search' })),
  ]
  assert.deepEqual(
    queryMarket(items, { sort: 'newest' }).items.map((item) => item.name),
    ['dsh-plugin-b', 'dsh-plugin-c', 'dsh-plugin-a'],
  )
  assert.deepEqual(
    queryMarket(items, { sort: 'downloads' }).items.map((item) => item.name),
    ['dsh-plugin-b', 'dsh-plugin-c', 'dsh-plugin-a'],
  )
  assert.deepEqual(
    queryMarket(items, { sort: 'name' }).items.map((item) => item.name),
    ['dsh-plugin-a', 'dsh-plugin-b', 'dsh-plugin-c'],
  )
  assert.deepEqual(
    queryMarket(items, { text: 'TERMINAL' }).items.map((item) => item.name),
    ['dsh-plugin-c', 'dsh-plugin-a'],
  )
  const page = queryMarket(items, { sort: 'name', offset: 1, limit: 1 })
  assert.equal(page.total, 3)
  assert.deepEqual(page.items.map((item) => item.name), ['dsh-plugin-b'])
})

test('queryMarket bounds the page size', () => {
  const items = Array.from({ length: 100 }, (_, index) =>
    normalizeSearchObject(searchObject(`dsh-plugin-${String(index).padStart(3, '0')}`)),
  )
  assert.equal(queryMarket(items, { limit: 1000 }).items.length, 60)
  assert.equal(queryMarket(items, { limit: 0 }).items.length, 1)
})

test('installationOf distinguishes every installation state', () => {
  const installed = new Map([
    ['dsh-plugin-same', { version: '1.2.0' }],
    ['dsh-plugin-older', { version: '1.0.0' }],
    ['dsh-plugin-builtin', { version: '0.9.0', provided: true }],
  ])
  assert.deepEqual(installationOf('dsh-plugin-new', '1.0.0', installed), { status: 'available' })
  assert.deepEqual(installationOf('dsh-plugin-same', '1.2.0', installed), {
    status: 'installed',
    installedVersion: '1.2.0',
  })
  assert.deepEqual(installationOf('dsh-plugin-older', '1.1.0', installed), {
    status: 'update',
    installedVersion: '1.0.0',
  })
  assert.deepEqual(installationOf('dsh-plugin-builtin', '0.9.0', installed), {
    status: 'provided',
    installedVersion: '0.9.0',
  })
})

test('presentMarket annotates a page and keeps the market fields', () => {
  const items = [
    normalizeSearchObject(searchObject('dsh-plugin-a', { weekly: 5 })),
    normalizeSearchObject(searchObject('dsh-plugin-b', { weekly: 50 })),
  ]
  const payload = presentMarket({
    items,
    installed: new Map([['dsh-plugin-b', { version: '1.0.0' }]]),
    sort: 'downloads',
    limit: 10,
    updatedAt: 1234,
  })
  assert.equal(payload.total, 2)
  assert.equal(payload.updatedAt, 1234)
  assert.deepEqual(payload.items.map((item) => item.name), ['dsh-plugin-b', 'dsh-plugin-a'])
  assert.equal(payload.items[0].status, 'installed')
  assert.equal(payload.items[1].status, 'available')
})

test('isPackageName accepts registry names and refuses path tricks', () => {
  assert.equal(isPackageName('dsh-plugin-alpha'), true)
  assert.equal(isPackageName('@acme/dsh-panel'), true)
  assert.equal(isPackageName('a.b_c-d'), true)
  assert.equal(isPackageName(''), false)
  assert.equal(isPackageName('../etc/passwd'), false)
  assert.equal(isPackageName('a/b/c'), false)
  assert.equal(isPackageName('has space'), false)
  assert.equal(isPackageName(42), false)
})

test('readPackageDetail reads versions newest first and keeps the registry facts', () => {
  const detail = readPackageDetail({
    name: 'dsh-plugin-alpha',
    description: 'A plugin',
    license: 'MIT',
    homepage: 'https://example.com',
    repository: { type: 'git', url: 'git+https://github.com/acme/alpha.git' },
    keywords: ['DSH', 'Panel'],
    maintainers: [{ name: 'alice' }, {}],
    'dist-tags': { latest: '1.2.0' },
    time: {
      created: '2026-01-01T00:00:00.000Z',
      modified: '2026-10-01T00:00:00.000Z',
      '1.0.0': '2026-01-01T00:00:00.000Z',
      '1.2.0': '2026-10-01T00:00:00.000Z',
      '1.1.0': '2026-05-01T00:00:00.000Z',
    },
    versions: { '1.0.0': {}, '1.1.0': { deprecated: 'use 1.2.0' }, '1.2.0': {} },
  })
  assert.equal(detail.name, 'dsh-plugin-alpha')
  assert.equal(detail.license, 'MIT')
  assert.equal(detail.repository, 'git+https://github.com/acme/alpha.git')
  assert.deepEqual(detail.keywords, ['dsh', 'panel'])
  assert.deepEqual(detail.maintainers, ['alice'])
  assert.equal(detail.latest, '1.2.0')
  assert.equal(detail.totalVersions, 3)
  assert.deepEqual(detail.versions.map((version) => version.version), ['1.2.0', '1.1.0', '1.0.0'])
  assert.equal(detail.versions[1].deprecated, true)
  assert.equal(detail.updatedAt, '2026-10-01T00:00:00.000Z')
})

test('readPackageDetail bounds the version list and tolerates sparse documents', () => {
  const versions = {}
  const time = {}
  for (let index = 0; index < DETAIL_VERSION_LIMIT + 10; index += 1) {
    versions[`1.0.${index}`] = {}
    time[`1.0.${index}`] = `2026-01-${String((index % 28) + 1).padStart(2, '0')}T00:00:00.000Z`
  }
  const detail = readPackageDetail({ name: 'p', versions, time })
  assert.equal(detail.versions.length, DETAIL_VERSION_LIMIT)
  assert.equal(detail.latest, detail.versions[0].version)
  assert.equal(readPackageDetail(null), null)
  assert.equal(readPackageDetail({}), null)
  const sparse = readPackageDetail({ name: 'q' }, 'q')
  assert.equal(sparse.name, 'q')
  assert.deepEqual(sparse.versions, [])
  assert.equal(sparse.totalVersions, 0)
  assert.equal(sparse.latest, '')
})
