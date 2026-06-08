import * as THREE from 'three';

export function buildTexture(options = {}) {
    const {
        teamName = 'TEAM',
        number = '23',
        baseColor = '#4F46E5',
        accentColor = '#7C3AED',
        tertiaryColor = '#ffffff',
        pattern = 'none',
        logo = 'none',
        font = 'athletic',
        sponsorText = ''
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 1. Base Background
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // 2. Draw Pattern Preset
    drawPattern(ctx, pattern, baseColor, accentColor, tertiaryColor);

    // 3. Draw Badge/Logo
    if (logo !== 'none') {
        drawLogo(ctx, logo, 256, 150, 60, tertiaryColor, accentColor);
    }

    // 4. Sponsor Text (Front)
    if (sponsorText) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = tertiaryColor;
        ctx.lineWidth = 4;
        ctx.font = getFontString('sponsor', font);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(sponsorText.toUpperCase(), 256, 220);
        ctx.fillText(sponsorText.toUpperCase(), 256, 220);
    }

    // 5. Player Number (Front Center)
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = tertiaryColor;
    ctx.lineWidth = 12;
    ctx.font = getFontString('number', font);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 10;
    ctx.strokeText(number, 256, 340);
    ctx.shadowBlur = 0; // Disable shadow for fill to avoid double shadow
    ctx.fillText(number, 256, 340);

    // 6. Team Name (Front Header, if no sponsor text, or just small above number)
    if (!sponsorText && teamName) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = tertiaryColor;
        ctx.lineWidth = 6;
        ctx.font = getFontString('team', font);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(teamName.toUpperCase(), 256, 90);
        ctx.fillText(teamName.toUpperCase(), 256, 90);
    }

    return new THREE.CanvasTexture(canvas);
}

export function buildBackTexture(options = {}) {
    const {
        teamName = 'TEAM',
        number = '23',
        baseColor = '#4F46E5',
        accentColor = '#7C3AED',
        tertiaryColor = '#ffffff',
        pattern = 'none',
        font = 'athletic'
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 1. Base Background
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // 2. Draw Pattern Preset
    drawPattern(ctx, pattern, baseColor, accentColor, tertiaryColor);

    // 3. Flipped coordinate system for Back mirroring
    ctx.save();
    ctx.translate(512, 0);
    ctx.scale(-1, 1);

    // Player Name (Arched at the top)
    const nameFont = getFontString('name', font);
    drawArchedText(ctx, teamName.toUpperCase(), 256, 380, 260, Math.PI * 1.5, nameFont, '#ffffff', tertiaryColor);

    // Player Number (Large on Back Center)
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = tertiaryColor;
    ctx.lineWidth = 14;
    ctx.font = getFontString('number_back', font);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 12;
    ctx.strokeText(number, 256, 290);
    ctx.shadowBlur = 0;
    ctx.fillText(number, 256, 290);

    ctx.restore();

    return new THREE.CanvasTexture(canvas);
}

// Helper to resolve font styles
function getFontString(type, fontStyle) {
    let base = 'sans-serif';
    if (fontStyle === 'stencil') {
        base = 'Impact, Arial Black, sans-serif';
    } else if (fontStyle === 'athletic') {
        base = '"Courier New", Courier, monospace';
    } else if (fontStyle === 'tech') {
        base = '"Arial Black", Gadget, sans-serif';
    }

    if (type === 'number') return `bold ${fontStyle === 'stencil' ? 'italic' : ''} 140px ${base}`;
    if (type === 'number_back') return `bold ${fontStyle === 'stencil' ? 'italic' : ''} 160px ${base}`;
    if (type === 'name') return `bold ${fontStyle === 'stencil' ? 'italic' : ''} 38px ${base}`;
    if (type === 'team') return `bold 32px ${base}`;
    if (type === 'sponsor') return `bold italic 36px ${base}`;
    return `bold 24px ${base}`;
}

// Curved text drawer helper
function drawArchedText(ctx, text, x, y, radius, startAngle, font, fillStyle, strokeStyle) {
    ctx.font = font;
    ctx.fillStyle = fillStyle;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (strokeStyle) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = 8;
    }

    const chars = text.split('');
    const numChars = chars.length;
    // Radial spacing based on character count
    const angleRange = Math.min(Math.PI * 0.45, numChars * 0.08);
    const startRad = startAngle - angleRange / 2;
    const stepRad = angleRange / (numChars - 1 || 1);

    for (let i = 0; i < numChars; i++) {
        const charAngle = startRad + i * stepRad;
        ctx.save();
        // Position along the circular arc
        ctx.translate(x + Math.cos(charAngle) * radius, y + Math.sin(charAngle) * radius);
        // Rotate text to face outward from circle
        ctx.rotate(charAngle + Math.PI / 2);
        if (strokeStyle) {
            ctx.strokeText(chars[i], 0, 0);
        }
        ctx.fillText(chars[i], 0, 0);
        ctx.restore();
    }
}

// Vector Badge/Logo Drawer
function drawLogo(ctx, logoType, x, y, size, primaryColor, secondaryColor) {
    ctx.save();
    ctx.translate(x, y);

    if (logoType === 'shield') {
        ctx.fillStyle = primaryColor;
        ctx.strokeStyle = secondaryColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-size/2, -size/2);
        ctx.lineTo(size/2, -size/2);
        ctx.lineTo(size/2, 0);
        ctx.quadraticCurveTo(size/2, size/2, 0, size * 0.65);
        ctx.quadraticCurveTo(-size/2, size/2, -size/2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner shield line
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-size/2.5, -size/2.5);
        ctx.lineTo(size/2.5, -size/2.5);
        ctx.lineTo(size/2.5, 0);
        ctx.quadraticCurveTo(size/2.5, size/2.5, 0, size * 0.55);
        ctx.quadraticCurveTo(-size/2.5, size/2.5, -size/2.5, 0);
        ctx.closePath();
        ctx.stroke();
    } 
    else if (logoType === 'star') {
        ctx.fillStyle = primaryColor;
        ctx.strokeStyle = secondaryColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        let rot = Math.PI / 2 * 3;
        let cx = 0, cy = 0;
        let spikes = 5;
        let outerRadius = size / 2;
        let innerRadius = size / 4;
        let step = Math.PI / spikes;
        for (let i = 0; i < spikes; i++) {
            cx = Math.cos(rot) * outerRadius;
            cy = Math.sin(rot) * outerRadius;
            ctx.lineTo(cx, cy);
            rot += step;
            cx = Math.cos(rot) * innerRadius;
            cy = Math.sin(rot) * innerRadius;
            ctx.lineTo(cx, cy);
            rot += step;
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    } 
    else if (logoType === 'flame') {
        ctx.fillStyle = primaryColor;
        ctx.strokeStyle = secondaryColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, size * 0.5);
        ctx.bezierCurveTo(-size * 0.5, size * 0.3, -size * 0.4, -size * 0.1, -size * 0.1, -size * 0.5);
        ctx.bezierCurveTo(-size * 0.15, -size * 0.05, -size * 0.1, size * 0.1, 0, size * 0.15);
        ctx.bezierCurveTo(size * 0.1, size * 0.1, size * 0.15, -size * 0.05, size * 0.1, -size * 0.5);
        ctx.bezierCurveTo(size * 0.4, -size * 0.1, size * 0.5, size * 0.3, 0, size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    } 
    else if (logoType === 'eagle') {
        ctx.fillStyle = primaryColor;
        ctx.strokeStyle = secondaryColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Stylized Eagle Head path
        ctx.moveTo(-size * 0.4, -size * 0.15);
        ctx.lineTo(-size * 0.15, -size * 0.35);
        ctx.lineTo(size * 0.15, -size * 0.35);
        ctx.quadraticCurveTo(size * 0.45, -size * 0.15, size * 0.35, size * 0.1); // Beak curve top
        ctx.lineTo(size * 0.05, 0.0); // Beak tip
        ctx.lineTo(size * 0.15, -size * 0.1); // Inner beak mouth
        ctx.quadraticCurveTo(-size * 0.05, -size * 0.05, -size * 0.1, size * 0.3); // Neck
        ctx.lineTo(-size * 0.35, size * 0.3);
        ctx.lineTo(-size * 0.25, size * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Eye dot
        ctx.fillStyle = secondaryColor;
        ctx.beginPath();
        ctx.arc(size * 0.08, -size * 0.2, size * 0.05, 0, Math.PI * 2);
        ctx.fill();
    } 
    else if (logoType === 'vortex') {
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 6;
        ctx.beginPath();
        for (let i = 0; i < 40; i++) {
            let angle = 0.25 * i;
            let r = (size / 2) * (i / 40);
            let cx = Math.cos(angle) * r;
            let cy = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(cx, cy);
            else ctx.lineTo(cx, cy);
        }
        ctx.stroke();

        ctx.strokeStyle = secondaryColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 40; i++) {
            let angle = 0.25 * i + Math.PI;
            let r = (size / 2) * (i / 40);
            let cx = Math.cos(angle) * r;
            let cy = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(cx, cy);
            else ctx.lineTo(cx, cy);
        }
        ctx.stroke();
    }

    ctx.restore();
}

// 10 Customizable Patterns Engine
function drawPattern(ctx, pattern, baseColor, accentColor, tertiaryColor) {
    // Deterministic random generator for repeating patterns (splatter, scratches, camo)
    let seed = 42;
    function random() {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    if (pattern === 'stripes') {
        ctx.fillStyle = accentColor;
        for (let i = 0; i < 512; i += 64) {
            ctx.fillRect(i, 0, 24, 512);
        }
        ctx.fillStyle = tertiaryColor;
        for (let i = 24; i < 512; i += 64) {
            ctx.fillRect(i, 0, 6, 512);
        }
    } 
    else if (pattern === 'diagonal') {
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 20;
        for (let i = -512; i < 1024; i += 80) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + 512, 512);
            ctx.stroke();
        }
        ctx.strokeStyle = tertiaryColor;
        ctx.lineWidth = 6;
        for (let i = -512; i < 1024; i += 80) {
            ctx.beginPath();
            ctx.moveTo(i + 25, 0);
            ctx.lineTo(i + 25 + 512, 512);
            ctx.stroke();
        }
    } 
    else if (pattern === 'panel') {
        ctx.fillStyle = accentColor;
        ctx.fillRect(0, 0, 110, 512);
        ctx.fillRect(402, 0, 110, 512);
        ctx.fillStyle = tertiaryColor;
        ctx.fillRect(110, 0, 12, 512);
        ctx.fillRect(390, 0, 12, 512);
    } 
    else if (pattern === 'gradient') {
        const grad = ctx.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0, baseColor);
        grad.addColorStop(0.5, accentColor);
        grad.addColorStop(1, tertiaryColor);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);
    }
    else if (pattern === 'thunderstorm') {
        // Jagged, angular shapes
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.moveTo(0, 120);
        ctx.lineTo(160, 60);
        ctx.lineTo(130, 190);
        ctx.lineTo(260, 110);
        ctx.lineTo(210, 270);
        ctx.lineTo(360, 160);
        ctx.lineTo(290, 420);
        ctx.lineTo(512, 320);
        ctx.lineTo(512, 512);
        ctx.lineTo(0, 512);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = tertiaryColor;
        ctx.beginPath();
        ctx.moveTo(0, 220);
        ctx.lineTo(140, 170);
        ctx.lineTo(110, 280);
        ctx.lineTo(230, 220);
        ctx.lineTo(190, 350);
        ctx.lineTo(330, 270);
        ctx.lineTo(270, 450);
        ctx.lineTo(512, 400);
        ctx.lineTo(512, 512);
        ctx.lineTo(0, 512);
        ctx.closePath();
        ctx.fill();
    }
    else if (pattern === 'paint_splatter') {
        seed = 15; // Set seed for splatters
        ctx.fillStyle = accentColor;
        for (let i = 0; i < 9; i++) {
            let cx = random() * 512;
            let cy = random() * 512;
            let r = 18 + random() * 32;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            // Smaller splatter drops around
            ctx.fillStyle = tertiaryColor;
            for (let j = 0; j < 5; j++) {
                let dcx = cx + (random() - 0.5) * r * 2.8;
                let dcy = cy + (random() - 0.5) * r * 2.8;
                let dr = 2 + random() * 6;
                ctx.beginPath();
                ctx.arc(dcx, dcy, dr, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = accentColor;
        }
    }
    else if (pattern === 'apex_gamer') {
        // Esports angular side-chevrons & fading center grid
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(130, 0); ctx.lineTo(50, 512); ctx.lineTo(0, 512);
        ctx.closePath(); ctx.fill();

        ctx.beginPath();
        ctx.moveTo(512, 0); ctx.lineTo(382, 0); ctx.lineTo(462, 512); ctx.lineTo(512, 512);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = tertiaryColor;
        ctx.beginPath();
        ctx.moveTo(130, 0); ctx.lineTo(150, 0); ctx.lineTo(65, 512); ctx.lineTo(50, 512);
        ctx.closePath(); ctx.fill();

        ctx.beginPath();
        ctx.moveTo(382, 0); ctx.lineTo(362, 0); ctx.lineTo(447, 512); ctx.lineTo(462, 512);
        ctx.closePath(); ctx.fill();

        // Center ladder bars fading out
        ctx.fillStyle = accentColor;
        for (let i = 120; i < 420; i += 32) {
            let dist = Math.abs(i - 270) / 150;
            let alpha = 1.0 - dist;
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillRect(206, i, 100, 10);
        }
        ctx.globalAlpha = 1.0;
    }
    else if (pattern === 'vortex_swoosh') {
        // Curved swooping sections
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.moveTo(0, 160);
        ctx.bezierCurveTo(140, 190, 190, 360, 0, 460);
        ctx.lineTo(0, 512); ctx.lineTo(140, 512);
        ctx.bezierCurveTo(240, 390, 190, 210, 0, 160);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = tertiaryColor;
        ctx.beginPath();
        ctx.moveTo(512, 160);
        ctx.bezierCurveTo(372, 190, 322, 360, 512, 460);
        ctx.lineTo(512, 512); ctx.lineTo(372, 512);
        ctx.bezierCurveTo(272, 390, 322, 210, 512, 160);
        ctx.closePath(); ctx.fill();
    }
    else if (pattern === 'carbon_scratch') {
        seed = 45;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 4;
        for (let i = 0; i < 70; i++) {
            let x = random() * 512;
            let y = random() * 512;
            let len = 20 + random() * 25;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + len, y + len * 0.45);
            ctx.stroke();
        }
        ctx.strokeStyle = tertiaryColor;
        ctx.lineWidth = 2;
        for (let i = 0; i < 45; i++) {
            let x = random() * 512;
            let y = random() * 512;
            let len = 15 + random() * 20;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + len, y + len * 0.45);
            ctx.stroke();
        }
    }
    else if (pattern === 'digi_camo') {
        seed = 80;
        const choices = [accentColor, tertiaryColor, baseColor];
        for (let i = 0; i < 220; i++) {
            let x = Math.floor(random() * 16) * 32;
            let y = Math.floor(random() * 16) * 32;
            let w = (1 + Math.floor(random() * 2)) * 32;
            let h = (1 + Math.floor(random() * 2)) * 32;
            ctx.fillStyle = choices[Math.floor(random() * choices.length)];
            ctx.globalAlpha = 0.35 + random() * 0.4;
            ctx.fillRect(x, y, w, h);
        }
        ctx.globalAlpha = 1.0;
    }
    else if (pattern === 'retro_halftone') {
        ctx.fillStyle = accentColor;
        for (let y = 15; y < 512; y += 28) {
            // Larger at top, fades out downward
            let r = Math.max(0.5, (1.0 - y / 512) * 13);
            for (let x = 15; x < 512; x += 28) {
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.fillStyle = tertiaryColor;
        for (let y = 497; y > 0; y -= 28) {
            // Larger at bottom, fades out upward
            let r = Math.max(0.5, (y / 512) * 11);
            for (let x = 29; x < 512; x += 28) {
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    else if (pattern === 'cyber_grid') {
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1.5;
        // Grid columns
        for (let x = 32; x < 512; x += 64) {
            ctx.beginPath();
            ctx.moveTo(x, 0); ctx.lineTo(x, 512);
            ctx.stroke();
        }
        // Grid rows
        for (let y = 32; y < 512; y += 64) {
            ctx.beginPath();
            ctx.moveTo(0, y); ctx.lineTo(512, y);
            ctx.stroke();
        }

        // Tech blocks overlay
        seed = 120;
        ctx.fillStyle = tertiaryColor;
        for (let i = 0; i < 18; i++) {
            let bx = Math.floor(random() * 8) * 64 + 10;
            let by = Math.floor(random() * 8) * 64 + 10;
            ctx.globalAlpha = 0.2 + random() * 0.5;
            ctx.fillRect(bx, by, 44, 44);
        }
        ctx.globalAlpha = 1.0;
    }
    else if (pattern === 'tidal_wave') {
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 7;
        for (let y = -80; y < 580; y += 90) {
            ctx.beginPath();
            for (let x = 0; x <= 512; x += 12) {
                let waveY = y + Math.sin(x * 0.015) * 22;
                if (x === 0) ctx.moveTo(x, waveY);
                else ctx.lineTo(x, waveY);
            }
            ctx.stroke();
        }

        ctx.strokeStyle = tertiaryColor;
        ctx.lineWidth = 3.5;
        for (let y = -35; y < 580; y += 90) {
            ctx.beginPath();
            for (let x = 0; x <= 512; x += 12) {
                let waveY = y + Math.sin(x * 0.015 + Math.PI) * 18;
                if (x === 0) ctx.moveTo(x, waveY);
                else ctx.lineTo(x, waveY);
            }
            ctx.stroke();
        }
    }
}