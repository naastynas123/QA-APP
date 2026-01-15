const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);
    
    const extname = path.extname(filePath).toLowerCase();
    let contentType = 'text/html';
    
    if (extname === '.js') contentType = 'text/javascript';
    if (extname === '.css') contentType = 'text/css';
    if (extname === '.json') contentType = 'application/json';
    if (extname === '.png') contentType = 'image/png';
    if (extname === '.jpg') contentType = 'image/jpg';
    if (extname === '.gif') contentType = 'image/gif';
    if (extname === '.svg') contentType = 'image/svg+xml';
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 - File Not Found</h1>');
            return;
        }
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(8000, '127.0.0.1', () => {
    console.log('QA App running at http://localhost:8000');
});
