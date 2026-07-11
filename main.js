import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCa81wdLtxll68b1anajvH0wRTnGKVaLs4",
    authDomain: "turkiyeminisampiyonlar.firebaseapp.com",
    projectId: "turkiyeminisampiyonlar",
    storageBucket: "turkiyeminisampiyonlar.firebasestorage.app",
    messagingSenderId: "671378598785",
    appId: "1:671378598785:web:eb7e09319c17abb7c3d680"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const IMGBB_API_KEY = "43c8e0a8c3277336886330d1172f988a"; 

let localTournaments = [];
let currentSelectedTournamentId = null;

// UI DOM Değişkenleri
const loader = document.getElementById('tms-loader');
const tournamentHubView = document.getElementById('tournamentHubView');
const registrationFormView = document.getElementById('registrationFormView');
const tournamentGrid = document.getElementById('tournamentGrid');
const searchInput = document.getElementById('searchInput');
const selectedTournamentCard = document.getElementById('selectedTournamentCard');
const backToHubBtn = document.getElementById('backToHubBtn');
const registrationForm = document.getElementById('registrationForm');
const submitBtn = document.getElementById('submitBtn');

const statusModal = document.getElementById('statusModal');
const statusTitle = document.getElementById('statusTitle');
const statusMessage = document.getElementById('statusMessage');
const closeStatusBtn = document.getElementById('closeStatusBtn');

// SAYFA YÜKLENME PROTOKOLÜ VE PARAMETRESEL ROUTER
window.addEventListener('DOMContentLoaded', async () => {
    await fetchAllTournaments();
    
    // Sitelinki.com/turnuva.html?id=TURNUMA_ID Mantığı Doğrulaması
    const urlParams = new URLSearchParams(window.location.search);
    const routeId = urlParams.get('id');

    if (routeId) {
        openRegistrationForm(routeId);
    } else {
        renderTournaments(localTournaments);
    }

    // Loader Kapatma
    setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 400);
    }, 600);
});

// FIRESTORE'DAN TURNUVALARI ÇEKME
async function fetchAllTournaments() {
    try {
        const snap = await getDocs(collection(db, "tournaments"));
        localTournaments = [];
        snap.forEach(d => {
            localTournaments.push({ id: d.id, ...d.data() });
        });
    } catch (e) {
        console.error("Turnuva yükleme hatası:", e);
    }
}

// TURNUVALARI ARAYÜZE BASMA
function renderTournaments(tournamentsList) {
    tournamentGrid.innerHTML = '';
    if (tournamentsList.length === 0) {
        tournamentGrid.innerHTML = '<p style="color:#6f7685; grid-column:1/-1; text-align:center; padding:30px;">Kriterlere uygun aktif turnuva bulunamadı.</p>';
        return;
    }

    tournamentsList.forEach(t => {
        const isExpired = new Date(t.deadline) < new Date();
        const card = document.createElement('div');
        card.className = 'tournament-card';
        card.innerHTML = `
            <span class="t-badge ${isExpired ? 't-badge-expired' : 't-badge-active'}">${isExpired ? 'Kayıtlar Kapalı' : 'Kayıtlar Açık'}</span>
            <div class="t-logo-container"><img class="t-logo" src="${t.logoUrl || 'tmş.png'}"></div>
            <div class="t-title">${t.name}</div>
            <div class="t-deadline">Son Katılım: ${t.deadline}</div>
            <div class="t-desc">${t.rules.substring(0, 110)}${t.rules.length > 110 ? '...' : ''}</div>
            <button class="btn-primary select-t-btn" style="margin-top:auto;" ${isExpired ? 'disabled' : ''}>${isExpired ? 'Süre Doldu' : 'Detay ve Başvuru'}</button>
        `;

        card.querySelector('.select-t-btn').addEventListener('click', () => {
            // URL Parametresini Güncelle: sitelinki.com/?id=ID formatı
            window.history.pushState({}, '', `?id=${t.id}`);
            openRegistrationForm(t.id);
        });

        tournamentGrid.appendChild(card);
    });
}

// CANLI ARAMA TETİKLEYİCİSİ (BUGSIZ FILTRELEME)
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = localTournaments.filter(t => t.name.toLowerCase().includes(term));
    renderTournaments(filtered);
});

// FORM GÖRÜNÜMÜNÜ AÇMA (ROUTER BAĞLANTISI)
async function openRegistrationForm(tournamentId) {
    currentSelectedTournamentId = tournamentId;
    let tData = localTournaments.find(x => x.id === tournamentId);

    if (!tData) {
        try {
            const docRef = doc(db, "tournaments", tournamentId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                tData = { id: docSnap.id, ...docSnap.data() };
            }
        } catch (err) { console.error(err); }
    }

    if (!tData) {
        showPopup("HATA!", "İlgili turnuva veritabanında bulunamadı veya silinmiş.", false);
        window.history.pushState({}, '', 'index.html');
        return;
    }

    // Seçilen Turnuva Bilgilerini Ekrana Yaz
    selectedTournamentCard.innerHTML = `
        <img src="${tData.logoUrl || 'tmş.png'}" style="width:70px; height:70px; border-radius:10px; object-fit:cover;">
        <div style="flex:1;">
            <h3 style="color:#fff; font-size:18px; font-weight:800;">${tData.name}</h3>
            <p style="color:#8e95a5; font-size:12px; margin-top:3px;">⏰ Son Katılım Tarihi: <strong style="color:#f39c12;">${tData.deadline}</strong></p>
            <div style="color:#b5bdcd; font-size:13px; margin-top:10px; white-space:pre-line; background:rgba(0,0,0,0.2); padding:12px; border-radius:6px; max-height:180px; overflow-y:auto;">${tData.rules}</div>
        </div>
    `;

    tournamentHubView.style.display = 'none';
    registrationFormView.style.display = 'block';
}

// GERİ DÖNÜŞ BUTONU
backToHubBtn.addEventListener('click', () => {
    window.history.pushState({}, '', 'index.html');
    registrationFormView.style.display = 'none';
    tournamentHubView.style.display = 'block';
    renderTournaments(localTournaments);
});

// RESİM BOYUTU 1X1 SIKI KONTROLÜ PROSEDÜRÜ
function validateImageIsSquare(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                if (img.width === img.height) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// BAŞVURU FORMU GÖNDERİMİ
registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerText = "Kadro ve Logo Doğrulanıyor...";

    const teamName = document.getElementById('teamName').value.trim();
    const logoFile = document.getElementById('teamLogo').files[0];

    // 1x1 Kare Logo Filtresi Kontrolü
    if (logoFile) {
        const isSquare = await validateImageIsSquare(logoFile);
        if (!isSquare) {
            showPopup("LOGO UYUMSUZ!", "Hata: Yüklediğiniz takım logosu 1x1 (Kare) ölçülerinde değil! İşlem iptal edildi.", false);
            submitBtn.disabled = false;
            submitBtn.innerText = "Savaşa Katıl ve Kadroyu Kaydet";
            return;
        }
    }

    try {
        submitBtn.innerText = "Logo Sunucuya Aktarılıyor...";
        const formData = new FormData();
        formData.append("image", logoFile);

        const imgResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: "POST",
            body: formData
        });
        const imgData = await imgResponse.json();
        const logoUrl = imgData.data.url;

        submitBtn.innerText = "Veritabanı Senkronizasyonu Yapılıyor...";

        // Kaydı Koleksiyona Ekle (Turnuva ID Bağlantılı)
        await addDoc(collection(db, "applications"), {
            tournamentId: currentSelectedTournamentId,
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

        showPopup("BAŞVURU İLETİLDİ!", "Takım kadronuz başarıyla turnuva havuzuna eklendi. Admin onay sürecinin ardından e-posta alacaksınız.", true);
        registrationForm.reset();
        backToHubBtn.click();
    } catch (err) {
        console.error(err);
        showPopup("TEKNİK HATA!", "Kayıt işlemi veritabanı hatası nedeniyle tamamlanamadı.", false);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Savaşa Katıl ve Kadroyu Kaydet";
    }
});

function showPopup(title, msg, success) {
    statusTitle.innerText = title;
    statusTitle.style.color = success ? '#00ff87' : '#ff5f56';
    statusMessage.innerText = msg;
    statusModal.style.display = 'flex';
}
closeStatusBtn.addEventListener('click', () => statusModal.style.display = 'none');
