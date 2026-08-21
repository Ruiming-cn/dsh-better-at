# dsh-better-at

> 为 DeepSeek Harness Web 输入框 `@` 功能提供快速引用加速。

[![DSH Plugin](https://img.shields.io/badge/DSH-Plugin-1f6feb?style=flat-square)](https://github.com/Ruiming-cn/dsh-better-at)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Release](https://img.shields.io/github/v/release/Ruiming-cn/dsh-better-at?style=flat-square)](https://github.com/Ruiming-cn/dsh-better-at/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

`dsh-better-at` 保留 DSH 原生 `@` 引用行为——分层的工作区文件/文件夹引用与 DSH 会话引用——同时消除每次按键都请求 Host 的瓶颈。

## 特性

- ⚡ **首屏快速**：会话作用域创建时自动预热工作区文件索引与 DSH 会话索引，首次输入 `@` 时通常已在内存中。
- ⚡ **本地打字过滤**：首次加载后，输入过滤与排名全部在浏览器本地完成，不再每个按键请求 Host。
- 📁 **分层文件/文件夹引用**：空查询或路径查询显示直接子级；裸关键词模糊搜索全工作区 basename。
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

## 环境要求

- 具备原生 `@` 引用 source 的 DeepSeek Harness（DSH）Web 环境。
- 本地开发/构建需要 Node.js。

## 安装

从 GitHub Release 安装：

```powershell
dsh plugin --profile web add https://github.com/Ruiming-cn/dsh-better-at/archive/refs/tags/v0.1.0.tar.gz
```

从本地仓库安装：

```powershell
dsh plugin --profile web add .
```

安装后重启 `dsh web`。

## 使用方式

与平时一样使用 `@`：

- `@` 打开快速文件/文件夹 + 会话选择器。
- `@src/` 浏览 `src/` 目录内部。
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
- 后续按键是对缓存索引的本地 `O(N)` 字符串打分：文件索引受 `maxEntries` 限制，会话索引受本地会话语料限制。
- 主要代价是较小的新鲜度窗口：文件变化最多 30 秒后出现；会话元数据最多 5 分钟。后台刷新会保留旧快照并持续更新。

## 兼容性说明

- 浏览器集成使用与 `dsh-skill-fuzzy` 相同的 `inputTriggers.live.sources` 私有包装模式。若未来 Harness 改变内部结构，插件在 Remote 不可用时会自动降级到原生 `candidates` 路径。
- 符号链接不会被索引或遍历，与原生文件引用搜索行为一致。
- 当前会话已从 DSH 会话候选中排除，避免原生 session-reference 协议拒绝的自引用。

## 开发

```powershell
npm install --legacy-peer-deps
npm run check
```

- `npm run typecheck` — TypeScript 严格类型检查。
- `npm run test` — 纯函数单元测试（Node test runner）。
- `npm run build` — 构建 `lib/index.js`（Host ESM）、`lib/client.js`（单文件浏览器 bundle）和 `.d.ts` 声明。

`lib/` 构建产物已提交，profile 安装无需再次构建。

## License

[MIT](LICENSE)
