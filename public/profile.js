// FILE: public/profile.js
import { auth } from "./Login Page/auth.js"; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
let currentAvatarUrl = "";

// 1. Cek Login & Load Data
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("User detected:", user.uid);
        await loadUserProfile(user);
    } else {
        window.location.href = "index.html";
    }
});

// 2. Fungsi Load Data Profil (VIA API)sadasd
async function loadUserProfile(user) {
    try {
        const token = await user.getIdToken();
        
        // --- PERUBAHAN UTAMA: FETCH KE API ---
        const response = await fetch(`/api/users?id=${user.uid}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}` 
            }
        });

        if (!response.ok) throw new Error("Gagal mengambil data profil");

        const data = await response.json();

        document.getElementById('input-name').value = data.name || "";
        document.getElementById('input-email').value = data.email || "";
        document.getElementById('input-gender').value = data.gender || "";
        document.getElementById('profile-display-name').innerText = data.name || "User";

        if (data.birthdate) {
            if (data.birthdate.includes('/')) {
                const parts = data.birthdate.split('/'); 
                let year = parts[2];
                if(year.length === 2) year = "20" + year; 
                const formattedDate = `${year}-${parts[1]}-${parts[0]}`;
                document.getElementById('input-birthdate').value = formattedDate;
            } else {
                document.getElementById('input-birthdate').value = data.birthdate;
            }
        }

        currentAvatarUrl = data.avatarUrl || "Assets/icon.png";
        document.getElementById('profile-avatar').src = currentAvatarUrl;

    } catch (error) {
        console.error("Error loading profile via API:", error);
    }
}

// 3. Handle Upload Foto (SAMA SAJA, TIDAK PERLU UBAH)
const fileInput = document.getElementById('file-upload');
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        resizeImage(event.target.result, 300, 300, (resizedBase64) => {
            document.getElementById('profile-avatar').src = resizedBase64;
            currentAvatarUrl = resizedBase64;
        });
    };
    reader.readAsDataURL(file);
});

function resizeImage(base64Str, maxWidth, maxHeight, callback) {
    // ... (Kode resize image biarkan saja, ini logika client side murni) ...
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } } 
        else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        callback(resizedDataUrl);
    };
}

// 4. Fungsi Simpan / Update (VIA API)
document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) return;

    document.getElementById('loading-overlay').style.display = 'flex';

    const newName = document.getElementById('input-name').value;
    const newGender = document.getElementById('input-gender').value;
    const rawDate = document.getElementById('input-birthdate').value; 
    
    let formattedBirthdate = "";
    if (rawDate) {
        const d = new Date(rawDate);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2); 
        formattedBirthdate = `${day}/${month}/${year}`;
    }

    try {
        const token = await user.getIdToken();

        // Data yang mau diupdate
        const updateData = {
            name: newName,
            gender: newGender,
            birthdate: formattedBirthdate,
            avatarUrl: currentAvatarUrl 
        };

        const response = await fetch(`/api/users?id=${user.uid}`, {
            method: 'PATCH', 
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) throw new Error("Gagal update profil via API");

        alert("Profile Updated Successfully!");
        document.getElementById('profile-display-name').innerText = newName;

    } catch (error) {
        console.error("Error updating profile:", error);
        alert("Failed to update profile. Image might be too large.");
    } finally {
        document.getElementById('loading-overlay').style.display = 'none';
    }
});