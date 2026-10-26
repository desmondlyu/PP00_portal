# SDD ledger — plan: tool/PP00_Gather/docs/season2-plan.md

Base: latest main, 123 tests passed, 0 failures. Fresh clone on feat/gather-season2; no AGENTS.md found.
Plan phases: A inventory complete; B–F pending.
Pre-flight: combat/hunt callbacks currently award local EXP; must be replaced when Season 2 enabled. Existing boss animation already restored on main.
Ruling: use one private versioned room document plus durable request receipts rather than ten independently updated tables. Edge reducer + compare-and-swap Postgres transaction provide atomic item/EXP/effect/quest changes for this small office. This reduces multi-table transaction plumbing; cost: room-wide contention, monitor latency and retry conflicts. Credentials remain server-only; no document exposed to browser.
Ruling: use Web Crypto PBKDF2-HMAC-SHA256 with random salt and 600,000 iterations as plan's supported dedicated password-hashing alternative; avoid unverified native Argon2 dependency in Edge. Four-digit PIN remains limited protection.

B: server reducer and private CAS + durable receipt storage implemented. Initial cloud smoke passed: registration/reset, receipt replay, denied direct EXP write, resume invalidates prior token, logout revocation. anon/authenticated lack store/commit execution rights. New Gather endpoint deployed, backend enabled; existing old clients do not call it yet.
C: nonlinear XP rules, first-login zero, Taiwan daily check-in, cloud inventory, one-time bounded legacy import implemented.
D: cloud combat HP, defeat loot, exclusive penalties, recovery seats, channel healing and shields implemented.
E: five rooms rendered, material pickers, RMA, lounge, shrine, workshop/gacha wired. Local browser passed at 390×844 and 1440×900 with isolated in-memory API (not claimed as cloud multiplayer).
Ruling: preserve old social exchange button as gifting an existing held weapon, without minting random items. Cost: exchange no longer fabricates reciprocal gifts; avoids duplicating cloud assets.
Ruling: retain old regression tests explicitly in legacy mode; add new server tests and a forged-heal rejection test for Season 2.

Final independent review (season2_review): nine Important findings. Fixed pending gacha reservations, RMA target exclusion/priority and reward overlap, mob instance IDs and cloud reconciliation, authenticated roster election plus separate S2 room transport, ten TOTAL owned item cap, server clock, heal cancellation, generation-bound receipt replay with a 30s resume recovery window, and acknowledged logout before forgetting credentials.
Regression tests were observed RED before each corresponding fix group, then GREEN. Catalog correction: existing snacks have category=item, so material pickers and server validation accept item OR weapon, never outfits. No new random item minting through social exchange.
Real cloud two-client API test passed: competing RMA claim, concurrent repeated completion gives only +60, concurrent repeated gacha consumes only two materials, equipped outfit preserves worker identity and survives resume.
Live browser at 390×844 passed real cloud registration/reset, timed lounge, shield, and logout. Local API browser at 390×844, 844×390 and 1440×900 passed. Actual simultaneous physical-phone sessions and prolonged weak-network soak were not run.
Ruling: migration accepts existing legacy items once after catalog/durability validation; those historical items cannot be proven cheat-free. Cost: imported assets may include prior local edits, bounded by the catalog and one-time import.
Ruling: four-digit PIN retained as requested, PBKDF2 600,000 with salt, session rotation and lockout; it is not enterprise identity assurance. Cost: limited PIN entropy and first-name registration can require administrator recovery.

### 2026-10-26 shrine, pickup and impact follow-up

- PP40 shrine now displays a grid-rasterised mascot statue matching the supplied blue-hat/red-coat/green-shorts reference, with a green backdrop and gilded plinth.
- Pickup is explicit via E/touch interaction, nearest item first, within 80px + level bonus (max 99px). Removed heartbeat auto-pickup; frontend and server both reject obstructed paths. Existing cooldown and capacity checks remain.
- Root cause of excess ambient loot: Season 2 server used one item every 30 seconds instead of the existing config's two items every 20 minutes. Server now reads the generated config policy and uses spawn-rate weighting (Taiwan time bonuses). NPC defeat rolls remain independently 30% item / 5% outfit, never per ordinary hit.
- Root cause of missing impact: 450ms reactions were aged by cloud latency and used server-adjusted timestamps against the renderer's device clock. Newly received reactions now play once for 650ms on the local animation clock; impact/dodge displacement is more visible. Authoritative NPC position is applied on the new event.
- Validation: 153 Node tests pass with TZ=Asia/Taipei; default UTC exposes six existing day-NPC tests that assume daytime. Portal Vite build passes. Local API browser checks at 390x844, 844x390 and 1440x900 verify manual pickup at 75px, no poll auto-pickup, delayed impact playback and expiration, and shrine rendering. Physical iPhone/network soak not performed.

### 2026-10-26 action latency and notification follow-up

- Root cause: pickup and attacks waited for a separate heartbeat HTTP round trip before the actual command; master polling used another heartbeat/world pair on the same client queue. Polling could also retry a mutation that was merely in flight.
- Commands now include the current pose and apply it atomically on the server. Master world updates ride the periodic heartbeat. Polling skips queued/running operations, and transient updates avoid the unnecessary receipt query. Durable gameplay receipts and ownership checks remain unchanged.
- Pickup immediately hides the ground sprite and plays a ring, without granting inventory before confirmation. Pending sprites stay hidden through intervening snapshots; rejection restores the item. NPC impact previews change rendering only; server hit/dodge, HP, position, loot, EXP and durability remain authoritative. One attack may be in flight at a time. Confirmed-event deduplication is separate from preview IDs to prevent stale polls replaying previous impacts.
- All ordinary gameplay/NPC notifications now route through the existing top-right plain-text feed (maximum five messages, three seconds each), without toast cards. Dedicated welcome/private-chat flows are unchanged.
- Verification: 162 tests pass under TZ=Asia/Taipei, Vite portal build passes, JS syntax and diff whitespace checks pass. Browser checks at 390x844, 844x390 and 1440x900 use 900ms response delays and verify immediate pickup/impact feedback, one action request, rejected-pickup rollback, and bounded text-only notifications with expiration. Independent read-only code review found no Critical/Important issues; its minor stale-animation replay finding was fixed with a failing-then-passing regression. Physical iPhone testing was not performed. Cloud acknowledgement still depends on network/server latency; visual prediction does not fabricate confirmed inventory or damage.
