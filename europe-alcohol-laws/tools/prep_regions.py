import json,re,unicodedata,os
d=json.load(open('ne/ne_10m_admin_1_states_provinces.geojson'))
EU='ALB AND AUT BLR BEL BIH BGR HRV CYP CZE DNK EST FIN FRA DEU GRC HUN ISL IRL ITA LVA LTU LUX MLT MDA MCO MNE NLD MKD NOR POL PRT ROU RUS SMR SRB SVK SVN ESP SWE CHE TUR UKR GBR LIE VAT KOS'.split()
def slug(s):
  s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode()
  return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
ESP_N={'Valenciana':'Comunidad Valenciana','Canary Is.':'Canarias','Foral de Navarra':'Navarra','Islas Baleares':'Illes Balears','Madrid':'Comunidad de Madrid','Murcia':'Región de Murcia','Asturias':'Principado de Asturias','Cataluña':'Cataluña / Catalunya','País Vasco':'País Vasco / Euskadi'}
BIH_N={'Federacija Bosna i Hercegovina':'Federation of Bosnia and Herzegovina','Repuplika Srpska':'Republika Srpska'}
RUS_SKIP={'Crimea','Sevastopol'}
os.makedirs('reg',exist_ok=True)
groups={}
for f in d['features']:
  p=f['properties']; a=p['adm0_a3']; nm=p['name'] or p['name_alt'] or '?'
  if a=='ALD': a='FIN'; key='Åland'
  elif a not in EU: continue
  elif a=='RUS' and nm in RUS_SKIP: a='UKR'; key=('Crimea (Autonomous Republic)' if nm=='Crimea' else 'Sevastopol (city)')
  elif a=='GBR': key=p['geonunit']
  elif a=='ESP': key=ESP_N.get(p['region'],p['region'])
  elif a=='ITA': key=p['region']
  elif a=='FRA':
    if p['type_en']=='Overseas department': continue
    key=p['region']
  elif a=='BIH': key='Brčko District' if 'Brčko' in nm else BIH_N[p['region']]
  elif a=='MLT': key={'Malta Xlokk':'Malta South-East (Xlokk)','Malta Majjistral':'Malta North-West (Majjistral)','Gozo':'Gozo and Comino'}[p['region']]
  elif a=='SVN': key=p['region']
  elif a=='LVA': key=p['region']
  elif a=='KOS': key=p['region']
  elif a=='MKD': key=nm
  elif a=='NOR' and nm=='Bouvet Island': continue
  elif a=='NLD' and p['type_en']=='Special Municipality': continue
  elif a=='RUS': key=('Алтайский край' if nm=='Altay' else p['name_ru'])
  else: key=nm
  if a=='RUS' and not p['name']: continue
  EN_OVR={'Moskovskaya':'Moscow Oblast','Moskva':'Moscow (city)','Altay':'Altai Krai','Yevrey':'Jewish Autonomous Oblast','Kiev City':'Kyiv (city)','Kiev':'Kyiv Oblast','City of St. Petersburg':'Saint Petersburg (city)'}
  if a in ('RUS','UKR','TUR') and key==nm or a=='RUS':
    en=EN_OVR.get(nm) or p.get('name_en') or nm
  else: en=key
  f['properties']={'key':key,'id':slug(nm if a=='RUS' else key),'en':en}
  groups.setdefault(a,[]).append(f)
for a,fs in groups.items():
  json.dump({'type':'FeatureCollection','features':fs},open(f'reg/{a}.geojson','w'))
  print(a,len(fs),len(set(x['properties']['key'] for x in fs)))
