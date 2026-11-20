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
- 🎛️ **Native-shaped rows**: file and folder icons, folder rows that drill down
  with Tab, a parent-directory subtitle for nested entries, and session rows
  showing their working directory and age.
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
- Each index snapshot is prepared once for keystroke-time use: basenames,
  lower-cased names, hidden flags, and parent directories are computed when the
  snapshot arrives, and ranking keeps only the best rows instead of sorting
  every match.
- The Host Remote is a strict Typert contribution: `lib/typert.host.js` carries
  the descriptors the Gateway validates, and the browser mounts the same
  descriptors from `lib/typert.remote-client.js`.

## Requirements

- DeepSeek Harness (DSH) Web 0.2.2-rc.5 or newer with the native `@` reference
  source available.
- Node.js ≥ 22 for local development/building.

## Installation

From the prebuilt release tarball (no build step):

```powershell
dsh plugin --profile web add https://github.com/Ruiming-cn/dsh-better-at/releases/download/v0.2.1/dsh-better-at-0.2.1.tgz
```

From GitHub source (`lib/` is committed, so no build runs on install):

```powershell
dsh plugin --profile web add github:Ruiming-cn/dsh-better-at
```

From a local checkout:

```powershell
dsh plugin --profile web add .
```

Restart `dsh web` after installation.

## Usage

Use `@` exactly as usual:

- `@` opens the fast file/folder + session picker.
- `@src/` browses inside `src/`; Tab on a folder row descends instead of
  inserting it.
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
- Each keystroke scores prepared rows: the per-snapshot projection keeps the
  lower-cased basename, hidden flag, and parent directory, so no path string is
  re-split or re-lowercased while typing, and ranking keeps only the best rows
  instead of sorting every match.
- The browser bundle ships no general validation library; the two wire shapes
  are checked by hand-written boundary parsers.
- The main trade-off is a small freshness window: file changes may take up to
  30 seconds to appear; session metadata up to 5 minutes. Background refreshes
  keep the previous snapshot visible while updating.

## Compatibility Notes

- Verified against DeepSeek Harness 0.2.2-rc.5. The Host contribution uses the
  0.2.x strict Typert codec form (`create()` factory); an older Harness that
  expects the 0.1.x `schema` field will not register the Remote, and the plugin
  then falls back to the native `candidates` path.
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
npm install
npm run check
```

- `npm run typecheck` — TypeScript strict typecheck against the installed DSH
  package types.
- `npm run test` — pure-function unit tests (Node test runner), including a
  guard that the committed Typert artifacts match `src/contract.ts`.
- `npm run build` — builds `lib/index.js` (Host ESM), `lib/client.js`
  (single-file browser bundle), `lib/typert.host.js` +
  `lib/typert.remote-client.js` (Typert manifests) and `.d.ts` declarations.

`lib/` is committed so profile installs can run without a build step.

## License

[MIT](LICENSE)
