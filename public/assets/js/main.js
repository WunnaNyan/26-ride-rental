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
  carBoxes.forEach(box => {
    box.addEventListener("click", () => {
      if (box.classList.contains("disabled")) return;

      // Deselect other cars
      carBoxes.forEach(b => b.classList.remove("selected"));
      box.classList.add("selected");

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


  // Reservation form submission
  const form = document.getElementById("rental-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const selectedCar = document.querySelector(".car-box.selected")?.dataset.car;
      const selectedDate = document.querySelector("#calendar")._flatpickr.selectedDates[0]?.toISOString().split("T")[0];

      if (!selectedCar || !selectedDate) {
        alert("❌ Please select a car and date.");
        return;
      }

      const reservation = {
        name: document.getElementById("name").value,
        phone: document.getElementById("phone").value,
        facebook: document.getElementById("facebook").value,
        location: document.getElementById("location").value,
        car: selectedCar,
        date: selectedDate,
        createdAt: new Date()
      };

      try {
        await addDoc(collection(db, "reservations"), reservation);
        alert("✅ Reservation submitted successfully!");
        form.reset();
        document.getElementById("reservation-form-container").style.display = "none";
        document.getElementById("car-selection").style.display = "none";
        carBoxes.forEach(b => b.classList.remove("selected"));
      } catch (error) {
        console.error("❌ Error adding reservation:", error);
        alert("❌ " + error.message);
      }
    });
  }

  console.log("🚗 Rental page ready with Firebase integration and header/footer loading!");
});
