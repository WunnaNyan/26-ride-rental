document.addEventListener("DOMContentLoaded", () => {
  const rentalData = JSON.parse(sessionStorage.getItem("rentalData"));

  if (!rentalData) {
    window.location.href = "rental.html";
    return;
  }

  // --- HELPER: FORMAT DATES (YYYY/MM/DD) ---
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "";
    return dateStr.replace(/-/g, '/');
  };

  // Handle Date Display (Support for both single string and array)
  let dateDisplay = "";
  if (Array.isArray(rentalData.dates) && rentalData.dates.length > 0) {
    if (rentalData.dates.length > 1) {
      // If it's a range, show "2026/1/29 to 2026/2/3"
      const start = formatDisplayDate(rentalData.dates[0]);
      const end = formatDisplayDate(rentalData.dates[rentalData.dates.length - 1]);
      dateDisplay = `${start} to ${end}`;
    } else {
      // If it's only one day, show "2026/1/29"
      dateDisplay = formatDisplayDate(rentalData.dates[0]);
    }
  } else if (rentalData.date) {
    // Fallback for legacy data
    dateDisplay = formatDisplayDate(rentalData.date);
  } else {
    dateDisplay = "Not Selected";
  }

  const container = document.getElementById("summary-container");
  if (container) {
    container.innerHTML = `
      <div class="summary-item"><strong data-i18n="sum_name">Name:</strong> <span>${rentalData.name}</span></div>  
      <div class="summary-item"><strong data-i18n="sum_LicNum">License No:</strong> <span>${rentalData.licenseNumber || 'N/A'}</span></div>
      <div class="summary-item"><strong data-i18n="sum_car">Car:</strong> <span>${rentalData.car}</span></div>
      <div class="summary-item"><strong data-i18n="sum_location">Location:</strong> <span>${rentalData.location}</span></div>
      <div class="summary-item"><strong data-i18n="sum_date">Rental Date:</strong> <span>${dateDisplay}</span></div>
      <div class="summary-item"><strong data-i18n="pay_days">Total Days:</strong> <span>${rentalData.days || 1} Day(s)</span></div>
      <div class="summary-item" style="border:none; color:#2563eb; font-size:1.4rem; margin-top:15px;">
          <strong data-i18n="pay_total">Total Price:</strong> <strong>¥${(rentalData.totalPrice || 0).toLocaleString()}</strong>
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