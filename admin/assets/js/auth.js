import { auth } from "../../../public/assets/js/firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
    const isDashboard = window.location.pathname.includes("dashboard.html");
    const nameEl = document.getElementById("admin-display-name");

    if (user) {
        if (nameEl) nameEl.innerText = `Admin: ${user.email.split('@')[0].toUpperCase()}`;
    } else if (isDashboard) {
        window.location.href = "index.html";
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // 1. Tab Switching Logic
    const navItems = {
        'nav-calendar': 'calendar-section',
        'nav-fleet': 'fleet-section',
        'nav-logs': 'logs-section'
    };

    Object.keys(navItems).forEach(btnId => {
        const btn = document.getElementById(btnId);
        const sectionId = navItems[btnId];

        if (btn) {
            btn.onclick = () => {
                // Hide all sections
                Object.values(navItems).forEach(id => {
                    const section = document.getElementById(id);
                    if (section) section.style.display = 'none';
                });
                // Remove active classes
                Object.keys(navItems).forEach(id => {
                    const navBtn = document.getElementById(id);
                    if (navBtn) navBtn.classList.remove('active');
                });

                // Show target section & Set active
                const targetSection = document.getElementById(sectionId);
                if (targetSection) targetSection.style.display = 'block';
                btn.classList.add('active');
            };
        }
    });

    // 2. Logout Logic
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            if (confirm("Are you sure you want to logout?")) {
                signOut(auth).then(() => {
                    window.location.href = "index.html";
                }).catch(err => console.error("Logout failed", err));
            }
        };
    }
});