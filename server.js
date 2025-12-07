const http = require('http');
const fs = require('fs');
const path = require('path');

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

const server = http.createServer((req, res) => {
  if (req.url === '/api/ip') {
    const ip = getIp(req);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ip }));
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
