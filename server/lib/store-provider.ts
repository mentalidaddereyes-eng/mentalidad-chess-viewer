import type { IStorage } from '../storage';
import { localStore } from './local-store';

/**
 * Lazy-load the DB-backed storage to avoid throwing during module import
 * when DATABASE_URL is not set. This allows the application to fall back
 * to the local in-memory store in development without a configured database.
 */
let currentProvider: 'db' | 'local' = 'db';
let dbHealthy = true;

export async function getStore(): Promise<{ store: IStorage; provider: 'db' | 'local' }> {
  if (!dbHealthy) {
    console.log('[store-provider] using local (DB unhealthy)');
    return { store: localStore as unknown as IStorage, provider: 'local' };
  }

  try {
    // Dynamic import so missing DATABASE_URL doesn't crash the entire app at import time.
    const { storage: dbStorage } = await import('../storage');
    await Promise.race([
      dbStorage.getSettings(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DB timeout')), 2000)
      )
    ]);

    dbHealthy = true;
    currentProvider = 'db';
    return { store: dbStorage, provider: 'db' };
  } catch (error) {
    console.warn('[store-provider] DB unavailable, falling back to local:', error instanceof Error ? error.message : 'unknown');
    dbHealthy = false;
    currentProvider = 'local';
    return { store: localStore as unknown as IStorage, provider: 'local' };
  }
}

export function getCurrentProvider(): 'db' | 'local' {
  return currentProvider;
}
