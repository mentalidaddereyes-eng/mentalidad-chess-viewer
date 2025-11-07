/* FIX BLOCKERS v1 - Local shim to provide Stockfish without 404 in dev.
   Loads a stable version from CDN so /engine/stockfish.js always resolves. */
(function () {
  var loaded = false;
  try {
    importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish/16.1.0/stockfish.js');
    loaded = true;
    // console.log('[stockfish-shim] Loaded from cdnjs');
  } catch (e1) {
    try {
      importScripts('https://cdn.jsdelivr.net/npm/stockfish@16.1.0/stockfish.js');
      loaded = true;
      // console.log('[stockfish-shim] Loaded from jsdelivr');
    } catch (e2) {
      // leave to worker to handle error message
      // console.error('[stockfish-shim] Failed to load Stockfish from CDNs');
    }
  }
})();
