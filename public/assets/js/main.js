import { db } from "./firebase.js";
import { collection, query, getDocs } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const carPrices = {
    "Toyota Vellfire": 15000,
    "Toyota Alphard": 12000,
    "Nissan Serena": 13000
};

// --- HELPER: Load Header/Footer ---
function loadPartial(id, file) {
    const container = document.getElementById(id);
    if (!container) return;

    fetch(file)
        .then(response => response.text())
        .then(data => {
            container.innerHTML = data;
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

    document.addEventListener('click', (e) => {
        if (navContent?.classList.contains('active') && !navContent.contains(e.target) && !menuBtn.contains(e.target)) {
            navContent.classList.remove("active");
            document.body.style.overflow = "auto";
        }
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
    
    // 1. Fetch Bookings from Firestore
    let bookedDates = {};
    try {
        const q = query(collection(db, "reservations"));
        const snap = await getDocs(q);
        snap.forEach(doc => {
            const d = doc.data();
            if (!bookedDates[d.date]) bookedDates[d.date] = [];
            bookedDates[d.date].push(d.car);
        });
    } catch (err) { console.error("Firebase load error:", err); }
    
    // 2. HERO SECTION DROPDOWN LOGIC
    if (checkBtn) {
        checkBtn.addEventListener('click', () => {
            const selectedDate = dateInput.value;
            if (!selectedDate) {
                alert("Please select a date first.");
                return;
            }

            dropdown.innerHTML = '';
            dropdown.classList.add('show');

            const carsBookedOnThisDate = bookedDates[selectedDate] || [];
            const availableCars = Object.keys(carPrices).filter(car => !carsBookedOnThisDate.includes(car));

            if (availableCars.length === 0) {
                dropdown.innerHTML = `
                    <div class="no-availability" style="text-align: center; padding: 20px;">
                        <i class="fas fa-calendar-times" style="color: #ff4757; font-size: 2rem;"></i>
                        <p style="color: #333; font-weight: bold; margin-top: 10px;">No cars available on this day.</p>
                        <span style="color: #777;">Please choose another date.</span>
                    </div>`;
            } else {
                dropdown.innerHTML = `<h4>Available on ${selectedDate}:</h4>`;
                availableCars.forEach(car => {
                    dropdown.innerHTML += `
                        <div class="result-item">
                            <span>${car} <small>(¥${carPrices[car].toLocaleString()})</small></span>
                            <a href="rental.html?car=${encodeURIComponent(car)}&date=${selectedDate}" class="btn-tiny">Book Now</a>
                        </div>`;
                });
            }
            dropdown.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }


    // 3. RENTAL PAGE CALENDAR (Flatpickr)
    if (calendarEl) {
        flatpickr("#calendar", {
            inline: true,
            dateFormat: "Y-m-d",
            minDate: "today",
            onChange: (selectedDates, dateStr) => {
                document.getElementById('selected-date-input').value = dateStr;
                const carSection = document.getElementById('car-selection');
                carSection.style.display = 'block';

                document.querySelectorAll(".car-selection-box").forEach(box => {
                    const carName = box.dataset.car;
                    const isBooked = bookedDates[dateStr]?.includes(carName);
                    box.classList.toggle("disabled", isBooked);
                    box.style.opacity = isBooked ? "0.3" : "1";
                    box.style.pointerEvents = isBooked ? "none" : "auto";
                });
                carSection.scrollIntoView({ behavior: 'smooth' });
            }
        });

        document.querySelectorAll('.car-selection-box').forEach(box => {
            box.addEventListener('click', () => {
                document.querySelectorAll('.car-selection-box').forEach(b => b.classList.remove('selected'));
                box.classList.add('selected');
                document.getElementById('selected-car-input').value = box.dataset.car;
                const formContainer = document.getElementById('reservation-form-container');
                formContainer.style.display = 'block';
                formContainer.scrollIntoView({ behavior: 'smooth' });
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
}

// --- BOOTSTRAP ---
document.addEventListener("DOMContentLoaded", () => {
    loadPartial("site-header", "partials/header.html");
    loadPartial("site-footer", "partials/footer.html");
    initRentalLogic(); 
});