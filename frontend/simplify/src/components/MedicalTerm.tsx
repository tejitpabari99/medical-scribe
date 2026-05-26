import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

interface MedicalTermProps {
  term: string;
  definition: string;
  source: string;
}

export default function MedicalTerm({ term, definition, source }: MedicalTermProps) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(current => !current);
      return;
    }

    if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <span
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ position: 'relative', display: 'inline' }}
    >
      <span
        className="medical-term"
        onClick={() => setOpen(current => !current)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={open}
        aria-describedby={open ? popoverId : undefined}
        aria-label={`${term}: ${definition}`}
      >
        {term}
      </span>
      {open && (
        <span id={popoverId} className="medical-term-popover" role="tooltip">
          <span className="medical-term-popover-definition">{definition}</span>
          <span className="medical-term-popover-source">{source}</span>
        </span>
      )}
    </span>
  );
}
