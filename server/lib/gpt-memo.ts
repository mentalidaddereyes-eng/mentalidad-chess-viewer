// Cost Saver Pack v6.0: GPT memo system with rate-limiting
// Max 2 calls/min (burst 1 every 3s), hash-based memoization, trivial position detection

import crypto from 'crypto';

interface MemoEntry {
  text: string;
  timestamp: number;
  ttl: number;
}

interface RateLimitEntry {
  timestamps: number[];
  maxCalls: number;
  windowMs: number;
}

class GPTMemoCache {
  private memo: Map<string, MemoEntry> = new Map();
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  
  // Cost Saver Pack v6.0: max 2 calls/min, burst 1 every 3s
  private readonly MAX_CALLS_PER_MINUTE = 2;
  private readonly BURST_INTERVAL_MS = 3000; // 3 seconds
  private readonly WINDOW_MS = 60000; // 1 minute
  
  /**
   * Generate memo hash from FEN + lang + mode + bestSan
   */
  private generateHash(fen: string, lang: string, mode: string, bestSan: string): string {
    const core = `${fen}|${lang}|${mode}|${bestSan}`;
    return crypto.createHash('sha256').update(core).digest('hex').substring(0, 16);
  }
  
  /**
   * Get memoized GPT response if exists and not expired
   */
  get(fen: string, lang: string, mode: string, bestSan: string): string | null {
    const hash = this.generateHash(fen, lang, mode, bestSan);
    const entry = this.memo.get(hash);
    
    if (!entry) return null;
    
    // Check if expired (TTL: 180-300s)
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.memo.delete(hash);
      console.log(`[gpt-memo] EXPIRED: ${hash}`);
      return null;
    }
    
    console.log(`[gpt-memo] HIT: ${hash} (age: ${(age / 1000).toFixed(1)}s)`);
    return entry.text;
  }
  
  /**
   * Store GPT response in memo with TTL 180-300s
   */
  set(fen: string, lang: string, mode: string, bestSan: string, text: string): void {
    const hash = this.generateHash(fen, lang, mode, bestSan);
    const ttl = 180000 + Math.random() * 120000; // 180-300s random TTL
    
    this.memo.set(hash, {
      text,
      timestamp: Date.now(),
      ttl,
    });
    
    console.log(`[gpt-memo] SET: ${hash} (TTL: ${(ttl / 1000).toFixed(0)}s)`);
  }
  
  /**
   * Check if rate limit allows GPT call
   * Cost Saver Pack v6.0: max 2/min, burst 1 every 3s
   */
  canMakeGPTCall(clientId: string = 'default'): boolean {
    const now = Date.now();
    let entry = this.rateLimits.get(clientId);
    
    if (!entry) {
      entry = {
        timestamps: [],
        maxCalls: this.MAX_CALLS_PER_MINUTE,
        windowMs: this.WINDOW_MS,
      };
      this.rateLimits.set(clientId, entry);
    }
    
    // Remove timestamps outside the 1-minute window
    entry.timestamps = entry.timestamps.filter(ts => now - ts < this.WINDOW_MS);
    
    // Check burst limit (1 every 3s)
    const lastCall = entry.timestamps[entry.timestamps.length - 1];
    if (lastCall && now - lastCall < this.BURST_INTERVAL_MS) {
      console.log(`[gpt-rate] BURST LIMIT: wait ${((this.BURST_INTERVAL_MS - (now - lastCall)) / 1000).toFixed(1)}s`);
      return false;
    }
    
    // Check overall limit (2/min)
    if (entry.timestamps.length >= this.MAX_CALLS_PER_MINUTE) {
      console.log(`[gpt-rate] RATE LIMIT: ${entry.timestamps.length}/${this.MAX_CALLS_PER_MINUTE} calls in last minute`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Record GPT call timestamp for rate limiting
   */
  recordGPTCall(clientId: string = 'default'): void {
    const entry = this.rateLimits.get(clientId);
    if (entry) {
      entry.timestamps.push(Date.now());
      console.log(`[gpt-rate] RECORDED: ${entry.timestamps.length}/${this.MAX_CALLS_PER_MINUTE} calls in window`);
    }
  }
  
  /**
   * Clear expired memo entries (cleanup)
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [hash, entry] of this.memo.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.memo.delete(hash);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[gpt-memo] CLEANUP: removed ${cleaned} expired entries`);
    }
  }
}

export const gptMemo = new GPTMemoCache();

// Periodic cleanup every 5 minutes
setInterval(() => gptMemo.cleanup(), 300000);

/**
 * Detect trivial positions that don't need GPT analysis
 * Cost Saver Pack v6.0: forced captures, repetitions, mate in 1-2, obvious tactics, opening book
 */
export function isTrivialPosition(
  fen: string,
  bestMove?: string,
  scoreCp?: number,
  mate?: number
): boolean {
  // Starting position (already handled by local templates)
  if (fen.startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')) {
    return true;
  }
  
  // Mate in 1-2 moves (trivial endgame)
  if (mate !== undefined && mate !== null && Math.abs(mate) <= 2) {
    console.log(`[gpt-trivial] Mate in ${mate} - trivial`);
    return true;
  }
  
  // Overwhelming advantage (>+10 or <-10) - game is basically over
  if (scoreCp !== undefined && Math.abs(scoreCp) > 1000) {
    console.log(`[gpt-trivial] Score ${scoreCp} - overwhelming advantage`);
    return true;
  }
  
  // Could add: forced capture detection, repetition detection, opening book lookup
  // For now, conservative: only filter starting position and near-mate positions
  
  return false;
}
