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
    p1Name: document.querySelector('#p1-card .name'),
    p2Card: document.getElementById('p2-card'),
    p2Name: document.getElementById('p2-name'),
    moveCount: document.getElementById('move-count'),
    undoBtn: document.getElementById('undo-btn'),
    restartBtn: document.getElementById('restart-btn'),
    modeSelect: document.getElementById('mode-select'),
    difficultySelect: document.getElementById('difficulty-select'),
    difficultyHint: document.getElementById('difficulty-hint'),
    firstPlayerSelect: document.getElementById('first-player-select'),
    renjuToggle: document.getElementById('renju-toggle'),
    soundToggle: document.getElementById('sound-toggle'),
    particleToggle: document.getElementById('particle-toggle'),
    eloScore: document.getElementById('elo-score'),
    rankName: document.getElementById('rank-name'),
    powerFill: document.getElementById('power-fill'),
    recordTotal: document.getElementById('record-total'),
    recordWinRate: document.getElementById('record-win-rate'),
    recordLatest: document.getElementById('record-latest'),
    recordHistoryList: document.getElementById('record-history-list'),
    recordReplayBtn: document.getElementById('record-replay-btn'),
    replayEntry: document.getElementById('replay-entry'),
    enterReplayBtn: document.getElementById('enter-replay-btn'),
    replayPanel: document.getElementById('replay-panel'),
    replayStep: document.getElementById('replay-step'),
    replayTurn: document.getElementById('replay-turn'),
    replayDetail: document.getElementById('replay-detail'),
    replayStartBtn: document.getElementById('replay-start-btn'),
    replayPrevBtn: document.getElementById('replay-prev-btn'),
    replayNextBtn: document.getElementById('replay-next-btn'),
    replayEndBtn: document.getElementById('replay-end-btn'),
    replayPlayBtn: document.getElementById('replay-play-btn'),
    exitReplayBtn: document.getElementById('exit-replay-btn'),
    restoreBanner: document.getElementById('restore-banner'),
    restoreText: document.getElementById('restore-text'),
    restoreResumeBtn: document.getElementById('restore-resume-btn'),
    restoreDiscardBtn: document.getElementById('restore-discard-btn'),
    autosaveState: document.getElementById('autosave-state'),
    autosaveTime: document.getElementById('autosave-time'),
    autosaveSaveBtn: document.getElementById('autosave-save-btn'),
    autosaveClearBtn: document.getElementById('autosave-clear-btn')
};

// 游戏常量
const size = 15;
const cellSize = 40;
const padding = cellSize / 2;
const gridExtent = canvas.width - padding;
const ELO_STORAGE_KEY = 'gomoku_elo';
const MATCH_RECORDS_KEY = 'gomoku_match_records';
const AUTOSAVE_KEY = 'gomoku_autosave';
const AUTOSAVE_VERSION = 1;
const MAX_MATCH_RECORDS = 20;
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
let firstPlayer = elements.firstPlayerSelect.value;
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
let matchRecords = loadMatchRecords();
let statusHintTimeout = null;
let transientStatusText = '';
let suppressClickUntil = 0;
let aiSearchTask = null;
let pendingRestoreGame = null;
let replayMode = false;
let replayIndex = 0;
let replaySource = null;
let replayPlaybackTimer = null;
let replayAutoplay = false;
let lastFinishedRecord = null;

buildBoardLayer();

function getPlayerRoleLabel(player) {
    if (mode !== 'pve') {
        return player === 1 ? '玩家 1' : '玩家 2';
    }
    return isAiTurn(player) ? 'AI' : '您';
}

function getPieceLabel(player) {
    return player === 1 ? '黑子' : '白子';
}

function getSideWithRoleLabel(player) {
    return `${getPieceLabel(player)} (${getPlayerRoleLabel(player)})`;
}

function getTurnStatusMessage() {
    if (gameOver) {
        return elements.status.innerText;
    }
    if (aiThinking) {
        return `AI 思考中，当前执子：${getPieceLabel(getAiPlayer())}。`;
    }

    const sideText = getSideWithRoleLabel(currentPlayer);
    const renjuHint = elements.renjuToggle.checked && currentPlayer === 1 ? ' 黑棋禁手规则已生效。' : '';
    return `${sideText}回合。${renjuHint}`;
}

function getInitStatusMessage(reason) {
    const messages = {
        boot: '系统准备就绪，开始新对局。',
        restart: '已重开新局，棋盘已清空。',
        mode: mode === 'pve' ? '已切换到人机模式，开始新对局。' : '已切换到双人模式，开始新对局。',
        difficulty: `AI 难度已切换为 ${difficulty} 级，开始新对局。`,
        firstPlayer: firstPlayer === 'ai' ? '已切换为 AI 先手，开始新对局。' : '已切换为玩家先手，开始新对局。'
    };
    return messages[reason] || '已开始新对局。';
}

function getUndoStatusMessage() {
    if (history.length === 0) {
        return '已撤销到开局状态。';
    }
    return isAiTurn()
        ? `已悔棋，当前轮到 ${getSideWithRoleLabel(currentPlayer)}。`
        : `已悔棋，当前轮到 ${getSideWithRoleLabel(currentPlayer)}。`;
}

function getRenjuToggleMessage() {
    return elements.renjuToggle.checked
        ? '已开启禁手规则，仅黑棋受限。'
        : '已关闭禁手规则，恢复自由落子。';
}

function getResultStatusMessage(winner, reason = '') {
    if (reason) {
        return `${reason}，白子获胜。`;
    }
    return `${getSideWithRoleLabel(winner)}获胜。`;
}

function getDrawStatusMessage() {
    return '棋局结束，双方战平。';
}

function getDifficultyDescription(level) {
    const descriptions = {
        1: '短搜索，偏基础应对，仍会优先直接取胜或堵住必败点。',
        2: '轻量搜索，开始兼顾局部攻防，适合日常对弈。',
        3: '中等搜索宽度，兼顾进攻与防守，整体最稳定。',
        4: '高搜索宽度，选点更稳但思考更久，适合挑战。'
    };
    return descriptions[level] || descriptions[3];
}

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

function loadMatchRecords() {
    try {
        const raw = localStorage.getItem(MATCH_RECORDS_KEY);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.slice(0, MAX_MATCH_RECORDS) : [];
    } catch (error) {
        return [];
    }
}

function persistMatchRecords() {
    try {
        localStorage.setItem(MATCH_RECORDS_KEY, JSON.stringify(matchRecords.slice(0, MAX_MATCH_RECORDS)));
    } catch (error) {
        // 忽略存储异常，不影响对局
    }
}

function isValidBoardShape(candidateBoard) {
    return Array.isArray(candidateBoard)
        && candidateBoard.length === size
        && candidateBoard.every((row) => Array.isArray(row) && row.length === size);
}

function loadAutosave() {
    try {
        const raw = localStorage.getItem(AUTOSAVE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.saveVersion !== AUTOSAVE_VERSION) {
            return null;
        }
        if (!isValidBoardShape(parsed.board) || !Array.isArray(parsed.history) || parsed.history.length === 0) {
            return null;
        }
        return parsed;
    } catch (error) {
        return null;
    }
}

function persistAutosave(snapshot) {
    try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot));
    } catch (error) {
        // 忽略存储异常，不影响对局
    }
    updateAutosavePanel();
}

function clearAutosave() {
    pendingRestoreGame = null;
    try {
        localStorage.removeItem(AUTOSAVE_KEY);
    } catch (error) {
        // 忽略存储异常，不影响对局
    }
    updateAutosavePanel();
}

function cloneHistory(historyItems) {
    return historyItems.map((move) => ({ ...move }));
}

function buildAutosaveSnapshot() {
    return {
        saveVersion: AUTOSAVE_VERSION,
        savedAt: new Date().toISOString(),
        board: board.map((row) => [...row]),
        history: history.map((move) => ({ ...move })),
        currentPlayer,
        mode,
        difficulty,
        firstPlayer,
        renjuEnabled: elements.renjuToggle.checked,
        seconds,
        lastMove: lastMove ? { ...lastMove } : null,
        elo
    };
}

function saveCurrentGameState() {
    if (gameOver || history.length === 0) {
        clearAutosave();
        return;
    }
    persistAutosave(buildAutosaveSnapshot());
}

function handleManualSave() {
    if (gameOver) {
        setTransientStatus('对局已结束，无需保存当前棋盘。');
        return;
    }
    if (history.length === 0) {
        setTransientStatus('当前仍是空棋盘，没有可保存内容。');
        return;
    }
    if (aiThinking || animatingStone) {
        setTransientStatus('请等待 AI 或动画结束后再手动保存。');
        return;
    }
    saveCurrentGameState();
    const save = loadAutosave();
    setTransientStatus(`已手动保存对局。${save ? ` 保存时间：${formatAutosaveTimestamp(save.savedAt)}` : ''}`, 2000);
}

function handleClearAutosave() {
    const existed = Boolean(loadAutosave());
    clearAutosave();
    hideRestoreBanner();
    setTransientStatus(existed ? '已清除未结束对局存档。' : '当前没有可清除的存档。', 1800);
}

function formatAutosaveSummary(save) {
    const modeLabel = save.mode === 'pve' ? '人机' : '双人';
    const firstMoveLabel = save.firstPlayer === 'ai' ? 'AI先手' : '玩家先手';
    const savedAt = save.savedAt ? new Date(save.savedAt).toLocaleString('zh-CN', { hour12: false }) : '刚刚';
    return `${modeLabel} · ${firstMoveLabel} · ${save.history.length}步 · ${formatDuration(save.seconds || 0)} · 保存于 ${savedAt}`;
}

function formatAutosaveTimestamp(savedAt) {
    if (!savedAt) {
        return '未保存';
    }
    const date = new Date(savedAt);
    if (Number.isNaN(date.getTime())) {
        return '未保存';
    }
    return date.toLocaleString('zh-CN', { hour12: false });
}

function updateAutosavePanel() {
    const save = loadAutosave();
    if (save) {
        elements.autosaveState.innerText = '检测到未结束存档';
        elements.autosaveTime.innerText = `上次保存：${formatAutosaveTimestamp(save.savedAt)}`;
        elements.autosaveClearBtn.disabled = false;
    } else {
        elements.autosaveState.innerText = '当前无未结束存档';
        elements.autosaveTime.innerText = '上次保存：未保存';
        elements.autosaveClearBtn.disabled = true;
    }

    const canManualSave = !gameOver && history.length > 0 && !aiThinking && !animatingStone;
    elements.autosaveSaveBtn.disabled = !canManualSave;
}

function showRestoreBanner(save) {
    pendingRestoreGame = save;
    elements.restoreText.innerText = formatAutosaveSummary(save);
    elements.restoreBanner.classList.remove('hidden');
    updateAutosavePanel();
}

function hideRestoreBanner() {
    pendingRestoreGame = null;
    elements.restoreBanner.classList.add('hidden');
    updateAutosavePanel();
}

function formatDuration(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
}

function saveMatchRecord({ result, winner = null, reason = '', playerWon = null }) {
    const aiPlayer = getAiPlayer();
    const winningLine = result === 'win' && history.length > 0
        ? checkWin(history[history.length - 1].r, history[history.length - 1].c, winner)
        : null;
    const record = {
        playedAt: new Date().toISOString(),
        mode,
        difficulty,
        firstPlayer,
        renjuEnabled: elements.renjuToggle.checked,
        moves: history.length,
        durationSec: seconds,
        result,
        winner,
        reason,
        aiPlayer,
        playerWon,
        moveHistory: cloneHistory(history),
        winningLine: winningLine ? winningLine.map((point) => ({ ...point })) : null
    };

    matchRecords.unshift(record);
    if (matchRecords.length > MAX_MATCH_RECORDS) {
        matchRecords = matchRecords.slice(0, MAX_MATCH_RECORDS);
    }
    persistMatchRecords();
    lastFinishedRecord = record;
    return record;
}

function describeRecord(record) {
    if (!record) {
        return '暂无记录';
    }

    const modeLabel = record.mode === 'pve' ? '人机' : '双人';
    let outcome = '平局';
    if (record.result === 'win') {
        if (record.mode === 'pve') {
            outcome = record.playerWon ? '玩家胜' : 'AI 胜';
        } else {
            outcome = record.winner === 1 ? '黑胜' : '白胜';
        }
    } else if (record.result === 'forbidden') {
        outcome = record.reason || '禁手负';
    }

    const firstMoveLabel = record.firstPlayer === 'ai' ? 'AI先手' : '玩家先手';
    const renjuLabel = record.renjuEnabled ? '禁手开' : '禁手关';
    return `${modeLabel} · ${firstMoveLabel} · ${outcome} · ${record.moves}步 · ${formatDuration(record.durationSec)} · ${renjuLabel}`;
}

function renderMatchRecordSummary() {
    elements.recordTotal.innerText = String(matchRecords.length);

    const rankedPveGames = matchRecords.filter((record) => record.mode === 'pve' && typeof record.playerWon === 'boolean');
    if (rankedPveGames.length > 0) {
        const playerWins = rankedPveGames.filter((record) => record.playerWon).length;
        const winRate = Math.round((playerWins / rankedPveGames.length) * 100);
        elements.recordWinRate.innerText = `${winRate}%`;
    } else {
        elements.recordWinRate.innerText = '--';
    }

    elements.recordLatest.innerText = describeRecord(matchRecords[0]);
    elements.recordReplayBtn.disabled = matchRecords.length === 0 || !Array.isArray(matchRecords[0].moveHistory) || matchRecords[0].moveHistory.length === 0;
    renderRecordHistoryList();
}

function renderRecordHistoryList() {
    if (!elements.recordHistoryList) {
        return;
    }

    if (matchRecords.length === 0) {
        elements.recordHistoryList.innerHTML = '<div class="record-history-empty">暂无可复盘的对局记录。</div>';
        return;
    }

    elements.recordHistoryList.innerHTML = matchRecords.map((record, index) => {
        const title = `${index + 1}. ${record.mode === 'pve' ? '人机' : '双人'} · ${record.result === 'draw' ? '平局' : (record.playerWon ? '玩家胜' : record.mode === 'pve' ? 'AI 胜' : record.winner === 1 ? '黑胜' : '白胜')}`;
        const meta = `${record.firstPlayer === 'ai' ? 'AI先手' : '玩家先手'} · ${record.moves}步 · ${formatDuration(record.durationSec)}`;
        const disabled = !Array.isArray(record.moveHistory) || record.moveHistory.length === 0 ? 'disabled' : '';
        return `
            <div class="record-history-item">
                <strong>${title}</strong>
                <span>${meta}</span>
                <button class="btn secondary compact record-history-replay-btn" data-record-index="${index}" ${disabled}>复盘此局</button>
            </div>
        `;
    }).join('');
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
    if (aiSearchTask) {
        aiSearchTask.cancel();
        aiSearchTask = null;
    }
    if (replayPlaybackTimer !== null) {
        clearTimeout(replayPlaybackTimer);
        replayPlaybackTimer = null;
    }
}

function getReplayHistory() {
    if (replaySource && Array.isArray(replaySource.moveHistory)) {
        return replaySource.moveHistory;
    }
    return cloneHistory(history);
}

function stopReplayAutoplay() {
    replayAutoplay = false;
    if (replayPlaybackTimer !== null) {
        clearTimeout(replayPlaybackTimer);
        replayPlaybackTimer = null;
    }
    if (elements.replayPlayBtn) {
        elements.replayPlayBtn.innerText = '自动播放';
    }
}

function getReplayWinningLine() {
    if (replaySource && Array.isArray(replaySource.winningLine) && replaySource.winningLine.length > 0) {
        return replaySource.winningLine;
    }
    const replayHistory = getReplayHistory();
    if (replayHistory.length === 0) {
        return null;
    }
    const last = replayHistory[replayHistory.length - 1];
    return checkWin(last.r, last.c, last.p);
}

function drawReplayWinningLine(line) {
    if (!Array.isArray(line) || line.length === 0) {
        return;
    }
    ctx.save();
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    const start = line[0];
    const end = line[line.length - 1];
    ctx.moveTo(start.c * cellSize + padding, start.r * cellSize + padding);
    ctx.lineTo(end.c * cellSize + padding, end.r * cellSize + padding);
    ctx.stroke();
    ctx.restore();
}

function applyReplayPosition(index) {
    const replayHistory = getReplayHistory();
    replayIndex = Math.max(0, Math.min(index, replayHistory.length));
    board = Array.from({ length: size }, () => Array(size).fill(0));

    for (let i = 0; i < replayIndex; i++) {
        const move = replayHistory[i];
        board[move.r][move.c] = move.p;
    }

    lastMove = replayIndex > 0 ? { ...replayHistory[replayIndex - 1] } : null;
    render();
    if (replayIndex === replayHistory.length) {
        drawReplayWinningLine(getReplayWinningLine());
    }
    updateReplayPanel();
}

function getReplayCurrentPlayer(replayHistory, stepIndex) {
    if (stepIndex === 0) {
        return 1;
    }
    const latestMove = replayHistory[stepIndex - 1];
    return latestMove.p === 1 ? 2 : 1;
}

function updateReplayPanel() {
    const replayHistory = getReplayHistory();
    const totalSteps = replayHistory.length;
    elements.replayStep.innerText = `${replayIndex} / ${totalSteps}`;

    if (replayIndex === 0) {
        elements.replayTurn.innerText = '开局';
        elements.replayDetail.innerText = '当前为开局视图，棋盘尚未落子。';
    } else {
        const move = replayHistory[replayIndex - 1];
        const nextPlayer = getReplayCurrentPlayer(replayHistory, replayIndex);
        elements.replayTurn.innerText = `${getPieceLabel(move.p)} 第 ${replayIndex} 手`;
        elements.replayDetail.innerText = `落点：(${move.r}, ${move.c})，执子：${getPieceLabel(move.p)}。下一手轮到 ${getPieceLabel(nextPlayer)}。`;
        if (replayIndex === totalSteps && replaySource) {
            if (replaySource.result === 'draw') {
                elements.replayDetail.innerText += ' 终局结果：平局。';
            } else if (replaySource.result === 'forbidden') {
                elements.replayDetail.innerText += ` 终局结果：${replaySource.reason || '禁手负'}。`;
            } else if (replaySource.result === 'win') {
                elements.replayDetail.innerText += ` 终局结果：${describeRecord(replaySource)}。`;
            }
        }
    }

    elements.replayStartBtn.disabled = replayIndex === 0;
    elements.replayPrevBtn.disabled = replayIndex === 0;
    elements.replayNextBtn.disabled = replayIndex === totalSteps;
    elements.replayEndBtn.disabled = replayIndex === totalSteps;
    elements.replayPlayBtn.disabled = totalSteps === 0;
    elements.replayPlayBtn.innerText = replayAutoplay ? '暂停播放' : '自动播放';
}

function stepReplayAutoplay() {
    const replayHistory = getReplayHistory();
    if (!replayAutoplay || replayIndex >= replayHistory.length) {
        stopReplayAutoplay();
        return;
    }
    applyReplayPosition(replayIndex + 1);
    replayPlaybackTimer = setTimeout(stepReplayAutoplay, 420);
}

function toggleReplayAutoplay() {
    const replayHistory = getReplayHistory();
    if (replayHistory.length === 0) {
        return;
    }
    if (replayAutoplay) {
        stopReplayAutoplay();
        return;
    }
    if (replayIndex >= replayHistory.length) {
        applyReplayPosition(0);
    }
    replayAutoplay = true;
    elements.replayPlayBtn.innerText = '暂停播放';
    stepReplayAutoplay();
}

function enterReplay(source = null) {
    const effectiveSource = source || lastFinishedRecord;
    const replayHistory = effectiveSource && Array.isArray(effectiveSource.moveHistory) ? effectiveSource.moveHistory : history;
    if (!Array.isArray(replayHistory) || replayHistory.length === 0) {
        setTransientStatus('当前没有可复盘的对局。');
        return;
    }

    clearPendingActions();
    clearTransientStatus();
    stopReplayAutoplay();
    stopTimer();
    replayMode = true;
    replaySource = effectiveSource;
    elements.replayEntry.classList.add('hidden');
    elements.replayPanel.classList.remove('hidden');
    elements.restoreBanner.classList.add('hidden');
    applyReplayPosition(replayHistory.length);
    elements.status.innerText = '已进入复盘模式。';
}

function exitReplay() {
    stopReplayAutoplay();
    replayMode = false;
    replayIndex = 0;
    replaySource = null;
    elements.replayPanel.classList.add('hidden');
    elements.replayEntry.classList.add('hidden');
    rebuildBoardFromHistory();
    updateUI();
    render();
    if (!gameOver) {
        startTimer();
        if (mode === 'pve' && isAiTurn()) {
            queueAiTurn();
        }
    }
    setTransientStatus('已退出复盘，返回当前对局。', 1600);
}

function clearTransientStatus() {
    transientStatusText = '';
    if (statusHintTimeout !== null) {
        clearTimeout(statusHintTimeout);
        statusHintTimeout = null;
    }
}

function setTransientStatus(message, duration = 1400) {
    clearTransientStatus();
    transientStatusText = message;
    elements.status.innerText = message;
    statusHintTimeout = setTimeout(() => {
        statusHintTimeout = null;
        transientStatusText = '';
        updateStatusText();
    }, duration);
}

function applyAutosave(save) {
    clearPendingActions();
    clearTransientStatus();
    hideRestoreBanner();

    mode = save.mode === 'pvp' ? 'pvp' : 'pve';
    difficulty = Number.isFinite(Number(save.difficulty)) ? Number(save.difficulty) : 3;
    firstPlayer = save.firstPlayer === 'ai' ? 'ai' : 'human';
    elements.modeSelect.value = mode;
    elements.difficultySelect.value = String(difficulty);
    elements.firstPlayerSelect.value = firstPlayer;
    elements.renjuToggle.checked = Boolean(save.renjuEnabled);

    board = save.board.map((row) => row.map((cell) => (cell === 1 || cell === 2 ? cell : 0)));
    history = save.history.map((move) => ({ ...move }));
    currentPlayer = save.currentPlayer === 2 ? 2 : 1;
    gameOver = false;
    aiThinking = false;
    lastMove = save.lastMove ? { ...save.lastMove } : (history.length > 0 ? { ...history[history.length - 1] } : null);
    hoveredCell = null;
    animatingStone = null;
    clearEffects();
    stopTimer();
    seconds = Math.max(0, Number(save.seconds) || 0);
    if (Number.isFinite(Number(save.elo))) {
        elo = Math.max(800, Math.round(Number(save.elo)));
        persistElo();
    }

    elements.timer.innerText = formatDuration(seconds);
    updateUI();
    render();
    const saveTime = formatAutosaveTimestamp(save.savedAt);
    setTransientStatus(`已恢复上次未完成对局。上次保存：${saveTime}`, 2200);
    startTimer();
    saveCurrentGameState();

    if (isAiTurn()) {
        queueAiTurn();
    }
}

function clearEffects() {
    particles = [];
    eCtx.clearRect(0, 0, effectCanvas.width, effectCanvas.height);
}

function getAiPlayer() {
    if (mode !== 'pve') {
        return null;
    }
    return firstPlayer === 'ai' ? 1 : 2;
}

function isAiTurn(player = currentPlayer) {
    const aiPlayer = getAiPlayer();
    return aiPlayer !== null && player === aiPlayer;
}

// 1. 初始化
function init(reason = 'boot') {
    clearPendingActions();
    clearTransientStatus();
    replayMode = false;
    replayIndex = 0;
    replaySource = null;
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
    elements.replayEntry.classList.add('hidden');
    elements.replayPanel.classList.add('hidden');
    updateUI();
    render();
    const restorableGame = reason === 'boot' ? loadAutosave() : null;
    if (restorableGame) {
        showRestoreBanner(restorableGame);
        setTransientStatus('发现未完成对局，可继续或放弃。', 2200);
        return;
    }

    hideRestoreBanner();
    setTransientStatus(getInitStatusMessage(reason), 1800);
    startTimer();
    if (isAiTurn()) {
        queueAiTurn();
    }
}

// 2. 核心渲染逻辑
function render() {
    drawBoard();
    drawPieces();
    if (!replayMode) {
        drawHoverStone();
    }
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
    const aiPlayer = getAiPlayer();
    if (aiPlayer === null) {
        return;
    }

    aiThinking = true;
    clearTransientStatus();
    updateUI();

    aiTurnTimeout = setTimeout(() => {
        aiTurnTimeout = null;
        const snapshot = board.map((row) => [...row]);
        try {
            aiSearchTask = AI.findBestMoveAsync(snapshot, difficulty, aiPlayer, (move) => {
                aiSearchTask = null;
                aiThinking = false;

                if (move && !gameOver) {
                    placeStone(move.r, move.c);
                } else {
                    updateUI();
                }
            });
        } catch (error) {
            console.error('AI move failed, falling back to synchronous search.', error);
            aiSearchTask = null;
            let move = null;
            try {
                move = AI.findBestMove(snapshot, difficulty, aiPlayer);
            } catch (fallbackError) {
                console.error('Synchronous AI fallback failed.', fallbackError);
                move = typeof AI.getCandidates === 'function'
                    ? AI.getCandidates(board, aiPlayer, aiPlayer === 1 ? 2 : 1)[0]
                    : null;
            }
            aiThinking = false;

            if (move && !gameOver) {
                placeStone(move.r, move.c);
            } else {
                updateUI();
            }
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
        saveCurrentGameState();
        if (mode === 'pve' && isAiTurn() && !gameOver) {
            queueAiTurn();
        }
    }, 200);
}

// 5. 交互与逻辑
function placeStone(r, c) {
    if (gameOver || aiThinking || animatingStone || board[r][c] !== 0) {
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

    clearTransientStatus();
    clearAutosave();
    hideRestoreBanner();
    elements.replayEntry.classList.remove('hidden');
    const statusText = getResultStatusMessage(winner, reason);
    elements.status.innerText = statusText;

    if (mode === 'pve') {
        const aiPlayer = getAiPlayer();
        const playerWon = aiPlayer !== null && winner !== aiPlayer;
        const eloGain = playerWon ? difficulty * 20 : -15;
        elo = Math.max(800, elo + eloGain);
        persistElo();
        saveMatchRecord({
            result: reason ? 'forbidden' : 'win',
            winner,
            reason,
            playerWon
        });
    } else {
        saveMatchRecord({
            result: 'win',
            winner
        });
    }

    updateUI();
}

function handleDraw() {
    clearPendingActions();
    gameOver = true;
    aiThinking = false;
    stopTimer();
    render();
    clearTransientStatus();
    clearAutosave();
    hideRestoreBanner();
    elements.replayEntry.classList.remove('hidden');
    elements.status.innerText = getDrawStatusMessage();
    saveMatchRecord({
        result: 'draw'
    });
    updateUI();
}

// 6. UI 更新
function updateStatusText() {
    if (transientStatusText) {
        elements.status.innerText = transientStatusText;
        return;
    }
    if (gameOver) {
        return;
    }
    elements.status.innerText = getTurnStatusMessage();
}

function getBlockedInputReason(cell) {
    if (replayMode) {
        return '当前处于复盘模式，请先退出复盘。';
    }
    if (gameOver) {
        return '对局已结束，请重开或悔棋。';
    }
    if (aiThinking) {
        return 'AI 思考中，请稍候。';
    }
    if (animatingStone) {
        return '落子动画进行中，请稍候。';
    }
    if (mode === 'pve' && isAiTurn()) {
        return '当前是 AI 回合。';
    }
    if (!cell) {
        return '请点击棋盘交叉点附近。';
    }
    if (board[cell.r][cell.c] !== 0) {
        return '该位置已有棋子。';
    }
    return '';
}

function handleBoardInput(event, source = 'pointer') {
    const cell = getBoardCellFromEvent(event);
    const blockedReason = getBlockedInputReason(cell);
    if (blockedReason) {
        setTransientStatus(blockedReason);
        return;
    }

    if (source === 'pointer') {
        suppressClickUntil = Date.now() + 400;
    } else if (Date.now() < suppressClickUntil) {
        return;
    }

    clearTransientStatus();
    placeStone(cell.r, cell.c);
}

function updateUI() {
    elements.p1Card.classList.toggle('active', currentPlayer === 1 && !gameOver);
    elements.p2Card.classList.toggle('active', currentPlayer === 2 && !gameOver);
    elements.difficultyHint.innerText = getDifficultyDescription(difficulty);
    const aiPlayer = getAiPlayer();
    if (mode === 'pve') {
        elements.p1Name.innerText = aiPlayer === 1 ? '黑子 (AI)' : '黑子 (您)';
        elements.p2Name.innerText = aiPlayer === 2 ? '白子 (AI)' : '白子 (您)';
        elements.firstPlayerSelect.disabled = false;
    } else {
        elements.p1Name.innerText = '黑子 (玩家 1)';
        elements.p2Name.innerText = '白子 (玩家 2)';
        elements.firstPlayerSelect.disabled = true;
    }
    elements.moveCount.innerText = history.length;
    elements.eloScore.innerText = elo;

    const rankIndex = Math.max(0, Math.min(ranks.length - 1, Math.floor((elo - 1000) / 200) + 1));
    elements.rankName.innerText = ranks[rankIndex];
    elements.powerFill.style.width = `${Math.max(0, Math.min(100, (elo - 800) / 20))}%`;
    renderMatchRecordSummary();
    updateStatusText();
    updateAutosavePanel();
    if (!replayMode) {
        elements.replayPanel.classList.add('hidden');
    }
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
    handleBoardInput(event, 'pointer');
});

canvas.addEventListener('click', (event) => {
    handleBoardInput(event, 'click');
});

canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') {
        return;
    }
    if (gameOver || aiThinking || animatingStone || (mode === 'pve' && isAiTurn())) {
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
        setTransientStatus('当前没有可悔的落子。');
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
    if (history.length > 0) {
        saveCurrentGameState();
    } else {
        clearAutosave();
    }
    setTransientStatus(getUndoStatusMessage(), 1800);
    startTimer();
    if (mode === 'pve' && isAiTurn()) {
        queueAiTurn();
    }
});

elements.restoreResumeBtn.addEventListener('click', () => {
    if (!pendingRestoreGame) {
        return;
    }
    applyAutosave(pendingRestoreGame);
});

elements.restoreDiscardBtn.addEventListener('click', () => {
    clearAutosave();
    hideRestoreBanner();
    setTransientStatus('已放弃上次未完成对局。', 1800);
    startTimer();
    if (isAiTurn()) {
        queueAiTurn();
    }
});

elements.autosaveSaveBtn.addEventListener('click', handleManualSave);
elements.autosaveClearBtn.addEventListener('click', handleClearAutosave);
elements.enterReplayBtn.addEventListener('click', () => enterReplay());
elements.recordReplayBtn.addEventListener('click', () => enterReplay(matchRecords[0] || null));
elements.recordHistoryList.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
        return;
    }
    const button = target.closest('.record-history-replay-btn');
    if (!button) {
        return;
    }
    const index = Number(button.dataset.recordIndex);
    if (!Number.isInteger(index) || !matchRecords[index]) {
        return;
    }
    enterReplay(matchRecords[index]);
});
elements.replayStartBtn.addEventListener('click', () => applyReplayPosition(0));
elements.replayPrevBtn.addEventListener('click', () => applyReplayPosition(replayIndex - 1));
elements.replayNextBtn.addEventListener('click', () => applyReplayPosition(replayIndex + 1));
elements.replayEndBtn.addEventListener('click', () => applyReplayPosition(getReplayHistory().length));
elements.replayPlayBtn.addEventListener('click', toggleReplayAutoplay);
elements.exitReplayBtn.addEventListener('click', exitReplay);

elements.restartBtn.addEventListener('click', () => {
    clearAutosave();
    hideRestoreBanner();
    init('restart');
});
elements.modeSelect.addEventListener('change', (event) => {
    mode = event.target.value;
    clearAutosave();
    hideRestoreBanner();
    init('mode');
});
elements.difficultySelect.addEventListener('change', (event) => {
    difficulty = parseInt(event.target.value, 10);
    clearAutosave();
    hideRestoreBanner();
    init('difficulty');
});
elements.firstPlayerSelect.addEventListener('change', (event) => {
    firstPlayer = event.target.value;
    clearAutosave();
    hideRestoreBanner();
    init('firstPlayer');
});
elements.renjuToggle.addEventListener('change', () => {
    updateUI();
    render();
    if (history.length > 0 && !gameOver) {
        saveCurrentGameState();
    }
    setTransientStatus(getRenjuToggleMessage(), 1800);
});

init('boot');
