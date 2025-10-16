#!/usr/bin/env node

const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { loadGeometrySections } = require('./utils/loadGeometrySections.js');

function slugifyName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function loadIconMetadata(metadataPath) {
    try {
        const raw = await fs.readFile(metadataPath, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        throw new Error(`Unable to read icon metadata at ${metadataPath}: ${error.message}`);
    }
}

async function main() {
    const projectRoot = path.resolve('.');
    const metadataPath = path.join(projectRoot, 'docs/geometry-icons/metadata.json');
    const galleryDir = path.join(projectRoot, 'docs/geometry-gallery');
    const galleryHtmlPath = path.join(galleryDir, 'index.html');
    const galleryDataPath = path.join(galleryDir, 'data.json');

    const [sections, metadata, galleryDataRaw] = await Promise.all([
        loadGeometrySections(),
        loadIconMetadata(metadataPath),
        fs.readFile(galleryDataPath, 'utf8').catch((error) => {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        })
    ]);

    const errors = [];

    if (!Array.isArray(sections) || !sections.length) {
        errors.push('No geometry sections were discovered.');
    }

    if (!Array.isArray(metadata) || !metadata.length) {
        errors.push('Icon metadata file is empty or missing entries.');
    }

    const geometryToSection = new Map();

    for (const section of sections) {
        const { geometry, name, levels } = section;

        if (geometryToSection.has(geometry)) {
            errors.push(`Duplicate geometry index detected in presets: ${geometry}`);
            continue;
        }

        geometryToSection.set(geometry, section);

        if (typeof geometry !== 'number' || Number.isNaN(geometry)) {
            errors.push(`Invalid geometry index on section ${JSON.stringify(section)}`);
        }

        if (typeof name !== 'string' || !name.trim()) {
            errors.push(`Section ${geometry} is missing a readable name.`);
        }

        if (!Number.isInteger(levels) || levels <= 0) {
            errors.push(`Section ${geometry} (${name}) has an invalid level count: ${levels}`);
        }

    }

    if (metadata && metadata.length !== sections.length) {
        errors.push(
            `Icon manifest count (${metadata.length}) does not match geometry section count (${sections.length}).`
        );
    }

    const iconDir = path.join(projectRoot, 'docs/geometry-icons');

    const metadataByGeometry = new Map();

    metadata?.forEach((entry, index) => {
        const section = geometryToSection.get(entry.geometry);
        const ordinal = `metadata[${index}]`;

        if (!section) {
            errors.push(`${ordinal} references unknown geometry index ${entry.geometry}.`);
            return;
        }

        metadataByGeometry.set(entry.geometry, entry);

        if (typeof entry.name !== 'string' || !entry.name.trim()) {
            errors.push(`${ordinal} is missing a name.`);
        } else if (entry.name.toLowerCase() !== section.name.toLowerCase()) {
            errors.push(
                `${ordinal} name mismatch: expected "${section.name}", received "${entry.name}".`
            );
        }

        const expectedSlug = slugifyName(section.name);
        const expectedFile = `${String(section.geometry).padStart(2, '0')}-${expectedSlug}.svg`;
        if (entry.file !== expectedFile) {
            errors.push(
                `${ordinal} file mismatch: expected "${expectedFile}", received "${entry.file}".`
            );
        } else {
            const fullPath = path.join(iconDir, entry.file);
            if (!fsSync.existsSync(fullPath)) {
                errors.push(`${ordinal} references missing icon file ${entry.file}.`);
            }
        }

        if (!Number.isInteger(entry.segments) || entry.segments <= 0) {
            errors.push(`${ordinal} has invalid segment count: ${entry.segments}`);
        }
    });

    const sortedByGeometry = [...(metadata || [])].sort((a, b) => a.geometry - b.geometry);
    if (metadata && metadata.some((entry, idx) => entry.geometry !== sortedByGeometry[idx].geometry)) {
        errors.push('Icon metadata is not sorted by geometry index.');
    }

    const totalPresetCount = sections.reduce((sum, section) => sum + (section.levels || 0), 0);

    if (!fsSync.existsSync(galleryHtmlPath)) {
        errors.push('Geometry gallery HTML is missing. Run `npm run geometry:gallery`.');
    }

    let galleryData = null;

    if (galleryDataRaw !== null) {
        try {
            galleryData = JSON.parse(galleryDataRaw);
        } catch (error) {
            errors.push(`Unable to parse geometry gallery data.json: ${error.message}`);
        }
    } else {
        errors.push('Geometry gallery data.json not found. Run `npm run geometry:gallery`.');
    }

    if (galleryData && Array.isArray(galleryData.geometries)) {
        if (galleryData.geometries.length !== sections.length) {
            errors.push(
                `Gallery data geometry count (${galleryData.geometries.length}) does not match preset sections (${sections.length}).`
            );
        }

        galleryData.geometries.forEach((entry, index) => {
            const section = geometryToSection.get(entry.geometry);
            const label = `galleryData.geometries[${index}]`;

            if (!section) {
                errors.push(`${label} references unknown geometry index ${entry.geometry}.`);
                return;
            }

            if (entry.slots !== section.levels) {
                errors.push(
                    `${label} preset slot mismatch: expected ${section.levels}, received ${entry.slots}.`
                );
            }

            if (!Array.isArray(entry.variations) || entry.variations.length !== section.levels) {
                errors.push(
                    `${label} variation labels mismatch: expected ${section.levels}, received ${entry.variations?.length || 0}.`
                );
            }

            const iconEntry = metadataByGeometry.get(entry.geometry);
            if (iconEntry && entry.iconFile !== iconEntry.file) {
                errors.push(
                    `${label} icon file mismatch: expected ${iconEntry.file}, received ${entry.iconFile || '—'}.`
                );
            }

            if (!entry.parameters || typeof entry.parameters !== 'object') {
                errors.push(`${label} is missing parameter envelopes.`);
            }
        });
    } else if (!errors.length) {
        errors.push('Geometry gallery data is malformed.');
    }

    if (errors.length) {
        console.error('Geometry asset verification failed:');
        for (const error of errors) {
            console.error(` - ${error}`);
        }
        process.exitCode = 1;
        return;
    }

    console.log('Geometry asset verification succeeded.');
    console.log(` • Geometry sections: ${sections.length}`);
    console.log(` • Total preset slots: ${totalPresetCount}`);
    console.log(` • Icon manifest entries: ${metadata.length}`);
}

main().catch((error) => {
    console.error('Unexpected error while verifying geometry assets.');
    console.error(error);
    process.exitCode = 1;
});
