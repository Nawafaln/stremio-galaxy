// Stremio Galaxy community modification, GPL-3.0.
// Source identity is a provider/release group, never a promise about a physical server.
((root)=>{
 'use strict';
 const aliases={eng:'en',ara:'ar',fre:'fr',fra:'fr',ger:'de',deu:'de',spa:'es',ita:'it',por:'pt',jpn:'ja',kor:'ko',chi:'zh',zho:'zh',rus:'ru',tur:'tr',hin:'hi',heb:'he',per:'fa',fas:'fa',dut:'nl',nld:'nl',pol:'pl',ukr:'uk',ind:'id',vie:'vi',tha:'th',swe:'sv',dan:'da',nor:'no',fin:'fi',gre:'el',ell:'el',rum:'ro',ron:'ro',cze:'cs',ces:'cs',hun:'hu',bul:'bg'};
 const language=x=>{const s=String(x||'').toLowerCase().trim().split(/[-_]/)[0];return !s||['und','unknown','other tracks'].includes(s)?null:aliases[s]||s};
 const languages=tracks=>[...new Set((tracks||[]).map(t=>language(t.lang)).filter(Boolean))];
 const identity=(stream,base)=>({base:base||'',group:stream?.behaviorHints?.bingeGroup||'',name:String(stream?.name||'').replace(/\s+/g,' ').trim().toLowerCase()});
 const same=(a,b)=>!!a.base&&a.base===b.base&&(a.group&&b.group?a.group===b.group:!!a.name&&a.name===b.name);
 const rank=(groups,context,logic,location)=>{
  const out=[],seen=new Set();
  for(const g of groups||[]){if(g?.content?.type!=='Ready')continue;for(const s of (g.content.content||[]).slice(0,1000)){
   if(context.quality&&logic.quality([s.name,s.description].join(' '))!==context.quality)continue;
   const hash=logic.localHash(s.deepLinks?.player,location,'player');if(!hash||seen.has(hash))continue;seen.add(hash);
   const langs=languages(s.subtitles),source=identity(s,g.addon?.transportUrl),sameSource=same(context.source,source);
   out.push({hash,sameSource,languages:langs,source,score:(sameSource?100000:0)+(context.language&&langs.includes(context.language)?10000:0)+langs.length});
  }}
  return out.sort((a,b)=>b.score-a.score).slice(0,6);
 };
 const api={language,languages,identity,same,rank};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.GalaxyNextSource=api;
})(typeof window==='object'?window:globalThis);
