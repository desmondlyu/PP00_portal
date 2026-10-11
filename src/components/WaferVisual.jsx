import React from 'react';
import chipImage from '../assets/nor-flash-hero.webp';

// Image and light paths share one coordinate system, so they stay aligned at any size.
const signalPaths = [
  'M 638 298 L 624 243 L 627 116 L 435 0',
  'M 956 669 L 1084 759 L 1192 761 L 1254 804',
];

export default function WaferVisual() {
  return (
    <div className="circuit-scene" aria-hidden="true">
      <svg className="circuit-art" viewBox="0 0 1254 1254" preserveAspectRatio="xMidYMid slice" focusable="false">
        <image href={chipImage} width="1254" height="1254" />
        {signalPaths.map((d, i) => (
          <g key={d} style={{ '--signal-delay': `${i * -6}s` }}>
            <path d={d} pathLength="100" className="circuit-signal circuit-signal-glow" />
            <path d={d} pathLength="100" className="circuit-signal" />
          </g>
        ))}
      </svg>
    </div>
  );
}
