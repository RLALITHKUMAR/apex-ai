import { Activity, BoxSelect, BookOpen, ScrollText, LineChart, ChevronRight } from 'lucide-react';
import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  apiOnline: boolean;
  modelReady: boolean;
}

export function Sidebar({ currentView, onNavigate, apiOnline, modelReady }: SidebarProps) {
  const navItems = [
    { id: 'live' as ViewType, label: 'Live Scanner', icon: Activity },
    { id: 'analyzer' as ViewType, label: 'Surface Analyzer', icon: BoxSelect },
    { id: 'logs' as ViewType, label: 'Inspection Logs', icon: ScrollText },
    { id: 'analytics' as ViewType, label: 'Analytics', icon: LineChart },
    { id: 'lab' as ViewType, label: 'Knowledge Lab', icon: BookOpen },
  ];

  return (
    <aside className="h-full w-[240px] shrink-0 bg-surface border-r border-outline-variant flex flex-col z-50">
      <div className="flex items-center gap-3 p-6 mb-2">
        <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
          <BoxSelect className="w-5 h-5 text-background" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-on-surface leading-none font-display">APEX</h1>
          <p className="text-[10px] uppercase tracking-widest text-outline mt-1 font-mono">Structural Intelligence</p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 relative">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                isActive 
                  ? 'bg-surface-container-high text-primary' 
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto p-4 border-t border-outline-variant">
        <button className="w-full flex items-center justify-between px-3 py-3 bg-surface border border-outline-variant rounded-lg hover:border-primary/50 transition-colors group">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-secondary animate-pulse shadow-[0_0_8px_rgba(98,220,173,0.6)]' : 'bg-error-container'}`} />
            <div className="text-left">
              <span className="font-mono text-[11px] text-on-surface-variant group-hover:text-on-surface transition-colors block">
                {apiOnline ? (modelReady ? 'Engine Online' : 'Loading Model') : 'Engine Offline'}
              </span>
              {apiOnline && (
                <span className="font-mono text-[9px] text-outline block">
                  {modelReady ? 'CNN Ready' : 'Training required'}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-on-surface-variant" />
        </button>
      </div>
    </aside>
  );
}
