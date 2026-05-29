import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { ViewType } from './types';
import { AnalyticsView } from './views/Analytics';
import { LiveScannerView } from './views/LiveScanner';
import { SurfaceAnalyzerView, InspectionLogsView } from './views/AnalyzerAndLogs';
import { LabView } from './views/Lab';
import { checkHealth } from './api';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('live');
  const [apiOnline, setApiOnline] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    const pollHealth = async () => {
      try {
        const data = await checkHealth();
        setApiOnline(true);
        setModelReady(!!data.model_ready);
      } catch (err) {
        setApiOnline(false);
        setModelReady(false);
      }
    };

    pollHealth();
    const interval = setInterval(pollHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const viewTitles: Record<ViewType, string> = {
    live: 'Live Scanner',
    analyzer: 'Surface Analyzer',
    logs: 'Inspection Logs',
    analytics: 'Analytics',
    lab: 'Knowledge Lab',
  };

  return (
    <div className="flex w-full h-screen bg-background text-on-surface selection:bg-primary-container/30 overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        apiOnline={apiOnline} 
        modelReady={modelReady} 
      />
      
      <main className="flex-1 flex flex-col h-screen relative bg-background overflow-hidden">
        <TopNav title={viewTitles[currentView]} />
        
        <div className="flex-1 w-full overflow-y-auto silk-scroll">
          {currentView === 'live' && (
            <LiveScannerView apiOnline={apiOnline} modelReady={modelReady} />
          )}
          {currentView === 'analyzer' && (
            <SurfaceAnalyzerView apiOnline={apiOnline} modelReady={modelReady} />
          )}
          {currentView === 'logs' && (
            <InspectionLogsView />
          )}
          {currentView === 'analytics' && (
            <AnalyticsView />
          )}
          {currentView === 'lab' && (
            <LabView />
          )}
        </div>
      </main>
    </div>
  );
}
