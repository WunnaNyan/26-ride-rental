import { db } from "../../../public/assets/js/firebase.js";
import { 
    collection, onSnapshot, doc, deleteDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// --- 1. CONSTANTS & STATE ---
const CAR_PALETTE = ['#2563eb', '#0f172a', '#059669', '#7c3aed', '#db2777', '#ca8a04', '#0891b2', '#ea580c', '#475569', '#16a34a', '#4f46e5', '#be185d'];
let allCarsData = []; 

// --- 2. CORE UTILITIES ---
const getUnusedColor = () => {
    const usedColors = allCarsData.map(car => car.colorCode).filter(Boolean);
    const available = CAR_PALETTE.filter(c => !usedColors.includes(c));
    return available.length > 0 ? available[0] : CAR_PALETTE[Math.floor(Math.random() * CAR_PALETTE.length)];
};

const createImageRow = (container, value = "") => {
    const div = document.createElement('div');
    div.style = "display: flex; gap: 5px; margin-bottom: 8px;";
    div.innerHTML = `
        <input type="text" class="car-image-path admin-input" value="${value}" placeholder="filename.jpg">
        <button type="button" class="remove-img" style="color:#ef4444; width:40px; border:none; background:none; font-weight:bold; cursor:pointer;">✕</button>
    `;
    container.appendChild(div);
    div.querySelector('.remove-img').onclick = () => div.remove();
};

// --- 3. DATA SYNC & UI RENDERING ---
onSnapshot(collection(db, "cars"), (snapshot) => {
    allCarsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const grid = document.getElementById("admin-car-grid");
    if (!grid) return;
    grid.innerHTML = "";
    
    allCarsData.forEach(car => {
        const isMaint = car.status === 'maintenance';
        const color = isMaint ? '#f87171' : (car.colorCode || '#2563eb');
        
        // This template matches your requested screenshot UI
        grid.innerHTML += `
            <div class="admin-car-card" style="border-top: 5px solid ${color}; background: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); position: relative; display: flex; flex-direction: column; min-height: 200px;">
                <h3 style="margin: 0 0 15px 0; font-size: 1.25rem; color: #111827; font-weight: 700;">${car.id}</h3>
                
                ${isMaint ? `
                    <div style="background: #fee2e2; color: #b91c1c; font-size: 0.7rem; font-weight: 800; padding: 4px 12px; border-radius: 99px; width: fit-content; margin-bottom: 15px; letter-spacing: 0.05em;">
                        MAINTENANCE
                    </div>
                ` : ''}

                <div style="margin-top: auto;">
                    <p style="color: #3b82f6; font-size: 1.2rem; font-weight: 800; margin: 0 0 8px 0;">¥${car.price?.toLocaleString()}</p>
                    <p style="color: #64748b; font-size: 0.9rem; margin: 0 0 20px 0;">${car.specs?.seats || 7} Seats | ${car.specs?.trans || 'Automatic'}</p>
                    
                    <button class="edit-details-btn" 
                        style="color: #ef4444; background: none; border: none; font-weight: 600; text-decoration: underline; cursor: pointer; align-self: flex-end; width: 100%; text-align: right;"
                        onclick='openEditCar("${car.id}", ${JSON.stringify(car)})'>
                        Edit Details
                    </button>
                </div>
            </div>`;
    });
});

// --- 4. MODAL LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const carModal = document.getElementById("carModal");
    const carForm = document.getElementById("carForm");
    const imgContainer = document.getElementById('imageInputsContainer');

    const setupImageSection = (images = []) => {
        imgContainer.innerHTML = `
            <div style="display: flex; gap: 5px; margin-bottom: 8px;">
                <input type="text" class="car-image-path admin-input" placeholder="filename.jpg">
                <button type="button" id="btnAddImageField" class="btn-primary" style="width: 40px;">+</button>
            </div>`;
        document.getElementById('btnAddImageField').onclick = () => createImageRow(imgContainer);
        
        if (images.length > 0) {
            imgContainer.querySelector('.car-image-path').value = images[0].replace('assets/images/', '');
            images.slice(1).forEach(img => createImageRow(imgContainer, img.replace('assets/images/', '')));
        }
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
        
        setupImageSection(data.images || []);
        document.getElementById("btnDeleteCar").style.display = "block";
        carModal.style.display = "block";
    };

    document.getElementById("btnAddNewCar").onclick = () => {
        carForm.reset();
        document.getElementById("carIdInput").disabled = false;
        document.getElementById("btnDeleteCar").style.display = "none";
        setupImageSection([]);
        carModal.style.display = "block";
    };

    carForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById("carIdInput").value;
        const status = document.getElementById("carStatusInput").value;
        const existing = allCarsData.find(c => c.id === id);
        
        const images = Array.from(document.querySelectorAll(".car-image-path"))
            .map(i => i.value.trim()).filter(v => v)
            .map(v => v.startsWith('assets/images/') ? v : `assets/images/${v}`);

        const carData = {
            price: Number(document.getElementById("carPriceInput").value),
            status: status,
            description: document.getElementById("carDescInput").value,
            class: document.getElementById("carClassInput").value,
            specs: {
                engine: document.getElementById("specEngine").value,
                fuel: document.getElementById("specFuel").value,
                luggage: document.getElementById("specLuggage").value,
                seats: document.getElementById("specSeats").value,
                trans: document.getElementById("specTrans").value
            },
            images: images,
            colorCode: existing?.colorCode || getUnusedColor()
        };

        await setDoc(doc(db, "cars", id), carData, { merge: true });
        carModal.style.display = "none";
    };

    document.getElementById("btnDeleteCar").onclick = async () => {
        const id = document.getElementById("carIdInput").value;
        if (confirm(`Permanently remove ${id}?`)) {
            await deleteDoc(doc(db, "cars", id));
            carModal.style.display = "none";
        }
    };

    document.querySelector(".close-car-btn").onclick = () => carModal.style.display = "none";
});