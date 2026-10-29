const fs=require('fs'),vm=require('vm'),assert=require('assert');
const file=require('path').join(__dirname,'../utils/stremio/extensions/personal-anime-skip/locale.js');
let language='eng',calls=0;const button={dataset:{},setAttribute(k,v){this[k]=v}};
const window={addEventListener(){},core:{async getState(model){assert.equal(model,'ctx');calls++;return {profile:{settings:{interfaceLanguage:language}}}}}};window.top=window;
const context={window,document:{getElementById(){return button}},setInterval(){}};
vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
(async()=>{
 await new Promise(r=>setImmediate(r));assert.equal(button.textContent,'Skip Intro  ⏭');
 language='ara';await window.GalaxySkipLocale.refresh();assert.equal(button.textContent,'تخطي المقدمة  ⏭');assert.equal(button.dir,'rtl');assert.equal(button.lang,'ar');
 language='fr-FR';await window.GalaxySkipLocale.refresh();assert.equal(button.textContent,'Passer le générique  ⏭');assert.equal(button.dir,'ltr');
 language='eng';await window.GalaxySkipLocale.refresh();assert.equal(button.title,'Skip Intro — Tab');
 button.dataset.skipKind='ending';language='ara';await window.GalaxySkipLocale.refresh();assert.equal(button.textContent,'تخطي أغنية النهاية  ⏭');language='eng';await window.GalaxySkipLocale.refresh();assert.equal(button.textContent,'Skip Outro  ⏭');
 language='unknown';await window.GalaxySkipLocale.refresh();assert.equal(button.lang,'en');
 window.core.getState=async()=>{throw new Error('not ready')};await window.GalaxySkipLocale.refresh();assert.equal(button.lang,'en');
 console.log('PASS: interface language English/Arabic/French, live changes, RTL, tooltip and unavailable-core fallback');
})().catch(e=>{console.error(e);process.exitCode=1});
