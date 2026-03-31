/* eslint-disable no-restricted-globals */
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js');

// Activate immediately and take control of all open tabs
globalThis.addEventListener('install', () => globalThis.skipWaiting());
globalThis.addEventListener('activate', (event) => event.waitUntil(globalThis.clients.claim()));

firebase.initializeApp({
  apiKey: 'AIzaSyC91aymj8NyRRaNqmFx3VsEHIVL_RIFCj0',
  authDomain: 'neiljeffries-e25e8.firebaseapp.com',
  projectId: 'neiljeffries-e25e8',
  messagingSenderId: '215210216279',
  appId: '1:215210216279:web:7a12f5dfc54df0ccd20c12',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'Puppy Plan Reminder';
  const body = payload.notification?.body ?? '';
  globalThis.registration.showNotification(title, {
    body,
    icon: '/paw-icon-192.png',
    badge: '/paw-icon-192.png',
  });
});
