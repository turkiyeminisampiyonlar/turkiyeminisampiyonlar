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

// EmailJS Başlatma Protokolü
emailjs.init("a7hcviMd81teC1UcX");

// KESİN YETKİLİ ORGANİZATÖR MAİLİ
const ADMIN_EMAIL = "necron.offical@gmail.com";

const loginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginError = document.getElementById('loginError');
const applicationsList = document.getElementById('applicationsList');
const authStatusIndicator = document.getElementById('authStatusIndicator');
const authStatusText = document.getElementById('authStatusText');

// GOOGLE GİRİŞ YAPILDIĞINDA
loginBtn.addEventListener('click', async () => {
    try {
        loginError.style.display = 'none';
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error(error);
        loginError.innerText = "Giriş işlemi sırasında teknik bir sorun oluştu.";
        loginError.style.display = 'block';
    }
});

// GÜVENLİ ÇIKISH
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// GÜVENLİK FİLTRESİ VE OTURUM KONTROLÜ
onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (user.email === ADMIN_EMAIL) {
            loginSection.style.display = 'none';
            dashboardSection.style.display = 'block';
            logoutBtn.style.display = 'inline-block';
            authStatusIndicator.style.background = '#00ff87';
            authStatusIndicator.style.boxShadow = '0 0 8px #00ff87';
            authStatusText.innerText = "Yönetici";
            
            // Başvuruları Listele
            loadApplications();
        } else {
            loginError.innerText = `Erişim Reddedildi! ${user.email} yetkili bir hesap değil.`;
            loginError.style.display = 'block';
            authStatusIndicator.style.background = '#ff5f56';
            authStatusText.innerText = "Yasaklandı";
            await signOut(auth);
        }
    } else {
        loginSection.style.display = 'block';
        dashboardSection.style.display = 'none';
        logoutBtn.style.display = 'none';
        authStatusIndicator.style.background = '#ff5f56';
        authStatusIndicator.style.boxShadow = '0 0 6px #ff5f56';
        authStatusText.innerText = "Kilitli";
    }
});

// BAŞVURULARI LİSTELEME VE AKORDEON YAPISI
async function loadApplications() {
    applicationsList.innerHTML = '<p style="color: #8e95a5; text-align: center; padding: 20px;">Başvurular güvenli sunucudan alınıyor...</p>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "applications"));
        applicationsList.innerHTML = '';
        
        let count = 0;

        querySnapshot.forEach((documentSnapshot) => {
            const data = documentSnapshot.data();
            const docId = documentSnapshot.id;
            
            if (data.status === 'bekliyor') {
                count++;
                
                const itemContainer = document.createElement('div');
                itemContainer.style.marginBottom = '15px';
                itemContainer.style.background = 'rgba(13, 15, 20, 0.6)';
                itemContainer.style.border = '1px solid #1f242e';
                itemContainer.style.borderRadius = '8px';
                itemContainer.style.overflow = 'hidden';

                const toggleHeader = document.createElement('div');
                toggleHeader.style.padding = '16px 20px';
                toggleHeader.style.cursor = 'pointer';
                toggleHeader.style.display = 'flex';
                toggleHeader.style.justifyContent = 'space-between';
                toggleHeader.style.alignItems = 'center';
                toggleHeader.style.background = '#11141a';
                toggleHeader.style.transition = '0.2s';
                toggleHeader.innerHTML = `
                    <span style="font-weight: 700; color: #fff; font-size: 16px;">🛡️ Takım: ${data.teamName}</span>
                    <span class="arrow-icon" style="color: #8e95a5; font-size: 12px; font-weight: bold;">[ DETAYLARI GÖSTER ▼ ]</span>
                `;

                toggleHeader.addEventListener('mouseenter', () => toggleHeader.style.background = '#171b24');
                toggleHeader.addEventListener('mouseleave', () => toggleHeader.style.background = '#11141a');

                const detailPanel = document.createElement('div');
                detailPanel.style.display = 'none';
                detailPanel.style.padding = '25px';
                detailPanel.style.borderTop = '1px solid rgba(255,255,255,0.03)';
                detailPanel.style.background = 'rgba(11, 12, 16, 0.4)';

                // Kaptan e-postası güvenli veri olarak saklanır
                const captainEmail = data.players && data.players[0] ? data.players[0].email : '';
                const teamNameData = data.teamName;

                detailPanel.innerHTML = `
                    <div style="display: flex; flex-wrap: wrap; gap: 25px; margin-bottom: 25px; align-items: flex-start;">
                        <div style="flex: 1; min-width: 140px; text-align: center;">
                            <p style="font-size: 11px; text-transform: uppercase; color: #8e95a5; font-weight: 600; margin-bottom: 8px;">Takım Logosu</p>
                            <img src="${data.logoUrl}" alt="Logo" style="max-width: 130px; max-height: 130px; border-radius: 10px; border: 2px solid #222835; padding: 5px; background: #000; box-shadow: 0 5px 15px rgba(0,0,0,0.5);">
                        </div>
                        <div style="flex: 3; min-width: 260px;">
                            <p style="font-size: 11px; text-transform: uppercase; color: #8e95a5; font-weight: 600; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;">Kadro ve Katılımcı Bilgileri</p>
                            
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                <div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 6px; border-left: 3px solid #f39c12;">
                                    <strong style="color: #fff; font-size:13px;">Kaptan (P1):</strong> <span style="color:#e2e8f0; font-size:13px;">${data.players[0].name}</span> | 
                                    <span style="color:#a0aec0; font-size:12px;">${data.players[0].email}</span> | 
                                    <a href="${data.players[0].yt}" target="_blank" style="color:#60efff; text-decoration:none; font-size:12px; font-weight:600;">Sosyal Medya ↗</a>
                                </div>
                                <div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 6px; border-left: 3px solid #8e95a5;">
                                    <strong style="color: #fff; font-size:13px;">Oyuncu 2 (P2):</strong> <span style="color:#e2e8f0; font-size:13px;">${data.players[1].name}</span> | 
                                    <span style="color:#a0aec0; font-size:12px;">${data.players[1].email}</span> | 
                                    <a href="${data.players[1].yt}" target="_blank" style="color:#60efff; text-decoration:none; font-size:12px; font-weight:600;">Sosyal Medya ↗</a>
                                </div>
                                <div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 6px; border-left: 3px solid #8e95a5;">
                                    <strong style="color: #fff; font-size:13px;">Oyuncu 3 (P3):</strong> <span style="color:#e2e8f0; font-size:13px;">${data.players[2].name}</span> | 
                                    <span style="color:#a0aec0; font-size:12px;">${data.players[2].email}</span> | 
                                    <a href="${data.players[2].yt}" target="_blank" style="color:#60efff; text-decoration:none; font-size:12px; font-weight:600;">Sosyal Medya ↗</a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="action-buttons-container" style="display: flex; gap: 12px; border-top: 1px solid rgba(255,255,255,0.04); padding-top: 15px;">
                        <button class="btn-approve-action" style="flex: 1; padding: 12px; background: linear-gradient(90deg, #00ff87, #00d27a); color: #0a0b0d; border: none; font-weight: 800; border-radius: 6px; cursor: pointer; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">🟢 Başvuruyu Onayla</button>
                        <button class="btn-reject-action" style="flex: 1; padding: 12px; background: rgba(255, 95, 86, 0.1); color: #ff5f56; border: 1px solid rgba(255, 95, 86, 0.2); font-weight: 800; border-radius: 6px; cursor: pointer; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">🔴 Başvuruyu Reddet</button>
                    </div>
                `;

                // Tıklayınca Akordeon Açma Mantığı
                toggleHeader.addEventListener('click', () => {
                    const isOpen = detailPanel.style.display === 'block';
                    detailPanel.style.display = isOpen ? 'none' : 'block';
                    toggleHeader.querySelector('.arrow-icon').innerText = isOpen ? '[ DETAYLARI GÖSTER ▼ ]' : '[ DETAYLARI GİZLE ▲ ]';
                    toggleHeader.querySelector('.arrow-icon').style.color = isOpen ? '#8e95a5' : '#f39c12';
                });

                // Hata Vermeyi Engelleyen Dinamik Buton Dinleyicileri (JS Event Listeners)
                detailPanel.querySelector('.btn-approve-action').addEventListener('click', () => {
                    executeAdminAction(docId, 'onayla', captainEmail, teamNameData, detailPanel);
                });

                detailPanel.querySelector('.btn-reject-action').addEventListener('click', () => {
                    executeAdminAction(docId, 'reddet', captainEmail, teamNameData, detailPanel);
                });

                itemContainer.appendChild(toggleHeader);
                itemContainer.appendChild(detailPanel);
                applicationsList.appendChild(itemContainer);
            }
        });

        if (count === 0) {
            applicationsList.innerHTML = '<p style="color: #6f7685; text-align: center; padding: 30px; font-size: 14px;">Slots temiz! Bekleyen herhangi bir takım başvurusu bulunmuyor.</p>';
        }
    } catch (error) {
        console.error(error);
        applicationsList.innerHTML = '<p style="color: #ff5f56; text-align: center; padding: 20px;">Veritabanından veri okunurken bir sorun oluştu.</p>';
    }
}

// EMAILJS VE FIRESTORE'U AYNI ANDA TETİKLEYEN ANA AKSİYON FONKSİYONU
async function executeAdminAction(docId, action, p1Email, teamName, detailPanel) {
    const isApproved = action === 'onayla';
    const templateId = isApproved ? 'template_01nnh1s' : 'template_cpy48jt';
    const serviceId = 'service_bftdxcy';

    const actionContainer = detailPanel.querySelector('.action-buttons-container');
    const oldHtmlBackup = actionContainer.innerHTML; // Hata durumunda butonları geri getirmek için yedek
    
    // İşlem başladığında butonu yükleniyor moduna al
    actionContainer.innerHTML = `<p style="color: #f39c12; font-weight: bold; font-size: 13px; text-align: center; width: 100%; padding: 10px 0;">⚙️ İşlem gerçekleştiriliyor, e-posta teslim ediliyor...</p>`;

    try {
        // 1. Adım: EmailJS Protokolü ile Kaptana Mail Gönderimi
        await emailjs.send(serviceId, templateId, {
            to_email: p1Email,
            team_name: teamName
        });

        // 2. Adım: Firebase Firestore Durum Güncellemesi
        const docRef = doc(db, "applications", docId);
        await updateDoc(docRef, {
            status: isApproved ? "onaylandi" : "reddedildi"
        });

        alert(`İşlem Başarılı! Takım ${isApproved ? 'ONAYLANDI' : 'REDDEDİLDİ'} ve ${p1Email} adresine bilgilendirme postası gönderildi.`);
        loadApplications(); // Listeyi yenile ve onaylanan takımı ekrandan kaldır
    } catch (error) {
        console.error("E-posta/Veritabanı Hatası: ", error);
        alert(`Kritik Hata: E-posta gönderilemedi! Lütfen EmailJS kotalarınızı veya şablon (Template) ID ayarlarınızı kontrol edin.`);
        actionContainer.innerHTML = oldHtmlBackup; // Butonları ekrana geri yükle
    }
}
