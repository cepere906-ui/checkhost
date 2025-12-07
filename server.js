const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');
const dns = require('dns').promises;

const REQUEST_TIMEOUT = 5000;

const REQUEST_TIMEOUT = 5000;

const publicDir = path.join(__dirname, 'public');

function getIp(req) {
  const candidate = req.headers['cf-connecting-ip']
    || req.headers['x-real-ip']
    || req.headers['x-forwarded-for']
    || req.socket.remoteAddress
    || '';
  return Array.isArray(candidate)
    ? candidate[0]
    : candidate.split(',')[0].trim();
}

function serveStatic(res, filePath, contentType = 'text/html') {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function abortableFetch(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  return fetch(url, { signal: controller.signal })
    .finally(() => clearTimeout(timeout));
}

async function fetchJson(url) {
  try {
    const res = await abortableFetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (error) {
    return { __error: error.message || 'Request failed' };
  }
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

async function providerIpWho(query) {
  const data = await fetchJson(`https://ipwho.is/${encodeURIComponent(query)}`);
  if (data.__error) return { ok: false, error: data.__error };
  if (data.success === false) return { ok: false, error: data.message || 'Lookup failed' };

  return {
    ok: true,
    ip: data.ip,
    hostname: data.connection?.domain || data.hostname || '',
    asn: data.connection?.asn || data.asn || '',
    isp: data.isp || data.connection?.org || '',
    org: data.connection?.org || data.org || '',
    city: data.city || '',
    region: data.region || data.region_name || '',
    country: data.country || '',
    countryCode: data.country_code || '',
    latitude: data.latitude,
    longitude: data.longitude,
  };
}

async function providerIpApiCo(query) {
  const data = await fetchJson(`https://ipapi.co/${encodeURIComponent(query)}/json/`);
  if (data.__error) return { ok: false, error: data.__error };
  if (data.error) return { ok: false, error: data.reason || 'Lookup failed' };

  return {
    ok: true,
    ip: data.ip,
    hostname: data.hostname || '',
    asn: data.asn || '',
    isp: data.org || '',
    org: data.org || '',
    city: data.city || '',
    region: data.region || '',
    country: data.country_name || '',
    countryCode: data.country_code || '',
    latitude: data.latitude,
    longitude: data.longitude,
  };
}

async function providerIpApi(query) {
  const data = await fetchJson(`http://ip-api.com/json/${encodeURIComponent(query)}?fields=status,message,country,countryCode,regionName,city,lat,lon,isp,org,as,asname,reverse,query`);
  if (data.__error) return { ok: false, error: data.__error };
  if (data.status !== 'success') return { ok: false, error: data.message || 'Lookup failed' };

  return {
    ok: true,
    ip: data.query,
    hostname: data.reverse || '',
    asn: data.as || data.asname || '',
    isp: data.isp || '',
    org: data.org || '',
    city: data.city || '',
    region: data.regionName || '',
    country: data.country || '',
    countryCode: data.countryCode || '',
    latitude: data.lat,
    longitude: data.lon,
  };
}

async function providerIpInfo(query) {
  const data = await fetchJson(`https://ipinfo.io/${encodeURIComponent(query)}/json`);
  if (data.__error) return { ok: false, error: data.__error };
  if (data.error) return { ok: false, error: data.error?.message || 'Lookup failed' };

  const [latitude, longitude] = (data.loc || '').split(',').map(Number);

  return {
    ok: true,
    ip: data.ip,
    hostname: data.hostname || '',
    asn: data.org || '',
    isp: data.org || '',
    org: data.org || '',
    city: data.city || '',
    region: data.region || '',
    country: data.country || '',
    countryCode: data.country || '',
    latitude,
    longitude,
  };
}

async function providerGeoJs(query) {
  const data = await fetchJson(`https://get.geojs.io/v1/ip/geo/${encodeURIComponent(query)}.json`);
  if (data.__error) return { ok: false, error: data.__error };
  if (!data.ip) return { ok: false, error: 'Lookup failed' };

  return {
    ok: true,
    ip: data.ip,
    hostname: data.organization_name || '',
    asn: data.asn || '',
    isp: data.organization_name || '',
    org: data.organization_name || '',
    city: data.city || '',
    region: data.region || '',
    country: data.country || '',
    countryCode: data.country_code || '',
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
  };
}

async function runLookups(query) {
  const providers = [
    { id: 'cloudflare', label: 'CloudFlare CDN (07.12.2025)', fetcher: providerIpWho },
    { id: 'dbip', label: 'DB-IP (01.12.2025)', fetcher: providerIpApiCo },
    { id: 'ipgeolocation', label: 'IPGeolocation.io (01.12.2025)', fetcher: providerGeoJs },
    { id: 'ip2location', label: 'IP2Location (01.12.2025)', fetcher: providerIpApi },
    { id: 'ipinfo', label: 'IPInfo.io (01.12.2025)', fetcher: providerIpInfo },
  ];

  const results = await Promise.all(providers.map(async (provider) => {
    const payload = await provider.fetcher(query);
    return { ...payload, id: provider.id, label: provider.label };
  }));

  const latitudes = results.filter(p => p.ok && typeof p.latitude === 'number').map(p => p.latitude);
  const longitudes = results.filter(p => p.ok && typeof p.longitude === 'number').map(p => p.longitude);

  return {
    query,
    providers: results,
    aggregate: {
      latitude: median(latitudes),
      longitude: median(longitudes),
    },
  };
}

async function resolveTarget(rawQuery) {
  const query = (rawQuery || '').trim();
  if (!query) {
    return { input: query, target: query };
  }

  if (net.isIP(query)) {
    return { input: query, target: query };
  }

  try {
    const result = await dns.lookup(query);
    return { input: query, target: result.address, hostname: query };
  } catch (error) {
    return { input: query, error: 'Unable to resolve domain to IP' };
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/api/ip') {
    const ip = getIp(req);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ip }));
    return;
  }

  if (req.url.startsWith('/api/lookup')) {
    const { searchParams } = new URL(req.url, 'http://localhost');
    const rawQuery = searchParams.get('target') || getIp(req);

    resolveTarget(rawQuery)
      .then((resolved) => {
        if (resolved.error || !resolved.target) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: resolved.error || 'Lookup failed', query: rawQuery }));
          return;
        }

        return runLookups(resolved.target)
          .then((payload) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ...payload, input: resolved.input, resolved: resolved.target, hostname: resolved.hostname || '' }));
          });
      })
      .catch(() => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Lookup failed' }));
      });
    return;
  }

  const urlPath = req.url.split('?')[0];
  const target = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  const filePath = path.join(publicDir, target);
  const ext = path.extname(filePath).toLowerCase();

  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  }[ext] || 'application/octet-stream';

  serveStatic(res, filePath, mime);
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
