import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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

let localTournaments = [];
let localApplications = [];
let currentSelectedTournamentId = null;

// DOM Tanımlamaları
const loader = document.getElementById('tms-loader');
const tournamentHubView = document.getElementById('tournamentHubView');
const registrationFormView = document.getElementById('registrationFormView');
const tournamentGrid = document.getElementById('tournamentGrid');
const searchInput = document.getElementById('searchInput');
const selectedTournamentCard = document.getElementById('selectedTournamentCard');
const backToHubBtn = document.getElementById('backToHubBtn');
const registrationForm = document.getElementById('registrationForm');
const submitBtn = document.getElementById('submitBtn');
const rulesModal = document.getElementById("rulesModal");
const statusModal = document.getElementById("statusModal");

// Modal Tetikleyicileri
document.getElementById("openRulesBtn").addEventListener("click", () => rulesModal.style.display = "flex");
document.getElementById("closeRules").addEventListener("click", () => rulesModal.style.display = "none");
document.getElementById("closeStatusBtn").addEventListener("click", () => statusModal.style.display = "none");

window.addEventListener("click", (e) => {
    if (e.target === rulesModal) rulesModal.style.display = "none";
    if (e.target === statusModal) statusModal.style.display = "none";
});

// Sayfa Başlangıç Noktası
window.addEventListener('DOMContentLoaded', async () => {
    await refreshSystemData();
    
    const urlParams = new URLSearchParams(window.location.search);
    const routeId = urlParams.get('id');
    if (routeId) {
        openRegistrationForm(routeId);
    } else {
        renderTournaments(localTournaments);
    }

    loader.style.opacity = '0';
    setTimeout(() => loader.style.display = 'none', 400);
});

async function refreshSystemData() {
    try {
        // Tüm Başvuruları Çek
        const appSnap = await getDocs(collection(db, "applications"));
        localApplications = [];
        appSnap.forEach(d => localApplications.push({ id: d.id, ...d.data() }));

        // Tüm Turnuvaları Çek
        const tourSnap = await getDocs(collection(db, "tournaments"));
        localTournaments = [];
        tourSnap.forEach(d => localTournaments.push({ id: d.id, ...d.data() }));
    } catch (e) {
        console.error("Veri çekme hatası:", e);
    }
}

// TURNUVALARI KONTENJAN DURUMUNA GÖRE SEÇİM EKRANINA YAZDIRMA
function renderTournaments(tournamentsList) {
    tournamentGrid.innerHTML = '';
    if (tournamentsList.length === 0) {
        tournamentGrid.innerHTML = '<p style="color:#6f7685; grid-column:1/-1; text-align:center; padding:30px;">Aktif turnuva bulunamadı.</p>';
        return;
    }

    tournamentsList.forEach(t => {
        const isExpired = new Date(t.deadline) < new Date().setHours(0,0,0,0);
        const approvedCount = localApplications.filter(a => a.tournamentId === t.id && a.status === 'onaylandi').length;
        const maxTeams = parseInt(t.maxTeams) || 16;
        const isFull = approvedCount >= maxTeams;

        let badgeClass = 't-badge-active';
        let badgeText = 'Kayıtlar Açık';
        
        if (isExpired) {
            badgeClass = 't-badge-expired';
            badgeText = 'Süre Doldu';
        } else if (isFull) {
            badgeClass = 't-badge-expired';
            badgeText = 'Kontenjan Doldu';
        }

        const card = document.createElement('div');
        card.className = 'tournament-card';
        card.innerHTML = `
            <span class="t-badge ${badgeClass}">${badgeText}</span>
            <div class="t-logo-container"><img class="t-logo" src="${t.logoUrl || 'tmş.png'}"></div>
            <div class="t-title">${t.name}</div>
            
            <div style="text-align:center; margin-bottom:12px;">
                <span style="background:rgba(243,156,18,0.08); color:#f39c12; font-size:12px; font-weight:bold; padding:5px 14px; border-radius:20px; border:1px solid rgba(243,156,18,0.15);">
                    📊 Katılım: ${approvedCount} / ${maxTeams} Takım
                </span>
            </div>

            <div class="t-deadline">Son Başvuru: ${t.deadline}</div>
            <div class="t-desc">${t.rules}</div>
            <button class="btn-primary select-t-btn" style="margin-top:auto; width:100%;" ${isExpired || isFull ? 'disabled' : ''}>
                ${isExpired ? 'Süre Doldu' : (isFull ? 'Kontenjan Doldu' : 'Detay ve Kayıt Ol')}
            </button>
        `;

        card.querySelector('.select-t-btn').addEventListener('click', () => {
            window.history.pushState({}, '', `?id=${t.id}`);
            openRegistrationForm(t.id);
        });
        tournamentGrid.appendChild(card);
    });
}

// Arama Filtresi
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = localTournaments.filter(t => t.name.toLowerCase().includes(term));
    renderTournaments(filtered);
});

// FORM GÖRÜNÜMÜNÜ AÇMA VE DİNAMİK OYUNCU ALANLARINI OLUŞTURMA
async function openRegistrationForm(tournamentId) {
    currentSelectedTournamentId = tournamentId;
    let tData = localTournaments.find(x => x.id === tournamentId);

    if (!tData) {
        try {
            const docSnap = await getDoc(doc(db, "tournaments", tournamentId));
            if (docSnap.exists()) tData = { id: docSnap.id, ...docSnap.data() };
        } catch (err) { console.error(err); }
    }

    if (!tData) {
        showPopup("HATA!", "İlgili turnuva veritabanında bulunamadı.", false);
        window.history.pushState({}, '', 'index.html');
        return;
    }

    const approvedCount = localApplications.filter(a => a.tournamentId === tData.id && a.status === 'onaylandi').length;
    const maxTeams = parseInt(tData.maxTeams) || 16;
    const isFull = approvedCount >= maxTeams;

    const tModeText = tData.teamSize == 1 ? "Tekli (1v1)" : `Takımlı (${tData.teamSize}v${tData.teamSize})`;
    
    selectedTournamentCard.innerHTML = `
        <img src="${tData.logoUrl || 'tmş.png'}" style="width:75px; height:75px; border-radius:12px; object-fit:cover; border:2px solid #f39c12;">
        <div style="flex:1;">
            <h3 style="color:#fff; font-size:19px; font-weight:800; margin:0;">${tData.name} <span style="color:#f39c12; font-size:13px; font-weight:normal;">[${tModeText}]</span></h3>
            <p style="color:#8e95a5; font-size:12px; margin-top:5px; margin-bottom:0;">
                ⏰ Son Katılım: <strong style="color:#f39c12;">${tData.deadline}</strong> | 
                📊 Onaylı Slot: <strong style="color:#00ff87;">${approvedCount} / ${maxTeams} Takım</strong>
            </p>
            <div style="color:#b5bdcd; font-size:13px; margin-top:12px; white-space:pre-line; background:rgba(0,0,0,0.2); padding:12px; border-radius:8px; max-height:140px; overflow-y:auto; border:1px solid rgba(255,255,255,0.02);">${tData.rules}</div>
        </div>
    `;

    // KONTENJAN DOLDUYSA BUTONU FİZİKSEL VE GÖRSEL OLARAK KİLİTLE
    if (isFull) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Kayıtlar Durduruldu (Kontenjan Dolu)";
    } else {
        submitBtn.disabled = false;
        submitBtn.innerText = "Savaşa Katıl ve Kaydı Tamamla";
    }

    // Dinamik Oyuncu Giriş Alanlarını İnşa Etme
    const container = document.getElementById('dynamicPlayersContainer');
    container.innerHTML = ''; 
    const size = parseInt(tData.teamSize) || 3;

    for (let i = 1; i <= size; i++) {
        const isCaptain = i === 1;
        const pBox = document.createElement('div');
        pBox.className = 'player-box';
        pBox.innerHTML = `
            <h4>${isCaptain ? '🟢 Kaptan / ' : '⚪ '}Oyuncu ${i} Bilgileri</h4>
            <div class="input-grid">
                <div class="input-group"><label>Oyun İçi Adı (IGN)</label><input type="text" class="p-name" placeholder="Oyuncu Nick" required></div>
                <div class="input-group"><label>E-Posta Adresi</label><input type="email" class="p-email" placeholder="ornek@gmail.com" required></div>
                <div class="input-group"><label>Sosyal Medya Linki</label><input type="url" class="p-yt" placeholder="https://youtube.com/..." required></div>
            </div>
        `;
        container.appendChild(pBox);
    }

    tournamentHubView.style.display = 'none';
    registrationFormView.style.display = 'block';
}

backToHubBtn.addEventListener('click', async () => {
    window.history.pushState({}, '', 'index.html');
    registrationFormView.style.display = 'none';
    tournamentHubView.style.display = 'block';
    loader.style.display = 'flex'; loader.style.opacity = '1';
    await refreshSystemData();
    renderTournaments(localTournaments);
    loader.style.opacity = '0'; setTimeout(() => loader.style.display = 'none', 300);
});

function validateImageIsSquare(file) {
    return new Promise((r) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() { r(img.width === img.height); };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// BAŞVURU FORMU GÖNDERİMİ
registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerText = "Görsel Kuralları Denetleniyor...";

    const teamName = document.getElementById('teamName').value.trim();
    const logoFile = document.getElementById('teamLogo').files[0];

    if (logoFile) {
        const isSquare = await validateImageIsSquare(logoFile);
        if (!isSquare) {
            showPopup("LOGO UYUMSUZ!", "Hata: Yüklediğiniz logo kare (1x1) ölçülerinde olmalıdır!", false);
            submitBtn.disabled = false; submitBtn.innerText = "Savaşa Katıl";
            return;
        }
    }

    try {
        submitBtn.innerText = "Logo Espor Bulutuna Yükleniyor...";
        const formData = new FormData();
        formData.append("image", logoFile);
        const imgResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
        const imgData = await imgResponse.json();
        const logoUrl = imgData.data.url;

        // Dinamik girdilerden verileri derleme
        const pNames = document.querySelectorAll('.p-name');
        const pEmails = document.querySelectorAll('.p-email');
        const pYts = document.querySelectorAll('.p-yt');
        const playersList = [];

        for (let i = 0; i < pNames.length; i++) {
            playersList.push({
                name: pNames[i].value.trim(),
                email: pEmails[i].value.trim(),
                yt: pYts[i].value.trim()
            });
        }

        submitBtn.innerText = "Kayıt Zincirine Yazılıyor...";
        await addDoc(collection(db, "applications"), {
            tournamentId: currentSelectedTournamentId,
            teamName: teamName,
            logoUrl: logoUrl,
            status: "bekliyor",
            players: playersList,
            timestamp: new Date()
        });

        showPopup("BAŞVURU ALINDI!", "Takım kaydınız başarıyla havuzumuza eklendi. Admin onayından sonra tarafınıza e-posta gönderilecektir.", true);
        registrationForm.reset();
        backToHubBtn.click();
    } catch (err) {
        console.error(err);
        showPopup("TEKNİK HATA!", "Kayıt sırasında sistemsel bir hata meydana geldi.", false);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Savaşa Katıl";
    }
});

function showPopup(title, msg, isSuccess) {
    document.getElementById("statusTitle").innerText = title;
    document.getElementById("statusTitle").style.color = isSuccess ? '#00ff87' : '#ff5f56';
    document.getElementById("statusMessage").innerText = msg;
    document.getElementById("statusIcon").innerHTML = isSuccess ? `<span style="font-size:50px; color:#00ff87;">✓</span>` : `<span style="font-size:50px; color:#ff5f56;">✕</span>`;
    statusModal.style.display = "flex";
}
