#!/usr/bin/env bash
# Rebuilds data/geo-europe.js and data/regions/*.js from Natural Earth.
# Requires: python3, node + npx (mapshaper is fetched by npx).
set -euo pipefail
cd "$(dirname "$0")"
APP=..
mkdir -p ne reg regtopo
NE=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson
[ -f ne/ne_10m_admin_0_countries_deu.geojson ] || curl -sSL -o ne/ne_10m_admin_0_countries_deu.geojson $NE/ne_10m_admin_0_countries_deu.geojson
[ -f ne/ne_10m_admin_1_states_provinces.geojson ] || curl -sSL -o ne/ne_10m_admin_1_states_provinces.geojson $NE/ne_10m_admin_1_states_provinces.geojson

# Europe countries (German point-of-view edition), clipped and simplified
python3 prep_countries.py
npx -y mapshaper@0.7.72 countries_sel.geojson -clip bbox=-32,24,72,84 -dissolve id copy-fields=name,ctx \
  -simplify 10% keep-shapes -o format=topojson quantization=1e5 countries.topo.json
{ echo "/* Natural Earth 1:10m admin-0 (German POV edition), clipped & simplified with mapshaper. Public domain. */"
  echo -n "window.GEO_EUROPE = "; cat countries.topo.json; echo ";"; } > $APP/data/geo-europe.js

# Regions: group/dissolve admin-1 units to the level each country uses
python3 prep_regions.py
for f in reg/*.geojson; do
  a=$(basename "$f" .geojson); pct=20%
  case $a in RUS) pct=4%;; NOR|TUR|UKR|FRA|ESP|ITA|SWE|FIN|GBR|GRC|HRV) pct=10%;; MCO|VAT|SMR|LIE|AND|MLT|LUX) pct=60%;; esac
  npx -y mapshaper@0.7.72 "$f" -dissolve key copy-fields=id,en -simplify $pct keep-shapes -o format=topojson quantization=1e5 regtopo/$a.json
  { echo "/* Natural Earth 1:10m admin-1 for $a, dissolved & simplified with mapshaper. Public domain. */"
    echo -n "(window.GEO_REGIONS = window.GEO_REGIONS || {})[\"$a\"] = "; cat regtopo/$a.json; echo ";"; } > $APP/data/regions/$a.js
done
echo "Done. Region ids may change if Natural Earth renames regions — check data/alcohol-data.js regions.items."
