# GemBridge Analyzer 参数说明

这份文档解决两个问题：应该粘贴哪一种 URL，以及命令后面的参数什么时候需要填写。

## 最简单的用法

先进入项目目录，直接输入：

```cmd
gb board
```

程序会提示你粘贴完整链接。把浏览器地址栏里的完整 GemBridge/CCBA 链接直接粘贴进去，按回车即可，不需要自己加引号。

如果尚未安装短命令，使用等价入口：

```cmd
node src/cli.mjs board
```

## URL 怎么选

不要自己拼 URL。先在 GemBridge 成绩页面打开你要看的页面，复制浏览器地址栏的完整地址。

| 你想分析什么 | 应打开的页面 | URL 特征 | 对应命令 |
|---|---|---|---|
| 单副牌、四手牌、DD、Par、全场结果 | 某一副牌成绩页 | `TeamRoundBoards`，并有 `round`、`seg`、`board` | `gb board` |
| 一场队式对抗、逐副 IMP | 某轮对阵/桌号成绩页 | `TeamRoundResultAndRank`，并有 `round` | `gb match --table 桌号` |
| 一整轮概览、排名 | 某轮 Swiss/成绩页 | `SectionSwiss` 或轮次成绩页，并有 `round` | `gb round` / `gb standings` |
| 一支队的赛事轨迹 | 同一轮排名页 | `SectionSwiss`，并有赛事和轮次 | `gb team --team 队号` |
| 牌手 xIMP、搭档、Butler | 同一赛事排名/数据页 | 能识别赛事、section、round | `gb player --player 会员号` |
| Butler | 同一赛事排名或 Butler 页面 | 能识别赛事、section | `gb butler` |
| 整项赛事 | 赛事排名/Swiss 页面 | 能识别赛事和 section | `gb event` |

### 三条真实测试链接

单副牌 R1 B2，适合测试 `board`：

```text
http://www.gembridge.cn/score/TeamRoundBoards?tourStart=2026-08-11&tour=37516&event=9368bf92-f218-41b2-95fd-52c923406b82&section=71beacdc-f5ce-43b0-8c66-36a2a644f8ed&round=1&seg=0&board=2&from=ccba
```

第7轮对抗页，适合测试 `match --table 61`：

```text
http://www.gembridge.cn/score/TeamRoundResultAndRank?tourStart=2026-08-11&tour=37516&event=9368bf92-f218-41b2-95fd-52c923406b82&section=71beacdc-f5ce-43b0-8c66-36a2a644f8ed&round=7&seg=0&from=ccba
```

第7轮排名页，适合测试 `standings`、`team`、`player`、`event`：

```text
http://www.gembridge.cn/score/SectionSwiss?tourStart=2026-08-11&tour=37516&event=9368bf92-f218-41b2-95fd-52c923406b82&section=71beacdc-f5ce-43b0-8c66-36a2a644f8ed&round=7&byrank=true&from=ccba
```

## 命令与必填参数

### `board`：单副牌

```cmd
gb board
gb board --no-reveal
gb board --seat S
gb board --word --out reports\board.docx
gb board --json --out data\board.json
```

URL 必须指向具体某副牌，并包含 `round`、`seg`、`board`。输出四手牌、HCP、配合、DD、Par、场上落点、结果、Datum/xIMP 和复盘提示。

### `match`：一场对抗

```cmd
gb match --table 61
gb match --table 61 --boards 1-12
```

必须填写 `--table`。它是成绩页上的桌号，不是队号。`--boards` 可选，用来限定牌号范围。

### `round`：一整轮

```cmd
gb round
gb round --deep --boards 1-12
```

普通模式抓轮次概览；加 `--deep` 后才抓逐副牌。`--boards` 主要在 `--deep` 时使用。

### `standings`：排名

```cmd
gb standings
```

不需要额外参数，使用 URL 中的 `round` 作为“第几轮后排名”，输出 VP、IMP.Q、平均对手分、罚分和 tie-break。

### `team`：一支队的赛事轨迹

```cmd
gb team --team 24
gb team --team 24 --rounds 1-7
gb team --team 24 --rounds 1-7 --deep --boards 1-12
```

必须填写 `--team`。数字来自排名页的队号，不是桌号。未填写 `--rounds` 时默认从第1轮到 URL 中的轮次。

### `player`：牌手分析

`--player` 和 `--name` 二选一：

```cmd
gb player --player 082034 --rounds 1-7
gb player --name 马一廷 --rounds 1-7
```

`--player` 是会员号，优先使用；`--name` 是姓名，可能受同名或姓名写法影响。

### `butler`：Butler

```cmd
gb butler
```

不需要额外筛选参数，输出原始 Butler、AOB、修正 Butler 及重排。

### `event`：整项赛事

```cmd
gb event --rounds 1-7
gb event --rounds 1-7 --deep --boards 1-12
```

建议明确填写 `--rounds`。`--deep` 会抓大量逐副数据，测试时先用一两轮。

### `fetch`：只导出 JSON 快照

```cmd
gb fetch --scope board --out data\board.json
gb fetch --scope round --out data\round.json
gb fetch --scope event --rounds 1-7 --out data\event.json
```

`--scope` 必须是 `board`、`round` 或 `event`。`fetch` 固定输出 JSON，不支持 `--word`。

## 通用输出参数

| 参数 | 作用 | 例子 |
|---|---|---|
| `--word` | 输出 `.docx` | `gb board --word` |
| `--json` | 输出 JSON | `gb board --json` |
| `--out FILE` | 写入指定文件 | `--out reports\b1.md` |
| `--format md\|json` | 指定格式 | `--format json` |
| `--quiet` | 隐藏抓取进度 | `--quiet` |
| `--strict` | 发现结构错误时停止 | `--strict` |
| `--notes FILE` | 读取人工叫牌/首攻/打法补录 | `--notes examples\manual-notes.json` |

`--word` 和 `--json` 不能同时使用。`--out` 不写时，Markdown/JSON 输出到屏幕；Word 默认写入当前目录下自动生成的文件名。

## 抓取控制参数

这些参数通常不需要改，只有请求超时、数据更新或大批量抓取时才使用：

| 参数 | 默认值 | 作用 |
|---|---:|---|
| `--refresh` | 关闭 | 忽略已有缓存，重新请求 |
| `--no-cache` | 关闭 | 本次完全不读写缓存 |
| `--cache-dir DIR` | `.cache\gembridge-analyzer` | 指定缓存目录 |
| `--cache-ttl MS` | `300000` | 缓存有效期，单位毫秒 |
| `--timeout MS` | `15000` | 单次请求超时 |
| `--retries N` | `2` | 失败重试次数 |
| `--concurrency N` | `5` | 批量抓取并发数 |
| `--proxy URL` | 自动读取环境设置 | 指定 HTTP 代理 |

常用例子：

```cmd
gb board --refresh
gb event --rounds 1-2 --deep --concurrency 2
```

## 参数组合速查

```cmd
gb board
gb board --no-reveal
gb board --word --out reports\board.docx
gb match --table 61 --boards 1-12
gb round --deep --boards 1-12
gb team --team 24 --rounds 1-7
gb player --player 082034 --rounds 1-7
gb event --rounds 1-7
gb fetch --scope event --rounds 1-7 --out data\event.json
```

## 常见错误

- `board 命令需要 URL 中的 board`：换成包含 `TeamRoundBoards` 和具体 `board` 的页面。
- `match 命令需要 --table`：补上成绩页上的桌号，例如 `--table 61`。
- `player 命令需要 --player 会员号 或 --name 姓名`：二选一填写。
- `--word 缺少值`：`--word` 是开关，正确写法是 `--word`；文件名用 `--out 文件名`。
- `URL 错误`：重新从浏览器地址栏复制完整 URL，不要只复制页面标题。
