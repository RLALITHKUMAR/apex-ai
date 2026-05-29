import { motion } from 'motion/react';
import { ReactNode } from 'react';

interface MetricProps {
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  alert?: boolean;
  icon: ReactNode;
  colorClass: string;
}

export function MetricCard({ label, value, trend, trendUp, alert, icon, colorClass }: MetricProps) {
  return (
    <div className={`silk-card p-5 rounded-xl border-l-2 ${colorClass} relative overflow-hidden group`}>
      <p className="font-mono text-[11px] uppercase tracking-wider text-on-surface-variant opacity-80 mb-sm">
        {label}
      </p>
      
      <div className="flex items-baseline gap-2">
        <span className="font-display text-[40px] font-semibold tracking-tight text-on-surface">
          {value}
        </span>
        
        {trend && (
          <span className={`font-mono text-[12px] ${trendUp ? 'text-secondary' : 'text-tertiary'}`}>
            {trendUp ? '+' : ''}{trend}
          </span>
        )}
        
        {alert && (
          <motion.span 
            className="font-mono text-[12px] text-error font-medium"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ACTION REQUIRED
          </motion.span>
        )}
      </div>
      
      <div className="absolute -right-4 -bottom-4 opacity-5 text-on-surface group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">
        <div className="w-24 h-24 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}
