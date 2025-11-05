/* Stockfish Web Worker with local-first and CDN fallback */
let engine = null;
let ready = false;
let pending = null;

function log(...args) {
  // self.postMessage({ type: 'log', data: args.join(' ') });
}

function ensureEngine() {
  if (engine) return;
  try {
    // Try local copy first (place stockfish.js in /public/engine if available)
    importScripts('/engine/stockfish.js');
    log('[worker] loaded local /engine/stockfish.js');
  } catch (e) {
    try {
      // Fallback: CDN (wasm build if available, else js)
      importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish/16.1.0/stockfish.js');
      log('[worker] loaded CDN stockfish.js');
    } catch (e2) {
      try {
        importScripts('https://cdn.jsdelivr.net/npm/stockfish@16.1.0/stockfish.js');
        log('[worker] loaded jsdelivr stockfish.js');
      } catch (e3) {
        self.postMessage({ type: 'error', error: 'Failed to load Stockfish' });
        return;
      }
    }
  }

  // global Stockfish factory expected
  engine = self.Stockfish ? self.Stockfish() : null;
  if (!engine) {
    self.postMessage({ type: 'error', error: 'Stockfish factory not found' });
    return;
  }

  engine.onmessage = (e) => {
    const line = (typeof e === 'string') ? e : (e && e.data ? e.data : '');
    const msg = String(line).trim();
    if (!msg) return;

    // log('[engine]', msg);

    if (msg === 'uciok') {
      ready = true;
      if (pending && pending.cmd === 'isready') {
        self.postMessage({ type: 'ready' });
        pending = null;
      }
      return;
    }

    if (msg === 'readyok') {
      if (pending && pending.cmd === 'isready') {
        self.postMessage({ type: 'ready' });
        pending = null;
      }
      return;
    }

    if (msg.startsWith('info')) {
      // Parse depth, score cp/mate, pv
      const depthMatch = msg.match(/depth (\d+)/);
      const cpMatch = msg.match(/score cp (-?\d+)/);
      const mateMatch = msg.match(/score mate (-?\d+)/);
      const pvMatch = msg.match(/pv ([a-h][1-8][a-h][1-8][qrbn]?)/);

      const depth = depthMatch ? parseInt(depthMatch[1], 10) : undefined;
      const score = cpMatch ? parseInt(cpMatch[1], 10) : undefined;
      const mate = mateMatch ? parseInt(mateMatch[1], 10) : undefined;
      const best = pvMatch ? pvMatch[1] : undefined;

      self.postMessage({ type: 'info', depth, score, mate, best });
      return;
    }

    if (msg.startsWith('bestmove')) {
      const moveMatch = msg.match(/bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/);
      const bestMove = moveMatch ? moveMatch[1] : undefined;
      self.postMessage({ type: 'result', bestMove });
      return;
    }
  };

  // Initialize UCI
  engine.postMessage('uci');
}

function analyze({ fen, depth = 15, multipv = 1 }) {
  ensureEngine();
  if (!engine) return;

  // Set options and analyze
  engine.postMessage('ucinewgame');
  engine.postMessage('isready');
  pending = { cmd: 'isready' };

  // Give engine a short moment to become ready
  setTimeout(() => {
    engine.postMessage(`setoption name MultiPV value ${Math.max(1, Math.min(3, multipv))}`);
    engine.postMessage(`position fen ${fen}`);
    engine.postMessage(`go depth ${depth}`);
  }, 50);
}

self.onmessage = (e) => {
  const data = e.data || {};
  if (data.cmd === 'analyze') {
    analyze(data);
  } else if (data.cmd === 'quit') {
    try {
      if (engine) engine.postMessage('quit');
    } catch (_) {}
    self.close();
  }
};
