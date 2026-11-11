# WebDAV 备份

将 EchoMusicNext 的应用设置、插件及插件数据保存到自己的 WebDAV 存储，并从主程序的备份与恢复界面选择、下载和恢复。

## 使用

1. 安装并启用插件，打开插件设置。
2. 填写 WebDAV 服务地址、用户名、密码和远端备份目录。
3. 点击“测试连接”，检查访问情况并按需创建目录。
4. 开启“启用存储位置”，点击“保存并应用”。
5. 在设置 → 数据与安全 → 备份与恢复中选择 WebDAV 位置，创建备份或浏览远端备份进行恢复、删除。

插件负责 WebDAV 的保存、列举、下载和删除。归档生成、内容范围、格式校验、恢复确认、失败回滚和重启由主程序负责。插件不会自动定时备份。

## 地址与目录

- Nextcloud：`https://example.com/remote.php/dav/files/用户名/`
- 坚果云：`https://dav.jianguoyun.com/dav/`
- 自建服务：填写 WebDAV 根目录的最终 HTTP(S) 地址。

默认远端目录为 `EchoMusicNext`，支持 `EchoMusicNext/Backups` 等多级相对目录。使用 HTTP Basic Authorization，不把凭据放入 URL；重定向会提示填写最终地址。支持命名空间不同的 DAV 列表响应，最多展示最新 500 条本格式备份。

## 密码和备份内容

“记住密码”默认关闭：密码只在当前运行会话内保留，重启后需要重新输入并保存。开启后密码会存入插件私有数据，这不是系统钥匙串；插件数据备份也可能包含该密码。备份未加密，建议使用 HTTPS 和应用专用密码。

仅列举和加载 Next 的 `.echonext-backup` 归档，不导入旧 EchoMusic 的备份格式。归档支持范围由宿主决定，目前插件二进制归档上限为 256 MiB；上传按归档实际字节数指定 HTTP 请求大小，下载显式指定归档上限。

关闭设置页会取消连接测试。关闭主程序备份界面、取消操作、切换账号或停用插件会取消相关存储请求；已经完成的远端写入或目录创建不会撤回。

## 开发

插件初始版本为 1.0.0，要求宿主 0.1.3 及同步后的 SDK，使用 `maxRequestBytes` 显式请求大小选项。源码由开发工具编译为 ES2016 `.echomod`，不依赖 Node、浏览器 DOM、fetch、URL 或 btoa 运行时。

```sh
npm run check
npm test
npm run build
```

本地 WebDAV 协议和凭据生命周期测试位于 `tests/webdav.test.mjs`。实际宿主检查可设置 `ECHO_WEBDAV_PLUGIN_PACKAGE` 并运行 `builtWebDavProviderAndSettingsLifecycle`，覆盖本地服务、大于 8 MiB 的真实归档、列表、下载预览、删除及设置关闭取消；不会修改真实账号或远端服务。

## 许可证

MIT，见 [LICENSE](LICENSE)。界面图标沿用 EchoMusic 的 WebDAV 备份插件资产。
