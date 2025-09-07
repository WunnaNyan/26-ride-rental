// Function to load header/footer
function loadPartial(id, file) {
  fetch(file)
    .then(response => response.text())
    .then(data => {
      document.getElementById(id).innerHTML = data;
    })
    .catch(error => console.error("Error loading partial:", error));
}

// Main code after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Load header and footer
  loadPartial("site-header", "partials/header.html");
  loadPartial("site-footer", "partials/footer.html");

  // Example bookings (later Firebase)
  const bookings = {
    "Toyota Vellfire": ["2025-09-10", "2025-09-15"],
    "Nissan Serena": ["2025-09-12"],
    "Toyota Crown": ["2025-09-11"]
  };

  // Initialize calendar
  // Show car boxes after selecting a date
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
      const carName = box.getAttribute("data-car");
      if (bookings[carName] && bookings[carName].includes(dateStr)) {
        box.classList.add("disabled");  // car is booked
      } else {
        box.classList.remove("disabled");
      }
    });

    document.getElementById("reservation-form-container").style.display = "none";
  }
});

// Click a car box to select it
const carBoxes = document.querySelectorAll(".car-box");
carBoxes.forEach(box => {
  box.addEventListener("click", () => {
    if (box.classList.contains("disabled")) return; // can't click booked cars

    // Deselect other boxes
    carBoxes.forEach(b => b.classList.remove("selected"));
    box.classList.add("selected");

    // Show reservation form
    document.getElementById("reservation-form-container").style.display = "block";

    // Store selected car for submission
    const selectedCarInput = document.getElementById("selected-car");
    if (!selectedCarInput) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.id = "selected-car";
      input.name = "car";
      input.value = box.getAttribute("data-car");
      document.getElementById("rental-form").appendChild(input);
    } else {
      selectedCarInput.value = box.getAttribute("data-car");
    }
  });
});


  // Reservation form submission
  const form = document.getElementById("rental-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      alert(`Reservation submitted for ${carSelect.value} on ${document.getElementById("calendar").value}`);
      form.reset();
      document.getElementById("reservation-form-container").style.display = "none";
      document.getElementById("car-selection").style.display = "none";
    });
  }

  console.log("🚗 26 Ride Rental website loaded successfully!");
});
