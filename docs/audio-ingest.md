# Audio Sources And Dataset Ingest

## Built-in Sound Fetch

The current deck includes one local clip for every bird. To regenerate it:

```bash
npm run fetch:sounds
npm run test:sounds
```

`fetch:sounds` searches Wikimedia Commons audio metadata first. If a Commons file identifies a Xeno-canto recording id, it downloads through Xeno-canto's `/download` endpoint and stores the Xeno-canto source page, Commons-derived license notes, and credit in `src/data/localAudioManifest.ts`.

For species Commons does not find, the script uses Xeno-canto tagged web searches such as `gen:poecile sp:hudsonicus` or exact English-name filters. Xeno-canto API v3 requires an account API key, so the script does not use the API unless a future version adds explicit key support.

The downloaded files live in `public/audio/birds/<bird-id>/` and are used by the detail view and sound quiz.

Useful options:

```bash
node scripts/fetch-commons-audio.mjs --reuse-existing
node scripts/fetch-commons-audio.mjs --dry-run
node scripts/fetch-commons-audio.mjs --limit-per-bird 2
```

## Manual Dataset Ingest

The app can use local bird-audio clips after you manually download a dataset and place it under `data/audio-source/`. This keeps the repo from hotlinking or redistributing unclear media while still letting the learning deck use richer audio once you have the files locally.

## Recommended Sources

Start with datasets that include Xeno-canto-derived metadata and clear attribution/license columns:

- Kaggle BirdCLEF competitions, especially datasets with `train_audio/` plus `train_metadata.csv`: https://www.kaggle.com/competitions/birdclef-2024/data
- Earlier Kaggle BirdCLEF datasets may cover more North American species than a single year's region-specific challenge: https://www.kaggle.com/competitions/birdclef-2023/data and https://www.kaggle.com/competitions/birdclef-2022/data
- Xeno-canto API v3 can provide recording metadata and source URLs, but it currently requires an API key. Use it only for recordings whose license permits your use: https://xeno-canto.org/explore/api
- BirdCLEF / ImageCLEF task pages are useful for understanding dataset provenance and yearly scope: https://www.imageclef.org/

Kaggle often requires browser login and manual download. Download the archive yourself, then put the `.zip`, `.tar`, or unpacked folder under `data/audio-source/`.

## Supported Layouts

The ingest script scans recursively and supports:

- `train_metadata.csv` or other `.csv` / `.tsv` files with columns such as `common_name`, `scientific_name`, `primary_label`, `filename`, `rating`, `license`, `author`, and `url`.
- BirdCLEF-style `train_audio/<label>/<file>.ogg`.
- Audio files arranged in folders named by common name, scientific name, or bird id.
- `.zip`, `.tar`, `.tgz`, and `.tar.gz` archives placed directly under `data/audio-source/`; archives are unpacked into ignored `.audio-ingest-work/`.

Supported audio extensions: `.mp3`, `.ogg`, `.wav`, `.flac`, and `.m4a`.

## Run

```bash
npm run ingest:audio
```

This copies matched tracks into `public/audio/birds/<bird-id>/` and writes `src/data/localAudioManifest.ts`. The app then prefers local clips in detail and sound-quiz mode.

Useful options:

```bash
node scripts/ingest-audio.mjs --limit-per-bird 6
node scripts/ingest-audio.mjs --min-rating 3.5
node scripts/ingest-audio.mjs --dry-run
node scripts/ingest-audio.mjs --source /path/to/downloaded/dataset
```

## Verify

```bash
npm run test:sounds
npm run test:audio-ingest
npm run validate
```

`test:sounds` verifies that every bird has a local manifest entry and a real audio file. 
`test:audio-ingest` uses a tiny fixture to verify both unpacked and zipped dataset handling. It does not depend on real downloaded audio.

## Licensing Caveat

The generated manifest preserves dataset, source URL, license, credit, rating, and original path where metadata exposes them. You still need to review the dataset and recording licenses before publishing, sharing, or redistributing the copied audio. If license terms are unclear, keep clips local for personal study only.
