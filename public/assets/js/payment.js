import { db, storage } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

// 1. Load header/footer (Same as before)
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

document.addEventListener("DOMContentLoaded", () => {
  const rentalData = JSON.parse(sessionStorage.getItem("rentalData"));

  // Safety check: if no data, go back
  if (!rentalData) {
    alert("No data found, returning to start.");
    window.location.href = "rental.html";
    return;
  }

  // 2. Display summary in the HTML spans
  document.getElementById("pay-car").textContent = rentalData.car;
  document.getElementById("pay-date").textContent = rentalData.date;
  document.getElementById("pay-days").textContent = rentalData.days;
  document.getElementById("pay-cost").textContent = `¥${rentalData.totalPrice.toLocaleString()}`;

  const form = document.getElementById("payment-form");
  
  // 3. Handle Form Submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById("proof");
    const file = fileInput.files[0];

    if (!file) {
      alert("Please upload your payment screenshot first.");
      return;
    }

    // UI Feedback: Disable button
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    btn.textContent = "Uploading Proof & Saving...";

    try {
      // --- STEP A: UPLOAD TO STORAGE ---
      // We create a unique name using the current time + original filename
      const storagePath = `payment_proofs/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      
      const uploadSnapshot = await uploadBytes(storageRef, file);
      
      // --- STEP B: GET IMAGE URL ---
      const downloadURL = await getDownloadURL(uploadSnapshot.ref);

      // --- STEP C: SAVE TO FIRESTORE ---
      const finalDoc = {
        ...rentalData,              // All data from main.js (name, car, price, etc.)
        paymentScreenshot: downloadURL, // The link to the image in Storage
        status: "Pending Verification", // Updated status
        createdAt: new Date()        // Server timestamp
      };

      const docRef = await addDoc(collection(db, "reservations"), finalDoc);

      console.log("Booking confirmed with ID: ", docRef.id);
      alert("✅ Payment submitted! We will verify your booking shortly.");
      
      // Clear session and redirect
      sessionStorage.removeItem("rentalData");
      window.location.href = "index.html"; 

    } catch (err) {
      console.error("Submission error: ", err);
      alert("Error: " + err.message);
      
      // Reset button if error occurs
      btn.disabled = false;
      btn.textContent = "Submit Payment";
    }
  });
});