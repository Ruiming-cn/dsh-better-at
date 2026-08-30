# Releasing

## Prerequisites

- `gh` CLI authenticated with repository write access.
- Node.js ≥ 22.6 (tests run with `--experimental-strip-types`).

## Steps

```bash
# 1. Build and verify
npm run check

# 2. Create the npm tarball
npm pack

# 3. Tag and create the GitHub release with the tarball asset
gh release create v0.2.0 \
  --repo Ruiming-cn/dsh-better-at \
  --title "dsh-better-at v0.2.0" \
  --notes "See CHANGELOG.md" \
  ./dsh-better-at-0.2.0.tgz

# 4. Verify repository metadata
gh repo view Ruiming-cn/dsh-better-at --json description,repositoryTopics
gh release view v0.2.0 --repo Ruiming-cn/dsh-better-at
```

## Repository metadata

Keep the following in sync before each release:

- `package.json` description, keywords, repository/homepage/bugs fields.
- `README.md` (English) and `README.zh.md` (Chinese).
- `CHANGELOG.md`.
