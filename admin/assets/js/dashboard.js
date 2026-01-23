import { db } from "../../../public/assets/js/firebase.js";
import { 
    collection, onSnapshot, query, doc, updateDoc, deleteDoc, addDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const viewModal = document.getElementById("bookingModal");
    const addModal = document.getElementById("addBookingModal");
    const carModal = document.getElementById("carModal");
    const successModal = document.getElementById("successPopup"); 
    
    const closeViewBtn = document.querySelector(".close-btn");
    const closeAddBtn = document.querySelector(".close-add-btn");
    const closeCarBtn = document.querySelector(".close-car-btn");
    const closeSuccessBtn = document.querySelector(".close-success-btn");
    
    const btnOpenAdd = document.getElementById("btnOpenAddModal");
    const btnNavCalendar = document.getElementById("nav-calendar");
    const btnNavFleet = document.getElementById("nav-fleet");

    let currentDocId = null; 

    const switchTab = (tab) => {
        document.getElementById("calendar-section").style.display = tab === 'calendar' ? 'block' : 'none';
        document.getElementById("fleet-section").style.display = tab === 'fleet' ? 'block' : 'none';
        btnNavCalendar.classList.toggle('active', tab === 'calendar');
        btnNavFleet.classList.toggle('active', tab === 'fleet');
    };
    btnNavCalendar.onclick = () => switchTab('calendar');
    btnNavFleet.onclick = () => switchTab('fleet');

    const getCarColor = (carName) => {
        const car = (carName || "").toLowerCase();
        if (car.includes("alphard")) return "#2563eb"; 
        if (car.includes("vellfire")) return "#0f172a"; 
        if (car.includes("serena")) return "#059669";  
        return "#64748b"; 
    };

    if (!calendarEl) return;

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today', 
            center: 'title',
            right: 'dayGridMonth,multiMonthYear,listYear' // Added multiMonthYear
        },
        views: {
            multiMonthYear: {
                buttonText: 'Year' // Label the button as "Year"
            }
        },
        height: '750px',
        dayMaxEvents: true,
        // FIXED: Apply classes for the list view tints
        eventClassNames: function(arg) {
            const status = arg.event.extendedProps.status || 'Pending';
            return [ status === 'Approved' ? 'status-approved-event' : 'status-pending-event' ];
        },
        eventClick: function(info) {
            const data = info.event.extendedProps;
            currentDocId = info.event.id;
            
            document.getElementById("modalCarTitle").innerText = data.carName || "Details";
            document.getElementById("modalID").innerText = data.customBookingID || 'N/A';
            document.getElementById("modalName").innerText = data.customerName || 'N/A';
            document.getElementById("modalPhone").innerText = data.phone || 'N/A';
            document.getElementById("modalLicenseNo").innerText = data.licenseNumber || 'N/A';
            document.getElementById("modalLoc").innerText = data.location || 'N/A';
            
            const dates = data.dates || [data.date];
            document.getElementById("modalDate").innerText = dates.length > 1 
                ? `${dates[0]} to ${dates[dates.length-1]} (${dates.length} Days)` 
                : dates[0];

            const statusEl = document.getElementById("modalStatus");
            const status = data.status || 'Pending';
            statusEl.innerText = status;
            statusEl.className = status === 'Approved' ? "status-badge status-approved" : "status-badge status-pending";
            document.getElementById("btnApprove").style.display = status === 'Approved' ? "none" : "block";
            
            const payImgEl = document.getElementById("modalPaymentImg");
            const licImgEl = document.getElementById("modalLicenseImg");

            if (data.paymentUrl) {
                payImgEl.src = data.paymentUrl;
                payImgEl.style.display = "block";
                document.getElementById("linkFullPayment").style.display = "block";
                document.getElementById("linkFullPayment").href = data.paymentUrl;
            } else {
                payImgEl.style.display = "none";
                document.getElementById("linkFullPayment").style.display = "none";
            }

            if (data.licenseUrl) {
                licImgEl.src = data.licenseUrl;
                licImgEl.style.display = "block";
                document.getElementById("linkFullLicense").style.display = "block";
                document.getElementById("linkFullLicense").href = data.licenseUrl;
            } else {
                licImgEl.style.display = "none";
                document.getElementById("linkFullLicense").style.display = "none";
            }
            
            viewModal.style.display = "block";
        }
    });
    calendar.render();

    // FIXED: Delete Permanent Booking Function
    document.getElementById("btnDelete").onclick = async () => {
        if (!currentDocId) return;
        if (confirm("Are you sure you want to PERMANENTLY delete this booking? This cannot be undone.")) {
            try {
                await deleteDoc(doc(db, "reservations", currentDocId));
                viewModal.style.display = "none";
                currentDocId = null;
            } catch (err) {
                alert("Error deleting: " + err.message);
            }
        }
    };

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

    document.getElementById("btnDeleteCar").onclick = async () => {
        const id = document.getElementById("carIdInput").value;
        if (confirm(`Delete ${id}?`)) {
            await deleteDoc(doc(db, "cars", id));
            carModal.style.display = "none";
        }
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
        await setDoc(doc(db, "cars", id), carData, { merge: true });
        carModal.style.display = "none";
    };

    const manualForm = document.getElementById("manualBookingForm");
    manualForm.onsubmit = async (e) => {
        e.preventDefault();
        const carId = document.getElementById("addCar").value;
        const startDateVal = document.getElementById("addDate").value;
        const endDateVal = document.getElementById("addEndDate").value || startDateVal;

        const datesArray = [];
        let curr = new Date(startDateVal);
        const end = new Date(endDateVal);
        
        while(curr <= end) {
            datesArray.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }

        // Fetch car price from local state or simple lookup to ensure total price is saved
        // (Assuming you might want to track revenue in the dashboard later)
        const manualData = {
            car: carId,
            name: document.getElementById("addName").value,
            dates: datesArray,
            date: datesArray[0],
            days: datesArray.length,
            phone: document.getElementById("addPhone").value,
            licenseNumber: document.getElementById("addLicense").value,
            location: document.getElementById("addLocation").value,
            status: "Approved",
            bookingID: "MAN-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
            paymentScreenshot: "",
            drivingLicenseURL: "",
            createdAt: new Date()
        };

        try {
            await addDoc(collection(db, "reservations"), manualData);
            addModal.style.display = "none";
            
            // Update Success Modal UI
            document.getElementById("successID").innerText = manualData.bookingID;
            document.getElementById("successCust").innerText = manualData.name;
            document.getElementById("successDates").innerText = datesArray.length > 1 
                ? `${datesArray[0].replace(/-/g, '/')} to ${datesArray[datesArray.length-1].replace(/-/g, '/')}` 
                : datesArray[0].replace(/-/g, '/');
                
            successModal.style.display = "block";
            manualForm.reset();
        } catch (err) {
            alert("Manual booking failed: " + err.message);
        }
    };

    btnOpenAdd.onclick = () => addModal.style.display = "block";
    closeViewBtn.onclick = () => viewModal.style.display = "none";
    closeAddBtn.onclick = () => addModal.style.display = "none";
    closeCarBtn.onclick = () => carModal.style.display = "none";
    if(closeSuccessBtn) closeSuccessBtn.onclick = () => successModal.style.display = "none";

    document.getElementById("btnApprove").onclick = async () => {
        await updateDoc(doc(db, "reservations", currentDocId), { status: "Approved" });
        viewModal.style.display = "none";
    };

  onSnapshot(collection(db, "reservations"), (snapshot) => {
        calendar.removeAllEvents();
        
        // Initialize counters
        let manualCount = 0;
        let onlineCount = 0;
        let pendingCount = 0;
        let approvedCount = 0;

        snapshot.forEach((bookingDoc) => {
            const data = bookingDoc.data();
            
            // 1. Calculate Stats
            // Manual bookings start with "MAN-", online ones don't
            if (data.bookingID && data.bookingID.startsWith("MAN-")) {
                manualCount++;
            } else {
                onlineCount++;
            }

            if (data.status === "Approved") {
                approvedCount++;
            } else {
                pendingCount++;
            }

            // 2. Add Calendar Events (Existing logic)
            const dates = data.dates || [data.date];
            let calEnd = dates[dates.length - 1];
            const endObj = new Date(calEnd);
            endObj.setDate(endObj.getDate() + 1);
            calEnd = endObj.toISOString().split('T')[0];

            calendar.addEvent({
                id: bookingDoc.id,
                title: `${data.car} | ${data.name || 'N/A'}`,
                start: dates[0],
                end: calEnd,
                allDay: true,
                backgroundColor: getCarColor(data.car),
                borderColor: getCarColor(data.car),
                extendedProps: { ...data }
            });
        });

        // 3. Update UI Elements
        document.getElementById("stat-manual").innerText = manualCount;
        document.getElementById("stat-online").innerText = onlineCount;
        document.getElementById("stat-pending").innerText = pendingCount;
        document.getElementById("stat-approved").innerText = approvedCount;

        // 4. Toggle Red Tint if pending > 0
        const pendingBox = document.getElementById("stat-pending-box");
        if (pendingCount > 0) {
            pendingBox.classList.add("has-pending");
        } else {
            pendingBox.classList.remove("has-pending");
        }
    });

    onSnapshot(collection(db, "cars"), (snapshot) => {
        const grid = document.getElementById("admin-car-grid");
        const select = document.getElementById("addCar");
        grid.innerHTML = ""; 
        select.innerHTML = '<option value="" disabled selected>Select a vehicle</option>';
        snapshot.forEach((carDoc) => {
            const c = carDoc.data();
            const isMaintenance = c.status === 'maintenance';
            grid.innerHTML += `
                <div class="admin-car-card" style="opacity: ${isMaintenance ? '0.6' : '1'}; border-top: 4px solid ${isMaintenance ? '#ef4444' : getCarColor(carDoc.id)}">
                    <div class="car-card-header">
                        <div class="color-dot" style="background:${isMaintenance ? '#ef4444' : getCarColor(carDoc.id)}"></div>
                        <h4>${carDoc.id}</h4>
                    </div>
                    <p style="color:#3b82f6; font-weight:700;">¥${c.price?.toLocaleString()}</p>
                    <button class="btn-danger-link" onclick='openEditCar("${carDoc.id}", ${JSON.stringify(c)})'>Edit Details</button>
                </div>`;
            if (!isMaintenance) {
                const opt = document.createElement("option");
                opt.value = carDoc.id;
                opt.textContent = carDoc.id;
                select.appendChild(opt);
            }
        });
    });
});