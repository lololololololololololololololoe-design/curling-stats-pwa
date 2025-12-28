// Логика страницы ввода броска
class ThrowPage {
    constructor() {
        this.db = curlingDB;
        this.matchId = window.matchId;
        this.match = null;
        this.selectedTeam = null;
        this.selectedPlayer = null;
        this.selectedThrowType = null;
        this.selectedPercentage = null;
        this.init();
    }
    
    async init() {
        await this.db.init();
        await this.loadMatch();
        this.setupEventListeners();
        this.render();
        this.loadRecentThrows();
    }
    
    async loadMatch() {
        this.match = await this.db.getMatch(this.matchId);
        if (!this.match) {
            window.location.href = 'index.html';
            return;
        }
        
        // Отображаем название матча
        document.getElementById('currentMatchName').textContent = 
            this.match.matchName || 'Матч';
        
        // Отображаем названия команд
        document.getElementById('team1NameDisplay').textContent = 
            this.match.team1Name || 'Команда 1';
        document.getElementById('team2NameDisplay').textContent = 
            this.match.team2Name || 'Команда 2';
    }
    
    setupEventListeners() {
        // Кнопка назад
        document.getElementById('backButton').addEventListener('click', () => {
            window.location.href = `match.html?id=${this.matchId}`;
        });
        
        // Выбор команды
        document.querySelectorAll('.team-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectTeam(parseInt(e.currentTarget.dataset.team));
            });
        });
        
        // Выбор типа броска
        document.querySelectorAll('.throw-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectThrowType(e.currentTarget.dataset.type);
            });
        });
        
        // Выбор процента попадания
        document.querySelectorAll('.percentage-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectPercentage(parseInt(e.currentTarget.dataset.value));
            });
        });
        
        // Кнопка сохранения
        document.getElementById('saveThrowBtn').addEventListener('click', () => {
            this.saveThrow();
        });
        
        // Обновление кнопки сохранения при изменении выбора
        this.updateSaveButton();
    }
    
    render() {
        this.renderPlayers();
        this.updateThrowSummary();
    }
    
    renderPlayers() {
        const playerSelector = document.getElementById('playerSelector');
        playerSelector.innerHTML = '';
        
        if (!this.selectedTeam) {
            playerSelector.innerHTML = '<p class="no-selection">Выберите команду</p>';
            return;
        }
        
        const players = Object.values(this.match.players || {}).filter(p => p.team === this.selectedTeam);
        
        players.forEach(player => {
            const playerBtn = document.createElement('button');
            playerBtn.className = 'player-option';
            playerBtn.dataset.playerId = player.id;
            playerBtn.innerHTML = `
                <i class="fas fa-user"></i>
                <span>${player.name}</span>
            `;
            
            playerBtn.addEventListener('click', () => {
                this.selectPlayer(player.id);
            });
            
            playerSelector.appendChild(playerBtn);
        });
    }
    
    selectTeam(teamNumber) {
        this.selectedTeam = teamNumber;
        this.selectedPlayer = null;
        
        // Снимаем выделение со всех кнопок команд
        document.querySelectorAll('.team-option').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Выделяем выбранную команду
        document.getElementById(`team${teamNumber}Option`).classList.add('selected');
        
        // Обновляем список игроков
        this.renderPlayers();
        
        // Сбрасываем выбор игрока
        this.deselectAllPlayers();
        
        this.updateSaveButton();
        this.updateThrowSummary();
    }
    
    selectPlayer(playerId) {
        this.selectedPlayer = playerId;
        
        // Снимаем выделение со всех игроков
        this.deselectAllPlayers();
        
        // Выделяем выбранного игрока
        document.querySelector(`[data-player-id="${playerId}"]`).classList.add('selected');
        
        this.updateSaveButton();
        this.updateThrowSummary();
    }
    
    deselectAllPlayers() {
        document.querySelectorAll('.player-option').forEach(btn => {
            btn.classList.remove('selected');
    });
    }
    
    selectThrowType(type) {
        this.selectedThrowType = type;
        
        // Снимаем выделение со всех типов бросков
        document.querySelectorAll('.throw-type-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Выделяем выбранный тип
        document.getElementById(`${type}Btn`).classList.add('selected');
        
        this.updateSaveButton();
        this.updateThrowSummary();
    }
    
    selectPercentage(percentage) {
        this.selectedPercentage = percentage;
        
        // Снимаем выделение со всех процентов
        document.querySelectorAll('.percentage-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Выделяем выбранный процент
        document.getElementById(`percent${percentage}`).classList.add('selected');
        
        this.updateSaveButton();
        this.updateThrowSummary();
    }
    
    updateSaveButton() {
        const isComplete = this.selectedTeam && 
                          this.selectedPlayer && 
                          this.selectedThrowType && 
                          this.selectedPercentage !== null;
        
        document.getElementById('saveThrowBtn').disabled = !isComplete;
    }
    
    updateThrowSummary() {
        const summary = document.getElementById('throwSummary');
        
        if (!this.selectedTeam || !this.selectedPlayer || !this.selectedThrowType || this.selectedPercentage === null) {
            summary.innerHTML = '<p>Выберите все параметры броска</p>';
            return;
        }
        
        const player = this.match.players[this.selectedPlayer];
        const teamName = this.selectedTeam === 1 ? 
            (this.match.team1Name || 'Команда 1') : 
            (this.match.team2Name || 'Команда 2');
        
        const throwTypeNames = {
            take: 'Тейк',
            draw: 'Дро',
            guard: 'Гард'
        };
        
        summary.innerHTML = `
            <h3>Сводка броска:</h3>
            <div class="summary-item">
                <span>Команда:</span>
                <span class="team-${this.selectedTeam}">${teamName}</span>
            </div>
            <div class="summary-item">
                <span>Игрок:</span>
                <span>${player.name}</span>
            </div>
            <div class="summary-item">
                <span>Тип броска:</span>
                <span>${throwTypeNames[this.selectedThrowType]}</span>
            </div>
            <div class="summary-item">
                <span>Процент попадания:</span>
                <span class="percentage-value">${this.selectedPercentage}%</span>
            </div>
        `;
    }
    
    async saveThrow() {
        if (!this.validateSelection()) return;
        
        const throwData = {
            matchId: this.matchId,
            playerId: this.selectedPlayer,
            team: this.selectedTeam,
            throwType: this.selectedThrowType,
            percentage: this.selectedPercentage,
            timestamp: new Date().toISOString()
        };
        
        try {
            await this.db.addThrow(throwData);
            
            // Показываем уведомление
            this.showNotification('Бросок сохранен!', 'success');
            
            // Обновляем матч (чтобы получить обновленную статистику)
            await this.loadMatch();
            
            // Сбрасываем выбор (кроме команды)
            this.selectedPlayer = null;
            this.selectedThrowType = null;
            this.selectedPercentage = null;
            
            // Обновляем UI
            this.deselectAllPlayers();
            document.querySelectorAll('.throw-type-btn').forEach(btn => btn.classList.remove('selected'));
            document.querySelectorAll('.percentage-btn').forEach(btn => btn.classList.remove('selected'));
            
            this.updateSaveButton();
            this.updateThrowSummary();
            this.loadRecentThrows();
            
        } catch (error) {
            console.error('Ошибка сохранения броска:', error);
            this.showNotification('Ошибка сохранения броска', 'danger');
        }
    }
    
    validateSelection() {
        if (!this.selectedTeam) {
            this.showNotification('Выберите команду', 'warning');
            return false;
        }
        
        if (!this.selectedPlayer) {
            this.showNotification('Выберите игрока', 'warning');
            return false;
        }
        
        if (!this.selectedThrowType) {
            this.showNotification('Выберите тип броска', 'warning');
            return false;
        }
        
        if (this.selectedPercentage === null) {
            this.showNotification('Выберите процент попадания', 'warning');
            return false;
        }
        
        return true;
    }
    
    async loadRecentThrows() {
        const throws = await this.db.getMatchThrows(this.matchId, 10);
        this.renderRecentThrows(throws);
    }
    
    renderRecentThrows(throws) {
        const list = document.getElementById('recentThrowsList');
        
        if (throws.length === 0) {
            list.innerHTML = '<p class="no-throws">Бросков пока нет</p>';
            return;
        }
        
        const throwTypeNames = {
            take: 'Тейк',
            draw: 'Дро',
            guard: 'Гард'
        };
        
        list.innerHTML = throws.map(throwItem => {
            const player = this.match.players[throwItem.playerId];
            const time = new Date(throwItem.timestamp).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            return `
                <div class="recent-throw">
                    <div class="throw-info">
                        <div class="throw-team ${throwItem.team === 1 ? 'red' : 'yellow'}"></div>
                        <span>${player?.name || 'Игрок'}</span>
                        <span class="throw-type">${throwTypeNames[throwItem.throwType]}</span>
                        <span class="throw-percentage">${throwItem.percentage}%</span>
                    </div>
                    <div class="throw-time">${time}</div>
                </div>
            `;
        }).join('');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icons = {
            success: 'check-circle',
            warning: 'exclamation-triangle',
            danger: 'times-circle',
            info: 'info-circle'
        };
        
        notification.innerHTML = `
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#27ae60' : 
                        type === 'warning' ? '#f39c12' : 
                        type === 'danger' ? '#e74c3c' : '#3498db'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 1001;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Инициализация страницы ввода броска
document.addEventListener('DOMContentLoaded', () => {
    if (window.matchId) {
        window.throwPage = new ThrowPage();
    }
});