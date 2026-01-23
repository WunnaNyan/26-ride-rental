import { db } from "./firebase.js";
import { collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// --- GLOBAL STATE ---
let carPrices = {}; 
let allCarsData = [];
let bookedDates = {};
let currentLang = localStorage.getItem('preferredLang') || 'en';
let translations = {};

// --- 1. DATABASE WATCHERS ---
function watchFleet() {
    onSnapshot(collection(db, "cars"), (snapshot) => {
        carPrices = {}; 
        allCarsData = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === "active") {
                carPrices[doc.id] = data.price;
                allCarsData.push({ id: doc.id, ...data });
            }
        });
        if (document.querySelector('.index-car-grid')) renderIndexFleet();
        if (document.getElementById('dynamic-car-list')) renderFleetPage();
        
        // Refresh display if a date is already picked
        const dateVal = document.getElementById('selected-date-input').value;
        if (dateVal) {
            const dates = JSON.parse(dateVal);
            updateCarDisplay(dates);
        }
    });
}

function watchReservations() {
    onSnapshot(query(collection(db, "reservations")), (snapshot) => {
        bookedDates = {}; 
        snapshot.forEach(doc => {
            const d = doc.data();
            // Supports both legacy 'date' and new 'dates' array
            const dates = d.dates || [d.date];
            dates.forEach(dateStr => {
                if (!bookedDates[dateStr]) bookedDates[dateStr] = [];
                bookedDates[dateStr].push(d.car);
            });
        });
        const dateVal = document.getElementById('selected-date-input').value;
        if (dateVal) {
            const dates = JSON.parse(dateVal);
            updateCarDisplay(dates);
        }
    });
}

// --- 2. RENDERING LOGIC ---
function renderFleetPage() {
    const container = document.getElementById('dynamic-car-list');
    if (!container) return;
    container.innerHTML = allCarsData.map(car => {
        const carIdSafe = car.id.replace(/\s+/g, '');
        const specs = car.specs || {};
        return `
        <div class="car-card-long" id="${car.id.toLowerCase().replace(/\s+/g, '-')}">
          <div class="car-images-container">
            <div class="main-image-viewport"><img src="${car.images[0]}" alt="${car.id}" id="main-${carIdSafe}"></div>
            <div class="thumbnail-grid">
                ${car.images.map(imgUrl => `<img src="${imgUrl}" alt="Thumbnail" onclick="changeMainImage('${carIdSafe}', '${imgUrl}')">`).join('')}
            </div>
          </div>
          <div class="car-info-content">
            <div class="car-header"><h3>${car.id}</h3><span class="price-tag">¥${car.price.toLocaleString()}<span>/day</span></span></div>
            <p class="car-description">${car.description || ''}</p>
            <div class="specs-grid">
              <div class="spec-item"><strong>Seats:</strong> ${specs.seats || '7'}</div>
              <div class="spec-item"><strong>Luggage:</strong> ${specs.luggage || '4 Bags'}</div>
              <div class="spec-item"><strong>Fuel:</strong> ${specs.fuel || 'Petrol'}</div>
              <div class="spec-item"><strong>Engine:</strong> ${specs.engine || '2.5L'}</div>
              <div class="spec-item"><strong>Trans:</strong> ${specs.trans || 'Auto'}</div>
              <div class="spec-item"><strong>Class:</strong> ${car.class || 'Premium'}</div>
            </div>
            <a href="rental.html?car=${encodeURIComponent(car.id)}" class="btn-primary" data-i18n="book_now">Book This Car</a>
          </div>
        </div>`;
    }).join('');
    applyTranslations();
}

function renderIndexFleet() {
    const container = document.querySelector('.index-car-grid');
    if (!container) return;
    container.innerHTML = allCarsData.map(car => `
        <a href="cars.html#${car.id.toLowerCase().replace(/\s+/g, '-')}" class="car-card">
            <div class="car-card-img">
                <img src="${car.images ? car.images[0] : 'assets/images/placeholder.jpg'}">
                <div class="price-badge">¥${car.price.toLocaleString()} / Day</div>
            </div>
            <div class="car-card-body"><h3>${car.id}</h3><p>${car.class || 'Premium'}</p><span class="card-link" data-i18n="view_details">View Details →</span></div>
        </a>`).join('');
    applyTranslations();
}

/**
 * FIXED: updateCarDisplay now accepts an ARRAY of dates.
 * If a car is booked on ANY of the selected dates, it shows as booked.
 */
function updateCarDisplay(datesArray) {
    const container = document.querySelector(".rental-car-grid");
    if (!container || !datesArray || datesArray.length === 0) return;

    container.innerHTML = allCarsData.map(car => {
        // Check if car is booked on ANY of the picked dates
        const isBooked = datesArray.some(date => (bookedDates[date] || []).includes(car.id));
        
        return `
            <div class="car-selection-box ${isBooked ? 'booked' : ''}" data-car="${car.id}">
                <div class="car-img-badge">${car.class || 'Premium'}</div>
                <div class="car-img-container">
                    <img src="${car.images ? car.images[0] : 'assets/images/placeholder.jpg'}" alt="${car.id}">
                    ${isBooked ? '<div class="booked-overlay">FULLY BOOKED</div>' : ''}
                    <div class="car-overlay">
                        <div class="overlay-stats">
                            <span>${car.specs?.seats || '7'} <span data-i18n="seats">Seats</span></span>
                            <span>¥${car.price.toLocaleString()}/day</span>
                        </div>
                    </div>
                </div>
                <div class="car-selection-info"><h4>${car.id}</h4></div>
            </div>`;
    }).join('');
    attachBoxListeners();
    applyTranslations();
}

// --- 3. CORE UTILITIES ---
function attachBoxListeners() {
    document.querySelectorAll('.car-selection-box').forEach(box => {
        box.onclick = () => {
            if (box.classList.contains('booked')) return;
            document.querySelectorAll('.car-selection-box').forEach(b => b.classList.remove('selected'));
            box.classList.add('selected');
            document.getElementById('selected-car-input').value = box.dataset.car;
            document.getElementById('reservation-form-container').style.display = 'block';
            document.getElementById('reservation-form-container').scrollIntoView({ behavior: 'smooth' });
        };
    });
}

async function loadTranslations(lang) {
    try {
        const response = await fetch(`./i18n/${lang}.json`);
        translations = await response.json();
        currentLang = lang;
        localStorage.setItem('preferredLang', lang);
        applyTranslations();
    } catch (err) { console.error("Language error:", err); }
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            if (el.placeholder) el.placeholder = translations[key];
            else el.textContent = translations[key];
        }
    });
}

function loadPartial(id, file) {
    const container = document.getElementById(id);
    if (!container) return;
    fetch(file).then(r => r.text()).then(data => {
        container.innerHTML = data;
        applyTranslations();
        if (id === 'site-header') initNavigationLogic();
    });
}

function initNavigationLogic() {
    const menuBtn = document.getElementById("mobile-menu");
    const closeBtn = document.getElementById("close-menu");
    const navContent = document.getElementById("nav-content");
    if (menuBtn && navContent) {
        menuBtn.onclick = () => { navContent.classList.add("active"); document.body.style.overflow = "hidden"; };
    }
    if (closeBtn) {
        closeBtn.onclick = () => { navContent.classList.remove("active"); document.body.style.overflow = "auto"; };
    }
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if(btn.dataset.lang === currentLang) btn.classList.add('active');
        btn.onclick = () => {
            document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadTranslations(btn.dataset.lang);
        };
    });
}

// --- 4. RENTAL LOGIC (MULTI-DAY + VALIDATION) ---
async function initRentalLogic() {
    const calendarEl = document.getElementById("calendar");
    const multiDayToggle = document.getElementById("multi-day-switch");

    if (calendarEl) {
        const fp = flatpickr("#calendar", {
            inline: true,
            mode: "single", 
            dateFormat: "Y-m-d",
            minDate: "today",
            onChange: (selectedDates, dateStr, instance) => {
                // If range mode, wait for both dates to be picked
                if (instance.config.mode === "range" && selectedDates.length < 2) return;

                let datesArray = [];
                if (selectedDates.length === 2) {
                    let curr = new Date(selectedDates[0]);
                    // Create deep copy to avoid reference issues while looping
                    let stopDate = new Date(selectedDates[1]);
                    while(curr <= stopDate) {
                        datesArray.push(curr.toISOString().split('T')[0]);
                        curr.setDate(curr.getDate() + 1);
                    }
                } else {
                    datesArray = [dateStr];
                }

                document.getElementById('selected-date-input').value = JSON.stringify(datesArray);
                document.getElementById('car-selection').style.display = 'block';
                // Trigger availability check for the full array
                updateCarDisplay(datesArray);
            }
        });

        if (multiDayToggle) {
            multiDayToggle.addEventListener('change', (e) => {
                fp.set("mode", e.target.checked ? "range" : "single");
                fp.clear();
                document.getElementById('selected-date-input').value = "";
                document.getElementById('car-selection').style.display = 'none';
                document.getElementById('reservation-form-container').style.display = 'none';
            });
        }
    }

    const rentalForm = document.getElementById("rental-form");
    if (rentalForm) {
        rentalForm.onsubmit = (e) => {
            e.preventDefault();

            const name = document.getElementById("name").value;
            const phone = document.getElementById("phone").value;
            const license = document.getElementById("license-input").value;
            const car = document.getElementById('selected-car-input').value;
            const datesJson = document.getElementById('selected-date-input').value;
            const dates = JSON.parse(datesJson || "[]");

            // --- STRICT VALIDATIONS ---
            if (!/^[A-Za-z\s]+$/.test(name)) {
                alert("Please enter a valid name (Alphabets only).");
                return;
            }
            if (!/^\d+$/.test(phone)) {
                alert("Please enter a valid phone number (Digits only).");
                return;
            }
            if (!/^\d{12}$/.test(license)) {
                alert(translations["err_license"] || "Please enter a valid 12-digit license number.");
                return;
            }
            if (dates.length === 0) {
                alert("Please select a rental date.");
                return;
            }

            // --- PREPARE DATA ---
            const rentalData = {
                name: name,
                phone: phone,
                licenseNumber: license,
                facebook: document.getElementById("facebook").value,
                location: document.getElementById("location").value,
                car: car,
                dates: dates, // The Array
                date: dates[0], // Primary date for legacy sorting
                days: dates.length,
                totalPrice: (carPrices[car] || 0) * dates.length
            };

            sessionStorage.setItem("rentalData", JSON.stringify(rentalData));
            window.location.href = "confirmation.html";
        };
    }
}

// --- BOOTSTRAP ---
document.addEventListener("DOMContentLoaded", () => {
    watchFleet();
    watchReservations();
    loadTranslations(currentLang).then(() => {
        loadPartial("site-header", "partials/header.html");
        loadPartial("site-footer", "partials/footer.html");
        initRentalLogic();
    });
});