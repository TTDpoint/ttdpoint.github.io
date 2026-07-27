const CACHE_NAME = 'ttdpoint-v1';

// 安装时预缓存关键资源
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll([
                '/',
                '/index.html'
            ]);
        })
    );
    self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// 请求拦截：缓存优先策略
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // 对 media.nextplay.com.cn 图片使用缓存优先
    if (url.hostname === 'media.nextplay.com.cn') {
        event.respondWith(cacheFirst(event.request));
        return;
    }

    // 对本站资源使用缓存优先
    if (url.hostname === 'ttdpoint.site' || url.hostname === 'ttdpoint.github.io') {
        // HTML 使用网络优先确保最新版本
        if (event.request.destination === 'document') {
            event.respondWith(networkFirst(event.request));
            return;
        }
        event.respondWith(cacheFirst(event.request));
        return;
    }
});

// 缓存优先：先查缓存，未命中再请求网络
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (e) {
        return new Response('', { status: 408 });
    }
}

// 网络优先：先请求网络，失败时回退缓存
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
        return response;
    } catch (e) {
        const cached = await caches.match(request);
        return cached || new Response('', { status: 408 });
    }
}
