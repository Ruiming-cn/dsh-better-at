# Changelog

## Unreleased

- Host-provided `@deepseek-ai/*` peers are declared optional with `*` ranges and
  pinned to the published `0.1.0-rc.8` family as devDependencies, so `npm ci`
  and the full `check` suite work from the public registry instead of a
  harness-linked node_modules.
- `lib/` bundles are regenerated from a clean install so embedded module paths
  are deterministic (no machine-specific junction paths).

## 0.1.0

- Initial release.
- Session-scope warm-up preloads the workspace file index and the DSH session
  index before the first `@`, so the first open is served from memory.
- After the initial load, typing filters and ranks candidates entirely in the
  browser; no host round trip per keystroke.
- Hierarchical file/folder references: empty/path queries show direct
  children, bare fuzzy queries search basenames across the workspace.
- DSH session references: full session metadata indexed locally and ranked by
  working-directory affinity, matching the native ordering.
- Native mention compatibility: the browser wraps the existing `reference`
  source and keeps its `onPick`/`codec`, so file and session mentions keep the
  original serialized form (`@path`, `@"path"`, `@[label](dsh-session:...)`).
- File index cached per session for 30 seconds, the session index globally for
  5 minutes, both stale-while-revalidate.
- MIT license, bilingual README, and committed `lib/` for build-free installs.
