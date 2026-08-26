import { initViewer, setPartColor, applyTextureToPanel, applyTextureToBack, applyMaterialFinish, changeEnvironment } from './threeViewer.js?v=20260811_2';
import { buildTexture, buildBackTexture, renderJersey2D } from './textureBuilder.js?v=20260811_2';
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
    logoY: 150,
    sponsorX: 256,
    sponsorY: 220,
    numberX: 256,
    numberY: 340,
    teamX: 256,
    teamY: 90,
    backNameX: 256,
    backNameY: 380,
    backNumberX: 256,
    backNumberY: 290
};

let currentDesign = {
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
    ...DEFAULT_COORDS
};

export function initEditor() {
    generateParameterizedPatterns();
    initViewer('jerseyCanvas');
    applyDesign(currentDesign);
    changeEnvironment(currentDesign.showroom);
    syncUI(currentDesign);
    bindControls();

    window.addEventListener('viewer:ready', () => {
        applyDesign(currentDesign);
    });
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
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    currentDesign.customLogoImage = img;
                    currentDesign.logo = 'custom';
                    currentDesign.logoSize = 20; // Must be tiny on initial load

                    const optCustom = document.getElementById('optCustomLogo');
                    if (optCustom) optCustom.style.display = 'block';

                    const logoSelect = document.getElementById('logo');
                    if (logoSelect) logoSelect.value = 'custom';

                    const logoSizeSlider = document.getElementById('logoSize');
                    if (logoSizeSlider) logoSizeSlider.value = 20;

                    const lblLogoSize = document.getElementById('lblLogoSize');
                    if (lblLogoSize) lblLogoSize.textContent = '20px';

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

    // Random design generator
    document.getElementById('randomBtn').addEventListener('click', () => {
        const rand = generateRandomDesign();
        currentDesign = {
            ...currentDesign,
            ...rand,
            frontText: rand.teamName || 'TEAM',
            backName: 'PLAYER',
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

    // AI suggestion handler
    const aiBtn = document.getElementById('aiBtn');
    const aiTeamInput = document.getElementById('aiTeamInput');
    const aiBtnText = document.getElementById('aiBtnText');

    if (aiTeamInput) {
        aiTeamInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (aiBtn) aiBtn.click();
            }
        });
    }

    if (aiBtn) {
        aiBtn.addEventListener('click', async () => {
            const teamInputVal = aiTeamInput ? aiTeamInput.value.trim() : '';
            const frontTextVal = document.getElementById('frontText') ? document.getElementById('frontText').value.trim() : '';
            const teamName = teamInputVal || frontTextVal || 'TEAM';

            aiBtn.disabled = true;
            aiBtn.classList.add('animate-pulse', 'opacity-80');
            if (aiBtnText) aiBtnText.textContent = '⚡ AI Designing...';
            else aiBtn.textContent = '⚡ AI Designing...';
            hideReasoning();

            try {
                const res = await fetch('/ai/suggest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ team_name: teamName })
                });

                const suggestion = await res.json();

                if (res.ok && suggestion) {
                    const finalTeamName = suggestion.teamName || teamName;
                    if (aiTeamInput) aiTeamInput.value = finalTeamName;

                    currentDesign = {
                        ...currentDesign,
                        baseColor: suggestion.baseColor || currentDesign.baseColor,
                        accentColor: suggestion.accentColor || currentDesign.accentColor,
                        tertiaryColor: suggestion.tertiaryColor || currentDesign.tertiaryColor,
                        pattern: suggestion.pattern || 'none',
                        logo: suggestion.logo || 'none',
                        font: suggestion.font || 'athletic',
                        finish: suggestion.finish || 'matte',
                        showroom: suggestion.showroom || 'cyber',
                        frontText: finalTeamName,
                        backName: 'PLAYER',
                        number: suggestion.number || '23',
                        sponsorText: suggestion.sponsorText || '',
                        showFrontText: true,
                        showFrontNumber: true,
                        showBackText: true,
                        showBackNumber: true,
                        showSponsor: !!suggestion.sponsorText,
                        customFont: ''
                    };
                    Object.assign(currentDesign, DEFAULT_COORDS);
                    syncUI(currentDesign);
                    applyDesign(currentDesign);
                    changeEnvironment(currentDesign.showroom);
                    showReasoning(suggestion.reasoning);
                } else {
                    showReasoning('AI suggestion failed. Please try again.');
                }
            } catch (err) {
                console.error(err);
                showReasoning('Server error connecting to AI service.');
            }

            aiBtn.disabled = false;
            aiBtn.classList.remove('animate-pulse', 'opacity-80');
            if (aiBtnText) aiBtnText.textContent = '🤖 Generate AI Design';
            else aiBtn.textContent = '🤖 Generate AI Design';
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

    const btn2D = document.getElementById('btnView2D');
    const btn3D = document.getElementById('btnView3D');
    const viewport2D = document.getElementById('viewport2D');
    const viewport3D = document.getElementById('viewport3D');

    if (btn2D && btn3D && viewport2D && viewport3D) {
        btn2D.addEventListener('click', () => {
            btn2D.className = 'px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white transition';
            btn3D.className = 'px-4 py-2 text-xs font-bold rounded-lg text-slate-400 hover:text-white transition';
            viewport2D.classList.remove('hidden');
            viewport3D.classList.add('hidden');
        });

        btn3D.addEventListener('click', () => {
            btn3D.className = 'px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white transition';
            btn2D.className = 'px-4 py-2 text-xs font-bold rounded-lg text-slate-400 hover:text-white transition';
            viewport3D.classList.remove('hidden');
            viewport2D.classList.add('hidden');
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 50);
        });
    }
}

function applyDesign(design) {
    const canvasFront = document.getElementById('canvasFront2D');
    const canvasBack = document.getElementById('canvasBack2D');
    if (canvasFront) {
        renderJersey2D(canvasFront, design, false);
    }
    if (canvasBack) {
        renderJersey2D(canvasBack, design, true);
    }

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

    const optCustom = document.getElementById('optCustomLogo');
    if (optCustom) {
        optCustom.style.display = design.customLogoImage ? 'block' : 'none';
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
    if (design.showFrontText && design.frontText) {
        list.push({
            name: 'teamName',
            x: design.teamX !== undefined ? design.teamX : 256,
            y: design.teamY !== undefined ? design.teamY : 90,
            width: Math.max(100, (design.frontText || '').length * 20),
            height: 40
        });
    }
    if (design.showSponsor && design.sponsorText) {
        list.push({
            name: 'sponsorText',
            x: design.sponsorX !== undefined ? design.sponsorX : 256,
            y: design.sponsorY !== undefined ? design.sponsorY : 220,
            width: Math.max(120, (design.sponsorText || '').length * 22),
            height: 44
        });
    }
    if (design.logo && design.logo !== 'none') {
        const size = design.logoSize !== undefined ? design.logoSize : 60;
        list.push({
            name: 'logo',
            x: design.logoX !== undefined ? design.logoX : 256,
            y: design.logoY !== undefined ? design.logoY : 150,
            width: size,
            height: size
        });
    }
    if (design.showFrontNumber) {
        const frontSizeVal = design.frontNumberSize !== undefined ? design.frontNumberSize : (design.numberSize || 140);
        list.push({
            name: 'number',
            x: design.numberX !== undefined ? design.numberX : 256,
            y: design.numberY !== undefined ? design.numberY : 340,
            width: Math.max(80, (design.number || '').length * frontSizeVal * 0.5),
            height: frontSizeVal * 0.8
        });
    }
    return list;
}

function getDraggableElementsBack(design) {
    const list = [];
    if (design.showBackText && design.backName) {
        list.push({
            name: 'backName',
            x: design.backNameX !== undefined ? design.backNameX : 256,
            y: (design.backNameY !== undefined ? design.backNameY : 380) - 260,
            width: Math.max(120, (design.backName || '').length * 22),
            height: 44
        });
    }
    if (design.showBackNumber) {
        const backSizeVal = design.backNumberSize !== undefined ? design.backNumberSize : (design.numberSize || 140);
        list.push({
            name: 'backNumber',
            x: design.backNumberX !== undefined ? design.backNumberX : 256,
            y: design.backNumberY !== undefined ? design.backNumberY : 290,
            width: Math.max(80, (design.number || '').length * backSizeVal * 0.5),
            height: backSizeVal * 0.8
        });
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
            coords.x >= el.x - el.width/2 && coords.x <= el.x + el.width/2 &&
            coords.y >= el.y - el.height/2 && coords.y <= el.y + el.height/2
        );

        if (clicked) {
            activeDrag = {
                name: clicked.name,
                origX: clicked.x,
                origY: clicked.y,
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
        const dx = coords.x - activeDrag.startCx;
        const dy = coords.y - activeDrag.startCy;

        const newX = Math.max(10, Math.min(502, activeDrag.origX + dx));
        const newY = Math.max(10, Math.min(502, activeDrag.origY + dy));

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
            coords.x >= el.x - el.width/2 && coords.x <= el.x + el.width/2 &&
            coords.y >= el.y - el.height/2 && coords.y <= el.y + el.height/2
        );
        canvas.style.cursor = hovered ? 'move' : 'default';
    });
}