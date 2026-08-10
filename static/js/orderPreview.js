/**
 * Order Preview & Design Specification Renderer
 * Renders 2D Front & Back visual jersey canvases and human-readable product notes.
 */

window.OrderPreview = (function () {

    function parseOrderNotes(notesString = '', order = {}) {
        const defaults = {
            size: 'M',
            finish: 'matte',
            logo: 'none',
            font: 'athletic',
            customFont: 'None',
            frontNumberSize: 140,
            backNumberSize: 140,
            outlineWeight: 8,
            tertiaryColor: '#ffffff',
            baseColor: order.base_color || '#4F46E5',
            accentColor: order.accent_color || '#7C3AED',
            pattern: (order.pattern || 'none').toLowerCase(),
            number: order.player_number || '23',
            sponsorText: 'None',
            showSponsor: false,
            frontText: order.team_name || 'TEAM',
            showFrontText: true,
            backName: 'PLAYER',
            showBackText: true,
            showFrontNumber: true,
            showBackNumber: true,
            logoX: 256, logoY: 150,
            sponsorX: 256, sponsorY: 220,
            numberX: 256, numberY: 340,
            teamX: 256, teamY: 90,
            backNameX: 256, backNameY: 380,
            backNumberX: 256, backNumberY: 290,
            userNotes: '',
            rawNotes: notesString || ''
        };

        if (!notesString) return defaults;

        const result = { ...defaults };

        const coordMatch = notesString.match(/Coordinates:\s*\[([^\]]+)\]/i);
        if (coordMatch) {
            const coordStr = coordMatch[1];
            const fLogo = coordStr.match(/F-Logo:\s*(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
            if (fLogo) { result.logoX = parseFloat(fLogo[1]); result.logoY = parseFloat(fLogo[2]); }
            const fSponsor = coordStr.match(/F-Sponsor:\s*(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
            if (fSponsor) { result.sponsorX = parseFloat(fSponsor[1]); result.sponsorY = parseFloat(fSponsor[2]); }
            const fNum = coordStr.match(/F-Num:\s*(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
            if (fNum) { result.numberX = parseFloat(fNum[1]); result.numberY = parseFloat(fNum[2]); }
            const fTeam = coordStr.match(/F-Team:\s*(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
            if (fTeam) { result.teamX = parseFloat(fTeam[1]); result.teamY = parseFloat(fTeam[2]); }
            const bName = coordStr.match(/B-Name:\s*(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
            if (bName) { result.backNameX = parseFloat(bName[1]); result.backNameY = parseFloat(bName[2]); }
            const bNum = coordStr.match(/B-Num:\s*(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
            if (bNum) { result.backNumberX = parseFloat(bNum[1]); result.backNumberY = parseFloat(bNum[2]); }
        }

        const cleanNotes = notesString.replace(/Coordinates:\s*\[[^\]]+\]/gi, '');

        const getVal = (key) => {
            const m = cleanNotes.match(new RegExp(`(?:^|\\||\\s)${key}:\\s*([^|]+)`, 'i'));
            return m ? m[1].trim() : null;
        };

        const size = getVal('Size'); if (size) result.size = size;
        const finish = getVal('Finish'); if (finish) result.finish = finish;
        const logo = getVal('Logo'); if (logo) result.logo = logo.toLowerCase();
        const font = getVal('Font'); if (font) result.font = font.toLowerCase();
        const customFont = getVal('CustomFont'); if (customFont) result.customFont = customFont;
        const tertiary = getVal('Tertiary'); if (tertiary) result.tertiaryColor = tertiary;
        const outline = getVal('Outline'); if (outline) result.outlineWeight = parseInt(outline) || 8;

        const numSize = getVal('NumSize');
        if (numSize) {
            const nsMatch = numSize.match(/F-(\d+)\/B-(\d+)/i);
            if (nsMatch) {
                result.frontNumberSize = parseInt(nsMatch[1]);
                result.backNumberSize = parseInt(nsMatch[2]);
            }
        }

        const parseElementWithShow = (key) => {
            const m = cleanNotes.match(new RegExp(`(?:^|\\||\\s)${key}:\\s*([^(|]+)(?:\\(Show:\\s*(true|false)\\))?`, 'i'));
            if (m) {
                return {
                    val: m[1].trim(),
                    show: m[2] !== undefined ? m[2].toLowerCase() === 'true' : true
                };
            }
            return null;
        };

        const sponsorData = parseElementWithShow('Sponsor');
        if (sponsorData) {
            result.sponsorText = sponsorData.val === 'None' ? '' : sponsorData.val;
            result.showSponsor = sponsorData.show && result.sponsorText !== '' && result.sponsorText !== 'None';
        }

        const frontTextData = parseElementWithShow('FrontText');
        if (frontTextData) {
            result.frontText = frontTextData.val === 'None' ? '' : frontTextData.val;
            result.showFrontText = frontTextData.show;
        }

        const backNameData = parseElementWithShow('BackName');
        if (backNameData) {
            result.backName = backNameData.val === 'None' ? '' : backNameData.val;
            result.showBackText = backNameData.show;
        }

        const fNumMatch = cleanNotes.match(/FrontNum:\s*(?:\(Show:\s*(true|false)\))/i);
        if (fNumMatch) result.showFrontNumber = fNumMatch[1].toLowerCase() === 'true';

        const bNumMatch = cleanNotes.match(/BackNum:\s*(?:\(Show:\s*(true|false)\))/i);
        if (bNumMatch) result.showBackNumber = bNumMatch[1].toLowerCase() === 'true';

        const userNotesMatch = cleanNotes.match(/Notes:\s*(.*)$/i);
        if (userNotesMatch) result.userNotes = userNotesMatch[1].trim();

        return result;
    }

    function pathJersey(ctx) {
        ctx.beginPath();
        ctx.moveTo(256, 60);
        ctx.quadraticCurveTo(278, 60, 296, 48);
        ctx.lineTo(365, 72);
        ctx.lineTo(452, 136);
        ctx.lineTo(416, 178);
        ctx.lineTo(350, 160);
        ctx.lineTo(344, 465);
        ctx.quadraticCurveTo(256, 478, 168, 465);
        ctx.lineTo(162, 160);
        ctx.lineTo(96, 178);
        ctx.lineTo(60, 136);
        ctx.lineTo(147, 72);
        ctx.lineTo(216, 48);
        ctx.quadraticCurveTo(234, 60, 256, 60);
        ctx.closePath();
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
        const fs = (fontStyle || '').toLowerCase();
        if (customFont && customFont !== 'None') {
            base = `"${customFont}", sans-serif`;
        } else {
            if (fs === 'retro') base = '"Graduate", sans-serif';
            else if (fs === 'impact') base = '"Bebas Neue", sans-serif';
            else if (fs === 'cyber') base = '"Orbitron", sans-serif';
            else if (fs === 'esports') base = '"Teko", sans-serif';
            else if (fs === 'stencil') base = 'Impact, Arial Black, sans-serif';
            else if (fs === 'athletic') base = '"Courier New", Courier, monospace';
            else if (fs === 'tech') base = '"Arial Black", Gadget, sans-serif';
        }

        const isItalic = fs === 'stencil' || type === 'sponsor';
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
            if (strokeStyle) ctx.strokeText(chars[i], 0, 0);
            ctx.fillText(chars[i], 0, 0);
            ctx.restore();
        }
    }

    function drawLogo(ctx, logoType, x, y, size, primaryColor, secondaryColor) {
        ctx.save();
        ctx.translate(x, y);

        const type = (logoType || '').toLowerCase();

        if (type === 'shield') {
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
        } else if (type === 'star') {
            ctx.fillStyle = primaryColor;
            ctx.strokeStyle = secondaryColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            let rot = Math.PI / 2 * 3;
            let spikes = 5, outerRadius = size / 2, innerRadius = size / 4;
            let step = Math.PI / spikes;
            for (let i = 0; i < spikes; i++) {
                ctx.lineTo(Math.cos(rot) * outerRadius, Math.sin(rot) * outerRadius);
                rot += step;
                ctx.lineTo(Math.cos(rot) * innerRadius, Math.sin(rot) * innerRadius);
                rot += step;
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (type === 'flame') {
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
        } else if (type === 'eagle') {
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
        } else if (type === 'vortex') {
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

        const pat = (pattern || 'none').toLowerCase();

        if (pat === 'stripes') {
            ctx.fillStyle = accentColor;
            for (let i = 0; i < 512; i += 64) ctx.fillRect(i, 0, 24, 512);
            ctx.fillStyle = tertiaryColor;
            for (let i = 24; i < 512; i += 64) ctx.fillRect(i, 0, 6, 512);
        } else if (pat === 'diagonal') {
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 20;
            for (let i = -512; i < 1024; i += 80) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 512, 512); ctx.stroke();
            }
            ctx.strokeStyle = tertiaryColor;
            ctx.lineWidth = 6;
            for (let i = -512; i < 1024; i += 80) {
                ctx.beginPath(); ctx.moveTo(i + 25, 0); ctx.lineTo(i + 25 + 512, 512); ctx.stroke();
            }
        } else if (pat === 'panel') {
            ctx.fillStyle = accentColor;
            ctx.fillRect(0, 0, 110, 512);
            ctx.fillRect(402, 0, 110, 512);
            ctx.fillStyle = tertiaryColor;
            ctx.fillRect(110, 0, 12, 512);
            ctx.fillRect(390, 0, 12, 512);
        } else if (pat === 'gradient') {
            const grad = ctx.createLinearGradient(0, 0, 0, 512);
            grad.addColorStop(0, baseColor);
            grad.addColorStop(0.5, accentColor);
            grad.addColorStop(1, tertiaryColor);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 512, 512);
        } else if (pat === 'thunderstorm') {
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.moveTo(0, 120); ctx.lineTo(160, 60); ctx.lineTo(130, 190); ctx.lineTo(260, 110);
            ctx.lineTo(210, 270); ctx.lineTo(360, 160); ctx.lineTo(290, 420); ctx.lineTo(512, 320);
            ctx.lineTo(512, 512); ctx.lineTo(0, 512);
            ctx.closePath(); ctx.fill();

            ctx.fillStyle = tertiaryColor;
            ctx.beginPath();
            ctx.moveTo(0, 220); ctx.lineTo(140, 170); ctx.lineTo(110, 280); ctx.lineTo(230, 220);
            ctx.lineTo(190, 350); ctx.lineTo(330, 270); ctx.lineTo(270, 450); ctx.lineTo(512, 400);
            ctx.lineTo(512, 512); ctx.lineTo(0, 512);
            ctx.closePath(); ctx.fill();
        } else if (pat === 'paint_splatter') {
            seed = 15;
            ctx.fillStyle = accentColor;
            for (let i = 0; i < 9; i++) {
                let cx = random() * 512;
                let cy = random() * 512;
                let r = 18 + random() * 32;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

                ctx.fillStyle = tertiaryColor;
                for (let j = 0; j < 5; j++) {
                    let dcx = cx + (random() - 0.5) * r * 2.8;
                    let dcy = cy + (random() - 0.5) * r * 2.8;
                    let dr = 2 + random() * 6;
                    ctx.beginPath(); ctx.arc(dcx, dcy, dr, 0, Math.PI * 2); ctx.fill();
                }
                ctx.fillStyle = accentColor;
            }
        } else if (pat === 'apex_gamer') {
            ctx.fillStyle = accentColor;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(130, 0); ctx.lineTo(50, 512); ctx.lineTo(0, 512); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(512, 0); ctx.lineTo(382, 0); ctx.lineTo(462, 512); ctx.lineTo(512, 512); ctx.closePath(); ctx.fill();

            ctx.fillStyle = tertiaryColor;
            ctx.beginPath(); ctx.moveTo(130, 0); ctx.lineTo(150, 0); ctx.lineTo(65, 512); ctx.lineTo(50, 512); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(382, 0); ctx.lineTo(362, 0); ctx.lineTo(447, 512); ctx.lineTo(462, 512); ctx.closePath(); ctx.fill();

            ctx.fillStyle = accentColor;
            for (let i = 120; i < 420; i += 32) {
                let dist = Math.abs(i - 270) / 150;
                let alpha = 1.0 - dist;
                ctx.globalAlpha = Math.max(0, alpha);
                ctx.fillRect(206, i, 100, 10);
            }
            ctx.globalAlpha = 1.0;
        } else if (pat === 'vortex_swoosh') {
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.moveTo(0, 160); ctx.bezierCurveTo(140, 190, 190, 360, 0, 460); ctx.lineTo(0, 512); ctx.lineTo(140, 512);
            ctx.bezierCurveTo(240, 390, 190, 210, 0, 160); ctx.closePath(); ctx.fill();

            ctx.fillStyle = tertiaryColor;
            ctx.beginPath();
            ctx.moveTo(512, 160); ctx.bezierCurveTo(372, 190, 322, 360, 512, 460); ctx.lineTo(512, 512); ctx.lineTo(372, 512);
            ctx.bezierCurveTo(272, 390, 322, 210, 512, 160); ctx.closePath(); ctx.fill();
        } else if (pat === 'carbon_scratch') {
            seed = 45;
            ctx.strokeStyle = accentColor; ctx.lineWidth = 4;
            for (let i = 0; i < 70; i++) {
                let x = random() * 512, y = random() * 512, len = 20 + random() * 25;
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y + len * 0.45); ctx.stroke();
            }
            ctx.strokeStyle = tertiaryColor; ctx.lineWidth = 2;
            for (let i = 0; i < 45; i++) {
                let x = random() * 512, y = random() * 512, len = 15 + random() * 20;
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y + len * 0.45); ctx.stroke();
            }
        } else if (pat === 'digi_camo' || pat === 'camo') {
            seed = 80;
            const choices = [accentColor, tertiaryColor, baseColor];
            for (let i = 0; i < 220; i++) {
                let x = Math.floor(random() * 16) * 32, y = Math.floor(random() * 16) * 32;
                let w = (1 + Math.floor(random() * 2)) * 32, h = (1 + Math.floor(random() * 2)) * 32;
                ctx.fillStyle = choices[Math.floor(random() * choices.length)];
                ctx.globalAlpha = 0.35 + random() * 0.4;
                ctx.fillRect(x, y, w, h);
            }
            ctx.globalAlpha = 1.0;
        } else if (pat === 'hoops') {
            ctx.fillStyle = accentColor;
            for (let i = 0; i < 512; i += 64) ctx.fillRect(0, i, 512, 28);
        } else if (pat === 'retro_halftone') {
            ctx.fillStyle = accentColor;
            for (let y = 15; y < 512; y += 28) {
                let r = Math.max(0.5, (1.0 - y / 512) * 13);
                for (let x = 15; x < 512; x += 28) {
                    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
                }
            }
            ctx.fillStyle = tertiaryColor;
            for (let y = 497; y > 0; y -= 28) {
                let r = Math.max(0.5, (y / 512) * 11);
                for (let x = 29; x < 512; x += 28) {
                    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
                }
            }
        } else if (pat === 'cyber_grid') {
            ctx.strokeStyle = accentColor; ctx.lineWidth = 1.5;
            for (let x = 32; x < 512; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke(); }
            for (let y = 32; y < 512; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }

            seed = 120; ctx.fillStyle = tertiaryColor;
            for (let i = 0; i < 18; i++) {
                let bx = Math.floor(random() * 8) * 64 + 10, by = Math.floor(random() * 8) * 64 + 10;
                ctx.globalAlpha = 0.2 + random() * 0.5;
                ctx.fillRect(bx, by, 44, 44);
            }
            ctx.globalAlpha = 1.0;
        }
    }

    function drawRawDesign(ctx, options, isBack = false) {
        const {
            number = '23', baseColor = '#4F46E5', accentColor = '#7C3AED', tertiaryColor = '#ffffff',
            pattern = 'none', logo = 'none', font = 'athletic', sponsorText = '',
            frontNumberSize = 140, backNumberSize = 140, outlineWeight = 8, customFont = '',
            logoX = 256, logoY = 150, sponsorX = 256, sponsorY = 220,
            numberX = 256, numberY = 340, teamX = 256, teamY = 90, logoSize = 60,
            frontText = 'TEAM', showFrontText = true, showFrontNumber = true, showSponsor = false,
            backNameX = 256, backNameY = 380, backNumberX = 256, backNumberY = 290,
            backName = 'PLAYER', showBackText = true, showBackNumber = true
        } = options;

        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 512, 512);

        drawPattern(ctx, pattern, baseColor, accentColor, tertiaryColor);

        if (!isBack) {
            if (logo && logo !== 'none') {
                drawLogo(ctx, logo, logoX, logoY, logoSize, tertiaryColor, accentColor);
            }
            if (showSponsor && sponsorText && sponsorText !== 'None') {
                ctx.fillStyle = '#ffffff'; ctx.strokeStyle = tertiaryColor;
                ctx.lineWidth = Math.max(1, Math.round(outlineWeight * 0.5));
                ctx.font = getFontString('sponsor', font, customFont);
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.strokeText(sponsorText.toUpperCase(), sponsorX, sponsorY);
                ctx.fillText(sponsorText.toUpperCase(), sponsorX, sponsorY);
            }
            if (showFrontNumber && number) {
                ctx.fillStyle = '#ffffff'; ctx.strokeStyle = tertiaryColor;
                ctx.lineWidth = outlineWeight;
                ctx.font = getFontString('number', font, customFont, frontNumberSize);
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 10;
                ctx.strokeText(number, numberX, numberY);
                ctx.shadowBlur = 0; ctx.fillText(number, numberX, numberY);
            }
            if (showFrontText && frontText && frontText !== 'None') {
                ctx.fillStyle = '#ffffff'; ctx.strokeStyle = tertiaryColor;
                ctx.lineWidth = Math.max(1, Math.round(outlineWeight * 0.5));
                ctx.font = getFontString('team', font, customFont);
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.strokeText(frontText.toUpperCase(), teamX, teamY);
                ctx.fillText(frontText.toUpperCase(), teamX, teamY);
            }
        } else {
            if (showBackText && backName && backName !== 'None') {
                const nameFont = getFontString('name', font, customFont);
                drawArchedText(ctx, backName.toUpperCase(), backNameX, backNameY, 260, Math.PI * 1.5, nameFont, '#ffffff', tertiaryColor);
            }
            if (showBackNumber && number) {
                ctx.fillStyle = '#ffffff'; ctx.strokeStyle = tertiaryColor;
                ctx.lineWidth = outlineWeight + 2;
                ctx.font = getFontString('number_back', font, customFont, backNumberSize);
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 12;
                ctx.strokeText(number, backNumberX, backNumberY);
                ctx.shadowBlur = 0; ctx.fillText(number, backNumberX, backNumberY);
            }
        }
    }

    function renderJersey2D(targetCanvas, options, isBack = false) {
        if (!targetCanvas) return;
        const ctx = targetCanvas.getContext('2d');
        const width = targetCanvas.width;
        const height = targetCanvas.height;

        ctx.clearRect(0, 0, width, height);

        const designCanvas = document.createElement('canvas');
        designCanvas.width = 512;
        designCanvas.height = 512;
        const designCtx = designCanvas.getContext('2d');

        drawRawDesign(designCtx, options, isBack);

        ctx.save();
        const scaleFactor = (width / 512) * 1.25;
        const offsetX = (width - 512 * scaleFactor) / 2;
        const offsetY = (height - 512 * scaleFactor) / 2 - 10;
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
        ctx.fillRect(0, 0, 512, 512);

        drawEmbossedFold(ctx, 170, 320, 225, 305, 260, 335, 0.22, 0.12);
        drawEmbossedFold(ctx, 340, 350, 290, 340, 250, 365, 0.22, 0.12);

        ctx.globalCompositeOperation = 'screen';
        const highlightGrad = ctx.createLinearGradient(120, 0, 320, 0);
        highlightGrad.addColorStop(0, 'rgba(255,255,255,0)');
        highlightGrad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
        highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = highlightGrad;
        ctx.fillRect(0, 0, 512, 512);

        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(365, 80); ctx.lineTo(348, 168); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(147, 80); ctx.lineTo(164, 168); ctx.stroke();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.beginPath();
        ctx.moveTo(216, 56); ctx.quadraticCurveTo(256, 36, 296, 56); ctx.quadraticCurveTo(256, 70, 216, 56);
        ctx.closePath(); ctx.fill();

        ctx.restore();
    }

    function renderOrderPreviewCardHTML(order, prefix = 'ord') {
        const specs = parseOrderNotes(order.notes, order);

        return `
        <div class="bg-[#070b14] border border-slate-800 rounded-3xl p-5 shadow-2xl my-4 text-white font-sans">
            <!-- Section Header -->
            <div class="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
                <div class="flex items-center gap-2">
                    <span class="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30">🎨 Selected Design</span>
                    <span class="text-xs text-slate-400 font-medium">Visual Preview & Specifications</span>
                </div>
                <button onclick="OrderPreview.toggleSpecs('specs-body-${prefix}-${order.id}', this)" class="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 bg-slate-900/80 px-2.5 py-1 rounded-xl border border-slate-800">
                    <span>Hide Specs</span> ⚙️
                </button>
            </div>

            <!-- Front View & Back View Canvas Container -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <!-- FRONT VIEW -->
                <div class="bg-[#030712] rounded-2xl border border-slate-800/80 p-4 flex flex-col items-center justify-center relative">
                    <p class="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-3 text-center">FRONT VIEW</p>
                    <div class="relative w-full aspect-square max-w-[280px] flex items-center justify-center">
                        <canvas id="${prefix}-canvas-front-${order.id}" width="320" height="320" class="w-full h-full object-contain rounded-xl drop-shadow-2xl"></canvas>
                    </div>
                </div>

                <!-- BACK VIEW -->
                <div class="bg-[#030712] rounded-2xl border border-slate-800/80 p-4 flex flex-col items-center justify-center relative">
                    <p class="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-3 text-center">BACK VIEW</p>
                    <div class="relative w-full aspect-square max-w-[280px] flex items-center justify-center">
                        <canvas id="${prefix}-canvas-back-${order.id}" width="320" height="320" class="w-full h-full object-contain rounded-xl drop-shadow-2xl"></canvas>
                    </div>
                </div>
            </div>

            <!-- Human Readable Design Specs Grid -->
            <div id="specs-body-${prefix}-${order.id}" class="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-3">
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div class="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                        <p class="text-[10px] text-slate-400 font-bold uppercase">Size & Finish</p>
                        <p class="font-bold text-white mt-0.5"><span class="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[11px] font-black">${specs.size}</span> · <span class="capitalize text-slate-300">${specs.finish}</span></p>
                    </div>

                    <div class="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                        <p class="text-[10px] text-slate-400 font-bold uppercase">Pattern & Style</p>
                        <p class="font-bold text-white capitalize mt-0.5">${specs.pattern || 'None'}</p>
                        <p class="text-[10px] text-slate-400 font-medium capitalize">Font: ${specs.font || 'athletic'}${specs.customFont && specs.customFont !== 'None' ? ' (' + specs.customFont + ')' : ''}</p>
                    </div>

                    <div class="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50 col-span-2 sm:col-span-1">
                        <p class="text-[10px] text-slate-400 font-bold uppercase">Color Palette DNA</p>
                        <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                            <div class="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800" title="Base Color">
                                <span class="w-3 h-3 rounded-md border border-white/20" style="background:${specs.baseColor}"></span>
                                <span class="text-[10px] font-mono text-slate-300">${specs.baseColor}</span>
                            </div>
                            <div class="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800" title="Accent Color">
                                <span class="w-3 h-3 rounded-md border border-white/20" style="background:${specs.accentColor}"></span>
                                <span class="text-[10px] font-mono text-slate-300">${specs.accentColor}</span>
                            </div>
                            <div class="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800" title="Tertiary Color">
                                <span class="w-3 h-3 rounded-md border border-white/20" style="background:${specs.tertiaryColor}"></span>
                                <span class="text-[10px] font-mono text-slate-300">${specs.tertiaryColor}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 space-y-2 text-xs">
                    <p class="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Print & Placement Customization</p>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                            <span class="text-slate-400 text-[11px]">Front Text:</span>
                            <p class="font-bold text-white">${specs.showFrontText && specs.frontText ? `"${specs.frontText}" <span class="text-emerald-400 text-[10px]">(Show)</span>` : '<span class="text-slate-500">None</span>'}</p>
                        </div>
                        <div>
                            <span class="text-slate-400 text-[11px]">Back Name:</span>
                            <p class="font-bold text-white">${specs.showBackText && specs.backName ? `"${specs.backName}" <span class="text-emerald-400 text-[10px]">(Show)</span>` : '<span class="text-slate-500">None</span>'}</p>
                        </div>
                        <div>
                            <span class="text-slate-400 text-[11px]">Player Number:</span>
                            <p class="font-bold text-white">#${specs.number || '00'} <span class="text-slate-400 text-[10px]">(F:${specs.showFrontNumber ? 'Yes' : 'No'}, B:${specs.showBackNumber ? 'Yes' : 'No'})</span></p>
                        </div>
                        <div>
                            <span class="text-slate-400 text-[11px]">Sponsor / Logo:</span>
                            <p class="font-bold text-white">${specs.showSponsor && specs.sponsorText && specs.sponsorText !== 'None' ? `"${specs.sponsorText}"` : 'Sponsor: None'} · <span class="capitalize">${specs.logo && specs.logo !== 'none' ? specs.logo : 'No Logo'}</span></p>
                        </div>
                    </div>
                </div>

                <div class="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 font-mono flex flex-wrap gap-y-1 gap-x-3">
                    <span><strong class="text-slate-300">Num Size:</strong> F-${specs.frontNumberSize}px / B-${specs.backNumberSize}px</span>
                    <span><strong class="text-slate-300">Outline:</strong> ${specs.outlineWeight}px</span>
                    <span><strong class="text-slate-300">F-Team:</strong> (${specs.teamX}, ${specs.teamY})</span>
                    <span><strong class="text-slate-300">F-Logo:</strong> (${specs.logoX}, ${specs.logoY})</span>
                    <span><strong class="text-slate-300">F-Sponsor:</strong> (${specs.sponsorX}, ${specs.sponsorY})</span>
                    <span><strong class="text-slate-300">F-Num:</strong> (${specs.numberX}, ${specs.numberY})</span>
                    <span><strong class="text-slate-300">B-Name:</strong> (${specs.backNameX}, ${specs.backNameY})</span>
                    <span><strong class="text-slate-300">B-Num:</strong> (${specs.backNumberX}, ${specs.backNumberY})</span>
                </div>

                ${specs.userNotes ? `
                <div class="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-xs">
                    <span class="text-amber-400 font-bold text-[10px] uppercase block">Customer Special Instructions:</span>
                    <p class="text-amber-200 mt-0.5">${specs.userNotes}</p>
                </div>
                ` : ''}
            </div>
        </div>
        `;
    }

    function initOrderCanvases(order, prefix = 'ord') {
        const specs = parseOrderNotes(order.notes, order);
        const frontCanvas = document.getElementById(`${prefix}-canvas-front-${order.id}`);
        const backCanvas = document.getElementById(`${prefix}-canvas-back-${order.id}`);

        if (frontCanvas) renderJersey2D(frontCanvas, specs, false);
        if (backCanvas) renderJersey2D(backCanvas, specs, true);
    }

    function initAllCanvases(ordersArray = [], prefix = 'ord') {
        ordersArray.forEach(order => initOrderCanvases(order, prefix));
    }

    function toggleSpecs(elementId, btn) {
        const el = document.getElementById(elementId);
        if (!el) return;
        if (el.classList.contains('hidden')) {
            el.classList.remove('hidden');
            if (btn) btn.innerHTML = '<span>Hide Specs</span> ⚙️';
        } else {
            el.classList.add('hidden');
            if (btn) btn.innerHTML = '<span>Show Specs</span> ⚙️';
        }
    }

    return {
        parseNotes: parseOrderNotes,
        renderJersey2D: renderJersey2D,
        renderCardHTML: renderOrderPreviewCardHTML,
        initCanvases: initOrderCanvases,
        initAllCanvases: initAllCanvases,
        toggleSpecs: toggleSpecs
    };
})();
