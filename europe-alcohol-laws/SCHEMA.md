# Data schema

All legal data and all sources live in **one file: `data/alcohol-data.js`**, which sets
`window.ALCOHOL_DATA`. It is plain JSON wrapped in one line of JavaScript so the app
works when `index.html` is opened directly from disk (browsers block `fetch()` of
local JSON files on `file://`).

Map geometry is kept separately (`data/geo-europe.js`, `data/regions/<ISO3>.js`) so
editing the legal data never means touching coordinates.

## Top level

```js
window.ALCOHOL_DATA = {
  meta:        { title, lastUpdated, disclaimer, boundaryNote },
  sourceTypes: { official, intl, news, academic, other },   // labels for source types
  categories:  [ { id, label, color, description } ],       // overall map categories
  modes:       [ { id, label } ],                           // map colouring modes
  ageColors:   { "16": "#…", "18": "#…", "20": "#…", none: "#…" },
  microstates: { AND: [lon, lat], … },                      // clickable circle markers
  countries:   { DEU: Country, … },                         // keyed by ISO 3166-1 alpha-3
  sources:     [ Source, … ]                                // numbered citation list
}
```

## Country

```js
{
  name: "Germany", flag: "🇩🇪",
  category: "split16_18",          // id from `categories`
  confidence: "high",              // high | medium | low  (low ⇒ "unverified" badge)
  lastVerified: "2026-10-01",
  line: "16 beer/wine, 18 spirits (14 with a parent)",   // tooltip one-liner
  catNote: null,                   // optional explanation for "mixed" categories
  ages: {                          // null = no verified value
    bw_on: 16,  // beer & wine, bars/restaurants (on-premise)
    bw_off: 16, // beer & wine, shops (off-premise)
    sp_on: 18,  // spirits, bars/restaurants
    sp_off: 18, // spirits, shops
    cites: [27, 1, 3]
  },
  derived: { beerWine, spirits, offPremise, onPremise },  // min of the relevant ages; drives the age map modes
  summary: [ { text: "…", cites: [27, 1] }, … ],          // one entry per sentence → inline [n] after each
  unverifiedSummary: null,          // shown with an "unverified – no source found" label when summary is empty
  facts:   [ { label: "Spirits", text: "…", cites: [27] }, … ],
  regions: Regions
}
```

## Regions (regional map)

```js
{
  type: "Cantons",                  // correct name of the subdivision type
  mode: "varies",                   // "varies" → coloured by class; "uniform" → one colour + note
  note:   { text, cites },          // shown in the legend
  legend: "What the colours show",  // only for mode "varies"
  classes: { ticino: { label, color }, … },
  default: { class, text, cites },  // used for regions without their own entry
  items: {                          // keyed by region id (slug, see data/regions/<ISO3>.js)
    "ticino": { class: "age18", text: "…", cites: [61] }
  }
}
```

Region ids are slugs of the Natural Earth (dissolved) region name, e.g. `scotland`,
`pais-vasco-euskadi`, `karnten`. Open `data/regions/<ISO3>.js` and look at the
`properties.id` values to find them.

## Source

```js
{
  id: 27,                           // the number used in [27] citations
  key: "de_juschg",                 // stable internal key
  group: "DEU",                     // ISO3 country, "GENERAL" or "MAPDATA"
  title, publisher, url,
  type: "official",                 // official | intl | news | academic | other
  accessed: "2026-10-01",
  supports: "Which facts this source backs up"
}
```

## Rules

* Every `text` item (summary sentence, fact, region text, note) must have at least
  one id in `cites`, and every id must exist in `sources`.
* Facts that could only come from memory are **not** included. Where nothing better
  than a weak source exists, the country gets `confidence: "low"` and the UI shows an
  "unverified" badge (currently Kosovo and Vatican City).
* Only URLs that were actually visited or returned by a search during research are
  listed.

## Editing tips

* To fix an age: change `ages`, then update `derived` (the minimum of the relevant
  pairs) and `line`.
* To add a source: append it to `sources` with the next free `id`; the Sources page
  groups by `group` automatically.
* To colour a region: add an entry under `regions.items` with a `class` that exists
  in `regions.classes`.
