import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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

emailjs.init("a7hcviMd81teC1UcX");
const IMGBB_API_KEY = "43c8e0a8c3277336886330d1172f988a";

// KÖK KURUCU ADMİN (Veritabanı boş olsa bile giriş yapabilir)
const ROOT_ADMIN = "necron.offical@gmail.com";

// DOM Obje Bağlantıları
const loader = document.getElementById('tms-loader');
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginError = document.getElementById('loginError');
const authStatusIndicator = document.getElementById('authStatusIndicator');
const authStatusText = document.getElementById('authStatusText');

// Sekme DOM Elementleri
const tabAppsBtn = document.getElementById('tabApplicationsBtn');
const tabCreateTBtn = document.getElementById('tabCreateTournamentBtn');
const tabAdminsBtn = document.getElementById('tabManageAdminsBtn');
const viewApps = document.getElementById('tabApplicationsView');
const viewCreateT = document.getElementById('tabCreateTournamentView');
const viewAdmins = document.getElementById('tabManageAdminsView');

let tournamentsDataList = [];

// GOOGLE AUTHENTICATION GİRİŞ TETİKLEYİCİSİ
loginBtn.addEventListener('click', async () => {
    try {
        loginError.style.display = 'none';
        await signInWithPopup(auth, provider);
    } catch (e) {
        loginError.innerText = "Bağlantı penceresi açılamadı.";
        loginError.style.display = 'block';
    }
});

logoutBtn.addEventListener('click', () => signOut(auth));

// MULTI-ADMIN DOĞRULAMA FİLTRESİ
onAuthStateChanged(auth, async (user) => {
    if (user) {
        let isAdmin = (user.email === ROOT_ADMIN);
        
        if (!isAdmin) {
            // Firestore 'admins' tablosunda var mı taraması yap
            try {
                const querySnap = await getDocs(collection(db, "admins"));
                querySnap.forEach(d => {
                    if (d.data().email === user.email) isAdmin = true;
                });
            } catch (err) { console.error("Admin yetki sorgu hatası:", err); }
        }

        if (isAdmin) {
            loginSection.style.display = 'none';
            dashboardSection.style.display = 'block';
            logoutBtn.style.display = 'inline-block';
            authStatusIndicator.style.background = '#00ff87';
            authStatusIndicator.style.boxShadow = '0 0 8px #00ff87';
            authStatusText.innerText = "Yönetici Yetkili";
            
            await initDashboardProcedures();
        } else {
            loginError.innerText = `Erişim Reddedildi! ${user.email} yetkilendirilmiş admin listesinde bulunmuyor.`;
            loginError.style.display = 'block';
            authStatusIndicator.style.background = '#ff5f56';
            authStatusText.innerText = "Kilitli/Yasaklı";
            await signOut(auth);
        }
    } else {
        loginSection.style.display = 'block';
        dashboardSection.style.display = 'none';
        logoutBtn.style.display = 'none';
        authStatusIndicator.style.background = '#ff5f56';
        authStatusIndicator.style.boxShadow = '0 0 6px #ff5f56';
        authStatusText.innerText = "Giriş Gerekli";
    }
    
    // Loader Gizleme
    setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 300);
    }, 500);
});

// TAB PANEL ANAHTARLAMA SİSTEMİ
function switchTab(activeBtn, activeView) {
    [tabAppsBtn, tabCreateTBtn, tabAdminsBtn].forEach(b => b.classList.remove('active'));
    [viewApps, viewCreateT, viewAdmins].forEach(v => v.style.display = 'none');
    activeBtn.classList.add('active');
    activeView.style.display = 'block';
}
tabAppsBtn.addEventListener('click', () => switchTab(tabAppsBtn, viewApps));
tabCreateTBtn.addEventListener('click', () => switchTab(tabCreateTBtn, viewCreateT));
tabAdminsBtn.addEventListener('click', () => switchTab(tabAdminsBtn, viewAdmins));

// DASHBOARD ÇALIŞTIRMA PROSEDÜRLERİ
async function initDashboardProcedures() {
    await loadFilterTournaments();
    loadApplicationsList();
    loadAdminsList();
}

// TURNUVA FİLTRE LİSTESİ OLUŞTURMA
async function loadFilterTournaments() {
    const selector = document.getElementById('filterTournamentSelect');
    selector.innerHTML = '<option value="all">Tüm Turnuvaların Başvuruları</option>';
    
    tournamentsDataList = [];
    const querySnap = await getDocs(collection(db, "tournaments"));
    querySnap.forEach(d => {
        tournamentsDataList.push({ id: d.id, ...d.data() });
        selector.innerHTML += `<option value="${d.id}">${d.data().name}</option>`;
    });

    selector.removeEventListener('change', loadApplicationsList);
    selector.addEventListener('change', loadApplicationsList);
}

// 1X1 KARE RESİM BOYUT DOĞRULAYICI
function validateSquareImage(file) {
    return new Promise(r => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => r(img.width === img.height);
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// YENİ TURNUVA OLUŞTURMA FORM GÖNDERİMİ
document.getElementById('createTournamentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('createTBtn');
    const name = document.getElementById('newTName').value.trim();
    const deadline = document.getElementById('newTDeadline').value;
    const rules = document.getElementById('newTRules').value.trim();
    const logoFile = document.getElementById('newTLogo').files[0];

    btn.disabled = true;
    btn.innerText = "Boyut Kontrolü Yapılıyor...";

    if (logoFile) {
        const isSquare = await validateSquareImage(logoFile);
        if (!isSquare) {
            alert("Uyarılardan Kaçamazsınız! Yüklemeye çalıştığınız turnuva logosu 1x1 (kare) formatında değil.");
            btn.disabled = false; btn.innerText = "Turnuvayı Akışta Canlıya Al";
            return;
        }
    }

    try {
        btn.innerText = "Görsel Dağıtıcıya Yükleniyor...";
        const fd = new FormData(); fd.append("image", logoFile);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
        const data = await res.json();

        await addDoc(collection(db, "tournaments"), {
            name: name, deadline: deadline, rules: rules, logoUrl: data.data.url, createdAt: new Date()
        });

        alert("Başarılı! Yeni turnuva oluşturuldu ve ana sayfada listelendi.");
        document.getElementById('createTournamentForm').reset();
        await initDashboardProcedures();
        tabAppsBtn.click();
    } catch (err) {
        alert("Turnuva kaydı sırasında sunucu hatası.");
    } finally {
        btn.disabled = false; btn.innerText = "Turnuvayı Akışta Canlıya Al";
    }
});

// BAŞVURULARI LİSTELEME PROSEDÜRÜ (AKORDEON DÜZENİ)
async function loadApplicationsList() {
    const listArea = document.getElementById('applicationsList');
    const selectedFilter = document.getElementById('filterTournamentSelect').value;
    listArea.innerHTML = '<p style="color:#8e95a5; text-align:center; padding:15px;">Kayıtlar taranıyor...</p>';

    try {
        const querySnap = await getDocs(collection(db, "applications"));
        listArea.innerHTML = '';
        let matchedCount = 0;

        querySnap.forEach(dSnapshot => {
            const data = dSnapshot.data();
            if (data.status !== 'bekliyor') return;
            if (selectedFilter !== 'all' && data.tournamentId !== selectedFilter) return;

            matchedCount++;
            const tInfo = tournamentsDataList.find(x => x.id === data.tournamentId) || { name: 'Bilinmeyen Turnuva' };

            const container = document.createElement('div');
            container.className = 'accordion-item';
            container.innerHTML = `
                <div class="accordion-header">
                    <span style="font-weight:700; color:#fff;">🛡️ [${tInfo.name}] Takım: ${data.teamName}</span>
                    <span class="arrow-icon" style="color:#8e95a5; font-size:12px; font-weight:bold;">[ DETAYI GÖSTER ▼ ]</span>
                </div>
                <div class="accordion-content">
                    <div style="display:flex; flex-wrap:wrap; gap:20px; margin-bottom:20px; text-align:left;">
                        <img src="${data.logoUrl}" style="width:100px; height:100px; border-radius:8px; border:2px solid #222; background:#000;">
                        <div style="flex:1; min-width:250px;">
                            <p style="font-size:11px; color:#8e95a5; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05);">KADRO DETAYLARI</p>
                            <div style="font-size:13px; line-height:1.6;">
                                🟢 <strong>Kaptan:</strong> ${data.players[0].name} | ${data.players[0].email} | <a href="${data.players[0].yt}" target="_blank" style="color:#60efff;">Sosyal Medya ↗</a><br>
                                ⚪ <strong>Oyuncu 2:</strong> ${data.players[1].name} | ${data.players[1].email} | <a href="${data.players[1].yt}" target="_blank" style="color:#60efff;">Sosyal Medya ↗</a><br>
                                ⚪ <strong>Oyuncu 3:</strong> ${data.players[2].name} | ${data.players[2].email} | <a href="${data.players[2].yt}" target="_blank" style="color:#60efff;">Sosyal Medya ↗</a>
                            </div>
                        </div>
                    </div>
                    <div class="action-buttons-container" style="display:flex; gap:10px;">
                        <button class="btn-approve-action" style="flex:1; padding:10px; background:#00ff87; color:#000; border:none;">🟢 ONYALA</button>
                        <button class="btn-reject-action" style="flex:1; padding:10px; background:rgba(255,95,86,0.1); color:#ff5f56; border:1px solid #ff5f56;">🔴 REDDET</button>
                    </div>
                </div>
            `;

            const header = container.querySelector('.accordion-header');
            const content = container.querySelector('.accordion-content');
            header.addEventListener('click', () => {
                const open = content.style.display === 'block';
                content.style.display = open ? 'none' : 'block';
                header.querySelector('.arrow-icon').innerText = open ? '[ DETAYI GÖSTER ▼ ]' : '[ DETAYI GİZLE ▲ ]';
            });

            container.querySelector('.btn-approve-action').addEventListener('click', () => executeAction(dSnapshot.id, 'onayla', data.players[0].email, data.teamName, content));
            container.querySelector('.btn-reject-action').addEventListener('click', () => executeAction(dSnapshot.id, 'reddet', data.players[0].email, data.teamName, content));

            listArea.appendChild(container);
        });

        if (matchedCount === 0) listArea.innerHTML = '<p style="color:#6f7685; text-align:center; padding:20px; font-size:13px;">Bekleyen takım başvurusu bulunmuyor.</p>';
    } catch (e) { console.error(e); }
}

// EMAILJS VE FIRESTORE AKSİYON ÇALIŞTIRICISI
async function executeAction(docId, action, captainEmail, teamName, contentArea) {
    const isApp = action === 'onayla';
    const btnContainer = contentArea.querySelector('.action-buttons-container');
    const backup = btnContainer.innerHTML;
    btnContainer.innerHTML = '<p style="color:#f39c12; width:100%; text-align:center; font-size:13px; font-weight:bold;">⚙️ Protokol yürütülüyor, e-posta kuyruğa gönderiliyor...</p>';

    try {
        await setDoc(doc(db, "applications", docId), { status: isApp ? "onaylandi" : "reddedildi" }, { merge: true });

        try {
            await emailjs.send('service_bftdxcy', isApp ? 'template_01nnh1s' : 'template_cpy48jt', {
                email: String(captainEmail).trim(),
                to_email: String(captainEmail).trim(),
                team_name: String(teamName).trim()
            });
            alert("İşlem Başarılı! Veritabanı güncellendi ve şık bildirim postası iletildi.");
        } catch (mailErr) {
            alert("Sistem Uyarısı: Durum güncellendi fakat EmailJS e-posta gönderemedi. Lütfen kotanızı kontrol edin.");
        }
        loadApplicationsList();
    } catch (err) {
        alert("Kritik veritabanı bağlantı hatası.");
        btnContainer.innerHTML = backup;
    }
}

// ADMİN EKLEME VE LİSTELEME İŞLEMLERİ
document.getElementById('addAdminBtn').addEventListener('click', async () => {
    const mail = document.getElementById('newAdminEmail').value.trim().toLowerCase();
    if (!mail) return;
    try {
        await addDoc(collection(db, "admins"), { email: mail, grantedAt: new Date() });
        alert(`${mail} adresine başarıyla adminlik yetkisi verildi.`);
        document.getElementById('newAdminEmail').value = '';
        loadAdminsList();
    } catch (e) { alert("Yetki verilemedi."); }
});

async function loadAdminsList() {
    const list = document.getElementById('adminEmailsList');
    list.innerHTML = '';
    try {
        // Kök Admini Yazdır
        list.innerHTML += `<li style="padding:12px 15px; border-bottom:1px solid #1f242e; display:flex; justify-content:between; font-size:13.5px;"><span>👑 ${ROOT_ADMIN} (Root Kurucu)</span></li>`;
        
        const querySnap = await getDocs(collection(db, "admins"));
        querySnap.forEach(d => {
            const li = document.createElement('li');
            li.style.padding = '12px 15px'; li.style.borderBottom = '1px solid #1f242e';
            li.style.display = 'flex'; li.style.justifyContent = 'space-between'; li.style.alignItems = 'center';
            li.style.fontSize = '13.5px';
            li.innerHTML = `<span>🛡️ ${d.data().email}</span> <button class="btn-secondary" style="padding:4px 8px; font-size:11px; background:rgba(255,95,86,0.1); color:#ff5f56; border-color:transparent;">Yetki Kaldır</button>`;
            
            li.querySelector('button').addEventListener('click', async () => {
                if(confirm("Bu hesabın yöneticilik yetkisini kaldırmak istediğinize emin misiniz?")) {
                    await deleteDoc(doc(db, "admins", d.id));
                    loadAdminsList();
                }
            });
            list.appendChild(li);
        });
    } catch (e) { console.error(e); }
}
