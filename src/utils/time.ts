// Utility functions for time calculations and formatting

/**
 * Convert hours (decimal) to milliseconds
 */
export function hoursToMs(hours: number): number {
  return hours * 60 * 60 * 1000;
}

/**
 * Convert milliseconds to hours (decimal)
 */
export function msToHours(ms: number): number {
  return ms / (60 * 60 * 1000);
}

/**
 * Convert milliseconds to minutes
 */
export function msToMinutes(ms: number): number {
  return ms / (60 * 1000);
}

/**
 * Convert minutes to milliseconds
 */
export function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000;
}

/**
 * Format milliseconds as HH:MM:SS
 */
export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format milliseconds as human-readable duration
 */
export function formatDuration(ms: number): string {
  const hours = msToHours(ms);
  if (hours >= 1) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
  const minutes = Math.round(msToMinutes(ms));
  return `${minutes}m`;
}

/**
 * Format hours (decimal) as human-readable
 */
export function formatHours(hours: number): string {
  if (hours >= 1) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h} hour${h !== 1 ? 's' : ''}`;
    return `${h}h ${m}m`;
  }
  const minutes = Math.round(hours * 60);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate remaining time percentage
 */
export function getRemainingPercent(elapsedMs: number, totalMs: number): number {
  if (totalMs === 0) return 0;
  const remaining = Math.max(0, totalMs - elapsedMs);
  return (remaining / totalMs) * 100;
}

/**
 * Get timer color based on remaining percentage
 */
export function getTimerColor(remainingPercent: number): 'green' | 'orange' | 'red' {
  if (remainingPercent > 50) return 'green';
  if (remainingPercent > 20) return 'orange';
  return 'red';
}

/**
 * Calculate extension threshold based on number of extensions already applied
 */
export function getExtensionThreshold(basePercent: number, extensionCount: number): number {
  // Diminishing returns: 10% -> 5% -> 2.5% -> 1.25%...
  return basePercent / Math.pow(2, extensionCount);
}

/**
 * Check if extensions should be shown
 */
export function shouldShowExtensions(
  remainingPercent: number,
  baseThreshold: number,
  extensionCount: number
): boolean {
  const threshold = getExtensionThreshold(baseThreshold, extensionCount);
  return remainingPercent <= threshold;
}
