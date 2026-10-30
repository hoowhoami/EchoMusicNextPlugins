# Folia 对应源码输入

`folia-reference/` 保存固定 Folia 提交的原始首选源码、数据、许可证及独立构建锁。
它属于对应源码归档，不属于 `.echomod` 的运行目录。

重建顺序、工具版本和输入校验说明见
[Folia 对应源码与可移植重建](../docs/folia/source-rebuild.md)。
该快照内的文件按 `SOURCE.json` 校验原始字节，请勿运行格式化或换行转换。
本地 `npm ci` 产生的 `node_modules` 不加入 Git 或源码归档。
