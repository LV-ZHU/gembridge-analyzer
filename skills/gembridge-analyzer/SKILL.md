---
name: gembridge-analyzer
description: Analyze GemBridge/CCBA team bridge boards and tournaments using the repository CLI and confirmed APIs.
---

# GemBridge Analyzer Skill

## First choose the correct half of the product

- **Board Lab**: one board, bidding/game decisions, field destinations, DD/Par, Datum/xIMP, optional manual auction/play.
- **Tournament Lab**: match swings, round results, standings, team trajectory, player xIMP, Butler/AOB.

Do not mix the two by default. A board report may add a short match context only when the user asks; standings and Butler belong to tournament analysis.

## Use the CLI

Run `scripts\\setup.cmd` once, then use the short `gb` command. Let the CLI prompt for the URL so Windows does not reinterpret `&` characters from the link.

```text
gb board
gb match --table 61
gb round --deep
gb team --team 24 --deep
gb player --player 082034
gb standings
gb butler
gb event --rounds 1-8 --deep
```

Add `--word` to any report command to produce a `.docx` file. `fetch` always produces JSON.

Use `gb fetch --scope board|round|event --strict` when creating durable machine-readable data. Add `--deep` to round/event snapshots only when per-board data is required.



## Interpretation rules

- Treat API fields as facts; deterministic calculations as derived data; manually supplied auction/play as manual data.
- DD and Par never prove that a practical bid was mandatory.
- Without auction/play, discuss only what final contracts and results support.
- Use xIMP for field-relative performance and official IMP for a match swing.
- Do not invent a formula for IMP.Q or average-opponent-score fields.
- Butler/AOB/corrected Butler are official fields; sample size matters when comparing players.
- Write natural Chinese: concrete data first, conclusion second. Avoid canned AI prose and forced “升华”.

See `docs/api-reference.md`, `docs/data-model.md`, and `docs/analysis-principles.md` before changing semantics.
