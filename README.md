# token-launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/mumu-max/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/mumu-max/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar — a pre-token protocol radar. It reads DeFiLlama's sealed snapshot of 758 protocols,
ranks the 183 that record no token by an implied value calibrated from the snapshot's own live-token
multiples, and ships a static, offline dashboard with a model breakdown and a six-step farm plan for
every protocol. Model radar-2: TVL × category multiple (median mcap/TVL of live protocols in the same
category, else the whole-snapshot median) × growth × maturity × distribution. No protocol name is ever
special-cased.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input snapshot.json
```

`snapshot.json` is the sealed input from the competition kit (`input/snapshot.json`). The program writes
`out/board.json` (183 rows), `out/data.js`, `out/dashboard/` (the static page), `out/screenshots/` (board,
detail, filtered) and `out/dossier.json` (what the judge reads).

Screenshots are taken with `node scripts/shots.mjs out` (headless Chromium over CDP).

---

<sub>Entered on [make.fun](https://make.fun/?ref=whbb5w3e&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
