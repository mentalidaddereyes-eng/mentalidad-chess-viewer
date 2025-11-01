import type { IStorage } from '../storage';
import { storage as dbStorage } from '../storage';
import { localStore } from './local-store';

let currentProvider: 'db' | 'local' = 'db';
let dbHealthy = true;

export async function getStore(): Promise<{ store: IStorage; provider: 'db' | 'local' }> {
  if (!dbHealthy) {
    console.log('[store-provider] using local (DB unhealthy)');
    return { store: localStore as unknown as IStorage, provider: 'local' };
  }

  try {
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
