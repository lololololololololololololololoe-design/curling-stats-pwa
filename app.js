// Логика главной страницы приложения
class MainApp {
    constructor() {
        this.db = curlingDB;
        this.init();
    }
    
    async init() {
        await this.db.init();
        this.setupEventListeners();
        this.loadMatches();
        this.updateOnlineStatus();
        
        // Обновляем статус онлайн/офлайн
        window.addEventListener('online', () => this.updateOnlineStatus());
        window.addEventListener('offline', () => this.updateOnlineStatus());
    }
    
    setupEventListeners() {
        // Кнопка создания матча
        document.getElementById('createMatchBtn').addEventListener('click', () => {
            this.showCreateMatchModal();
        });
        
        // Форма создания матча
        document.getElementById('createMatchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createMatch();
        });
        
        // Кнопка отмены
        document.getElementById('cancelCreateBtn').addEventListener('click', () => {
            this.hideCreateMatchModal();
        });
        
        // Клик по фону модального окна
        document.getElementById('createMatchModal').addEventListener('click', (e) => {
            if (e.target.id === 'createMatchModal') {
                this.hideCreateMatchModal();
            }
        });
    }
    
    async loadMatches() {
        const matches = await this.db.getAllMatches();
        this.renderMatches(matches);
    }
    
    renderMatches(matches) {
        const matchesList = document.getElementById('matchesList');
        
        if (matches.length === 0) {
            matchesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>У вас пока нет матчей</p>
                    <p class="subtext">Создайте первый матч для ведения статистики</p>
                </div>
            `;
            return;
        }
        
        // Сортируем матчи по дате создания (новые первые)
        matches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        matchesList.innerHTML = matches.map(match => this.createMatchCard(match)).join('');
        
        // Добавляем обработчики кликов на карточки матчей
        document.querySelectorAll('.match-card').forEach(card => {
            const matchId = card.dataset.matchId;
            card.addEventListener('click', () => {
                window.location.href = `match.html?id=${matchId}`;
            });
        });
    }
    
    createMatchCard(match) {
        const date = new Date(match.createdAt);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
        // Подсчитываем количество бросков
        const totalThrows = Object.values(match.players || {}).reduce((sum, player) => {
            return sum + player.throws.total.count;
        }, 0);
        
        // Подсчитываем количество игроков
        const totalPlayers = Object.keys(match.players || {}).length;
        
        return `
            <div class="match-card" data-match-id="${match.id}">
                <div class="match-card-header">
                    <div>
                        <div class="match-title">${match.matchName || 'Без названия'}</div>
                        <div class="match-date">${formattedDate}</div>
                    </div>
                    <div class="match-score">
                        <span class="score-red">${match.team1Score || 0}</span>
                        <span> - </span>
                        <span class="score-yellow">${match.team2Score || 0}</span>
                    </div>
                </div>
                <div class="match-stats">
                    <div class="match-stat">
                        <i class="fas fa-users"></i>
                        <span>${totalPlayers} игроков</span>
                    </div>
                    <div class="match-stat">
                        <i class="fas fa-hockey-puck"></i>
                        <span>${totalThrows} бросков</span>
                    </div>
                    <div class="match-stat">
                        <i class="fas fa-flag"></i>
                        <span>${match.currentEnd || 1}/12 эндов</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    showCreateMatchModal() {
        document.getElementById('createMatchModal').classList.remove('hidden');
        
        // Устанавливаем фокус на первое поле
        setTimeout(() => {
            document.getElementById('matchName').focus();
        }, 100);
    }
    
    hideCreateMatchModal() {
        document.getElementById('createMatchModal').classList.add('hidden');
        document.getElementById('createMatchForm').reset();
    }
    
    async createMatch() {
        const matchName = document.getElementById('matchName').value.trim();
        const team1Name = document.getElementById('team1Name').value.trim();
        const team2Name = document.getElementById('team2Name').value.trim();
        
        if (!matchName || !team1Name || !team2Name) {
            this.showNotification('Заполните все обязательные поля', 'warning');
            return;
        }
        
        const matchData = {
            matchName,
            team1Name,
            team2Name,
            // Игроки команды 1
            team1Player1: document.getElementById('team1Player1').value.trim() || 'Игрок 1',
            team1Player2: document.getElementById('team1Player2').value.trim() || 'Игрок 2',
            team1Player3: document.getElementById('team1Player3').value.trim() || 'Игрок 3',
            team1Player4: document.getElementById('team1Player4').value.trim() || 'Игрок 4',
            // Игроки команды 2
            team2Player1: document.getElementById('team2Player1').value.trim() || 'Игрок 1',
            team2Player2: document.getElementById('team2Player2').value.trim() || 'Игрок 2',
            team2Player3: document.getElementById('team2Player3').value.trim() || 'Игрок 3',
            team2Player4: document.getElementById('team2Player4').value.trim() || 'Игрок 4'
        };
        
        try {
            const match = await this.db.createMatch(matchData);
            this.hideCreateMatchModal();
            this.showNotification('Матч успешно создан!', 'success');
            
            // Обновляем список матчей
            this.loadMatches();
            
            // Через секунду переходим к матчу
            setTimeout(() => {
                window.location.href = `match.html?id=${match.id}`;
            }, 1000);
            
        } catch (error) {
            console.error('Ошибка создания матча:', error);
            this.showNotification('Ошибка создания матча', 'danger');
        }
    }
    
    updateOnlineStatus() {
        const isOnline = navigator.onLine;
        const statusElement = document.getElementById('offlineStatus');
        
        if (isOnline) {
            statusElement.innerHTML = '<i class="fas fa-wifi"></i><span>Онлайн</span>';
            statusElement.className = 'offline-status online';
        } else {
            statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i><span>Офлайн</span>';
            statusElement.className = 'offline-status offline';
        }
    }
    
    showNotification(message, type = 'info') {
        // Создаем элемент уведомления
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
        
        // Стили уведомления
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
        
        // Удаляем через 3 секунды
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
        
        // Добавляем CSS анимации если их нет
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.mainApp = new MainApp();
});