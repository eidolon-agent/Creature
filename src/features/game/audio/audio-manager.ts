// Audio Manager - Muted by default!
// All sound and music start silent, user must opt-in

import { Howl, Howler } from 'howler';

let audioEnabled = false; // 🔇 MUTED BY DEFAULT

// Sound effect library
const SOUNDS = {
  // Combat
  hit: '/audio/sfx/hit.mp3',
  crit: '/audio/sfx/critical.mp3',
  block: '/audio/sfx/block.mp3',
  
  // Movement
  step_grass: '/audio/sfx/step_grass.mp3',
  step_stone: '/audio/sfx/step_stone.mp3',
  jump: '/audio/sfx/jump.mp3',
  
  // UI
  click: '/audio/sfx/click.mp3',
  hover: '/audio/sfx/hover.mp3',
  select: '/audio/sfx/select.mp3',
  
  // Environment
  wind: '/audio/env/wind_loop.mp3',
  forest: '/audio/env/forest_loop.mp3',
  dungeon: '/audio/env/dungeon_loop.mp3',
};

// Music tracks
const MUSIC = {
  town: '/audio/music/crystal_haven_theme.mp3',
  forest: '/audio/music/whispering_woods.mp3',
  dungeon: '/audio/music/shadowfall_boss.mp3',
  desert: '/audio/music/sunscorched_theme.mp3',
  battle: '/audio/music/epic_combat.mp3',
};

// Background music instance
let currentMusic: Howl | null = null;

// Initialize audio system (lazy load on user interaction)
export function initAudio() {
  Howler.autoUnlock = true;
  Howler.volume(audioEnabled ? 0.7 : 0); // 🔇 Start muted!
  console.log('🔇 Audio initialized (muted by default)');
}

// Toggle mute/unmute
export function toggleMute(): boolean {
  audioEnabled = !audioEnabled;
  Howler.volume(audioEnabled ? 0.7 : 0);
  
  if (currentMusic) {
    currentMusic.volume(audioEnabled ? 0.5 : 0);
  }
  
  console.log(audioEnabled ? '🔊 Audio ENABLED' : '🔇 Audio MUTED');
  return audioEnabled;
}

// Play sound effect
export function playSFX(soundKey: keyof typeof SOUNDS) {
  if (!audioEnabled) return; // 🔇 Silent if muted!
  
  const soundPath = SOUNDS[soundKey];
  if (!soundPath) {
    console.warn(`SFX not found: ${soundKey}`);
    return;
  }
  
  // Create and play sound (short-lived)
  const sound = new Howl({
    src: [soundPath],
    volume: 0.8,
    html5: false, // Keep in memory for quick playback
  });
  
  sound.play();
  
  // Auto unload after playback
  sound.on('end', () => {
    sound.unload();
  });
}

// Start background music
export function startMusic(zoneType: 'town' | 'forest' | 'dungeon' | 'desert' | 'battle') {
  if (!audioEnabled) return; // 🔇 Silent if muted!
  
  const track = MUSIC[zoneType];
  if (!track) {
    console.warn(`Music not found for: ${zoneType}`);
    return;
  }
  
  // Stop current music
  if (currentMusic) {
    currentMusic.fade(currentMusic.volume(), 0, 500);
    setTimeout(() => currentMusic?.stop(), 500);
  }
  
  // Start new music
  currentMusic = new Howl({
    src: [track],
    loop: true,
    autoplay: true,
    volume: 0.5,
    html5: true, // Stream for longer tracks
  });
  
  console.log(`🎵 Playing music: ${zoneType}`);
}

// Fade music out (for combat, transitions)
export function fadeMusic(duration: number = 1000) {
  if (currentMusic) {
    currentMusic.fade(currentMusic.volume(), 0, duration);
  }
}

// Set music volume (0.0 - 1.0)
export function setMusicVolume(vol: number) {
  if (currentMusic && audioEnabled) {
    currentMusic.volume(Math.max(0, Math.min(1, vol)));
  }
}

// Global volume control
export function setVolume(vol: number) {
  audioEnabled = vol > 0;
  Howler.volume(vol);
}

// Check if audio is enabled
export function isAudioEnabled(): boolean {
  return audioEnabled;
}

// Clean up on unmount
export function destroyAudio() {
  if (currentMusic) {
    currentMusic.stop();
    currentMusic.unload();
    currentMusic = null;
  }
  Howler.unload();
}

// Hook to use in game components
export function useAudio() {
  const [enabled, setEnabled] = React.useState(audioEnabled);
  
  React.useEffect(() => {
    initAudio();
    return () => destroyAudio();
  }, []);
  
  const toggle = React.useCallback(() => {
    const newEnabled = toggleMute();
    setEnabled(newEnabled);
  }, []);
  
  return {
    enabled,
    toggle,
    playSFX,
    startMusic,
    isAudioEnabled,
  };
}
