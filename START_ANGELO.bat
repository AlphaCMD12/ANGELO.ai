@echo off

:: ========================================================
:: CONFIGURATION: CHANGE YOUR CHATBOT FOLDER PATH HERE
:: ========================================================
set "CHATBOT_PATH=C:\Users\Swarnavo\.gemini\antigravity\scratch\ANGELO V2"
:: ========================================================

echo Starting ANGELO Chatbot Server...
node -e "const h=require('http'),fs=require('fs'),p=require('path');const base=process.env.CHATBOT_PATH;h.createServer((q,r)=>{const url=q.url==='/'?'index.html':q.url.split('?')[0];const f=p.join(base,url);const m={'html':'text/html','css':'text/css','js':'text/javascript','png':'image/png','ico':'image/x-icon','json':'application/json'};const ext=p.extname(f).slice(1);fs.access(f,fs.constants.F_OK,(err)=>{if(err){r.writeHead(404);r.end('Not found');return;}r.writeHead(200,{'Content-Type':m[ext]||'text/plain'});fs.createReadStream(f).on('error',(e)=>{r.end('Error');}).pipe(r);});}).listen(3000,()=>console.log('ANGELO is running! Open http://localhost:3000 in your browser'));"
pause