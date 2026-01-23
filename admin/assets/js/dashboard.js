import { db } from "../../../public/assets/js/firebase.js";
import { 
    collection, onSnapshot, query, doc, updateDoc, deleteDoc, addDoc, setDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    // --- ELEMENT SELECTORS ---
    const calendarEl = document.getElementById('calendar');
    const viewModal = document.getElementById("bookingModal");
    const addModal = document.getElementById("addBookingModal");
    const successModal = document.getElementById("successPopup"); 
    
    const closeViewBtn = document.querySelector(".close-btn");
    const closeAddBtn = document.querySelector(".close-add-btn");
    const closeCarBtn = document.querySelector(".close-car-btn");
    const closeSuccessBtn = document.querySelector(".close-success-btn");
    
    const btnOpenAdd = document.getElementById("btnOpenAddModal");
    const btnNavCalendar = document.getElementById("nav-calendar");
    const btnNavFleet = document.getElementById("nav-fleet");

    let currentDocId = null; 

    // --- TAB SWITCHING ---
    const switchTab = (tab) => {
        document.getElementById("calendar-section").style.display = tab === 'calendar' ? 'block' : 'none';
        document.getElementById("fleet-section").style.display = tab === 'fleet' ? 'block' : 'none';
        btnNavCalendar.classList.toggle('active', tab === 'calendar');
        btnNavFleet.classList.toggle('active', tab === 'fleet');
    };
    btnNavCalendar.onclick = () => switchTab('calendar');
    btnNavFleet.onclick = () => switchTab('fleet');

    // --- HELPER: CAR COLORS ---
    const getCarColor = (carName) => {
        const car = (carName || "").toLowerCase();
        if (car.includes("alphard")) return "#2563eb"; 
        if (car.includes("vellfire")) return "#0f172a"; 
        if (car.includes("serena")) return "#059669";  
        return "#64748b"; 
    };

    if (!calendarEl) return;

    // --- CALENDAR INITIALIZATION ---
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today', 
            center: 'title',
            right: 'dayGridMonth,multiMonthYear,listYear'
        },
        views: {
            multiMonthYear: { buttonText: 'Year' }
        },
        height: '750px',
        dayMaxEvents: true,
        eventClassNames: function(arg) {
            const status = arg.event.extendedProps.status || 'Pending';
            return [ status === 'Approved' ? 'status-approved-event' : 'status-pending-event' ];
        },
        eventClick: function(info) {
            const data = info.event.extendedProps;
            currentDocId = info.event.id;
            
            document.getElementById("modalCarTitle").innerText = data.car || "Details";
            document.getElementById("modalID").innerText = data.bookingID || 'N/A';
            document.getElementById("modalName").innerText = data.name || 'N/A';
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
            
            // Image Logic
            const payImgEl = document.getElementById("modalPaymentImg");
            const licImgEl = document.getElementById("modalLicenseImg");
            const payUrl = data.paymentScreenshot || data.paymentUrl;
            const licUrl = data.drivingLicenseURL || data.licenseUrl;

            payImgEl.src = payUrl || "";
            payImgEl.style.display = payUrl ? "block" : "none";
            document.getElementById("linkFullPayment").style.display = payUrl ? "block" : "none";
            document.getElementById("linkFullPayment").href = payUrl || "#";

            licImgEl.src = licUrl || "";
            licImgEl.style.display = licUrl ? "block" : "none";
            document.getElementById("linkFullLicense").style.display = licUrl ? "block" : "none";
            document.getElementById("linkFullLicense").href = licUrl || "#";
            
            viewModal.style.display = "block";
        }
    });
    calendar.render();

    // --- RESERVATION ACTIONS ---
    document.getElementById("btnDelete").onclick = async () => {
        if (!currentDocId || !confirm("PERMANENTLY delete this booking?")) return;
        await deleteDoc(doc(db, "reservations", currentDocId));
        viewModal.style.display = "none";
    };

    document.getElementById("btnApprove").onclick = async () => {
        await updateDoc(doc(db, "reservations", currentDocId), { status: "Approved" });
        viewModal.style.display = "none";
    };

    // --- MANUAL BOOKING (MULTI-DATE SUPPORT) ---
    const manualForm = document.getElementById("manualBookingForm");
    manualForm.onsubmit = async (e) => {
        e.preventDefault();
        const startDateVal = document.getElementById("addDate").value;
        const endDateVal = document.getElementById("addEndDate")?.value || startDateVal;
        const licenseInput = document.getElementById("addLicense").value;
        const licenseRegex = /^\d{12}$/;
        const datesArray = [];
        let curr = new Date(startDateVal);
        const end = new Date(endDateVal);
        while(curr < end) {
            datesArray.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }

        if (!licenseRegex.test(licenseInput)) {
            alert("Invalid License Number! Please enter exactly 12 digits.");
            document.getElementById("addLicense").focus();
            return; // Stop the function here
        }

        const manualData = {
            car: document.getElementById("addCar").value,
            name: document.getElementById("addName").value,
            dates: datesArray,
            date: datesArray[0],
            days: datesArray.length,
            phone: document.getElementById("addPhone").value,
            licenseNumber: document.getElementById("addLicense").value,
            location: document.getElementById("addLocation").value,
            status: "Approved",
            bookingID: "MAN-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
            createdAt: new Date()
        };

        try {
            await addDoc(collection(db, "reservations"), manualData);
            addModal.style.display = "none";
            if(successModal) {
                document.getElementById("successID").innerText = manualData.bookingID;
                document.getElementById("successCust").innerText = manualData.name;
                document.getElementById("successDates").innerText = datesArray.length > 1 
                    ? `${datesArray[0]} to ${datesArray[datesArray.length-1]}` : datesArray[0];
                successModal.style.display = "block";
            }
            manualForm.reset();
        } catch (err) { alert("Error: " + err.message); }
    };

    // --- SHARED UI CONTROLS ---
    btnOpenAdd.onclick = () => addModal.style.display = "block";
    closeViewBtn.onclick = () => viewModal.style.display = "none";
    closeAddBtn.onclick = () => addModal.style.display = "none";
    closeCarBtn.onclick = () => carModal.style.display = "none";
    if(closeSuccessBtn) closeSuccessBtn.onclick = () => successModal.style.display = "none";

    // --- REAL-TIME SYNC: RESERVATIONS ---
    onSnapshot(collection(db, "reservations"), (snapshot) => {
        calendar.removeAllEvents();
        let stats = { manual: 0, online: 0, pending: 0, approved: 0 };

        snapshot.forEach((bookingDoc) => {
            const data = bookingDoc.data();
            
            // Stats logic
            if (data.bookingID?.startsWith("MAN-")) stats.manual++; else stats.online++;
            if (data.status === "Approved") stats.approved++; else stats.pending++;

            // Calendar Event Logic (Fixed for multi-day display)
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

        // Update Dashboard UI
        if(document.getElementById("stat-manual")) document.getElementById("stat-manual").innerText = stats.manual;
        if(document.getElementById("stat-online")) document.getElementById("stat-online").innerText = stats.online;
        if(document.getElementById("stat-pending")) document.getElementById("stat-pending").innerText = stats.pending;
        if(document.getElementById("stat-approved")) document.getElementById("stat-approved").innerText = stats.approved;

        const pendingBox = document.getElementById("stat-pending-box");
        if (pendingBox) pendingBox.classList.toggle("has-pending", stats.pending > 0);
    });

});