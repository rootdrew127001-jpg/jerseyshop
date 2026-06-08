const COLORS = [
    '#4F46E5', '#7C3AED', '#DC2626', '#16A34A',
    '#EA580C', '#0284C7', '#DB2777', '#D97706',
    '#0F172A', '#064E3B', '#7F1D1D', '#1E3A5F',
    '#ffffff', '#000000', '#Facc15', '#a855f7'
];

const PATTERNS = [
    'none', 'stripes', 'diagonal', 'panel', 'gradient',
    'thunderstorm', 'paint_splatter', 'apex_gamer', 
    'vortex_swoosh', 'carbon_scratch', 'digi_camo', 
    'retro_halftone', 'cyber_grid', 'tidal_wave'
];

const LOGOS = ['none', 'shield', 'star', 'flame', 'eagle', 'vortex'];
const FONTS = ['stencil', 'athletic', 'tech'];
const FINISHES = ['matte', 'satin', 'metallic', 'carbon'];
const SHOWROOMS = ['cyber', 'locker', 'stadium'];

const TEAM_NAMES = [
    'BULLS', 'HAWKS', 'WOLVES', 'KINGS',
    'STORM', 'BLAZE', 'TITANS', 'EAGLES',
    'VIPERS', 'SHARKS', 'LIONS', 'THUNDER'
];

const SPONSORS = [
    'VORTEX', 'DREAM11', 'APEX', 'TITAN',
    'MATRIX', 'CYBER', 'HYPER', 'KENT',
    'MODELYX', 'VOLT'
];

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomNumber() {
    return String(Math.floor(Math.random() * 100)).padStart(2, '0');
}

export function generateRandomDesign() {
    let baseColor = randomFrom(COLORS);
    let accentColor = randomFrom(COLORS);
    let tertiaryColor = randomFrom(COLORS);

    while (accentColor === baseColor) {
        accentColor = randomFrom(COLORS);
    }
    while (tertiaryColor === baseColor || tertiaryColor === accentColor) {
        tertiaryColor = randomFrom(COLORS);
    }

    return {
        baseColor,
        accentColor,
        tertiaryColor,
        pattern: randomFrom(PATTERNS),
        logo: randomFrom(LOGOS),
        font: randomFrom(FONTS),
        finish: randomFrom(FINISHES),
        showroom: randomFrom(SHOWROOMS),
        teamName: randomFrom(TEAM_NAMES),
        number: randomNumber(),
        sponsorText: randomFrom([true, false]) ? randomFrom(SPONSORS) : ''
    };
}