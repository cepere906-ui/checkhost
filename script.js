const form = document.querySelector('#lookup-form');
const queryInput = document.querySelector('#query');
const resultContainer = document.querySelector('#result');
const statusEl = document.querySelector('#status');
const template = document.querySelector('#result-template');

const primaryApi = (target = '') => `https://ipapi.co/${encodeURIComponent(target)}/json/`;
const fallbackApi = (target = '') => `https://ipwho.is/${encodeURIComponent(target || '')}`;

function setStatus(message, type = 'muted') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function formatCoordinates(lat, lon) {
  if (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) return '';
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

function renderResult(data) {
  resultContainer.innerHTML = '';
  const node = template.content.cloneNode(true);

  const mapping = {
    ip: data.ip || data.query || '-',
    version: data.version || data.type || '-',
    hostname: data.hostname || data.reverse || '-',
    org: data.org || data.connection?.org || data.connection?.isp || '-',
    asn: data.asn || data.connection?.asn || '-',
    country: data.country_name || data.country || '-',
    region: data.region || data.region_name || '-',
    city: data.city || '-',
    timezone: data.timezone || data.timezone_gmt || '-',
    latitude: data.latitude ?? data.lat ?? '-',
    longitude: data.longitude ?? data.lon ?? '-',
  };

  const latNum = Number(mapping.latitude);
  const lonNum = Number(mapping.longitude);
  mapping.coordinates = Number.isFinite(latNum) && Number.isFinite(lonNum)
    ? formatCoordinates(latNum, lonNum)
    : '';

  node.querySelectorAll('[data-field]').forEach((el) => {
    const field = el.dataset.field;
    el.textContent = mapping[field] ?? '-';
  });

  resultContainer.appendChild(node);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

async function lookup(target = '') {
  const query = target.trim();
  const displayTarget = query || 'your public IP';

  setStatus(`Looking up ${displayTarget} via ipapi.co ...`);
  try {
    const data = await fetchJson(primaryApi(query));
    if (data.error) throw new Error(data.reason || 'Unknown API error');
    renderResult(data);
    setStatus(`Loaded data for ${data.ip || displayTarget} from ipapi.co.`);
    return;
  } catch (err) {
    console.warn('ipapi.co failed, trying ipwho.is', err);
  }

  setStatus(`Retrying ${displayTarget} via ipwho.is ...`, 'muted');
  try {
    const data = await fetchJson(fallbackApi(query));
    if (data.success === false) throw new Error(data.message || 'Unknown API error');
    renderResult(data);
    setStatus(`Loaded data for ${data.ip || displayTarget} from ipwho.is.`);
  } catch (err) {
    console.error(err);
    setStatus(`Lookup failed: ${err.message}`, 'error');
    resultContainer.innerHTML = '';
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = queryInput.value.trim();
  if (!query) {
    setStatus('Enter an IP address or hostname to start.', 'error');
    resultContainer.innerHTML = '';
    return;
  }
  lookup(query);
});

lookup('').catch((err) => {
  console.error(err);
  setStatus('Auto-detection failed. Enter an IP to start.', 'error');
});
