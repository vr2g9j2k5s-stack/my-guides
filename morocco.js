'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const panels = [...document.querySelectorAll('[data-panel]')];
  const picks = [...document.querySelectorAll('[data-day]')];
  const rows = [...document.querySelectorAll('[data-select-day]')];
  const daySelect = document.getElementById('daySelect');
  const viewButtons = [...document.querySelectorAll('[data-view]')];
  let current = 1;
  const selectDay = (n, {scroll = false, hash = true} = {}) => {
    if (!Number.isInteger(n) || n < 1 || n > panels.length) return;
    current = n;
    panels.forEach(p => p.classList.toggle('active', +p.dataset.panel === n));
    rows.forEach(r => r.classList.toggle('selected', +r.dataset.selectDay === n));
    picks.forEach(b => {
      if (+b.dataset.day === n) b.setAttribute('aria-current', 'date');
      else b.removeAttribute('aria-current');
    });
    if (daySelect) daySelect.value = String(n);
    if (hash && location.hash !== '#day' + n) history.replaceState(null, '', '#day' + n);
    if (scroll) panels[n - 1].scrollIntoView({block: 'start', behavior: 'auto'});
  };
  if (panels.length) {
    rows.forEach(r => r.addEventListener('click', () => selectDay(+r.dataset.selectDay, {scroll: true})));
    picks.forEach(b => b.addEventListener('keydown', event => {
      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
      event.preventDefault();
      const next = Math.max(1, Math.min(panels.length, +b.dataset.day + (event.key === 'ArrowDown' ? 1 : -1)));
      selectDay(next);
      picks[next - 1].focus();
    }));
    if (daySelect) daySelect.addEventListener('change', () => selectDay(+daySelect.value));
    document.querySelectorAll('[data-move-day]').forEach(b => b.addEventListener('click', () => {
      const panel = b.closest('[data-panel]');
      const base = panel ? +panel.dataset.panel : current;
      selectDay(base + +b.dataset.moveDay, {scroll: true});
    }));
    viewButtons.forEach(b => b.addEventListener('click', () => {
      const all = b.dataset.view === 'all';
      root.classList.toggle('show-all', all);
      viewButtons.forEach(v => v.setAttribute('aria-pressed', String(v === b)));
      if (!all) selectDay(current, {scroll: true});
    }));
    const fromHash = () => {
      const match = location.hash.match(/^#day(\d+)$/);
      if (match) selectDay(+match[1], {hash: false});
    };
    selectDay(1, {hash: false});
    fromHash();
    window.addEventListener('hashchange', fromHash);
    root.classList.add('js');
    if (/^#day\d+$/.test(location.hash)) panels[current - 1].scrollIntoView({block: 'start', behavior: 'auto'});
  }

  const format = n => new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 0}).format(n);
  if (window.moroccoBudget) {
    const update = () => {
      const rub = +document.getElementById('rubRate').value;
      const eur = +document.getElementById('eurRate').value;
      const flight = +document.getElementById('flightPrice').value;
      const out = document.getElementById('budgetResult');
      const [low, high] = window.moroccoBudget;
      if (![rub, eur, flight].every(Number.isFinite) || rub <= 0 || eur <= 0 || flight < 0) {
        out.textContent = 'Введите положительные курсы и цену перелёта от нуля.';
        return;
      }
      out.innerHTML = 'На месте: <b>' + format(low * rub) + '–' + format(high * rub) + ' ₽</b><br>' +
        'С перелётом: <b>' + format(low * rub + flight) + '–' + format(high * rub + flight) + ' ₽</b><br>' +
        'Валюта на местные расходы: ≈ ' + format(low / eur) + '–' + format(high / eur) + ' EUR';
    };
    ['rubRate', 'eurRate', 'flightPrice'].forEach(id => document.getElementById(id).addEventListener('input', update));
    update();
  }
  document.querySelectorAll('.copy-button').forEach(b => b.addEventListener('click', async () => {
    const box = b.closest('.copy-box');
    const status = box.querySelector('.copy-status');
    const pre = box.querySelector('pre');
    try {
      await navigator.clipboard.writeText(pre.textContent);
      status.textContent = 'Скопировано';
    } catch {
      status.textContent = 'Выделите текст и скопируйте вручную.';
      const range = document.createRange();
      range.selectNodeContents(pre);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
    }
  }));

  const dataElement = document.getElementById('mapData');
  if (!dataElement) return;
  const {points, stops} = JSON.parse(dataElement.textContent);
  const city = document.getElementById('cityFilter');
  const category = document.getElementById('categoryFilter');
  const search = document.getElementById('pointSearch');
  const count = document.getElementById('pointCount');
  const params = new URLSearchParams(location.search);
  if ([...city.options].some(o => o.value === params.get('city'))) city.value = params.get('city');
  if ([...category.options].some(o => o.value === params.get('category'))) category.value = params.get('category');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  let map, markers, selected = [];
  if (window.L) {
    map = L.map('routeMap', {scrollWheelZoom: false});
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19
    }).addTo(map);
    markers = L.layerGroup().addTo(map);
  } else {
    const area = document.getElementById('routeMap');
    area.innerHTML = '<p style="padding:20px">Карта не загрузилась. Все точки и ссылки Google Maps доступны в списке ниже.</p>';
    area.style.height = 'auto';
    const firstPoint = document.querySelector('[data-point-id]');
    if (firstPoint) firstPoint.closest('details').open = true;
  }
  const draw = () => {
    if (!map) return;
    markers.clearLayers();
    if (!city.value && !category.value && !search.value.trim() && map.getZoom() <= 7) {
      L.polyline(stops.map(p => [p.lat, p.lon]), {color:'#9b7650',weight:2,dashArray:'6,7',opacity:.7}).addTo(markers);
      stops.forEach((p,i) => {
        const name = i === 0 ? 'CMN · прилёт' : p.name;
        L.marker([p.lat,p.lon], {icon:L.divIcon({className:'',html:'<span class="stop-badge">' + (i+1) + '</span>',iconSize:[28,28],iconAnchor:[14,14]})})
          .addTo(markers).bindTooltip(esc(name)).bindPopup('<b>' + esc(name) + '</b><p><a href="morocco-' + p.city + '.html">Осмотр, ночлег и еда →</a></p>');
      });
      return;
    }
    const colors = {sleep:'#2e725c',transport:'#326c9d',sight:'#9a6e25',food:'#b95731',money:'#815a9b'};
    selected.forEach(p => L.circleMarker([p.lat,p.lon], {radius:6,color:colors[p.category],fillColor:colors[p.category],fillOpacity:.85,weight:2,dashArray:p.precision.includes('ориентир')?'3,3':null})
      .addTo(markers).bindTooltip(esc(p.name)).bindPopup('<b>' + esc(p.name) + '</b><p>' + esc(p.address || p.description) + '</p>' +
        (p.precision.includes('ориентир') ? '<p><small>Ориентир — уточнить вход или посадку на месте.</small></p>' : '') +
        '<a href="' + esc(p.google_maps) + '" target="_blank" rel="noopener noreferrer">Google Maps ↗</a>'));
  };
  const update = () => {
    const q = search.value.trim().toLowerCase();
    selected = points.filter(p => (!city.value || p.city === city.value) && (!category.value || p.category === category.value) && (!q || (p.name + ' ' + p.address + ' ' + p.id).toLowerCase().includes(q)));
    count.textContent = selected.length + ' из ' + points.length + ' меток';
    const ids = new Set(selected.map(p => p.id));
    document.querySelectorAll('[data-point-id]').forEach(r => r.hidden = !ids.has(r.dataset.pointId));
    if (map && selected.length) map.fitBounds(L.latLngBounds(selected.map(p => [p.lat,p.lon])), {padding:[30,30],maxZoom:15});
    draw();
  };
  if (map) map.on('zoomend', draw);
  [city,category].forEach(e => e.addEventListener('change', update));
  search.addEventListener('input', update);
  document.getElementById('resetMap').addEventListener('click', () => {city.value = ''; category.value = ''; search.value = ''; update();});
  update();
});
