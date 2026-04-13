// Canvas 定义
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const effectCanvas = document.getElementById('effects');
const eCtx = effectCanvas.getContext('2d');

// 游戏常量
const size = 15;
const cellSize = 40;
const padding = cellSize / 2;  // 20px 边缘留白
const gridExtent = canvas.width - padding;  // 580

// 游戏状态
let board = [];
let history = [];
let currentPlayer = 1; // 1: 黑, 2: 白
let gameOver = false;
let mode = 'pve';
let difficulty = 3;
let lastMove = null;
let timerInterval = null;
let seconds = 0;
let animatingStone = null; // 正在播放动画的棋子

// 棋力系统状态
// ... (此处保持 ELO 相关代码不变)

// 1. 初始化
// ...

// 2. 核心渲染逻辑
function render() {
    drawBoard();
    drawPieces();
    if (lastMove) highlightLastMove();
}

function drawBoard() {
    // ... (保持 drawBoard 不变)
}

function drawPieces() {
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            // 如果是正在动画的棋子，跳过，最后单独画
            if (animatingStone && animatingStone.r === r && animatingStone.c === c) continue;
            if (board[r][c] !== 0) drawStone(r, c, board[r][c]);
        }
    }
    // 单独绘制动画中的棋子，应用其缩放和透明度
    if (animatingStone) {
        drawStone(animatingStone.r, animatingStone.c, animatingStone.p, animatingStone.alpha, animatingStone.scale);
    }
}

function drawStone(r, c, player, alpha = 1, scale = 1) {
    const x = padding + c * cellSize;
    const y = padding + r * cellSize;
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // 动态阴影：棋子越高（scale越大），阴影越虚、偏移越大
    const shadowSize = 8 * scale;
    ctx.shadowBlur = shadowSize; 
    ctx.shadowOffsetX = 3 * scale; 
    ctx.shadowOffsetY = 3 * scale; 
    ctx.shadowColor = 'rgba(0,0,0,0.5)';

    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.beginPath(); 
    ctx.arc(0, 0, 17, 0, Math.PI*2);
    
    const grad = ctx.createRadialGradient(-5, -5, 2, 0, 0, 17);
    if (player === 1) { // 黑子
        grad.addColorStop(0, '#555'); 
        grad.addColorStop(1, '#000');
    } else { // 白子
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
    ctx.arc(x, y, 5, 0, Math.PI*2); 
    ctx.fill();
}

// 3. 音效系统
function playStoneSound() {
    if (!document.getElementById('sound-toggle').checked) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800 + Math.random()*100, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } catch(e) {}
}

// 4. 特效系统
let particles = [];
function createParticles(x, y, color) {
    for(let i=0; i<30; i++) {
        particles.push({
            x, y,
            vx: (Math.random()-0.5) * 12,
            vy: (Math.random()-0.5) * 12,
            radius: Math.random() * 4 + 2,
            color,
            life: 1.0
        });
    }
    animateParticles();
}

function animateParticles() {
    if (particles.length === 0) return;
    eCtx.clearRect(0,0,600,600);
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.25; 
        p.life -= 0.025;
        eCtx.globalAlpha = p.life;
        eCtx.fillStyle = p.color;
        eCtx.beginPath(); eCtx.arc(p.x, p.y, p.radius, 0, Math.PI*2); eCtx.fill();
    });
    requestAnimationFrame(animateParticles);
}

// 5. 交互与逻辑
function placeStone(r, c) {
    if (board[r][c] !== 0 || gameOver) return;
    
    // 检查禁手（仅针对黑棋，且在规则开启时）
    const isRenjuEnabled = document.getElementById('renju-toggle').checked;
    if (isRenjuEnabled && currentPlayer === 1) {
        const forbiddenReason = checkForbiddenMove(r, c);
        if (forbiddenReason) {
            board[r][c] = 1; // 先落下子以显示禁手点
            render();
            handleWin(2, null, forbiddenReason); // 白子获胜
            return;
        }
    }

    // 启动落子动画
    board[r][c] = currentPlayer;
    animatingStone = { 
        r, c, 
        p: currentPlayer, 
        scale: 1.4, // 从 1.4 倍大小开始下落
        alpha: 0.2  // 从近乎透明开始
    };
    
    history.push({r, c, p: currentPlayer});
    lastMove = {r, c};
    playStoneSound();
    
    animateStoneDrop();

    const winResult = checkWin(r, c, currentPlayer);
    if (winResult) {
        // 等待动画结束后再显示胜利（大约 200ms）
        setTimeout(() => handleWin(currentPlayer, winResult), 200);
    } else {
        const nextPlayer = currentPlayer === 1 ? 2 : 1;
        // AI 逻辑也需要稍等动画完成
        setTimeout(() => {
            currentPlayer = nextPlayer;
            updateUI();
            if (mode === 'pve' && currentPlayer === 2 && !gameOver) {
                const move = AI.findBestMove(board, difficulty, 2);
                if (move) placeStone(move.r, move.c);
            }
        }, 200);
    }
}

// 落子动画驱动
function animateStoneDrop() {
    if (!animatingStone) return;

    animatingStone.scale -= 0.08; // 每一帧缩小一点
    animatingStone.alpha += 0.15; // 每一帧变实一点

    if (animatingStone.scale <= 1) {
        animatingStone.scale = 1;
        animatingStone.alpha = 1;
        render(); // 最后画一帧完整的
        animatingStone = null; // 动画结束
        return;
    }

    render();
    requestAnimationFrame(animateStoneDrop);
}

// 核心禁手检测：长连、三三、四四
function checkForbiddenMove(r, c) {
    const dirs = [[1,0], [0,1], [1,1], [1,-1]];
    let threeCount = 0;
    let fourCount = 0;

    for (let [dr, dc] of dirs) {
        // 1. 检查长连（连 6 及以上）
        let count = 1;
        let nr = r + dr, nc = c + dc;
        while(nr>=0 && nr<size && nc>=0 && nc<size && board[nr][nc] === 1) { count++; nr+=dr; nc+=dc; }
        nr = r - dr; nc = c - dc;
        while(nr>=0 && nr<size && nc>=0 && nc<size && board[nr][nc] === 1) { count++; nr-=dr; nc-=dc; }
        if (count > 5) return "长连禁手 (超过五子)";

        // 2. 检查四 (活四或冲四)
        if (isFour(r, c, dr, dc)) fourCount++;
        // 3. 检查活三
        if (isLiveThree(r, c, dr, dc)) threeCount++;
    }

    if (fourCount >= 2) return "四四禁手 (双重四路)";
    if (threeCount >= 2) return "三三禁手 (双重活三)";
    return null;
}

// 辅助：判断是否形成“四” (冲四或活四)
function isFour(r, c, dr, dc) {
    // 模拟落子后，检查在当前方向上是否形成“四”
    board[r][c] = 1;
    let count = 0;
    // 简单的四路判定：下一手能成五
    for (let i = -4; i <= 0; i++) {
        let segment = 0;
        let hasGap = false;
        for (let j = 0; j < 5; j++) {
            let nr = r + (i + j) * dr;
            let nc = c + (i + j) * dc;
            if (nr>=0 && nr<size && nc>=0 && nc<size) {
                if (board[nr][nc] === 1) segment++;
                else if (board[nr][nc] === 0) hasGap = true;
                else { segment = -100; break; }
            } else { segment = -100; break; }
        }
        if (segment === 4) {
             board[r][c] = 0; return true;
        }
    }
    board[r][c] = 0;
    return false;
}

// 辅助：判断是否形成“活三”
function isLiveThree(r, c, dr, dc) {
    board[r][c] = 1;
    let isLive = false;
    // 活三定义：形成三子且两端皆可成活四
    for (let i = -3; i <= 0; i++) {
        let segment = 0;
        let positions = [];
        for (let j = 0; j < 4; j++) {
            let nr = r + (i + j) * dr;
            let nc = c + (i + j) * dc;
            if (nr>=0 && nr<size && nc>=0 && nc<size) {
                if (board[nr][nc] === 1) segment++;
                else if (board[nr][nc] === 0) positions.push({r:nr, c:nc});
                else { segment = -100; break; }
            } else { segment = -100; break; }
        }
        // 如果四格中有三子一空，且空位落子能成活四
        if (segment === 3 && positions.length === 1) {
            const p = positions[0];
            if (isLiveFour(p.r, p.c, dr, dc)) { isLive = true; break; }
        }
    }
    board[r][c] = 0;
    return isLive;
}

function isLiveFour(r, c, dr, dc) {
    board[r][c] = 1;
    let count = 1;
    let nr = r + dr, nc = c + dc;
    while(nr>=0 && nr<size && nc>=0 && nc<size && board[nr][nc] === 1) { count++; nr+=dr; nc+=dc; }
    const headEmpty = nr>=0 && nr<size && nc>=0 && nc<size && board[nr][nc] === 0;
    
    nr = r - dr; nc = c - dc;
    while(nr>=0 && nr<size && nc>=0 && nc<size && board[nr][nc] === 1) { count++; nr-=dr; nc-=dc; }
    const tailEmpty = nr>=0 && nr<size && nc>=0 && nc<size && board[nr][nc] === 0;

    board[r][c] = 0;
    return count === 4 && headEmpty && tailEmpty;
}

function checkWin(r, c, p) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    for (let [dr, dc] of dirs) {
        let count = 1, line = [{r, c}];
        let nr = r + dr, nc = c + dc;
        while(nr>=0 && nr<size && nc>=0 && nc<size && board[nr][nc] === p) {
            count++; line.push({r:nr, c:nc}); nr+=dr; nc+=dc;
        }
        nr = r - dr; nc = c - dc;
        while(nr>=0 && nr<size && nc>=0 && nc<size && board[nr][nc] === p) {
            count++; line.push({r:nr, c:nc}); nr-=dr; nc-=dc;
        }
        if (count >= 5) return line;
    }
    return null;
}

function handleWin(winner, line, reason = null) {
    gameOver = true;
    stopTimer();
    render();
    
    if (line) {
        ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 5;
        ctx.beginPath();
        const start = line[0], end = line[line.length-1];
        ctx.moveTo(start.c*cellSize+cellSize/2, start.r*cellSize+cellSize/2);
        ctx.lineTo(end.c*cellSize+cellSize/2, end.r*cellSize+cellSize/2);
        ctx.stroke();

        if (document.getElementById('particle-toggle').checked) {
            line.forEach(p => createParticles(p.c*cellSize+cellSize/2, p.r*cellSize+cellSize/2, winner===1?'#000':'#fff'));
        }
    }

    let statusText = (winner === 1 ? '黑子' : '白子') + ' 获胜！🏁';
    if (reason) statusText = reason + "，白子获胜！🏆";
    document.getElementById('status').innerText = statusText;

    if (mode === 'pve') {
        let eloGain = winner === 1 ? difficulty * 20 : -15;
        elo = Math.max(800, elo + eloGain);
        localStorage.setItem('gomoku_elo', elo);
    }
    updateUI();
}

// 6. UI 更新
function updateUI() {
    document.getElementById('p1-card').classList.toggle('active', currentPlayer === 1);
    document.getElementById('p2-card').classList.toggle('active', currentPlayer === 2);
    document.getElementById('move-count').innerText = history.length;
    document.getElementById('elo-score').innerText = elo;
    const rankIndex = Math.min(ranks.length - 1, Math.floor((elo - 1000) / 200) + 1);
    document.getElementById('rank-name').innerText = ranks[Math.max(0, rankIndex)];
    document.getElementById('power-fill').style.width = `${Math.min(100, (elo-800)/20)}%`;
}

function startTimer() {
    timerInterval = setInterval(() => {
        seconds++;
        const m = Math.floor(seconds/60).toString().padStart(2, '0');
        const s = (seconds%60).toString().padStart(2, '0');
        document.getElementById('timer').innerText = `${m}:${s}`;
    }, 1000);
}
function stopTimer() { clearInterval(timerInterval); }

// 7. 事件
canvas.addEventListener('click', (e) => {
    if (mode === 'pve' && currentPlayer === 2) return;
    const rect = canvas.getBoundingClientRect();
    const r = Math.floor((e.clientY - rect.top) / cellSize);
    const c = Math.floor((e.clientX - rect.left) / cellSize);
    if(r >= 0 && r < size && c >= 0 && c < size) placeStone(r, c);
});

canvas.addEventListener('mousemove', (e) => {
    if (gameOver || (mode === 'pve' && currentPlayer === 2)) return;
    render();
    const rect = canvas.getBoundingClientRect();
    const r = Math.floor((e.clientY - rect.top) / cellSize);
    const c = Math.floor((e.clientX - rect.left) / cellSize);
    if (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === 0) drawStone(r, c, currentPlayer, 0.3);
});

document.getElementById('undo-btn').addEventListener('click', () => {
    if (history.length === 0 || gameOver) return;
    if (mode === 'pve') { if(history.length < 2) return; history.pop(); history.pop(); } 
    else history.pop();
    board.forEach(row => row.fill(0));
    currentPlayer = 1;
    history.forEach(m => { board[m.r][m.c] = m.p; currentPlayer = m.p === 1 ? 2 : 1; });
    lastMove = history.length > 0 ? history[history.length - 1] : null;
    gameOver = false;
    stopTimer(); startTimer();
    updateUI(); render();
});

document.getElementById('restart-btn').addEventListener('click', init);
document.getElementById('mode-select').addEventListener('change', (e) => { mode = e.target.value; init(); });
document.getElementById('difficulty-select').addEventListener('change', (e) => { difficulty = parseInt(e.target.value); init(); });

init();