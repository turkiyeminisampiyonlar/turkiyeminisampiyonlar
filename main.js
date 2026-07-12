import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, getDoc
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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
const db  = getFirestore(app);
const IMGBB_API_KEY = "43c8e0a8c3277336886330d1172f988a";

let localTournaments  = [];
let localApplications = [];
let currentTournamentId = null;

const loader               = document.getElementById('tms-loader');
const tournamentHubView    = document.getElementById('tournamentHubView');
const registrationFormView = document.getElementById('registrationFormView');
const myApplicationsView   = document.getElementById('myApplicationsView');
const heroSection          = document.getElementById('heroSection');
const tournamentGrid       = document.getElementById('tournamentGrid');
const searchInput          = document.getElementById('searchInput');
const selectedCard         = document.getElementById('selectedTournamentCard');
const backToHubBtn         = document.getElementById('backToHubBtn');
const submitBtn            = document.getElementById('submitBtn');
const statusModal          = document.getElementById('statusModal');
const navHomeBtn           = document.getElementById('navHomeBtn');
const navMyAppsBtn         = document.getElementById('navMyAppsBtn');

function showLoader() { loader.style.display = 'flex'; loader.style.opacity = '1'; }
function hideLoader() { loader.style.opacity = '0'; setTimeout(() => loader.style.display = 'none', 400); }

// Modal
document.getElementById('closeStatusBtn').addEventListener('click', () => statusModal.style.display = 'none');
window.addEventListener('click', e => { if (e.target === statusModal) statusModal.style.display = 'none'; });

// ── View Yönetimi ────────────────────────────────────────────────────
function showView(view) {
  tournamentHubView.style.display    = 'none';
  registrationFormView.style.display = 'none';
  myApplicationsView.style.display   = 'none';
  heroSection.style.display          = 'none';

  if (view === 'hub') {
    heroSection.style.display       = 'block';
    tournamentHubView.style.display = 'block';
  } else if (view === 'form') {
    registrationFormView.style.display = 'block';
  } else if (view === 'myapps') {
    myApplicationsView.style.display = 'block';
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Navbar ───────────────────────────────────────────────────────────
function setActiveNav(active) {
  navHomeBtn.classList.remove('active');
  navMyAppsBtn.classList.remove('active');
  if (active === 'home')   navHomeBtn.classList.add('active');
  if (active === 'myapps') navMyAppsBtn.classList.add('active');
}

navHomeBtn.addEventListener('click', () => {
  setActiveNav('home');
  showView('hub');
  window.history.pushState({}, '', 'index.html');
});
navMyAppsBtn.addEventListener('click', () => {
  setActiveNav('myapps');
  showView('myapps');
});

// ── Veri Çekme ───────────────────────────────────────────────────────
async function refreshSystemData() {
  try {
    const [appSnap, tourSnap] = await Promise.all([
      getDocs(collection(db, "applications")),
      getDocs(collection(db, "tournaments"))
    ]);
    localApplications = [];
    appSnap.forEach(d => localApplications.push({ id: d.id, ...d.data() }));
    localTournaments = [];
    tourSnap.forEach(d => localTournaments.push({ id: d.id, ...d.data() }));
  } catch (e) { console.error("Veri hatası:", e); }
}

// ── Başlangıç ────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await refreshSystemData();
  const routeId = new URLSearchParams(window.location.search).get('id');
  if (routeId) {
    await openRegistrationForm(routeId);
  } else {
    setActiveNav('home');
    showView('hub');
    renderTournaments(localTournaments);
  }
  hideLoader();
});

// ── Turnuva Kartları ─────────────────────────────────────────────────
function renderTournaments(list) {
  tournamentGrid.innerHTML = '';
  if (list.length === 0) {
    tournamentGrid.innerHTML = '<p style="color:#6f7685;grid-column:1/-1;text-align:center;padding:40px;">Aktif turnuva bulunamadı.</p>';
    return;
  }
  list.forEach(t => {
    const today = new Date(); today.setHours(0,0,0,0);
    const isExpired     = new Date(t.deadline) < today;
    const approvedCount = localApplications.filter(a => a.tournamentId === t.id && a.status === 'onaylandi').length;
    const maxTeams      = parseInt(t.maxTeams) || 16;
    const isFull        = approvedCount >= maxTeams;

    let badgeClass = 't-badge-active', badgeText = 'Kayıtlar Açık';
    if (isExpired)   { badgeClass = 't-badge-expired'; badgeText = 'Süre Doldu'; }
    else if (isFull) { badgeClass = 't-badge-expired'; badgeText = 'Kontenjan Doldu'; }

    const disabled = isExpired || isFull;
    const btnText  = isExpired ? 'Süre Doldu' : (isFull ? 'Kontenjan Doldu' : 'Detay ve Kayıt Ol');
    const pct      = Math.min(100, Math.round((approvedCount / maxTeams) * 100));

    const card = document.createElement('div');
    card.className = 'tournament-card';
    card.innerHTML = `
      <span class="t-badge ${badgeClass}">${badgeText}</span>
      <div class="t-logo-container"><img class="t-logo" src="${t.logoUrl || 'tmş.png'}" onerror="this.src='tmş.png'"></div>
      <div class="t-title">${t.name}</div>
      <div class="t-deadline">📅 Son Başvuru: ${t.deadline}</div>
      <div class="quota-bar-wrap">
        <div class="quota-bar-track"><div class="quota-bar-fill" style="width:${pct}%"></div></div>
        <span class="quota-label">📊 ${approvedCount} / ${maxTeams} Takım</span>
      </div>
      <div class="t-desc">${t.rules || ''}</div>
      <button class="btn-primary select-t-btn" style="margin-top:auto;width:100%;" ${disabled ? 'disabled' : ''}>${btnText}</button>
    `;
    if (!disabled) {
      card.querySelector('.select-t-btn').addEventListener('click', () => {
        window.history.pushState({}, '', `?id=${t.id}`);
        openRegistrationForm(t.id);
      });
    }
    tournamentGrid.appendChild(card);
  });
}

searchInput.addEventListener('input', e => {
  const term = e.target.value.toLowerCase().trim();
  renderTournaments(localTournaments.filter(t => t.name.toLowerCase().includes(term)));
});

// ── Kayıt Formu ──────────────────────────────────────────────────────
async function openRegistrationForm(tournamentId) {
  currentTournamentId = tournamentId;
  let t = localTournaments.find(x => x.id === tournamentId);
  if (!t) {
    try {
      const snap = await getDoc(doc(db, "tournaments", tournamentId));
      if (snap.exists()) t = { id: snap.id, ...snap.data() };
    } catch(e) { console.error(e); }
  }
  if (!t) { showPopup("HATA!", "Turnuva bulunamadı.", false); window.history.pushState({}, '', 'index.html'); return; }

  const approved  = localApplications.filter(a => a.tournamentId === t.id && a.status === 'onaylandi').length;
  const maxTeams  = parseInt(t.maxTeams) || 16;
  const isFull    = approved >= maxTeams;
  const modeText  = t.teamSize == 1 ? "Tekli (1v1)" : `${t.teamSize}v${t.teamSize} Takım`;

  selectedCard.innerHTML = `
    <img src="${t.logoUrl || 'tmş.png'}" onerror="this.src='tmş.png'"
      style="width:70px;height:70px;border-radius:12px;object-fit:cover;border:2px solid #f39c12;flex-shrink:0;">
    <div style="flex:1;min-width:0;">
      <div style="font-size:18px;font-weight:800;color:#fff;">${t.name} <span style="color:#f39c12;font-size:13px;font-weight:normal;">[${modeText}]</span></div>
      <div style="color:#8e95a5;font-size:12px;margin:5px 0;">⏰ Son Katılım: <strong style="color:#f39c12;">${t.deadline}</strong> &nbsp;|&nbsp; 📊 <strong style="color:#00ff87;">${approved}/${maxTeams} Takım Onaylı</strong></div>
      <div style="color:#b5bdcd;font-size:13px;margin-top:10px;white-space:pre-line;background:rgba(0,0,0,0.2);padding:10px;border-radius:8px;max-height:120px;overflow-y:auto;">${t.rules || ''}</div>
    </div>
  `;

  submitBtn.disabled  = isFull;
  submitBtn.innerText = isFull ? "⛔ Kayıtlar Durduruldu (Kontenjan Dolu)" : "⚔️ Savaşa Katıl ve Kaydı Tamamla";

  const container = document.getElementById('dynamicPlayersContainer');
  container.innerHTML = '';
  const size = parseInt(t.teamSize) || 3;
  for (let i = 1; i <= size; i++) {
    const box = document.createElement('div');
    box.className = 'player-box';
    box.innerHTML = `
      <h4>${i === 1 ? '🟢 Kaptan / ' : '⚪ '}Oyuncu ${i}</h4>
      <div class="input-grid">
        <div class="input-group"><label>Oyun İçi Adı (IGN)</label><input type="text" class="p-name" placeholder="Oyuncu Nick"></div>
        <div class="input-group"><label>E-Posta</label><input type="email" class="p-email" placeholder="ornek@gmail.com"></div>
        <div class="input-group"><label>Sosyal Medya Linki</label><input type="url" class="p-yt" placeholder="https://youtube.com/..."></div>
      </div>
    `;
    container.appendChild(box);
  }

  setActiveNav('');
  showView('form');
}

backToHubBtn.addEventListener('click', async () => {
  window.history.pushState({}, '', 'index.html');
  setActiveNav('home');
  showView('hub');
  showLoader();
  await refreshSystemData();
  renderTournaments(localTournaments);
  hideLoader();
});

// ── Görsel Doğrulama ─────────────────────────────────────────────────
function validateImageIsSquare(file) {
  return new Promise(r => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload  = () => r(img.width === img.height);
      img.onerror = () => r(false);
      img.src = e.target.result;
    };
    reader.onerror = () => r(false);
    reader.readAsDataURL(file);
  });
}

// ── Form Gönder ──────────────────────────────────────────────────────
submitBtn.addEventListener('click', async () => {
  const teamName = document.getElementById('teamName').value.trim();
  const logoFile = document.getElementById('teamLogo').files[0];
  const pNames   = document.querySelectorAll('.p-name');
  const pEmails  = document.querySelectorAll('.p-email');
  const pYts     = document.querySelectorAll('.p-yt');

  if (!teamName) { showPopup("UYARI!", "Takım ismini giriniz.", false); return; }
  if (!logoFile) { showPopup("UYARI!", "Takım logosu seçiniz.", false); return; }
  let allFilled = true;
  [...pNames, ...pEmails, ...pYts].forEach(i => { if (!i.value.trim()) allFilled = false; });
  if (!allFilled) { showPopup("UYARI!", "Tüm oyuncu bilgilerini eksiksiz doldurunuz.", false); return; }

  submitBtn.disabled  = true;
  submitBtn.innerText = "⏳ Görsel Denetleniyor...";

  try {
    if (!(await validateImageIsSquare(logoFile))) {
      showPopup("LOGO UYUMSUZ!", "Logo kare (1x1) ölçülerinde olmalıdır!", false);
      return;
    }
    submitBtn.innerText = "☁️ Logo Yükleniyor...";
    const fd = new FormData(); fd.append("image", logoFile);
    const res  = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
    const json = await res.json();
    if (!json.success) throw new Error("Logo yükleme başarısız.");

    const playersList = [];
    for (let i = 0; i < pNames.length; i++) {
      playersList.push({ name: pNames[i].value.trim(), email: pEmails[i].value.trim(), yt: pYts[i].value.trim() });
    }

    submitBtn.innerText = "📝 Kayıt Zincirine Yazılıyor...";
    await addDoc(collection(db, "applications"), {
      tournamentId: currentTournamentId,
      teamName, logoUrl: json.data.url, status: "bekliyor", players: playersList, timestamp: new Date()
    });

    showPopup("✅ BAŞVURU ALINDI!", "Takım kaydınız havuzumuza eklendi. Admin onayından sonra e-posta gönderilecektir.", true);
    document.getElementById('teamName').value = '';
    document.getElementById('teamLogo').value = '';
    document.querySelectorAll('.p-name, .p-email, .p-yt').forEach(i => i.value = '');
    backToHubBtn.click();
  } catch (err) {
    console.error(err);
    showPopup("TEKNİK HATA!", "Bir hata oluştu: " + err.message, false);
  } finally {
    submitBtn.disabled  = false;
    submitBtn.innerText = "⚔️ Savaşa Katıl ve Kaydı Tamamla";
  }
});

// ── Katıldıklarım ────────────────────────────────────────────────────
document.getElementById('searchMyAppsBtn').addEventListener('click', () => {
  const email  = document.getElementById('myEmailInput').value.trim().toLowerCase();
  const listEl = document.getElementById('myApplicationsList');
  if (!email) { listEl.innerHTML = '<p style="color:#ff5f56;font-size:13px;">E-posta adresinizi giriniz.</p>'; return; }

  const myApps = localApplications.filter(a =>
    a.players?.some(p => (p.email || '').toLowerCase() === email)
  );

  listEl.innerHTML = '';
  if (myApps.length === 0) {
    listEl.innerHTML = '<div class="empty-state">Bu e-posta ile kayıtlı başvuru bulunamadı.</div>';
    return;
  }
  myApps.forEach(a => {
    const tInfo  = localTournaments.find(t => t.id === a.tournamentId) || { name: 'Bilinmeyen Turnuva' };
    const sColor = a.status === 'onaylandi' ? '#00ff87' : a.status === 'reddedildi' ? '#ff5f56' : '#f39c12';
    const sText  = a.status === 'onaylandi' ? '✅ Onaylandı' : a.status === 'reddedildi' ? '❌ Reddedildi' : '⏳ İnceleniyor';
    const el = document.createElement('div');
    el.className = 'my-app-card';
    el.innerHTML = `
      <img src="${a.logoUrl || 'tmş.png'}" onerror="this.src='tmş.png'" class="my-app-logo">
      <div class="my-app-info">
        <div class="my-app-name">${a.teamName}</div>
        <div class="my-app-tour">🏆 ${tInfo.name}</div>
      </div>
      <span class="my-app-status" style="color:${sColor};border-color:${sColor};">${sText}</span>
    `;
    listEl.appendChild(el);
  });
});

// ── Popup ────────────────────────────────────────────────────────────
function showPopup(title, msg, isSuccess) {
  const color = isSuccess ? '#00ff87' : '#ff5f56';
  document.getElementById('statusTitle').innerText   = title;
  document.getElementById('statusTitle').style.color = color;
  document.getElementById('statusMessage').innerText = msg;
  document.getElementById('statusIcon').innerHTML    = `<div style="font-size:52px;margin-bottom:10px;">${isSuccess ? '✅' : '❌'}</div>`;
  statusModal.style.display = 'flex';
}
