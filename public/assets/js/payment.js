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

    // --- NEW: PREVIEW LOGIC ---
    const setupPreview = (inputId, previewId) => {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        
        input.addEventListener("change", function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.src = e.target.result;
                    preview.style.display = "block";
                };
                reader.readAsDataURL(file);
            }
        });
    };

    setupPreview("proof", "proof-preview");
    setupPreview("license", "license-preview");
    // --------------------------

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const proofFile = document.getElementById("proof").files[0];
        const licenseFile = document.getElementById("license").files[0];

        if (!proofFile || !licenseFile) {
            alert("Please upload both the payment proof and your driving license.");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Verifying availability...";

        try {
            // 1. Double-check availability
            const q = query(
                collection(db, "reservations"),
                where("car", "==", rentalData.car),
                where("date", "==", rentalData.date)
            );
            const checkSnapshot = await getDocs(q);
            
            if (!checkSnapshot.empty) {
                alert("This car was just reserved. Please choose another date.");
                window.location.href = "rental.html";
                return;
            }

            // 2. Generate Booking ID
            const bookingNumber = Math.random().toString(36).toUpperCase().substring(2, 8);
            submitBtn.textContent = "Uploading Documents...";

            // Helper function for Storage upload
            const uploadFile = async (file, folder) => {
                const path = `${folder}/${bookingNumber}_${file.name}`;
                const storageRef = ref(storage, path);
                const snapshot = await uploadBytes(storageRef, file);
                return await getDownloadURL(snapshot.ref);
            };

            // 3. UPLOAD BOTH (Running at the same time)
            const [proofURL, licenseURL] = await Promise.all([
                uploadFile(proofFile, "payment_proofs"),
                uploadFile(licenseFile, "license_images")
            ]);

            submitBtn.textContent = "Finalizing Booking...";

            // 4. SAVE TO FIRESTORE
            const finalBooking = {
                ...rentalData,
                bookingID: bookingNumber,
                paymentScreenshot: proofURL,
                drivingLicenseURL: licenseURL, // Added this field
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