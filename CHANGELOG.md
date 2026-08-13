# 更新记录

## 1.1.0

- 新增短命令 `gb`，Windows 安装后无需反复输入 `node src/cli.mjs`。
- 新增 Markdown、JSON、Word 三种报告输出；八类分析报告均支持 `.docx`。
- 修复 2025 年牌局中的空白/phantom 占位记录误计入全场分布。
- 修复牺牲叫被误解为“本方到达成局”的启发式分析。
- 修复 CCBA Datum 接口双重 JSON 编码导致牌手报告为空。
- 新增带版本、来源和数据质量信息的 board/round/event 标准 JSON 快照。
- 新增手牌、DD、Datum、xIMP、桌室和牌手汇总等数据校验；`--strict` 可在错误时停止输出。
- 修复跨轮深度分析把 `--boards 1-2` 错当成所有轮次的绝对 B1-B2；现在会映射到该轮实际牌号。
- CLI 测试改为离线固定样本，GitHub Actions 覆盖 Windows/Linux 与 Node 18/20/22。

## 1.0.1

- 首个 GitHub 版本：Board Lab 与 Tournament Lab。
