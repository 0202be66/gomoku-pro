const AI = {
    // 棋型评分表
    SCORE: {
        FIVE: 1000000,   // 连五
        FOUR_LIVE: 50000, // 活四
        FOUR_DEAD: 5000,  // 冲四
        THREE_LIVE: 5000, // 活三
        THREE_DEAD: 500,  // 眠三
        TWO_LIVE: 500,    // 活二
        TWO_DEAD: 50,     // 眠二
        ONE: 10           // 散手
    },

    // 获取最佳落子点
    findBestMove(board, depth, player) {
        let bestScore = -Infinity;
        let bestMoves = [];
        const opponent = player === 1 ? 2 : 1;

        // 获取可能的候选点（只考虑已有棋子周围的空位，优化性能）
        const candidates = this.getCandidates(board);

        for (const move of candidates) {
            board[move.r][move.c] = player;
            // 初始调用 Alpha-Beta
            let score = this.minimax(board, depth - 1, -Infinity, Infinity, false, player, opponent);
            board[move.r][move.c] = 0;

            if (score > bestScore) {
                bestScore = score;
                bestMoves = [move];
            } else if (score === bestScore) {
                bestMoves.push(move);
            }
        }

        // 从得分最高的点中随机选一个
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    },

    // Minimax 递归 + Alpha-Beta 剪枝
    minimax(board, depth, alpha, beta, isMaximizing, player, opponent) {
        // 检查终止条件
        const winResult = this.checkQuickWin(board);
        if (winResult === player) return 10000000 + depth;
        if (winResult === opponent) return -10000000 - depth;
        if (depth === 0) return this.evaluateBoard(board, player, opponent);

        const candidates = this.getCandidates(board);
        if (candidates.length === 0) return 0;

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of candidates) {
                board[move.r][move.c] = player;
                let eval = this.minimax(board, depth - 1, alpha, beta, false, player, opponent);
                board[move.r][move.c] = 0;
                maxEval = Math.max(maxEval, eval);
                alpha = Math.max(alpha, eval);
                if (beta <= alpha) break; // Beta 剪枝
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of candidates) {
                board[move.r][move.c] = opponent;
                let eval = this.minimax(board, depth - 1, alpha, beta, true, player, opponent);
                board[move.r][move.c] = 0;
                minEval = Math.min(minEval, eval);
                beta = Math.min(beta, eval);
                if (beta <= alpha) break; // Alpha 剪枝
            }
            return minEval;
        }
    },

    // 核心评分函数
    evaluateBoard(board, player, opponent) {
        let score = 0;
        score += this.evaluateForPlayer(board, player);
        score -= this.evaluateForPlayer(board, opponent) * 1.2; // 略微增加对手威胁的权重
        return score;
    },

    evaluateForPlayer(board, player) {
        let totalScore = 0;
        const size = 15;
        const checked = { h:[], v:[], d1:[], d2:[] }; // 记录已检查的线，避免重复计算

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (board[r][c] === player) {
                    totalScore += this.getLineScores(board, r, c, player);
                }
            }
        }
        return totalScore;
    },

    getLineScores(board, r, c, p) {
        let score = 0;
        const directions = [[1,0], [0,1], [1,1], [1,-1]];
        for (let [dr, dc] of directions) {
            // 只在连续棋子的开头计算一次
            if (this.isInside(r-dr, c-dc) && board[r-dr][c-dc] === p) continue;
            
            let count = 1;
            let nr = r + dr, nc = c + dc;
            while(this.isInside(nr, nc) && board[nr][nc] === p) { count++; nr += dr; nc += dc; }
            
            // 检查两端是否堵死
            const headBlocked = !this.isInside(r-dr, c-dc) || board[r-dr][c-dc] !== 0;
            const tailBlocked = !this.isInside(nr, nc) || board[nr][nc] !== 0;

            score += this.calculatePatternScore(count, headBlocked, tailBlocked);
        }
        return score;
    },

    calculatePatternScore(count, b1, b2) {
        if (count >= 5) return this.SCORE.FIVE;
        if (b1 && b2) return 0; // 两端堵死没用

        if (count === 4) return (b1 || b2) ? this.SCORE.FOUR_DEAD : this.SCORE.FOUR_LIVE;
        if (count === 3) return (b1 || b2) ? this.SCORE.THREE_DEAD : this.SCORE.THREE_LIVE;
        if (count === 2) return (b1 || b2) ? this.SCORE.TWO_DEAD : this.SCORE.TWO_LIVE;
        return this.SCORE.ONE;
    },

    getCandidates(board) {
        const set = new Set();
        const size = 15;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (board[r][c] !== 0) {
                    // 只检查已有棋子周围 2 格范围内的空位
                    for (let dr = -2; dr <= 2; dr++) {
                        for (let dc = -2; dc <= 2; dc++) {
                            const nr = r + dr, nc = c + dc;
                            if (this.isInside(nr, nc) && board[nr][nc] === 0) {
                                set.add(`${nr},${nc}`);
                            }
                        }
                    }
                }
            }
        }
        if (set.size === 0) return [{r:7, c:7}]; // 第一步走中心
        return Array.from(set).map(s => {
            const [r, c] = s.split(',').map(Number);
            return {r, c};
        });
    },

    isInside(r, c) { return r >= 0 && r < 15 && c >= 0 && c < 15; },

    checkQuickWin(board) {
        const size = 15;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (board[r][c] === 0) continue;
                const p = board[r][c];
                const dirs = [[1,0], [0,1], [1,1], [1,-1]];
                for (let [dr, dc] of dirs) {
                    let count = 1;
                    let nr = r + dr, nc = c + dc;
                    while(this.isInside(nr, nc) && board[nr][nc] === p) { count++; nr += dr; nc += dc; }
                    if (count >= 5) return p;
                }
            }
        }
        return null;
    }
};