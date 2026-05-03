const canvas = document.getElementById('nebula-canvas');
const ctx = canvas.getContext('2d');

let w, h;
let particles = [];
const particleCount = 60; // Sleek and minimal
const maxDistance = 150;

function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let currentPrimaryRGB = '255, 85, 0';
let currentPrimaryHex = '#ff5500';
let currentShapeTheme = 'orange';

function updateThemeColors() {
    currentPrimaryRGB = getComputedStyle(document.body).getPropertyValue('--primary-rgb').trim() || '255, 85, 0';
    currentPrimaryHex = getComputedStyle(document.body).getPropertyValue('--primary-hex').trim() || '#ff5500';
    currentShapeTheme = document.body.getAttribute('data-site-shape') || 'orange';
}

// Update colors initially
setTimeout(updateThemeColors, 100);

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
        
        // Bounce off edges
        if (this.x < 0 || this.x > w) this.vx *= -1;
        if (this.y < 0 || this.y > h) this.vy *= -1;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${currentPrimaryRGB}, 0.8)`;
        ctx.fill();
        
        // Add subtle glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = currentPrimaryHex;
    }
}

for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
}

function animate() {
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        
        // Connect particles
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const theme = currentShapeTheme;
            let currentMaxDist = maxDistance;
            
            if (theme === 'purple') currentMaxDist = maxDistance * 1.5;
            else if (theme === 'cyan') currentMaxDist = maxDistance * 1.2;
            else if (theme === 'pink') currentMaxDist = maxDistance * 1.3;

            if (distance < currentMaxDist) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(${currentPrimaryRGB}, ${1 - distance/currentMaxDist})`;
                
                if (theme === 'purple') {
                    ctx.lineWidth = 0.6;
                    // Fractal-like curve connection using smooth coordinates
                    const midX = (particles[i].x + particles[j].x) / 2;
                    const midY = (particles[i].y + particles[j].y) / 2;
                    const offset = distance * 0.35;
                    const cpX = midX + Math.sin(particles[i].x * 0.02) * offset;
                    const cpY = midY + Math.cos(particles[j].y * 0.02) * offset;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.quadraticCurveTo(cpX, cpY, particles[j].x, particles[j].y);
                } else if (theme === 'cyan') {
                    // Circuit-board right angles
                    ctx.lineWidth = 0.8;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[i].x, particles[j].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                } else if (theme === 'green') {
                    // Double parallel tech lines
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    const offsetX = (particles[j].y - particles[i].y) * 0.05;
                    const offsetY = (particles[i].x - particles[j].x) * 0.05;
                    ctx.moveTo(particles[i].x + offsetX, particles[i].y + offsetY);
                    ctx.lineTo(particles[j].x + offsetX, particles[j].y + offsetY);
                } else if (theme === 'pink') {
                    // Smooth fluid waves
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
                    // Sharp zig-zags (lightning)
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
                    // Default Orange: Straight lines
                    ctx.lineWidth = 1;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                }
                ctx.stroke();
            }
        }
    }
    
    requestAnimationFrame(animate);
}

animate();
