// Canvas 定义
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const effectCanvas = document.getElementById('effects');
const eCtx = effectCanvas.getContext('2d');
const boardLayer = document.createElement('canvas');
const boardCtx = boardLayer.getContext('2d');

// DOM 引用
const elements = {
    status: document.getElementById('status'),
    timer: document.getElementById('timer'),
    p1Card: document.getElementById('p1-card'),
    p2Card: document.getElementById('p2-card'),
    p2Name: document.getElementById('p2-name'),
    moveCount: document.getElementById('move-count'),
    undoBtn: document.getElementById('undo-btn'),
    restartBtn: document.getElementById('restart-btn'),
    modeSelect: document.getElementById('mode-select'),
    difficultySelect: document.getElementById('difficulty-select'),
    renjuToggle: document.getElementById('renju-toggle'),
    soundToggle: document.getElementById('sound-toggle'),
    particleToggle: document.getElementById('particle-toggle'),
    eloScore: document.getElementById('elo-score'),
    rankName: document.getElementById('rank-name'),
    powerFill: document.getElementById('power-fill')
};

// 游戏常量
const size = 15;
const cellSize = 40;
const padding = cellSize / 2;
const gridExtent = canvas.width - padding;
const ELO_STORAGE_KEY = 'gomoku_elo';
const ranks = ['棋坛新手', '业余棋手', '棋局老手', '馆主高手', '职业强者', '棋圣'];

boardLayer.width = canvas.width;
boardLayer.height = canvas.height;

// 游戏状态
let board = [];
let history = [];
let currentPlayer = 1; // 1: 黑, 2: 白
let gameOver = false;
let mode = elements.modeSelect.value;
let difficulty = parseInt(elements.difficultySelect.value, 10);
let lastMove = null;
let hoveredCell = null;
let timerInterval = null;
let seconds = 0;
let animatingStone = null;
let particles = [];
let aiThinking = false;
let aiTurnTimeout = null;
let resultTimeout = null;
let stoneFrame = null;
let particleFrame = null;
let audioCtx = null;
let elo = loadElo();

buildBoardLayer();

function loadElo() {
    try {
        const saved = Number(localStorage.getItem(ELO_STORAGE_KEY));
        return Number.isFinite(saved) && saved >= 800 ? Math.round(saved) : 1000;
    } catch (error) {
        return 1000;
    }
}

function persistElo() {
    try {
        localStorage.setItem(ELO_STORAGE_KEY, String(elo));
    } catch (error) {
        // 忽略本地存储异常，不影响对局
    }
}

function buildBoardLayer() {
    boardCtx.clearRect(0, 0, boardLayer.width, boardLayer.height);
    boardCtx.strokeStyle = 'rgba(44, 62, 80, 0.7)';
    boardCtx.lineWidth = 1;

    for (let i = 0; i < size; i++) {
        boardCtx.beginPath();
        boardCtx.moveTo(padding, i * cellSize + padding);
        boardCtx.lineTo(gridExtent, i * cellSize + padding);
        boardCtx.stroke();
    }

    for (let i = 0; i < size; i++) {
        boardCtx.beginPath();
        boardCtx.moveTo(i * cellSize + padding, padding);
        boardCtx.lineTo(i * cellSize + padding, gridExtent);
        boardCtx.stroke();
    }

    const stars = [[3, 3], [11, 3], [3, 11], [11, 11], [7, 7]];
    boardCtx.fillStyle = 'rgba(44, 62, 80, 0.9)';
    for (const [r, c] of stars) {
        boardCtx.beginPath();
        boardCtx.arc(c * cellSize + padding, r * cellSize + padding, 4, 0, Math.PI * 2);
        boardCtx.fill();
    }
}

function clearPendingActions() {
    if (aiTurnTimeout !== null) {
        clearTimeout(aiTurnTimeout);
        aiTurnTimeout = null;
    }
    if (resultTimeout !== null) {
        clearTimeout(resultTimeout);
        resultTimeout = null;
    }
    if (stoneFrame !== null) {
        cancelAnimationFrame(stoneFrame);
        stoneFrame = null;
    }
    if (particleFrame !== null) {
        cancelAnimationFrame(particleFrame);
        particleFrame = null;
    }
}

function clearEffects() {
    particles = [];
    eCtx.clearRect(0, 0, effectCanvas.width, effectCanvas.height);
}

// 1. 初始化
function init() {
    clearPendingActions();
    board = Array.from({ length: size }, () => Array(size).fill(0));
    history = [];
    currentPlayer = 1;
    gameOver = false;
    aiThinking = false;
    lastMove = null;
    hoveredCell = null;
    animatingStone = null;
    clearEffects();
    stopTimer();
    seconds = 0;
    elements.timer.innerText = '00:00';
    updateUI();
    render();
    startTimer();
}

// 2. 核心渲染逻辑
function render() {
    drawBoard();
    drawPieces();
    drawHoverStone();
    if (lastMove) highlightLastMove();
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(boardLayer, 0, 0);
}

function drawPieces() {
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (animatingStone && animatingStone.r === r && animatingStone.c === c) {
                continue;
            }
            if (board[r][c] !== 0) {
                drawStone(r, c, board[r][c]);
            }
        }
    }
    if (animatingStone) {
        drawStone(animatingStone.r, animatingStone.c, animatingStone.p, animatingStone.alpha, animatingStone.scale);
    }
}

function drawHoverStone() {
    if (!hoveredCell || gameOver || aiThinking || animatingStone) {
        return;
    }
    if (board[hoveredCell.r][hoveredCell.c] !== 0) {
        return;
    }
    drawStone(hoveredCell.r, hoveredCell.c, currentPlayer, 0.25, 1);
}

function drawStone(r, c, player, alpha = 1, scale = 1) {
    const x = padding + c * cellSize;
    const y = padding + r * cellSize;
    ctx.save();
    ctx.globalAlpha = alpha;

    const shadowSize = 8 * scale;
    ctx.shadowBlur = shadowSize;
    ctx.shadowOffsetX = 3 * scale;
    ctx.shadowOffsetY = 3 * scale;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';

    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);

    const grad = ctx.createRadialGradient(-5, -5, 2, 0, 0, 17);
    if (player === 1) {
        grad.addColorStop(0, '#555');
        grad.addColorStop(1, '#000');
    } else {
        grad.addColorStop(0, '#fff');
        grad.addColorStop(1, '#ccc');
    }

    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
}

function highlightLastMove() {
    const x = padding + lastMove.c * cellSize;
    const y = padding + lastMove.r * cellSize;
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
}

// 3. 音效系统
function playStoneSound() {
    if (!elements.soundToggle.checked) {
        return;
    }

    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800 + Math.random() * 100, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } catch (error) {
        // 音频不可用时静默降级
    }
}

// 4. 特效系统
function createParticles(x, y, color) {
    for (let i = 0; i < 30; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            radius: Math.random() * 4 + 2,
            color,
            life: 1
        });
    }

    if (particleFrame === null) {
        animateParticles();
    }
}

function animateParticles() {
    eCtx.clearRect(0, 0, effectCanvas.width, effectCanvas.height);
    particles = particles.filter((particle) => particle.life > 0);

    if (particles.length === 0) {
        particleFrame = null;
        eCtx.globalAlpha = 1;
        return;
    }

    for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.25;
        particle.life -= 0.025;
        eCtx.globalAlpha = particle.life;
        eCtx.fillStyle = particle.color;
        eCtx.beginPath();
        eCtx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        eCtx.fill();
    }

    eCtx.globalAlpha = 1;
    particleFrame = requestAnimationFrame(animateParticles);
}

function isBoardFull() {
    return history.length >= size * size;
}

function getBoardCellFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const c = Math.round((x - padding) / cellSize);
    const r = Math.round((y - padding) / cellSize);

    if (r < 0 || r >= size || c < 0 || c >= size) {
        return null;
    }

    return { r, c };
}

function rebuildBoardFromHistory() {
    board = Array.from({ length: size }, () => Array(size).fill(0));
    for (const move of history) {
        board[move.r][move.c] = move.p;
    }

    if (history.length === 0) {
        currentPlayer = 1;
        lastMove = null;
        return;
    }

    const latestMove = history[history.length - 1];
    currentPlayer = latestMove.p === 1 ? 2 : 1;
    lastMove = { r: latestMove.r, c: latestMove.c };
}

function queueAiTurn() {
    aiThinking = true;
    updateUI();

    aiTurnTimeout = setTimeout(() => {
        aiTurnTimeout = null;
        let move = null;
        try {
            move = AI.findBestMove(board, difficulty, 2);
        } catch (error) {
            console.error('AI move failed, falling back to first candidate.', error);
            move = typeof AI.getCandidates === 'function' ? AI.getCandidates(board, 2, 1)[0] : null;
        }
        aiThinking = false;

        if (move && !gameOver) {
            placeStone(move.r, move.c);
        } else {
            updateUI();
        }
    }, 60);
}

function finishTurn(r, c, player) {
    const winResult = checkWin(r, c, player);
    if (winResult) {
        resultTimeout = setTimeout(() => {
            resultTimeout = null;
            handleWin(player, winResult);
        }, 200);
        return;
    }

    if (isBoardFull()) {
        resultTimeout = setTimeout(() => {
            resultTimeout = null;
            handleDraw();
        }, 200);
        return;
    }

    const nextPlayer = player === 1 ? 2 : 1;
    resultTimeout = setTimeout(() => {
        resultTimeout = null;
        currentPlayer = nextPlayer;
        updateUI();
        if (mode === 'pve' && currentPlayer === 2 && !gameOver) {
            queueAiTurn();
        }
    }, 200);
}

// 5. 交互与逻辑
function placeStone(r, c) {
    if (gameOver || aiThinking || board[r][c] !== 0) {
        return;
    }

    const isRenjuEnabled = elements.renjuToggle.checked;
    if (isRenjuEnabled && currentPlayer === 1) {
        const forbiddenReason = checkForbiddenMove(r, c);
        if (forbiddenReason) {
            board[r][c] = 1;
            history.push({ r, c, p: 1, forbidden: true });
            lastMove = { r, c };
            render();
            handleWin(2, null, forbiddenReason);
            return;
        }
    }

    board[r][c] = currentPlayer;
    animatingStone = {
        r,
        c,
        p: currentPlayer,
        scale: 1.4,
        alpha: 0.2
    };

    history.push({ r, c, p: currentPlayer });
    lastMove = { r, c };
    hoveredCell = null;
    playStoneSound();
    animateStoneDrop();
    finishTurn(r, c, currentPlayer);
}

function animateStoneDrop() {
    if (!animatingStone) {
        stoneFrame = null;
        return;
    }

    animatingStone.scale -= 0.08;
    animatingStone.alpha += 0.15;

    if (animatingStone.scale <= 1) {
        animatingStone.scale = 1;
        animatingStone.alpha = 1;
        render();
        animatingStone = null;
        stoneFrame = null;
        return;
    }

    render();
    stoneFrame = requestAnimationFrame(animateStoneDrop);
}

// 核心禁手检测：长连、三三、四四
function checkForbiddenMove(r, c) {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    let threeCount = 0;
    let fourCount = 0;

    for (const [dr, dc] of dirs) {
        let count = 1;
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === 1) {
            count++;
            nr += dr;
            nc += dc;
        }
        nr = r - dr;
        nc = c - dc;
        while (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === 1) {
            count++;
            nr -= dr;
            nc -= dc;
        }
        if (count > 5) {
            return '长连禁手 (超过五子)';
        }

        if (isFour(r, c, dr, dc)) {
            fourCount++;
        }
        if (isLiveThree(r, c, dr, dc)) {
            threeCount++;
        }
    }

    if (fourCount >= 2) {
        return '四四禁手 (双重四路)';
    }
    if (threeCount >= 2) {
        return '三三禁手 (双重活三)';
    }
    return null;
}

function isFour(r, c, dr, dc) {
    board[r][c] = 1;

    for (let i = -4; i <= 0; i++) {
        let segment = 0;
        for (let j = 0; j < 5; j++) {
            const nr = r + (i + j) * dr;
            const nc = c + (i + j) * dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                if (board[nr][nc] === 1) {
                    segment++;
                } else if (board[nr][nc] !== 0) {
                    segment = -100;
                    break;
                }
            } else {
                segment = -100;
                break;
            }
        }
        if (segment === 4) {
            board[r][c] = 0;
            return true;
        }
    }

    board[r][c] = 0;
    return false;
}

function isLiveThree(r, c, dr, dc) {
    board[r][c] = 1;
    let isLive = false;

    for (let i = -3; i <= 0; i++) {
        let segment = 0;
        const positions = [];
        for (let j = 0; j < 4; j++) {
            const nr = r + (i + j) * dr;
            const nc = c + (i + j) * dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                if (board[nr][nc] === 1) {
                    segment++;
                } else if (board[nr][nc] === 0) {
                    positions.push({ r: nr, c: nc });
                } else {
                    segment = -100;
                    break;
                }
            } else {
                segment = -100;
                break;
            }
        }
        if (segment === 3 && positions.length === 1) {
            const position = positions[0];
            if (isLiveFour(position.r, position.c, dr, dc)) {
                isLive = true;
                break;
            }
        }
    }

    board[r][c] = 0;
    return isLive;
}

function isLiveFour(r, c, dr, dc) {
    board[r][c] = 1;
    let count = 1;

    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === 1) {
        count++;
        nr += dr;
        nc += dc;
    }
    const headEmpty = nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === 0;

    nr = r - dr;
    nc = c - dc;
    while (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === 1) {
        count++;
        nr -= dr;
        nc -= dc;
    }
    const tailEmpty = nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === 0;

    board[r][c] = 0;
    return count === 4 && headEmpty && tailEmpty;
}

function checkWin(r, c, player) {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (const [dr, dc] of dirs) {
        let count = 1;
        const line = [{ r, c }];

        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === player) {
            count++;
            line.push({ r: nr, c: nc });
            nr += dr;
            nc += dc;
        }

        nr = r - dr;
        nc = c - dc;
        while (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === player) {
            count++;
            line.unshift({ r: nr, c: nc });
            nr -= dr;
            nc -= dc;
        }

        if (count >= 5) {
            return line;
        }
    }
    return null;
}

function handleWin(winner, line, reason = null) {
    clearPendingActions();
    gameOver = true;
    aiThinking = false;
    stopTimer();
    render();

    if (line) {
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 5;
        ctx.beginPath();
        const start = line[0];
        const end = line[line.length - 1];
        ctx.moveTo(start.c * cellSize + padding, start.r * cellSize + padding);
        ctx.lineTo(end.c * cellSize + padding, end.r * cellSize + padding);
        ctx.stroke();

        if (elements.particleToggle.checked) {
            for (const point of line) {
                createParticles(point.c * cellSize + padding, point.r * cellSize + padding, winner === 1 ? '#000' : '#fff');
            }
        }
    }

    let statusText = `${winner === 1 ? '黑子' : '白子'} 获胜！🏁`;
    if (reason) {
        statusText = `${reason}，白子获胜！🏆`;
    }
    elements.status.innerText = statusText;

    if (mode === 'pve') {
        const eloGain = winner === 1 ? difficulty * 20 : -15;
        elo = Math.max(800, elo + eloGain);
        persistElo();
    }

    updateUI();
}

function handleDraw() {
    clearPendingActions();
    gameOver = true;
    aiThinking = false;
    stopTimer();
    render();
    elements.status.innerText = '棋局结束，双方战平。';
    updateUI();
}

// 6. UI 更新
function updateStatusText() {
    if (gameOver) {
        return;
    }
    if (aiThinking) {
        elements.status.innerText = 'AI 思考中...';
        return;
    }

    const side = currentPlayer === 1 ? '黑子' : '白子';
    const aiLabel = mode === 'pve' && currentPlayer === 2 ? ' (AI)' : '';
    const renjuHint = elements.renjuToggle.checked && currentPlayer === 1 ? '，黑棋禁手生效' : '';
    elements.status.innerText = `${side}${aiLabel}回合${renjuHint}`;
}

function updateUI() {
    elements.p1Card.classList.toggle('active', currentPlayer === 1 && !gameOver);
    elements.p2Card.classList.toggle('active', currentPlayer === 2 && !gameOver);
    elements.p2Name.innerText = mode === 'pve' ? '白子 (AI)' : '白子 (玩家 2)';
    elements.moveCount.innerText = history.length;
    elements.eloScore.innerText = elo;

    const rankIndex = Math.max(0, Math.min(ranks.length - 1, Math.floor((elo - 1000) / 200) + 1));
    elements.rankName.innerText = ranks[rankIndex];
    elements.powerFill.style.width = `${Math.max(0, Math.min(100, (elo - 800) / 20))}%`;
    updateStatusText();
}

function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
        seconds++;
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        elements.timer.innerText = `${m}:${s}`;
    }, 1000);
}

function stopTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// 7. 事件
canvas.addEventListener('pointerdown', (event) => {
    if (aiThinking || (mode === 'pve' && currentPlayer === 2)) {
        return;
    }

    const cell = getBoardCellFromEvent(event);
    if (cell) {
        placeStone(cell.r, cell.c);
    }
});

canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') {
        return;
    }
    if (gameOver || aiThinking || animatingStone || (mode === 'pve' && currentPlayer === 2)) {
        if (hoveredCell) {
            hoveredCell = null;
            render();
        }
        return;
    }

    const cell = getBoardCellFromEvent(event);
    const nextHoveredCell = cell && board[cell.r][cell.c] === 0 ? cell : null;
    const changed = (!hoveredCell && nextHoveredCell)
        || (hoveredCell && !nextHoveredCell)
        || (hoveredCell && nextHoveredCell && (hoveredCell.r !== nextHoveredCell.r || hoveredCell.c !== nextHoveredCell.c));

    if (changed) {
        hoveredCell = nextHoveredCell;
        render();
    }
});

canvas.addEventListener('pointerleave', () => {
    if (!hoveredCell) {
        return;
    }
    hoveredCell = null;
    render();
});

elements.undoBtn.addEventListener('click', () => {
    if (history.length === 0) {
        return;
    }

    clearPendingActions();
    clearEffects();
    animatingStone = null;
    hoveredCell = null;
    gameOver = false;
    aiThinking = false;

    const stepsToUndo = mode === 'pve' && history.length > 1 ? 2 : 1;
    history.splice(-stepsToUndo, stepsToUndo);
    rebuildBoardFromHistory();
    updateUI();
    render();
    startTimer();
});

elements.restartBtn.addEventListener('click', init);
elements.modeSelect.addEventListener('change', (event) => {
    mode = event.target.value;
    init();
});
elements.difficultySelect.addEventListener('change', (event) => {
    difficulty = parseInt(event.target.value, 10);
    init();
});
elements.renjuToggle.addEventListener('change', () => {
    updateUI();
    render();
});

init();
