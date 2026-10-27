window.__ModuleLoader__.load({
  id: 'dsh-market-board',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Locale namespace of this plugin. */
    const NS = 'marketBoard'
    /** JSON endpoint served by this package's Host half. */
    const ENDPOINT = '/plugin-market-board/data'
    /** JSON endpoint serving one package's registry detail. */
    const ENTRY_ENDPOINT = '/plugin-market-board/entry'
    /** Entries requested per page. */
    const PAGE_SIZE = 24

    /** Simplified Chinese copy (key-set source of truth). */
    const zh = {
      title: '插件市场',
      searchPlaceholder: '搜索插件名称、描述或关键词',
      sortNewest: '最新',
      sortDownloads: '热门',
      sortName: '名称',
      refresh: '刷新',
      retry: '重试',
      loading: '正在读取插件市场…',
      updating: '正在更新…',
      errorTitle: '插件市场读取失败',
      emptyTitle: '没有找到匹配的插件',
      emptyDescription: '换个关键词试试，或者点击刷新重新读取插件源。',
      countPrefix: '共',
      countSuffix: '个插件',
      updatedLabel: '更新于',
      install: '安装',
      view: '查看',
      installed: '已安装',
      updateAvailable: '可更新',
      provided: '内置提供',
      more: '加载更多',
      loadMoreBusy: '正在加载…',
      weeklyDownloads: '周下载',
      homepage: '主页',
      repository: '源码',
      npm: 'npm',
      noDescription: '暂无描述',
      failureNote: '部分插件源读取失败，列表可能不完整。',
      sourceHint: '插件来自 npm 公共注册表，第三方内容仅供参考；安装前请确认来源可信。',
      sortLabel: '排序',
      back: '返回列表',
      details: '插件详情',
      versions: '版本历史',
      versionsCountSuffix: '个版本',
      latestTag: '最新',
      license: '许可证',
      monthlyDownloads: '月下载',
      publishedAt: '发布时间',
      updatedAtLabel: '最后更新',
      maintainers: '维护者',
      keywordsLabel: '关键词',
      detailLoading: '正在读取插件详情…',
      detailError: '插件详情读取失败',
      noVersions: '注册表没有返回版本信息。',
      openDetails: '查看详情',
    }

    /** English copy, complete against the Chinese key set. */
    const en = {
      title: 'Market',
      searchPlaceholder: 'Search plugin name, description, or keyword',
      sortNewest: 'Newest',
      sortDownloads: 'Popular',
      sortName: 'Name',
      refresh: 'Refresh',
      retry: 'Retry',
      loading: 'Reading the plugin market…',
      updating: 'Updating…',
      errorTitle: 'The plugin market could not be read',
      emptyTitle: 'No matching plugin',
      emptyDescription: 'Try another keyword, or refresh to read the plugin sources again.',
      countPrefix: '',
      countSuffix: 'plugins',
      updatedLabel: 'Updated',
      install: 'Install',
      view: 'Open',
      installed: 'Installed',
      updateAvailable: 'Update available',
      provided: 'Provided by DSH',
      more: 'Load more',
      loadMoreBusy: 'Loading…',
      weeklyDownloads: 'weekly',
      homepage: 'Homepage',
      repository: 'Source',
      npm: 'npm',
      noDescription: 'No description',
      failureNote: 'Some plugin sources could not be read; the list may be incomplete.',
      sourceHint: 'Plugins come from the public npm registry; third-party content is advisory. Check a source before installing it.',
      sortLabel: 'Sort',
      back: 'Back',
      details: 'Plugin details',
      versions: 'Version history',
      versionsCountSuffix: 'versions',
      latestTag: 'Latest',
      license: 'License',
      monthlyDownloads: 'monthly',
      publishedAt: 'Published',
      updatedAtLabel: 'Last update',
      maintainers: 'Maintainers',
      keywordsLabel: 'Keywords',
      detailLoading: 'Reading plugin details…',
      detailError: 'Plugin details could not be read',
      noVersions: 'The registry returned no version information.',
      openDetails: 'View details',
    }

    const CSS = [
      '.dsmb-root{display:flex;flex-direction:column;gap:14px;padding:4px 0 24px}',
      '.dsmb-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.dsmb-search{flex:1 1 220px;min-width:160px;position:relative;display:flex}',
      '.dsmb-input{width:100%;box-sizing:border-box;height:32px;padding:0 10px;border-radius:9px;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;outline:none}',
      '.dsmb-input::placeholder{color:var(--dsw-alias-label-secondary)}',
      '.dsmb-input:focus{border-color:var(--dsw-alias-brand-primary)}',
      '.dsmb-seg{display:inline-flex;align-items:center;gap:2px;padding:2px;border-radius:9px;background:var(--dsw-alias-bg-layer-2)}',
      '.dsmb-segButton{height:28px;padding:0 10px;border:none;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer}',
      '.dsmb-segButton:hover{color:var(--dsw-alias-label-primary)}',
      '.dsmb-segOn,.dsmb-segOn:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 1px 2px rgba(0,0,0,.08)}',
      '.dsmb-iconButton{height:28px;min-width:28px;padding:0 8px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer}',
      '.dsmb-iconButton:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08));color:var(--dsw-alias-label-primary)}',
      '.dsmb-iconButton:disabled{opacity:.55;cursor:default}',
      '.dsmb-statusLine{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.dsmb-list{display:flex;flex-direction:column;gap:2px;margin:0;padding:0;list-style:none}',
      '.dsmb-card{display:flex;align-items:flex-start;gap:12px;padding:10px 8px;margin:0 -8px;border-radius:12px}',
      '.dsmb-card:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08))}',
      '.dsmb-avatar{flex:none;width:40px;height:40px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;background:var(--dsw-alias-brand-primary);color:#fff;font-size:16px;font-weight:600;line-height:1}',
      '.dsmb-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}',
      '.dsmb-titleRow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}',
      '.dsmb-name{margin:0;font-size:13.5px;font-weight:600;line-height:20px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}',
      '.dsmb-version{font-size:11.5px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.dsmb-badge{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:6px;font-size:11px;line-height:18px;white-space:nowrap}',
      '.dsmb-badgeInstalled{background:var(--dsw-alias-fill-tsp-secondary,rgba(127,127,127,.12));color:var(--dsw-alias-state-success-primary)}',
      '.dsmb-badgeUpdate{background:var(--dsw-alias-fill-tsp-secondary,rgba(127,127,127,.12));color:var(--dsw-alias-state-warn-primary)}',
      '.dsmb-badgeProvided{background:var(--dsw-alias-fill-tsp-secondary,rgba(127,127,127,.12));color:var(--dsw-alias-label-secondary)}',
      '.dsmb-desc{margin:0;font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}',
      '.dsmb-tags{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:2px}',
      '.dsmb-tag{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:6px;background:var(--dsw-alias-fill-tsp-secondary,rgba(127,127,127,.1));color:var(--dsw-alias-label-secondary);font-size:11px;line-height:18px}',
      '.dsmb-facts{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:2px;font-size:11.5px;line-height:18px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}',
      '.dsmb-fact{display:inline-flex;align-items:center;gap:4px}',
      '.dsmb-link{color:inherit;text-decoration:none}',
      '.dsmb-link:hover{text-decoration:underline}',
      '.dsmb-actions{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:6px;padding-top:2px}',
      '.dsmb-button{height:28px;padding:0 12px;border-radius:8px;font:inherit;font-size:12.5px;cursor:pointer;white-space:nowrap}',
      '.dsmb-buttonPrimary{border:none;background:var(--dsw-alias-brand-primary);color:#fff}',
      '.dsmb-buttonPrimary:hover{filter:brightness(1.06)}',
      '.dsmb-buttonGhost{border:.5px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary)}',
      '.dsmb-buttonGhost:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08));color:var(--dsw-alias-label-primary)}',
      '.dsmb-button:disabled{opacity:.55;cursor:default}',
      '.dsmb-errorBox{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0;padding:10px 12px;border-radius:10px;background:var(--dsw-alias-fill-tsp-secondary,rgba(127,127,127,.08))}',
      '.dsmb-errorText{margin:0;font-size:12.5px;line-height:18px;color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere}',
      '.dsmb-note{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-state-warn-primary)}',
      '.dsmb-muted{margin:0;font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.dsmb-empty{display:flex;flex-direction:column;align-items:center;gap:6px;padding:36px 16px;text-align:center}',
      '.dsmb-emptyTitle{margin:0;font-size:14px;font-weight:600;line-height:22px;color:var(--dsw-alias-label-primary)}',
      '.dsmb-skeleton{display:flex;align-items:flex-start;gap:12px;padding:10px 8px;margin:0 -8px}',
      '.dsmb-skeletonAvatar{flex:none;width:40px;height:40px;border-radius:10px;background:var(--dsw-alias-fill-tsp-secondary,rgba(127,127,127,.12))}',
      '.dsmb-skeletonBody{flex:1;display:flex;flex-direction:column;gap:6px;padding-top:2px}',
      '.dsmb-skeletonLine{height:12px;border-radius:6px;background:var(--dsw-alias-fill-tsp-secondary,rgba(127,127,127,.12))}',
      '.dsmb-footer{display:flex;align-items:center;justify-content:center;gap:10px}',
      '.dsmb-hint{margin:0;font-size:11.5px;line-height:18px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}',
      '.dsmb-cardOpen{display:flex;align-items:flex-start;gap:12px;flex:1;min-width:0;padding:0;border:none;border-radius:10px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}',
      '.dsmb-cardOpen:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
      '.dsmb-back{align-self:flex-start;display:inline-flex;align-items:center;height:28px;padding:0 8px 0 4px;margin-left:-4px;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer}',
      '.dsmb-back:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08));color:var(--dsw-alias-label-primary)}',
      '.dsmb-detail{display:flex;flex-direction:column;gap:12px}',
      '.dsmb-detailHead{display:flex;align-items:flex-start;gap:12px}',
      '.dsmb-detailTitle{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}',
      '.dsmb-detailName{margin:0;font-size:16px;font-weight:600;line-height:24px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}',
      '.dsmb-detailDesc{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;white-space:pre-wrap}',
      '.dsmb-factGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px 16px;padding:10px 12px;border:.5px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}',
      '.dsmb-factItem{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.dsmb-factLabel{font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}',
      '.dsmb-factValue{font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}',
      '.dsmb-sectionTitle{margin:4px 0 0;font-size:12.5px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-primary)}',
      '.dsmb-versionList{display:flex;flex-direction:column;gap:2px;margin:0;padding:0;list-style:none}',
      '.dsmb-versionRow{display:flex;align-items:center;gap:10px;padding:5px 8px;margin:0 -8px;border-radius:8px}',
      '.dsmb-versionRow:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08))}',
      '.dsmb-versionName{font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}',
      '.dsmb-versionDate{flex:1;min-width:0;font-size:11.5px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.dsmb-skeletonDetail{height:14px;border-radius:7px;background:var(--dsw-alias-fill-tsp-secondary,rgba(127,127,127,.12))}',
      '@media (prefers-reduced-motion:no-preference){.dsmb-skeletonLine,.dsmb-skeletonAvatar{animation:dsmb-pulse 1.4s ease-in-out infinite}@keyframes dsmb-pulse{0%,100%{opacity:.55}50%{opacity:.9}}}',
    ].join('\n')

    /**
     * Read one JSON document from this package's Host half.
     * @param {URL} url - endpoint URL.
     * @param {AbortSignal} [signal] - aborts the request.
     * @returns {Promise<object>} the JSON payload.
     */
    async function requestJson(url, signal) {
      const response = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
        ...(signal === undefined ? {} : { signal }),
      })
      const text = await response.text()
      let payload
      try {
        payload = JSON.parse(text)
      } catch {
        throw new Error(response.ok ? 'the market service answered with an unexpected body' : `HTTP ${response.status}`)
      }
      if (!response.ok) throw new Error(payload && payload.error ? String(payload.error) : `HTTP ${response.status}`)
      return payload
    }

    /**
     * Read one market page from this package's Host endpoint.
     * @param {object} request - query, sort, offset, limit and refresh flag.
     * @param {AbortSignal} [signal] - aborts the request.
     * @returns {Promise<object>} the JSON payload.
     */
    async function readMarket(request, signal) {
      const url = new URL(ENDPOINT, window.location.origin)
      url.searchParams.set('sort', request.sort)
      url.searchParams.set('offset', String(request.offset))
      url.searchParams.set('limit', String(request.limit))
      if (request.query !== '') url.searchParams.set('query', request.query)
      if (request.refresh === true) url.searchParams.set('refresh', '1')
      return requestJson(url, signal)
    }

    /**
     * Read one package's registry detail.
     * @param {string} name - package name.
     * @param {AbortSignal} [signal] - aborts the request.
     * @returns {Promise<object>} `{ entry, installation }`.
     */
    async function readEntry(name, signal) {
      const url = new URL(ENTRY_ENDPOINT, window.location.origin)
      url.searchParams.set('name', name)
      return requestJson(url, signal)
    }

    /**
     * Read an error message from a thrown value.
     * @param {unknown} error - thrown value.
     * @returns {string} the message.
     */
    function messageOf(error) {
      return error instanceof Error ? error.message : String(error)
    }

    /**
     * Format a download count compactly.
     * @param {number} value - download count.
     * @returns {string} compact text.
     */
    function formatCount(value) {
      if (!Number.isFinite(value) || value <= 0) return '0'
      if (value >= 1000000) return `${Math.round(value / 100000) / 10}M`
      if (value >= 10000) return `${Math.round(value / 1000)}k`
      if (value >= 1000) return `${Math.round(value / 100) / 10}k`
      return String(Math.round(value))
    }

    /**
     * Format a publish date in the browser language.
     * @param {string} value - ISO date.
     * @returns {string} short date text, or an empty string.
     */
    function formatDate(value) {
      const parsed = Date.parse(value)
      if (Number.isNaN(parsed)) return ''
      try {
        return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(parsed)
      } catch {
        return new Date(parsed).toISOString().slice(0, 10)
      }
    }

    /**
     * Format a clock time in the browser language.
     * @param {number} value - epoch milliseconds.
     * @returns {string} time text, or an empty string.
     */
    function formatTime(value) {
      if (!Number.isFinite(value) || value <= 0) return ''
      try {
        return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(value)
      } catch {
        return ''
      }
    }

    /**
     * Pick the letter shown on a card avatar.
     * @param {string} name - package name.
     * @returns {string} one uppercase character.
     */
    function initialOf(name) {
      const cleaned = name.replace(/^@[^/]+\//u, '').replace(/^dsh[-_]?/u, '')
      const first = (cleaned.match(/[a-z0-9]/iu) ?? ['p'])[0]
      return first.toUpperCase()
    }

    /**
     * The tags worth showing for one entry.
     * @param {object} item - market entry.
     * @returns {string[]} up to three short keywords.
     */
    function tagsOf(item) {
      return (item.keywords ?? []).filter((keyword) => keyword.length <= 18).slice(0, 3)
    }

    /**
     * Build the installation badges of one market entry.
     * @param {object} item - market entry carrying `status` and `installedVersion`.
     * @param {Function} t - translator.
     * @returns {object[]} badge elements.
     */
    function badgesOf(item, t) {
      const badges = []
      if (item.status === 'installed') {
        badges.push(h('span', { key: 'installed', className: 'dsmb-badge dsmb-badgeInstalled' }, t('installed')))
      } else if (item.status === 'update') {
        const text = item.installedVersion === undefined ? t('updateAvailable') : `${t('updateAvailable')} v${item.installedVersion}`
        badges.push(h('span', { key: 'update', className: 'dsmb-badge dsmb-badgeUpdate' }, text))
      } else if (item.status === 'provided') {
        badges.push(h('span', { key: 'provided', className: 'dsmb-badge dsmb-badgeProvided' }, t('provided')))
      }
      return badges
    }

    /**
     * Build the outbound links of one market entry.
     * @param {object} item - market entry or registry detail.
     * @param {Function} t - translator.
     * @returns {object[]} anchor elements.
     */
    function linksOf(item, t) {
      const links = []
      if (item.homepage !== '') {
        links.push(
          h(
            'a',
            { key: 'home', className: 'dsmb-fact dsmb-link', href: item.homepage, target: '_blank', rel: 'noreferrer noopener' },
            t('homepage'),
          ),
        )
      }
      if (item.repository !== '' && item.repository !== item.homepage) {
        links.push(
          h(
            'a',
            { key: 'repo', className: 'dsmb-fact dsmb-link', href: item.repository, target: '_blank', rel: 'noreferrer noopener' },
            t('repository'),
          ),
        )
      }
      if (item.npmUrl !== undefined && item.npmUrl !== '') {
        links.push(
          h(
            'a',
            { key: 'npm', className: 'dsmb-fact dsmb-link', href: item.npmUrl, target: '_blank', rel: 'noreferrer noopener' },
            t('npm'),
          ),
        )
      }
      return links
    }

    /**
     * One market row: identity, description, facts, and its one action.
     * The openable body shows the plugin's detail page.
     * @param {object} props - item, translator, and open/install/view callbacks.
     * @returns {object} the row element.
     */
    function MarketRow({ item, t, onOpen, onInstall, onView }) {
      const tags = tagsOf(item)
      const facts = []
      const published = formatDate(item.publishedAt)
      if (published !== '') facts.push(h('span', { key: 'date', className: 'dsmb-fact' }, published))
      if (item.weeklyDownloads > 0) {
        facts.push(
          h(
            'span',
            { key: 'downloads', className: 'dsmb-fact' },
            `↓ ${formatCount(item.weeklyDownloads)} ${t('weeklyDownloads')}`,
          ),
        )
      }
      if (item.author !== '') facts.push(h('span', { key: 'author', className: 'dsmb-fact' }, `@${item.author}`))
      const badges = badgesOf(item, t)
      const links = linksOf(item, t)

      const action =
        item.status === 'available'
          ? h(
              'button',
              { type: 'button', className: 'dsmb-button dsmb-buttonPrimary', onClick: () => onInstall(item) },
              t('install'),
            )
          : h(
              'button',
              { type: 'button', className: 'dsmb-button dsmb-buttonGhost', onClick: () => onView(item) },
              t('view'),
            )

      return h(
        'li',
        { className: 'dsmb-card' },
        h(
          'div',
          {
            className: 'dsmb-cardOpen',
            role: 'button',
            tabIndex: 0,
            'aria-label': `${item.name} — ${t('openDetails')}`,
            onClick: () => onOpen(item),
            onKeyDown: (event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              onOpen(item)
            },
          },
          h('span', { className: 'dsmb-avatar', 'aria-hidden': true }, initialOf(item.name)),
          h(
            'div',
            { className: 'dsmb-main' },
            h(
              'div',
              { className: 'dsmb-titleRow' },
              h('p', { className: 'dsmb-name' }, item.name),
              item.version === '' ? null : h('span', { className: 'dsmb-version' }, `v${item.version}`),
              ...badges,
            ),
            h('p', { className: 'dsmb-desc' }, item.description === '' ? t('noDescription') : item.description),
            tags.length === 0 ? null : h('div', { className: 'dsmb-tags' }, ...tags.map((tag) => h('span', { key: tag, className: 'dsmb-tag' }, tag))),
            facts.length === 0 && links.length === 0 ? null : h('div', { className: 'dsmb-facts' }, ...facts, ...links),
          ),
        ),
        h('div', { className: 'dsmb-actions' }, action),
      )
    }

    /**
     * One fact cell of the detail page.
     * @param {object} props - label and value of the cell.
     * @returns {object} the cell element.
     */
    function Fact({ label, value }) {
      return h(
        'div',
        { className: 'dsmb-factItem' },
        h('span', { className: 'dsmb-factLabel' }, label),
        h('span', { className: 'dsmb-factValue' }, value),
      )
    }

    /**
     * Render one plugin's detail page: full description, registry facts, and
     * the published version history with per-version install actions.
     * @param {object} props - item, translator, detail state, and callbacks.
     * @returns {object} the detail element tree.
     */
    function DetailView({ item, t, detail, onBack, onInstall, onView, onRetry }) {
      const entry = detail.entry
      const latest = entry !== null && entry.latest !== '' ? entry.latest : item.version
      const installation =
        detail.installation === null
          ? { status: item.status, ...(item.installedVersion === undefined ? {} : { installedVersion: item.installedVersion }) }
          : detail.installation
      const merged = { ...item, ...installation }
      const badges = badgesOf(merged, t)
      const links = linksOf(
        {
          homepage: (entry !== null && entry.homepage) || item.homepage,
          repository: (entry !== null && entry.repository) || item.repository,
          npmUrl: item.npmUrl === undefined ? `https://www.npmjs.com/package/${item.name}` : item.npmUrl,
        },
        t,
      )
      const description = (entry !== null && entry.description) || item.description
      const versions = entry !== null && Array.isArray(entry.versions) ? entry.versions : []
      const keywords = entry !== null && Array.isArray(entry.keywords) && entry.keywords.length > 0 ? entry.keywords : item.keywords ?? []
      const publishedOfLatest = versions.find((version) => version.version === latest)?.publishedAt ?? item.publishedAt

      const facts = [
        h(Fact, { key: 'version', label: t('versionLabel'), value: latest === '' ? '—' : `v${latest}` }),
        h(Fact, {
          key: 'author',
          label: t('maintainers'),
          value: entry !== null && entry.maintainers.length > 0 ? entry.maintainers.join(', ') : item.author === '' ? '—' : `@${item.author}`,
        }),
        h(Fact, { key: 'published', label: t('publishedAt'), value: formatDate(publishedOfLatest) || '—' }),
        h(Fact, { key: 'weekly', label: t('weeklyDownloads'), value: formatCount(item.weeklyDownloads) }),
        h(Fact, { key: 'monthly', label: t('monthlyDownloads'), value: formatCount(item.monthlyDownloads) }),
        h(Fact, { key: 'license', label: t('license'), value: (entry !== null && entry.license) || '—' }),
        h(Fact, { key: 'updated', label: t('updatedAtLabel'), value: (entry !== null && formatDate(entry.updatedAt)) || '—' }),
      ]

      const action =
        merged.status === 'available'
          ? h(
              'button',
              { type: 'button', className: 'dsmb-button dsmb-buttonPrimary', onClick: () => onInstall({ ...item, version: latest }) },
              t('install'),
            )
          : h(
              'button',
              { type: 'button', className: 'dsmb-button dsmb-buttonGhost', onClick: () => onView(item) },
              t('view'),
            )

      let versionsBody
      if (detail.status === 'loading') {
        versionsBody = h(
          'div',
          { className: 'dsmb-versionList', 'aria-busy': true },
          [0, 1, 2].map((index) => h('div', { key: index, className: 'dsmb-skeletonDetail', style: { width: index === 0 ? '52%' : '38%' } })),
        )
      } else if (detail.status === 'error') {
        versionsBody = h(
          'div',
          { className: 'dsmb-errorBox', role: 'alert' },
          h('p', { className: 'dsmb-errorText' }, `${t('detailError')}：${detail.error ?? ''}`),
          h('button', { type: 'button', className: 'dsmb-button dsmb-buttonGhost', onClick: onRetry }, t('retry')),
        )
      } else if (versions.length === 0) {
        versionsBody = h('p', { className: 'dsmb-muted' }, t('noVersions'))
      } else {
        versionsBody = h(
          'ul',
          { className: 'dsmb-versionList' },
          ...versions.map((version) => {
            const versionBadges = []
            if (version.version === latest) {
              versionBadges.push(h('span', { key: 'latest', className: 'dsmb-badge dsmb-badgeInstalled' }, t('latestTag')))
            }
            if (installation.installedVersion === version.version) {
              versionBadges.push(h('span', { key: 'installed', className: 'dsmb-badge dsmb-badgeUpdate' }, t('installed')))
            }
            const installable = installation.status !== 'provided' && installation.installedVersion !== version.version
            return h(
              'li',
              { key: version.version, className: 'dsmb-versionRow' },
              h('span', { className: 'dsmb-versionName' }, `v${version.version}`),
              ...versionBadges,
              h('span', { className: 'dsmb-versionDate' }, formatDate(version.publishedAt)),
              installable
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsmb-button dsmb-buttonGhost',
                      onClick: () => onInstall({ ...item, version: version.version }),
                    },
                    t('install'),
                  )
                : null,
            )
          }),
        )
      }

      return h(
        'div',
        { className: 'dsmb-detail' },
        h('button', { type: 'button', className: 'dsmb-back', onClick: onBack }, `← ${t('back')}`),
        h(
          'div',
          { className: 'dsmb-detailHead' },
          h('span', { className: 'dsmb-avatar', 'aria-hidden': true }, initialOf(item.name)),
          h(
            'div',
            { className: 'dsmb-detailTitle' },
            h(
              'div',
              { className: 'dsmb-titleRow' },
              h('p', { className: 'dsmb-detailName' }, item.name),
              latest === '' ? null : h('span', { className: 'dsmb-version' }, `v${latest}`),
              ...badges,
            ),
            h(
              'p',
              { className: 'dsmb-muted' },
              entry === null ? t('details') : `${t('details')} · ${entry.totalVersions} ${t('versionsCountSuffix')}`,
            ),
          ),
          h('div', { className: 'dsmb-actions' }, action),
        ),
        h('p', { className: 'dsmb-detailDesc' }, description === '' ? t('noDescription') : description),
        h('div', { className: 'dsmb-factGrid' }, ...facts),
        keywords.length === 0
          ? null
          : h(
              'div',
              { className: 'dsmb-tags' },
              ...keywords.slice(0, 16).map((keyword) => h('span', { key: keyword, className: 'dsmb-tag' }, keyword)),
            ),
        links.length === 0 ? null : h('div', { className: 'dsmb-facts' }, ...links),
        h('p', { className: 'dsmb-sectionTitle' }, t('versions')),
        versionsBody,
      )
    }

    /**
     * Placeholder rows shown before the first page arrives.
     * @param {object} props - translator.
     * @returns {object[]} three skeleton rows.
     */
    function SkeletonRows({ t }) {
      return [0, 1, 2].map((index) =>
        h(
          'li',
          { key: index, className: 'dsmb-skeleton', 'aria-hidden': true },
          h('span', { className: 'dsmb-skeletonAvatar' }),
          h(
            'span',
            { className: 'dsmb-skeletonBody' },
            h('span', { className: 'dsmb-skeletonLine', style: { width: '38%' } }),
            h('span', { className: 'dsmb-skeletonLine', style: { width: '72%' } }),
          ),
        ),
      )
    }

    /**
     * Render the Market tab of the Plugins page.
     * @param {object} props - slot props: translator and the page's install/open actions.
     * @returns {object} the tab element tree.
     */
    function MarketBoard(props) {
      const t = props.t
      const install = props.install
      const openPackage = props.openPackage
      const [query, setQuery] = React.useState('')
      const [settled, setSettled] = React.useState('')
      const [sort, setSort] = React.useState('newest')
      const [reloadKey, setReloadKey] = React.useState(0)
      const [moreBusy, setMoreBusy] = React.useState(false)
      const [state, setState] = React.useState({
        status: 'loading',
        items: [],
        total: 0,
        updatedAt: 0,
        failures: [],
        error: null,
      })
      const forceRef = React.useRef(false)
      const [selected, setSelected] = React.useState(null)
      const [detail, setDetail] = React.useState({ status: 'idle', entry: null, installation: null, error: null })
      const [detailKey, setDetailKey] = React.useState(0)

      React.useEffect(() => {
        const timer = window.setTimeout(() => setSettled(query.trim()), 250)
        return () => window.clearTimeout(timer)
      }, [query])

      React.useEffect(() => {
        const controller = new AbortController()
        let alive = true
        setState((previous) => ({
          ...previous,
          status: previous.items.length === 0 ? 'loading' : 'refreshing',
          error: null,
        }))
        readMarket(
          { query: settled, sort, offset: 0, limit: PAGE_SIZE, refresh: forceRef.current === true },
          controller.signal,
        )
          .then((payload) => {
            if (!alive) return
            setState({
              status: 'ready',
              items: Array.isArray(payload.items) ? payload.items : [],
              total: typeof payload.total === 'number' ? payload.total : 0,
              updatedAt: typeof payload.updatedAt === 'number' ? payload.updatedAt : 0,
              failures: Array.isArray(payload.failures) ? payload.failures : [],
              error: null,
            })
          })
          .catch((error) => {
            if (!alive || controller.signal.aborted) return
            setState((previous) => ({
              ...previous,
              status: previous.items.length === 0 ? 'error' : 'ready',
              error: messageOf(error),
            }))
          })
        forceRef.current = false
        return () => {
          alive = false
          controller.abort()
        }
      }, [settled, sort, reloadKey])

      React.useEffect(() => {
        if (selected === null) {
          setDetail({ status: 'idle', entry: null, installation: null, error: null })
          return undefined
        }
        const controller = new AbortController()
        let alive = true
        setDetail({ status: 'loading', entry: null, installation: null, error: null })
        readEntry(selected.name, controller.signal)
          .then((payload) => {
            if (!alive) return
            setDetail({
              status: 'ready',
              entry: payload.entry ?? null,
              installation: payload.installation ?? null,
              error: null,
            })
          })
          .catch((error) => {
            if (!alive || controller.signal.aborted) return
            setDetail({ status: 'error', entry: null, installation: null, error: messageOf(error) })
          })
        return () => {
          alive = false
          controller.abort()
        }
      }, [selected, detailKey])

      const onOpen = React.useCallback((item) => {
        setSelected(item)
      }, [])

      const onBack = React.useCallback(() => {
        setSelected(null)
      }, [])

      const retryDetail = React.useCallback(() => {
        setDetailKey((value) => value + 1)
      }, [])

      const refresh = React.useCallback(() => {
        forceRef.current = true
        setReloadKey((value) => value + 1)
      }, [])

      const loadMore = React.useCallback(() => {
        if (moreBusy || state.total <= state.items.length) return
        setMoreBusy(true)
        readMarket({ query: settled, sort, offset: state.items.length, limit: PAGE_SIZE })
          .then((payload) => {
            setState((previous) => ({
              ...previous,
              status: 'ready',
              items: [...previous.items, ...(Array.isArray(payload.items) ? payload.items : [])],
              total: typeof payload.total === 'number' ? payload.total : previous.total,
            }))
          })
          .catch(() => undefined)
          .finally(() => setMoreBusy(false))
      }, [moreBusy, settled, sort, state.items.length, state.total])

      const onInstall = React.useCallback(
        (item) => {
          if (typeof install !== 'function') return
          const spec = item.version === '' ? item.name : `${item.name}@${item.version}`
          install({
            spec,
            title: item.name,
            ...(item.version === '' ? {} : { version: item.version }),
          })
        },
        [install],
      )

      const onView = React.useCallback(
        (item) => {
          if (typeof openPackage === 'function') openPackage(item.name)
        },
        [openPackage],
      )

      if (selected !== null) {
        return h(
          'div',
          { className: 'dsmb-root', 'data-plugin-tab': 'market-board' },
          h(DetailView, { item: selected, t, detail, onBack, onInstall, onView, onRetry: retryDetail }),
        )
      }

      const sortButton = (id, label) =>
        h(
          'button',
          {
            key: id,
            type: 'button',
            className: id === sort ? 'dsmb-segButton dsmb-segOn' : 'dsmb-segButton',
            'aria-pressed': id === sort,
            onClick: () => setSort(id),
          },
          label,
        )

      const statusLine = () => {
        if (state.status === 'loading') return h('p', { className: 'dsmb-muted' }, t('loading'))
        if (state.status === 'refreshing') return h('p', { className: 'dsmb-muted' }, t('updating'))
        const updated = formatTime(state.updatedAt)
        return h(
          'div',
          { className: 'dsmb-statusLine' },
          h('span', null, `${t('countPrefix')} ${state.total} ${t('countSuffix')}`.trim()),
          updated === '' ? null : h('span', null, `· ${t('updatedLabel')} ${updated}`),
        )
      }

      let body
      if (state.status === 'loading') {
        body = h('ul', { className: 'dsmb-list', 'aria-busy': true }, h(SkeletonRows, { t }))
      } else if (state.status === 'error') {
        body = h(
          'div',
          { className: 'dsmb-errorBox', role: 'alert' },
          h('p', { className: 'dsmb-errorText' }, `${t('errorTitle')}：${state.error ?? ''}`),
          h('button', { type: 'button', className: 'dsmb-button dsmb-buttonGhost', onClick: refresh }, t('retry')),
        )
      } else if (state.items.length === 0) {
        body = h(
          'div',
          { className: 'dsmb-empty' },
          h('p', { className: 'dsmb-emptyTitle' }, t('emptyTitle')),
          h('p', { className: 'dsmb-muted' }, t('emptyDescription')),
          h('button', { type: 'button', className: 'dsmb-button dsmb-buttonGhost', onClick: refresh }, t('retry')),
        )
      } else {
        body = h(
          'ul',
          { className: 'dsmb-list' },
          ...state.items.map((item) => h(MarketRow, { key: item.name, item, t, onOpen, onInstall, onView })),
        )
      }

      const footer =
        state.status === 'ready' && state.items.length < state.total
          ? h(
              'div',
              { className: 'dsmb-footer' },
              h(
                'button',
                { type: 'button', className: 'dsmb-button dsmb-buttonGhost', onClick: loadMore, disabled: moreBusy },
                moreBusy ? t('loadMoreBusy') : t('more'),
              ),
            )
          : null

      return h(
        'div',
        { className: 'dsmb-root', 'data-plugin-tab': 'market-board' },
        h(
          'div',
          { className: 'dsmb-toolbar' },
          h(
            'div',
            { className: 'dsmb-search' },
            h('input', {
              className: 'dsmb-input',
              type: 'search',
              value: query,
              placeholder: t('searchPlaceholder'),
              'aria-label': t('searchPlaceholder'),
              onChange: (event) => setQuery(event.target.value),
            }),
          ),
          h(
            'div',
            { className: 'dsmb-seg', role: 'group', 'aria-label': t('sortLabel') },
            sortButton('newest', t('sortNewest')),
            sortButton('downloads', t('sortDownloads')),
            sortButton('name', t('sortName')),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsmb-iconButton',
              onClick: refresh,
              disabled: state.status === 'loading' || state.status === 'refreshing',
            },
            t('refresh'),
          ),
        ),
        statusLine(),
        state.failures !== undefined && state.failures.length > 0 && state.status === 'ready'
          ? h('p', { className: 'dsmb-note' }, t('failureNote'))
          : null,
        body,
        footer,
        h('p', { className: 'dsmb-hint' }, t('sourceHint')),
      )
    }

    /**
     * Register the Market tab and its dictionaries.
     * @param {object} ctx - browser plugin context.
     * @returns {void}
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-market-board: dictionaries')
      ctx.effect(() => {
        const tag = document.createElement('style')
        tag.dataset.plugin = 'dsh-market-board'
        tag.textContent = CSS
        document.head.append(tag)
        return () => {
          tag.remove()
        }
      }, 'dsh-market-board: styles')
      const t = ctx.locale.bind(NS)
      ctx.slots.inject('plugins.tab', () =>
        ctx.slots.register(
          {
            name: 'plugins.tab',
            id: 'market-board',
            order: 1,
            label: () => t('title'),
            locale: NS,
          },
          MarketBoard,
        ),
      )
    }

    return { inject: ['slots', 'locale'], apply }
  },
})
