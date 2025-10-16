function isEffectivelyInteger(value) {
    return Number.isInteger(value) || Math.abs(value - Math.round(value)) < 1e-6;
}

function formatNumber(value) {
    if (value === undefined || value === null || Number.isNaN(value)) {
        return '—';
    }

    if (isEffectivelyInteger(value)) {
        return String(Math.round(value));
    }

    const abs = Math.abs(value);

    if (abs >= 100) {
        return value.toFixed(0);
    }

    if (abs >= 10) {
        return value.toFixed(1);
    }

    return value.toFixed(2);
}

function formatRange(min, max) {
    if (min === undefined || max === undefined) {
        return '—';
    }

    if (Math.abs(min - max) < 1e-6) {
        return formatNumber(min);
    }

    return `${formatNumber(min)} – ${formatNumber(max)}`;
}

const PARAM_LABELS = {
    gridDensity: 'Grid density',
    morphFactor: 'Morph factor',
    chaos: 'Chaos',
    speed: 'Speed',
    hue: 'Hue',
    rot4dXW: 'XW rotation',
    rot4dYW: 'YW rotation',
    rot4dZW: 'ZW rotation',
    dimension: 'Dimension'
};

module.exports = {
    formatNumber,
    formatRange,
    PARAM_LABELS
};
