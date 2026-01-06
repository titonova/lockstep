import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export function triggerConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#22c55e', '#86efac', '#4ade80', '#ffffff']
  });
}

export function triggerSessionCompleteConfetti() {
  const duration = 3000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#22c55e', '#3b82f6', '#a855f7']
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#22c55e', '#3b82f6', '#a855f7']
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}

interface ConfettiTriggerProps {
  trigger: boolean;
  type?: 'task' | 'session';
}

export function ConfettiTrigger({ trigger, type = 'task' }: ConfettiTriggerProps) {
  useEffect(() => {
    if (trigger) {
      if (type === 'session') {
        triggerSessionCompleteConfetti();
      } else {
        triggerConfetti();
      }
    }
  }, [trigger, type]);

  return null;
}
