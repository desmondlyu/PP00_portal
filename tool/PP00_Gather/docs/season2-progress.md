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
