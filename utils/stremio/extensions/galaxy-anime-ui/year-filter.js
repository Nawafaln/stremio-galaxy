// Stremio Galaxy community modification, GPL-3.0. Independent release-year discovery control.
(()=>{
'use strict';if(window.top!==window||window.GalaxyAnimeYearFilter||window.GalaxyAnimeFiltersConfig?.yearEnabled===false)return;
const base='http://127.0.0.1:11471',catalogs=new Set(['galaxy-trending','galaxy-airing','galaxy-popular','galaxy-search']);
let years=[],widget,select,dead=false,loading=false,retry=0;
const style=document.createElement('style');style.dataset.galaxyYearStyle='';style.textContent=`
[data-galaxy-year]{display:inline-flex;align-items:center;margin-inline-start:14px;flex-shrink:0;font:inherit}
[data-galaxy-year] select{appearance:auto!important;display:block!important;position:static!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;color-scheme:dark;min-width:175px;max-width:230px;width:auto!important;height:44px;box-sizing:border-box;padding:9px 18px;font:inherit;color:#eee9ff;border:1px solid #9270bb60;border-radius:24px;background:linear-gradient(120deg,#382052bf,#17213ac9);cursor:pointer}
[data-galaxy-year] select:hover,[data-galaxy-year] select:focus-visible{border-color:#c298ff;outline:2px solid #b58bff60;outline-offset:2px}
[data-galaxy-year] option{background:#171126;color:#f5efff}
`;document.head.append(style);
function current(){try{const [pathname,query='']=location.hash.split('?'),parts=pathname.split('/');if(parts.length!==5||parts[0]!=='#'||parts[1]!=='discover'||decodeURIComponent(parts[2])!==base+'/manifest.json'||parts[3]!=='anime'||!catalogs.has(parts[4]))return null;return {pathname,params:new URLSearchParams(query)}}catch{return null}}
function mount(host){widget=document.createElement('div');widget.dataset.galaxyYear='';select=document.createElement('select');select.id='galaxy-release-year';select.append(new Option('', ''));for(const year of years)select.append(new Option(year,year));widget.append(select);host.append(widget);select.addEventListener('change',()=>{const r=current();if(!r)return;r.params.delete('skip');if(select.value)r.params.set('year',select.value);else r.params.delete('year');const query=r.params.toString();location.hash=r.pathname+(query?'?'+query:'')})}
async function update(){if(dead)return;let route=current();if(!route){widget?.remove();widget=undefined;return}
 const root=document.querySelector('[class*="selectable-inputs-container-"]'),host=root?.querySelector(':scope > [class*="selectable-inputs-"]')||root;if(!host)return;
 if(!years.length){if(loading||Date.now()<retry)return;loading=true;try{const response=await fetch(base+'/years.json',{credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('years');const data=await response.json();years=(data.years||[]).filter(y=>/^\d{4}$/.test(y));}catch{retry=Date.now()+10000}finally{loading=false}if(!years.length||dead)return;route=current();if(!route||!host.isConnected)return}
 if(!widget?.isConnected)mount(host);
 const genre=host.querySelector('[data-galaxy-genres]');if(genre&&genre.nextElementSibling!==widget)genre.after(widget);
 const ar=(window.GalaxyAnimeUI?.getLanguage?.()||document.documentElement.lang||'en').split('-')[0]==='ar';widget.dir=ar?'rtl':'ltr';select.setAttribute('aria-label',ar?'سنة الإنتاج':'Release year');select.title=ar?'سنة بداية عرض الأنمي، وليس سنة انتهاء عرضه':'First release year, not the year the anime ended';select.options[0].textContent=ar?'سنة الإنتاج: الكل':'Release year: All';const value=route.params.get('year')||'';if(select.value!==(years.includes(value)?value:''))select.value=years.includes(value)?value:'';
}
const observer=new MutationObserver(()=>{if(!widget?.isConnected)void update()});observer.observe(document.documentElement,{childList:true,subtree:true});const timer=setInterval(update,1200);window.addEventListener('hashchange',update);void update();
window.GalaxyAnimeYearFilter={refresh:update,destroy(){dead=true;observer.disconnect();clearInterval(timer);widget?.remove();style.remove();window.removeEventListener('hashchange',update);delete window.GalaxyAnimeYearFilter}};
})();
