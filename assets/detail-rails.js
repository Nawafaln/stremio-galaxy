// Stremio Galaxy community modification, GPL-3.0.
// Own the new rails only; React-owned lists stay mounted for original playback handlers.
((css)=>{
 'use strict';
 if(window.top!==window||!window.__galaxyAppearance||window.GalaxyDetailRails)return;
 const q=(root,selector)=>root?.querySelector(selector);
 const propsAt=(node,test)=>{
  const key=node&&Object.keys(node).find(k=>k.startsWith('__reactFiber$')||k.startsWith('__reactInternalInstance$'));
  for(let fiber=key&&node[key],i=0;fiber&&i<50;i++,fiber=fiber.return){
   // Alternate can contain newer props during an upstream commit.
   for(const f of [fiber,fiber.alternate])if(f?.memoizedProps&&test(f.memoizedProps))return f.memoizedProps;
  }
  return null;
 };
 const unique=items=>[...new Set(items)];
 const languages=value=>{
  if(value==null)return null;
  if(!Array.isArray(value)&&typeof value!=='string')return null;
  const values=Array.isArray(value)?value:value.split(/[,;|/]+/);
  return unique(values.map(v=>typeof v==='string'?v.trim():v?.lang||v?.language||'').filter(v=>v&&!/^(unknown|und|undefined|multi|multiple|n\/a)$/i.test(v)));
 };
 const numeric=v=>v!==null&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;

 // These are literal provider region/language codes, not verified subtitle tracks.
 function expectedSubtitleCodes(stream){
  const text=[stream.description,stream.title].filter(v=>typeof v==='string').join('\n'),codes=[];
  for(const flag of text.match(/[\u{1F1E6}-\u{1F1FF}]{2}/gu)||[])codes.push(Array.from(flag,c=>String.fromCharCode(c.codePointAt(0)-0x1F1E6+65)).join(''));
  const allowed=new Set('GB UK EN US RU PT BR ES MX CN TW ZH FR PL AR SA EG AE JP JA DE IT KR KO TR NL NO SE SV DK DA FI HI IN TH VN VI ID IR FA HE IL UA UKR RO CS CZ HU BG EL GR MY MS SK SL HR SR LT LV ET IS PH TL BN BD PK UR'.split(' '));
  for(const line of text.split(/\r?\n/)){
   const explicit=line.match(/^\s*(?:expected subtitles?|الترجم(?:ة|ات) المتوقعة)\s*[:：]\s*(.+)$/i);
   const candidate=(explicit?explicit[1]:line).trim().replace(/^[\[({]\s*|\s*[\])}]$/g,'');
   if(!/^[A-Z]{2}(?:\s*[/|,]\s*[A-Z]{2})*$/.test(candidate))continue;
   const values=candidate.split(/\s*[/|,]\s*/);if(!explicit&&values.length<2)continue;
   if(values.every(v=>allowed.has(v)))codes.push(...values);
  }
  return unique(codes);
 }
 const subtitleFilterValues=d=>d.subtitles?.length?d.subtitles:d.subtitleCount===0?[]:d.expectedSubtitles||[];

 function describe(stream){
  const hints=stream.behaviorHints||{},text=[stream.name,stream.description,stream.title,hints.filename].filter(v=>typeof v==='string').join('\n');
  const explicitQuality=String(stream.quality||hints.videoQuality||'');
  const quality=explicitQuality.match(/\b(2160|1440|1080|720|480)(?:p)?\b/i)||(!/\b4k\b/i.test(explicitQuality)&&text.match(/\b(2160|1440|1080|720|480)p\b/i));
  const resolution=quality?quality[1]+'p':/\b4k\b/i.test(text+' '+explicitQuality)?'2160p':null;
  const size=typeof hints.videoSize==='number'?hints.videoSize:typeof stream.size==='number'?stream.size:null;
  const sizeText=size!==null?(size/1024**3).toFixed(2)+' GB':text.match(/\b\d+(?:[.,]\d+)?\s*(?:GiB|MiB|GB|MB)\b/i)?.[0]||null;
  let seeds=numeric(stream.seeders??hints.seeders);
  if(seeds===null){const match=text.match(/(?:👤|👥|\bseeders?\s*[:=]?)\s*(\d+(?:[.,]\d+)?\s*[kKmM]?)/iu);if(match){const n=match[1].replace(/\s/g,'').replace(',','.');seeds=parseFloat(n)*(/k$/i.test(n)?1000:/m$/i.test(n)?1000000:1)}}
  const audio=languages(stream.audioLanguages??hints.audioLanguages??stream.audio?.languages);
  const explicitAudio=text.match(/(?:^|\n)\s*(?:🎧|🔊)?\s*(?:audio(?:\s+languages?)?|الصوت)\s*[:：]\s*([^\n]+)/i);
  const explicitSubs=text.match(/(?:^|\n)\s*(?:💬|📝|🔤)?\s*(?:subtitles?(?:\s+languages?)?|subs|الترجم(?:ة|ات))\s*[:：]\s*([^\n]+)/i);
  let subs=languages(stream.subtitleLanguages??hints.subtitleLanguages),count=null;
  const tracks=Array.isArray(stream.subtitles)?stream.subtitles:Array.isArray(hints.subtitles)?hints.subtitles:null;
  if(tracks!==null){subs=languages(tracks);count=tracks.length===0?0:subs.length?subs.length:tracks.length}
  else if(subs!==null)count=subs.length||null;
  else if(explicitSubs){const v=explicitSubs[1].trim();if(/^(none|no subtitles|0|لا توجد|بدون ترجمة)$/i.test(v)){subs=[];count=0}else{subs=languages(v);count=subs?.length||null}}
  // Only an explicit complete empty language list establishes no subtitles.
  if(Array.isArray(stream.subtitleLanguages??hints.subtitleLanguages)&&(stream.subtitleLanguages??hints.subtitleLanguages).length===0)count=0;
  const explicitCount=numeric(stream.subtitleCount??hints.subtitleCount);if(explicitCount!==null)count=explicitCount;
  return {quality:resolution,size:sizeText,seeders:seeds,audio:audio||languages(explicitAudio?.[1]),subtitles:subs,subtitleCount:count,expectedSubtitles:expectedSubtitleCodes(stream)};
 }

 function torrentDetails(stream){
  const hints=stream.behaviorHints||{},description=typeof stream.description==='string'?stream.description:typeof stream.title==='string'?stream.title:'';
  const lines=description.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
  const filename=typeof hints.filename==='string'?hints.filename:typeof stream.filename==='string'?stream.filename:lines.find(v=>/\.(?:mkv|mp4|avi|webm|m4v|ts)$/i.test(v))||null;
  const release=lines.find(v=>!/[👤👥💾⚙]/u.test(v)&&!/^https?:/i.test(v))||filename;
  const text=[stream.name,description,filename].filter(v=>typeof v==='string').join('\n');
  const indexer=description.match(/⚙\uFE0F?\s*([^\r\n]+)/u)?.[1]?.trim()||null;
  const match=pattern=>text.match(pattern)?.[0]||null;
  const hash=typeof stream.infoHash==='string'&&/^(?:[a-f\d]{40}|[a-f\d]{64})$/i.test(stream.infoHash)?stream.infoHash:null;
  return {filename,release,indexer,infoHash:hash,fileIndex:Number.isInteger(stream.fileIdx)&&stream.fileIdx>=0?stream.fileIdx:null,
   videoCodec:match(/\b(?:x265|h[ ._-]?265|HEVC|x264|h[ ._-]?264|AV1|VP9)\b/i),
   audioCodec:match(/\b(?:TrueHD|DTS[ ._-]?HD(?:[ ._-]?MA)?|DTS|DDP(?:[ .]?\d\.\d)?|E[ ._-]?AC[ ._-]?3|AC[ ._-]?3|FLAC|AAC|Opus)\b/i),
   videoSource:match(/\b(?:Blu[ ._-]?Ray|BDRip|WEB[ ._-]?DL|WEBRip|HDRip|DVDRip)\b/i),
   bitDepth:match(/\b(?:10|12|8)[ ._-]?bit\b/i),
   audioClaim:/\bdual[ ._-]?audio\b/i.test(text)?'Dual Audio':/\bmulti[ ._-]?audio\b/i.test(text)?'Multi Audio':/\bdubbed\b/i.test(text)?'Dubbed':null,
   subtitleClaim:/\bmulti[ ._-]?(?:subs?|subtitles?)\b/i.test(text)?'Multi Subs':null,
   trackers:unique((Array.isArray(stream.sources)?stream.sources:[]).filter(v=>typeof v==='string'&&v.startsWith('tracker:')).map(v=>v.slice(8)))
  };
 }
 let detailsDialog=null,detailsReturnFocus=null;
 function closeTorrentDetails(){detailsDialog?.remove();detailsDialog=null;if(detailsReturnFocus?.isConnected)detailsReturnFocus.focus();detailsReturnFocus=null}
 function openTorrentDetails(entry,workTitle,trigger){
  closeTorrentDetails();detailsReturnFocus=trigger;
  const {stream,provider,details:d}=entry,info=torrentDetails(stream),dialog=el('dialog','galaxy-torrent-dialog');detailsDialog=dialog;
  dialog.setAttribute('aria-labelledby','galaxy-torrent-details-title');
  const header=el('div','galaxy-torrent-dialog-header'),title=el('h2',null,t('Torrent / source information','معلومات التورنت والمصدر'));title.id='galaxy-torrent-details-title';
  const close=el('button','galaxy-torrent-close','×');close.type='button';close.setAttribute('aria-label',t('Close source information','إغلاق معلومات المصدر'));close.onclick=closeTorrentDetails;header.append(title,close);dialog.append(header);
  dialog.append(el('p','galaxy-torrent-work',workTitle));const rows=el('dl','galaxy-torrent-rows');
  const add=(label,value)=>{if(value===null||value===undefined||value==='')return;rows.append(el('dt',null,label),el('dd',null,String(value)))};
  add(t('Provider','الإضافة'),provider);add(t('Source type','نوع المصدر'),entry.type||t('Unknown','غير معروف'));
  add(t('Torrent indexer','مصدر التورنت'),info.indexer);add(t('Release','الإصدار'),info.release);add(t('Filename','اسم الملف'),info.filename);
  add(t('Quality','الجودة'),d.quality);add(t('Size','الحجم'),d.size);add('Seeders',d.seeders);
  add(t('Video source (release label)','مصدر الفيديو حسب الإصدار'),info.videoSource);add(t('Video codec (release label)','ترميز الفيديو حسب الإصدار'),info.videoCodec);add(t('Bit depth (release label)','عمق الألوان حسب الإصدار'),info.bitDepth);
  add(t('Audio format (release label)','صيغة الصوت حسب الإصدار'),info.audioCodec);add(t('Audio description (release label)','وصف الصوت حسب الإصدار'),info.audioClaim);
  add(t('Audio languages','لغات الصوت'),d.audio?.length?d.audio.join(' · '):t('Not provided by the source','لم يحددها المصدر'));
  add(t('Subtitle description (release label)','وصف الترجمة حسب الإصدار'),info.subtitleClaim);
  add(t('Subtitle languages','لغات الترجمة'),d.subtitles?.length?d.subtitles.join(' · '):d.subtitleCount===0?t('None reported','لا توجد حسب المصدر'):t('Not provided by the source','لم يحددها المصدر'));
  if(!d.subtitles?.length&&d.subtitleCount!==0&&d.expectedSubtitles?.length)add(t('Expected subtitle codes (provider description)','رموز الترجمة المتوقعة من وصف المصدر'),d.expectedSubtitles.join(' · '));
  add('Info Hash',info.infoHash);add(t('File index (zero-based)','رقم الملف (يبدأ من صفر)'),info.fileIndex);
  if(info.trackers.length)add(t('Reported trackers','التراكرات المعلنة'),info.trackers.join('\n'));
  dialog.append(rows,el('p','galaxy-torrent-explanation',t('Release labels are supplied by the provider, not verified media tracks. Dual Audio or Multi Subs does not identify the languages. Torrentio selects torrent sources; Seeders are peers sharing the file, not a dedicated server.','بيانات الإصدار يعلنها المصدر وليست فحصًا لمسارات الملف. Dual Audio أو Multi Subs لا يحدد أسماء اللغات. Torrentio يعرض مصادر تورنت؛ وSeeders هم المشاركون في مشاركة الملف وليست سيرفرًا ثابتًا.')));
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeTorrentDetails()});document.body.append(dialog);
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');close.focus();
 }

 const safeHref=value=>{if(typeof value!=='string')return null;try{const u=new URL(value,location.href);if(u.origin===location.origin&&/^#\/(?:detail|metadetails|player)\//.test(u.hash))return u.hash;if(/^https?:$/.test(u.protocol))return u.href}catch{}return null};
 const el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n};
 let host,content,panel,style,timer,busy=false,dead=false,lastSignature='',route='',meta=null,model=null,ctxLanguage='',season=null,search='',filter={quality:'',provider:'',audio:'',subtitles:'',multi:true,type:''};
 let filtersOpen=false,pendingContent=null,heroLoading=null,routeObserver=null,refreshJob=null,entryStarted=0,failedHash=null,nativeVideosProps=null;
 const ar=()=>/^(ar|ara)(?:-|_|$)/i.test(window.GalaxyLayout?.getLanguage?.()||ctxLanguage||document.documentElement.lang||navigator.language);
 const t=(en,arabic)=>ar()?arabic:en;
 function transport(root){
  if(window.core)return window.core.transport||window.core;
  for(const node of [root,...Array.from(root?.querySelectorAll('*')||[]).slice(0,180)]){
   const key=node&&Object.keys(node).find(k=>k.startsWith('__reactFiber$'));
   for(let f=key&&node[key],i=0;f&&i<50;i++,f=f.return)for(let d=f.dependencies?.firstContext,j=0;d&&j<20;j++,d=d.next){const value=d.memoizedValue;if(value?.core?.transport)return value.core.transport;if(value?.transport?.getState)return value.transport}
  }
  return null;
 }
 function select(label,values,value,onChange){
  const wrap=el('label',null,label),input=el('select');input.dataset.galaxyFocus='select-'+label;
  for(const [key,title] of values){const option=el('option',null,title);option.value=String(key);input.append(option)}
  input.value=String(value);input.addEventListener('change',()=>onChange(input.value));wrap.append(input);return wrap;
 }

 const iconPaths={
  play:'M8 4L21 12 8 20Z',users:'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-3a8 6 0 0 1 16 0v3Z',file:'M5 2h9l5 5v15H5Zm9 1v5h5',
  volume:'M11 4 6 8H2v8h4l5 4ZM15 8c2 2 2 6 0 8M18 5c4 4 4 10 0 14',subtitles:'M3 5h18v13H9l-4 3v-3H3ZM6 9h2M11 9h2M16 9h2M6 13h5M14 13h4',
  crown:'M2 6l5 4 5-7 5 7 5-4-3 14H5Z',link:'M10 7V5a3 3 0 0 1 3-3h5a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-2M14 17v2a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3h2M9 15l7-7',
  sliders:'M3 6h18M3 12h18M3 18h18M7 3v6M16 9v6M10 15v6',info:'M12 8h.01M12 11v6M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',left:'M15 5l-7 7 7 7',right:'M9 5l7 7-7 7'
 };
 function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','galaxy-rail-icon galaxy-rail-icon-'+name);svg.setAttribute('aria-hidden','true');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',iconPaths[name]||iconPaths.info);svg.append(path);return svg}
 function sourceType(stream){
  const hints=stream.behaviorHints||{},explicit=String(stream.sourceType||hints.sourceType||'').toLowerCase();
  if(['torrent','torrents','debrid','direct'].includes(explicit))return explicit==='torrents'?'torrent':explicit;
  const text=[stream.name,stream.description].filter(Boolean).join(' ');
  if(/\[(?:RD|AD|PM|TB)[+\s\]]|\b(?:real[ -]?debrid|all[ -]?debrid|premiumize|torbox)\b/i.test(text))return 'debrid';
  if(stream.infoHash||/^magnet:/i.test(stream.url||''))return 'torrent';
  if(/^https?:\/\//i.test(stream.url||''))return 'direct';
  return null;
 }
 const languageCodes={ara:'AR',ar:'AR',arabic:'AR','العربية':'AR',eng:'EN',en:'EN',english:'EN',jpn:'JP',ja:'JP',japanese:'JP',spa:'ES',es:'ES',spanish:'ES',rus:'RU',ru:'RU',russian:'RU',fra:'FR',fre:'FR',fr:'FR',french:'FR',por:'PT',pt:'PT',portuguese:'PT',deu:'DE',ger:'DE',de:'DE',german:'DE',ita:'IT',it:'IT',italian:'IT',kor:'KO',ko:'KO',korean:'KO',zho:'ZH',chi:'ZH',zh:'ZH',chinese:'ZH'};
 const languageLabel=value=>languageCodes[String(value).toLowerCase()]||String(value).toUpperCase();

 function railSection(title){
  const section=el('section'),heading=el('div','galaxy-rail-heading'),headingLeft=el('div','galaxy-rail-title'),controls=el('div','galaxy-rail-controls'),rail=el('div','galaxy-detail-rail');
  headingLeft.append(el('h2',null,title));heading.append(headingLeft,controls);section.append(heading,rail);
  rail.setAttribute('role','region');rail.setAttribute('aria-label',title);
  for(const [name,direction,label] of [['left',-1,t('Scroll left','تمرير لليسار')],['right',1,t('Scroll right','تمرير لليمين')]]){const button=el('button');button.type='button';button.append(icon(name));button.setAttribute('aria-label',label);button.onclick=()=>rail.scrollBy({left:direction*rail.clientWidth*.8,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});controls.append(button)}
  return {section,heading,headingLeft,controls,rail};
 }
 function activateStream(event,stream){
  // Use the matching upstream link when present, preserving analytics/external-player handling.
  const href=stream.deepLinks?.player;
  const original=Array.from(host.querySelectorAll('[class*="stream-container-"]')).find(n=>propsAt(n,p=>p.deepLinks?.player===href&&href));
  if(original&&event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();original.click()}
 }
 function render(groups,video){
  const focused=document.activeElement,focusId=panel?.contains(focused)?focused.dataset.galaxyFocus:null;
  const left=panel?.querySelector('[data-episodes]')?.scrollLeft||0,right=panel?.querySelector('[data-servers]')?.scrollLeft||0;
  const reusableImages=new Map(Array.from(panel?.querySelectorAll('img[data-galaxy-episode-image]')||[]).map(img=>[img.dataset.galaxyEpisodeImage,img]));
  const fresh=el('div','galaxy-detail-rails');fresh.dataset.routeHash=location.hash;fresh.dir='ltr';if(filtersOpen)fresh.dataset.filtersOpen='';
  const unknown=t('Unknown','غير معروف'),videos=Array.isArray(meta?.videos)?meta.videos:[];
  const workTitle=[meta?.name,video?[Number.isFinite(video.season)?'S'+video.season:'',Number.isFinite(video.episode)?'E'+video.episode:''].join('')+' '+(video.title||''):null].filter(Boolean).join(' · ');
  if(videos.length>0&&(meta.type==='series'||videos.length>1)){
   const row=railSection(t('Episodes','الحلقات')),seasons=unique(videos.map(v=>v.season).filter(Number.isFinite)).sort((a,b)=>a-b);
   if(!seasons.includes(season))season=video?.season??seasons.find(n=>n>0)??seasons[0]??null;
   if(seasons.length){const seasonControl=select(t('Season','الموسم'),seasons.map(n=>[n,t('Season ','الموسم ')+n]),season,v=>{season=Number(v);render(groups,video);nativeVideosProps?.seasonOnSelect?.({type:'select',value:season})});seasonControl.classList.add('galaxy-season');row.headingLeft.append(seasonControl)}
   const input=el('input','galaxy-episode-search');input.type='search';input.dataset.galaxyFocus='episode-search';input.placeholder=t('Search episodes','بحث الحلقات');input.setAttribute('aria-label',input.placeholder);input.value=search;
   input.oninput=()=>{search=input.value;const start=input.selectionStart;render(groups,video);const next=panel.querySelector('input[type="search"]');next?.focus();try{next?.setSelectionRange(start,start)}catch{}};
   row.controls.prepend(input);row.rail.dataset.episodes='';
   const visible=videos.filter(v=>(season===null||v.season===season)&&(!search||(v.title||'').toLowerCase().includes(search.toLowerCase())||String(v.episode)===search)).sort((a,b)=>(a.episode||0)-(b.episode||0));
   for(const v of visible){
    const href=safeHref(v.deepLinks?.metaDetailsStreams),card=el(href?'a':'div','galaxy-episode-card');if(href)card.href=href;
    if(v.id===video?.id)card.setAttribute('aria-current','true');card.title=v.title||'';
    const art=el('div','galaxy-episode-art');let image;
    if(typeof v.thumbnail==='string'&&/^https?:\/\//.test(v.thumbnail)){
     const retained=reusableImages.get(String(v.id));
     if(retained?.getAttribute('src')===v.thumbnail)image=retained;
     else {
      image=el('img','galaxy-episode-image');image.dataset.galaxyEpisodeImage=String(v.id);image.alt='';image.loading='lazy';image.style.opacity='0';
      // Keep loaded nodes across stream updates; hide only genuinely new/failed images.
      image.onload=()=>{image.style.opacity=image.naturalWidth>0?'1':'0'};
      image.onerror=()=>{image.style.opacity='0'};
      image.src=v.thumbnail;
     }
    }else image=el('div','galaxy-episode-image galaxy-episode-placeholder');
    const play=el('span','galaxy-episode-active');play.append(icon('play'));art.append(image,play);
    const copy=el('div','galaxy-episode-copy');copy.append(el('strong',null,(Number.isFinite(v.episode)?v.episode+'. ':'')+(v.title||t('Episode','حلقة'))));
    const released=v.released?new Date(v.released):null;copy.append(el('small',null,[released&&!isNaN(released)?released.toLocaleDateString(ar()?'ar':'en',{month:'short',day:'numeric',year:'numeric'}):null,v.watched?t('Watched','تمت المشاهدة'):null].filter(Boolean).join(' · ')));
    card.append(art,copy);row.rail.append(card);
   }
   if(!visible.length)row.rail.append(el('p','galaxy-rails-status',t('No episodes match your search.','لا توجد حلقات مطابقة للبحث.')));
   fresh.append(row.section);
  }
  const row=railSection(t('Servers','السيرفرات'));row.rail.dataset.servers='';
  const entries=[];let loading=0,errors=0;
  for(const group of groups||[]){if(group.content?.type==='Loading')loading++;if(group.content?.type==='Err')errors++;if(group.content?.type!=='Ready'||!Array.isArray(group.content.content))continue;for(const stream of group.content.content)entries.push({stream,provider:group.addon?.manifest?.name||unknown,providerId:group.addon?.transportUrl||group.addon?.manifest?.name||unknown,details:describe(stream),type:sourceType(stream)})}
  const info=el('span','galaxy-server-info');info.append(icon('info'));info.title=t('Unknown subtitle data stays visible. Best match: reported Seeders, then quality.','تبقى بيانات الترجمة المجهولة ظاهرة. أفضل تطابق حسب Seeders المعلن ثم الجودة.');row.headingLeft.append(info);
  const tabs=el('div','galaxy-server-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',t('Server type','نوع السيرفر'));
  for(const [type,label] of [['',t('All','الكل')],['torrent',t('Torrents','تورنت')],['debrid','Debrid'],['direct',t('Direct','مباشر')]]){const tab=el('button',null,label);tab.type='button';tab.dataset.sourceType=type;tab.dataset.galaxyFocus='source-type-'+type;tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(filter.type===type));tab.onclick=()=>{filter.type=type;render(groups,video)};tabs.append(tab)}
  row.headingLeft.append(tabs);
  const toggle=el('button','galaxy-filter-toggle');toggle.type='button';toggle.dataset.galaxyFocus='filters-toggle';toggle.append(icon('sliders'));toggle.setAttribute('aria-label',t('Server filters','فلاتر السيرفرات'));toggle.setAttribute('aria-expanded',String(filtersOpen));toggle.onclick=()=>{filtersOpen=!filtersOpen;render(groups,video)};row.headingLeft.append(toggle);
  const filters=el('div','galaxy-server-filters'),all=t('All','الكل');filters.hidden=!filtersOpen;
  const options=key=>[['',all],...unique(entries.flatMap(e=>key==='provider'?e.providerId:key==='quality'?[e.details.quality].filter(Boolean):key==='subtitles'?subtitleFilterValues(e.details):e.details[key]||[])).map(v=>[v,key==='provider'?entries.find(e=>e.providerId===v).provider:key==='subtitles'&&!entries.some(e=>e.details.subtitles?.includes(v))?v+' · '+t('Expected','متوقعة'):v])];
  for(const [key,label] of [['quality',t('Quality','الجودة')],['provider',t('Provider','المصدر')],['audio',t('Audio','الصوت')],['subtitles',t('Subtitles','الترجمة')]])filters.append(select(label,options(key),filter[key],v=>{filter[key]=v;render(groups,video)}));
  const multi=el('input');multi.type='checkbox';multi.dataset.galaxyFocus='multi';multi.checked=filter.multi;multi.onchange=()=>{filter.multi=multi.checked;render(groups,video)};const multiLabel=el('label');multiLabel.append(multi,document.createTextNode(t('Hide confirmed 0–1 subtitles','إخفاء المؤكد: صفر أو ترجمة واحدة')));filters.append(multiLabel);
  row.section.insertBefore(filters,row.rail);
  const visible=entries.filter(e=>(!filter.type||e.type===filter.type)&&(!filter.multi||e.details.subtitleCount===null||e.details.subtitleCount>1)&&(!filter.quality||e.details.quality===filter.quality)&&(!filter.provider||e.providerId===filter.provider)&&(!filter.audio||e.details.audio?.includes(filter.audio))&&(!filter.subtitles||subtitleFilterValues(e.details).includes(filter.subtitles)));
  const preferred=window.GalaxySettingsDashboard?.getPreferences?.().quality||'';
  const ranked=visible.filter(e=>safeHref(e.stream.deepLinks?.player)).slice().sort((a,b)=>(preferred?Number(b.details.quality===preferred)-Number(a.details.quality===preferred):0)||(b.details.seeders??-1)-(a.details.seeders??-1)||(parseInt(b.details.quality)||0)-(parseInt(a.details.quality)||0));const best=ranked[0];
  for(const entry of visible){
   const {stream,provider,details:d}=entry,info=torrentDetails(stream),href=safeHref(stream.deepLinks?.player),wrapper=el('div','galaxy-server-entry'),card=el(href?'a':'div','galaxy-server-card');
   if(href){card.href=href;card.addEventListener('click',event=>activateStream(event,stream))}
   card.title=[workTitle,provider,stream.name,stream.description||stream.title].filter(Boolean).join('\n');
   card.append(el('span','galaxy-sr-only',workTitle));
   if(entry===best){card.dataset.best='';const badge=el('span','galaxy-server-badge');badge.append(icon('crown'),document.createTextNode(t('Best Match','أفضل تطابق')));badge.title=preferred?t('Preferred quality first, then reported Seeders and resolution; availability may vary.','حسب الجودة المفضلة، ثم Seeders المعلن والدقة؛ قد يختلف التوفر.'):t('Highest reported Seeders, then quality; availability may vary.','حسب أعلى Seeders معلن، ثم الجودة؛ قد يختلف التوفر.');card.append(badge)}
   const source=el('div','galaxy-server-provider');source.append(document.createTextNode(provider),icon('link'));if(info.indexer){const indexer=el('span','galaxy-server-indexer',info.indexer);source.append(indexer)}card.append(source);
   const stats=el('div','galaxy-server-stats'),quality=el('span','galaxy-server-quality',d.quality||'?');quality.title=t('Quality: ','الجودة: ')+(d.quality||unknown);
   const seeds=el('span','galaxy-server-seeds');seeds.append(icon('users'),document.createTextNode(d.seeders===null?'?':d.seeders.toLocaleString()));seeds.title='Seeders: '+(d.seeders??unknown);seeds.setAttribute('aria-label',seeds.title);
   const size=el('span','galaxy-server-size');size.append(icon('file'),document.createTextNode(d.size||'?'));size.title=t('Size: ','الحجم: ')+(d.size||unknown);stats.append(quality,seeds,size);card.append(stats);
   const summary=[info.videoSource,info.videoCodec,info.audioCodec,info.bitDepth].filter(Boolean).join(' · ');if(summary){const release=el('div','galaxy-server-release',summary);release.title=t('Reported release: ','حسب الإصدار: ')+(info.release||summary);card.append(release)}
   const langs=el('div','galaxy-server-languages');
   for(const [className,values,label,iconName] of [['galaxy-server-audio',d.audio,t('Audio','الصوت'),'volume'],['galaxy-server-subtitles',d.subtitles,t('Subtitles','الترجمة'),'subtitles']]){
    const group=el('div',className),description=label+': '+(values?.length?values.join(' · '):className==='galaxy-server-subtitles'&&d.subtitleCount===0?t('None','لا توجد'):unknown);group.title=description;group.setAttribute('aria-label',description);group.append(icon(iconName));
    if(values?.length){for(const value of values){const tag=el('span','galaxy-language-tag',languageLabel(value));tag.title=value;group.append(tag)}}else if(className==='galaxy-server-subtitles'&&d.subtitleCount!==0&&d.expectedSubtitles?.length){
     group.dataset.expected='';group.tabIndex=0;group.title=t('Expected subtitle codes from provider description (not verified): ','رموز ترجمة متوقعة من وصف المصدر، غير مؤكدة: ')+d.expectedSubtitles.join(' / ');group.setAttribute('aria-label',group.title);
     const marker=el('span','galaxy-expected-marker','~');marker.title=t('Expected','متوقعة');group.append(marker);
     for(const code of d.expectedSubtitles){const tag=el('span','galaxy-language-tag galaxy-language-expected',code);tag.title=code+' · '+t('Expected, not verified','متوقعة وغير مؤكدة');group.append(tag)}
    }else {const claim=className==='galaxy-server-audio'?info.audioClaim:d.subtitleCount===0?null:info.subtitleClaim;const tag=el('span','galaxy-language-tag',className==='galaxy-server-subtitles'&&d.subtitleCount===0?'—':claim||unknown);if(claim){tag.title=t('Release label only; languages not provided.','وصف الإصدار فقط؛ لم يحدد أسماء اللغات.');group.setAttribute('aria-label',label+': '+claim+' · '+t('Languages not provided','اللغات غير محددة'))}group.append(tag)}
    langs.append(group);
   }
   const play=el('span','galaxy-server-play');play.title=href?t('Play','تشغيل'):t('Playback link unavailable','رابط التشغيل غير متاح');play.append(icon('play'));if(!href){play.style.opacity='.4';card.setAttribute('aria-disabled','true')}card.append(langs,play);wrapper.append(card);const detailsButton=el('button','galaxy-server-details');detailsButton.type='button';detailsButton.append(icon('info'));detailsButton.setAttribute('aria-label',t('Source information: ','معلومات المصدر: ')+provider);detailsButton.title=t('Torrent / source information','معلومات التورنت والمصدر');detailsButton.onclick=()=>openTorrentDetails(entry,workTitle,detailsButton);wrapper.append(detailsButton);row.rail.append(wrapper);
  }
  if(!visible.length)row.rail.append(el('p','galaxy-rails-status',loading?t('Loading servers…','جارٍ تحميل السيرفرات…'):entries.length?t('No servers match. Change filters to show more.','لا توجد نتائج مطابقة. غيّر الفلاتر لعرض المزيد.'):video?t('No servers available for this episode.','لا تتوفر سيرفرات لهذه الحلقة.'):t('Select an episode to load its servers.','اختر حلقة لعرض السيرفرات.')));
  const statusText=visible.length+' / '+entries.length+' · '+t('Unknown subtitle information stays visible.','تبقى بيانات الترجمة المجهولة ظاهرة.')+(loading?' · '+t('More providers loading…','جارٍ تحميل مصادر أخرى…'):'')+(errors?' · '+t('Some providers failed to load.','تعذر تحميل بعض المصادر.'):'');
  const status=el('p','galaxy-rails-note',statusText);status.setAttribute('role','status');row.section.append(status);info.title+='\n'+statusText;fresh.append(row.section);
  fresh.addEventListener('keydown',event=>{if(event.key==='Escape'&&filtersOpen){filtersOpen=false;render(groups,video);panel.querySelector('.galaxy-filter-toggle')?.focus()}});
  if(panel)panel.replaceWith(fresh);else content.append(fresh);panel=fresh;
  if(focusId)Array.from(panel.querySelectorAll('[data-galaxy-focus]')).find(n=>n.dataset.galaxyFocus===focusId)?.focus({preventScroll:true});
  const episodeRail=panel.querySelector('[data-episodes]');if(episodeRail)episodeRail.scrollLeft=left;row.rail.scrollLeft=right;
 }

 function clear(){closeTorrentDetails();heroLoading?.remove();heroLoading=null;panel?.remove();panel=null;host?.removeAttribute('data-galaxy-rails');host?.removeAttribute('data-galaxy-loading');host?.querySelectorAll('[data-galaxy-native-hidden]').forEach(n=>n.removeAttribute('data-galaxy-native-hidden'));pendingContent?.remove();pendingContent=null;host=content=null;lastSignature=''}
 function currentRoute(){const match=location.hash.match(/^#\/(?:detail|metadetails)\/([^/]+)\/([^/?]+)(?:\/([^?]+))?/);try{return match&&match[1]!=='tv'?{key:match[1]+'/'+match[2],id:decodeURIComponent(match[2]),videoId:match[3]?decodeURIComponent(match[3]):null,hash:location.hash}:null}catch{return null}}
 function markRoute(){
  const active=currentRoute();
  if(!active)failedHash=null;
  if(!active||failedHash===active.hash){document.documentElement?.removeAttribute('data-galaxy-detail-route');return null}
  if(failedHash&&failedHash!==active.hash)failedHash=null;
  document.documentElement?.setAttribute('data-galaxy-detail-route','1');return active;
 }
 function loadingShell(){
  if(panel?.isConnected)return;
  heroLoading?.remove();panel?.remove();
  host.setAttribute('data-galaxy-loading','');heroLoading=el('div','galaxy-detail-hero-loading');heroLoading.setAttribute('aria-hidden','true');
  for(const name of ['logo','meta','pills','summary','actions'])heroLoading.append(el('div','galaxy-loading-'+name+' galaxy-loading-block'));
  content.append(heroLoading);panel=el('div','galaxy-detail-rails');panel.dataset.loading='';panel.setAttribute('aria-busy','true');
  for(const [name,title,count] of [['episodes',t('Episodes','الحلقات'),8],['servers',t('Servers','السيرفرات'),5]]){
   const row=railSection(title);row.rail.dataset[name]='';
   for(let n=0;n<count;n++){
    const card=el('div',name==='episodes'?'galaxy-episode-card':'galaxy-server-entry');card.setAttribute('aria-hidden','true');
    if(name==='episodes'){card.append(el('div','galaxy-episode-art galaxy-loading-block'),el('div','galaxy-loading-caption galaxy-loading-block'))}
    else{const surface=el('div','galaxy-server-card');for(let j=0;j<3;j++)surface.append(el('div','galaxy-loading-caption galaxy-loading-block'));card.append(surface)}
    row.rail.append(card);
   }
   panel.append(row.section);
  }
  const notice=el('span','galaxy-sr-only',t('Loading work details…','جارٍ تحميل تفاصيل العمل…'));notice.setAttribute('role','status');panel.append(notice);content.append(panel);
 }
 function prepare(){
  if(dead)return null;const active=markRoute();
  if(!active){clear();route='';meta=model=null;return null}
  if(active.key!==route){clear();route=active.key;meta=model=null;season=null;search='';nativeVideosProps=null;entryStarted=Date.now();filter={quality:'',provider:'',audio:'',subtitles:'',multi:true,type:''}}
  const root=document.querySelector('[class*="metadetails-container-"]'),body=q(root,'[class*="metadetails-content-"]');
  if(!root){if(host&&!host.isConnected)clear();return null}
  if(host!==root||(body&&content!==body)){clear();host=root;content=body}
  if(!content?.isConnected){
   pendingContent?.remove();pendingContent=el('div','galaxy-detail-pending-content');root.append(pendingContent);content=pendingContent;
  }
  host.setAttribute('data-galaxy-rails','');
  host.querySelectorAll('[class*="videos-list-container-"],[class*="streams-list-container-"]').forEach(n=>n.setAttribute('data-galaxy-native-hidden',''));
  if(!meta)loadingShell();
  else if(panel&&panel.dataset.routeHash!==active.hash&&active.videoId){
   closeTorrentDetails();lastSignature='';
   const selected=meta.videos?.find(v=>v.id===active.videoId)||{id:active.videoId};
   render([{content:{type:'Loading'}}],selected);
  }
  return {active,root,body};
 }
 function selectInitialSeason(video,vp){
  if(season!==null)return;
  const videos=Array.isArray(meta?.videos)?meta.videos:[],querySeason=new URLSearchParams(location.hash.split('?')[1]||'').get('season');
  const storedId=vp?.selectedVideoId||vp?.libraryItem?.state?.video_id||model?.libraryItem?.state?.video_id;
  const candidates=[querySeason!==null?Number(querySeason):null,video?.season,vp?.season,videos.find(v=>v.id===storedId)?.season];
  season=candidates.find(value=>Number.isFinite(value)&&videos.some(v=>v.season===value))??null;
 }
 async function refresh(){
  const prepared=prepare();if(!prepared||busy||dead)return;busy=true;
  try{
   const {active,root}=prepared,currentHash=active.hash;
   if(pendingContent?.isConnected)return;
   const videosNode=q(root,'[class*="videos-list-container-"]'),streamsNode=q(root,'[class*="streams-list-container-"]'),vp=propsAt(videosNode,p=>p.metaItem!==undefined&&p.seasonOnSelect),sp=propsAt(streamsNode,p=>Array.isArray(p.streams));
   const tr=transport(root);let snapshot=null;
   if(tr?.getState){try{const results=await Promise.all([tr.getState('meta_details'),tr.getState('ctx')]);snapshot=results[0];ctxLanguage=results[1]?.profile?.settings?.interfaceLanguage||''}catch{}}
   if(dead||currentHash!==location.hash||!root.isConnected)return;
   if(snapshot?.selected?.metaPath?.id===active.id)model=snapshot;
   if(vp?.metaItem?.content?.type==='Ready'&&(!vp.metaItem.content.content.id||vp.metaItem.content.content.id===active.id))meta=vp.metaItem.content.content;
   else if(model?.metaItem?.content?.type==='Ready')meta=model.metaItem.content.content;
   if(!meta){
    // Unsupported data bridges still recover the native error/empty-state UI after a bounded grace period.
    if(model?.metaItem?.content?.type==='Err'||vp?.metaItem?.content?.type==='Err'||(!model&&!vp&&Date.now()-entryStarted>8000)){failedHash=currentHash;document.documentElement.removeAttribute('data-galaxy-detail-route');clear()}
    return;
   }
   nativeVideosProps=vp;
   // Never label a previous episode's results as the requested episode.
   const selectedId=active.videoId||sp?.video?.id||model?.selected?.streamPath?.id;
   const groups=active.videoId&&!(meta.type==='movie'&&active.videoId===active.id)
    ? model?.selected?.streamPath?.id===active.videoId?model.streams||[]
     :sp?.video?.id===active.videoId?sp.streams||[]:[{content:{type:'Loading'}}]
    :sp?.streams||model?.streams||[];
   const video=meta.videos?.find(v=>v.id===selectedId)||sp?.video||null;
   selectInitialSeason(video,vp);
   const signature=JSON.stringify([currentHash,meta,groups,video,window.GalaxyLayout?.getLanguage?.()||ctxLanguage,model?.libraryItem]);
   if(signature!==lastSignature||!panel?.isConnected||panel.hasAttribute('data-loading')){lastSignature=signature;render(groups,video)}
   heroLoading?.remove();heroLoading=null;host.removeAttribute('data-galaxy-loading');
  }catch(error){console.warn('[Galaxy detail rails]',error);failedHash=location.hash;document.documentElement?.removeAttribute('data-galaxy-detail-route');clear()}finally{busy=false}
 }
 function changedRoute(){prepare();void refresh()}
 function start(){
  if(dead||timer)return;style=el('style');style.id='galaxy-detail-rails-style';style.textContent=css;document.documentElement.append(style);
  markRoute();prepare();
  routeObserver=new MutationObserver(records=>{if(dead||records.every(record=>panel?.contains(record.target)||heroLoading?.contains(record.target)))return;prepare();if(refreshJob===null)refreshJob=setTimeout(()=>{refreshJob=null;void refresh()},0)});
  routeObserver.observe(document.documentElement,{childList:true,subtree:true});
  timer=setInterval(()=>{if(!document.hidden)void refresh()},800);void refresh();
 }
 window.GalaxyDetailRails={refresh,describe,sourceType,torrentDetails,expectedSubtitleCodes,destroy(){dead=true;clearInterval(timer);clearTimeout(refreshJob);routeObserver?.disconnect();window.removeEventListener('galaxy-language-changed',changedRoute);window.removeEventListener('hashchange',changedRoute);document.removeEventListener('DOMContentLoaded',start);style?.remove();clear();document.documentElement?.removeAttribute('data-galaxy-detail-route');delete window.GalaxyDetailRails}};
 window.addEventListener('galaxy-language-changed',changedRoute);window.addEventListener('hashchange',changedRoute);if(document.documentElement)start();else document.addEventListener('DOMContentLoaded',start,{once:true});

})(__GALAXY_DETAIL_RAILS_CSS__);
