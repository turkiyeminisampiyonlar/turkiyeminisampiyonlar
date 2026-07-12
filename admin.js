import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import {
  getFirestore, collection, getDocs, doc, updateDoc, addDoc
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCa81wdLtxll68b1anajvH0wRTnGKVaLs4",
  authDomain: "turkiyeminisampiyonlar.firebaseapp.com",
  projectId: "turkiyeminisampiyonlar",
  storageBucket: "turkiyeminisampiyonlar.firebasestorage.app",
  messagingSenderId: "671378598785",
  appId: "1:671378598785:web:eb7e09319c17abb7c3d680"
};

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getFirestore(app);
const provider = new GoogleAuthProvider();

const IMGBB_API_KEY = "43c8e0a8c3277336886330d1172f988a";
const ADMIN_EMAIL   = "necron.offical@gmail.com";

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

let tournamentsDataList = [];
let allApplicationsList = [];
let editingTournamentId = null;
let dashboardLoaded     = false; // çift yüklemeyi önle

// ── Loader ───────────────────────────────────────────────────────────
function showLoader() { loader.style.display = 'flex'; loader.style.opacity = '1'; }
function hideLoader() {
  loader.style.opacity = '0';
  setTimeout(() => { loader.style.display = 'none'; }, 350);
}

// ── Sekmeler ─────────────────────────────────────────────────────────
tabAppsBtn.addEventListener('click', () => {
  tabAppsBtn.classList.add('active');   tabCreateBtn.classList.remove('active');
  viewApps.style.display = 'block';    viewCreate.style.display = 'none';
});
tabCreateBtn.addEventListener('click', () => {
  tabCreateBtn.classList.add('active'); tabAppsBtn.classList.remove('active');
  viewApps.style.display = 'none';     viewCreate.style.display = 'block';
});

// ── Google Giriş ─────────────────────────────────────────────────────
loginBtn.addEventListener('click', async () => {
  loginError.style.display = 'none';
  showLoader();
  try {
    await signInWithPopup(auth, provider);
    // onAuthStateChanged devralacak
  } catch (err) {
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
      // Mobilde popup engellenirse redirect dene
      try { await signInWithRedirect(auth, provider); }
      catch (e) { hideLoader(); showLoginError("Giriş başarısız. Sayfayı yenileyip tekrar deneyin."); }
    } else if (err.code === 'auth/cancelled-popup-request') {
      hideLoader(); // kullanıcı kendisi kapattı, sessizce kapat
    } else {
      hideLoader();
      showLoginError("Giriş hatası: " + (err.message || err.code));
    }
  }
});

logoutBtn.addEventListener('click', async () => {
  dashboardLoaded = false;
  await signOut(auth);
});

// Redirect dönüşünü yakala (mobil için)
getRedirectResult(auth).then(result => {
  // onAuthStateChanged zaten tetiklenecek, burada ekstra işlem yok
}).catch(err => {
  if (err?.code && err.code !== 'auth/no-current-user') {
    console.warn("Redirect sonucu:", err.code);
    hideLoader();
  }
});

// ── Auth Durumu ───────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (user.email === ADMIN_EMAIL) {
      loginSection.style.display     = 'none';
      dashboardSection.style.display = 'block';
      loginError.style.display       = 'none';
      if (!dashboardLoaded) {
        dashboardLoaded = true;
        await loadDashboardProcedures();
      }
    } else {
      showLoginError(`Yetkisiz hesap: ${user.email}`);
      loginSection.style.display     = 'block';
      dashboardSection.style.display = 'none';
      dashboardLoaded = false;
      // Sessizce çıkış yap (döngüyü önlemek için önce UI güncellendi)
      signOut(auth);
    }
  } else {
    loginSection.style.display     = 'block';
    dashboardSection.style.display = 'none';
    applicationsList.innerHTML     = '';
    dashboardLoaded = false;
  }
  hideLoader();
});

function showLoginError(msg) {
  loginError.innerText     = msg;
  loginError.style.display = 'block';
}

// ── Pano ─────────────────────────────────────────────────────────────
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

// ── Filtre ───────────────────────────────────────────────────────────
function buildFilterDropdown() {
  const sel = document.getElementById('filterTournamentSelect');
  sel.innerHTML = '<option value="all">Tüm Turnuvaların Başvuruları</option>';
  tournamentsDataList.forEach(t => {
    const o = document.createElement('option');
    o.value = t.id; o.textContent = t.name;
    sel.appendChild(o);
  });
  const fresh = sel.cloneNode(true);
  sel.parentNode.replaceChild(fresh, sel);
  document.getElementById('filterTournamentSelect').addEventListener('change', loadApplicationsList);
}

// ── Görsel Doğrulama ─────────────────────────────────────────────────
function validateSquareImage(file) {
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

async function uploadLogo(file) {
  const fd = new FormData(); fd.append("image", file);
  const res  = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
  const json = await res.json();
  if (!json.success) throw new Error("Logo yüklenemedi.");
  return json.data.url;
}

// ── Yeni Turnuva ─────────────────────────────────────────────────────
document.getElementById('createTBtn').addEventListener('click', async () => {
  const btn      = document.getElementById('createTBtn');
  const name     = document.getElementById('newTName').value.trim();
  const deadline = document.getElementById('newTDeadline').value;
  const teamSize = document.getElementById('newTSize').value;
  const maxTeams = document.getElementById('newTMaxTeams').value;
  const rules    = document.getElementById('newTRules').value.trim();
  const logoFile = document.getElementById('newTLogo').files[0];

  if (!name || !deadline || !rules || !logoFile) {
    alert("Lütfen tüm alanları doldurunuz ve logo seçiniz."); return;
  }
  btn.disabled = true; btn.innerText = "Görsel İnceleniyor...";
  try {
    if (!(await validateSquareImage(logoFile))) {
      alert("Logo kare (1x1) boyutta olmalıdır!"); return;
    }
    btn.innerText = "Logo Yükleniyor...";
    const logoUrl = await uploadLogo(logoFile);
    btn.innerText = "Kaydediliyor...";
    await addDoc(collection(db, "tournaments"), {
      name, deadline, teamSize: parseInt(teamSize),
      maxTeams: parseInt(maxTeams), rules, logoUrl, createdAt: new Date()
    });
    alert("Turnuva başarıyla yayına alındı!");
    ['newTName','newTDeadline','newTMaxTeams','newTRules'].forEach(id =>
      document.getElementById(id).value = id === 'newTMaxTeams' ? '16' : ''
    );
    document.getElementById('newTLogo').value = '';
    showLoader();
    dashboardLoaded = false;
    await loadDashboardProcedures();
    dashboardLoaded = true;
    hideLoader();
    tabAppsBtn.click();
  } catch (err) {
    console.error(err); alert("Hata: " + err.message);
  } finally {
    btn.disabled = false; btn.innerText = "Turnuvayı Akışta Canlıya Al";
  }
});

// ── Turnuva Yönetim Listesi ───────────────────────────────────────────
function loadManageTournamentsList() {
  const container = document.getElementById('manageTournamentsList');
  container.innerHTML = '';
  if (tournamentsDataList.length === 0) {
    container.innerHTML = '<p style="color:#6f7685;font-size:13px;">Kayıtlı turnuva bulunmuyor.</p>'; return;
  }
  tournamentsDataList.forEach(t => {
    const approved = allApplicationsList.filter(a => a.tournamentId === t.id && a.status === 'onaylandi').length;
    const max      = t.maxTeams || 16;
    const row = document.createElement('div');
    row.style.cssText = "background:#14161d;border:1px solid #1f242e;border-radius:8px;padding:12px 18px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;text-align:left;";
    row.innerHTML = `
      <div>
        <strong style="color:#fff;font-size:14px;">🛡 ${t.name}</strong>
        <span style="color:#8e95a5;font-size:12px;margin-left:10px;">(Onaylı: ${approved} / ${max})</span>
      </div>
      <button class="btn-secondary open-edit-trigger" style="padding:6px 15px;font-size:12px;border-color:#f39c12;color:#f39c12;font-weight:bold;">Düzenle</button>
    `;
    row.querySelector('.open-edit-trigger').addEventListener('click', () => {
      editingTournamentId = t.id;
      document.getElementById('editTName').value         = t.name;
      document.getElementById('editTMaxTeams').value     = max;
      document.getElementById('editTRules').value        = t.rules || '';
      document.getElementById('editTSizeDisabled').value = `${t.teamSize} Kişilik Roster`;
      document.getElementById('editTIdDisabled').value   = t.id;
      const sec = document.getElementById('editTournamentSection');
      sec.style.display = 'block';
      setTimeout(() => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    });
    container.appendChild(row);
  });
}

// ── Turnuva Güncelle ─────────────────────────────────────────────────
document.getElementById('saveEditTBtn').addEventListener('click', async () => {
  if (!editingTournamentId) return;
  const btn      = document.getElementById('saveEditTBtn');
  const name     = document.getElementById('editTName').value.trim();
  const maxTeams = document.getElementById('editTMaxTeams').value;
  const rules    = document.getElementById('editTRules').value.trim();
  if (!name || !maxTeams || !rules) { alert("Tüm alanları doldurunuz."); return; }
  btn.disabled = true; btn.innerText = "İşleniyor...";
  try {
    await updateDoc(doc(db, "tournaments", editingTournamentId), {
      name, maxTeams: parseInt(maxTeams), rules
    });
    alert("Güncellendi! Esporcuların kayıtları korundu.");
    document.getElementById('editTournamentSection').style.display = 'none';
    editingTournamentId = null;
    showLoader();
    dashboardLoaded = false;
    await loadDashboardProcedures();
    dashboardLoaded = true;
    hideLoader();
  } catch (err) {
    console.error(err); alert("Güncelleme hatası: " + err.message);
  } finally {
    btn.disabled = false; btn.innerText = "Değişiklikleri Veritabanına Kaydet";
  }
});

document.getElementById('cancelEditTBtn').addEventListener('click', () => {
  document.getElementById('editTournamentSection').style.display = 'none';
  editingTournamentId = null;
});

// ── Başvuru Listesi ───────────────────────────────────────────────────
function loadApplicationsList() {
  const filter = document.getElementById('filterTournamentSelect').value;
  applicationsList.innerHTML = '';
  let counter = 0;

  allApplicationsList.forEach(data => {
    if (data.status !== "bekliyor") return;
    if (filter !== 'all' && data.tournamentId !== filter) return;
    counter++;
    const tInfo = tournamentsDataList.find(x => x.id === data.tournamentId) || { name: 'Bilinmeyen Turnuva' };

    let playersHtml = '';
    (data.players || []).forEach((p, idx) => {
      playersHtml += `<p style="margin-bottom:6px;font-size:13px;">
        <b>Oyuncu ${idx+1}${idx===0?' (Kaptan)':''}:</b>
        ${p.name||'-'} | ${p.email||'-'} |
        <a href="${p.yt||'#'}" target="_blank" rel="noopener" style="color:#60efff;text-decoration:none;">Medya ↗</a>
      </p>`;
    });

    const card = document.createElement('div');
    card.className = 'accordion-item';
    card.innerHTML = `
      <div class="accordion-header">
        <span style="font-weight:700;color:#fff;font-size:14px;">🛡 [${tInfo.name}] ${data.teamName}</span>
        <span class="arrow-ind" style="color:#8e95a5;font-size:12px;white-space:nowrap;">▼ Göster</span>
      </div>
      <div class="accordion-content" style="display:none;">
        <div style="display:flex;flex-wrap:wrap;gap:20px;margin-bottom:20px;">
          <img src="${data.logoUrl||''}" style="width:80px;height:80px;border-radius:8px;border:2px solid #252932;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">
          <div style="flex:1;min-width:200px;">
            <p style="font-size:11px;color:#8e95a5;margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.05);font-weight:bold;letter-spacing:0.5px;">KADRO DETAYI</p>
            ${playersHtml}
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn-approve" style="flex:1;min-width:100px;padding:12px;background:#00ff87;color:#0a0b0d;border:none;border-radius:6px;font-weight:bold;cursor:pointer;">✔ Kabul Et</button>
          <button class="btn-reject"  style="flex:1;min-width:100px;padding:12px;background:rgba(255,95,86,0.1);color:#ff5f56;border:1px solid #ff5f56;border-radius:6px;font-weight:bold;cursor:pointer;">✕ Reddet</button>
        </div>
      </div>
    `;

    const header  = card.querySelector('.accordion-header');
    const content = card.querySelector('.accordion-content');
    const arrow   = card.querySelector('.arrow-ind');
    header.addEventListener('click', () => {
      const open = content.style.display === 'block';
      content.style.display = open ? 'none' : 'block';
      arrow.textContent     = open ? '▼ Göster' : '▲ Gizle';
    });
    const p1Email = data.players?.[0]?.email || '';
    card.querySelector('.btn-approve').addEventListener('click', () => handleAction(data.id, 'onayla',  p1Email, data.teamName));
    card.querySelector('.btn-reject' ).addEventListener('click', () => handleAction(data.id, 'reddet', p1Email, data.teamName));
    applicationsList.appendChild(card);
  });

  if (counter === 0) {
    applicationsList.innerHTML = '<p style="color:#6f7685;font-size:13px;text-align:center;padding:20px;">Bekleyen başvuru bulunmuyor.</p>';
  }
}

// ── Onayla / Reddet ───────────────────────────────────────────────────
async function handleAction(docId, action, p1Email, teamName) {
  const isApproved = action === 'onayla';
  try {
    if (typeof emailjs !== 'undefined') {
      await emailjs.send('service_bftdxcy', isApproved ? 'template_01nnh1s' : 'template_cpy48jt', {
        to_email: p1Email, team_name: teamName
      });
    }
    await updateDoc(doc(db, "applications", docId), {
      status: isApproved ? "onaylandi" : "reddedildi"
    });
    alert("İşlem tamamlandı! Kaptana e-posta iletildi.");
    showLoader();
    dashboardLoaded = false;
    await loadDashboardProcedures();
    dashboardLoaded = true;
    hideLoader();
  } catch (err) {
    console.error(err); alert("Hata: " + err.message);
  }
}
