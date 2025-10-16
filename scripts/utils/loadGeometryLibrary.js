const fs = require('fs/promises');
const path = require('path');
const vm = require('vm');

async function loadGeometryLibrary(projectRoot = path.resolve('.')) {
    const modulePath = path.join(projectRoot, 'src/geometry/GeometryLibrary.js');
    const source = await fs.readFile(modulePath, 'utf8');
    const transformed = `${source.replace(/export\s+class\s+GeometryLibrary/, 'class GeometryLibrary')}\nmodule.exports = { GeometryLibrary };\n`;

    const context = { module: { exports: {} }, exports: {} };
    vm.createContext(context);

    try {
        const script = new vm.Script(transformed, { filename: 'GeometryLibrary.js' });
        script.runInContext(context);
    } catch (error) {
        throw new Error(`Unable to evaluate GeometryLibrary.js: ${error.message}`);
    }

    if (!context.module.exports || !context.module.exports.GeometryLibrary) {
        throw new Error('GeometryLibrary evaluation did not yield the expected export.');
    }

    return context.module.exports.GeometryLibrary;
}

module.exports = {
    loadGeometryLibrary
};
