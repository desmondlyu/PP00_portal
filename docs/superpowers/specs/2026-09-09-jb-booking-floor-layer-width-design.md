# JB Booking Floor Layer Width Design

## Scope

Only adjust the Floor Plan presentation layer in the isolated
`design/jb-booking-playful` worktree. Booking logic, machine identities,
coordinates used by business logic, API/data flow, routes, permissions,
calendar behavior, and click handlers remain unchanged.

## Approved Visual Change

- Keep the existing seven-column visual grid and all approved row contents.
- Increase the Three.js row depth of `walkway`, `PC/設備/烤箱`, and `pipeline`
  layers to approximately twice their current visual depth.
- Keep the layers transparent and light-colored.
- Keep each environmental label centered and readable.
- Do not increase brightness or add new decoration.
- Preserve equipment-row order, spacing relationships, and interactive hitboxes.

## Implementation Boundary

The change is limited to the visual-grid depth constants in
`tool/JB_booking/static/js/floor-plan-3d.js`. Cache versions may be updated so
the local preview loads the revised presentation.

## Acceptance Criteria

- All three environmental layer types are visibly wider.
- The seven-column arrangement remains intact.
- All 21 machine IDs remain present and unique.
- Existing machine click behavior and booking-state rendering are unchanged.
- No new JavaScript errors are introduced.
