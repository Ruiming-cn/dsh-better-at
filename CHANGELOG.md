# Changelog

## 0.2.1 - 2026-11-20

- Verified against DeepSeek Harness 0.2.2-rc.5 and updated the dev dependency
  pins, peer ranges, and lockfile so `npm ci` resolves the current packages.
- Replaced the stale generated Typert artifacts (0.1.x `schema` codecs) with
  manifests built from the shared contract: strict codecs now expose the
  `create()` factory the 0.2.x Gateway and Typert Loader validate.
- Removed the `zod` dependency: the two wire shapes are checked by hand-written
  boundary parsers, which takes the browser bundle from ~557 kB to ~19 kB.
- Candidate rows now match the native `@` source: file/folder/session icons, a
  bare name, a parent-directory subtitle, relative session age, and `drill` on
  folder rows so Tab descends instead of inserting the folder.
- Prepared each file-index snapshot once (basename, lower-cased name, hidden
  flag, parent) and bounded the ranking to the best rows instead of sorting
  every match.
- Simplified the workspace walk: removed the dead symlink-following machinery
  (`realpath`, ancestor sets) that the actual skip-symlinks behavior never used,
  and corrected the module documentation.
- Added Plugin Manager metadata (`locale/en.json`, `locale/zh.json`, `icon.svg`)
  with the official `./locale/*.json` and `./icon` exports.

## 0.2.0 - 2026-08-30

- Migrated the Host Remote to the Alpha.2 Typert `./typert` and `./remote` artifacts.
- Removed the obsolete `dsh-client-runtime` dependency and switched to current Connection, Input Trigger, Locale, and SessionId contracts.
- Added lifecycle restoration for the native `@` source wrapper across unload and re-registration.
- Published the generated Typert descriptors and the public `./types` export.

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
