# SQLite

声明 feature `storage.sqlite` 和 capability `sqlite`，通过 `ctx.sqlite` 管理插件自己的结构化数据。简单配置仍用 `ctx.io`。

```ts
import { awaitOperation, type EchoPluginContext } from 'echo:plugin-sdk';

export async function activate(ctx: EchoPluginContext) {
  const db = await awaitOperation(
    ctx.sqlite.open({
      name: 'library',
      migrations: [
        { version: 1, sql: 'CREATE TABLE favorites(id TEXT PRIMARY KEY, title TEXT NOT NULL);' },
      ],
    }),
  );
  await awaitOperation(
    db.run(
      'INSERT INTO favorites(id,title) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title',
      ['song-1', '歌曲'],
    ),
  );
  const first = await awaitOperation(db.get('SELECT id,title FROM favorites ORDER BY id LIMIT 1'));
}
```

`open` 返回带 `name/version/readOnly/active` 的数据库句柄。数据库名是 1–64 个 ASCII 字母、数字、点、下划线或连字符，以字母或数字开头；缺省 `main`。名字不接受路径。每个安装最多 256 个命名数据库，一个作用域对同一名字只打开一个句柄，可同时打开最多 16 个数据库。数据按安装身份保存，换账号不另建数据库；账号相关记录应自行使用账号 ID 分区。

`migrations` 按正整数 version 排序，跳过已经应用的版本；所有尚未应用的迁移与 schema 版本一起提交，任一失败全部回滚。SQL 支持字符串或字符串数组；触发器和字符串内的分号会正确解析。`readOnly: true` 不创建文件、不应用尚未执行的迁移。`busyTimeoutMs` 缺省 1000，范围 0–5000。

- `exec(sql)`：原子执行建表或写入脚本。
- `run(sql, params?)`：单条写入，返回 `changes/lastInsertRowid`。
- `get(sql, params?)`：返回第一行或 `null`。
- `all(sql, params?, {limit?})`：返回 `rows/rowCount/truncated`，缺省 1000 行、最多 5000 行。
- `transaction([{sql,params?}, ...])`：原子执行 1–500 条写入，返回按顺序排列的 run 结果；任一失败整批回滚。不得在 SQL 内自行 BEGIN/COMMIT。
- `close()`：立即让句柄停止接收新操作，排空已排队操作后关闭。重复关闭无副作用。
- `ctx.sqlite.listDatabases()`：名称、文件大小、修改时间。
- `ctx.sqlite.deleteDatabase(name)`：必须先关闭该库所有作用域的连接；仅删除插件自己的数据库，不涉及外部授权文件。

参数支持 string、有限 number、boolean、null。BLOB 用 `{type:'hex', data:'00ff'}` 或 `{type:'base64', data:'AP8='}`；结果 BLOB 使用 hex。超出 JS 安全整数范围的值用 `{type:'int64',data:'9223372036854775807'}` 传入，结果也使用该结构，避免丢失精度。列名必须唯一，重复名字请用 SQL 别名。

SQL 每次最多 256 KiB，单次迁移脚本总量最多 256 KiB，参数及结果各有 8 MiB 预算。每作用域最多 64 个在途操作、32 MiB 排队参数。附件数据库、导出到任意路径、扩展加载、文件读写函数和非公开 PRAGMA 会被拒绝；只公开表/索引/外键结构、完整性检查及 schema 版本读取。

所有连接在专用串行线程执行。取消或换账号后不再交付旧结果；worker 在执行前、遍历结果和提交前检查取消，并回滚尚未提交的事务。QSQLITE 正在执行的单条语句不被强制中断，已提交的写入不会因取消而撤销。停用、卸载、退出或可见组件销毁会排空并关闭所属连接；插件更新前关闭全部连接后再快照，失败恢复代码和数据库，不需要自行安排备份文件。
