document.addEventListener("DOMContentLoaded", () => {
  const rentalData = JSON.parse(sessionStorage.getItem("rentalData"));

  if (!rentalData) {
    window.location.href = "rental.html";
    return;
  }

  // Handle Date Display (Support for both single string and array)
  let dateDisplay = "";
  if (Array.isArray(rentalData.dates)) {
    // If it's a range, show "Start to End"
    dateDisplay = rentalData.dates.length > 1 
      ? `${rentalData.dates[0]} to ${rentalData.dates[rentalData.dates.length - 1]}`
      : rentalData.dates[0];
  } else {
    dateDisplay = rentalData.date || "Not Selected";
  }

  const container = document.getElementById("summary-container");
  if (container) {
    container.innerHTML = `
      <div class="summary-item"><strong>Name:</strong> <span>${rentalData.name}</span></div>  
      <div class="summary-item"><strong>License No:</strong> <span>${rentalData.licenseNumber || 'N/A'}</span></div>
      <div class="summary-item"><strong>Car:</strong> <span>${rentalData.car}</span></div>
      <div class="summary-item"><strong>Location:</strong> <span>${rentalData.location}</span></div>
      <div class="summary-item"><strong>Dates:</strong> <span>${dateDisplay}</span></div>
      <div class="summary-item"><strong>Total Days:</strong> <span>${rentalData.days || 1} Days</span></div>
      <div class="summary-item" style="border:none; color:#2563eb; font-size:1.4rem; margin-top:15px;">
          <strong>Total Price:</strong> <strong>¥${(rentalData.totalPrice || 0).toLocaleString()}</strong>
      </div>
    `;
  }

  const proceedBtn = document.getElementById("proceed-btn");
  const agreeBox = document.getElementById("agree");

  if (agreeBox && proceedBtn) {
    agreeBox.addEventListener("change", () => {
      proceedBtn.disabled = !agreeBox.checked;
    });
  }

  if (proceedBtn) {
    proceedBtn.addEventListener("click", () => {
      window.location.href = "payment.html";
    });
  }

  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.history.back();
    });
  }
});