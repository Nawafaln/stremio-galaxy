// Personal Stremio community modification. GPL-3.0.
// Verified upstream: window.core.getState('ctx').profile.settings.interfaceLanguage.
(() => {
 'use strict';
 if(window.top!==window||window.GalaxySkipLocale)return;
 const labels={en:'Skip Intro',ar:'تخطي المقدمة',fr:'Passer le générique',de:'Intro überspringen',es:'Saltar introducción',it:'Salta introduzione',pt:'Pular abertura',tr:'İntroyu atla',ru:'Пропустить заставку',uk:'Пропустити заставку',pl:'Pomiń intro',nl:'Intro overslaan',sv:'Hoppa över intro',da:'Spring intro over',no:'Hopp over intro',fi:'Ohita intro',el:'Παράλειψη εισαγωγής',he:'דלג על הפתיח',fa:'رد کردن تیتراژ',hi:'इंट्रो छोड़ें',ja:'イントロをスキップ',ko:'인트로 건너뛰기',zh:'跳过片头',id:'Lewati intro',vi:'Bỏ qua phần mở đầu',th:'ข้ามบทนำ',ro:'Omite introducerea',cs:'Přeskočit úvod',hu:'Főcím átugrása',bg:'Пропускане на интрото'};
 const endings={en:'Skip Outro',ar:'تخطي أغنية النهاية',fr:'Passer le générique de fin',de:'Abspann überspringen',es:'Saltar créditos',it:'Salta titoli di coda',pt:'Pular encerramento',tr:'Bitişi atla',ru:'Пропустить финальную заставку',uk:'Пропустити кінцеву заставку',pl:'Pomiń zakończenie',nl:'Outro overslaan',sv:'Hoppa över eftertexter',da:'Spring afslutning over',no:'Hopp over avslutning',fi:'Ohita lopputekstit',el:'Παράλειψη τίτλων τέλους',he:'דלג על הסיום',fa:'رد کردن تیتراژ پایانی',hi:'आउट्रो छोड़ें',ja:'エンディングをスキップ',ko:'엔딩 건너뛰기',zh:'跳过片尾',id:'Lewati penutup',vi:'Bỏ qua phần kết',th:'ข้ามเพลงปิด',ro:'Omite încheierea',cs:'Přeskočit závěr',hu:'Zárófőcím átugrása',bg:'Пропускане на финала'};
 const aliases={eng:'en',ara:'ar',fra:'fr',fre:'fr',deu:'de',ger:'de',spa:'es',ita:'it',por:'pt',tur:'tr',rus:'ru',ukr:'uk',pol:'pl',nld:'nl',dut:'nl',swe:'sv',dan:'da',nor:'no',nob:'no',fin:'fi',ell:'el',gre:'el',heb:'he',fas:'fa',per:'fa',hin:'hi',jpn:'ja',kor:'ko',zho:'zh',chi:'zh',ind:'id',vie:'vi',tha:'th',ron:'ro',rum:'ro',ces:'cs',cze:'cs',hun:'hu',bul:'bg'};
 const resolve=value=>{const base=String(value||'en').toLowerCase().split(/[-_]/)[0];const lang=aliases[base]||base;return {lang:labels[lang]?lang:'en',label:labels[lang]||labels.en,endingLabel:endings[lang]||endings.en,dir:['ar','he','fa'].includes(lang)?'rtl':'ltr'}};
 let current=resolve('en'),pending=false;
 const apply=()=>{const b=document.getElementById('personal-anime-skip-button');if(!b)return;b.lang=current.lang;b.dir=current.dir;const label=b.dataset.skipKind==='ending'?current.endingLabel:current.label;const text=label+'  ⏭';if(b.textContent!==text)b.textContent=text;b.setAttribute('aria-label',label);b.title=label+' — Tab'};
 async function refresh(){
  apply();if(pending||typeof window.core?.getState!=='function')return;
  pending=true;
  try{const ctx=await window.core.getState('ctx');const language=ctx?.profile?.settings?.interfaceLanguage;if(typeof language==='string'){current=resolve(language);apply()}}
  catch{/* Core may be initializing. Retry without changing user settings. */}
  finally{pending=false}
 }
 window.GalaxySkipLocale={refresh,resolve,get current(){return current}};
 window.addEventListener('hashchange',refresh);window.addEventListener('focus',refresh);
 setInterval(refresh,2000);void refresh();
})();
