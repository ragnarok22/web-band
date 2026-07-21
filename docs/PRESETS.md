# Drum Pattern Presets

The `presets/` directory contains portable drum grooves that can be imported through Web Band's existing Pattern Library. Each file is a version 1 `drum-patterns` share envelope containing one custom pattern.

These are not saved Practice presets. A saved Practice preset stores BPM, count-in, fills, and guided-practice settings while referring to a drum pattern by ID. Global master volume, mixer state, and sound character stay unchanged when a Practice preset loads. Saved Practice presets currently move between browsers only as part of a full application backup. The files in `presets/` carry the actual drum hits and can be imported independently.

The included song grooves are simplified educational practice approximations. They are short, loopable interpretations of recognizable rhythmic ideas, not official transcriptions or complete arrangements. They contain no recordings or external audio assets.

## Import a preset

1. Open the Pattern Library at `/patterns`.
2. Choose **Import patterns**.
3. Select one JSON file from `presets/`.
4. Review the pattern name, meter, and hit count.
5. Choose **Add to library**.
6. Find the imported card and choose **Practice** to load its default BPM.

Importing adds the groove to the local custom-pattern library. It does not automatically start playback. If its pattern ID already exists, Web Band keeps the existing pattern and imports the new one as a copy with fresh pattern and hit IDs.

## Included presets

| Artist            | Song                       | Default BPM | Meter |  Grid | Bars |
| ----------------- | -------------------------- | ----------: | ----- | ----: | ---: |
| Mana              | En el muelle de San Blas   |          97 | 4/4   | 16ths |    2 |
| AC/DC             | Back in Black              |          94 | 4/4   |  8ths |    2 |
| Disturbed         | The Sound of Silence       |          86 | 6/8   | 16ths |    2 |
| Guns N' Roses     | Knockin' on Heaven's Door  |          70 | 4/4   | 16ths |    2 |
| Michael Jackson   | Billie Jean                |         117 | 4/4   | 16ths |    1 |
| Queen             | Another One Bites the Dust |         110 | 4/4   | 16ths |    2 |
| Nirvana           | Smells Like Teen Spirit    |         117 | 4/4   | 16ths |    2 |
| The White Stripes | Seven Nation Army          |         124 | 4/4   |  8ths |    2 |
| Queen             | We Will Rock You           |          81 | 4/4   |  8ths |    1 |
| The Police        | Every Breath You Take      |         117 | 4/4   | 16ths |    2 |
| Bon Jovi          | Livin' on a Prayer         |         123 | 4/4   | 16ths |    2 |
| Journey           | Don't Stop Believin'       |         119 | 4/4   | 16ths |    2 |

## File structure

The importer expects this envelope. The top-level object must contain exactly `app`, `kind`, `version`, `exportedAt`, and `data`; `data` must contain exactly `patterns`.

```json
{
  "app": "web-band",
  "kind": "drum-patterns",
  "version": 1,
  "exportedAt": "2026-07-19T00:00:00.000Z",
  "data": {
    "patterns": [
      {
        "id": "song-example-groove",
        "name": "Artist - Song",
        "description": "A short description of the practice groove.",
        "category": "rock",
        "difficulty": "beginner",
        "timeSignature": {
          "numerator": 4,
          "denominator": 4
        },
        "subdivision": 16,
        "bars": 1,
        "defaultBpm": 96,
        "recommendedBpmRange": {
          "min": 76,
          "max": 116
        },
        "swing": 0,
        "hits": [
          {
            "id": "example-kick-0",
            "instrument": "kick",
            "step": 0,
            "velocity": 1
          }
        ],
        "isBuiltIn": false,
        "createdAt": "2026-07-19T00:00:00.000Z",
        "updatedAt": "2026-07-19T00:00:00.000Z"
      }
    ]
  }
}
```

## Pattern fields

| Field                    | Meaning and limits                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `id`                     | Stable, nonblank custom ID, at most 128 characters. It must not match a built-in pattern ID.              |
| `name`                   | Display name, from 1 to 100 characters. The convention in this folder is `Artist - Song`.                 |
| `description`            | Display description, at most 1,000 characters.                                                            |
| `category`               | `rock`, `pop`, `blues`, `funk`, `reggae`, `country`, `ballad`, `latin`, `metal`, `jazz`, or `custom`.     |
| `difficulty`             | `beginner`, `intermediate`, or `advanced`.                                                                |
| `timeSignature`          | Numerator from 1 to 12 and denominator `4` or `8`.                                                        |
| `subdivision`            | `8` for eighth-note cells or `16` for sixteenth-note cells.                                               |
| `bars`                   | Integer from 1 through 4. The visual editor offers 1, 2, or 4 bars.                                       |
| `defaultBpm`             | Playback tempo from 40 through 220 BPM.                                                                   |
| `recommendedBpmRange`    | Minimum and maximum practice tempos, both from 40 through 220, with `min <= max`.                         |
| `swing`                  | Optional amount from `0` through `0.65`. Use `0` for straight timing.                                     |
| `hits`                   | Zero or more hit objects, up to 2,048 per pattern.                                                        |
| `isBuiltIn`              | Must be `false` for every importable pattern.                                                             |
| `createdAt`, `updatedAt` | Canonical UTC ISO timestamps, such as `2026-07-19T00:00:00.000Z`. `updatedAt` cannot precede `createdAt`. |

One share file can hold from 1 through 100 patterns. Files in this directory intentionally contain one pattern each so they can be named, reviewed, and imported independently. A share file cannot exceed 10 MB.

## Hit fields

| Field          | Meaning and limits                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| `id`           | Nonblank ID, at most 128 characters and unique within the pattern.                                         |
| `instrument`   | `kick`, `snare`, `closedHat`, `openHat`, `lowTom`, `midTom`, `highTom`, `crash`, `ride`, `rim`, or `clap`. |
| `step`         | Zero-based grid position. It must be within the pattern's calculated step count.                           |
| `velocity`     | Loudness from `0` through `1`. Values around `0.8` or higher read as accents in the UI.                    |
| `probability`  | Optional trigger probability from `0` through `1`. Omit it for deterministic song practice.                |
| `flam`         | Optional boolean. It schedules a quieter second hit up to 40 ms after the initial hit.                     |
| `timingOffset` | Optional timing shift in seconds from `-0.1` through `0.1`.                                                |

Each instrument can appear at most once on a given step. Different instruments may share a step, such as a kick and crash on the first beat.

## Read the grid

The total step count is:

```text
numerator * (subdivision / denominator) * bars
```

A one-bar 4/4 pattern with eighth-note subdivision has eight steps numbered `0` through `7`:

```text
Count:  1 & 2 & 3 & 4 &
Step:   0 1 2 3 4 5 6 7
```

A one-bar 4/4 pattern with sixteenth-note subdivision has 16 steps numbered `0` through `15`:

```text
Count:  1 e & a 2 e & a 3 e & a 4 e & a
Step:   0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15
```

For later bars, add the number of steps per bar. In a 4/4 sixteenth-note pattern, bar two starts at step `16`, bar three at `32`, and bar four at `48`.

To read a file, first inspect `data.patterns[0]` for its meter, subdivision, and bar count. Then group `hits` by `instrument` and place each hit at its `step`. Velocity describes dynamics; omitted optional properties mean full trigger probability, no flam metadata, and no timing shift.

## Create a preset in Web Band

The safest authoring workflow uses the visual editor:

1. Open `/editor` and create the groove.
2. Set its name, description, category, difficulty, BPM range, meter, subdivision, and bars.
3. Enter hits and adjust their velocity or advanced properties.
4. Save the pattern locally.
5. Return to `/patterns` and use the pattern card's export button.
6. Move the downloaded JSON into `presets/` if it belongs in this collection.
7. Run the validation test before committing it.

The export path supplies valid IDs, timestamps, envelope fields, and filename formatting automatically.

## Create a preset manually

1. Copy an existing file from `presets/` and rename it.
2. Give the pattern a unique, stable ID. A `song-artist-title` form is easy to maintain.
3. Change the name, description, category, difficulty, meter, BPM metadata, subdivision, and bars.
4. Calculate the valid step range before writing hits.
5. Give every hit a unique ID and ensure an instrument is not repeated on the same step.
6. Use canonical UTC timestamps from JavaScript's `new Date().toISOString()` format.
7. Keep `isBuiltIn` set to `false`.
8. Name a one-pattern file as `web-band-pattern-<lowercase-kebab-name>.json`.
9. Run `pnpm test src/lib/song-presets.test.ts`.

Do not add author, license, source URL, notes, or other custom fields inside a pattern. Top-level custom pattern fields are validated against an allowlist. Put collection-level context in documentation instead.

## Create a preset with AI

Give the AI the exact schema and musical intent. A useful prompt is:

```text
Create one Web Band version 1 drum-patterns JSON share file for:

Artist: <artist>
Song or groove: <title>
Target section: <verse, chorus, or signature groove>
Default BPM: <40-220>
Meter: <for example 4/4>
Subdivision: <8 or 16>
Bars: <1-4>
Difficulty: <beginner, intermediate, or advanced>

Use only these instruments: kick, snare, closedHat, openHat, lowTom,
midTom, highTom, crash, ride, rim, clap. Make it a short educational
practice approximation, not a complete arrangement. Use varied velocities,
unique stable pattern and hit IDs, no duplicate instrument/step cells,
isBuiltIn false, and canonical UTC timestamps. Return JSON only. Do not add
fields outside the documented envelope, pattern, and hit schemas.
```

AI output still needs validation. Check the groove musically in Preview and Practice, confirm its tempo and meter independently, and run the test suite. Schema validation can prove that a file is safe to import; it cannot prove that the groove resembles the intended music.

## Validation and troubleshooting

Run the committed-preset contract test:

```sh
pnpm test src/lib/song-presets.test.ts
```

Run the full routine checks before submitting changes:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

Common import failures include malformed JSON, unsupported extra fields, a noncanonical timestamp, a built-in or duplicate pattern ID, repeated hit IDs, repeated instrument/step cells, and steps outside the calculated grid.

Reimporting the same file does not update the previous import. The ID collision is resolved by creating another local copy with fresh IDs and timestamps.
