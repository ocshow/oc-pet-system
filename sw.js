// Service Worker for OC云台小窝 PWA
const CACHE_NAME = 'oc-pet-system-v1.7';
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './assets/pet.svg',
  './assets/pal-001.png',
  './assets/pal-001.webm',
  './assets/pal-002.webm',
  './assets/pal-003.webm',
  './assets/pal-004.webm',
  './assets/kong.png'
];

// 安装事件 - 缓存资源
self.addEventListener('install', (event) => {
  console.log('Service Worker 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('缓存资源:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker 安装完成');
        return self.skipWaiting();
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('Service Worker 激活中...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker 激活完成');
      return self.clients.claim();
    })
  );
});

// 拦截网络请求 - 优先使用缓存
self.addEventListener('fetch', (event) => {
  // 跳过非GET请求
  if (event.request.method !== 'GET') {
    return;
  }

  // 跳过非HTTP/HTTPS请求
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 如果缓存中有响应，返回缓存的响应
        if (response) {
          console.log('从缓存返回:', event.request.url);
          return response;
        }

        // 如果缓存中没有，尝试从网络获取
        return fetch(event.request)
          .then((response) => {
            // 检查响应是否有效
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 克隆响应，因为响应流只能读取一次
            const responseToCache = response.clone();

            // 将新响应添加到缓存
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
                console.log('缓存新资源:', event.request.url);
              });

            return response;
          })
          .catch(() => {
            // 网络请求失败时，尝试返回离线页面
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// 后台同步 - 当网络恢复时同步数据
self.addEventListener('sync', (event) => {
  console.log('后台同步事件:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // 这里可以添加数据同步逻辑
      console.log('执行后台数据同步...')
    );
  }
});

// 推送通知 - 接收推送消息
self.addEventListener('push', (event) => {
  console.log('收到推送消息:', event);
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || '你的OC想你了！',
      icon: './assets/pet.svg',
      badge: './assets/pet.svg',
      tag: 'oc-pet-notification',
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: '打开应用'
        },
        {
          action: 'close',
          title: '关闭'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'OC云台小窝', options)
    );
  }
});

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
  console.log('通知被点击:', event);
  
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// 消息事件 - 处理来自主线程的消息
self.addEventListener('message', (event) => {
  console.log('Service Worker 收到消息:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('Service Worker 加载完成');
