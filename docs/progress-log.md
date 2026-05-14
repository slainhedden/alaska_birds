# Progress Log

## Checkpoint 1: Research And Dataset

Changed:
- Confirmed the repo was empty and created a Vite + React + TypeScript structure.
- Researched Southcentral Alaska / Mat-Su / Talkeetna-area June birds with regional checklists, wetland guides, Audubon Alaska, ADFG, eBird context, Cornell guide links, Xeno-canto source links, and Wikimedia Commons media-source candidates.
- Created `src/data/birds.ts` with 52 complete bird records, each including common name, scientific name, likelihood tier, priority, appearance, habitat, field marks, sound cues, memory hook, source notes, image placeholder/source, sound source, and learning tags.

Verified:
- Mat-Su checklist URL responded successfully with HTTP 200.
- Dataset has runtime duplicate-id and required-field checks.

Commands run:
- `npm install`
- `curl -I -L 'https://matsubirders.org/wp-content/uploads/2016/07/checklist-mat-su.pdf'`

Remaining:
- Browser validation, Playwright tests, and visual polish.

Assumptions:
- Mid-June trip timing.
- Cabin/Indian River context means boreal woods, river edge, wetland/lake access, and possible mountain-edge habitat.

## Checkpoint 2: App Shell And Browse/Detail

Changed:
- Added app shell, mode navigation, progress summary, bird filters, bird cards, and bird detail view.
- Added responsive styling with compact field-guide cards and source/media notes.

Verified:
- `npm run lint` passed.
- `npm run build` passed.

Commands run:
- `npm run lint`
- `npm run build`

Remaining:
- Playwright flow validation and browser inspection.

## Checkpoint 3: Flashcards And Quiz

Changed:
- Added flashcard mode with reveal, next, and known controls.
- Added quiz mode with deterministic clues, answer choices, feedback, and progress updates.

Verified:
- `npm run lint` passed after component additions.
- `npm run build` passed after component additions.

Commands run:
- `npm run lint`
- `npm run build`

Remaining:
- Playwright flow validation and visual polish.

## Checkpoint 4: Sound Quiz And Mastery

Changed:
- Added sound quiz mode with an audio-backed path for verified Commons audio and a call-clue path for birds without embedded audio.
- Added localStorage mastery state, answer tracking, reset, and detail-level mastery controls.

Verified:
- `npm run lint` passed.
- `npm run build` passed.

Commands run:
- `npm run lint`
- `npm run build`

Remaining:
- Run Playwright tests, inspect layout in browser, iterate on failures.

## Checkpoint 5: Playwright Core Flows

Changed:
- Added `tests/bird-learner.spec.ts` with an end-to-end Playwright flow covering page load, bird cards, search, likelihood filter, habitat filter, bird detail, flashcard advance, quiz answer handling, sound quiz with embedded audio, sound quiz without embedded audio, and mobile viewport overflow.
- Switched dev/test port to `5173` because macOS Control Center/AirTunes owns port `5000` on this machine and returns HTTP 403 there.
- Configured Playwright to use the installed Chromium channel because the headless-shell artifact download timed out after the main Chromium package installed.

Verified:
- `npm run test` passed.
- Data-shape inspection found 52 birds, 2 embedded-audio birds, and no missing required fields.

Commands run:
- `npx playwright install chromium` (main browser installed; headless shell download timed out, so config uses Chromium channel)
- `npm run test`
- `node --experimental-strip-types -e "import('./src/data/birds.ts').then(...)"`

Remaining:
- Final visual polish pass and full validation.

## Checkpoint 6: Visual Polish And Full Validation

Changed:
- Added a visible audio-backed wrapper so the sound quiz clearly shows when embedded audio is available.
- Kept the layout compact on desktop with a sticky detail panel and stacked controls on mobile.
- Captured desktop and mobile screenshots for visual inspection.

Verified:
- Desktop screenshot: `test-results/desktop-home.png`
- Mobile screenshot: `test-results/mobile-home.png`
- No obvious text overlap or broken mobile layout in screenshots.
- `npm run validate` passed: lint, build, and Playwright.

Commands run:
- `npx playwright screenshot --browser chromium --channel chromium --viewport-size=1440,1000 --wait-for-selector='[data-testid="bird-card"]' http://127.0.0.1:5173/ test-results/desktop-home.png`
- `npx playwright screenshot --browser chromium --channel chromium --viewport-size=390,844 --wait-for-selector='[data-testid="bird-card"]' http://127.0.0.1:5173/ test-results/mobile-home.png`
- `npm run validate`

Remaining:
- No blocking work remains. Media can be expanded later only after per-file license review.

## Follow-up: Local Audio Dataset Ingest

Changed:
- Added `scripts/ingest-audio.mjs` for manually downloaded BirdCLEF/Kaggle/Xeno-canto-style datasets.
- Added support for unpacked folders and `.zip`, `.tar`, `.tgz`, and `.tar.gz` archives under `data/audio-source/`.
- Added generated local audio manifest support through `src/data/localAudioManifest.ts`.
- Updated bird detail, card audio indicators, and sound quiz to prefer local ingested clips when available.
- Added `docs/audio-ingest.md` with source guidance, manual download workflow, supported formats, commands, and licensing caveats.
- Added `scripts/test-audio-ingest.mjs` plus a tiny BirdCLEF-style fixture to verify unpacked and zipped ingest behavior.

Verified:
- `npm run test:audio-ingest` passed.
- Temporary real-manifest integration check passed: generated a Common Raven local-audio manifest from the fixture, ran `npm run build`, then restored the default empty manifest and removed fixture public audio.
- Manual in-app browser verification passed on `http://localhost:5173/`: home/cards, search, likelihood filter, habitat filter, bird detail, flashcards, quiz, audio-backed sound quiz, no-audio sound quiz, and responsive/mobile view.
- Final `npm run validate` passed after restoring the clean manifest.

Commands run:
- `npm run test:audio-ingest`
- `node scripts/ingest-audio.mjs --source data/audio-fixtures --clean --limit-per-bird 2`
- `npm run build`
- `npm run validate`

Remaining:
- No blocking work remains. Real bird audio can be added by placing downloaded archives or unpacked datasets in `data/audio-source/` and running `npm run ingest:audio`.

## Follow-up: Real Bird Images And Audio Placeholders

Changed:
- Added `scripts/fetch-wikimedia-images.mjs` to query Wikimedia Commons image metadata with throttling and generate `src/data/imageManifest.ts`.
- Generated 260 image entries: five Commons image records for each of the 52 birds.
- Added `scripts/test-image-manifest.mjs` and `npm run test:images` to verify every bird has images and required license/source metadata.
- Updated bird cards to show real image thumbnails with glyph fallback.
- Updated bird detail to show a labeled gallery with adult, male, female, juvenile, immature, and pair labels where source metadata exposes those cues.
- Preserved the audio plug-in path: no-audio birds still show source/placeholders, and local audio ingest still overrides built-in audio when a manifest is generated.

Verified:
- `npm run fetch:images` completed with 52 birds, 52 birds with images, and 260 total images.
- `npm run test:images` passed with no missing image records.
- `npm run validate` passed.
- Manual in-app browser verification passed on `http://localhost:5173/`: 52 image cards, labeled detail gallery, detail audio where available, no-audio placeholders, audio-backed sound quiz, and no-audio sound quiz.

Commands run:
- `npm run fetch:images`
- `npm run test:images`
- `npm run validate`

Remaining:
- No blocking work remains. Commons labels are best-effort from file titles/descriptions; ambiguous images are labeled `adult/unspecified`.

## Follow-up: Expanded Deck And Local Sounds

Changed:
- Expanded `src/data/birds.ts` from 52 to 83 Southcentral Alaska / Talkeetna-area June birds, adding more common waterfowl, gulls, raptors, owls, grouse, swallows, shorebirds, thrushes, vireo, solitaire, and marsh-edge birds.
- Regenerated `src/data/imageManifest.ts` with 414 Wikimedia Commons image entries across all 83 birds.
- Added `scripts/fetch-commons-audio.mjs` and `npm run fetch:sounds` to download licensed local audio clips from Wikimedia Commons metadata and Xeno-canto direct download/source pages.
- Generated `src/data/localAudioManifest.ts` and `public/audio/birds/` with one local audio clip for every bird.
- Added `scripts/test-sound-manifest.mjs`, `npm run test:sounds`, and included sound validation in `npm run validate`.
- Updated Playwright expectations for the 83-bird, all-audio deck.

Verified:
- Dataset audit found 83 birds with no missing required fields.
- `npm run build` passed after the expanded data patch.
- `npm run fetch:sounds` produced 83 birds with audio after a targeted Xeno-canto fallback fill.
- `npm run fetch:images` produced 83 birds with images and 414 total image entries.
- `npm run test:images` passed.
- `npm run test:sounds` passed.
- `npm run validate` passed after the final UI/source-link and favicon changes.
- Manual in-app browser verification passed on `http://localhost:5173/`: 83 cards, 83 card images, 83 audio indicators, bird detail audio/source link, search, habitat filtering, flashcard reveal/advance, quiz answer feedback, sound quiz audio/clue mode, and mobile viewport with no horizontal overflow.

Commands run:
- `npm run build`
- `npm run fetch:sounds`
- `node scripts/fetch-commons-audio.mjs --reuse-existing`
- `npm run fetch:images`
- `npm run test:images`
- `npm run test:sounds`
- `npm run validate`

Remaining:
- No blocking work remains.

Assumptions:
- Xeno-canto API v3 was not used because it requires an account API key. Tagged Xeno-canto web searches and direct download links were used where reachable.
- The 83-bird deck is a strong likely/plausible trip-prep set, not a guarantee against every rarity, flyover, migrant, or bird from habitats outside the cabin/train/river/wetland/mountain-edge mix.

## Follow-up: GitHub Pages Readiness

Changed:
- Added `.github/workflows/deploy.yml` for GitHub Actions deployment to GitHub Pages.
- Updated `vite.config.ts` to infer the Pages base path from `GITHUB_REPOSITORY`, with `VITE_BASE_PATH` as an override.
- Updated local audio URL resolution so `/audio/birds/...` works under project Pages paths like `/repo-name/`.
- Updated the favicon link to use Vite's base URL replacement.
- Documented GitHub Pages setup steps in `README.md`.

Verified:
- Default `npm run build` passed.
- Pages-style `VITE_BASE_PATH=/bird_learner/ npm run build` passed.
- Generated `dist/index.html` used `/bird_learner/` for favicon, JavaScript, and CSS assets.
- Built JavaScript includes the configured base path and keeps local audio manifest paths resolvable through the runtime base-path helper.
- Full `npm run validate` passed after the deploy changes.

Commands run:
- `npm run build`
- `VITE_BASE_PATH=/bird_learner/ npm run build`
- `npm run validate`

Remaining:
- No blocking work remains. After the GitHub repo exists, set Pages source to GitHub Actions and push `main`.

## Follow-up: Mobile Browse And Quiz Shuffle

Changed:
- Added a mobile bird-detail sheet so tapping a bird on small screens opens details immediately over the card list instead of requiring a long scroll to the desktop side panel.
- Hid the desktop detail panel on compact layouts while preserving it on desktop.
- Enlarged bird cards, card images, mode buttons, learning panels, and quiz choices for easier mobile tapping and scanning.
- Added seeded shuffling for quiz decks, sound quiz decks, and answer choices so each run is not locked to the same bird order.
- Updated Playwright coverage to assert the mobile detail sheet appears at the top of the viewport and still has no horizontal overflow.

Verified:
- `npm run build` passed.
- `npm run validate` passed.
- Manual in-app browser check passed on a 390px viewport: tapping Common Raven opens the detail sheet at the top of the viewport, with no horizontal overflow.
- Manual desktop check passed at 1440px: larger cards render in a three-column grid, desktop detail remains present, and no mobile sheet is rendered.
- Manual quiz check showed a randomized first quiz prompt and non-alphabetical answer order.

Commands run:
- `npm run build`
- `npm run validate`

Remaining:
- No blocking work remains.

## Follow-up: Local Image Cache For Mobile Pages

Changed:
- Cached all Wikimedia Commons bird thumbnails into `public/images/birds/` so the GitHub Pages app serves images from the same origin instead of loading external Wikimedia thumbnail URLs at runtime.
- Updated `src/data/imageManifest.ts` to use local thumbnail paths while preserving Commons page URLs, licenses, credits, and original file URLs.
- Added `scripts/cache-wikimedia-images.mjs` plus `npm run cache:images` for local cache verification and made `npm run fetch:images` refresh Commons metadata and recache files.
- Updated image URL rendering so local thumbnail paths resolve correctly under GitHub Pages base paths like `/alaska_birds/`.

Verified:
- `npm run cache:images` verified 414 local cached thumbnails.
- `npm run test:images` passed with all 83 birds and 414 local image files present.
- `npm run validate` passed, including the Playwright check that card images and the mobile detail image decode with nonzero dimensions.
- Pages-style `VITE_BASE_PATH=/alaska_birds/ npm run build` passed.
- In-app browser verification on `http://localhost:4174/alaska_birds/` found 83 rendered card images and a local first-image URL under `/alaska_birds/images/birds/`.
- iPhone 13-emulated Playwright verification against the Pages-mounted build decoded visible card images and the Common Raven mobile detail image, found no failed image/asset responses, and found no horizontal overflow.
- GitHub Actions deploy run `25839666340` succeeded after the push.
- Live iPhone 13-emulated Playwright verification on `https://slainhedden.github.io/alaska_birds/?v=fc54a52` decoded visible card images and the Common Raven mobile detail image from the Pages origin, found no failed image/asset responses, and found no horizontal overflow.
- In-app browser verification on the live Pages URL found 83 rendered card images and a local first-image URL under `/alaska_birds/images/birds/`.

Commands run:
- `npm run cache:images`
- `npm run test:images`
- `npm run validate`
- `VITE_BASE_PATH=/alaska_birds/ npm run build`
- iPhone 13 Playwright smoke check against `http://127.0.0.1:4174/alaska_birds/`
- `git push origin main`
- `gh run watch 25839666340 --repo slainhedden/alaska_birds --exit-status`
- iPhone 13 Playwright smoke check against `https://slainhedden.github.io/alaska_birds/?v=fc54a52`

Remaining:
- No blocking work remains.

Assumptions:
- The phone issue was caused by mobile/Safari handling of cross-site lazy-loaded Wikimedia thumbnails. Serving the thumbnails from the Pages origin removes that dependency.
