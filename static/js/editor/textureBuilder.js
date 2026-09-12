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
    }
    if (THREE.SRGBColorSpace) {
        cachedFrontTexture.colorSpace = THREE.SRGBColorSpace;
    }
    cachedFrontTexture.needsUpdate = true;
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
    }
    if (THREE.SRGBColorSpace) {
        cachedBackTexture.colorSpace = THREE.SRGBColorSpace;
    }
    cachedBackTexture.needsUpdate = true;
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

export function pathJersey(ctx, isBack = false) {
    ctx.beginPath();
    if (isBack) {
        // Back neckline is higher
        ctx.moveTo(256, 52);
        ctx.quadraticCurveTo(205, 52, 172, 44);
    } else {
        // Front neckline has athletic scoop
        ctx.moveTo(256, 82);
        ctx.quadraticCurveTo(208, 80, 172, 44);
    }
    // Left shoulder strap
    ctx.lineTo(122, 60);
    // Left armhole athletic scoop to armpit
    ctx.bezierCurveTo(145, 115, 120, 160, 66, 185);
    // Left side seam running down to hem (captures side panel 66..110)
    ctx.lineTo(76, 468);
    // Bottom hem gently curved
    ctx.quadraticCurveTo(256, 482, 436, 468);
    // Right side seam running up to armpit (captures side panel 402..446)
    ctx.lineTo(446, 185);
    // Right armhole athletic scoop to shoulder
    ctx.bezierCurveTo(392, 160, 367, 115, 390, 60);
    // Right shoulder strap
    ctx.lineTo(340, 44);
    // Return to neck center
    if (isBack) {
        ctx.quadraticCurveTo(307, 52, 256, 52);
    } else {
        ctx.quadraticCurveTo(304, 80, 256, 82);
    }
    ctx.closePath();
}

export function pathTshirt(ctx, isBack = false) {
    ctx.beginPath();
    if (isBack) {
        // Back neckline is higher
        ctx.moveTo(256, 38);
        ctx.quadraticCurveTo(210, 38, 185, 34);
    } else {
        // Front round crewneck
        ctx.moveTo(256, 75);
        ctx.quadraticCurveTo(210, 72, 185, 34);
    }
    // Left shoulder slope out to sleeve crown
    ctx.lineTo(112, 30);
    // Outer sleeve top down to cuff edge
    ctx.lineTo(15, 90);
    // Left sleeve cuff
    ctx.lineTo(31, 185);
    // Left underarm seam in to armpit hollow
    ctx.bezierCurveTo(70, 195, 100, 205, 123, 210);
    // Left torso side down to bottom hem
    ctx.bezierCurveTo(128, 280, 136, 380, 145, 486);
    // Bottom hem curve
    ctx.quadraticCurveTo(256, 494, 367, 486);
    // Right torso side up to armpit hollow
    ctx.bezierCurveTo(376, 380, 384, 280, 389, 210);
    // Right underarm seam out to cuff
    ctx.bezierCurveTo(412, 205, 442, 195, 481, 185);
    // Right sleeve cuff
    ctx.lineTo(497, 90);
    // Outer sleeve top up to shoulder crown
    ctx.lineTo(400, 30);
    // Right shoulder slope to collar
    ctx.lineTo(327, 34);
    // Collar return to center
    if (isBack) {
        ctx.quadraticCurveTo(302, 38, 256, 38);
    } else {
        ctx.quadraticCurveTo(302, 72, 256, 75);
    }
    ctx.closePath();
}

export function renderJersey2D(targetCanvas, options, isBack = false) {
    if (!targetCanvas) {
        console.error("targetCanvas is null in renderJersey2D");
        return;
    }
    const ctx = targetCanvas.getContext('2d');
    const width = targetCanvas.width;
    const height = targetCanvas.height;

    ctx.clearRect(0, 0, width, height);

    const isTshirt = options.jerseyType === 'tshirt';

    const designCanvas = document.createElement('canvas');
    designCanvas.width = 512;
    designCanvas.height = 512;
    const designCtx = designCanvas.getContext('2d');

    drawRawDesign(designCtx, options, isBack);

    ctx.save();
    const scaleFactor = width / 512;
    const offsetX = (width - 512 * scaleFactor) / 2;
    const offsetY = (height - 512 * scaleFactor) / 2;
    ctx.translate(offsetX, offsetY);
    ctx.scale(scaleFactor, scaleFactor);

    if (isTshirt) {
        pathTshirt(ctx, isBack);
    } else {
        pathJersey(ctx, isBack);
    }
    ctx.clip();

    ctx.drawImage(designCanvas, 0, 0, 512, 512);

    ctx.globalCompositeOperation = 'multiply';

    // Soft lateral cylindrical lighting across torso
    const sideGrad = ctx.createLinearGradient(0, 0, 512, 0);
    sideGrad.addColorStop(0, 'rgba(0, 0, 0, 0.30)');
    sideGrad.addColorStop(0.18, 'rgba(0, 0, 0, 0.05)');
    sideGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0)');
    sideGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0)');
    sideGrad.addColorStop(0.82, 'rgba(0, 0, 0, 0.05)');
    sideGrad.addColorStop(1, 'rgba(0, 0, 0, 0.30)');
    ctx.fillStyle = sideGrad;
    ctx.fillRect(0, 0, 512, 512);

    if (isTshirt) {
        // Armpit hollow shadows for T-shirt (X: 123 and 389, Y: 210)
        const rightArmpitGrad = ctx.createRadialGradient(389, 210, 0, 389, 210, 65);
        rightArmpitGrad.addColorStop(0, 'rgba(0,0,0,0.38)');
        rightArmpitGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rightArmpitGrad;
        ctx.fillRect(0, 0, 512, 512);

        const leftArmpitGrad = ctx.createRadialGradient(123, 210, 0, 123, 210, 65);
        leftArmpitGrad.addColorStop(0, 'rgba(0,0,0,0.38)');
        leftArmpitGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = leftArmpitGrad;
        ctx.fillRect(0, 0, 512, 512);

        // Collar / chest depth gradient
        const neckY = isBack ? 38 : 75;
        const neckShadowGrad = ctx.createRadialGradient(256, neckY, 0, 256, neckY, 110);
        neckShadowGrad.addColorStop(0, 'rgba(0,0,0,0.25)');
        neckShadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = neckShadowGrad;
        ctx.fillRect(0, 0, 512, 512);

        // Realistic fabric folds across sleeves and torso
        drawEmbossedFold(ctx, 35, 140, 75, 120, 115, 145, 0.22, 0.10);
        drawEmbossedFold(ctx, 477, 140, 437, 120, 397, 145, 0.22, 0.10);
        drawEmbossedFold(ctx, 140, 320, 200, 305, 260, 335, 0.18, 0.08);
        drawEmbossedFold(ctx, 372, 350, 310, 340, 250, 365, 0.18, 0.08);
        drawEmbossedFold(ctx, 142, 410, 205, 395, 275, 425, 0.16, 0.07);
        drawEmbossedFold(ctx, 370, 430, 305, 420, 235, 445, 0.16, 0.07);
    } else {
        // Armpit hollow shadows for sleeveless (66 and 446)
        const rightArmpitGrad = ctx.createRadialGradient(446, 185, 0, 446, 185, 75);
        rightArmpitGrad.addColorStop(0, 'rgba(0,0,0,0.38)');
        rightArmpitGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rightArmpitGrad;
        ctx.fillRect(0, 0, 512, 512);

        const leftArmpitGrad = ctx.createRadialGradient(66, 185, 0, 66, 185, 75);
        leftArmpitGrad.addColorStop(0, 'rgba(0,0,0,0.38)');
        leftArmpitGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = leftArmpitGrad;
        ctx.fillRect(0, 0, 512, 512);

        // Collar / chest depth gradient
        const neckY = isBack ? 52 : 82;
        const neckShadowGrad = ctx.createRadialGradient(256, neckY, 0, 256, neckY, 120);
        neckShadowGrad.addColorStop(0, 'rgba(0,0,0,0.25)');
        neckShadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = neckShadowGrad;
        ctx.fillRect(0, 0, 512, 512);

        // Folds for sleeveless
        drawEmbossedFold(ctx, 80, 320, 180, 305, 260, 335, 0.20, 0.10);
        drawEmbossedFold(ctx, 432, 350, 330, 340, 250, 365, 0.20, 0.10);
        drawEmbossedFold(ctx, 80, 410, 190, 395, 280, 425, 0.18, 0.08);
        drawEmbossedFold(ctx, 432, 430, 320, 420, 225, 445, 0.18, 0.08);
        drawEmbossedFold(ctx, 90, 210, 180, 225, 245, 195, 0.18, 0.10);
        drawEmbossedFold(ctx, 422, 210, 332, 225, 267, 195, 0.18, 0.10);
    }

    ctx.globalCompositeOperation = 'screen';
    const highlightGrad = ctx.createLinearGradient(120, 0, 392, 0);
    highlightGrad.addColorStop(0, 'rgba(255,255,255,0)');
    highlightGrad.addColorStop(0.35, 'rgba(255,255,255,0.06)');
    highlightGrad.addColorStop(0.5, 'rgba(255,255,255,0.09)');
    highlightGrad.addColorStop(0.65, 'rgba(255,255,255,0.06)');
    highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = highlightGrad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.restore();

    // Seams and stitches
    ctx.save();
    const scaleFactor2 = width / 512;
    ctx.scale(scaleFactor2, scaleFactor2);

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

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1.6;

    if (isTshirt) {
        // Left torso side seam
        ctx.beginPath();
        ctx.moveTo(123, 210);
        ctx.lineTo(145, 486);
        ctx.stroke();

        // Right torso side seam
        ctx.beginPath();
        ctx.moveTo(389, 210);
        ctx.lineTo(367, 486);
        ctx.stroke();

        // Underarm seams
        ctx.beginPath();
        ctx.moveTo(31, 185);
        ctx.quadraticCurveTo(80, 200, 123, 210);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(481, 185);
        ctx.quadraticCurveTo(432, 200, 389, 210);
        ctx.stroke();

        // Sleeve cuff stitches
        drawNeedleStitches(19, 95, 33, 180);
        drawNeedleStitches(493, 95, 479, 180);

        // Shoulder stitches
        drawNeedleStitches(112, 30, 185, 34);
        drawNeedleStitches(400, 30, 327, 34);

        // Bottom hem stitches
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(147, 474);
        ctx.quadraticCurveTo(256, 482, 365, 474);
        ctx.stroke();
        ctx.restore();

        // Crewneck collar ribbing & interior
        if (!isBack) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.beginPath();
            ctx.moveTo(185, 34);
            ctx.quadraticCurveTo(256, 54, 327, 34);
            ctx.quadraticCurveTo(256, 26, 185, 34);
            ctx.closePath();
            ctx.fill();

            // Ribbing vertical hash lines
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.lineWidth = 1.5;
            for (let x = 192; x <= 320; x += 6) {
                let dx = (x - 256) / 70;
                let yFront = 75 - 38 * (1 - dx * dx);
                ctx.beginPath();
                ctx.moveTo(x, yFront - 4);
                ctx.lineTo(x, yFront + 2);
                ctx.stroke();
            }
            ctx.restore();

            // Crewneck rim
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 4.0;
            ctx.beginPath();
            ctx.moveTo(185, 34);
            ctx.quadraticCurveTo(210, 72, 256, 75);
            ctx.quadraticCurveTo(302, 72, 327, 34);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(185, 34);
            ctx.quadraticCurveTo(210, 72, 256, 75);
            ctx.quadraticCurveTo(302, 72, 327, 34);
            ctx.stroke();
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 4.0;
            ctx.beginPath();
            ctx.moveTo(185, 34);
            ctx.quadraticCurveTo(210, 38, 256, 38);
            ctx.quadraticCurveTo(302, 38, 327, 34);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(185, 34);
            ctx.quadraticCurveTo(210, 38, 256, 38);
            ctx.quadraticCurveTo(302, 38, 327, 34);
            ctx.stroke();
        }
    } else {
        // Sleeveless side seams
        ctx.beginPath();
        ctx.moveTo(66, 185);
        ctx.lineTo(76, 468);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(446, 185);
        ctx.lineTo(436, 468);
        ctx.stroke();

        drawNeedleStitches(122, 60, 172, 44);
        drawNeedleStitches(390, 60, 340, 44);
        drawNeedleStitches(120, 72, 70, 185);
        drawNeedleStitches(392, 72, 442, 185);

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(78, 456);
        ctx.quadraticCurveTo(256, 470, 434, 456);
        ctx.stroke();
        ctx.restore();

        if (!isBack) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.beginPath();
            ctx.moveTo(172, 44);
            ctx.quadraticCurveTo(256, 68, 340, 44);
            ctx.quadraticCurveTo(256, 32, 172, 44);
            ctx.closePath();
            ctx.fill();

            ctx.save();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.lineWidth = 1.5;
            for (let x = 180; x <= 332; x += 6) {
                let dx = (x - 256) / 76;
                let yFront = 82 - 38 * (1 - dx * dx);
                ctx.beginPath();
                ctx.moveTo(x, yFront - 4);
                ctx.lineTo(x, yFront + 2);
                ctx.stroke();
            }
            ctx.restore();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(172, 44);
            ctx.quadraticCurveTo(208, 80, 256, 82);
            ctx.quadraticCurveTo(304, 80, 340, 44);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(172, 44);
            ctx.quadraticCurveTo(208, 80, 256, 82);
            ctx.quadraticCurveTo(304, 80, 340, 44);
            ctx.stroke();
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(172, 44);
            ctx.quadraticCurveTo(205, 52, 256, 52);
            ctx.quadraticCurveTo(307, 52, 340, 44);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(172, 44);
            ctx.quadraticCurveTo(205, 52, 256, 52);
            ctx.quadraticCurveTo(307, 52, 340, 44);
            ctx.stroke();
        }
    }

    ctx.restore();
}

export function pathJerseySide(ctx, isRight = false) {
    ctx.beginPath();
    // Shoulder strap top
    ctx.moveTo(236, 52);
    ctx.lineTo(276, 52);
    // Back outer contour curving down along scapula to back hem
    ctx.bezierCurveTo(312, 110, 342, 220, 338, 320);
    ctx.bezierCurveTo(334, 380, 328, 440, 324, 468);
    // Bottom hem with athletic side vent notch
    ctx.lineTo(262, 468);
    ctx.lineTo(256, 456); // side vent notch peak
    ctx.lineTo(250, 468);
    ctx.lineTo(188, 468);
    // Front outer contour curving up across abdomen and chest
    ctx.bezierCurveTo(184, 440, 178, 380, 174, 320);
    ctx.bezierCurveTo(170, 220, 202, 110, 236, 52);
    ctx.closePath();
}

export function pathTshirtSide(ctx, isRight = false) {
    ctx.beginPath();
    // Shoulder top
    ctx.moveTo(226, 36);
    ctx.lineTo(286, 36);
    // Back outer contour curving down along back to hem
    ctx.bezierCurveTo(318, 100, 346, 220, 340, 330);
    ctx.bezierCurveTo(335, 390, 328, 445, 324, 486);
    // Bottom hem
    ctx.quadraticCurveTo(256, 492, 188, 486);
    // Front outer contour curving up across abdomen and chest
    ctx.bezierCurveTo(184, 445, 175, 390, 172, 330);
    ctx.bezierCurveTo(168, 220, 198, 100, 226, 36);
    ctx.closePath();
}

function drawSidePattern(ctx, pattern, baseColor, accentColor, tertiaryColor) {
    if (pattern === 'panel') {
        // Side panel centered directly down the side seam (X = 256)
        ctx.fillStyle = accentColor;
        ctx.fillRect(201, 0, 110, 512);

        // Tertiary accent border stripes flanking the side panel
        ctx.fillStyle = tertiaryColor;
        ctx.fillRect(189, 0, 12, 512);
        ctx.fillRect(311, 0, 12, 512);
    }
    else if (pattern === 'stripes') {
        ctx.fillStyle = accentColor;
        for (let i = 0; i < 512; i += 40) {
            ctx.fillRect(i, 0, 16, 512);
        }
        ctx.fillStyle = tertiaryColor;
        for (let i = 16; i < 512; i += 40) {
            ctx.fillRect(i, 0, 4, 512);
        }
    }
    else if (pattern === 'diagonal') {
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 18;
        for (let i = -512; i < 1024; i += 75) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + 512, 512);
            ctx.stroke();
        }
        ctx.strokeStyle = tertiaryColor;
        ctx.lineWidth = 6;
        for (let i = -512; i < 1024; i += 75) {
            ctx.beginPath();
            ctx.moveTo(i + 22, 0);
            ctx.lineTo(i + 22 + 512, 512);
            ctx.stroke();
        }
    }
    else if (pattern === 'gradient') {
        const grad = ctx.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0, baseColor);
        grad.addColorStop(0.5, accentColor);
        grad.addColorStop(1, tertiaryColor);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);
    }
    else if (pattern === 'apex_gamer') {
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.moveTo(210, 0); ctx.lineTo(302, 0); ctx.lineTo(282, 512); ctx.lineTo(230, 512);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = tertiaryColor;
        ctx.beginPath();
        ctx.moveTo(198, 0); ctx.lineTo(210, 0); ctx.lineTo(230, 512); ctx.lineTo(218, 512);
        ctx.closePath(); ctx.fill();

        ctx.beginPath();
        ctx.moveTo(302, 0); ctx.lineTo(314, 0); ctx.lineTo(294, 512); ctx.lineTo(282, 512);
        ctx.closePath(); ctx.fill();
    }
    else if (pattern === 'carbon_scratch') {
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3.5;
        for (let i = 0; i < 40; i++) {
            let x = 180 + (Math.sin(i * 9) * 0.5 + 0.5) * 150;
            let y = (i * 14) % 500;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 20, y + 10);
            ctx.stroke();
        }
    }
    else {
        // Draw standard pattern across the side
        drawPattern(ctx, pattern, baseColor, accentColor, tertiaryColor);
    }
}

export function renderJersey2DSide(targetCanvas, options = {}, isRight = false) {
    if (!targetCanvas) {
        console.error("targetCanvas is null in renderJersey2DSide");
        return;
    }
    const ctx = targetCanvas.getContext('2d');
    const width = targetCanvas.width;
    const height = targetCanvas.height;

    const {
        baseColor = '#4F46E5',
        accentColor = '#7C3AED',
        tertiaryColor = '#ffffff',
        pattern = 'none',
        jerseyType = 'sleeveless'
    } = options;

    const isTshirt = jerseyType === 'tshirt';

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    const scaleFactor = width / 512;
    ctx.scale(scaleFactor, scaleFactor);

    if (!isTshirt) {
        // 1. Armhole Hollow Interior (visible through sleeveless armhole opening)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(236, 52);
        ctx.bezierCurveTo(240, 115, 245, 160, 256, 178);
        ctx.bezierCurveTo(267, 160, 272, 115, 276, 52);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fill();

        // Dark ribbing texture inside armhole
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1.5;
        for (let y = 65; y < 170; y += 8) {
            ctx.beginPath();
            ctx.moveTo(246, y);
            ctx.lineTo(266, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    // 2. Torso Silhouette Clip
    ctx.save();
    if (isTshirt) {
        pathTshirtSide(ctx, isRight);
    } else {
        pathJerseySide(ctx, isRight);
    }
    ctx.clip();

    // Base color
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // Side Pattern (side panels, lateral stripes, etc.)
    drawSidePattern(ctx, pattern, baseColor, accentColor, tertiaryColor);

    // Multiply lighting: Cylindrical flank shading
    ctx.globalCompositeOperation = 'multiply';
    const sideGrad = ctx.createLinearGradient(170, 0, 340, 0);
    sideGrad.addColorStop(0, 'rgba(0, 0, 0, 0.40)');
    sideGrad.addColorStop(0.25, 'rgba(0, 0, 0, 0.05)');
    sideGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    sideGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.05)');
    sideGrad.addColorStop(1, 'rgba(0, 0, 0, 0.40)');
    ctx.fillStyle = sideGrad;
    ctx.fillRect(0, 0, 512, 512);

    if (isTshirt) {
        // Lateral folds across T-shirt sleeve and waist
        drawEmbossedFold(ctx, 210, 150, 256, 165, 300, 155, 0.22, 0.10);
        drawEmbossedFold(ctx, 185, 280, 256, 290, 328, 282, 0.18, 0.08);
        drawEmbossedFold(ctx, 188, 360, 256, 370, 326, 362, 0.16, 0.07);
        drawEmbossedFold(ctx, 190, 430, 256, 440, 324, 432, 0.14, 0.06);
    } else {
        // Armpit hollow shadow
        const armpitGrad = ctx.createRadialGradient(256, 178, 0, 256, 178, 65);
        armpitGrad.addColorStop(0, 'rgba(0,0,0,0.45)');
        armpitGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = armpitGrad;
        ctx.fillRect(0, 0, 512, 512);

        // Lateral rib folds
        drawEmbossedFold(ctx, 185, 250, 256, 260, 325, 252, 0.18, 0.08);
        drawEmbossedFold(ctx, 188, 330, 256, 340, 328, 332, 0.18, 0.08);
        drawEmbossedFold(ctx, 190, 410, 256, 420, 324, 412, 0.16, 0.07);
    }

    // Screen highlight down the center lateral ridge
    ctx.globalCompositeOperation = 'screen';
    const highlightGrad = ctx.createLinearGradient(210, 0, 302, 0);
    highlightGrad.addColorStop(0, 'rgba(255,255,255,0)');
    highlightGrad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = highlightGrad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.restore(); // end clip

    // 3. Side Seam & Tailoring Stitching Overlays
    if (isTshirt) {
        // Sleeve bottom cuff rim
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(196, 192);
        ctx.quadraticCurveTo(256, 202, 316, 192);
        ctx.stroke();

        // Sleeve cuff double stitching
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(198, 184);
        ctx.quadraticCurveTo(256, 194, 314, 184);
        ctx.stroke();
        ctx.restore();

        // Central vertical side seam below sleeve
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(256, 202);
        ctx.lineTo(256, 474);
        ctx.stroke();

        // Double needle topstitching flanking the side seam
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(252, 202);
        ctx.lineTo(252, 474);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(260, 202);
        ctx.lineTo(260, 474);
        ctx.stroke();
        ctx.restore();

        // Bottom hem double stitching
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(190, 472);
        ctx.quadraticCurveTo(256, 478, 322, 472);
        ctx.stroke();
        ctx.restore();
    } else {
        // Central vertical side seam
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(256, 178);
        ctx.lineTo(256, 456);
        ctx.stroke();

        // Double needle topstitching flanking the side seam
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(252, 180);
        ctx.lineTo(252, 458);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(260, 180);
        ctx.lineTo(260, 458);
        ctx.stroke();
        ctx.restore();

        // Armhole outer trim rim
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.moveTo(236, 52);
        ctx.bezierCurveTo(240, 115, 245, 160, 256, 178);
        ctx.bezierCurveTo(267, 160, 272, 115, 276, 52);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(236, 52);
        ctx.bezierCurveTo(240, 115, 245, 160, 256, 178);
        ctx.bezierCurveTo(267, 160, 272, 115, 276, 52);
        ctx.stroke();

        // Bottom hem double stitching
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(190, 456);
        ctx.lineTo(250, 456);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(262, 456);
        ctx.lineTo(324, 456);
        ctx.stroke();
        ctx.restore();

        // Side vent reinforcement triangle
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.moveTo(256, 456);
        ctx.lineTo(250, 468);
        ctx.lineTo(262, 468);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
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