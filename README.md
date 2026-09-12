# Save the Line — level progression pass

Incremental gameplay pass built on the existing single-canvas, framework-free prototype.

## What changed

- The run is now finite: each level completes after **5 saves**, and the run completes after **4 levels / 20 saves**.
- Existing save / shots-on-target / save-percentage tracking is preserved across the whole run.
- A lightweight level-complete overlay pauses play between levels and reuses the existing start / retry UI.
- Attackers now visibly advance toward goal before the decisive shot.
- Passing attacks can feed a receiver who is also moving toward goal before shooting.
- Shot release positions therefore vary vertically instead of always coming from the original spawn line.
- Difficulty is level-gated rather than adding a new architecture:
  - Level 1: direct advancing attacks, straight shots.
  - Level 2: some passing, slightly deeper runs, rare light curve.
  - Level 3: more passes, occasional three-player build-up, more curve.
  - Level 4: frequent complex build-up, deeper runs, strongest readable curve.
- Wide shots still do not count as shots on target.
- Conceded on-target shots still count against save percentage without ending the level.
- Keeper drag / pointer controls, keyboard controls, personal best storage and TopStreak presentation are unchanged.

## Files

- `index.html`
- `style.css`
- `game.js`
