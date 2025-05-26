// RogueSweeper - Classic Minesweeper
class RogueSweeper {
    constructor() {
        this.difficulties = {
            easy: { rows: 9, cols: 9, mines: 10 },
            medium: { rows: 16, cols: 16, mines: 40 },
            hard: { rows: 16, cols: 30, mines: 99 }
        };
        
        this.currentDifficulty = 'easy';
        this.gameState = 'waiting'; // 'waiting', 'playing', 'won', 'lost'
        this.firstClick = true;
        this.startTime = null;
        this.timer = null;
        this.elapsedTime = 0;
        
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
        const config = this.difficulties[this.currentDifficulty];
        this.rows = config.rows;
        this.cols = config.cols;
        this.totalMines = config.mines;
        
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
            cellElement.textContent = '🚩';
        } else if (cellData.isRevealed) {
            cellElement.classList.add('revealed');
            
            if (cellData.isMine) {
                cellElement.classList.add('mine');
                cellElement.textContent = '💣';
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
            this.revealAllMines();
            this.endGame(false);
        } else {
            this.revealCell(row, col);
            this.checkWinCondition();
        }
    }
    
    handleRightClick(row, col) {
        const cell = this.board[row][col];
        
        if (cell.isRevealed) {
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
        
        // If cell has no neighboring mines, reveal all neighbors
        if (cell.neighborMines === 0) {
            const neighbors = this.getNeighbors(row, col);
            neighbors.forEach(([nRow, nCol]) => {
                this.revealCell(nRow, nCol);
            });
        }
        
        this.renderBoard();
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
            this.endGame(true);
        }
    }
    
    endGame(won) {
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
        }
        
        setTimeout(() => {
            this.showGameOverlay(won);
        }, 500);
    }
    
    showGameOverlay(won) {
        const overlay = document.getElementById('gameOverlay');
        const title = document.getElementById('overlayTitle');
        const message = document.getElementById('overlayMessage');
        
        title.textContent = won ? '🎉 勝利！' : '💥 失敗...';
        message.textContent = won ? 'おめでとうございます！' : '地雷を踏んでしまいました...';
        
        // Calculate statistics
        const totalCells = this.rows * this.cols;
        const flagAccuracy = this.flaggedCells > 0 ? Math.round((this.flaggedCells / this.totalMines) * 100) : 0;
        
        document.getElementById('finalTime').textContent = this.elapsedTime.toString().padStart(3, '0');
        document.getElementById('flagAccuracy').textContent = flagAccuracy;
        document.getElementById('cellsOpened').textContent = this.revealedCells;
        
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
        
        const gameStatus = document.getElementById('gameStatus');
        gameStatus.textContent = {
            'waiting': '待機中',
            'playing': 'プレイ中',
            'won': '勝利！',
            'lost': '敗北...'
        }[this.gameState];
        
        gameStatus.className = this.gameState;
    }
    
    bindEvents() {
        // Difficulty selection
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentDifficulty = btn.dataset.difficulty;
                this.newGame();
            });
        });
        
        // New game button
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.newGame();
        });
        
        // Hint button
        document.getElementById('hintBtn').addEventListener('click', () => {
            this.giveHint();
        });
        
        // Play again button
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.newGame();
        });
        
        // Cell clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('cell')) {
                const row = parseInt(e.target.dataset.row);
                const col = parseInt(e.target.dataset.col);
                this.handleCellClick(row, col, 0);
            }
        });
        
        document.addEventListener('contextmenu', (e) => {
            if (e.target.classList.contains('cell')) {
                e.preventDefault();
                const row = parseInt(e.target.dataset.row);
                const col = parseInt(e.target.dataset.col);
                this.handleCellClick(row, col, 2);
            }
        });
        
        document.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('cell') && e.button === 1) {
                e.preventDefault();
                const row = parseInt(e.target.dataset.row);
                const col = parseInt(e.target.dataset.col);
                this.handleCellClick(row, col, 1);
            }
        });
        
        // Prevent context menu on right click
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.minefield')) {
                e.preventDefault();
            }
        });
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new RogueSweeper();
    console.log('💣 RogueSweeper loaded! Ready to sweep some mines!');
});