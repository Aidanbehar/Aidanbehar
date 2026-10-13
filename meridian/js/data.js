/*
 * Meridian reference data.
 * - CITIES: representative cities with their IANA zone and approximate coordinates (for search, the world clock,
 *   map lookups and sunrise/sunset). Coordinates are city-centre approximations (±0.1°).
 * - ABBREVIATIONS: common time-zone abbreviations. Many are ambiguous; each entry lists every meaning we know of
 *   and the literal fixed UTC offset that abbreviation denotes.
 * - LOCAL_HISTORY: a deliberately small, limited offline fallback used only when the Wikipedia feed cannot be
 *   reached. Every entry links to the Wikipedia article it summarises.
 */
(function (root) {
  'use strict';
  const RAW_CITIES = `
Los Angeles|US|United States|America/Los_Angeles|34.05|-118.24
New York|US|United States|America/New_York|40.71|-74.01
London|GB|United Kingdom|Europe/London|51.51|-0.13
Berlin|DE|Germany|Europe/Berlin|52.52|13.40
Tokyo|JP|Japan|Asia/Tokyo|35.68|139.69
Sydney|AU|Australia|Australia/Sydney|-33.87|151.21
Paris|FR|France|Europe/Paris|48.86|2.35
Chicago|US|United States|America/Chicago|41.88|-87.63
Denver|US|United States|America/Denver|39.74|-104.99
Phoenix|US|United States|America/Phoenix|33.45|-112.07
San Francisco|US|United States|America/Los_Angeles|37.77|-122.42
Seattle|US|United States|America/Los_Angeles|47.61|-122.33
Las Vegas|US|United States|America/Los_Angeles|36.17|-115.14
San Diego|US|United States|America/Los_Angeles|32.72|-117.16
Portland|US|United States|America/Los_Angeles|45.52|-122.68
Boston|US|United States|America/New_York|42.36|-71.06
Washington, D.C.|US|United States|America/New_York|38.91|-77.04
Miami|US|United States|America/New_York|25.76|-80.19
Atlanta|US|United States|America/New_York|33.75|-84.39
Philadelphia|US|United States|America/New_York|39.95|-75.17
Detroit|US|United States|America/Detroit|42.33|-83.05
Indianapolis|US|United States|America/Indiana/Indianapolis|39.77|-86.16
Houston|US|United States|America/Chicago|29.76|-95.37
Dallas|US|United States|America/Chicago|32.78|-96.80
Austin|US|United States|America/Chicago|30.27|-97.74
New Orleans|US|United States|America/Chicago|29.95|-90.07
Minneapolis|US|United States|America/Chicago|44.98|-93.27
Salt Lake City|US|United States|America/Denver|40.76|-111.89
Boise|US|United States|America/Boise|43.62|-116.20
Anchorage|US|United States|America/Anchorage|61.22|-149.90
Juneau|US|United States|America/Juneau|58.30|-134.42
Honolulu|US|United States|Pacific/Honolulu|21.31|-157.86
Adak|US|United States|America/Adak|51.88|-176.66
San Juan|PR|Puerto Rico|America/Puerto_Rico|18.47|-66.11
Toronto|CA|Canada|America/Toronto|43.65|-79.38
Montreal|CA|Canada|America/Toronto|45.50|-73.57
Ottawa|CA|Canada|America/Toronto|45.42|-75.70
Vancouver|CA|Canada|America/Vancouver|49.28|-123.12
Calgary|CA|Canada|America/Edmonton|51.05|-114.07
Edmonton|CA|Canada|America/Edmonton|53.55|-113.49
Winnipeg|CA|Canada|America/Winnipeg|49.90|-97.14
Regina|CA|Canada|America/Regina|50.45|-104.61
Halifax|CA|Canada|America/Halifax|44.65|-63.58
St. John's|CA|Canada|America/St_Johns|47.56|-52.71
Whitehorse|CA|Canada|America/Whitehorse|60.72|-135.06
Mexico City|MX|Mexico|America/Mexico_City|19.43|-99.13
Guadalajara|MX|Mexico|America/Mexico_City|20.66|-103.35
Monterrey|MX|Mexico|America/Monterrey|25.69|-100.32
Tijuana|MX|Mexico|America/Tijuana|32.51|-117.04
Cancún|MX|Mexico|America/Cancun|21.16|-86.85
Guatemala City|GT|Guatemala|America/Guatemala|14.63|-90.51
San José|CR|Costa Rica|America/Costa_Rica|9.93|-84.08
Panama City|PA|Panama|America/Panama|8.98|-79.52
Havana|CU|Cuba|America/Havana|23.11|-82.37
Kingston|JM|Jamaica|America/Jamaica|18.02|-76.80
Santo Domingo|DO|Dominican Republic|America/Santo_Domingo|18.49|-69.93
Port-au-Prince|HT|Haiti|America/Port-au-Prince|18.59|-72.31
Nassau|BS|Bahamas|America/Nassau|25.05|-77.35
Bogotá|CO|Colombia|America/Bogota|4.71|-74.07
Lima|PE|Peru|America/Lima|-12.05|-77.04
Quito|EC|Ecuador|America/Guayaquil|-0.18|-78.47
Caracas|VE|Venezuela|America/Caracas|10.48|-66.90
La Paz|BO|Bolivia|America/La_Paz|-16.49|-68.12
Santiago|CL|Chile|America/Santiago|-33.45|-70.67
Punta Arenas|CL|Chile|America/Punta_Arenas|-53.16|-70.91
Easter Island|CL|Chile|Pacific/Easter|-27.11|-109.35
Buenos Aires|AR|Argentina|America/Argentina/Buenos_Aires|-34.60|-58.38
Montevideo|UY|Uruguay|America/Montevideo|-34.90|-56.16
Asunción|PY|Paraguay|America/Asuncion|-25.26|-57.58
São Paulo|BR|Brazil|America/Sao_Paulo|-23.55|-46.63
Rio de Janeiro|BR|Brazil|America/Sao_Paulo|-22.91|-43.17
Brasília|BR|Brazil|America/Sao_Paulo|-15.79|-47.88
Manaus|BR|Brazil|America/Manaus|-3.12|-60.02
Recife|BR|Brazil|America/Recife|-8.05|-34.88
Fernando de Noronha|BR|Brazil|America/Noronha|-3.85|-32.42
Georgetown|GY|Guyana|America/Guyana|6.80|-58.16
Paramaribo|SR|Suriname|America/Paramaribo|5.85|-55.20
Cayenne|GF|French Guiana|America/Cayenne|4.92|-52.31
Nuuk|GL|Greenland|America/Nuuk|64.18|-51.72
Reykjavík|IS|Iceland|Atlantic/Reykjavik|64.15|-21.94
Ponta Delgada (Azores)|PT|Portugal|Atlantic/Azores|37.74|-25.67
Praia|CV|Cape Verde|Atlantic/Cape_Verde|14.93|-23.51
Dublin|IE|Ireland|Europe/Dublin|53.35|-6.26
Edinburgh|GB|United Kingdom|Europe/London|55.95|-3.19
Manchester|GB|United Kingdom|Europe/London|53.48|-2.24
Lisbon|PT|Portugal|Europe/Lisbon|38.72|-9.14
Madrid|ES|Spain|Europe/Madrid|40.42|-3.70
Barcelona|ES|Spain|Europe/Madrid|41.39|2.17
Las Palmas (Canary Islands)|ES|Spain|Atlantic/Canary|28.12|-15.44
Amsterdam|NL|Netherlands|Europe/Amsterdam|52.37|4.90
Brussels|BE|Belgium|Europe/Brussels|50.85|4.35
Luxembourg|LU|Luxembourg|Europe/Luxembourg|49.61|6.13
Zürich|CH|Switzerland|Europe/Zurich|47.38|8.54
Geneva|CH|Switzerland|Europe/Zurich|46.20|6.14
Munich|DE|Germany|Europe/Berlin|48.14|11.58
Frankfurt|DE|Germany|Europe/Berlin|50.11|8.68
Hamburg|DE|Germany|Europe/Berlin|53.55|9.99
Vienna|AT|Austria|Europe/Vienna|48.21|16.37
Rome|IT|Italy|Europe/Rome|41.90|12.50
Milan|IT|Italy|Europe/Rome|45.46|9.19
Copenhagen|DK|Denmark|Europe/Copenhagen|55.68|12.57
Oslo|NO|Norway|Europe/Oslo|59.91|10.75
Tromsø|NO|Norway|Europe/Oslo|69.65|18.96
Longyearbyen (Svalbard)|SJ|Svalbard|Arctic/Longyearbyen|78.22|15.65
Stockholm|SE|Sweden|Europe/Stockholm|59.33|18.07
Helsinki|FI|Finland|Europe/Helsinki|60.17|24.94
Tallinn|EE|Estonia|Europe/Tallinn|59.44|24.75
Riga|LV|Latvia|Europe/Riga|56.95|24.11
Vilnius|LT|Lithuania|Europe/Vilnius|54.69|25.28
Warsaw|PL|Poland|Europe/Warsaw|52.23|21.01
Prague|CZ|Czechia|Europe/Prague|50.08|14.44
Budapest|HU|Hungary|Europe/Budapest|47.50|19.04
Bratislava|SK|Slovakia|Europe/Bratislava|48.15|17.11
Ljubljana|SI|Slovenia|Europe/Ljubljana|46.06|14.51
Zagreb|HR|Croatia|Europe/Zagreb|45.81|15.98
Belgrade|RS|Serbia|Europe/Belgrade|44.79|20.45
Sarajevo|BA|Bosnia and Herzegovina|Europe/Sarajevo|43.86|18.41
Bucharest|RO|Romania|Europe/Bucharest|44.43|26.10
Sofia|BG|Bulgaria|Europe/Sofia|42.70|23.32
Athens|GR|Greece|Europe/Athens|37.98|23.73
Istanbul|TR|Türkiye|Europe/Istanbul|41.01|28.98
Ankara|TR|Türkiye|Europe/Istanbul|39.93|32.86
Nicosia|CY|Cyprus|Asia/Nicosia|35.19|33.38
Valletta|MT|Malta|Europe/Malta|35.90|14.51
Kyiv|UA|Ukraine|Europe/Kyiv|50.45|30.52
Chișinău|MD|Moldova|Europe/Chisinau|47.01|28.86
Minsk|BY|Belarus|Europe/Minsk|53.90|27.56
Kaliningrad|RU|Russia|Europe/Kaliningrad|54.71|20.51
Moscow|RU|Russia|Europe/Moscow|55.76|37.62
Saint Petersburg|RU|Russia|Europe/Moscow|59.93|30.36
Samara|RU|Russia|Europe/Samara|53.20|50.15
Yekaterinburg|RU|Russia|Asia/Yekaterinburg|56.84|60.61
Omsk|RU|Russia|Asia/Omsk|54.99|73.37
Novosibirsk|RU|Russia|Asia/Novosibirsk|55.01|82.93
Krasnoyarsk|RU|Russia|Asia/Krasnoyarsk|56.01|92.89
Irkutsk|RU|Russia|Asia/Irkutsk|52.29|104.28
Yakutsk|RU|Russia|Asia/Yakutsk|62.03|129.73
Vladivostok|RU|Russia|Asia/Vladivostok|43.12|131.89
Magadan|RU|Russia|Asia/Magadan|59.56|150.80
Petropavlovsk-Kamchatsky|RU|Russia|Asia/Kamchatka|53.02|158.65
Tbilisi|GE|Georgia|Asia/Tbilisi|41.72|44.78
Yerevan|AM|Armenia|Asia/Yerevan|40.18|44.51
Baku|AZ|Azerbaijan|Asia/Baku|40.41|49.87
Tehran|IR|Iran|Asia/Tehran|35.69|51.39
Baghdad|IQ|Iraq|Asia/Baghdad|33.31|44.36
Kuwait City|KW|Kuwait|Asia/Kuwait|29.38|47.99
Riyadh|SA|Saudi Arabia|Asia/Riyadh|24.71|46.68
Jeddah|SA|Saudi Arabia|Asia/Riyadh|21.49|39.19
Doha|QA|Qatar|Asia/Qatar|25.29|51.53
Manama|BH|Bahrain|Asia/Bahrain|26.23|50.59
Dubai|AE|United Arab Emirates|Asia/Dubai|25.20|55.27
Abu Dhabi|AE|United Arab Emirates|Asia/Dubai|24.45|54.38
Muscat|OM|Oman|Asia/Muscat|23.59|58.41
Jerusalem|IL|Israel|Asia/Jerusalem|31.77|35.21
Tel Aviv|IL|Israel|Asia/Jerusalem|32.09|34.78
Gaza|PS|Palestine|Asia/Gaza|31.50|34.47
Amman|JO|Jordan|Asia/Amman|31.95|35.93
Beirut|LB|Lebanon|Asia/Beirut|33.89|35.50
Damascus|SY|Syria|Asia/Damascus|33.51|36.28
Kabul|AF|Afghanistan|Asia/Kabul|34.56|69.21
Karachi|PK|Pakistan|Asia/Karachi|24.86|67.01
Lahore|PK|Pakistan|Asia/Karachi|31.55|74.34
Islamabad|PK|Pakistan|Asia/Karachi|33.68|73.05
Tashkent|UZ|Uzbekistan|Asia/Tashkent|41.30|69.24
Almaty|KZ|Kazakhstan|Asia/Almaty|43.24|76.89
Astana|KZ|Kazakhstan|Asia/Almaty|51.17|71.45
Bishkek|KG|Kyrgyzstan|Asia/Bishkek|42.87|74.59
Dushanbe|TJ|Tajikistan|Asia/Dushanbe|38.56|68.79
Ashgabat|TM|Turkmenistan|Asia/Ashgabat|37.96|58.33
New Delhi|IN|India|Asia/Kolkata|28.61|77.21
Mumbai|IN|India|Asia/Kolkata|19.08|72.88
Bengaluru|IN|India|Asia/Kolkata|12.97|77.59
Kolkata|IN|India|Asia/Kolkata|22.57|88.36
Chennai|IN|India|Asia/Kolkata|13.08|80.27
Hyderabad|IN|India|Asia/Kolkata|17.39|78.49
Colombo|LK|Sri Lanka|Asia/Colombo|6.93|79.86
Malé|MV|Maldives|Indian/Maldives|4.18|73.51
Kathmandu|NP|Nepal|Asia/Kathmandu|27.72|85.32
Thimphu|BT|Bhutan|Asia/Thimphu|27.47|89.64
Dhaka|BD|Bangladesh|Asia/Dhaka|23.81|90.41
Yangon|MM|Myanmar|Asia/Yangon|16.87|96.20
Bangkok|TH|Thailand|Asia/Bangkok|13.76|100.50
Hanoi|VN|Vietnam|Asia/Bangkok|21.03|105.85
Ho Chi Minh City|VN|Vietnam|Asia/Ho_Chi_Minh|10.82|106.63
Phnom Penh|KH|Cambodia|Asia/Phnom_Penh|11.56|104.92
Vientiane|LA|Laos|Asia/Vientiane|17.98|102.63
Kuala Lumpur|MY|Malaysia|Asia/Kuala_Lumpur|3.14|101.69
Singapore|SG|Singapore|Asia/Singapore|1.35|103.82
Jakarta|ID|Indonesia|Asia/Jakarta|-6.21|106.85
Denpasar (Bali)|ID|Indonesia|Asia/Makassar|-8.65|115.22
Makassar|ID|Indonesia|Asia/Makassar|-5.15|119.43
Jayapura|ID|Indonesia|Asia/Jayapura|-2.53|140.72
Manila|PH|Philippines|Asia/Manila|14.60|120.98
Hong Kong|HK|Hong Kong|Asia/Hong_Kong|22.32|114.17
Macau|MO|Macau|Asia/Macau|22.20|113.54
Taipei|TW|Taiwan|Asia/Taipei|25.03|121.57
Beijing|CN|China|Asia/Shanghai|39.90|116.41
Shanghai|CN|China|Asia/Shanghai|31.23|121.47
Guangzhou|CN|China|Asia/Shanghai|23.13|113.26
Shenzhen|CN|China|Asia/Shanghai|22.54|114.06
Chengdu|CN|China|Asia/Shanghai|30.57|104.07
Ürümqi|CN|China|Asia/Urumqi|43.83|87.62
Ulaanbaatar|MN|Mongolia|Asia/Ulaanbaatar|47.89|106.91
Seoul|KR|South Korea|Asia/Seoul|37.57|126.98
Busan|KR|South Korea|Asia/Seoul|35.18|129.08
Pyongyang|KP|North Korea|Asia/Pyongyang|39.04|125.76
Osaka|JP|Japan|Asia/Tokyo|34.69|135.50
Sapporo|JP|Japan|Asia/Tokyo|43.06|141.35
Dili|TL|Timor-Leste|Asia/Dili|-8.56|125.57
Perth|AU|Australia|Australia/Perth|-31.95|115.86
Eucla|AU|Australia|Australia/Eucla|-31.68|128.88
Darwin|AU|Australia|Australia/Darwin|-12.46|130.84
Adelaide|AU|Australia|Australia/Adelaide|-34.93|138.60
Brisbane|AU|Australia|Australia/Brisbane|-27.47|153.03
Melbourne|AU|Australia|Australia/Melbourne|-37.81|144.96
Canberra|AU|Australia|Australia/Sydney|-35.28|149.13
Hobart|AU|Australia|Australia/Hobart|-42.88|147.33
Lord Howe Island|AU|Australia|Australia/Lord_Howe|-31.55|159.08
Port Moresby|PG|Papua New Guinea|Pacific/Port_Moresby|-9.44|147.18
Guam (Hagåtña)|GU|Guam|Pacific/Guam|13.47|144.75
Nouméa|NC|New Caledonia|Pacific/Noumea|-22.28|166.46
Port Vila|VU|Vanuatu|Pacific/Efate|-17.73|168.32
Honiara|SB|Solomon Islands|Pacific/Guadalcanal|-9.43|159.95
Suva|FJ|Fiji|Pacific/Fiji|-18.14|178.44
Auckland|NZ|New Zealand|Pacific/Auckland|-36.85|174.76
Wellington|NZ|New Zealand|Pacific/Auckland|-41.29|174.78
Chatham Islands|NZ|New Zealand|Pacific/Chatham|-43.95|-176.56
Nukuʻalofa|TO|Tonga|Pacific/Tongatapu|-21.14|-175.20
Apia|WS|Samoa|Pacific/Apia|-13.83|-171.76
Pago Pago|AS|American Samoa|Pacific/Pago_Pago|-14.28|-170.70
Kiritimati|KI|Kiribati|Pacific/Kiritimati|1.87|-157.40
Tarawa|KI|Kiribati|Pacific/Tarawa|1.45|172.98
Majuro|MH|Marshall Islands|Pacific/Majuro|7.09|171.38
Papeete (Tahiti)|PF|French Polynesia|Pacific/Tahiti|-17.54|-149.57
Marquesas Islands|PF|French Polynesia|Pacific/Marquesas|-9.00|-139.50
Cairo|EG|Egypt|Africa/Cairo|30.04|31.24
Alexandria|EG|Egypt|Africa/Cairo|31.20|29.92
Tripoli|LY|Libya|Africa/Tripoli|32.89|13.19
Tunis|TN|Tunisia|Africa/Tunis|36.81|10.18
Algiers|DZ|Algeria|Africa/Algiers|36.75|3.06
Casablanca|MA|Morocco|Africa/Casablanca|33.57|-7.59
Dakar|SN|Senegal|Africa/Dakar|14.72|-17.47
Accra|GH|Ghana|Africa/Accra|5.60|-0.19
Abidjan|CI|Côte d'Ivoire|Africa/Abidjan|5.36|-4.01
Lagos|NG|Nigeria|Africa/Lagos|6.52|3.38
Abuja|NG|Nigeria|Africa/Lagos|9.08|7.40
Kinshasa|CD|DR Congo|Africa/Kinshasa|-4.44|15.27
Lubumbashi|CD|DR Congo|Africa/Lubumbashi|-11.66|27.48
Luanda|AO|Angola|Africa/Luanda|-8.84|13.23
Khartoum|SD|Sudan|Africa/Khartoum|15.50|32.56
Addis Ababa|ET|Ethiopia|Africa/Addis_Ababa|9.03|38.74
Nairobi|KE|Kenya|Africa/Nairobi|-1.29|36.82
Kampala|UG|Uganda|Africa/Kampala|0.35|32.58
Dar es Salaam|TZ|Tanzania|Africa/Dar_es_Salaam|-6.79|39.21
Kigali|RW|Rwanda|Africa/Kigali|-1.94|30.06
Mogadishu|SO|Somalia|Africa/Mogadishu|2.05|45.32
Harare|ZW|Zimbabwe|Africa/Harare|-17.83|31.05
Lusaka|ZM|Zambia|Africa/Lusaka|-15.39|28.32
Maputo|MZ|Mozambique|Africa/Maputo|-25.97|32.57
Johannesburg|ZA|South Africa|Africa/Johannesburg|-26.20|28.05
Cape Town|ZA|South Africa|Africa/Johannesburg|-33.92|18.42
Windhoek|NA|Namibia|Africa/Windhoek|-22.56|17.08
Antananarivo|MG|Madagascar|Indian/Antananarivo|-18.88|47.51
Port Louis|MU|Mauritius|Indian/Mauritius|-20.16|57.50
Victoria|SC|Seychelles|Indian/Mahe|-4.62|55.45
McMurdo Station|AQ|Antarctica|Antarctica/McMurdo|-77.85|166.67`;

  const CITIES = RAW_CITIES.trim().split('\n').map((line, i) => {
    const [name, cc, country, zone, lat, lon] = line.split('|');
    return { id: 'c' + i, name, cc, country, zone, lat: +lat, lon: +lon, rank: i };
  });

  /* Abbreviations. offset = literal fixed offset in minutes. zones = representative IANA zones that use it. */
  const ABBREVIATIONS = [
    { abbr: 'UTC', name: 'Coordinated Universal Time', offset: 0, zones: ['Etc/UTC'] },
    { abbr: 'GMT', name: 'Greenwich Mean Time', offset: 0, zones: ['Europe/London', 'Africa/Abidjan', 'Atlantic/Reykjavik'], note: 'Often used loosely for UK time, but UK clocks are on BST (UTC+1) in summer.' },
    { abbr: 'Z', name: 'Zulu time (military/aviation for UTC)', offset: 0, zones: ['Etc/UTC'] },
    { abbr: 'PST', name: 'Pacific Standard Time', offset: -480, zones: ['America/Los_Angeles', 'America/Vancouver', 'America/Tijuana'] },
    { abbr: 'PST', name: 'Philippine Standard Time', offset: 480, zones: ['Asia/Manila'], note: 'Also written PHT/PHST.' },
    { abbr: 'PDT', name: 'Pacific Daylight Time', offset: -420, zones: ['America/Los_Angeles', 'America/Vancouver'] },
    { abbr: 'MST', name: 'Mountain Standard Time', offset: -420, zones: ['America/Denver', 'America/Phoenix', 'America/Edmonton'], note: 'Arizona (America/Phoenix) uses MST all year.' },
    { abbr: 'MDT', name: 'Mountain Daylight Time', offset: -360, zones: ['America/Denver', 'America/Edmonton'] },
    { abbr: 'CST', name: 'Central Standard Time (North America)', offset: -360, zones: ['America/Chicago', 'America/Mexico_City', 'America/Winnipeg', 'America/Regina'] },
    { abbr: 'CST', name: 'China Standard Time', offset: 480, zones: ['Asia/Shanghai', 'Asia/Taipei'] },
    { abbr: 'CST', name: 'Cuba Standard Time', offset: -300, zones: ['America/Havana'] },
    { abbr: 'CDT', name: 'Central Daylight Time (North America)', offset: -300, zones: ['America/Chicago', 'America/Winnipeg'] },
    { abbr: 'CDT', name: 'Cuba Daylight Time', offset: -240, zones: ['America/Havana'] },
    { abbr: 'EST', name: 'Eastern Standard Time (North America)', offset: -300, zones: ['America/New_York', 'America/Toronto', 'America/Panama', 'America/Cancun'] },
    { abbr: 'EDT', name: 'Eastern Daylight Time (North America)', offset: -240, zones: ['America/New_York', 'America/Toronto'] },
    { abbr: 'AKST', name: 'Alaska Standard Time', offset: -540, zones: ['America/Anchorage'] },
    { abbr: 'AKDT', name: 'Alaska Daylight Time', offset: -480, zones: ['America/Anchorage'] },
    { abbr: 'HST', name: 'Hawaii–Aleutian Standard Time', offset: -600, zones: ['Pacific/Honolulu', 'America/Adak'] },
    { abbr: 'HDT', name: 'Hawaii–Aleutian Daylight Time', offset: -540, zones: ['America/Adak'] },
    { abbr: 'AST', name: 'Atlantic Standard Time', offset: -240, zones: ['America/Halifax', 'America/Puerto_Rico', 'America/Santo_Domingo'] },
    { abbr: 'AST', name: 'Arabia Standard Time', offset: 180, zones: ['Asia/Riyadh', 'Asia/Baghdad', 'Asia/Qatar', 'Asia/Kuwait'] },
    { abbr: 'ADT', name: 'Atlantic Daylight Time', offset: -180, zones: ['America/Halifax'] },
    { abbr: 'NST', name: 'Newfoundland Standard Time', offset: -210, zones: ['America/St_Johns'] },
    { abbr: 'NDT', name: 'Newfoundland Daylight Time', offset: -150, zones: ['America/St_Johns'] },
    { abbr: 'BRT', name: 'Brasília Time', offset: -180, zones: ['America/Sao_Paulo'] },
    { abbr: 'ART', name: 'Argentina Time', offset: -180, zones: ['America/Argentina/Buenos_Aires'] },
    { abbr: 'WET', name: 'Western European Time', offset: 0, zones: ['Europe/Lisbon', 'Atlantic/Canary'] },
    { abbr: 'WEST', name: 'Western European Summer Time', offset: 60, zones: ['Europe/Lisbon', 'Atlantic/Canary'] },
    { abbr: 'BST', name: 'British Summer Time', offset: 60, zones: ['Europe/London'] },
    { abbr: 'BST', name: 'Bangladesh Standard Time', offset: 360, zones: ['Asia/Dhaka'] },
    { abbr: 'IST', name: 'India Standard Time', offset: 330, zones: ['Asia/Kolkata'] },
    { abbr: 'IST', name: 'Irish Standard Time (summer)', offset: 60, zones: ['Europe/Dublin'], note: 'In Irish law IST is the summer time; winter time is GMT.' },
    { abbr: 'IST', name: 'Israel Standard Time', offset: 120, zones: ['Asia/Jerusalem'] },
    { abbr: 'IDT', name: 'Israel Daylight Time', offset: 180, zones: ['Asia/Jerusalem'] },
    { abbr: 'CET', name: 'Central European Time', offset: 60, zones: ['Europe/Berlin', 'Europe/Paris', 'Europe/Rome', 'Europe/Madrid'] },
    { abbr: 'CEST', name: 'Central European Summer Time', offset: 120, zones: ['Europe/Berlin', 'Europe/Paris', 'Europe/Rome'] },
    { abbr: 'EET', name: 'Eastern European Time', offset: 120, zones: ['Europe/Athens', 'Europe/Helsinki', 'Europe/Kyiv', 'Africa/Cairo'] },
    { abbr: 'EEST', name: 'Eastern European Summer Time', offset: 180, zones: ['Europe/Athens', 'Europe/Helsinki', 'Europe/Kyiv'] },
    { abbr: 'MSK', name: 'Moscow Standard Time', offset: 180, zones: ['Europe/Moscow'] },
    { abbr: 'TRT', name: 'Türkiye Time', offset: 180, zones: ['Europe/Istanbul'] },
    { abbr: 'SAST', name: 'South African Standard Time', offset: 120, zones: ['Africa/Johannesburg'] },
    { abbr: 'WAT', name: 'West Africa Time', offset: 60, zones: ['Africa/Lagos', 'Africa/Kinshasa'] },
    { abbr: 'CAT', name: 'Central Africa Time', offset: 120, zones: ['Africa/Harare', 'Africa/Maputo', 'Africa/Lusaka'] },
    { abbr: 'EAT', name: 'East Africa Time', offset: 180, zones: ['Africa/Nairobi', 'Africa/Addis_Ababa'] },
    { abbr: 'GST', name: 'Gulf Standard Time', offset: 240, zones: ['Asia/Dubai', 'Asia/Muscat'] },
    { abbr: 'GST', name: 'South Georgia Time', offset: -120, zones: ['Atlantic/South_Georgia'] },
    { abbr: 'IRST', name: 'Iran Standard Time', offset: 210, zones: ['Asia/Tehran'] },
    { abbr: 'AFT', name: 'Afghanistan Time', offset: 270, zones: ['Asia/Kabul'] },
    { abbr: 'PKT', name: 'Pakistan Standard Time', offset: 300, zones: ['Asia/Karachi'] },
    { abbr: 'NPT', name: 'Nepal Time', offset: 345, zones: ['Asia/Kathmandu'] },
    { abbr: 'MMT', name: 'Myanmar Time', offset: 390, zones: ['Asia/Yangon'] },
    { abbr: 'ICT', name: 'Indochina Time', offset: 420, zones: ['Asia/Bangkok', 'Asia/Ho_Chi_Minh'] },
    { abbr: 'WIB', name: 'Western Indonesia Time', offset: 420, zones: ['Asia/Jakarta'] },
    { abbr: 'WITA', name: 'Central Indonesia Time', offset: 480, zones: ['Asia/Makassar'] },
    { abbr: 'WIT', name: 'Eastern Indonesia Time', offset: 540, zones: ['Asia/Jayapura'] },
    { abbr: 'SGT', name: 'Singapore Time', offset: 480, zones: ['Asia/Singapore'] },
    { abbr: 'HKT', name: 'Hong Kong Time', offset: 480, zones: ['Asia/Hong_Kong'] },
    { abbr: 'AWST', name: 'Australian Western Standard Time', offset: 480, zones: ['Australia/Perth'] },
    { abbr: 'ACWST', name: 'Australian Central Western Standard Time (unofficial)', offset: 525, zones: ['Australia/Eucla'] },
    { abbr: 'JST', name: 'Japan Standard Time', offset: 540, zones: ['Asia/Tokyo'] },
    { abbr: 'KST', name: 'Korea Standard Time', offset: 540, zones: ['Asia/Seoul', 'Asia/Pyongyang'] },
    { abbr: 'ACST', name: 'Australian Central Standard Time', offset: 570, zones: ['Australia/Darwin', 'Australia/Adelaide'] },
    { abbr: 'ACDT', name: 'Australian Central Daylight Time', offset: 630, zones: ['Australia/Adelaide'] },
    { abbr: 'AEST', name: 'Australian Eastern Standard Time', offset: 600, zones: ['Australia/Sydney', 'Australia/Brisbane', 'Australia/Melbourne'] },
    { abbr: 'AEDT', name: 'Australian Eastern Daylight Time', offset: 660, zones: ['Australia/Sydney', 'Australia/Melbourne'] },
    { abbr: 'ChST', name: 'Chamorro Standard Time', offset: 600, zones: ['Pacific/Guam'] },
    { abbr: 'NZST', name: 'New Zealand Standard Time', offset: 720, zones: ['Pacific/Auckland'] },
    { abbr: 'NZDT', name: 'New Zealand Daylight Time', offset: 780, zones: ['Pacific/Auckland'] },
    { abbr: 'CHAST', name: 'Chatham Standard Time', offset: 765, zones: ['Pacific/Chatham'] },
    { abbr: 'CHADT', name: 'Chatham Daylight Time', offset: 825, zones: ['Pacific/Chatham'] },
    { abbr: 'SST', name: 'Samoa Standard Time (American Samoa)', offset: -660, zones: ['Pacific/Pago_Pago'] },
    { abbr: 'SST', name: 'Singapore Standard Time (informal)', offset: 480, zones: ['Asia/Singapore'] },
    { abbr: 'AoE', name: 'Anywhere on Earth (deadline convention)', offset: -720, zones: ['Etc/GMT+12'], note: 'Used for deadlines: the moment a date has ended everywhere on Earth.' }
  ];

  /* Limited offline fallback. Used only if the Wikipedia "On this day" feed is unreachable. */
  const H = (m, d, year, type, text, title) => ({ m, d, year, type, text, url: 'https://en.wikipedia.org/wiki/' + title });
  const LOCAL_HISTORY = [
    H(1, 1, 1801, 'events', 'The Acts of Union 1800 take effect, creating the United Kingdom of Great Britain and Ireland.', 'Acts_of_Union_1800'),
    H(1, 1, 1863, 'events', 'The Emancipation Proclamation takes effect in the United States.', 'Emancipation_Proclamation'),
    H(1, 1, 1999, 'events', 'The euro is introduced as an accounting currency in eleven EU member states.', 'Euro'),
    H(1, 27, 1756, 'births', 'Wolfgang Amadeus Mozart, Austrian composer, is born.', 'Wolfgang_Amadeus_Mozart'),
    H(1, 28, 1986, 'events', 'Space Shuttle Challenger breaks apart 73 seconds after launch, killing all seven crew members.', 'Space_Shuttle_Challenger_disaster'),
    H(2, 1, 2003, 'events', 'Space Shuttle Columbia disintegrates during re-entry, killing all seven astronauts.', 'Space_Shuttle_Columbia_disaster'),
    H(2, 11, 1990, 'events', 'Nelson Mandela is released from prison after 27 years.', 'Nelson_Mandela'),
    H(2, 12, 1809, 'births', 'Abraham Lincoln, 16th President of the United States, is born.', 'Abraham_Lincoln'),
    H(2, 12, 1809, 'births', 'Charles Darwin, English naturalist, is born.', 'Charles_Darwin'),
    H(2, 15, 1564, 'births', 'Galileo Galilei, Italian astronomer and physicist, is born.', 'Galileo_Galilei'),
    H(2, 24, 2022, 'events', 'Russia launches a full-scale invasion of Ukraine.', 'Russian_invasion_of_Ukraine'),
    H(2, 29, 1504, 'events', 'Christopher Columbus uses his knowledge of a predicted lunar eclipse to secure supplies from the people of Jamaica.', 'Christopher_Columbus'),
    H(2, 29, 1940, 'events', 'Hattie McDaniel becomes the first African American to win an Academy Award.', 'Hattie_McDaniel'),
    H(3, 10, 1876, 'events', 'Alexander Graham Bell makes the first successful telephone call.', 'Alexander_Graham_Bell'),
    H(3, 11, 2011, 'events', 'The Tōhoku earthquake and tsunami strike Japan, leading to the Fukushima nuclear disaster.', '2011_T%C5%8Dhoku_earthquake_and_tsunami'),
    H(3, 14, 1879, 'births', 'Albert Einstein, theoretical physicist, is born.', 'Albert_Einstein'),
    H(4, 12, 1961, 'events', 'Yuri Gagarin becomes the first human to travel into outer space, aboard Vostok 1.', 'Vostok_1'),
    H(4, 15, 1912, 'events', 'RMS Titanic sinks in the North Atlantic after striking an iceberg.', 'Titanic'),
    H(4, 24, 1990, 'events', 'The Hubble Space Telescope is launched aboard Space Shuttle Discovery.', 'Hubble_Space_Telescope'),
    H(4, 26, 1986, 'events', 'A reactor explodes at the Chernobyl Nuclear Power Plant in the Soviet Union.', 'Chernobyl_disaster'),
    H(5, 8, 1945, 'events', 'Victory in Europe Day: the Allies formally accept Germany\'s unconditional surrender.', 'Victory_in_Europe_Day'),
    H(5, 29, 1953, 'events', 'Edmund Hillary and Tenzing Norgay become the first climbers confirmed to reach the summit of Mount Everest.', '1953_British_Mount_Everest_expedition'),
    H(6, 6, 1944, 'events', 'D-Day: Allied forces land in Normandy, France.', 'Normandy_landings'),
    H(6, 15, 1215, 'events', 'King John of England seals Magna Carta at Runnymede.', 'Magna_Carta'),
    H(6, 28, 1914, 'events', 'Archduke Franz Ferdinand of Austria is assassinated in Sarajevo.', 'Assassination_of_Archduke_Franz_Ferdinand'),
    H(7, 1, 1997, 'events', 'Sovereignty over Hong Kong is transferred from the United Kingdom to China.', 'Handover_of_Hong_Kong'),
    H(7, 4, 1776, 'events', 'The Second Continental Congress adopts the United States Declaration of Independence.', 'United_States_Declaration_of_Independence'),
    H(7, 14, 1789, 'events', 'The Storming of the Bastille in Paris, a defining event of the French Revolution.', 'Storming_of_the_Bastille'),
    H(7, 16, 1945, 'events', 'The Trinity test: the first detonation of a nuclear weapon, in New Mexico.', 'Trinity_(nuclear_test)'),
    H(7, 20, 1969, 'events', 'Apollo 11\'s lunar module lands on the Moon; Neil Armstrong and Buzz Aldrin walk on its surface.', 'Apollo_11'),
    H(8, 6, 1945, 'events', 'The United States drops an atomic bomb on Hiroshima, Japan.', 'Atomic_bombings_of_Hiroshima_and_Nagasaki'),
    H(8, 15, 1947, 'events', 'India gains independence from British rule.', 'Indian_Independence_Act_1947'),
    H(8, 28, 1963, 'events', 'Martin Luther King Jr. delivers his "I Have a Dream" speech at the March on Washington.', 'I_Have_a_Dream'),
    H(9, 1, 1939, 'events', 'Germany invades Poland, beginning World War II in Europe.', 'Invasion_of_Poland'),
    H(9, 11, 2001, 'events', 'Terrorist attacks in the United States kill nearly 3,000 people.', 'September_11_attacks'),
    H(10, 3, 1990, 'events', 'German reunification: the German Democratic Republic joins the Federal Republic of Germany.', 'German_reunification'),
    H(10, 4, 1957, 'events', 'The Soviet Union launches Sputnik 1, the first artificial Earth satellite.', 'Sputnik_1'),
    H(10, 12, 1492, 'events', 'Christopher Columbus\'s expedition makes landfall in the Bahamas (Julian calendar date).', 'Voyages_of_Christopher_Columbus'),
    H(10, 14, 1066, 'events', 'The Battle of Hastings: William of Normandy defeats King Harold II (Julian calendar date).', 'Battle_of_Hastings'),
    H(10, 24, 1945, 'events', 'The Charter of the United Nations comes into force.', 'Charter_of_the_United_Nations'),
    H(11, 7, 1867, 'births', 'Marie Curie, physicist and chemist, is born in Warsaw.', 'Marie_Curie'),
    H(11, 9, 1989, 'events', 'The Berlin Wall opens, allowing free passage between East and West Berlin.', 'Fall_of_the_Berlin_Wall'),
    H(11, 11, 1918, 'events', 'The Armistice of 11 November 1918 ends fighting on the Western Front of World War I.', 'Armistice_of_11_November_1918'),
    H(11, 20, 1998, 'events', 'Zarya, the first module of the International Space Station, is launched.', 'Zarya_(ISS_module)'),
    H(11, 22, 1963, 'events', 'U.S. President John F. Kennedy is assassinated in Dallas, Texas.', 'Assassination_of_John_F._Kennedy'),
    H(12, 7, 1941, 'events', 'Japan attacks the U.S. naval base at Pearl Harbor, Hawaii.', 'Attack_on_Pearl_Harbor'),
    H(12, 17, 1903, 'events', 'The Wright brothers make the first controlled, powered, heavier-than-air flight.', 'Wright_Flyer'),
    H(12, 25, 800, 'events', 'Charlemagne is crowned Emperor of the Romans by Pope Leo III (Julian calendar date).', 'Charlemagne'),
    H(12, 25, 2021, 'events', 'The James Webb Space Telescope is launched.', 'James_Webb_Space_Telescope'),
    H(12, 26, 1991, 'events', 'The Soviet Union is formally dissolved.', 'Dissolution_of_the_Soviet_Union'),
    H(12, 26, 2004, 'events', 'A magnitude 9.1 earthquake in the Indian Ocean triggers a devastating tsunami.', '2004_Indian_Ocean_earthquake_and_tsunami')
  ];

  const COMMON_ZONES = ['UTC', 'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York', 'America/Sao_Paulo', 'Europe/London', 'Europe/Berlin', 'Europe/Moscow', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland'];

  root.MERIDIAN_DATA = { CITIES, ABBREVIATIONS, LOCAL_HISTORY, COMMON_ZONES };
})(typeof self !== 'undefined' ? self : this);
