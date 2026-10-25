import { initViewer, loadJerseyModel, setPartColor, setTrimColor, applyTextureToPanel, applyTextureToBack, applyTextureToShortsFront, applyTextureToShortsBack, applyMaterialFinish, changeEnvironment, playAnimation, getAvailableAnimations, getCurrentAnimation, fitCameraToObject, setCameraAngle, setCameraFocus, triggerShowcaseSpin, setMannequinSkin, getCurrentMannequinSkin, PRESET_SKINS } from './threeViewer.js?v=20261025_parity_fix';
import { buildTexture, buildBackTexture, buildShortsTexture, buildShortsBackTexture, renderJersey2D, renderJersey2DSide, renderShorts2D, renderShorts2DSide, renderUniform2D, renderUniform2DSide } from './textureBuilder.js?v=20261025_parity_fix';
import { generateRandomDesign } from './randomDesign.js';
import { GOOGLE_FONTS } from './googleFontsList.js';
import { generateParameterizedPatterns } from './patternsGenerator.js';

const DEFAULT_COORDS = {
    numberSize: 140,
    frontNumberSize: 140,
    backNumberSize: 140,
    outlineWeight: 8,
    customFont: '',
    logoSize: 60,
    logoX: 256,
    logoY: 155,
    sponsorX: 256,
    sponsorY: 222,
    numberX: 256,
    numberY: 340,
    teamX: 256,
    teamY: 96,
    backNameX: 256,
    backNameY: 380,
    backNumberX: 256,
    backNumberY: 290,
    // Shorts front coordinates & sizes
    shortsNumberX: 127,
    shortsNumberY: 385,
    shortsNumberSize: 54,
    shortsLogoX: 385,
    shortsLogoY: 385,
    shortsLogoSize: 46,
    shortsText: '',
    showShortsText: false,
    shortsTextX: 385,
    shortsTextY: 320,
    shortsTextSize: 32,
    // Shorts back coordinates & sizes
    shortsBackNumberX: 385,
    shortsBackNumberY: 385,
    shortsBackNumberSize: 54,
    showShortsBackNumber: false,
    shortsBackText: '',
    showShortsBackText: false,
    shortsBackTextX: 256,
    shortsBackTextY: 385,
    shortsBackTextSize: 32
};

let currentDesign = {
    gender: 'male',
    jerseyType: 'sleeveless',
    baseColor: '#4F46E5',
    accentColor: '#7C3AED',
    tertiaryColor: '#ffffff',
    pattern: 'none',
    logo: 'none',
    font: 'athletic',
    finish: 'matte',
    showroom: 'cyber',
    frontText: 'TEAM',
    backName: 'PLAYER',
    number: '23',
    sponsorText: '',
    showFrontText: true,
    showFrontNumber: true,
    showBackText: true,
    showBackNumber: true,
    showSponsor: false,
    skinTone: 'obsidian',
    // Shorts settings
    matchJerseyColors: true,
    shortsBaseColor: '#4F46E5',
    shortsAccentColor: '#7C3AED',
    showShortsLogo: true,
    showShortsNumber: true,
    viewPiece: 'full', // 'full' | 'jersey' | 'shorts'
    ...DEFAULT_COORDS
};

export function initEditor() {
    // Restore saved design draft if returning from Color Scanner or previous session
    const savedDraft = sessionStorage.getItem('modelyx_editor_draft');
    if (savedDraft) {
        try {
            const parsed = JSON.parse(savedDraft);
            Object.assign(currentDesign, parsed);
        } catch (e) {
            console.error('Failed to parse draft', e);
        }
    }

    // Auto-apply newly scanned color if returning fresh from scanner
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('scanned') === '1') {
        const scannedColor = localStorage.getItem('modelyx_color');
        if (scannedColor) {
            currentDesign.baseColor = scannedColor;
        }
        const cleanUrl = window.location.pathname + (urlParams.get('exit') ? `?exit=${urlParams.get('exit')}` : '');
        window.history.replaceState({}, document.title, cleanUrl);
    }

    window.currentDesign = currentDesign;
    window.applyDesign = applyDesign;
    window.syncUI = syncUI;
    window.setMannequinSkin = setMannequinSkin;
    window.PRESET_SKINS = PRESET_SKINS;
    window.switchModel = (gender, type) => {
        if (gender) currentDesign.gender = gender;
        if (type) currentDesign.jerseyType = type;
        syncUI(currentDesign);
        loadJerseyModel(currentDesign.jerseyType, currentDesign.gender);
        applyDesign(currentDesign);
        setMannequinSkin(currentDesign.skinTone || 'obsidian');
    };

    generateParameterizedPatterns();
    initViewer('jerseyCanvas');
    applyDesign(currentDesign);
    changeEnvironment(currentDesign.showroom);
    syncUI(currentDesign);
    bindControls();

    window.addEventListener('viewer:ready', () => {
        applyDesign(currentDesign);
        setMannequinSkin(currentDesign.skinTone || 'obsidian');
    });
}

function bindControls() {
    // Model Fit & Gender selector
    const genderMale = document.getElementById('genderMale');
    const genderFemale = document.getElementById('genderFemale');
    const lblGender = document.getElementById('lblGender');

    function updateGenderUI(gender) {
        currentDesign.gender = gender;
        if (gender === 'female') {
            if (genderFemale) genderFemale.className = 'flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold transition border bg-indigo-600 border-indigo-400/50 text-white shadow-md shadow-indigo-900/30 cursor-pointer';
            if (genderMale) genderMale.className = 'flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold transition border bg-slate-700/80 hover:bg-slate-700 border-slate-600/50 text-slate-300 cursor-pointer';
            if (lblGender) lblGender.textContent = "Women's";
        } else {
            if (genderMale) genderMale.className = 'flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold transition border bg-indigo-600 border-indigo-400/50 text-white shadow-md shadow-indigo-900/30 cursor-pointer';
            if (genderFemale) genderFemale.className = 'flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold transition border bg-slate-700/80 hover:bg-slate-700 border-slate-600/50 text-slate-300 cursor-pointer';
            if (lblGender) lblGender.textContent = "Men's";
        }
    }

    if (genderMale) {
        genderMale.addEventListener('click', () => {
            updateGenderUI('male');
            loadJerseyModel(currentDesign.jerseyType, 'male');
            applyDesign(currentDesign);
        });
    }
    if (genderFemale) {
        genderFemale.addEventListener('click', () => {
            updateGenderUI('female');
            loadJerseyModel(currentDesign.jerseyType, 'female');
            applyDesign(currentDesign);
        });
    }

    // Jersey Silhouette Style selector
    const typeSleeveless = document.getElementById('typeSleeveless');
    const typeTshirt = document.getElementById('typeTshirt');
    const lblJerseyType = document.getElementById('lblJerseyType');

    function updateJerseyTypeUI(type) {
        currentDesign.jerseyType = type;
        if (type === 'tshirt') {
            if (typeTshirt) {
                typeTshirt.className = 'flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-bold transition border bg-indigo-600 border-indigo-400/50 text-white shadow-md shadow-indigo-900/30 cursor-pointer';
            }
            if (typeSleeveless) {
                typeSleeveless.className = 'flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-bold transition border bg-slate-700/80 hover:bg-slate-700 border-slate-600/50 text-slate-300 cursor-pointer';
            }
            if (lblJerseyType) lblJerseyType.textContent = 'T-Shirt (Sleeved)';
        } else {
            if (typeSleeveless) {
                typeSleeveless.className = 'flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-bold transition border bg-indigo-600 border-indigo-400/50 text-white shadow-md shadow-indigo-900/30 cursor-pointer';
            }
            if (typeTshirt) {
                typeTshirt.className = 'flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-bold transition border bg-slate-700/80 hover:bg-slate-700 border-slate-600/50 text-slate-300 cursor-pointer';
            }
            if (lblJerseyType) lblJerseyType.textContent = 'Sleeveless';
        }
    }

    if (typeSleeveless) {
        typeSleeveless.addEventListener('click', () => {
            updateJerseyTypeUI('sleeveless');
            loadJerseyModel('sleeveless', currentDesign.gender);
            applyDesign(currentDesign);
        });
    }
    if (typeTshirt) {
        typeTshirt.addEventListener('click', () => {
            updateJerseyTypeUI('tshirt');
            loadJerseyModel('tshirt', currentDesign.gender);
            applyDesign(currentDesign);
        });
    }

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

    // Color DNA Scanner launch & quick-apply controls
    const btnLaunchScanner = document.getElementById('btnLaunchScanner');
    if (btnLaunchScanner) {
        btnLaunchScanner.addEventListener('click', () => {
            sessionStorage.setItem('modelyx_editor_draft', JSON.stringify(currentDesign));
            window.location.href = 'scanner.html?from=editor';
        });
    }

    const btnApplyScannedBase = document.getElementById('btnApplyScannedBase');
    if (btnApplyScannedBase) {
        btnApplyScannedBase.addEventListener('click', () => {
            const scannedColor = localStorage.getItem('modelyx_color');
            if (scannedColor) {
                currentDesign.baseColor = scannedColor;
                const baseInput = document.getElementById('baseColor');
                if (baseInput) baseInput.value = scannedColor;
                applyDesign(currentDesign);
            }
        });
    }

    const btnApplyScannedAccent = document.getElementById('btnApplyScannedAccent');
    if (btnApplyScannedAccent) {
        btnApplyScannedAccent.addEventListener('click', () => {
            const scannedColor = localStorage.getItem('modelyx_color');
            if (scannedColor) {
                currentDesign.accentColor = scannedColor;
                const accentInput = document.getElementById('accentColor');
                if (accentInput) accentInput.value = scannedColor;
                applyDesign(currentDesign);
            }
        });
    }

    // Preset Styles Definition for Visual 1-Tap Apply
    const PRESET_STYLES = {
        cyber_volt: {
            baseColor: '#0284C7',
            accentColor: '#FACC15',
            tertiaryColor: '#FFFFFF',
            pattern: 'stripes',
            logo: 'star',
            finish: 'satin'
        },
        miami_heat: {
            baseColor: '#18181B',
            accentColor: '#DC2626',
            tertiaryColor: '#EA580C',
            pattern: 'gradient',
            logo: 'flame',
            finish: 'matte'
        },
        lakers_gold: {
            baseColor: '#4C1D95',
            accentColor: '#FACC15',
            tertiaryColor: '#FFFFFF',
            pattern: 'panel',
            logo: 'shield',
            finish: 'metallic'
        },
        stealth_black: {
            baseColor: '#18181B',
            accentColor: '#27272A',
            tertiaryColor: '#71717A',
            pattern: 'carbon_scratch',
            logo: 'shield',
            finish: 'carbon'
        },
        ocean_wave: {
            baseColor: '#082F49',
            accentColor: '#0284C7',
            tertiaryColor: '#38BDF8',
            pattern: 'tidal_wave',
            logo: 'vortex',
            finish: 'satin'
        },
        apex_predator: {
            baseColor: '#020617',
            accentColor: '#4F46E5',
            tertiaryColor: '#EC4899',
            pattern: 'apex_gamer',
            logo: 'eagle',
            finish: 'metallic'
        }
    };

    // Helper to update pattern visual cards state
    function updatePatternCardsUI(activePattern) {
        const lblActive = document.getElementById('lblActivePattern');
        if (lblActive) {
            lblActive.textContent = `(${activePattern || 'Solid'})`;
        }
        const cards = document.querySelectorAll('.pattern-card');
        cards.forEach(card => {
            const pat = card.getAttribute('data-pattern');
            if (pat === activePattern) {
                card.className = 'pattern-card group flex flex-col items-center p-2 rounded-xl border border-indigo-500 bg-indigo-600/25 ring-2 ring-indigo-500 shadow-md shadow-indigo-950/40 text-white font-bold transition cursor-pointer';
            } else {
                card.className = 'pattern-card group flex flex-col items-center p-2 rounded-xl border border-slate-700/80 bg-slate-900/80 hover:border-indigo-500/70 hover:bg-slate-800 text-slate-300 font-medium transition cursor-pointer';
            }
        });
    }

    // Helper to update logo visual cards state
    function updateLogoCardsUI(activeLogo) {
        const lblActive = document.getElementById('lblActiveLogo');
        if (lblActive) {
            lblActive.textContent = `(${activeLogo === 'none' ? 'No Badge' : (activeLogo || 'None')})`;
        }
        const cards = document.querySelectorAll('.logo-card');
        cards.forEach(card => {
            const logo = card.getAttribute('data-logo');
            if (logo === activeLogo) {
                card.className = 'logo-card group flex flex-col items-center justify-center p-2 rounded-xl border border-indigo-500 bg-indigo-600/25 ring-2 ring-indigo-500 shadow-md shadow-indigo-950/40 text-white font-bold transition cursor-pointer';
            } else {
                card.className = 'logo-card group flex flex-col items-center justify-center p-2 rounded-xl border border-slate-700/80 bg-slate-900/80 hover:border-indigo-500/70 hover:bg-slate-800 text-slate-300 font-medium transition cursor-pointer';
            }
        });
    }

    // Expose helpers globally for syncUI
    window._updatePatternCardsUI = updatePatternCardsUI;
    window._updateLogoCardsUI = updateLogoCardsUI;

    // Wire up Visual Selectable Pattern Cards
    document.querySelectorAll('.pattern-card').forEach(card => {
        card.addEventListener('click', () => {
            const pat = card.getAttribute('data-pattern');
            if (!pat) return;
            currentDesign.pattern = pat;
            const patSelect = document.getElementById('pattern');
            if (patSelect) patSelect.value = pat;
            updatePatternCardsUI(pat);
            applyDesign(currentDesign);
            sessionStorage.setItem('modelyx_editor_draft', JSON.stringify(currentDesign));
        });
    });

    // Wire up Visual Selectable Logo Cards
    document.querySelectorAll('.logo-card').forEach(card => {
        card.addEventListener('click', () => {
            const logo = card.getAttribute('data-logo');
            if (!logo) return;
            currentDesign.logo = logo;
            const logoSelect = document.getElementById('logo');
            if (logoSelect) logoSelect.value = logo;
            updateLogoCardsUI(logo);
            applyDesign(currentDesign);
            sessionStorage.setItem('modelyx_editor_draft', JSON.stringify(currentDesign));
        });
    });

    // Wire up Quick Style Presets Cards
    document.querySelectorAll('.preset-card').forEach(card => {
        card.addEventListener('click', () => {
            const key = card.getAttribute('data-preset');
            const preset = PRESET_STYLES[key];
            if (!preset) return;
            Object.assign(currentDesign, preset);
            if (currentDesign.matchJerseyColors !== false) {
                currentDesign.shortsBaseColor = currentDesign.baseColor;
                currentDesign.shortsAccentColor = currentDesign.accentColor;
            }
            syncUI(currentDesign);
            applyDesign(currentDesign);
            sessionStorage.setItem('modelyx_editor_draft', JSON.stringify(currentDesign));
        });
    });

    // Dropdown selectors fallback
    const patternSelect = document.getElementById('pattern');
    if (patternSelect) {
        patternSelect.addEventListener('change', e => {
            currentDesign.pattern = e.target.value;
            updatePatternCardsUI(e.target.value);
            applyDesign(currentDesign);
        });
    }

    const logoSelect = document.getElementById('logo');
    if (logoSelect) {
        logoSelect.addEventListener('change', e => {
            currentDesign.logo = e.target.value;
            updateLogoCardsUI(e.target.value);
            applyDesign(currentDesign);
        });
    }

    const logoUpload = document.getElementById('logoUpload');
    const logoUploadError = document.getElementById('logoUploadError');
    if (logoUpload) {
        logoUpload.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;

            // Restrict to PNG only
            const isPNG = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
            if (!isPNG) {
                if (logoUploadError) {
                    logoUploadError.textContent = 'Error: Only PNG images are allowed!';
                    logoUploadError.classList.remove('hidden');
                }
                logoUpload.value = '';
                return;
            }

            if (logoUploadError) {
                logoUploadError.classList.add('hidden');
            }

            const reader = new FileReader();
            reader.onload = function (event) {
                const img = new Image();
                img.onload = function () {
                    currentDesign.customLogoImage = img;
                    currentDesign.logo = 'custom';
                    currentDesign.logoSize = 20; // Must be tiny on initial load

                    const optCustom = document.getElementById('optCustomLogo');
                    if (optCustom) optCustom.style.display = 'block';

                    const cardCustom = document.getElementById('cardCustomLogo');
                    const customBadgeThumb = document.getElementById('customBadgeThumb');
                    const customBadgePlaceholder = document.getElementById('customBadgePlaceholder');
                    if (cardCustom) cardCustom.classList.remove('hidden');
                    if (customBadgeThumb) {
                        customBadgeThumb.src = event.target.result;
                        customBadgeThumb.classList.remove('hidden');
                    }
                    if (customBadgePlaceholder) customBadgePlaceholder.classList.add('hidden');

                    const logoSelect = document.getElementById('logo');
                    if (logoSelect) logoSelect.value = 'custom';

                    const logoSizeSlider = document.getElementById('logoSize');
                    if (logoSizeSlider) logoSizeSlider.value = 20;

                    const lblLogoSize = document.getElementById('lblLogoSize');
                    if (lblLogoSize) lblLogoSize.textContent = '20px';

                    updateLogoCardsUI('custom');
                    applyDesign(currentDesign);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    const logoSizeSlider = document.getElementById('logoSize');
    if (logoSizeSlider) {
        logoSizeSlider.addEventListener('input', e => {
            currentDesign.logoSize = parseInt(e.target.value);
            const lbl = document.getElementById('lblLogoSize');
            if (lbl) lbl.textContent = e.target.value + 'px';
            applyDesign(currentDesign);
        });
    }

    document.getElementById('font').addEventListener('change', e => {
        currentDesign.font = e.target.value;
        currentDesign.customFont = '';
        const fontSearchInput = document.getElementById('customFontSearch');
        if (fontSearchInput) fontSearchInput.value = '';
        applyDesign(currentDesign);
    });

    document.getElementById('frontText').addEventListener('input', e => {
        currentDesign.frontText = e.target.value;
        applyDesign(currentDesign);
    });

    document.getElementById('backName').addEventListener('input', e => {
        currentDesign.backName = e.target.value;
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

    const visibilityToggles = ['showFrontText', 'showFrontNumber', 'showBackText', 'showBackNumber', 'showSponsor'];
    visibilityToggles.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', e => {
                currentDesign[id] = e.target.checked;
                applyDesign(currentDesign);
            });
        }
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

    // Animation UI removed — static T-pose only


    // Random design generator
    document.getElementById('randomBtn').addEventListener('click', () => {
        const rand = generateRandomDesign();
        currentDesign = {
            ...currentDesign,
            ...rand,
            frontText: rand.teamName || 'TEAM',
            backName: 'PLAYER',
            shortsBaseColor: rand.baseColor,
            shortsAccentColor: rand.accentColor,
            showFrontText: true,
            showFrontNumber: true,
            showBackText: true,
            showBackNumber: true,
            showSponsor: !!rand.sponsorText
        };
        Object.assign(currentDesign, DEFAULT_COORDS);
        syncUI(currentDesign);
        applyDesign(currentDesign);
        changeEnvironment(currentDesign.showroom);
        hideReasoning();
    });

    // AI Co-Pilot suggestion handler
    const aiBtn = document.getElementById('aiBtn');
    const aiTeamInput = document.getElementById('aiTeamInput');
    const aiBtnText = document.getElementById('aiBtnText');
    const aiLiveStatus = document.getElementById('aiLiveStatus');
    const aiLiveStatusText = document.getElementById('aiLiveStatusText');



    if (aiTeamInput) {
        aiTeamInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (aiBtn && !aiBtn.disabled) aiBtn.click();
            }
        });
    }

    // Conversational AI Co-Pilot State
    let aiChatHistory = [];

    function appendAIChatBubble(role, text, deltaTag = null) {
        const stream = document.getElementById('aiChatStream');
        if (!stream) return;

        const bubbleWrap = document.createElement('div');
        if (role === 'user') {
            bubbleWrap.className = 'flex justify-end';
            bubbleWrap.innerHTML = `
                <div class="bg-violet-600 text-white rounded-xl rounded-tr-sm p-2 max-w-[85%] shadow text-[11px] leading-relaxed">
                    <p>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                </div>
            `;
        } else {
            bubbleWrap.className = 'flex gap-1.5 items-start';
            bubbleWrap.innerHTML = `
                <div class="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center text-[10px] shrink-0 font-bold">AI</div>
                <div class="bg-slate-900 border border-slate-800 rounded-xl rounded-tl-sm p-2 text-slate-300 max-w-[88%] shadow-sm space-y-1 text-[11px] leading-relaxed">
                    ${deltaTag ? `
                    <div class="flex items-center gap-1">
                        <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Delta Updated</span>
                        <span class="text-[9px] text-emerald-400 font-mono">${deltaTag}</span>
                    </div>` : ''}
                    <p class="text-white">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                </div>
            `;
        }
        stream.appendChild(bubbleWrap);
        stream.scrollTop = stream.scrollHeight;
    }

    window.toggleAIChatStream = function() {
        const stream = document.getElementById('aiChatStream');
        const btn = document.getElementById('btnToggleChatStream');
        if (!stream) return;
        const isHidden = stream.style.display === 'none';
        stream.style.display = isHidden ? 'block' : 'none';
        if (btn) btn.textContent = isHidden ? '− Fold' : '+ Chat';
    };


    window.clearAIChat = function() {
        aiChatHistory = [];
        const stream = document.getElementById('aiChatStream');
        if (stream) {
            stream.innerHTML = `
                <div class="flex gap-2 items-start">
                    <div class="w-5 h-5 rounded-full bg-violet-600/30 text-violet-300 flex items-center justify-center text-[10px] shrink-0 font-bold">AI</div>
                    <div class="bg-slate-900 border border-slate-800 rounded-xl rounded-tl-sm p-2 text-slate-300 leading-relaxed text-[11px]">
                        Chat reset! Tell me what to design, or request tweaks as we go (e.g. <em class="text-violet-300">"generate blue jersey"</em> then <em class="text-emerald-300">"rename player as drew"</em>).
                    </div>
                </div>
            `;
        }
        if (aiTeamInput) aiTeamInput.value = '';
    };

    window.sendAIQuickPrompt = function(promptText) {
        if (aiTeamInput) aiTeamInput.value = promptText;
        window.submitAIChat();
    };

    window.submitAIChat = async function() {
        const promptText = aiTeamInput ? aiTeamInput.value.trim() : '';
        if (!promptText) return;

        if (aiTeamInput) aiTeamInput.value = '';
        appendAIChatBubble('user', promptText);

        if (aiBtn) {
            aiBtn.disabled = true;
            aiBtn.classList.add('animate-pulse', 'opacity-80');
        }
        if (aiBtnText) aiBtnText.textContent = '...';

        const progressSteps = [
            '🧠 Analyzing command...',
            '🎨 Formulating delta update...',
            '📐 Structuring jersey graphics...',
            '✨ Synchronizing 3D textures...'
        ];
        let stepIndex = 0;
        if (aiLiveStatus) {
            aiLiveStatus.style.display = 'flex';
            if (aiLiveStatusText) aiLiveStatusText.textContent = progressSteps[0];
        }
        const statusTimer = setInterval(() => {
            stepIndex = (stepIndex + 1) % progressSteps.length;
            if (aiLiveStatusText) aiLiveStatusText.textContent = progressSteps[stepIndex];
        }, 500);

        try {
            const currentDesignContext = {
                gender: currentDesign.gender || 'male',
                jerseyType: currentDesign.jerseyType,
                baseColor: currentDesign.baseColor,
                accentColor: currentDesign.accentColor,
                tertiaryColor: currentDesign.tertiaryColor,
                pattern: currentDesign.pattern,
                logo: currentDesign.logo,
                font: currentDesign.font,
                finish: currentDesign.finish,
                showroom: currentDesign.showroom,
                frontText: currentDesign.frontText,
                backName: currentDesign.backName || 'PLAYER',
                number: currentDesign.number,
                sponsorText: currentDesign.sponsorText,
                matchJerseyColors: currentDesign.matchJerseyColors !== false,
                shortsBaseColor: currentDesign.shortsBaseColor || currentDesign.baseColor,
                shortsAccentColor: currentDesign.shortsAccentColor || currentDesign.accentColor
            };

            const res = await fetch('/ai/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: promptText,
                    team_name: promptText,
                    history: aiChatHistory,
                    current_design: currentDesignContext
                })
            });

            const suggestion = await res.json();

            if (res.ok && suggestion) {
                const targetGender = suggestion.gender || currentDesign.gender || 'male';
                const genderChanged = targetGender !== currentDesign.gender;

                // Merge updates into currentDesign while strictly preserving custom coordinates & untouched properties
                currentDesign = {
                    ...currentDesign,
                    gender: targetGender,
                    baseColor: suggestion.baseColor || currentDesign.baseColor,
                    accentColor: suggestion.accentColor || currentDesign.accentColor,
                    tertiaryColor: suggestion.tertiaryColor || currentDesign.tertiaryColor,
                    pattern: suggestion.pattern || currentDesign.pattern || 'none',
                    logo: suggestion.logo || currentDesign.logo || 'none',
                    font: suggestion.font || currentDesign.font || 'athletic',
                    finish: suggestion.finish || currentDesign.finish || 'matte',
                    showroom: suggestion.showroom || currentDesign.showroom || 'cyber',
                    frontText: suggestion.teamName || currentDesign.frontText || 'TEAM',
                    backName: suggestion.backName || currentDesign.backName || 'PLAYER',
                    number: suggestion.number || currentDesign.number || '23',
                    sponsorText: (suggestion.sponsorText !== undefined && suggestion.sponsorText !== null) ? suggestion.sponsorText : currentDesign.sponsorText,
                    matchJerseyColors: suggestion.matchJerseyColors !== undefined ? suggestion.matchJerseyColors : (currentDesign.matchJerseyColors !== false),
                    shortsBaseColor: suggestion.shortsBaseColor || suggestion.baseColor || currentDesign.shortsBaseColor,
                    shortsAccentColor: suggestion.shortsAccentColor || suggestion.accentColor || currentDesign.shortsAccentColor,
                    showFrontText: true,
                    showFrontNumber: true,
                    showBackText: true,
                    showBackNumber: true,
                    showSponsor: !!(suggestion.sponsorText || currentDesign.sponsorText)
                };

                if (genderChanged) {
                    loadJerseyModel(currentDesign.jerseyType, targetGender);
                }
                syncUI(currentDesign);
                applyDesign(currentDesign);
                changeEnvironment(currentDesign.showroom);

                // Add to multi-turn memory
                aiChatHistory.push({ role: 'user', content: promptText });
                const replyText = suggestion.assistantReply || suggestion.reasoning || 'Design updated successfully!';
                aiChatHistory.push({ role: 'assistant', content: replyText });

                // Format delta badge
                const appliedList = Array.isArray(suggestion.appliedChanges) && suggestion.appliedChanges.length > 0
                    ? suggestion.appliedChanges.join(', ')
                    : (suggestion.backName && suggestion.backName !== currentDesignContext.backName ? 'backName' : null);

                appendAIChatBubble('assistant', replyText, appliedList);

                // If back player name was updated or user requested back view, rotate camera to back!
                const isBackRequested = /back|drew|name|player/i.test(promptText) || (appliedList && appliedList.includes('backName'));
                if (isBackRequested) {
                    setCameraAngle('back');
                    const btnCamBack = document.getElementById('btnCamBack');
                    if (btnCamBack && typeof setActiveCamBtn === 'function') setActiveCamBtn(btnCamBack);
                } else if (typeof triggerShowcaseSpin === 'function') {
                    triggerShowcaseSpin(2400);
                }
            } else {
                appendAIChatBubble('assistant', 'Sorry, I had trouble formulating that change. Could you try rephrasing?');
            }
        } catch (err) {
            console.error(err);
            appendAIChatBubble('assistant', 'Network issue communicating with Co-Pilot.');
        } finally {
            clearInterval(statusTimer);
            if (aiLiveStatus) aiLiveStatus.style.display = 'none';
            if (aiBtn) {
                aiBtn.disabled = false;
                aiBtn.classList.remove('animate-pulse', 'opacity-80');
            }
            if (aiBtnText) aiBtnText.textContent = 'Send';
        }
    };

    if (aiBtn) {
        aiBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.submitAIChat();
        });
    }

    const fontSizeFrontNumber = document.getElementById('fontSizeFrontNumber');
    if (fontSizeFrontNumber) {
        fontSizeFrontNumber.addEventListener('input', e => {
            currentDesign.frontNumberSize = parseInt(e.target.value);
            const lbl = document.getElementById('lblFrontNumberSize');
            if (lbl) lbl.textContent = e.target.value + 'px';
            applyDesign(currentDesign);
        });
    }

    const fontSizeBackNumber = document.getElementById('fontSizeBackNumber');
    if (fontSizeBackNumber) {
        fontSizeBackNumber.addEventListener('input', e => {
            currentDesign.backNumberSize = parseInt(e.target.value);
            const lbl = document.getElementById('lblBackNumberSize');
            if (lbl) lbl.textContent = e.target.value + 'px';
            applyDesign(currentDesign);
        });
    }

    const outlineWeight = document.getElementById('outlineWeight');
    if (outlineWeight) {
        outlineWeight.addEventListener('input', e => {
            currentDesign.outlineWeight = parseInt(e.target.value);
            const lbl = document.getElementById('lblOutlineWeight');
            if (lbl) lbl.textContent = e.target.value + 'px';
            applyDesign(currentDesign);
        });
    }

    const fontSearchInput = document.getElementById('customFontSearch');
    const fontResultsContainer = document.getElementById('fontSearchResults');

    if (fontSearchInput && fontResultsContainer) {
        const renderFontResults = (query) => {
            fontResultsContainer.innerHTML = '';
            let matches = [];
            const cleanQuery = query.trim().toLowerCase();

            if (!cleanQuery) {
                const popular = ['Pacifico', 'Montserrat', 'Roboto', 'Lobster', 'Open Sans', 'Playfair Display', 'Oswald', 'Anton', 'Righteous', 'Poppins'];
                matches = popular;
            } else {
                matches = GOOGLE_FONTS.filter(f => f.toLowerCase().includes(cleanQuery)).slice(0, 15);
            }

            if (matches.length === 0) {
                const noResult = document.createElement('div');
                noResult.className = 'px-4 py-2.5 text-xs text-slate-500 italic';
                noResult.textContent = 'No matching fonts';
                fontResultsContainer.appendChild(noResult);
            } else {
                matches.forEach(font => {
                    const item = document.createElement('div');
                    item.className = 'px-4 py-2.5 text-xs text-white hover:bg-indigo-600 hover:text-white cursor-pointer transition';
                    item.textContent = font;
                    item.style.fontFamily = `"${font}", sans-serif`;

                    loadGoogleFont(font);

                    item.addEventListener('click', () => {
                        fontSearchInput.value = font;
                        currentDesign.customFont = font;
                        loadGoogleFont(font);
                        applyDesign(currentDesign);
                        fontResultsContainer.classList.add('hidden');
                    });
                    fontResultsContainer.appendChild(item);
                });
            }
            fontResultsContainer.classList.remove('hidden');
        };

        fontSearchInput.addEventListener('focus', () => {
            renderFontResults(fontSearchInput.value);
        });

        fontSearchInput.addEventListener('input', e => {
            renderFontResults(e.target.value);
        });

        document.addEventListener('click', e => {
            if (!fontSearchInput.contains(e.target) && !fontResultsContainer.contains(e.target)) {
                fontResultsContainer.classList.add('hidden');
            }
        });
    }

    const canvasFront = document.getElementById('canvasFront2D');
    if (canvasFront) {
        bindDragEvents(canvasFront, false);
    }
    const canvasBack = document.getElementById('canvasBack2D');
    if (canvasBack) {
        bindDragEvents(canvasBack, true);
    }

    // 3D Model Skin Tone Swatches
    setupSkinToneControls();

    const btn2D = document.getElementById('btnView2D');
    const btn3D = document.getElementById('btnView3D');
    const viewport2D = document.getElementById('viewport2D');
    const viewport3D = document.getElementById('viewport3D');
    const sidebarSkinSection = document.getElementById('sidebarSkinSection');

    if (btn2D && btn3D && viewport2D && viewport3D) {
        const controls2D = document.getElementById('controls2DViews');
        btn2D.addEventListener('click', () => {
            btn2D.className = 'px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white transition';
            btn3D.className = 'px-4 py-2 text-xs font-bold rounded-lg text-slate-400 hover:text-white transition';
            viewport2D.classList.remove('hidden');
            viewport3D.classList.add('hidden');
            if (controls2D) controls2D.classList.remove('hidden');
            if (sidebarSkinSection) sidebarSkinSection.classList.add('hidden');
        });

        btn3D.addEventListener('click', () => {
            btn3D.className = 'px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white transition';
            btn2D.className = 'px-4 py-2 text-xs font-bold rounded-lg text-slate-400 hover:text-white transition';
            viewport3D.classList.remove('hidden');
            viewport2D.classList.add('hidden');
            if (controls2D) controls2D.classList.add('hidden');
            if (sidebarSkinSection) sidebarSkinSection.classList.remove('hidden');
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
                fitCameraToObject();
            }, 60);
        });
    }

    // 2D View Selector Toolbar (All / Front / Side / Back)
    const btn2DAll = document.getElementById('btn2DAll');
    const btn2DFront = document.getElementById('btn2DFront');
    const btn2DSide = document.getElementById('btn2DSide');
    const btn2DBack = document.getElementById('btn2DBack');
    const card2DFront = document.getElementById('card2DFront');
    const card2DSide = document.getElementById('card2DSide');
    const card2DBack = document.getElementById('card2DBack');

    function setActive2DTab(activeBtn) {
        [btn2DAll, btn2DFront, btn2DSide, btn2DBack].forEach(btn => {
            if (btn) {
                if (btn === activeBtn) {
                    btn.className = 'px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white transition';
                } else {
                    btn.className = 'px-3 py-1.5 text-xs font-bold rounded-lg text-slate-400 hover:text-white transition';
                }
            }
        });
    }

    if (btn2DAll) {
        btn2DAll.addEventListener('click', () => {
            setActive2DTab(btn2DAll);
            if (card2DFront) card2DFront.classList.remove('hidden');
            if (card2DSide) card2DSide.classList.remove('hidden');
            if (card2DBack) card2DBack.classList.remove('hidden');
        });
    }
    if (btn2DFront) {
        btn2DFront.addEventListener('click', () => {
            setActive2DTab(btn2DFront);
            if (card2DFront) card2DFront.classList.remove('hidden');
            if (card2DSide) card2DSide.classList.add('hidden');
            if (card2DBack) card2DBack.classList.add('hidden');
        });
    }
    if (btn2DSide) {
        btn2DSide.addEventListener('click', () => {
            setActive2DTab(btn2DSide);
            if (card2DFront) card2DFront.classList.add('hidden');
            if (card2DSide) card2DSide.classList.remove('hidden');
            if (card2DBack) card2DBack.classList.add('hidden');
        });
    }
    if (btn2DBack) {
        btn2DBack.addEventListener('click', () => {
            setActive2DTab(btn2DBack);
            if (card2DFront) card2DFront.classList.add('hidden');
            if (card2DSide) card2DSide.classList.add('hidden');
            if (card2DBack) card2DBack.classList.remove('hidden');
        });
    }

    // 3D Quick Camera Angle Controls
    const btnCamFront = document.getElementById('btnCamFront');
    const btnCamLeft = document.getElementById('btnCamLeft');
    const btnCamRight = document.getElementById('btnCamRight');
    const btnCamBack = document.getElementById('btnCamBack');

    function setActiveCamBtn(activeBtn) {
        [btnCamFront, btnCamLeft, btnCamRight, btnCamBack].forEach(btn => {
            if (btn) {
                if (btn === activeBtn) {
                    btn.className = 'px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white transition';
                } else {
                    btn.className = 'px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition';
                }
            }
        });
    }

    if (btnCamFront) {
        btnCamFront.addEventListener('click', () => {
            setActiveCamBtn(btnCamFront);
            setCameraAngle('front');
        });
    }
    if (btnCamLeft) {
        btnCamLeft.addEventListener('click', () => {
            setActiveCamBtn(btnCamLeft);
            setCameraAngle('left');
        });
    }
    if (btnCamRight) {
        btnCamRight.addEventListener('click', () => {
            setActiveCamBtn(btnCamRight);
            setCameraAngle('right');
        });
    }
    if (btnCamBack) {
        btnCamBack.addEventListener('click', () => {
            setActiveCamBtn(btnCamBack);
            setCameraAngle('back');
        });
    }

    // 3D Camera Focus Controls (Full Body / Jersey / Shorts)
    const btnFocusFull = document.getElementById('btnFocusFull');
    const btnFocusJersey = document.getElementById('btnFocusJersey');
    const btnFocusShorts = document.getElementById('btnFocusShorts');

    function setActiveFocusBtn(focusId) {
        [
            { btn: btnFocusFull, id: 'full' },
            { btn: btnFocusJersey, id: 'jersey' },
            { btn: btnFocusShorts, id: 'shorts' }
        ].forEach(({ btn, id }) => {
            if (btn) {
                if (focusId === id) {
                    btn.className = 'px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white transition';
                } else {
                    btn.className = 'px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition';
                }
            }
        });
    }
    window._setActiveFocusBtn = setActiveFocusBtn;

    function updatePieceUI(piece) {
        currentDesign.viewPiece = piece;
        [
            { btn: btnPieceFull, id: 'full' },
            { btn: btnPieceJersey, id: 'jersey' },
            { btn: btnPieceShorts, id: 'shorts' }
        ].forEach(({ btn, id }) => {
            if (btn) {
                if (piece === id) {
                    btn.className = 'px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white transition';
                } else {
                    btn.className = 'px-3 py-1.5 text-xs font-bold rounded-lg text-slate-400 hover:text-white transition';
                }
            }
        });
        setActiveFocusBtn(piece);
        setCameraFocus(piece);
        applyDesign(currentDesign);
    }
    window._updatePieceUI = updatePieceUI;

    if (btnFocusFull) {
        btnFocusFull.addEventListener('click', () => {
            updatePieceUI('full');
        });
    }
    if (btnFocusJersey) {
        btnFocusJersey.addEventListener('click', () => {
            updatePieceUI('jersey');
        });
    }
    if (btnFocusShorts) {
        btnFocusShorts.addEventListener('click', () => {
            updatePieceUI('shorts');
        });
    }

    if (btnPieceFull) btnPieceFull.addEventListener('click', () => updatePieceUI('full'));
    if (btnPieceJersey) btnPieceJersey.addEventListener('click', () => updatePieceUI('jersey'));
    if (btnPieceShorts) btnPieceShorts.addEventListener('click', () => updatePieceUI('shorts'));

    // Shorts Customization Controls
    const cbMatchJersey = document.getElementById('matchJerseyColors');
    const customShortsContainer = document.getElementById('customShortsColorsContainer');
    if (cbMatchJersey) {
        cbMatchJersey.addEventListener('change', e => {
            currentDesign.matchJerseyColors = e.target.checked;
            if (currentDesign.matchJerseyColors) {
                if (customShortsContainer) customShortsContainer.classList.add('hidden');
                currentDesign.shortsBaseColor = currentDesign.baseColor;
                currentDesign.shortsAccentColor = currentDesign.accentColor;
            } else {
                if (customShortsContainer) customShortsContainer.classList.remove('hidden');
                const baseIn = document.getElementById('shortsBaseColor');
                const accIn = document.getElementById('shortsAccentColor');
                if (baseIn) currentDesign.shortsBaseColor = baseIn.value;
                if (accIn) currentDesign.shortsAccentColor = accIn.value;
            }
            applyDesign(currentDesign);
        });
    }

    const shortsBaseInput = document.getElementById('shortsBaseColor');
    if (shortsBaseInput) {
        shortsBaseInput.addEventListener('input', e => {
            currentDesign.shortsBaseColor = e.target.value;
            applyDesign(currentDesign);
        });
    }

    const shortsAccentInput = document.getElementById('shortsAccentColor');
    if (shortsAccentInput) {
        shortsAccentInput.addEventListener('input', e => {
            currentDesign.shortsAccentColor = e.target.value;
            applyDesign(currentDesign);
        });
    }

    const cbShortsLogo = document.getElementById('showShortsLogo');
    if (cbShortsLogo) {
        cbShortsLogo.addEventListener('change', e => {
            currentDesign.showShortsLogo = e.target.checked;
            applyDesign(currentDesign);
        });
    }

    const cbShortsNumber = document.getElementById('showShortsNumber');
    if (cbShortsNumber) {
        cbShortsNumber.addEventListener('change', e => {
            currentDesign.showShortsNumber = e.target.checked;
            applyDesign(currentDesign);
        });
    }

    // Shorts Number Size Slider
    const sliderShortsNumberSize = document.getElementById('shortsNumberSize');
    const lblShortsNumberSize = document.getElementById('lblShortsNumberSize');
    if (sliderShortsNumberSize) {
        sliderShortsNumberSize.addEventListener('input', e => {
            currentDesign.shortsNumberSize = parseInt(e.target.value, 10);
            if (lblShortsNumberSize) lblShortsNumberSize.textContent = `${currentDesign.shortsNumberSize}px`;
            applyDesign(currentDesign);
        });
    }

    // Shorts Crest Logo Size Slider
    const sliderShortsLogoSize = document.getElementById('shortsLogoSize');
    const lblShortsLogoSize = document.getElementById('lblShortsLogoSize');
    if (sliderShortsLogoSize) {
        sliderShortsLogoSize.addEventListener('input', e => {
            currentDesign.shortsLogoSize = parseInt(e.target.value, 10);
            if (lblShortsLogoSize) lblShortsLogoSize.textContent = `${currentDesign.shortsLogoSize}px`;
            applyDesign(currentDesign);
        });
    }

    // Shorts Custom Text / Wordmark Controls
    const cbShortsText = document.getElementById('showShortsText');
    const shortsTextContainer = document.getElementById('shortsTextContainer');
    if (cbShortsText) {
        cbShortsText.addEventListener('change', e => {
            currentDesign.showShortsText = e.target.checked;
            if (shortsTextContainer) {
                if (currentDesign.showShortsText) shortsTextContainer.classList.remove('hidden');
                else shortsTextContainer.classList.add('hidden');
            }
            applyDesign(currentDesign);
        });
    }

    const inputShortsText = document.getElementById('shortsText');
    if (inputShortsText) {
        inputShortsText.addEventListener('input', e => {
            currentDesign.shortsText = e.target.value;
            applyDesign(currentDesign);
        });
    }

    const sliderShortsTextSize = document.getElementById('shortsTextSize');
    const lblShortsTextSize = document.getElementById('lblShortsTextSize');
    if (sliderShortsTextSize) {
        sliderShortsTextSize.addEventListener('input', e => {
            currentDesign.shortsTextSize = parseInt(e.target.value, 10);
            if (lblShortsTextSize) lblShortsTextSize.textContent = `${currentDesign.shortsTextSize}px`;
            applyDesign(currentDesign);
        });
    }

    // Reset Shorts Element Positions & Sizes Button
    const btnResetShortsPositions = document.getElementById('btnResetShortsPositions');
    if (btnResetShortsPositions) {
        btnResetShortsPositions.addEventListener('click', () => {
            currentDesign.shortsNumberX = DEFAULT_COORDS.shortsNumberX;
            currentDesign.shortsNumberY = DEFAULT_COORDS.shortsNumberY;
            currentDesign.shortsNumberSize = DEFAULT_COORDS.shortsNumberSize;
            currentDesign.shortsLogoX = DEFAULT_COORDS.shortsLogoX;
            currentDesign.shortsLogoY = DEFAULT_COORDS.shortsLogoY;
            currentDesign.shortsLogoSize = DEFAULT_COORDS.shortsLogoSize;
            currentDesign.shortsTextX = DEFAULT_COORDS.shortsTextX;
            currentDesign.shortsTextY = DEFAULT_COORDS.shortsTextY;
            currentDesign.shortsTextSize = DEFAULT_COORDS.shortsTextSize;
            currentDesign.shortsBackNumberX = DEFAULT_COORDS.shortsBackNumberX;
            currentDesign.shortsBackNumberY = DEFAULT_COORDS.shortsBackNumberY;
            currentDesign.shortsBackNumberSize = DEFAULT_COORDS.shortsBackNumberSize;
            currentDesign.shortsBackTextX = DEFAULT_COORDS.shortsBackTextX;
            currentDesign.shortsBackTextY = DEFAULT_COORDS.shortsBackTextY;
            currentDesign.shortsBackTextSize = DEFAULT_COORDS.shortsBackTextSize;
            syncUI(currentDesign);
            applyDesign(currentDesign);
        });
    }

    const btnSidebarFocusShorts = document.getElementById('btnSidebarFocusShorts');
    if (btnSidebarFocusShorts) {
        btnSidebarFocusShorts.addEventListener('click', () => {
            const btn3D = document.getElementById('btnView3D');
            if (btn3D) btn3D.click();
            setCameraFocus('shorts');
            setActiveFocusBtn('shorts');
        });
    }
}

function setupSkinToneControls() {
    const toolbarContainer = document.getElementById('skinSwatchesContainer');
    const sidebarContainer = document.getElementById('sidebarSkinContainer');
    const lblActiveSkin = document.getElementById('lblActiveSkin');

    function updateActiveSwatches(activeKey) {
        currentDesign.skinTone = activeKey;
        const skinObj = PRESET_SKINS[activeKey] || PRESET_SKINS['obsidian'];
        if (lblActiveSkin) {
            lblActiveSkin.textContent = skinObj.name;
        }

        document.querySelectorAll('.skin-swatch-btn').forEach(btn => {
            const isMatch = btn.getAttribute('data-skin-id') === activeKey;
            const isToolbar = !!btn.closest('#skinSwatchesContainer');
            const sizeClass = isToolbar ? 'w-5 h-5' : 'w-6 h-6';
            if (isMatch) {
                btn.className = `skin-swatch-btn ${sizeClass} rounded-full border-2 border-white ring-2 ring-indigo-500 scale-110 shadow-md shadow-indigo-500/50 transition-all cursor-pointer relative flex-shrink-0`;
            } else {
                btn.className = `skin-swatch-btn ${sizeClass} rounded-full border border-slate-600/80 hover:border-slate-400 hover:scale-105 transition-all cursor-pointer relative opacity-90 hover:opacity-100 flex-shrink-0`;
            }
        });
    }

    function renderSwatchesIn(container, isToolbar = false) {
        if (!container) return;
        container.innerHTML = '';
        const sizeClass = isToolbar ? 'w-5 h-5' : 'w-6 h-6';
        Object.values(PRESET_SKINS).forEach(skin => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('data-skin-id', skin.id);
            btn.title = skin.name;
            btn.style.backgroundColor = skin.preview;
            const isMatch = (currentDesign.skinTone || 'obsidian') === skin.id;
            btn.className = isMatch
                ? `skin-swatch-btn ${sizeClass} rounded-full border-2 border-white ring-2 ring-indigo-500 scale-110 shadow-md shadow-indigo-500/50 transition-all cursor-pointer relative flex-shrink-0`
                : `skin-swatch-btn ${sizeClass} rounded-full border border-slate-600/80 hover:border-slate-400 hover:scale-105 transition-all cursor-pointer relative opacity-90 hover:opacity-100 flex-shrink-0`;

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                setMannequinSkin(skin.id);
                updateActiveSwatches(skin.id);
            });
            container.appendChild(btn);
        });
    }

    renderSwatchesIn(toolbarContainer, true);
    renderSwatchesIn(sidebarContainer, false);
    window._updateActiveSkinSwatches = updateActiveSwatches;
}

function applyDesign(design) {
    // If matchJerseyColors is true, ensure shorts colors match jersey
    if (design.matchJerseyColors !== false) {
        design.shortsBaseColor = design.baseColor;
        design.shortsAccentColor = design.accentColor;
    } else {
        design.shortsBaseColor = design.shortsBaseColor || design.baseColor;
        design.shortsAccentColor = design.shortsAccentColor || design.accentColor;
    }

    const canvasFront = document.getElementById('canvasFront2D');
    const canvasBack = document.getElementById('canvasBack2D');
    const canvasSide = document.getElementById('canvasSide2D');

    const piece = design.viewPiece || 'full';

    if (canvasFront) {
        if (piece === 'shorts') {
            renderShorts2D(canvasFront, design, false);
        } else if (piece === 'jersey') {
            renderJersey2D(canvasFront, design, false);
        } else {
            renderUniform2D(canvasFront, design, false);
        }
    }
    if (canvasBack) {
        if (piece === 'shorts') {
            renderShorts2D(canvasBack, design, true);
        } else if (piece === 'jersey') {
            renderJersey2D(canvasBack, design, true);
        } else {
            renderUniform2D(canvasBack, design, true);
        }
    }
    if (canvasSide) {
        if (piece === 'shorts') {
            renderShorts2DSide(canvasSide, design, false);
        } else if (piece === 'jersey') {
            renderJersey2DSide(canvasSide, design, false);
        } else {
            renderUniform2DSide(canvasSide, design, false);
        }
    }

    setPartColor('jersey_body', design.baseColor);
    setPartColor('jersey_front', design.baseColor);
    setPartColor('jersey_back', design.baseColor);
    setTrimColor(design.accentColor, design.tertiaryColor || '#ffffff');

    const frontTexture = buildTexture(design);
    applyTextureToPanel(frontTexture);

    const backTexture = buildBackTexture(design);
    applyTextureToBack(backTexture);

    // Apply shorts textures & colors to 3D model
    setPartColor('shorts', design.shortsBaseColor || design.baseColor);
    const shortsFrontTexture = buildShortsTexture(design);
    applyTextureToShortsFront(shortsFrontTexture);

    const shortsBackTexture = buildShortsBackTexture(design);
    applyTextureToShortsBack(shortsBackTexture);

    // Apply material finishes in Three.js (both jersey and shorts)
    applyMaterialFinish(design.finish);
}

function syncUI(design) {
    const gender = design.gender || 'male';
    const genderMale = document.getElementById('genderMale');
    const genderFemale = document.getElementById('genderFemale');
    const lblGender = document.getElementById('lblGender');
    if (gender === 'female') {
        if (genderFemale) genderFemale.className = 'flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold transition border bg-indigo-600 border-indigo-400/50 text-white shadow-md shadow-indigo-900/30 cursor-pointer';
        if (genderMale) genderMale.className = 'flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold transition border bg-slate-700/80 hover:bg-slate-700 border-slate-600/50 text-slate-300 cursor-pointer';
        if (lblGender) lblGender.textContent = "Women's";
    } else {
        if (genderMale) genderMale.className = 'flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold transition border bg-indigo-600 border-indigo-400/50 text-white shadow-md shadow-indigo-900/30 cursor-pointer';
        if (genderFemale) genderFemale.className = 'flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold transition border bg-slate-700/80 hover:bg-slate-700 border-slate-600/50 text-slate-300 cursor-pointer';
        if (lblGender) lblGender.textContent = "Men's";
    }

    const jType = design.jerseyType || 'sleeveless';
    const typeSleeveless = document.getElementById('typeSleeveless');
    const typeTshirt = document.getElementById('typeTshirt');
    const lblJerseyType = document.getElementById('lblJerseyType');
    if (jType === 'tshirt') {
        if (typeTshirt) typeTshirt.className = 'flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-bold transition border bg-indigo-600 border-indigo-400/50 text-white shadow-md shadow-indigo-900/30 cursor-pointer';
        if (typeSleeveless) typeSleeveless.className = 'flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-bold transition border bg-slate-700/80 hover:bg-slate-700 border-slate-600/50 text-slate-300 cursor-pointer';
        if (lblJerseyType) lblJerseyType.textContent = 'T-Shirt (Sleeved)';
    } else {
        if (typeSleeveless) typeSleeveless.className = 'flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-bold transition border bg-indigo-600 border-indigo-400/50 text-white shadow-md shadow-indigo-900/30 cursor-pointer';
        if (typeTshirt) typeTshirt.className = 'flex flex-col items-center justify-center p-2.5 rounded-xl text-xs font-bold transition border bg-slate-700/80 hover:bg-slate-700 border-slate-600/50 text-slate-300 cursor-pointer';
        if (lblJerseyType) lblJerseyType.textContent = 'Sleeveless';
    }

    document.getElementById('baseColor').value = design.baseColor;
    document.getElementById('accentColor').value = design.accentColor;
    document.getElementById('tertiaryColor').value = design.tertiaryColor || '#ffffff';
    syncScannedColorUI();
    const setChecked = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.checked = !!val;
    };
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('frontText', design.frontText);
    setVal('backName', design.backName);
    setVal('number', design.number);
    setVal('sponsorText', design.sponsorText);
    setVal('pattern', design.pattern);
    setVal('logo', design.logo || 'none');

    if (window._updatePatternCardsUI) {
        window._updatePatternCardsUI(design.pattern);
    }
    if (window._updateLogoCardsUI) {
        window._updateLogoCardsUI(design.logo || 'none');
    }

    const optCustom = document.getElementById('optCustomLogo');
    if (optCustom) {
        optCustom.style.display = design.customLogoImage ? 'block' : 'none';
    }
    const cardCustom = document.getElementById('cardCustomLogo');
    if (cardCustom) {
        if (design.customLogoImage) {
            cardCustom.classList.remove('hidden');
            const customBadgeThumb = document.getElementById('customBadgeThumb');
            const customBadgePlaceholder = document.getElementById('customBadgePlaceholder');
            if (customBadgeThumb && design.customLogoImage.src) {
                customBadgeThumb.src = design.customLogoImage.src;
                customBadgeThumb.classList.remove('hidden');
                if (customBadgePlaceholder) customBadgePlaceholder.classList.add('hidden');
            }
        }
    }

    const logoSizeVal = design.logoSize !== undefined ? design.logoSize : 60;
    const logoSizeSlider = document.getElementById('logoSize');
    if (logoSizeSlider) {
        logoSizeSlider.value = logoSizeVal;
    }
    const lblLogoSize = document.getElementById('lblLogoSize');
    if (lblLogoSize) {
        lblLogoSize.textContent = logoSizeVal + 'px';
    }

    setVal('font', design.font || 'athletic');
    setChecked('showFrontText', design.showFrontText);
    setChecked('showFrontNumber', design.showFrontNumber);
    setChecked('showBackText', design.showBackText);
    setChecked('showBackNumber', design.showBackNumber);
    setChecked('showSponsor', design.showSponsor);

    const customFontInput = document.getElementById('customFontSearch');
    if (customFontInput) {
        customFontInput.value = design.customFont || '';
    }

    const frontSizeVal = design.frontNumberSize !== undefined ? design.frontNumberSize : (design.numberSize || 140);
    const fontSizeFrontNumber = document.getElementById('fontSizeFrontNumber');
    if (fontSizeFrontNumber) {
        fontSizeFrontNumber.value = frontSizeVal;
    }
    const lblFrontNumberSize = document.getElementById('lblFrontNumberSize');
    if (lblFrontNumberSize) {
        lblFrontNumberSize.textContent = frontSizeVal + 'px';
    }

    const backSizeVal = design.backNumberSize !== undefined ? design.backNumberSize : (design.numberSize || 140);
    const fontSizeBackNumber = document.getElementById('fontSizeBackNumber');
    if (fontSizeBackNumber) {
        fontSizeBackNumber.value = backSizeVal;
    }
    const lblBackNumberSize = document.getElementById('lblBackNumberSize');
    if (lblBackNumberSize) {
        lblBackNumberSize.textContent = backSizeVal + 'px';
    }

    const outlineVal = design.outlineWeight !== undefined ? design.outlineWeight : 8;
    const outlineWeight = document.getElementById('outlineWeight');
    if (outlineWeight) {
        outlineWeight.value = outlineVal;
    }
    const lblOutlineWeight = document.getElementById('lblOutlineWeight');
    if (lblOutlineWeight) {
        lblOutlineWeight.textContent = outlineVal + 'px';
    }

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

    if (window._updateActiveSkinSwatches) {
        window._updateActiveSkinSwatches(design.skinTone || 'obsidian');
    }

    // Sync Shorts Controls
    setChecked('matchJerseyColors', design.matchJerseyColors !== false);
    const customShortsContainer = document.getElementById('customShortsColorsContainer');
    if (customShortsContainer) {
        if (design.matchJerseyColors !== false) {
            customShortsContainer.classList.add('hidden');
        } else {
            customShortsContainer.classList.remove('hidden');
        }
    }
    setVal('shortsBaseColor', design.shortsBaseColor || design.baseColor);
    setVal('shortsAccentColor', design.shortsAccentColor || design.accentColor);
    setChecked('showShortsLogo', design.showShortsLogo !== false);
    setChecked('showShortsNumber', design.showShortsNumber !== false);

    // Shorts sizes & labels
    const sNumSize = design.shortsNumberSize !== undefined ? design.shortsNumberSize : 54;
    setVal('shortsNumberSize', sNumSize);
    const lblShortsNumberSize = document.getElementById('lblShortsNumberSize');
    if (lblShortsNumberSize) lblShortsNumberSize.textContent = `${sNumSize}px`;

    const sLogoSize = design.shortsLogoSize !== undefined ? design.shortsLogoSize : 46;
    setVal('shortsLogoSize', sLogoSize);
    const lblShortsLogoSize = document.getElementById('lblShortsLogoSize');
    if (lblShortsLogoSize) lblShortsLogoSize.textContent = `${sLogoSize}px`;

    // Shorts text
    setChecked('showShortsText', !!design.showShortsText);
    const shortsTextContainer = document.getElementById('shortsTextContainer');
    if (shortsTextContainer) {
        if (design.showShortsText) shortsTextContainer.classList.remove('hidden');
        else shortsTextContainer.classList.add('hidden');
    }
    setVal('shortsText', design.shortsText || '');
    const sTextSize = design.shortsTextSize !== undefined ? design.shortsTextSize : 32;
    setVal('shortsTextSize', sTextSize);
    const lblShortsTextSize = document.getElementById('lblShortsTextSize');
    if (lblShortsTextSize) lblShortsTextSize.textContent = `${sTextSize}px`;

    // Sync active piece buttons
    const activePiece = design.viewPiece || 'full';
    const btnPieceFull = document.getElementById('btnPieceFull');
    const btnPieceJersey = document.getElementById('btnPieceJersey');
    const btnPieceShorts = document.getElementById('btnPieceShorts');
    [
        { btn: btnPieceFull, id: 'full' },
        { btn: btnPieceJersey, id: 'jersey' },
        { btn: btnPieceShorts, id: 'shorts' }
    ].forEach(({ btn, id }) => {
        if (btn) {
            if (activePiece === id) {
                btn.className = 'px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white transition';
            } else {
                btn.className = 'px-3 py-1.5 text-xs font-bold rounded-lg text-slate-400 hover:text-white transition';
            }
        }
    });
}

function syncScannedColorUI() {
    const scannedColor = localStorage.getItem('modelyx_color');
    const scannedContainer = document.getElementById('scannedColorContainer');
    if (scannedContainer) {
        if (scannedColor) {
            scannedContainer.classList.remove('hidden');
            scannedContainer.classList.add('flex');
            const swatch = document.getElementById('scannedColorSwatch');
            const hexLabel = document.getElementById('lblScannedHex');
            if (swatch) swatch.style.backgroundColor = scannedColor;
            if (hexLabel) hexLabel.textContent = scannedColor;
        } else {
            scannedContainer.classList.add('hidden');
            scannedContainer.classList.remove('flex');
        }
    }
}

function showReasoning(text) {
    const el = document.getElementById('aiReasoning');
    const wrapper = document.getElementById('aiReasoningWrapper');
    if (el) {
        el.textContent = text;
        el.style.display = 'block';
    }
    if (wrapper) {
        wrapper.style.display = 'block';
    }
}

function hideReasoning() {
    const el = document.getElementById('aiReasoning');
    const wrapper = document.getElementById('aiReasoningWrapper');
    if (el) {
        el.style.display = 'none';
        el.textContent = '';
    }
    if (wrapper) {
        wrapper.style.display = 'none';
    }
}

export function getCurrentDesign() {
    return { ...currentDesign };
}

function loadGoogleFont(fontName) {
    if (!fontName) return;
    const linkId = 'gfont-' + fontName.replace(/\s+/g, '-').toLowerCase();
    if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;700&display=swap`;
        document.head.appendChild(link);

        if (document.fonts) {
            document.fonts.load(`1em "${fontName}"`).then(() => {
                applyDesign(currentDesign);
            }).catch(err => {
                console.warn("Could not load custom font:", fontName, err);
            });
        }
    }
}

function getDraggableElementsFront(design) {
    const list = [];
    const piece = design.viewPiece || 'full';

    // 1. Jersey Front Elements (shown in 'full' or 'jersey')
    if (piece !== 'shorts') {
        const isFull = (piece !== 'jersey');
        const scale = isFull ? 0.58 : 1.0;
        const offsetX = isFull ? (512 - 512 * scale) / 2 : 0;
        const offsetY = isFull ? 8 : 0;

        if (design.showFrontText && design.frontText) {
            const origX = design.teamX !== undefined ? design.teamX : 256;
            const origY = design.teamY !== undefined ? design.teamY : 96;
            const rawW = Math.max(100, (design.frontText || '').length * 20);
            const rawH = 40;
            list.push({
                name: 'teamName',
                origJerseyX: origX,
                origJerseyY: origY,
                origX: origX,
                origY: origY,
                scale: scale,
                x: offsetX + origX * scale,
                y: offsetY + origY * scale,
                width: rawW * scale,
                height: rawH * scale
            });
        }
        if (design.showSponsor && design.sponsorText) {
            const origX = design.sponsorX !== undefined ? design.sponsorX : 256;
            const origY = design.sponsorY !== undefined ? design.sponsorY : 222;
            const rawW = Math.max(120, (design.sponsorText || '').length * 22);
            const rawH = 44;
            list.push({
                name: 'sponsorText',
                origJerseyX: origX,
                origJerseyY: origY,
                origX: origX,
                origY: origY,
                scale: scale,
                x: offsetX + origX * scale,
                y: offsetY + origY * scale,
                width: rawW * scale,
                height: rawH * scale
            });
        }
        if (design.logo && design.logo !== 'none') {
            const size = design.logoSize !== undefined ? design.logoSize : 60;
            const origX = design.logoX !== undefined ? design.logoX : 256;
            const origY = design.logoY !== undefined ? design.logoY : 155;
            list.push({
                name: 'logo',
                origJerseyX: origX,
                origJerseyY: origY,
                origX: origX,
                origY: origY,
                scale: scale,
                x: offsetX + origX * scale,
                y: offsetY + origY * scale,
                width: size * scale,
                height: size * scale
            });
        }
        if (design.showFrontNumber) {
            const frontSizeVal = design.frontNumberSize !== undefined ? design.frontNumberSize : (design.numberSize || 140);
            const origX = design.numberX !== undefined ? design.numberX : 256;
            const origY = design.numberY !== undefined ? design.numberY : 340;
            const rawW = Math.max(80, (design.number || '').length * frontSizeVal * 0.5);
            const rawH = frontSizeVal * 0.8;
            list.push({
                name: 'number',
                origJerseyX: origX,
                origJerseyY: origY,
                origX: origX,
                origY: origY,
                scale: scale,
                x: offsetX + origX * scale,
                y: offsetY + origY * scale,
                width: rawW * scale,
                height: rawH * scale
            });
        }
    }

    // 2. Shorts Front Elements (shown in 'full' or 'shorts')
    if (piece !== 'jersey') {
        const isFull = (piece !== 'shorts');
        const sScale = isFull ? 0.58 : 1.0;
        const sOffsetX = isFull ? (512 - 512 * sScale) / 2 : 0;
        const sOffsetY = isFull ? 210 : 0;

        // Shorts Player Number
        if (design.showShortsNumber !== false && design.number) {
            const origX = design.shortsNumberX !== undefined ? design.shortsNumberX : 127;
            const origY = design.shortsNumberY !== undefined ? design.shortsNumberY : 385;
            const sizeVal = design.shortsNumberSize !== undefined ? design.shortsNumberSize : 54;
            const rawW = Math.max(50, (design.number || '23').length * sizeVal * 0.65);
            const rawH = sizeVal * 0.9;
            list.push({
                name: 'shortsNumber',
                origJerseyX: origX,
                origJerseyY: origY,
                origX: origX,
                origY: origY,
                scale: sScale,
                x: sOffsetX + origX * sScale,
                y: sOffsetY + origY * sScale,
                width: rawW * sScale,
                height: rawH * sScale
            });
        }

        // Shorts Crest Badge
        if (design.showShortsLogo !== false && design.logo && design.logo !== 'none') {
            const origX = design.shortsLogoX !== undefined ? design.shortsLogoX : 385;
            const origY = design.shortsLogoY !== undefined ? design.shortsLogoY : 385;
            const size = design.shortsLogoSize !== undefined ? design.shortsLogoSize : 46;
            list.push({
                name: 'shortsLogo',
                origJerseyX: origX,
                origJerseyY: origY,
                origX: origX,
                origY: origY,
                scale: sScale,
                x: sOffsetX + origX * sScale,
                y: sOffsetY + origY * sScale,
                width: size * sScale,
                height: size * sScale
            });
        }

        // Shorts Custom Text / Wordmark
        if (design.showShortsText && design.shortsText) {
            const origX = design.shortsTextX !== undefined ? design.shortsTextX : 385;
            const origY = design.shortsTextY !== undefined ? design.shortsTextY : 320;
            const size = design.shortsTextSize !== undefined ? design.shortsTextSize : 32;
            const rawW = Math.max(50, (design.shortsText || '').length * size * 0.65);
            const rawH = size * 0.9;
            list.push({
                name: 'shortsText',
                origJerseyX: origX,
                origJerseyY: origY,
                origX: origX,
                origY: origY,
                scale: sScale,
                x: sOffsetX + origX * sScale,
                y: sOffsetY + origY * sScale,
                width: rawW * sScale,
                height: rawH * sScale
            });
        }
    }

    return list;
}

function getDraggableElementsBack(design) {
    const list = [];
    const piece = design.viewPiece || 'full';

    // 1. Jersey Back Elements (shown in 'full' or 'jersey')
    if (piece !== 'shorts') {
        const isFull = (piece !== 'jersey');
        const scale = isFull ? 0.58 : 1.0;
        const offsetX = isFull ? (512 - 512 * scale) / 2 : 0;
        const offsetY = isFull ? 8 : 0;

        if (design.showBackText && design.backName) {
            const origX = design.backNameX !== undefined ? design.backNameX : 256;
            const origY = (design.backNameY !== undefined ? design.backNameY : 380) - 260;
            const rawW = Math.max(120, (design.backName || '').length * 22);
            const rawH = 44;
            list.push({
                name: 'backName',
                origJerseyX: origX,
                origJerseyY: origY,
                origX: origX,
                origY: origY,
                scale: scale,
                x: offsetX + origX * scale,
                y: offsetY + origY * scale,
                width: rawW * scale,
                height: rawH * scale
            });
        }
        if (design.showBackNumber) {
            const backSizeVal = design.backNumberSize !== undefined ? design.backNumberSize : (design.numberSize || 140);
            const origX = design.backNumberX !== undefined ? design.backNumberX : 256;
            const origY = design.backNumberY !== undefined ? design.backNumberY : 290;
            const rawW = Math.max(80, (design.number || '').length * backSizeVal * 0.5);
            const rawH = backSizeVal * 0.8;
            list.push({
                name: 'backNumber',
                origJerseyX: origX,
                origJerseyY: origY,
                origX: origX,
                origY: origY,
                scale: scale,
                x: offsetX + origX * scale,
                y: offsetY + origY * scale,
                width: rawW * scale,
                height: rawH * scale
            });
        }
    }

    // 2. Shorts Back Elements (shown in 'full' or 'shorts')
    if (piece !== 'jersey') {
        const isFull = (piece !== 'shorts');
        const sScale = isFull ? 0.58 : 1.0;
        const sOffsetX = isFull ? (512 - 512 * sScale) / 2 : 0;
        const sOffsetY = isFull ? 210 : 0;

        if (design.showShortsBackNumber && design.number) {
            const origX = design.shortsBackNumberX !== undefined ? design.shortsBackNumberX : 385;
            const origY = design.shortsBackNumberY !== undefined ? design.shortsBackNumberY : 385;
            const sizeVal = design.shortsBackNumberSize !== undefined ? design.shortsBackNumberSize : 54;
            const rawW = Math.max(50, (design.number || '23').length * sizeVal * 0.65);
            const rawH = sizeVal * 0.9;
            list.push({
                name: 'shortsBackNumber',
                origJerseyX: origX,
                origJerseyY: origY,
                origX: origX,
                origY: origY,
                scale: sScale,
                x: sOffsetX + origX * sScale,
                y: sOffsetY + origY * sScale,
                width: rawW * sScale,
                height: rawH * sScale
            });
        }

        if (design.showShortsBackText && design.shortsBackText) {
            const origX = design.shortsBackTextX !== undefined ? design.shortsBackTextX : 256;
            const origY = design.shortsBackTextY !== undefined ? design.shortsBackTextY : 385;
            const size = design.shortsBackTextSize !== undefined ? design.shortsBackTextSize : 32;
            const rawW = Math.max(50, (design.shortsBackText || '').length * size * 0.65);
            const rawH = size * 0.9;
            list.push({
                name: 'shortsBackText',
                origJerseyX: origX,
                origJerseyY: origY,
                origX: origX,
                origY: origY,
                scale: sScale,
                x: sOffsetX + origX * sScale,
                y: sOffsetY + origY * sScale,
                width: rawW * sScale,
                height: rawH * sScale
            });
        }
    }

    return list;
}

function getMouseCoords(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) / rect.width) * 512;
    const y = ((clientY - rect.top) / rect.height) * 512;
    return { x, y };
}

function bindDragEvents(canvas, isBack) {
    let activeDrag = null;

    canvas.addEventListener('mousedown', onStart);
    canvas.addEventListener('touchstart', onStart, { passive: true });

    function onStart(e) {
        const coords = getMouseCoords(e, canvas);
        const elements = isBack ? getDraggableElementsBack(currentDesign) : getDraggableElementsFront(currentDesign);
        const clicked = elements.find(el =>
            coords.x >= el.x - el.width / 2 && coords.x <= el.x + el.width / 2 &&
            coords.y >= el.y - el.height / 2 && coords.y <= el.y + el.height / 2
        );

        if (clicked) {
            activeDrag = {
                name: clicked.name,
                scale: clicked.scale || 1.0,
                origX: clicked.origX !== undefined ? clicked.origX : clicked.origJerseyX,
                origY: clicked.origY !== undefined ? clicked.origY : clicked.origJerseyY,
                startCx: coords.x,
                startCy: coords.y
            };

            window.addEventListener('mousemove', onMove);
            window.addEventListener('touchmove', onMove, { passive: false });
            window.addEventListener('mouseup', onEnd);
            window.addEventListener('touchend', onEnd);
        }
    }

    function onMove(e) {
        if (!activeDrag) return;
        if (e.cancelable) e.preventDefault();

        const coords = getMouseCoords(e, canvas);
        const dx = (coords.x - activeDrag.startCx) / (activeDrag.scale || 1.0);
        const dy = (coords.y - activeDrag.startCy) / (activeDrag.scale || 1.0);

        const newX = Math.round(Math.max(10, Math.min(502, activeDrag.origX + dx)));
        const newY = Math.round(Math.max(10, Math.min(502, activeDrag.origY + dy)));

        if (activeDrag.name === 'teamName') {
            currentDesign.teamX = newX;
            currentDesign.teamY = newY;
        } else if (activeDrag.name === 'sponsorText') {
            currentDesign.sponsorX = newX;
            currentDesign.sponsorY = newY;
        } else if (activeDrag.name === 'logo') {
            currentDesign.logoX = newX;
            currentDesign.logoY = newY;
        } else if (activeDrag.name === 'number') {
            currentDesign.numberX = newX;
            currentDesign.numberY = newY;
        } else if (activeDrag.name === 'backName') {
            currentDesign.backNameX = newX;
            currentDesign.backNameY = newY + 260;
        } else if (activeDrag.name === 'backNumber') {
            currentDesign.backNumberX = newX;
            currentDesign.backNumberY = newY;
        } else if (activeDrag.name === 'shortsNumber') {
            currentDesign.shortsNumberX = newX;
            currentDesign.shortsNumberY = newY;
        } else if (activeDrag.name === 'shortsLogo') {
            currentDesign.shortsLogoX = newX;
            currentDesign.shortsLogoY = newY;
        } else if (activeDrag.name === 'shortsText') {
            currentDesign.shortsTextX = newX;
            currentDesign.shortsTextY = newY;
        } else if (activeDrag.name === 'shortsBackNumber') {
            currentDesign.shortsBackNumberX = newX;
            currentDesign.shortsBackNumberY = newY;
        } else if (activeDrag.name === 'shortsBackText') {
            currentDesign.shortsBackTextX = newX;
            currentDesign.shortsBackTextY = newY;
        }

        applyDesign(currentDesign);
    }

    function onEnd() {
        if (!activeDrag) return;
        activeDrag = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchend', onEnd);
    }

    canvas.addEventListener('mousemove', e => {
        if (activeDrag) return;
        const coords = getMouseCoords(e, canvas);
        const elements = isBack ? getDraggableElementsBack(currentDesign) : getDraggableElementsFront(currentDesign);
        const hovered = elements.some(el =>
            coords.x >= el.x - el.width / 2 && coords.x <= el.x + el.width / 2 &&
            coords.y >= el.y - el.height / 2 && coords.y <= el.y + el.height / 2
        );
        canvas.style.cursor = hovered ? 'move' : 'default';
    });
}