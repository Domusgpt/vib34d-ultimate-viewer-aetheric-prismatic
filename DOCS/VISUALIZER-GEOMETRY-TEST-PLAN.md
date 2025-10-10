# Visualizer Geometry Test Plan

This playbook documents the manual verification loop for the ten selectable geometries shared by the faceted, quantum, and holographic visualizers. It is designed to ensure the newly added hypertetrahedron and hypersphere presets stay healthy while protecting the existing eight lattice families.

## ✅ Scope Checklist

- Ten geometry buttons render in each system, in the order defined by `src/variations/variationPresets.js`.
- Thirty-eight default variations (with geometry-specific level counts) are available, followed by sixty-two custom slots.
- Legacy custom variation saves with the old 70-slot format are gracefully normalized.
- `GeometryLibrary.getVariationParameters` drives consistent defaults for every preset.

## 🔄 Quick Geometry Reference

| Geometry | Levels | Notes |
| --- | --- | --- |
| Tetrahedron | 4 | Baseline lattice density, good smoke test for morph slider |
| Hypercube | 4 | Lower morph factor emphasises planar slices |
| Sphere | 4 | Increased chaos and dimension values highlight shelling |
| Torus | 4 | Speed boost should accentuate rotational motion |
| Klein Bottle | 4 | Reduced density plus higher morph factor |
| Fractal | 3 | No level 4—verify UI shows only three presets |
| Wave | 3 | Faster animations with dampened chaos |
| Crystal | 4 | Highest density baseline |
| Hypertetrahedron | 4 | Rotational offsets centred around 4D simplex facets |
| Hypersphere | 4 | Expanded dimension to showcase glome banding |

## 🧪 System Smoke Tests

### Faceted Visualizer
1. Load `index.html` and confirm the geometry grid lists ten buttons.
2. Step through presets 1–38 using the variation grid. Ensure the header updates with the correct geometry name and level.
3. Select "Hypertetrahedron Level 3" and verify:
   - Grid density slider jumps to the preset value (~40+).
   - Rot4D YW slider reflects the offset from `GeometryLibrary.getVariationParameters` (slightly positive).
4. Select "Hypersphere Level 2" and confirm the dimension slider nudges above 3.2.
5. Reset parameters and ensure geometry button highlighting follows the reset geometry index.

### Quantum Visualizer
1. Load `viewer.html?system=quantum` (or activate via the system switcher) and open the preset grid.
2. Confirm ten geometry tabs render with matching names.
3. Trigger presets 30–33 (Hypertetrahedron) and ensure shader output uses the new SDF (look for simplex ridge patterns).
4. Trigger presets 34–37 (Hypersphere) and confirm glome shells appear with banding aligned to chi/theta/phi oscillations.

### Holographic Visualizer
1. Activate the holographic system through the launcher.
2. Verify the active hologram UI lists ten geometries.
3. Toggle between "Crystal Level 4" and "Hypersphere Level 1" while watching the holographic slices—look for distinct radial shells on the hypersphere selection.
4. Use the variation randomizer to ensure random picks never exceed geometry index 9.

## 🗂️ Custom Variation Regression

1. In any system, save a custom variation to populate the first empty slot (index 39).
2. Reload the page. The custom slot should persist and the preset grid should still display the ten geometry sections.
3. Import an older JSON export containing 70 custom slots and confirm only the first 62 entries are loaded with the remainder ignored.

## 🤖 Automation

- Run `npm run test -- tests/visual-geometry-presets.spec.js --project=chromium` to capture the geometry grids and assert dataset metadata for the faceted, quantum, and holographic systems. The Playwright wrapper will fetch the required browser binaries automatically unless they already exist.
- If browser downloads are blocked, execute `npm run geometry:icons` to regenerate the offline SVG silhouettes and `metadata.json` manifest stored in `docs/geometry-icons/`; these previews provide a quick visual reference when full Playwright coverage is unavailable.
- `npm run geometry:verify` cross-checks the preset sections against the icon manifest so you can ensure offline artefacts and UI metadata stay aligned before publishing documentation updates.
- `npm run geometry:report` writes `DOCS/GEOMETRY-ASSET-STATUS.md`, a Markdown diff target that captures the current geometry/icon matrix so reviews can confirm coverage from source control alone.
- `./run-visual-tests.sh --agent=geometry` launches the same Playwright agent through the visual testing harness, generating refreshed screenshots under `test-results/geometry-grid-*.png`.
- Review the Playwright HTML report (`npm run test:report`) for hover details, console logs, and metadata snapshots emitted by the automation run.
- If the environment blocks downloads, set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` to bypass the automated check and rely on preinstalled browsers (or perform `npm run playwright:install` when connectivity is available); both the wrapper and `run-visual-tests.sh` respect this flag.

## 🛠️ Maintenance Hooks

- Variation metadata: `src/variations/variationPresets.js`
- Parameter heuristics: `src/geometry/GeometryLibrary.js`
- UI wiring: `src/variations/VariationManager.js`
- Parameter propagation: `src/core/Parameters.js`

Keep this checklist nearby when introducing new geometries or altering preset counts so visual parity across systems can be revalidated quickly.
