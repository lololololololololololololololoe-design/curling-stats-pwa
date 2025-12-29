// Логика страницы матча
class MatchPage {
    constructor() {
        this.db = curlingDB;
        this.matchId = window.matchId;
        this.match = null;
        this.currentEnd = 1;
        this.init();
    }
    
    async init() {
        await this.db.init();
        await this.loadMatch();
        this.setupEventListeners();
        this.render();
        this.updateLastSaved();
    }
    
    async loadMatch() {
        this.match = await this.db.getMatch(this.matchId);
        if (!this.match) {
            // Если матч не найден, возвращаемся на главную
            window.location.href = 'index.html';
            return;
        }
        
        this.currentEnd = this.match.currentEnd || 1;
    }
    
    setupEventListeners() {
        // Кнопка удаления матча
        document.getElementById('deleteMatchBtn').addEventListener('click', () => {
            this.showDeleteConfirmModal();
        });
        
        // Подтверждение удаления
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            this.deleteMatch();
        });
        
        // Отмена удаления
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
            this.hideDeleteConfirmModal();
        });
        
        // Клик по фону модального окна
        document.getElementById('deleteConfirmModal').addEventListener('click', (e) => {
            if (e.target.id === 'deleteConfirmModal') {
                this.hideDeleteConfirmModal();
            }
        });
        
        // Изменение названия матча
        document.getElementById('matchTitle').addEventListener('change', (e) => {
            this.updateMatchName(e.target.value);
        });
        
        // Изменение названий команд
        document.getElementById('team1NameInput').addEventListener('change', (e) => {
            this.updateTeamName(1, e.target.value);
        });
        
        document.getElementById('team2NameInput').addEventListener('change', (e) => {
            this.updateTeamName(2, e.target.value);
        });
        
        // Управление эндами
        document.getElementById('currentEndSelect').addEventListener('change', (e) => {
            this.changeCurrentEnd(parseInt(e.target.value));
        });
        
        document.getElementById('prevEndBtn').addEventListener('click', () => {
            this.changeCurrentEnd(this.currentEnd - 1);
        });
        
        document.getElementById('nextEndBtn').addEventListener('click', () => {
            this.changeCurrentEnd(this.currentEnd + 1);
        });
        
        // Кнопка ИГРАТЬ - добавляем ID матча к ссылке
        document.getElementById('playButton').href = `throw.html?match=${this.matchId}`;
        
        // Сохранение при разгрузке страницы
        window.addEventListener('beforeunload', () => {
            this.saveMatch();
        });
    }
    
    render() {
        if (!this.match) return;
        
        // Заголовок матча
        document.getElementById('matchTitle').value = this.match.matchName || 'Без названия';
        
        // Названия команд
        document.getElementById('team1NameInput').value = this.match.team1Name || 'Команда 1';
        document.getElementById('team2NameInput').value = this.match.team2Name || 'Команда 2';
        
        // Заголовки таблиц
        document.getElementById('team1StatsTitle').textContent = this.match.team1Name || 'Команда 1';
        document.getElementById('team2StatsTitle').textContent = this.match.team2Name || 'Команда 2';
        
        // Рендерим новую таблицу эндов
        this.renderEndsTable();
        
        // Статистические таблицы
        this.renderStatsTables();
        
        // Устанавливаем текущий энд
        document.getElementById('currentEndSelect').value = this.currentEnd;
    }
    
    renderEndsTable() {
        const ends = this.match.ends || this.db.createEmptyEnds();
        
        // Заполняем ячейки для команды 1
        ends.forEach((end) => {
            const input = document.querySelector(`.team1-score[data-end="${end.number}"]`);
            if (input) {
                input.value = end.team1Score || 0;
                input.addEventListener('change', (e) => {
                    this.updateEndScore(1, end.number, parseInt(e.target.value) || 0);
                });
            }
        });
        
        // Заполняем ячейки для команды 2
        ends.forEach((end) => {
            const input = document.querySelector(`.team2-score[data-end="${end.number}"]`);
            if (input) {
                input.value = end.team2Score || 0;
                input.addEventListener('change', (e) => {
                    this.updateEndScore(2, end.number, parseInt(e.target.value) || 0);
                });
            }
        });
        
        // Обновляем общий счет
        this.updateTotalScores();
    }
    
    async updateEndScore(teamNumber, endNumber, score) {
        if (score < 0 || score > 8) {
            this.showNotification('Счет должен быть от 0 до 8', 'warning');
            return;
        }
        
        const endIndex = endNumber - 1;
        if (!this.match.ends[endIndex]) {
            this.match.ends[endIndex] = {
                number: endNumber,
                team1Score: 0,
                team2Score: 0,
                isPlayed: true
            };
        }
        
        this.match.ends[endIndex][`team${teamNumber}Score`] = score;
        this.match.ends[endIndex].isPlayed = true;
        
        // Обновляем общий счет
        this.updateTotalScores();
        
        // Сохраняем изменения
        await this.saveMatch();
        this.showNotification('Счет обновлен', 'success');
    }
    
    updateTotalScores() {
        let team1Total = 0;
        let team2Total = 0;
        
        this.match.ends.forEach(end => {
            team1Total += end.team1Score || 0;
            team2Total += end.team2Score || 0;
        });
        
        this.match.team1Score = team1Total;
        this.match.team2Score = team2Total;
        
        // Обновляем DOM
        document.getElementById('team1Total').textContent = team1Total;
        document.getElementById('team2Total').textContent = team2Total;
        
        // Подсвечиваем лидирующую команду
        this.highlightLeadingTeam();
    }
    
    highlightLeadingTeam() {
        const team1Row = document.querySelector('.team1-row');
        const team2Row = document.querySelector('.team2-row');
        
        team1Row.classList.remove('leading-team');
        team2Row.classList.remove('leading-team');
        
        if (this.match.team1Score > this.match.team2Score) {
            team1Row.classList.add('leading-team');
        } else if (this.match.team2Score > this.match.team1Score) {
            team2Row.classList.add('leading-team');
        }
    }
    
    renderStatsTables() {
        this.renderTeamTable(1, 'team1Table');
        this.renderTeamTable(2, 'team2Table');
    }
    
    renderTeamTable(teamNumber, tableId) {
        const table = document.getElementById(tableId);
        const tbody = table.querySelector('tbody');
        const thead = table.querySelector('thead tr');
        
        // Очищаем таблицу
        tbody.innerHTML = '';
        
        // Удаляем старые заголовки игроков
        const oldPlayerHeaders = thead.querySelectorAll('th:not(.throw-type):not(.team-total)');
        oldPlayerHeaders.forEach(th => th.remove());
        
        // Получаем игроков команды (только 4)
        const players = Object.values(this.match.players || {})
            .filter(p => p.team === teamNumber)
            .slice(0, 4); // Берем только первых 4 игроков
        
        // Добавляем заголовки игроков
        players.forEach((player) => {
            const th = document.createElement('th');
            th.className = 'player-header';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'player-name-input';
            input.value = player.name;
            input.addEventListener('change', (e) => {
                this.updatePlayerName(player.id, e.target.value);
            });
            
            th.appendChild(input);
            thead.insertBefore(th, thead.querySelector('.team-total'));
        });
        
        // Создаем строки таблицы
        const rows = [
            { type: 'take', label: 'Тейк' },
            { type: 'draw', label: 'Дро' },
            { type: 'guard', label: 'Гард' },
            { type: 'total', label: 'Общее' }
        ];
        
        rows.forEach((row) => {
            const tr = document.createElement('tr');
            
            // Первый столбец - вид броска
            const typeTd = document.createElement('td');
            typeTd.className = 'throw-type';
            typeTd.textContent = row.label;
            tr.appendChild(typeTd);
            
            // Столбцы игроков
            players.forEach(player => {
                const playerTd = document.createElement('td');
                const playerStats = player.throws[row.type];
                
                playerTd.innerHTML = `
                    <div class="throw-count">${playerStats.count}</div>
                    <div class="throw-percentage">${playerStats.percentage.toFixed(1)}%</div>
                `;
                tr.appendChild(playerTd);
            });
            
            // Столбец команды
            const teamTd = document.createElement('td');
            const teamStats = this.db.calculateTeamStats(this.match, teamNumber);
            const stats = teamStats[row.type];
            teamTd.innerHTML = `
                <div class="throw-count">${stats.count}</div>
                <div class="throw-percentage">${stats.percentage.toFixed(1)}%</div>
            `;
            tr.appendChild(teamTd);
            
            tbody.appendChild(tr);
        });
    }
    
    async updateMatchName(name) {
        if (!name.trim()) return;
        
        this.match.matchName = name.trim();
        await this.saveMatch();
        this.showNotification('Название матча обновлено', 'success');
    }
    
    async updateTeamName(teamNumber, name) {
        if (!name.trim()) return;
        
        const teamKey = teamNumber === 1 ? 'team1Name' : 'team2Name';
        this.match[teamKey] = name.trim();
        
        // Обновляем заголовок таблицы
        if (teamNumber === 1) {
            document.getElementById('team1StatsTitle').textContent = name.trim();
        } else {
            document.getElementById('team2StatsTitle').textContent = name.trim();
        }
        
        await this.saveMatch();
        this.showNotification(`Название команды ${teamNumber} обновлено`, 'success');
    }
    
    async updatePlayerName(playerId, name) {
        if (!name.trim() || !this.match.players[playerId]) return;
        
        this.match.players[playerId].name = name.trim();
        await this.saveMatch();
        this.showNotification('Имя игрока обновлено', 'success');
    }
    
    async changeCurrentEnd(endNumber) {
        if (endNumber < 1 || endNumber > 12) return;
        
        this.currentEnd = endNumber;
        this.match.currentEnd = endNumber;
        
        await this.saveMatch();
        
        // Подсвечиваем текущий энд
        this.highlightCurrentEnd();
    }
    
    highlightCurrentEnd() {
        // Снимаем подсветку со всех эндов
        document.querySelectorAll('.end-score').forEach(input => {
            input.classList.remove('current-end');
        });
        
        // Подсвечиваем текущий энд
        document.querySelectorAll(`.end-score[data-end="${this.currentEnd}"]`).forEach(input => {
            input.classList.add('current-end');
        });
    }
    
    async saveMatch() {
        try {
            await this.db.updateMatch(this.matchId, this.match);
            this.updateLastSaved();
        } catch (error) {
            console.error('Ошибка сохранения матча:', error);
        }
    }
    
    updateLastSaved() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        document.getElementById('lastSaved').textContent = 
            `Сохранено: ${timeString}`;
    }
    
    showDeleteConfirmModal() {
        document.getElementById('deleteConfirmModal').classList.remove('hidden');
    }
    
    hideDeleteConfirmModal() {
        document.getElementById('deleteConfirmModal').classList.add('hidden');
    }
    
    async deleteMatch() {
        try {
            await this.db.deleteMatch(this.matchId);
            this.showNotification('Матч удален', 'success');
            
            // Возвращаемся на главную через секунду
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            
        } catch (error) {
            console.error('Ошибка удаления матча:', error);
            this.showNotification('Ошибка удаления матча', 'danger');
        }
    }
    
    showNotification(message, type = 'info') {
        // Та же функция уведомления, что и в app.js
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

// Инициализация страницы матча
document.addEventListener('DOMContentLoaded', () => {
    if (window.matchId) {
        window.matchPage = new MatchPage();
    }
});