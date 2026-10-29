/* Stremio Galaxy community modification, GPL-3.0. Independent cache settings. */
((config)=>{
 'use strict';
 if(window.top!==window||window.GalaxyCacheSettings||!config.enabled||!config.origins.includes(location.origin))return;
 const words={
 en:['Cache','Video cache location','Change folder','The new location is used after restarting the app. Existing cached files stay in their current folder.','Restart the app to use the new location.','Could not save this location. Choose a writable folder.'],
 ar:['كاش','مكان حفظ كاش الفيديو','تغيير المجلد','يُستخدم الموقع الجديد بعد إعادة تشغيل البرنامج. ملفات الكاش الحالية تبقى في مجلدها.','أعد تشغيل البرنامج لاستخدام الموقع الجديد.','تعذر حفظ الموقع. اختر مجلدًا قابلًا للكتابة.'],
 fr:['Cache','Emplacement du cache vidéo','Changer de dossier','Le nouvel emplacement sera utilisé après le redémarrage. Les fichiers existants restent dans leur dossier.','Redémarrez l’application pour utiliser le nouvel emplacement.','Impossible d’enregistrer cet emplacement. Choisissez un dossier accessible en écriture.'],
 de:['Cache','Speicherort des Video-Caches','Ordner ändern','Der neue Speicherort wird nach dem Neustart verwendet. Vorhandene Dateien bleiben im bisherigen Ordner.','Starten Sie die App neu, um den neuen Speicherort zu verwenden.','Speicherort konnte nicht gespeichert werden. Wählen Sie einen beschreibbaren Ordner.'],
 es:['Caché','Ubicación de la caché de vídeo','Cambiar carpeta','La nueva ubicación se usará al reiniciar. Los archivos existentes permanecen en su carpeta.','Reinicia la aplicación para usar la nueva ubicación.','No se pudo guardar. Elige una carpeta con permiso de escritura.'],
 it:['Cache','Posizione della cache video','Cambia cartella','La nuova posizione sarà usata dopo il riavvio. I file esistenti rimangono nella loro cartella.','Riavvia l’app per usare la nuova posizione.','Impossibile salvare. Scegli una cartella scrivibile.'],
 pt:['Cache','Local do cache de vídeo','Alterar pasta','O novo local será usado após reiniciar. Os arquivos existentes permanecem na pasta atual.','Reinicie o aplicativo para usar o novo local.','Não foi possível salvar. Escolha uma pasta com permissão de escrita.'],
 tr:['Önbellek','Video önbelleği konumu','Klasörü değiştir','Yeni konum yeniden başlatıldıktan sonra kullanılır. Mevcut dosyalar kendi klasöründe kalır.','Yeni konumu kullanmak için uygulamayı yeniden başlatın.','Kaydedilemedi. Yazılabilir bir klasör seçin.'],
 ru:['Кэш','Расположение видеокэша','Изменить папку','Новое расположение используется после перезапуска. Старые файлы остаются в своей папке.','Перезапустите приложение для применения.','Не удалось сохранить. Выберите папку с правом записи.'],
 uk:['Кеш','Розташування відеокешу','Змінити папку','Нове розташування діє після перезапуску. Наявні файли залишаються у своїй папці.','Перезапустіть застосунок для застосування.','Не вдалося зберегти. Виберіть папку з правом запису.'],
 pl:['Pamięć podręczna','Lokalizacja pamięci wideo','Zmień folder','Nowa lokalizacja działa po ponownym uruchomieniu. Istniejące pliki pozostają w swoim folderze.','Uruchom aplikację ponownie, aby zastosować zmianę.','Nie można zapisać. Wybierz folder z prawem zapisu.'],
 nl:['Cache','Locatie van videocache','Map wijzigen','De nieuwe locatie wordt na herstart gebruikt. Bestaande bestanden blijven in hun map.','Herstart de app om de nieuwe locatie te gebruiken.','Opslaan mislukt. Kies een beschrijfbare map.'],
 sv:['Cache','Plats för videocache','Byt mapp','Den nya platsen används efter omstart. Befintliga filer stannar i sin mapp.','Starta om appen för att använda den nya platsen.','Kunde inte spara. Välj en skrivbar mapp.'],
 da:['Cache','Placering af videocache','Skift mappe','Den nye placering bruges efter genstart. Eksisterende filer bliver i deres mappe.','Genstart appen for at bruge den nye placering.','Kunne ikke gemme. Vælg en skrivbar mappe.'],
 no:['Mellomlager','Plassering av videomellomlager','Bytt mappe','Den nye plasseringen brukes etter omstart. Eksisterende filer blir i mappen sin.','Start appen på nytt for å bruke den nye plasseringen.','Kunne ikke lagre. Velg en skrivbar mappe.'],
 fi:['Välimuisti','Videovälimuistin sijainti','Vaihda kansio','Uusi sijainti otetaan käyttöön uudelleenkäynnistyksen jälkeen. Nykyiset tiedostot jäävät kansioonsa.','Käynnistä sovellus uudelleen ottaaksesi sijainnin käyttöön.','Tallennus epäonnistui. Valitse kirjoitettava kansio.'],
 el:['Προσωρινή μνήμη','Θέση προσωρινής μνήμης βίντεο','Αλλαγή φακέλου','Η νέα θέση ισχύει μετά την επανεκκίνηση. Τα υπάρχοντα αρχεία παραμένουν στον φάκελό τους.','Επανεκκινήστε την εφαρμογή για εφαρμογή της αλλαγής.','Αποτυχία αποθήκευσης. Επιλέξτε εγγράψιμο φάκελο.'],
 he:['מטמון','מיקום מטמון הווידאו','שינוי תיקייה','המיקום החדש ישמש לאחר הפעלה מחדש. הקבצים הקיימים יישארו בתיקייה שלהם.','יש להפעיל מחדש את היישום כדי להחיל את השינוי.','לא ניתן לשמור. יש לבחור תיקייה הניתנת לכתיבה.'],
 fa:['حافظهٔ پنهان','محل حافظهٔ پنهان ویدیو','تغییر پوشه','محل جدید پس از راه‌اندازی دوباره استفاده می‌شود. فایل‌های قبلی در پوشهٔ خود می‌مانند.','برای اعمال تغییر برنامه را دوباره راه‌اندازی کنید.','ذخیره نشد. پوشه‌ای با مجوز نوشتن انتخاب کنید.'],
 hi:['कैश','वीडियो कैश का स्थान','फ़ोल्डर बदलें','नया स्थान ऐप दोबारा शुरू करने के बाद इस्तेमाल होगा। पुरानी फ़ाइलें अपने फ़ोल्डर में रहेंगी।','नया स्थान इस्तेमाल करने के लिए ऐप दोबारा शुरू करें।','सहेज नहीं सके। लिखने योग्य फ़ोल्डर चुनें।'],
 ja:['キャッシュ','動画キャッシュの保存先','フォルダーを変更','再起動後に新しい保存先が使われます。既存のファイルは元のフォルダーに残ります。','新しい保存先を使うにはアプリを再起動してください。','保存できません。書き込み可能なフォルダーを選んでください。'],
 ko:['캐시','동영상 캐시 위치','폴더 변경','앱을 다시 시작하면 새 위치가 사용됩니다. 기존 파일은 원래 폴더에 남습니다.','새 위치를 사용하려면 앱을 다시 시작하세요.','저장할 수 없습니다. 쓰기 가능한 폴더를 선택하세요.'],
 zh:['缓存','视频缓存位置','更改文件夹','重启应用后使用新位置。现有文件保留在原文件夹中。','请重启应用以使用新位置。','无法保存。请选择可写入的文件夹。'],
 id:['Cache','Lokasi cache video','Ubah folder','Lokasi baru digunakan setelah aplikasi dimulai ulang. File lama tetap di foldernya.','Mulai ulang aplikasi untuk memakai lokasi baru.','Tidak dapat menyimpan. Pilih folder yang dapat ditulis.'],
 vi:['Bộ nhớ đệm','Vị trí bộ nhớ đệm video','Đổi thư mục','Vị trí mới được dùng sau khi khởi động lại. Tệp cũ vẫn ở thư mục hiện tại.','Khởi động lại ứng dụng để dùng vị trí mới.','Không thể lưu. Chọn thư mục có quyền ghi.'],
 th:['แคช','ตำแหน่งแคชวิดีโอ','เปลี่ยนโฟลเดอร์','ตำแหน่งใหม่จะใช้หลังเริ่มแอปใหม่ ไฟล์เดิมยังอยู่ในโฟลเดอร์เดิม','เริ่มแอปใหม่เพื่อใช้ตำแหน่งใหม่','บันทึกไม่ได้ โปรดเลือกโฟลเดอร์ที่เขียนได้'],
 ro:['Cache','Locația cache-ului video','Schimbă dosarul','Noua locație se folosește după repornire. Fișierele existente rămân în dosarul lor.','Repornește aplicația pentru a folosi noua locație.','Nu s-a putut salva. Alege un dosar cu drept de scriere.'],
 cs:['Mezipaměť','Umístění mezipaměti videa','Změnit složku','Nové umístění se použije po restartu. Stávající soubory zůstanou ve své složce.','Restartujte aplikaci pro použití nového umístění.','Nelze uložit. Vyberte složku s právem zápisu.'],
 hu:['Gyorsítótár','Videó gyorsítótár helye','Mappa módosítása','Az új hely újraindítás után lép életbe. A meglévő fájlok a mappájukban maradnak.','Az új hely használatához indítsa újra az alkalmazást.','Nem menthető. Válasszon írható mappát.'],
 bg:['Кеш','Местоположение на видео кеша','Промяна на папката','Новото място се използва след рестартиране. Съществуващите файлове остават в папката си.','Рестартирайте приложението, за да приложите промяната.','Неуспешно записване. Изберете папка с право за запис.']
 };
 const aliases={eng:'en',ara:'ar',fra:'fr',fre:'fr',deu:'de',ger:'de',spa:'es',ita:'it',por:'pt',tur:'tr',rus:'ru',ukr:'uk',pol:'pl',nld:'nl',dut:'nl',swe:'sv',dan:'da',nor:'no',nob:'no',fin:'fi',ell:'el',gre:'el',heb:'he',fas:'fa',per:'fa',hin:'hi',jpn:'ja',kor:'ko',zho:'zh',chi:'zh',ind:'id',vie:'vi',tha:'th',ron:'ro',rum:'ro',ces:'cs',cze:'cs',hun:'hu',bul:'bg'};
 let lang='en',state={},bridge,serial=880000,busy=false,localePending=false,observer;
 const resolve=value=>{const base=String(value||'en').toLowerCase().split(/[-_]/)[0];const key=aliases[base]||base;return words[key]?key:'en'};
 const text=(node,value)=>{if(node.textContent!==value)node.textContent=value};
 const send=event=>bridge?.postMessage(JSON.stringify({type:6,object:'transport',method:'handleInboundJSON',id:++serial,args:[event,[words[lang][2]]]}));
 function receive(event){let message=event.data;try{if(typeof message==='string')message=JSON.parse(message)}catch{return}if(message?.object==='transport'&&message.args?.[0]==='galaxy-cache-state'&&typeof message.args[1]==='object'&&message.args[1]){state=message.args[1];busy=false;update()}}
 function connect(){const candidate=window.chrome?.webview;if(candidate&&candidate!==bridge){bridge?.removeEventListener('message',receive);bridge=candidate;bridge.addEventListener('message',receive)}return !!bridge}
 function update(){
  if(!document.documentElement)return;
  let style=document.getElementById('galaxy-cache-settings-style');
  if(!style){style=document.createElement('style');style.id='galaxy-cache-settings-style';style.textContent=config.css;document.documentElement.appendChild(style)}
  if(!/^#\/settings(?:[/?]|$)/.test(location.hash))return;
  for(const root of document.querySelectorAll('[class*="settings-container-"]')){
   const sections=root.querySelector('[class*="sections-container-"]');
   const original=root.querySelector('[data-section]');const menu=original?.parentElement;
   if(!sections||!menu)continue;
   let panel=sections.querySelector('[data-galaxy-cache-panel]');
   if(!panel){
    panel=document.createElement('section');panel.dataset.galaxyCachePanel='';panel.className='galaxy-cache-panel';
    panel.innerHTML='<h2></h2><label></label><code class="galaxy-cache-path"></code><button type="button" class="galaxy-cache-change"></button><p class="galaxy-cache-help"></p><p class="galaxy-cache-status" role="status" aria-live="polite"></p>';
    panel.querySelector('button').addEventListener('click',()=>{if(connect()&&!busy){busy=true;update();send('galaxy-cache-choose')}});
    sections.prepend(panel);
    if(connect())send('galaxy-cache-read');
   }
   let item=menu.querySelector('[data-galaxy-cache-menu]');
   if(!item){item=document.createElement('button');item.type='button';item.dataset.galaxyCacheMenu='';item.className='galaxy-cache-menu';item.addEventListener('click',()=>panel.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));menu.insertBefore(item,menu.firstChild)}
   const w=words[lang];panel.dir=['ar','he','fa'].includes(lang)?'rtl':'ltr';panel.lang=lang;item.dir=panel.dir;
   text(item,w[0]);text(panel.querySelector('h2'),w[0]);text(panel.querySelector('label'),w[1]);
   text(panel.querySelector('code'),typeof state.path==='string'?state.path:'…');
   const button=panel.querySelector('button');text(button,w[2]);button.disabled=busy||!state.path;
   text(panel.querySelector('.galaxy-cache-help'),w[3]);
   const status=panel.querySelector('.galaxy-cache-status');text(status,state.error?w[5]:state.pending?w[4]:'');status.dataset.error=state.error?'1':'0';
  }
 }
 // Legacy community UI does not expose window.core. Its rendered General/
 // Settings components receive the same profile.settings.interfaceLanguage prop.
 // Read only that language field; never serialize the profile or authentication data.
 function renderedLanguage(){
  for(const node of document.querySelectorAll('[class*="settings-container-"] [class*="sections-container-"] > :not([data-galaxy-cache-panel])')){
   const key=Object.keys(node).find(k=>k.startsWith('__reactFiber$')||k.startsWith('__reactInternalInstance$'));
   let fiber=key&&node[key];
   for(let depth=0;fiber&&depth<60;depth++,fiber=fiber.return){
    const language=fiber.memoizedProps?.profile?.settings?.interfaceLanguage;
    if(typeof language==='string')return language;
   }
  }
 }
 // The deployed beta UI keeps its core transport in React's environment
 // context instead of window.core (verified in its served main.js bundle).
 function renderedTransport(){
  for(const node of document.querySelectorAll('[class*="settings-container-"] [class*="sections-container-"] > :not([data-galaxy-cache-panel])')){
   const key=Object.keys(node).find(k=>k.startsWith('__reactFiber$')||k.startsWith('__reactInternalInstance$'));
   let fiber=key&&node[key];
   for(let depth=0;fiber&&depth<60;depth++,fiber=fiber.return){
    let dependency=fiber.dependencies?.firstContext;
    for(let n=0;dependency&&n<20;n++,dependency=dependency.next){
     const transport=dependency.memoizedValue?.core?.transport;
     if(typeof transport?.getState==='function')return transport;
    }
   }
  }
 }
 async function refreshLocale(){
  if(localePending)return;localePending=true;
  const apply=value=>{if(typeof value!=='string'||!value)return;const next=resolve(value);if(lang!==next){lang=next;update()}};
  apply(renderedLanguage()||document.documentElement.lang);
  try{const transport=typeof window.core?.getState==='function'?window.core:renderedTransport();if(transport){const ctx=await transport.getState('ctx');apply(ctx?.profile?.settings?.interfaceLanguage)}}catch{}
  finally{localePending=false}
 }

 function navigate(){update();if(/^#\/settings(?:[/?]|$)/.test(location.hash)&&connect())send('galaxy-cache-read');void refreshLocale()}
 function init(){update();if(!observer){observer=new MutationObserver(update);observer.observe(document.documentElement,{childList:true,subtree:true})}connect();void refreshLocale()}
 const timer=setInterval(()=>{if(/^#\/settings(?:[/?]|$)/.test(location.hash)){connect();void refreshLocale()}},2000);
 window.addEventListener('hashchange',navigate);document.addEventListener('DOMContentLoaded',init,{once:true});if(document.documentElement)init();
 window.GalaxyCacheSettings={resolve,refreshLocale,destroy(){observer?.disconnect();clearInterval(timer);window.removeEventListener('hashchange',navigate);document.removeEventListener('DOMContentLoaded',init);bridge?.removeEventListener('message',receive);document.querySelectorAll('[data-galaxy-cache-panel],[data-galaxy-cache-menu],#galaxy-cache-settings-style').forEach(e=>e.remove());delete window.GalaxyCacheSettings}};
})(__GALAXY_CACHE_CONFIG__);
