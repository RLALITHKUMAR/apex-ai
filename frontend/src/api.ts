/**
 * api.ts — Centralised API layer for the APEX frontend.
 * All fetch calls go through this module.
 */

const API_BASE = '/api';

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function detectFromUpload(
  file: File,
  locationTag: string,
  notes: string
) {
  const form = new FormData();
  form.append('image', file);
  form.append('source', 'upload');
  form.append('location_tag', locationTag);
  form.append('notes', notes);

  const res = await fetch(`${API_BASE}/detect-crack`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Detection failed');
  return data;
}

export async function detectFromCamera(
  frameBase64: string,
  save: boolean,
  locationTag: string,
  notes: string
) {
  const res = await fetch(`${API_BASE}/camera/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      frame: frameBase64,
      save,
      location_tag: locationTag,
      notes,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Camera detection failed');
  return data;
}

export async function fetchHistory(limit = 100, offset = 0) {
  const res = await fetch(`${API_BASE}/inspection-history?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function fetchInspection(id: string) {
  const res = await fetch(`${API_BASE}/inspection/${id}`);
  if (!res.ok) throw new Error('Failed to fetch inspection');
  return res.json();
}

export async function deleteInspection(id: string) {
  const res = await fetch(`${API_BASE}/inspection/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete inspection');
  return res.json();
}

export async function fetchStatistics() {
  const res = await fetch(`${API_BASE}/statistics`);
  if (!res.ok) throw new Error('Failed to fetch statistics');
  return res.json();
}

export function getReportUrl(inspectionId: string) {
  return `${API_BASE}/generate-report/${inspectionId}`;
}
