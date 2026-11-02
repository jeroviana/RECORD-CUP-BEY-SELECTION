// --- CONFIGURACIÓN ---
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQdvrByiafuzyO8IkKTEiNa9wVqJcOvSXLQtt7pWtF1a4TCAzDzxfsCwmVBcchJZaxHqkDKEjHI9btA/pub?gid=0&single=true&output=csv";

// --- ESTADO GLOBAL ---
let allBeys = [];
let selectedBeys = [];
let currentPoints = 10;
let playerName = "";
const MAX_BEYS = 3;

// --- ELEMENTOS DEL DOM ---
const screens = {
    welcome: document.getElementById('screen-welcome'),
    builder: document.getElementById('screen-builder'),
    success: document.getElementById('screen-success')
};
const inputName = document.getElementById('player-name');
const btnStart = document.getElementById('btn-start');
const displayName = document.getElementById('display-name');
const pointsDisplay = document.getElementById('points-available');
const headerMiniatures = document.getElementById('header-miniatures');
const largePreview = document.getElementById('large-preview');
const beyGrid = document.getElementById('bey-grid');
const searchBar = document.getElementById('search-bar');
const filtersContainer = document.getElementById('filters');
const footerAction = document.getElementById('footer-action');
const btnDefineDeck = document.getElementById('btn-define-deck');
const btnReset = document.getElementById('btn-reset');
const warningMsg = document.getElementById('warning-msg');
const successPlayerName = document.getElementById('success-player-name');
const finalDeckDisplay = document.getElementById('final-deck-display');
const finalPointsText = document.getElementById('final-points-text');
const btnRestart = document.getElementById('btn-restart');

// --- FUNCIÓN PARA PARSEAR EL CSV ---
function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    if (lines.length < 4) return [];

    // Fila 0: Valores, Fila 1: Nombre 1, Fila 2: Nombre 2, Fila 3: Link
    const pointsRow = lines[0].split(',').map(p => p.replace(/"/g, '').trim());
    const name1Row = lines[1].split(',').map(n => n.replace(/"/g, '').trim());
    const name2Row = lines[2].split(',').map(n => n.replace(/"/g, '').trim());
    const imgRow = lines[3].split(',').map(u => u.replace(/"/g, '').trim());

    const beys = [];
    
    for (let col = 0; col < pointsRow.length; col++) {
        const value = parseInt(pointsRow[col]) || 0;
        const name1 = name1Row[col] || '';
        const name2 = name2Row[col] || '';
        const imgUrl = imgRow[col] || '';

        const finalName = name2 || name1;

        if (finalName && imgUrl.startsWith('http') && value > 0) {
            beys.push({
                id: col,
                name: finalName,
                nameAlt: name1,
                value: value,
                img: imgUrl
            });
        }
    }
    return beys;
}

// --- CARGA DE DATOS DESDE GOOGLE SHEETS ---
async function loadBeysFromSheet() {
    try {
        beyGrid.innerHTML = '<p style="color:white; text-align:center; grid-column: 1/-1; padding: 2rem;">Cargando beyblades desde el Sheet...</p>';
        
        const response = await fetch(SHEET_URL);
        if (!response.ok) throw new Error('Error HTTP: ' + response.status);
        
        const csvText = await response.text();
        const loadedBeys = parseCSV(csvText);
        
        if (loadedBeys.length === 0) {
            throw new Error('No se encontraron beys válidos. Revisa el formato del Sheet.');
        }

        allBeys = loadedBeys.sort((a, b) => b.value - a.value);
        renderGrid(allBeys);
        
    } catch (error) {
        console.error("Error detallado:", error);
        beyGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: #ff3333; padding: 2rem; background: rgba(255,0,0,0.1); border-radius: 10px; border: 1px solid #ff3333;">
                <h3>⚠️ Error al cargar el Google Sheet</h3>
                <p>Motivo: ${error.message}</p>
                <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #ff3333; color: white; border: none; border-radius: 5px; cursor: pointer;">Reintentar</button>
            </div>
        `;
        // Datos de prueba por si falla
        allBeys = [
            { id: 1, name: "Wizard Rod (Prueba)", value: 7, img: "https://placehold.co/200x200/ff3333/white?text=Wizard+Rod" },
            { id: 2, name: "Shark Scale (Prueba)", value: 7, img: "https://placehold.co/200x200/ff3333/white?text=Shark+Scale" },
            { id: 3, name: "Aero Pegasus (Prueba)", value: 6, img: "https://placehold.co/200x200/ff9933/white?text=Aero+Pegasus" },
            { id: 4, name: "Clock Mirage (Prueba)", value: 4, img: "https://placehold.co/200x200/33cc33/white?text=Clock+Mirage" },
            { id: 5, name: "Buster Sword (Prueba)", value: 2, img: "https://placehold.co/200x200/9933ff/white?text=Buster+Sword" }
        ].sort((a, b) => b.value - a.value);
        renderGrid(allBeys);
    }
}

// --- NAVEGACIÓN ---
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
    window.scrollTo(0, 0);
}

function startBuilder() {
    playerName = inputName.value.trim();
    if(!playerName) {
        alert("Por favor, ingresa un nombre.");
        return;
    }
    displayName.textContent = playerName;
    showScreen('builder');
}

// --- LÓGICA DEL CONSTRUCTOR ---
function renderGrid(beysToRender) {
    beyGrid.innerHTML = '';
    beysToRender.forEach(bey => {
        const isSelected = selectedBeys.some(b => b.id === bey.id);
        const canAfford = bey.value <= currentPoints;
        
        let classes = 'bey-card';
        if (isSelected) classes += ' selected';
        if (!canAfford && !isSelected && selectedBeys.length < MAX_BEYS) classes += ' disabled';
        if (selectedBeys.length >= MAX_BEYS && !isSelected) classes += ' disabled';

        const isValidUrl = bey.img && bey.img.startsWith('http');
        const finalImg = isValidUrl ? bey.img : 'https://placehold.co/200x200/333/white?text=Sin+Imagen';

        const card = document.createElement('div');
        card.className = classes;
        card.innerHTML = `
            <img src="${finalImg}" alt="${bey.name}" onerror="this.src='https://placehold.co/200x200/333/white?text=Error'">
            <div class="bey-name" title="${bey.name}">${bey.name}</div>
            <div class="bey-value val-${bey.value}">+${bey.value}</div>
            ${!isSelected 
                ? `<div class="card-actions">Seleccionar</div>` 
                : `<div class="card-actions" style="background:#ff3333; color:white;">Quitar</div>`}
        `;

        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('card-actions') || e.target.closest('.bey-card')) {
                toggleSelection(bey);
            }
        });

        beyGrid.appendChild(card);
    });
}

function filterAndRender() {
    const searchTerm = searchBar.value.toLowerCase();
    const activeFilterEl = document.querySelector('.filter-btn.active');
    if (!activeFilterEl) return; 
    
    const activeFilter = activeFilterEl.dataset.filter;
    
    const filtered = allBeys.filter(bey => {
        const matchesSearch = bey.name.toLowerCase().includes(searchTerm) || 
                              (bey.nameAlt && bey.nameAlt.toLowerCase().includes(searchTerm));
        const matchesFilter = activeFilter === 'all' || bey.value.toString() === activeFilter;
        return matchesSearch && matchesFilter;
    });
    
    renderGrid(filtered);
}

function toggleSelection(bey) {
    const index = selectedBeys.findIndex(b => b.id === bey.id);
    
    if (index > -1) {
        selectedBeys.splice(index, 1);
        currentPoints += bey.value;
    } else {
        if (selectedBeys.length >= MAX_BEYS) return;
        if (bey.value > currentPoints) return;
        
        selectedBeys.push(bey);
        currentPoints -= bey.value;
    }
    
    updateUI();
}

function updateUI() {
    pointsDisplay.textContent = currentPoints;
    
    headerMiniatures.innerHTML = '';
    selectedBeys.forEach(b => {
        const img = document.createElement('img');
        img.src = b.img;
        img.className = 'mini-bey';
        img.title = b.name;
        headerMiniatures.appendChild(img);
    });

    largePreview.innerHTML = '';
    selectedBeys.forEach((b) => {
        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.cursor = 'pointer';
        
        const img = document.createElement('img');
        img.src = b.img;
        img.className = 'large-bey-img';
        img.title = b.name;
        
        container.addEventListener('click', (e) => {
            if(container.querySelector('.confirm-msg')) return;

            const confirmDiv = document.createElement('div');
            confirmDiv.className = 'confirm-msg';
            confirmDiv.style.position = 'absolute';
            confirmDiv.style.top = '-40px';
            confirmDiv.style.left = '50%';
            confirmDiv.style.transform = 'translateX(-50%)';
            confirmDiv.style.background = '#ff3333';
            confirmDiv.style.color = 'white';
            confirmDiv.style.padding = '5px 10px';
            confirmDiv.style.borderRadius = '5px';
            confirmDiv.style.whiteSpace = 'nowrap';
            confirmDiv.style.zIndex = '10';
            confirmDiv.style.fontSize = '0.9rem';
            confirmDiv.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
            confirmDiv.innerHTML = `¿Quitar este bey? <span style="cursor:pointer; font-weight:bold; margin-left:8px; font-size:1.1rem;">✕</span>`;
            
            confirmDiv.querySelector('span').addEventListener('click', (ev) => {
                ev.stopPropagation();
                toggleSelection(b);
            });
            
            container.appendChild(confirmDiv);
            setTimeout(() => { if(confirmDiv.parentNode) confirmDiv.remove(); }, 3000);
        });
        
        container.appendChild(img);
        largePreview.appendChild(container);
    });

    filterAndRender();
    
    if (selectedBeys.length === MAX_BEYS) {
        footerAction.classList.remove('hidden');
        if (currentPoints > 0) {
            warningMsg.classList.remove('hidden');
        } else {
            warningMsg.classList.add('hidden');
        }
    } else {
        footerAction.classList.add('hidden');
    }
}

function resetDeck() {
    selectedBeys = [];
    currentPoints = 10;
    searchBar.value = '';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
    if (allBtn) allBtn.classList.add('active');
    updateUI();
}

// --- PANTALLA DE ÉXITO ---
function showSuccessScreen() {
    successPlayerName.textContent = playerName;
    finalPointsText.textContent = `Puntos gastados: ${10 - currentPoints} / 10`;
    
    finalDeckDisplay.innerHTML = '';
    selectedBeys.forEach(b => {
        const img = document.createElement('img');
        img.src = b.img;
        img.className = 'final-bey-img';
        img.title = b.name;
        finalDeckDisplay.appendChild(img);
    });
    
    showScreen('success');
    startConfetti();
}

// --- CONFETI SIMPLE ---
function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const colors = ['#ff0055', '#00e5ff', '#00ff88', '#ffcc00', '#9933ff'];
    
    for(let i=0; i<150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            w: Math.random() * 10 + 5,
            h: Math.random() * 10 + 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            speedY: Math.random() * 3 + 2,
            speedX: Math.random() * 2 - 1,
            rot: Math.random() * 360,
            rotSpeed: Math.random() * 5 - 2.5
        });
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = false;
        
        particles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            p.rot += p.rotSpeed;
            
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot * Math.PI / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
            ctx.restore();
            
            if (p.y < canvas.height) active = true;
        });
        
        if (active) {
            requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    animate();
}

// --- INICIALIZACIÓN SEGURA ---
function init() {
    // 1. Conectar botones primero (para que funcionen siempre)
    try {
        if (btnStart) btnStart.addEventListener('click', startBuilder);
        if (searchBar) searchBar.addEventListener('input', filterAndRender);
        if (btnReset) btnReset.addEventListener('click', resetDeck);
        if (btnDefineDeck) btnDefineDeck.addEventListener('click', showSuccessScreen);
        if (btnRestart) btnRestart.addEventListener('click', () => {
            resetDeck();
            showScreen('welcome');
        });
        
        if (filtersContainer) {
            filtersContainer.addEventListener('click', (e) => {
                if(e.target.classList.contains('filter-btn')) {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    filterAndRender();
                }
            });
        }

        if (inputName) {
            inputName.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') startBuilder();
            });
        }
    } catch (e) {
        console.error("Error al conectar los botones:", e);
    }

    // 2. Cargar datos
    loadBeysFromSheet();
}

// Arrancar todo
// --- ARRANQUE FORZADO A PRUEBA DE BALAS ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM listo. Conectando botones primero...");
    
    // 1. Conectar el botón de Continuar DIRECTAMENTE (sin depender de init)
    const btnStartDirect = document.getElementById('btn-start');
    const inputNameDirect = document.getElementById('player-name');
    
    if (btnStartDirect) {
        btnStartDirect.addEventListener('click', () => {
            const name = inputNameDirect.value.trim();
            if (!name) {
                alert("Por favor, ingresa un nombre.");
                return;
            }
            // Cambiar de pantalla manualmente
            document.getElementById('screen-welcome').classList.remove('active');
            document.getElementById('screen-builder').classList.add('active');
            document.getElementById('display-name').textContent = name;
            window.scrollTo(0, 0);
        });
        console.log("Botón Continuar conectado con éxito.");
    } else {
        console.error("No se encontró el botón btn-start en el HTML.");
    }

    // 2. Conectar el resto de botones
    try {
        init();
    } catch (e) {
        console.error("Error en init:", e);
    }
});
