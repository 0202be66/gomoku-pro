const AI = {
    SCORE: {
        FIVE: 1000000,
        FOUR_LIVE: 50000,
        FOUR_DEAD: 5000,
        THREE_LIVE: 5000,
        THREE_DEAD: 500,
        TWO_LIVE: 500,
        TWO_DEAD: 50,
        ONE: 10
    },

    DIRECTIONS: [[1, 0], [0, 1], [1, 1], [1, -1]],

    findBestMove(board, depth, player) {
        let bestScore = -Infinity;
        let bestMoves = [];
        const opponent = player === 1 ? 2 : 1;
        const candidates = this.getCandidates(board, player, opponent);
        if (candidates.length === 0) {
            return { r: 7, c: 7 };
        }

        const winningMove = this.findImmediateWinningMove(board, candidates, player);
        if (winningMove) {
            return winningMove;
        }

        const blockingMove = this.findImmediateWinningMove(board, candidates, opponent);
        if (blockingMove) {
            return blockingMove;
        }

        for (const move of candidates) {
            board[move.r][move.c] = player;
            const score = this.minimax(board, depth - 1, -Infinity, Infinity, false, player, opponent);
            board[move.r][move.c] = 0;

            if (score > bestScore) {
                bestScore = score;
                bestMoves = [move];
            } else if (score === bestScore) {
                bestMoves.push(move);
            }
        }

        return bestMoves.length > 0
            ? bestMoves[Math.floor(Math.random() * bestMoves.length)]
            : candidates[0];
    },

    findImmediateWinningMove(board, candidates, player) {
        for (const move of candidates) {
            board[move.r][move.c] = player;
            const isWin = this.isWinningMove(board, move.r, move.c, player);
            board[move.r][move.c] = 0;
            if (isWin) {
                return move;
            }
        }
        return null;
    },

    minimax(board, depth, alpha, beta, isMaximizing, player, opponent) {
        const winResult = this.checkQuickWin(board);
        if (winResult === player) {
            return 10000000 + depth;
        }
        if (winResult === opponent) {
            return -10000000 - depth;
        }
        if (depth === 0) {
            return this.evaluateBoard(board, player, opponent);
        }

        const sideToMove = isMaximizing ? player : opponent;
        const rival = sideToMove === player ? opponent : player;
        const candidates = this.getCandidates(board, sideToMove, rival);
        if (candidates.length === 0) {
            return 0;
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of candidates) {
                board[move.r][move.c] = player;
                const evaluation = this.minimax(board, depth - 1, alpha, beta, false, player, opponent);
                board[move.r][move.c] = 0;
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) {
                    break;
                }
            }
            return maxEval;
        }

        let minEval = Infinity;
        for (const move of candidates) {
            board[move.r][move.c] = opponent;
            const evaluation = this.minimax(board, depth - 1, alpha, beta, true, player, opponent);
            board[move.r][move.c] = 0;
            minEval = Math.min(minEval, evaluation);
            beta = Math.min(beta, evaluation);
            if (beta <= alpha) {
                break;
            }
        }
        return minEval;
    },

    evaluateBoard(board, player, opponent) {
        return this.evaluateForPlayer(board, player) - this.evaluateForPlayer(board, opponent) * 1.2;
    },

    evaluateForPlayer(board, player) {
        let totalScore = 0;
        for (let r = 0; r < 15; r++) {
            for (let c = 0; c < 15; c++) {
                if (board[r][c] === player) {
                    totalScore += this.getLineScores(board, r, c, player);
                }
            }
        }
        return totalScore;
    },

    getLineScores(board, r, c, player) {
        let score = 0;
        for (const [dr, dc] of this.DIRECTIONS) {
            if (this.isInside(r - dr, c - dc) && board[r - dr][c - dc] === player) {
                continue;
            }

            let count = 1;
            let nr = r + dr;
            let nc = c + dc;
            while (this.isInside(nr, nc) && board[nr][nc] === player) {
                count++;
                nr += dr;
                nc += dc;
            }

            const headBlocked = !this.isInside(r - dr, c - dc) || board[r - dr][c - dc] !== 0;
            const tailBlocked = !this.isInside(nr, nc) || board[nr][nc] !== 0;
            score += this.calculatePatternScore(count, headBlocked, tailBlocked);
        }
        return score;
    },

    calculatePatternScore(count, blockedHead, blockedTail) {
        if (count >= 5) {
            return this.SCORE.FIVE;
        }
        if (blockedHead && blockedTail) {
            return 0;
        }
        if (count === 4) {
            return blockedHead || blockedTail ? this.SCORE.FOUR_DEAD : this.SCORE.FOUR_LIVE;
        }
        if (count === 3) {
            return blockedHead || blockedTail ? this.SCORE.THREE_DEAD : this.SCORE.THREE_LIVE;
        }
        if (count === 2) {
            return blockedHead || blockedTail ? this.SCORE.TWO_DEAD : this.SCORE.TWO_LIVE;
        }
        return this.SCORE.ONE;
    },

    scoreCandidate(board, r, c, player, opponent) {
        const attack = this.scorePoint(board, r, c, player);
        const defense = this.scorePoint(board, r, c, opponent);
        const center = this.centerWeight(r, c);
        return attack * 1.05 + defense + center;
    },

    centerWeight(r, c) {
        return 14 - (Math.abs(r - 7) + Math.abs(c - 7));
    },

    scorePoint(board, r, c, player) {
        board[r][c] = player;
        let totalScore = 0;

        for (const [dr, dc] of this.DIRECTIONS) {
            const { count, openEnds } = this.scanLine(board, r, c, player, dr, dc);
            totalScore += this.scoreLocalPattern(count, openEnds);
        }

        board[r][c] = 0;
        return totalScore;
    },

    scanLine(board, r, c, player, dr, dc) {
        let count = 1;
        let openEnds = 0;

        let nr = r + dr;
        let nc = c + dc;
        while (this.isInside(nr, nc) && board[nr][nc] === player) {
            count++;
            nr += dr;
            nc += dc;
        }
        if (this.isInside(nr, nc) && board[nr][nc] === 0) {
            openEnds++;
        }

        nr = r - dr;
        nc = c - dc;
        while (this.isInside(nr, nc) && board[nr][nc] === player) {
            count++;
            nr -= dr;
            nc -= dc;
        }
        if (this.isInside(nr, nc) && board[nr][nc] === 0) {
            openEnds++;
        }

        return { count, openEnds };
    },

    scoreLocalPattern(count, openEnds) {
        if (count >= 5) {
            return this.SCORE.FIVE;
        }
        if (openEnds === 0) {
            return 0;
        }
        if (count === 4) {
            return openEnds === 2 ? this.SCORE.FOUR_LIVE : this.SCORE.FOUR_DEAD;
        }
        if (count === 3) {
            return openEnds === 2 ? this.SCORE.THREE_LIVE : this.SCORE.THREE_DEAD;
        }
        if (count === 2) {
            return openEnds === 2 ? this.SCORE.TWO_LIVE : this.SCORE.TWO_DEAD;
        }
        return openEnds === 2 ? this.SCORE.ONE * 2 : this.SCORE.ONE;
    },

    getCandidates(board, player = 0, opponent = 0) {
        const set = new Set();
        for (let r = 0; r < 15; r++) {
            for (let c = 0; c < 15; c++) {
                if (board[r][c] !== 0) {
                    for (let dr = -2; dr <= 2; dr++) {
                        for (let dc = -2; dc <= 2; dc++) {
                            const nr = r + dr;
                            const nc = c + dc;
                            if (this.isInside(nr, nc) && board[nr][nc] === 0) {
                                set.add(`${nr},${nc}`);
                            }
                        }
                    }
                }
            }
        }

        if (set.size === 0) {
            return [{ r: 7, c: 7 }];
        }

        const candidates = Array.from(set, (value) => {
            const [r, c] = value.split(',').map(Number);
            return { r, c };
        });

        if (!player || !opponent) {
            return candidates;
        }

        return candidates.sort((a, b) => (
            this.scoreCandidate(board, b.r, b.c, player, opponent)
            - this.scoreCandidate(board, a.r, a.c, player, opponent)
        ));
    },

    isWinningMove(board, r, c, player) {
        for (const [dr, dc] of this.DIRECTIONS) {
            let count = 1;

            let nr = r + dr;
            let nc = c + dc;
            while (this.isInside(nr, nc) && board[nr][nc] === player) {
                count++;
                nr += dr;
                nc += dc;
            }

            nr = r - dr;
            nc = c - dc;
            while (this.isInside(nr, nc) && board[nr][nc] === player) {
                count++;
                nr -= dr;
                nc -= dc;
            }

            if (count >= 5) {
                return true;
            }
        }
        return false;
    },

    isInside(r, c) {
        return r >= 0 && r < 15 && c >= 0 && c < 15;
    },

    checkQuickWin(board) {
        for (let r = 0; r < 15; r++) {
            for (let c = 0; c < 15; c++) {
                if (board[r][c] === 0) {
                    continue;
                }
                const player = board[r][c];
                if (this.isWinningMove(board, r, c, player)) {
                    return player;
                }
            }
        }
        return null;
    }
};
