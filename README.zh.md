# dsh-better-at

> 为 DeepSeek Harness Web 输入框 `@` 功能提供快速引用加速。

[![DSH Plugin](https://img.shields.io/badge/DSH-Plugin-1f6feb?style=flat-square)](https://github.com/Ruiming-cn/dsh-better-at)
[![Awesome DSH Plugin](https://img.shields.io/badge/Awesome-DSH_Plugin-ff69b4?style=flat-square)](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Release](https://img.shields.io/github/v/release/Ruiming-cn/dsh-better-at?style=flat-square)](https://github.com/Ruiming-cn/dsh-better-at/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

`dsh-better-at` 保留 DSH 原生 `@` 引用行为——分层的工作区文件/文件夹引用与 DSH 会话引用——同时消除每次按键都请求 Host 的瓶颈。

## 特性

- ⚡ **首屏快速**：会话作用域创建时自动预热工作区文件索引与 DSH 会话索引，首次输入 `@` 时通常已在内存中。
- ⚡ **本地打字过滤**：首次加载后，输入过滤与排名全部在浏览器本地完成，不再每个按键请求 Host。
- 📁 **分层文件/文件夹引用**：空查询或路径查询显示直接子级；裸关键词模糊搜索全工作区 basename。
- 🎛️ **与原生一致的候选行**：文件/文件夹图标、文件夹行可用 Tab 逐级进入、嵌套条目显示父目录、会话行显示工作目录与相对时间。
- 💬 **DSH 会话引用**：本地缓存完整会话元数据，并按工作目录亲和度排序，保持原生排序习惯。
- 🔒 **原生 mention 兼容**：包装原生 `reference` source，但保留其 `onPick`/`codec`，文件与会话 mention 的序列化形式不变（`@path`、`@"path"`、`@[label](dsh-session:...)`）。
- 🧩 **不改 Harness 源码**：全部以 out-of-tree Host Remote + 浏览器 client bundle 实现。

## 工作原理

```
DSH Web @ 菜单
      │  candidates() · 本地过滤/排名
      ▼
dsh-better-at 客户端缓存
      │  listFiles / listSessions（每个 TTL 一次）
      ▼
DSH Host betterAt Remote
      ├── 有界工作区文件/目录索引
      └── 完整 DSH 会话索引 + 规范 mention
```

- `betterAt/listFiles` 对当前工作区做一次有界遍历，返回文件/目录索引。默认仅忽略 `.git` 与 `node_modules`，与原生文件引用行为一致。
- `betterAt/listSessions` 通过 `ctx.sessionQuery` 读取完整逻辑会话语料，并为浏览器生成原生 `dsh-session:` mention。
- 文件索引按会话缓存 30 秒；会话索引全局缓存 5 分钟。均使用 stale-while-revalidate：过期时立即返回旧快照，并在后台刷新。
- 浏览器包装原生 `@` source（`trigger='@'`、`name='reference'`），不替换其 pick/codec 路径。
- 每份索引快照只预处理一次：basename、小写名、隐藏标记与父目录在快照到达时算好；排序只保留最优的若干行，不再对全部命中排序。
- Host 端是严格的 Typert 贡献：`lib/typert.host.js` 提供 Gateway 校验用的描述符，浏览器挂载同一份 `lib/typert.remote-client.js`。

## 环境要求

- DeepSeek Harness（DSH）Web 0.2.2-rc.5 或更新版本，且具备原生 `@` 引用 source。
- 本地开发/构建需要 Node.js ≥ 22。

## 安装

从预构建的 Release 包安装（无需构建）：

```powershell
dsh plugin --profile web add https://github.com/Ruiming-cn/dsh-better-at/releases/download/v0.2.1/dsh-better-at-0.2.1.tgz
```

从 GitHub 源码安装（`lib/` 已提交，安装时不触发构建）：

```powershell
dsh plugin --profile web add github:Ruiming-cn/dsh-better-at
```

从本地仓库安装：

```powershell
dsh plugin --profile web add .
```

安装后重启 `dsh web`。

## 使用方式

与平时一样使用 `@`：

- `@` 打开快速文件/文件夹 + 会话选择器。
- `@src/` 浏览 `src/` 目录内部；在文件夹行按 Tab 是进入而不是插入。
- `@README` 按 basename 模糊搜索文件。
- `@refactor` 按会话 id、工作目录或标题过滤 DSH 会话。

选择后的原生 Composer 行为保持不变：文件会成为原子文件引用（目录则保持可编辑路径），DSH 会话会成为原生会话引用。

## 配置

Host 插件通过 profile patch 支持两个配置项：

```yaml
# ~/.dsh/profiles/web/cordis.patch.yml
- id: dsh-better-at
  config:
    maxEntries: 10000
    ignoreDirs:
      - .git
      - node_modules
```

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `maxEntries` | `10000` | 工作区索引条目的硬上限；超限时索引会报告截断。 |
| `ignoreDirs` | `['.git', 'node_modules']` | 永不索引或遍历的目录 basename。 |

## 性能说明

- 会话预热完成后，首次 `@` 通常直接由内存提供候选。
- 每次按键只对预处理过的行打分：快照到达时已算好小写 basename、隐藏标记与父目录，打字过程中不再重复拆分或转小写路径；排序只保留最优的若干行。
- 浏览器 bundle 不携带通用校验库，两个 wire 形状由手写边界解析器校验。
- 主要代价是较小的新鲜度窗口：文件变化最多 30 秒后出现；会话元数据最多 5 分钟。后台刷新会保留旧快照并持续更新。

## 兼容性说明

- 已在 DeepSeek Harness 0.2.2-rc.5 上验证。Host 贡献使用 0.2.x 的严格 Typert codec 形式（`create()` 工厂）；仍期待 0.1.x `schema` 字段的旧版 Harness 不会注册该 Remote，此时插件回退到原生 `candidates` 路径。
- 浏览器集成使用与 `dsh-skill-fuzzy` 相同的 `inputTriggers.live.sources` 私有包装模式。若未来 Harness 改变内部结构，插件在 Remote 不可用时会自动降级到原生 `candidates` 路径。
- 符号链接不会被索引或遍历，与原生文件引用搜索行为一致。
- 当前会话已从 DSH 会话候选中排除，避免原生 session-reference 协议拒绝的自引用。

## 开发

```powershell
npm install
npm run check
```

- `npm run typecheck` — 针对已安装 DSH 包类型的 TypeScript 严格类型检查。
- `npm run test` — 纯函数单元测试（Node test runner），含「已提交 Typert 产物与 `src/contract.ts` 一致」的守卫。
- `npm run build` — 构建 `lib/index.js`（Host ESM）、`lib/client.js`（单文件浏览器 bundle）、`lib/typert.host.js` + `lib/typert.remote-client.js`（Typert 清单）和 `.d.ts` 声明。

`lib/` 构建产物已提交，profile 安装无需再次构建。

## License

[MIT](LICENSE)
