import { Quote } from '../types';

export const DEFAULT_QUOTES: Quote[] = [
  {
    id: 'default-1',
    text: 'The secret of getting ahead is getting started.',
    author: 'Mark Twain',
    isDefault: true
  },
  {
    id: 'default-2',
    text: 'Deep work is the ability to focus without distraction on a cognitively demanding task.',
    author: 'Cal Newport',
    isDefault: true
  },
  {
    id: 'default-3',
    text: 'What gets measured gets managed.',
    author: 'Peter Drucker',
    isDefault: true
  },
  {
    id: 'default-4',
    text: 'Discipline equals freedom.',
    author: 'Jocko Willink',
    isDefault: true
  },
  {
    id: 'default-5',
    text: 'The only way to do great work is to love what you do.',
    author: 'Steve Jobs',
    isDefault: true
  },
  {
    id: 'default-6',
    text: 'Focus is a matter of deciding what things you\'re not going to do.',
    author: 'John Carmack',
    isDefault: true
  },
  {
    id: 'default-7',
    text: 'Amateurs sit and wait for inspiration, the rest of us just get up and go to work.',
    author: 'Stephen King',
    isDefault: true
  },
  {
    id: 'default-8',
    text: 'The successful warrior is the average man, with laser-like focus.',
    author: 'Bruce Lee',
    isDefault: true
  },
  {
    id: 'default-9',
    text: 'You don\'t have to be great to start, but you have to start to be great.',
    author: 'Zig Ziglar',
    isDefault: true
  },
  {
    id: 'default-10',
    text: 'Start where you are. Use what you have. Do what you can.',
    author: 'Arthur Ashe',
    isDefault: true
  }
];

export function getRandomQuote(quotes: Quote[]): Quote {
  const enabledQuotes = quotes.length > 0 ? quotes : DEFAULT_QUOTES;
  return enabledQuotes[Math.floor(Math.random() * enabledQuotes.length)];
}
