# Meridian — Time, Zones & Dates

A browser toolkit for world time, time-zone conversion (including historical rules), date calculations, calendars, history and astronomy. It is plain HTML, CSS and JavaScript. It needs no build step, no backend and no API keys.

## Running

**Easiest:** open `meridian.html`. It's a single self-contained file (about 1.25 MB) with all the styling, code and map data inside, so you can copy it anywhere and double-click it. Rebuild it after changing the source with `node build-single.js`.

To work from the source files instead:

Open `index.html` in a current browser (Chrome, Edge, Firefox or Safari). It also works from `file://`. You can serve it locally instead:

```sh
cd meridian
python3 -m http.server 8000   # then visit http://localhost:8000
```

Three features fetch data online and degrade gracefully when they can't:
- **Weather** uses NWS, MET Norway and Open-Meteo. The last forecast stays available offline and updates whenever you're back online.
- **This Day in History** uses Wikipedia's “On this day” API. It caches responses for 7 days and falls back to a small, clearly labelled offline set.
- **Holiday finder** can load 100+ extra countries from Nager.Date. Six countries have built-in rules that work offline.

## Tests

```sh
node tests/run-node.js        # 106 engine tests (Node 18+ with full ICU — the default)
```

You can also open `tests/index.html` in a browser, or use **Settings & About → Run engine tests**. Running in the browser checks the tests against that browser's own time-zone data.

## Tools

- **Today:** a live clock for local time, UTC or any other location. Shows day of year, week number (convention stated), leap year, season, DST status, tomorrow's events and upcoming milestones.
- **World Clock:** add, pin, sort and remove cities. Day-part colours, plus a meeting planner with per-city working hours (overnight shifts allowed).
- **Time-Zone Map:** an interactive d3 map built from Natural Earth time-zone polygons. You can zoom, pan, hover, click and search. It has a day/night terminator, a legend and a detailed zone panel with a comparison table.
- **Converter:** source and destinations can be a location, an IANA zone, a literal abbreviation (PST = UTC−8) or an offset. It applies historical rules, detects DST gaps and overlaps and asks you to choose, and shows the steps it used.
- **Calculator:** exact elapsed time between zone-aware timestamps, date add/subtract (month-end clamping), days between dates, nth weekday, business days, time arithmetic (24 h vs. calendar day), age and anniversaries, date comparison.
- **Date Explorer:** weekday and facts for any date (years −271,820 to 275,759), leap-year explorer, week-number conventions, Julian ↔ Gregorian conversion, historical UTC offsets.
- **This Day in History:** month/day picker with no year needed. Filters by category, topic, region and period. Random date and prev/next day buttons, with special handling for Feb 29.
- **Weather:** current conditions, a 24-hour and multi-day forecast, active alerts, model comparison and air quality.
  - **US locations:** the official US National Weather Service, including measured station observations and alerts.
  - **Worldwide:** MET Norway, the Norwegian government's weather service.
  - **Model comparison:** ECMWF, NOAA GFS and DWD ICON side by side via Open-Meteo, with a forecast-agreement indicator.
  - **Air quality:** from Copernicus CAMS.
  - **Interactive maps:** temperature, precipitation, wind (with direction arrows) and air quality, each with a colour key. Air quality uses the official US EPA AQI colours. You can view the world or the area around the selected location, zoom and pan, hover for values, click to load a point's forecast, and play through the next 48 hours. Map data is a grid of model forecast points from Open-Meteo, interpolated bicubically without overshoot. Temperature has labelled isotherms (freezing highlighted) and cities show their values. Wind can animate as particles, and wind direction is interpolated as vectors. Failed download chunks are retried, and any remaining gaps are hatched. Maps near the date line render correctly, and saved maps are stored compactly for offline use.
  - **Offline:** every download is saved in the browser and shown offline with its age. It refreshes when the page opens, every 15 minutes, and automatically when the connection returns.
- **Satellite basemap:** the time-zone map, the weather maps and the Live World globe show real NASA Blue Marble satellite imagery from NASA's GIBS imagery service (no key needed). When you zoom in, a sharper image of just the visible area is downloaded. Images are saved in the browser (IndexedDB), so the maps stay photographic offline once viewed. A **Satellite** checkbox switches back to the outline map, which is also the automatic fallback without network or cache.
- **Live World:** an interactive 3D Earth (globe.gl, loaded on demand from a CDN, with a 2D fallback).
  - **Day/night:** shading follows the Sun's position, computed locally. City lights glow on the night side, the terminator line is drawn, and a time preview lets you move the shading without touching anything else in Meridian.
  - **Cameras:** about 6,400 real cameras from Caltrans (California, many with continuous HLS video), TfL (London), Hong Kong Transport Department, Singapore LTA, Fintraffic Digitraffic (Finland), the Iowa Environmental Mesonet, and 133 curated YouTube livestreams.
  - **Honest labels:** each feed shows LIVE VIDEO, UPDATING IMAGE, RECENT IMAGE, STALE, OFFLINE, ENDED or STATUS UNKNOWN, based on playlist checks, capture times and server timestamps. Images refresh no faster than their source publishes.
  - **Optional API keys:** a YouTube Data API key verifies which streams are live right now, and a Windy Webcams key adds more cameras.
- **Holidays & Astronomy:** Western and Orthodox Easter, Friday the 13th, holiday finder, moon phases, equinoxes and solstices, sunrise/sunset.
- **Utilities:** Unix timestamps, ISO 8601, date-format converter (flags ambiguous dates), countdowns, recurring dates, time-zone abbreviation reference.
- **Time Units:** converter from nanoseconds to millennia, a searchable and sortable reference table, and calendar durations between dates.
- Also: global search (Ctrl/⌘+K, understands “9:30 PM PST in Berlin”), favorites, recent calculations, light/dark theme, 12/24 h, date-format and week-convention settings, print styles.

## How correctness is handled

- Time-zone rules come from the browser's IANA tz database via `Intl.DateTimeFormat`. The offset is looked up for each specific instant. No offsets are hardcoded, and the user's own zone is never used as a stand-in for another.
- Calendar maths uses integer day numbers in the proleptic Gregorian calendar. It never parses locale strings.
- Wall time → instant resolution returns 0, 1 or 2 candidates, so DST gaps and overlaps are always surfaced.
- Elapsed time is measured between absolute instants and kept separate from calendar arithmetic.

## Live World notes

- **Network:** it needs an internet connection for the globe library, textures and camera feeds. The globe starts with the three-globe Blue Marble texture (2048×1024) and switches to NASA's 4096×2048 Blue Marble from GIBS once that has downloaded (cached afterwards). Everything else in Meridian works offline.
- **YouTube from a local file:** YouTube blocks embedded players on pages opened directly from a file (error 153). In that case Meridian links to the stream on YouTube. Hosting the HTML file on any website lets the streams play inside the app.
- **Caltrans live video:** this needs a browser that decodes H.264. That includes Chrome, Edge, Safari and Firefox, but not some open-source Chromium builds; those get the camera's updating still image instead.
- **Sources a browser can't reach:** some sources block browser access (no CORS) or need keys: NSW Live Traffic, NYC DOT, Ontario/Alberta 511 and NPS. They're listed in the in-app diagnostics.

## Limitations

- tz data before 1970 is less complete, and very old times use local mean time.
- The map polygons are Natural Earth's nominal zones (c. 2012). The panel always uses current IANA rules for the nearest listed city.
- Astronomy results are calculated values (Meeus and NOAA algorithms), typically within a minute or two, and are labelled approximate.
- Lunar-calendar holidays (Eid, Diwali, Lunar New Year) are available only through the online holiday source.

## Structure

```
index.html          app shell
css/app.css         design system (light/dark, responsive, print)
js/engine.js        pure date/time engine (Node + browser)
js/data.js          cities, abbreviations, offline history fallback
js/app/*.js         one module per tool, plus core.js (router, pickers, search)
data/*.js           simplified map data (Natural Earth, public domain)
js/vendor/          d3 v7.9.0, topojson-client v3.1.0 (ISC)
tests/              shared test suite, Node runner, browser runner
```
