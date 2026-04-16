import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBFWiJWPzFQOAFd5n_GMiiqPXgtneIsRhk",
  authDomain: "mobilia-app-f86c2.firebaseapp.com",
  projectId: "mobilia-app-f86c2",
  storageBucket: "mobilia-app-f86c2.firebasestorage.app",
  messagingSenderId: "130373568801",
  appId: "1:130373568801:web:af89150c377b3655b31660"
};

// Esto inicializa la conexión
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);