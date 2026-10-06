# JB_booking equipment appearance — 2026-10-06

This change affects presentation only. Existing tester names (including `Auto Hander`), database identifiers, booking handlers, grid cells and equipment world positions are preserved. Geometry is constructed locally in Three.js; the application does not download these photographs or external models.

## Visual references

- **Advantest T5830/T5830ES** — [manufacturer product page](https://www.advantest.com/en/products/semiconductor-test-system/memory/t5830/), [manufacturer photograph](https://www.advantest.com/img/products/semiconductor-test-system/memory/t5830/img-main.png). Reference features: low test-head cabinet, circular top interface, rear control cabinet and monitor. The existing non-MOSAID tester category shares this simplified silhouette; no tester is renamed or reclassified.
- **MOSAID MS3490** — [Tara Semiconductor's equipment photographs](https://www.tarasemi.com/listings/585886-mosaid-ms-3490-memory-tester), [cabinet photograph](https://i.machineryhost.com/f1c8a56412401488ca61118b0a0affd2/abfd400b9d.jpg). Reference features: off-white cabinet, blue fascia, two large ventilation banks and top test area. This is a photographic reference only, not a source of technical specifications.
- **Probe station** — [FormFactor MPS150 manufacturer page](https://www.formfactor.com/product/probe-systems/150-mm-systems/mps150/). Reference features: circular wafer chuck, microscope, bridge and side probe positioners. The design is a generic probe-station silhouette, not an assertion that the lab owns an MPS150.
- **UF3000** — [Jenoptik integration page](https://www.jenoptik.de/produkte/optische-pruef-und-messloesungen/ufo-probe-card), [UF3000 photograph](https://www.jenoptik.de/-/media/websiteimages/optics/microoptics/wafer-probing-machine/textimage.jpeg). Reference features: white cabinet, blue plinth, circular wafer interface, raised loading bay and screen. The existing `UF3000` display name and placement are retained; the loading bay is emphasized for the user's wafer-loader representation.
- **Robot arm** — [Hirata wafer transfer robot](https://www.hirata.co.jp/en/products/items/archives/102). Jointed links, pedestal and end effector inform a generic static arm. Amber joints and gripper are illustrative styling, not an exact replica of this model or the lab's hardware.

The models are deliberately simplified for a booking map. Cabinet colors, proportions and small parts aid recognition; they are not engineering drawings or exact model/configuration claims.

## Nameplates and verification

- Nameplates use all eight projected model-bound corners to sit above their own model, with hover clearance.
- Each card fits inside its existing grid column and retains its own DOM booking button. Decorative equipment labels do not intercept pointer events.
- The stage is at least 1280 × 1080 CSS pixels and horizontally scrolls in narrower containers. Labels show the full original name and booking state; they do not expand on hover.
- `node --test tool/JB_booking/design-preview/*.test.mjs` verifies geometry visibility, 29 separate nameplate rectangles, the existing 21-tester contract and appointment UI contracts.
- Local browser execution was attempted but Chromium could not start because the execution environment denied its Unix socket operation. Browser font wrapping, real clicks and WebGL appearance are not claimed as verified by Node tests.
