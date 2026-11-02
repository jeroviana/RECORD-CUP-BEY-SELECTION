// --- CONFIGURACIÓN ---
// El link de tu Google Sheet publicado como CSV
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

// --- FUNCIÓN PARA PARSEAR EL CSV DE GOOGLE SHEETS ---
function parseCSV(text) {
    // Dividimos el texto en filas
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];

    // La primera fila contiene los puntos (Fila 1)
    const pointsRow = lines[0].split(',');
    
    const beys = [];
    
    // Empezamos desde la fila 1 (índice 1), saltando de 2 en 2
    // porque la fila actual tiene los nombres y la siguiente tiene la imagen.
    for (let i = 1; i < lines.length; i += 2) {
        if (!lines[i] || !lines[i + 1]) break; // Seguridad por si falta la fila de imagen

        const nameRow = lines[i].split(',');
        const imgRow = lines[i + 1].split(',');

        // Limpiamos las comillas y espacios en blanco
        const name1 = nameRow[0] ? nameRow[0].replace(/"/g, '').trim() : '';
        const name2 = nameRow[1] ? nameRow[1].replace(/"/g, '').trim() : '';
        const imgUrl = imgRow[2] ? imgRow[2].replace(/"/g, '').trim() : '';

        // Usamos el segundo nombre si existe, sino el primero
        const finalName = name2 || name1;

        // Buscamos el valor en la primera fila.
        // Como cada bey ocupa una columna (A para nombre1, B para nombre2, C para imagen),
        // el valor del bey en esa columna está en la fila 0.
        let value = 0;
        // El índice de la columna del bey es (i-1) / 2 asumiendo que cada bey ocupa 2 filas y 1 columna.
        // Pero para ser más precisos, usamos el índice del nombre1 (columna A, índice 0) o nombre2 (columna B, índice 1).
        // Para simplificar, si estamos en la fila i, el valor está en pointsRow en la misma posición de columna que el nombre.
        // Como el bey está en la columna 0 (A) para nombre1, o 1 (B) para nombre2, 
        // y los puntos están en la misma columna, usamos el índice de la columna del nombre.
        // Si el bey está en la columna 0 (A), el valor está en pointsRow[0].
        // Si está en la columna 1 (B), el valor está en pointsRow[1].
        // Pero en tu hoja, parece que cada bey ocupa su propia columna, así que el valor está en pointsRow[i-1] (porque i empieza en 1).
        // Ajustamos para que tome el valor correcto de la columna del bey.
        // El bey en la columna A (índice 0) tiene su valor en pointsRow[0].
        // El bey en la columna B (índice 1) tiene su valor en pointsRow[1].
        // Como estamos iterando de 2 en 2 filas, la columna del bey es (i-1)/2.
        const colIndex = Math.floor((i - 1) / 2);
        if (pointsRow[colIndex]) {
            value = parseInt(pointsRow[colIndex].replace(/"/g, '').trim()) || 0;
        }

        // Si no encontramos valor, intentamos con el índice directo
        if (value === 0 && pointsRow[i-1]) {
            value = parseInt(pointsRow[i-1].replace(/"/g, '').trim()) || 0;
        }

        // Solo agregamos si tiene nombre e imagen válidos
        if (finalName && imgUrl) {
            beys.push({
                id: i, // ID único
                name: finalName,
                nameAlt: name1, // Guardamos el otro nombre por si acaso
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
        // Mostramos mensaje de carga
        beyGrid.innerHTML = '<p style="color:white; text-align:center; grid-column: 1/-1; padding: 2rem;">Cargando beyblades desde el Sheet...</p>';
        
        const response = await fetch(SHEET_URL);
        if (!response.ok) throw new Error('Error al cargar el Sheet. Verifica que esté publicado como CSV.');
        
        const csvText = await response.text();
        const loadedBeys = parseCSV(csvText);
        
        if (loadedBeys.length === 0) {
            throw new Error('No se encontraron beys válidos. Revisa la estructura del Sheet.');
        }

        // Ordenamos de mayor a menor valor (los de 7 puntos primero)
        allBeys = loadedBeys.sort((a, b) => b.value - a.value);
        
        // Renderizamos la cuadrícula
        renderGrid(allBeys);
        
    } catch (error) {
        console.error(error);
        beyGrid.innerHTML = `<p style="color:#ff3333; text-align:center; grid-column: 1/-1; padding: 2rem; font-weight: bold;">
            Error al cargar los datos.<br>
            Asegúrate de que el Sheet esté publicado como CSV y que el link sea correcto.<br>
            <small>${error.message}</small>
        </p>`;
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
        
        // Determinar clases
        let classes = 'bey-card';
        if (isSelected) classes += ' selected';
        
        // Si no lo puede pagar Y no está seleccionado Y no tiene los 3 beys, se desactiva (gris)
        if (!canAfford && !isSelected && selectedBeys.length < MAX_BEYS) classes += ' disabled';
        
        // Si ya tiene 3 beys, los demás no seleccionados se atenúan
        if (selectedBeys.length >= MAX_BEYS && !isSelected) classes += ' disabled';

        const card = document.createElement('div');
        card.className = classes;
        card.innerHTML = `
            <img src="${bey.img}" alt="${bey.name}" onerror="this.src='https://placehold.co/200x200/333/white?text=Img+Error'">
            <div class="bey-name" title="${bey.name}">${bey.name}</div>
            <div class="bey-value val-${bey.value}">+${bey.value}</div>
            ${!isSelected 
                ? `<div class="card-actions">Seleccionar</div>` 
                : `<div class="card-actions" style="background:#ff3333; color:white;">Quitar</div>`}
        `;

        // Lógica de click en la tarjeta
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('card-actions') || e.target.closest('.bey-card')) {
                toggleSelection(bey, card);
            }
        });

        beyGrid.appendChild(card);
    });
}

function filterAndRender() {
    const searchTerm = searchBar.value.toLowerCase();
    const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
    
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
        // Ya está seleccionado -> Quitarlo
        selectedBeys.splice(index, 1);
        currentPoints += bey.value;
    } else {
        // No está seleccionado -> Intentar agregarlo
        if (selectedBeys.length >= MAX_BEYS) return; // Ya tiene 3
        if (bey.value > currentPoints) return; // No le alcanza
        
        selectedBeys.push(bey);
        currentPoints -= bey.value;
    }
    
    updateUI();
}

function updateUI() {
    // Actualizar Puntos
    pointsDisplay.textContent = currentPoints;
    
    // Actualizar Miniaturas Header
    headerMiniatures.innerHTML = '';
    selectedBeys.forEach(b => {
        const img = document.createElement('img');
        img.src = b.img;
        img.className = 'mini-bey';
        img.title = b.name;
        headerMiniatures.appendChild(img);
    });

    // Actualizar Previsualización Grande (Centro)
    largePreview.innerHTML = '';
    selectedBeys.forEach((b) => {
        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.cursor = 'pointer';
        
        const img = document.createElement('img');
        img.src = b.img;
        img.className = 'large-bey-img';
        img.title = b.name;
        
        // Al hacer click en la previsualización grande, preguntar si cambiar (sin ventanas)
        container.addEventListener('click', (e) => {
            // Evitar que se creen múltiples mensajes
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
                toggleSelection(b); // Lo quita
            });
            
            container.appendChild(confirmDiv);
            
            // Auto-eliminar el mensaje después de 3 seg
            setTimeout(() => { if(confirmDiv.parentNode) confirmDiv.remove(); }, 3000);
        });
        
        container.appendChild(img);
        largePreview.appendChild(container);
    });

    // Volver a renderizar la cuadrícula para aplicar estados de gris/desactivado
    filterAndRender();
    
    // Mostrar/Ocultar Footer y Botón de Definir
    if (selectedBeys.length === MAX_BEYS) {
        footerAction.classList.remove('hidden');
        
        // Si sobran puntos, mostrar advertencia
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
    document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
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

// --- CONFETI SIMPLE (Canvas) ---
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
            // Limpiar el canvas cuando termine
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    animate();
}

// --- INICIALIZACIÓN ---
function init() {
    // Cargamos los datos del Sheet
    loadBeysFromSheet();
    
    // Event Listeners
    btnStart.addEventListener('click', startBuilder);
    searchBar.addEventListener('input', filterAndRender);
    btnReset.addEventListener('click', resetDeck);
    btnDefineDeck.addEventListener('click', showSuccessScreen);
    btnRestart.addEventListener('click', () => {
        resetDeck();
        showScreen('welcome');
    });
    
    // Filtros
    filtersContainer.addEventListener('click', (e) => {
        if(e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterAndRender();
        }
    });

    // Permitir presionar "Enter" en el input del nombre
    inputName.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            startBuilder();
        }
    });
}

// Arrancar todo
init();
