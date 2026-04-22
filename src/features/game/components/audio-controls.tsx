// Audio Controls Component - Mute toggle button

'use client';

import React from 'react';
import { useAudio, isAudioEnabled, toggleMute } from './audio-manager';

export function AudioControls() {
  const [enabled, setEnabled] = React.useState(isAudioEnabled());

  // Sync with global state
  React.useEffect(() => {
    const interval = setInterval(() => {
      setEnabled(isAudioEnabled());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = () => {
    const newEnabled = toggleMute();
    setEnabled(newEnabled);
  };

  return (
    <button
      onClick={handleToggle}
      className="fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg transition-all hover:scale-110"
      style={{
        background: enabled ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#374151',
        border: '2px solid rgba(255,255,255,0.2)',
      }}
      title={enabled ? '🔊 Click to Mute' : '🔇 Click to Enable Sound'}
    >
      {enabled ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            className="opacity-50"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
          />
        </svg>
      )}
    </button>
  );
}

// Hook for playing sounds in game components
export function useGameAudio() {
  const { enabled, playSFX } = useAudio();

  const playHit = () => playSFX('hit');
  const playCrit = () => playSFX('crit');
  const playStep = (type: 'grass' | 'stone') => playSFX(type === 'grass' ? 'step_grass' : 'step_stone');
  const playClick = () => playSFX('click');

  return {
    enabled,
    playHit,
    playCrit,
    playStep,
    playClick,
  };
}
