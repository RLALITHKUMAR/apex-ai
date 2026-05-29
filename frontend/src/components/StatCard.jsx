import React from 'react';

export function StatCard({ title, value, icon: Icon, color = '#6366f1', description }) {
  return (
    <div className="kard" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Accent Indicator Stripe */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0))`
      }} />

      <div style={{
        position: 'absolute',
        top: '-15px',
        right: '-15px',
        opacity: 0.04,
        color: color
      }}>
        {Icon && <Icon size={96} />}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {Icon && (
          <div style={{
            background: `rgba(${parseInt(color.slice(1,3),16) || 99}, ${parseInt(color.slice(3,5),16) || 102}, ${parseInt(color.slice(5,7),16) || 241}, 0.08)`,
            color: color,
            padding: '10px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid rgba(${parseInt(color.slice(1,3),16) || 99}, ${parseInt(color.slice(3,5),16) || 102}, ${parseInt(color.slice(5,7),16) || 241}, 0.15)`
          }}>
            <Icon size={18} />
          </div>
        )}
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
      </div>
      
      <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-title)', letterSpacing: '-0.5px', marginTop: '4px' }}>
        {value}
      </div>
      
      {description && (
        <span style={{ fontSize: '11px', color: 'var(--text-dark)', fontWeight: 500 }}>
          {description}
        </span>
      )}
    </div>
  );
}
