import React from 'react';
import chipImage from '../assets/nor-flash-hero.webp';

// Image and light paths share one coordinate system, so they stay aligned at any size.
const signalPaths = [
  'M 638 298 L 624 243 L 627 116 L 435 0',
  'M 589 324 L 570 286 L 575 128 L 368 0',
  'M 545 346 L 473 281 L 485 143 L 258 0',
  'M 395 430 L 245 343 L 0 181',
  'M 300 479 L 114 367 L 111 306 L 0 233',
  'M 1038 506 L 1136 506 L 1190 460 L 1254 463',
  'M 994 594 L 1144 697 L 1219 700 L 1254 722',
  'M 956 669 L 1084 759 L 1192 761 L 1254 804',
  'M 875 735 L 1088 885 L 1096 997 L 1254 1099',
  'M 782 790 L 919 902 L 926 1054 L 1217 1254',
  'M 698 845 L 856 957 L 858 1166 L 980 1254',
  'M 192 649 L 37 747 L 0 746',
  'M 251 705 L 18 938 L 0 1034',
  'M 356 779 L 109 987 L 107 1120 L 0 1190',
];

export default function WaferVisual() {
  return (
    <div className="circuit-scene" aria-hidden="true">
      <svg className="circuit-art" viewBox="0 0 1254 1254" preserveAspectRatio="xMidYMid slice" focusable="false">
        <image href={chipImage} width="1254" height="1254" />
        {signalPaths.map((d, i) => (
          <g key={d} style={{ '--signal-delay': `${-i * 1.37}s`, '--signal-duration': `${4.8 + (i % 4) * .7}s`, '--signal-color': i % 3 === 0 ? '#64dcff' : '#409bff' }}>
            <path d={d} pathLength="100" className="circuit-signal circuit-signal-glow" />
            <path d={d} pathLength="100" className="circuit-signal circuit-signal-tail" />
            <path d={d} pathLength="100" className="circuit-signal circuit-signal-core" />
            <path d={d} pathLength="100" className="circuit-signal circuit-signal-head" />
          </g>
        ))}
      </svg>
    </div>
  );
}
