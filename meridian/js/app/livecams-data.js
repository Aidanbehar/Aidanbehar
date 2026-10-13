/*
 * Meridian — Live World curated YouTube livestreams.
 *
 * Every entry below was observed as a LIVE broadcast on its channel's /streams tab or in YouTube's "Live" search
 * filter on 2026-10-13 (UTC) while building this feature. Coordinates are only given when the stream's title names
 * a specific site (precision "site") or a specific town/city (precision "city"); they are the published coordinates of
 * that named place, not the camera's exact mount point. Streams covering several places, moving platforms or
 * unspecified locations have no coordinates and appear only in the "No exact location" list.
 *
 * Fields: [videoId, channel, channelId, title, lat, lon, place, country, ianaZone, categories, precision]
 * Live status at runtime is NOT assumed from this list: without a YouTube Data API key the app labels these
 * "STATUS UNKNOWN (was live when catalogued)"; with a key it verifies liveBroadcastContent per video.
 */
(function (root) {
  'use strict';
  const EC = ['EarthCam', 'UC6qrG3W8SMK0jior2olka3g'], JH = ['See Jackson Hole', 'UCEpDjqeFIGTqHwk-uULx72Q'], VR = ['Virtual Railfan', 'UCOIkT9bq-1N2BvrsBjhNlag'];
  const WT = ['Webcamtaxi', 'UC1tBnbs03VJ34oLD8cmJSVw'], PT = ['PTZtv', 'UCG8-xn6zUbEqmqlnsvrD33Q'], MBA = ['Monterey Bay Aquarium', 'UCnM5iMGiKsZg-iOlIO2ZkdQ'];
  const ANN = ['ANNnewsCH (TV Asahi)', 'UCGCZAYq5Xxojl_tSXcVJhiQ'], NC = ['NamibiaCam', 'UC9X6gGKDv2yhMoofoeS7-Gg'], NASA = ['NASA', 'UCLA_DiR1FfKNvjuUpBHmylQ'];
  const L = (id, ch, title, lat, lon, place, country, zone, cats, prec = 'site') => [id, ch[0], ch[1], title, lat, lon, place, country, zone, cats, prec];
  const NY = 'America/New_York', CHI = 'America/Chicago', DEN = 'America/Denver', LA = 'America/Los_Angeles';
  const YT = [
    // EarthCam
    L('JQ_jwk_7OVE', EC, 'Times Square North 4K', 40.7580, -73.9855, 'Times Square, New York City', 'United States', NY, ['city', 'landmark']),
    L('o5Ie_LpZ9uk', EC, 'Statue of Liberty', 40.6892, -74.0445, 'Liberty Island, New York', 'United States', NY, ['landmark']),
    L('ZYQlLQHz2Mg', EC, '9/11 Memorial & Museum', 40.7115, -74.0134, 'Lower Manhattan, New York City', 'United States', NY, ['landmark', 'city']),
    L('5C9oM7C2Q9k', EC, 'World Trade Center – New York City', 40.7127, -74.0134, 'Lower Manhattan, New York City', 'United States', NY, ['city', 'landmark']),
    L('tErYxn2UM5Y', EC, 'Brooklyn Bridge Cam', 40.7061, -73.9969, 'Brooklyn Bridge, New York City', 'United States', NY, ['landmark', 'city']),
    L('sixP_dAJ8D4', EC, 'Lincoln Harbor (view of New York City)', 40.7600, -74.0216, 'Weehawken, New Jersey', 'United States', NY, ['city']),
    L('oDCAAfOSqvA', EC, 'Washington Monument', 38.8895, -77.0353, 'National Mall, Washington, D.C.', 'United States', NY, ['landmark']),
    L('F1EQEDL4ddU', EC, 'Liberty Bell – Independence Hall', 39.9496, -75.1503, 'Philadelphia, Pennsylvania', 'United States', NY, ['landmark', 'city']),
    L('9mMnqO1UuIU', EC, 'Philadelphia, PA', 39.9526, -75.1652, 'Philadelphia, Pennsylvania', 'United States', NY, ['city'], 'city'),
    L('xqdukYhcGEU', EC, 'New Orleans Street View', 29.9584, -90.0651, 'French Quarter, New Orleans', 'United States', CHI, ['city']),
    L('QxFFjXu_zqs', EC, 'New Orleans Balcony View', 29.9578, -90.0660, 'French Quarter, New Orleans', 'United States', CHI, ['city']),
    L('OSI8qWMoK5E', EC, 'Flight 93 Memorial – Tower of Voices', 40.0517, -78.9037, 'Shanksville, Pennsylvania', 'United States', NY, ['landmark', 'nature']),
    L('EiUyBIcG4fQ', EC, 'Midway Airport', 41.7868, -87.7522, 'Chicago, Illinois', 'United States', CHI, ['transport']),
    L('tAdTOOsrZBQ', EC, 'Anglins Pier', 26.1897, -80.0950, 'Lauderdale-By-The-Sea, Florida', 'United States', NY, ['beach']),
    L('4LTSTw4jnZc', EC, 'Sanibel Island', 26.4434, -82.1115, 'Sanibel Island, Florida', 'United States', NY, ['beach'], 'city'),
    L('OBgCrw-IyhE', EC, 'Seaside Heights – North View', 39.9440, -74.0729, 'Seaside Heights, New Jersey', 'United States', NY, ['beach'], 'city'),
    L('zMCea32gpmg', EC, 'Abbey Road Crossing', 51.5320, -0.1779, 'St John’s Wood, London', 'United Kingdom', 'Europe/London', ['landmark', 'city']),
    L('wiVzU1mcCTA', EC, 'Tamariu', 41.9177, 3.2050, 'Tamariu, Costa Brava', 'Spain', 'Europe/Madrid', ['beach'], 'city'),
    L('zv67_HAFTOA', EC, 'Spirit Lake, Iowa', 43.4224, -95.1022, 'Spirit Lake, Iowa', 'United States', CHI, ['nature'], 'city'),
    L('qsrevo5Vdkw', EC, 'Council Bluffs, Iowa', 41.2619, -95.8608, 'Council Bluffs, Iowa', 'United States', CHI, ['city'], 'city'),
    L('Ez6xC43MMTQ', EC, 'Madison, Indiana', 38.7359, -85.3799, 'Madison, Indiana', 'United States', NY, ['city'], 'city'),
    L('6tq8S2pp8PQ', EC, 'Pigeon River Cam', 35.8187, -83.1446, 'Hartford, Tennessee', 'United States', NY, ['nature'], 'city'),
    L('VWDi2Po3ZsQ', EC, 'World’s Largest Buffalo Monument', 46.9046, -98.6976, 'Jamestown, North Dakota', 'United States', CHI, ['landmark']),
    L('3nzuUOreQqI', EC, 'Giraffe Cam Barn – Greenville Zoo', 34.8466, -82.3900, 'Greenville, South Carolina', 'United States', NY, ['nature']),
    L('T0SI9iz9yzE', EC, 'Giraffe Paddock Cam – Greenville Zoo', 34.8466, -82.3900, 'Greenville, South Carolina', 'United States', NY, ['nature']),
    L('IU_-Pl9O5jQ', EC, 'Snowman Cam – Animals and Wildlife', 45.0275, -84.6748, 'Gaylord, Michigan', 'United States', NY, ['nature', 'mountain'], 'city'),
    // See Jackson Hole (Wyoming / Idaho)
    L('B_waF26In9o', JH, 'Jackson Town Square Live PTZ webcam', 43.4799, -110.7624, 'Town Square, Jackson, Wyoming', 'United States', DEN, ['city', 'mountain']),
    L('Zj0pXlq2-jI', JH, 'Town Square Webcam – Northeast', 43.4801, -110.7618, 'Town Square, Jackson, Wyoming', 'United States', DEN, ['city']),
    L('9ID7fhbc_s0', JH, 'Snow King Mountain – Summit Gondola', 43.4640, -110.7570, 'Snow King Mountain, Jackson', 'United States', DEN, ['mountain']),
    L('JWflsXXpHRQ', JH, 'Snow King Mid Mountain', 43.4700, -110.7590, 'Snow King Mountain, Jackson', 'United States', DEN, ['mountain']),
    L('AaTf07Lvz1A', JH, 'Snow King Mountain Cowboy Coaster & Alpine Slide', 43.4735, -110.7590, 'Snow King Mountain, Jackson', 'United States', DEN, ['mountain']),
    L('a5jEZeNTAsE', JH, 'Grand Targhee Resort Summit', 43.7880, -110.9580, 'Grand Targhee Resort, Wyoming', 'United States', DEN, ['mountain']),
    L('fQiA_DZT0cE', JH, 'Grand Targhee Resort Dreamcatcher', 43.7870, -110.9500, 'Grand Targhee Resort, Wyoming', 'United States', DEN, ['mountain']),
    L('eHL_FJOoVTE', JH, 'Grand Targhee Resort Plaza', 43.7896, -110.9576, 'Grand Targhee Resort, Wyoming', 'United States', DEN, ['mountain']),
    L('o4fKtgPVpoU', JH, 'Dornan’s in Grand Teton National Park', 43.6564, -110.7140, 'Moose, Grand Teton National Park', 'United States', DEN, ['nature', 'mountain']),
    L('Jqo7Z9QiOEQ', JH, 'Teton View – Buffalo Valley', 43.8370, -110.4000, 'Moran, Wyoming', 'United States', DEN, ['nature', 'mountain'], 'city'),
    L('IvZ22jZgvOI', JH, 'Montana Whitewater – Yellowstone River', 45.0310, -110.7080, 'Gardiner, Montana (Yellowstone)', 'United States', DEN, ['nature'], 'city'),
    L('IfENy4khApE', JH, 'Jackson Hole Rodeo', 43.4870, -110.7550, 'Jackson, Wyoming', 'United States', DEN, ['city'], 'city'),
    L('p2JxnMjLe78', JH, 'Snake River Brewing', 43.4750, -110.7680, 'Jackson, Wyoming', 'United States', DEN, ['city'], 'city'),
    L('QDyspy8DUpU', JH, 'Alpine Valley RV Park', 43.1600, -111.0200, 'Alpine, Wyoming', 'United States', DEN, ['nature'], 'city'),
    L('W0cQdnoFR3A', JH, 'Swan Valley Idaho @ River Retreat Lodge', 43.4500, -111.3300, 'Swan Valley, Idaho', 'United States', DEN, ['nature'], 'city'),
    // Virtual Railfan (railway cameras; positions are the named towns)
    L('MLuxiq6Uke8', VR, 'Colorado Model Railroad Museum', 40.4233, -104.7091, 'Greeley, Colorado', 'United States', DEN, ['transport'], 'city'),
    L('4XYbh4Pegzw', VR, 'Ashland, Virginia – Train Camera (PTZ)', 37.7590, -77.4797, 'Ashland, Virginia', 'United States', NY, ['transport'], 'city'),
    L('2blgPhEGUy0', VR, 'Spokane, Washington – Train Cam (East)', 47.6588, -117.4260, 'Spokane, Washington', 'United States', LA, ['transport'], 'city'),
    L('IVSoVgGXDoU', VR, 'Plant City, Florida – Train Camera', 28.0186, -82.1146, 'Plant City, Florida', 'United States', NY, ['transport'], 'city'),
    L('FHYqepozgiQ', VR, 'Folkston, Georgia – Train Camera (Depot)', 30.8310, -82.0110, 'Folkston, Georgia', 'United States', NY, ['transport'], 'city'),
    L('XRLwO9QjveA', VR, 'Saint Louis, Missouri – Train Camera', 38.6270, -90.1994, 'St. Louis, Missouri', 'United States', CHI, ['transport'], 'city'),
    L('KHNgcx8AMQ0', VR, 'Cresson, Pennsylvania – Train Camera', 40.4598, -78.5917, 'Cresson, Pennsylvania', 'United States', NY, ['transport'], 'city'),
    L('NP-bvAcswIM', VR, 'Salt Lake City, Utah – Train Camera', 40.7608, -111.8910, 'Salt Lake City, Utah', 'United States', DEN, ['transport'], 'city'),
    L('p9CJkmVgxp0', VR, 'Cheyenne, Wyoming – Train Camera', 41.1400, -104.8202, 'Cheyenne, Wyoming', 'United States', DEN, ['transport'], 'city'),
    L('LInPY_D1Ln4', VR, 'Quanah, Texas – Train Camera', 34.2973, -99.7404, 'Quanah, Texas', 'United States', CHI, ['transport'], 'city'),
    L('g1GgLCfImSE', VR, 'Jesup, Georgia – Train Camera', 31.6074, -81.8854, 'Jesup, Georgia', 'United States', NY, ['transport'], 'city'),
    L('TjMwpB8JRw8', VR, 'Deshler, Ohio – Train Camera', 41.2079, -83.8994, 'Deshler, Ohio', 'United States', NY, ['transport'], 'city'),
    L('OtssjZ3hdX0', VR, 'La Grange, Kentucky – Railcam', 38.4076, -85.3788, 'La Grange, Kentucky', 'United States', NY, ['transport'], 'city'),
    L('diibGG3KEeo', VR, 'Cohutta, Georgia – Train Camera', 34.9612, -84.9530, 'Cohutta, Georgia', 'United States', NY, ['transport'], 'city'),
    L('ll3X1mH_g9Q', VR, 'Cordele, Georgia – Train Camera', 31.9635, -83.7824, 'Cordele, Georgia', 'United States', NY, ['transport'], 'city'),
    L('q5BQRwSh41Q', VR, 'Tucson, Arizona – Train Camera', 32.2226, -110.9747, 'Tucson, Arizona', 'United States', 'America/Phoenix', ['transport'], 'city'),
    L('cR3kSHm7Ts0', VR, 'CSX Mainline in Cumberland, Maryland', 39.6529, -78.7625, 'Cumberland, Maryland', 'United States', NY, ['transport'], 'city'),
    L('Ux0rtJXPPQ0', VR, 'Austell, Georgia – Train Camera', 33.8126, -84.6344, 'Austell, Georgia', 'United States', NY, ['transport'], 'city'),
    L('PyLw5HQKiYU', VR, 'Kansas City, Missouri – Train Camera', 39.0997, -94.5786, 'Kansas City, Missouri', 'United States', CHI, ['transport'], 'city'),
    L('5YG01nZOygQ', VR, 'Decatur, Alabama – Train Camera', 34.6059, -86.9833, 'Decatur, Alabama', 'United States', CHI, ['transport'], 'city'),
    L('xJMJegqnl8Y', VR, 'Spartanburg, South Carolina – Train Camera', 34.9496, -81.9320, 'Spartanburg, South Carolina', 'United States', NY, ['transport'], 'city'),
    L('RZpIX6cq7Os', VR, 'Strasburg, Pennsylvania – Train Camera', 39.9832, -76.1841, 'Strasburg, Pennsylvania', 'United States', NY, ['transport'], 'city'),
    // PTZtv
    L('_GUsXnlVJmo', PT, 'Miami Airport – runway 9/27', 25.7959, -80.2870, 'Miami International Airport', 'United States', NY, ['transport']),
    L('DxZziUUr6CY', PT, 'Port Miami Webcam', 25.7743, -80.1700, 'PortMiami, Florida', 'United States', NY, ['transport', 'beach']),
    L('iHJbTrQSZys', PT, 'Key West Harbor Webcam', 24.5600, -81.8070, 'Key West, Florida', 'United States', NY, ['beach']),
    L('pXx3YQVSUGg', PT, 'Fort Lauderdale Beach', 26.1224, -80.1030, 'Fort Lauderdale, Florida', 'United States', NY, ['beach']),
    L('mU0nL6JvwbM', PT, 'Morgan Hill – Santa Clara Valley', 37.1305, -121.6544, 'Morgan Hill, California', 'United States', LA, ['city', 'weather'], 'city'),
    // Monterey Bay Aquarium (all at the aquarium on Cannery Row)
    ...[['zL68biE6wAs', 'Live Moon Jelly Cam'], ['eQ_foBERmzA', 'Live Jelly Cam'], ['n_GpVsz4nHU', 'Live Open Sea Cam'], ['dzmJXWmA2EM', 'Live Spider Crab Cam'], ['abbR-Ttd-cA', 'Live Sea Otter Cam'], ['w3LjpFhySTg', 'Live Kelp Forest Cam'], ['tEtg5Kg3voQ', 'Live Shark Cam'], ['AWJi0LgyA28', 'Live Aviary Cam']].map(([id, t]) => L(id, MBA, t, 36.6182, -121.9019, 'Monterey Bay Aquarium, Monterey', 'United States', LA, ['nature'])),
    L('fVa6-zCBR7A', MBA, 'Live Monterey Bay Cam', 36.6182, -121.9019, 'Monterey Bay Aquarium, Monterey', 'United States', LA, ['beach', 'nature']),
    // Webcamtaxi (Madeira & Porto)
    L('Vr5lrM2oIHo', WT, 'Port of Machico, Madeira Island', 32.7166, -16.7660, 'Machico, Madeira', 'Portugal', 'Atlantic/Madeira', ['beach']),
    L('p5wr7ZWfnhU', WT, 'Forum Machico, Madeira', 32.7180, -16.7700, 'Machico, Madeira', 'Portugal', 'Atlantic/Madeira', ['city', 'beach'], 'city'),
    L('2m_6K6GETGI', WT, 'CR7 Museum PTZ Webcam Funchal', 32.6467, -16.9119, 'Funchal, Madeira', 'Portugal', 'Atlantic/Madeira', ['city', 'beach']),
    L('_idE_q5kgtA', WT, 'Funchal City Webcam from São Roque', 32.6600, -16.9130, 'Funchal, Madeira', 'Portugal', 'Atlantic/Madeira', ['city'], 'city'),
    L('luCyJFxTDI0', WT, 'Cruz da Caldeira, Câmara de Lobos', 32.6650, -16.9800, 'Câmara de Lobos, Madeira', 'Portugal', 'Atlantic/Madeira', ['beach', 'mountain'], 'city'),
    L('eo0G5fUmwtI', WT, 'Madalena do Mar Webcam', 32.7020, -17.1340, 'Madalena do Mar, Madeira', 'Portugal', 'Atlantic/Madeira', ['beach'], 'city'),
    L('Q_AnKD9JxyU', WT, 'Paul do Mar WebCam', 32.7550, -17.2240, 'Paul do Mar, Madeira', 'Portugal', 'Atlantic/Madeira', ['beach'], 'city'),
    L('lfrjNVD10RU', WT, 'Porto – Ribeira and Vila Nova de Gaia', 41.1405, -8.6131, 'Ribeira, Porto', 'Portugal', 'Europe/Lisbon', ['city', 'landmark']),
    // Japan (ANN / TV Asahi and local operators)
    L('8H3nRCFVR6Y', ANN, 'Shibuya Scramble Crossing Live Camera', 35.6595, 139.7005, 'Shibuya, Tokyo', 'Japan', 'Asia/Tokyo', ['city', 'landmark']),
    L('KMqigNv3LcY', ANN, 'Haneda Airport Terminal 2 (24 hours)', 35.5494, 139.7798, 'Haneda Airport, Tokyo', 'Japan', 'Asia/Tokyo', ['transport']),
    L('4GyL-3_I9Kc', ANN, 'Sand tiger shark cam – Aqua World Ibaraki Oarai Aquarium', 36.3157, 140.5745, 'Oarai, Ibaraki', 'Japan', 'Asia/Tokyo', ['nature']),
    L('sIy0J6TeCxY', ['EN DAIBA GLOBAL', 'UCaxxRyMskvvbpQMo-VJpNhw'], 'Live Beach Cam – Odaiba Beach, Tokyo', 35.6290, 139.7740, 'Odaiba, Tokyo', 'Japan', 'Asia/Tokyo', ['beach', 'city']),
    L('cH7ZdGV4wnc', ['Tokyo Akabane Live Camera', 'UCE5uxiZBrhwFPwzlSfmdWQA'], 'Train Live Camera – around Akabane Station', 35.7780, 139.7210, 'Akabane, Tokyo', 'Japan', 'Asia/Tokyo', ['transport', 'city']),
    L('g1kiB4Ve4yQ', ['バクノビジョン', 'UCVg0E1H6LZBhTt_2oSm2Hzg'], 'Naha Kokusai-dori Street Camera 24/7', 26.2150, 127.6860, 'Kokusai-dori, Naha, Okinawa', 'Japan', 'Asia/Tokyo', ['city']),
    L('rW5aaFv8oxs', ['UTY TV Yamanashi (official)', 'UCk2oG--VyYST4SYyQkeadjA'], 'Mt. Fuji Live Cam – Kawaguchiko Panorama Ropeway', 35.5036, 138.7700, 'Lake Kawaguchi, Yamanashi', 'Japan', 'Asia/Tokyo', ['mountain', 'landmark']),
    L('gxcQJ8pJF0c', ['ふもとっぱらチャンネル', 'UCYcexkyqYKH9oWzprRGsW0A'], 'Mount Fuji Live from Fumotoppara', 35.4040, 138.5880, 'Fumotoppara, Shizuoka', 'Japan', 'Asia/Tokyo', ['mountain', 'nature']),
    L('8wfklRrXy4Y', ['Mt.FUJI-Live-Cam', 'UCX71McAvKkQTpzmFMcufzCw'], 'Mt. Fuji Live Cam from Susono', 35.1740, 138.9070, 'Susono, Shizuoka', 'Japan', 'Asia/Tokyo', ['mountain'], 'city'),
    L('2WB7nCKjijg', ['Kyoto City Tourism Association (official)', 'UCLpgVZwl9CaXierI3oq08mQ'], 'Saga Arashiyama – Togetsukyo Bridge', 35.0128, 135.6779, 'Arashiyama, Kyoto', 'Japan', 'Asia/Tokyo', ['landmark', 'nature']),
    L('Vr2FkgcPS_g', ['Kyoto Shimbun', 'UCbC54g8cx22kk2w0eT-8qOQ'], 'Karasuma Street in front of the Kyoto Shimbun', 35.0090, 135.7590, 'Karasuma-dori, Kyoto', 'Japan', 'Asia/Tokyo', ['city']),
    L('yHGyk9d5cw0', ['Ogura-chaya', 'UC5GCXh2PEqAkiH5W2k2LU_Q'], 'Jōjakkō-ji temple gate and Ogura-chaya', 35.0188, 135.6702, 'Sagano, Kyoto', 'Japan', 'Asia/Tokyo', ['landmark', 'nature']),
    // Rest of Asia & Oceania
    L('AKcsJqkcRP0', ['GiGAeyes Live TV', 'UCsy6UOjk8q7Ajq9yQ7iDAbA'], 'Seokchon Lake Live Cam', 37.5097, 127.1040, 'Seokchon Lake, Seoul', 'South Korea', 'Asia/Seoul', ['city', 'nature']),
    L('DMEHBuEixY0', ['HK360VR', 'UCNcY1o1xGgTX_19w0cXes9g'], '24/7 live camera from The Peak', 22.2710, 114.1500, 'Victoria Peak, Hong Kong', 'Hong Kong', 'Asia/Hong_Kong', ['city', 'landmark']),
    L('PznqRZYdiHs', ['香港人の日常生活', 'UCBDx32JFg9vk9VHtQppv5tg'], 'Aberdeen Harbour Live Camera', 22.2470, 114.1530, 'Aberdeen, Hong Kong', 'Hong Kong', 'Asia/Hong_Kong', ['beach', 'city']),
    L('wP4gD-5g-90', ['The Real Samui Webcam', 'UCmYyJaUxYiF5IbLx-0jFXHQ'], 'Bondi Aussie Bar & Grill, Lamai', 9.4720, 100.0460, 'Lamai, Koh Samui', 'Thailand', 'Asia/Bangkok', ['beach']),
    L('ueGevhUuqZc', ['The Real Samui Webcam', 'UCmYyJaUxYiF5IbLx-0jFXHQ'], 'Floating Lotus – Big Buddha', 9.5710, 100.0600, 'Big Buddha, Koh Samui', 'Thailand', 'Asia/Bangkok', ['landmark', 'beach']),
    L('w8QCbgRo6FY', ['The Sunday Running BKK', 'UCA08YALQbEO1UrJkBcvYzPQ'], 'Bangkok Street View – Vibhavadi Rangsit Soi 3', 13.7800, 100.5500, 'Bangkok', 'Thailand', 'Asia/Bangkok', ['city', 'transport'], 'city'),
    L('4JS4vSkTS7I', ['Sydney Harbour LIVE', 'UCS03bU2sY5_zu2j7LoSjAVA'], 'Sydney Harbour – Bridge & Opera House', -33.8448, 151.2050, 'McMahons Point, Sydney', 'Australia', 'Australia/Sydney', ['city', 'landmark', 'beach']),
    L('SShacWPyABA', ['Dunedin, New Zealand – Live Webcam', 'UC10rtsw7RaZVrsObrMmOZ1A'], 'Dunedin, NZ – Live Webcam (4K)', -45.8788, 170.5028, 'Dunedin', 'New Zealand', 'Pacific/Auckland', ['city'], 'city'),
    L('D2OqE_OxSjo', ['LiveNZCams', 'UCOcM6TPl_6U1Za8K6UDhJXQ'], 'Caroline Bay, Timaru', -44.3910, 171.2550, 'Timaru', 'New Zealand', 'Pacific/Auckland', ['beach']),
    L('md7rdpPUBI0', ['Southland App Live', 'UC0UCHqIebaU9EqvkfglWNCg'], 'Fiordland Webcam – Lake Te Anau', -45.4140, 167.7180, 'Te Anau, Fiordland', 'New Zealand', 'Pacific/Auckland', ['nature', 'mountain'], 'city'),
    L('sDOnz5T_i0U', ['Titahi Bay Surf Cam', 'UCHT8V7CRkqI0SXz1f3CULlA'], 'Titahi Bay surf cam', -41.1050, 174.8320, 'Titahi Bay, Porirua', 'New Zealand', 'Pacific/Auckland', ['beach']),
    L('TBWhP73uY6s', ['Motella', 'UC00yvkKCNAdJ9n5ZfGwlnbQ'], 'Gisborne Live Webcam – Teal Motor Lodge', -38.6623, 178.0176, 'Gisborne', 'New Zealand', 'Pacific/Auckland', ['city', 'weather'], 'city'),
    // Europe
    L('VfH8gQJQnBE', ['Roma Five Suites', 'UCDL2IVxAgPI7wybiUlQKrWg'], 'Piazza Venezia – Live Webcam from Rome', 41.8958, 12.4826, 'Piazza Venezia, Rome', 'Italy', 'Europe/Rome', ['city', 'landmark']),
    L('RzYxgW0dLZk', ['DMSKO', 'UCbtrxnyE4Emg8U2F_Rcl0YQ'], 'Amsterdam Webcam – Weesperstraat', 52.3637, 4.9070, 'Weesperstraat, Amsterdam', 'Netherlands', 'Europe/Amsterdam', ['city', 'transport']),
    L('uDBYuEV4zjI', ['BIG JET TV', 'UCkQef3Fidr7tm3gNuXgGKPw'], 'Heathrow Airport LIVE 24/7', 51.4700, -0.4543, 'Heathrow Airport, London', 'United Kingdom', 'Europe/London', ['transport']),
    // Africa
    L('AeMUdOPFcXI', NC, 'Okaukuejo waterhole, Etosha National Park', -19.1756, 15.9133, 'Okaukuejo, Etosha National Park', 'Namibia', 'Africa/Windhoek', ['nature']),
    L('pUZ_T-NwC2Q', ['REEF South Africa', 'UCef_Yfk6baScsTCcDxzXE5Q'], 'Muizenberg Beach Live Webcam', -34.1080, 18.4710, 'Muizenberg, Cape Town', 'South Africa', 'Africa/Johannesburg', ['beach']),
    L('1QH44L9PsAo', ['Cape Ocean Adventures', 'UCLwTi-vM5zaadH1ytPo-rTg'], 'Bikini Beach & Gordon’s Bay Harbour', -34.1600, 18.8650, 'Gordon’s Bay, Cape Town', 'South Africa', 'Africa/Johannesburg', ['beach']),
    L('zGlGodTfncQ', ['Cape Ocean Adventures', 'UCLwTi-vM5zaadH1ytPo-rTg'], 'Strand beach cam, False Bay', -34.1150, 18.8270, 'Strand, Cape Town', 'South Africa', 'Africa/Johannesburg', ['beach']),
    // Americas (outside the US)
    L('wyEi0OPai5g', ['Homes in Rio', 'UChWGYkK0I8U83C0FxAxWy4w'], 'Copacabana Posto 6', -22.9870, -43.1890, 'Copacabana, Rio de Janeiro', 'Brazil', 'America/Sao_Paulo', ['beach', 'city']),
    L('WEl_I5vmuSs', ['Homes in Rio', 'UChWGYkK0I8U83C0FxAxWy4w'], 'Copacabana Posto 3', -22.9680, -43.1800, 'Copacabana, Rio de Janeiro', 'Brazil', 'America/Sao_Paulo', ['beach', 'city']),
    L('ZHZuvjhR9RI', ['Pontal NeTv', 'UC6hcr5RRZvTtSfsNJ2MLj2Q'], 'Arraial do Cabo – beach in real time', -22.9660, -42.0270, 'Arraial do Cabo', 'Brazil', 'America/Sao_Paulo', ['beach'], 'city'),
    L('cknEmNXHh5k', ['SBGR LIVE', 'UCNZCKDhAVtbh7sddChTxI7w'], 'Guarulhos International Airport (GRU)', -23.4356, -46.4731, 'São Paulo–Guarulhos Airport', 'Brazil', 'America/Sao_Paulo', ['transport']),
    L('KYbDYbK9a48', ['Buenos Aires Panorama', 'UC6UNAtHxhjnYlV_1FF-l4zA'], 'Buenos Aires – Obelisco', -34.6037, -58.3816, 'Obelisco, Buenos Aires', 'Argentina', 'America/Argentina/Buenos_Aires', ['city', 'landmark']),
    L('ac5AU4B10ak', ['El Dorado Restaurant', 'UCF5PpfZcLSzdFaQY5LGcnAA'], 'Los Muertos Beach Pier', 20.6010, -105.2380, 'Puerto Vallarta', 'Mexico', 'America/Mexico_City', ['beach']),
    L('wTpTtzT4j0Q', ['Webcams de México TV', 'UCPOifgFqN0FuTrhc2Ja6n7w'], 'Acapulco – Santa Lucía Bay panorama', 16.8530, -99.8860, 'Acapulco, Guerrero', 'Mexico', 'America/Mexico_City', ['beach', 'city'], 'city'),
    // No exact location (listed separately, never plotted)
    L('awQzjn72bI0', NASA, 'Live High-Definition Views from the International Space Station', null, null, 'International Space Station (orbiting)', '', 'UTC', ['landmark']),
    L('M3HKLzjvKPc', NASA, 'Live Video from the International Space Station', null, null, 'International Space Station (orbiting)', '', 'UTC', ['landmark']),
    L('cyTqUpKGCJ4', ANN, 'Amazon jungle live – Rio Negro', null, null, 'Rio Negro, Amazonas (exact camera site not stated)', 'Brazil', 'America/Manaus', ['nature']),
    L('ydYDqZQpim8', NC, 'Live stream in the Namib Desert', null, null, 'Namib Desert (exact site not stated)', 'Namibia', 'Africa/Windhoek', ['nature']),
    L('ME0dPuBtzug', NC, 'Live stream in the Kalahari Desert', null, null, 'Kalahari (exact site not stated)', 'Namibia', 'Africa/Windhoek', ['nature']),
    L('QL0FuXqD1Fk', NC, 'Kwando river live stream', null, null, 'Kwando River (exact site not stated)', 'Namibia', 'Africa/Windhoek', ['nature']),
    L('i4TXkiifKv8', ['SBC-TV | Maasai Mara Live Safari', 'UCv7WvXfp-l07Z6IuComA36w'], '6 Maasai Mara Wildlife Cameras', null, null, 'Maasai Mara (multiple cameras)', 'Kenya', 'Africa/Nairobi', ['nature']),
    L('SuOXfvH34nU', ['afarTV', 'UCaG0IHN1RMOZ4-U3wDXAkwA'], '24/7 Iceland Volcano Watch (Cam A)', null, null, 'Reykjanes Peninsula (camera site not stated)', 'Iceland', 'Atlantic/Reykjavik', ['mountain', 'nature']),
    L('GoCh3Rw2fH4', WT, 'Madeira Island rolling multi-cam (13 cams)', null, null, 'Madeira (multiple cameras)', 'Portugal', 'Atlantic/Madeira', ['beach']),
    L('xoyKM6BQceM', ['Paseos y Turismo', 'UCsXOwro8CHI2FWotcTw1U2w'], 'Buenos Aires city street cam', null, null, 'Buenos Aires (street not stated)', 'Argentina', 'America/Argentina/Buenos_Aires', ['city'])
  ];
  root.MERIDIAN_LIVECAMS = { YT, catalogued: '2026-10-13' };
})(typeof self !== 'undefined' ? self : this);
