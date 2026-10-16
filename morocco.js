
document.addEventListener('DOMContentLoaded',()=>{
  const f=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(n);
  if(window.moroccoBudget){
    const update=()=>{
      const rub=+document.getElementById('rubRate').value,eur=+document.getElementById('eurRate').value,flight=+document.getElementById('flightPrice').value;
      if(!(rub>0&&eur>0&&flight>=0)){document.getElementById('budgetResult').textContent='Введи положительные курсы и неотрицательную цену билета.';return;}
      const s=window.moroccoBudget.solo,t=window.moroccoBudget.two;
      document.getElementById('budgetResult').innerHTML='<div class="table-wrap"><table><thead><tr><th></th><th>Один</th><th>Двое, на всех</th></tr></thead><tbody>'+
        '<tr><td>Марокко, включая резерв</td><td>'+f(s[0]*rub)+'–'+f(s[1]*rub)+' ₽</td><td>'+f(t[0]*rub)+'–'+f(t[1]*rub)+' ₽</td></tr>'+
        '<tr><td><b>С перелётом</b></td><td><b>'+f(s[0]*rub+flight)+'–'+f(s[1]*rub+flight)+' ₽</b></td><td><b>'+f(t[0]*rub+flight*2)+'–'+f(t[1]*rub+flight*2)+' ₽</b></td></tr>'+
        '<tr><td>Валюта на месте, с резервом</td><td>≈ '+f(s[0]/eur)+'–'+f(s[1]/eur)+' EUR</td><td>≈ '+f(t[0]/eur)+'–'+f(t[1]/eur)+' EUR</td></tr></tbody></table></div><p class="small">Для двоих это '+f((t[0]*rub+flight*2)/2)+'–'+f((t[1]*rub+flight*2)/2)+' ₽ на человека с перелётом. При вывозе/ввозе наличных учитывать действующие правила стран.</p>';
    };
    ['rubRate','eurRate','flightPrice'].forEach(id=>document.getElementById(id).addEventListener('input',update));update();
  }
  const dataEl=document.getElementById('mapData');
  if(dataEl){
    const data=JSON.parse(dataEl.textContent),colors={sleep:'#28715a',transport:'#326d9d',food:'#be5b31',sight:'#94712c',money:'#805096'};
    const cityEl=document.getElementById('cityFilter'),catEl=document.getElementById('categoryFilter'),searchEl=document.getElementById('pointSearch');
    const params=new URLSearchParams(location.search);
    if([...cityEl.options].some(o=>o.value===params.get('city')))cityEl.value=params.get('city');
    if([...catEl.options].some(o=>o.value===params.get('category')))catEl.value=params.get('category');
    let map,layer;
    const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    if(window.L){
      map=L.map('routeMap',{scrollWheelZoom:false}).setView([32.4,-6.8],6);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19}).addTo(map);
      layer=L.layerGroup().addTo(map);
    }else document.getElementById('routeMap').innerHTML='<p style="padding:24px">Подложка карты не загрузилась. Все точки доступны в таблице ниже и файле KML; ссылки Google Maps работают отдельно.</p>';
    const update=()=>{
      const q=searchEl.value.trim().toLowerCase(),selected=data.filter(p=>(!cityEl.value||p.city===cityEl.value)&&(!catEl.value||p.category===catEl.value)&&(!q||(p.id+' '+p.name+' '+p.address).toLowerCase().includes(q)));
      document.getElementById('pointCount').textContent=selected.length+' из '+data.length+' меток';
      const ids=new Set(selected.map(p=>p.id));
      document.querySelectorAll('[data-point-id]').forEach(row=>row.hidden=!ids.has(row.dataset.pointId));
      if(!map)return;layer.clearLayers();
      selected.forEach(p=>{
        L.circleMarker([p.lat,p.lon],{radius:7,color:colors[p.category],fillColor:colors[p.category],fillOpacity:.9,weight:p.precision.includes('ориентир')?1:3,dashArray:p.precision.includes('ориентир')?'3,3':null}).addTo(layer)
          .bindTooltip(esc(p.id)+' · '+esc(p.name),{direction:'top'})
          .bindPopup('<b>'+esc(p.id)+' · '+esc(p.name)+'</b><p>'+esc(p.address||'')+'</p><p>'+esc(p.description||'')+'</p><p><small>'+esc(p.precision)+'</small></p><a href="'+esc(p.google_maps)+'" target="_blank" rel="noopener noreferrer">Открыть точку в Google Maps</a>');
      });
      if(selected.length)map.fitBounds(L.latLngBounds(selected.map(p=>[p.lat,p.lon])),{padding:[30,30],maxZoom:15});
    };
    [cityEl,catEl,searchEl].forEach(el=>el.addEventListener(el===searchEl?'input':'change',update));
    document.getElementById('resetMap').addEventListener('click',()=>{cityEl.value='';catEl.value='';searchEl.value='';update();});
    update();
  }
});
