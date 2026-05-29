import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { MetricCard } from '../components/MetricCard';
import { fetchStatistics, fetchHistory, getReportUrl } from '../api';
import { Statistics, Inspection } from '../types';
import { 
  ClipboardCheck, 
  TriangleAlert, 
  ShieldCheck, 
  AlertTriangle,
  MoreHorizontal,
  Settings,
  Download,
  Activity,
  RefreshCw
} from 'lucide-react';

export function AnalyticsView() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [recentAnomalies, setRecentAnomalies] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const statsData = await fetchStatistics();
      setStats(statsData);

      const historyData = await fetchHistory(100, 0);
      const anomalies = (historyData.inspections || []).filter(
        (ins: Inspection) => ins.crack_detected
      ).slice(0, 10);
      setRecentAnomalies(anomalies);
    } catch (e) {
      console.error('Failed to fetch analytics data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <RefreshCw className="w-8 h-8 text-primary animate-spin-slow" />
        <span className="font-mono text-sm text-outline">Loading Engine Statistics...</span>
      </div>
    );
  }

  const total = stats?.total || 0;
  const cracked = stats?.cracked || 0;
  const clean = stats?.clean || 0;
  const severe = stats?.by_severity?.['Severe'] || 0;
  const moderate = stats?.by_severity?.['Moderate'] || 0;
  const minor = stats?.by_severity?.['Minor'] || 0;
  const noCrack = stats?.by_severity?.['No Crack'] || 0;

  const crackedPct = total > 0 ? ((cracked / total) * 100).toFixed(1) : '0';
  const cleanPct = total > 0 ? ((clean / total) * 100).toFixed(1) : '0';
  const severePct = total > 0 ? ((severe / total) * 100).toFixed(1) : '0';
  const moderatePct = total > 0 ? ((moderate / total) * 100).toFixed(1) : '0';
  const minorPct = total > 0 ? ((minor / total) * 100).toFixed(1) : '0';
  const noCrackPct = total > 0 ? ((noCrack / total) * 100).toFixed(1) : '0';

  return (
    <motion.div 
      className="p-margin-desktop max-w-[1400px] mx-auto w-full space-y-xl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-tight text-on-surface">Diagnostics Dashboard</h2>
          <p className="text-on-surface-variant text-sm mt-1">Real-time aggregate overview of structural health reports.</p>
        </div>
        <button 
          onClick={loadData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 border border-outline-variant/60 text-on-surface rounded-lg font-medium hover:bg-surface-container-high transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin-slow' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* Metrics Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <MetricCard 
          label="Total Audits Logged" value={total.toLocaleString()} 
          colorClass="border-l-primary-container"
          icon={<ClipboardCheck className="w-full h-full" />}
        />
        <MetricCard 
          label="Cracked Anomalies" value={`${cracked.toLocaleString()} (${crackedPct}%)`} 
          colorClass="border-l-tertiary"
          icon={<TriangleAlert className="w-full h-full" />}
        />
        <MetricCard 
          label="Optimal Structs" value={`${clean.toLocaleString()} (${cleanPct}%)`} 
          colorClass="border-l-secondary"
          icon={<ShieldCheck className="w-full h-full" />}
        />
        <MetricCard 
          label="Severe Criticals" value={severe.toLocaleString()} alert={severe > 0}
          colorClass="border-l-error-container"
          icon={<AlertTriangle className="w-full h-full" />}
        />
      </motion.div>

      {/* Main Analysis Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-gutter h-auto">
        
        {/* Left: Distribution */}
        <div className="lg:col-span-8 silk-card rounded-xl p-xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-xl">
            <h3 className="font-display text-xl text-on-surface font-medium tracking-tight">Condition Distribution</h3>
            <button className="text-outline hover:text-primary transition-colors p-1">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-6 flex-1 flex flex-col justify-center">
            <DistRow label="Severe Degradation" value={`${severe} audits (${severePct}%)`} colorClass="bg-error-container shadow-[0_0_12px_rgba(255,84,97,0.3)]" width={`${severePct}%`} />
            <DistRow label="Moderate Anomalies" value={`${moderate} audits (${moderatePct}%)`} colorClass="bg-tertiary shadow-[0_0_12px_rgba(234,195,62,0.3)]" width={`${moderatePct}%`} />
            <DistRow label="Minor Degradation" value={`${minor} audits (${minorPct}%)`} colorClass="bg-primary-container shadow-[0_0_12px_rgba(167,139,250,0.3)]" width={`${minorPct}%`} />
            <DistRow label="Optimal/No Cracks" value={`${noCrack} audits (${noCrackPct}%)`} colorClass="bg-secondary shadow-[0_0_12px_rgba(98,220,173,0.3)]" width={`${noCrackPct}%`} />
          </div>
        </div>

        {/* Right: System Config */}
        <div className="lg:col-span-4 silk-card rounded-xl p-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-5 h-5 text-primary" />
              <h3 className="font-display text-xl text-on-surface font-medium tracking-tight">System Specification</h3>
            </div>
            
            <div className="space-y-4">
               <ConfigRow label="AI Tensor Layout" value="[1, 224, 224, 3]" valueColor="text-primary" />
               <ConfigRow label="Classifier Target" value="Softmax Classifier" valueColor="text-primary" />
               <ConfigRow label="Active Back-end" value="Flask + SQLite" />
               <ConfigRow label="Pipeline Preprocess" value="CLAHE + Bilateral" valueColor="text-secondary" />
               <ConfigRow label="Explainability Model" value="Grad-CAM" />
               <ConfigRow label="Diagnostics Core" value="TensorFlow/Keras" valueColor="text-primary" />
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-outline-variant/20 flex items-center justify-between text-xs font-mono text-outline">
            <span>ENGINE STATUS</span>
            <span className="text-secondary font-bold">ONLINE</span>
          </div>
        </div>
      </motion.div>

      {/* Anomalies Table */}
      <motion.div variants={itemVariants} className="silk-card rounded-xl overflow-hidden">
        <div className="p-xl border-b border-outline-variant/30 flex justify-between items-center">
          <div>
            <h4 className="font-display text-xl font-medium tracking-tight">Recent Fissure Logs</h4>
            <p className="text-xs text-on-surface-variant mt-1">Real-time anomalies logged from scanner and photo analyzer.</p>
          </div>
          <button 
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container rounded-lg text-sm font-medium hover:brightness-110 transition-all"
          >
            <Activity className="w-4 h-4 animate-pulse" />
            Active Sync
          </button>
        </div>
        
        <div className="overflow-x-auto">
          {recentAnomalies.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-lowest font-mono text-[11px] uppercase tracking-wider text-outline">
                <tr>
                  <th className="px-xl py-4 font-normal">Timestamp</th>
                  <th className="px-xl py-4 font-normal">Inspection ID</th>
                  <th className="px-xl py-4 font-normal">Location Tag</th>
                  <th className="px-xl py-4 font-normal">Affected Surface</th>
                  <th className="px-xl py-4 font-normal">Severity Status</th>
                  <th className="px-xl py-4 font-normal text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-mono text-[13px]">
                {recentAnomalies.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-xl py-4 text-on-surface-variant">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="px-xl py-4 text-primary font-medium">{item.id}</td>
                    <td className="px-xl py-4 text-on-surface">{item.location_tag || 'N/A'}</td>
                    <td className="px-xl py-4 text-outline">{item.crack_area_pct}% area</td>
                    <td className="px-xl py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wider uppercase
                        ${(item.severity || '').toLowerCase() === 'severe' ? 'bg-error-container/20 text-error' : ''}
                        ${(item.severity || '').toLowerCase() === 'moderate' ? 'bg-tertiary-container/30 text-tertiary' : ''}
                        ${(item.severity || '').toLowerCase() === 'minor' ? 'bg-primary-container/20 text-primary' : ''}
                        ${(item.severity || '').toLowerCase() === 'no crack' ? 'bg-secondary-container/30 text-secondary' : ''}
                      `}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="px-xl py-4 text-right">
                      <a 
                        href={getReportUrl(item.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant/40 rounded text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-on-surface-variant font-mono text-sm">
              No structural crack anomalies logged in database yet.
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function DistRow({ label, value, colorClass, width }: { label: string, value: string, colorClass: string, width: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between font-mono text-[11px] tracking-wider">
        <span className="text-on-surface-variant uppercase">{label}</span>
        <span className="text-on-surface">{value}</span>
      </div>
      <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
        <motion.div 
          className={`h-full rounded-full ${colorClass}`}
          initial={{ width: 0 }}
          animate={{ width }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
        />
      </div>
    </div>
  );
}

function ConfigRow({ label, value, valueColor = "text-on-surface" }: { label: string, value: string, valueColor?: string }) {
  return (
    <div className="flex justify-between border-b border-outline-variant/20 pb-3">
      <span className="font-mono text-[12px] text-on-surface-variant">{label}</span>
      <span className={`font-mono text-[12px] ${valueColor}`}>{value}</span>
    </div>
  );
}
