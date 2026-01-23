import { db } from "../../../public/assets/js/firebase.js";
import { 
    collection, onSnapshot, doc, deleteDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    const carModal = document.getElementById("carModal");
    const closeCarBtn = document.querySelector(".close-car-btn");
    const btnAddNewCar = document.getElementById("btnAddNewCar");
    const carForm = document.getElementById("carForm");

    const getCarColor = (carName) => {
        const car = (carName || "").toLowerCase();
        if (car.includes("alphard")) return "#2563eb"; 
        if (car.includes("vellfire")) return "#0f172a"; 
        if (car.includes("serena")) return "#059669";  
        return "#64748b"; 
    };

    window.openEditCar = (id, data) => {
        carForm.reset();
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

    if (btnAddNewCar) {
        btnAddNewCar.onclick = () => {
            carForm.reset();
            document.getElementById("carIdInput").disabled = false;
            document.getElementById("btnDeleteCar").style.display = "none";
            carModal.style.display = "block";
        };
    }

    carForm.onsubmit = async (e) => {
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

    document.getElementById("btnDeleteCar").onclick = async () => {
        const id = document.getElementById("carIdInput").value;
        if (confirm(`Are you sure you want to delete ${id}?`)) {
            await deleteDoc(doc(db, "cars", id));
            carModal.style.display = "none";
        }
    };

    onSnapshot(collection(db, "cars"), (snapshot) => {
        const grid = document.getElementById("admin-car-grid");
        const select = document.getElementById("addCar");
        if (!grid) return;
        grid.innerHTML = ""; 
        if (select) select.innerHTML = '<option value="" disabled selected>Select a vehicle</option>';

        snapshot.forEach((carDoc) => {
            const c = carDoc.data();
            const isMaint = c.status === 'maintenance';
            const color = getCarColor(carDoc.id);

            grid.innerHTML += `
                <div class="admin-car-card" style="opacity: ${isMaint ? '0.6' : '1'}; border-top: 4px solid ${isMaint ? '#ef4444' : color}">
                    <div class="car-card-header">
                        <div class="color-dot" style="background:${isMaint ? '#ef4444' : color}"></div>
                        <h4>${carDoc.id}</h4>
                        ${isMaint ? '<span class="status-badge status-pending" style="font-size:0.6rem; margin-left:auto;">MAINTENANCE</span>' : ''}
                    </div>
                    <p style="color:#3b82f6; font-weight:700;">¥${c.price?.toLocaleString()}</p>
                    <p style="font-size:0.8rem; color:#64748b;">${c.specs?.seats || 7} Seats | ${c.specs?.trans || 'Auto'}</p>
                    <button class="btn-danger-link" onclick='openEditCar("${carDoc.id}", ${JSON.stringify(c)})'>Edit Details</button>
                </div>`;

            if (select && !isMaint) {
                const opt = document.createElement("option");
                opt.value = carDoc.id;
                opt.textContent = carDoc.id;
                select.appendChild(opt);
            }
        });
    });

    if (closeCarBtn) closeCarBtn.onclick = () => carModal.style.display = "none";
});