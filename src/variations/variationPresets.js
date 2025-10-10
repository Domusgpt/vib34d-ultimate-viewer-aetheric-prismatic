import { GeometryLibrary } from '../geometry/GeometryLibrary.js';

/**
 * Defines default variation metadata for all supported geometries.
 * Each entry describes the geometry index, display information, and
 * the number of preset levels exposed in the UI.
 */
export const GEOMETRY_SECTIONS = [
    { geometry: 0, name: 'Tetrahedron', className: 'tetrahedron', levels: 4 },
    { geometry: 1, name: 'Hypercube', className: 'hypercube', levels: 4 },
    { geometry: 2, name: 'Sphere', className: 'sphere', levels: 4 },
    { geometry: 3, name: 'Torus', className: 'torus', levels: 4 },
    { geometry: 4, name: 'Klein Bottle', className: 'klein', levels: 4 },
    { geometry: 5, name: 'Fractal', className: 'fractal', levels: 3 },
    { geometry: 6, name: 'Wave', className: 'wave', levels: 3 },
    { geometry: 7, name: 'Crystal', className: 'crystal', levels: 4 },
    { geometry: 8, name: 'Hypertetrahedron', className: 'hypertetrahedron', levels: 4 },
    { geometry: 9, name: 'Hypersphere', className: 'hypersphere', levels: 4 }
];

/**
 * Flattened list of every preset variation derived from the section data.
 * The level value is zero-based to simplify mathematical parameter offsets.
 */
export const DEFAULT_VARIATIONS = GEOMETRY_SECTIONS.flatMap((section) => {
    const geometryName = GeometryLibrary.getGeometryName(section.geometry);

    return Array.from({ length: section.levels }, (_, level) => ({
        geometry: section.geometry,
        level,
        name: `${geometryName} LATTICE ${level + 1}`,
        sectionName: section.name,
        sectionClass: section.className
    }));
});

export const DEFAULT_VARIATION_COUNT = DEFAULT_VARIATIONS.length;

export function getDefaultVariationDefinition(index) {
    return DEFAULT_VARIATIONS[index] || null;
}
