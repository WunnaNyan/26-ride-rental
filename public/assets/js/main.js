import { db } from "./firebase.js";
import { collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// --- GLOBAL STATE ---
let carPrices = {}; 
let allCarsData = [];
let bookedDates = {};
let currentLang = localStorage.getItem('preferredLang') || 'en';
let translations = {};

const getDatesInRange = (start, end) => {
    const dates = [];
    let curr = new Date(start);
    const stop = new Date(end);
    // Setting time to noon avoids any "daylight savings" or timezone skipping
    curr.setHours(12, 0, 0, 0);
    stop.setHours(12, 0, 0, 0);

    while (curr <= stop) { // The "<=" is what includes the end date!
        dates.push(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
    }
    return dates;
};

// --- 1. DATABASE WATCHERS ---
function watchFleet() {
    onSnapshot(collection(db, "cars"), (snapshot) => {
        carPrices = {}; 
        allCarsData = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Important: Make sure your Firestore field is exactly "status": "active"
            if (data.status === "active") {
                carPrices[doc.id] = data.price;
                allCarsData.push({ id: doc.id, ...data });
            }
        });

        console.log("Cars Loaded:", allCarsData); // Check your console (F12) for this!

        // Force rendering depending on which page we are on
        if (document.getElementById('dynamic-car-list')) {
            renderFleetPage();
        }
        if (document.querySelector('.index-car-grid')) {
            renderIndexFleet();
        }
    });
}

function watchReservations() {
    onSnapshot(query(collection(db, "reservations")), (snapshot) => {
        // We will store reservations in a flat array for easier range checking
        const activeReservations = []; 
        snapshot.forEach(doc => {
            activeReservations.push(doc.data());
        });

        // Trigger UI update if dates are already picked
        const dateInput = document.getElementById('selected-date-input');
        if (dateInput && dateInput.value) {
            try {
                const selectedDates = JSON.parse(dateInput.value);
                updateCarDisplay(selectedDates, activeReservations); // Pass data directly
            } catch(e) { console.error("Date parse error", e); }
        }
        
        // Save globally for other functions
        window.currentReservations = activeReservations; 
    });
}

// --- 2. RENDERING LOGIC ---
function renderFleetPage() {
    const container = document.getElementById('dynamic-car-list');
    if (!container) return;
    
    if (allCarsData.length === 0) {
        container.innerHTML = "<p>Loading vehicles...</p>";
        return;
    }

    container.innerHTML = allCarsData.map(car => {
        const carIdSafe = car.id.replace(/\s+/g, '');
        const specs = car.specs || {};
        const mainImg = (car.images && car.images.length > 0) ? car.images[0] : 'assets/images/placeholder.jpg';
        
        return `
        <div class="car-card-long" id="${car.id.toLowerCase().replace(/\s+/g, '-')}">
          <div class="car-images-container">
            <div class="main-image-viewport"><img src="${mainImg}" alt="${car.id}" id="main-${carIdSafe}"></div>
            <div class="thumbnail-grid">
                ${(car.images || []).map(imgUrl => `<img src="${imgUrl}" alt="Thumbnail" onclick="changeMainImage('${carIdSafe}', '${imgUrl}')">`).join('')}
            </div>
          </div>
          <div class="car-info-content">
            <div class="car-header"><h3>${car.id}</h3><span class="price-tag">¥${(car.price || 0).toLocaleString()}<span>/day</span></span></div>
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

function updateCarDisplay(datesArray) {
    const container = document.querySelector(".rental-car-grid");
    // Use the global window.currentReservations we set in watchReservations
    const reservations = window.currentReservations || [];
    
    if (!container || !datesArray || datesArray.length === 0) return;

    container.innerHTML = allCarsData.map(car => {
        // COLLISION CHECK: Does ANY requested date exist in ANY existing reservation for this car?
        const isBooked = reservations.some(res => {
            if (res.car !== car.id) return false;
            const resDates = res.dates || [res.date];
            return datesArray.some(d => resDates.includes(d));
        });

        return `
            <div class="car-selection-box ${isBooked ? 'booked' : ''}" data-car="${car.id}">
                <div class="car-img-badge">${car.class || 'Premium'}</div>
                <div class="car-img-container">
                    <img src="${car.images ? car.images[0] : 'assets/images/placeholder.jpg'}" alt="${car.id}">
                    ${isBooked ? '<div class="booked-overlay">ALREADY RESERVED</div>' : ''}
                    <div class="car-overlay">
                        <div class="overlay-stats">
                            <span>${car.specs?.seats || '7'} Seats</span>
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
            const formContainer = document.getElementById('reservation-form-container');
            formContainer.style.display = 'block';
            formContainer.scrollIntoView({ behavior: 'smooth' });
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

// --- 4. RENTAL LOGIC ---
async function initRentalLogic() {
    const calendarEl = document.getElementById("calendar");
    const multiDayToggle = document.getElementById("multi-day-switch");
    const checkBtn = document.getElementById('check-avail-btn');
    const dropdown = document.getElementById('availability-dropdown');
    const pickupDateInput = document.getElementById('pickup-date');

    let fp; // Reference for later use

    if (calendarEl) {
        fp = flatpickr("#calendar", {
            inline: true,
            mode: "single", 
            dateFormat: "Y-m-d",
            minDate: "today",
            onChange: (selectedDates, dateStr, instance) => {
                if (instance.config.mode === "range" && selectedDates.length < 2) return;

                let datesArray = [];
                if (selectedDates.length === 2) {
                    // Use our new inclusive helper
                    datesArray = getDatesInRange(selectedDates[0], selectedDates[1]);
                } else {
                    datesArray = [dateStr];
                }

                console.log("Checking availability for these dates:", datesArray); // Debug check

                document.getElementById('selected-date-input').value = JSON.stringify(datesArray);
                document.getElementById('car-selection').style.display = 'block';
                
                // Pass the newly generated dates to the display updater
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

        // --- URL PARAMETER AUTO-FILL ---
        const urlParams = new URLSearchParams(window.location.search);
        const preDate = urlParams.get('date');
        const preCar = urlParams.get('car');

        if (preDate) {
            fp.setDate(preDate, true); 
            if (preCar) {
                setTimeout(() => {
                    const box = document.querySelector(`.car-selection-box[data-car="${preCar}"]`);
                    if (box) box.click();
                }, 600);
            }
        }
    }

    // --- HOMEPAGE SEARCH LOGIC (REPLACEMENT) ---
    if (checkBtn && pickupDateInput && dropdown) {
        // Explicitly set cursor so you know it's clickable
        checkBtn.style.cursor = "pointer";

        checkBtn.onclick = (e) => {
            e.preventDefault();
            console.log("Button clicked!"); // If you don't see this in F12, the listener didn't attach.

            const selectedDate = pickupDateInput.value;
            if (!selectedDate) { alert("Please select a date."); return; }

            // Use the global reservations from watchReservations
            const reservations = window.currentReservations || [];

            // Filter based on real data
            const availableCars = allCarsData.filter(car => {
                const isBooked = reservations.some(res => {
                    if (res.car !== car.id) return false;
                    const resDates = res.dates || [res.date];
                    return resDates.includes(selectedDate);
                });
                return !isBooked;
            });

            console.log("Available cars found:", availableCars.length);

            if (availableCars.length === 0) {
                dropdown.innerHTML = `<div class="no-availability"><p>No cars available for this date.</p></div>`;
            } else {
                let html = `<h4 style="padding:10px;">Available Vehicles</h4>`;
                availableCars.forEach(car => {
                    html += `
                        <div class="result-item" style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
                            <span>${car.id} <small>¥${(car.price || 0).toLocaleString()}</small></span>
                            <a href="rental.html?car=${encodeURIComponent(car.id)}&date=${selectedDate}" data-i18n="book_now" class="btn-tiny">Book Now</a>
                        </div>`;
                });
                dropdown.innerHTML = html;
            }

            // FORCE CSS via JS to bypass any "overflow" issues
            dropdown.style.maxHeight = "none";
            dropdown.style.opacity = "1";
            dropdown.style.display = "block";
            dropdown.classList.add('show');
        };
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

            if (!/^[A-Za-z\s]+$/.test(name)) return alert("Invalid Name");
            if (!/^\d+$/.test(phone)) return alert("Invalid Phone");
            if (!/^\d{12}$/.test(license)) return alert(translations["err_license"] || "Invalid License");
            if (dates.length === 0) return alert("Select a date");

            const rentalData = {
                name, phone, car, dates,
                licenseNumber: license,
                facebook: document.getElementById("facebook").value,
                location: document.getElementById("location").value,
                date: dates[0],
                days: dates.length,
                totalPrice: (carPrices[car] || 0) * dates.length
            };

            sessionStorage.setItem("rentalData", JSON.stringify(rentalData));
            window.location.href = "confirmation.html";
        };
    }
}


// --- BOOTSTRAP ---
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Start the DB listeners immediately
    watchFleet();
    watchReservations();
    
    // 2. Load Language & Partials
    await loadTranslations(currentLang);
    loadPartial("site-header", "partials/header.html");
    loadPartial("site-footer", "partials/footer.html");

    // 3. Initialize Rental Logic if on rental page
    // This ensures the search bar works on index.html AND the calendar works on rental.html
    initRentalLogic();
});