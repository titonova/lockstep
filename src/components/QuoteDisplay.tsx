import { useEffect, useState } from 'react';
import { Quote } from '../types';
import { getRandomQuote } from '../data/quotes';

interface QuoteDisplayProps {
  quotes: Quote[];
  enabled: boolean;
}

export function QuoteDisplay({ quotes, enabled }: QuoteDisplayProps) {
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    if (enabled) {
      setQuote(getRandomQuote(quotes));
    }
  }, [enabled, quotes]);

  if (!enabled || !quote) return null;

  return (
    <div className="text-center py-4">
      <p className="text-white/50 italic text-sm">
        "{quote.text}"
      </p>
      {quote.author && (
        <p className="text-white/30 text-xs mt-1">— {quote.author}</p>
      )}
    </div>
  );
}
