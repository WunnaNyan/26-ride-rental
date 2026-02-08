import { db , auth } from "../../../public/assets/js/firebase.js";
import { 
    collection, onSnapshot, query, doc, updateDoc, deleteDoc, addDoc, setDoc, getDoc, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

let allReservations = [];
let allCarsData = []; // Global at the top

// Make it global so management.js can see it
window.logAdminAction = async (actionMessage, type) => {
    try {
        const user = auth.currentUser;
        const adminName = user ? user.email.split('@')[0] : "Admin";
        
        await addDoc(collection(db, "admin_logs"), {
            adminName: adminName,
            action: actionMessage,
            type: type, // 'create' (green), 'update' (yellow), 'delete' (red)
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Logging failed", error);
    }
};

// Real-time Logs UI Updater
const logsContainer = document.getElementById("logs-container");
if (logsContainer) {
    onSnapshot(query(collection(db, "admin_logs"), orderBy("timestamp", "desc")), (snapshot) => {
        logsContainer.innerHTML = "";
        snapshot.forEach(doc => {
            const log = doc.data();
            const time = log.timestamp?.toDate().toLocaleString('ja-JP', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }) || "Processing...";
            
            const div = document.createElement("div");
            div.className = `log-item log-entry-${log.type}`;
            
            // Clean Output: [2/9/2026, 04:22:30] Admin "nyanwunna43" deleted booking: "JMPWF8"
            div.innerHTML = `
                <span class="log-time">[${time}]</span> 
                <span style="font-weight: 800;">[${log.adminName}]..</span> ${log.action}
            `;
            logsContainer.appendChild(div);
        });
    });
}

// Add this alongside your other onSnapshot listeners
onSnapshot(collection(db, "cars"), (snapshot) => {
    allCarsData = [];
    snapshot.forEach(doc => {
        allCarsData.push({ id: doc.id, ...doc.data() });
    });
    console.log("Admin Fleet Loaded:", allCarsData);
});

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
    const btnNavLogs = document.getElementById("nav-logs");

    let currentDocId = null; 

    // --- TAB SWITCHING ---
    const switchTab = (tab) => {
        // Define all sections
        const sections = {
            calendar: document.getElementById("calendar-section"),
            fleet: document.getElementById("fleet-section"),
            logs: document.getElementById("logs-section")
        };

        // Define all buttons
        const buttons = {
            calendar: btnNavCalendar,
            fleet: btnNavFleet,
            logs: btnNavLogs
        };

        // Loop through and show only the active one
        Object.keys(sections).forEach(key => {
            if (sections[key]) {
                sections[key].style.display = (key === tab) ? 'block' : 'none';
            }
            if (buttons[key]) {
                buttons[key].classList.toggle('active', key === tab);
            }
        });
    };

    // Attach listeners
    if (btnNavCalendar) btnNavCalendar.onclick = () => switchTab('calendar');
    if (btnNavFleet) btnNavFleet.onclick = () => switchTab('fleet');
    if (btnNavLogs) btnNavLogs.onclick = () => switchTab('logs');
    // --- HELPER: CAR COLORS ---
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
        // Get the actual Booking ID from the modal text we set during eventClick
        const bookingID = document.getElementById("modalID").innerText;
        
        if (!currentDocId || !confirm(`PERMANENTLY delete booking ${bookingID}?`)) return;
        
        await deleteDoc(doc(db, "reservations", currentDocId));
        // Log using the readable Booking ID (e.g., JMPWF8)
        await window.logAdminAction(` deleted booking: "${bookingID}"`, "delete");
        viewModal.style.display = "none";
    };

    document.getElementById("btnApprove").onclick = async () => {
        const bookingID = document.getElementById("modalID").innerText;
        
        await updateDoc(doc(db, "reservations", currentDocId), { status: "Approved" });
        // Log using the readable Booking ID
        await window.logAdminAction(`approved booking: "${bookingID}"`, "create");
        viewModal.style.display = "none";
    };
    // --- MANUAL BOOKING (MULTI-DATE SUPPORT) ---
    const getDatesInRange = (start, end) => {
        const dates = [];
        let curr = new Date(start);
        const stop = new Date(end);
        while (curr <= stop) {
            dates.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }
        return dates;
    };

    // --- 2. NEW HELPER: REFRESH AVAILABLE CARS ---
    const updateManualCarDropdown = () => {
        const startVal = document.getElementById("addDate").value;
        const endVal = document.getElementById("addEndDate").value || startVal;
        const carSelect = document.getElementById("addCar");

        if (!startVal) return;
        if (allCarsData.length === 0) {
            console.error("No cars loaded yet!");
            return;
        }

        const requestedDates = getDatesInRange(startVal, endVal);
        carSelect.innerHTML = '<option value="">-- Select Available Vehicle --</option>';

        allCarsData.forEach(car => {
            // Check if car is in Maintenance
            if (car.status !== "active") return;

            // Check for ANY date overlap
            const isOccupied = allReservations.some(res => {
                if (res.car !== car.id) return false;
                const resDates = res.dates || [res.date];
                // Returns true if any requested date is found in the reservation's dates
                return requestedDates.some(d => resDates.includes(d));
            });

            if (!isOccupied) {
                const option = document.createElement("option");
                option.value = car.id;
                option.textContent = car.id;
                carSelect.appendChild(option);
            }
        });
    };
    // --- 3. ATTACH LISTENERS TO DATE INPUTS ---
    document.getElementById("addDate").addEventListener("change", updateManualCarDropdown);
    document.getElementById("addEndDate").addEventListener("change", updateManualCarDropdown);
    const manualForm = document.getElementById("manualBookingForm");
    manualForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const car = document.getElementById("addCar").value;
        const startVal = document.getElementById("addDate").value;
        const endVal = document.getElementById("addEndDate").value || startVal;
        const licenseInput = document.getElementById("addLicense").value;

        if (!car) {
            alert("Please select an available vehicle.");
            return;
        }

        const datesArray = getDatesInRange(startVal, endVal);
        const licenseRegex = /^\d{12}$/;

        if (!licenseRegex.test(licenseInput)) {
            alert("Invalid License Number! Please enter exactly 12 digits.");
            return;
        }
        

        // Final safety check for collision before pushing to DB
        const stillAvailable = !allReservations.some(res => {
            if (res.car !== car) return false;
            const resDates = res.dates || [res.date];
            return datesArray.some(d => resDates.includes(d));
        });

        if (!stillAvailable) {
            alert("Wait! This car was just booked by someone else for these dates.");
            updateManualCarDropdown();
            return;
        }

        const manualData = {
            car: car,
            name: document.getElementById("addName").value,
            dates: datesArray,
            date: datesArray[0],
            days: datesArray.length,
            phone: document.getElementById("addPhone").value,
            licenseNumber: licenseInput,
            location: document.getElementById("addLocation").value,
            status: "Approved",
            bookingID: "MAN-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
            createdAt: new Date()
        };
        

        try {
            await addDoc(collection(db, "reservations"), manualData);
            document.getElementById("addBookingModal").style.display = "none";
            
            if(document.getElementById("successPopup")) {
                document.getElementById("successID").innerText = manualData.bookingID;
                document.getElementById("successCust").innerText = manualData.name;
                document.getElementById("successDates").innerText = datesArray.length > 1 
                    ? `${datesArray[0]} to ${datesArray[datesArray.length-1]}` : datesArray[0];
                document.getElementById("successPopup").style.display = "block";
            }
            manualForm.reset();
        } catch (err) { alert("Error: " + err.message); }
        // Inside manualForm.onsubmit
        await logAdminAction(` created a Manual booking: ${manualData.bookingID}`, "create");
    };

    // --- SHARED UI CONTROLS ---
    btnOpenAdd.onclick = () => addModal.style.display = "block";
    closeViewBtn.onclick = () => viewModal.style.display = "none";
    closeAddBtn.onclick = () => addModal.style.display = "none";
    closeCarBtn.onclick = () => carModal.style.display = "none";
    if(closeSuccessBtn) closeSuccessBtn.onclick = () => successModal.style.display = "none";

    function filterCalendar(category) {
        calendar.removeAllEvents();
        
        allReservations.forEach(data => {
            let show = false;
            if (category === 'all') show = true;
            if (category === 'manual' && data.bookingID?.startsWith("MAN-")) show = true;
            if (category === 'online' && !data.bookingID?.startsWith("MAN-")) show = true;
            if (category === 'pending' && data.status !== "Approved") show = true;
            if (category === 'approved' && data.status === "Approved") show = true;

            if (show) addEventToCalendar(data);
        });
    }

    function addEventToCalendar(data) {
        const dates = data.dates || [data.date];
        let calEnd = dates[dates.length - 1];
        const endObj = new Date(calEnd);
        endObj.setDate(endObj.getDate() + 1); 
        
        calendar.addEvent({
            id: data.id,
            title: `${data.car} | ${data.name || 'N/A'}`,
            start: dates[0],
            end: endObj.toISOString().split('T')[0],
            allDay: true,
            backgroundColor: displayColor,
            borderColor: displayColor,
            extendedProps: { ...data }
        });
    }

    document.querySelectorAll('.stat-box').forEach(box => {
        box.style.cursor = "pointer";
        box.onclick = () => {
            // Remove active class from others
            document.querySelectorAll('.stat-box').forEach(b => b.style.border = "1px solid #e5e7eb");
            box.style.border = "2px solid #2563eb";
            
            const label = box.querySelector('label').innerText.toLowerCase();
            filterCalendar(label);
        };
    });

    // --- REAL-TIME SYNC: RESERVATIONS ---
    // --- REAL-TIME SYNC: RESERVATIONS ---
    onSnapshot(collection(db, "reservations"), (snapshot) => {
        calendar.removeAllEvents();
        allReservations = []; 
        
        let stats = { 
            total: 0,
            upcoming: 0, 
            completed: 0, 
            pending: 0, 
            approved: 0,
            manual: 0,
            online: 0
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        snapshot.forEach((bookingDoc) => {
            const data = bookingDoc.data();
            data.id = bookingDoc.id;
            allReservations.push(data);
            
            // 1. Time-based Stats
            const dates = data.dates || [data.date];
            const lastDate = new Date(dates[dates.length - 1]);
            if (lastDate >= today) stats.upcoming++; else stats.completed++;

            // 2. Status-based Stats
            if (data.status === "Approved") stats.approved++; else stats.pending++;

            // 3. Source-based Stats
            if (data.bookingID?.startsWith("MAN-")) stats.manual++; else stats.online++;
            
            stats.total++;
            addEventToCalendar(data);
        });

        // Update UI Numbers
        if(document.getElementById("stat-total")) document.getElementById("stat-total").innerText = stats.total;
        if(document.getElementById("stat-upcoming")) document.getElementById("stat-upcoming").innerText = stats.upcoming;
        if(document.getElementById("stat-completed")) document.getElementById("stat-completed").innerText = stats.completed;
        if(document.getElementById("stat-pending")) document.getElementById("stat-pending").innerText = stats.pending;
        if(document.getElementById("stat-approved")) document.getElementById("stat-approved").innerText = stats.approved;
        if(document.getElementById("stat-manual")) document.getElementById("stat-manual").innerText = stats.manual;
        if(document.getElementById("stat-online")) document.getElementById("stat-online").innerText = stats.online;

        // Visual cue for pending
        const pendingBox = document.getElementById("stat-pending-box");
        if (pendingBox) {
            stats.pending > 0 ? pendingBox.classList.add("has-pending") : pendingBox.classList.remove("has-pending");
        }
    });

    // --- UPDATED FILTER FUNCTION (Ensures it has access to 'today' and 'calendar') ---
    window.filterCalendar = function(category) {
        calendar.removeAllEvents();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        allReservations.forEach(data => {
            let show = false;
            const dates = data.dates || [data.date];
            const lastDate = new Date(dates[dates.length - 1]);

            // Matches the labels in your HTML
            if (category === 'show all' || category === 'total') show = true;
            if (category === 'upcoming' && lastDate >= today) show = true;
            if (category === 'completed' && lastDate < today) show = true;
            if (category === 'pending' && data.status !== "Approved") show = true;
            if (category === 'approved' && data.status === "Approved") show = true;
            if (category === 'manual' && data.bookingID?.startsWith("MAN-")) show = true;
            if (category === 'online' && !data.bookingID?.startsWith("MAN-")) show = true;

            if (show) addEventToCalendar(data);
        });
    };

    // --- REUSABLE EVENT ADDER ---
    function addEventToCalendar(data) {
        const dates = data.dates || [data.date];
        let calEnd = dates[dates.length - 1];
        const endObj = new Date(calEnd);
        endObj.setDate(endObj.getDate() + 1); 
        const carInfo = allCarsData.find(c => c.id === data.car);
        const displayColor = carInfo?.colorCode || '#64748b'; // Fallback to gray
        calendar.addEvent({
            id: data.id,
            title: `${data.car} | ${data.name || 'N/A'}`,
            start: dates[0],
            end: endObj.toISOString().split('T')[0],
            allDay: true,
            backgroundColor: displayColor,
            borderColor: displayColor,
            extendedProps: { ...data }
        });
    }

    // Attach click listeners to all stat boxes
    document.querySelectorAll('.stat-box').forEach(box => {
        box.addEventListener('click', () => {
            document.querySelectorAll('.stat-box').forEach(b => b.style.border = "1px solid #e5e7eb");
            box.style.border = "2px solid #2563eb";
            
            const label = box.querySelector('label').innerText.toLowerCase();
            window.filterCalendar(label);
        });
    });
}); // End of DOMContentLoaded