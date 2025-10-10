# Geometry Icon Catalog

The geometry icon generator produces offline-friendly SVG previews for the ten shared visualizer shapes. These static silhouettes
are built directly from the preset metadata, so they remain synchronized with the faceted, quantum, and holographic variation
lists even when Playwright browsers are unavailable.

## Generated Assets

| Geometry | Preview |
| --- | --- |
| Tetrahedron | ![Tetrahedron](geometry-icons/00-tetrahedron.svg) |
| Hypercube | ![Hypercube](geometry-icons/01-hypercube.svg) |
| Sphere | ![Sphere](geometry-icons/02-sphere.svg) |
| Torus | ![Torus](geometry-icons/03-torus.svg) |
| Klein Bottle | ![Klein Bottle](geometry-icons/04-klein-bottle.svg) |
| Fractal | ![Fractal](geometry-icons/05-fractal.svg) |
| Wave | ![Wave](geometry-icons/06-wave.svg) |
| Crystal | ![Crystal](geometry-icons/07-crystal.svg) |
| Hypertetrahedron | ![Hypertetrahedron](geometry-icons/08-hypertetrahedron.svg) |
| Hypersphere | ![Hypersphere](geometry-icons/09-hypersphere.svg) |

## Regenerating the Catalog

Run the geometry icon generator whenever geometry metadata changes:

```bash
npm run geometry:icons
```

The command parses `src/variations/variationPresets.js`, projects representative point clouds into 2D, and writes fresh SVG
artwork plus a `metadata.json` manifest to `docs/geometry-icons/`.

This workflow allows quick geometry verification and documentation in environments where automated browser capture cannot fetch
Playwright binaries.
