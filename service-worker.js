// Service Worker для офлайн работы PWA
const CACHE_VERSION = 'v4';
const CACHE_NAME = `curling-stats-${CACHE_VERSION}`;
const CACHE_URLS = [
  '/curling-stats-pwa/',
  '/curling-stats-pwa/index.html',
  '/curling-stats-pwa/match.html',
  '/curling-stats-pwa/throw.html',
  '/curling-stats-pwa/style.css',
  '/curling-stats-pwa/app.js',
  '/curling-stats-pwa/match.js',
  '/curling-stats-pwa/throw.js',
  '/curling-stats-pwa/db.js',
  '/curling-stats-pwa/service-worker.js',
  '/curling-stats-pwa/manifest.json',
  '/curling-stats-pwa/offline.html',
  '/curling-stats-pwa/icons/icon-192.png',
  '/curling-stats-pwa/icons/icon-512.png',
  '/curling-stats-pwa/icons/apple-touch-icon.png'
];

// Установка Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Кэширую файлы для офлайн работы');
                return cache.addAll(CACHE_URLS);
            })
            .then(() => self.skipWaiting())
    );
});

// Активация Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Удаляю старый кэш:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Обработка запросов
self.addEventListener('fetch', event => {
    // Пропускаем запросы к API или другим доменам
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Возвращаем из кэша если есть
                if (response) {
                    return response;
                }
                
                // Иначе загружаем из сети
                return fetch(event.request)
                    .then(response => {
                        // Проверяем валидный ответ
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Клонируем ответ
                        const responseToCache = response.clone();
                        
                        // Сохраняем в кэш
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(() => {
                        // Если офлайн и запрос HTML - показываем offline страницу
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/offline.html');
                        }
                        
                        // Для других типов возвращаем ошибку
                        return new Response('Офлайн режим', {
                            status: 503,
                            statusText: 'Офлайн',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});

// Обработка сообщений
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});