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

    // Random button
    document.getElementById('randomBtn').addEventListener('click', () => {
        currentDesign = generateRandomDesign();
        syncUI(currentDesign);
        applyDesign(currentDesign);
        hideReasoning();
    });

    // AI button
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
                    pattern: suggestion.pattern || 'none',
                    teamName: suggestion.teamName || teamName,
                    number: suggestion.number || '23'
                };
                syncUI(currentDesign);
                applyDesign(currentDesign);
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
    setPartColor('body', design.baseColor);
    setPartColor('sleeve_left', design.accentColor);
    setPartColor('sleeve_right', design.accentColor);
    setPartColor('collar', design.baseColor);

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

function showReasoning(text) {
    const el = document.getElementById('aiReasoning');
    el.textContent = text;
    el.style.display = 'block';
}

function hideReasoning() {
    const el = document.getElementById('aiReasoning');
    el.style.display = 'none';
    el.textContent = '';
}

export function getCurrentDesign() {
    return { ...currentDesign };
}