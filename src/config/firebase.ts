import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging';

// Firebase configuration - now with environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA01OtnytcW3ThyOS3sAV_LXNeSt7mA5qk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ask-stuart.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ask-stuart",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ask-stuart.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "517717293626",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:517717293626:web:78a5766355f82bd44f9303"
};

console.log('Firebase Config:', firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Cloud Messaging
const messaging = getMessaging(app);

export async function requestNotificationPermission(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_VAPID_KEY
      });
      
      if (token) {
        // Send token to backend
        await fetch('/.netlify/functions/fcm-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
        return token;
      }
    }
    return null;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
}

console.log('Firebase initialized successfully');
