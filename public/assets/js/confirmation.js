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

  // Handle Date Display
  let dateDisplay = "";
  if (Array.isArray(rentalData.dates) && rentalData.dates.length > 0) {
    if (rentalData.dates.length > 1) {
      const start = formatDisplayDate(rentalData.dates[0]);
      const end = formatDisplayDate(rentalData.dates[rentalData.dates.length - 1]);
      dateDisplay = `${start} to ${end}`;
    } else {
      dateDisplay = formatDisplayDate(rentalData.dates[0]);
    }
  } else {
    dateDisplay = formatDisplayDate(rentalData.date) || "Not Selected";
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
    
    // This is important: re-run translation for the new HTML we just injected
    if (typeof window.applyTranslations === 'function') {
        window.applyTranslations();
    }
  }

  const proceedBtn = document.getElementById("proceed-btn");
  const agreeBox = document.getElementById("agree");

  // Toggle button state visually, but keep enabled so we can show the alert
  if (agreeBox && proceedBtn) {
    // We remove the 'disabled' attribute to handle the click and show an alert instead
    proceedBtn.disabled = false; 
    
    proceedBtn.addEventListener("click", (e) => {
      if (!agreeBox.checked) {
        // You can use the translation key here if you have it in your JSON
        alert("Please check the 'I agree to the terms and conditions' box to proceed.");
      } else {
        window.location.href = "payment.html";
      }
    });
  }

  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.onclick = () => window.history.back();
  }
});