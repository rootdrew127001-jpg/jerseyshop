import { initViewer, setPartColor, applyTextureToPanel } from './threeViewer.js';
import { buildTexture } from './textureBuilder.js';
import { generateRandomDesign } from './randomDesign.js';

let currentDesign = {
    baseColor: '#4F46E5',
    accentColor: '#7C3AED',
    pattern: 'none',
    teamName: 'TEAM',
    number: '23'
};

export function initEditor() {
    initViewer('jerseyCanvas');
    applyDesign(currentDesign);
    bindControls();
}

function bindControls() {
    document.getElementById('baseColor').addEventListener('input', e => {
        currentDesign.baseColor = e.target.value;
        applyDesign(currentDesign);
    });

    document.getElementById('accentColor').addEventListener('input', e => {
        currentDesign.accentColor = e.target.value;
        applyDesign(currentDesign);
    });

    document.getElementById('pattern').addEventListener('change', e => {
        currentDesign.pattern = e.target.value;
        applyDesign(currentDesign);
    });

    document.getElementById('teamName').addEventListener('input', e => {
        currentDesign.teamName = e.target.value;
        applyDesign(currentDesign);
    });

    document.getElementById('number').addEventListener('input', e => {
        currentDesign.number = e.target.value;
        applyDesign(currentDesign);
    });

    document.getElementById('randomBtn').addEventListener('click', () => {
        currentDesign = generateRandomDesign();
        syncUI(currentDesign);
        applyDesign(currentDesign);
    });
}

function applyDesign(design) {
    // Apply colors to mesh parts
    setPartColor('body', design.baseColor);
    setPartColor('sleeve_left', design.accentColor);
    setPartColor('sleeve_right', design.accentColor);
    setPartColor('collar', design.baseColor);

    // Build and apply canvas texture to panel
    const texture = buildTexture(design);
    applyTextureToPanel(texture);
}

function syncUI(design) {
    document.getElementById('baseColor').value = design.baseColor;
    document.getElementById('accentColor').value = design.accentColor;
    document.getElementById('pattern').value = design.pattern;
    document.getElementById('teamName').value = design.teamName;
    document.getElementById('number').value = design.number;
}