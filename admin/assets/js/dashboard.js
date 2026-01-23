import { db } from "../../../public/assets/js/firebase.js";
import { 
    collection, onSnapshot, query, doc, updateDoc, deleteDoc, addDoc, setDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const viewModal = document.getElementById("bookingModal");
    const addModal = document.getElementById("addBookingModal");
    const carModal = document.getElementById("carModal");
    
    const closeViewBtn = document.querySelector(".close-btn");
    const closeAddBtn = document.querySelector(".close-add-btn");
    const closeCarBtn = document.querySelector(".close-car-btn");
    
    const btnOpenAdd = document.getElementById("btnOpenAddModal");
    const btnNavCalendar = document.getElementById("nav-calendar");
    const btnNavFleet = document.getElementById("nav-fleet");

    let currentDocId = null; 

    // --- TAB SWITCHING LOGIC ---
    const switchTab = (tab) => {
        document.getElementById("calendar-section").style.display = tab === 'calendar' ? 'block' : 'none';
        document.getElementById("fleet-section").style.display = tab === 'fleet' ? 'block' : 'none';
        btnNavCalendar.classList.toggle('active', tab === 'calendar');
        btnNavFleet.classList.toggle('active', tab === 'fleet');
    };
    btnNavCalendar.onclick = () => switchTab('calendar');
    btnNavFleet.onclick = () => switchTab('fleet');

    // --- 🎨 COLOR CODE LOGIC (Do not remove) ---
    const getCarColor = (carName) => {
        const car = (carName || "").toLowerCase();
        if (car.includes("alphard")) return "#2563eb"; // Blue
        if (car.includes("vellfire")) return "#0f172a"; // Dark
        if (car.includes("serena")) return "#059669";  // Green
        return "#64748b"; // Default Gray
    };

    if (!calendarEl) return;

    // Initialize Calendar
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today', 
            center: 'title',
            right: 'dayGridMonth,multiMonthYear,listYear'
        },
        height: '750px',
        dayMaxEvents: true,
        eventClick: function(info) {
            const data = info.event.extendedProps;
            currentDocId = info.event.id;
            document.getElementById("modalCarTitle").innerText = data.carName || "Details";
            document.getElementById("modalID").innerText = data.customBookingID || 'N/A';
            document.getElementById("modalName").innerText = data.customerName || 'N/A';
            document.getElementById("modalDate").innerText = info.event.startStr;
            const statusEl = document.getElementById("modalStatus");
            const status = data.status || 'Pending';
            statusEl.innerText = status;
            statusEl.className = status === 'Approved' ? "status-badge status-approved" : "status-badge status-pending";
            document.getElementById("btnApprove").style.display = status === 'Approved' ? "none" : "block";
            document.getElementById("modalPaymentImg").src = data.paymentUrl || '';
            document.getElementById("modalLicenseImg").src = data.licenseUrl || '';
            viewModal.style.display = "block";
        }
    });
    calendar.render();

    // --- FLEET MANAGEMENT ACTIONS ---
    window.openEditCar = (id, data) => {
        document.getElementById("editCarId").value = id;
        document.getElementById("carIdInput").value = id;
        document.getElementById("carIdInput").disabled = true;
        document.getElementById("carPriceInput").value = data.price || 0;
        document.getElementById("carStatusInput").value = data.status || "active";
        document.getElementById("carClassInput").value = data.class || "Premium";
        document.getElementById("carDescInput").value = data.description || "";
        
        document.getElementById("specSeats").value = data.specs?.seats || "7";
        document.getElementById("specFuel").value = data.specs?.fuel || "Petrol";
        document.getElementById("specTrans").value = data.specs?.trans || "Auto";
        document.getElementById("specEngine").value = data.specs?.engine || "2.5L";
        document.getElementById("specLuggage").value = data.specs?.luggage || "4 Bags";
        
        document.getElementById("btnDeleteCar").style.display = "block";
        carModal.style.display = "block";
    };

    document.getElementById("btnAddNewCar").onclick = () => {
        document.getElementById("carForm").reset();
        document.getElementById("carIdInput").disabled = false;
        document.getElementById("btnDeleteCar").style.display = "none";
        carModal.style.display = "block";
    };

    document.getElementById("carForm").onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById("carIdInput").value;
        const carData = {
            status: document.getElementById("carStatusInput").value,
            price: Number(document.getElementById("carPriceInput").value),
            description: document.getElementById("carDescInput").value,
            class: document.getElementById("carClassInput").value,
            specs: {
                engine: document.getElementById("specEngine").value,
                fuel: document.getElementById("specFuel").value,
                luggage: document.getElementById("specLuggage").value,
                seats: document.getElementById("specSeats").value,
                trans: document.getElementById("specTrans").value
            }
        };
        try {
            await setDoc(doc(db, "cars", id), carData, { merge: true });
            carModal.style.display = "none";
            alert("Vehicle updated successfully!");
        } catch (error) {
            console.error("Update failed:", error);
        }
    };

    // --- MANUAL BOOKING ACTION (WITH MAINTENANCE CHECK) ---
    const manualForm = document.getElementById("manualBookingForm");
    manualForm.onsubmit = async (e) => {
        e.preventDefault();
        const selectedCarId = document.getElementById("addCar").value;

        try {
            // Safety check: Verify current status in DB before allowing booking
            const carRef = doc(db, "cars", selectedCarId);
            const carSnap = await getDoc(carRef);

            if (carSnap.exists() && carSnap.data().status === 'maintenance') {
                alert("⚠️ Cannot book: This vehicle was just moved to maintenance.");
                return;
            }

            const manualData = {
                car: selectedCarId,
                name: document.getElementById("addName").value,
                date: document.getElementById("addDate").value,
                phone: document.getElementById("addPhone").value,
                location: document.getElementById("addLocation").value,
                status: "Approved",
                bookingID: "MAN-" + Math.random().toString(36).substr(2, 7).toUpperCase(),
                paymentScreenshot: "",
                drivingLicenseURL: ""
            };

            await addDoc(collection(db, "reservations"), manualData);
            manualForm.reset();
            addModal.style.display = "none";
        } catch (err) {
            alert("Booking error: " + err.message);
        }
    };

    // --- SHARED MODAL CONTROLS ---
    btnOpenAdd.onclick = () => addModal.style.display = "block";
    closeViewBtn.onclick = () => viewModal.style.display = "none";
    closeAddBtn.onclick = () => addModal.style.display = "none";
    closeCarBtn.onclick = () => carModal.style.display = "none";

    document.getElementById("btnApprove").onclick = async () => {
        await updateDoc(doc(db, "reservations", currentDocId), { status: "Approved" });
        viewModal.style.display = "none";
    };

    document.getElementById("btnDeleteCar").onclick = async () => {
        const id = document.getElementById("carIdInput").value;
        if (!id) return;

        if (confirm(`Are you sure you want to delete ${id}? This cannot be undone.`)) {
            try {
                await deleteDoc(doc(db, "cars", id));
                carModal.style.display = "none";
                alert("Vehicle deleted successfully.");
            } catch (err) {
                alert("Error deleting vehicle: " + err.message);
            }
        }
    };

    // --- REAL-TIME SYNC ---
    onSnapshot(collection(db, "reservations"), (snapshot) => {
        calendar.removeAllEvents();
        snapshot.forEach((bookingDoc) => {
            const data = bookingDoc.data();
            const brandColor = getCarColor(data.car);
            calendar.addEvent({
                id: bookingDoc.id,
                title: `${data.car} - ${data.name || 'N/A'}`,
                start: data.date,
                backgroundColor: brandColor,
                borderColor: brandColor,
                className: data.status === "Approved" ? 'status-approved-event' : 'status-pending-event',
                extendedProps: {
                    carName: data.car, customerName: data.name, status: data.status,
                    paymentUrl: data.paymentScreenshot, licenseUrl: data.drivingLicenseURL, customBookingID: data.bookingID
                }
            });
        });
    });

    onSnapshot(collection(db, "cars"), (snapshot) => {
        const grid = document.getElementById("admin-car-grid");
        const select = document.getElementById("addCar");
        grid.innerHTML = ""; 
        select.innerHTML = '<option value="" disabled selected>Select a vehicle</option>';

        snapshot.forEach((carDoc) => {
            const c = carDoc.data();
            const color = getCarColor(carDoc.id);
            const isMaintenance = c.status === 'maintenance';

            // 1. Build Fleet Grid Card
            grid.innerHTML += `
                <div class="admin-car-card" style="opacity: ${isMaintenance ? '0.6' : '1'}; border-top: 4px solid ${isMaintenance ? '#ef4444' : color}">
                    <div class="car-card-header">
                        <div class="color-dot" style="background:${isMaintenance ? '#ef4444' : color}"></div>
                        <h4>${carDoc.id}</h4>
                        ${isMaintenance ? '<span class="status-badge status-pending" style="font-size:0.6rem; margin-left:auto;">MAINTENANCE</span>' : ''}
                    </div>
                    <p style="color:#3b82f6; font-weight:700;">¥${c.price?.toLocaleString()}</p>
                    <p style="font-size:0.8rem; color:#64748b;">${c.specs?.seats} Seats | ${c.specs?.trans}</p>
                    <button class="btn-danger-link" onclick='openEditCar("${carDoc.id}", ${JSON.stringify(c)})'>Edit Details</button>
                </div>`;

            // 2. Only add to Manual Booking Dropdown if NOT in maintenance
            if (!isMaintenance) {
                const opt = document.createElement("option");
                opt.value = carDoc.id;
                opt.textContent = carDoc.id;
                select.appendChild(opt);
            }
        });
    });
});