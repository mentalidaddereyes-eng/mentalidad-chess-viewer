// Cost Saver Pack v6.0: Plan types and voice provider configuration

export type PlanMode = 'pro' | 'free';
export type VoiceProvider = 'elevenlabs' | 'gtts' | 'piper';

export interface PlanConfig {
  mode: PlanMode;
  voiceProvider: VoiceProvider;
  features: {
    clonedVoice: boolean;
    advancedAnalysis: boolean;
    unlimitedPuzzles: boolean;
  };
}

export const PLAN_CONFIGS: Record<PlanMode, PlanConfig> = {
  pro: {
    mode: 'pro',
    voiceProvider: 'elevenlabs',
    features: {
      clonedVoice: true,
      advancedAnalysis: true,
      unlimitedPuzzles: true,
    },
  },
  free: {
    mode: 'free',
    voiceProvider: 'gtts', // fallback to piper if gtts unavailable
    features: {
      clonedVoice: false,
      advancedAnalysis: false,
      unlimitedPuzzles: false,
    },
  },
};
