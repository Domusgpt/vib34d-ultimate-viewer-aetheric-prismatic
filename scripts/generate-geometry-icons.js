#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const { loadGeometrySections } = require('./utils/loadGeometrySections.js');

function rotate4D(point, angles = {}) {
    let [x, y, z, w = 0] = point;
    const { xw = 0, yw = 0, zw = 0 } = angles;

    if (xw) {
        const c = Math.cos(xw);
        const s = Math.sin(xw);
        const nx = x * c - w * s;
        const nw = x * s + w * c;
        x = nx;
        w = nw;
    }

    if (yw) {
        const c = Math.cos(yw);
        const s = Math.sin(yw);
        const ny = y * c - w * s;
        const nw = y * s + w * c;
        y = ny;
        w = nw;
    }

    if (zw) {
        const c = Math.cos(zw);
        const s = Math.sin(zw);
        const nz = z * c - w * s;
        const nw = z * s + w * c;
        z = nz;
        w = nw;
    }

    return [x, y, z, w];
}

function rotate3D(point, angles = {}) {
    let [x, y, z] = point;
    const { rx = 0, ry = 0, rz = 0 } = angles;

    if (rx) {
        const c = Math.cos(rx);
        const s = Math.sin(rx);
        const ny = y * c - z * s;
        const nz = y * s + z * c;
        y = ny;
        z = nz;
    }

    if (ry) {
        const c = Math.cos(ry);
        const s = Math.sin(ry);
        const nx = x * c + z * s;
        const nz = -x * s + z * c;
        x = nx;
        z = nz;
    }

    if (rz) {
        const c = Math.cos(rz);
        const s = Math.sin(rz);
        const nx = x * c - y * s;
        const ny = x * s + y * c;
        x = nx;
        y = ny;
    }

    return [x, y, z];
}

function projectPoint(point, options = {}) {
    const { rotate4 = {}, rotate3 = {}, translate = [0, 0, -2.5], cameraDistance = 6 } = options;
    const rotated4 = rotate4D(point, rotate4);
    const [rx, ry, rz] = rotate3D(rotated4.slice(0, 3), rotate3);
    const tx = rx + translate[0];
    const ty = ry + translate[1];
    const tz = rz + translate[2];

    const perspective = cameraDistance / (cameraDistance - tz);
    return [tx * perspective, ty * perspective];
}

function normaliseSegments(projectedSegments, padding = 0.08) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    projectedSegments.forEach(([a, b]) => {
        minX = Math.min(minX, a[0], b[0]);
        maxX = Math.max(maxX, a[0], b[0]);
        minY = Math.min(minY, a[1], b[1]);
        maxY = Math.max(maxY, a[1], b[1]);
    });

    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    const scale = 1 - padding * 2;

    return projectedSegments.map(([a, b]) => {
        const na = [((a[0] - minX) / width) * scale + padding, ((a[1] - minY) / height) * scale + padding];
        const nb = [((b[0] - minX) / width) * scale + padding, ((b[1] - minY) / height) * scale + padding];
        return [na, nb];
    });
}

function createSegmentsFromIndices(vertices, indices) {
    const segments = [];
    for (let i = 0; i < indices.length; i += 2) {
        const a = vertices[indices[i]];
        const b = vertices[indices[i + 1]];
        segments.push([a, b]);
    }
    return segments;
}

function generateTetrahedron() {
    const s = 1;
    const vertices = [
        [s, s, s, 0],
        [s, -s, -s, 0],
        [-s, s, -s, 0],
        [-s, -s, s, 0]
    ];
    const edges = [0, 1, 0, 2, 0, 3, 1, 2, 1, 3, 2, 3];
    return createSegmentsFromIndices(vertices, edges);
}

function generateHypercube() {
    const vertices = [];
    for (let i = 0; i < 16; i++) {
        const x = (i & 1) ? 1 : -1;
        const y = (i & 2) ? 1 : -1;
        const z = (i & 4) ? 1 : -1;
        const w = (i & 8) ? 1 : -1;
        vertices.push([x, y, z, w]);
    }
    const segments = [];
    for (let i = 0; i < vertices.length; i++) {
        for (let j = i + 1; j < vertices.length; j++) {
            const mask = i ^ j;
            if (mask && (mask & (mask - 1)) === 0) {
                segments.push([vertices[i], vertices[j]]);
            }
        }
    }
    return segments;
}

function generateSphere(rings = 6, segmentsPerRing = 36) {
    const segments = [];
    for (let ring = 1; ring <= rings; ring++) {
        const theta = (ring / (rings + 1)) * Math.PI;
        const radius = Math.sin(theta);
        const z = Math.cos(theta);
        let previousPoint = null;
        for (let i = 0; i <= segmentsPerRing; i++) {
            const phi = (i / segmentsPerRing) * Math.PI * 2;
            const x = radius * Math.cos(phi);
            const y = radius * Math.sin(phi);
            const point = [x, y, z, 0];
            if (previousPoint) {
                segments.push([previousPoint, point]);
            }
            previousPoint = point;
        }
    }
    return segments;
}

function generateTorus(majorRadius = 1.5, minorRadius = 0.6, majorSteps = 24, minorSteps = 18) {
    const segments = [];
    for (let j = 0; j < majorSteps; j++) {
        const u = (j / majorSteps) * Math.PI * 2;
        const uNext = ((j + 1) / majorSteps) * Math.PI * 2;
        for (let i = 0; i <= minorSteps; i++) {
            const v = (i / minorSteps) * Math.PI * 2;
            const x = (majorRadius + minorRadius * Math.cos(v)) * Math.cos(u);
            const y = (majorRadius + minorRadius * Math.cos(v)) * Math.sin(u);
            const z = minorRadius * Math.sin(v);
            const point = [x, y, z, 0];
            const x2 = (majorRadius + minorRadius * Math.cos(v)) * Math.cos(uNext);
            const y2 = (majorRadius + minorRadius * Math.cos(v)) * Math.sin(uNext);
            const z2 = minorRadius * Math.sin(v);
            segments.push([point, [x2, y2, z2, 0]]);
        }
    }
    return segments;
}

function generateKleinBottle(uSteps = 28, vSteps = 24) {
    const segments = [];
    function klein(u, v) {
        const cu = Math.cos(u);
        const su = Math.sin(u);
        const cv = Math.cos(v);
        const sv = Math.sin(v);
        const x = (cu * (1 + sv) + (0.5 * cu * sv)) * 1.1;
        const y = (su * (1 + sv) + (0.5 * su * sv)) * 1.1;
        const z = cv * 0.7 + Math.cos(u / 2) * 0.3;
        return [x, y, z, 0];
    }
    for (let j = 0; j < uSteps; j++) {
        const u = (j / uSteps) * Math.PI * 2;
        const uNext = ((j + 1) / uSteps) * Math.PI * 2;
        for (let i = 0; i <= vSteps; i++) {
            const v = (i / vSteps) * Math.PI * 2;
            const point = klein(u, v);
            const pointNext = klein(uNext, v);
            segments.push([point, pointNext]);
        }
    }
    return segments;
}

function generateFractal(depth = 4, spread = Math.PI / 5, length = 1.6) {
    const segments = [];
    function branch(origin, angle, size, level) {
        if (level === 0) {
            return;
        }
        const end = [
            origin[0] + Math.cos(angle) * size,
            origin[1] + Math.sin(angle) * size,
            origin[2],
            origin[3]
        ];
        segments.push([origin, end]);
        branch(end, angle + spread, size * 0.65, level - 1);
        branch(end, angle - spread, size * 0.65, level - 1);
    }
    branch([0, -1.8, 0, 0], Math.PI / 2, length, depth);
    return segments;
}

function generateWave(samples = 64, amplitude = 1.1, wavelength = 3.5) {
    const segments = [];
    let previous = null;
    for (let i = 0; i <= samples; i++) {
        const t = (i / samples) * Math.PI * 2;
        const x = ((t / (Math.PI * 2)) - 0.5) * wavelength;
        const y = Math.sin(t * 2) * amplitude;
        const z = Math.cos(t) * 0.4;
        const point = [x, y, z, 0];
        if (previous) {
            segments.push([previous, point]);
        }
        previous = point;
    }
    return segments;
}

function generateCrystal() {
    const base = [
        [0, 2, 0, 0],
        [1.4, 0, 0.8, 0],
        [-1.4, 0, 0.8, 0],
        [1.2, 0, -1.2, 0],
        [-1.2, 0, -1.2, 0],
        [0, -2, 0, 0]
    ];
    const edges = [
        0, 1, 0, 2, 0, 3, 0, 4,
        1, 5, 2, 5, 3, 5, 4, 5,
        1, 2, 2, 4, 4, 3, 3, 1
    ];
    return createSegmentsFromIndices(base, edges);
}

function generateHypertetrahedron() {
    const scale = 1;
    const vertices = [
        [1, 1, 1, -1 / Math.sqrt(5)],
        [1, -1, -1, -1 / Math.sqrt(5)],
        [-1, 1, -1, -1 / Math.sqrt(5)],
        [-1, -1, 1, -1 / Math.sqrt(5)],
        [0, 0, 0, (4 / Math.sqrt(5))]
    ].map((v) => v.map((value) => value * scale));
    const edges = [];
    for (let i = 0; i < vertices.length; i++) {
        for (let j = i + 1; j < vertices.length; j++) {
            edges.push(i, j);
        }
    }
    return createSegmentsFromIndices(vertices, edges);
}

function generateHypersphere(chiSteps = 6, thetaSteps = 10, phiSteps = 24) {
    const segments = [];
    for (let chiIndex = 1; chiIndex < chiSteps; chiIndex++) {
        const chi = (chiIndex / chiSteps) * Math.PI;
        const sinChi = Math.sin(chi);
        const cosChi = Math.cos(chi);
        let previousPoint = null;
        for (let i = 0; i <= phiSteps; i++) {
            const phi = (i / phiSteps) * Math.PI * 2;
            const theta = Math.PI / 4;
            const x = cosChi * Math.sin(theta) * Math.cos(phi);
            const y = cosChi * Math.sin(theta) * Math.sin(phi);
            const z = cosChi * Math.cos(theta);
            const w = sinChi;
            const point = [x, y, z, w];
            if (previousPoint) {
                segments.push([previousPoint, point]);
            }
            previousPoint = point;
        }
    }
    return segments;
}

const GENERATOR_MAP = {
    0: generateTetrahedron,
    1: generateHypercube,
    2: generateSphere,
    3: generateTorus,
    4: generateKleinBottle,
    5: generateFractal,
    6: generateWave,
    7: generateCrystal,
    8: generateHypertetrahedron,
    9: generateHypersphere
};

function buildSvg(normalisedSegments, options = {}) {
    const { width = 512, height = 512, stroke = '#52e5ff', background = '#05060d' } = options;
    const lines = normalisedSegments.map(([a, b]) => {
        const x1 = (a[0] * width).toFixed(2);
        const y1 = (1 - a[1]) * height;
        const x2 = (b[0] * width).toFixed(2);
        const y2 = (1 - b[1]) * height;
        return `<line x1="${x1}" y1="${y1.toFixed(2)}" x2="${x2}" y2="${y2.toFixed(2)}" stroke="${stroke}" stroke-width="4" stroke-linecap="round" opacity="0.9" />`;
    });
    return [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
        `<rect width="${width}" height="${height}" fill="${background}" rx="32" ry="32" />`,
        `<g>` + lines.join('') + `</g>`,
        `</svg>`
    ].join('\n');
}

function projectSegments(segments, projectionOptions) {
    return segments.map(([a, b]) => [
        projectPoint(a, projectionOptions),
        projectPoint(b, projectionOptions)
    ]);
}

async function main() {
    const outputDir = path.resolve('docs/geometry-icons');
    await fs.mkdir(outputDir, { recursive: true });

    const geometrySections = await loadGeometrySections();

    const projectionSettings = {
        0: { rotate3: { rx: 0.8, ry: -0.6, rz: 0.3 } },
        1: { rotate4: { xw: 0.7, yw: 0.4 }, rotate3: { rx: 0.9, ry: 0.5 } },
        2: { rotate3: { rx: 1.1 } },
        3: { rotate3: { rx: 1.0, ry: 0.3 } },
        4: { rotate3: { rx: 1.2, ry: 0.4 }, translate: [0, 0, -3] },
        5: { rotate3: { rz: 0.2 }, translate: [0, 0.3, -2.8] },
        6: { rotate3: { rz: -0.4 }, translate: [0, 0.3, -2.6] },
        7: { rotate3: { rx: 0.6, ry: 0.5 } },
        8: { rotate4: { xw: 0.8, yw: 0.6, zw: 0.4 }, rotate3: { rx: 0.7, ry: -0.5 } },
        9: { rotate4: { xw: 0.6, yw: 0.8 }, rotate3: { rx: 1.0 } }
    };

    const metadata = [];

    for (const section of geometrySections) {
        const generator = GENERATOR_MAP[section.geometry];
        if (!generator) {
            console.warn(`No generator found for geometry ${section.geometry}`);
            continue;
        }
        const segments = generator();
        const projected = projectSegments(segments, projectionSettings[section.geometry] || {});
        const normalised = normaliseSegments(projected);
        const svg = buildSvg(normalised);
        const geometryName = section.name.toLowerCase().replace(/\s+/g, '-');
        const fileName = `${String(section.geometry).padStart(2, '0')}-${geometryName}.svg`;
        await fs.writeFile(path.join(outputDir, fileName), svg, 'utf8');
        metadata.push({
            geometry: section.geometry,
            name: section.name,
            file: fileName,
            segments: normalised.length
        });
    }

    await fs.writeFile(path.join(outputDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    console.log(`Generated ${metadata.length} geometry icon${metadata.length === 1 ? '' : 's'} in ${outputDir}`);
}

main().catch((error) => {
    console.error('Failed to generate geometry icons');
    console.error(error);
    process.exitCode = 1;
});

