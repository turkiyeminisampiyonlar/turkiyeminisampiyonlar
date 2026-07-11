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
    signInWithPopup(auth, provider).catch(err => {
        console.error(err);
        loginError.innerText = "Giriş penceresi açılırken hata oluştu.";
    });
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
    applicationsList.innerHTML = '<p style="color: #f39c12; font-weight: bold;">Başvurular Havuzdan Çekiliyor...</p>';
    try {
        const querySnapshot = await getDocs(collection(db, "applications"));
        applicationsList.innerHTML = '';
        
        querySnapshot.forEach((documentSnapshot) => {
            const data = documentSnapshot.data();
            if (data.status === "bekliyor") {
                const card = document.createElement('div');
                card.className = 'application-card';
                
                // Güvenli veri okuma (Eksik alan varsa çökmesini önler)
                const p1Name = data.players?.[0]?.name || 'Bilinmiyor';
                const p1Email = data.players?.[0]?.email || '';
                const p1Yt = data.players?.[0]?.yt || '#';
                
                const p2Name = data.players?.[1]?.name || 'Bilinmiyor';
                const p2Email = data.players?.[1]?.email || '';
                const p2Yt = data.players?.[1]?.yt || '#';
                
                const p3Name = data.players?.[2]?.name || 'Bilinmiyor';
                const p3Email = data.players?.[2]?.email || '';
                const p3Yt = data.players?.[2]?.yt || '#';

                card.innerHTML = `
                    <div style="background: rgba(255,255,255,0.02); padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.05);">
                        <img src="${data.logoUrl || ''}" alt="Takım Logosu" style="max-width: 80px; border-radius: 8px; margin-bottom: 10px;">
                        <h3>Takım: ${data.teamName || 'İsimsiz Takım'}</h3>
                        <p style="margin: 5px 0;"><b>Oyuncu 1:</b> ${p1Name} | ${p1Email} | <a href="${p1Yt}" target="_blank" style="color: #f39c12;">Medya</a></p>
                        <p style="margin: 5px 0;"><b>Oyuncu 2:</b> ${p2Name} | ${p2Email} | <a href="${p2Yt}" target="_blank" style="color: #f39c12;">Medya</a></p>
                        <p style="margin: 5px 0;"><b>Oyuncu 3:</b> ${p3Name} | ${p3Email} | <a href="${p3Yt}" target="_blank" style="color: #f39c12;">Medya</a></p>
                        <div class="btn-group" style="margin-top: 15px; display: flex; gap: 10px;">
                            <button class="btn-primary" style="padding: 8px 20px; font-size: 14px; background: #00ff87; color: #0a0b0d; border: none;" onclick="handleAction('${documentSnapshot.id}', 'onayla', '${p1Email}', '${data.teamName || ''}')">Kabul Et</button>
                            <button class="btn-secondary" style="padding: 8px 20px; font-size: 14px; background: #ff0055; color: white; border: none;" onclick="handleAction('${documentSnapshot.id}', 'reddet', '${p1Email}', '${data.teamName || ''}')">Reddet</button>
                        </div>
                    </div>
                `;
                applicationsList.appendChild(card);
            }
        });
        
        if (applicationsList.innerHTML === '') {
            applicationsList.innerHTML = '<p>Bekleyen başvuru yok.</p>';
        }
    } catch (error) {
        console.error("Veri yükleme hatası:", error);
        applicationsList.innerHTML = `
            <p style="color: #ff0055; font-weight: bold; background: rgba(255,0,85,0.1); padding: 15px; border-radius: 8px;">
                Başvurular yüklenemedi!<br>
                Hata Nedeni: ${error.message}<br><br>
                <small style="color: #b5bdcd; font-weight: normal;">Not: Eğer "Missing or insufficient permissions" hatası alıyorsanız, Firebase Console > Firestore Database > Rules kısmından okuma yetkilerini kontrol edin veya admin hesabıyla giriş yaptığınızdan emin olun.</small>
            </p>`;
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
