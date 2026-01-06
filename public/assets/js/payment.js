import { db, storage } from "./firebase.js";
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

document.addEventListener("DOMContentLoaded", () => {
    const rentalData = JSON.parse(sessionStorage.getItem("rentalData"));

    if (!rentalData) {
        alert("No booking data found. Returning to selection.");
        window.location.href = "rental.html";
        return;
    }

    // Update UI Summary
    document.getElementById("pay-car").textContent = rentalData.car;
    document.getElementById("pay-date").textContent = rentalData.date;
    document.getElementById("pay-cost").textContent = `¥${rentalData.totalPrice.toLocaleString()}`;

    const form = document.getElementById("payment-form");
    const submitBtn = document.getElementById("submit-btn");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById("proof");
        const file = fileInput.files[0];

        if (!file) {
            alert("Please upload your payment screenshot.");
            return;
        }

        // UI Feedback: Loading state
        submitBtn.disabled = true;
        submitBtn.textContent = "Verifying availability...";

        try {
            // 1. THE DOUBLE-CHECK: Ensure no one booked this car/date while user was paying
            const q = query(
                collection(db, "reservations"),
                where("car", "==", rentalData.car),
                where("date", "==", rentalData.date)
            );
            
            const checkSnapshot = await getDocs(q);
            
            if (!checkSnapshot.empty) {
                alert("This car was just reserved by someone else for this date. Please choose another date.");
                window.location.href = "rental.html";
                return;
            }

            submitBtn.textContent = "Uploading Receipt...";

            // 2. GENERATE BOOKING ID
            const bookingNumber = Math.random().toString(36).toUpperCase().substring(2, 8);

            // 3. UPLOAD TO STORAGE
            const storagePath = `payment_proofs/${bookingNumber}_${file.name}`;
            const storageRef = ref(storage, storagePath);
            const uploadSnapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(uploadSnapshot.ref);

            submitBtn.textContent = "Finalizing Booking...";

            // 4. SAVE TO FIRESTORE
            const finalBooking = {
                ...rentalData,
                bookingID: bookingNumber,
                paymentScreenshot: downloadURL,
                status: "Pending Verification",
                createdAt: new Date()
            };

            await addDoc(collection(db, "reservations"), finalBooking);

            // 5. SUCCESS
            sessionStorage.setItem("latestBookingID", bookingNumber);
            window.location.href = "success.html";

        } catch (err) {
            console.error("Submission error: ", err);
            alert("An error occurred: " + err.message);
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit & Confirm Booking";
        }
    });
});