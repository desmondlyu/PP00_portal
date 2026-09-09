# JB Booking Browser Zoom Design

## Problem

The Floor Plan canvas currently uses full available width while its height is
capped at `760px`. Browser zoom below 100% increases the CSS viewport width,
so the canvas aspect ratio can grow from approximately `2:1` to more than
`4:1`.

Three.js refits the camera to that ultra-wide host, while tester DOM overlays
retain percentage-based widths. The 3D machines therefore shrink toward the
center while their labels become disproportionately wide and appear displaced.

## Approved Design

Keep the Floor Plan at a stable maximum logical aspect ratio of approximately
`2:1`.

- Limit the canvas to a maximum logical width of `1520px`.
- Keep the maximum height at `760px`.
- Center the canvas inside the existing Floor Plan view when additional
  horizontal space is available.
- Preserve the existing responsive minimum dimensions and horizontal scrolling
  behavior on small screens.
- Do not scale individual machines, labels, rows, or coordinates separately.
- Browser zoom must scale the complete Floor Plan presentation as one unit.

## Immutable Behavior

The change is CSS-only. It must not modify:

- Booking logic or booking-state mapping
- Tester IDs, machine mapping, or click handlers
- Three.js machine coordinates or visual-grid rows
- API/backend/data flow
- Calendar, permissions, routes, PQ00, or FAE behavior

## Acceptance Criteria

- At normal width, the Floor Plan retains its current appearance.
- At an ultra-wide viewport equivalent to browser zoom below 100%, the canvas
  does not exceed approximately `2:1`.
- Machines, labels, environmental layers, and dashed frames remain aligned.
- Tester overlays do not become horizontally elongated.
- The complete layout remains visible.
- Existing mobile horizontal scrolling remains available.
- All 21 tester controls remain present and interactive.
- No new JavaScript console errors appear.
