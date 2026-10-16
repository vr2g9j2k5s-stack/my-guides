
document.addEventListener('DOMContentLoaded',()=>{
 const panels=[...document.querySelectorAll('[data-panel]')],picks=[...document.querySelectorAll('[data-day]')],daySelect=document.getElementById('daySelect');
 let current=1;
 const selectDay=(n,{scroll=false,hash=true}={})=>{
  if(!Number.isInteger(n)||n<1||n>panels.length)return;
  current=n;panels.forEach(p=>p.classList.toggle('active',+p.dataset.panel===n));
  picks.forEach(b=>{if(+b.dataset.day===n)b.setAttribute('aria-current','date');else b.removeAttribute('aria-current');});
  document.querySelectorAll('[data-select-day]').forEach(r=>r.classList.toggle('selected',+r.dataset.selectDay===n));
  if(daySelect)daySelect.value=String(n);
  if(hash&&location.hash!=='#day'+n)history.replaceState(null,'','#day'+n);
  if(scroll)document.querySelector('[data-panel="'+n+'"]').scrollIntoView({block:'start',behavior:'auto'});
 };
 if(panels.length){
  document.querySelectorAll('[data-select-day]').forEach(r=>r.addEventListener('click',()=>selectDay(+r.dataset.selectDay,{scroll:true})));
  if(daySelect)daySelect.addEventListener('change',()=>selectDay(+daySelect.value,{scroll:false}));
  document.querySelectorAll('[data-move-day]').forEach(b=>b.addEventListener('click',()=>selectDay(current+(+b.dataset.moveDay),{scroll:true})));
  const fromHash=()=>selectDay(+(location.hash.match(/^#day(\d+)$/)||[])[1]||1,{hash:false});
  fromHash();window.addEventListener('hashchange',fromHash);document.documentElement.classList.add('js');
 }
 const format=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(n);
 if(window.moroccoBudget){
  const update=()=>{
   const rub=+document.getElementById('rubRate').value,eur=+document.getElementById('eurRate').value,flight=+document.getElementById('flightPrice').value,out=document.getElementById('budgetResult'),[lo,hi]=window.moroccoBudget;
   if(!(rub>0&&eur>0&&flight>=0)){out.textContent='Введите положительные курсы и цену перелёта от нуля.';return;}
   out.innerHTML='На месте: <b>'+format(lo*rub)+'–'+format(hi*rub)+' ₽</b><br>Включая перелёт: <b>'+format(lo*rub+flight)+'–'+format(hi*rub+flight)+' ₽</b><br>Валюта на местные расходы: ≈ '+format(lo/eur)+'–'+format(hi/eur)+' EUR';
  };['rubRate','eurRate','flightPrice'].forEach(id=>document.getElementById(id).addEventListener('input',update));update();
 }
 document.querySelectorAll('.copy-button').forEach(b=>b.addEventListener('click',async()=>{
  const box=b.closest('.copy-box'),status=box.querySelector('.copy-status'),pre=box.querySelector('pre');
  try{await navigator.clipboard.writeText(pre.textContent);status.textContent='Скопировано';}
  catch{status.textContent='Выделите текст и скопируйте вручную.';const range=document.createRange();range.selectNodeContents(pre);getSelection().removeAllRanges();getSelection().addRange(range);}
 }));
 const el=document.getElementById('mapData');if(!el)return;
 const {points,stops}=JSON.parse(el.textContent),city=document.getElementById('cityFilter'),category=document.getElementById('categoryFilter'),search=document.getElementById('pointSearch'),count=document.getElementById('pointCount'),params=new URLSearchParams(location.search);
 if([...city.options].some(o=>o.value===params.get('city')))city.value=params.get('city');
 if([...category.options].some(o=>o.value===params.get('category')))category.value=params.get('category');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let map,markers,selected=[];
 if(window.L){map=L.map('routeMap',{scrollWheelZoom:false});L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19}).addTo(map);markers=L.layerGroup().addTo(map);}
 else document.getElementById('routeMap').innerHTML='<p style="padding:20px">Карта не загрузилась. Все места и ссылки Google Maps доступны в списке ниже.</p>';
 const draw=()=>{
  if(!map)return;markers.clearLayers();
  if(!city.value&&!category.value&&!search.value.trim()&&map.getZoom()<=7){
   L.polyline(stops.map(p=>[p.lat,p.lon]),{color:'#92714e',weight:2,dashArray:'6,7',opacity:.7}).addTo(markers);
   stops.forEach((p,i)=>L.marker([p.lat,p.lon],{icon:L.divIcon({className:'',html:'<span class="stop-badge">'+(i+1)+'</span>',iconSize:[26,26],iconAnchor:[13,13]})}).addTo(markers).bindTooltip(esc(p.name)).bindPopup('<b>'+esc(p.name)+'</b><p><a href="morocco-'+p.city+'.html">Локация: осмотр, ночлег, еда</a></p>'));
   return;
  }
  const colors={sleep:'#2e725c',transport:'#326c9d',sight:'#a3782b',food:'#b95731',money:'#815a9b'};
  selected.forEach(p=>L.circleMarker([p.lat,p.lon],{radius:6,color:colors[p.category],fillColor:colors[p.category],fillOpacity:.85,weight:2,dashArray:p.precision.includes('ориентир')?'3,3':null}).addTo(markers).bindTooltip(esc(p.name)).bindPopup('<b>'+esc(p.name)+'</b><p>'+esc(p.address||p.description)+'</p>'+(p.precision.includes('ориентир')?'<p><small>Ориентир — уточнить на месте.</small></p>':'')+'<a href="'+esc(p.google_maps)+'" target="_blank" rel="noopener noreferrer">Google Maps ↗</a>'));
 };
 const update=()=>{
  const q=search.value.trim().toLowerCase();selected=points.filter(p=>(!city.value||p.city===city.value)&&(!category.value||p.category===category.value)&&(!q||(p.name+' '+p.address+' '+p.id).toLowerCase().includes(q)));
  count.textContent=selected.length+' из '+points.length+' меток';const ids=new Set(selected.map(p=>p.id));document.querySelectorAll('[data-point-id]').forEach(r=>r.hidden=!ids.has(r.dataset.pointId));
  if(map&&selected.length)map.fitBounds(L.latLngBounds(selected.map(p=>[p.lat,p.lon])),{padding:[30,30],maxZoom:15});draw();
 };
 if(map)map.on('zoomend',draw);
 [city,category].forEach(e=>e.addEventListener('change',update));search.addEventListener('input',update);document.getElementById('resetMap').addEventListener('click',()=>{city.value='';category.value='';search.value='';update();});update();
});
