import { VisualMode } from '../types';

// Audio context for generating beeps
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a beep sound
 */
export function playBeep(
  frequency: number = 440,
  duration: number = 200,
  volume: number = 0.5
): void {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (error) {
    console.error('Failed to play beep:', error);
  }
}

/**
 * Play task completion sound
 */
export function playCompletionSound(volume: number = 0.5): void {
  // Pleasant two-tone completion sound
  playBeep(523, 150, volume); // C5
  setTimeout(() => playBeep(659, 200, volume), 100); // E5
}

/**
 * Play warning sound based on urgency
 */
export function playWarningSound(
  remainingPercent: number,
  volume: number = 0.5,
  mode: VisualMode = 'standard'
): void {
  if (mode === 'calm') return;
  
  const urgency = mode === 'aggressive' ? 1.5 : 1;
  
  if (remainingPercent <= 5) {
    // Critical - rapid beeps
    playBeep(880 * urgency, 100, volume);
  } else if (remainingPercent <= 10) {
    // Warning
    playBeep(660 * urgency, 150, volume);
  } else if (remainingPercent <= 20) {
    // Attention
    playBeep(440, 200, volume * 0.5);
  }
}

/**
 * Play session start sound
 */
export function playStartSound(volume: number = 0.5): void {
  // Rising three-tone start sound
  playBeep(330, 100, volume); // E4
  setTimeout(() => playBeep(440, 100, volume), 80); // A4
  setTimeout(() => playBeep(554, 150, volume), 160); // C#5
}

/**
 * Play pause sound
 */
export function playPauseSound(volume: number = 0.5): void {
  playBeep(330, 200, volume);
}

/**
 * Play extension granted sound
 */
export function playExtensionSound(volume: number = 0.5): void {
  playBeep(440, 100, volume);
  setTimeout(() => playBeep(440, 100, volume), 150);
}
