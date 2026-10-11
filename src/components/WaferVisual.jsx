import React from 'react';
import chipImage from '../assets/nor-flash-hero.webp';

// Image and light paths share one coordinate system, so they stay aligned at any size.
// Centerlines traced from the approved 1254 × 1254 artwork, from lead to board edge.
const signalPaths = [
  'M 709 294 L 625 243 L 629 116 L 448 0',
  'M 579 317 L 522 276 L 524 134 L 320 0',
  'M 535 344 L 474 281 L 485 143 L 275 0',
  'M 349 453 L 117 317 L 119 247 L 0 173',
  'M 304 477 L 61 327 L 66 253 L 0 212',
  'M 728 319 L 797 276 L 792 151 L 1034 0',
  'M 788 354 L 872 297 L 867 164 L 1100 0',
  'M 812 367 L 909 306 L 902 176 L 1166 0',
  'M 1043 505 L 1136 506 L 1191 470',
  'M 981 653 L 1109 732 L 1208 733 L 1254 764',
  'M 918 696 L 1052 793 L 1052 807 L 1146 869 L 1155 978 L 1254 1041',
  'M 865 739 L 1085 883 L 1093 992 L 1254 1099',
  'M 794 787 L 1003 892 L 1012 1027 L 1254 1193',
  'M 438 833 L 288 932 L 278 1104',
  'M 334 770 L 113 971 L 107 1108 L 0 1183',
  'M 299 744 L 18 938 L 0 1064',
  'M 190 652 L 29 745 L 0 743',
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
