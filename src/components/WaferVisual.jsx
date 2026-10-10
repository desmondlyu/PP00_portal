import React, { useId } from 'react';

// Decorative circuit illustration; the package stays still while signals travel.
const lanes = Array.from({ length: 8 }, (_, i) => {
  const x = -56 + i * 16;
  const end = x + (i < 4 ? -1 : 1) * (34 + (i % 4) * 12);
  return { x, end, d: `M ${x} -88 V ${-112 - (i % 4) * 14} L ${end} ${-146 - (i % 4) * 14} V -246` };
});

export default function WaferVisual() {
  const id = useId().replace(/:/g, '');
  return (
    <div className="circuit-scene" aria-hidden="true">
      <svg className="circuit-art" viewBox="0 0 480 360" focusable="false">
        <defs>
          <linearGradient id={`${id}-case`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#394c60" /><stop offset=".48" stopColor="#1e3042" /><stop offset="1" stopColor="#101e2d" />
          </linearGradient>
          <linearGradient id={`${id}-pin`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#b3beca" /><stop offset=".45" stopColor="#536a80" /><stop offset="1" stopColor="#91a2b2" />
          </linearGradient>
          <pattern id={`${id}-grain`} width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r=".45" fill="#a5b7c9" opacity=".16" />
            <circle cx="3" cy="4" r=".35" fill="#050d16" opacity=".4" />
          </pattern>
          <radialGradient id={`${id}-halo`}>
            <stop stopColor="#6b91b3" stopOpacity=".18" /><stop offset="1" stopColor="#6b91b3" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="257" cy="195" rx="210" ry="150" fill={`url(#${id}-halo)`} />
        <g transform="translate(252 174) scale(1 .72) rotate(-28)">
          {[0, 90, 180, 270].map((angle, side) => (
            <g key={angle} transform={`rotate(${angle})`}>
              {lanes.map(({ x, end, d }, i) => (
                <g key={x}>
                  <path d={d} className="circuit-trace-shadow" transform="translate(0 2)" />
                  <path d={d} className="circuit-trace" />
                  <circle cx={end} cy="-246" r="3" className="circuit-via" />
                  <rect x={x - 4} y="-94" width="8" height="24" rx="1.5" fill={`url(#${id}-pin)`} />
                  {i === (side % 2 ? 5 : 2) && (
                    <path d={d} pathLength="100" className="circuit-signal" style={{ animationDelay: `${side * -3}s` }} />
                  )}
                </g>
              ))}
            </g>
          ))}
          <rect x="-82" y="-66" width="168" height="158" rx="9" fill="#07121e" opacity=".55" />
          <rect x="-78" y="-70" width="156" height="156" rx="7" fill="#0b1724" stroke="#4b6074" strokeWidth="1.5" />
          <rect x="-78" y="-78" width="156" height="156" rx="7" fill={`url(#${id}-case)`} stroke="#708498" strokeWidth="1" />
          <rect x="-76" y="-76" width="152" height="152" rx="6" fill={`url(#${id}-grain)`} />
          <path d="M-68 64V-64Q-68-68-64-68H64" fill="none" stroke="#9bafbf" strokeOpacity=".25" />
          <circle cx="-57" cy="-55" r="4" fill="#132334" stroke="#61768a" strokeWidth=".8" />
          <text x="0" y="-2" textAnchor="middle" className="circuit-chip-label">NOR FLASH</text>
          <path d="M-24 13H24" stroke="#7c92a8" strokeOpacity=".4" />
          <text x="0" y="30" textAnchor="middle" className="circuit-chip-subtitle">PP00</text>
        </g>
      </svg>
    </div>
  );
}
