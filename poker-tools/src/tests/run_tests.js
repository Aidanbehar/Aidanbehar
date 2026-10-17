const fs=require('fs');
const stubs='const cardHtml=(c)=>Cards.isCard(c)?"<div class=\\"card\\" data-card=\\""+c+"\\"></div>":"<div class=\\"card back\\"></div>", icon=()=>"<svg></svg>", $=()=>null, $$=()=>[], toast=()=>{}, TitleFlash={}, App={};\n';
const src=stubs+['a_engine','a2_fair','a3_bots','a4_sra','b_notation','j_learn','c_tests','k_cepheus'].map(f=>fs.readFileSync(__dirname+'/parts/'+f+'.js','utf8')).join('\n')
 + (fs.existsSync(__dirname+'/parts/d_qr.js')?fs.readFileSync(__dirname+'/parts/d_qr.js','utf8'):'')
 + (fs.existsSync(__dirname+'/parts/sample.js')?fs.readFileSync(__dirname+'/parts/sample.js','utf8'):'const SAMPLE_RECORD="";')
 + (typeof process!=='undefined'?'':'') + '\nmodule.exports={Learn,SRA,Bots,Fair,VARIANTS,U,Cards,Eval,Engine,Notation,Replay,SelfTest,SAMPLE_RECORD, QR: typeof QR!=="undefined"?QR:undefined};';
const m={exports:{}}; new Function('module','require',src)(m,require);
if (require.main===module) m.exports.SelfTest.run().then(r=>{for(const t of r) console.log((t.pass?'PASS':'FAIL'),t.group,'-',t.name,t.pass?'':'\n     '+t.error, t.ms+'ms'); console.log(r.filter(t=>t.pass).length+'/'+r.length)});
module.exports=m.exports;
