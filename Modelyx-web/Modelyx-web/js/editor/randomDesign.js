const COLORS = [
    '#4F46E5', '#7C3AED', '#DC2626', '#16A34A',
    '#EA580C', '#0284C7', '#DB2777', '#D97706',
    '#0F172A', '#064E3B', '#7F1D1D', '#1E3A5F'
];

const PATTERNS = ['none', 'stripes', 'diagonal', 'panel', 'gradient'];

const TEAM_NAMES = [
    'BULLS', 'HAWKS', 'WOLVES', 'KINGS',
    'STORM', 'BLAZE', 'TITANS', 'EAGLES',
    'VIPERS', 'SHARKS', 'LIONS', 'THUNDER'
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

    while (accentColor === baseColor) {
        accentColor = randomFrom(COLORS);
    }

    return {
        baseColor,
        accentColor,
        pattern: randomFrom(PATTERNS),
        teamName: randomFrom(TEAM_NAMES),
        number: randomNumber()
    };
}