import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBIjpu-0a_Ik8T90god6UjjethA6HnpDi8",
  authDomain: "statments-51924.firebaseapp.com",
  projectId: "statments-51924",
  storageBucket: "statments-51924.firebasestorage.app",
  messagingSenderId: "271832287182",
  appId: "1:271832287182:web:0248f309635435a8de0d9f",
  measurementId: "G-Y9LT1006GL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize analytics only in browser environment
if (typeof window !== 'undefined') {
  const analytics = getAnalytics(app);
}