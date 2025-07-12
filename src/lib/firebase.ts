import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDdSrj9QlT_HQjXRP-elkLhLtP5Jx8x8Ug",
  authDomain: "inventory-management-92166.firebaseapp.com",
  projectId: "inventory-management-92166",
  storageBucket: "inventory-management-92166.firebasestorage.app",
  messagingSenderId: "679251672484",
  appId: "1:679251672484:web:899117c5ea32c235831531",
  measurementId: "G-17WW0LFQEP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;
