// База данных для приложения керлинга
class CurlingDatabase {
    constructor() {
        this.db = null;
        this.init();
    }
    
    async init() {
        // Используем IndexedDB для хранения данных
        if (!window.indexedDB) {
            console.error('IndexedDB не поддерживается');
            return this.useLocalStorageFallback();
        }
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('CurlingStatsDB', 1);
            
            request.onerror = (event) => {
                console.error('Ошибка открытия IndexedDB:', event);
                this.useLocalStorageFallback();
                resolve();
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('База данных открыта');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Хранилище матчей
                if (!db.objectStoreNames.contains('matches')) {
                    const matchStore = db.createObjectStore('matches', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    matchStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
                
                // Хранилище бросков
                if (!db.objectStoreNames.contains('throws')) {
                    const throwStore = db.createObjectStore('throws', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    throwStore.createIndex('matchId', 'matchId', { unique: false });
                    throwStore.createIndex('playerId', 'playerId', { unique: false });
                    throwStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }
    
    useLocalStorageFallback() {
        console.log('Использую localStorage как fallback');
        this.storageType = 'localStorage';
    }
    
    // === ОПЕРАЦИИ С МАТЧАМИ ===
    
    async createMatch(matchData) {
        const match = {
            ...matchData,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            team1Score: 0,
            team2Score: 0,
            currentEnd: 1,
            ends: this.createEmptyEnds(),
            players: this.initializePlayers(matchData)
        };
        
        if (this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['matches'], 'readwrite');
                const store = transaction.objectStore('matches');
                const request = store.add(match);
                
                request.onsuccess = () => resolve(match);
                request.onerror = (event) => {
                    console.error('Ошибка создания матча:', event);
                    this.saveToLocalStorage('matches', match);
                    resolve(match);
                };
            });
        } else {
            this.saveToLocalStorage('matches', match);
            return match;
        }
    }
    
    createEmptyEnds() {
        const ends = [];
        for (let i = 1; i <= 12; i++) { // 10 эндов + 2 EE
            ends.push({
                number: i,
                team1Score: 0,
                team2Score: 0,
                isPlayed: false
            });
        }
        return ends;
    }
    
    initializePlayers(matchData) {
        const players = {};
        
        // Команда 1
        for (let i = 1; i <= 5; i++) {
            const playerKey = `player${i}Name`;
            players[`team1_player${i}`] = {
                id: `team1_player${i}`,
                name: matchData[playerKey] || `Игрок ${i}`,
                team: 1,
                throws: {
                    take: { count: 0, success: 0, percentage: 0 },
                    draw: { count: 0, success: 0, percentage: 0 },
                    guard: { count: 0, success: 0, percentage: 0 },
                    total: { count: 0, success: 0, percentage: 0 }
                }
            };
        }
        
        // Команда 2
        for (let i = 1; i <= 5; i++) {
            const playerKey = `player${i}Name`;
            players[`team2_player${i}`] = {
                id: `team2_player${i}`,
                name: matchData[playerKey] || `Игрок ${i}`,
                team: 2,
                throws: {
                    take: { count: 0, success: 0, percentage: 0 },
                    draw: { count: 0, success: 0, percentage: 0 },
                    guard: { count: 0, success: 0, percentage: 0 },
                    total: { count: 0, success: 0, percentage: 0 }
                }
            };
        }
        
        return players;
    }
    
    async getAllMatches() {
        if (this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['matches'], 'readonly');
                const store = transaction.objectStore('matches');
                const index = store.index('createdAt');
                const request = index.getAll();
                
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => {
                    const matches = this.getFromLocalStorage('matches') || [];
                    resolve(matches);
                };
            });
        } else {
            return this.getFromLocalStorage('matches') || [];
        }
    }
    
    async getMatch(matchId) {
        if (this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['matches'], 'readonly');
                const store = transaction.objectStore('matches');
                const request = store.get(matchId);
                
                request.onsuccess = () => {
                    if (request.result) {
                        resolve(request.result);
                    } else {
                        // Пробуем получить из localStorage
                        const matches = this.getFromLocalStorage('matches') || [];
                        const match = matches.find(m => m.id === matchId);
                        resolve(match || null);
                    }
                };
                
                request.onerror = () => {
                    const matches = this.getFromLocalStorage('matches') || [];
                    const match = matches.find(m => m.id === matchId);
                    resolve(match || null);
                };
            });
        } else {
            const matches = this.getFromLocalStorage('matches') || [];
            return matches.find(m => m.id === matchId) || null;
        }
    }
    
    async updateMatch(matchId, updates) {
        const match = await this.getMatch(matchId);
        if (!match) return null;
        
        const updatedMatch = {
            ...match,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        if (this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['matches'], 'readwrite');
                const store = transaction.objectStore('matches');
                const request = store.put(updatedMatch);
                
                request.onsuccess = () => resolve(updatedMatch);
                request.onerror = () => {
                    this.updateLocalStorageMatch(matchId, updatedMatch);
                    resolve(updatedMatch);
                };
            });
        } else {
            this.updateLocalStorageMatch(matchId, updatedMatch);
            return updatedMatch;
        }
    }
    
    async deleteMatch(matchId) {
        // Удаляем матч
        if (this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['matches'], 'readwrite');
                const store = transaction.objectStore('matches');
                const request = store.delete(matchId);
                
                request.onsuccess = () => {
                    // Удаляем все броски этого матча
                    this.deleteMatchThrows(matchId).then(resolve);
                };
                request.onerror = () => {
                    this.deleteLocalStorageMatch(matchId);
                    resolve();
                };
            });
        } else {
            this.deleteLocalStorageMatch(matchId);
            return Promise.resolve();
        }
    }
    
    async deleteMatchThrows(matchId) {
        if (this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['throws'], 'readwrite');
                const store = transaction.objectStore('throws');
                const index = store.index('matchId');
                const request = index.openCursor(IDBKeyRange.only(matchId));
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
                
                request.onerror = () => resolve();
            });
        } else {
            // Для localStorage удаляем броски
            const throws = this.getFromLocalStorage('throws') || [];
            const updatedThrows = throws.filter(t => t.matchId !== matchId);
            localStorage.setItem('curling_throws', JSON.stringify(updatedThrows));
            return Promise.resolve();
        }
    }
    
    // === ОПЕРАЦИИ С БРОСКАМИ ===
    
    async addThrow(throwData) {
        const throwRecord = {
            ...throwData,
            id: Date.now().toString(),
            timestamp: new Date().toISOString()
        };
        
        // Обновляем статистику игрока в матче
        await this.updatePlayerStats(throwData.matchId, throwData.playerId, throwData);
        
        // Сохраняем бросок
        if (this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['throws'], 'readwrite');
                const store = transaction.objectStore('throws');
                const request = store.add(throwRecord);
                
                request.onsuccess = () => resolve(throwRecord);
                request.onerror = () => {
                    this.saveToLocalStorage('throws', throwRecord);
                    resolve(throwRecord);
                };
            });
        } else {
            this.saveToLocalStorage('throws', throwRecord);
            return throwRecord;
        }
    }
    
    async updatePlayerStats(matchId, playerId, throwData) {
        const match = await this.getMatch(matchId);
        if (!match || !match.players[playerId]) return;
        
        const player = match.players[playerId];
        const throwType = throwData.throwType; // 'take', 'draw', 'guard'
        const percentage = throwData.percentage; // 0-125
        
        // Обновляем статистику для конкретного типа броска
        player.throws[throwType].count += 1;
        player.throws[throwType].success += percentage;
        player.throws[throwType].percentage = 
            (player.throws[throwType].success / (player.throws[throwType].count * 125)) * 125;
        
        // Обновляем общую статистику
        player.throws.total.count += 1;
        player.throws.total.success += percentage;
        player.throws.total.percentage = 
            (player.throws.total.success / (player.throws.total.count * 125)) * 125;
        
        // Обновляем матч в базе
        await this.updateMatch(matchId, { players: match.players });
        
        return player;
    }
    
    async getMatchThrows(matchId, limit = 20) {
        if (this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['throws'], 'readonly');
                const store = transaction.objectStore('throws');
                const index = store.index('matchId');
                const request = index.getAll(IDBKeyRange.only(matchId));
                
                request.onsuccess = () => {
                    let throws = request.result || [];
                    // Сортируем по времени (новые первые)
                    throws.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    resolve(throws.slice(0, limit));
                };
                
                request.onerror = () => {
                    const throws = this.getFromLocalStorage('throws') || [];
                    const matchThrows = throws
                        .filter(t => t.matchId === matchId)
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .slice(0, limit);
                    resolve(matchThrows);
                };
            });
        } else {
            const throws = this.getFromLocalStorage('throws') || [];
            return throws
                .filter(t => t.matchId === matchId)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit);
        }
    }
    
    // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ДЛЯ localStorage ===
    
    saveToLocalStorage(key, data) {
        try {
            const items = this.getFromLocalStorage(key) || [];
            items.push(data);
            localStorage.setItem(`curling_${key}`, JSON.stringify(items));
        } catch (e) {
            console.error('Ошибка сохранения в localStorage:', e);
        }
    }
    
    getFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(`curling_${key}`);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Ошибка чтения из localStorage:', e);
            return null;
        }
    }
    
    updateLocalStorageMatch(matchId, updatedMatch) {
        try {
            const matches = this.getFromLocalStorage('matches') || [];
            const index = matches.findIndex(m => m.id === matchId);
            if (index !== -1) {
                matches[index] = updatedMatch;
                localStorage.setItem('curling_matches', JSON.stringify(matches));
            } else {
                matches.push(updatedMatch);
                localStorage.setItem('curling_matches', JSON.stringify(matches));
            }
        } catch (e) {
            console.error('Ошибка обновления в localStorage:', e);
        }
    }
    
    deleteLocalStorageMatch(matchId) {
        try {
            const matches = this.getFromLocalStorage('matches') || [];
            const updatedMatches = matches.filter(m => m.id !== matchId);
            localStorage.setItem('curling_matches', JSON.stringify(updatedMatches));
            
            // Удаляем броски этого матча
            const throws = this.getFromLocalStorage('throws') || [];
            const updatedThrows = throws.filter(t => t.matchId !== matchId);
            localStorage.setItem('curling_throws', JSON.stringify(updatedThrows));
        } catch (e) {
            console.error('Ошибка удаления из localStorage:', e);
        }
    }
    
    // === СТАТИСТИКА ===
    
    calculateTeamStats(match, teamNumber) {
        const teamPlayers = Object.values(match.players || {}).filter(p => p.team === teamNumber);
        
        const teamStats = {
            take: { count: 0, success: 0, percentage: 0 },
            draw: { count: 0, success: 0, percentage: 0 },
            guard: { count: 0, success: 0, percentage: 0 },
            total: { count: 0, success: 0, percentage: 0 }
        };
        
        teamPlayers.forEach(player => {
            teamStats.take.count += player.throws.take.count;
            teamStats.take.success += player.throws.take.success;
            
            teamStats.draw.count += player.throws.draw.count;
            teamStats.draw.success += player.throws.draw.success;
            
            teamStats.guard.count += player.throws.guard.count;
            teamStats.guard.success += player.throws.guard.success;
            
            teamStats.total.count += player.throws.total.count;
            teamStats.total.success += player.throws.total.success;
        });
        
        // Рассчитываем проценты
        teamStats.take.percentage = teamStats.take.count > 0 
            ? (teamStats.take.success / (teamStats.take.count * 125)) * 125 
            : 0;
        
        teamStats.draw.percentage = teamStats.draw.count > 0 
            ? (teamStats.draw.success / (teamStats.draw.count * 125)) * 125 
            : 0;
        
        teamStats.guard.percentage = teamStats.guard.count > 0 
            ? (teamStats.guard.success / (teamStats.guard.count * 125)) * 125 
            : 0;
        
        teamStats.total.percentage = teamStats.total.count > 0 
            ? (teamStats.total.success / (teamStats.total.count * 125)) * 125 
            : 0;
        
        return teamStats;
    }
}

// Создаем глобальный экземпляр базы данных
const curlingDB = new CurlingDatabase();