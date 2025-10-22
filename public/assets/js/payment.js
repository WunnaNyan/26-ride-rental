// --- payment.js ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDBYpWHtaztTps2LlSItES1ZJxt_XdDztU",
  authDomain: "ride-rental-7e38d.firebaseapp.com",
  projectId: "ride-rental-7e38d",
  storageBucket: "ride-rental-7e38d.firebasestorage.app",
  messagingSenderId: "262023674030",
  appId: "1:262023674030:web:b191ce0617ccba4140153f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Load header/footer
function loadPartial(id, file) {
  fetch(file)
    .then(r => r.text())
    .then(html => {
      document.getElementById(id).innerHTML = html;
      const path = window.location.pathname.split("/").pop();
      document.querySelectorAll("nav a").forEach(link => {
        if (link.getAttribute("href") === path) link.classList.add("active");
      });
    })
    .catch(err => console.error("Error loading partial:", err));
}

loadPartial("site-header", "partials/header.html");
loadPartial("site-footer", "partials/footer.html");

// --- Main logic ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ payment.js loaded!");

  const rentalData = JSON.parse(sessionStorage.getItem("rentalData"));
  console.log("rentalData from session:", rentalData);

  if (!rentalData) {
    alert("No booking data found. Please start again.");
    window.location.href = "rental.html";
    return;
  }

  // Populate summary
  document.getElementById("pay-car").textContent = rentalData.car;
  document.getElementById("pay-date").textContent = rentalData.date;
  document.getElementById("pay-days").textContent = rentalData.days;
  document.getElementById("pay-cost").textContent = `¥${rentalData.days * 10000}`;

  // Attach form listener
  const form = document.getElementById("payment-form");
  console.log("Form found?", !!form);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("🟡 Submit button clicked!");

    const file = document.getElementById("proof").files[0];
    console.log("File selected?", !!file);

    if (!file) {
      alert("Please upload proof of payment.");
      return;
    }

    try {
      console.log("⏳ Uploading to Firebase Storage...");
      const storageRef = ref(storage, `paymentProofs/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const proofUrl = await getDownloadURL(storageRef);
      console.log("✅ Upload done, URL:", proofUrl);

      const reservation = {
        ...rentalData,
        proofUrl,
        createdAt: new Date()
      };

      console.log("🧾 Adding reservation to Firestore:", reservation);
      await addDoc(collection(db, "reservations"), reservation);

      alert("✅ Payment submitted successfully!");
      sessionStorage.removeItem("rentalData");
      window.location.href = "thankyou.html";
    } catch (err) {
      console.error("❌ Error submitting payment:", err);
      alert("❌ " + err.message);
    }
  });
});
