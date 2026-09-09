# JB Booking Floor Grid Vertical Fill Design

## Scope

Only adjust the vertical presentation of the approved seven-column Floor Plan
inside the PP00 dashed frame in the isolated `design/jb-booking-playful`
worktree.

The following remain immutable:

- Booking logic and state mapping
- Tester and equipment identities
- API, backend, data schema, and data flow
- Machine click handlers and booking flow
- Calendar, permissions, routes, and other UI
- PQ00 and FAE presentation

## Approved Design

The seven-column visual grid will use the available vertical interior of the
PP00 dashed frame instead of remaining compressed around its center.

- Keep the current horizontal positions and seven equal columns.
- Keep machine and environmental-layer sizes unchanged.
- Keep the approved row order and blank cells unchanged.
- Position the first walkway near the PP00 frame's inner top boundary.
- Position the final equipment row near the PP00 frame's inner bottom boundary.
- Preserve a small safety margin at the top and bottom.
- Distribute the remaining vertical space between rows without allowing
  machines to overlap walkway, pipeline, or PC/equipment/oven layers.
- Keep the widened environmental layers from the previous approved change.

## Implementation Boundary

The Three.js presentation layer will derive the visual grid's vertical start
and inter-row spacing from the PP00 frame interior. It must not alter machine
IDs, DOM tester buttons, booking callbacks, appointments, or API-related code.

The camera framing will remain unchanged so PQ00 and FAE do not move or scale.

## Acceptance Criteria

- The seven-column design occupies most of the PP00 dashed frame height.
- Excessive blank space above the first walkway and below the final row is
  removed.
- Small top and bottom safety margins remain.
- No equipment overlaps an environmental layer.
- Horizontal positions and machine sizes remain unchanged.
- All 21 tester IDs remain present and unique.
- Existing click and booking-state behavior remains unchanged.
- No new JavaScript console errors are introduced.
