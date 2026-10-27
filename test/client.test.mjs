import assert from 'node:assert/strict'
import test from 'node:test'

/** Captured `window.__ModuleLoader__.load` call of the client half. */
let loaded = null
/** Style elements the client half appended. */
const styleTags = []
/** Every module the client half asked for. */
const required = []

globalThis.window = {
  __ModuleLoader__: {
    load(options) {
      loaded = options
    },
  },
  location: { origin: 'http://127.0.0.1:53199' },
}

globalThis.document = {
  createElement() {
    return {
      dataset: {},
      textContent: '',
      remove() {
        this.removed = true
      },
    }
  },
  head: {
    append(node) {
      styleTags.push(node)
    },
  },
}

await import('../client.js')

/** Minimal React shim: the client half only reads `createElement` while registering. */
const reactShim = {
  createElement() {
    return {}
  },
  useState() {
    throw new Error('hooks run only when React renders the component')
  },
  useEffect() {
    throw new Error('hooks run only when React renders the component')
  },
}

/**
 * Evaluate the client factory into a plugin object.
 * @returns {object} the browser plugin.
 */
function materialize() {
  assert.equal(typeof loaded.id, 'string')
  assert.equal(loaded.id, 'dsh-market-board')
  return loaded.factory((request) => {
    required.push(request)
    if (request === 'react') return reactShim
    throw new Error(`unexpected module request: ${request}`)
  })
}

/**
 * Run the browser plugin against a fake Client context.
 * @returns {{ dictionaries: object[], registration: object, injected: string[] }} captured contributions.
 */
function start() {
  const plugin = materialize()
  const dictionaries = []
  let registration = null
  const ctx = {
    effect(callback) {
      return callback()
    },
    locale: {
      register(ns, dicts) {
        dictionaries.push({ ns, dicts })
        return () => undefined
      },
      bind(ns) {
        const captured = dictionaries[dictionaries.length - 1]
        assert.equal(captured.ns, ns)
        return (key) => captured.dicts.zh[key] ?? key
      },
    },
    slots: {
      inject(slot, callback) {
        assert.equal(slot, 'plugins.tab')
        callback()
      },
      register(options, component) {
        registration = { options, component }
        return () => undefined
      },
    },
  }
  plugin.apply(ctx)
  return { dictionaries, registration, injected: plugin.inject ?? [] }
}

test('the client half loads under the module loader id of the package', () => {
  assert.equal(loaded.id, 'dsh-market-board')
  assert.equal(typeof loaded.factory, 'function')
})

test('the client plugin imports nothing but React', () => {
  required.length = 0
  start()
  assert.ok(required.length > 0)
  assert.ok(required.every((request) => request === 'react'))
})

test('the client plugin injects the services it reads', () => {
  const { injected } = start()
  assert.deepEqual(injected, ['slots', 'locale'])
})

test('both dictionaries are complete and translated', () => {
  const { dictionaries } = start()
  assert.equal(dictionaries.length, 1)
  const { ns, dicts } = dictionaries[0]
  assert.equal(ns, 'marketBoard')
  const zhKeys = Object.keys(dicts.zh).sort()
  const enKeys = Object.keys(dicts.en).sort()
  assert.deepEqual(enKeys, zhKeys)
  assert.ok(zhKeys.length > 20)
  for (const key of zhKeys) {
    assert.equal(typeof dicts.zh[key], 'string')
    assert.equal(typeof dicts.en[key], 'string')
  }
  assert.equal(dicts.zh.title, '插件市场')
  assert.equal(dicts.en.title, 'Market')
})

test('the tab registers into plugins.tab with a localized label', () => {
  const { registration } = start()
  assert.equal(registration.options.name, 'plugins.tab')
  assert.equal(registration.options.id, 'market-board')
  assert.equal(registration.options.locale, 'marketBoard')
  assert.equal(registration.options.order, 1)
  assert.equal(registration.options.label(), '插件市场')
  assert.equal(typeof registration.component, 'function')
})

test('the detail copy exists in both dictionaries', () => {
  const { dictionaries } = start()
  const dicts = dictionaries[dictionaries.length - 1].dicts
  for (const key of ['back', 'details', 'versions', 'latestTag', 'license', 'detailError', 'noVersions', 'openDetails']) {
    assert.equal(typeof dicts.zh[key], 'string')
    assert.equal(typeof dicts.en[key], 'string')
    assert.ok(dicts.zh[key] !== '')
    assert.ok(dicts.en[key] !== '')
  }
  assert.equal(dicts.zh.back, '返回列表')
  assert.equal(dicts.en.back, 'Back')
})

test('the client half owns one style tag with the tab styles', () => {
  const before = styleTags.length
  start()
  assert.equal(styleTags.length, before + 1)
  const tag = styleTags[styleTags.length - 1]
  assert.equal(tag.dataset.plugin, 'dsh-market-board')
  assert.match(tag.textContent, /\.dsmb-root/u)
  assert.match(tag.textContent, /var\(--dsw-alias-brand-primary\)/u)
})
