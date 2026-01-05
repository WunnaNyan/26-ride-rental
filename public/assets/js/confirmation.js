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

  const summaryDiv = document.getElementById("summary-container");
  summaryDiv.innerHTML = `
    <div class="summary-box">
      <p><strong>Name:</strong> ${rentalData.name}</p>
      <p><strong>Car:</strong> ${rentalData.car}</p>
      <p><strong>Date:</strong> ${rentalData.date}</p>
      <p><strong>Total:</strong> ¥${rentalData.totalPrice.toLocaleString()}</p>
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