/**
 * Host half of the plugin market board.
 *
 * It reads the public npm registry (a network call the browser cannot do
 * without CORS surprises), merges and caches the result, annotates every entry
 * with the profile's installation state, and serves one small JSON endpoint to
 * the browser half on the same Web origin. Installation itself stays with the
 * Plugins page: the tab calls the page's own `install` action.
 *
 * @module dsh-market-board
 */
import {
  DEFAULT_EXCLUDED_SCOPES,
  DEFAULT_QUERIES,
  DEFAULT_REGISTRY,
  collectMarket,
  isPackageName,
  installationOf,
  presentMarket,
  readPackageDetail,
} from './market-source.js'

/** Path prefix of the JSON endpoint the browser half reads. */
const ROUTE_PATH = '/plugin-market-board'

/** Default freshness of the merged registry snapshot. */
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000

/** Services this plugin needs before it can register its route. */
export const inject = ['webServer']

/**
 * Read one positive integer query parameter.
 * @param {URLSearchParams} params - request query.
 * @param {string} name - parameter name.
 * @param {number} fallback - value used when absent or invalid.
 * @param {number} min - smallest accepted value.
 * @param {number} max - largest accepted value.
 * @returns {number} the bounded integer.
 */
function readInteger(params, name, fallback, min, max) {
  const raw = params.get(name)
  if (raw === null) return fallback
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

/**
 * Write one JSON response.
 * @param {import('node:http').ServerResponse} res - response to write.
 * @param {number} status - HTTP status code.
 * @param {unknown} payload - JSON-serializable body.
 * @param {boolean} headOnly - whether the caller is a HEAD request.
 * @returns {void}
 */
function writeJson(res, status, payload, headOnly) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(Buffer.byteLength(body)),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(headOnly ? undefined : body)
}

/**
 * Describe the plugin market board: cache the registry snapshot and answer the
 * browser half's queries.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host plugin context.
 * @param {object} [config] - optional row configuration.
 * @returns {void}
 */
export function apply(ctx, config = {}) {
  const registry = typeof config?.registry === 'string' ? config.registry : DEFAULT_REGISTRY
  const queries = Array.isArray(config?.queries) ? config.queries.filter((q) => typeof q === 'string') : DEFAULT_QUERIES
  const cacheTtlMs = Number.isFinite(config?.cacheTtlMs) ? Number(config.cacheTtlMs) : DEFAULT_CACHE_TTL_MS
  const timeoutMs = Number.isFinite(config?.timeoutMs) ? Number(config.timeoutMs) : 20000
  const excludeScopes = config?.includeOfficial === true ? [] : DEFAULT_EXCLUDED_SCOPES

  /** @type {{ at: number, items: object[], failures: string[] }} */
  let cached = { at: 0, items: [], failures: [] }
  /** @type {Promise<{ at: number, items: object[], failures: string[] }> | null} */
  let inFlight = null
  /** @type {Map<string, { at: number, value: object }>} */
  const details = new Map()
  /** @type {Map<string, Promise<object>>} */
  const detailInFlight = new Map()

  /**
   * Read the merged registry snapshot, reusing the cache unless refresh is asked for.
   * @param {boolean} force - ignore the cached snapshot.
   * @returns {Promise<{ at: number, items: object[], failures: string[] }>} the snapshot.
   */
  function load(force) {
    const fresh = cached.items.length > 0 && Date.now() - cached.at < cacheTtlMs
    if (!force && fresh) return Promise.resolve(cached)
    if (inFlight !== null) return inFlight
    inFlight = collectMarket({ registry, queries, timeoutMs, excludeScopes })
      .then((result) => {
        cached = { at: Date.now(), items: result.items, failures: result.failures }
        return cached
      })
      .finally(() => {
        inFlight = null
      })
    return inFlight
  }

  /**
   * Read the profile's installed bundles as a name-indexed map.
   * @returns {Promise<Map<string, { version?: string, provided?: boolean }>>} installed bundles.
   */
  async function installedBundles() {
    const manager = ctx.get('pluginManager')
    if (manager === undefined || typeof manager.listBundles !== 'function') return new Map()
    try {
      const bundles = await manager.listBundles()
      const map = new Map()
      for (const bundle of Array.isArray(bundles) ? bundles : []) {
        if (!bundle || typeof bundle.name !== 'string' || bundle.installed !== true) continue
        map.set(bundle.name, {
          ...(typeof bundle.version === 'string' ? { version: bundle.version } : {}),
          provided: bundle.availability === 'installation',
        })
      }
      return map
    } catch {
      return new Map()
    }
  }

  /**
   * Fetch one package's registry document.
   * @param {string} name - validated package name.
   * @returns {Promise<object>} the registry document.
   */
  async function fetchPackument(name) {
    const base = registry.endsWith('/') ? registry : `${registry}/`
    const path = name.startsWith('@') ? name.replace('/', '%2F') : name
    const endpoint = new URL(path, base)
    const response = await fetch(endpoint, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok) throw new Error(`the registry answered ${response.status} for ${name}`)
    const text = await response.text()
    if (text.length > 4000000) throw new Error(`the registry document for ${name} is too large to show`)
    try {
      return JSON.parse(text)
    } catch {
      throw new Error(`the registry document for ${name} is not JSON`)
    }
  }

  /**
   * Read one package's detail record, cached per name.
   * @param {string} name - validated package name.
   * @param {boolean} force - ignore the cached record.
   * @returns {Promise<object>} the detail record.
   */
  function loadDetail(name, force) {
    const known = details.get(name)
    if (!force && known !== undefined && Date.now() - known.at < cacheTtlMs) return Promise.resolve(known.value)
    const running = detailInFlight.get(name)
    if (running !== undefined) return running
    const request = fetchPackument(name)
      .then((packument) => {
        const value = readPackageDetail(packument, name)
        if (value === null) throw new Error(`the registry document for ${name} has no usable detail`)
        details.delete(name)
        details.set(name, { at: Date.now(), value })
        while (details.size > 60) details.delete(details.keys().next().value)
        return value
      })
      .finally(() => {
        detailInFlight.delete(name)
      })
    detailInFlight.set(name, request)
    return request
  }

  /**
   * Answer one request under the route prefix.
   * @param {import('node:http').IncomingMessage} req - incoming request.
   * @param {import('node:http').ServerResponse} res - response to write.
   * @returns {Promise<void>}
   */
  async function handler(req, res) {
    const headOnly = req.method === 'HEAD'
    if (req.method !== 'GET' && !headOnly) {
      writeJson(res, 405, { error: 'only GET is supported' }, false)
      return
    }
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    const params = url.searchParams
    if (url.pathname === ROUTE_PATH || url.pathname === `${ROUTE_PATH}/`) {
      writeJson(res, 200, { ok: true, endpoints: [`${ROUTE_PATH}/data`, `${ROUTE_PATH}/entry`] }, headOnly)
      return
    }
    if (url.pathname === `${ROUTE_PATH}/entry`) {
      const name = params.get('name') ?? ''
      if (!isPackageName(name)) {
        writeJson(res, 400, { error: 'invalid package name' }, headOnly)
        return
      }
      try {
        const entry = await loadDetail(name, params.get('refresh') === '1')
        const installed = await installedBundles()
        writeJson(res, 200, { entry, installation: installationOf(name, entry.latest, installed) }, headOnly)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        writeJson(res, 502, { error: message }, headOnly)
      }
      return
    }
    if (url.pathname !== `${ROUTE_PATH}/data`) {
      writeJson(res, 404, { error: 'unknown market board path' }, headOnly)
      return
    }
    try {
      const snapshot = await load(params.get('refresh') === '1')
      const installed = await installedBundles()
      writeJson(
        res,
        200,
        presentMarket({
          items: snapshot.items,
          installed,
          text: params.get('query') ?? '',
          sort: params.get('sort') ?? 'newest',
          offset: readInteger(params, 'offset', 0, 0, 5000),
          limit: readInteger(params, 'limit', 24, 1, 60),
          updatedAt: snapshot.at,
          failures: snapshot.failures,
        }),
        headOnly,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      writeJson(res, 502, { error: message }, headOnly)
    }
  }

  ctx.effect(
    () => ctx.webServer.register({ kind: 'prefix', path: ROUTE_PATH, handler }),
    'dsh-market-board: data route',
  )
}
