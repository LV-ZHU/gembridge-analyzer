# 已确认接口

本项目只把已经在浏览器 Network 中实际确认过的接口写进正式适配器。

|层级|接口|
|---|---|
|单副牌|`GET :9898/api/GBBD/Hand/Get/{section}/{round}/{seg}/{board}`|
|逐桌结果|`GET :9898/api/GBBD/Board/GetTeamRoundBoards/{section}/{round}/{seg}/{board}/true`|
|轮次元数据|`GET :9898/api/GBBD/Round/Get/{section}/{round}/{seg}`|
|本轮对阵|`GET :9898/api/GBBD/Table/GetTeamRoundTables/{section}/{round}/{seg}/1`|
|轻量排名|`GET :9898/api/GBBD/Rank/Team/GetRoundRanks/{section}/{round}`|
|瑞士制完整成绩|`GET :9898/api/GBBD/Section/GetSwissResult/{section}/{round}/true`|
|Datum牌手表|`GET :18632/api/score/datum/round/{tourStart}/{section}/{round}/{seg}`|
|Butler|`GET :18632/api/score/butler/section/{tourStart}/{section}`|

## 已确认的几个容易混淆的字段

- `GetTeamRoundBoards.datum`：该副的 NS 视角 Datum 基准分。
- 网页 Datum 差：`scoreNS - datum`。
- `ximp`：上述差值换算的 xIMP。
- `impNS/impEW`：具体两室比赛该副的正式 IMP。
- `contractDouble`：加倍规范字段；`contract` 本身也可能写成 `1NTx`。
- `*Makeable*`：DD 可取墩数。
- `DatumRound.boards[].datum`：官方逐副 Datum。
- `DatumRound.players[].boardsXimp[].datum` 在已观察样本中为 0，程序不把它当真实 Datum。
- `Butler = XIMPs / boards`；官方说明 `correctButler = Butler + AOB`。
- `leadCard / leadCardRank / leadCardSuit` 虽存在于 DTO，但本次 U16 预赛 8×12 副扫描全部为空。

`GetTeamRoundTables` URL 最后的 `/1` 已确认是页面实际请求的一部分，但其服务端参数名称尚未确认；代码内部称为 `mode=1`，不擅自解释。
