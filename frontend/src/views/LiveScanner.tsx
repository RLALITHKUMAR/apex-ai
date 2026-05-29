/**
 * LiveScanner.tsx — Real-time webcam crack detection view.
 * Wired to POST /api/camera/detect with base64 frames.
 */

import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import {
  Camera, Play, Square, Lock, MoreVertical, Info,
  RefreshCw, Download, AlertTriangle, CheckCircle, Zap
} from 'lucide-react';
import { detectFromCamera, getReportUrl } from '../api';
import { CameraDetectionResult } from '../types';

interface LiveScannerProps {
  apiOnline: boolean;
  modelReady: boolean;
}

export function LiveScannerView({ apiOnline, modelReady }: LiveScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [result, setResult] = useState<CameraDetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [location, setLocation] = useState('Pillar Sector B-4');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [logCount, setLogCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const autoScanTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } }
  };

  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setScanning(true);
    } catch (e: any) {
      setError('Camera access denied: ' + e.message);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setScanning(false);
    setStream(null);
    setAutoScan(false);
    if (autoScanTimer.current) clearInterval(autoScanTimer.current);
  };

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach(t => t.stop());
      if (autoScanTimer.current) clearInterval(autoScanTimer.current);
    };
  }, [stream]);

  useEffect(() => {
    if (autoScan && scanning) {
      autoScanTimer.current = setInterval(captureAndAnalyze, 2500);
    } else {
      if (autoScanTimer.current) clearInterval(autoScanTimer.current);
    }
    return () => { if (autoScanTimer.current) clearInterval(autoScanTimer.current); };
  }, [autoScan, scanning]);

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || loading) return;
    setLoading(true);
    setError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    try {
      const data = await detectFromCamera(base64, true, location, notes || 'Live Feed Scan');
      setResult(data);
      setLogCount(c => c + 1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const severityColor = (s: string) => {
    if (!s) return 'text-on-surface-variant';
    const sl = s.toLowerCase();
    if (sl.includes('severe') || sl.includes('critical')) return 'text-error';
    if (sl.includes('moderate')) return 'text-tertiary';
    if (sl.includes('minor')) return 'text-primary';
    return 'text-secondary';
  };

  return (
    <motion.div
      className="p-margin-desktop max-w-[1400px] mx-auto w-full flex-1 flex flex-col"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start flex-1">

        {/* Left: Live Feed */}
        <motion.section variants={itemVariants} className="col-span-12 lg:col-span-7 space-y-gutter">
          <div className="silk-card rounded-xl overflow-hidden flex flex-col">
            {/* Shimmer top border */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary-container/30 to-transparent relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-primary/40"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </div>

            <div className="p-xl flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-medium text-on-surface flex items-center gap-3">
                  Live Audit Feed
                  {scanning && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/20 text-secondary text-[10px] font-mono uppercase tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                      Active
                    </span>
                  )}
                </h2>
                <p className="text-on-surface-variant text-sm mt-1">Neural evaluation in real-time structural analysis.</p>
              </div>
              {!scanning ? (
                <button
                  onClick={startCamera}
                  disabled={!apiOnline}
                  className="flex items-center gap-2 px-4 py-2 border border-primary-container/60 text-primary-container rounded-lg font-medium hover:bg-primary-container/10 transition-colors group disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                  Start Stream
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="flex items-center gap-2 px-4 py-2 border border-error-container/60 text-error rounded-lg font-medium hover:bg-error-container/10 transition-colors"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop Stream
                </button>
              )}
            </div>

            <div className="px-xl pb-xl flex-1">
              <div className="aspect-video bg-surface-container-lowest border border-outline-variant/30 rounded-lg relative flex flex-col items-center justify-center overflow-hidden group">
                {/* Grid Background */}
                <div
                  className="absolute inset-0 opacity-[0.03] pointer-events-none"
                  style={{ backgroundImage: 'radial-gradient(circle at center, #A78BFA 1px, transparent 1px)', backgroundSize: '24px 24px' }}
                />

                {/* Scanning Line */}
                {scanning && <div className="absolute left-0 w-full h-[1px] bg-primary shadow-[0_0_15px_2px_rgba(167,139,250,0.5)] animate-scanline" />}

                {/* Video element */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ display: scanning ? 'block' : 'none' }}
                />

                {/* Offline state */}
                {!scanning && (
                  <>
                    <Camera className="w-12 h-12 text-on-surface-variant/20 mb-4 group-hover:scale-110 transition-transform duration-500" strokeWidth={1} />
                    <p className="font-mono text-on-surface-variant/40 uppercase tracking-[0.2em] text-[12px]">Feed Offline</p>
                    {error && (
                      <p className="text-error text-xs mt-3 px-4 text-center font-mono">{error}</p>
                    )}
                  </>
                )}

                {/* Corner Decorators */}
                <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-primary/40" />
                <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-primary/40" />
                <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-primary/40" />
                <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-primary/40" />

                {/* Loading overlay */}
                {loading && (
                  <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin-slow" />
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Controls when scanning */}
            {scanning && (
              <div className="px-xl pb-xl flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[180px]">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-outline mb-1 block">Location Tag</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-outline mb-1 block">Inspector Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Describe conditions..."
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={captureAndAnalyze}
                    disabled={loading || !modelReady}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container rounded-lg text-sm font-medium hover:brightness-110 transition-all disabled:opacity-40"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin-slow" /> : <Zap className="w-4 h-4" />}
                    Capture
                  </button>
                  <button
                    onClick={() => setAutoScan(!autoScan)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${autoScan ? 'bg-error-container text-on-error-container hover:brightness-110' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-high'}`}
                  >
                    {autoScan ? 'Stop Auto' : 'Auto Pilot'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Telemetry Row */}
          <div className="grid grid-cols-3 gap-gutter">
            <TelemetryCard label="CPU LOAD" value="24.2%" progress={24.2} colorClass="bg-primary" />
            <TelemetryCard label="NEURAL TEMP" value="38°C" progress={38} colorClass="bg-secondary" />
            <TelemetryCard label="MEMORY" value="1.2GB" progress={15} colorClass="bg-tertiary" />
          </div>
        </motion.section>

        {/* Right: Diagnostic Output */}
        <motion.section variants={itemVariants} className="col-span-12 lg:col-span-5 h-[calc(100vh-140px)]">
          <div className="silk-card rounded-xl h-full flex flex-col">
            <div className="p-xl border-b border-outline-variant/20 flex items-center justify-between">
              <h2 className="font-display text-xl text-on-surface tracking-tight font-medium">Diagnostic Output</h2>
              <button className="text-outline hover:text-on-surface transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto silk-scroll p-xl">
              {result ? (
                <div className="flex flex-col gap-5">
                  {/* Annotated Image */}
                  <div className="rounded-lg overflow-hidden border border-outline-variant/30">
                    <img src={result.annotated_image} alt="AI Detection" className="w-full object-cover" />
                  </div>

                  {/* Severity badge */}
                  <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
                    <span className="text-sm text-on-surface-variant font-mono">Structural Status</span>
                    <span className={`font-mono text-sm font-bold uppercase ${severityColor(result.severity)}`}>
                      {result.severity}
                    </span>
                  </div>

                  {/* Confidence bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-mono text-on-surface-variant">
                      <span>AI Confidence</span>
                      <span className="text-primary">{(result.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${result.confidence * 100}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>

                  {/* Crack area & urgency */}
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
                    <h4 className="font-mono text-[10px] uppercase tracking-widest text-outline mb-2">Recommendation</h4>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{result.recommendation}</p>
                  </div>

                  {/* Download report */}
                  {result.inspection_id && (
                    <a
                      href={getReportUrl(result.inspection_id)}
                      className="flex items-center justify-center gap-2 py-3 border border-outline-variant text-on-surface-variant rounded-lg hover:bg-surface-container-high hover:text-on-surface transition-all text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF Report
                    </a>
                  )}

                  {/* Not detected */}
                  {!result.crack_detected && (
                    <div className="flex items-center gap-3 p-4 bg-secondary-container/10 border border-secondary/20 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-secondary shrink-0" />
                      <span className="text-sm text-secondary">No cracks detected in this frame</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                  <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-6">
                    <Info className="w-8 h-8 text-on-surface-variant opacity-40 animate-pulse" />
                  </div>
                  <h3 className="font-display text-xl font-medium text-on-surface mb-3 tracking-tight">Awaiting capture...</h3>
                  <p className="text-on-surface-variant text-sm max-w-xs mx-auto leading-relaxed">
                    {!apiOnline
                      ? 'Backend offline. Start the Flask server first.'
                      : !modelReady
                      ? 'Model not trained yet. Run ai_training/train.py first.'
                      : 'Start stream and click Capture to begin neural analysis.'}
                  </p>

                  {(!apiOnline || !modelReady) && (
                    <div className="mt-6 p-4 bg-tertiary-container/10 border border-tertiary/20 rounded-lg text-left max-w-xs">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-tertiary shrink-0" />
                        <span className="font-mono text-[11px] text-tertiary uppercase tracking-wider">Setup Required</span>
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        {!apiOnline
                          ? 'Run: python -m backend.app'
                          : 'Run: python ai_training/train.py'}
                      </p>
                    </div>
                  )}

                  {/* Shimmer placeholders */}
                  <div className="mt-12 w-full space-y-4 opacity-30 select-none">
                    {[70, 50, 80].map((w, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-surface-container-low rounded-lg border border-outline-variant/10">
                        <div className="w-10 h-10 rounded bg-surface-container-high" />
                        <div className="flex-1 space-y-3">
                          <div className="h-2 bg-surface-container-high rounded" style={{ width: `${w}%` }} />
                          <div className="h-2 bg-surface-container-high rounded" style={{ width: `${w - 20}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-outline-variant/20 bg-surface-container-lowest/50 mt-auto">
              <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant opacity-60 uppercase tracking-widest">
                <span>Session: AX-4402</span>
                <span>Logs: {logCount}</span>
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Bottom Stats */}
      <motion.div variants={itemVariants} className="mt-gutter flex flex-wrap gap-margin-desktop bg-surface/50 border border-outline-variant/30 rounded-xl p-xl glass-panel">
        <StatCol label="NODE CLUSTER" value="APEX-CENTRAL-01" valueColor="text-primary" />
        <StatCol label="UPTIME" value="14d 02h 11m" />
        <StatCol label="ACTIVE AGENTS" value="32" />
        <div className="flex flex-col gap-1 ml-auto text-right">
          <span className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">SECURE CHANNEL</span>
          <div className="flex items-center justify-end gap-2 font-mono text-secondary">
            <Lock className="w-3.5 h-3.5 fill-current" />
            AES-256-GCM
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TelemetryCard({ label, value, progress, colorClass }: { label: string; value: string; progress: number; colorClass: string }) {
  return (
    <div className="silk-card p-4 rounded-xl">
      <span className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant opacity-80">{label}</span>
      <div className="text-2xl font-mono mt-1 text-on-surface">{value}</div>
      <div className="w-full bg-surface-container-high h-1 mt-4 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${colorClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function StatCol({ label, value, valueColor = 'text-on-surface' }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">{label}</span>
      <span className={`font-mono text-sm ${valueColor}`}>{value}</span>
    </div>
  );
}
