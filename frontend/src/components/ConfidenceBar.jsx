import React from 'react';

export function ConfidenceBar({ confidence, color = '#6366f1' }) {
  const percent = Math.min(100, Math.max(0, confidence));
  
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11px' }}>
        <span style={{ color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.75px' }}>Model Prediction Confidence</span>
        <span style={{ fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{percent.toFixed(1)}%</span>
      </div>
      <div style={{ 
        width: '100%', 
        height: '6px', 
        backgroundColor: 'rgba(255, 255, 255, 0.03)', 
        borderRadius: '9999px',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        overflow: 'hidden'
      }}>
        <div style={{ 
          width: `${percent}%`, 
          height: '100%', 
          background: `linear-gradient(90deg, ${color}, #8b5cf6)`,
          borderRadius: '9999px',
          boxShadow: `0 0 12px ${color}80`,
          transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }} />
      </div>
    </div>
  );
}
