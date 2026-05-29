import React from 'react';

export function SeverityBadge({ severity }) {
  const normalized = (severity || 'No Crack').toLowerCase().replace(' ', '_');
  
  const labelMap = {
    'no_crack': 'Optimal State',
    'minor': 'Minor Priority',
    'moderate': 'Moderate Warning',
    'severe': 'Critical Danger',
  };

  return (
    <span className={`capsule capsule-${normalized}`}>
      <span className="capsule-dot" />
      {labelMap[normalized] || severity}
    </span>
  );
}
