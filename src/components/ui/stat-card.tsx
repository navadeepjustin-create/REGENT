import React from 'react';
import { LucideIcon, ArrowRight } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: string;
  isGlowing?: boolean;
}

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  trend,
  isGlowing = false,
}: StatCardProps) {
  return (
    <div
      className={`${
        isGlowing ? 'regent-card-glow' : 'regent-card'
      } p-5 md:p-6 group flex flex-col justify-between h-full min-h-[145px] transition-all duration-300`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="w-8 h-8 rounded-full bg-regent-gold/10 border border-regent-gold/30 group-hover:bg-regent-gold/20 group-hover:border-regent-gold/50 flex items-center justify-center transition-all duration-300 shadow-sm shadow-regent-gold/10 shrink-0">
          <Icon className="w-4 h-4 text-regent-gold transition-colors" />
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted/60 group-hover:text-regent-gold group-hover:translate-x-1 transition-all duration-200" />
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-mono font-medium text-text-muted uppercase tracking-[0.14em] mb-1.5">
          {label}
        </p>

        <div className="flex items-baseline justify-between gap-2">
          <span className="text-3xl lg:text-[2.2rem] font-serif font-normal text-regent-ivory tracking-tight tabular-nums">
            {value}
          </span>
          {trend && (
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                trend.isPositive
                  ? 'bg-emerald-950/35 text-emerald-300 border-emerald-500/25'
                  : 'bg-rose-950/35 text-rose-300 border-rose-500/25'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>

        {sublabel && (
          <p className="mt-1 text-xs text-text-muted font-normal tracking-normal truncate">
            {sublabel}
          </p>
        )}
      </div>
    </div>
  );
}
