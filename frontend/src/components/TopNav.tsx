import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TopNavProps {
  title: string;
}

export function TopNav({ title }: TopNavProps) {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-outline-variant bg-surface/50 backdrop-blur-md flex items-center justify-between px-8">
      <div className="flex items-center gap-4 text-xs font-mono">
        <span className="text-outline">ROOT</span>
        <span className="text-outline">/</span>
        <span className="text-primary uppercase">{title.replace(' ', '_')}</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span>{time}</span>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs font-medium text-on-surface">Sector 7G-Alpha</p>
          <p className="text-[10px] text-outline font-mono">STABILITY: 99.84%</p>
        </div>
        <div className="w-8 h-8 rounded-full border border-primary/30 bg-surface-container-high flex items-center justify-center text-on-surface text-[12px] font-bold">
          JD
        </div>
      </div>
    </header>
  );
}
