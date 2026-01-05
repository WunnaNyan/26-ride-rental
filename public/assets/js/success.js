document.addEventListener("DOMContentLoaded", () => {
    const bookingID = sessionStorage.getItem("latestBookingID");
    const notiBox = document.getElementById("noti-box");
    const idDisplay = document.getElementById("booking-id");
    const notiText = document.getElementById("noti-id-text");

    if (bookingID) {
        // 1. Set the text on the page and in the notification
        idDisplay.textContent = "#" + bookingID;
        notiText.textContent = "Your ID: " + bookingID;

        // 2. Trigger the "Push" animation after a tiny delay
        setTimeout(() => {
            notiBox.classList.add("show");
        }, 500); // 0.5 second delay for smooth entrance

        // 3. Hide it automatically after 5 seconds
        setTimeout(() => {
            notiBox.classList.remove("show");
        }, 5000);

    } else {
        window.location.href = "index.html";
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const bookingID = sessionStorage.getItem("latestBookingID");
    const rentalData = JSON.parse(sessionStorage.getItem("rentalData"));

    // 1. Show Booking ID
    if (bookingID) {
        document.getElementById("booking-id").textContent = "#" + bookingID;
        // Trigger your custom notification here too
    }

    // 2. Show Summary Data
    if (rentalData) {
        document.getElementById("sum-car").textContent = rentalData.car;
        document.getElementById("sum-date").textContent = rentalData.date;
        document.getElementById("sum-cost").textContent = `¥${rentalData.totalPrice.toLocaleString()}`;
    }

    // 3. Clear session storage only when they leave
    const homeBtn = document.querySelector(".btn-primary");
    homeBtn.addEventListener("click", () => {
        sessionStorage.clear();
    });
});