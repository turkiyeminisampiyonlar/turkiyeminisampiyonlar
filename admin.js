import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCa81wdLtxll68b1anajvH0wRTnGKVaLs4",
    authDomain: "turkiyeminisampiyonlar.firebaseapp.com",
    projectId: "turkiyeminisampiyonlar",
    storageBucket: "turkiyeminisampiyonlar.firebasestorage.app",
    messagingSenderId: "671378598785",
    appId: "1:671378598785:web:eb7e09319c17abb7c3d680"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// EmailJS Başlatma
emailjs.init("a7hcviMd81teC1UcX");

const ADMIN_EMAIL = "necron.offical@gmail.com";

const loginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const applicationsList = document.getElementById('applicationsList');
const loginError = document.getElementById('loginError');

loginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(err => console.log(err));
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        if (user.email === ADMIN_EMAIL) {
            loginSection.style.display = 'none';
            dashboardSection.style.display = 'block';
            loadApplications();
        } else {
            loginError.innerText = "Yetkisiz giriş denemesi! Sadece admin girebilir.";
            signOut(auth);
        }
    } else {
        loginSection.style.display = 'block';
        dashboardSection.style.display = 'none';
        applicationsList.innerHTML = '';
    }
});

async function loadApplications() {
    applicationsList.innerHTML = 'Yükleniyor...';
    const querySnapshot = await getDocs(collection(db, "applications"));
    applicationsList.innerHTML = '';
    
    querySnapshot.forEach((documentSnapshot) => {
        const data = documentSnapshot.data();
        if (data.status === "bekliyor") {
            const card = document.createElement('div');
            card.className = 'application-card';
            card.innerHTML = `
                <img src="${data.logoUrl}" alt="Takım Logosu">
                <h3>Takım: ${data.teamName}</h3>
                <p><b>Oyuncu 1:</b> ${data.players[0].name} | ${data.players[0].email} | <a href="${data.players[0].yt}" target="_blank">Medya</a></p>
                <p><b>Oyuncu 2:</b> ${data.players[1].name} | ${data.players[1].email} | <a href="${data.players[1].yt}" target="_blank">Medya</a></p>
                <p><b>Oyuncu 3:</b> ${data.players[2].name} | ${data.players[2].email} | <a href="${data.players[2].yt}" target="_blank">Medya</a></p>
                <div class="btn-group">
                    <button class="btn-approve" onclick="handleAction('${documentSnapshot.id}', 'onayla', '${data.players[0].email}', '${data.teamName}')">Kabul Et</button>
                    <button class="btn-reject" onclick="handleAction('${documentSnapshot.id}', 'reddet', '${data.players[0].email}', '${data.teamName}')">Reddet</button>
                </div>
            `;
            applicationsList.appendChild(card);
        }
    });
    if (applicationsList.innerHTML === '') {
        applicationsList.innerHTML = '<p>Bekleyen başvuru yok.</p>';
    }
}

window.handleAction = async function(docId, action, p1Email, teamName) {
    const isApproved = action === 'onayla';
    const templateId = isApproved ? 'template_01nnh1s' : 'template_cpy48jt';
    const serviceId = 'service_bftdxcy';

    try {
        // E-Posta Gönderimi
        await emailjs.send(serviceId, templateId, {
            to_email: p1Email,
            team_name: teamName
        });

        // Veritabanını Güncelle
        const docRef = doc(db, "applications", docId);
        await updateDoc(docRef, {
            status: isApproved ? "onaylandi" : "reddedildi"
        });

        alert(`İşlem başarılı! E-posta gönderildi.`);
        loadApplications();
    } catch (error) {
        console.error("Hata:", error);
        alert("Bir hata oluştu, e-posta gönderilememiş olabilir.");
    }
};
