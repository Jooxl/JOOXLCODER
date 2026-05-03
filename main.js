require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' } });

const startBtn = document.getElementById('start-btn');
const backBtn = document.getElementById('back-btn');
const terminalOut = document.getElementById('terminal-output');
const terminalInput = document.getElementById('terminal-input');
const flashOverlay = document.getElementById('flash-overlay');
const cyberOrb = document.getElementById('cyber-orb');
const orbMenu = document.getElementById('orb-menu');
const orbText = document.getElementById('orb-text');
const orbAnalyzeBtn = document.getElementById('orb-analyze-btn');
const orbAutofixBtn = document.getElementById('orb-autofix-btn');
const editorContainer = document.getElementById('editor-container');

// Sidebar Elements
const menuBtn = document.getElementById('menu-btn');
const saveNewBtn = document.getElementById('save-current-btn');
const historyList = document.getElementById('history-list');
const editorTabs = document.getElementById('editor-tabs');

// File System Logic
let openFiles = []; // { id, name, model }
let activeFileId = null;

// HUD Elements
const notesBtn = document.getElementById('notes-btn');
const settingsBtn = document.getElementById('settings-btn');
const volumeBtn = document.getElementById('volume-btn');
const volumeSlider = document.getElementById('volume-slider');
const hudTextarea = document.getElementById('hud-textarea');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const fontSizeSlider = document.getElementById('font-size-slider');
const fontSizeDisplay = document.getElementById('font-size-display');
const themeBtns = document.querySelectorAll('.theme-btn');
const siteBtns = document.querySelectorAll('.site-btn');
const wordWrapToggle = document.getElementById('word-wrap-toggle');
const minimapToggle = document.getElementById('minimap-toggle');
const ligaturesToggle = document.getElementById('ligatures-toggle');

let terminalTypingInterval = null;
let currentCodeId = null;
let lastCompilationError = "";
let currentErrorDecorations = [];

// Spotlight Mouse Tracking & 3D Tilt
document.querySelectorAll('.spotlight-card, .spotlight-light-only').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
        
        if (card.classList.contains('spotlight-card')) {
            // 3D Tilt Effect
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -4; // Max 4deg tilt
            const rotateY = ((x - centerX) / centerX) * 4;
            card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        }
    });
    
    card.addEventListener('mouseleave', () => {
        if (card.classList.contains('spotlight-card')) {
            card.style.transform = 'rotateX(0deg) rotateY(0deg)';
        }
    });
});

// ---------------- LOCAL STORAGE HISTORY SYSTEM ----------------
function loadHistory() {
    return JSON.parse(localStorage.getItem('jooxl_history') || '[]');
}
function saveHistory(arr) {
    localStorage.setItem('jooxl_history', JSON.stringify(arr));
}

function renderHistory() {
    const history = loadHistory();
    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.innerHTML = '<p style="color: #666; font-size: 0.8rem; text-align: center;">No saved codes yet.</p>';
        return;
    }

    history.forEach(item => {
        const card = document.createElement('div');
        card.className = 'history-card';
        card.innerHTML = `
            <div class="history-card-header">
                <span class="history-name" title="${item.name}">${item.name}</span>
                <span class="history-date">${item.date}</span>
            </div>
            <div class="history-preview">${item.code.substring(0, 80).replace(/</g, '&lt;')}...</div>
            <div class="card-actions">
                <button class="btn-edit" title="Rename">✎</button>
                <button class="btn-delete" title="Delete">🗑</button>
            </div>
        `;

        // Load Code on click
        card.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') return; // Ignore if clicking action buttons
            if (window.editor) {
                currentCodeId = item.id;
                if (window.createTab) {
                    window.createTab(item.name, item.code, 'cpp');
                } else {
                    window.editor.setValue(item.code);
                }
                document.body.classList.remove('sidebar-open');
                if (window.audioManager && window.audioManager.playSwordDraw) window.audioManager.playSwordDraw();
            }
        });

        // Delete
        card.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm("Delete this code?")) {
                let h = loadHistory().filter(x => x.id !== item.id);
                saveHistory(h);
                if (currentCodeId === item.id) currentCodeId = null;
                renderHistory();
            }
        });

        // Rename
        card.querySelector('.btn-edit').addEventListener('click', (e) => {
            e.stopPropagation();
            const newName = prompt("Enter new name:", item.name);
            if (newName && newName.trim() !== '') {
                let h = loadHistory();
                let target = h.find(x => x.id === item.id);
                if (target) {
                    target.name = newName.trim();
                    saveHistory(h);
                    if (currentCodeId === item.id && activeFileId && openFiles) {
                        let activeFile = openFiles.find(f => f.id === activeFileId);
                        if (activeFile) {
                            activeFile.name = target.name;
                            if (window.renderTabs) window.renderTabs();
                        }
                    }
                    renderHistory();
                }
            }
        });

        historyList.appendChild(card);
    });
}

// ---------------- MONACO EDITOR SETUP ----------------
require(['vs/editor/editor.main'], function () {
    const cyberTechTheme = {
        base: 'vs-dark', inherit: true,
        rules: [
            { background: '00000000' },
            { token: 'keyword', foreground: 'ff1a1a' },
            { token: 'identifier', foreground: 'e0e0e0' },
            { token: 'string', foreground: 'ff8800' },
            { token: 'number', foreground: 'ff5500' }
        ],
        colors: {
            'editor.background': '#00000000',
            'editorSuggestWidget.background': '#0a0a0ae6',
            'editorSuggestWidget.border': '#ff5500'
        }
    };
    monaco.editor.defineTheme('cyber-tech', cyberTechTheme);

    monaco.editor.defineTheme('ocean-neon', {
        base: 'vs-dark', inherit: true,
        rules: [ { background: '00000000' }, { token: 'keyword', foreground: '00d8ff' }, { token: 'string', foreground: '00ffaa' } ],
        colors: { 'editor.background': '#00000000', 'editorSuggestWidget.background': '#0a0a0ae6', 'editorSuggestWidget.border': '#00d8ff' }
    });

    monaco.editor.defineTheme('matrix-green', {
        base: 'vs-dark', inherit: true,
        rules: [ { background: '00000000' }, { token: 'keyword', foreground: '00ff00' }, { token: 'string', foreground: '00cc00' } ],
        colors: { 'editor.background': '#00000000', 'editorSuggestWidget.background': '#0a0a0ae6', 'editorSuggestWidget.border': '#00ff00' }
    });

    monaco.editor.defineTheme('dark-plasma', {
        base: 'vs-dark', inherit: true,
        rules: [ { background: '00000000' }, { token: 'keyword', foreground: 'ff00ff' }, { token: 'string', foreground: 'aa00ff' } ],
        colors: { 'editor.background': '#00000000', 'editorSuggestWidget.background': '#0a0a0ae6', 'editorSuggestWidget.border': '#ff00ff' }
    });

    const defaultCode = `#include <iostream>\n\nint main() {\n    std::cout << "Hello JOOXL!" << std::endl;\n    return 0;\n}\n`;

    window.editor = monaco.editor.create(editorContainer, {
        theme: 'cyber-tech',
        fontFamily: "'Fira Code', monospace", fontSize: 18,
        minimap: { enabled: false }, suggestOnTriggerCharacters: true
    });

    // Initialize File System Tabs
    window.createTab = function(name, code, language) {
        const id = 'file_' + Date.now() + Math.floor(Math.random() * 1000);
        const model = monaco.editor.createModel(code, language);
        openFiles.push({ id, name, model });
        window.renderTabs();
        window.switchTab(id);
        return id;
    }

    window.switchTab = function(id) {
        activeFileId = id;
        const file = openFiles.find(f => f.id === id);
        if (file) {
            window.editor.setModel(file.model);
            currentCodeId = null; // Detach history save until we link tab to history
        }
        window.renderTabs();
    }

    window.closeTab = function(id, e) {
        if (e) e.stopPropagation();
        const index = openFiles.findIndex(f => f.id === id);
        if (index > -1) {
            openFiles[index].model.dispose();
            openFiles.splice(index, 1);
            if (openFiles.length > 0) {
                if (activeFileId === id) {
                    window.switchTab(openFiles[Math.max(0, index - 1)].id);
                } else {
                    window.renderTabs();
                }
            } else {
                window.editor.setModel(null);
                activeFileId = null;
                window.renderTabs();
            }
        }
    }

    window.renderTabs = function() {
        if (!editorTabs) return;
        editorTabs.innerHTML = '';
        openFiles.forEach(file => {
            const tab = document.createElement('div');
            tab.className = `tab ${file.id === activeFileId ? 'active' : ''}`;
            tab.onclick = () => window.switchTab(file.id);
            tab.innerHTML = `
                <span class="tab-icon">📄</span>
                <span class="tab-name" title="${file.name}">${file.name}</span>
                <button class="tab-close" onclick="window.closeTab('${file.id}', event)">&times;</button>
            `;
            editorTabs.appendChild(tab);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'add-tab-btn';
        addBtn.title = 'New File';
        addBtn.innerHTML = '+';
        addBtn.onclick = () => window.createTab('untitled.cpp', '// New file\n', 'cpp');
        editorTabs.appendChild(addBtn);
    };

    // Create Initial Tabs
    window.createTab('core_engine.cpp', defaultCode, 'cpp');
    window.createTab('utils.h', '#pragma once\n\nvoid doSomething() {\n    // utils\n}', 'cpp');
    window.switchTab(openFiles[0].id);

    // Sidebar Initialization
    renderHistory();

    let lastLength = window.editor.getValue().length;

    // Autocomplete Sword Flash
    editor.onDidChangeModelContent((e) => {
        let currLen = window.editor.getValue().length;
        if ((currLen - lastLength) > 5 && !e.isFlush) {
            if (window.audioManager && window.audioManager.playSwordDraw) window.audioManager.playSwordDraw();
            flashOverlay.classList.add('flash-active');
            setTimeout(() => flashOverlay.classList.remove('flash-active'), 50);
        }
        lastLength = currLen;

        // Auto-update history if editing a saved file
        if (currentCodeId) {
            let h = loadHistory();
            let idx = h.findIndex(x => x.id === currentCodeId);
            if (idx > -1) {
                h[idx].code = window.editor.getValue();
                saveHistory(h);
            }
        }
    });

    // Syntax Error Glitch
    monaco.editor.onDidChangeMarkers((uris) => {
        const markers = monaco.editor.getModelMarkers({ resource: editor.getModel().uri });
        const hasErrors = markers.some(m => m.severity === monaco.MarkerSeverity.Error);
        if (hasErrors) {
            if (window.audioManager && window.audioManager.playDamageHit) window.audioManager.playDamageHit();
            const card = document.getElementById('editor-card');
            card.classList.add('error-glitch-line');
            setTimeout(() => card.classList.remove('error-glitch-line'), 400);
        }
    });

    // Exhaustive Key Mapping
    editor.onKeyDown((e) => {
        const char = e.browserEvent.key;
        const pos = editor.getScrolledVisiblePosition(editor.getPosition());
        const model = editor.getModel();
        const editorPos = editor.getPosition();

        if (window.audioManager && window.audioManager.playChar) window.audioManager.playChar(char);

        if (pos) {
            if (char === 'Enter') {
                if (window.spawnLineHighlight) window.spawnLineHighlight(pos.top + 15, editorContainer.offsetWidth);
                const card = document.getElementById('editor-card');
                card.classList.remove('haptic-shake');
                void card.offsetWidth; // trigger reflow
                card.classList.add('haptic-shake');
                setTimeout(() => card.classList.remove('haptic-shake'), 150);
            } else if (window.spawnEffect) {
                let color = 'rgba(255, 85, 0, 1)'; // Neon Orange Default

                if (char === 'Backspace' && editorPos.column > 1) {
                    let charToDelete = model.getValueInRange({ startLineNumber: editorPos.lineNumber, startColumn: editorPos.column - 1, endLineNumber: editorPos.lineNumber, endColumn: editorPos.column });
                    if (/[0-9]/.test(charToDelete)) color = 'rgba(255, 26, 26, 1)'; // Neon Red
                    else if (/["']/.test(charToDelete)) color = 'rgba(255, 136, 0, 1)'; // Light Orange
                    else {
                        const word = model.getWordAtPosition({ lineNumber: editorPos.lineNumber, column: editorPos.column - 1 });
                        if (word) {
                            const keywords = ['int', 'return', 'void', 'class', 'public', 'private', 'if', 'else', 'for', 'while'];
                            if (keywords.includes(word.word)) color = 'rgba(255, 26, 26, 1)';
                            else color = 'rgba(224, 224, 224, 1)';
                        }
                    }
                }
                window.spawnEffect(char, pos.left + 15, pos.top + 15, color);
            }
        }
    });
});

// ---------------- SIDEBAR & HUD CONTROLS ----------------
function closeAllInterfaces(except) {
    if (except !== 'sidebar') {
        document.body.classList.remove('sidebar-open');
    }
    if (except !== 'notes') {
        document.body.classList.remove('notes-open');
    }
    if (except !== 'settings') {
        settingsModal.classList.remove('show');
        document.body.classList.remove('settings-open');
    }
}

menuBtn.addEventListener('click', () => {
    const isOpening = !document.body.classList.contains('sidebar-open');
    closeAllInterfaces('sidebar');
    if (isOpening) {
        document.body.classList.add('sidebar-open');
    } else {
        document.body.classList.remove('sidebar-open');
    }
    if (window.audioManager && window.audioManager.playPanelSlide) window.audioManager.playPanelSlide();
});

// HUD Logic
notesBtn.addEventListener('click', () => {
    const isOpening = !document.body.classList.contains('notes-open');
    closeAllInterfaces('notes');
    if (isOpening) {
        document.body.classList.add('notes-open');
        hudTextarea.focus();
    } else {
        document.body.classList.remove('notes-open');
    }
});

settingsBtn.addEventListener('click', () => {
    const isOpening = !settingsModal.classList.contains('show');
    closeAllInterfaces('settings');
    if (isOpening) {
        settingsModal.classList.add('show');
        document.body.classList.add('settings-open');
    } else {
        settingsModal.classList.remove('show');
        document.body.classList.remove('settings-open');
    }
    if (window.audioManager && window.audioManager.playPanelSlide) window.audioManager.playPanelSlide();
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('show');
    document.body.classList.remove('settings-open');
    if (window.audioManager && window.audioManager.playPanelSlide) window.audioManager.playPanelSlide();
});

// Settings Handlers

fontSizeSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    fontSizeDisplay.textContent = val + 'px';
    if(window.editor) {
        window.editor.updateOptions({ fontSize: parseInt(val) });
    }
});

themeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        themeBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        if(window.editor) {
            monaco.editor.setTheme(e.target.dataset.theme);
        }
    });
});

// Site Theme Logic (Colors)
const savedSiteTheme = localStorage.getItem('jooxl_site_theme') || 'orange';
document.body.setAttribute('data-site-theme', savedSiteTheme);

const colorBtns = document.querySelectorAll('.color-btn');
colorBtns.forEach(btn => {
    if (btn.dataset.site === savedSiteTheme) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }

    btn.addEventListener('click', () => {
        colorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const selectedTheme = btn.dataset.site;
        document.body.setAttribute('data-site-theme', selectedTheme);
        localStorage.setItem('jooxl_site_theme', selectedTheme);
        
        // Trigger resize event to force canvas redraws to pick up new colors quickly
        window.dispatchEvent(new Event('resize'));
    });
});

// Shape Logic (Background Patterns)
const savedSiteShape = localStorage.getItem('jooxl_site_shape') || 'orange';
document.body.setAttribute('data-site-shape', savedSiteShape);

const shapeBtns = document.querySelectorAll('.shape-btn');
shapeBtns.forEach(btn => {
    if (btn.dataset.shape === savedSiteShape) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }

    btn.addEventListener('click', () => {
        shapeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const selectedShape = btn.dataset.shape;
        document.body.setAttribute('data-site-shape', selectedShape);
        localStorage.setItem('jooxl_site_shape', selectedShape);
    });
});

if(wordWrapToggle) {
    wordWrapToggle.addEventListener('change', (e) => {
        if(window.editor) {
            window.editor.updateOptions({ wordWrap: e.target.checked ? 'on' : 'off' });
        }
    });
}

if(minimapToggle) {
    minimapToggle.addEventListener('change', (e) => {
        if(window.editor) {
            window.editor.updateOptions({ minimap: { enabled: e.target.checked } });
        }
    });
}

if(ligaturesToggle) {
    ligaturesToggle.addEventListener('change', (e) => {
        if(window.editor) {
            window.editor.updateOptions({ fontLigatures: e.target.checked });
        }
    });
}

let isMuted = false;
volumeBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    volumeBtn.classList.remove('volume-btn-anim');
    void volumeBtn.offsetWidth; // trigger reflow
    volumeBtn.classList.add('volume-btn-anim');
    volumeBtn.classList.toggle('muted', isMuted);
    
    if(window.audioManager) {
        window.audioManager.setVolume(isMuted ? 0 : 1);
    }
});

// Save HUD Notes to LocalStorage automatically
hudTextarea.value = localStorage.getItem('jooxl_hud_notes') || '';
hudTextarea.addEventListener('input', () => {
    localStorage.setItem('jooxl_hud_notes', hudTextarea.value);
});

saveNewBtn.addEventListener('click', () => {
    if (!window.editor.getModel()) return;
    const code = window.editor.getValue();
    let currentName = "New Code";
    if (activeFileId && openFiles) {
        let f = openFiles.find(x => x.id === activeFileId);
        if (f) currentName = f.name;
    }
    const name = prompt("Enter a name for this code:", currentName);
    if (name && name.trim() !== '') {
        const h = loadHistory();
        const newId = Date.now().toString();
        const dateStr = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
        h.unshift({ id: newId, name: name.trim(), code: code, date: dateStr });
        saveHistory(h);
        currentCodeId = newId;
        
        if (activeFileId && openFiles) {
            let f = openFiles.find(x => x.id === activeFileId);
            if (f) {
                f.name = name.trim();
                if (window.renderTabs) window.renderTabs();
            }
        }
        renderHistory();
        if (window.audioManager && window.audioManager.playSuccess) window.audioManager.playSuccess();
    }
});


// ---------------- REAL C++ EXECUTION ----------------
startBtn.addEventListener('click', async () => {
    if (window.audioManager && window.audioManager.playPanelSlide) window.audioManager.playPanelSlide();
    document.body.classList.add('run-mode');
    document.body.classList.remove('sidebar-open'); // Close sidebar if open
    terminalOut.classList.remove('terminal-error');

    const indicator = document.querySelector('.status-indicator');
    if(indicator) indicator.className = 'status-indicator compiling';

    if (terminalTypingInterval) clearInterval(terminalTypingInterval);
    terminalOut.innerHTML = '>>> COMPILING... PLEASE WAIT_';

    if (window.audioManager && window.audioManager.startProcessingLoop) window.audioManager.startProcessingLoop();

    const payload = {
        code: window.editor.getValue(),
        compiler: "gcc-head",
        stdin: terminalInput.value,
        save: false
    };

    let resultText = "";
    let isError = false;

    try {
        await new Promise(r => setTimeout(r, 1000));
        const response = await fetch("https://wandbox.org/api/compile.json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.status === "0") {
            resultText = ">>> EXECUTION SUCCESSFUL:\n\n" + (data.program_message || data.program_output || "No output.");
            lastCompilationError = "";
        } else if (data.status !== undefined) {
            isError = true;
            resultText = ">>> COMPILATION OR RUNTIME ERROR:\n\n" + (data.compiler_error || data.program_error || "Unknown Error");
            lastCompilationError = data.compiler_error || data.program_error || "";
        } else {
            isError = true;
            resultText = ">>> API ERROR: Unexpected response format.\n" + JSON.stringify(data, null, 2);
            lastCompilationError = resultText;
        }
    } catch (err) {
        isError = true;
        resultText = ">>> CONNECTION ERROR:\nFailed to reach execution server.\n" + err.message;
    }

    if (window.audioManager && window.audioManager.stopProcessingLoop) window.audioManager.stopProcessingLoop();

    if (isError) {
        if(indicator) indicator.className = 'status-indicator error';
        terminalOut.classList.add('terminal-error');
        if (window.audioManager && window.audioManager.playErrorAlert) window.audioManager.playErrorAlert();
        triggerAIAnalysis(resultText);
    } else {
        if(indicator) indicator.className = 'status-indicator success';
        if (window.audioManager && window.audioManager.playSuccess) window.audioManager.playSuccess();
    }

    terminalOut.innerHTML = '';
    let i = 0;
    terminalTypingInterval = setInterval(() => {
        if (i < resultText.length) {
            terminalOut.innerHTML += resultText.charAt(i);
            if (i % 3 === 0 && window.audioManager && window.audioManager.playTelemetry && !isError) window.audioManager.playTelemetry();
            i++;
        } else {
            clearInterval(terminalTypingInterval);
        }
    }, 15);
});

backBtn.addEventListener('click', () => {
    if (window.audioManager && window.audioManager.playPanelSlide) window.audioManager.playPanelSlide();
    document.body.classList.remove('run-mode');
    if (terminalTypingInterval) clearInterval(terminalTypingInterval);
});

// ---------------- CYBER ORB (FIXED & ACTIONS) ----------------

// Click toggles menu
cyberOrb.addEventListener('click', (e) => {
    if (e.target.closest('.orb-btn') || e.target.closest('#orb-text')) return;

    orbMenu.classList.toggle('show');
    if (window.audioManager && window.audioManager.playRadioStatic) window.audioManager.playRadioStatic();

    if (!orbMenu.classList.contains('show')) {
        cyberOrb.classList.remove('error-state');
        orbText.classList.remove('show');
        if (window.editor) {
            currentErrorDecorations = window.editor.deltaDecorations(currentErrorDecorations, []);
        }
    }
});

// "أين خطأي؟" (Where is my error?)
orbAnalyzeBtn.addEventListener('click', () => {
    if (!lastCompilationError) {
        showOrbMessage("لا يوجد خطأ محفوظ حالياً. قم بتشغيل الكود أولاً.");
        cyberOrb.classList.remove('error-state');
        return;
    }

    triggerAIAnalysis(lastCompilationError);
});

// "الإصلاح التلقائي" (Auto-Fix)
orbAutofixBtn.addEventListener('click', () => {
    if (!lastCompilationError) {
        showOrbMessage("لا يوجد خطأ محفوظ حالياً ليتم إصلاحه.");
        return;
    }

    let code = window.editor.getValue();
    let fixed = false;

    // Extract line number
    const lineMatch = lastCompilationError.match(/prog\.cc:(\d+):/);
    if (lineMatch && lineMatch[1]) {
        let lineNum = parseInt(lineMatch[1]);

        if (lastCompilationError.includes("expected ';'")) {
            // Fix missing semicolon on previous line (usually)
            const lines = code.split("\n");
            if (lineNum > 1 && !lines[lineNum - 2].trim().endsWith(';') && !lines[lineNum - 2].trim().endsWith('}') && !lines[lineNum - 2].trim().endsWith('{')) {
                lines[lineNum - 2] += ";";
                window.editor.setValue(lines.join("\n"));
                fixed = true;
                showOrbMessage("✨ تم إصلاح الخطأ: إضافة فاصلة منقوطة (;).");
            } else {
                lines[lineNum - 1] += ";";
                window.editor.setValue(lines.join("\n"));
                fixed = true;
                showOrbMessage("✨ تم إضافة فاصلة منقوطة (;).");
            }
        }
    }

    if (!fixed && lastCompilationError.includes("No such file or directory")) {
        window.editor.setValue("#include <iostream>\n" + code);
        fixed = true;
        showOrbMessage("✨ تم إضافة مكتبة <iostream>.");
    }

    if (!fixed) {
        showOrbMessage("عذراً، هذا الخطأ معقد ولا يمكنني إصلاحه تلقائياً.");
    } else {
        if (window.audioManager && window.audioManager.playSuccess) window.audioManager.playSuccess();
        cyberOrb.classList.remove('error-state');
    }
});

// (Removed Perf and Snippet buttons)

function triggerAIAnalysis(errorText) {
    let explanation = "هناك خطأ برمجي (Syntax Error). راجع الرسالة الحمراء لمعرفة السطر المتضرر.";
    let lineNum = null;

    // Extract line number e.g. prog.cc:5:10
    const lineMatch = errorText.match(/prog\.cc:(\d+):/);
    if (lineMatch && lineMatch[1]) {
        lineNum = parseInt(lineMatch[1]);
    }

    if (errorText.includes("expected ';'")) explanation = "نسيت وضع فاصلة منقوطة (;) في نهاية السطر.";
    else if (errorText.includes("was not declared in this scope")) explanation = "استخدمت متغيراً ولم تقم بتعريفه، أو نسيت std::.";
    else if (errorText.includes("expected '}'")) explanation = "تأكد من إغلاق جميع الأقواس المعقوفة }.";
    else if (errorText.includes("expected primary-expression")) explanation = "يوجد خطأ في صياغة المعادلة أو التعبير البرمجي.";
    else if (errorText.includes("no match for 'operator")) explanation = "خطأ في استخدام المعاملات (مثل << أو >>).";
    else if (errorText.includes("No such file or directory")) explanation = "حاولت استدعاء مكتبة (#include) غير موجودة.";

    let finalMsg = "❌ " + explanation;
    if (lineNum) {
        finalMsg += " (الخطأ تقريباً في السطر " + lineNum + ")";
        highlightErrorLine(lineNum);
    }

    showOrbMessage(finalMsg);
}

function highlightErrorLine(lineNum) {
    if (!window.editor) return;
    currentErrorDecorations = window.editor.deltaDecorations(currentErrorDecorations, [
        {
            range: new monaco.Range(lineNum, 1, lineNum, 1),
            options: {
                isWholeLine: true,
                className: 'faint-pulse-line'
            }
        }
    ]);
}

function showOrbMessage(msg) {
    orbMenu.classList.add('show');
    orbText.classList.add('show');

    if (window.audioManager && window.audioManager.playRadioStatic) window.audioManager.playRadioStatic();

    const contentBox = document.getElementById('orb-text-content');
    contentBox.innerHTML = '';
    let i = 0;
    const typeInterval = setInterval(() => {
        if (i < msg.length) {
            contentBox.innerHTML += msg.charAt(i);
            i++;
        } else {
            clearInterval(typeInterval);
        }
    }, 40);
}
