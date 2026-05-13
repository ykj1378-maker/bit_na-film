'use strict';

const CACHE_NAME = 'bn-diary-v3';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// 설치: 핵심 파일 캐시
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS_TO_CACHE);
    }).catch(function() {
      // 캐시 실패해도 SW 설치는 계속 진행
    })
  );
  self.skipWaiting();
});

// 활성화: 이전 캐시 삭제
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return clients.claim();
    })
  );
});

// fetch: 네트워크 우선, 실패 시 캐시
self.addEventListener('fetch', function(event) {
  // POST 등 비GET 요청은 무시
  if (event.request.method !== 'GET') return;

  // Firebase/Gist 요청은 SW 캐시 제외 (항상 네트워크 직접 처리)
  const url = event.request.url;
  if (url.includes('firebase') || url.includes('firestore') || url.includes('github.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request).then(function(response) {
      // 유효한 응답이면 캐시에도 저장
      if (response && response.status === 200 && response.type === 'basic') {
        const cloned = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, cloned);
        });
      }
      return response;
    }).catch(function() {
      // 오프라인: 캐시에서 반환
      return caches.match(event.request).then(function(cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
