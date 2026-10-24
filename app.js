'use strict';
const $=id=>document.getElementById(id);
const DB_NAME='msp-v2-beta-test-20261025', STORE='visits';
let db,stores=[],byId=new Map(),records=new Map(),filtered=[],page=0,mode='list',map,layer,editingId=null,focusStoreId=null,mapRenderSeq=0;
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{req.result.createObjectStore(STORE,{keyPath:'store_id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function allRecords(){return new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function putRecord(item){return new Promise((resolve,reject)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put(item);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}
function replaceRecords(items){return new Promise((resolve,reject)=>{const t=db.transaction(STORE,'readwrite'),s=t.objectStore(STORE);s.clear();for(const item of items)s.put(item);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function record(id){return records.get(id)||{store_id:id,count:0,memo:''};}
function updateStats(){
  const known=[...records.values()].filter(r=>byId.has(r.store_id));
  const unknown=[...records.values()].filter(r=>!byId.has(r.store_id));
  const visited=known.filter(r=>r.count>0).length;
  const totalVisits=known.reduce((s,r)=>s+r.count,0);
  $('visited').textContent=visited.toLocaleString();
  $('visits').textContent=totalVisits.toLocaleString();
  $('total').textContent=stores.length.toLocaleString();
  $('percent').textContent=(100*visited/stores.length).toFixed(1)+'%';
  const info=$('orphanInfo');
  info.hidden=!unknown.length;
  info.textContent=unknown.length?`現在の店舗一覧にないIDの訪問記録が${unknown.length}件あります。削除・統合せず保存しています（バックアップにも含まれます）。`:'';
  const list=$('orphanIds');
  list.hidden=!unknown.length;
  list.textContent=unknown.length?'未照合ID: '+unknown.slice(0,20).map(r=>r.store_id).join('、')+(unknown.length>20?' ほか':''):'';
}
function normalized(v){return String(v??'').normalize('NFKC').toLocaleLowerCase('ja').replace(/[\s　]+/g,'');}
function match(s){const q=normalized($('search').value.trim());if(q&&!([s.name,s.pref,s.city,s.address,s.store_id,s.official_page_id].join(' ' ).split(' ').map(normalized).join('').includes(q)))return false;if($('pref').value&&s.pref!==$('pref').value)return false;if(!$('closed').checked&&s.status==='closed')return false;const n=record(s.store_id).count;if($('state').value==='visited'&&!n)return false;if($('state').value==='unvisited'&&n)return false;return true;}
function apply(){filtered=stores.filter(match);const sort=$('sort').value;if(sort==='name')filtered.sort((a,b)=>a.name.localeCompare(b.name,'ja'));if(sort==='visited')filtered.sort((a,b)=>record(b.store_id).count-record(a.store_id).count||a.store_id.localeCompare(b.store_id));if($('visitedFirst').checked&&sort!=='visited')filtered.sort((a,b)=>Number(record(b.store_id).count>0)-Number(record(a.store_id).count>0));page=0;$('count').textContent=filtered.length.toLocaleString()+' 店舗';$('searchStatus').textContent=filtered.length===0?'一致する店舗はありません':'';if(mode==='list')renderList();else renderMap();}
function renderList(){const chunk=filtered.slice(0,(++page)*60);$('list').innerHTML=chunk.map(s=>{const r=record(s.store_id),yes=r.count>0;return `<article class="store ${yes?'visited':''}"><div class="stamp" aria-hidden="true">${yes?'✓':'○'}</div><div class="info"><h3>${esc(s.name)}</h3><p>${esc(s.pref+s.city+' '+s.address)}</p><div class="meta"><span class="tag">#${esc(s.store_id)}</span>${s.status==='closed'?'<span class="tag closed">閉店</span>':''}${yes?`<span class="tag">訪問 ${r.count}回</span>`:''}${r.memo?'<span class="tag">メモあり</span>':''}${s.review_label?`<span class="tag">${esc(s.review_label)}</span>`:''}</div></div><div class="store-actions">${Number.isFinite(s.lat)&&Number.isFinite(s.lng)?`<button class="edit map-jump" data-map-id="${esc(s.store_id)}" aria-label="${esc(s.name)}を地図で見る">地図</button>`:`<button class="edit" disabled title="位置座標を確認中">地図未登録</button>`}<button class="edit" data-id="${esc(s.store_id)}">${yes?'編集':'記録'}</button></div></article>`;}).join('')||'<p>該当する店舗がありません。</p>';$('moreWrap').hidden=chunk.length>=filtered.length;}
function edit(id){const s=byId.get(id);if(!s)return;editingId=id;const r=record(id);$('editTitle').textContent=s.name;$('editMeta').textContent=`${s.pref} ${s.city} · 店舗ID ${id}${s.status==='closed'?' · 閉店':''}`;$('editCount').value=r.count;$('editMemo').value=r.memo;$('editDialog').showModal();}
function showMode(next){mode=next;$('list').hidden=next!=='list';$('mapPanel').hidden=next!=='map';$('moreWrap').hidden=next!=='list';$('listTab').classList.toggle('active',next==='list');$('mapTab').classList.toggle('active',next==='map');$('mobileList').classList.toggle('selected',next==='list');$('mobileMap').classList.toggle('selected',next==='map');if(next==='list'){page=0;renderList();}else renderMap();}
async function loadLeaflet(){if(window.L)return;const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';css.integrity='sha256-p4NxAoJBhIIN+hmNHrzxLQ2H4dT6BfKJ8RkYfWfN0i9E=';css.crossOrigin='anonymous';// CDN fallback without integrity mismatch
css.removeAttribute('integrity');document.head.append(css);await new Promise((res,rej)=>{const sc=document.createElement('script');sc.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';sc.onload=res;sc.onerror=rej;document.head.append(sc);});}
function fitResults(){if(!map)return;const pts=filtered.filter(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lng));if(!pts.length)return;if(pts.length===1)map.setView([pts[0].lat,pts[0].lng],15);else map.fitBounds(L.latLngBounds(pts.map(s=>[s.lat,s.lng])),{padding:[28,28],maxZoom:14});}
function drawVisibleMarkers(){if(!map||!layer||mode!=='map')return;const bounds=map.getBounds().pad(.15);layer.clearLayers();let shown=0;for(const s of filtered){if(!Number.isFinite(s.lat)||!Number.isFinite(s.lng)||!bounds.contains([s.lat,s.lng]))continue;const r=record(s.store_id);const marker=L.circleMarker([s.lat,s.lng],{radius:r.count?7:5,color:r.count?'#13764d':'#718b7b',weight:1,fillOpacity:.75});const el=document.createElement('div');const title=document.createElement('strong');title.textContent=s.name;const detail=document.createElement('p');detail.textContent=s.pref+s.city+' '+s.address;const btn=document.createElement('button');btn.textContent='訪問記録を編集';btn.className='edit';btn.addEventListener('click',()=>edit(s.store_id));el.append(title,detail,btn);marker.bindPopup(el);layer.addLayer(marker);if(s.store_id===focusStoreId)marker.openPopup();shown++;} $('mapStatus').textContent=`表示範囲内 ${shown.toLocaleString()}店舗`;
}
async function renderMap(){const seq=++mapRenderSeq;try{await loadLeaflet();if(mode!=='map'||seq!==mapRenderSeq)return;if(!map){map=L.map('map').setView([36.2,138.2],5);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);layer=L.layerGroup().addTo(map);map.on('moveend',drawVisibleMarkers);}setTimeout(()=>{if(mode==='map'){map.invalidateSize();drawVisibleMarkers();}},40);}catch(e){$('mapStatus').textContent='地図を読み込めませんでした';console.error(e);}}
async function jumpToMap(id){const s=byId.get(id);if(!s||!Number.isFinite(s.lat)||!Number.isFinite(s.lng))return;focusStoreId=id;showMode('map');await loadLeaflet();if(!map){await renderMap();}if(map){map.invalidateSize();map.setView([s.lat,s.lng],15);drawVisibleMarkers();}}
function showNearby(){if(!navigator.geolocation){$('mapStatus').textContent='このブラウザでは現在地を利用できません';return;}$('mapStatus').textContent='現在地を取得中…';navigator.geolocation.getCurrentPosition(pos=>{if(map)map.setView([pos.coords.latitude,pos.coords.longitude],13);$('mapStatus').textContent='現在地付近を表示しました';},()=>{$('mapStatus').textContent='現在地を取得できませんでした';},{enableHighAccuracy:false,timeout:10000,maximumAge:60000});}
function exportData(){const payload={format:'msp-visits',version:2,exported_at:new Date().toISOString(),records:[...records.values()].filter(r=>r.count>0||r.memo)};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mystore-passport-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function validateBackup(obj){
  if(!obj||obj.format!=='msp-visits'||obj.version!==2||!Array.isArray(obj.records))
    throw Error('Ver.2.0のバックアップ形式ではありません。旧版データはまだ読み込めません。');
  if(obj.records.length>50000)throw Error('記録が多すぎます。');
  const seen=new Set(),items=[];
  for(const r of obj.records){
    if(!r || typeof r.store_id!=='string' || !/^[0-9A-Za-z_-]{1,40}$/.test(r.store_id) ||
       seen.has(r.store_id) || !Number.isInteger(r.count) || r.count<0 || r.count>99999 ||
       typeof r.memo!=='string' || r.memo.length>2000)
      throw Error('不正な記録や重複する店舗IDがあります。現在のデータは変更されません。');
    seen.add(r.store_id);
    items.push({store_id:r.store_id,count:r.count,memo:r.memo});
  }
  return items;
}
async function importData(file){
  const message=$('importMessage');
  try{
    if(file.size>5_000_000)throw Error('ファイルが大きすぎます（上限5MB）。');
    const items=validateBackup(JSON.parse(await file.text()));
    const unknown=items.filter(r=>!byId.has(r.store_id));
    const question=`現在の記録をすべて置き換えて、${items.length}件を復元しますか？`+
      (unknown.length?`\n未照合ID ${unknown.length}件は、紐づけせず保持します。`:'')+
      `\n先に現在のデータをバックアップすることをおすすめします。`;
    if(!confirm(question))return;
    // Atomic IndexedDB transaction: validation must finish before any deletion.
    await replaceRecords(items);
    records=new Map(items.map(r=>[r.store_id,r]));
    updateStats();apply();
    message.textContent=`${items.length}件を復元しました。`+(unknown.length?`（未照合 ${unknown.length}件を保持）`:'');
  }catch(e){message.textContent='読み込み失敗：'+e.message;}
}
async function init(){try{db=await openDB();const embedded=$('embeddedStores');if(embedded){stores=JSON.parse(embedded.textContent);}else{const response=await fetch('stores.json?v=beta-20261025');if(!response.ok)throw Error('店舗データを読み込めません');stores=await response.json();}byId=new Map(stores.map(s=>[s.store_id,s]));records=new Map((await allRecords()).map(r=>[r.store_id,r]));const prefs=[...new Set(stores.map(s=>s.pref))].sort((a,b)=>a.localeCompare(b,'ja'));for(const p of prefs){const o=document.createElement('option');o.value=p;o.textContent=p;$('pref').append(o);}for(const id of ['search','pref','state','closed','sort','visitedFirst'])$(id).addEventListener(id==='search'?'input':'change',apply);$('list').addEventListener('click',e=>{const m=e.target.closest('[data-map-id]');if(m){jumpToMap(m.dataset.mapId);return;}const b=e.target.closest('[data-id]');if(b)edit(b.dataset.id);});$('more').addEventListener('click',renderList);$('resetFilters').addEventListener('click',()=>{$('search').value='';$('pref').value='';$('state').value='all';$('closed').checked=false;$('sort').value='id';$('visitedFirst').checked=false;apply();});$('nearby').addEventListener('click',showNearby);$('fitMap').addEventListener('click',fitResults);$('mobileList').addEventListener('click',()=>showMode('list'));$('mobileMap').addEventListener('click',()=>showMode('map'));$('mobileData').addEventListener('click',()=>$('dataDialog').showModal());$('listTab').addEventListener('click',()=>showMode('list'));$('mapTab').addEventListener('click',()=>showMode('map'));$('editForm').addEventListener('submit',async e=>{if(e.submitter?.value!=='save')return;e.preventDefault();const count=Number($('editCount').value),memo=$('editMemo').value;if(!Number.isInteger(count)||count<0||count>99999)return;const r={store_id:editingId,count,memo};await putRecord(r);records.set(editingId,r);$('editDialog').close();updateStats();apply();});$('backup').addEventListener('click',()=>$('dataDialog').showModal());$('closeData').addEventListener('click',()=>$('dataDialog').close());$('export').addEventListener('click',exportData);$('import').addEventListener('change',e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value='';});updateStats();apply();}catch(e){$('list').textContent='起動できませんでした：'+e.message+'。ローカルファイルを直接開かず、Webサーバーから開いてください。';console.error(e);}}
init();
