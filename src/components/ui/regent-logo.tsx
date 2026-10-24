'use client';

import React from 'react';

interface RegentLogoProps {
  variant?: 'full' | 'monogram' | 'wordmark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: { wordmark: 'text-lg', monogram: 28, full: 'text-lg' },
  md: { wordmark: 'text-xl', monogram: 36, full: 'text-xl' },
  lg: { wordmark: 'text-2xl', monogram: 44, full: 'text-2xl' },
  xl: { wordmark: 'text-4xl', monogram: 56, full: 'text-4xl' },
};

function RegentWordmark({ textSize, className = '' }: { textSize: string; className?: string }) {
  return (
    <span
      className={`${textSize} font-light tracking-[0.2em] text-regent-ivory select-none ${className}`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      R<span className="text-regent-gold">E</span>GENT
    </span>
  );
}

export function RegentLogo({ variant = 'full', size = 'md', className = '' }: RegentLogoProps) {
  const s = sizeMap[size];

  if (variant === 'monogram') {
    return (
      <svg
        width={s.monogram}
        height={s.monogram}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="REGENT monogram"
      >
        <rect width="48" height="48" rx="10" fill="#111210" stroke="#302F29" strokeWidth="1" />
        <path
          d="M14 12h12a8 8 0 0 1 8 8v0a8 8 0 0 1-8 8h-4l10 8"
          stroke="#C2A878"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <line x1="14" y1="12" x2="14" y2="36" stroke="#C2A878" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === 'wordmark') {
    return <RegentWordmark textSize={s.wordmark} className={className} />;
  }

  // Full logo = monogram + wordmark
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={s.monogram}
        height={s.monogram}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="REGENT monogram"
      >
        <rect width="48" height="48" rx="10" fill="#111210" stroke="#302F29" strokeWidth="1" />
        <path
          d="M14 12h12a8 8 0 0 1 8 8v0a8 8 0 0 1-8 8h-4l10 8"
          stroke="#C2A878"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <line x1="14" y1="12" x2="14" y2="36" stroke="#C2A878" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <RegentWordmark textSize={s.wordmark} />
    </div>
  );
}
