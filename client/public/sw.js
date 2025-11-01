// Service Worker for GM Trainer - Cache busting and version updates
const APP_VERSION = '2025-11-01-chesscom-plus';

self.addEventListener('install', (event) => {
  console.log('[sw] version:', APP_VERSION, 'installed');
  // Don't skip waiting automatically - wait for user action
});

self.addEventListener('activate', (event) => {
  console.log('[sw] version:', APP_VERSION, 'activated');
  // Take control of all clients immediately
  event.waitUntil(clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    console.log('[sw] SKIP_WAITING received, activating new version');
    self.skipWaiting();
  }
});
