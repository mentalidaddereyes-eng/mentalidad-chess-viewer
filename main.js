// Inicialización del visor PGN
const game = new Chess();
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

// Cargar PGN desde Drive o GitHub
async function loadLatestPGN() {
  const response = await fetch('https://tu-enlace-directo-al-pgn.txt'); // reemplaza con tu enlace real
  const pgn = await response.text();
  game.load_pgn(pgn);
  renderBoard();
}
window.addEventListener('load', loadLatestPGN);

// Renderizar el tablero
function renderBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Aquí iría el código para dibujar el tablero y piezas
}

// Modo entrenamiento
let trainingMode = false;
document.getElementById('trainingToggle').onclick = () => {
  trainingMode = !trainingMode;
};

function showEval(ev, depth, best) {
  const box = document.getElementById('evalBox');
  if (trainingMode) {
    box.textContent = '¿Cuál crees que es la mejor jugada? 🤔';
    const revealBtn = document.createElement('button');
    revealBtn.textContent = 'Revelar';
    revealBtn.onclick = () => {
      box.textContent = `Eval: ${ev} | Profundidad: ${depth} | Mejor jugada: ${best}`;
    };
    box.appendChild(revealBtn);
  } else {
    box.textContent = `Eval: ${ev} | Profundidad: ${depth} | Mejor jugada: ${best}`;
  }
}
