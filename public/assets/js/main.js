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

        // Trigger UI Renders
        if (document.querySelector('.index-car-grid')) renderIndexFleet();
        if (document.getElementById('dynamic-car-list')) renderFleetPage();
        
        const dateInput = document.getElementById('selected-date-input');
        if (dateInput && dateInput.value) updateCarDisplay(dateInput.value);
    });
}

function watchReservations() {
    onSnapshot(query(collection(db, "reservations")), (snapshot) => {
        bookedDates = {}; 
        snapshot.forEach(doc => {
            const d = doc.data();
            if (!bookedDates[d.date]) bookedDates[d.date] = [];
            bookedDates[d.date].push(d.car);
        });
        const dateInput = document.getElementById('selected-date-input');
        if (dateInput && dateInput.value) updateCarDisplay(dateInput.value);
    });
}

// --- 2. RENDERING LOGIC ---

// NEW: Render the Detailed Fleet Page
function renderFleetPage() {
    const container = document.getElementById('dynamic-car-list');
    if (!container) return;

    container.innerHTML = allCarsData.map(car => {
        const carIdSafe = car.id.replace(/\s+/g, '');
        // Default specs if missing from DB
        const specs = car.specs || {};
        
        return `
        <div class="car-card-long" id="${car.id.toLowerCase().replace(/\s+/g, '-')}">
          <div class="car-images-container">
            <div class="main-image-viewport">
              <img src="${car.images[0]}" alt="${car.id}" id="main-${carIdSafe}">
            </div>
            <div class="thumbnail-grid">
                ${car.images.map(imgUrl => `
                    <img src="${imgUrl}" alt="Thumbnail" onclick="changeMainImage('${carIdSafe}', '${imgUrl}')">
                `).join('')}
            </div>
          </div>

          <div class="car-info-content">
            <div class="car-header">
              <h3>${car.id}</h3>
              <span class="price-tag">¥${car.price.toLocaleString()}<span>/day</span></span>
            </div>
            <p class="car-description">${car.description || ''}</p>
            
            <div class="specs-grid">
              <div class="spec-item"><strong>Seats:</strong> ${specs.seats || '7'}</div>
              <div class="spec-item"><strong>Luggage:</strong> ${specs.luggage || '4 Bags'}</div>
              <div class="spec-item"><strong>Fuel:</strong> ${specs.fuel || 'Petrol'}</div>
              <div class="spec-item"><strong>Engine:</strong> ${specs.engine || '2.5L'}</div>
              <div class="spec-item"><strong>Trans:</strong> ${specs.trans || 'Auto'}</div>
              <div class="spec-item"><strong>Class:</strong> ${car.class || 'Premium'}</div>
            </div>

            <div class="pro-tip">
              <p><strong>Why Rent:</strong> ${car.proTip || 'Perfect for group travel and luxury comfort in Tokyo.'}</p>
            </div>

            <a href="rental.html?car=${encodeURIComponent(car.id)}" class="btn-primary" data-i18n="book_now">Book This Car</a>
          </div>
        </div>
        `;
    }).join('');
    applyTranslations();
}

// Render Featured cars (Home/About)
function renderIndexFleet() {
    const container = document.querySelector('.index-car-grid');
    if (!container) return;
    
    container.innerHTML = allCarsData.map(car => `
        <a href="cars.html#${car.id.toLowerCase().replace(/\s+/g, '-')}" class="car-card">
            <div class="car-card-img">
                <img src="${car.images ? car.images[0] : 'assets/images/placeholder.jpg'}">
                <div class="price-badge">¥${car.price.toLocaleString()} / Day</div>
            </div>
            <div class="car-card-body">
                <h3>${car.id}</h3>
                <p>${car.class || 'Premium'}</p>
                <span class="card-link" data-i18n="view_details">View Details →</span>
            </div>
        </a>
    `).join('');
    applyTranslations();
}

// Render Rental Selection
function updateCarDisplay(dateStr) {
    const container = document.querySelector(".rental-car-grid");
    if (!container || !dateStr) return;

    const carsBooked = bookedDates[dateStr] || [];
    
    container.innerHTML = allCarsData.map(car => {
        const isBooked = carsBooked.includes(car.id);
        return `
            <div class="car-selection-box ${isBooked ? 'booked' : ''}" data-car="${car.id}">
                <div class="car-img-badge">${car.class || 'Premium'}</div>
                <div class="car-img-container">
                    <img src="${car.images ? car.images[0] : 'assets/images/placeholder.jpg'}" alt="${car.id}">
                    <div class="car-overlay">
                        <div class="overlay-stats">
                            <span>${car.specs?.seats || '7'} <span data-i18n="seats">Seats</span></span>
                            <span>¥${car.price.toLocaleString()}/day</span>
                        </div>
                    </div>
                </div>
                <div class="car-selection-info"><h4>${car.id}</h4></div>
            </div>
        `;
    }).join('');

    attachBoxListeners();
    applyTranslations();
}

// --- 3. CORE UTILITIES (Translations, Partials, Nav) ---

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
    document.documentElement.lang = currentLang;
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

async function initRentalLogic() {
    const calendarEl = document.getElementById("calendar");
    const dateInput = document.getElementById('pickup-date');
    const checkBtn = document.getElementById('check-avail-btn');
    const dropdown = document.getElementById('availability-dropdown');

    if (calendarEl) {
        const fp = flatpickr("#calendar", {
            inline: true,
            dateFormat: "Y-m-d",
            minDate: "today",
            onChange: (selectedDates, dateStr) => {
                document.getElementById('selected-date-input').value = dateStr;
                document.getElementById('car-selection').style.display = 'block';
                updateCarDisplay(dateStr);
            }
        });
        calendarEl._flatpickr = fp;
    }

    if (checkBtn) {
        checkBtn.onclick = () => {
            const selectedDate = dateInput.value;
            if (!selectedDate) return alert("Please select a date.");
            dropdown.innerHTML = '';
            dropdown.classList.add('show');
            const carsBooked = bookedDates[selectedDate] || [];
            const availableCars = allCarsData.filter(car => !carsBooked.includes(car.id));

            if (availableCars.length === 0) {
                dropdown.innerHTML = `<p>No cars available.</p>`;
            } else {
                availableCars.forEach(car => {
                    dropdown.innerHTML += `
                        <div class="result-item">
                            <span>${car.id} (¥${car.price.toLocaleString()})</span>
                            <a href="rental.html?date=${selectedDate}" class="btn-tiny">Book Now</a>
                        </div>`;
                });
            }
        };
    }

    const rentalForm = document.getElementById("rental-form");
    if (rentalForm) {
        rentalForm.onsubmit = (e) => {
            e.preventDefault();
            const car = document.getElementById('selected-car-input').value;
            const date = document.getElementById('selected-date-input').value;
            const rentalData = {
                name: document.getElementById("name").value,
                phone: document.getElementById("phone").value,
                facebook: document.getElementById("facebook").value,
                location: document.getElementById("location").value,
                car, date,
                totalPrice: carPrices[car] || 0
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