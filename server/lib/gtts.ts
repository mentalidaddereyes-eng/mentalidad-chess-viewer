// Cost Saver Pack v6.0: Google Text-to-Speech (gTTS) free alternative
// Fallback TTS provider for Free plan

import gtts from 'gtts';
import { Readable } from 'stream';
import type { Language } from './elevenlabs';

// Map our language codes to gTTS language codes
const GTTS_LANG_MAP: Record<Language, string> = {
  spanish: 'es',
  english: 'en',
  portuguese: 'pt',
  hindi: 'hi',
  french: 'fr',
  german: 'de',
  russian: 'ru',
};

/**
 * Generate speech using Google TTS (free, no API key required)
 * Cost Saver Pack v6.0: Free alternative to ElevenLabs
 */
export async function generateGTTS(
  text: string,
  language: Language = 'spanish'
): Promise<Buffer> {
  const langCode = GTTS_LANG_MAP[language] || 'es';
  
  console.log(`[gtts] generating audio for language: ${language} (${langCode})`);

  return new Promise((resolve, reject) => {
    try {
      const speech = new gtts(text, langCode);
      const chunks: Buffer[] = [];

      speech.stream()
        .on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        })
        .on('end', () => {
          const audioBuffer = Buffer.concat(chunks);
          console.log(`[gtts] audio generated: ${audioBuffer.length} bytes`);
          resolve(audioBuffer);
        })
        .on('error', (error: Error) => {
          console.error('[gtts] generation error:', error);
          reject(error);
        });
    } catch (error) {
      console.error('[gtts] setup error:', error);
      reject(error);
    }
  });
}
