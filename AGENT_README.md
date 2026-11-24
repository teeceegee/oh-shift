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
- **Live Offline PWA (GitHub Pages):** `https://teeceegee.github.io/oh-shift/`
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
- **2026-11-24:** Connected workspace to GitHub repository `https://github.com/teeceegee/oh-shift` and pushed Phases 1–2.
- **2026-11-24:** Completed **Phase 3 (`EVD-337`)**: implemented schema-versioned IndexedDB per-action auto-save/resume (`src/storage/db.ts`) with `localStorage` fallback and portable `OS1:` Save Code export/import, local-timezone Daily 5-Phase Challenge with spoiler-free shareable summary (`src/engine/daily.ts`), Endless milestones (5/10/20/40+), difficulty presets & custom seeds (`MenuSheet.tsx`), and lifetime records/history (`StatsSheet.tsx`). Verified with `npm test` (18/18) and `npm run build`.
- **2026-11-24:** Completed **Phase 4 (`EVD-338`)**: configured `vite-plugin-pwa` (Workbox) precaching all 16 assets (`816 KiB` uncompressed / `~210 KB` gzipped including `dict-uk-en-v1`), deferred `PwaUpdateBanner` (no mid-game forced reloads), editorial SVG/PNG PWA & Apple Touch icons, iOS standalone meta tags, Rollup chunk splitting, and GitHub Actions deployment workflow to GitHub Pages (`https://teeceegee.github.io/oh-shift/`). All MVP Phases 1–4 complete.
- **2026-11-24:** Playtest UX improvement: replaced the separate `Spell | Shift` mode toggle and `ShiftTray` with direct 1-tap `▲ / ▼ / ◀ / ▶` shift arrow buttons flanking all 5 rows and 5 columns of `BoardGrid`, keeping `↶ Undo (N)` inline in the Word Bar. Verified with `npm test` (18/18) and `npm run build`, pushed to GitHub Pages.
- **2026-11-24:** **v2 Core Gameplay Pivot (`EVD-341`):** Unified word-building, shifting, and deduction into one seamless loop. Removed the separate 3-target Wordle drawer, keyboard, and Insight currency. Replaced with a single prominent Hidden Target Word (`TargetWordBar.tsx`) above the 5×5 board: every valid board word automatically populates any matching positional letters in the target word and displays colour-independent `✓ / ↔ / ×` feedback in `ProbeHistory.tsx`. Players still earn Shift Tokens from board words and shift rows/columns via recessed neutral edge arrows (red glyphs when shifts are available). Verified with `npm test` (16/16), `npm run sim` (250 phases, 100% shift-requiring, 0 deadlocks), and `npm run build` (`13.99 KB` gzipped app chunk).
