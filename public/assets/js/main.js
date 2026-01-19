import { db } from "./firebase.js";
import { collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const carPrices = {
    "Toyota Vellfire": 15000,
    "Toyota Alphard": 12000,
    "Nissan Serena": 13000
};

// --- i18n LOGIC ---
let currentLang = localStorage.getItem('preferredLang') || 'en';
let translations = {};

async function loadTranslations(lang) {
    try {
        const response = await fetch(`./i18n/${lang}.json`);
        translations = await response.json();
        currentLang = lang;
        localStorage.setItem('preferredLang', lang);
        applyTranslations();
    } catch (err) {
        console.error("Language load error:", err);
    }
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            if (el.placeholder) {
                el.placeholder = translations[key];
            } else if (el.tagName === 'OPTION' && el.value === "") {
                el.textContent = translations[key];
            } else {
                el.textContent = translations[key];
            }
        }
    });
    document.documentElement.lang = currentLang;
}

// --- HELPER: Load Header/Footer ---
function loadPartial(id, file) {
    const container = document.getElementById(id);
    if (!container) return;

    fetch(file)
        .then(response => response.text())
        .then(data => {
            container.innerHTML = data;
            applyTranslations(); // Apply translations to new content
            if (id === 'site-header') {
                initNavigationLogic();
                highlightActiveLink();
            }
        })
        .catch(error => console.error(`Error loading ${file}:`, error));
}

// --- NAV LOGIC ---
function initNavigationLogic() {
    const menuBtn = document.getElementById("mobile-menu");
    const closeBtn = document.getElementById("close-menu");
    const navContent = document.getElementById("nav-content");

    if (menuBtn && navContent) {
        menuBtn.onclick = () => {
            navContent.classList.add("active");
            document.body.style.overflow = "hidden";
        };
    }

    if (closeBtn) {
        closeBtn.onclick = () => {
            navContent.classList.remove("active");
            document.body.style.overflow = "auto";
        };
    }

    // Language Toggle logic
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if(btn.dataset.lang === currentLang) btn.classList.add('active');
        btn.addEventListener('click', () => {
            document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadTranslations(btn.dataset.lang);
        });
    });
}

function highlightActiveLink() {
    const path = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll("nav a").forEach(link => {
        if (link.getAttribute("href") === path) link.classList.add("active");
    });
}

// --- RENTAL & AVAILABILITY LOGIC ---
async function initRentalLogic() {
    const calendarEl = document.getElementById("calendar");
    const checkBtn = document.getElementById('check-avail-btn');
    const dropdown = document.getElementById('availability-dropdown');
    const dateInput = document.getElementById('pickup-date');
    
    let bookedDates = {};

    const q = query(collection(db, "reservations"));
    onSnapshot(q, (snapshot) => {
        bookedDates = {}; 
        snapshot.forEach(doc => {
            const d = doc.data();
            if (!bookedDates[d.date]) bookedDates[d.date] = [];
            bookedDates[d.date].push(d.car);
        });
        
        if (calendarEl && calendarEl._flatpickr) {
            updateCarDisplay(calendarEl._flatpickr.currentSelectedDateStr, bookedDates);
        }
    });

    function updateCarDisplay(dateStr, bookings) {
        if (!dateStr) return;
        const carsBooked = bookings[dateStr] || [];
        
        document.querySelectorAll(".car-selection-box").forEach(box => {
            const carName = box.dataset.car;
            const isBooked = carsBooked.includes(carName);
            
            if (isBooked) {
                box.classList.add("booked");
                box.classList.remove("selected");
            } else {
                box.classList.remove("booked");
            }
        });
    }
    
    if (checkBtn) {
        checkBtn.addEventListener('click', () => {
            const selectedDate = dateInput.value;
            if (!selectedDate) return alert("Please select a date first.");

            dropdown.innerHTML = '';
            dropdown.classList.add('show');

            const carsBooked = bookedDates[selectedDate] || [];
            const availableCars = Object.keys(carPrices).filter(car => !carsBooked.includes(car));

            if (availableCars.length === 0) {
                dropdown.innerHTML = `<div class="no-availability"><p>No cars available on this day.</p></div>`;
            } else {
                dropdown.innerHTML = `<h4>Available on ${selectedDate}:</h4>`;
                availableCars.forEach(car => {
                    dropdown.innerHTML += `
                        <div class="result-item">
                            <span>${car} (¥${carPrices[car].toLocaleString()})</span>
                            <a href="rental.html?car=${encodeURIComponent(car)}&date=${selectedDate}" class="btn-tiny" data-i18n="book_now">${translations['book_now'] || 'Book Now'}</a>
                        </div>`;
                });
            }
        });
    }

    if (calendarEl) {
        const fp = flatpickr("#calendar", {
            inline: true,
            dateFormat: "Y-m-d",
            minDate: "today",
            onChange: (selectedDates, dateStr) => {
                document.getElementById('selected-date-input').value = dateStr;
                document.getElementById('car-selection').style.display = 'block';
                updateCarDisplay(dateStr, bookedDates);
                document.getElementById('car-selection').scrollIntoView({ behavior: 'smooth' });
            }
        });
        calendarEl._flatpickr = fp;

        const urlParams = new URLSearchParams(window.location.search);
        const urlDate = urlParams.get('date');
        if (urlDate) {
            fp.setDate(urlDate, true); 
        }
    }

    document.querySelectorAll('.car-selection-box').forEach(box => {
        box.addEventListener('click', () => {
            if (box.classList.contains('booked')) return;
            document.querySelectorAll('.car-selection-box').forEach(b => b.classList.remove('selected'));
            box.classList.add('selected');
            document.getElementById('selected-car-input').value = box.dataset.car;
            document.getElementById('reservation-form-container').style.display = 'block';
            document.getElementById('reservation-form-container').scrollIntoView({ behavior: 'smooth' });
        });
    });

    const rentalForm = document.getElementById("rental-form");
    if (rentalForm) {
        rentalForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const car = document.getElementById('selected-car-input').value;
            const date = document.getElementById('selected-date-input').value;
            if (!car || !date) return alert("Please select car and date");

            const rentalData = {
                name: document.getElementById("name").value,
                phone: document.getElementById("phone").value,
                facebook: document.getElementById("facebook").value,
                location: document.getElementById("location").value,
                car: car,
                date: date,
                totalPrice: carPrices[car] || 0
            };
            sessionStorage.setItem("rentalData", JSON.stringify(rentalData));
            window.location.href = "confirmation.html";
        });
    }
}

// --- BOOTSTRAP ---
document.addEventListener("DOMContentLoaded", () => {
    loadTranslations(currentLang).then(() => {
        loadPartial("site-header", "partials/header.html");
        loadPartial("site-footer", "partials/footer.html");
        initRentalLogic(); 
    });
});