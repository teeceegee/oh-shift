# Oh! Shift — Agent Workspace README

## 1. Project Overview
**Oh! Shift** is an offline-first, touch-friendly Progressive Web App (PWA) word-deduction puzzle game designed for extended, interruption-friendly play on iPhone and iPad.

The core loop combines adjacent-letter word building on a persistent 5×5 board, earned cyclic wraparound row/column shifting, and **board-grounded hybrid deduction**:
- **Find words** on the 5×5 board (3+ adjacent tiles, including diagonals) to earn **Shift Tokens** and **Insight Points**.
- **Shift rows or columns** (with cyclic wraparound) to unlock new words or physically assemble hidden target words.
- **Deduce hidden targets** (3 per phase, guaranteed constructible from board letters) via Wordle-style guesses with duplicate-letter accuracy and purchased clues — or physically shift and spell a hidden target on the board for a **Board Construction Bonus**.
- **Advance phases** in Endless Run (with 3–5 seeded tile replacements per phase) or play a deterministic date-seeded **Daily 5-Phase Challenge**.

### Locked Product & Architecture Decisions (2026-11-24)
- **Deduction Coupling:** Board-grounded hybrid (targets use letters present on the board; deduce via guesses or construct on the board for a bonus).
- **Initial Delivery Scope:** Full Solo Offline PWA (Milestones 1–2) with tunable economy configuration.
- **Hosting:** Static HTTPS hosting (GitHub Pages / Cloudflare Pages) for seamless iOS Safari PWA installation.
- **Visual Direction:** Warm tactile & editorial (NYT Games / Scrabble-inspired tiles, parchment light mode & charcoal dark mode).
- **Dictionary & Modes:** Curated two-tier UK English dictionary (`uk-en-v1`), Endless Run + Daily 5-Phase Challenge.

---

## 2. Technical Details
- **Stack:** TypeScript 5, React 19, Vite 6, CSS Modules / Custom Properties, Vitest, `vite-plugin-pwa` (Workbox), IndexedDB.
- **Engine Architecture:** Pure deterministic TypeScript engine in `src/engine/` with zero DOM/network dependencies and a replayable `GameAction` log.
- **Repository:** `https://github.com/teeceegee/oh-shift`
- **Source Specification:** [Oh_Shift_Game_Specification.md](file:///Volumes/Kingston%20SSD%201T/NeosDrive/08_Tech,%20Dev%20&%20AI/AI/Gemini/AntiGravity/Oh!/Oh!%20Shift/specification/Oh_Shift_Game_Specification.md)
- **Verification Commands:**
  - `npm run build:dict` — Rebuild front-coded UK English dictionary (`uk-en-v1`) from SCOWL tiers.
  - `npm test` — Run Vitest engine & acceptance test suite.
  - `npm run sim` — Run 250-phase headless economy & solvability simulation.
  - `npm run build` — Strict TypeScript typecheck + Vite production bundle.
  - `npm run dev` — Start local Vite development server.

---

## 3. Confluence & Jira Cross-References

### Confluence (`TCG` Space — `https://echopost.atlassian.net`)
- **Architecture & Delivery Plan:** [Oh! Shift — Architecture, Game Design Decisions & Delivery Plan](https://echopost.atlassian.net/wiki/spaces/~71202051b19675b2e64a71ac2b1d79eb01b1f7/pages/40861698) (Page ID: `40861698`, Live Document)

### Jira (`EVD` Project — `https://echopost.atlassian.net`)
- **Master Epic:** [EVD-334](https://echopost.atlassian.net/browse/EVD-334) — `[Oh! Shift] Offline-First iOS/iPadOS Word Deduction PWA (MVP)`
- See [JIRA_TICKETS.md](file:///Volumes/Kingston%20SSD%201T/NeosDrive/08_Tech,%20Dev%20&%20AI/AI/Gemini/AntiGravity/Oh!/Oh!%20Shift/JIRA_TICKETS.md) for full phase task tracking.

---

## 4. Activity & Discovery Log
- **2026-11-24:** Reviewed `specification/Oh_Shift_Game_Specification.md` (v0.1). Clarified and locked 5 core product decisions with product owner (board-grounded hybrid deduction, full Solo Offline PWA scope, static HTTPS hosting, warm tactile editorial aesthetic, curated UK English + Endless/Daily 5-Phase).
- **2026-11-24:** Published architecture and phased delivery plan to Confluence (`TCG`, Page `40861698`) and created Jira Epic `EVD-334` with Phase 1–5 delivery tasks. Created `AGENT_README.md` and `JIRA_TICKETS.md`.
- **2026-11-24:** Critiqued implementation plan and incorporated 7 architectural amendments (inverted forward-shift target sampling, decoupled 6 free guesses vs Insight clues, uncommitted shift undo stack, front-coded UK English dictionary, iPhone bottom-sheet UX, iOS PWA Save Code export/import, and headless economy simulator). Updated Confluence (`40861698`, v2) and Jira (`EVD-335`–`EVD-338`).
- **2026-11-24:** Completed **Phase 1 (`EVD-335`)**: scaffolded Vite/React/TS/Vitest, built `uk-en-v1` front-coded UK English dictionary (76,524 board words / 5,720 targets), implemented pure deterministic core engine (`src/engine/*`), and verified with `npm test` (13/13 passing), `npm run sim` (250 phases, 10.74 ms/phase, 0 deadlocks, 0 clue violations), and `npm run build`.
- **2026-11-24:** Completed **Phase 2 (`EVD-336`)**: implemented warm tactile editorial design system (parchment light / charcoal dark), responsive 5×5 `BoardGrid` (drag + tap selection, SVG path connector, swipe + tap Shift Mode, Undo stack), portrait iPhone bottom-sheet `DeductionPanel` + iPad landscape side-by-side layout, board-aware `Keyboard` (dimming off-board letters), colour-independent feedback (`✓ / ↔ / ×`), `HistorySheet`, and `RulesSheet`. Verified with `npm test` (13/13) and `npm run build` (`206 KB` gzipped).
