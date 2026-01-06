import { useEffect, useRef } from 'react';

interface ProceduralBackgroundProps {
  intensity?: 'calm' | 'standard' | 'aggressive';
}

export function ProceduralBackground({ intensity = 'standard' }: ProceduralBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const speeds = {
      calm: 0.0003,
      standard: 0.0005,
      aggressive: 0.001
    };

    const speed = speeds[intensity];
    
    const colors = {
      calm: ['#1e3a5f', '#2d4a6f', '#1a2a3f'],
      standard: ['#1e293b', '#334155', '#0f172a', '#1e1b4b'],
      aggressive: ['#1e1b4b', '#3b0764', '#0f172a', '#450a0a']
    };

    const palette = colors[intensity];

    const draw = () => {
      time += speed;

      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, palette[0]);
      gradient.addColorStop(0.5, palette[1]);
      gradient.addColorStop(1, palette[2]);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw abstract shapes
      const numShapes = intensity === 'calm' ? 3 : intensity === 'standard' ? 5 : 8;
      
      for (let i = 0; i < numShapes; i++) {
        const x = canvas.width * (0.2 + 0.6 * Math.sin(time * (i + 1) * 0.7 + i));
        const y = canvas.height * (0.2 + 0.6 * Math.cos(time * (i + 1) * 0.5 + i * 2));
        const radius = Math.abs(100 + 200 * Math.sin(time * 0.3 + i));
        
        const shapeGradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(radius, 10));
        shapeGradient.addColorStop(0, `${palette[i % palette.length]}80`);
        shapeGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = shapeGradient;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(radius, 10), 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw flowing lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 2;
      
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * (0.2 + i * 0.15 + Math.sin(time + i) * 0.1));
        
        for (let x = 0; x < canvas.width; x += 20) {
          const y = canvas.height * (0.2 + i * 0.15 + 
            Math.sin(time + x * 0.002 + i) * 0.1 + 
            Math.cos(time * 0.5 + x * 0.001) * 0.05);
          ctx.lineTo(x, y);
        }
        
        ctx.stroke();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{ background: '#0f172a' }}
    />
  );
}
