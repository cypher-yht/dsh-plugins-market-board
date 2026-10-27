/**
 * Plugin market data source: reads the public npm search API, keeps the
 * DeepSeek Harness related packages, and presents them for the Web tab.
 *
 * This module is dependency free and side-effect free so it can be unit
 * tested outside the Harness process. Every function that reaches the network
 * accepts a `fetchImpl` injection point.
 *
 * @module dsh-market-board/market-source
 */

/** Default npm registry (supports CORS and the search endpoint). */
export const DEFAULT_REGISTRY = 'https://registry.npmjs.org/'

/**
 * Search queries whose union covers the community DSH package space.
 * Every query is a separate registry call, executed in parallel.
 */
export const DEFAULT_QUERIES = [
  'keywords:dsh-plugin',
  'keywords:deepseek-harness',
  'keywords:dsh',
  'text=dsh plugin',
]

/**
 * Package scopes whose members ship with the installation and are managed on
 * the Plugins page rather than discovered in a market. Their libraries and
 * client packages would otherwise dominate a downloads-sorted listing.
 */
export const DEFAULT_EXCLUDED_SCOPES = ['@deepseek-ai/']

/** Keywords that identify a package as Harness related on their own. */
const SIGNAL_KEYWORDS = new Set([
  'dsh',
  'dsh-plugin',
  'dsh-plugins',
  'deepseek-harness',
  'deepseek',
  'cordis',
])

/** Sort identifiers the Web tab offers. */
export const SORTS = ['newest', 'downloads', 'name']

/**
 * Read one registry search page.
 * @param {object} options - registry, query text, page size, timeout and fetch implementation.
 * @returns {Promise<object[]>} the raw `objects` array.
 */
export async function searchRegistry({
  registry = DEFAULT_REGISTRY,
  text,
  size = 250,
  timeoutMs = 20000,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('no fetch implementation available')
  const base = registry.endsWith('/') ? registry : `${registry}/`
  const endpoint = new URL('-/v1/search', base)
  endpoint.searchParams.set('text', String(text))
  endpoint.searchParams.set('size', String(size))
  const response = await fetchImpl(endpoint, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!response.ok) throw new Error(`registry responded ${response.status} ${response.statusText}`)
  const body = await response.json()
  return Array.isArray(body?.objects) ? body.objects : []
}

/**
 * Read a package author out of the search object.
 * @param {object} pkg - the `package` member of a search result.
 * @returns {string} "username" of the publisher, else the first maintainer.
 */
function authorOf(pkg) {
  const publisher = pkg?.publisher
  if (publisher && typeof publisher.username === 'string') return publisher.username
  const maintainer = Array.isArray(pkg?.maintainers) ? pkg.maintainers[0] : undefined
  return maintainer && typeof maintainer.username === 'string' ? maintainer.username : ''
}

/**
 * Collect the string members of a keyword list.
 * @param {unknown} value - candidate keyword array.
 * @returns {string[]} lowercase, de-duplicated keywords.
 */
function keywordsOf(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  for (const item of value) {
    if (typeof item !== 'string') continue
    const keyword = item.trim().toLowerCase()
    if (keyword !== '') seen.add(keyword)
  }
  return [...seen]
}

/**
 * Read a finite non-negative number.
 * @param {unknown} value - candidate number.
 * @returns {number} the number, else 0.
 */
function countOf(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

/**
 * Normalize one search result into the shape the tab consumes.
 * @param {object} object - one member of the registry's `objects` array.
 * @returns {object | null} the normalized item, or null when the entry has no name.
 */
export function normalizeSearchObject(object) {
  const pkg = object?.package
  if (!pkg || typeof pkg.name !== 'string' || pkg.name === '') return null
  const links = pkg.links ?? {}
  return {
    name: pkg.name,
    version: typeof pkg.version === 'string' ? pkg.version : '',
    description: typeof pkg.description === 'string' ? pkg.description : '',
    keywords: keywordsOf(pkg.keywords),
    author: authorOf(pkg),
    publishedAt: typeof pkg.date === 'string' ? pkg.date : '',
    weeklyDownloads: countOf(object?.downloads?.weekly),
    monthlyDownloads: countOf(object?.downloads?.monthly),
    homepage: typeof links.homepage === 'string' ? links.homepage : '',
    repository: typeof links.repository === 'string' ? links.repository : '',
    npmUrl: typeof links.npm === 'string' ? links.npm : '',
  }
}

/**
 * Decide whether a package belongs in a DeepSeek Harness plugin market.
 * @param {object} item - a normalized item.
 * @returns {boolean} whether the package is Harness related.
 */
export function isDshRelated(item) {
  const name = item.name.toLowerCase()
  if (name.includes('dsh') || name.includes('deepseek')) return true
  if (item.keywords.some((keyword) => SIGNAL_KEYWORDS.has(keyword))) return true
  const description = item.description.toLowerCase()
  return description.includes('deepseek harness') || description.includes('deepseek-harness') || /\bdsh\b/u.test(description)
}

/**
 * Read every configured query and merge the results by package name.
 * @param {object} options - registry, queries, page size, timeout and fetch implementation.
 * @returns {Promise<{ items: object[], failures: string[] }>} merged items and failures of individual queries.
 */
export async function collectMarket({
  registry = DEFAULT_REGISTRY,
  queries = DEFAULT_QUERIES,
  size = 250,
  timeoutMs = 20000,
  excludeScopes = DEFAULT_EXCLUDED_SCOPES,
  fetchImpl = globalThis.fetch,
} = {}) {
  const settled = await Promise.allSettled(
    queries.map((text) => searchRegistry({ registry, text, size, timeoutMs, fetchImpl })),
  )
  const byName = new Map()
  const failures = []
  for (const result of settled) {
    if (result.status === 'rejected') {
      failures.push(String(result.reason?.message ?? result.reason))
      continue
    }
    for (const object of result.value) {
      const item = normalizeSearchObject(object)
      if (item === null || byName.has(item.name)) continue
      if (excludeScopes.some((scope) => item.name.startsWith(scope))) continue
      if (!isDshRelated(item)) continue
      byName.set(item.name, item)
    }
  }
  if (byName.size === 0 && failures.length > 0) {
    throw new Error(`the plugin registry is unreachable (${failures[0]})`)
  }
  return { items: [...byName.values()].sort(compareNewest), failures }
}

/**
 * Compare two items newest first; undated entries sort last.
 * @param {object} a - first item.
 * @param {object} b - second item.
 * @returns {number} comparison result.
 */
export function compareNewest(a, b) {
  return timestampOf(b.publishedAt) - timestampOf(a.publishedAt) || a.name.localeCompare(b.name)
}

/**
 * Parse a publish date.
 * @param {string} value - ISO date.
 * @returns {number} epoch milliseconds, or 0.
 */
function timestampOf(value) {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

/**
 * Build the text a search query is matched against.
 * @param {object} item - a normalized item.
 * @returns {string} lowercase haystack.
 */
function haystackOf(item) {
  return `${item.name}\n${item.description}\n${item.keywords.join(' ')}\n${item.author}`.toLowerCase()
}

/**
 * Sort a copy of the items.
 * @param {object[]} items - items to order.
 * @param {string} sort - one of SORTS.
 * @returns {object[]} ordered items.
 */
export function sortMarket(items, sort) {
  const ordered = [...items]
  if (sort === 'downloads') {
    ordered.sort(
      (a, b) =>
        b.weeklyDownloads - a.weeklyDownloads ||
        b.monthlyDownloads - a.monthlyDownloads ||
        compareNewest(a, b),
    )
  } else if (sort === 'name') {
    ordered.sort((a, b) => a.name.localeCompare(b.name))
  } else {
    ordered.sort(compareNewest)
  }
  return ordered
}

/**
 * Filter, order and page the market.
 * @param {object[]} items - every known item.
 * @param {object} query - text, sort, offset and limit.
 * @returns {{ total: number, items: object[] }} the page and the number of matches.
 */
export function queryMarket(items, query = {}) {
  const text = typeof query.text === 'string' ? query.text.trim().toLowerCase() : ''
  const matched = text === '' ? items : items.filter((item) => haystackOf(item).includes(text))
  const sort = SORTS.includes(query.sort) ? query.sort : 'newest'
  const ordered = sortMarket(matched, sort)
  const offset = Number.isInteger(query.offset) && query.offset > 0 ? query.offset : 0
  const limit = Number.isInteger(query.limit) ? Math.min(60, Math.max(1, query.limit)) : 24
  return { total: matched.length, items: ordered.slice(offset, offset + limit) }
}

/**
 * Decide the installation state of one market entry.
 * @param {string} name - package name.
 * @param {string} version - the version the market would install.
 * @param {Map<string, { version?: string, provided?: boolean }>} installed - known profile bundles.
 * @returns {{ status: string, installedVersion?: string }} the state and the installed version.
 */
export function installationOf(name, version, installed) {
  const known = installed instanceof Map ? installed.get(name) : undefined
  if (known === undefined) return { status: 'available' }
  if (known.provided === true) return { status: 'provided', installedVersion: known.version }
  if (known.version !== undefined && known.version === version) {
    return { status: 'installed', installedVersion: known.version }
  }
  return { status: 'update', installedVersion: known.version }
}

/**
 * Present one page of the market for the browser.
 * @param {object} options - items, installed bundles, query, updated time and failure notes.
 * @returns {object} the JSON payload the Web tab renders.
 */
export function presentMarket({
  items,
  installed = new Map(),
  text = '',
  sort = 'newest',
  offset = 0,
  limit = 24,
  updatedAt = 0,
  failures = [],
} = {}) {
  const page = queryMarket(items, { text, sort, offset, limit })
  return {
    updatedAt,
    total: page.total,
    offset,
    limit,
    failures,
    items: page.items.map((item) => ({
      ...item,
      ...installationOf(item.name, item.version, installed),
    })),
  }
}

/** How many published versions one detail page lists. */
export const DETAIL_VERSION_LIMIT = 40

/** npm package names this market accepts: optional scope, then a name. */
const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/iu

/**
 * Decide whether a string is a readable npm package name.
 * @param {unknown} value - candidate name.
 * @returns {boolean} whether the name is safe to append to a registry URL.
 */
export function isPackageName(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 214 && PACKAGE_NAME.test(value)
}

/**
 * Read a package's full registry document into the shape the detail page shows.
 * @param {object} packument - the registry's package document.
 * @param {string} fallbackName - name to report when the document omits it.
 * @returns {object | null} the detail record, or null when the document is unusable.
 */
export function readPackageDetail(packument, fallbackName = '') {
  if (!packument || typeof packument !== 'object' || Array.isArray(packument)) return null
  const name = typeof packument.name === 'string' && packument.name !== '' ? packument.name : fallbackName
  if (name === '') return null
  const time = packument.time !== null && typeof packument.time === 'object' ? packument.time : {}
  const versions = packument.versions !== null && typeof packument.versions === 'object' ? packument.versions : {}
  const published = []
  for (const version of Object.keys(versions)) {
    const manifest = versions[version]
    published.push({
      version,
      publishedAt: typeof time[version] === 'string' ? time[version] : '',
      ...(manifest && typeof manifest.deprecated === 'string' ? { deprecated: true } : {}),
    })
  }
  published.sort((a, b) => timestampOf(b.publishedAt) - timestampOf(a.publishedAt) || b.version.localeCompare(a.version))
  const latest = typeof packument['dist-tags']?.latest === 'string' ? packument['dist-tags'].latest : published[0]?.version
  const repository =
    typeof packument.repository === 'string'
      ? packument.repository
      : typeof packument.repository?.url === 'string'
        ? packument.repository.url
        : ''
  const maintainers = Array.isArray(packument.maintainers)
    ? packument.maintainers
        .map((maintainer) => (maintainer && typeof maintainer.name === 'string' ? maintainer.name : ''))
        .filter((maintainer) => maintainer !== '')
    : []
  return {
    name,
    description: typeof packument.description === 'string' ? packument.description : '',
    license: typeof packument.license === 'string' ? packument.license : '',
    homepage: typeof packument.homepage === 'string' ? packument.homepage : '',
    repository,
    keywords: keywordsOf(packument.keywords),
    maintainers,
    latest: typeof latest === 'string' ? latest : '',
    totalVersions: published.length,
    versions: published.slice(0, DETAIL_VERSION_LIMIT),
    createdAt: typeof time.created === 'string' ? time.created : '',
    updatedAt: typeof time.modified === 'string' ? time.modified : '',
  }
}
