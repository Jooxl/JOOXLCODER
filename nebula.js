const canvas = document.getElementById('nebula-canvas');
const ctx = canvas.getContext('2d');

let w, h;
let particles = [];
const particleCount = 55; // Slightly reduced for smoother perf
const maxDistance = 150;
let animFrameId = null;

function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    // Reposition particles that are now out of bounds
    particles.forEach(p => {
        if (p.x > w) p.x = Math.random() * w;
        if (p.y > h) p.y = Math.random() * h;
    });
}
window.addEventListener('resize', resize);
resize();

let currentPrimaryRGB = '255, 85, 0';
let currentPrimaryHex = '#ff5500';
let currentShapeTheme = 'orange';
let themeUpdateScheduled = false;

function updateThemeColors() {
    if (themeUpdateScheduled) return;
    themeUpdateScheduled = true;
    // Use rAF to batch theme update with next paint cycle - prevents jank on iPad
    requestAnimationFrame(() => {
        currentPrimaryRGB = getComputedStyle(document.body).getPropertyValue('--primary-rgb').trim() || '255, 85, 0';
        currentPrimaryHex = getComputedStyle(document.body).getPropertyValue('--primary-hex').trim() || '#ff5500';
        currentShapeTheme = document.body.getAttribute('data-site-shape') || 'orange';
        themeUpdateScheduled = false;
    });
}

// Update colors initially after layout
setTimeout(updateThemeColors, 150);
window.addEventListener('themeChanged', updateThemeColors);

class Particle {
    constructor() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2 + 1;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > w) this.vx *= -1;
        if (this.y < 0 || this.y > h) this.vy *= -1;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${currentPrimaryRGB}, 0.8)`;
        ctx.fill();
    }
}

for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
}

function animate() {
    ctx.clearRect(0, 0, w, h);

    const theme = currentShapeTheme;
    let currentMaxDist = maxDistance;
    if (theme === 'purple') currentMaxDist = maxDistance * 1.5;
    else if (theme === 'cyan') currentMaxDist = maxDistance * 1.2;
    else if (theme === 'pink') currentMaxDist = maxDistance * 1.3;
    const maxDistSq = currentMaxDist * currentMaxDist;

    // Set shadow once for glow effect - not per particle
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = currentPrimaryHex;

    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
    }

    // Disable shadow for line drawing (performance)
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distSq = dx * dx + dy * dy;

            if (distSq < maxDistSq) {
                const distance = Math.sqrt(distSq);
                const alpha = 1 - distance / currentMaxDist;
                ctx.beginPath();
                ctx.strokeStyle = `rgba(${currentPrimaryRGB}, ${alpha})`;

                if (theme === 'purple') {
                    ctx.lineWidth = 0.6;
                    const midX = (particles[i].x + particles[j].x) / 2;
                    const midY = (particles[i].y + particles[j].y) / 2;
                    const offset = distance * 0.35;
                    const cpX = midX + Math.sin(particles[i].x * 0.02) * offset;
                    const cpY = midY + Math.cos(particles[j].y * 0.02) * offset;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.quadraticCurveTo(cpX, cpY, particles[j].x, particles[j].y);
                } else if (theme === 'cyan') {
                    ctx.lineWidth = 0.8;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[i].x, particles[j].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                } else if (theme === 'green') {
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    const offsetX = (particles[j].y - particles[i].y) * 0.05;
                    const offsetY = (particles[i].x - particles[j].x) * 0.05;
                    ctx.moveTo(particles[i].x + offsetX, particles[i].y + offsetY);
                    ctx.lineTo(particles[j].x + offsetX, particles[j].y + offsetY);
                } else if (theme === 'pink') {
                    ctx.lineWidth = 0.8;
                    const midX = (particles[i].x + particles[j].x) / 2;
                    const midY = (particles[i].y + particles[j].y) / 2;
                    const offset = distance * 0.4;
                    const cp1X = particles[i].x + Math.sin(particles[j].y * 0.02) * offset;
                    const cp1Y = midY;
                    const cp2X = midX;
                    const cp2Y = particles[j].y + Math.cos(particles[i].x * 0.02) * offset;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, particles[j].x, particles[j].y);
                } else if (theme === 'yellow') {
                    ctx.lineWidth = 0.9;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    const midX = (particles[i].x + particles[j].x) / 2;
                    const midY = (particles[i].y + particles[j].y) / 2;
                    const offset = distance * 0.25;
                    const zigX = midX + Math.sin(particles[i].y * 0.05) * offset;
                    const zigY = midY + Math.cos(particles[j].x * 0.05) * offset;
                    ctx.lineTo(zigX, zigY);
                    ctx.lineTo(particles[j].x, particles[j].y);
                } else {
                    ctx.lineWidth = 1;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                }
                ctx.stroke();
            }
        }
    }

    ctx.restore();
    animFrameId = requestAnimationFrame(animate);
}

animate();
