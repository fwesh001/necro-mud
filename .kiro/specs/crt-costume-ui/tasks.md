---
description: "CRT Costume UI & Wave 3 Frontend Integration Tasks"
---

# CRT Costume UI — Implementation Tasks

## Wave 2 — CRT Hardware & WebAudio Core
- [x] C2.1 Build `RetroSoundEngine` (`client/src/app/lib/sound-engine.ts`) with DTMF/2400-baud modem handshake, Model M keystrokes, degauss coil thump, 8-bit event SFX, and 60Hz CRT hum
- [x] C2.2 Upgrade `CrtBezel.tsx` & `globals.css` with 4 phosphor modes (`P1-GRN`, `P3-AMB`, `BLOOD`, `VGA-16`), degauss warp animation, cathode power collapse, and scanline intensity presets
- [x] C2.3 Build collapsible `TacticalHud.tsx` hardware deck with segmented LED HP bar, monster target selector, mechanical macro keycaps, and repo loader bar

## Wave 2.5 — Rubric Dominator Upgrades
- [x] C2.4 Route `RetroSoundEngine` through WebAudio `AnalyserNode` and expose `getAnalyserNode()`
- [x] C2.5 Build `PhosphorOscilloscope.tsx` real-time waveform canvas with idle 60Hz cathode ripple inside `TacticalHud.tsx`
- [x] C2.6 Build `PatchModal.tsx` Haunted BIOS Defect Patcher & Commit Scroll Spellbook overlay
- [x] C2.7 Extract pure ANSI/telemetry helpers (`client/src/app/lib/telemetry.ts`) and build 1,000-run `fast-check` PBT suite (`client/src/test/pbt/telemetry-ansi.test.ts` + `test:pbt`)

## Wave 3 — Backend Integration & Production Deployment
- [x] C3.1 Wire `TacticalHud.tsx` & `page.tsx` to Wave 3+ payloads (`repo-loaded`, `leaderboard-view`, `scan-result`, `narration` spellResult, `combat-result` patchResult, `status-view` scrolls/title/bugs)
- [x] C3.2 Add `CAST` & `TOP` macro keycaps and Commit Scroll inventory badges in `TacticalHud.tsx`
- [x] C3.3 Map `'repo-loaded'`, `'narration'` spell cues, `'combat-result'` hurt/patch/slain cues in `sound-engine.ts` per `FRONTEND_INTEGRATION.md`
- [x] C3.4 Support `NEXT_PUBLIC_WS_URL` in `Terminal.tsx` & `client/src/app/lib/endpoints.ts`, add `client/.env.example`, and add `/api/health` cold-start wake-up ping to `BootSequence.tsx`


### Wave 4 — Live GitHub Boot, 80-Col Auto-Scale & Onboarding UX (Ideas A–D)
- [x] **C4.1**: Upgrade backend boot (`server/src/index.ts`, `ws/handler.ts`, `dungeon.ts`, `github-parser.ts`) to hydrate live `fwesh001/necro-mud` rooms asynchronously on startup with real-file defect monsters and `ai-dm.ts` Groq (`gsk_`) / xAI Grok (`xai-`) auto-detection.
- [x] **C4.2**: Eliminate native white `.xterm-viewport` scrollbars and scrollbar arrow buttons in `globals.css` (`.crt-scroll`, `3px` phosphor thumb) and replace `FitAddon` col expansion with `ResizeObserver` `fontSize` auto-scaling locked to `80` cols in `Terminal.tsx`.
- [x] **C4.3**: Add unlocked exit parsing (`parseRoomDescription`) + 4-step `computeQuestObjective` in `telemetry.ts` with 1,000-run `fast-check` PBT assertions in `client/src/test/pbt/telemetry-ansi.test.ts`.
- [x] **C4.4**: Render Idea A (`Active Objective` banner) and Idea B (exit dots, combat/scroll dimming, local edge-case interception, and dismissible inline **Tactical Advisory** banner) plus Idea D (`PRESET_REPOS` chips) in `TacticalHud.tsx` and `page.tsx`.
- [x] **C4.5**: Build 3-tab `FieldGuideModal.tsx` (Idea C) and wire `[? GUIDE]` bezel/HUD buttons across `CrtBezel.tsx`, `TacticalHud.tsx`, and `page.tsx`.
