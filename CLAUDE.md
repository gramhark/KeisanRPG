# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**マスバトール** (MathBattler) is a browser-based arithmetic battle RPG for kids. Players solve math problems to fight monsters across 10 stages. There is no build system — the game runs directly by opening `index.html` in a browser.

## Running the Game

Open `index.html` directly in a browser. No server, npm, or build step is needed.

## Adding or Updating Monster Images

After adding/removing images in `assets/image/monster/`, regenerate the monster list:

```
update_monsters.bat
```

This runs `tools/update_monsters.ps1`, which scans `assets/image/monster/` and writes `assets/monster_list.js` (the `window.MONSTER_ASSETS` array). **The game cannot find new monster images without this step.**

### Monster filename naming conventions

The filename prefix determines the monster type and stage:
- `01_` through `09_` — normal monsters for that stage number
- `Boss01_` through `Boss16_` — boss monsters (stage 10), selected by difficulty
- `Boss16next_` — the final boss's true form (transforms at low HP)
- `Heal_` — healing monsters
- `Rare_` — rare monsters
- The sort order in `monster_list.js` matters for note categorization

## Architecture

Game logic is split across `js/` by feature. Load order in `index.html` matters (dependencies resolved via `<script>` tag order):

- **`assets/monster_list.js`** — auto-generated array `window.MONSTER_ASSETS` of image filenames. Must be loaded first.
- **`js/constants.js`** — `CONSTANTS`, `FORM_CONFIG`, `GameState`, `SWORD_DATA`, `SHIELD_DATA`, drop rate arrays.
- **`js/sound.js`** — `SoundManager` class.
- **`js/math_problem.js`** — `MathProblem` class.
- **`js/monster.js`** — `Monster` class + helper functions (`getMonsterAssets`, `findMonsterImage`, `calculateTotalMonsters`).
- **`js/game.js`** — `Game` class (main controller, ~1500 lines).
- **`js/main.js`** — `DOMContentLoaded` initialization.

`script.js.bak` is the original pre-split backup.

### CSS Structure

Styles are split across `css/` by feature. Load order in `index.html` matters:

| File | Contents |
|---|---|
| `css/base.css` | CSS variables (`:root`), global reset, `body`, `#app`, `.screen` |
| `css/components.css` | Shared UI: buttons, inputs, HP/timer bars, attack effects & keyframes, message overlay |
| `css/portrait.css` | All `#app.portrait-mode` overrides (800×1600 virtual canvas) |
| `css/overlay.css` | Overlays & modals: interval screen, request form, equipment drop, image zoom |
| `css/note.css` | Monster note (図鑑) grid, cards, and footer |

`style.css.bak` is the original pre-split backup.

### JS Classes

| File | Class / Contents | Responsibility |
|---|---|---|
| `js/constants.js` | constants & data | Game constants, state enum, equipment data tables |
| `js/sound.js` | `SoundManager` | Wraps all `<audio>` elements. Handles BGM fade-in/out, SE playback, iOS AudioContext unlock. |
| `js/math_problem.js` | `MathProblem` | Generates arithmetic problems. Boss mode forces carry/borrow in ±. Division always produces integers ≥ 2. |
| `js/monster.js` | `Monster` + helpers | Holds monster stats (HP, attack, type). Derives `bossId` (1–16) from digit/operator settings to pick boss image. |
| `js/game.js` | `Game` | Main controller. Manages game state machine, turn loop, UI rendering, equipment, monster note (図鑑), and LocalStorage. |
| `js/main.js` | init | DOMContentLoaded bootstrap: restores player name, runs `calculateTotalMonsters()`, instantiates `Game`. |

### Game State Machine (`GameState`)

```
SETUP → (startGame) → INTERVAL → (startBattle) → BATTLE
  ↑                                                   |
  └───── RESULT ←──── (all monsters defeated) ────────┤
                                                       |
  GAME_OVER ←──────── (player HP = 0) ────────────────┘
```

`NOTE` is an overlay state on top of `SETUP`.

### Responsive Layout

`Game.adjustScale()` scales the `#app` div to fit any screen size using CSS `transform: scale()`. Virtual base resolution is **800×1600 (portrait)**. Always uses portrait layout regardless of device orientation. A small inline script at the top of `<body>` pre-assigns the `portrait-mode` class before JS loads.

### Boss ID Mapping

The boss fought on stage 10 is determined by the player's selected difficulty:

| Left digits | Right digits | Boss IDs |
|---|---|---|
| 1 | 1 | Boss01–04 |
| 1 | 2 | Boss05–08 |
| 2 | 1 | Boss09–12 |
| 2 | 2 | Boss13–16 |

Operator count (1–4) selects within each group. `Boss16next_` is the "true form" variant of Boss16.

### Data Persistence

- Player name: `localStorage` key `math_battle_player_name`
- Monster collection (図鑑): `localStorage` key `math_battle_collection_v1` (JSON object keyed by monster name)
- Backup save/load: JSON file download/upload with a simple checksum (`_checksum` field, sum of char codes in hex)

### Equipment System

`SWORD_DATA` and `SHIELD_DATA` are arrays indexed by level (0 = base). Drop rates are in `SWORD_DROP_RATE` / `SHIELD_DROP_RATE` arrays, indexed by current level. Shields have durability that decrements on block; at 0 they break.

### Audio

All audio is `.webm` format under `assets/audio/BGM/` and `assets/audio/SE/`. BGM tracks continue playing across monsters (battle BGM resumes from where it paused when returning from boss/rare/heal tracks). iOS autoplay is unlocked via a silent AudioContext buffer on the first user interaction.

### Idea Submission Form

`FORM_CONFIG` at the top of `js/constants.js` holds the Google Forms action URL and entry ID. Submissions use a `fetch` with `no-cors` mode.
