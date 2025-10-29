function loadPartial(id, file) {
  fetch(file)
    .then(r => r.text())
    .then(data => {
      document.getElementById(id).innerHTML = data;
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
  console.log("rentalData from session:", sessionStorage.getItem("rentalData"));

  if (!rentalData) {
    alert("No reservation data found!");
    window.location.href = "rental.html";
    return;
  }

  const prices = {
    "Toyota Vellfire": 15000,
    "Toyota Alphard": 12000,
    "Nissan Serena": 11000,
  };
  const totalPrice = prices[rentalData.car] * rentalData.days;

  const summaryDiv = document.getElementById("summary-container");
  summaryDiv.innerHTML = `
    <h3>Reservation Summary</h3>
    <div class="summary-item"><strong>Name:</strong> ${rentalData.name}</div>
    <div class="summary-item"><strong>Phone:</strong> ${rentalData.phone}</div>
    <div class="summary-item"><strong>Facebook:</strong> ${rentalData.facebook}</div>
    <div class="summary-item"><strong>Pickup Location:</strong> ${rentalData.location}</div>
    <div class="summary-item"><strong>Car:</strong> ${rentalData.car}</div>
    <div class="summary-item"><strong>Date:</strong> ${rentalData.date}</div>
    <div class="summary-item"><strong>Days:</strong> ${rentalData.days}</div>
    <div class="summary-item"><strong>Total Price:</strong>¥${totalPrice.toLocaleString()}</div>
  `;

  document.getElementById("back-btn").addEventListener("click", () => {
    window.location.href = "rental.html";
  });

  const agreeBox = document.getElementById("agree");
  const proceedBtn = document.getElementById("proceed-btn");

  agreeBox.addEventListener("change", () => {
    proceedBtn.disabled = !agreeBox.checked;
  });

  proceedBtn.addEventListener("click", () => {
    rentalData.totalPrice = totalPrice;
    sessionStorage.setItem("rentalData", JSON.stringify(rentalData));
    window.location.href = "payment.html";
  });
});
