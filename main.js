import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCa81wdLtxll68b1anajvH0wRTnGKVaLs4",
    authDomain: "turkiyeminisampiyonlar.firebaseapp.com",
    projectId: "turkiyeminisampiyonlar",
    storageBucket: "turkiyeminisampiyonlar.firebasestorage.app",
    messagingSenderId: "671378598785",
    appId: "1:671378598785:web:eb7e09319c17abb7c3d680",
    measurementId: "G-CGN6VN95TN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const IMGBB_API_KEY = "43c8e0a8c3277336886330d1172f988a"; 

// MODAL AÇMA / KAPAMA MANTIĞI
const statusModal = document.getElementById("statusModal");

document.getElementById("closeStatusBtn").addEventListener("click", () => statusModal.style.display = "none");

// Dışarı tıklayınca kapansın
window.addEventListener("click", (e) => {
    if (e.target === statusModal) statusModal.style.display = "none";
});

// Modern Popup Tetikleyici Fonksiyon
function showPopup(title, msg, isSuccess = true) {
    document.getElementById("statusTitle").innerText = title;
    document.getElementById("statusMessage").innerText = msg;
    const iconDiv = document.getElementById("statusIcon");
    
    if(isSuccess) {
        iconDiv.innerHTML = `<span style="font-size: 50px; color: #00ff87;">✓</span>`;
    } else {
        iconDiv.innerHTML = `<span style="font-size: 50px; color: #ff0055;">✕</span>`;
    }
    statusModal.style.display = "flex";
}

// FORM SUBMIT İŞLEMİ
document.getElementById('registrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerText = "Logonuz Espor Sunucularına Yükleniyor...";

    const teamName = document.getElementById('teamName').value;
    const logoFile = document.getElementById('teamLogo').files[0];

    try {
        // ImgBB API ile Fotoğrafı Yükle
        const formData = new FormData();
        formData.append('image', logoFile);
        
        const imgResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        const imgData = await imgResponse.json();
        const logoUrl = imgData.data.url;

        submitBtn.innerText = "Kayıt Blokzincirine Yazılıyor...";

        // Firestore Veritabanına Ekle
        await addDoc(collection(db, "applications"), {
            teamName: teamName,
            logoUrl: logoUrl,
            status: "bekliyor",
            players: [
                { name: document.getElementById('p1Name').value, email: document.getElementById('p1Email').value, yt: document.getElementById('p1YT').value },
                { name: document.getElementById('p2Name').value, email: document.getElementById('p2Email').value, yt: document.getElementById('p2YT').value },
                { name: document.getElementById('p3Name').value, email: document.getElementById('p3Email').value, yt: document.getElementById('p3YT').value }
            ],
            timestamp: new Date()
        });

        // Başarılı Popup Açılması
        showPopup("BAŞVURU ALINDI!", "Takım başvurunuz başarıyla sisteme kaydedildi. Admin onayından sonra kaptana e-posta ile bilgi verilecektir.", true);
        document.getElementById('registrationForm').reset();
    } catch (error) {
        console.error(error);
        showPopup("HATA OLUŞTU!", "Başvuru sırasında teknik bir aksaklık yaşandı. Lütfen bilgileri kontrol edip tekrar deneyin.", false);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Savaşa Katıl";
    }
});
