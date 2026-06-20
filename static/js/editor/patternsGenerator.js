export function generateParameterizedPatterns() {
    const select = document.getElementById('pattern');
    if (!select) return;

    const optgroup = document.createElement('optgroup');
    optgroup.label = '⚡ Premium Generated Patterns (220+)';

    const stripesWidths = [
        { val: 8, label: 'Thin' },
        { val: 16, label: 'Medium' },
        { val: 32, label: 'Thick' },
        { val: 64, label: 'Mega' }
    ];
    const stripesAngles = [0, 15, 30, 45, 60, 75, 90, 120, 135, 150];
    stripesWidths.forEach(w => {
        stripesAngles.forEach(a => {
            const opt = document.createElement('option');
            opt.value = `param_stripes_${w.val}_${a}`;
            opt.textContent = `🦓 Stripes: ${w.label} (${a}°)`;
            optgroup.appendChild(opt);
        });
    });

    const gridSizes = [
        { val: 16, label: 'Fine' },
        { val: 32, label: 'Medium' },
        { val: 48, label: 'Coarse' },
        { val: 64, label: 'Large' },
        { val: 96, label: 'Giant' }
    ];
    const gridWeights = [
        { val: 1, label: 'Hairline' },
        { val: 2, label: 'Thin' },
        { val: 4, label: 'Medium' },
        { val: 8, label: 'Thick' }
    ];
    gridSizes.forEach(s => {
        gridWeights.forEach(w => {
            const opt = document.createElement('option');
            opt.value = `param_grid_${s.val}_${w.val}`;
            opt.textContent = `🌐 Grid: ${s.label} - ${w.label}`;
            optgroup.appendChild(opt);
        });
    });

    const dotsRadii = [
        { val: 2, label: 'Micro' },
        { val: 4, label: 'Small' },
        { val: 8, label: 'Medium' },
        { val: 16, label: 'Large' },
        { val: 24, label: 'Jumbo' }
    ];
    const dotsSpacings = [
        { val: 16, label: 'Dense' },
        { val: 32, label: 'Medium' },
        { val: 64, label: 'Sparse' },
        { val: 96, label: 'Wide' }
    ];
    dotsRadii.forEach(r => {
        dotsSpacings.forEach(s => {
            const opt = document.createElement('option');
            opt.value = `param_dots_${r.val}_${s.val}`;
            opt.textContent = `💬 Dots: ${r.label} - ${s.label}`;
            optgroup.appendChild(opt);
        });
    });

    const chevronsSpacings = [
        { val: 20, label: 'Tight' },
        { val: 40, label: 'Medium' },
        { val: 60, label: 'Wide' },
        { val: 80, label: 'Broad' }
    ];
    const chevronsWeights = [
        { val: 2, label: 'Thin' },
        { val: 4, label: 'Medium' },
        { val: 8, label: 'Thick' },
        { val: 12, label: 'Bold' }
    ];
    const chevronsDirs = [
        { val: 'up', label: 'Up' },
        { val: 'down', label: 'Down' },
        { val: 'side', label: 'Side' }
    ];
    chevronsSpacings.forEach(s => {
        chevronsWeights.forEach(w => {
            chevronsDirs.forEach(d => {
                const opt = document.createElement('option');
                opt.value = `param_chevrons_${s.val}_${w.val}_${d.val}`;
                opt.textContent = `🔼 Chevrons ${d.label}: ${s.label} - ${w.label}`;
                optgroup.appendChild(opt);
            });
        });
    });

    const wavesFreqs = [
        { val: 40, label: 'Fast' },
        { val: 20, label: 'Medium' },
        { val: 10, label: 'Slow' }
    ];
    const wavesAmps = [
        { val: 10, label: 'Low' },
        { val: 20, label: 'Medium' },
        { val: 40, label: 'High' },
        { val: 60, label: 'Extreme' }
    ];
    const wavesDirs = [
        { val: 'h', label: 'Horizontal' },
        { val: 'v', label: 'Vertical' }
    ];
    wavesFreqs.forEach(f => {
        wavesAmps.forEach(a => {
            wavesDirs.forEach(d => {
                const opt = document.createElement('option');
                opt.value = `param_waves_${f.val}_${a.val}_${d.val}`;
                opt.textContent = `🌊 Waves ${d.label}: ${f.label} - ${a.label}`;
                optgroup.appendChild(opt);
            });
        });
    });

    const diamondsSizes = [
        { val: 16, label: 'Small' },
        { val: 32, label: 'Medium' },
        { val: 48, label: 'Large' },
        { val: 64, label: 'Jumbo' },
        { val: 96, label: 'Giant' }
    ];
    const diamondsWeights = [
        { val: 1, label: 'Thin' },
        { val: 2, label: 'Medium' },
        { val: 4, label: 'Thick' },
        { val: 8, label: 'Bold' }
    ];
    diamondsSizes.forEach(s => {
        diamondsWeights.forEach(w => {
            const opt = document.createElement('option');
            opt.value = `param_diamonds_${s.val}_${w.val}`;
            opt.textContent = `💎 Diamonds: ${s.label} - ${w.label}`;
            optgroup.appendChild(opt);
        });
    });

    const hexSizes = [
        { val: 16, label: 'Small' },
        { val: 32, label: 'Medium' },
        { val: 48, label: 'Large' },
        { val: 64, label: 'Jumbo' },
        { val: 96, label: 'Giant' }
    ];
    const hexWeights = [
        { val: 1, label: 'Thin' },
        { val: 2, label: 'Medium' },
        { val: 4, label: 'Thick' },
        { val: 8, label: 'Bold' }
    ];
    hexSizes.forEach(s => {
        hexWeights.forEach(w => {
            const opt = document.createElement('option');
            opt.value = `param_hex_${s.val}_${w.val}`;
            opt.textContent = `⬢ Honeycomb: ${s.label} - ${w.label}`;
            optgroup.appendChild(opt);
        });
    });

    const starCounts = [
        { val: 10, label: 'Few' },
        { val: 25, label: 'Some' },
        { val: 50, label: 'Many' },
        { val: 100, label: 'Galaxy' }
    ];
    const starSizes = [
        { val: 12, label: 'Small' },
        { val: 24, label: 'Medium' },
        { val: 36, label: 'Large' },
        { val: 48, label: 'Huge' }
    ];
    starCounts.forEach(c => {
        starSizes.forEach(s => {
            const opt = document.createElement('option');
            opt.value = `param_stars_${c.val}_${s.val}`;
            opt.textContent = `⭐ Stars: ${c.label} (${s.label})`;
            optgroup.appendChild(opt);
        });
    });

    const ringCounts = [
        { val: 10, label: 'Few' },
        { val: 25, label: 'Some' },
        { val: 50, label: 'Many' },
        { val: 100, label: 'Universe' }
    ];
    const ringSizes = [
        { val: 12, label: 'Small' },
        { val: 24, label: 'Medium' },
        { val: 36, label: 'Large' },
        { val: 48, label: 'Huge' }
    ];
    ringCounts.forEach(c => {
        ringSizes.forEach(s => {
            const opt = document.createElement('option');
            opt.value = `param_rings_${c.val}_${s.val}`;
            opt.textContent = `⭕ Rings: ${c.label} (${s.label})`;
            optgroup.appendChild(opt);
        });
    });

    select.appendChild(optgroup);
}
