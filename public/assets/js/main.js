

// Helper for price calculation
const carPrices = {
  "Toyota Vellfire": 15000,
  "Toyota Alphard": 12000,
  "Nissan Serena": 11000
};

// 2. Load Partial HTML (Header/Footer)
function loadPartial(id, file) {
  fetch(file)
    .then(response => response.text())
    .then(data => {
      document.getElementById(id).innerHTML = data;
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
  // Load UI components
  loadPartial("site-header", "partials/header.html");
  loadPartial("site-footer", "partials/footer.html");

  // Mock bookings
  const bookings = {
    "Toyota Vellfire": ["2025-09-10", "2025-09-15"],
    "Nissan Serena": ["2025-09-12"],
    "Toyota Alphard": ["2025-09-11"]
  };

  // 3. Initialize Flatpickr Calendar
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
          box.classList.add("disabled");
        } else {
          box.classList.remove("disabled");
        }
      });
      document.getElementById("reservation-form-container").style.display = "none";
    }
  }); 

  // 4. Car Selection Logic
  const carBoxes = document.querySelectorAll(".car-box");
  carBoxes.forEach(box => {
    box.addEventListener("click", () => {
      if (box.classList.contains("disabled")) return;

      carBoxes.forEach(b => {
        b.classList.remove("selected");
        const btn = b.querySelector(".see-details-btn");
        if (btn) btn.remove();
      });

      box.classList.add("selected");

      // Add "See Details" button
      let detailsBtn = box.querySelector(".see-details-btn");
      if (!detailsBtn) {
        detailsBtn = document.createElement("a");
        detailsBtn.className = "btn-secondary see-details-btn";
        const carName = box.dataset.car;
        let carId = carName.split(' ').pop().toLowerCase(); // e.g., "vellfire"
        detailsBtn.href = `cars.html#${carId}`;
        detailsBtn.textContent = "See Details";
        box.appendChild(detailsBtn);
      }
      document.getElementById("reservation-form-container").style.display = "block";
    });
  });

  // 5. Swiper Gallery (If exists on page)
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

  // 6. Handle Form Submission (Moving to Confirmation)
  const form = document.getElementById("rental-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const selectedCar = document.querySelector(".car-box.selected")?.dataset.car;
      const calendarInstance = document.querySelector("#calendar")._flatpickr;
      const selectedDate = calendarInstance.selectedDates[0]?.toISOString().split("T")[0];

      if (!selectedCar || !selectedDate) {
        alert("❌ Please select a car and date.");
        return;
      }

      // Collect everything for sessionStorage
      const rentalData = {
        name: document.getElementById("name").value,
        phone: document.getElementById("phone").value,
        facebook: document.getElementById("facebook").value,
        location: document.getElementById("location").value,
        car: selectedCar,
        date: selectedDate,
        days: 1,
        totalPrice: carPrices[selectedCar] || 0 // Store price here so it carries over
      };

      sessionStorage.setItem("rentalData", JSON.stringify(rentalData));
      console.log("Data saved to session, redirecting...");
      window.location.href = "confirmation.html";
    });
  }
});