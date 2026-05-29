/**
 * AnalyzerAndLogs.tsx
 * SurfaceAnalyzerView — wired to POST /api/detect-crack
 * InspectionLogsView  — wired to GET /api/inspection-history + DELETE
 */

import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  UploadCloud, MapPin, Activity, Download, Settings, Box,
  ZoomIn, RefreshCw, X, Search, ChevronDown, ExternalLink,
  ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Trash2
} from 'lucide-react';
import { detectFromUpload, fetchHistory, deleteInspection, getReportUrl } from '../api';
import { Inspection, DetectionResult } from '../types';

interface AnalyzerProps {
  apiOnline: boolean;
  modelReady: boolean;
}

// ─── Surface Analyzer ─────────────────────────────────────────────────────────
export function SurfaceAnalyzerView({ apiOnline, modelReady }: AnalyzerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [locationTag, setLocationTag] = useState('Abutment Wall Floor 2');
  const [notes, setNotes] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }
  };

  const handleFile = (f: File) => {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleFile(f);
  }, []);

  const onAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);

    const steps = [
      'Equalizing Histogram (CLAHE)...',
      'Applying Edge Bilateral Filters...',
      'Evaluating CNN Severity Metrics...',
      'Generating Grad-CAM Activation Map...',
    ];
    let i = 0;
    setProgressMsg(steps[0]);
    const stepTimer = setInterval(() => {
      i++;
      if (i < steps.length) setProgressMsg(steps[i]);
    }, 500);

    try {
      const data = await detectFromUpload(file, locationTag, notes);
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      clearInterval(stepTimer);
      setAnalyzing(false);
    }
  };

  const sevColor = (s: string) => {
    if (!s) return '';
    const sl = s.toLowerCase();
    if (sl.includes('severe') || sl.includes('critical')) return 'text-error';
    if (sl.includes('moderate')) return 'text-tertiary';
    if (sl.includes('minor')) return 'text-primary';
    return 'text-secondary';
  };

  return (
    <motion.div
      className="max-w-[1400px] mx-auto p-margin-desktop w-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="grid grid-cols-12 gap-gutter">
        {/* Left: Upload Bay */}
        <motion.section variants={itemVariants} className="col-span-12 lg:col-span-6 flex flex-col gap-gutter">
          <div className="silk-card p-xl rounded-xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-xl font-medium tracking-tight text-on-surface">Upload Bay</h2>
              <span className="font-mono text-[10px] tracking-widest text-outline bg-surface-container-high px-2 py-1 rounded uppercase">
                MODULE_02
              </span>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`w-full h-[280px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 bg-surface-container-lowest/50 hover:bg-surface-container-lowest hover:border-primary/40 transition-all duration-300 group cursor-pointer ${dragging ? 'border-primary/60 bg-primary/5' : 'border-outline-variant/40'}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/bmp"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-[240px] max-w-full rounded-lg object-contain border border-outline-variant/40"
                />
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <UploadCloud className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-on-surface">Drop high-res scan or image here</p>
                    <p className="text-sm text-on-surface-variant mt-1">Supports JPG, PNG, WEBP, BMP up to 16MB</p>
                  </div>
                </>
              )}
            </div>

            {/* Form */}
            <div className="mt-8 space-y-6">
              <div className="space-y-2">
                <label className="font-mono text-[11px] text-outline uppercase tracking-widest">Location Tag</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                  <input
                    type="text"
                    value={locationTag}
                    onChange={e => setLocationTag(e.target.value)}
                    placeholder="e.g. Sector 7G, Support Column 12"
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg pl-12 pr-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="font-mono text-[11px] text-outline uppercase tracking-widest">Inspector Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Describe visible anomalies or scan conditions..."
                  rows={4}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-4 py-3 text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all resize-none"
                />
              </div>

              {error && (
                <div className="p-3 bg-error-container/20 border border-error/30 rounded-lg">
                  <p className="text-error text-sm font-mono">{error}</p>
                </div>
              )}

              <button
                onClick={onAnalyze}
                disabled={!file || analyzing || !apiOnline}
                className="w-full py-4 bg-primary-container text-on-primary-container font-medium rounded-lg hover:brightness-110 active:scale-[0.98] transition-all duration-300 shadow-lg shadow-primary-container/10 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin-slow" />
                    <span className="tracking-wide text-[13px]">{progressMsg}</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-5 h-5" />
                    <span className="tracking-wide uppercase font-bold text-[13px]">
                      {!apiOnline ? 'Backend Offline' : !modelReady ? 'Model Not Ready' : 'Analyze Structure'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.section>

        {/* Right: Analysis Results */}
        <motion.section variants={itemVariants} className="col-span-12 lg:col-span-6 flex flex-col gap-gutter">
          <div className="silk-card p-xl rounded-xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-xl font-medium tracking-tight text-on-surface">Analysis Results</h2>
              <div className="flex gap-2">
                {result?.inspection_id && (
                  <a
                    href={getReportUrl(result.inspection_id)}
                    className="p-2 hover:bg-surface-container-high rounded transition-colors"
                    title="Download Report"
                  >
                    <Download className="w-5 h-5 text-outline" />
                  </a>
                )}
                <button className="p-2 hover:bg-surface-container-high rounded transition-colors" title="Settings">
                  <Settings className="w-5 h-5 text-outline" />
                </button>
              </div>
            </div>

            {result ? (
              <div className="flex flex-col gap-6 flex-1">
                {/* Image comparison */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <span className="font-mono text-[10px] text-outline uppercase tracking-widest">Original</span>
                    <img src={result.original_image} alt="Original" className="w-full aspect-square object-cover rounded-lg border border-outline-variant/40" />
                  </div>
                  <div className="space-y-2">
                    <span className="font-mono text-[10px] text-outline uppercase tracking-widest">
                      {result.gradcam_applied ? 'Grad-CAM Heatmap' : 'AI Annotated'}
                    </span>
                    <img src={result.annotated_image} alt="Annotated" className="w-full aspect-square object-cover rounded-lg border border-outline-variant/40" />
                  </div>
                </div>

                {/* Severity */}
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
                  <span className="font-mono text-[11px] text-outline uppercase tracking-widest">Surface Condition</span>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-sm font-bold uppercase ${sevColor(result.severity)}`}>{result.severity}</span>
                    {!result.crack_detected && <CheckCircle className="w-4 h-4 text-secondary" />}
                  </div>
                </div>

                {/* Confidence */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-on-surface-variant">AI Confidence</span>
                    <span className="text-primary">{(result.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${result.confidence * 100}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-lg p-4">
                    <span className="font-mono text-[10px] text-outline uppercase tracking-widest block mb-1">Crack Area</span>
                    <span className="font-display text-2xl font-semibold text-on-surface">{result.crack_area_pct}%</span>
                  </div>
                  <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-lg p-4">
                    <span className="font-mono text-[10px] text-outline uppercase tracking-widest block mb-1">Urgency</span>
                    <span className="font-mono text-sm font-bold uppercase" style={{ color: result.color_hex }}>
                      {result.urgency || 'Routine'}
                    </span>
                  </div>
                </div>

                {/* Recommendation */}
                <div className="p-4 rounded-lg border-l-2 bg-surface-container-lowest/50" style={{ borderColor: result.color_hex }}>
                  <h4 className="font-mono text-[10px] uppercase tracking-widest text-outline mb-2">Remediation Strategy</h4>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{result.recommendation}</p>
                </div>

                {/* Download */}
                <a
                  href={getReportUrl(result.inspection_id)}
                  className="flex items-center justify-center gap-2 py-3.5 bg-primary-container text-on-primary-container rounded-lg hover:brightness-110 transition-all text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download Engineering Report (PDF)
                </a>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                  <div className="relative w-24 h-24 rounded-full border border-outline-variant/30 flex items-center justify-center bg-surface-container-low">
                    <Activity className="w-10 h-10 text-outline-variant" strokeWidth={1} />
                  </div>
                </div>
                <h3 className="font-display text-2xl font-medium text-on-surface mb-2 tracking-tight">No results yet</h3>
                <p className="text-on-surface-variant max-w-[280px] leading-relaxed">
                  {!apiOnline
                    ? 'Start the Flask backend (python -m backend.app) then upload a scan.'
                    : !modelReady
                    ? 'Train the model first: python ai_training/train.py'
                    : 'Upload a structural scan in the left panel to begin the deep neural analysis.'}
                </p>
              </div>
            )}
          </div>
        </motion.section>

        {/* Footer Stats Row */}
        <motion.div variants={itemVariants} className="col-span-12 silk-card p-6 rounded-xl flex flex-wrap items-center justify-between gap-8 mt-4">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-outline uppercase tracking-widest">GPU ACCEL:</span>
              <span className="text-secondary font-mono text-sm">ACTIVE</span>
            </div>
            <div className="w-[1px] h-4 bg-outline-variant/40" />
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-outline uppercase tracking-widest">MODEL:</span>
              <span className="text-on-surface font-mono text-sm">CRACK-CNN-V4</span>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <span className="text-sm text-on-surface-variant">
              {result ? `Last scan: ${new Date().toLocaleTimeString()}` : 'No recent scan'}
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Inspection Logs ──────────────────────────────────────────────────────────
export function InspectionLogsView() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [selectedLog, setSelectedLog] = useState<Inspection | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchHistory(500, 0);
      setInspections(data.inspections || []);
    } catch {
      setInspections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const onDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this inspection record?')) return;
    await deleteInspection(id);
    setInspections(prev => prev.filter(i => i.id !== id));
    if (selectedLog?.id === id) setSelectedLog(null);
  };

  const filtered = inspections.filter(i => {
    const matchSearch =
      i.id.toLowerCase().includes(search.toLowerCase()) ||
      (i.location_tag || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.source || '').toLowerCase().includes(search.toLowerCase());
    const matchSev = filterSeverity === 'all' || (i.severity || '').toLowerCase() === filterSeverity.toLowerCase();
    return matchSearch && matchSev;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const severityClass = (s: string) => {
    const sl = (s || '').toLowerCase();
    if (sl.includes('severe') || sl.includes('critical')) return { row: 'bg-error-container text-on-error-container', dot: 'bg-error' };
    if (sl.includes('moderate')) return { row: 'bg-tertiary-container text-on-tertiary-container', dot: 'bg-tertiary' };
    if (sl.includes('minor')) return { row: 'bg-primary-container/30 text-primary', dot: 'bg-primary' };
    return { row: 'bg-secondary-container text-on-secondary-container', dot: 'bg-secondary' };
  };

  return (
    <div className="relative h-[calc(100vh-64px)] overflow-hidden">
      <div className="h-full overflow-y-auto silk-scroll p-margin-desktop w-full max-w-[1400px] mx-auto space-y-8 pb-32">

        {/* Filters */}
        <section className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by ID, location or source..."
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg py-3 pl-12 pr-4 text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary transition-all"
            />
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative min-w-[180px]">
              <select
                value={filterSeverity}
                onChange={e => { setFilterSeverity(e.target.value); setPage(1); }}
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant/40 rounded-lg py-3 pl-4 pr-10 text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">All Conditions</option>
                <option value="no crack">No Crack</option>
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant w-5 h-5" />
            </div>
            <button
              onClick={loadHistory}
              className="p-3 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-all"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin-slow' : ''}`} />
            </button>
          </div>
        </section>

        {/* Table */}
        <section className="silk-card rounded-xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <RefreshCw className="w-8 h-8 text-primary animate-spin-slow" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 text-on-surface-variant">
              <Activity className="w-10 h-10 mx-auto mb-4 opacity-30" strokeWidth={1} />
              <p className="font-mono text-sm">No inspection records found.</p>
              <p className="text-xs mt-2 opacity-60">Run an analysis in Live Scanner or Surface Analyzer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-outline-variant/20 bg-surface-container-high/30">
                    <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">ID</th>
                    <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">Date</th>
                    <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">Source</th>
                    <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">Location</th>
                    <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">Condition</th>
                    <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">Crack Area</th>
                    <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant text-right">Actions</th>
                  </tr>
                </thead>
                <motion.tbody
                  className="divide-y divide-outline-variant/10"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {paginated.map(item => {
                    const cls = severityClass(item.severity);
                    return (
                      <motion.tr
                        key={item.id}
                        variants={itemVariants}
                        onClick={() => setSelectedLog(item)}
                        className="hover:bg-surface-container-high/40 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-5 font-mono text-primary/80 group-hover:text-primary text-[13px]">{item.id}</td>
                        <td className="px-6 py-5 text-on-surface-variant text-[14px]">
                          {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-2 py-1 rounded bg-surface-container-highest text-[10px] font-medium tracking-wide uppercase">
                            {item.source || 'upload'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-on-surface text-sm">{item.location_tag || '—'}</td>
                        <td className="px-6 py-5">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium tracking-wide ${cls.row}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cls.dot}`} />
                            {item.severity || 'No Crack'}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-on-surface-variant font-mono text-[13px]">
                          {item.crack_area_pct !== undefined ? `${item.crack_area_pct}%` : '—'}
                        </td>
                        <td className="px-6 py-5 text-right flex items-center justify-end gap-2">
                          <a
                            href={getReportUrl(item.id)}
                            onClick={e => e.stopPropagation()}
                            className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"
                            title="Download Report"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={e => onDelete(item.id, e)}
                            className="p-1.5 text-on-surface-variant hover:text-error transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div className="p-4 border-t border-outline-variant/20 flex items-center justify-between text-on-surface-variant font-mono text-[12px]">
              <span>Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} records</span>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 hover:text-primary transition-colors disabled:opacity-30"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-2 transition-colors ${page === p ? 'text-on-surface font-medium' : 'hover:text-primary'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 hover:text-primary transition-colors disabled:opacity-30"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedLog && (
          <>
            <motion.div
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 pointer-events-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
            />
            <motion.aside
              className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-surface-container-lowest border-l border-outline-variant/40 z-[60] flex flex-col shadow-2xl pointer-events-auto"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="p-8 border-b border-outline-variant/20 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-medium text-on-surface">Inspection Detail</h2>
                  <p className="font-mono text-primary text-[13px] mt-1">{selectedLog.id}</p>
                </div>
                <button
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
                  onClick={() => setSelectedLog(null)}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto silk-scroll p-8 space-y-8">
                {/* Spec Grid */}
                <div className="grid grid-cols-2 gap-6">
                  <SpecItem label="Location" value={selectedLog.location_tag || '—'} />
                  <SpecItem label="Source" value={selectedLog.source || 'upload'} />
                  <SpecItem label="Severity" value={selectedLog.severity || '—'} />
                  <SpecItem label="Crack Area" value={selectedLog.crack_area_pct !== undefined ? `${selectedLog.crack_area_pct}%` : '—'} />
                  <SpecItem label="Confidence" value={selectedLog.confidence !== undefined ? `${(selectedLog.confidence * 100).toFixed(1)}%` : '—'} />
                  <SpecItem label="Date" value={selectedLog.timestamp ? new Date(selectedLog.timestamp).toLocaleString() : '—'} />
                </div>

                {/* Recommendation */}
                {selectedLog.recommendation && (
                  <div className="space-y-3">
                    <h3 className="font-mono text-[11px] text-outline uppercase tracking-widest">Recommendation</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed bg-surface-container-low rounded-lg p-4 border border-outline-variant/20">
                      {selectedLog.recommendation}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {selectedLog.notes && (
                  <div className="space-y-3">
                    <h3 className="font-mono text-[11px] text-outline uppercase tracking-widest">Inspector Notes</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed bg-surface-container-low rounded-lg p-4 border border-outline-variant/20">
                      {selectedLog.notes}
                    </p>
                  </div>
                )}

                {/* Density Chart placeholder */}
                <div className="space-y-4">
                  <h3 className="font-mono text-[11px] text-outline uppercase tracking-widest">Crack Density Indicator</h3>
                  <div className="h-8 bg-surface-container-high rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-error rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(selectedLog.crack_area_pct || 0, 100)}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <p className="font-mono text-[12px] text-on-surface-variant">{selectedLog.crack_area_pct || 0}% surface affected</p>
                </div>

                {/* Actions */}
                <div className="pt-6 flex gap-4">
                  <a
                    href={getReportUrl(selectedLog.id)}
                    className="flex-1 py-3.5 bg-primary-container text-on-primary-container rounded-lg font-medium hover:brightness-110 transition-all text-center text-sm"
                  >
                    Download PDF Report
                  </a>
                  <button
                    onClick={e => { onDelete(selectedLog.id, e); setSelectedLog(null); }}
                    className="px-5 border border-error/40 text-error rounded-lg hover:bg-error-container/20 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <span className="font-mono text-[10px] text-outline uppercase tracking-[0.15em]">{label}</span>
      <p className="text-on-surface font-medium text-sm">{value}</p>
    </div>
  );
}
