# dsh-market-board · 插件市场

在 **插件（Plugins）** 页面新增一个 **插件市场** 标签页：浏览、搜索社区 DeepSeek Harness 插件，并一键安装到当前配置。

- 零配置：不需要先设置任何市场索引源，插件会自己读取公共 npm 注册表。
- 三种排序：**最新发布**、**热门**（周下载量）、**名称**；支持关键词搜索与分页加载。
- 安装状态：已安装、可更新、内置提供三种标记直接显示在卡片上。
- 点开看详情：点卡片（或按 Enter）进入详情页——完整描述、作者/维护者、许可证、发布与更新时间、下载量、全部关键词、主页/源码/npm 链接，以及**按发布时间倒序的版本历史**，每个版本都能直接安装指定版本。
- 一键安装：复用「插件」页面自带的安装对话框（确认、源信息、pnpm 进度、失败重试），不另造一套安装流程。

## 安装

```powershell
dsh plugin add github:cypher-yht/dsh-plugins-market-board
```

本地开发用软链：

```powershell
dsh plugin add link:D:\path\to\dsh-market-board
```

> 桌面客户端读 `desktop` profile，请让桌面端会话里的 `plugin_manager` 安装。

装完重启宿主，浏览器 `Ctrl+F5`。

## 使用

1. 在侧边栏打开 **插件（Plugins）**。
2. 切换到 **插件市场** 标签页（在 **已安装** 与 **Discover** 之后）。
3. 用搜索框找插件；点 **安装** 打开安装对话框，确认后开始安装。
4. 已安装的插件可以用 **查看** 直接跳转到它的详情页。
5. 点插件卡片的任意位置进入详情页；左上角 **返回列表** 回到原来的搜索/排序结果，版本历史里可以对任意版本点 **安装**。

首次打开需要从 npm 拉取并合并插件列表（通常 2–6 秒，之后缓存 10 分钟），期间显示骨架屏；工具栏的 **刷新** 会强制重新读取。

## 数据来源

Host 半通过 npm 搜索接口读取四组查询并合并去重：

| 查询 | 作用 |
|---|---|
| `keywords:dsh-plugin` | 显式声明自己是 DSH 插件的包 |
| `keywords:deepseek-harness` | 声明面向 DeepSeek Harness 的包 |
| `keywords:dsh` | DSH 生态相关包 |
| `text=dsh plugin` | 名称/描述里提到 dsh plugin 的包 |

随后按包名、关键词、描述判定是否与 DSH 相关。默认排除 `@deepseek-ai/` 作用域——这些包随安装包一起发布、由「插件」页面管理，放进市场只会淹没有效结果。

## 实现

| 文件 | 角色 |
|---|---|
| `index.js` | Host 半：合并/缓存 npm 数据，经 `pluginManager.listBundles()` 标注安装状态，在 Web 服务器上注册 `/plugin-market-board/data`（列表）与 `/plugin-market-board/entry`（单个插件的注册表详情 + 版本历史）两个 JSON 路由 |
| `market-source.js` | 无依赖的纯函数：搜索、归一化、过滤、排序、分页、安装状态判定、包名校验、注册表文档解析（可单测） |
| `client.js` | Client 半：注册 `plugins.tab` 的 `market-board` 标签页；渲染列表、详情页与版本历史，读取同源 JSON |
| `locale/*.json` | 插件在插件管理页显示的标题与描述 |
| `icon.svg` | 插件图标 |

浏览器不直接访问 npm：所有网络请求都在 Host 进程完成，页面只读同源 JSON 路由，因此不受跨域策略影响。安装动作走插件页面提供的 `install({ spec, title, version })`，与 Discover 等页面使用同一套安装流程。详情页的版本历史来自 npm 的完整 package 文档（每页最多列 40 个版本），并同样缓存 10 分钟。

## 配置（可选）

在 `cordis.patch.yml` 中给 `market-board` 行写 `config`：

```yaml
- insert:
    - id: market-board
      name: dsh-market-board
      config:
        registry: 'https://registry.npmjs.org/'
        cacheTtlMs: 600000
        timeoutMs: 20000
        includeOfficial: false
```

| 字段 | 默认值 | 说明 |
|---|---|---|
| `registry` | `https://registry.npmjs.org/` | npm 注册表地址，可用国内镜像 |
| `cacheTtlMs` | `600000` | 合并结果缓存时长（毫秒） |
| `timeoutMs` | `20000` | 单次搜索请求超时 |
| `queries` | 上表四组查询 | 自定义搜索查询数组 |
| `includeOfficial` | `false` | 是否把 `@deepseek-ai/` 作用域的包也列进市场 |

## 测试

```powershell
npm test
```

或直接跑：

```powershell
node --test test/client.test.mjs test/market-source.test.mjs test/host.test.mjs
```

共 32 项，全部通过。`market-source.test.mjs` 覆盖归一化、过滤、排序、分页、安装状态、包名校验与注册表文档解析；`host.test.mjs` 用假的 Cordis 上下文与假注册表验证两条路由、缓存、参数校验与 502 失败路径；`client.test.mjs` 验证客户端模块只依赖 React、双语字典完整、标签页注册与样式注入。

## 已知限制

- 市场条目来自 npm 搜索数据，第三方文本仅供参考；包是否真的带 bundle patch 要等安装前的检查。
- 更新状态是「装好版本 ≠ 市场默认版本」的直接比较，不做 SemVer 范围计算。
- 详情页的版本历史最多列 40 个版本（按发布时间倒序），更早的版本不显示。
- 换版本仍走「安装指定版本」的安装流程；已安装的版本不会再提供安装按钮，避免重复安装。
- 新发布/更新要等 npm 搜索索引更新后才会出现。

## 许可证

MIT，见 [LICENSE](LICENSE)。
