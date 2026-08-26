import React, { useState, useRef, useEffect } from 'react';

interface TagTooltipProps {
  content?: string | null;
  interactiveContent?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const TagTooltip: React.FC<TagTooltipProps> = ({
  content,
  interactiveContent,
  children,
  className,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!content && !interactiveContent) {
    return <>{children}</>;
  }

  const handleToggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`tag-tooltip-container ${className || ''}`}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', ...style }}
      onClick={handleToggle}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => {
        if (!interactiveContent) {
          setIsOpen(false);
        }
      }}
      title={typeof content === 'string' ? content : undefined}
    >
      {children}
      {isOpen && (
        <div
          className="tag-tooltip-bubble"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1200,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minWidth: '220px',
            maxWidth: 'min(88vw, 300px)',
            whiteSpace: 'normal',
            pointerEvents: 'auto',
          }}
        >
          {content && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 600, lineHeight: 1.35, textAlign: 'center' }}>
              {content}
            </div>
          )}
          {interactiveContent && (
            <div
              style={{
                borderTop: content ? '1px solid var(--border-subtle)' : 'none',
                paddingTop: content ? '8px' : '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {interactiveContent}
            </div>
          )}
          <div className="tag-tooltip-arrow" />
        </div>
      )}
    </div>
  );
};
