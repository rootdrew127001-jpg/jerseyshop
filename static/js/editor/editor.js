import { initViewer, setPartColor, applyTextureToPanel, applyTextureToBack, applyMaterialFinish, changeEnvironment } from './threeViewer.js';
import { buildTexture, buildBackTexture } from './textureBuilder.js';
import { generateRandomDesign } from './randomDesign.js';

let currentDesign = {
    baseColor: '#4F46E5',
    accentColor: '#7C3AED',
    tertiaryColor: '#ffffff',
    pattern: 'none',
    logo: 'none',
    font: 'athletic',
    finish: 'matte',
    showroom: 'cyber',
    teamName: 'TEAM',
    number: '23',
    sponsorText: ''
};

export function initEditor() {
    initViewer('jerseyCanvas');
    applyDesign(currentDesign);
    changeEnvironment(currentDesign.showroom);
    syncUI(currentDesign);
    bindControls();
}

function bindControls() {
    // Basic color inputs
    document.getElementById('baseColor').addEventListener('input', e => {
        currentDesign.baseColor = e.target.value;
        applyDesign(currentDesign);
    });

    document.getElementById('accentColor').addEventListener('input', e => {
        currentDesign.accentColor = e.target.value;
        applyDesign(currentDesign);
    });

    document.getElementById('tertiaryColor').addEventListener('input', e => {
        currentDesign.tertiaryColor = e.target.value;
        applyDesign(currentDesign);
    });

    // Dropdown selectors
    document.getElementById('pattern').addEventListener('change', e => {
        currentDesign.pattern = e.target.value;
        applyDesign(currentDesign);
    });

    document.getElementById('logo').addEventListener('change', e => {
        currentDesign.logo = e.target.value;
        applyDesign(currentDesign);
    });

    document.getElementById('font').addEventListener('change', e => {
        currentDesign.font = e.target.value;
        applyDesign(currentDesign);
    });

    // Text inputs
    document.getElementById('teamName').addEventListener('input', e => {
        currentDesign.teamName = e.target.value;
        applyDesign(currentDesign);
    });

    document.getElementById('number').addEventListener('input', e => {
        currentDesign.number = e.target.value;
        applyDesign(currentDesign);
    });

    document.getElementById('sponsorText').addEventListener('input', e => {
        currentDesign.sponsorText = e.target.value;
        applyDesign(currentDesign);
    });

    // Material finish buttons
    const finishes = ['matte', 'satin', 'metallic', 'carbon'];
    finishes.forEach(f => {
        const id = 'finish' + f.charAt(0).toUpperCase() + f.slice(1);
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => {
                currentDesign.finish = f;
                applyMaterialFinish(f);
                syncUI(currentDesign);
            });
        }
    });

    // Showroom environment buttons
    const showrooms = ['cyber', 'locker', 'stadium'];
    showrooms.forEach(s => {
        const id = 'env' + s.charAt(0).toUpperCase() + s.slice(1);
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => {
                currentDesign.showroom = s;
                changeEnvironment(s);
                syncUI(currentDesign);
            });
        }
    });

    // Random design generator
    document.getElementById('randomBtn').addEventListener('click', () => {
        currentDesign = generateRandomDesign();
        syncUI(currentDesign);
        applyDesign(currentDesign);
        changeEnvironment(currentDesign.showroom);
        hideReasoning();
    });

    // AI suggestion handler
    document.getElementById('aiBtn').addEventListener('click', async () => {
        const teamName = document.getElementById('teamName').value.trim() || 'TEAM';
        const btn = document.getElementById('aiBtn');

        btn.disabled = true;
        btn.textContent = '🤖 Thinking...';
        hideReasoning();

        try {
            const res = await fetch('/ai/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team_name: teamName })
            });

            const suggestion = await res.json();

            if (res.ok && suggestion) {
                currentDesign = {
                    baseColor: suggestion.baseColor || currentDesign.baseColor,
                    accentColor: suggestion.accentColor || currentDesign.accentColor,
                    tertiaryColor: suggestion.tertiaryColor || currentDesign.tertiaryColor,
                    pattern: suggestion.pattern || 'none',
                    logo: suggestion.logo || 'none',
                    font: suggestion.font || 'athletic',
                    finish: suggestion.finish || 'matte',
                    showroom: suggestion.showroom || 'cyber',
                    teamName: suggestion.teamName || teamName,
                    number: suggestion.number || '23',
                    sponsorText: suggestion.sponsorText || ''
                };
                syncUI(currentDesign);
                applyDesign(currentDesign);
                changeEnvironment(currentDesign.showroom);
                showReasoning(suggestion.reasoning);
            } else {
                showReasoning('AI suggestion failed. Try again.');
            }
        } catch (err) {
            console.error(err);
            showReasoning('Server error. Is the API running?');
        }

        btn.disabled = false;
        btn.textContent = '🤖 AI Suggest Design';
    });
}

function applyDesign(design) {
    setPartColor('jersey_body', design.baseColor);
    setPartColor('jersey_front', design.baseColor);
    setPartColor('jersey_back', design.baseColor);
    setPartColor('shorts', design.accentColor);

    const frontTexture = buildTexture(design);
    applyTextureToPanel(frontTexture);

    const backTexture = buildBackTexture(design);
    applyTextureToBack(backTexture);

    // Apply material finishes in Three.js
    applyMaterialFinish(design.finish);
}

function syncUI(design) {
    document.getElementById('baseColor').value = design.baseColor;
    document.getElementById('accentColor').value = design.accentColor;
    document.getElementById('tertiaryColor').value = design.tertiaryColor || '#ffffff';
    document.getElementById('pattern').value = design.pattern;
    document.getElementById('logo').value = design.logo || 'none';
    document.getElementById('font').value = design.font || 'athletic';
    document.getElementById('teamName').value = design.teamName;
    document.getElementById('number').value = design.number;
    document.getElementById('sponsorText').value = design.sponsorText || '';

    // Sync active/inactive state styles on finish buttons
    const finishes = ['matte', 'satin', 'metallic', 'carbon'];
    finishes.forEach(f => {
        const id = 'finish' + f.charAt(0).toUpperCase() + f.slice(1);
        const btn = document.getElementById(id);
        if (btn) {
            if (f === design.finish) {
                btn.className = 'bg-indigo-600 text-white font-bold py-2 rounded-lg text-[10px] transition';
            } else {
                btn.className = 'bg-slate-700 hover:bg-slate-650 text-slate-300 font-bold py-2 rounded-lg text-[10px] transition';
            }
        }
    });

    // Sync active/inactive state styles on showroom buttons
    const showrooms = ['cyber', 'locker', 'stadium'];
    showrooms.forEach(s => {
        const id = 'env' + s.charAt(0).toUpperCase() + s.slice(1);
        const btn = document.getElementById(id);
        if (btn) {
            if (s === design.showroom) {
                btn.className = 'bg-indigo-600 text-white font-bold py-2 rounded-xl text-xs transition border border-indigo-400/30';
            } else {
                btn.className = 'bg-slate-700 hover:bg-slate-650 text-slate-300 font-bold py-2 rounded-xl text-xs transition';
            }
        }
    });
}

function showReasoning(text) {
    const el = document.getElementById('aiReasoning');
    if (el) {
        el.textContent = text;
        el.style.display = 'block';
    }
}

function hideReasoning() {
    const el = document.getElementById('aiReasoning');
    if (el) {
        el.style.display = 'none';
        el.textContent = '';
    }
}

export function getCurrentDesign() {
    return { ...currentDesign };
}