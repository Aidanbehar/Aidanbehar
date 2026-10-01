/*
 * Drinking-age & alcohol laws in Europe — DATA FILE
 * ------------------------------------------------------------------
 * This is the single source of truth for every legal fact in the app.
 * Edit it by hand: the app reads window.ALCOHOL_DATA at start-up.
 *
 * Structure (see SCHEMA.md for full details):
 *   meta          – title, last-updated date, disclaimer
 *   categories    – overall map categories (id, label, colour, description)
 *   modes         – map colouring modes
 *   countries     – keyed by ISO 3166-1 alpha-3 (Natural Earth ADM0_A3; Kosovo = KOS)
 *       ages      – bw_on / bw_off / sp_on / sp_off  (beer&wine / spirits, bars / shops), + cites
 *       derived   – values used by the age map modes (min of the relevant ages)
 *       summary[] – sentences, each { text, cites:[sourceId,…] }
 *       facts[]   – { label, text, cites }
 *       regions   – regional map: type, mode ('uniform'|'varies'), note, legend, classes, default, items
 *   sources       – numbered list; ids are what the [n] citations refer to.
 *                   type: official | intl | news | academic | other
 *
 * RULE: every text item must carry at least one source id in `cites`.
 */
window.ALCOHOL_DATA = {
 "meta": {
  "title": "Drinking-age & alcohol laws in Europe",
  "lastUpdated": "2026-10-01",
  "disclaimer": "Informational only — not legal advice. Laws change often; check official sources before relying on anything here.",
  "boundaryNote": "Boundaries: Natural Earth 1:10m (German point-of-view edition: Crimea shown as part of Ukraine, Kosovo shown separately, Cyprus shown undivided). Some admin-1 boundaries predate recent reforms."
 },
 "sourceTypes": {
  "official": "Official law / government",
  "intl": "International organisation",
  "news": "News",
  "academic": "Academic",
  "other": "Other"
 },
 "categories": [
  {
   "id": "split16_18",
   "label": "16 beer & wine · 18 spirits",
   "color": "#E69F00",
   "description": "Beer and wine (non-distilled drinks) from 16, spirits and spirit-based drinks from 18."
  },
  {
   "id": "all16",
   "label": "16 for all alcohol",
   "color": "#F0E442",
   "description": "One age limit of 16 for every alcoholic drink."
  },
  {
   "id": "all17",
   "label": "17 for all alcohol",
   "color": "#CC79A7",
   "description": "One age limit of 17 for every alcoholic drink."
  },
  {
   "id": "all18",
   "label": "18 for all alcohol",
   "color": "#56B4E9",
   "description": "One age limit of 18 for every alcoholic drink (some allow narrow exceptions, e.g. with a meal or a parent — see each country)."
  },
  {
   "id": "nordic_shop20",
   "label": "18 in bars · 20 in state shops",
   "color": "#009E73",
   "description": "18 in bars and restaurants; 20 to buy from the state retail monopoly."
  },
  {
   "id": "nordic_abv",
   "label": "18 · 20 for drinks ≥22% ABV",
   "color": "#0072B2",
   "description": "18 for most drinks; 20 to buy (Finland) or buy and be served (Norway) drinks of about 22% ABV or more."
  },
  {
   "id": "all20",
   "label": "20 for all alcohol",
   "color": "#003C66",
   "description": "One age limit of 20 for every alcoholic drink."
  },
  {
   "id": "mixed",
   "label": "Other / mixed rules",
   "color": "#D55E00",
   "description": "Rules that do not fit a simple split — see the country's note."
  },
  {
   "id": "unknown",
   "label": "No verified data",
   "color": "#BBBBBB",
   "description": "No reliable source found for a minimum age."
  }
 ],
 "modes": [
  {
   "id": "category",
   "label": "Overall category"
  },
  {
   "id": "beerWine",
   "label": "Minimum age: beer & wine"
  },
  {
   "id": "spirits",
   "label": "Minimum age: spirits"
  },
  {
   "id": "offPremise",
   "label": "Minimum age to buy in shops (off-premise)"
  },
  {
   "id": "onPremise",
   "label": "Minimum age in bars & restaurants (on-premise)"
  }
 ],
 "ageColors": {
  "14": "#ffffd9",
  "16": "#c7e9b4",
  "17": "#7fcdbb",
  "18": "#41b6c4",
  "20": "#225ea8",
  "21": "#0c2c84",
  "none": "#BBBBBB"
 },
 "microstates": {
  "AND": [
   1.55,
   42.55
  ],
  "LIE": [
   9.55,
   47.15
  ],
  "LUX": [
   6.13,
   49.78
  ],
  "MCO": [
   7.42,
   43.74
  ],
  "SMR": [
   12.46,
   43.94
  ],
  "VAT": [
   12.45,
   41.9
  ],
  "MLT": [
   14.43,
   35.9
  ]
 },
 "countries": {
  "ALB": {
   "name": "Albania",
   "flag": "🇦🇱",
   "category": "all18",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "WHO's latest survey (2016) reports a minimum age of 18 for beer, wine and spirits, both in shops and in bars.",
     "cites": [
      1,
      3
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 (WHO, 2016).",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.1 g/l for all drivers (WHO, 2016).",
     "cites": [
      4
     ]
    }
   ],
   "regions": {
    "type": "Counties (qarqe)",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      1,
      3
     ]
    }
   }
  },
  "AND": {
   "name": "Andorra",
   "flag": "🇦🇩",
   "category": "all18",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "WHO's latest survey (2023) reports a minimum age of 18 for beer, wine and spirits, both in shops and in bars.",
     "cites": [
      1,
      3
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 (WHO, 2023).",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Drink-driving",
     "text": "No BAC data reported to WHO.",
     "cites": [
      4
     ]
    }
   ],
   "regions": {
    "type": "Parishes (parròquies)",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      1,
      3
     ]
    }
   }
  },
  "AUT": {
   "name": "Austria",
   "flag": "🇦🇹",
   "category": "split16_18",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "16 beer/wine, 18 spirits",
   "catNote": null,
   "ages": {
    "bw_on": 16,
    "bw_off": 16,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     8,
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 16,
    "spirits": 18,
    "offPremise": 16,
    "onPremise": 16
   },
   "summary": [
    {
     "text": "Austria allows beer, wine and other non-distilled drinks from 16 and spirits (including spirit-based mixed drinks) from 18.",
     "cites": [
      8,
      1
     ]
    },
    {
     "text": "Youth protection is a matter for the nine Länder, which agreed in 2019 to harmonise their alcohol age rules.",
     "cites": [
      9,
      8
     ]
    },
    {
     "text": "A few Land-specific details remain, notably in Kärnten (Carinthia).",
     "cites": [
      8
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "Beer & wine",
     "text": "From 16 (purchase, possession and drinking in public).",
     "cites": [
      8
     ]
    },
    {
     "label": "Spirits",
     "text": "From 18, including alcopops and cocktails that contain distilled alcohol.",
     "cites": [
      8
     ]
    },
    {
     "label": "Who legislates",
     "text": "Each Land has its own youth-protection act; the rules were aligned in 2019.",
     "cites": [
      8,
      9
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l in general; 0.1 g/l for novice and commercial drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Länder (states)",
    "mode": "varies",
    "note": {
     "text": "Since the 2019 harmonisation the 16/18 split applies in every Land, but some Länder keep extra rules.",
     "cites": [
      8
     ]
    },
    "legend": "Remaining Land-level youth-protection differences (ages are 16/18 everywhere)",
    "classes": {
     "base": {
      "label": "Harmonised 16/18 rules",
      "color": "#56B4E9"
     },
     "mixed": {
      "label": "Extra rule on drinks with distilled alcohol",
      "color": "#E69F00"
     },
     "kaernten": {
      "label": "Extra rule + 0.5‰ limit for 16–17-year-olds",
      "color": "#D55E00"
     }
    },
    "default": {
     "class": "base",
     "text": "Harmonised rules: 16 for non-distilled drinks, 18 for spirits and spirit-based mixed drinks.",
     "cites": [
      8
     ]
    },
    "items": {
     "burgenland": {
      "class": "mixed",
      "text": "Burgenland: drinks containing distilled alcohol are restricted until 18 (in addition to the 16/18 split).",
      "cites": [
       8
      ]
     },
     "salzburg": {
      "class": "mixed",
      "text": "Salzburg: drinks containing distilled alcohol are restricted until 18 (in addition to the 16/18 split).",
      "cites": [
       8
      ]
     },
     "karnten": {
      "class": "kaernten",
      "text": "Kärnten (Carinthia): drinks containing distilled alcohol are 18+, and 16–17-year-olds may only drink up to a blood-alcohol level of 0.5‰.",
      "cites": [
       8
      ]
     }
    }
   }
  },
  "BLR": {
   "name": "Belarus",
   "flag": "🇧🇾",
   "category": "all18",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "WHO's latest survey (2023) reports a minimum age of 18 for beer, wine and spirits, both in shops and in bars.",
     "cites": [
      1,
      3
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 (WHO, 2023).",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.3 g/l (WHO).",
     "cites": [
      4
     ]
    }
   ],
   "regions": {
    "type": "Regions (voblasts) & Minsk",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      1,
      3
     ]
    }
   }
  },
  "BEL": {
   "name": "Belgium",
   "flag": "🇧🇪",
   "category": "split16_18",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "16 beer/wine, 18 spirits",
   "catNote": null,
   "ages": {
    "bw_on": 16,
    "bw_off": 16,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3,
     10
    ]
   },
   "derived": {
    "beerWine": 16,
    "spirits": 18,
    "offPremise": 16,
    "onPremise": 16
   },
   "summary": [
    {
     "text": "Belgium allows beer and wine from 16 and spirits from 18.",
     "cites": [
      1,
      3
     ]
    },
    {
     "text": "Since a 2018 tightening, 16–17-year-olds may only buy beer and wine; spirit-based premixes and fortified or aromatised wines (e.g. vermouth) are 18+.",
     "cites": [
      10
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "Beer & wine",
     "text": "16 in shops and bars.",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Spirits & premixes",
     "text": "18, including spirit-based premixes and fortified/aromatised wines.",
     "cites": [
      10,
      1
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l for all drivers including novices; 0.2 g/l for commercial drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Provinces & Brussels-Capital Region",
    "mode": "uniform",
    "note": {
     "text": "Alcohol age rules are federal; no differences between Flanders, Wallonia and Brussels were found.",
     "cites": [
      1,
      10
     ]
    }
   }
  },
  "BIH": {
   "name": "Bosnia and Herzegovina",
   "flag": "🇧🇦",
   "category": "all18",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "WHO's latest survey (2016) reports a minimum age of 18 for beer, wine and spirits, both in shops and in bars.",
     "cites": [
      1,
      3
     ]
    },
    {
     "text": "Trade and alcohol-sale rules are made at entity level; Republika Srpska's trade law bans selling alcohol to under-18s.",
     "cites": [
      11
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 (WHO, 2016).",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Entity rules",
     "text": "Republika Srpska: no sale of alcoholic drinks to under-18s, with mandatory notices at points of sale.",
     "cites": [
      11
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.3 g/l; zero for young/novice drivers (WHO, 2016).",
     "cites": [
      4
     ]
    }
   ],
   "regions": {
    "type": "Entities & Brčko District",
    "mode": "uniform",
    "note": {
     "text": "Trade law is made separately by the Federation of BiH, Republika Srpska and Brčko District, but no difference in the 18 age limit was found (WHO reports 18 nationally). Other entity-level differences were not verified.",
     "cites": [
      1,
      11
     ]
    }
   }
  },
  "BGR": {
   "name": "Bulgaria",
   "flag": "🇧🇬",
   "category": "all18",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "WHO's latest survey (2023) reports a minimum age of 18 for beer, wine and spirits, both in shops and in bars.",
     "cites": [
      1,
      3
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 (WHO, 2023).",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l for all drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Provinces (oblasti)",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      1,
      3
     ]
    }
   }
  },
  "HRV": {
   "name": "Croatia",
   "flag": "🇭🇷",
   "category": "all18",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3,
     12
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "Croatia bans the sale of alcohol to under-18s, and sellers must refuse a sale if a young-looking buyer will not show ID — including at self-checkouts.",
     "cites": [
      1,
      12
     ]
    },
    {
     "text": "An amendment to the Trade Act (NN 59/26, in force since 16 June 2026) lets local councils restrict shop sales of alcohol between 21:00 and 06:00.",
     "cites": [
      12,
      13
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18.",
     "cites": [
      1,
      3,
      12
     ]
    },
    {
     "label": "Local night bans",
     "text": "Municipalities/cities may restrict shop sales 21:00–06:00 (Trade Act amendment, NN 59/26).",
     "cites": [
      12,
      13
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l; zero for novice and commercial drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Counties (županije)",
    "mode": "uniform",
    "note": {
     "text": "Age limits are national. Night-sale restrictions are a municipal option (since 2026), not a county-level rule.",
     "cites": [
      1,
      3,
      12
     ]
    }
   }
  },
  "CYP": {
   "name": "Cyprus",
   "flag": "🇨🇾",
   "category": "all18",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol (17 until 2020)",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     14,
     15,
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "Cyprus raised its minimum age from 17 to 18 in July 2020.",
     "cites": [
      15,
      14
     ]
    },
    {
     "text": "The change followed a WHO-supported review of young people's access to alcohol.",
     "cites": [
      16
     ]
    },
    {
     "text": "This entry covers the law of the Republic of Cyprus; it does not describe rules in the area not under government control.",
     "cites": [
      14
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 (Cap. 144, s. 5, amended by Law 87(I)/2020).",
     "cites": [
      14,
      1
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l; 0.2 g/l for novice and commercial drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Districts",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      14
     ]
    }
   }
  },
  "CZE": {
   "name": "Czechia",
   "flag": "🇨🇿",
   "category": "all18",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "WHO's latest survey (2023) reports a minimum age of 18 for beer, wine and spirits, both in shops and in bars.",
     "cites": [
      1,
      3
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 (WHO, 2023).",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Drink-driving",
     "text": "Zero tolerance (0.0 g/l) for all drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Regions (kraje)",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      1,
      3
     ]
    }
   }
  },
  "DNK": {
   "name": "Denmark",
   "flag": "🇩🇰",
   "category": "mixed",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "16 in shops for drinks ≤6% ABV, 18 otherwise",
   "catNote": "Shops: 16 only for drinks up to 6% ABV (most beer and cider); 18 for everything stronger, including most wine. Bars: 18.",
   "ages": {
    "bw_on": 18,
    "bw_off": 16,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     17,
     19,
     3
    ]
   },
   "derived": {
    "beerWine": 16,
    "spirits": 18,
    "offPremise": 16,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "Denmark has a split by strength and place: 16–17-year-olds may buy drinks of up to 6% ABV in shops, while stronger drinks and all bar service are 18+.",
     "cites": [
      17,
      3
     ]
    },
    {
     "text": "The shop threshold was cut from 16.5% to 6% on 1 April 2025, which moved most wine to 18.",
     "cites": [
      17,
      19,
      18
     ]
    },
    {
     "text": "Under-18s can no longer buy alcohol 22:00–08:00 in designated nightlife zones.",
     "cites": [
      17
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "Beer & cider (≤6%)",
     "text": "16 in shops; 18 in bars and restaurants.",
     "cites": [
      17,
      3
     ]
    },
    {
     "label": "Wine & spirits (>6%)",
     "text": "18 in shops and bars.",
     "cites": [
      17,
      3
     ]
    },
    {
     "label": "ABV threshold",
     "text": "6% since April 2025 (was 16.5%).",
     "cites": [
      17
     ]
    },
    {
     "label": "Nightlife zones",
     "text": "No sales to under-18s 22:00–08:00 in designated zones.",
     "cites": [
      17
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l; 0.2 g/l for novice drivers from 1 July 2025.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Regions",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      17
     ]
    }
   }
  },
  "EST": {
   "name": "Estonia",
   "flag": "🇪🇪",
   "category": "all18",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "The minimum age in Estonia is 18 for all alcohol.",
     "cites": [
      1,
      3
     ]
    },
    {
     "text": "WHO reports that Estonia restricts the hours of off-premise (shop) sales.",
     "cites": [
      5
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18.",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Sale hours",
     "text": "Shop sale hours are restricted (WHO).",
     "cites": [
      5
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.2 g/l for all drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Counties (maakonnad)",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      1,
      3
     ]
    }
   }
  },
  "FIN": {
   "name": "Finland",
   "flag": "🇫🇮",
   "category": "nordic_abv",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "18; 20 to buy drinks over 22% ABV",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 20,
    "cites": [
     20,
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "Anyone 18+ can buy drinks up to 22% ABV and be served any alcohol in restaurants; buying drinks stronger than 22% at the state monopoly Alko requires being 20.",
     "cites": [
      20,
      3
     ]
    },
    {
     "text": "Since 10 June 2024 grocery stores may sell fermented drinks up to 8% ABV; anything stronger is sold only by Alko.",
     "cites": [
      21,
      22
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "Up to 22% ABV",
     "text": "18 in shops, Alko and restaurants.",
     "cites": [
      20,
      1
     ]
    },
    {
     "label": "Over 22% ABV",
     "text": "20 to buy at Alko; 18 in restaurants.",
     "cites": [
      20,
      3
     ]
    },
    {
     "label": "State monopoly",
     "text": "Alko is the only retailer of drinks above the grocery limit.",
     "cites": [
      20,
      21
     ]
    },
    {
     "label": "Grocery ABV limit",
     "text": "8% for fermented drinks (5.5% for other drinks) since 10 June 2024.",
     "cites": [
      21,
      22
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l for all drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Regions (maakunnat) & Åland",
    "mode": "varies",
    "note": {
     "text": "Ages are the same everywhere. Åland is autonomous: it applies Finland's Alcohol Act through its own act with Åland-specific deviations on serving and licensing.",
     "cites": [
      23
     ]
    },
    "legend": "Who legislates on alcohol",
    "classes": {
     "main": {
      "label": "Finnish Alcohol Act",
      "color": "#56B4E9"
     },
     "aland": {
      "label": "Åland: own act applying the Alcohol Act with deviations",
      "color": "#E69F00"
     }
    },
    "default": {
     "class": "main",
     "text": "Finnish Alcohol Act applies: 18 for drinks up to 22% ABV, 20 to buy stronger drinks at Alko.",
     "cites": [
      20
     ]
    },
    "items": {
     "aland": {
      "class": "aland",
      "text": "Åland applies Finland's Alcohol Act through Landskapslag 2021:140, with Åland-specific provisions on serving licences and staff.",
      "cites": [
       23
      ]
     }
    }
   }
  },
  "FRA": {
   "name": "France",
   "flag": "🇫🇷",
   "category": "all18",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     24,
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "Selling or giving alcohol to anyone under 18 is prohibited in France.",
     "cites": [
      24
     ]
    },
    {
     "text": "Under-16s may only enter bars that serve alcohol if accompanied by a responsible adult.",
     "cites": [
      24
     ]
    },
    {
     "text": "Petrol stations may not sell take-away alcohol between 18:00 and 08:00, nor chilled alcohol at any time.",
     "cites": [
      26,
      25
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 (Public Health Code L3342-1 ff.).",
     "cites": [
      24
     ]
    },
    {
     "label": "Under 16 in bars",
     "text": "Only with a parent or responsible adult.",
     "cites": [
      24
     ]
    },
    {
     "label": "Petrol stations",
     "text": "No take-away sales 18:00–08:00; no chilled alcohol.",
     "cites": [
      26
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l; 0.2 g/l for novice drivers and bus drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Regions (metropolitan France)",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      24
     ]
    }
   }
  },
  "DEU": {
   "name": "Germany",
   "flag": "🇩🇪",
   "category": "split16_18",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "16 beer/wine, 18 spirits (14 with a parent)",
   "catNote": null,
   "ages": {
    "bw_on": 16,
    "bw_off": 16,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     27,
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 16,
    "spirits": 18,
    "offPremise": 16,
    "onPremise": 16
   },
   "summary": [
    {
     "text": "Germany allows beer, wine and sparkling wine from 16; spirits and spirit-containing drinks from 18.",
     "cites": [
      27,
      1
     ]
    },
    {
     "text": "14- and 15-year-olds may currently drink beer or wine when accompanied by a parent or guardian (\"accompanied drinking\").",
     "cites": [
      27
     ]
    },
    {
     "text": "On 12 August 2026 the federal cabinet approved a bill to abolish accompanied drinking; it still needs a Bundestag vote.",
     "cites": [
      28,
      29
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "Beer, wine, sparkling wine",
     "text": "16.",
     "cites": [
      27
     ]
    },
    {
     "label": "Spirits",
     "text": "18, including alcopops and other drinks containing spirits.",
     "cites": [
      27
     ]
    },
    {
     "label": "Parent exception",
     "text": "14–15 allowed with a custodial parent; abolition pending in parliament (cabinet decision 12 Aug 2026).",
     "cites": [
      27,
      28,
      29
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l; zero for novice and commercial drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Länder (states)",
    "mode": "uniform",
    "note": {
     "text": "Alcohol age rules are federal (Youth Protection Act); no Land-level differences in age limits.",
     "cites": [
      27
     ]
    }
   }
  },
  "GRC": {
   "name": "Greece",
   "flag": "🇬🇷",
   "category": "all18",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3,
     30
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "Greece bans the sale of alcohol to under-18s under Law 3730/2008.",
     "cites": [
      30,
      1
     ]
    },
    {
     "text": "Law 5216/2025 tightened enforcement, making it a criminal offence to let minors enter bars or drink there and requiring ID checks.",
     "cites": [
      31
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18.",
     "cites": [
      30,
      1,
      3
     ]
    },
    {
     "label": "Enforcement",
     "text": "ID checks; entry and consumption bans for minors in bars (Law 5216/2025).",
     "cites": [
      31
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l; 0.2 g/l for novice and commercial drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Regions (periferies)",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      30
     ]
    }
   }
  },
  "HUN": {
   "name": "Hungary",
   "flag": "🇭🇺",
   "category": "all18",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "WHO's latest survey (2023) reports a minimum age of 18 for beer, wine and spirits, both in shops and in bars.",
     "cites": [
      1,
      3
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 (WHO, 2023).",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Drink-driving",
     "text": "Zero tolerance (0.0 g/l) for all drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Counties & cities with county rights",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      1,
      3
     ]
    }
   }
  },
  "ISL": {
   "name": "Iceland",
   "flag": "🇮🇸",
   "category": "all20",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "20 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 20,
    "bw_off": 20,
    "sp_on": 20,
    "sp_off": 20,
    "cites": [
     32,
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 20,
    "spirits": 20,
    "offPremise": 20,
    "onPremise": 20
   },
   "summary": [
    {
     "text": "Iceland's Alcohol Act forbids selling, serving or handing alcohol to anyone under 20.",
     "cites": [
      32
     ]
    },
    {
     "text": "Retail sale is a state monopoly run by ÁTVR (Vínbúðin).",
     "cites": [
      32
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "20 in shops and bars (Art. 18).",
     "cites": [
      32
     ]
    },
    {
     "label": "State monopoly",
     "text": "ÁTVR has the exclusive right to retail alcohol, with limited exceptions for producers (Art. 10).",
     "cites": [
      32
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.2 g/l (WHO).",
     "cites": [
      4
     ]
    }
   ],
   "regions": {
    "type": "Regions",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      32
     ]
    }
   }
  },
  "IRL": {
   "name": "Ireland",
   "flag": "🇮🇪",
   "category": "all18",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "The minimum age is 18 for all alcohol.",
     "cites": [
      1,
      3
     ]
    },
    {
     "text": "Ireland introduced minimum unit pricing (€0.10 per gram of alcohol) in January 2022.",
     "cites": [
      33
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18.",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Minimum unit pricing",
     "text": "€0.10 per gram of alcohol since January 2022.",
     "cites": [
      33
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l; 0.2 g/l for novice and commercial drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Counties & cities",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      1,
      3
     ]
    }
   }
  },
  "ITA": {
   "name": "Italy",
   "flag": "🇮🇹",
   "category": "all18",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3,
     34
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "Selling or serving alcohol to under-18s is banned in Italy, and sellers must ask for ID unless age is obvious.",
     "cites": [
      34,
      1
     ]
    },
    {
     "text": "Shops may not sell alcohol between midnight and 06:00, and bars may not serve between 03:00 and 06:00.",
     "cites": [
      34
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 (L. 125/2001, art. 14-ter).",
     "cites": [
      34,
      1
     ]
    },
    {
     "label": "Sale hours",
     "text": "Shops: no sales 24:00–06:00. Bars: no service 03:00–06:00. Exceptions on New Year's Eve and 15–16 August.",
     "cites": [
      34
     ]
    },
    {
     "label": "Motorways",
     "text": "Restrictions on alcohol at motorway service areas.",
     "cites": [
      34
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l; zero for novice and commercial drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Regions",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      34
     ]
    }
   }
  },
  "KOS": {
   "name": "Kosovo",
   "flag": "🇽🇰",
   "category": "all18",
   "confidence": "low",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol (unverified)",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     35
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "A travel-information site states the legal drinking age in Kosovo is 18; no official legal text or WHO data could be found to confirm it.",
     "cites": [
      35
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 — unverified; only a low-quality secondary source found.",
     "cites": [
      35
     ]
    }
   ],
   "regions": {
    "type": "Districts",
    "mode": "uniform",
    "note": {
     "text": "No information on regional differences was found.",
     "cites": [
      35
     ]
    }
   }
  },
  "LVA": {
   "name": "Latvia",
   "flag": "🇱🇻",
   "category": "all18",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "The minimum age in Latvia is 18 for all alcohol.",
     "cites": [
      1,
      3
     ]
    },
    {
     "text": "Since 1 August 2025 shops may sell alcohol only 10:00–20:00 Monday to Saturday and 10:00–18:00 on Sundays, and multi-buy discounts are banned.",
     "cites": [
      36,
      37
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18.",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Sale hours",
     "text": "Shops: 10:00–20:00 Mon–Sat; 10:00–18:00 Sun (from 1 Aug 2025).",
     "cites": [
      36
     ]
    },
    {
     "label": "Promotions",
     "text": "Multi-unit discounts and loyalty-programme discounts on alcohol banned.",
     "cites": [
      36
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l; 0.2 g/l for novice drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Planning regions",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      1,
      3,
      36
     ]
    }
   }
  },
  "LIE": {
   "name": "Liechtenstein",
   "flag": "🇱🇮",
   "category": "split16_18",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "16 beer/wine, 18 spirits",
   "catNote": null,
   "ages": {
    "bw_on": 16,
    "bw_off": 16,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     38
    ]
   },
   "derived": {
    "beerWine": 16,
    "spirits": 18,
    "offPremise": 16,
    "onPremise": 16
   },
   "summary": [
    {
     "text": "Liechtenstein's Children and Youth Act bans alcohol under 16 and spirits and alcopops for all minors (under 18).",
     "cites": [
      38
     ]
    },
    {
     "text": "The rules were restated in an amendment issued on 1 July 2026, which also bans passing alcohol to minors.",
     "cites": [
      38
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "Beer & wine",
     "text": "16 (consumption and possession banned under 16).",
     "cites": [
      38
     ]
    },
    {
     "label": "Spirits & alcopops",
     "text": "18.",
     "cites": [
      38
     ]
    },
    {
     "label": "Passing on",
     "text": "Giving or passing alcohol to non-entitled minors is banned, even if meant for someone else.",
     "cites": [
      38
     ]
    }
   ],
   "regions": {
    "type": "Municipalities (Gemeinden)",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      38
     ]
    }
   }
  },
  "LTU": {
   "name": "Lithuania",
   "flag": "🇱🇹",
   "category": "all20",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "20 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 20,
    "bw_off": 20,
    "sp_on": 20,
    "sp_off": 20,
    "cites": [
     39,
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 20,
    "spirits": 20,
    "offPremise": 20,
    "onPremise": 20
   },
   "summary": [
    {
     "text": "Lithuania raised its minimum age from 18 to 20 in 2018.",
     "cites": [
      39,
      1
     ]
    },
    {
     "text": "Shops may sell alcohol only 10:00–20:00 Monday to Saturday and 10:00–15:00 on Sundays.",
     "cites": [
      39
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "20 since 2018.",
     "cites": [
      39,
      1,
      3
     ]
    },
    {
     "label": "Sale hours",
     "text": "Shops: 10:00–20:00 Mon–Sat; 10:00–15:00 Sun.",
     "cites": [
      39
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.4 g/l; zero for novice and commercial drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Counties (apskritys)",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      39
     ]
    }
   }
  },
  "LUX": {
   "name": "Luxembourg",
   "flag": "🇱🇺",
   "category": "all16",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "16 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 16,
    "bw_off": 16,
    "sp_on": 16,
    "sp_off": 16,
    "cites": [
     40,
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 16,
    "spirits": 16,
    "offPremise": 16,
    "onPremise": 16
   },
   "summary": [
    {
     "text": "Luxembourg bans the sale or free offer of drinks above 1.2% ABV to under-16s, both in bars and shops — making it one of the few EU countries with 16 for all alcohol.",
     "cites": [
      40,
      1
     ]
    },
    {
     "text": "A 2020 government action plan proposed raising the age for strong drinks to 18, but no evidence was found that this has been enacted.",
     "cites": [
      41
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "16 (Law of 22 December 2006).",
     "cites": [
      40,
      1,
      3
     ]
    },
    {
     "label": "Proposed change",
     "text": "Raise to 18 for strong drinks (PALMA plan, 2020) — not confirmed as law.",
     "cites": [
      41
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l; 0.2 g/l for novice and commercial drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Districts (former)",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      40
     ]
    }
   }
  },
  "MLT": {
   "name": "Malta",
   "flag": "🇲🇹",
   "category": "all17",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "17 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 17,
    "bw_off": 17,
    "sp_on": 17,
    "sp_off": 17,
    "cites": [
     1,
     3,
     7
    ]
   },
   "derived": {
    "beerWine": 17,
    "spirits": 17,
    "offPremise": 17,
    "onPremise": 17
   },
   "summary": [
    {
     "text": "Malta sets a minimum age of 17 for all alcohol — the only 17 in the EU since Cyprus moved to 18 in 2020.",
     "cites": [
      1,
      3,
      7,
      15
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "17 in shops and bars.",
     "cites": [
      1,
      3,
      7
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l; 0.2 g/l for novice and commercial drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Regions",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      1,
      3
     ]
    }
   }
  },
  "MDA": {
   "name": "Moldova",
   "flag": "🇲🇩",
   "category": "all18",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "WHO's latest survey (2023) reports a minimum age of 18 for beer, wine and spirits, both in shops and in bars.",
     "cites": [
      1,
      3
     ]
    },
    {
     "text": "WHO also reports restrictions on shop and bar sale hours.",
     "cites": [
      5
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 (WHO, 2023).",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.3 g/l (WHO).",
     "cites": [
      4
     ]
    }
   ],
   "regions": {
    "type": "Districts (raioane) & municipalities",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      1,
      3
     ]
    }
   }
  },
  "MCO": {
   "name": "Monaco",
   "flag": "🇲🇨",
   "category": "all18",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "WHO's latest survey (2019) reports a minimum age of 18 for beer, wine and spirits, both in shops and in bars.",
     "cites": [
      1,
      3
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 (WHO, 2019).",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.2 g/l as reported to WHO (2019).",
     "cites": [
      4
     ]
    }
   ],
   "regions": {
    "type": "Single municipality",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      1,
      3
     ]
    }
   }
  },
  "MNE": {
   "name": "Montenegro",
   "flag": "🇲🇪",
   "category": "all18",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "WHO's latest survey (2023) reports a minimum age of 18 for beer, wine and spirits, both in shops and in bars.",
     "cites": [
      1,
      3
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 (WHO, 2023).",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.3 g/l (WHO).",
     "cites": [
      4
     ]
    }
   ],
   "regions": {
    "type": "Municipalities (opštine)",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      1,
      3
     ]
    }
   }
  },
  "NLD": {
   "name": "Netherlands",
   "flag": "🇳🇱",
   "category": "all18",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     42,
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "The Netherlands raised its minimum age from 16 to 18 for all alcohol on 1 January 2014.",
     "cites": [
      43
     ]
    },
    {
     "text": "Under the Alcohol Act, minors may not possess alcohol in public places and, since 1 July 2021, adults may not pass alcohol on to them.",
     "cites": [
      42,
      43
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18.",
     "cites": [
      42,
      1
     ]
    },
    {
     "label": "Public possession",
     "text": "Under-18s may not carry alcohol in public places.",
     "cites": [
      43
     ]
    },
    {
     "label": "Passing on",
     "text": "Giving alcohol to a minor is banned since 1 July 2021.",
     "cites": [
      42
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l; 0.2 g/l for novice drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Provinces",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      42
     ]
    }
   }
  },
  "MKD": {
   "name": "North Macedonia",
   "flag": "🇲🇰",
   "category": "all18",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "WHO's latest survey (2023) reports a minimum age of 18 for beer, wine and spirits, both in shops and in bars.",
     "cites": [
      1,
      3
     ]
    },
    {
     "text": "A 2008 evening ban on retail alcohol sales was later repealed; the ban on sales at petrol stations remains.",
     "cites": [
      44
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 (WHO, 2023).",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Sale hours",
     "text": "Former 19:00/21:00–06:00 retail ban repealed; petrol-station ban kept.",
     "cites": [
      44
     ]
    },
    {
     "label": "Drink-driving",
     "text": "Zero tolerance for novice and professional drivers (WHO). The general limit in WHO's dataset is ambiguously recorded and is not shown.",
     "cites": [
      4
     ]
    }
   ],
   "regions": {
    "type": "Municipalities (opštini)",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      1,
      3
     ]
    }
   }
  },
  "NOR": {
   "name": "Norway",
   "flag": "🇳🇴",
   "category": "nordic_abv",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "18; 20 for drinks of 22% ABV or more",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 20,
    "sp_off": 20,
    "cites": [
     45,
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 20,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "In Norway the age limit is 18 for drinks under 22% ABV and 20 for drinks of 22% or more, both in shops and bars.",
     "cites": [
      45
     ]
    },
    {
     "text": "Ordinary shops may only sell group 1 drinks (up to 4.7% ABV); stronger drinks are sold by the state monopoly Vinmonopolet.",
     "cites": [
      46,
      1
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "Under 22% ABV",
     "text": "18 (sale and serving).",
     "cites": [
      45
     ]
    },
    {
     "label": "22% ABV and above",
     "text": "20 (sale and serving).",
     "cites": [
      45
     ]
    },
    {
     "label": "ABV groups",
     "text": "Group 1: 2.5–4.7%; group 2: 4.7–22%; group 3: 22–60%.",
     "cites": [
      46
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.2 g/l for all drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Counties (pre-2020 boundaries)",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      45
     ]
    }
   }
  },
  "POL": {
   "name": "Poland",
   "flag": "🇵🇱",
   "category": "all18",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "The minimum age in Poland is 18 for all alcohol.",
     "cites": [
      1,
      3
     ]
    },
    {
     "text": "Municipalities (gminy) may ban night-time shop sales; Warsaw's ban (22:00–06:00) covers all districts from 1 June 2026.",
     "cites": [
      47,
      48
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18.",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Night sales",
     "text": "Set by each municipality; e.g. Warsaw 22:00–06:00 in shops and petrol stations.",
     "cites": [
      47,
      48
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.2 g/l for all drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Voivodeships",
    "mode": "uniform",
    "note": {
     "text": "Age limits are national. Night-sale bans are decided by individual municipalities (e.g. Warsaw), a level too fine to show on this voivodeship map.",
     "cites": [
      1,
      3,
      47
     ]
    }
   }
  },
  "PRT": {
   "name": "Portugal",
   "flag": "🇵🇹",
   "category": "all18",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol (since 2015)",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     49,
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "Since 1 July 2015 Portugal bans making any alcoholic drink available to under-18s; before that, 16–17-year-olds could buy beer and wine.",
     "cites": [
      49
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 since July 2015 (Decreto-Lei 106/2015).",
     "cites": [
      49,
      1
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l; 0.2 g/l for novice and commercial drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Districts & autonomous regions",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      49
     ]
    }
   }
  },
  "ROU": {
   "name": "Romania",
   "flag": "🇷🇴",
   "category": "all18",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "WHO's latest survey (2023) reports a minimum age of 18 for beer, wine and spirits, both in shops and in bars.",
     "cites": [
      1,
      3
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 (WHO, 2023).",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Drink-driving",
     "text": "Zero tolerance (0.0 g/l) for all drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Counties (județe) & Bucharest",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      1,
      3
     ]
    }
   }
  },
  "RUS": {
   "name": "Russia",
   "flag": "🇷🇺",
   "category": "all18",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "The minimum age in Russia is 18 for all alcohol.",
     "cites": [
      1,
      3
     ]
    },
    {
     "text": "Federal law bans retail alcohol sales from 23:00 to 08:00, and each region may add stricter time limits or full bans on certain days.",
     "cites": [
      50,
      51
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18.",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Sale hours",
     "text": "Federal ban 23:00–08:00 (171-FZ); many regions extend it — see the regional map.",
     "cites": [
      50
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.3 g/l (WHO).",
     "cites": [
      4
     ]
    }
   ],
   "regions": {
    "type": "Federal subjects",
    "mode": "varies",
    "note": {
     "text": "Colours compare each region's general retail ban window with the federal 23:00–08:00 baseline, as compiled by Garant. Many regions add day-specific bans not shown here.",
     "cites": [
      50
     ]
    },
    "legend": "Retail sale-time restrictions (age is 18 everywhere)",
    "classes": {
     "fed": {
      "label": "Federal baseline only (23:00–08:00)",
      "color": "#56B4E9"
     },
     "strict": {
      "label": "Stricter regional hours",
      "color": "#D55E00"
     },
     "unk": {
      "label": "Not matched in source",
      "color": "#BBBBBB"
     }
    },
    "default": {
     "class": "unk",
     "text": "No entry matched in the source table.",
     "cites": [
      50
     ]
    },
    "items": {
     "gorno-altay": {
      "class": "strict",
      "text": "Altai Republic (Республика Алтай): stricter regional rule — the general retail restriction listed is “11:00 - 19:00 понедельник - пятница 11:00 - 16:00 суббота 11:00 - 14:00 воскресенье” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "pskov": {
      "class": "strict",
      "text": "Pskov (Псковская область): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "krasnodar": {
      "class": "fed",
      "text": "Krasnodar Krai (Краснодарский край): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "karachay-cherkess": {
      "class": "strict",
      "text": "Karachay-Cherkess Republic (Карачаево-Черкесия): stricter regional rule — the general retail restriction listed is “21:00 - 11:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "kabardin-balkar": {
      "class": "strict",
      "text": "Kabardino-Balkaria (Кабардино-Балкария): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "north-ossetia": {
      "class": "strict",
      "text": "Republic of North Ossetia-Alania (Республика Северная Осетия-Алания): stricter regional rule — the general retail restriction listed is “21:00 - 11:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "ingush": {
      "class": "fed",
      "text": "Republic of Ingushetia (Ингушетия): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "chechnya": {
      "class": "fed",
      "text": "Chechen Republic (Чечня): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "dagestan": {
      "class": "strict",
      "text": "Republic of Dagestan (Дагестан): stricter regional rule — the general retail restriction listed is “20:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "murmansk": {
      "class": "strict",
      "text": "Murmansk (Мурманская область): stricter regional rule — the general retail restriction listed is “21:00 - 11:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "karelia": {
      "class": "strict",
      "text": "Karelia (Карелия): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "leningrad": {
      "class": "strict",
      "text": "Leningrad (Ленинградская область): stricter regional rule — the general retail restriction listed is “22:00 - 11:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "kaliningrad": {
      "class": "strict",
      "text": "Kaliningrad (Калининградская область): stricter regional rule — the general retail restriction listed is “21:00 - 11:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "smolensk": {
      "class": "strict",
      "text": "Smolensk (Смоленская область): stricter regional rule — the general retail restriction listed is “21:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "bryansk": {
      "class": "strict",
      "text": "Bryansk (Брянская область): stricter regional rule — the general retail restriction listed is “22:00 - 08:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "kursk": {
      "class": "strict",
      "text": "Kursk (Курская область): stricter regional rule — the general retail restriction listed is “08:00 - 22:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "belgorod": {
      "class": "strict",
      "text": "Belgorod (Белгородская область): stricter regional rule — the general retail restriction listed is “16:00 - 11:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "voronezh": {
      "class": "fed",
      "text": "Voronezh (Воронежская область): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "rostov": {
      "class": "fed",
      "text": "Rostov (Ростовская область): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "buryat": {
      "class": "strict",
      "text": "Republic of Buryatia (Бурятия): stricter regional rule — the general retail restriction listed is “20:00 - 11:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "tuva": {
      "class": "strict",
      "text": "Tuva Republic (Тыва): stricter regional rule — the general retail restriction listed is “15:00 - 11:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "chita": {
      "class": "strict",
      "text": "Zabaykalsky Krai (Забайкальский край): stricter regional rule — the general retail restriction listed is “22:00 - 12:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "amur": {
      "class": "strict",
      "text": "Amur (Амурская область): stricter regional rule — the general retail restriction listed is “21:00 - 11:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "yevrey": {
      "class": "strict",
      "text": "Jewish Autonomous Oblast (Еврейская автономная область): stricter regional rule — the general retail restriction listed is “22:00 - 11:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "khabarovsk": {
      "class": "strict",
      "text": "Khabarovsk Krai (Хабаровский край): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "primor-ye": {
      "class": "strict",
      "text": "Primorsky Krai (Приморский край): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "tyumen": {
      "class": "strict",
      "text": "Tyumen (Тюменская область): stricter regional rule — the general retail restriction listed is “21:00 - 08:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "kurgan": {
      "class": "strict",
      "text": "Kurgan (Курганская область): stricter regional rule — the general retail restriction listed is “20:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "omsk": {
      "class": "strict",
      "text": "Omsk (Омская область): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "novosibirsk": {
      "class": "strict",
      "text": "Novosibirsk (Новосибирская область): stricter regional rule — the general retail restriction listed is “22:00 - 09:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "chelyabinsk": {
      "class": "fed",
      "text": "Chelyabinsk (Челябинская область): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "altay": {
      "class": "strict",
      "text": "Altai Krai (Алтайский край): stricter regional rule — the general retail restriction listed is “22:00 - 09:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "orenburg": {
      "class": "strict",
      "text": "Orenburg (Оренбургская область): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "saratov": {
      "class": "strict",
      "text": "Saratov (Саратовская область): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "astrakhan": {
      "class": "strict",
      "text": "Astrakhan (Астраханская область): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "volgograd": {
      "class": "fed",
      "text": "Volgograd (Волгоградская область): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "maga-buryatdan": {
      "class": "strict",
      "text": "Magadan (Магаданская область): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "sakhalin": {
      "class": "strict",
      "text": "Sakhalin (Сахалинская область): stricter regional rule — the general retail restriction listed is “22:00 - 08:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "chukchi-autonomous-okrug": {
      "class": "strict",
      "text": "Chukotka Autonomous Okrug (Чукотский автономный округ): stricter regional rule — the general retail restriction listed is “22:00 - 12:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "yamal-nenets": {
      "class": "strict",
      "text": "Yamalo-Nenets Autonomous Okrug (Ямало-Ненецкий автономный округ): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "nenets": {
      "class": "strict",
      "text": "Nenets Autonomous Okrug (Ненецкий автономный округ): stricter regional rule — the general retail restriction listed is “20:00 - 11:00 в субботу и воскресенье, а также в нерабочие праздничные дни и в выходные дни” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "sakha-yakutia": {
      "class": "strict",
      "text": "Sakha Republic (Якутия): stricter regional rule — the general retail restriction listed is “20:00 - 14:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "city-of-st-petersburg": {
      "class": "strict",
      "text": "Saint Petersburg (city) (Санкт-Петербург): stricter regional rule — the general retail restriction listed is “22:00 - 11:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "arkhangel-sk": {
      "class": "strict",
      "text": "Arkhangelsk (Архангельская область): stricter regional rule — the general retail restriction listed is “21:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "krasnoyarsk": {
      "class": "fed",
      "text": "Krasnoyarsk Krai (Красноярский край): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "kalmyk": {
      "class": "strict",
      "text": "Republic of Kalmykia (Калмыкия): stricter regional rule — the general retail restriction listed is “20:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "kamchatka": {
      "class": "strict",
      "text": "Kamchatka Krai (Камчатский край): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "bashkortostan": {
      "class": "fed",
      "text": "Bashkortostan (Республика Башкортостан): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "sverdlovsk": {
      "class": "strict",
      "text": "Sverdlovsk (Свердловская область): stricter regional rule — the general retail restriction listed is “22:00 - 09:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "khanty-mansiy": {
      "class": "strict",
      "text": "Khanty-Mansi Autonomous Okrug (Ханты-Мансийский автономный округ — Югра): stricter regional rule — the general retail restriction listed is “20:00 - 08:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "lipetsk": {
      "class": "strict",
      "text": "Lipetsk (Липецкая область): stricter regional rule — the general retail restriction listed is “21:00 - 09:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "tambov": {
      "class": "strict",
      "text": "Tambov (Тамбовская область): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "tomsk": {
      "class": "strict",
      "text": "Tomsk (Томская область): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "tatarstan": {
      "class": "fed",
      "text": "Republic of Tatarstan (Татарстан): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "ul-yanovsk": {
      "class": "fed",
      "text": "Ulyanovsk (Ульяновская область): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "penza": {
      "class": "strict",
      "text": "Penza (Пензенская область): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "kemerovo": {
      "class": "strict",
      "text": "Kemerovo (Кемеровская область): stricter regional rule — the general retail restriction listed is “22:00 - 09:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "orel": {
      "class": "strict",
      "text": "Oryol (Орловская область): stricter regional rule — the general retail restriction listed is “21:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "irkutsk": {
      "class": "fed",
      "text": "Irkutsk (Иркутская область): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "khakass": {
      "class": "fed",
      "text": "Republic of Khakassia (Хакасия): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "mordovia": {
      "class": "strict",
      "text": "Republic of Mordovia (Мордовия): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "kaluga": {
      "class": "strict",
      "text": "Kaluga (Калужская область): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "kostroma": {
      "class": "strict",
      "text": "Kostroma (Костромская область): stricter regional rule — the general retail restriction listed is “22:00 - 09:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "yaroslavl": {
      "class": "fed",
      "text": "Yaroslavl (Ярославская область): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "vladimir": {
      "class": "strict",
      "text": "Vladimir (Владимирская область): stricter regional rule — the general retail restriction listed is “21:00 - 09:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "ryazan": {
      "class": "strict",
      "text": "Ryazan (Рязанская область): stricter regional rule — the general retail restriction listed is “22:00 - 08:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "ivanovo": {
      "class": "strict",
      "text": "Ivanovo (Ивановская область): stricter regional rule — the general retail restriction listed is “21:00 - 09:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "nizhegorod": {
      "class": "strict",
      "text": "Nizhny Novgorod (Нижегородская область): stricter regional rule — the general retail restriction listed is “22:00 - 09:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "tula": {
      "class": "strict",
      "text": "Tula (Тульская область): stricter regional rule — the general retail restriction listed is “22:00 - 14:00 рабочие дни 22:00 - 12:00 выходные (суббота, воскресенье) и нерабочие праздничные дни” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "chuvash": {
      "class": "fed",
      "text": "Chuvash Republic (Чувашия): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "vologda": {
      "class": "fed",
      "text": "Vologda (Вологодская область): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "novgorod": {
      "class": "strict",
      "text": "Novgorod (Новгородская область): stricter regional rule — the general retail restriction listed is “22:00 - 08:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "tver": {
      "class": "strict",
      "text": "Tver (Тверская область): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "moskovskaya": {
      "class": "fed",
      "text": "Moscow Oblast (Московская область): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "moskva": {
      "class": "fed",
      "text": "Moscow (city) (Москва): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "mariy-el": {
      "class": "strict",
      "text": "Mari El Republic (Марий Эл): stricter regional rule — the general retail restriction listed is “22:00 - 11:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "kirov": {
      "class": "fed",
      "text": "Kirov (Кировская область): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "udmurt": {
      "class": "strict",
      "text": "Udmurt Republic (Удмуртия): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "komi": {
      "class": "strict",
      "text": "Komi Republic (Республика Коми): stricter regional rule — the general retail restriction listed is “22:00 - 09:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "perm": {
      "class": "strict",
      "text": "Perm Krai (Пермский край): stricter regional rule — the general retail restriction listed is “22:00 - 08:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "samara": {
      "class": "fed",
      "text": "Samara (Самарская область): only the federal ban applies — no retail alcohol sales 23:00–08:00.",
      "cites": [
       50
      ]
     },
     "stavropol": {
      "class": "strict",
      "text": "Stavropol Krai (Ставропольский край): stricter regional rule — the general retail restriction listed is “22:00 - 10:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     },
     "adygey": {
      "class": "strict",
      "text": "Republic of Adygea (Адыгея): stricter regional rule — the general retail restriction listed is “22:00 - 11:00” (federal baseline: no sales 23:00–08:00). Additional day- or place-specific bans may apply.",
      "cites": [
       50
      ]
     }
    }
   }
  },
  "SMR": {
   "name": "San Marino",
   "flag": "🇸🇲",
   "category": "all16",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "16 for all alcohol (WHO 2019; not independently verified)",
   "catNote": null,
   "ages": {
    "bw_on": 16,
    "bw_off": 16,
    "sp_on": 16,
    "sp_off": 16,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 16,
    "spirits": 16,
    "offPremise": 16,
    "onPremise": 16
   },
   "summary": [
    {
     "text": "WHO's latest survey (2019) reports a minimum age of 16 for beer, wine and spirits, both in shops and in bars.",
     "cites": [
      1,
      3
     ]
    },
    {
     "text": "No official San Marino legal text could be found to confirm this, so treat it with caution.",
     "cites": [
      1
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "16 (WHO, 2019).",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l (WHO, 2019).",
     "cites": [
      4
     ]
    }
   ],
   "regions": {
    "type": "Castelli (municipalities)",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      1,
      3
     ]
    }
   }
  },
  "SRB": {
   "name": "Serbia",
   "flag": "🇷🇸",
   "category": "all18",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "WHO's latest survey (2019) reports a minimum age of 18 for beer, wine and spirits, both in shops and in bars.",
     "cites": [
      1,
      3
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 (WHO, 2019).",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.2 g/l; zero for novice and professional drivers (WHO, 2019).",
     "cites": [
      4
     ]
    }
   ],
   "regions": {
    "type": "Districts (okrugs) & Belgrade",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      1,
      3
     ]
    }
   }
  },
  "SVK": {
   "name": "Slovakia",
   "flag": "🇸🇰",
   "category": "all18",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "WHO's latest survey (2023) reports a minimum age of 18 for beer, wine and spirits, both in shops and in bars.",
     "cites": [
      1,
      3
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 (WHO, 2023).",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "Drink-driving",
     "text": "Zero tolerance (0.0 g/l) for all drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Regions (kraje)",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      1,
      3
     ]
    }
   }
  },
  "SVN": {
   "name": "Slovenia",
   "flag": "🇸🇮",
   "category": "all18",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3,
     53
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "Slovenian law prohibits selling alcohol to under-18s.",
     "cites": [
      53,
      52
     ]
    },
    {
     "text": "WHO reports restrictions on both shop and bar sale hours.",
     "cites": [
      5
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18.",
     "cites": [
      53,
      1
     ]
    },
    {
     "label": "Enforcement",
     "text": "Government campaign urging retailers to check ages (Sept 2025).",
     "cites": [
      52
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l; zero for novice and commercial drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Statistical regions",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      53
     ]
    }
   }
  },
  "ESP": {
   "name": "Spain",
   "flag": "🇪🇸",
   "category": "all18",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "The minimum age is 18 for all alcohol throughout Spain.",
     "cites": [
      1,
      3
     ]
    },
    {
     "text": "There is no single national minors-and-alcohol law yet: a government bill approved in March 2025 is going through the Cortes, and the rules are set by each autonomous community.",
     "cites": [
      54
     ]
    },
    {
     "text": "Several communities ban off-premise sales at night, e.g. the Basque Country (22:00–07:00) and Galicia (22:00–09:00).",
     "cites": [
      56,
      57
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18 in shops and bars.",
     "cites": [
      1,
      3
     ]
    },
    {
     "label": "National bill",
     "text": "Bill on preventing alcohol use by minors before parliament (BOCG 121/000050).",
     "cites": [
      54
     ]
    },
    {
     "label": "Sale hours",
     "text": "Set regionally; see the regional map for verified night-time bans.",
     "cites": [
      55,
      56,
      57,
      58
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l; 0.3 g/l for novice and professional drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Autonomous communities & cities",
    "mode": "varies",
    "note": {
     "text": "Age limits are 18 everywhere. Communities shown in grey were not verified in this dataset — they may still have rules.",
     "cites": [
      1
     ]
    },
    "legend": "Night-time ban on off-premise (shop) alcohol sales (age is 18 everywhere)",
    "classes": {
     "ban": {
      "label": "Night shop-sale ban in regional law (verified)",
      "color": "#0072B2"
     },
     "unk": {
      "label": "Not verified in this dataset",
      "color": "#BBBBBB"
     }
    },
    "default": {
     "class": "unk",
     "text": "Age limit 18. Regional sale-hour rules for this community were not verified in this dataset.",
     "cites": [
      1
     ]
    },
    "items": {
     "comunidad-de-madrid": {
      "class": "ban",
      "text": "Madrid: no retail sale of alcohol at night in shops not licensed for on-site drinking; default night hours 22:00–08:00 unless the municipality sets others (certain convenience stores exempt).",
      "cites": [
       55
      ]
     },
     "pais-vasco-euskadi": {
      "class": "ban",
      "text": "Basque Country: no sale or supply of alcohol in shops not meant for on-site consumption 22:00–07:00, whatever their opening hours.",
      "cites": [
       56
      ]
     },
     "galicia": {
      "class": "ban",
      "text": "Galicia: alcohol sales banned in 'night hours' 22:00–09:00 (exceptions for on-site consumption and restaurant delivery) under Ley 6/2025, which replaced Ley 11/2010.",
      "cites": [
       57
      ]
     },
     "extremadura": {
      "class": "ban",
      "text": "Extremadura: supplying alcohol in shops 22:00–09:00 is an offence.",
      "cites": [
       58
      ]
     }
    }
   }
  },
  "SWE": {
   "name": "Sweden",
   "flag": "🇸🇪",
   "category": "nordic_shop20",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "18 in bars, 20 at Systembolaget",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 20,
    "sp_on": 18,
    "sp_off": 20,
    "cites": [
     59,
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 20,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "Sweden's age limit is 18 in bars and restaurants but 20 at the state retail monopoly Systembolaget.",
     "cites": [
      59,
      3,
      1
     ]
    },
    {
     "text": "A 2025/26 parliamentary motion to lower the Systembolaget age to 18 is a proposal only; the limit remains 20.",
     "cites": [
      60
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "Bars & restaurants",
     "text": "18 for all drinks.",
     "cites": [
      59,
      3
     ]
    },
    {
     "label": "Systembolaget",
     "text": "20 for all drinks.",
     "cites": [
      59,
      1
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.2 g/l for all drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Counties (län)",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      59
     ]
    }
   }
  },
  "CHE": {
   "name": "Switzerland",
   "flag": "🇨🇭",
   "category": "split16_18",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "16 beer/wine, 18 spirits (18 for all in Ticino)",
   "catNote": null,
   "ages": {
    "bw_on": 16,
    "bw_off": 16,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     61,
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 16,
    "spirits": 18,
    "offPremise": 16,
    "onPremise": 16
   },
   "summary": [
    {
     "text": "Federal law sets 16 for beer and wine and 18 for spirits.",
     "cites": [
      61
     ]
    },
    {
     "text": "Cantons may go further: Ticino applies 18 to all alcohol.",
     "cites": [
      61
     ]
    },
    {
     "text": "Geneva and Vaud ban night-time take-away sales, and other cantons list time-based restrictions.",
     "cites": [
      65,
      64,
      62
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "Beer & wine",
     "text": "16 nationally (18 in Ticino).",
     "cites": [
      61
     ]
    },
    {
     "label": "Spirits",
     "text": "18.",
     "cites": [
      61
     ]
    },
    {
     "label": "Cantonal powers",
     "text": "Cantons regulate shop hours, hospitality and retail licensing, advertising and can raise the age.",
     "cites": [
      62
     ]
    },
    {
     "label": "Sale hours",
     "text": "Geneva: no take-away alcohol 21:00–07:00. Vaud: no take-away spirits or beer 21:00–06:00 (wine exempt).",
     "cites": [
      65,
      64
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l; 0.1 g/l for novice and professional drivers.",
     "cites": [
      6
     ]
    }
   ],
   "regions": {
    "type": "Cantons",
    "mode": "varies",
    "note": {
     "text": "Ages are federal, but cantons can raise them and restrict sale times. Cantons shown in grey have no extra rule recorded in this dataset (not a guarantee that none exists).",
     "cites": [
      62,
      63
     ]
    },
    "legend": "Cantonal rules on top of the federal 16/18 ages",
    "classes": {
     "age18": {
      "label": "18 for all alcohol",
      "color": "#D55E00"
     },
     "night": {
      "label": "Night-time take-away ban",
      "color": "#E69F00"
     },
     "time": {
      "label": "Time-based provision listed by FOPH (details not verified)",
      "color": "#F0E442"
     },
     "base": {
      "label": "Federal 16/18 only (no extra rule recorded)",
      "color": "#BBBBBB"
     }
    },
    "default": {
     "class": "base",
     "text": "Federal rules: 16 for beer/wine, 18 for spirits. No extra cantonal rule recorded in this dataset.",
     "cites": [
      61
     ]
    },
    "items": {
     "ticino": {
      "class": "age18",
      "text": "Ticino: all alcoholic drinks are sold only to people aged 18 or over.",
      "cites": [
       61
      ]
     },
     "geneve": {
      "class": "night",
      "text": "Geneva: take-away alcohol sales banned 21:00–07:00 since 2005; no alcohol at petrol stations.",
      "cites": [
       65
      ]
     },
     "vaud": {
      "class": "night",
      "text": "Vaud: delivery and take-away sale of spirits and beer banned 21:00–06:00 (communes may start at 20:00); wine is exempt.",
      "cites": [
       64
      ]
     },
     "basel-stadt": {
      "class": "time",
      "text": "Basel-Stadt: FOPH lists a time-based restriction in the hospitality act (§ 31 para. 3); details not verified here.",
      "cites": [
       62
      ]
     },
     "fribourg": {
      "class": "time",
      "text": "Fribourg: FOPH lists a time-based restriction in the public-establishments act (art. 53 para. 2); details not verified here.",
      "cites": [
       62
      ]
     }
    }
   }
  },
  "TUR": {
   "name": "Türkiye",
   "flag": "🇹🇷",
   "category": "all18",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3,
     66
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "Law 4250 forbids selling alcohol to under-18s.",
     "cites": [
      66,
      1
     ]
    },
    {
     "text": "Outside licensed restaurants and bars, alcohol may not be sold between 22:00 and 06:00, and drinking outside licensed venues in places such as parks and beaches is restricted.",
     "cites": [
      66
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18.",
     "cites": [
      66,
      1
     ]
    },
    {
     "label": "Sale hours",
     "text": "No shop sales 22:00–06:00.",
     "cites": [
      66
     ]
    },
    {
     "label": "Public drinking",
     "text": "Restricted outside licensed premises in public areas such as parks, picnic areas and beaches.",
     "cites": [
      66
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.5 g/l; 0.2 g/l for novice and professional drivers (WHO).",
     "cites": [
      4
     ]
    }
   ],
   "regions": {
    "type": "Provinces (iller)",
    "mode": "uniform",
    "note": {
     "text": "Alcohol laws are set nationally; no regional differences in age limits were found.",
     "cites": [
      66
     ]
    }
   }
  },
  "UKR": {
   "name": "Ukraine",
   "flag": "🇺🇦",
   "category": "all18",
   "confidence": "medium",
   "lastVerified": "2026-10-01",
   "line": "18 for all alcohol",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     1,
     3
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "The minimum age in Ukraine is 18 for all alcohol.",
     "cites": [
      1,
      3,
      68
     ]
    },
    {
     "text": "Under martial law, regional military administrations and city authorities set their own alcohol-sale bans and hours, which change frequently.",
     "cites": [
      67,
      68
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "All alcohol",
     "text": "18.",
     "cites": [
      1,
      3,
      68
     ]
    },
    {
     "label": "Martial-law rules",
     "text": "Local and regional authorities can restrict or ban sales; e.g. in 2022 western oblasts relaxed bans while Lviv city kept its ban.",
     "cites": [
      67
     ]
    },
    {
     "label": "Drink-driving",
     "text": "0.2 g/l (WHO).",
     "cites": [
      4
     ]
    }
   ],
   "regions": {
    "type": "Oblasts, Crimea & cities with special status",
    "mode": "uniform",
    "note": {
     "text": "Age limits are national. Martial-law sale restrictions are set locally and change often, so they are not mapped. Crimea and Sevastopol are shown as part of Ukraine; Ukrainian law cannot currently be enforced in occupied areas.",
     "cites": [
      1,
      3,
      67
     ]
    }
   }
  },
  "GBR": {
   "name": "United Kingdom",
   "flag": "🇬🇧",
   "category": "all18",
   "confidence": "high",
   "lastVerified": "2026-10-01",
   "line": "18 (16–17 may drink beer/wine with a meal, not in NI)",
   "catNote": null,
   "ages": {
    "bw_on": 18,
    "bw_off": 18,
    "sp_on": 18,
    "sp_off": 18,
    "cites": [
     69,
     1
    ]
   },
   "derived": {
    "beerWine": 18,
    "spirits": 18,
    "offPremise": 18,
    "onPremise": 18
   },
   "summary": [
    {
     "text": "In the UK you must be 18 to buy alcohol.",
     "cites": [
      69
     ]
    },
    {
     "text": "In England and Wales, 16–17-year-olds accompanied by an adult may drink (but not buy) beer, wine or cider with a meal; Scotland has a similar meal rule.",
     "cites": [
      69,
      76
     ]
    },
    {
     "text": "Northern Ireland has no such exception: under-18s may only drink in a private house.",
     "cites": [
      77
     ]
    },
    {
     "text": "Scotland and Wales set a minimum unit price of 65p, and Scotland has a lower drink-drive limit.",
     "cites": [
      72,
      74,
      70
     ]
    }
   ],
   "unverifiedSummary": null,
   "facts": [
    {
     "label": "Buying",
     "text": "18 everywhere in the UK.",
     "cites": [
      69,
      77
     ]
    },
    {
     "label": "Meal exception",
     "text": "16–17 may drink beer, wine or cider with a table meal when accompanied by an adult (England, Wales, Scotland).",
     "cites": [
      69,
      76
     ]
    },
    {
     "label": "Minimum unit pricing",
     "text": "Scotland 65p/unit; Wales 65p/unit from 1 October 2026; none in England or Northern Ireland.",
     "cites": [
      72,
      74
     ]
    },
    {
     "label": "Drink-driving",
     "text": "80 mg/100 ml blood in England, Wales and NI; 50 mg in Scotland. A cut to 50 mg (20 mg for new drivers) in England & Wales was announced in January 2026 but is not yet law.",
     "cites": [
      70,
      71
     ]
    }
   ],
   "regions": {
    "type": "Constituent countries",
    "mode": "varies",
    "note": {
     "text": "The 18 purchase age is UK-wide; pricing, licensing and drink-drive rules differ between the four nations.",
     "cites": [
      69,
      70
     ]
    },
    "legend": "Minimum unit pricing, drink-drive limit and youth rules",
    "classes": {
     "scot": {
      "label": "MUP 65p + 50 mg drink-drive limit",
      "color": "#0072B2"
     },
     "wales": {
      "label": "MUP 65p (from 1 Oct 2026)",
      "color": "#56B4E9"
     },
     "eng": {
      "label": "No MUP",
      "color": "#F0E442"
     },
     "ni": {
      "label": "No MUP; no 16–17 meal exception",
      "color": "#E69F00"
     }
    },
    "default": {
     "class": "eng",
     "text": "",
     "cites": []
    },
    "items": {
     "england": {
      "class": "eng",
      "text": "England: purchase age 18; 16–17 may drink beer, wine or cider with a meal if accompanied; no minimum unit price; drink-drive limit 80 mg/100 ml.",
      "cites": [
       69,
       70
      ]
     },
     "wales": {
      "class": "wales",
      "text": "Wales: minimum unit price rises from 50p to 65p on 1 October 2026; drink-drive limit 80 mg/100 ml; same 16–17 meal rule as England.",
      "cites": [
       74,
       70,
       69
      ]
     },
     "scotland": {
      "class": "scot",
      "text": "Scotland: minimum unit price 65p; drink-drive limit 50 mg/100 ml; shop (off-sales) hours 10:00–22:00; 16–17 may have beer, wine or cider with a meal in an eating area.",
      "cites": [
       72,
       73,
       70,
       76,
       75
      ]
     },
     "northern-ireland": {
      "class": "ni",
      "text": "Northern Ireland: under-18s may not buy alcohol or drink it anywhere except a private house; no minimum unit price; drink-drive limit 80 mg/100 ml.",
      "cites": [
       77,
       70
      ]
     }
    }
   }
  },
  "VAT": {
   "name": "Vatican City",
   "flag": "🇻🇦",
   "category": "unknown",
   "confidence": "low",
   "lastVerified": "2026-10-01",
   "line": "No verified minimum age",
   "catNote": null,
   "ages": {
    "bw_on": null,
    "bw_off": null,
    "sp_on": null,
    "sp_off": null,
    "cites": []
   },
   "derived": {
    "beerWine": null,
    "spirits": null,
    "offPremise": null,
    "onPremise": null
   },
   "summary": [],
   "unverifiedSummary": "No official source or WHO data on a minimum alcohol age in Vatican City was found. Any figure would be a guess, so none is shown.",
   "facts": [],
   "regions": {
    "type": "City-state",
    "mode": "uniform",
    "note": {
     "text": "Single city-state; no regional subdivisions.",
     "cites": [
      80
     ]
    }
   }
  }
 },
 "sources": [
  {
   "id": 1,
   "key": "who_off",
   "group": "GENERAL",
   "title": "Global Health Observatory: Age limits – off-premise sales (indicator SA_0000001699, data API)",
   "publisher": "World Health Organization",
   "url": "https://ghoapi.azureedge.net/api/SA_0000001699",
   "type": "intl",
   "accessed": "2026-10-01",
   "supports": "Minimum purchase ages in shops by beverage type (latest survey year 2023 for most countries; 2016/2019 for some)"
  },
  {
   "id": 2,
   "key": "who_off_page",
   "group": "GENERAL",
   "title": "Age limits – off-premise sales (indicator details page)",
   "publisher": "World Health Organization",
   "url": "https://www.who.int/data/gho/data/indicators/indicator-details/GHO/age-limits-off-premise-sales",
   "type": "intl",
   "accessed": "2026-10-01",
   "supports": "Indicator definition for off-premise age limits"
  },
  {
   "id": 3,
   "key": "who_on",
   "group": "GENERAL",
   "title": "Global Health Observatory: Age limits – on-premise service (indicator SA_0000001518, data API)",
   "publisher": "World Health Organization",
   "url": "https://ghoapi.azureedge.net/api/SA_0000001518",
   "type": "intl",
   "accessed": "2026-10-01",
   "supports": "Minimum ages for service in bars/restaurants by beverage type"
  },
  {
   "id": 4,
   "key": "who_bac",
   "group": "GENERAL",
   "title": "Global Health Observatory: Legal blood alcohol concentration (BAC) limits (indicator SA_0000001520, data API)",
   "publisher": "World Health Organization",
   "url": "https://ghoapi.azureedge.net/api/SA_0000001520",
   "type": "intl",
   "accessed": "2026-10-01",
   "supports": "General, novice and professional-driver BAC limits for non-EU countries"
  },
  {
   "id": 5,
   "key": "who_hours",
   "group": "GENERAL",
   "title": "Global Health Observatory: Off-premise sales restrictions on hours (indicator SA_0000001526, data API)",
   "publisher": "World Health Organization",
   "url": "https://ghoapi.azureedge.net/api/SA_0000001526",
   "type": "intl",
   "accessed": "2026-10-01",
   "supports": "Whether a country restricts shop sale hours"
  },
  {
   "id": 6,
   "key": "etsc_bac",
   "group": "GENERAL",
   "title": "Blood Alcohol Content (BAC) Drink Driving Limits across Europe",
   "publisher": "European Transport Safety Council (ETSC)",
   "url": "https://etsc.eu/issues/drink-driving/blood-alcohol-content-bac-drink-driving-limits-across-europe/",
   "type": "intl",
   "accessed": "2026-10-01",
   "supports": "Standard, commercial and novice BAC limits for EU/EEA countries, UK and Switzerland"
  },
  {
   "id": 7,
   "key": "fra_2017",
   "group": "GENERAL",
   "title": "Mapping minimum age requirements: purchase and consumption of alcohol (2017)",
   "publisher": "European Union Agency for Fundamental Rights (FRA)",
   "url": "https://fra.europa.eu/en/publication/2017/mapping-minimum-age-requirements/purchase-consumption-alcohol",
   "type": "intl",
   "accessed": "2026-10-01",
   "supports": "EU-wide comparison of purchase vs consumption ages (2017 snapshot; used for context only)"
  },
  {
   "id": 8,
   "key": "at_usp",
   "group": "AUT",
   "title": "Vereinheitlichter Jugendschutz in der Gastronomie",
   "publisher": "Unternehmensserviceportal (USP), Republic of Austria",
   "url": "https://www.usp.gv.at/themen/brancheninformationen/gastronomie-und-tourismus/jugendschutz-gastronomie.html",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "16 for non-distilled / 18 for spirits; Länder harmonised in 2019; remaining Land differences (Burgenland, Kärnten, Salzburg)"
  },
  {
   "id": 9,
   "key": "at_bka",
   "group": "AUT",
   "title": "Jugendschutz",
   "publisher": "Bundeskanzleramt (Federal Chancellery), Austria",
   "url": "https://www.bundeskanzleramt.gv.at/agenda/jugend/jugendschutz",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Youth protection is legislated by the nine Länder"
  },
  {
   "id": 10,
   "key": "be_bxl",
   "group": "BEL",
   "title": "Health Minister: from now on only beer and wine may be sold to those aged 16 to 18",
   "publisher": "Brussels Express",
   "url": "https://brussels-express.eu/health-minister-from-now-on-only-beer-and-wine-may-be-sold-to-those-aged-16/",
   "type": "news",
   "accessed": "2026-10-01",
   "supports": "16–17-year-olds limited to beer and wine; spirits, spirit-based premixes and fortified/aromatised wines 18+ (2018 announcement)"
  },
  {
   "id": 11,
   "key": "ba_paragraf",
   "group": "BIH",
   "title": "Republika Srpska: zabrana prodaje alkohola maloljetnicima (news, 11 Nov 2019)",
   "publisher": "Paragraf.ba (legal news service)",
   "url": "https://www.paragraf.ba/dnevne-vijesti/11112019/11112019-vijest6.html",
   "type": "other",
   "accessed": "2026-10-01",
   "supports": "Republika Srpska trade law: no sale of alcoholic drinks to under-18s; notices at points of sale"
  },
  {
   "id": 12,
   "key": "hr_hok",
   "group": "HRV",
   "title": "Zakon o izmjenama i dopunama Zakona o trgovini (NN 59/26.)",
   "publisher": "Hrvatska obrtnička komora (Croatian Chamber of Trades and Crafts)",
   "url": "https://www.hok.hr/aktualno/zakon-o-izmjenama-i-dopunama-zakona-o-trgovini-nn-5926",
   "type": "other",
   "accessed": "2026-10-01",
   "supports": "Trade Act amendment NN 59/26 (published 9 June 2026, in force 16 June 2026): local councils may restrict shop alcohol sales 21:00–06:00; ID refusal rule for under-18s incl. self-checkouts"
  },
  {
   "id": 13,
   "key": "hr_hrt",
   "group": "HRV",
   "title": "Izmjenama Zakona o trgovini regulira se ograničenje prodaje alkohola",
   "publisher": "HRT (Croatian Radiotelevision)",
   "url": "https://vijesti.hrt.hr/gospodarstvo/izmjenama-zakona-o-trgovini-regulira-se-ogranicenje-prodaje-alkohola-12609494",
   "type": "news",
   "accessed": "2026-10-01",
   "supports": "Report on the draft amendment (public consultation): 21:00–06:00 local restriction option"
  },
  {
   "id": 14,
   "key": "cy_cylaw",
   "group": "CYP",
   "title": "Ο περί Πωλήσεως Οινοπνευματωδών Ποτών Νόμος (ΚΕΦ.144), as amended incl. 87(I)/2020",
   "publisher": "CyLaw (Cyprus legal database)",
   "url": "https://www.cylaw.org/nomoi/enop/non-ind/0_144/full.html",
   "type": "other",
   "accessed": "2026-10-01",
   "supports": "Section 5: no sale/supply of alcohol to persons under 18 (amending law 87(I)/2020)"
  },
  {
   "id": 15,
   "key": "cy_alpha",
   "group": "CYP",
   "title": "Τέλος η πώληση αλκοόλ σε νεαρούς κάτω των 18",
   "publisher": "Alpha News Cyprus",
   "url": "https://www.alphanews.live/cyprus/telos-i-polisi-alkool-se-nearous-kato-ton-18/",
   "type": "news",
   "accessed": "2026-10-01",
   "supports": "July 2020: purchase age raised from 17 to 18"
  },
  {
   "id": 16,
   "key": "cy_who",
   "group": "CYP",
   "title": "Reducing young people's access to alcohol in Cyprus (10 January 2018)",
   "publisher": "WHO Regional Office for Europe",
   "url": "https://www.who.int/europe/news/item/10-01-2018-reducing-young-people-s-access-to-alcohol-in-cyprus",
   "type": "intl",
   "accessed": "2026-10-01",
   "supports": "Background: previous age limit of 17 and the amendment proposal"
  },
  {
   "id": 17,
   "key": "dk_dr",
   "group": "DNK",
   "title": "Aldersgrænsen for køb af alkohol hæves fra april",
   "publisher": "DR (Danmarks Radio)",
   "url": "https://www.dr.dk/nyheder/seneste/aldersgraensen-koeb-af-alkohol-haeves-fra-april",
   "type": "news",
   "accessed": "2026-10-01",
   "supports": "From April 2025 16–17-year-olds may only buy drinks up to 6% ABV (previously 16.5%); no under-18 purchases 22:00–08:00 in designated nightlife zones"
  },
  {
   "id": 18,
   "key": "dk_bill",
   "group": "DNK",
   "title": "Forslag til lov om ændring af lov om tobaksvarer m.v. … og lov om forbud mod salg af tobak og alkohol til personer under 18 år (L 173, 2023-24)",
   "publisher": "Retsinformation (Danish official legal information)",
   "url": "https://www.retsinformation.dk/eli/ft/202312L00173",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Bill implementing the prevention plan for children and young people (alcohol age-limit changes)"
  },
  {
   "id": 19,
   "key": "dk_sik",
   "group": "DNK",
   "title": "Nye aldersgrænser for salg af alkohol til 16-17-årige: Gælder fra 1. april 2025",
   "publisher": "Sikkerhedsstyrelsen (Danish Safety Technology Authority)",
   "url": "https://www.sik.dk/nyheder/nye-aldersgraenser-salg-alkohol-16-17-aarige-gaelder-1-april-2025",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Effective date of the new age limits (1 April 2025)"
  },
  {
   "id": 20,
   "key": "fi_alko",
   "group": "FIN",
   "title": "Who can buy at Alko?",
   "publisher": "Alko Inc. (state retail monopoly)",
   "url": "https://www.alko.fi/en/services/shopping-alko-store/who-can-buy",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "18 for drinks up to 22% ABV, 20 for stronger drinks"
  },
  {
   "id": 21,
   "key": "fi_stm",
   "group": "FIN",
   "title": "Legislative amendment would allow sale of beverages containing 8 per cent alcohol in grocery stores",
   "publisher": "Ministry of Social Affairs and Health (STM), Finland",
   "url": "https://stm.fi/en/-/legislative-amendment-would-allow-sale-of-beverages-containing-8-per-cent-alcohol-in-grocery-stores",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Fermented drinks up to 8% ABV allowed in grocery stores (in force from 10 June 2024)"
  },
  {
   "id": 22,
   "key": "fi_yle",
   "group": "FIN",
   "title": "Changes to Finland's alcohol law hit Alko sales",
   "publisher": "Yle News",
   "url": "https://yle.fi/a/74-20098967",
   "type": "news",
   "accessed": "2026-10-01",
   "supports": "8% grocery limit took effect 10 June 2024 (previously 5.5%)"
  },
  {
   "id": 23,
   "key": "ax_lag",
   "group": "FIN",
   "title": "Landskapslag (2021:140) om tillämpning på Åland av alkohollagen",
   "publisher": "Ålands landskapsregering (Government of Åland)",
   "url": "https://regeringen.ax/node/53280",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Åland applies Finland's Alcohol Act through its own act, with Åland-specific deviations for serving/licensing"
  },
  {
   "id": 24,
   "key": "fr_sp",
   "group": "FRA",
   "title": "Vente d'alcool : interdictions et autorisations (fiche F20104)",
   "publisher": "Service-Public.fr (Direction de l'information légale et administrative)",
   "url": "https://www.service-public.gouv.fr/particuliers/vosdroits/F20104",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "No sale or offer of alcohol to under-18s; under-16s in bars only with an adult; ID checks"
  },
  {
   "id": 25,
   "key": "fr_spf",
   "group": "FRA",
   "title": "Quelles sont les dispositions réglementaires liées à la consommation d'alcool en France ?",
   "publisher": "Santé publique France",
   "url": "https://www.santepubliquefrance.fr/alcool/quelles-sont-les-dispositions-reglementaires-liees-a-la-consommation-dalcool-en-france",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Overview of French alcohol regulation (Loi Évin, minors, petrol stations)"
  },
  {
   "id": 26,
   "key": "fr_senat",
   "group": "FRA",
   "title": "Question écrite n° 01199 – vente d'alcool dans les stations-service (2012)",
   "publisher": "Sénat (French Senate)",
   "url": "https://www.senat.fr/questions/base/2012/qSEQ120701199.html",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Petrol stations: no take-away alcohol 18:00–08:00 and no chilled alcohol at any time (Code de la santé publique L3322-9, from Law 2009-879)"
  },
  {
   "id": 27,
   "key": "de_juschg",
   "group": "DEU",
   "title": "Jugendschutzgesetz (JuSchG) § 9 Alkoholische Getränke",
   "publisher": "Bundesministerium der Justiz / juris (gesetze-im-internet.de)",
   "url": "https://www.gesetze-im-internet.de/juschg/__9.html",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "16 beer/wine/sparkling wine, 18 spirits and spirit-containing drinks; 14–15 allowed with a custodial parent"
  },
  {
   "id": 28,
   "key": "de_tonline",
   "group": "DEU",
   "title": "Bundeskabinett schafft \"begleitetes Trinken\" für Jugendliche ab",
   "publisher": "t-online",
   "url": "https://www.t-online.de/nachrichten/deutschland/innenpolitik/id_101385496/bundeskabinett-schafft-begleitetes-trinken-fuer-jugendliche-ab.html",
   "type": "news",
   "accessed": "2026-10-01",
   "supports": "Cabinet approved (Aug 2026) a bill to abolish accompanied drinking at 14–15; Bundestag still has to vote"
  },
  {
   "id": 29,
   "key": "de_n4t",
   "group": "DEU",
   "title": "Bundesregierung streicht \"begleitetes Trinken\": Kein Alkohol mehr für 14-Jährige",
   "publisher": "News4teachers",
   "url": "https://www.news4teachers.de/2026/08/bundesregierung-streicht-begleitetes-trinken-kein-alkohol-mehr-fuer-14-jaehrige/",
   "type": "news",
   "accessed": "2026-10-01",
   "supports": "Cabinet decision of 12 August 2026; bill pending in parliament"
  },
  {
   "id": 30,
   "key": "gr_law3730",
   "group": "GRC",
   "title": "Νόμος 3730/2008 – Προστασία ανηλίκων από τον καπνό και τα αλκοολούχα ποτά",
   "publisher": "Taxheaven (Greek legislation database)",
   "url": "https://www.taxheaven.gr/law/3730/2008",
   "type": "other",
   "accessed": "2026-10-01",
   "supports": "Law 3730/2008 on protecting minors from tobacco and alcohol (18)"
  },
  {
   "id": 31,
   "key": "gr_n5216",
   "group": "GRC",
   "title": "«Απαγορεύεται η είσοδος και η κατανάλωση αλκοόλ σε ανηλίκους». Νέο ποινικό αδίκημα με το Ν 5216/2025",
   "publisher": "Nomiki Bibliothiki (legal publisher)",
   "url": "https://daily.nb.org/nomothesia-nomologia/apagorevetai-i-eisodos-kai-i-katanalosi-alkool-se-anilikous-neo-poiniko-adikima-me-to-n-5216-2025/",
   "type": "other",
   "accessed": "2026-10-01",
   "supports": "Law 5216/2025 tightens enforcement: ID checks, entry and consumption bans for minors in bars"
  },
  {
   "id": 32,
   "key": "is_law",
   "group": "ISL",
   "title": "Áfengislög nr. 75/1998 (current consolidated text, version 157c)",
   "publisher": "Alþingi (Parliament of Iceland)",
   "url": "https://www.althingi.is/lagas/nuna/1998075.html",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Art. 18: no sale or supply to anyone under 20; Art. 10: ÁTVR retail monopoly"
  },
  {
   "id": 33,
   "key": "ie_hrb",
   "group": "IRL",
   "title": "MUP: The evidence behind new pricing to target harmful drinking",
   "publisher": "Health Research Board (Ireland)",
   "url": "https://www.hrb.ie/news-stories/mup-the-evidence-behind-new-pricing-to-target-harmful-drinking/",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Minimum unit pricing (€0.10 per gram of alcohol) introduced January 2022"
  },
  {
   "id": 34,
   "key": "it_miolegale",
   "group": "ITA",
   "title": "Limiti vendita alcolici: limiti di età, orari e luoghi",
   "publisher": "MioLegale.it (legal guide)",
   "url": "https://miolegale.it/guide/limiti-vendita-alcolici/",
   "type": "other",
   "accessed": "2026-10-01",
   "supports": "18 for sale and service (L. 125/2001, art. 14-ter); shops may not sell alcohol 24:00–06:00; bars no service 03:00–06:00; restrictions at motorway service areas"
  },
  {
   "id": 35,
   "key": "xk_tripbase",
   "group": "KOS",
   "title": "Legal Drinking Age in Kosovo — Alcohol Laws & Penalties",
   "publisher": "Tripbase (travel information site)",
   "url": "https://www.tripbase.com/drug-laws/kosovo/alcohol/",
   "type": "other",
   "accessed": "2026-10-01",
   "supports": "States the legal drinking age is 18 (low-quality secondary source; no official text found)"
  },
  {
   "id": 36,
   "key": "lv_saeima",
   "group": "LVA",
   "title": "Alcohol sales restrictions tightened in effort to reduce consumption",
   "publisher": "Saeima (Parliament of Latvia)",
   "url": "https://www.saeima.lv/en/news/saeima-news/34236-alcohol-sales-restrictions-tightened-in-effort-to-reduce-consumption",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "From 1 August 2025 retail alcohol sales only 10:00–20:00 Mon–Sat and 10:00–18:00 on Sundays; ban on multi-buy discounts"
  },
  {
   "id": 37,
   "key": "lv_lsm",
   "group": "LVA",
   "title": "Alcohol sales hours to be limited from August in Latvia",
   "publisher": "LSM (Latvian Public Broadcasting)",
   "url": "https://eng.lsm.lv/article/economy/economy/09.01.2025-alcohol-sales-hours-to-be-limited-from-august-in-latvia.a582974/",
   "type": "news",
   "accessed": "2026-10-01",
   "supports": "Confirms the August 2025 sale-hour limits"
  },
  {
   "id": 38,
   "key": "li_kjg2026",
   "group": "LIE",
   "title": "Gesetz vom 8. Mai 2026 über die Abänderung des Kinder- und Jugendgesetzes (LGBl. 2026 Nr. 213)",
   "publisher": "Liechtensteinisches Landesgesetzblatt (gesetze.li)",
   "url": "https://gesetze.li/chrono/pdf/2026213000",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Art. 69 KJG: alcohol banned under 16; spirits and alcopops banned for all minors (under 18)"
  },
  {
   "id": 39,
   "key": "lt_lrt",
   "group": "LTU",
   "title": "Lithuania managed to cut alcohol consumption. Do its policies work?",
   "publisher": "LRT (Lithuanian National Radio and Television)",
   "url": "https://www.lrt.lt/en/news-in-english/19/2152919/lithuania-managed-to-cut-alcohol-consumption-do-its-policies-work",
   "type": "news",
   "accessed": "2026-10-01",
   "supports": "Age raised from 18 to 20 in 2018; shops sell alcohol 10:00–20:00 Mon–Sat and 10:00–15:00 on Sundays"
  },
  {
   "id": 40,
   "key": "lu_brochure",
   "group": "LUX",
   "title": "Pas d'alcool aux moins de 16 ans – nouvelle loi (Loi du 22 décembre 2006)",
   "publisher": "Ministère de la Santé, Luxembourg (santesecu.public.lu)",
   "url": "https://santesecu.public.lu/dam-assets/fr/publications/p/pas-alcool-moins-16ans-nouvelle-loi/pas-alcool-moins-16-ans-nouvelle-loi-de.pdf",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "No sale or free offer of drinks above 1.2% ABV to under-16s, on or off premises"
  },
  {
   "id": 41,
   "key": "lu_quotidien",
   "group": "LUX",
   "title": "Vente d'alcool aux jeunes : le Luxembourg va porter l'âge légal à 18 ans (24 January 2020)",
   "publisher": "Le Quotidien",
   "url": "https://lequotidien.lu/luxembourg/vente-dalcool-aux-jeunes-le-luxembourg-va-porter-lage-legal-a-18-ans/",
   "type": "news",
   "accessed": "2026-10-01",
   "supports": "PALMA action plan (2020–2024) proposed raising the age for strong drinks to 18 — no evidence found that this was enacted"
  },
  {
   "id": 42,
   "key": "nl_rijk",
   "group": "NLD",
   "title": "Alcohol: wetgeving",
   "publisher": "Rijksoverheid (Government of the Netherlands)",
   "url": "https://www.rijksoverheid.nl/onderwerpen/alcohol/alcohol-wetgeving",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Alcoholwet: 18 for all alcohol; ban on passing alcohol to minors (since 1 July 2021)"
  },
  {
   "id": 43,
   "key": "nl_khn",
   "group": "NLD",
   "title": "NIX18: leeftijdsgrens alcohol 18 jaar",
   "publisher": "Koninklijke Horeca Nederland (KHN)",
   "url": "https://khn.nl/kennis/leeftijdsgrens-alcohol-18-jaar",
   "type": "other",
   "accessed": "2026-10-01",
   "supports": "Age limit raised from 16 to 18 on 1 January 2014; minors may not possess alcohol in public"
  },
  {
   "id": 44,
   "key": "mk_civil",
   "group": "MKD",
   "title": "Алкохолот повторно ќе се продава навечер, досегашните рестрикции без ефекти",
   "publisher": "Civil Media",
   "url": "https://civilmedia.mk/alokoholot-povtorno-ke-se-prodava-navecher-dosegashnite-restriktsii-bez-efekti",
   "type": "news",
   "accessed": "2026-10-01",
   "supports": "The 2008 evening ban on retail alcohol sales (19:00/21:00–06:00) was repealed; ban at petrol stations and under-18 ban remain"
  },
  {
   "id": 45,
   "key": "no_age",
   "group": "NOR",
   "title": "Alkoholloven med kommentarer – § 1-5 Aldersgrenser",
   "publisher": "Helsedirektoratet (Norwegian Directorate of Health)",
   "url": "https://www.helsedirektoratet.no/rundskriv/alkoholloven/kapittel-1-alminnelige-bestemmelser/-1-5.aldersgrenser",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "18 for drinks under 22% ABV; 20 for 22% ABV and above (sale and serving)"
  },
  {
   "id": 46,
   "key": "no_def",
   "group": "NOR",
   "title": "Alkoholloven med kommentarer – § 1-3 Definisjoner",
   "publisher": "Helsedirektoratet (Norwegian Directorate of Health)",
   "url": "https://www.helsedirektoratet.no/rundskriv/alkoholloven/kapittel-1-alminnelige-bestemmelser/-1-3.definisjoner",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Beverage groups (group 1: 2.5–4.7% ABV, group 2: 4.7–22%, group 3: 22–60%)"
  },
  {
   "id": 47,
   "key": "pl_waw",
   "group": "POL",
   "title": "Ograniczenia nocnej sprzedaży alkoholu w Warszawie – pierwszy etap od listopada",
   "publisher": "Urząd m.st. Warszawy (City of Warsaw)",
   "url": "https://um.warszawa.pl/-/ograniczenia-nocnej-sprzedazy-alkoholu-w-warszawie-pierwszy-etap-od-listopada",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Warsaw night-time off-premise sales ban 22:00–06:00 (phased in; legal basis: municipal powers under the Act on Upbringing in Sobriety)"
  },
  {
   "id": 48,
   "key": "pl_infor",
   "group": "POL",
   "title": "Zakaz sprzedaży alkoholu w nocy od 22:00 do 6:00 … wejdzie od 1 czerwca 2026",
   "publisher": "Infor.pl",
   "url": "https://www.infor.pl/prawo/nowosci-prawne/7537737,nocna-prohibicja-w-warszawie-przeglosowana-od-1-czerwca-2026-po-2200-alkoholu-w-sklepach-i-na-stacjach-paliw-juz-nie-kupisz-zakaz-sprzedazy-alkoholu-monopolowy-koniec-uchwala-radnych-stolica.html",
   "type": "news",
   "accessed": "2026-10-01",
   "supports": "Warsaw-wide night ban in shops and petrol stations from 1 June 2026"
  },
  {
   "id": 49,
   "key": "pt_dl106",
   "group": "PRT",
   "title": "Decreto-Lei n.º 106/2015, de 16 de junho",
   "publisher": "Direção-Geral da Educação (copy of the Diário da República text)",
   "url": "https://www.dge.mec.pt/sites/default/files/Esaude/dl_106_2015_alcool.pdf",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Ban on selling/making available any alcoholic beverage to under-18s from 1 July 2015 (previously 16 for non-spirits)"
  },
  {
   "id": 50,
   "key": "ru_garant",
   "group": "RUS",
   "title": "Справка об ограничении продажи алкоголя и энергетиков (regional sale-time restrictions table)",
   "publisher": "Garant (Russian legal information system)",
   "url": "https://base.garant.ru/57746446/",
   "type": "other",
   "accessed": "2026-10-01",
   "supports": "Federal ban on retail alcohol sales 23:00–08:00 (Federal Law 171-FZ) and each region's additional restrictions"
  },
  {
   "id": 51,
   "key": "ru_consultant",
   "group": "RUS",
   "title": "По вопросу ограничения времени продажи алкогольной продукции",
   "publisher": "КонсультантПлюс (ConsultantPlus legal database)",
   "url": "https://www.consultant.ru/document/cons_doc_LAW_121531/5b60348edc844cee5dcd3d96f13c4bb2b25c6be3/",
   "type": "other",
   "accessed": "2026-10-01",
   "supports": "Regions may set additional time limits under 171-FZ art. 16"
  },
  {
   "id": 52,
   "key": "si_gov",
   "group": "SVN",
   "title": "Poziv trgovcem glede nadzora prodaje alkohola, tobačnih in povezanih izdelkov mlajšim od 18 let",
   "publisher": "Government of Slovenia (gov.si)",
   "url": "https://www.gov.si/novice/2025-09-09-poziv-trgovcem-glede-nadzora-prodaje-alkohola-tobacnih-in-povezanih-izdelkov-mlajsim-od-18-let/",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Sale of alcohol to under-18s prohibited; inspectors tightening checks (Sept 2025)"
  },
  {
   "id": 53,
   "key": "si_pmc",
   "group": "SVN",
   "title": "An Examination of Retailers' Compliance with the Minimum Legal Drinking (Purchasing) Age Law in Slovenia (2021)",
   "publisher": "PubMed Central",
   "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC8015655",
   "type": "academic",
   "accessed": "2026-10-01",
   "supports": "Slovenian law prohibits selling alcohol to under-18s; study of retailer compliance (2021)"
  },
  {
   "id": 54,
   "key": "es_bill",
   "group": "ESP",
   "title": "Proyecto de Ley de prevención del consumo de bebidas alcohólicas y de sus efectos en las personas menores de edad (121/000050)",
   "publisher": "Boletín Oficial de las Cortes Generales – Congreso de los Diputados",
   "url": "https://www.congreso.es/public_oficiales/L15/CONG/BOCG/A/BOCG-15-A-50-1.PDF",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "National minors-and-alcohol bill (approved by the Council of Ministers in March 2025, before parliament)"
  },
  {
   "id": 55,
   "key": "es_madrid",
   "group": "ESP",
   "title": "Ley 5/2002, de 27 de junio, sobre Drogodependencias y otros Trastornos Adictivos (Comunidad de Madrid), texto consolidado",
   "publisher": "Boletín Oficial del Estado (BOE-A-2002-14844)",
   "url": "https://www.boe.es/buscar/pdf/2002/BOE-A-2002-14844-consolidado.pdf",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Madrid: no off-premise alcohol sales at night (default 22:00–08:00, municipalities may set hours; certain convenience stores exempt)"
  },
  {
   "id": 56,
   "key": "es_pv",
   "group": "ESP",
   "title": "Ley 1/2016, de 7 de abril, de Atención Integral de Adicciones y Drogodependencias (País Vasco), texto consolidado",
   "publisher": "Boletín Oficial del Estado (BOE-A-2016-4170)",
   "url": "https://www.boe.es/buscar/pdf/2016/BOE-A-2016-4170-consolidado.pdf",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Basque Country: no sales in shops not meant for on-site consumption 22:00–07:00"
  },
  {
   "id": 57,
   "key": "es_gal",
   "group": "ESP",
   "title": "Ley 6/2025, de 23 de diciembre, de protección de la salud de las personas menores y prevención de las conductas adictivas (Galicia)",
   "publisher": "Boletín Oficial del Estado (BOE-A-2026-3386)",
   "url": "https://www.boe.es/buscar/act.php?id=BOE-A-2026-3386",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Galicia: alcohol sales banned during 'night hours' 22:00–09:00 (with exceptions for on-site consumption and restaurant delivery); replaces Ley 11/2010"
  },
  {
   "id": 58,
   "key": "es_ext",
   "group": "ESP",
   "title": "Ley 5/2018, de 3 de mayo, de prevención del consumo de bebidas alcohólicas en la infancia y la adolescencia (Extremadura), texto consolidado",
   "publisher": "Boletín Oficial del Estado (BOE-A-2018-6941)",
   "url": "https://www.boe.es/buscar/pdf/2018/BOE-A-2018-6941-consolidado.pdf",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Extremadura: supplying alcohol in shops 22:00–09:00 is an offence"
  },
  {
   "id": 59,
   "key": "se_sb",
   "group": "SWE",
   "title": "Varför är det 18-årsgräns på krogen men 20-årsgräns på Systembolaget?",
   "publisher": "Systembolaget (state retail monopoly)",
   "url": "https://www.systembolaget.se/kundservice/salja-med-ansvar/4c066a63-c510-4c62-9fc3-a245f3980d2f/varfor-ar-det-18-arsgrans-pa-krogen-men-20-arsgrans-pa-systembolaget/6467ed28-758e-4dc1-9179-18dcdd6c9978/",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "18 in bars/restaurants, 20 at Systembolaget"
  },
  {
   "id": 60,
   "key": "se_riksdag",
   "group": "SWE",
   "title": "Motion 2025/26:165 – Sänkning av åldersgränsen för inköp av alkoholhaltiga drycker till 18 år",
   "publisher": "Sveriges riksdag",
   "url": "https://www.riksdagen.se/sv/dokument-och-lagar/dokument/motion/sankning-av-aldersgransen-for-inkop-av_hd02165/",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Proposal (not law) to lower the Systembolaget age to 18 — confirms current 20"
  },
  {
   "id": 61,
   "key": "ch_bag_age",
   "group": "CHE",
   "title": "Abgabe von Alkohol an Jugendliche: Präventionsinstrumente",
   "publisher": "Bundesamt für Gesundheit (FOPH/BAG), Switzerland",
   "url": "https://www.bag.admin.ch/de/abgabe-von-alkohol-an-jugendliche-praeventionsinstrumente",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "National 16 (beer/wine) / 18 (spirits); Ticino 18 for all"
  },
  {
   "id": 62,
   "key": "ch_bag_cantons",
   "group": "CHE",
   "title": "Alkoholpolitik in den Kantonen (canton-by-canton legal provisions, status 15.07.2024)",
   "publisher": "Bundesamt für Gesundheit (FOPH/BAG), Switzerland",
   "url": "https://www.bag.admin.ch/de/alkoholpolitik-in-den-kantonen",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Which cantons have time-based sale restrictions (BS, FR, GE, VD)"
  },
  {
   "id": 63,
   "key": "ch_bag_hours",
   "group": "CHE",
   "title": "Zeitliche Verkaufseinschränkungen für Alkohol",
   "publisher": "Bundesamt für Gesundheit (FOPH/BAG), Switzerland",
   "url": "https://www.bag.admin.ch/de/zeitliche-verkaufseinschraenkungen-fuer-alkohol",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Cantons can restrict sale times"
  },
  {
   "id": 64,
   "key": "ch_vd",
   "group": "CHE",
   "title": "Vente de boissons alcooliques",
   "publisher": "État de Vaud – Police cantonale du commerce",
   "url": "https://www.vd.ch/economie/police-cantonale-du-commerce/informations-relatives-aux-autres-activites-reglementees/vente-de-boissons-alcooliques",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Vaud: take-away/delivery of spirits and beer banned 21:00–06:00 (wine exempt); communes may start at 20:00; ages 16/18"
  },
  {
   "id": 65,
   "key": "ch_ge",
   "group": "CHE",
   "title": "Loi sur la vente à l'emporter des boissons alcooliques (LVEBA), as compiled by LexFind",
   "publisher": "LexFind.ch (Swiss legislation database)",
   "url": "https://lexfind.ch/tolv/177060/fr",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Geneva LVEBA (I 2 24), art. 11: take-away alcohol sales banned 21:00–07:00; art. 4: no alcohol sales at petrol stations (in force since 1 Feb 2005)"
  },
  {
   "id": 66,
   "key": "tr_medyascope",
   "group": "TUR",
   "title": "Istanbul Governorship clarifies confusing circular … on alcohol consumption in public spaces",
   "publisher": "Medyascope",
   "url": "https://medyascope.tv/2023/08/31/istanbul-governorship-clarifies-confusing-circular-that-suggested-ban-on-alcohol-consumption-in-public-spaces/",
   "type": "news",
   "accessed": "2026-10-01",
   "supports": "Law 4250: no sales to under-18s; no shop sales 22:00–06:00; public-place drinking limits"
  },
  {
   "id": 67,
   "key": "ua_kyivind",
   "group": "UKR",
   "title": "Western Ukraine loosens alcohol ban, Lviv says 'no, thank you' (23 March 2022)",
   "publisher": "The Kyiv Independent",
   "url": "https://kyivindependent.com/western-ukraine-loosens-alcohol-ban-lviv-says-no-thank-you/",
   "type": "news",
   "accessed": "2026-10-01",
   "supports": "Under martial law, oblast and city authorities set their own alcohol-sale bans and hours"
  },
  {
   "id": 68,
   "key": "ua_torgsoft",
   "group": "UKR",
   "title": "Alcohol trade in Ukraine in 2026: rules for sole proprietors and businesses",
   "publisher": "Torgsoft (retail software vendor, legal explainer)",
   "url": "https://torgsoft.ua/en/articles/law/alcohol-trade/",
   "type": "other",
   "accessed": "2026-10-01",
   "supports": "Under-18 sale ban; local authorities may restrict hours"
  },
  {
   "id": 69,
   "key": "uk_gov_young",
   "group": "GBR",
   "title": "Alcohol and young people",
   "publisher": "GOV.UK",
   "url": "https://www.gov.uk/alcohol-young-people-law",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Under-18 purchase ban; 16–17 may drink (not buy) beer, wine or cider with a meal if accompanied by an adult"
  },
  {
   "id": 70,
   "key": "uk_gov_ddl",
   "group": "GBR",
   "title": "The drink drive limit",
   "publisher": "GOV.UK",
   "url": "https://www.gov.uk/drink-drive-limit",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "80 mg/100 ml blood in England, Wales and Northern Ireland; 50 mg in Scotland"
  },
  {
   "id": 71,
   "key": "uk_ias_ddl",
   "group": "GBR",
   "title": "Road Safety Strategy plans to reduce drink-drive limit (7 January 2026)",
   "publisher": "Institute of Alcohol Studies",
   "url": "https://www.ias.org.uk/news/road-safety-strategy-plans-to-reduce-drink-drive-limit/",
   "type": "other",
   "accessed": "2026-10-01",
   "supports": "Planned (not yet in force) cut to 50 mg in England & Wales and 20 mg for new drivers"
  },
  {
   "id": 72,
   "key": "uk_scot_mup",
   "group": "GBR",
   "title": "Alcohol and drugs: Minimum unit pricing",
   "publisher": "Scottish Government (gov.scot)",
   "url": "https://www.gov.scot/policies/alcohol-and-drugs/minimum-unit-pricing/",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Scotland MUP 65p per unit (increase from 50p voted April 2024)"
  },
  {
   "id": 73,
   "key": "uk_mygov_mup",
   "group": "GBR",
   "title": "Minimum unit pricing for alcohol in Scotland",
   "publisher": "mygov.scot",
   "url": "https://www.mygov.scot/minimum-unit-pricing/",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Examples of minimum prices at 65p/unit"
  },
  {
   "id": 74,
   "key": "uk_wales_mup",
   "group": "GBR",
   "title": "Minimum unit price for alcohol to increase in Wales",
   "publisher": "Business Wales – Welsh Government",
   "url": "https://businesswales.gov.wales/news-and-blog/minimum-unit-price-alcohol-increase-wales",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Wales MUP rises from 50p to 65p from 1 October 2026"
  },
  {
   "id": 75,
   "key": "uk_scot_act",
   "group": "GBR",
   "title": "Licensing (Scotland) Act 2005 – Explanatory Notes",
   "publisher": "legislation.gov.uk (The National Archives)",
   "url": "https://www.legislation.gov.uk/asp/2005/16/notes/division/3/8",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Scottish licensing framework (incl. off-sales hours 10:00–22:00 and 16–17 meal rule)"
  },
  {
   "id": 76,
   "key": "uk_nhs_highland",
   "group": "GBR",
   "title": "Drugs & Alcohol and the Law",
   "publisher": "NHS Highland – Highland Substance Awareness Toolkit",
   "url": "https://www.highlandsubstanceawareness.scot.nhs.uk/substance-awareness-toolkit/policies/drugs-alcohol-and-the-law/",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "Scotland: 16–17 may buy beer, wine or cider with a meal in an eating area; off-sales 10am–10pm"
  },
  {
   "id": 77,
   "key": "uk_nidirect",
   "group": "GBR",
   "title": "Alcohol, young people under 18 years old and the law",
   "publisher": "nidirect (Northern Ireland Government)",
   "url": "https://www.nidirect.gov.uk/articles/alcohol-young-people-under-18-years-old-and-law",
   "type": "official",
   "accessed": "2026-10-01",
   "supports": "NI: under-18s may not buy alcohol or drink it anywhere other than a private house"
  },
  {
   "id": 78,
   "key": "ne_admin0",
   "group": "MAPDATA",
   "title": "Natural Earth 1:10m Cultural Vectors – Admin 0 Countries (point-of-view edition: Germany, ne_10m_admin_0_countries_deu)",
   "publisher": "Natural Earth (public domain)",
   "url": "https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_0_countries_deu.geojson",
   "type": "other",
   "accessed": "2026-10-01",
   "supports": "Country boundaries on the Europe map. License: public domain. Simplified with mapshaper."
  },
  {
   "id": 79,
   "key": "ne_admin0_page",
   "group": "MAPDATA",
   "title": "Natural Earth – 1:10m Admin 0 Countries download page",
   "publisher": "Natural Earth (public domain)",
   "url": "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/",
   "type": "other",
   "accessed": "2026-10-01",
   "supports": "Dataset documentation and terms of use (public domain)"
  },
  {
   "id": 80,
   "key": "ne_admin1",
   "group": "MAPDATA",
   "title": "Natural Earth 1:10m Cultural Vectors – Admin 1 States, Provinces",
   "publisher": "Natural Earth (public domain)",
   "url": "https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_1_states_provinces.geojson",
   "type": "other",
   "accessed": "2026-10-01",
   "supports": "Regional boundaries for every country map (dissolved to constituent countries, autonomous communities, regions or entities where needed). License: public domain."
  },
  {
   "id": 81,
   "key": "ne_admin1_page",
   "group": "MAPDATA",
   "title": "Natural Earth – 1:10m Admin 1 States, Provinces download page",
   "publisher": "Natural Earth (public domain)",
   "url": "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/",
   "type": "other",
   "accessed": "2026-10-01",
   "supports": "Dataset documentation (public domain)"
  },
  {
   "id": 82,
   "key": "d3",
   "group": "MAPDATA",
   "title": "D3.js v7.9.0",
   "publisher": "Mike Bostock & contributors (ISC License)",
   "url": "https://d3js.org/",
   "type": "other",
   "accessed": "2026-10-01",
   "supports": "Map rendering, projections, zoom/pan. Bundled locally as lib/d3.min.js. License: ISC."
  },
  {
   "id": 83,
   "key": "topojson",
   "group": "MAPDATA",
   "title": "topojson-client v3.1.0",
   "publisher": "Mike Bostock & contributors (ISC License)",
   "url": "https://github.com/topojson/topojson-client",
   "type": "other",
   "accessed": "2026-10-01",
   "supports": "Decoding TopoJSON boundaries. Bundled locally as lib/topojson-client.min.js. License: ISC."
  },
  {
   "id": 84,
   "key": "mapshaper",
   "group": "MAPDATA",
   "title": "mapshaper v0.7.72",
   "publisher": "Matthew Bloch (MPL-2.0)",
   "url": "https://github.com/mbloch/mapshaper",
   "type": "other",
   "accessed": "2026-10-01",
   "supports": "Used offline to clip, dissolve and simplify boundaries (not shipped). License: MPL-2.0."
  },
  {
   "id": 85,
   "key": "colorbrewer",
   "group": "MAPDATA",
   "title": "ColorBrewer 2.0 – colour advice for maps",
   "publisher": "Cynthia Brewer, Mark Harrower, Pennsylvania State University (Apache-2.0)",
   "url": "https://colorbrewer2.org/",
   "type": "academic",
   "accessed": "2026-10-01",
   "supports": "Sequential 'YlGnBu' scheme used for the age-based map modes. License: Apache-2.0."
  },
  {
   "id": 86,
   "key": "okabe_ito",
   "group": "MAPDATA",
   "title": "Color Universal Design (CUD): How to make figures and presentations that are friendly to colorblind people",
   "publisher": "Masataka Okabe & Kei Ito",
   "url": "https://jfly.uni-koeln.de/color/",
   "type": "academic",
   "accessed": "2026-10-01",
   "supports": "Colour-blind-safe Okabe–Ito palette used for the category and regional maps"
  }
 ]
};
