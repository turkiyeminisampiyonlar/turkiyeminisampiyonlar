import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider,
  signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import {
  getFirestore, collection, getDocs,
  doc, updateDoc, addDoc
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// ── Firebase Yapılandırması ──────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCa81wdLtxll68b1anajvH0wRTnGKVaLs4",
  authDomain: "turkiyeminisampiyonlar.firebaseapp.com",
  projectId: "turkiyeminisampiyonlar",
  storageBucket: "turkiyeminisampiyonlar.firebasestorage.app",
  messagingSenderId: "671378598785",
  appId: "1:671378598785:web:eb7e09319c17abb7c3d680"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const provider = new GoogleAuthProvider();

const IMGBB_API_KEY = "43c8e0a8c3277336886330d1172f988a";
const ADMIN_EMAIL   = "necron.offical@gmail.com";

// ── DOM Referansları ─────────────────────────────────────────────────
const loader           = document.getElementById('tms-loader');
const loginBtn         = document.getElementById('googleLoginBtn');
const logoutBtn        = document.getElementById('logoutBtn');
const loginSection     = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const applicationsList = document.getElementById('applicationsList');
const loginError       = document.getElementById('loginError');
const tabAppsBtn       = document.getElementById('tabAppsBtn');
const tabCreateBtn     = document.getElementById('tabCreateBtn');
const viewApps         = document.getElementById('viewApps');
const viewCreate       = document.getElementById('viewCreate');

// ── Uygulama Durumu ──────────────────────────────────────────────────
let tournamentsDataList = [];
let allApplicationsList = [];
let editingTournamentId = null;

// ── Loader Yardımcıları ──────────────────────────────────────────────
function showLoader() {
  loader.style.display  = 'flex';
  loader.style.opacity  = '1';
}
function hideLoader() {
  loader.style.opacity = '0';
  setTimeout(() => { loader.style.display = 'none'; }, 400);
}

// ── Sekme Geçişi ─────────────────────────────────────────────────────
tabAppsBtn.addEventListener('click', () => {
  tabAppsBtn.classList.add('active');
  tabCreateBtn.classList.remove('active');
  viewApps.style.display   = 'block';
  viewCreate.style.display = 'none';
});
tabCreateBtn.addEventListener('click', () => {
  tabCreateBtn.classList.add('active');
  tabAppsBtn.classList.remove('active');
  viewApps.style.display   = 'none';
  viewCreate.style.display = 'block';
});

// ── Google Girişi (Mobil uyumlu: Redirect) ───────────────────────────
loginBtn.addEventListener('click', () => {
  showLoader();
  signInWithRedirect(auth, provider).catch(err => {
    console.error("Redirect hatası:", err);
    hideLoader();
  });
});

logoutBtn.addEventListener('click', () => {
  signOut(auth).catch(err => console.error(err));
});

// ── Auth Durumu İzle ─────────────────────────────────────────────────
// Önce redirect sonucunu kontrol et (mobilde geri dönüş)
getRedirectResult(auth)
  .then(result => {
    if (result && result.user) {
      // onAuthStateChanged zaten tetiklenecek, burada ekstra işlem gerekmez
    }
  })
  .catch(err => {
    console.error("Redirect sonucu hatası:", err);
    hideLoader();
  });

onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (user.email === ADMIN_EMAIL) {
      loginSection.style.display     = 'none';
      dashboardSection.style.display = 'block';
      loginError.style.display       = 'none';
      await loadDashboardProcedures();
    } else {
      loginError.innerText      = `Yetkisiz Giriş! ${user.email} sistemde tanımlı değil.`;
      loginError.style.display  = 'block';
      dashboardSection.style.display = 'none';
      loginSection.style.display     = 'block';
      await signOut(auth);
    }
  } else {
    loginSection.style.display     = 'block';
    dashboardSection.style.display = 'none';
    applicationsList.innerHTML     = '';
  }
  hideLoader();
});

// ── Pano Prosedürleri ────────────────────────────────────────────────
async function loadDashboardProcedures() {
  try {
    await fetchGlobalDataLocal();
    buildFilterDropdown();
    loadApplicationsList();
    loadManageTournamentsList();
  } catch (err) {
    console.error("Pano yükleme hatası:", err);
  }
}

async function fetchGlobalDataLocal() {
  const [appSnap, tourSnap] = await Promise.all([
    getDocs(collection(db, "applications")),
    getDocs(collection(db, "tournaments"))
  ]);

  allApplicationsList = [];
  appSnap.forEach(d => allApplicationsList.push({ id: d.id, ...d.data() }));

  tournamentsDataList = [];
  tourSnap.forEach(d => tournamentsDataList.push({ id: d.id, ...d.data() }));
}

// ── Filtre Dropdown ──────────────────────────────────────────────────
function buildFilterDropdown() {
  const selector = document.getElementById('filterTournamentSelect');
  selector.innerHTML = '<option value="all">Tüm Turnuvaların Başvuruları</option>';
  tournamentsDataList.forEach(t => {
    const opt = document.createElement('option');
    opt.value       = t.id;
    opt.textContent = t.name;
    selector.appendChild(opt);
  });
  // Eski dinleyiciyi kaldır, yenisini ekle (çift tetiklenmeyi önle)
  selector.replaceWith(selector.cloneNode(true));
  const freshSelector = document.getElementById('filterTournamentSelect');
  freshSelector.addEventListener('change', loadApplicationsList);
}

// ── Görsel Kare Doğrulama ────────────────────────────────────────────
function validateSquareImage(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => resolve(img.width === img.height);
      img.onerror = () => resolve(false);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(false);
    reader.readAsDataURL(file);
  });
}

// ── Logo ImgBB'ye Yükleme ────────────────────────────────────────────
async function uploadLogoToImgbb(file) {
  const fd = new FormData();
  fd.append("image", file);
  const res  = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
  const json = await res.json();
  if (!json.success) throw new Error("ImgBB yükleme başarısız.");
  return json.data.url;
}

// ── Yeni Turnuva Oluşturma ───────────────────────────────────────────
document.getElementById('createTBtn').addEventListener('click', async () => {
  const btn      = document.getElementById('createTBtn');
  const name     = document.getElementById('newTName').value.trim();
  const deadline = document.getElementById('newTDeadline').value;
  const teamSize = document.getElementById('newTSize').value;
  const maxTeams = document.getElementById('newTMaxTeams').value;
  const rules    = document.getElementById('newTRules').value.trim();
  const logoFile = document.getElementById('newTLogo').files[0];

  if (!name || !deadline || !rules || !logoFile) {
    alert("Lütfen tüm alanları doldurunuz ve logo seçiniz.");
    return;
  }

  btn.disabled  = true;
  btn.innerText = "Görsel İnceleniyor...";

  try {
    if (!(await validateSquareImage(logoFile))) {
      alert("Hata: Turnuva logosu kare (1x1) boyutta olmalıdır!");
      return;
    }

    btn.innerText  = "Logo Yükleniyor...";
    const logoUrl  = await uploadLogoToImgbb(logoFile);

    btn.innerText  = "Turnuva Kaydediliyor...";
    await addDoc(collection(db, "tournaments"), {
      name:      name,
      deadline:  deadline,
      teamSize:  parseInt(teamSize),
      maxTeams:  parseInt(maxTeams),
      rules:     rules,
      logoUrl:   logoUrl,
      createdAt: new Date()
    });

    alert("Yeni turnuva başarıyla yayına alındı!");
    // Formu temizle
    ['newTName','newTDeadline','newTMaxTeams','newTRules'].forEach(id => {
      document.getElementById(id).value = id === 'newTMaxTeams' ? '16' : '';
    });
    document.getElementById('newTLogo').value = '';

    showLoader();
    await loadDashboardProcedures();
    hideLoader();
    tabAppsBtn.click();

  } catch (err) {
    console.error("Turnuva oluşturma hatası:", err);
    alert("Sistemsel bir hata oluştu: " + err.message);
  } finally {
    btn.disabled  = false;
    btn.innerText = "Turnuvayı Akışta Canlıya Al";
  }
});

// ── Turnuva Yönetim Listesi ──────────────────────────────────────────
function loadManageTournamentsList() {
  const container = document.getElementById('manageTournamentsList');
  container.innerHTML = '';

  if (tournamentsDataList.length === 0) {
    container.innerHTML = '<p style="color:#6f7685;font-size:13px;">Kayıtlı turnuva bulunmuyor.</p>';
    return;
  }

  tournamentsDataList.forEach(t => {
    const approvedCount = allApplicationsList.filter(a => a.tournamentId === t.id && a.status === 'onaylandi').length;
    const maxTeams      = t.maxTeams || 16;

    const row = document.createElement('div');
    row.style.cssText = "background:#14161d;border:1px solid #1f242e;border-radius:8px;padding:12px 18px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;text-align:left;";
    row.innerHTML = `
      <div>
        <strong style="color:#fff;font-size:14px;">🛡 ${t.name}</strong>
        <span style="color:#8e95a5;font-size:12px;margin-left:10px;">(Onaylı: ${approvedCount} / ${maxTeams})</span>
      </div>
      <button class="btn-secondary open-edit-trigger" style="padding:6px 15px;font-size:12px;border-color:#f39c12;color:#f39c12;font-weight:bold;">Düzenle</button>
    `;

    row.querySelector('.open-edit-trigger').addEventListener('click', () => {
      editingTournamentId = t.id;
      document.getElementById('editTName').value        = t.name;
      document.getElementById('editTMaxTeams').value    = maxTeams;
      document.getElementById('editTRules').value       = t.rules || '';
      document.getElementById('editTSizeDisabled').value = `${t.teamSize} Kişilik Roster`;
      document.getElementById('editTIdDisabled').value  = t.id;

      const editSec = document.getElementById('editTournamentSection');
      editSec.style.display = 'block';
      // Mobilde smooth scroll
      setTimeout(() => editSec.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    });

    container.appendChild(row);
  });
}

// ── Turnuva Güncelleme ───────────────────────────────────────────────
document.getElementById('saveEditTBtn').addEventListener('click', async () => {
  if (!editingTournamentId) return;

  const btn      = document.getElementById('saveEditTBtn');
  const name     = document.getElementById('editTName').value.trim();
  const maxTeams = document.getElementById('editTMaxTeams').value;
  const rules    = document.getElementById('editTRules').value.trim();

  if (!name || !maxTeams || !rules) {
    alert("Lütfen tüm düzenlenebilir alanları doldurunuz.");
    return;
  }

  btn.disabled  = true;
  btn.innerText = "Güvenli Değişiklikler İşleniyor...";

  try {
    // Sadece bu 3 alan güncellenir — applications koleksiyonuna dokunulmaz
    await updateDoc(doc(db, "tournaments", editingTournamentId), {
      name:     name,
      maxTeams: parseInt(maxTeams),
      rules:    rules
    });

    alert("Turnuva güncellendi! Katılan esporcuların kayıtları güvenle korundu.");
    document.getElementById('editTournamentSection').style.display = 'none';
    editingTournamentId = null;

    showLoader();
    await loadDashboardProcedures();
    hideLoader();

  } catch (err) {
    console.error("Güncelleme hatası:", err);
    alert("Güncelleme sırasında bir veritabanı hatası oluştu: " + err.message);
  } finally {
    btn.disabled  = false;
    btn.innerText = "Değişiklikleri Veritabanına Kaydet";
  }
});

document.getElementById('cancelEditTBtn').addEventListener('click', () => {
  document.getElementById('editTournamentSection').style.display = 'none';
  editingTournamentId = null;
});

// ── Başvuru Listesi ──────────────────────────────────────────────────
function loadApplicationsList() {
  const selectedFilter = document.getElementById('filterTournamentSelect').value;
  applicationsList.innerHTML = '';
  let counter = 0;

  allApplicationsList.forEach(data => {
    if (data.status !== "bekliyor") return;
    if (selectedFilter !== 'all' && data.tournamentId !== selectedFilter) return;

    counter++;
    const tInfo = tournamentsDataList.find(x => x.id === data.tournamentId) || { name: 'Bilinmeyen Turnuva' };

    // Oyuncu satırları
    let playersHtml = '';
    (data.players || []).forEach((p, idx) => {
      playersHtml += `
        <p style="margin-bottom:6px;font-size:13px;">
          <b>Oyuncu ${idx + 1}${idx === 0 ? ' (Kaptan)' : ''}:</b>
          ${p.name || '-'} | ${p.email || '-'} |
          <a href="${p.yt || '#'}" target="_blank" rel="noopener" style="color:#60efff;text-decoration:none;">Medya ↗</a>
        </p>`;
    });

    const card = document.createElement('div');
    card.className = 'accordion-item';
    card.innerHTML = `
      <div class="accordion-header">
        <span style="font-weight:700;color:#fff;font-size:14px;">🛡 [${tInfo.name}] Takım: ${data.teamName}</span>
        <span class="arrow-indicator" style="color:#8e95a5;font-size:12px;white-space:nowrap;">▼ Göster</span>
      </div>
      <div class="accordion-content" style="display:none;">
        <div style="display:flex;flex-wrap:wrap;gap:20px;margin-bottom:20px;">
          <img src="${data.logoUrl || ''}" alt="Logo"
            style="width:80px;height:80px;border-radius:8px;border:2px solid #252932;object-fit:cover;background:#000;flex-shrink:0;"
            onerror="this.style.display='none'">
          <div style="flex:1;min-width:200px;">
            <p style="font-size:11px;color:#8e95a5;margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.05);font-weight:bold;letter-spacing:0.5px;">DİNAMİK KADRO BAŞVURU DETAYI</p>
            ${playersHtml}
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn-approve" style="flex:1;min-width:100px;padding:12px;background:#00ff87;color:#0a0b0d;border:none;border-radius:6px;font-weight:bold;cursor:pointer;font-size:14px;">✔ Kabul Et</button>
          <button class="btn-reject"  style="flex:1;min-width:100px;padding:12px;background:rgba(255,95,86,0.1);color:#ff5f56;border:1px solid #ff5f56;border-radius:6px;font-weight:bold;cursor:pointer;font-size:14px;">✕ Reddet</button>
        </div>
      </div>
    `;

    // Accordion aç/kapat
    const header  = card.querySelector('.accordion-header');
    const content = card.querySelector('.accordion-content');
    const arrow   = card.querySelector('.arrow-indicator');
    header.addEventListener('click', () => {
      const open = content.style.display === 'block';
      content.style.display = open ? 'none' : 'block';
      arrow.textContent     = open ? '▼ Göster' : '▲ Gizle';
    });

    // Onayla / Reddet butonları
    const p1Email = (data.players && data.players[0]) ? data.players[0].email : '';
    card.querySelector('.btn-approve').addEventListener('click', () => handleAction(data.id, 'onayla',  p1Email, data.teamName));
    card.querySelector('.btn-reject' ).addEventListener('click', () => handleAction(data.id, 'reddet', p1Email, data.teamName));

    applicationsList.appendChild(card);
  });

  if (counter === 0) {
    applicationsList.innerHTML = '<p style="color:#6f7685;font-size:13px;text-align:center;padding:20px;">Bekleyen takım başvurusu bulunmuyor.</p>';
  }
}

// ── Onayla / Reddet İşlemi ───────────────────────────────────────────
async function handleAction(docId, action, p1Email, teamName) {
  const isApproved = action === 'onayla';
  const templateId = isApproved ? 'template_01nnh1s' : 'template_cpy48jt';
  const serviceId  = 'service_bftdxcy';

  try {
    // E-posta gönder (emailjs global scope'ta)
    if (typeof emailjs !== 'undefined') {
      await emailjs.send(serviceId, templateId, {
        to_email:  p1Email,
        team_name: teamName
      });
    }

    // Firestore güncelle
    await updateDoc(doc(db, "applications", docId), {
      status: isApproved ? "onaylandi" : "reddedildi"
    });

    alert(`İşlem başarıyla tamamlandı! Kaptana e-posta iletildi.`);

    showLoader();
    await loadDashboardProcedures();
    hideLoader();

  } catch (err) {
    console.error("handleAction hatası:", err);
    alert("Bir sorun oluştu: " + err.message);
  }
}
