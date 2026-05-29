export type ViewType = 'live' | 'analyzer' | 'logs' | 'analytics' | 'lab';

export interface LogEntry {
  id: string;
  date: string;
  source: string;
  location: string;
  condition: 'Critical' | 'Warning' | 'Stable' | 'Nominal';
  severity: 'error' | 'tertiary' | 'secondary' | 'nominal';
  density: string;
}

export interface Anomaly {
  timestamp: string;
  assetId: string;
  delta: string;
  confidence: string;
  status: 'CRITICAL' | 'WARNING' | 'NOMINAL';
}

// Backend API types
export interface DetectionResult {
  inspection_id: string;
  crack_detected: boolean;
  severity: string;
  severity_label: string;
  confidence: number;
  crack_area_pct: number;
  recommendation: string;
  urgency: string;
  color_hex: string;
  raw_probs: Record<string, number>;
  original_image: string;
  annotated_image: string;
  gradcam_applied: boolean;
}

export interface CameraDetectionResult {
  inspection_id: string | null;
  crack_detected: boolean;
  severity: string;
  confidence: number;
  crack_area_pct: number;
  recommendation: string;
  urgency: string;
  color_hex: string;
  annotated_image: string;
  raw_probs: Record<string, number>;
}

export interface Inspection {
  id: string;
  timestamp: string;
  crack_detected: boolean;
  severity: string;
  confidence: number;
  crack_area_pct: number;
  recommendation: string;
  source: string;
  location_tag: string;
  notes: string;
  original_path?: string;
  annotated_path?: string;
}

export interface Statistics {
  total: number;
  cracked: number;
  clean: number;
  by_severity: Record<string, number>;
}

export interface HealthStatus {
  status: string;
  model_ready: boolean;
  service: string;
  version: string;
}
