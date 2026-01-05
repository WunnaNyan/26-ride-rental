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

  if (!rentalData) {
    window.location.href = "rental.html";
    return;
  }

  // Inside your DOMContentLoaded in confirmation.js
  const container = document.getElementById("summary-container");
  container.innerHTML = `
      <div class="summary-item"><strong>Name:</strong> <span>${rentalData.name}</span></div>  
      <div class="summary-item"><strong>Car:</strong> <span>${rentalData.car}</span></div>
      <div class="summary-item"><strong>Date:</strong> <span>${rentalData.date}</span></div>
      <div class="summary-item"><strong>Days:</strong> <span>${rentalData.days}</span></div>
      <div class="summary-item" style="border:none; color:#007BFF; font-size:1.2rem;">
          <strong>Total:</strong> <strong>¥${rentalData.totalPrice.toLocaleString()}</strong>
      </div>
  `;

  const proceedBtn = document.getElementById("proceed-btn");
  const agreeBox = document.getElementById("agree");

  agreeBox.addEventListener("change", () => {
    proceedBtn.disabled = !agreeBox.checked;
  });

  proceedBtn.addEventListener("click", () => {
    window.location.href = "payment.html";
  });

  document.getElementById("back-btn").addEventListener("click", () => {
    window.history.back();
  });
});