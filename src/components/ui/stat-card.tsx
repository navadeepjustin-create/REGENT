import React from 'react';
import { LucideIcon } from 'lucide-react';

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
}

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  trend,
}: StatCardProps) {
  return (
    <div className="regent-card p-5 group hover:border-regent-gold/30 transition-all duration-300">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          {label}
        </span>
        <div className="w-8 h-8 rounded-lg bg-surface-2 group-hover:bg-regent-gold/10 flex items-center justify-center transition-colors">
          <Icon className="w-4 h-4 text-text-muted group-hover:text-regent-gold transition-colors" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl lg:text-3xl font-serif font-semibold text-text-primary">
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-medium ${
              trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {sublabel && (
        <p className="mt-1 text-xs text-text-muted">{sublabel}</p>
      )}
    </div>
  );
}
