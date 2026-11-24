# Oh! Shift — Game Design and Functional Specification

**Version:** 0.1 — Initial design baseline  
**Created:** 23 November 2026  
**Status:** Draft for review; unvalidated gameplay parameters are explicitly marked *proposed*  
**Product:** Oh! Shift  
**Platforms:** iPhone and iPad via installable Progressive Web App (PWA)

## 1. Document provenance

- **Human product owner:** User commissioning the game; owns product vision and final decisions.
- **AI contributor:** OpenAI ChatGPT (GPT-6), responsible for drafting and structuring this specification.
- **Creation date:** 23 November 2026.
- **Last revision:** 23 November 2026.
- **Originating discussion:** ChatGPT conversation about creating a Wordle/Scrabble-inspired, deduction-led word game for travel, culminating in the name **Oh! Shift**. A direct conversation URL was not available; no URL has been invented.
- **Related resources:** No external Jira, Confluence, design or source-code resources supplied yet.
- **Authorship:** The concept, priorities and name were developed collaboratively in the originating discussion; detailed numerical rules below are design proposals, not user-approved decisions.

## 2. Executive summary

Oh! Shift is an offline-first, touch-friendly word puzzle combining adjacent-letter word building, earned manipulation of a persistent 5×5 board, and deductive discovery of hidden target words. The core loop is **find words → earn shifts and clues → reposition letters → deduce and solve targets → advance the board**. It is designed for extended, interruption-friendly play on an iPhone or iPad. Solo play is the first release; asynchronous competition and cooperative play are planned without making network access a prerequisite for solo mode.

## 3. Design goals and agreed decisions

| ID | Requirement | Status |
|---|---|---|
| G-01 | Game name: **Oh! Shift** | Agreed |
| G-02 | Deduction is the primary emphasis, with vocabulary and strategy | Agreed |
| G-03 | Both solo and multiplayer play are desired | Agreed |
| G-04 | Support long sessions, particularly while travelling | Agreed |
| G-05 | Must play comfortably on iPhone and iPad | Agreed |
| G-06 | Compact 5×5 letter board | Agreed |
| G-07 | Build words by connecting adjacent letters, including diagonals | Established concept |
| G-08 | Shift entire rows or columns with wraparound | Agreed direction |
| G-09 | Players earn shifts by finding words rather than shifting freely | Agreed |
| G-10 | Hidden word objectives and deduction feedback | Established concept |
| G-11 | PWA, offline solo play, save and resume | Established concept |

### 3.1 Non-goals for initial release

- Real-money wagering or gambling.
- Time-pressure as the primary challenge.
- A massive board requiring constant pinch-zoom.
- Always-online requirements for solo gameplay.
- Competitive real-time multiplayer in the first release.

## 4. Core gameplay

### 4.1 Board

- 5 rows × 5 columns; 25 letter tiles.
- Each tile contains one letter, with optional visual modifiers in later versions.
- The board remains visible and compact on a portrait iPhone.
- Words are formed by selecting **three or more** tiles (proposed minimum).
- Each successive tile must be horizontally, vertically or diagonally adjacent to the previous tile.
- A tile cannot be reused within the same submitted word.
- Word validity is checked against a packaged, versioned English dictionary.
- Input supports tapping and dragging; tapping is the accessible fallback.

### 4.2 Word submission

1. Player selects a connected sequence of tiles.
2. The proposed word appears in a preview area.
3. Player submits or clears the selection.
4. The engine checks adjacency, uniqueness, length and dictionary validity.
5. A valid word awards points and progress towards earning shifts and deduction clues.
6. Submitted letters **remain on the board**; words do not automatically consume tiles.
7. Repeat submissions of the same word within a board phase do not earn points or resources.

**Proposed phase rule:** A phase begins when a new board objective set is issued and ends when the player completes its target or elects to refresh it. Previously found words can become eligible again in a later phase, preventing permanent exhaustion of the dictionary.

### 4.3 Shifting

- Player may shift any row left or right, or any column up or down.
- A one-step shift cyclically wraps the displaced letter to the opposite end.
- Example: `S T A R E` shifted right becomes `E S T A R`.
- A shift changes only the selected row or column.
- Each one-step shift costs **one shift token** (proposed).
- A two-step shift costs two tokens; it is equivalent to two one-step shifts.
- Player must possess sufficient tokens; no negative balance.
- Shift controls are adjacent to the board or invoked by selecting a row/column; no reliance on small drag targets.
- Shift operations animate briefly but resolve instantly in the deterministic game engine.
- Undo is available for an uncommitted shift only (proposed), with a clearly defined commit boundary so scoring cannot be exploited.

### 4.4 Earning shifts — proposed economy

- Every **two distinct valid words** submitted in a phase earns one shift token.
- A word of **six or more letters** earns one additional shift token.
- A token cap of **eight** avoids stockpiling and keeps choices meaningful.
- Starting allowance: **two shift tokens** to prevent a dead start.
- These values must be calibrated through automated simulation and playtesting.

**Critical anti-deadlock rule:** The player must never be left with no affordable shift and no attainable eligible word. Provide a deterministic rescue mechanism (e.g., a limited-cost refresh, or an automatically granted recovery shift after the engine detects a deadlock). Rescue should carry a scoring trade-off rather than ending the game.

## 5. Deduction system

### 5.1 Hidden targets

- Each phase presents **three hidden target words** (proposed), of increasing difficulty.
- Targets are generated or selected only if they are valid under the same dictionary and board-manipulation rules as normal words.
- Each target has an indicated length and at least one initial clue.
- Additional clues can be earned by forming words or completing objectives.
- Players can submit a guess for a target independently of constructing that target on the board; this preserves a genuine Wordle-style deduction mechanic.
- A correct guess solves the target and earns a reward. Incorrect guesses provide positional feedback and incur a defined cost.

### 5.2 Guess feedback

- Correct letter in correct position: green.
- Correct letter in wrong position: amber.
- Letter absent after accounting for duplicate occurrences: grey.
- Duplicate-letter evaluation must use the standard two-pass algorithm: mark exact matches, then allocate remaining letter counts to misplaced matches.
- Feedback must also be represented through icons or text, not colour alone.

### 5.3 How board play informs deduction

**Proposed rule:** Submitting distinct valid board words earns **insight points**. Insight points can reveal clues for a selected hidden target, such as one confirmed letter, one excluded letter, or a relationship between targets. Players choose which target receives the clue.

This separation is deliberate: **finding words generates resources; deduction spends information efficiently**. It avoids requiring the player to stumble upon an exact hidden target accidentally.

### 5.4 Target relationships — proposed advanced feature

- Some targets share a declared relationship: common letter count, shared first/last letter, or one-letter transformation.
- Relationships are generated from the actual target words and verified before display.
- Solving one target may reveal a new clue for another.
- Start with a limited relationship vocabulary to avoid ambiguous logic.

### 5.5 Guess economy — proposed

- Each target permits up to **six guesses** before a paid hint or reset is needed.
- An incorrect guess costs **one insight point**; if no insight points remain, a limited free attempt or recovery path remains available.
- A correct solve gives a significant score bonus and unlocks a new objective.
- Do not permanently block progression after exhausting guesses.

## 6. Scoring and progression

### 6.1 Proposed scoring

| Event | Initial formula / award |
|---|---|
| Valid new board word | `length²` points (3 letters = 9; 6 = 36) |
| Correct hidden target | `100 + 25 × (target length − 3)` |
| Efficient solve | `+20` for each unused guess below six |
| Phase completed | `+100` |
| Rescue shift or refresh | `−50` (score floor remains zero) |

**Note:** Numerical values are provisional. Balance for rewarding deduction over repeated short-word harvesting.

### 6.2 Long-session structure

- A run consists of an **open-ended sequence of phases**, not a short fixed puzzle.
- Completing phase targets grants points and a new objective set.
- The board persists between phases, with periodic controlled letter changes to maintain solvability and variety.
- Difficulty increases through target length, relationship complexity, and reduced starting information, not obscure words alone.
- Milestones at 5, 10, 20, 40+ phases provide a sense of progress without requiring one uninterrupted session.
- Player may pause at any point; no active countdown timer.
- Optional statistics: total score, phases cleared, targets solved, deduction efficiency, longest word, shifts spent, longest run.

### 6.3 Board refresh and solvability

A persistent static board can become repetitive. The production generator must introduce new configurations while preserving player agency:

- **Proposed:** At each completed phase, replace 3–5 tiles with seeded new letters, then generate the next target set.
- Validate that the new board supports a minimum number of distinct playable words and a viable path to earn shifts.
- Ensure hidden targets are solvable through clues/guesses even when their letters are not currently constructible on the board.
- Avoid trivial repetitive boards and impossible word economies.
- Board generation must be deterministic for a given seed and dictionary version.

## 7. Game modes

### 7.1 Solo — MVP

- Endless run; auto-save; fully offline.
- Optional seeded daily challenge as a separate mode, cached when available.
- Difficulty presets: relaxed, standard, expert (proposed).
- Local records and run history.

### 7.2 Competitive — later phase

- Two or more players play the **same seed, dictionary version and objectives** independently.
- Compare score after a fixed number of phases or a pre-agreed turn budget; avoid comparing raw scores from unequal-length runs.
- Asynchronous turn-based results are preferred over real-time latency-sensitive play.
- Support online synchronisation when available; allow offline progress and later result submission subject to integrity checks.

### 7.3 Cooperative — later phase

- Players work on a shared board and shared resource pool.
- Turn ownership or an authoritative server prevents conflicting shifts.
- Shared notes, clues and target progress.
- Cooperative sessions require connectivity for synchronisation, but local solo play never does.

## 8. UX and accessibility

### 8.1 iPhone

- Portrait-first layout with a 5×5 grid sized to fit without zoom.
- Score and token counts above board; current target and guess controls below.
- Secondary targets, word history and rules in collapsible sheets.
- Large controls, comfortable thumb reach, no hover dependencies.
- Respect safe areas, Dynamic Type where practical and reduced-motion settings.

### 8.2 iPad

- Same rules and board dimensions; responsive larger tile sizes.
- Landscape layout may show target clues, word history and scoring beside the board.
- Portrait layout remains fully supported.

### 8.3 Interaction and accessibility requirements

- Minimum practical touch target around 44 × 44 CSS pixels.
- VoiceOver labels announce letter, row, column, selected state and available actions.
- Accessible alternative to swipe/drag for selecting words and shifting.
- Colour-independent deduction feedback.
- Optional sound and haptics, off by default in quiet mode.
- Reduced motion, high contrast and readable typography.

## 9. PWA and technical architecture

### 9.1 Suggested stack (implementation proposal)

- TypeScript, React and Vite, with a responsive CSS design system.
- Pure TypeScript **game engine** isolated from rendering and network code.
- IndexedDB for persistent local state, via a small storage abstraction.
- Service worker for offline shell, dictionary assets and cached static resources.
- Web App Manifest for Add to Home Screen and standalone display.
- Optional server later for accounts, multiplayer, leaderboards and cross-device sync.

### 9.2 Offline requirements

- A previously installed/loaded app launches and plays without connectivity.
- Bundle the gameplay dictionary and required generation data for offline use; version them.
- No network request in the core solo gameplay path.
- Save after every committed action, not only on page unload.
- On reconnection, sync optional multiplayer data without overwriting local progress.
- Test iOS Safari/PWA lifecycle behaviour, including app suspension, service-worker updates and storage eviction risk.

### 9.3 Data model — indicative

```ts
type GameState = {
  schemaVersion: number;
  gameId: string;
  seed: string;
  dictionaryVersion: string;
  mode: 'solo' | 'competitive' | 'cooperative';
  phase: number;
  board: string[][]; // 5x5
  score: number;
  shiftTokens: number;
  insightPoints: number;
  foundWords: string[];
  targets: TargetState[];
  actionLog: GameAction[];
  updatedAt: string;
};

type TargetState = {
  id: string;
  length: number;
  clueIds: string[];
  guesses: Array<{ word: string; feedback: ('exact'|'present'|'absent')[] }>;
  solved: boolean;
};
```

**Security note:** For a casual offline solo game, storing target answers locally is acceptable. Competitive integrity cannot rely on a client-secret answer: use server verification or tamper-evident result handling as appropriate.

### 9.4 Engine responsibilities

- Generate deterministic boards and targets.
- Validate word paths and dictionary membership.
- Apply wraparound row/column shifts.
- Award resources and score without duplicate farming.
- Evaluate guesses with duplicate-letter correctness.
- Check phase completion, deadlocks and rescue rules.
- Produce serialisable, replayable actions for save/resume and tests.

## 10. Core rules as testable acceptance criteria

1. Selecting non-adjacent tiles does not create a valid path.
2. A tile cannot be selected twice in the same word.
3. A submitted word must exist in the versioned dictionary and meet the minimum length.
4. Repeating a word in the same phase yields no additional score or resources.
5. A right shift of `[S,T,A,R,E]` yields `[E,S,T,A,R]`; a subsequent left shift restores the original row.
6. Column shifts behave identically with vertical wraparound.
7. Shifts cannot reduce token balance below zero.
8. Every valid committed move is saved and survives app restart.
9. Solo mode remains playable in airplane mode after installation/assets have been cached.
10. Guess feedback handles duplicate letters correctly.
11. Clues never contradict the underlying answer.
12. Every generated phase is validated for word availability and has a recovery path from deadlock.
13. All core actions are operable on an iPhone portrait viewport without horizontal page scrolling.
14. A seeded game produces the same starting board, objectives and rules on both iPhone and iPad.
15. Optional multiplayer features do not compromise offline solo functionality.

## 11. Delivery roadmap

### Milestone 1 — Playable mechanics prototype

- Responsive 5×5 board; word path selection; dictionary validation.
- Row and column shift controls with wraparound.
- Earned shift economy, scoring and basic history.
- Basic local save/resume.

**Exit criterion:** A player can play a meaningful 15-minute session without manual resets or deadlocks.

### Milestone 2 — Deduction and long-form progression

- Hidden target system, guesses and clue feedback.
- Insight economy and phase progression.
- Seeded generator with solvability checks and rescue rules.
- Full offline PWA packaging.

**Exit criterion:** Repeated 60–120 minute solo sessions remain varied, recoverable and enjoyable in offline testing.

### Milestone 3 — Polish and balance

- Accessibility, sound/haptics, onboarding, statistics.
- Telemetry strictly opt-in and nonessential to offline play.
- Dictionary QA and scoring balance; iPhone/iPad device testing.

### Milestone 4 — Multiplayer

- Seeded asynchronous challenges and score comparison.
- Optional account/sync layer.
- Cooperative shared board as a subsequent enhancement.

## 12. Risks and design questions

| Risk / question | Proposed mitigation |
|---|---|
| Repeated short words become optimal | Distinct-word-only rewards, phase resets, tuning and diminishing returns |
| Shift scarcity causes deadlocks | Starting tokens, generation validation and rescue mechanism |
| Static board becomes repetitive | Controlled tile replacement between phases |
| Deduction feels detached from shifting | Add shift-related clues/objectives during playtesting, without making target answers inaccessible |
| Small-screen controls become crowded | Contextual panels and tap-based row/column controls |
| English word list feels arbitrary | Curated dictionary, clear proper-noun/plural policy and transparent word rejection |
| Infinite run has no meaningful endpoint | Milestones, optional finite challenges and run statistics |
| Competitive fairness is undermined by offline tampering | Server verification for ranked modes; casual unranked offline competition |

### 12.1 Decisions for product-owner review

1. **Deduction integration:** Should hidden targets be guessable independently, or must a target also be physically constructed on the shifted board? This is the most important unresolved design question.
2. **Shift earning:** Is two valid words per token an enjoyable pace?
3. **Board evolution:** Should tiles change only between phases, or occasionally within phases?
4. **Dictionary:** UK English defaults; decide treatment of inflections, slang, archaic terms and proper nouns.
5. **Game endpoint:** Endless by default, with optional finite campaigns or challenges?
6. **Multiplayer:** Prioritise asynchronous competition or cooperative shared-board mode?

## 13. Recommended immediate next step

Build a minimal, instrumented prototype containing only word selection, earned shifts, and one hidden target. Test whether shifting materially helps deduction and whether the resource economy is satisfying. Avoid building extensive progression, accounts or multiplayer before this central loop proves enjoyable.

---

**Specification status:** Initial draft, suitable as a starting brief for an implementation agent, not yet a final locked ruleset.
