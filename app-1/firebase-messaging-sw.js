// Firebase Cloud Messaging Background Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase inside the service worker
// The config can be dynamically passed or configured
const firebaseConfig = {
  apiKey: "AIzaSyD-PlanningEasyPlaceholderKey",
  authDomain: "planningeasy.firebaseapp.com",
  projectId: "planningeasy",
  storageBucket: "planningeasy.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:planningeasy0123"
};

try {
  if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message: ', payload);
    const notificationTitle = payload.notification?.title || payload.data?.title || 'PlanningEasy Notification';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'You have an update in PlanningEasy.',
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      tag: payload.data?.tag || 'planningeasy-msg',
      data: {
        url: payload.data?.url || './'
      }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.warn('[firebase-messaging-sw.js] FCM init in SW:', err);
}
