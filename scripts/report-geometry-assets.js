#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const { loadGeometrySections } = require('./utils/loadGeometrySections.js');

async function loadIconMetadata(projectRoot) {
    const metadataPath = path.join(projectRoot, 'docs/geometry-icons/metadata.json');
    try {
        const raw = await fs.readFile(metadataPath, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        return { error, metadataPath };
    }
}

function parseArgs(argv) {
    const args = { output: null, quiet: false };

    for (let i = 2; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--quiet' || arg === '-q') {
            args.quiet = true;
        } else if (arg === '--stdout') {
            args.output = null;
        } else if ((arg === '--output' || arg === '-o') && i + 1 < argv.length) {
            args.output = argv[++i];
        } else {
            console.warn(`Unknown argument: ${arg}`);
        }
    }

    return args;
}

function formatTable(rows) {
    const headers = ['Geometry', 'Name', 'Presets', 'Icon', 'Segments'];
    const table = [headers];
    for (const row of rows) {
        table.push([
            String(row.geometry),
            row.name,
            String(row.levels),
            row.icon || '—',
            row.segments ? String(row.segments) : '—'
        ]);
    }

    const widths = headers.map((_, colIndex) => (
        table.reduce((max, row) => Math.max(max, row[colIndex].length), 0)
    ));

    function pad(text, width) {
        return text + ' '.repeat(Math.max(0, width - text.length));
    }

    const lines = [];
    lines.push(`| ${headers.map((h, idx) => pad(h, widths[idx])).join(' | ')} |`);
    lines.push(`| ${widths.map((w) => '-'.repeat(w)).join(' | ')} |`);
    for (let i = 1; i < table.length; i++) {
        lines.push(`| ${table[i].map((cell, idx) => pad(cell, widths[idx])).join(' | ')} |`);
    }

    return lines.join('\n');
}

async function writeOutput(targetPath, contents) {
    const resolved = path.resolve(targetPath);
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, contents, 'utf8');
    return resolved;
}

async function main() {
    const projectRoot = path.resolve('.');
    const args = parseArgs(process.argv);
    const sections = await loadGeometrySections();
    const iconResult = await loadIconMetadata(projectRoot);
    const metadata = Array.isArray(iconResult) ? iconResult : null;

    const summary = [];
    const issues = [];
    const generatedAt = new Date().toISOString();

    if (!sections.length) {
        issues.push('No geometry preset sections were discovered.');
    } else {
        summary.push(`Geometry sections: **${sections.length}**`);
        const totalPresets = sections.reduce((sum, section) => sum + (section.levels || 0), 0);
        summary.push(`Total preset slots: **${totalPresets}**`);
    }

    if (metadata) {
        summary.push(`Icon manifest entries: **${metadata.length}**`);
    } else if (iconResult?.error) {
        issues.push(`Failed to load icon metadata at ${iconResult.metadataPath}: ${iconResult.error.message}`);
    } else {
        issues.push('Icon metadata is missing or malformed.');
    }

    const metadataByGeometry = new Map();
    if (metadata) {
        for (const entry of metadata) {
            metadataByGeometry.set(entry.geometry, entry);
        }
    }

    const rows = sections.map((section) => {
        const icon = metadataByGeometry.get(section.geometry);
        if (!icon) {
            issues.push(`No icon metadata entry found for geometry ${section.geometry} (${section.name}).`);
        }
        return {
            geometry: section.geometry,
            name: section.name,
            levels: section.levels,
            icon: icon?.file || null,
            segments: icon?.segments || null
        };
    });

    if (metadata && metadata.length !== sections.length) {
        issues.push(`Icon manifest count (${metadata.length}) does not match geometry section count (${sections.length}).`);
    }

    const table = formatTable(rows);

    const body = [
        '# Geometry Asset Status\n',
        `> Generated via \`npm run geometry:report\` on ${generatedAt}.\n`,
        'This report summarizes the relationship between geometry preset sections, generated icons, and manifest metadata.\n',
        '## Summary\n',
        summary.map((line) => `- ${line}`).join('\n') || '- No data available.',
        '\n',
        '## Coverage Table\n',
        table,
        '\n'
    ];

    if (issues.length) {
        body.push('## Issues\n');
        issues.forEach((issue) => body.push(`- ${issue}`));
        body.push('\n');
    } else {
        body.push('## Issues\n');
        body.push('- No issues detected.\n');
    }

    const output = body.join('\n');

    if (args.output) {
        const resolved = await writeOutput(args.output, output);
        if (!args.quiet) {
            console.log(`Geometry asset report written to ${resolved}`);
        }
    } else if (!args.quiet) {
        console.log(output);
    }
}

main().catch((error) => {
    console.error('Unexpected error while generating geometry asset report.');
    console.error(error);
    process.exitCode = 1;
});
