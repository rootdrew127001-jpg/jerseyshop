import * as THREE from 'three';

let cachedFrontCanvas = null;
let cachedFrontTexture = null;

export function buildTexture(options = {}) {
    if (!cachedFrontCanvas) {
        cachedFrontCanvas = document.createElement('canvas');
        cachedFrontCanvas.width = 512;
        cachedFrontCanvas.height = 512;
    }
    const ctx = cachedFrontCanvas.getContext('2d');
    drawRawDesign(ctx, options, false, false);
    if (!cachedFrontTexture) {
        cachedFrontTexture = new THREE.CanvasTexture(cachedFrontCanvas);
    } else {
        cachedFrontTexture.needsUpdate = true;
    }
    return cachedFrontTexture;
}

let cachedBackCanvas = null;
let cachedBackTexture = null;

export function buildBackTexture(options = {}) {
    if (!cachedBackCanvas) {
        cachedBackCanvas = document.createElement('canvas');
        cachedBackCanvas.width = 512;
        cachedBackCanvas.height = 512;
    }
    const ctx = cachedBackCanvas.getContext('2d');
    drawRawDesign(ctx, options, true, false);
    if (!cachedBackTexture) {
        cachedBackTexture = new THREE.CanvasTexture(cachedBackCanvas);
    } else {
        cachedBackTexture.needsUpdate = true;
    }
    return cachedBackTexture;
}

export function drawRawDesign(ctx, options, isBack = false, mirrorBack = false) {
    if (!isBack) {
        const {
            number = '23',
            baseColor = '#4F46E5',
            accentColor = '#7C3AED',
            tertiaryColor = '#ffffff',
            pattern = 'none',
            logo = 'none',
            font = 'athletic',
            sponsorText = '',
            frontNumberSize = options.frontNumberSize !== undefined ? options.frontNumberSize : (options.numberSize || 140),
            outlineWeight = 8,
            customFont = '',
            logoX = 256,
            logoY = 150,
            sponsorX = 256,
            sponsorY = 220,
            numberX = 256,
            numberY = 340,
            teamX = 256,
            teamY = 90,
            logoSize = 60,
            customLogoImage = null,
            frontText = options.frontText !== undefined ? options.frontText : (options.teamName || 'TEAM'),
            showFrontText = options.showFrontText !== undefined ? options.showFrontText : true,
            showFrontNumber = options.showFrontNumber !== undefined ? options.showFrontNumber : true,
            showSponsor = options.showSponsor !== undefined ? options.showSponsor : !!options.sponsorText
        } = options;

        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 512, 512);

        drawPattern(ctx, pattern, baseColor, accentColor, tertiaryColor);

        if (logo !== 'none') {
            drawLogo(ctx, logo, logoX, logoY, logoSize, tertiaryColor, accentColor, customLogoImage);
        }

        if (showSponsor && sponsorText) {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = tertiaryColor;
            ctx.lineWidth = Math.max(1, Math.round(outlineWeight * 0.5));
            ctx.font = getFontString('sponsor', font, customFont);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeText(sponsorText.toUpperCase(), sponsorX, sponsorY);
            ctx.fillText(sponsorText.toUpperCase(), sponsorX, sponsorY);
        }

        if (showFrontNumber && number) {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = tertiaryColor;
            ctx.lineWidth = outlineWeight;
            ctx.font = getFontString('number', font, customFont, frontNumberSize);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 10;
            ctx.strokeText(number, numberX, numberY);
            ctx.shadowBlur = 0;
            ctx.fillText(number, numberX, numberY);
        }

        if (showFrontText && frontText) {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = tertiaryColor;
            ctx.lineWidth = Math.max(1, Math.round(outlineWeight * 0.5));
            ctx.font = getFontString('team', font, customFont);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeText(frontText.toUpperCase(), teamX, teamY);
            ctx.fillText(frontText.toUpperCase(), teamX, teamY);
        }
    } else {
        const {
            number = '23',
            baseColor = '#4F46E5',
            accentColor = '#7C3AED',
            tertiaryColor = '#ffffff',
            pattern = 'none',
            font = 'athletic',
            backNumberSize = options.backNumberSize !== undefined ? options.backNumberSize : (options.numberSize || 140),
            outlineWeight = 8,
            customFont = '',
            backNameX = 256,
            backNameY = 380,
            backNumberX = 256,
            backNumberY = 290,
            backName = options.backName !== undefined ? options.backName : (options.teamName || 'PLAYER'),
            showBackText = options.showBackText !== undefined ? options.showBackText : true,
            showBackNumber = options.showBackNumber !== undefined ? options.showBackNumber : true
        } = options;

        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 512, 512);

        drawPattern(ctx, pattern, baseColor, accentColor, tertiaryColor);

        if (mirrorBack) {
            ctx.save();
            ctx.translate(512, 0);
            ctx.scale(-1, 1);
        }

        if (showBackText && backName) {
            const nameFont = getFontString('name', font, customFont);
            drawArchedText(ctx, backName.toUpperCase(), backNameX, backNameY, 260, Math.PI * 1.5, nameFont, '#ffffff', tertiaryColor);
        }

        if (showBackNumber && number) {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = tertiaryColor;
            ctx.lineWidth = outlineWeight + 2;
            ctx.font = getFontString('number_back', font, customFont, backNumberSize);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 12;
            ctx.strokeText(number, backNumberX, backNumberY);
            ctx.shadowBlur = 0;
            ctx.fillText(number, backNumberX, backNumberY);
        }

        if (mirrorBack) {
            ctx.restore();
        }
    }
}

function pathJersey(ctx) {
    ctx.beginPath();
    ctx.moveTo(256, 68);
    ctx.quadraticCurveTo(280, 68, 305, 58);
    ctx.lineTo(342, 68);
    ctx.quadraticCurveTo(318, 140, 348, 175);
    ctx.lineTo(342, 465);
    ctx.quadraticCurveTo(256, 478, 170, 465);
    ctx.lineTo(164, 175);
    ctx.quadraticCurveTo(194, 140, 170, 68);
    ctx.lineTo(207, 58);
    ctx.quadraticCurveTo(232, 68, 256, 68);
    ctx.closePath();
}

export function renderJersey2D(targetCanvas, options, isBack = false) {
    console.log("renderJersey2D called for back:", isBack, "width:", targetCanvas ? targetCanvas.width : "null", "height:", targetCanvas ? targetCanvas.height : "null");
    if (!targetCanvas) {
        console.error("targetCanvas is null in renderJersey2D");
        return;
    }
    const ctx = targetCanvas.getContext('2d');
    const width = targetCanvas.width;
    const height = targetCanvas.height;

    ctx.clearRect(0, 0, width, height);

    const designCanvas = document.createElement('canvas');
    designCanvas.width = 512;
    designCanvas.height = 512;
    const designCtx = designCanvas.getContext('2d');

    drawRawDesign(designCtx, options, isBack);
    console.log("drawRawDesign finished on designCanvas");

    ctx.save();
    const scaleFactor = width / 512;
    const offsetX = (width - 512 * scaleFactor) / 2;
    const offsetY = (height - 512 * scaleFactor) / 2;
    ctx.translate(offsetX, offsetY);
    ctx.scale(scaleFactor, scaleFactor);

    pathJersey(ctx);
    ctx.clip();

    ctx.drawImage(designCanvas, 0, 0, 512, 512);

    ctx.globalCompositeOperation = 'multiply';

    const sideGrad = ctx.createLinearGradient(0, 0, 512, 0);
    sideGrad.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
    sideGrad.addColorStop(0.15, 'rgba(0, 0, 0, 0.08)');
    sideGrad.addColorStop(0.3, 'rgba(0, 0, 0, 0)');
    sideGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
    sideGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.08)');
    sideGrad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    ctx.fillStyle = sideGrad;
    ctx.fillRect(0, 0, width, height);

    const rightArmpitGrad = ctx.createRadialGradient(345, 175, 0, 345, 175, 65);
    rightArmpitGrad.addColorStop(0, 'rgba(0,0,0,0.4)');
    rightArmpitGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rightArmpitGrad;
    ctx.fillRect(0, 0, width, height);

    const leftArmpitGrad = ctx.createRadialGradient(167, 175, 0, 167, 175, 65);
    leftArmpitGrad.addColorStop(0, 'rgba(0,0,0,0.4)');
    leftArmpitGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = leftArmpitGrad;
    ctx.fillRect(0, 0, width, height);

    const neckShadowGrad = ctx.createRadialGradient(256, 75, 0, 256, 75, 120);
    neckShadowGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
    neckShadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neckShadowGrad;
    ctx.fillRect(0, 0, width, height);

    drawEmbossedFold(ctx, 170, 320, 225, 305, 260, 335, 0.22, 0.12);
    drawEmbossedFold(ctx, 340, 350, 290, 340, 250, 365, 0.22, 0.12);
    drawEmbossedFold(ctx, 170, 410, 235, 395, 280, 425, 0.18, 0.10);
    drawEmbossedFold(ctx, 340, 430, 280, 420, 225, 445, 0.18, 0.10);
    drawEmbossedFold(ctx, 175, 210, 215, 225, 245, 195, 0.20, 0.12);
    drawEmbossedFold(ctx, 337, 210, 297, 225, 267, 195, 0.20, 0.12);
    drawEmbossedFold(ctx, 147, 105, 125, 120, 95, 145, 0.18, 0.10);
    drawEmbossedFold(ctx, 365, 105, 387, 120, 417, 145, 0.18, 0.10);

    ctx.globalCompositeOperation = 'screen';
    const highlightGrad = ctx.createLinearGradient(120, 0, 320, 0);
    highlightGrad.addColorStop(0, 'rgba(255,255,255,0)');
    highlightGrad.addColorStop(0.4, 'rgba(255,255,255,0.06)');
    highlightGrad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    highlightGrad.addColorStop(0.6, 'rgba(255,255,255,0.06)');
    highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = highlightGrad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.restore();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.moveTo(365, 95);
    ctx.lineTo(345, 175);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(147, 95);
    ctx.lineTo(167, 175);
    ctx.stroke();

    function drawNeedleStitches(x1, y1, x2, y2) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
    }

    drawNeedleStitches(72, 155, 107, 195);
    drawNeedleStitches(440, 155, 405, 195);

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(172, 452);
    ctx.quadraticCurveTo(256, 467, 340, 452);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.moveTo(216, 68);
    ctx.quadraticCurveTo(256, 48, 296, 68);
    ctx.quadraticCurveTo(256, 82, 216, 68);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1.5;
    for (let x = 220; x <= 292; x += 6) {
        let dx = (x - 256) / 36;
        let yFront = 68 + 14 * (1 - dx * dx);
        ctx.beginPath();
        ctx.moveTo(x, yFront - 4);
        ctx.lineTo(x, yFront + 2);
        ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(216, 68);
    ctx.quadraticCurveTo(256, 82, 296, 68);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(216, 68);
    ctx.quadraticCurveTo(256, 82, 296, 68);
    ctx.stroke();

    const testPixel = ctx.getImageData(256, 256, 1, 1).data;
    console.log("targetCanvas center pixel:", isBack ? "back" : "front", Array.from(testPixel));
}

function drawEmbossedFold(ctx, x1, y1, cx, cy, x2, y2, shadowOpacity, highlightOpacity) {
    ctx.save();
    ctx.strokeStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.stroke();

    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = `rgba(255, 255, 255, ${highlightOpacity})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(x1 - 2, y1 - 2);
    ctx.quadraticCurveTo(cx - 2, cy - 2, x2 - 2, y2 - 2);
    ctx.stroke();
    ctx.restore();
}

function getFontString(type, fontStyle, customFont = '', numSizeVal = 140) {
    let base = 'sans-serif';
    if (customFont) {
        base = `"${customFont}", sans-serif`;
    } else {
        if (fontStyle === 'retro') {
            base = '"Graduate", sans-serif';
        } else if (fontStyle === 'impact') {
            base = '"Bebas Neue", sans-serif';
        } else if (fontStyle === 'cyber') {
            base = '"Orbitron", sans-serif';
        } else if (fontStyle === 'esports') {
            base = '"Teko", sans-serif';
        } else if (fontStyle === 'stencil') {
            base = 'Impact, Arial Black, sans-serif';
        } else if (fontStyle === 'athletic') {
            base = '"Courier New", Courier, monospace';
        } else if (fontStyle === 'tech') {
            base = '"Arial Black", Gadget, sans-serif';
        }
    }

    const isItalic = fontStyle === 'stencil' || type === 'sponsor';
    const weight = 'bold';
    const italicStr = isItalic ? 'italic ' : '';

    if (type === 'number') return `${weight} ${italicStr}${numSizeVal}px ${base}`;
    if (type === 'number_back') return `${weight} ${italicStr}${Math.round(numSizeVal * 1.15)}px ${base}`;
    if (type === 'name') return `${weight} ${italicStr}38px ${base}`;
    if (type === 'team') return `bold 32px ${base}`;
    if (type === 'sponsor') return `bold italic 36px ${base}`;
    return `bold 24px ${base}`;
}


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
    const angleRange = Math.min(Math.PI * 0.45, numChars * 0.08);
    const startRad = startAngle - angleRange / 2;
    const stepRad = angleRange / (numChars - 1 || 1);

    for (let i = 0; i < numChars; i++) {
        const charAngle = startRad + i * stepRad;
        ctx.save();
        ctx.translate(x + Math.cos(charAngle) * radius, y + Math.sin(charAngle) * radius);
        ctx.rotate(charAngle + Math.PI / 2);
        if (strokeStyle) {
            ctx.strokeText(chars[i], 0, 0);
        }
        ctx.fillText(chars[i], 0, 0);
        ctx.restore();
    }
}

function drawLogo(ctx, logoType, x, y, size, primaryColor, secondaryColor, customLogoImage) {
    ctx.save();
    ctx.translate(x, y);

    if (logoType === 'custom') {
        if (customLogoImage) {
            ctx.drawImage(customLogoImage, -size / 2, -size / 2, size, size);
        } else {
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(-size / 2, -size / 2, size, size);
        }
    }
    else if (logoType === 'shield') {
        ctx.fillStyle = primaryColor;
        ctx.strokeStyle = secondaryColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-size / 2, -size / 2);
        ctx.lineTo(size / 2, -size / 2);
        ctx.lineTo(size / 2, 0);
        ctx.quadraticCurveTo(size / 2, size / 2, 0, size * 0.65);
        ctx.quadraticCurveTo(-size / 2, size / 2, -size / 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-size / 2.5, -size / 2.5);
        ctx.lineTo(size / 2.5, -size / 2.5);
        ctx.lineTo(size / 2.5, 0);
        ctx.quadraticCurveTo(size / 2.5, size / 2.5, 0, size * 0.55);
        ctx.quadraticCurveTo(-size / 2.5, size / 2.5, -size / 2.5, 0);
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
        ctx.moveTo(-size * 0.4, -size * 0.15);
        ctx.lineTo(-size * 0.15, -size * 0.35);
        ctx.lineTo(size * 0.15, -size * 0.35);
        ctx.quadraticCurveTo(size * 0.45, -size * 0.15, size * 0.35, size * 0.1);
        ctx.lineTo(size * 0.05, 0.0);
        ctx.lineTo(size * 0.15, -size * 0.1);
        ctx.quadraticCurveTo(-size * 0.05, -size * 0.05, -size * 0.1, size * 0.3);
        ctx.lineTo(-size * 0.35, size * 0.3);
        ctx.lineTo(-size * 0.25, size * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

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

function drawPattern(ctx, pattern, baseColor, accentColor, tertiaryColor) {
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
        seed = 15;
        ctx.fillStyle = accentColor;
        for (let i = 0; i < 9; i++) {
            let cx = random() * 512;
            let cy = random() * 512;
            let r = 18 + random() * 32;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

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
            let r = Math.max(0.5, (1.0 - y / 512) * 13);
            for (let x = 15; x < 512; x += 28) {
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.fillStyle = tertiaryColor;
        for (let y = 497; y > 0; y -= 28) {
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
        for (let x = 32; x < 512; x += 64) {
            ctx.beginPath();
            ctx.moveTo(x, 0); ctx.lineTo(x, 512);
            ctx.stroke();
        }
        for (let y = 32; y < 512; y += 64) {
            ctx.beginPath();
            ctx.moveTo(0, y); ctx.lineTo(512, y);
            ctx.stroke();
        }

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
    else if (pattern.startsWith('param_')) {
        const parts = pattern.split('_');
        const style = parts[1];
        if (style === 'stripes') {
            const width = parseInt(parts[2]) || 16;
            const angle = parseInt(parts[3]) || 0;
            ctx.save();
            ctx.translate(256, 256);
            ctx.rotate(angle * Math.PI / 180);
            ctx.fillStyle = accentColor;
            for (let y = -800; y < 800; y += width * 2) {
                ctx.fillRect(-800, y, 1600, width);
            }
            ctx.fillStyle = tertiaryColor;
            for (let y = -800 + width; y < 800; y += width * 2) {
                ctx.fillRect(-800, y, 1600, Math.max(1, Math.round(width * 0.2)));
            }
            ctx.restore();
        }
        else if (style === 'grid') {
            const size = parseInt(parts[2]) || 32;
            const weight = parseInt(parts[3]) || 2;
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = weight;
            for (let x = size; x < 512; x += size) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
            }
            for (let y = size; y < 512; y += size) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
            }
            ctx.strokeStyle = tertiaryColor;
            ctx.lineWidth = Math.max(1, Math.round(weight * 0.5));
            for (let x = size / 2; x < 512; x += size) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
            }
            for (let y = size / 2; y < 512; y += size) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
            }
        }
        else if (style === 'dots') {
            const radius = parseInt(parts[2]) || 4;
            const spacing = parseInt(parts[3]) || 32;
            ctx.fillStyle = accentColor;
            for (let y = spacing / 2; y < 512; y += spacing) {
                for (let x = spacing / 2; x < 512; x += spacing) {
                    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
                }
            }
            ctx.fillStyle = tertiaryColor;
            for (let y = spacing / 2 + spacing / 2; y < 512; y += spacing) {
                for (let x = spacing / 2 + spacing / 2; x < 512; x += spacing) {
                    ctx.beginPath(); ctx.arc(x, y, Math.max(1, radius * 0.5), 0, Math.PI * 2); ctx.fill();
                }
            }
        }
        else if (style === 'chevrons') {
            const spacing = parseInt(parts[2]) || 40;
            const weight = parseInt(parts[3]) || 4;
            const dir = parts[4] || 'up';
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = weight;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            const isUp = (dir === 'up');
            const isDown = (dir === 'down');
            for (let y = -200; y < 700; y += spacing) {
                ctx.beginPath();
                if (isUp || isDown) {
                    const peak = isUp ? y : y + spacing / 2;
                    ctx.moveTo(0, y + spacing);
                    ctx.lineTo(256, peak);
                    ctx.lineTo(512, y + spacing);
                } else {
                    ctx.moveTo(0, y);
                    ctx.lineTo(256, y + spacing / 2);
                    ctx.lineTo(0, y + spacing);
                }
                ctx.stroke();
            }
        }
        else if (style === 'waves') {
            const freq = parseInt(parts[2]) || 20;
            const amp = parseInt(parts[3]) || 20;
            const dir = parts[4] || 'h';
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 4;
            const isVert = (dir === 'v');
            for (let i = -50; i < 600; i += 40) {
                ctx.beginPath();
                for (let t = 0; t <= 512; t += 10) {
                    let waveVal = i + Math.sin(t * (freq / 1000)) * amp;
                    if (t === 0) {
                        if (isVert) ctx.moveTo(waveVal, t);
                        else ctx.moveTo(t, waveVal);
                    } else {
                        if (isVert) ctx.lineTo(waveVal, t);
                        else ctx.lineTo(t, waveVal);
                    }
                }
                ctx.stroke();
            }
        }
        else if (style === 'diamonds') {
            const size = parseInt(parts[2]) || 32;
            const weight = parseInt(parts[3]) || 2;
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = weight;
            ctx.save();
            ctx.translate(256, 256);
            ctx.rotate(Math.PI / 4);
            for (let x = -800; x < 800; x += size) {
                ctx.beginPath(); ctx.moveTo(x, -800); ctx.lineTo(x, 800); ctx.stroke();
            }
            for (let y = -800; y < 800; y += size) {
                ctx.beginPath(); ctx.moveTo(-800, y); ctx.lineTo(800, y); ctx.stroke();
            }
            ctx.restore();
        }
        else if (style === 'hex') {
            const size = parseInt(parts[2]) || 32;
            const weight = parseInt(parts[3]) || 2;
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = weight;
            const h = size * Math.sqrt(3);
            for (let row = -2; row * size * 1.5 < 600; row++) {
                let y = row * size * 1.5;
                let offset = (row % 2 === 0) ? 0 : h / 2;
                for (let col = -2; col * h < 600; col++) {
                    let x = col * h + offset;
                    ctx.beginPath();
                    for (let a = 0; a < 6; a++) {
                        let angle = a * Math.PI / 3;
                        let hx = x + Math.cos(angle) * size;
                        let hy = y + Math.sin(angle) * size;
                        if (a === 0) ctx.moveTo(hx, hy);
                        else ctx.lineTo(hx, hy);
                    }
                    ctx.closePath();
                    ctx.stroke();
                }
            }
        }
        else if (style === 'stars') {
            const count = parseInt(parts[2]) || 25;
            const size = parseInt(parts[3]) || 24;
            ctx.fillStyle = accentColor;
            seed = 99;
            for (let i = 0; i < count; i++) {
                let sx = random() * 512;
                let sy = random() * 512;
                ctx.beginPath();
                for (let j = 0; j < 5; j++) {
                    let angle = (j * 4 * Math.PI) / 5 - Math.PI / 2;
                    let px = sx + Math.cos(angle) * (size / 2);
                    let py = sy + Math.sin(angle) * (size / 2);
                    if (j === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                    let angle2 = angle + Math.PI / 5;
                    let px2 = sx + Math.cos(angle2) * (size / 4);
                    let py2 = sy + Math.sin(angle2) * (size / 4);
                    ctx.lineTo(px2, py2);
                }
                ctx.closePath();
                ctx.fill();
            }
        }
        else if (style === 'rings') {
            const count = parseInt(parts[2]) || 25;
            const size = parseInt(parts[3]) || 24;
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 3;
            seed = 150;
            for (let i = 0; i < count; i++) {
                let rx = random() * 512;
                let ry = random() * 512;
                ctx.beginPath();
                ctx.arc(rx, ry, size / 2, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }
}