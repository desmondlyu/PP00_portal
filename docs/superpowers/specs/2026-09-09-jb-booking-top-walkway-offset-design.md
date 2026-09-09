# JB Booking Top Walkway Offset Design

## Scope

Only move the first walkway row in the isolated JB Booking Floor Plan
presentation layer.

## Approved Change

- Move visual-grid row `0` downward so the walkway is fully below the upper
  horizontal dashed frame line.
- Keep the walkway above `PC/設備/烤箱` with a visible gap.
- Move the walkway mesh and its text label together.
- Keep rows `1` through `10` unchanged.
- Keep the vertical-fill scale, all machine positions, object sizes, seven
  columns, and blank cells unchanged.

## Immutable Behavior

Booking logic, machine IDs, state mapping, click handlers, API/data flow,
calendar, permissions, routes, PQ00, and FAE are not modified.

## Acceptance Criteria

- The first walkway no longer touches or overlaps the dashed frame line.
- The first walkway remains clearly separated from the PC/equipment/oven row.
- All other rows retain their current positions.
- All 21 tester controls remain present and interactive.
- No new JavaScript console errors appear.
