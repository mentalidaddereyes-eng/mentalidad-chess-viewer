// LRU Cache system for TTS and GPT responses - Fix Pack v5.1
// 200MB budget for audio cache, FEN-based deduplication

interface CacheEntry {
  data: Buffer | string;
  timestamp: number;
  size: number;
}

class LRUCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private currentSize: number;

  constructor(maxSizeInMB: number) {
    this.cache = new Map();
    this.maxSize = maxSizeInMB * 1024 * 1024; // Convert MB to bytes
    this.currentSize = 0;
  }

  get(key: string): Buffer | string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Move to end (mark as recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    console.log(`[cache] HIT: ${key.substring(0, 40)}...`);
    return entry.data;
  }

  set(key: string, data: Buffer | string): void {
    const size = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
    
    // Remove old entry if exists
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!;
      this.currentSize -= oldEntry.size;
      this.cache.delete(key);
    }

    // Evict LRU entries if needed
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value as string | undefined;
      if (!firstKey) break;
      
      const firstEntry = this.cache.get(firstKey);
      if (firstEntry) {
        this.currentSize -= firstEntry.size;
        this.cache.delete(firstKey);
        console.log(`[cache] EVICT: ${firstKey.substring(0, 40)}...`);
      }
    }

    // Add new entry
    this.cache.set(key, { data, timestamp: Date.now(), size });
    this.currentSize += size;
    
    console.log(`[cache] SET: ${key.substring(0, 40)}... (${(size / 1024).toFixed(1)}KB, total: ${(this.currentSize / 1024 / 1024).toFixed(1)}MB)`);
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    console.log('[cache] CLEARED');
  }
}

// TTS cache: 200MB for audio buffers
export const ttsCache = new LRUCache(200);

// GPT response cache: 10MB for text responses
export const gptCache = new LRUCache(10);

// Generate cache key for TTS (Cost Saver Pack v6.0: includes provider for isolation)
export function getTTSCacheKey(
  text: string, 
  voiceMode: string, 
  language: string = 'spanish',
  provider: string = 'elevenlabs'
): string {
  return `tts:${provider}:${language}:${voiceMode}:${text}`;
}

// Generate cache key for GPT commentary
export function getGPTCacheKey(fen: string, language: string, voiceMode: string, style: string): string {
  // Only use first 50 chars of FEN (position, not move counters)
  const fenCore = fen.split(' ').slice(0, 4).join(' ');
  return `gpt:${language}:${voiceMode}:${style}:${fenCore}`;
}

// Local templates for trivial positions (no GPT call needed)
export function getLocalTemplate(fen: string, language: string, voiceMode: string): string | null {
  const fenCore = fen.split(' ')[0]; // Just piece positions
  
  // Starting position
  if (fenCore === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR') {
    const templates: Record<string, Record<string, string>> = {
      spanish: {
        pro: 'Posición inicial. Las blancas tienen la ventaja del primer movimiento. Desarrolla piezas hacia el centro y prepara el enroque.',
        kids: '¡Comienza el juego! Mueve tus peones centrales y desarrolla tus piezas. ¡Diviértete!'
      },
      english: {
        pro: 'Starting position. White has the first-move advantage. Develop pieces toward the center and prepare castling.',
        kids: 'Game starts! Move your center pawns and develop your pieces. Have fun!'
      },
      portuguese: {
        pro: 'Posição inicial. As brancas têm a vantagem do primeiro movimento. Desenvolva peças para o centro e prepare o roque.',
        kids: 'Começa o jogo! Mova seus peões centrais e desenvolva suas peças. Divirta-se!'
      },
      hindi: {
        pro: 'प्रारंभिक स्थिति। सफेद को पहली चाल का लाभ है। केंद्र की ओर मोहरे विकसित करें।',
        kids: 'खेल शुरू! अपने केंद्रीय प्यादों को हिलाएं। मज़े करो!'
      },
      french: {
        pro: 'Position de départ. Les blancs ont l\'avantage du premier coup. Développez les pièces vers le centre.',
        kids: 'Le jeu commence ! Bougez vos pions centraux. Amusez-vous !'
      },
      german: {
        pro: 'Ausgangsposition. Weiß hat den Vorteil des ersten Zuges. Entwickeln Sie Figuren zur Mitte.',
        kids: 'Spiel beginnt! Bewege deine Mittelbauern. Viel Spaß!'
      },
      russian: {
        pro: 'Начальная позиция. Белые имеют преимущество первого хода. Развивайте фигуры к центру.',
        kids: 'Игра начинается! Двигай центральные пешки. Удачи!'
      }
    };
    
    const lang = templates[language] || templates.english;
    return lang[voiceMode] || lang.pro;
  }
  
  return null; // No template, needs GPT
}
