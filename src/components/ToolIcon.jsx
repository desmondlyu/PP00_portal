import React from 'react';

// Presentation-only pictograms. IDs match existing tool records; those records stay unchanged.
export default function ToolIcon({ id, className = '' }) {
  const drawings = {
    'tto-analysis': <><rect x="6" y="10" width="25" height="40" rx="2" /><path d="M6 20h25M6 30h25M6 40h25M14 10v40M23 10v40" /><path className="icon-accent" d="M36 36l5-14 5 23 5-14 7 3" /><path d="M36 51h22" /></>,
    'jb-booking': <><rect x="5" y="8" width="27" height="46" rx="2" /><path d="M20 8v46M9 14h7v17H9zM24 14h4v17h-4M9 45h7M9 54v3M28 54v3" /><rect className="icon-accent" x="36" y="26" width="23" height="27" rx="3" /><path className="icon-accent" d="M41 22v8M54 22v8M36 35h23M41 44l4 4 9-9" /></>,
    'dl-to-excel': <><path d="M6 9h15l7 7v35H6zM21 9v9h7M11 27h11M11 34h8M11 41h9" /><path className="icon-accent" d="M30 31h9m-4-4 4 4-4 4" /><rect x="43" y="17" width="17" height="34" rx="2" /><path className="icon-accent" d="M43 25h17M43 34h17M43 42h17M51 25v26" /></>,
    'cz-dataset': <><path d="M10 9v44h47" /><path d="M15 16h43M15 44h43" strokeDasharray="3 4" /><path className="icon-accent" d="M16 39c20 0 16-17 36-17" /><circle className="icon-accent" cx="53" cy="22" r="3" /></>,
    'dl-analysis': <><circle cx="30" cy="32" r="24" /><path d="M9 22h42M6 32h48M9 42h42M20 10v44M30 8v48M40 10v44" /><path className="icon-accent" d="M43 6h14v14M57 44v14H43" /><path className="icon-fill" d="M21 23h8v8h-8zM31 33h8v8h-8z" /></>,
    'yield-summary': <><path d="M41 12V7H7v42h7M48 18v-5H15v42h7" /><rect x="23" y="20" width="34" height="37" rx="2" /><path d="M30 28h20" /><path className="icon-accent" d="M31 48v-7h4v7zM40 48V37h4v11zM49 48V33h3v15z" /></>,
    'cp-mss-converter': <><rect x="6" y="7" width="18" height="11" rx="2" /><path d="M15 19v8m-4-3 4 4 4-4M15 31l7 7-7 7-7-7zM23 38h12m-4-4 4 4-4 4" /><rect className="icon-accent" x="41" y="20" width="17" height="34" rx="2" /><path className="icon-accent" d="M45 27h9M45 34h9M45 41h9M45 48h9" /><path d="M8 52H4V12h2" /></>,
    'dongle-summary': <><path d="M29 6h6v10h-6zM32 16v13M12 38v-9h40v9M32 29v9" /><rect x="6" y="38" width="12" height="19" rx="2" /><rect x="26" y="38" width="12" height="19" rx="2" /><rect className="icon-accent" x="46" y="38" width="12" height="19" rx="2" /><path d="M10 43h4M30 43h4M50 43h4" /></>,
    'writer': <><rect x="5" y="9" width="47" height="37" rx="3" /><path d="M5 18h47M11 13h1M17 13h1M13 26l7 6-7 6M24 38h10" /><rect className="icon-accent" x="39" y="36" width="18" height="18" rx="2" /><path d="M43 32v4M49 32v4M55 32v4M43 54v5M49 54v5M55 54v5M35 40h4M35 47h4M57 40h4M57 47h4" /><circle className="icon-fill" cx="47" cy="26" r="2" /></>,
    'eng_report': <><path d="M12 6h27l12 12v40H12zM39 6v13h12M20 26h21M20 32h13" /><path className="icon-accent" d="M20 49v-8h5v8zM30 49V38h5v11zM40 49V34h4v15z" /></>,
    'te_tto': <><path d="M7 11v43h49" /><path className="icon-accent" d="M10 40h7V23h7v23h7V32h7" /><circle cx="47" cy="18" r="12" /><path className="icon-accent" d="M47 11v8h6" /></>,
    'pp00-knowledge-agent': <><rect x="10" y="10" width="44" height="44" rx="3" strokeDasharray="5 5" /><path d="M22 32h20M32 22v20" /></>,
  };
  return <svg className={`tool-pictogram ${className}`} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{drawings[id] || drawings['pp00-knowledge-agent']}</svg>;
}
