const carPrices = {
    "Toyota Vellfire": 15000,
    "Toyota Alphard": 12000,
    "Nissan Serena": 13000
};

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

function initNavigationLogic() {
    const menuBtn = document.getElementById("mobile-menu");
    const closeBtn = document.getElementById("close-menu");
    const navContent = document.getElementById("nav-content");
    const langButtons = document.querySelectorAll('.lang-btn');

    const openDrawer = () => {
        navContent.classList.add("active");
        document.body.style.overflow = "hidden";
    };

    const closeDrawer = () => {
        navContent.classList.remove("active");
        document.body.style.overflow = "auto";
    };

    if (menuBtn) menuBtn.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    document.addEventListener('click', (event) => {
        if (navContent.classList.contains('active') && 
            !navContent.contains(event.target) && 
            !menuBtn.contains(event.target)) {
            closeDrawer();
        }
    });

    navContent.querySelectorAll("nav a").forEach(link => 
        link.addEventListener('click', closeDrawer)
    );

    langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            langButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            console.log(`Language: ${btn.getAttribute('data-lang')}`);
        });
    });
}

function highlightActiveLink() {
    const path = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll("nav a").forEach(link => {
        if (link.getAttribute("href") === path) {
            link.classList.add("active");
        }
    });
}

function initRentalLogic() {
    const bookedDates = {
        "Toyota Vellfire": ["2026-01-10", "2026-01-15"],
        "Nissan Serena": ["2026-01-12"],
        "Toyota Alphard": ["2026-01-11"]
    };

    flatpickr("#calendar", {
        inline: true,
        dateFormat: "Y-m-d",
        minDate: "today",
        onChange: function(selectedDates, dateStr) {
            if (!dateStr) return;
            const carSection = document.getElementById("car-selection");
            carSection.style.display = "block";
            
            document.querySelectorAll(".car-selection-box").forEach(box => {
                const isBooked = bookedDates[box.dataset.car]?.includes(dateStr);
                box.classList.toggle("disabled", isBooked);
                box.style.opacity = isBooked ? "0.4" : "1";
                box.style.pointerEvents = isBooked ? "none" : "auto";
            });

            document.getElementById("reservation-form-container").style.display = "none";
            carSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    const carBoxes = document.querySelectorAll(".car-selection-box");
    carBoxes.forEach(box => {
        box.addEventListener("click", () => {
            if (box.classList.contains("disabled")) return;
            carBoxes.forEach(b => b.classList.remove("selected"));
            box.classList.add("selected");
            const formContainer = document.getElementById("reservation-form-container");
            formContainer.style.display = "block";
            formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    const rentalForm = document.getElementById("rental-form");
    if (rentalForm) {
        rentalForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const selectedBox = document.querySelector(".car-selection-box.selected");
            const dateStr = document.querySelector("#calendar")._flatpickr.selectedDates[0]?.toISOString().split("T")[0];

            if (!selectedBox || !dateStr) return alert("Please select a date and car.");

            sessionStorage.setItem("rentalData", JSON.stringify({
                name: document.getElementById("name").value,
                phone: document.getElementById("phone").value,
                car: selectedBox.dataset.car,
                date: dateStr,
                totalPrice: carPrices[selectedBox.dataset.car] || 0
            }));
            window.location.href = "confirmation.html";
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadPartial("site-header", "partials/header.html");
    loadPartial("site-footer", "partials/footer.html");
    if (document.getElementById("calendar")) initRentalLogic();
});