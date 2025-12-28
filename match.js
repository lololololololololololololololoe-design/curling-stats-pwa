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
        
        // Табло счета
        this.renderScoreboard();
        
        // Энды
        this.renderEnds();
        
        // Статистические таблицы
        this.renderStatsTables();
    }
    
    renderScoreboard() {
        document.getElementById('team1Total').textContent = this.match.team1Score || 0;
        document.getElementById('team2Total').textContent = this.match.team2Score || 0;
        
        // Подсвечиваем активную команду (ведущую в счете)
        const team1Score = document.getElementById('team1Score');
        const team2Score = document.getElementById('team2Score');
        
        if ((this.match.team1Score || 0) > (this.match.team2Score || 0)) {
            team1Score.classList.add('active-team');
            team2Score.classList.remove('active-team');
        } else if ((this.match.team2Score || 0) > (this.match.team1Score || 0)) {
            team2Score.classList.add('active-team');
            team1Score.classList.remove('active-team');
        } else {
            team1Score.classList.remove('active-team');
            team2Score.classList.remove('active-team');
        }
    }
    
    renderEnds() {
        const ends = this.match.ends || this.db.createEmptyEnds();
        const endsNumbers = document.getElementById('endsNumbers');
        const team1Ends = document.getElementById('team1Ends');
        const team2Ends = document.getElementById('team2Ends');
        const endSelect = document.getElementById('currentEndSelect');
        
        // Очищаем
        endsNumbers.innerHTML = '';
        team1Ends.innerHTML = '';
        team2Ends.innerHTML = '';
        endSelect.innerHTML = '';
        
        ends.forEach((end, index) => {
            const endNumber = index + 1;
            
            // Номера эндов
            const endNumberElement = document.createElement('div');
            endNumberElement.className = 'end-number';
            endNumberElement.textContent = endNumber;
            endsNumbers.appendChild(endNumberElement);
            
            // Энды команды 1
            const team1EndCell = document.createElement('div');
            team1EndCell.className = 'end-cell';
            if (endNumber === this.currentEnd) team1EndCell.classList.add('current');
            if (end.team1Score > 0) team1EndCell.classList.add('filled');
            team1EndCell.textContent = end.team1Score || '';
            team1EndCell.addEventListener('click', () => this.editEndScore(1, endNumber));
            team1Ends.appendChild(team1EndCell);
            
            // Энды команды 2
            const team2EndCell = document.createElement('div');
            team2EndCell.className = 'end-cell';
            if (endNumber === this.currentEnd) team2EndCell.classList.add('current');
            if (end.team2Score > 0) team2EndCell.classList.add('filled');
            team2EndCell.textContent = end.team2Score || '';
            team2EndCell.addEventListener('click', () => this.editEndScore(2, endNumber));
            team2Ends.appendChild(team2EndCell);
            
            // Опция в выпадающем списке
            const option = document.createElement('option');
            option.value = endNumber;
            option.textContent = `Энд ${endNumber}`;
            if (endNumber === this.currentEnd) option.selected = true;
            endSelect.appendChild(option);
        });
    }
    
    renderStatsTables() {
        this.renderTeamTable(1, 'team1Table');
        this.renderTeamTable(2, 'team2Table');
    }
    
    renderTeamTable(teamNumber, tableId) {
        const table = document.getElementById(tableId);
        const tbody = table.querySelector('tbody');
        
        // Очищаем таблицу
        tbody.innerHTML = '';
        
        // Получаем статистику команды
        const teamStats = this.db.calculateTeamStats(this.match, teamNumber);
        const players = Object.values(this.match.players || {}).filter(p => p.team === teamNumber);
        
        // Создаем строки таблицы
        const rows = [
            { type: 'take', label: 'Тейк' },
            { type: 'draw', label: 'Дро' },
            { type: 'guard', label: 'Гард' },
            { type: 'total', label: 'Общее' }
        ];
        
        rows.forEach((row, rowIndex) => {
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
            const stats = teamStats[row.type];
            teamTd.innerHTML = `
                <div class="throw-count">${stats.count}</div>
                <div class="throw-percentage">${stats.percentage.toFixed(1)}%</div>
            `;
            tr.appendChild(teamTd);
            
            tbody.appendChild(tr);
        });
        
        // Обновляем заголовки игроков
        this.updatePlayerHeaders(table, players);
    }
    
    updatePlayerHeaders(table, players) {
        const thead = table.querySelector('thead tr');
        
        // Удаляем старые заголовки игроков
        const oldPlayerHeaders = thead.querySelectorAll('th:not(.throw-type):not(.team-total)');
        oldPlayerHeaders.forEach(th => th.remove());
        
        // Добавляем новые заголовки игроков
        players.forEach((player, index) => {
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
        this.renderEnds();
    }
    
    async editEndScore(teamNumber, endNumber) {
        const currentScore = this.match.ends[endNumber - 1][`team${teamNumber}Score`];
        const newScore = prompt(`Введите счет для команды ${teamNumber} в энде ${endNumber}:`, currentScore || '0');
        
        if (newScore === null) return;
        
        const score = parseInt(newScore) || 0;
        if (score < 0 || score > 8) {
            this.showNotification('Счет должен быть от 0 до 8', 'warning');
            return;
        }
        
        this.match.ends[endNumber - 1][`team${teamNumber}Score`] = score;
        this.match.ends[endNumber - 1].isPlayed = true;
        
        // Пересчитываем общий счет
        this.recalculateTotalScore();
        
        await this.saveMatch();
        this.render();
        this.showNotification('Счет обновлен', 'success');
    }
    
    recalculateTotalScore() {
        let team1Total = 0;
        let team2Total = 0;
        
        this.match.ends.forEach(end => {
            team1Total += end.team1Score || 0;
            team2Total += end.team2Score || 0;
        });
        
        this.match.team1Score = team1Total;
        this.match.team2Score = team2Total;
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