# gembridge-analyzer

CCBA / GemBridge 公开比赛成绩抓取、校验和分析工具。核心数据源仍是中国桥牌协会比赛系统实际使用的公开接口；项目不抓会员私密信息，也不绕过登录。

- **Board Lab**：单副牌学习、全场落点、DD / Par、Datum / xIMP。
- **Tournament Lab**：对阵、轮次、队伍、排名、牌手和整项赛事分析。
- **Data Pipeline**：把不同成绩页统一为带版本、来源和数据质量信息的 JSON 快照。

需要 Node.js 18+。第一次在项目目录运行：

```cmd
scripts\setup.cmd
```

安装完成后，CMD 和 PowerShell 都可以直接使用短命令：

```cmd
gb help
```

`gembridge` 与 `gb` 完全相同，下面统一使用更短的 `gb`。

## 输入 URL（推荐方式）

GemBridge URL 中包含很多 `&`。CMD 和 PowerShell 会先解释这些字符，因此把 URL 直接写在命令同一行时必须加英文双引号。

为了省去引号，现在可以只运行命令：

```cmd
gb board
```

看到提示后，直接粘贴完整 URL 并按回车：

```text
请直接粘贴完整的 CCBA / GemBridge 赛事链接（不需要引号）：
> http://www.gembridge.cn/score/TeamRoundBoards?...
```

其他命令也支持这种方式。例如：

```cmd
gb match --table 61
gb player --player 082034 --rounds 1-7
```

在 Windows 上使用 `gb` 时，推荐始终在提示后粘贴 URL。批处理转发可能再次解释 URL 中的 `&`，所以不要把完整 URL 接在 `gb` 后面。

如果确实需要脚本化地把 URL 写在一行内，请使用原始 Node 入口并给 URL 加双引号：

```cmd
node src/cli.mjs board "完整 URL"
```

## 两条真实链接快速测试

先运行：

```cmd
gb board
```

再粘贴下面这条链接。预期标题为 `R1 B2`，并能看到四手牌、DD、Par、全场结果和数据校验：

```text
http://www.gembridge.cn/score/TeamRoundBoards?tourStart=2026-08-11&tour=37516&event=9368bf92-f218-41b2-95fd-52c923406b82&section=71beacdc-f5ce-43b0-8c66-36a2a644f8ed&round=1&seg=0&board=2&from=ccba
```

赛事层可运行：

```cmd
gb match --table 61
```

再粘贴下面的链接。预期为 `U16上海胡荣华公开红队 vs 闵行巨浪`，官方比分 `15–24 IMP`、`7.10–12.90 VP`：

```text
http://www.gembridge.cn/score/TeamRoundResultAndRank?tourStart=2026-08-11&tour=37516&event=9368bf92-f218-41b2-95fd-52c923406b82&section=71beacdc-f5ce-43b0-8c66-36a2a644f8ed&round=7&seg=0&from=ccba
```

## 现在可用的指令

参数、URL 类型和常见错误的详细说明见：[docs/parameter-guide.md](docs/parameter-guide.md)。如果不知道该选哪条 URL，先看文档中的“URL 怎么选”表格。

### `board`：分析单副牌

```cmd
gb board
```

输出四手牌、HCP、配合、DD、Par、满贯机会、全场落点、具体结果、Datum / xIMP、极端结果和复盘提示。满贯机会会把 DD 最高可成定约、Par 与实战到达率分开显示；DD/Par 只作为看见四手牌后的技术上限，不会直接断言实战叫牌必然错误。

常用组合：

```cmd
gb board --no-reveal --seat S
gb board --notes examples/manual-notes.json
gb board --json --out data/board.json
gb board --word
```

### `match`：分析一场对抗

```cmd
gb match --table 61
```

需要 `--table`。输出双方、最终 IMP / VP、每副得失 IMP、大摆幅和累计比分。

可限定牌号：

```cmd
gb match --table 61 --boards 1-12
```

### `round`：分析一整轮

```cmd
gb round
```

输出轮次时间、主要对阵和排名信息。加入 `--deep` 会继续抓逐副牌：

```cmd
gb round --deep --boards 1-12
```

### `team`：查看一支队的赛事轨迹

```cmd
gb team --team 24 --rounds 1-7
```

需要 `--team` 队号。输出各轮对手、IMP、VP、累计 VP 和排名轨迹。`--deep` 会分析本队逐副得失：

```cmd
gb team --team 24 --rounds 1-7 --deep
```

### `player`：查看一名牌手

按会员号：

```cmd
gb player --player 082034 --rounds 1-7
```

或按姓名：

```cmd
gb player --name 马一廷 --rounds 1-7
```

输出逐轮/逐副 xIMP、搭档、最好和最差牌，以及 Butler 信息。

### `standings`：查看排名

```cmd
gb standings
```

输出 VP、IMP.Q、平均对手分、罚分、同分 tie-break 和排名变化。

### `butler`：查看 Butler

```cmd
gb butler
```

输出 XIMP、牌数、Butler、AOB、修正 Butler 和修正后重排。

### `event`：分析整项赛事

```cmd
gb event --rounds 1-7
```

输出赛事排名、排名变化和 Butler 摘要。深度模式会抓所有指定轮次的逐副牌，请求量较大：

```cmd
gb event --rounds 1-7 --boards 1-12 --deep --concurrency 5 --out reports/event.md
```

### `fetch`：导出标准数据快照

```cmd
gb fetch --scope board --out data/board.json
gb fetch --scope round --out data/round.json
gb fetch --scope event --rounds 1-7 --out data/event.json
```

`--scope` 支持 `board`、`round`、`event`。每个快照包含：

- `schemaVersion`：数据结构版本，方便以后升级而不破坏旧数据。
- `source`：原始成绩页及 tour / section / round / board 标识。
- `dataQuality`：手牌、DD、Datum、xIMP、桌室和汇总一致性检查。
- `data`：统一后的赛事、轮次或单副牌数据。

整轮或整项赛事加 `--deep` 会继续抓逐副牌：

```cmd
gb fetch --scope round --deep --boards 1-12 --out data/round-deep.json
gb fetch --scope event --rounds 1-7 --deep --boards 1-12 --out data/event-deep.json
```

需要把数据用于研究或长期存档时，建议加入 `--strict`；发现结构错误时程序会停止输出。普通分析不会因为非致命警告中断。

### `doctor` 和 `help`

```cmd
gb doctor
gb help
```

`doctor` 检查运行环境；`help` 显示指令和参数速查。

## 通用参数

| 参数 | 用途 |
|---|---|
| `--rounds 1-7` | 指定轮次范围 |
| `--boards 1-12` | 指定牌号范围 |
| `--deep` | 抓逐副牌做深度分析 |
| `--strict` | 数据校验发现错误时停止输出 |
| `--json` | 输出 JSON |
| `--word` | 输出 Word 文档（`.docx`） |
| `--out FILE` | 写入文件 |
| `--refresh` | 忽略缓存重新请求 |
| `--no-cache` | 禁用缓存 |
| `--concurrency 5` | 设置并发请求数 |
| `--quiet` | 隐藏抓取进度 |
| `--no-reveal` | 单副学习模式隐藏全场结果 |
| `--seat S` | 单副学习模式只显示指定座位 |
| `--notes FILE` | 补录叫牌、首攻和打法 |

默认缓存目录：

```text
.cache/gembridge-analyzer/
```

API 数据结构见 `docs/api-reference.md`。

标准数据模型与校验规则见 `docs/data-model.md`，分析口径见 `docs/analysis-principles.md`。项目目前只实现经过真实 CCBA/GemBridge 返回验证的接口；未来可在标准快照之后增加 PBN/LIN、数据库或 DDS 适配器，不会把这些格式耦合进 CCBA 抓取层。

架构参考与许可证边界见 `docs/references.md`。

## 开发与验收

```cmd
npm test
npm run test:online
npm run verify
```

- `npm test`：30 项以上的固定样本离线回归测试，GitHub Actions 使用这一层。
- `npm run test:online`：用 README 中的真实赛事链接检查当前 CCBA 链路。
- `npm run verify`：离线测试加 npm 发布包清单检查。

版本变化见 `CHANGELOG.md`。

`--word` 适用于 `board`、`match`、`round`、`team`、`player`、`standings`、`butler` 和 `event`。`fetch` 固定输出 JSON。

`--boards` 既可以写本轮实际牌号，也可以写本轮内的顺序。例如某轮实际使用 B17–B32，`--boards 1-2` 会自动选择 B17–B18；写 `--boards 17-18` 得到相同结果。
