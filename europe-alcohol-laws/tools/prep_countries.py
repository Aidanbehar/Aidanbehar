import json
EU='ALB AND AUT BLR BEL BIH BGR HRV CYP CZE DNK EST FIN FRA DEU GRC HUN ISL IRL ITA LVA LTU LUX MLT MDA MCO MNE NLD MKD NOR POL PRT ROU RUS SMR SRB SVK SVN ESP SWE CHE TUR UKR GBR LIE VAT KOS'.split()
CTX='GEO ARM AZE KAZ SYR IRQ IRN MAR DZA TUN LBY EGY ISR LBN JOR PSX SAU GRL FRO JEY GGY IMN GIB ESB WSB TKM UZB'.split()
c=json.load(open('ne/ne_10m_admin_0_countries_deu.geojson'))
out=[]
for f in c['features']:
  p=f['properties']; a=p['ADM0_A3']
  if a=='ALD': a='FIN'
  if a in EU or a in CTX:
    f['properties']={'id':a,'name':p['NAME'],'ctx':0 if a in EU else 1}
    out.append(f)
json.dump({'type':'FeatureCollection','features':out},open('countries_sel.geojson','w'))
print(len(out))
