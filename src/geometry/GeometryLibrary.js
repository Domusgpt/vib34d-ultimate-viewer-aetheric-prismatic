/**
 * VIB3 Geometry Library
 * 10 geometric types with 4D polytopal mathematics integration
 * WebGL 1.0 compatible shaders only
 */

export class GeometryLibrary {
    static getGeometryNames() {
        return [
            'TETRAHEDRON',
            'HYPERCUBE',
            'SPHERE',
            'TORUS',
            'KLEIN BOTTLE',
            'FRACTAL',
            'WAVE',
            'CRYSTAL',
            'HYPERTETRAHEDRON',
            'HYPERSPHERE'
        ];
    }
    
    static getGeometryName(type) {
        const names = this.getGeometryNames();
        return names[type] || 'UNKNOWN';
    }
    
    /**
     * Get variation parameters for specific geometry and level
     */
    static getVariationParameters(geometryType, level) {
        const clampedLevel = Math.max(0, Math.min(level, 3));

        const params = {
            gridDensity: 8 + (clampedLevel * 4),
            morphFactor: 0.5 + (clampedLevel * 0.3),
            chaos: clampedLevel * 0.15,
            speed: 0.8 + (clampedLevel * 0.2),
            hue: (geometryType * 45 + clampedLevel * 15) % 360,
            rot4dXW: (clampedLevel - 1.5) * 0.4,
            rot4dYW: (geometryType % 2) * 0.25,
            rot4dZW: ((geometryType + clampedLevel) % 3) * 0.2,
            dimension: 3.2 + (clampedLevel * 0.18)
        };

        // Geometry-specific adjustments
        switch (geometryType) {
            case 0: // Tetrahedron
                params.gridDensity *= 1.2;
                params.morphFactor *= 0.9;
                break;
            case 1: // Hypercube
                params.morphFactor *= 0.8;
                params.rot4dYW += 0.05;
                break;
            case 2: // Sphere
                params.chaos *= 1.5;
                params.dimension += 0.05;
                break;
            case 3: // Torus
                params.speed *= 1.3;
                params.rot4dXW += 0.05;
                break;
            case 4: // Klein Bottle
                params.gridDensity *= 0.7;
                params.morphFactor *= 1.4;
                params.rot4dZW += 0.05;
                break;
            case 5: // Fractal
                params.gridDensity *= 0.6;
                params.chaos *= 2.0;
                params.rot4dXW += 0.1;
                break;
            case 6: // Wave
                params.speed *= 1.6;
                params.chaos *= 0.5;
                params.rot4dYW += 0.1;
                break;
            case 7: // Crystal
                params.gridDensity *= 1.5;
                params.morphFactor *= 0.6;
                params.rot4dZW += 0.05;
                break;
            case 8: // Hypertetrahedron
                params.gridDensity *= 1.25;
                params.morphFactor *= 0.75;
                params.rot4dYW += 0.15 * (clampedLevel - 1.5);
                params.rot4dZW += 0.1;
                params.dimension += 0.08;
                break;
            case 9: // Hypersphere
                params.gridDensity *= 0.85;
                params.chaos *= 1.4;
                params.speed *= 1.1;
                params.rot4dXW += 0.2;
                params.dimension += 0.12;
                break;
        }

        return params;
    }
}