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

    // --- HELPER: FORMAT DATES (YYYY/MM/DD) ---
    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return "";
        return dateStr.replace(/-/g, '/');
    };

    // Update UI Summary
    document.getElementById("pay-car").textContent = rentalData.car;
    document.getElementById("pay-cost").textContent = `¥${rentalData.totalPrice.toLocaleString()}`;
    document.getElementById("pay-days").textContent = `${rentalData.days || 1}`;

    // Handle Multi-day Date Display for the UI
    let dateDisplay = "";
    if (Array.isArray(rentalData.dates) && rentalData.dates.length > 0) {
        if (rentalData.dates.length > 1) {
            const start = formatDisplayDate(rentalData.dates[0]);
            const end = formatDisplayDate(rentalData.dates[rentalData.dates.length - 1]);
            dateDisplay = `${start} to ${end}`;
        } else {
            dateDisplay = formatDisplayDate(rentalData.dates[0]);
        }
    } else {
        dateDisplay = formatDisplayDate(rentalData.date) || "---";
    }
    document.getElementById("pay-date").innerText = dateDisplay;

    const form = document.getElementById("payment-form");
    const submitBtn = document.getElementById("submit-btn");

    // Image Previews (Clean UI)
    const setupPreview = (inputId, previewId) => {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        if (!input || !preview) return;

        input.onchange = (e) => {
            const [file] = e.target.files;
            if (file) {
                preview.src = URL.createObjectURL(file);
                preview.style.display = "block";
            }
        };
    };

    setupPreview("proof", "proof-preview");
    setupPreview("license", "license-preview");

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
            // 1. Double-check availability for ALL selected dates
            // We fetch all reservations for this specific car
            const q = query(
                collection(db, "reservations"),
                where("car", "==", rentalData.car)
            );
            const checkSnapshot = await getDocs(q);
            
            let alreadyBooked = false;
            const requestedDates = rentalData.dates || [rentalData.date];

            checkSnapshot.forEach((doc) => {
                const existingData = doc.data();
                const existingDates = existingData.dates || [existingData.date];
                
                // Check if any requested date exists in this existing reservation
                const overlap = requestedDates.some(d => existingDates.includes(d));
                if (overlap) alreadyBooked = true;
            });

            if (alreadyBooked) {
                alert("One or more of your selected dates are no longer available. Please choose another date range.");
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

            // 3. UPLOAD BOTH
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
                drivingLicenseURL: licenseURL,
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