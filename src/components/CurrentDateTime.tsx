import { useState, useEffect } from 'react';
import { APP_VERSION } from '../version';

export function CurrentDateTime() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="fixed top-4 right-4 text-white/40 text-xs font-mono z-50">
      <div>{formatDate(currentTime)}</div>
      <div>{formatTime(currentTime)}</div>
      <div className="mt-0.5 text-[10px] text-white/20">v{APP_VERSION}</div>
    </div>
  );
}
