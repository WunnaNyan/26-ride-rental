// At the top of payment.js
import { db, storage } from "./firebase.js";

// Firestore imports
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Storage imports -> MAKE SURE 'ref' IS HERE!
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

document.addEventListener("DOMContentLoaded", () => {
  const rentalData = JSON.parse(sessionStorage.getItem("rentalData"));

  if (!rentalData) {
    alert("No data found, returning to start.");
    window.location.href = "rental.html";
    return;
  }

  // Display Summary
  document.getElementById("pay-car").textContent = rentalData.car;
  document.getElementById("pay-date").textContent = rentalData.date;
  document.getElementById("pay-days").textContent = rentalData.days;
  document.getElementById("pay-cost").textContent = `¥${rentalData.totalPrice.toLocaleString()}`;

  const form = document.getElementById("payment-form");
  
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById("proof");
    const file = fileInput.files[0];

    if (!file) {
      alert("Please upload your payment screenshot first.");
      return;
    }

    // UI Feedback
    const btn = document.getElementById("submit-btn");
    btn.disabled = true;
    btn.textContent = "Processing Booking...";

    try {
      // 1. Generate a professional Booking Number
      const bookingNumber = Math.random().toString(36).toUpperCase().substring(2, 8);

      // 2. Upload Screenshot to Storage
      const storagePath = `payment_proofs/${bookingNumber}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadSnapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadSnapshot.ref);

      // 3. Save to Firestore with the Booking Number
      const finalDoc = {
        ...rentalData,
        bookingID: bookingNumber,       // Added ID to the database
        paymentScreenshot: downloadURL,
        status: "Pending Verification",
        createdAt: new Date()
      };

      await addDoc(collection(db, "reservations"), finalDoc);

      // 4. Store the Booking ID for the Success Page
      sessionStorage.setItem("latestBookingID", bookingNumber);

      // 5. Success! Clear data and redirect
      // We don't remove rentalData yet so the success page can show it if needed
      window.location.href = "success.html"; 

    } catch (err) {
      console.error("Submission error: ", err);
      alert("Error: " + err.message);
      btn.disabled = false;
      btn.textContent = "Submit & Confirm Booking";
    }
  });
});