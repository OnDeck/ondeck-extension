import { useEffect, useRef, useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
}

export function SearchOverlay({ isOpen, onClose, onSearch }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    onSearch(query);
  }, [query, onSearch]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '60px 16px',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--tg-bg1)',
          border: '1px solid var(--tg-line)',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: 12 }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notifications..."
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 14,
              fontFamily: 'var(--tg-sans)',
              color: 'var(--tg-fg0)',
              background: 'var(--tg-bg0)',
              border: '1px solid var(--tg-line)',
              borderRadius: 6,
              outline: 'none',
            }}
          />
        </div>

        {query && (
          <div
            style={{
              padding: '8px 12px',
              fontSize: 11,
              color: 'var(--tg-fg3)',
              fontFamily: 'var(--tg-mono)',
              borderTop: '1px solid var(--tg-line)',
            }}
          >
            Press <kbd style={{
              padding: '2px 6px',
              background: 'var(--tg-bg3)',
              borderRadius: 3,
              fontSize: 10,
            }}>ESC</kbd> to close
          </div>
        )}
      </div>
    </div>
  );
}
