# Europe Alcohol Laws — interactive map

An offline, self-contained web app that maps drinking-age and alcohol laws across
Europe, with a regional map for every country and a fully cited Sources page.

**Open `index.html` by double-clicking it.** No server, build step or internet
connection is needed (D3 and TopoJSON are bundled in `lib/`).

> ⚠️ Informational only — not legal advice. Laws change often; check the linked
> official sources before relying on anything here. Data last verified 2026-10-01.

## Features

* **Europe map** (47 countries incl. UK, Iceland, Norway, Switzerland, the Balkans,
  Ukraine, Belarus, Moldova, Türkiye, Russia, Cyprus, Malta, Kosovo and the
  microstates, which also get clickable circle markers).
* **Five colouring modes**: overall category, minimum age for beer & wine, for
  spirits, in shops (off-premise) and in bars (on-premise). The legend updates with
  the mode.
* **Hover tooltips**, zoom & pan (mouse wheel, pinch, + / − / reset buttons), and
  search to jump to a country.
* **Country panel**: flag, ages table (beer/wine × spirits, bars × shops), summary
  with inline numbered citations, details (exceptions, monopolies, ABV thresholds,
  sale hours, minimum unit pricing, drink-drive limits), confidence badge, source
  count and a "Sources for this country" list.
* **Regional maps** for every country using its real subdivisions (Länder, cantons,
  autonomous communities, constituent countries, entities, federal subjects …).
  Countries with genuine regional differences are coloured by them; the rest show a
  single colour and say the rules are national.
* **Sources page** (header button, or any `[n]` citation): every source grouped by
  country plus "General / Europe-wide" and "Map data & software", with type,
  access date, what it supports, a search filter and back-links.
* Colour-blind-safe palettes (Okabe–Ito for categories, ColorBrewer YlGnBu for ages),
  light/dark mode, keyboard access, responsive layout.

## Files

```
index.html               app (HTML + CSS + JS, no build step)
data/alcohol-data.js     ALL legal data + ALL sources  ← edit this to correct things
data/geo-europe.js       Europe country boundaries (TopoJSON)
data/regions/<ISO3>.js   one regional map per country, loaded on demand
lib/                     d3.min.js v7.9.0, topojson-client.min.js v3.1.0 (+ licences)
tools/                   scripts that rebuild the map files from Natural Earth
SCHEMA.md                description of the data structure
```

See **SCHEMA.md** for how to edit the data. Every text item must cite at least one
source id.

## Rebuilding the map data

`tools/build_geo.sh` downloads Natural Earth 1:10m admin-0 (German point-of-view
edition) and admin-1 boundaries, groups admin-1 units to the level each country
uses, and simplifies them with mapshaper. It reproduces the shipped files exactly.

## Credits

Boundaries: Natural Earth (public domain). Libraries: D3.js and topojson-client
(ISC). Processing: mapshaper (MPL-2.0). Colours: Okabe & Ito; ColorBrewer
(Apache-2.0). Legal data: see the in-app Sources page.
