import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

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

// Expose globally (so other scripts can use if needed)
window.db = db;
window.storage = storage;

// Function to load partial HTML (header/footer)
function loadPartial(id, file) {
  fetch(file)
    .then(response => response.text())
    .then(data => {
      document.getElementById(id).innerHTML = data;

      // Highlight active page in nav
      const path = window.location.pathname.split("/").pop();
      const links = document.querySelectorAll("nav a");
      links.forEach(link => {
        if (link.getAttribute("href") === path) {
          link.classList.add("active");
        }
      });
    })
    .catch(error => console.error("Error loading partial:", error));
}


document.addEventListener("DOMContentLoaded", () => {
  const db = window.db;

  // Load header and footer
  loadPartial("site-header", "partials/header.html");
  loadPartial("site-footer", "partials/footer.html");

  // Mock bookings (used to disable cars on certain dates)
  const bookings = {
    "Toyota Vellfire": ["2025-09-10", "2025-09-15"],
    "Nissan Serena": ["2025-09-12"],
    "Toyota Crown": ["2025-09-11"]
  };

  // Initialize calendar
  flatpickr("#calendar", {
    inline: true,
    dateFormat: "Y-m-d",
    minDate: "today",
    onChange: function(selectedDates, dateStr) {
      if (!dateStr) return;

      const carSelectDiv = document.getElementById("car-selection");
      carSelectDiv.style.display = "block";

      const carBoxes = document.querySelectorAll(".car-box");
      carBoxes.forEach(box => {
        const carName = box.dataset.car;
        if (bookings[carName]?.includes(dateStr)) {
          box.classList.add("disabled"); // mark car as booked
        } else {
          box.classList.remove("disabled");
        }
      });

      // Hide reservation form when picking a new date
      document.getElementById("reservation-form-container").style.display = "none";
    }
  }); 

  // Car selection
  const carBoxes = document.querySelectorAll(".car-box");
  
  // Car selection
carBoxes.forEach(box => {
  box.addEventListener("click", () => {
    if (box.classList.contains("disabled")) return;

    // Deselect other cars and remove their details button
    carBoxes.forEach(b => {
      b.classList.remove("selected");
      const btn = b.querySelector(".see-details-btn");
      if (btn) btn.remove();
    });

    // Mark this one as selected
    box.classList.add("selected");

    // Add "See Details" button if not already there
    let detailsBtn = box.querySelector(".see-details-btn");
    if (!detailsBtn) {
      detailsBtn = document.createElement("a");
      detailsBtn.className = "btn-secondary see-details-btn";
      
      // Match car names to IDs in cars.html
      const carName = box.dataset.car;
      let carId = "";
      if (carName === "Toyota Vellfire") carId = "vellfire";
      if (carName === "Nissan Serena") carId = "serena";
      if (carName === "Toyota Crown") carId = "crown";

      detailsBtn.href = `cars.html#${carId}`;
      detailsBtn.textContent = "See Details";

      box.appendChild(detailsBtn);
    }

    // Show reservation form
    document.getElementById("reservation-form-container").style.display = "block";
  });
});

  


  document.addEventListener("DOMContentLoaded", () => {
    const swipers = document.querySelectorAll(".swiper.car-gallery");
    swipers.forEach((gallery) => {
      new Swiper(gallery, {
        slidesPerView: 1,
        spaceBetween: 10,
        navigation: {
          nextEl: gallery.querySelector(".swiper-button-next"),
          prevEl: gallery.querySelector(".swiper-button-prev"),
        },
        loop: true,
      });
    });
  });


  // Reservation form submission (Step 1 → Confirmation)
const form = document.getElementById("rental-form");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const selectedCar = document.querySelector(".car-box.selected")?.dataset.car;
    const selectedDate = document.querySelector("#calendar")._flatpickr.selectedDates[0]?.toISOString().split("T")[0];

    if (!selectedCar || !selectedDate) {
      alert("❌ Please select a car and date.");
      return;
    }

    // Collect data
    const rentalData = {
      name: document.getElementById("name").value,
      phone: document.getElementById("phone").value,
      facebook: document.getElementById("facebook").value,
      location: document.getElementById("location").value,
      car: selectedCar,
      date: selectedDate,
      days: 1 // default, can add input later
    };

    // Save in sessionStorage
    sessionStorage.setItem("rentalData", JSON.stringify(rentalData));

    // Redirect to confirmation page
    window.location.href = "confirmation.html";
  });
}


  console.log("🚗 Rental page ready with Firebase integration and header/footer loading!");
});
