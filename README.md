# gembridge-analyzer

GemBridge / 中国桥协公开成绩数据分析工具。分成两个部分：

- **Board Lab**：单副牌学习与技术分析。
- **Tournament Lab**：对阵、轮次、队伍、排名、牌手 xIMP、Butler 和整项赛事分析。

## 开始

需要 Node.js 18+。解压后在项目目录运行：

```cmd
npm test

## 常用命令

```text
board       单副牌
match       一场对抗
round       一整轮
team        一支队赛事轨迹
player      一名牌手
standings   排名与 tie-break
butler      Butler / AOB / 修正 Butler
event       整项赛事
fetch       只取结构化数据
doctor      检查本地运行环境
```

例如：

```cmd
node src/cli.mjs butler "http://www.gembridge.cn/score/SectionSwiss?tourStart=2026-08-11&tour=37516&event=9368bf92-f218-41b2-95fd-52c923406b82&section=71beacdc-f5ce-43b0-8c66-36a2a644f8ed&round=7&byrank=true&from=ccba"
```

赛事摘要：

```cmd
node src/cli.mjs event "http://www.gembridge.cn/score/SectionSwiss?tourStart=2026-08-11&tour=37516&event=9368bf92-f218-41b2-95fd-52c923406b82&section=71beacdc-f5ce-43b0-8c66-36a2a644f8ed&round=7&byrank=true&from=ccba" --rounds 1-7
```

深度赛事分析会抓逐副牌，第一次请求较多：

```cmd
node src/cli.mjs event "http://www.gembridge.cn/score/SectionSwiss?tourStart=2026-08-11&tour=37516&event=9368bf92-f218-41b2-95fd-52c923406b82&section=71beacdc-f5ce-43b0-8c66-36a2a644f8ed&round=7&byrank=true&from=ccba" --rounds 1-7 --boards 1-12 --deep --concurrency 5 --out reports/event.md
```

## Board Lab

单副报告会整理：

- 四手牌、HCP、发牌人、局况
- 8张以上配合
- DD / Par
- 全场落点和具体结果
- 成局、满贯、加倍情况
- Datum / xIMP
- 极端结果与两室 swing
- 适合继续复盘的问题

学习模式：

```cmd
node src/cli.mjs board "http://www.gembridge.cn/score/TeamRoundBoards?tourStart=2026-08-11&tour=37516&event=9368bf92-f218-41b2-95fd-52c923406b82&section=71beacdc-f5ce-43b0-8c66-36a2a644f8ed&round=1&seg=0&board=2&from=ccba" --no-reveal --seat S
```

如果手工记录了 auction、首攻或关键打法：

```cmd
node src/cli.mjs board "http://www.gembridge.cn/score/TeamRoundBoards?tourStart=2026-08-11&tour=37516&event=9368bf92-f218-41b2-95fd-52c923406b82&section=71beacdc-f5ce-43b0-8c66-36a2a644f8ed&round=1&seg=0&board=2&from=ccba" --notes examples/manual-notes.json
```

## Tournament Lab

比赛层使用已经确认的：

- Round Tables：对阵、阵容、IMP、VP
- Swiss Result：总 VP、排名、IMP.Q、平均对手分、胜/平轮、罚分和逐轮战绩
- Datum Round：牌手逐副 xIMP
- Butler：Butler、AOB、修正 Butler
- Round metadata：轮次时间

因此可以把一副牌放回具体 match，也可以从赛事层反查某支队、某牌手或某轮的主要得失。

## 输出和缓存

机器可读 JSON：

```cmd
node src/cli.mjs board "http://www.gembridge.cn/score/TeamRoundBoards?tourStart=2026-08-11&tour=37516&event=9368bf92-f218-41b2-95fd-52c923406b82&section=71beacdc-f5ce-43b0-8c66-36a2a644f8ed&round=1&seg=0&board=2&from=ccba" --json --out data/r1b2.json
```

默认有磁盘缓存：

```text
.cache/gembridge-analyzer/
```

需要重新请求时：

```text
--refresh
```

其他高级参数可运行：

```cmd
node src/cli.mjs help
```

API 结构见 `docs/api-reference.md`。
