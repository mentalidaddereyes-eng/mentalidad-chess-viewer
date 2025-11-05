// Cost Saver Pack v6.0: Plan types and voice provider configuration
// Extended to include ELITE plan (feat(subscriptions))

export type PlanMode = 'pro' | 'free' | 'elite';
export type VoiceProvider = 'elevenlabs' | 'gtts' | 'piper';

export interface PlanConfig {
  mode: PlanMode;
  voiceProvider: VoiceProvider;
  features: {
    clonedVoice: boolean;
    advancedAnalysis: boolean;
    unlimitedPuzzles: boolean;
  };
  engineDepth: number;
  maxConcurrentAnalysis: number;
  model: string;
}

export const PLAN_CONFIGS: Record<PlanMode, PlanConfig> = {
  free: {
    mode: 'free',
    voiceProvider: 'gtts', // fallback to piper if gtts unavailable
    features: {
      clonedVoice: false,
      advancedAnalysis: false,
      unlimitedPuzzles: false,
    },
    engineDepth: parseInt(process.env.ENGINE_DEPTH_FREE || '14', 10),
    maxConcurrentAnalysis: parseInt(process.env.MAX_CONCURRENT_ANALYSIS_FREE || '1', 10),
    model: process.env.MODEL_FREE || 'gemini-2.5-flash-lite',
  },
  pro: {
    mode: 'pro',
    voiceProvider: 'elevenlabs',
    features: {
      clonedVoice: true,
      advancedAnalysis: true,
      unlimitedPuzzles: true,
    },
    engineDepth: parseInt(process.env.ENGINE_DEPTH_PRO || '20', 10),
    maxConcurrentAnalysis: parseInt(process.env.MAX_CONCURRENT_ANALYSIS_PRO || '2', 10),
    model: process.env.MODEL_PRO || 'gemini-2.5-flash',
  },
  elite: {
    mode: 'elite',
    voiceProvider: 'elevenlabs',
    features: {
      clonedVoice: true,
      advancedAnalysis: true,
      unlimitedPuzzles: true,
    },
    engineDepth: parseInt(process.env.ENGINE_DEPTH_ELITE || '24', 10),
    maxConcurrentAnalysis: parseInt(process.env.MAX_CONCURRENT_ANALYSIS_ELITE || '3', 10),
    model: process.env.MODEL_ELITE || 'gemini-2.5-pro',
  },
};

export interface TrialInfo {
  eligible: boolean;
  usedToday: boolean;
  remainingMs: number;
  startTime?: number;
}
