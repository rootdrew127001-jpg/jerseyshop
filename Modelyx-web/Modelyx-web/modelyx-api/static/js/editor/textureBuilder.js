import * as THREE from 'three';
export function buildTexture(options = {}) {
    const {
        teamName = 'TEAM',
        number = '23',
        baseColor = '#4F46E5',
        accentColor = '#7C3AED',
        pattern = 'none'
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base fill
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // Pattern
    if (pattern === 'stripes') {
        ctx.fillStyle = accentColor;
        for (let i = 0; i < 512; i += 40) {
            ctx.fillRect(i, 0, 20, 512);
        }
    } else if (pattern === 'diagonal') {
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 18;
        for (let i = -512; i < 1024; i += 60) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + 512, 512);
            ctx.stroke();
        }
    } else if (pattern === 'panel') {
        ctx.fillStyle = accentColor;
        ctx.fillRect(0, 0, 180, 512);
        ctx.fillRect(332, 0, 180, 512);
    } else if (pattern === 'gradient') {
        const grad = ctx.createLinearGradient(0, 0, 512, 512);
        grad.addColorStop(0, baseColor);
        grad.addColorStop(1, accentColor);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);
    }

    // Player number
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 180px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;
    ctx.fillText(number, 256, 280);
    ctx.shadowBlur = 0;

    // Team name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(teamName.toUpperCase(), 256, 120);

    return new THREE.CanvasTexture(canvas);
}