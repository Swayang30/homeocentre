const http=require('http'),fs=require('fs'),path=require('path'),zlib=require('zlib');
const ROOT='E:/PLAN D MEDIA PROJECTS/Homeocentre';
const T={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u.endsWith('/'))u+='index.html';const f=path.join(ROOT,u);
fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end('nf');}const ext=path.extname(f);const h={'Content-Type':T[ext]||'application/octet-stream','Cache-Control':ext==='.html'?'no-cache':'public, max-age=31536000'};
if(/html|css|javascript|svg/.test(h['Content-Type'])&&/gzip/.test(q.headers['accept-encoding']||'')){h['Content-Encoding']='gzip';d=zlib.gzipSync(d);}r.writeHead(200,h);r.end(d);});}).listen(8766,'127.0.0.1');
