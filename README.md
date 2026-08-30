# dsh-better-at

> Fast `@` file/session reference caching for the DeepSeek Harness Web GUI.

[![DSH Plugin](https://img.shields.io/badge/DSH-Plugin-1f6feb?style=flat-square)](https://github.com/Ruiming-cn/dsh-better-at)
[![Awesome DSH Plugin](https://img.shields.io/badge/Awesome-DSH_Plugin-ff69b4?style=flat-square)](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Release](https://img.shields.io/github/v/release/Ruiming-cn/dsh-better-at?style=flat-square)](https://github.com/Ruiming-cn/dsh-better-at/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

`dsh-better-at` keeps the native DSH `@` reference behavior — hierarchical
workspace file/folder references and DSH session references — while removing the
per-keystroke host round trips that make the `@` menu feel slow.

## Features

- ⚡ **Fast first open**: session-scope warm-up preloads the workspace file index
  and the DSH session index before the first `@`.
- ⚡ **Local keystroke filtering**: after the initial load, typing filters and
  ranks candidates entirely in the browser; no Host request per keystroke.
- 📁 **Hierarchical file/folder references**: empty/path queries show direct
  children, bare fuzzy queries search basenames across the whole workspace.
- 💬 **DSH session references**: full session metadata is indexed locally and
  ranked by working-directory affinity, matching the native ordering.
- 🔒 **Native mention compatibility**: the plugin wraps the existing `reference`
  source and keeps its `onPick`/`codec`, so file and session mentions keep the
  original serialized form (`@path`, `@"path"`, `@[label](dsh-session:...)`).
- 🧩 **No Harness source changes**: everything is implemented as an out-of-tree
  Host Remote + browser client bundle.

## How It Works

```
DSH Web @ menu
      │  candidates() · local filter/rank
      ▼
dsh-better-at client cache
      │  listFiles / listSessions (once per TTL)
      ▼
DSH Host betterAt Remote
      ├── bounded workspace file/directory index
      └── full DSH session index + canonical mentions
```

- `betterAt/listFiles` walks the current workspace once and returns a bounded
  file/directory index. Defaults exclude `.git` and `node_modules` only, matching
  the native file-reference behavior.
- `betterAt/listSessions` reads the complete logical session corpus from
  `ctx.sessionQuery` and generates native `dsh-session:` mentions for the
  browser.
- File indices are cached per session for 30 seconds; the session index is
  cached globally for 5 minutes. Both use stale-while-revalidate: an expired
  cache returns the previous snapshot immediately while refreshing in the
  background.
- The browser wraps the native `@` source (`trigger='@'`, `name='reference'`)
  without replacing its pick/codec path.

## Requirements

- DeepSeek Harness (DSH) Web with the native `@` reference source available.
- Node.js for local development/building.

## Installation

One command from GitHub source:

```powershell
dsh plugin --profile web add github:Ruiming-cn/dsh-better-at
```

From the GitHub release tarball:

```powershell
dsh plugin --profile web add https://github.com/Ruiming-cn/dsh-better-at/archive/refs/tags/v0.2.0.tar.gz
```

From a local checkout:

```powershell
dsh plugin --profile web add .
```

Restart `dsh web` after installation.

## Usage

Use `@` exactly as usual:

- `@` opens the fast file/folder + session picker.
- `@src/` browses inside `src/`.
- `@README` fuzzy-searches file basenames.
- `@refactor` filters DSH sessions by id, cwd, or label.

After selection, the native composer behavior is preserved: files become atomic
file references (or editable directory paths), and DSH sessions become native
session references.

## Configuration

The Host plugin accepts two settings through the profile patch:

```yaml
# ~/.dsh/profiles/web/cordis.patch.yml
- id: dsh-better-at
  config:
    maxEntries: 10000
    ignoreDirs:
      - .git
      - node_modules
```

| Option | Default | Description |
| --- | --- | --- |
| `maxEntries` | `10000` | Hard cap on indexed workspace entries; the walk reports truncation. |
| `ignoreDirs` | `['.git', 'node_modules']` | Directory basenames never indexed or traversed. |

## Performance Notes

- The first `@` after a warm session is normally served from memory.
- Subsequent keystrokes are local `O(N)` string scoring over the cached index
  (file index is bounded by `maxEntries`; session index is bounded by the local
  session corpus).
- The main trade-off is a small freshness window: file changes may take up to
  30 seconds to appear; session metadata up to 5 minutes. Background refreshes
  keep the previous snapshot visible while updating.

## Compatibility Notes

- The browser integration intentionally uses the same private
  `inputTriggers.live.sources` wrapping pattern as `dsh-skill-fuzzy`. If a
  future Harness version changes that internal structure, the plugin degrades
  to the native `candidates` path when the Remote is unavailable.
- Symbolic links are not indexed or traversed, matching the native
  file-reference search behavior.
- The current session is excluded from DSH session candidates to avoid
  self-references, which the native session-reference protocol rejects.

## Development

```powershell
npm install --legacy-peer-deps
npm run check
```

- `npm run typecheck` — TypeScript strict typecheck.
- `npm run test` — pure-function unit tests (Node test runner).
- `npm run build` — builds `lib/index.js` (Host ESM), `lib/client.js`
  (single-file browser bundle) and `.d.ts` declarations.

`lib/` is committed so profile installs can run without a build step.

## License

[MIT](LICENSE)
