# Graph Report - .  (2026-07-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 220 nodes · 179 edges · 57 communities (47 shown, 10 thin omitted)
- Extraction: 70% EXTRACTED · 30% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.56)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ca9d48ca`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- generateWorkoutProgram.test.js
- analyzeProgressTrends.test.js
- calculateChurnRisk.test.js
- run function (root index)
- frontend/index.html
- advance
- createClientDataShareToken.js
- suggestNextVolume.test.js
- oneRepMax.test.js
- WorkoutRequest
- togglePause
- bmi.test.js
- evaluateChurnReferralTrigger.js
- processReferralReward.js
- loadWorkout
- startCountdown
- factory-ci.yml
- clearCountdown
- exitWorkout (inferred)
- formatTime
- Hub object (root index)
- names lookup (root index)
- TrainerHub Project

## God Nodes (most connected - your core abstractions)
1. `createClientDataShareToken()` - 4 edges
2. `generateWorkoutProgram()` - 4 edges
3. `run function (root index)` - 4 edges
4. `renderStep` - 4 edges
5. `advance` - 4 edges
6. `WorkoutRequest` - 3 edges
7. `evaluateChurnReferralTrigger()` - 3 edges
8. `workoutVolume()` - 3 edges
9. `index.html (root)` - 3 edges
10. `togglePause` - 3 edges

## Surprising Connections (you probably didn't know these)
- `run function (root index)` --calls--> `generateWorkoutProgram()`  [EXTRACTED]
  index.html → lib/generateWorkoutProgram.js
- `run function (root index)` --calls--> `workoutVolume()`  [EXTRACTED]
  index.html → lib/workoutVolume.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Workout Program Generation Modules** — lib_generateworkoutprogram, lib_filterexercises, lib_workoutvolume [EXTRACTED 1.00]
- **Workout Mode Flow Functions** — frontend_workout_mode_loadworkout, frontend_workout_mode_buildsteps, frontend_workout_mode_renderstep, frontend_workout_mode_renderexercise, frontend_workout_mode_renderrest, frontend_workout_mode_updateprogress, frontend_workout_mode_startcountdown, frontend_workout_mode_updateclockdisplay, frontend_workout_mode_togglepause, frontend_workout_mode_markesetdone, frontend_workout_mode_advance, frontend_workout_mode_skipcurrent [EXTRACTED 1.00]

## Communities (57 total, 10 thin omitted)

### Community 0 - "generateWorkoutProgram.test.js"
Cohesion: 0.07
Nodes (27): allInjuriesProfile, allInjuriesResult, assert, clampProfile, clampResult, clampResult2, emptyGoalsProfile, emptyGoalsResult (+19 more)

### Community 1 - "analyzeProgressTrends.test.js"
Cohesion: 0.10
Nodes (20): analyzeProgressTrends(), aggressiveLossInput, aggressiveLossResult, { analyzeProgressTrends }, assert, decliningInput, decliningResult, emptyResult (+12 more)

### Community 2 - "calculateChurnRisk.test.js"
Cohesion: 0.11
Nodes (17): calculateChurnRisk(), assert, { calculateChurnRisk }, history1, history10, history12, history4, history5 (+9 more)

### Community 3 - "run function (root index)"
Cohesion: 0.18
Nodes (9): index.html (root), $ helper (root index), esc helper (root index), run function (root index), generateId(), generateWorkoutProgram(), assert, { workoutVolume } (+1 more)

### Community 4 - "frontend/index.html"
Cohesion: 0.22
Nodes (8): closePricing (inferred), hideToast (inferred), logoutUser (inferred), openAuth (inferred), openPricing (inferred), switchTab (inferred), toggleUserMenu (inferred), track (inferred)

### Community 5 - "advance"
Cohesion: 0.25
Nodes (9): advance, buildClockSVG, finishWorkout (inferred), markSetDone, renderExercise, renderRest, renderStep, skipCurrent (+1 more)

### Community 6 - "createClientDataShareToken.js"
Cohesion: 0.36
Nodes (5): ALLOWED_SCOPES, base64urlEncode(), createClientDataShareToken(), crypto, hmacSha256Base64url()

### Community 7 - "suggestNextVolume.test.js"
Cohesion: 0.40
Nodes (3): suggestNextVolume(), assert, { suggestNextVolume }

### Community 8 - "oneRepMax.test.js"
Cohesion: 0.50
Nodes (3): oneRepMax(), assert, { oneRepMax }

### Community 9 - "WorkoutRequest"
Cohesion: 0.67
Nodes (3): parse_workout(), WorkoutRequest, BaseModel

### Community 10 - "togglePause"
Cohesion: 0.50
Nodes (4): pauseElapsedTimer, resumeCurrentStep, startElapsedTimer, togglePause

### Community 12 - "evaluateChurnReferralTrigger.js"
Cohesion: 0.83
Nodes (3): evaluateChurnReferralTrigger(), getPromptHistory(), recordPrompt()

### Community 14 - "loadWorkout"
Cohesion: 0.67
Nodes (3): buildSteps, DOMContentLoaded handler, loadWorkout

## Knowledge Gaps
- **101 isolated node(s):** `assert`, `{ analyzeProgressTrends }`, `normalInput`, `normalResult`, `singleEntry` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `generateWorkoutProgram()` connect `run function (root index)` to `generateWorkoutProgram.test.js`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `assert`, `{ analyzeProgressTrends }`, `normalInput` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `generateWorkoutProgram.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `analyzeProgressTrends.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `calculateChurnRisk.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._