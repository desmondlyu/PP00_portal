import React from 'react';

export default function WaferVisual() {
  return (
    <div className="wafer-scene">
      <label className="wafer-motion-control">
        <input type="checkbox" className="wafer-pause" />
        <span>暫停晶圓動畫</span>
      </label>
      <div className="wafer-stage" aria-hidden="true">
        <div className="wafer-shadow" />
        <div className="wafer-tilt">
          <svg className="wafer-disc" viewBox="0 0 320 320">
            <defs>
              <radialGradient id="silicon-metal" cx="30%" cy="20%" r="90%">
                <stop offset="0" stopColor="#f5f8fc" /><stop offset=".28" stopColor="#8495ac" />
                <stop offset=".52" stopColor="#d3dce5" /><stop offset=".72" stopColor="#6e829e" /><stop offset="1" stopColor="#c1c9d2" />
              </radialGradient>
              <linearGradient id="silicon-sheen" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#6f9dd6" stopOpacity=".4" /><stop offset=".4" stopColor="#d3c1d5" stopOpacity=".05" />
                <stop offset=".65" stopColor="#d9bc98" stopOpacity=".3" /><stop offset="1" stopColor="#73a2bc" stopOpacity=".3" />
              </linearGradient>
              <pattern id="silicon-dies" width="18" height="22" patternUnits="userSpaceOnUse">
                <rect x="1.2" y="1.2" width="15.6" height="19.6" rx=".6" fill="none" stroke="#33445b" strokeWidth="1" />
                <path d="M3 18V4h10" fill="none" stroke="#eff5fc" strokeOpacity=".55" strokeWidth=".65" />
              </pattern>
              <clipPath id="silicon-outline"><path d="M153 12a148 148 0 1 0 14 0l-7 10z" /></clipPath>
            </defs>
            <g clipPath="url(#silicon-outline)">
              <circle cx="160" cy="160" r="148" fill="url(#silicon-metal)" />
              <circle cx="160" cy="160" r="148" fill="url(#silicon-sheen)" />
              <circle cx="160" cy="160" r="144" fill="url(#silicon-dies)" />
              {[[91,89],[181,67],[235,155],[145,199],[73,177],[199,243]].map(([x,y], i) => (
                <rect key={i} className="wafer-lit-die" x={x} y={y} width="15" height="19" rx="1" style={{ animationDelay: `${-i * 1.3}s` }} />
              ))}
              <circle cx="160" cy="160" r="147" fill="none" stroke="#eef3f9" strokeWidth="3" />
            </g>
          </svg>
        </div>
      </div>
      <span className="wafer-caption" aria-hidden="true">SILICON / ENGINEERING PRECISION</span>
    </div>
  );
}
