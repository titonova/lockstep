import { useEffect, useState } from 'react';
import { Quote } from '../types';
import { getRandomQuote } from '../data/quotes';

interface QuoteDisplayProps {
  quotes: Quote[];
  enabled: boolean;
}

export function QuoteDisplay({ quotes, enabled }: QuoteDisplayProps) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (enabled && !quote) {
      setQuote(getRandomQuote(quotes));
    }
  }, [enabled, quotes, quote]);

  const handleClick = () => {
    if (!enabled || quotes.length <= 1) return;

    setIsFading(true);
    setTimeout(() => {
      setQuote(getRandomQuote(quotes));
      setIsFading(false);
    }, 300);
  };

  if (!enabled || !quote) return null;

  return (
    <div className="text-center py-4">
      <div
        className={`cursor-pointer transition-opacity duration-300 ${isFading ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClick}
      >
        <p className="text-white/50 italic text-sm">
          "{quote.text}"
        </p>
        {quote.author && (
          <p className="text-white/30 text-xs mt-1">— {quote.author}</p>
        )}
      </div>
    </div>
  );
}
