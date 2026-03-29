import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
export { ref, onValue, set, get, update, push, remove } from "firebase/database";
export { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC91aymj8NyRRaNqmFx3VsEHIVL_RIFCj0",
  authDomain: "neiljeffries-e25e8.firebaseapp.com",
  databaseURL: "https://neiljeffries-e25e8.firebaseio.com",
  projectId: "neiljeffries-e25e8",
  storageBucket: "neiljeffries-e25e8.firebasestorage.app",
  messagingSenderId: "215210216279",
  appId: "1:215210216279:web:7a12f5dfc54df0ccd20c12"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getDatabase(firebaseApp);
export const storage = getStorage(firebaseApp);
