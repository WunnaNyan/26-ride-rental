import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDBYpWHtaztTps2LlSItES1ZJxt_XdDztU",
  authDomain: "ride-rental-7e38d.firebaseapp.com",
  projectId: "ride-rental-7e38d",
  storageBucket: "ride-rental-7e38d.firebasestorage.app",
  messagingSenderId: "262023674030",
  appId: "1:262023674030:web:b191ce0617ccba4140153f"
};

// Initialize Firebase once
const app = initializeApp(firebaseConfig);

// Export the services so other files can import them
export const db = getFirestore(app);
export const storage = getStorage(app);