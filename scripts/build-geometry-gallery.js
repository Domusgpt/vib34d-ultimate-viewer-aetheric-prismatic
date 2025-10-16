#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const { loadGeometrySections } = require('./utils/loadGeometrySections.js');
const { loadGeometryLibrary } = require('./utils/loadGeometryLibrary.js');
const { formatNumber, formatRange, PARAM_LABELS } = require('./utils/geometryFormatting.js');

async function loadIconMetadata(metadataPath) {
    try {
        const raw = await fs.readFile(metadataPath, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        throw new Error(`Unable to read icon metadata at ${metadataPath}: ${error.message}`);
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function computeParameterEnvelopes(parameterSets) {
    const keys = new Set();
    parameterSets.forEach((params = {}) => {
        Object.keys(params).forEach((key) => {
            if (PARAM_LABELS[key]) {
                keys.add(key);
            }
        });
    });

    const envelopes = {};
    keys.forEach((key) => {
        const values = parameterSets
            .map((params) => params?.[key])
            .filter((value) => typeof value === 'number' && !Number.isNaN(value));

        if (!values.length) {
            return;
        }

        envelopes[key] = {
            label: PARAM_LABELS[key],
            min: Math.min(...values),
            max: Math.max(...values),
            formatted: formatRange(Math.min(...values), Math.max(...values))
        };
    });

    return envelopes;
}

function buildHtmlDocument({ generatedAt, summary, geometries }) {
    const totalSlots = geometries.reduce((sum, entry) => sum + entry.slots, 0);

    const navLinks = geometries
        .map((entry) => `<a href="#geometry-${entry.geometry}" class="nav-link">${escapeHtml(entry.geometry)} — ${escapeHtml(entry.name)}</a>`)
        .join('\n');

    const summaryRows = geometries
        .map((entry) => `            <tr>\n                <td class="idx">${escapeHtml(entry.geometry)}</td>\n                <td>${escapeHtml(entry.name)}</td>\n                <td class="count">${escapeHtml(entry.slots)}</td>\n                <td>${entry.iconFile ? `<code>${escapeHtml(entry.iconFile)}</code>` : '—'}</td>\n            </tr>`)
        .join('\n');

    const sectionMarkup = geometries
        .map((entry) => {
            const variationList = entry.variations
                .map((label, idx) => `                <li><span class="badge">${idx + 1}</span> ${escapeHtml(label)}</li>`)
                .join('\n');

            const parameterRows = Object.values(entry.parameters)
                .map((param) => `                <tr>\n                    <th scope="row">${escapeHtml(param.label)}</th>\n                    <td>${escapeHtml(param.formatted)}</td>\n                    <td class="raw">${escapeHtml(formatNumber(param.min))}</td>\n                    <td class="raw">${escapeHtml(formatNumber(param.max))}</td>\n                </tr>`)
                .join('\n');

            const iconMarkup = entry.iconFile
                ? `<img src="../geometry-icons/${escapeHtml(entry.iconFile)}" alt="${escapeHtml(entry.name)} silhouette" loading="lazy" />`
                : '<div class="icon-missing">Icon missing</div>';

            return `        <section id="geometry-${escapeHtml(entry.geometry)}" class="geometry-card">\n            <header>\n                <h2><span class="index">${escapeHtml(entry.geometry)}</span> ${escapeHtml(entry.name)}</h2>\n                <p class="subtitle">${escapeHtml(entry.slots)} preset ${entry.slots === 1 ? 'slot' : 'slots'}${entry.iconSegments ? ` • ${escapeHtml(entry.iconSegments)} segments` : ''}</p>\n            </header>\n            <div class="card-body">\n                <figure class="icon-frame">\n                    ${iconMarkup}\n                </figure>\n                <div class="card-content">\n                    <h3>Preset labels</h3>\n                    <ol class="preset-list">\n${variationList}\n                    </ol>\n                    <h3>Parameter envelopes</h3>\n                    <table class="parameter-table">\n                        <thead>\n                            <tr>\n                                <th scope="col">Parameter</th>\n                                <th scope="col">Range</th>\n                                <th scope="col" class="raw">Min</th>\n                                <th scope="col" class="raw">Max</th>\n                            </tr>\n                        </thead>\n                        <tbody>\n${parameterRows}\n                        </tbody>\n                    </table>\n                </div>\n            </div>\n        </section>`;
        })
        .join('\n\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>Geometry Preset Gallery</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
        :root {
            color-scheme: light dark;
            font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: #0b0f16;
            color: #e8efff;
        }
        body {
            margin: 0;
            padding: 0;
            display: flex;
            min-height: 100vh;
        }
        nav {
            width: 18rem;
            max-width: 100%;
            background: rgba(9, 14, 22, 0.92);
            border-right: 1px solid rgba(120, 140, 200, 0.3);
            padding: 1.5rem 1rem;
            position: sticky;
            top: 0;
            align-self: flex-start;
            height: 100vh;
            overflow-y: auto;
        }
        nav h1 {
            font-size: 1.1rem;
            margin: 0 0 1rem;
            text-transform: uppercase;
            letter-spacing: 0.16em;
            color: #7dd3ff;
        }
        .nav-link {
            display: block;
            padding: 0.4rem 0.6rem;
            margin: 0.1rem 0;
            border-radius: 0.5rem;
            color: inherit;
            text-decoration: none;
            transition: background 160ms ease;
        }
        .nav-link:hover {
            background: rgba(125, 211, 255, 0.18);
        }
        main {
            flex: 1;
            padding: 2rem 3vw 4rem;
            overflow-x: hidden;
        }
        .summary-card {
            background: rgba(10, 16, 28, 0.82);
            border: 1px solid rgba(125, 211, 255, 0.25);
            border-radius: 1.2rem;
            padding: 1.5rem;
            margin-bottom: 2.5rem;
            box-shadow: 0 20px 45px rgba(6, 12, 20, 0.55);
        }
        .summary-card h2 {
            margin-top: 0;
            font-size: 1.4rem;
        }
        .summary-card table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }
        .summary-card th,
        .summary-card td {
            text-align: left;
            padding: 0.4rem 0.5rem;
        }
        .summary-card thead {
            color: rgba(232, 239, 255, 0.7);
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .summary-card tbody tr:nth-child(odd) {
            background: rgba(125, 211, 255, 0.08);
        }
        .summary-card .idx {
            width: 3rem;
        }
        .summary-card .count {
            text-align: right;
        }
        .geometry-card {
            background: rgba(8, 12, 20, 0.78);
            border: 1px solid rgba(125, 211, 255, 0.22);
            border-radius: 1.5rem;
            margin-bottom: 2.5rem;
            box-shadow: 0 25px 55px rgba(7, 13, 21, 0.65);
            overflow: hidden;
        }
        .geometry-card header {
            padding: 1.5rem 1.8rem 1rem;
            border-bottom: 1px solid rgba(125, 211, 255, 0.18);
            background: linear-gradient(135deg, rgba(28, 47, 89, 0.7), rgba(16, 25, 45, 0.6));
        }
        .geometry-card h2 {
            margin: 0;
            font-size: 1.6rem;
            display: flex;
            align-items: baseline;
            gap: 0.8rem;
        }
        .geometry-card h2 .index {
            font-size: 0.9rem;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 2.1rem;
            height: 2.1rem;
            border-radius: 0.6rem;
            background: rgba(125, 211, 255, 0.28);
            color: #0a1524;
            font-weight: 700;
        }
        .geometry-card .subtitle {
            margin: 0.35rem 0 0;
            color: rgba(232, 239, 255, 0.7);
            font-size: 0.95rem;
        }
        .card-body {
            display: grid;
            grid-template-columns: minmax(220px, 280px) 1fr;
            gap: 1.8rem;
            padding: 1.5rem 1.8rem 2rem;
        }
        .icon-frame {
            margin: 0;
            background: rgba(6, 10, 18, 0.85);
            border: 1px solid rgba(125, 211, 255, 0.18);
            border-radius: 1.2rem;
            padding: 1.1rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .icon-frame img {
            display: block;
            width: 100%;
            height: auto;
            filter: drop-shadow(0 0 12px rgba(125, 211, 255, 0.35));
        }
        .icon-missing {
            padding: 2rem;
            text-align: center;
            color: rgba(232, 239, 255, 0.6);
        }
        .card-content h3 {
            margin: 0 0 0.8rem;
            font-size: 1.05rem;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: rgba(125, 211, 255, 0.9);
        }
        .preset-list {
            margin: 0 0 1.2rem;
            padding: 0;
            list-style: none;
        }
        .preset-list li {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.35rem 0.5rem;
            border-radius: 0.6rem;
            background: rgba(125, 211, 255, 0.08);
            margin-bottom: 0.4rem;
        }
        .preset-list .badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 1.9rem;
            height: 1.9rem;
            border-radius: 0.55rem;
            background: rgba(125, 211, 255, 0.26);
            color: #051022;
            font-weight: 700;
        }
        .parameter-table {
            width: 100%;
            border-collapse: collapse;
        }
        .parameter-table th,
        .parameter-table td {
            text-align: left;
            padding: 0.45rem 0.55rem;
        }
        .parameter-table tbody tr:nth-child(odd) {
            background: rgba(125, 211, 255, 0.06);
        }
        .parameter-table .raw {
            font-family: 'Roboto Mono', 'SFMono-Regular', ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 0.85rem;
            text-align: right;
        }
        footer {
            margin-top: 3rem;
            text-align: center;
            color: rgba(232, 239, 255, 0.6);
            font-size: 0.85rem;
        }
        @media (max-width: 1040px) {
            body {
                flex-direction: column;
            }
            nav {
                width: auto;
                height: auto;
                position: relative;
                border-right: none;
                border-bottom: 1px solid rgba(120, 140, 200, 0.3);
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                justify-content: center;
            }
            .nav-link {
                border: 1px solid rgba(125, 211, 255, 0.2);
            }
            main {
                padding: 1.5rem;
            }
            .card-body {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <nav>
        <h1>Geometry Gallery</h1>
        ${navLinks}
    </nav>
    <main>
        <section class="summary-card">
            <h2>Preset overview</h2>
            <p>Generated ${escapeHtml(generatedAt)} • ${escapeHtml(summary.geometries)} geometries • ${escapeHtml(totalSlots)} preset slots • ${escapeHtml(summary.icons)} icons</p>
            <table>
                <thead>
                    <tr>
                        <th class="idx" scope="col">Index</th>
                        <th scope="col">Geometry</th>
                        <th class="count" scope="col">Preset slots</th>
                        <th scope="col">Icon file</th>
                    </tr>
                </thead>
                <tbody>
${summaryRows}
                </tbody>
            </table>
        </section>
${sectionMarkup}
        <footer>
            Generated by <code>npm run geometry:gallery</code>. Source metadata from <code>variationPresets.js</code> and <code>docs/geometry-icons/metadata.json</code>.
        </footer>
    </main>
</body>
</html>`;
}

async function main() {
    const projectRoot = path.resolve('.');
    const metadataPath = path.join(projectRoot, 'docs/geometry-icons/metadata.json');
    const galleryDir = path.join(projectRoot, 'docs/geometry-gallery');
    const htmlPath = path.join(galleryDir, 'index.html');
    const dataPath = path.join(galleryDir, 'data.json');

    const [sections, metadata, GeometryLibrary] = await Promise.all([
        loadGeometrySections(),
        loadIconMetadata(metadataPath),
        loadGeometryLibrary(projectRoot)
    ]);

    if (!Array.isArray(sections) || !sections.length) {
        throw new Error('No geometry sections discovered while building the gallery.');
    }

    if (!Array.isArray(metadata) || !metadata.length) {
        throw new Error('Icon metadata is missing. Run `npm run geometry:icons` first.');
    }

    const metadataByGeometry = new Map(metadata.map((entry) => [entry.geometry, entry]));

    const geometries = sections.map((section) => {
        const geometryName = GeometryLibrary.getGeometryName(section.geometry);
        const variations = Array.from({ length: section.levels }, (_, level) => `${geometryName} LATTICE ${level + 1}`);
        const parameterSets = Array.from({ length: section.levels }, (_, level) =>
            GeometryLibrary.getVariationParameters(section.geometry, level)
        );
        const envelopes = computeParameterEnvelopes(parameterSets);
        const iconEntry = metadataByGeometry.get(section.geometry) || null;

        return {
            geometry: section.geometry,
            name: section.name,
            className: section.className || null,
            slots: section.levels,
            iconFile: iconEntry?.file || null,
            iconSegments: iconEntry?.segments || null,
            variations,
            parameters: envelopes,
            parameterSets
        };
    });

    const generatedAt = new Date().toISOString();
    const summary = {
        generatedAt,
        geometries: geometries.length,
        icons: metadata.length
    };

    await fs.mkdir(galleryDir, { recursive: true });
    await fs.writeFile(
        dataPath,
        JSON.stringify({ generatedAt, geometries }, null, 2),
        'utf8'
    );

    const html = buildHtmlDocument({ generatedAt, summary, geometries });
    await fs.writeFile(htmlPath, html, 'utf8');

    console.log('Geometry gallery written to:');
    console.log(` • ${htmlPath}`);
    console.log(` • ${dataPath}`);
}

main().catch((error) => {
    console.error('Failed to build geometry gallery.');
    console.error(error);
    process.exitCode = 1;
});
