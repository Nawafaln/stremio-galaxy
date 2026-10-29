const {JSDOM}=require('./hover-runtime/node_modules/jsdom');
const fs=require('node:fs'),assert=require('node:assert/strict');
const wait=()=>new Promise(r=>setTimeout(r,90));
const root=require('node:path').resolve(__dirname,'..');
(async()=>{
 const d=new JSDOM('<div class="settings-container-test"><div class="sections-container-test"><section class="section-container-test"><div class="option-container-test">Account</div></section><section class="section-container-test"><div class="option-container-test"><span class="option-name-container-test">UI Language</span><div class="multiselect-container-test">English</div></div></section></div></div>',{url:'https://stremio.zarg.me/#/settings',runScripts:'outside-only',pretendToBeVisual:true});
 const w=d.window;let settings={interfaceLanguage:'eng',subtitlesLanguage:'eng',subtitlesSize:100};
 const nativeRow=w.document.querySelectorAll('.option-container-test')[1],nativeControl=nativeRow.querySelector('.multiselect-container-test');
 nativeControl.setting={options:[{value:'ara',label:'العربية'},{value:'eng',label:'English'},{value:'fre',label:'Français'}],onSelect:function(){return 'interfaceLanguage'}};
 w.__galaxyAppearance={};w.core={getState:async()=>({profile:{settings}}),dispatch:async a=>{settings={...a.args.args}}};
 w.GalaxyLayout={getTransport:()=>w.core,getLanguage:()=>settings.interfaceLanguage,props:(n,p)=>n?.setting&&p(n.setting)?n.setting:null,refresh:async()=>{w.document.documentElement.lang=settings.interfaceLanguage;w.document.documentElement.dir=settings.interfaceLanguage==='ara'?'rtl':'ltr';w.dispatchEvent(new w.CustomEvent('galaxy-language-changed'))}};
 w.eval(fs.readFileSync(root+'/assets/settings-dashboard.js','utf8').replace('__GALAXY_SETTINGS_DASHBOARD_CSS__',JSON.stringify(fs.readFileSync(root+'/assets/settings-dashboard.css','utf8'))));await wait();
 for(const [locale,label] of [['ara','لغة الواجهة'],['fre','Langue de l’interface'],['eng','UI Language'],['ara','لغة الواجهة']]){
  w.GalaxySettingsDashboard.choose('general');
  const search=w.document.querySelector('.gs-settings-search input');search.value='Language';search.dispatchEvent(new w.Event('input'));
  nativeRow.querySelector('.option-name-container-test').textContent=label;
  await w.GalaxySettingsDashboard.updateSetting('interfaceLanguage',locale);await wait();
  const control=w.document.querySelector('[data-gs-control="interfaceLanguage"]');
  assert(control?.isConnected,'language selector survives locale change');assert.equal(control.value,locale);assert.equal(control.options.length,3,'full native language list survives localized labels');
  assert.equal(w.document.querySelector('.gs-settings-search input').value,'','search in previous language is cleared');assert(!w.document.querySelector('.gs-playback').hidden,'language card stays visible after search and locale change');
  w.GalaxySettingsDashboard.choose('appearance');assert.equal(nativeRow.dataset.gsNativeGroup,'appearance');assert.equal(nativeRow.dataset.gsVisible,'true','native language control stays in Interface even in French');assert(nativeControl.isConnected,'original language control is retained');
 }
 delete nativeControl.setting;
 w.GalaxySettingsDashboard.choose('general');await w.GalaxySettingsDashboard.updateSetting('interfaceLanguage','fre');await wait();
 assert.equal(w.document.querySelector('[data-gs-control="interfaceLanguage"]').options.length,3,'temporarily missing native metadata does not reduce language list');
 w.GalaxySettingsDashboard.destroy();d.window.close();console.log('PASS: repeated EN/AR/FR changes, language search reset, stable native language section/control, retained native options during transition.');
})().catch(e=>{console.error(e);process.exitCode=1});
