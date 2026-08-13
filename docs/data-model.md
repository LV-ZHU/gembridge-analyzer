# 标准数据模型

`fetch` 输出统一的 JSON 信封，目标不是把网页 HTML 原样存下来，而是把 CCBA/GemBridge 的不同成绩页归一成稳定的桥牌赛事对象。

```text
snapshot
├─ schemaVersion
├─ generator
├─ generatedAt
├─ scope                    board | round | event
├─ source
│  ├─ kind
│  ├─ url
│  ├─ host
│  └─ identifiers           tour / event / section / round / seg / board
├─ dataQuality
└─ data
```

## Board

```text
board
├─ meta
├─ hand
│  ├─ dealer / vulnerability
│  ├─ hands[N/E/S/W][S/H/D/C]
│  ├─ doubleDummyTricks
│  └─ par
├─ results[]
│  ├─ table / room
│  ├─ players / members
│  ├─ recordKind
│  ├─ contract
│  ├─ scoreNS / datumScoreNS / datumDifference / ximp
│  ├─ matchImpNS / matchImpEW
│  ├─ flags
│  └─ provenance
└─ provenance
```

`recordKind` 明确区分实际定约、NoPlay、调整、fouled、phantom 和空白占位。分析全场落点时只使用实际定约和真实 NoPlay；原始占位仍保留在数据中供诊断。

## Round 与 Event

Round 快照包含轮次元数据、对阵、轻量排名、Swiss 完整成绩和 Datum 牌手表。`--deep` 时再附加 `boards[]`。Event 快照由多个 Round 快照和一份 Butler 数据组成，不重新发明另一套字段。

## 来源信息

标准化对象的 `provenance` 至少记录：

- `kind`：目前为 `raw_api`。
- `source`：实际请求的公开接口。
- `fromCache`：是否来自磁盘缓存。
- `stale`：接口失败后是否回退到过期缓存。
- `fetchedAt`：抓取或缓存时间。

推导值、人工补录和启发式结论不冒充 API 原始字段。

## 数据质量

当前校验包括：

- 四手各 13 张、总计 52 张、没有重复牌、牌张字符有效。
- 按牌张重算 HCP 与官方字段是否一致。
- DD 墩数在 0–13 范围内。
- 定约阶数、花色、庄家和实际墩数范围。
- `scoreNS - datumScoreNS = datumDifference`。
- Datum 差换算的 xIMP 与接口字段是否一致。
- 同一桌/室是否重复。
- 轮次、桌号、队号、牌号范围的一致性。
- 牌手逐副 xIMP 之和是否等于官方轮次总计。
- `Butler = XIMPs / boards` 以及 `correctButler = Butler + AOB`。

质量状态为 `ok`、`warning` 或 `error`。警告表示仍可阅读但需要谨慎；错误表示结构存在矛盾。`--strict` 只在有 `error` 时停止。
