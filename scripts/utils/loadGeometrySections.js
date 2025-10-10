const fs = require('fs/promises');
const path = require('path');

async function loadGeometrySections() {
    const filePath = path.resolve('src/variations/variationPresets.js');
    const contents = await fs.readFile(filePath, 'utf8');
    const match = contents.match(/export const GEOMETRY_SECTIONS = ([\s\S]*?\n];)/);

    if (!match) {
        throw new Error('Unable to locate GEOMETRY_SECTIONS definition in variationPresets.js');
    }

    // eslint-disable-next-line no-new-func
    const sections = new Function(`return ${match[1]};`)();
    return sections;
}

module.exports = {
    loadGeometrySections
};
