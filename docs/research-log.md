# Research Log

## Trip Assumption

The deck assumes a mid-June trip in Southcentral Alaska near Indian River, Talkeetna, the Talkeetna Mountain Range, and the Alaska Railroad corridor. Habitats prioritized: spruce/birch/cottonwood boreal woods, cabin clearings, willow/alder river edges, wetlands and muskeg, lakes and ponds, train-window open corridors, and subalpine/alpine shrub edges.

## Source Strategy

I used the built-in web research tools and direct source checks after Firecrawl proved unavailable in this environment. Species selection is based on overlap between regional summer checklists, Talkeetna habitat descriptions, and the trip-specific habitat mix.

Primary sources used:

- Mat-Su Birders, **Birds of Southcentral Alaska**, with summer frequency categories for south/central Matanuska-Susitna birds: https://matsubirders.org/wp-content/uploads/2016/07/checklist-mat-su.pdf
- Mat-Su Birders, **Birding the Mat-Su** guide for regional birding context: https://matsubirders.org/wp-content/uploads/2016/10/Birding-the-Mat-Su.pdf
- Alaska DNR / Knik River Public Use Area, **Jim-Swan Wetlands Bird Checklist**, for wetland, bog, waterbird, shorebird, and conservation-relevant boreal species: https://dnr.alaska.gov/mlw/knik-river-pua/pdf/bird-checklist.pdf
- Audubon Alaska birding checklist page, for Anchorage/Palmer Hay Flats seasonal checklist context in partnership with ADFG and Anchorage Audubon: https://www.audubon.org/alaska/birds/alaska-birding-checklists
- Talkeetna Lakes Park birding overview, for local Talkeetna lake, swamp, spruce, birch, cottonwood, and alpine-context species groups: https://denaliriverguides.com/birdwatching-enthusiasts-enjoy-over-100-species-of-birds-at-talkeetna-lakes-park/
- Alaska Department of Fish and Game bird species directory, for Alaska species context: https://www.adfg.alaska.gov/index.cfm?adfg=animals.listbirds
- eBird finding-birds resources and web searches for regional observation context. The public eBird API requires an API key, so no unauthenticated API data was embedded: https://ebird.org/about/resources/finding-birds-with-ebird
- Cornell Lab / All About Birds species guide pages are linked per species for field marks, habitat, and sound study.
- Xeno-canto search links are stored per species as external sound-practice sources. Recordings were not embedded unless a reusable file was separately verified.
- Wikimedia Commons image searches are stored per species as image-source candidates. The app uses checked-in local thumbnail copies only after Commons metadata exposes a source page, license, and credit for each file.
- BirdCLEF/Kaggle and Xeno-canto API options were reviewed for a local-only audio ingest workflow. See `docs/audio-ingest.md`.
- Wikimedia Commons API image metadata was used to generate `src/data/imageManifest.ts`. The manifest includes image entries for each of the 83 birds, with thumbnail URL, original file URL, Commons page URL, license, credit, and best-effort variant labels inferred from file titles/descriptions.
- Wikimedia Commons audio metadata and Xeno-canto tagged searches were used to generate `src/data/localAudioManifest.ts`. Normal Xeno-canto API v3 requires an account API key, so the app uses source pages and direct download links where reachable, preserving license and recordist/source fields.

## Species Criteria

Likelihood tiers are practical trip-prep tiers, not formal abundance estimates:

- **common**: marked abundant/common in summer regional sources or highly expected in the exact cabin, river, lake, spruce, willow, or rail habitat.
- **possible**: present in regional June/summer sources and plausible if the matching habitat is visited.
- **uncommon**: source-supported in the broader habitat mix but less likely without a specific wetland, lake, or fast-stream encounter.

The app currently includes **83 species**. The top learning priority favors birds likely to be noticed by sound or from common trip settings: Common Raven, Black-billed Magpie, Varied Thrush, American Robin, Ruby-crowned Kinglet, Yellow-rumped Warbler, Swainson's Thrush, Wilson's Warbler, Northern Waterthrush, Orange-crowned Warbler, Alder Flycatcher, White-crowned Sparrow, Golden-crowned Sparrow, Wilson's Snipe, common ducks and geese, expected swallows, raptors, owls, forest grouse, and river/wetland shorebirds.

The 31-species expansion added: Canada Goose, American Wigeon, Northern Pintail, Northern Shoveler, Lesser Scaup, Bufflehead, Common Goldeneye, Common Merganser, Short-billed Gull, Bonaparte's Gull, Osprey, Red-tailed Hawk, Northern Harrier, Merlin, American Kestrel, Northern Goshawk, Great Horned Owl, Boreal Owl, Ruffed Grouse, Northern Flicker, Bank Swallow, Cliff Swallow, Barn Swallow, Bohemian Waxwing, Lesser Yellowlegs, Solitary Sandpiper, Least Sandpiper, Gray-cheeked Thrush, Warbling Vireo, Townsend's Solitaire, and Red-winged Blackbird.

## Media And Licensing Notes

The app does not hotlink unverified copyrighted audio. Images are displayed from checked-in local thumbnail files generated from Wikimedia Commons metadata, with source page, license, and credit preserved in the manifest. Each bird has:

- at least one Wikimedia Commons image entry, usually five, labeled as adult/unspecified, adult, male, female, juvenile, immature, or pair when possible;
- one local audio clip in `public/audio/birds/<bird-id>/`, sourced from Wikimedia Commons metadata or Xeno-canto direct downloads with source/license/credit notes preserved in `src/data/localAudioManifest.ts`;
- text-based sound cues and mnemonics so the learning flow remains useful without embedded media.

`npm run fetch:sounds` first searches Commons audio metadata. When Commons exposes a Xeno-canto recording id, the downloader uses Xeno-canto's direct `/download` URL and records the Xeno-canto source page. For species not found through Commons, it uses Xeno-canto's tagged web search with genus/species or exact English-name filters.

Local audio ingest can add or replace clips after manual dataset download. The ingest flow copies files only from local `data/audio-source/` and preserves source/license notes in `src/data/localAudioManifest.ts`.

## Assumptions And Caveats

- "Indian River" is treated as the Talkeetna-area Southcentral Alaska setting described by the user, with nearby boreal forest, river, lake/wetland, and mountain-edge habitats.
- The deck is tuned for mid-June breeding-season sounds, not migration peaks or winter birds.
- Common Redpoll naming is kept as a practical field-learning name even though some modern taxonomies may treat redpolls as a broader complex.
- The dataset is intentionally local and static; it is not a live eBird checklist or a general Alaska bird encyclopedia. It covers the likely and plausible mid-June cabin/train habitat set, but no static deck can guarantee every flyover, rarity, migrant, or habitat-specific bird encountered.
