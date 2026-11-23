# Wiring the code-drawn animations into the app (batches 1 + 2)

## Where it stands

- **Posters: switched for all 163 mapped Drive ids**, by data only. Library,
  builder, workout-mode and exercises-page cards for those clips now show the
  animation's poster.
- **Playback: not switched yet (0 of 163).** Tapping one of those cards still
  plays the original clip. Switching playback needs a small change in
  `js/core.js`, which is on the do-not-touch list, so it is written out below
  as a proposed diff instead of being applied. The diff was tried on a scratch
  copy outside the repo and works for all 163 ids.

Until that diff lands, a mapped card shows a drawn poster and then plays the
filmed clip. If that mismatch is not wanted on the live site, merge this
together with the `js/core.js` change rather than ahead of it.
`node tools/anim/wire.js --revert` puts the data files back exactly as they were.

## What was done

| | |
|---|---|
| Animations | 41 |
| Drive ids mapped (`clip-map.json`) | 163 |
| Drive ids whose poster now points at the animation | 163 |
| Drive ids whose playback was switched | 0 (see below) |
| Media added | `media/anim/<id>.mp4` + `media/anim/<id>.jpg`, 82 files, 2.5 MB |

One MP4 and one poster per animation, shared by every clip it replaces. The
MP4s are byte-for-byte copies of `tools/anim/out/<id>_360x640.mp4`; the posters
are `out/<id>_poster.png` converted with ffmpeg to 360x640 JPEG (`-q:v 4`,
5 - 10 kB each; the MP4s are at most 89 kB). Nothing in `tools/anim/out/` was changed.

Rows touched (only rows whose Drive id is in `clip-map.json`):

| File | Rows | Matched by |
|---|---|---|
| `videos/drive-catalog.json` | 145 | `driveId` (140 Drive reel rows), `drivePlayId` (5 release-file rows) |
| `js/catalog.json` | 5 | `drivePlayId` (the same 5 clips: plank, mountain climber x2, push-up + kicks, push-up + legs) |
| `data/drive_videos.json` | 158 | `fileId` |

140 ids are in both `drive-catalog.json` and `drive_videos.json`, 18 are only in
`drive_videos.json`, 5 are only `drivePlayId`s: 163 in total.

On each of those rows:

- `poster` -> `media/anim/<id>.jpg`
- `anim` -> the animation id (new field, ignored by the app today)
- `originalPoster` -> the previous `poster` value (`""` when the row had none)

No row was added or removed, and no `driveId`, `drivePlayId`, `fileId`, `file`,
`sourceUrl` or manifest entry was changed, so every original clip is still
referenced exactly as before. `videos/media-manifest.json`,
`data/exercises.json` and `videos/youtube-catalog.json` are untouched.

### Files

New:

- `media/anim/` - 41 `.mp4` + 41 `.jpg`
- `videos/anim-map.json` - animation id -> `media`, `poster`, `driveIds`, and per
  clip its name, original hosted path and the data rows that were wired
- `tools/anim/wire.js` - does all of the above; `--check` verifies, `--revert` undoes
- `tools/anim/clip-map.json` - the mapping this was generated from (it was untracked)
- `test/anim-wiring.test.js` - 6 tests for the map, the media files, the rows and the cards
- `tools/anim/WIRING_NOTES.md` - this file

Changed:

- `videos/drive-catalog.json`, `js/catalog.json`, `data/drive_videos.json` - as above
- `test/meta-illustrations.test.js`, `test/gap-reels-4.test.js` - they asserted that
  a row's `poster` is its own `assets/posters/ill-<driveId>.jpg`. For a row with
  `anim` they now check that illustration in `originalPoster`; the counts they
  assert (358 rows, 106 Drive rows) are unchanged.
- `tools/anim/README.md`, `videos/README.md` - a short pointer to this.

`tools/anim/.do-not-touch.txt` is not staged. No file on that list was edited.

## Why playback could not be switched with data

Read from `js/core.js` (not edited):

1. **`file` is the only field that can outrank a Drive id, and only as an
   `https://` URL.** `mediaMarkup()` plays `entry.file` when `hasRemoteFile()`
   is true, or when the row has a relative `file` and *no* `driveId` and no
   `youtubeId`. A relative `file` next to a `driveId` is ignored.
2. **Drive reel rows may not have `file` at all.** `test/honesty.test.js`
   (do-not-touch) asserts `e.file === undefined` for every `source: "drive"`
   row with a `sourceUrl`, and fixes the row counts, so those 140 rows can
   neither gain a `file` nor be re-labelled.
3. **Two rows cannot share one `file`.** `addDriveItemToCatalog()` drops a row
   whose `file` string equals an earlier row's, so one MP4 for several clips
   would remove all but the first from the library.
4. **The manifest cannot point at the repo.** `setMediaManifest()` keeps only
   the two `TrainerHub-media` hosts (`MEDIA_HOST_RX`) and paths shaped
   `<folder>/<20+ char id>.mp4` (`MEDIA_PATH_RX`); `test/hosted-mp4.test.js`
   also requires each path to end in its own Drive id.
5. **The exercises page never reads `file`.** `js/reel-library.js` builds each
   Drive card's player from `fileId` alone (`drivePreviewUrl(fileId)`), and
   `exercises.html` does not load the media manifest.

The 5 release-file rows were the one place a data-only switch was possible
(an absolute URL to the site's own copy in `file`, with `drivePlayId` moved
aside). I tried it and backed it out: it hard-codes the production origin, so
the clip 404s anywhere else until deployed, and it breaks 8 existing tests that
state the project's rules for those rows (catalog files are the verified
release mirror, they play through the live Drive copy, every played id is in
the manifest). Not worth it for 5 of 163 when the diff below covers all of them.

## Proposed change (not applied)

### `js/core.js` - about 30 lines, one function changed

Every Drive clip in the app already goes through `mp4Sources(driveId)`: the
card facade (`activateMediaFrame`), workout mode (`driveFrameMarkup`) and the
exercises page all ask it for a native-video URL before falling back to the
Drive player. Putting the animation first in that list switches playback
everywhere, keyed by the Drive ids in `videos/anim-map.json`.

```diff
@@ around line 3304
+	// Code-drawn animations (videos/anim-map.json, tools/anim/wire.js): a mapped
+	// Drive id plays the site's own media/anim/<id>.mp4 first; the hosted copy of
+	// the original clip and the Drive player stay behind it as fallbacks.
+	var ANIM_MAP = "videos/anim-map.json";
+	var ANIM_PATH_RX = /^media\/anim\/[a-z0-9-]+\.mp4$/;
+	var animFiles = Object.create(null);
+
+	function setAnimMap(m) {
+		animFiles = Object.create(null);
+		var anims = m && m.animations && typeof m.animations === "object" ? m.animations : {};
+		var n = 0;
+		Object.keys(anims).forEach(function (key) {
+			var a = anims[key] || {};
+			if (typeof a.media !== "string" || !ANIM_PATH_RX.test(a.media)) return;
+			(Array.isArray(a.driveIds) ? a.driveIds : []).forEach(function (id) {
+				if (!DRIVE_ID_RX.test(id)) return;
+				animFiles[id] = a.media;
+				n++;
+			});
+		});
+		return n;
+	}
+
 	function loadMediaManifest() {
 		if (!mediaManifestPromise)
-			mediaManifestPromise = loadJson(MEDIA_MANIFEST).then(setMediaManifest);
+			mediaManifestPromise = Promise.all([
+				loadJson(MEDIA_MANIFEST).then(setMediaManifest),
+				loadJson(ANIM_MAP).then(setAnimMap),
+			]).then(function (counts) {
+				return counts[0];
+			});
 		return mediaManifestPromise;
 	}

 	// Ordered MP4 URLs for a Drive id (empty when there is no hosted copy).
 	function mp4Sources(driveId) {
 		var path = Object.prototype.hasOwnProperty.call(mediaFiles, driveId)
 			? mediaFiles[driveId]
 			: "";
-		if (!path) return [];
-		return mediaHosts.map(function (h) {
-			return h + path;
-		});
+		var hosted = path
+			? mediaHosts.map(function (h) {
+					return h + path;
+				})
+			: [];
+		return animFiles[driveId] ? [assetUrl(animFiles[driveId])].concat(hosted) : hosted;
 	}
@@ in the exported api, next to setMediaManifest (around line 5251)
 		setMediaManifest: setMediaManifest,
+		setAnimMap: setAnimMap,
```

Checked on a scratch copy of `js/` outside the repo, with the real data files:

- `setAnimMap(videos/anim-map.json)` registers 163 ids.
- For all 163, `mp4Sources(id)[0]` is `./media/anim/<anim>.mp4` and the rest of
  the list is the same hosted copies as before (so a missing file falls back to
  the original, then to Drive, through the existing `mediaFallback()`).
- For the other 461 manifest ids the result is identical to today's; with no
  map loaded everything is identical to today's.
- All 145 catalog cards on an animation poster render the tap-to-play facade
  (list and workout-mode `eager` variants), and `activateMediaFrame()` swaps in
  a `<video>` whose `src` is the animation.

Not run against that copy: the repo's test suite and a real browser.

Optional, same place: the animations are short loops, and `mp4Video()` plays a
clip once. Adding `if (animFiles[driveId]) v.setAttribute("loop", "");` there
would loop them.

### `exercises.html` - one line

The exercises page does not load the media manifest, so its Drive cards open
the Drive player today. For the animations (and, as a side effect, the hosted
copies) to play there, start the load before the page's own `Promise.all`:

```diff
   renderCustomTemplates();
+  TH.loadMediaManifest();
   function readJson(res) {
```

The 18 ids that exist only in `data/drive_videos.json` are covered by these two
changes as well: they have no catalog row, and both the exercises page and
`reelClip()` reach them through `mp4Sources()`.

### Left as is

- **`library.html`, the 5 release-file rows.** That page calls `mediaMarkup()`
  with `preferVideo: true`, which plays the row's release `file` directly and
  skips the Drive/`mp4Sources` path. After the diff above those 5 play the
  animation on the home page, builder and workout mode, but not on
  `library.html`. Fixing it means either dropping `preferVideo` there or having
  `mediaMarkup()` check `mp4Sources(entry.drivePlayId)` first; both are
  do-not-touch files and a behaviour change beyond this task.
- **`sw.js`** does not precache `media/anim/`, so the animations need a
  connection the first time, like the hosted clips do.
- **6 Instagram reel cards** in `data/exercises.json` link to mapped Drive
  clips. They are link-out cards with their own reel poster
  (`test/reel-posters.test.js` fixes that path), not Drive ids, so they were
  left alone.
- `scripts/media_sync.py` rewrites only `videos/media-manifest.json`, which this
  does not touch. A script that regenerates `drive-catalog.json` or
  `drive_videos.json` from scratch would drop the `poster` / `anim` fields;
  re-run `node tools/anim/wire.js` after it (the wiring test fails until then).

## Checks

Run on this branch after the change (Node 22, offline except `npm ci`):

| Check | Result |
|---|---|
| `npm test` | 2088 tests, 0 fail: 2087 pass, 1 skipped with `node_modules` installed (2074 pass, 14 skipped without it). Before the change, without `node_modules`: 2082 tests, 2068 pass, 0 fail, 14 skipped. |
| `npm run validate:exercises` | ok - 90 exercises, 556 drive videos |
| `node tools/anim/wire.js --check` | in sync; apply then `--revert` leaves no diff |
| `npm run check:html` | fails with 11 issues, all in `docs/research/perplexity-body-composition/preview/index-live.html` (committed in #689, not touched here) |
| `npm run check:size` | fails: `index.html`, `*.html` and `js/*.js` are over their limits. None of those paths were changed here; the JSON and media files are not measured. |
| `npm run check:style` | fails with 5 errors, all formatting of the generator (`tools/anim/render.js`, `tools/anim/lib/*.js`), which was left as is, plus repo-wide warnings. The four JS files added or edited here report no errors (the two new ones were formatted with `biome format`). |
| `npm run test:e2e` (Playwright) | not run - needs browsers |

`node_modules` was missing; `npm ci` from the existing lockfile installed 33
packages for the size and style checks. No dependency was added.

Not verified: the posters and clips in a real browser, and that GitHub Pages
serves `media/anim/` (it should - the site is published from the repo root and
`assets/posters/` is served the same way).
