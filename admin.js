import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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
const ADMIN_EMAIL = "necron.offical@gmail.com";

// DOM Elemanları
const loader = document.getElementById('tms-loader');
const loginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const applicationsList = document.getElementById('applicationsList');
const loginError = document.getElementById('loginError');

const tabAppsBtn = document.getElementById('tabAppsBtn');
const tabCreateBtn = document.getElementById('tabCreateBtn');
const viewApps = document.getElementById('viewApps');
const viewCreate = document.getElementById('viewCreate');

let tournamentsDataList = [];
let allApplicationsList = [];
let editingTournamentId = null;

// Tab Değişim Mekanizması
tabAppsBtn.addEventListener('click', () => {
    tabAppsBtn.classList.add('active'); tabCreateBtn.classList.remove('active');
    viewApps.style.display = 'block'; viewCreate.style.display = 'none';
});
tabCreateBtn.addEventListener('click', () => {
    tabCreateBtn.classList.add('active'); tabAppsBtn.classList.remove('active');
    viewApps.style.display = 'none'; viewCreate.style.display = 'block';
});

loginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(err => console.error(err));
});

logoutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (user.email === ADMIN_EMAIL) {
            loginSection.style.display = 'none';
            dashboardSection.style.display = 'block';
            await loadDashboardProcedures();
        } else {
            loginError.innerText = `Yetkisiz Giriş! ${user.email} sistemde tanımlı değil.`;
            loginError.style.display = 'block';
            signOut(auth);
        }
    } else {
        loginSection.style.display = 'block';
        dashboardSection.style.display = 'none';
        applicationsList.innerHTML = '';
    }
    loader.style.opacity = '0'; setTimeout(() => loader.style.display = 'none', 300);
});

async function loadDashboardProcedures() {
    await fetchGlobalDataLocal();
    await buildFilterDropdown();
    loadApplicationsList();
    loadManageTournamentsList();
}

async function fetchGlobalDataLocal() {
    // Tüm başvuruları local hafızaya al
    const appSnap = await getDocs(collection(db, "applications"));
    allApplicationsList = [];
    appSnap.forEach(d => allApplicationsList.push({ id: d.id, ...d.data() }));

    // Tüm turnuvaları hafızaya al
    const tourSnap = await getDocs(collection(db, "tournaments"));
    tournamentsDataList = [];
    tourSnap.forEach(d => tournamentsDataList.push({ id: d.id, ...d.data() }));
}

async function buildFilterDropdown() {
    const selector = document.getElementById('filterTournamentSelect');
    selector.innerHTML = '<option value="all">Tüm Turnuvaların Başvuruları</option>';
    tournamentsDataList.forEach(t => {
        selector.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    });
    selector.removeEventListener('change', loadApplicationsList);
    selector.addEventListener('change', loadApplicationsList);
}

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

// YENİ TURNUVA OLUŞTURMA
document.getElementById('createTournamentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('createTBtn');
    const name = document.getElementById('newTName').value.trim();
    const deadline = document.getElementById('newTDeadline').value;
    const teamSize = document.getElementById('newTSize').value;
    const maxTeams = document.getElementById('newTMaxTeams').value;
    const rules = document.getElementById('newTRules').value.trim();
    const logoFile = document.getElementById('newTLogo').files[0];

    btn.disabled = true; btn.innerText = "Görsel İnceleniyor...";
    if (logoFile && !(await validateSquareImage(logoFile))) {
        alert("Hata: Turnuva logosu kare (1x1) boyutta olmalıdır!");
        btn.disabled = false; btn.innerText = "Turnuvayı Canlıya Al";
        return;
    }

    try {
        btn.innerText = "Logo Yükleniyor...";
        const fd = new FormData(); fd.append("image", logoFile);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
        const imgJson = await res.json();

        await addDoc(collection(db, "tournaments"), {
            name: name,
            deadline: deadline,
            teamSize: parseInt(teamSize),
            maxTeams: parseInt(maxTeams),
            rules: rules,
            logoUrl: imgJson.data.url,
            createdAt: new Date()
        });

        alert("Yeni esnek espor turnuvası başarıyla yayına alındı!");
        document.getElementById('createTournamentForm').reset();
        await loadDashboardProcedures();
        tabAppsBtn.click();
    } catch (err) {
        alert("Sistemsel bir hata oluştu.");
    } finally {
        btn.disabled = false; btn.innerText = "Turnuvayı Canlıya Al";
    }
});

// GÜNCELLEME LİSTESİNİ OLUŞTURMA (DÜZENLE BUTONLARIYLA BİRLİKTE)
function loadManageTournamentsList() {
    const container = document.getElementById('manageTournamentsList');
    container.innerHTML = '';

    if (tournamentsDataList.length === 0) {
        container.innerHTML = '<p style="color:#6f7685; font-size:13px;">Kayıtlı turnuva bulunmuyor.</p>';
        return;
    }

    tournamentsDataList.forEach(t => {
        const approvedCount = allApplicationsList.filter(a => a.tournamentId === t.id && a.status === 'onaylandi').length;
        const maxTeams = t.maxTeams || 16;

        const row = document.createElement('div');
        row.style = "background:#14161d; border:1px solid #1f242e; border-radius:8px; padding:12px 18px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; text-align:left;";
        row.innerHTML = `
            <div>
                <strong style="color:#fff; font-size:14px;">🛡️ ${t.name}</strong>
                <span style="color:#8e95a5; font-size:12px; margin-left:15px;">(Onaylı Kota: ${approvedCount} / ${maxTeams})</span>
            </div>
            <button class="btn-secondary open-edit-trigger" style="padding:6px 15px; font-size:12px; border-color:#f39c12; color:#f39c12; font-weight:bold;">Düzenle</button>
        `;

        row.querySelector('.open-edit-trigger').addEventListener('click', () => {
            editingTournamentId = t.id;
            document.getElementById('editTName').value = t.name;
            document.getElementById('editTMaxTeams').value = maxTeams;
            document.getElementById('editTRules').value = t.rules;
            document.getElementById('editTSizeDisabled').value = `${t.teamSize} Kişilik Roster`;
            document.getElementById('editTIdDisabled').value = t.id;

            const editSec = document.getElementById('editTournamentSection');
            editSec.style.display = 'block';
            editSec.scrollIntoView({ behavior: 'smooth' });
        });

        container.appendChild(row);
    });
}

// TURNUVA DETAYLARINI GÜNCELLEME (KAYITLARI KORUYAN MÜHENDİSLİK)
document.getElementById('editTournamentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!editingTournamentId) return;

    const btn = document.getElementById('saveEditTBtn');
    const name = document.getElementById('editTName').value.trim();
    const maxTeams = document.getElementById('editTMaxTeams').value;
    const rules = document.getElementById('editTRules').value.trim();

    btn.disabled = true; btn.innerText = "Güvenli Değişiklikler İşleniyor...";

    try {
        // updateDoc sadece bu 3 alanı günceller, applications koleksiyonuna asla dokunmaz!
        const docRef = doc(db, "tournaments", editingTournamentId);
        await updateDoc(docRef, {
            name: name,
            maxTeams: parseInt(maxTeams),
            rules: rules
        });

        alert("Turnuva güncellendi! Katılan esporcuların kayıtları güvenle korundu.");
        document.getElementById('editTournamentSection').style.display = 'none';
        editingTournamentId = null;
        await loadDashboardProcedures();
    } catch (err) {
        alert("Güncelleme sırasında bir veritabanı hatası oluştu.");
    } finally {
        btn.disabled = false; btn.innerText = "Değişiklikleri Veritabanına Kaydet";
    }
});

document.getElementById('cancelEditTBtn').addEventListener('click', () => {
    document.getElementById('editTournamentSection').style.display = 'none'; editingTournamentId = null;
});

// BAŞVURULARI LİSTELEME VE ACCORDION YAPISI
function loadApplicationsList() {
    const selectedFilter = document.getElementById('filterTournamentSelect').value;
    applicationsList.innerHTML = '<p style="color:#8e95a5; font-size:13px;">Yükleniyor...</p>';
    
    applicationsList.innerHTML = '';
    let counter = 0;

    allApplicationsList.forEach((data) => {
        if (data.status !== "bekliyor") return;
        if (selectedFilter !== 'all' && data.tournamentId !== selectedFilter) return;

        counter++;
        const tInfo = tournamentsDataList.find(x => x.id === data.tournamentId) || { name: 'Bilinmeyen Turnuva' };

        // Dinamik oyuncu HTML oluşturma döngüsü
        let playersHtml = '';
        data.players.forEach((p, idx) => {
            const isCap = idx === 0;
            playersHtml += `<p style="margin-bottom:6px; font-size:13px;"><b>Oyuncu ${idx+1}${isCap ? ' (Kaptan)':''}:</b> ${p.name} | ${p.email} | <a href="${p.yt}" target="_blank" style="color:#60efff; text-decoration:none;">Medya ↗</a></p>`;
        });

        const card = document.createElement('div');
        card.className = 'accordion-item';
        card.innerHTML = `
            <div class="accordion-header">
                <span style="font-weight:700; color:#fff; font-size:14px;">🛡️ [${tInfo.name}] Takım: ${data.teamName}</span>
                <span class="arrow-indicator" style="color:#8e95a5; font-size:12px;">[ DETAYLARI GÖSTER ▼ ]</span>
            </div>
            <div class="accordion-content">
                <div style="display:flex; flex-wrap:wrap; gap:20px; margin-bottom:20px;">
                    <img src="${data.logoUrl}" alt="Logo" style="width:90px; height:90px; border-radius:8px; border:2px solid #252932; object-fit:cover; background:#000;">
                    <div style="flex:1; min-width:240px;">
                        <p style="font-size:11px; color:#8e95a5; margin-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.05); font-weight:bold; letter-spacing:0.5px;">DİNAMİK KADRO BAŞVURU DETAYI</p>
                        ${playersHtml}
                    </div>
                </div>
                <div style="display: flex; gap:10px;">
                    <button class="btn-approve" style="flex:1; padding:10px; background:#00ff87; color:#0a0b0d; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">Kabul Et</button>
                    <button class="btn-reject" style="flex:1; padding:10px; background:rgba(255,95,86,0.1); color:#ff5f56; border:1px solid #ff5f56; border-radius:6px; font-weight:bold; cursor:pointer;">Reddet</button>
                </div>
            </div>
        `;

        // Açılır kapanır accordion mekanizması
        const header = card.querySelector('.accordion-header');
        const content = card.querySelector('.accordion-content');
        header.addEventListener('click', () => {
            const isVisible = content.style.display === 'block';
            content.style.display = isVisible ? 'none' : 'block';
            header.querySelector('.arrow-indicator').innerText = isVisible ? '[ DETAYLARI GÖSTER ▼ ]' : '[ DETAYLARI GİZLE ▲ ]';
        });

        // Buton Dinleyicilerini Bağlama (Modül Hatası Vermemesi İçin En Sağlıklı Yoldur)
        card.querySelector('.btn-approve').addEventListener('click', () => handleAction(data.id, 'onayla', data.players[0].email, data.teamName));
        card.querySelector('.btn-reject').addEventListener('click', () => handleAction(data.id, 'reddet', data.players[0].email, data.teamName));

        applicationsList.appendChild(card);
    });

    if (counter === 0) {
        applicationsList.innerHTML = '<p style="color:#6f7685; font-size:13px; text-align:center; padding:15px;">Bekleyen takım başvurusu bulunmuyor.</p>';
    }
}

async function handleAction(docId, action, p1Email, teamName) {
    const isApproved = action === 'onayla';
    const templateId = isApproved ? 'template_01nnh1s' : 'template_cpy48jt';
    const serviceId = 'service_bftdxcy';

    try {
        // E-Posta Protokolünü Çalıştır
        await emailjs.send(serviceId, templateId, {
            to_email: p1Email,
            team_name: teamName
        });

        // Veritabanı Onay Durumunu Değiştir
        const docRef = doc(db, "applications", docId);
        await updateDoc(docRef, {
            status: isApproved ? "onaylandi" : "reddedildi"
        });

        alert(`İşlem başarıyla tamamlandı! Kaptana e-posta iletildi.`);
        await loadDashboardProcedures();
    } catch (error) {
        console.error("Hata:", error);
        alert("Bir sorun oluştu. E-posta kotası dolmuş veya bağlantı kopmuş olabilir.");
    }
}
