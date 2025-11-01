import { useState, useEffect, useRef, useCallback } from "react";

export type VoiceMode = 'pro' | 'kids';

interface VoiceSettings {
  voiceMode: VoiceMode;
  muted: boolean;
}

// Global audio instance for single-channel enforcement
let currentAudio: HTMLAudioElement | null = null;

export function useVoice() {
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('pro');
  const [muted, setMuted] = useState(true); // Default: muted
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('gm_trainer_voice_settings');
    if (stored) {
      try {
        const settings: VoiceSettings = JSON.parse(stored);
        setVoiceMode(settings.voiceMode || 'pro');
        setMuted(settings.muted !== undefined ? settings.muted : true);
        console.log('[voice] loaded from storage:', settings);
      } catch (error) {
        console.error('[voice] failed to load settings:', error);
      }
    } else {
      console.log('[voice] init ok (muted)');
    }
  }, []);

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    const settings: VoiceSettings = { voiceMode, muted };
    localStorage.setItem('gm_trainer_voice_settings', JSON.stringify(settings));
    console.log('[voice] settings saved:', settings);
  }, [voiceMode, muted]);

  // Stop current audio playback (single-channel enforcement)
  const stopAudio = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
      console.log('[voice] stopped current audio (single-channel enforced)');
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  // Speak function - only plays if not muted
  const speak = useCallback((audioUrl: string | undefined) => {
    console.log('[voice] speak called, muted:', muted, 'audioUrl:', !!audioUrl);
    
    if (muted) {
      console.log('[voice] muted, skipping playback');
      return;
    }

    if (!audioUrl) {
      console.log('[voice] no audio URL provided');
      return;
    }

    // Stop any currently playing audio (single-channel enforcement)
    stopAudio();

    try {
      const audio = new Audio(audioUrl);
      currentAudio = audio;
      audioRef.current = audio;
      
      audio.onended = () => {
        currentAudio = null;
        audioRef.current = null;
        console.log('[voice] playback finished');
      };

      audio.onerror = (error) => {
        console.error('[voice] playback error:', error);
        currentAudio = null;
        audioRef.current = null;
      };

      audio.play().then(() => {
        console.log('[voice] playing audio, mode:', voiceMode);
      }).catch((error) => {
        console.error('[voice] failed to play audio:', error);
      });
    } catch (error) {
      console.error('[voice] failed to create audio:', error);
    }
  }, [muted, voiceMode, stopAudio]);

  // Change voice mode (stop current audio if playing)
  const selectVoice = useCallback((mode: VoiceMode) => {
    console.log('[voice] mode changed:', mode);
    stopAudio();
    setVoiceMode(mode);
  }, [stopAudio]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const newMuted = !prev;
      console.log('[voice] mute toggled:', newMuted);
      if (newMuted) {
        stopAudio(); // Stop playback when muting
      }
      return newMuted;
    });
  }, [stopAudio]);

  return {
    voiceMode,
    muted,
    selectVoice,
    toggleMute,
    speak,
    stopAudio,
  };
}
