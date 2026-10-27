import assert from 'node:assert/strict'
import test from 'node:test'

import { apply } from '../index.js'

/**
 * Build one registry search object for the stubbed registry.
 * @param {string} name - package name.
 * @param {object} [options] - version, date, weekly downloads.
 * @returns {object} search result.
 */
function searchObject(name, options = {}) {
  return {
    package: {
      name,
      version: options.version ?? '1.0.0',
      description: options.description ?? 'A DeepSeek Harness plugin',
      keywords: ['dsh-plugin'],
      publisher: { username: 'alice' },
      date: options.date ?? '2026-10-01T00:00:00.000Z',
      links: { npm: `https://www.npmjs.com/package/${name}` },
    },
    downloads: { weekly: options.weekly ?? 0, monthly: 0 },
  }
}

/**
 * Build one registry package document for the stubbed registry.
 * @param {string} name - package name.
 * @returns {object} package document.
 */
function packumentFor(name) {
  return {
    name,
    description: 'A DeepSeek Harness plugin',
    license: 'MIT',
    homepage: `https://example.com/${name}`,
    repository: { type: 'git', url: `git+https://github.com/acme/${name}.git` },
    keywords: ['dsh', 'plugin'],
    maintainers: [{ name: 'alice' }],
    'dist-tags': { latest: '1.1.0' },
    time: {
      created: '2026-01-01T00:00:00.000Z',
      modified: '2026-10-01T00:00:00.000Z',
      '1.0.0': '2026-01-01T00:00:00.000Z',
      '1.1.0': '2026-10-01T00:00:00.000Z',
    },
    versions: { '1.0.0': {}, '1.1.0': {} },
  }
}

/**
 * Start the Host half against a fake context and expose the registered route.
 * @param {object} [options] - plugin config, installed bundles, stub answers.
 * @returns {{ route: object, requests: string[] }} the route and request log.
 */
function start(options = {}) {
  const requests = []
  const routes = []
  const installed = options.installed ?? []
  const manager = { listBundles: async () => installed }
  const ctx = {
    get(name) {
      return name === 'pluginManager' ? manager : undefined
    },
    effect(callback) {
      return callback()
    },
    webServer: {
      register(route) {
        routes.push(route)
        return () => undefined
      },
    },
  }
  globalThis.fetch = async (url) => {
    const text = String(url)
    requests.push(text)
    if (text.includes('/-/v1/search')) {
      const objects = options.objects ?? [searchObject('dsh-plugin-alpha'), searchObject('dsh-plugin-beta', { weekly: 900 })]
      return { ok: true, status: 200, statusText: 'OK', json: async () => ({ objects }) }
    }
    if (options.packumentFailure === true) throw new Error('registry offline')
    if (options.packumentStatus !== undefined) {
      return { ok: false, status: options.packumentStatus, statusText: 'refused', json: async () => ({}) }
    }
    const name = text.split('/').pop() ?? ''
    const document = options.packument ?? packumentFor(name)
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => document,
      text: async () => JSON.stringify(document),
    }
  }
  apply(ctx, { cacheTtlMs: 60000, ...(options.config ?? {}) })
  assert.equal(routes.length, 1)
  return { route: routes[0], requests }
}

/**
 * Invoke a route with a fake request and response pair.
 * @param {object} route - registered WebRoute.
 * @param {object} request - method and url.
 * @returns {Promise<{ status: number, headers: object, body: any }>} captured response.
 */
async function invoke(route, request) {
  const captured = { status: 0, headers: {}, body: '' }
  const res = {
    writeHead(status, headers) {
      captured.status = status
      captured.headers = headers
    },
    end(body) {
      captured.body = body ?? ''
    },
  }
  await route.handler({ method: request.method ?? 'GET', url: request.url }, res)
  if (captured.body === '') return { ...captured, body: null }
  return { ...captured, body: JSON.parse(captured.body) }
}

test('the Host half registers a prefix route on the Web server', () => {
  const { route } = start()
  assert.equal(route.kind, 'prefix')
  assert.equal(route.path, '/plugin-market-board')
  assert.equal(typeof route.handler, 'function')
})

test('the data endpoint answers the merged, annotated market page', async () => {
  const { route } = start({
    installed: [{ name: 'dsh-plugin-beta', version: '1.0.0', installed: true, availability: 'profile' }],
  })
  const answer = await invoke(route, { url: '/plugin-market-board/data?sort=downloads&limit=10' })
  assert.equal(answer.status, 200)
  assert.match(answer.headers['content-type'], /application\/json/u)
  assert.equal(answer.body.total, 2)
  assert.deepEqual(answer.body.items.map((item) => item.name), ['dsh-plugin-beta', 'dsh-plugin-alpha'])
  assert.equal(answer.body.items[0].status, 'installed')
  assert.equal(answer.body.items[1].status, 'available')
  assert.ok(answer.body.updatedAt > 0)
})

test('the data endpoint filters by query text and refuses unknown paths', async () => {
  const { route } = start()
  const filtered = await invoke(route, { url: '/plugin-market-board/data?query=alpha' })
  assert.deepEqual(filtered.body.items.map((item) => item.name), ['dsh-plugin-alpha'])
  const missing = await invoke(route, { url: '/plugin-market-board/nope' })
  assert.equal(missing.status, 404)
  const post = await invoke(route, { method: 'POST', url: '/plugin-market-board/data' })
  assert.equal(post.status, 405)
})

test('a health read names the data and entry endpoints', async () => {
  const { route } = start()
  const answer = await invoke(route, { url: '/plugin-market-board' })
  assert.equal(answer.status, 200)
  assert.equal(answer.body.ok, true)
  assert.deepEqual(answer.body.endpoints, ['/plugin-market-board/data', '/plugin-market-board/entry'])
})

test('the entry endpoint reads one package detail with its version history', async () => {
  const { route, requests } = start()
  const answer = await invoke(route, { url: '/plugin-market-board/entry?name=dsh-plugin-alpha' })
  assert.equal(answer.status, 200)
  assert.equal(answer.body.entry.name, 'dsh-plugin-alpha')
  assert.equal(answer.body.entry.latest, '1.1.0')
  assert.deepEqual(answer.body.entry.versions.map((version) => version.version), ['1.1.0', '1.0.0'])
  assert.equal(answer.body.entry.license, 'MIT')
  assert.equal(answer.body.installation.status, 'available')
  assert.ok(requests.some((url) => url.endsWith('/dsh-plugin-alpha')))
})

test('the entry endpoint reports an available update from the profile bundles', async () => {
  const { route } = start({
    installed: [{ name: 'dsh-plugin-alpha', version: '1.0.0', installed: true, availability: 'profile' }],
  })
  const answer = await invoke(route, { url: '/plugin-market-board/entry?name=dsh-plugin-alpha' })
  assert.equal(answer.body.installation.status, 'update')
  assert.equal(answer.body.installation.installedVersion, '1.0.0')
})

test('the entry endpoint refuses an invalid package name before asking the registry', async () => {
  const { route, requests } = start()
  const answer = await invoke(route, { url: '/plugin-market-board/entry?name=..%2Fetc%2Fpasswd' })
  assert.equal(answer.status, 400)
  assert.equal(requests.length, 0)
  const missing = await invoke(route, { url: '/plugin-market-board/entry' })
  assert.equal(missing.status, 400)
})

test('the entry endpoint keeps one package detail in its cache', async () => {
  const { route, requests } = start()
  await invoke(route, { url: '/plugin-market-board/entry?name=dsh-plugin-alpha' })
  const afterFirst = requests.length
  await invoke(route, { url: '/plugin-market-board/entry?name=dsh-plugin-alpha' })
  assert.equal(requests.length, afterFirst)
  await invoke(route, { url: '/plugin-market-board/entry?name=dsh-plugin-alpha&refresh=1' })
  assert.ok(requests.length > afterFirst)
})

test('the entry endpoint answers 502 for a registry failure', async () => {
  const { route } = start({ packumentFailure: true })
  const answer = await invoke(route, { url: '/plugin-market-board/entry?name=dsh-plugin-alpha' })
  assert.equal(answer.status, 502)
  assert.match(answer.body.error, /offline|unreachable|registry/u)
})

test('the registry snapshot is cached until refresh is requested', async () => {
  const { route, requests } = start()
  await invoke(route, { url: '/plugin-market-board/data' })
  const afterFirst = requests.length
  assert.ok(afterFirst > 0)
  await invoke(route, { url: '/plugin-market-board/data' })
  assert.equal(requests.length, afterFirst)
  await invoke(route, { url: '/plugin-market-board/data?refresh=1' })
  assert.ok(requests.length > afterFirst)
})

test('an unreachable registry answers 502 with its reason', async () => {
  const { route } = start()
  globalThis.fetch = async () => {
    throw new Error('offline')
  }
  const answer = await invoke(route, { url: '/plugin-market-board/data' })
  assert.equal(answer.status, 502)
  assert.match(answer.body.error, /unreachable|offline|plugin registry/u)
})
