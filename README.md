# dsh-better-at

Fast `@` file/session reference caching for the DeepSeek Harness Web GUI.

`dsh-better-at` keeps the native DSH `@` reference behavior — hierarchical
workspace file/folder references and DSH session references — while removing
the per-keystroke host round trips that make the `@` menu feel slow.

## How it works

- A Host `betterAt` Remote exposes:
  - a bounded workspace file/directory index,
  - the full DSH session index with canonical session mentions.
- The client wraps the native `@` source (`trigger='@'`, `name='reference'`)
  without replacing its `onPick`/`codec`, so file/session mentions keep their
  original serialized form.
- Per-session file indices are cached for 30s; the session index is cached for
  5 minutes. Both use stale-while-revalidate: an expired cache returns the
  previous snapshot immediately while refreshing in the background.
- Warm-up starts at session scope birth, so the first `@` normally has its
  indices already in memory.
- Typing filters happen locally over the cached index: file/folder hierarchy
  and session cwd-affinity ranking are preserved.

## Install (development)

```sh
dsh plugin --profile web add .
```

Then restart `dsh web`.

## Build

```sh
npm install --legacy-peer-deps
npm run check
```

`lib/` is committed so profile installs can run without a build step.

## License

MIT
