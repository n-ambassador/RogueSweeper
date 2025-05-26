// RogueSweeper - Classic Minesweeper
class RogueSweeper {
    constructor() {
        this.difficulties = {
            easy: { rows: 9, cols: 9, mines: 10 },
            medium: { rows: 16, cols: 16, mines: 40 },
            hard: { rows: 16, cols: 30, mines: 99 }
        };
        
        this.currentDifficulty = 'easy';
        this.gameState = 'waiting'; // 'waiting', 'playing', 'won', 'lost', 'stage_complete'
        this.firstClick = true;
        this.startTime = null;
        this.timer = null;
        this.elapsedTime = 0;
        
        // Roguelike progression
        this.currentStage = 1;
        this.totalScore = 0;
        this.stagesCleared = 0;
        this.lives = 3;
        
        // Item/skill system
        this.selectedReward = null;
        this.safeRevealUses = 1; // 初期装備として1つ持つ
        this.safeRevealMode = false;
        
        // Game board
        this.board = [];
        this.rows = 0;
        this.cols = 0;
        this.totalMines = 0;
        this.flaggedCells = 0;
        this.revealedCells = 0;
        this.hintsUsed = 0;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.newGame();
    }
    
    newGame() {
        // Reset progression for new game
        this.currentStage = 1;
        this.totalScore = 0;
        this.stagesCleared = 0;
        this.lives = 3;
        this.startStage();
    }
    
    startStage() {
        // Generate stage-based configuration
        const stageConfig = this.getStageConfig(this.currentStage);
        this.rows = stageConfig.rows;
        this.cols = stageConfig.cols;
        this.totalMines = stageConfig.mines;
        
        this.gameState = 'waiting';
        this.firstClick = true;
        this.flaggedCells = 0;
        this.revealedCells = 0;
        this.hintsUsed = 0;
        this.elapsedTime = 0;
        
        this.clearTimer();
        this.createBoard();
        this.renderBoard();
        this.updateUI();
        
        document.getElementById('gameOverlay').style.display = 'none';
    }
    
    getStageConfig(stage) {
        // Progressive difficulty based on stage
        const baseSize = Math.min(8 + Math.floor(stage / 3), 20); // Start at 8x8, grow slowly
        const rows = baseSize + Math.floor(Math.random() * 3); // Some randomness
        const cols = baseSize + Math.floor(Math.random() * 3);
        const mineRatio = Math.min(0.1 + (stage * 0.01), 0.25); // Start at 10%, max 25%
        const mines = Math.floor(rows * cols * mineRatio);
        
        return { rows, cols, mines };
    }
    
    createBoard() {
        this.board = [];
        for (let row = 0; row < this.rows; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.cols; col++) {
                this.board[row][col] = {
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    neighborMines: 0,
                    row: row,
                    col: col
                };
            }
        }
    }
    
    placeMines(excludeRow, excludeCol) {
        let minesPlaced = 0;
        
        while (minesPlaced < this.totalMines) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);
            
            // Don't place mine on first click or if already has mine
            if ((row === excludeRow && col === excludeCol) || this.board[row][col].isMine) {
                continue;
            }
            
            this.board[row][col].isMine = true;
            minesPlaced++;
        }
        
        this.calculateNeighborMines();
    }
    
    calculateNeighborMines() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (!this.board[row][col].isMine) {
                    this.board[row][col].neighborMines = this.countNeighborMines(row, col);
                }
            }
        }
    }
    
    countNeighborMines(row, col) {
        let count = 0;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const newRow = row + i;
                const newCol = col + j;
                
                if (this.isValidCell(newRow, newCol) && this.board[newRow][newCol].isMine) {
                    count++;
                }
            }
        }
        return count;
    }
    
    isValidCell(row, col) {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }
    
    renderBoard() {
        const minefield = document.getElementById('minefield');
        minefield.innerHTML = '';
        minefield.className = 'minefield';
        
        // Set CSS grid template
        minefield.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        minefield.style.gridTemplateRows = `repeat(${this.rows}, 1fr)`;
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                this.updateCellDisplay(cell, this.board[row][col]);
                minefield.appendChild(cell);
            }
        }
    }
    
    updateCellDisplay(cellElement, cellData) {
        cellElement.className = 'cell';
        cellElement.textContent = '';
        
        if (cellData.isFlagged) {
            cellElement.classList.add('flagged');
            if (cellData.autoFlagged) {
                cellElement.classList.add('auto-flagged');
                cellElement.textContent = '🔒';
            } else {
                cellElement.textContent = '🚩';
            }
        } else if (cellData.isRevealed) {
            cellElement.classList.add('revealed');
            
            if (cellData.isMine) {
                // Check if this is a life-lost mine (has life-lost class)
                if (cellElement.classList.contains('life-lost')) {
                    cellElement.style.background = 'linear-gradient(145deg, #ff6b6b, #e55656)';
                    cellElement.textContent = '💔';
                } else {
                    cellElement.classList.add('mine');
                    cellElement.textContent = '💣';
                }
            } else if (cellData.neighborMines > 0) {
                cellElement.textContent = cellData.neighborMines;
                cellElement.classList.add(`num-${cellData.neighborMines}`);
            }
        }
    }
    
    handleCellClick(row, col, button = 0) {
        const cell = this.board[row][col];
        
        if (this.gameState === 'won' || this.gameState === 'lost') {
            return;
        }
        
        if (button === 0) { // Left click
            this.handleLeftClick(row, col);
        } else if (button === 2) { // Right click
            this.handleRightClick(row, col);
        } else if (button === 1) { // Middle click
            this.handleMiddleClick(row, col);
        }
        
        this.updateUI();
    }
    
    handleLeftClick(row, col) {
        const cell = this.board[row][col];
        
        if (cell.isFlagged || cell.isRevealed) {
            return;
        }
        
        // First click logic
        if (this.firstClick) {
            this.firstClick = false;
            this.gameState = 'playing';
            this.placeMines(row, col);
            this.startTimer();
        }
        
        if (cell.isMine) {
            // Use life to survive the mine
            if (this.lives > 1) {
                this.lives--;
                this.showLifeLostMessage(row, col);
                this.revealCell(row, col); // Reveal the mine but don't end game
                this.renderBoard();
                this.updateUI();
            } else {
                // Last life - game over
                this.revealAllMines();
                this.endGame(false);
            }
        } else {
            this.revealCell(row, col);
            this.renderBoard();
            this.checkWinCondition();
        }
    }
    
    showLifeLostMessage(row, col) {
        // Create visual feedback for life lost
        const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cellElement.style.background = 'linear-gradient(145deg, #ff6b6b, #e55656)';
        cellElement.textContent = '💔';
        cellElement.classList.add('life-lost');
        
        // Show floating damage text
        this.showFloatingText(`-1 ライフ (残り${this.lives})`, row, col, '#ff6b6b');
        
        // Temporary screen effect
        document.body.style.background = 'rgba(255, 0, 0, 0.2)';
        setTimeout(() => {
            document.body.style.background = '';
        }, 300);
    }
    
    showFloatingText(text, row, col, color = '#fff') {
        const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        const rect = cellElement.getBoundingClientRect();
        
        const floatingText = document.createElement('div');
        floatingText.textContent = text;
        floatingText.style.cssText = `
            position: fixed;
            left: ${rect.left + rect.width/2}px;
            top: ${rect.top}px;
            color: ${color};
            font-weight: bold;
            font-size: 14px;
            pointer-events: none;
            z-index: 1000;
            transform: translateX(-50%);
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        `;
        
        document.body.appendChild(floatingText);
        
        // Animate upward and fade out
        let opacity = 1;
        let y = 0;
        const animate = () => {
            y -= 2;
            opacity -= 0.02;
            floatingText.style.transform = `translate(-50%, ${y}px)`;
            floatingText.style.opacity = opacity;
            
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                floatingText.remove();
            }
        };
        animate();
    }
    
    handleRightClick(row, col) {
        const cell = this.board[row][col];
        
        if (cell.isRevealed) {
            return;
        }
        
        // 自動フラグは外せない
        if (cell.isFlagged && cell.autoFlagged) {
            this.showFloatingText('自動フラグは外せません', row, col, '#ff6b6b');
            return;
        }
        
        if (cell.isFlagged) {
            cell.isFlagged = false;
            this.flaggedCells--;
        } else {
            cell.isFlagged = true;
            this.flaggedCells++;
        }
        
        this.renderBoard();
    }
    
    handleMiddleClick(row, col) {
        const cell = this.board[row][col];
        
        if (!cell.isRevealed || cell.neighborMines === 0) {
            return;
        }
        
        // Count flagged neighbors
        let flaggedNeighbors = 0;
        const neighbors = this.getNeighbors(row, col);
        
        neighbors.forEach(([nRow, nCol]) => {
            if (this.board[nRow][nCol].isFlagged) {
                flaggedNeighbors++;
            }
        });
        
        // If flagged neighbors match the number, reveal unflagged neighbors
        if (flaggedNeighbors === cell.neighborMines) {
            neighbors.forEach(([nRow, nCol]) => {
                const neighbor = this.board[nRow][nCol];
                if (!neighbor.isFlagged && !neighbor.isRevealed) {
                    if (neighbor.isMine) {
                        this.revealAllMines();
                        this.endGame(false);
                        return;
                    } else {
                        this.revealCell(nRow, nCol);
                    }
                }
            });
            
            this.renderBoard();
            this.checkWinCondition();
        }
    }
    
    revealCell(row, col) {
        const cell = this.board[row][col];
        
        if (cell.isRevealed || cell.isFlagged) {
            return;
        }
        
        cell.isRevealed = true;
        this.revealedCells++;
        
        // If cell has no neighboring mines and is not a mine itself, reveal all neighbors
        if (cell.neighborMines === 0 && !cell.isMine) {
            const neighbors = this.getNeighbors(row, col);
            neighbors.forEach(([nRow, nCol]) => {
                this.revealCell(nRow, nCol);
            });
        }
        
        // renderBoard()は呼び出し元で行う
    }
    
    getNeighbors(row, col) {
        const neighbors = [];
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue;
                
                const newRow = row + i;
                const newCol = col + j;
                
                if (this.isValidCell(newRow, newCol)) {
                    neighbors.push([newRow, newCol]);
                }
            }
        }
        return neighbors;
    }
    
    revealAllMines() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = this.board[row][col];
                if (cell.isMine) {
                    cell.isRevealed = true;
                }
            }
        }
        this.renderBoard();
    }
    
    checkWinCondition() {
        const totalCells = this.rows * this.cols;
        const safeCells = totalCells - this.totalMines;
        
        if (this.revealedCells === safeCells) {
            this.completeStage('normal');
        }
    }
    
    completeStage(winType = 'normal') {
        // Calculate stage score
        const timeBonus = Math.max(0, 300 - this.elapsedTime); // Bonus for fast completion
        const stageScore = (this.totalMines * 10) + timeBonus + (this.currentStage * 5);
        this.totalScore += stageScore;
        this.stagesCleared++;
        
        this.gameState = 'stage_complete';
        this.clearTimer();
        
        // Show stage completion overlay
        this.showStageCompleteOverlay(stageScore, winType);
    }
    
    showStageCompleteOverlay(stageScore, winType) {
        const overlay = document.getElementById('gameOverlay');
        const title = document.getElementById('overlayTitle');
        const message = document.getElementById('overlayMessage');
        
        if (winType === 'perfect') {
            title.textContent = '🌟 ステージクリア！';
            message.textContent = '完璧なフラグ配置でクリア！';
        } else {
            title.textContent = '🎉 ステージクリア！';
            message.textContent = 'おめでとうございます！';
        }
        
        // Show stage completion stats
        document.getElementById('finalTime').textContent = this.elapsedTime.toString().padStart(3, '0');
        document.getElementById('flagAccuracy').textContent = '100'; // Always 100% on success
        document.getElementById('cellsOpened').textContent = `ステージ${this.currentStage}スコア: ${stageScore}`;
        
        // Hide button for auto-advancing stages
        document.getElementById('playAgainBtn').style.display = 'none';
        
        overlay.style.display = 'flex';
        
        // Show reward selection after delay
        setTimeout(() => {
            this.showRewardSelection();
        }, 2000);
    }
    
    showRewardSelection() {
        const overlay = document.getElementById('gameOverlay');
        const title = document.getElementById('overlayTitle');
        const message = document.getElementById('overlayMessage');
        
        title.textContent = '🎁 報酬を選択';
        message.textContent = '1つを選んでください';
        
        // Generate 3 reward options
        const rewards = this.generateRewardOptions();
        
        // Show reward options in stats area
        document.getElementById('finalTime').textContent = '';
        document.getElementById('flagAccuracy').textContent = '';
        document.getElementById('cellsOpened').innerHTML = `
            <div class="reward-selection">
                <button class="reward-btn" data-reward="0">
                    ${rewards[0].icon} ${rewards[0].name}<br>
                    <small>${rewards[0].description}</small>
                </button>
                <button class="reward-btn" data-reward="1">
                    ${rewards[1].icon} ${rewards[1].name}<br>
                    <small>${rewards[1].description}</small>
                </button>
                <button class="reward-btn" data-reward="2">
                    ${rewards[2].icon} ${rewards[2].name}<br>
                    <small>${rewards[2].description}</small>
                </button>
            </div>
        `;
        
        // Add event listeners to reward buttons
        document.querySelectorAll('.reward-btn').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                this.selectReward(rewards[index]);
            });
        });
        
        document.getElementById('playAgainBtn').style.display = 'none';
    }
    
    generateRewardOptions() {
        const rewardTypes = [
            {
                icon: '❤️',
                name: 'ライフ+1',
                description: 'ライフが1つ増加',
                type: 'life',
                value: 1
            },
            {
                icon: '🛡️',
                name: 'アーマー',
                description: '任意のマスを安全に確認',
                type: 'safe_reveal',
                value: 1
            }
        ];
        
        // Generate 3 random rewards
        const options = [];
        for (let i = 0; i < 3; i++) {
            const reward = rewardTypes[Math.floor(Math.random() * rewardTypes.length)];
            options.push({ ...reward });
        }
        
        return options;
    }
    
    selectReward(reward) {
        // Apply reward effect
        if (reward.type === 'life') {
            this.lives += reward.value;
        } else if (reward.type === 'safe_reveal') {
            this.safeRevealUses = (this.safeRevealUses || 0) + reward.value;
        }
        
        // Hide overlay and proceed to next stage
        document.getElementById('gameOverlay').style.display = 'none';
        this.nextStage();
    }
    
    nextStage() {
        this.currentStage++;
        this.startStage();
    }
    
    checkBombFlags() {
        if (this.gameState !== 'playing' && this.gameState !== 'waiting') {
            return;
        }
        
        // If waiting state, need to start the game first
        if (this.gameState === 'waiting') {
            // Can't check if no mines are placed yet
            const checkBtn = document.getElementById('checkBtn');
            checkBtn.textContent = 'ゲーム開始してください';
            checkBtn.style.background = 'linear-gradient(45deg, #95a5a6, #7f8c8d)';
            
            setTimeout(() => {
                checkBtn.textContent = '💣 爆弾チェック';
                checkBtn.style.background = 'linear-gradient(45deg, #2ecc71, #27ae60)';
            }, 2000);
            return;
        }
        
        // Check if all mines are flagged and no safe cells are flagged
        let correctFlags = 0;
        let incorrectFlags = 0;
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = this.board[row][col];
                
                if (cell.isFlagged) {
                    if (cell.isMine) {
                        correctFlags++;
                    } else {
                        incorrectFlags++;
                    }
                }
            }
        }
        
        // Check if all mines are flagged
        if (correctFlags === this.totalMines && incorrectFlags === 0) {
            // Perfect flagging! Complete stage
            this.completeStage('perfect');
        } else {
            // Challenge mode: Any incorrect count = game over!
            let loseReason = 'imperfect';
            if (incorrectFlags > 0) {
                loseReason = 'wrong_flag';
            } else if (correctFlags < this.totalMines) {
                loseReason = 'missing_flags';
            } else if (correctFlags > this.totalMines) {
                loseReason = 'too_many_flags';
            }
            this.endGame(false, loseReason);
        }
    }
    
    endGame(won, winType = 'normal') {
        if (!won) {
            this.lives--;
            
            // If still have lives, restart current stage
            if (this.lives > 0) {
                this.clearTimer();
                this.showLifeLostOverlay();
                return;
            }
        }
        
        this.gameState = won ? 'won' : 'lost';
        this.clearTimer();
        
        const minefield = document.getElementById('minefield');
        minefield.classList.add(won ? 'game-won' : 'game-lost');
        
        if (won) {
            // Auto-flag remaining mines
            for (let row = 0; row < this.rows; row++) {
                for (let col = 0; col < this.cols; col++) {
                    const cell = this.board[row][col];
                    if (cell.isMine && !cell.isFlagged) {
                        cell.isFlagged = true;
                        this.flaggedCells++;
                    }
                }
            }
            this.renderBoard();
        } else if (winType !== 'normal') {
            // Show all mines when failed by check button (any challenge failure)
            this.revealAllMines();
        }
        
        setTimeout(() => {
            this.showGameOverlay(won, winType);
        }, 500);
    }
    
    showLifeLostOverlay() {
        const overlay = document.getElementById('gameOverlay');
        const title = document.getElementById('overlayTitle');
        const message = document.getElementById('overlayMessage');
        
        title.textContent = '💔 ライフ消費';
        message.textContent = `残りライフ: ${this.lives}`;
        
        document.getElementById('finalTime').textContent = this.elapsedTime.toString().padStart(3, '0');
        document.getElementById('flagAccuracy').textContent = '0';
        document.getElementById('cellsOpened').textContent = 'ステージ再挑戦';
        
        document.getElementById('playAgainBtn').style.display = 'none';
        overlay.style.display = 'flex';
        
        // Auto restart after 2 seconds
        setTimeout(() => {
            overlay.style.display = 'none';
            this.startStage(); // Restart current stage
        }, 2000);
    }
    
    showGameOverlay(won, winType = 'normal') {
        const overlay = document.getElementById('gameOverlay');
        const title = document.getElementById('overlayTitle');
        const message = document.getElementById('overlayMessage');
        
        if (won) {
            if (winType === 'perfect') {
                title.textContent = '🌟 完璧勝利！';
                message.textContent = '全ての爆弾を正確にフラグしました！';
            } else {
                title.textContent = '🎉 勝利！';
                message.textContent = 'おめでとうございます！';
            }
        } else {
            if (winType === 'wrong_flag') {
                title.textContent = '🚩 チャレンジ失敗！';
                message.textContent = '間違った場所にフラグを立てていました...';
            } else if (winType === 'missing_flags') {
                title.textContent = '⚠️ チャレンジ失敗！';
                message.textContent = 'フラグが足りませんでした...';
            } else if (winType === 'too_many_flags') {
                title.textContent = '⚠️ チャレンジ失敗！';
                message.textContent = 'フラグが多すぎました...';
            } else {
                title.textContent = '💥 失敗...';
                message.textContent = '地雷を踏んでしまいました...';
            }
        }
        
        // Calculate statistics
        const totalCells = this.rows * this.cols;
        const flagAccuracy = this.flaggedCells > 0 ? Math.round((this.flaggedCells / this.totalMines) * 100) : 0;
        
        document.getElementById('finalTime').textContent = this.elapsedTime.toString().padStart(3, '0');
        document.getElementById('flagAccuracy').textContent = flagAccuracy;
        document.getElementById('cellsOpened').textContent = this.revealedCells;
        
        // Show restart button for game over (not stage completion)
        document.getElementById('playAgainBtn').style.display = 'inline-block';
        
        overlay.style.display = 'flex';
    }
    
    giveHint() {
        if (this.gameState !== 'playing') {
            return;
        }
        
        // Find a safe cell to reveal
        const safeCells = [];
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = this.board[row][col];
                if (!cell.isRevealed && !cell.isFlagged && !cell.isMine) {
                    safeCells.push([row, col]);
                }
            }
        }
        
        if (safeCells.length > 0) {
            const [hintRow, hintCol] = safeCells[Math.floor(Math.random() * safeCells.length)];
            const cellElement = document.querySelector(`[data-row="${hintRow}"][data-col="${hintCol}"]`);
            
            cellElement.classList.add('safe-hint');
            setTimeout(() => {
                cellElement.classList.remove('safe-hint');
            }, 2000);
            
            this.hintsUsed++;
        }
    }
    
    startTimer() {
        this.startTime = Date.now();
        this.timer = setInterval(() => {
            this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
            this.updateTimer();
        }, 1000);
    }
    
    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    
    updateTimer() {
        document.getElementById('timer').textContent = this.elapsedTime.toString().padStart(3, '0');
    }
    
    updateUI() {
        document.getElementById('mineCount').textContent = this.totalMines;
        document.getElementById('flagCount').textContent = this.flaggedCells;
        document.getElementById('currentStage').textContent = this.currentStage;
        document.getElementById('totalScore').textContent = this.totalScore;
        document.getElementById('livesCount').textContent = this.lives;
        document.getElementById('safeRevealCount').textContent = this.safeRevealUses;
        
        // Update check button state
        this.updateCheckButton();
        this.updateSafeRevealButton();
    }
    
    updateCheckButton() {
        const checkBtn = document.getElementById('checkBtn');
        
        // Always enable the button, but show different states
        checkBtn.disabled = false;
        
        if (this.gameState === 'waiting') {
            checkBtn.classList.remove('ready');
            checkBtn.textContent = '💣 爆弾チェック';
            return;
        }
        
        if (this.gameState !== 'playing') {
            checkBtn.classList.remove('ready');
            checkBtn.textContent = '💣 爆弾チェック';
            return;
        }
        
        // Check if we have the right number of flags
        if (this.flaggedCells === this.totalMines) {
            checkBtn.classList.add('ready');
            checkBtn.textContent = '💣 爆弾チェック ✨';
        } else {
            checkBtn.classList.remove('ready');
            if (this.flaggedCells === 0) {
                checkBtn.textContent = '💣 爆弾チェック';
            } else {
                const remaining = this.totalMines - this.flaggedCells;
                checkBtn.textContent = `💣 爆弾チェック (${Math.abs(remaining)})`;
            }
        }
    }
    
    updateSafeRevealButton() {
        const safeBtn = document.getElementById('safeRevealBtn');
        
        if (this.safeRevealUses <= 0) {
            safeBtn.disabled = true;
            safeBtn.textContent = '🛡️ アーマー (使用不可)';
        } else {
            safeBtn.disabled = false;
            if (this.safeRevealMode) {
                safeBtn.textContent = '🛡️ モード中 (クリックしてキャンセル)';
            } else {
                safeBtn.textContent = `🛡️ アーマー (${this.safeRevealUses})`;
            }
        }
    }
    
    bindEvents() {
        // New game button
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.newGame();
        });
        
        // Hint button
        document.getElementById('hintBtn').addEventListener('click', () => {
            this.giveHint();
        });
        
        // Check button
        document.getElementById('checkBtn').addEventListener('click', () => {
            this.checkBombFlags();
        });
        
        // Safe reveal button
        document.getElementById('safeRevealBtn').addEventListener('click', () => {
            this.toggleSafeRevealMode();
        });
        
        // Play again button
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            console.log('Play again clicked'); // Debug log
            this.newGame();
        });
        
        // Cell clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('cell')) {
                const row = parseInt(e.target.dataset.row);
                const col = parseInt(e.target.dataset.col);
                if (this.safeRevealMode) {
                    this.useSafeReveal(row, col);
                } else {
                    this.handleCellClick(row, col, 0);
                }
            }
        });
        
        document.addEventListener('contextmenu', (e) => {
            if (e.target.classList.contains('cell')) {
                e.preventDefault();
                const row = parseInt(e.target.dataset.row);
                const col = parseInt(e.target.dataset.col);
                if (this.safeRevealMode) {
                    this.useSafeReveal(row, col);
                } else {
                    this.handleCellClick(row, col, 2);
                }
            }
        });
        
        document.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('cell') && e.button === 1) {
                e.preventDefault();
                const row = parseInt(e.target.dataset.row);
                const col = parseInt(e.target.dataset.col);
                if (this.safeRevealMode) {
                    this.useSafeReveal(row, col);
                } else {
                    this.handleCellClick(row, col, 1);
                }
            }
        });
        
        // Prevent context menu on right click
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.minefield')) {
                e.preventDefault();
            }
        });
    }
    
    toggleSafeRevealMode() {
        if (this.safeRevealUses <= 0) return;
        
        this.safeRevealMode = !this.safeRevealMode;
        const btn = document.getElementById('safeRevealBtn');
        
        if (this.safeRevealMode) {
            btn.textContent = '🛡️ モード中 (クリックしてキャンセル)';
            btn.style.background = 'linear-gradient(45deg, #e74c3c, #c0392b)';
            this.showFloatingText('任意のマスをクリックしてください', 0, 0, '#9b59b6');
        } else {
            btn.textContent = '🛡️ アーマー';
            btn.style.background = '';
        }
    }
    
    useSafeReveal(row, col) {
        const cell = this.board[row][col];
        
        if (cell.isRevealed || cell.isFlagged) {
            this.showFloatingText('そのマスは使用できません', row, col, '#ff6b6b');
            // モードは継続（別のマスを選ばせる）
            return;
        }
        
        // 使用回数を消費
        this.safeRevealUses--;
        this.safeRevealMode = false;
        
        if (cell.isMine) {
            // 爆弾だった場合：ライフを消費して自動フラグ設置
            if (this.lives > 1) {
                this.lives--;
                cell.isFlagged = true;
                cell.autoFlagged = true;
                this.flaggedCells++;
                this.showFloatingText(`爆弾発見！ライフ-1 (残り${this.lives})`, row, col, '#e74c3c');
                // フラグ設置後は盤面を再描画
                this.renderBoard();
            } else {
                // 最後のライフの場合はゲームオーバー
                this.revealAllMines();
                // UIを更新してからゲーム終了
                const btn = document.getElementById('safeRevealBtn');
                btn.textContent = '🛡️ アーマー';
                btn.style.background = '';
                this.renderBoard();
                this.updateUI();
                this.endGame(false);
                return;
            }
        } else {
            // 安全なマスだった場合：普通に開く
            this.revealCell(row, col);
            this.renderBoard(); // 盤面を再描画
            this.showFloatingText('安全なマスでした', row, col, '#2ecc71');
        }
        
        // UIを更新
        const btn = document.getElementById('safeRevealBtn');
        btn.textContent = '🛡️ アーマー';
        btn.style.background = '';
        
        this.updateUI();
        this.checkWinCondition();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new RogueSweeper();
    console.log('💣 RogueSweeper loaded! Ready to sweep some mines!');
});