# dsh-better-at

为 DeepSeek Harness Web 输入框 `@` 功能提供快速引用加速。

`dsh-better-at` 保留 DSH 原生 `@` 引用行为——分层的工作区文件/文件夹引用与 DSH 会话引用——同时消除每次按键都请求 Host 的瓶颈。

## 工作原理

- Host 新增 `betterAt` Remote：
  - 有界的工作区文件/目录索引；
  - 完整 DSH 会话索引，并生成规范会话 mention。
- Client 包装原生 `@` source（`trigger='@'`、`name='reference'`），不替换其 `onPick`/`codec`，因此文件/会话 mention 的序列化形式保持不变。
- 文件索引按会话缓存 30 秒；会话索引全局缓存 5 分钟。均使用 stale-while-revalidate：过期时立即返回旧快照并在后台刷新。
- 会话作用域创建时即开始预热，首次输入 `@` 时索引通常已在内存中。
- 打字过滤在本地完成：保留文件/文件夹分层与会话工作目录亲和排序。

## 安装（开发）

```sh
dsh plugin --profile web add .
```

然后重启 `dsh web`。

## 构建

```sh
npm install --legacy-peer-deps
npm run check
```

`lib/` 构建产物会提交到仓库，profile 安装无需再次构建。

## License

MIT
