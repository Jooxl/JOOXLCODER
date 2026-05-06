const effectsCanvas = document.getElementById('effects-canvas');
const effectsCtx = effectsCanvas.getContext('2d');
const circuitCanvas = document.getElementById('circuit-canvas');
const circuitCtx = circuitCanvas.getContext('2d');

// Debounced resize to prevent thrashing
let resizeTimeout;
function resizeCanvases() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        effectsCanvas.width = effectsCanvas.offsetWidth;
        effectsCanvas.height = effectsCanvas.offsetHeight;
        circuitCanvas.width = window.innerWidth;
        circuitCanvas.height = window.innerHeight;
        scheduleCacheUpdate();
    }, 150);
}
window.addEventListener('resize', resizeCanvases);
setTimeout(resizeCanvases, 100);

// Orb position cache – refreshed after resize only
let cyberOrbCache = null;
let cyberOrbRectCache = null;
let orbCacheScheduled = false;

function scheduleCacheUpdate() {
    if (orbCacheScheduled) return;
    orbCacheScheduled = true;
    requestAnimationFrame(() => {
        cyberOrbCache = document.getElementById('cyber-orb');
        if (cyberOrbCache) {
            cyberOrbRectCache = cyberOrbCache.getBoundingClientRect();
        }
        orbCacheScheduled = false;
    });
}
setTimeout(scheduleCacheUpdate, 200);

// Theme color – updated lazily on next animation frame
let currentPrimaryRGB = '255, 85, 0';
let themeUpdatePending = false;

function scheduleThemeUpdate() {
    if (themeUpdatePending) return;
    themeUpdatePending = true;
    requestAnimationFrame(() => {
        currentPrimaryRGB = getComputedStyle(document.body).getPropertyValue('--primary-rgb').trim() || '255, 85, 0';
        themeUpdatePending = false;
    });
}
setTimeout(scheduleThemeUpdate, 150);
window.addEventListener('themeChanged', scheduleThemeUpdate);

let activeEffects = [];
let circuitLines = [];
const MAX_PARTICLES = 250; // Reduced from 300 for better perf on tablets

class CircuitLine {
    constructor(startX, startY, endX, endY) {
        this.x = startX; this.y = startY; this.endX = endX; this.endY = endY;
        this.progress = 0; this.life = 1.0; this.dx = endX - startX; this.dy = endY - startY;
    }
    update() { this.progress += 0.03; if (this.progress >= 1) this.life -= 0.05; }
    draw(ctx) {
        ctx.strokeStyle = `rgba(255, 26, 26, ${this.life})`; ctx.lineWidth = 4;
        ctx.shadowColor = 'red'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.dx * Math.min(this.progress, 1), this.y + this.dy * Math.min(this.progress, 1));
        ctx.stroke(); ctx.shadowBlur = 0;
    }
}

// ---------------- ENTER KEY LINE HIGHLIGHT ----------------
class LineHighlight {
    constructor(y, width) {
        this.y = y - 5;
        this.width = width;
        this.life = 1;
    }
    update() { this.life -= 0.06; }
    draw(ctx) {
        ctx.fillStyle = `rgba(${currentPrimaryRGB}, ${this.life * 0.3})`;
        ctx.fillRect(0, this.y, this.width, 24);
        ctx.strokeStyle = `rgba(${currentPrimaryRGB}, ${this.life})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, this.y); ctx.lineTo(this.width, this.y);
        ctx.moveTo(0, this.y + 24); ctx.lineTo(this.width, this.y + 24);
        ctx.stroke();
    }
}
window.spawnLineHighlight = function(y, width) {
    activeEffects.push(new LineHighlight(y, width));
};

// ---------------- SYMBOL EFFECTS ----------------

class Spark {
    constructor(x, y, color, vx, vy) {
        this.x = x; this.y = y; this.life = 1;
        this.color = color || `rgba(${currentPrimaryRGB}, 1)`;
        this.vx = vx || (Math.random() - 0.5) * 10;
        this.vy = vy || (Math.random() - 0.5) * 10;
        this.size = Math.random() * 2 + 1;
    }
    update() { this.life -= 0.05; this.x += this.vx; this.y += this.vy; this.vx *= 0.9; this.vy *= 0.9; }
    draw(ctx) {
        ctx.fillStyle = this.color.replace(/[\d.]+\)$/, `${this.life})`);
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    }
}

class Shockwave {
    constructor(x, y, color) { this.x = x; this.y = y; this.life = 1; this.radius = 0; this.color = color; }
    update() { this.life -= 0.05; this.radius += 5; }
    draw(ctx) {
        ctx.strokeStyle = this.color.replace(/[\d.]+\)$/, `${this.life})`);
        ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.stroke();
    }
}

class Spiral {
    constructor(x, y, color) { this.x = x; this.y = y; this.life = 1; this.angle = 0; this.radius = 0; this.color = color; }
    update() { this.life -= 0.03; this.angle += 0.5; this.radius += 1; }
    draw(ctx) {
        ctx.fillStyle = this.color.replace(/[\d.]+\)$/, `${this.life})`);
        ctx.beginPath();
        ctx.arc(this.x + Math.cos(this.angle) * this.radius, this.y + Math.sin(this.angle) * this.radius, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

class FracturingGrid {
    constructor(x, y, color) { this.x = x; this.y = y; this.life = 1; this.size = 0; this.color = color; }
    update() { this.life -= 0.04; this.size += 2; }
    draw(ctx) {
        ctx.strokeStyle = this.color.replace(/[\d.]+\)$/, `${this.life})`); ctx.lineWidth = 1;
        ctx.strokeRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
        ctx.beginPath();
        ctx.moveTo(this.x - this.size, this.y); ctx.lineTo(this.x + this.size, this.y);
        ctx.moveTo(this.x, this.y - this.size); ctx.lineTo(this.x, this.y + this.size);
        ctx.stroke();
    }
}

class GlowingRune {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.life = 1; this.color = color;
        this.char = String.fromCharCode(0x30A0 + Math.random() * 96); this.vy = -2;
    }
    update() { this.life -= 0.02; this.y += this.vy; }
    draw(ctx) {
        ctx.fillStyle = this.color.replace(/[\d.]+\)$/, `${this.life})`);
        ctx.font = "20px 'Fira Code'";
        ctx.fillText(this.char, this.x - 10, this.y);
    }
}

class PolygonExplosion {
    constructor(x, y, color, sides) {
        this.x = x; this.y = y; this.life = 1; this.color = color; this.radius = 5; this.sides = sides; this.rot = 0;
    }
    update() { this.life -= 0.05; this.radius += 3; this.rot += 0.1; }
    draw(ctx) {
        ctx.strokeStyle = this.color.replace(/[\d.]+\)$/, `${this.life})`);
        ctx.lineWidth = 2; ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rot);
        ctx.beginPath();
        for (let i = 0; i <= this.sides; i++) {
            const ang = i * 2 * Math.PI / this.sides;
            i === 0 ? ctx.moveTo(this.radius * Math.cos(ang), this.radius * Math.sin(ang))
                     : ctx.lineTo(this.radius * Math.cos(ang), this.radius * Math.sin(ang));
        }
        ctx.stroke(); ctx.restore();
    }
}

// ---------------- DISPATCHER ----------------

function spawnCircuit(startX, startY, endX, endY) { circuitLines.push(new CircuitLine(startX, startY, endX, endY)); }
window.spawnCircuit = spawnCircuit;

function spawnEffect(char, x, y, cColor = null) {
    if (char === 'Enter') return;

    const color = cColor || `rgba(${currentPrimaryRGB}, 1)`;

    if (char === '@') activeEffects.push(new Spiral(x, y, color), new Spiral(x, y, color));
    else if (char === '#') activeEffects.push(new FracturingGrid(x, y, color));
    else if (char === '$') activeEffects.push(new Shockwave(x, y, 'rgba(0, 255, 0, 1)'), new Spark(x, y, 'rgba(0,255,0,1)', 0, -5));
    else if (char === '%') { activeEffects.push(new Spark(x - 10, y - 10, color), new Spark(x + 10, y + 10, color)); }
    else if (char === '^') activeEffects.push(new PolygonExplosion(x, y, color, 3));
    else if (char === '&') activeEffects.push(new GlowingRune(x, y, color));
    else if (char === '*') { for (let i = 0; i < 8; i++) activeEffects.push(new Spark(x, y, color, Math.cos(i * Math.PI / 4) * 6, Math.sin(i * Math.PI / 4) * 6)); }
    else if (char === '(' || char === ')') activeEffects.push(new Shockwave(x, y, color));
    else if (char === '{' || char === '}') activeEffects.push(new PolygonExplosion(x, y, color, 4));
    else if (char === '[' || char === ']') activeEffects.push(new PolygonExplosion(x, y, color, 4));
    else if (char === '-') activeEffects.push(new Spark(x, y, color, -10, 0), new Spark(x, y, color, 10, 0));
    else if (char === '+') activeEffects.push(new Spark(x, y, color, -10, 0), new Spark(x, y, color, 10, 0), new Spark(x, y, color, 0, -10), new Spark(x, y, color, 0, 10));
    else if (char === '=') activeEffects.push(new Spark(x, y - 5, color, 10, 0), new Spark(x, y + 5, color, 10, 0));
    else if (char === '_') activeEffects.push(new Spark(x, y + 10, color, 15, 0), new Spark(x, y + 10, color, -15, 0));
    else if (char === '.') activeEffects.push(new Spark(x, y, color, 0, -15));
    else if (char === ',') activeEffects.push(new Spark(x, y, color, -5, 10));
    else if (char === '>') activeEffects.push(new Spark(x, y, color, 15, 5));
    else if (char === '<') activeEffects.push(new Spark(x, y, color, -15, 5));
    else if (char === '?') activeEffects.push(new GlowingRune(x, y, 'rgba(255, 105, 180, 1)'));
    else if (char === ':') activeEffects.push(new Spark(x, y - 5, color), new Spark(x, y + 5, color));
    else if (char === ';') activeEffects.push(new Spark(x, y - 5, color), new Spark(x, y + 5, color, -5, 5));
    else if (char === '"' || char === "'") activeEffects.push(new Spark(x - 5, y - 10, color, 0, -5), new Spark(x + 5, y - 10, color, 0, -5));
    else if (char === '|') activeEffects.push(new Spark(x, y, color, 0, -20), new Spark(x, y, color, 0, 20));
    else if (char === '\\') activeEffects.push(new Spark(x, y, color, 10, 10), new Spark(x, y, color, -10, -10));
    else if (char === '/') activeEffects.push(new Spark(x, y, color, 10, -10), new Spark(x, y, color, -10, 10));
    else if (char === 'Backspace') { for (let i = 0; i < 6; i++) { let a = Math.random() * Math.PI * 2; activeEffects.push(new Spark(x + Math.cos(a) * 20, y + Math.sin(a) * 20, color, -Math.cos(a) * 4, -Math.sin(a) * 4)); } }
    else { for (let i = 0; i < 3; i++) activeEffects.push(new Spark(x, y, color)); }

    // Hard cap to prevent memory/perf issues
    if (activeEffects.length > MAX_PARTICLES) {
        activeEffects.splice(0, activeEffects.length - MAX_PARTICLES);
    }
}
window.spawnEffect = spawnEffect;

// Throttle audio visualizer checks
let lastVisualizerCheck = 0;
function drawVisualizer(now) {
    if (now - lastVisualizerCheck < 100) return; // max 10fps for visualizer check
    lastVisualizerCheck = now;

    if (window.audioManager && window.audioManager.analyser && window.audioManager.initialized) {
        window.audioManager.analyser.getByteFrequencyData(window.audioManager.dataArray);
        let sum = 0;
        const len = window.audioManager.dataArray.length;
        for (let i = 0; i < len; i++) sum += window.audioManager.dataArray[i];
        const avg = sum / len;

        if (avg > 15 && Math.random() > 0.5 && cyberOrbCache && cyberOrbRectCache) {
            const orbX = cyberOrbRectCache.left + cyberOrbRectCache.width / 2;
            const orbY = cyberOrbRectCache.top + cyberOrbRectCache.height / 2;
            activeEffects.push(new Shockwave(orbX, orbY, `rgba(${currentPrimaryRGB}, ${(avg / 255) * 0.8})`));
        }
    }
}

function animateAll(now) {
    effectsCtx.clearRect(0, 0, effectsCanvas.width, effectsCanvas.height);
    circuitCtx.clearRect(0, 0, circuitCanvas.width, circuitCanvas.height);

    drawVisualizer(now);

    for (let i = activeEffects.length - 1; i >= 0; i--) {
        activeEffects[i].update();
        activeEffects[i].draw(effectsCtx);
        if (activeEffects[i].life <= 0) activeEffects.splice(i, 1);
    }
    for (let i = circuitLines.length - 1; i >= 0; i--) {
        circuitLines[i].update();
        circuitLines[i].draw(circuitCtx);
        if (circuitLines[i].life <= 0) circuitLines.splice(i, 1);
    }
    requestAnimationFrame(animateAll);
}
requestAnimationFrame(animateAll);
