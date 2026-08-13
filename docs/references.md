# 参考项目与借鉴边界

本项目的核心仍是 CCBA/GemBridge 公开比赛接口。v1.1.0 研究了以下开源项目的公开架构和文档，但没有复制其实现代码：

- [bridge-deals-ingest](https://github.com/ureshvahalia/bridge-deals-ingest)：借鉴“输入适配器 → 标准 BoardRecord → 校验 → 分析 → 统计”的分层思路。项目为 MIT License。
- [BridgeApp](https://github.com/Evanmsawyer/BridgeApp)：借鉴赛事、轮次、桌、牌和牌手分层建模。项目为 MIT License。
- [endplay](https://github.com/dominicprice/endplay)：作为 PBN/LIN、DDS、Par 和计分能力的未来参考；v1.1.0 没有引入其 Python 运行时。
- [Bridge Game Postmortem Chatbot](https://github.com/BSalita/Bridge_Game_Postmortem_Chatbot)：借鉴“结构化结果先可靠，再做赛后学习解释”的产品边界。项目为 MIT License。

当前实现完全保留 Node.js CLI 和 CCBA 适配器，不为了功能清单引入 Python、数据库或 AI 服务。未来若加入 PBN/LIN、SQLite 或 DDS，应作为标准快照之后的独立适配器，并单独核对依赖许可证。
