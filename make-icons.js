import fs from 'fs';
const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
fs.writeFileSync('public/pwa-192x192.png', Buffer.from(b64, 'base64'));
fs.writeFileSync('public/pwa-512x512.png', Buffer.from(b64, 'base64'));
