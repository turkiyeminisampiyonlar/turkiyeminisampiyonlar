import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import {
  getFirestore, collection, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc, setDoc,
  onSnapshot, query, orderBy, writeBatch
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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

const IMGBB_API_KEY = "43c8e0a8c3277336886330d1172f988a";
const ADMIN_EMAIL = "necron.offical@gmail.com";
const SUPER_ADMIN_EMAIL = "necron.offical@gmail.com";

// ── DOM Elements ─────────────────────────────────────────────────
const loader = document.getElementById('tms-loader');
const toastContainer = document.getElementById('toastContainer');
const loginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const applicationsList = document.getElementById('applicationsList');
const loginError = document.getElementById('loginError');
const tabAppsBtn = document.getElementById('tabAppsBtn');
const tabCreateBtn = document.getElementById('tabCreateBtn');
const tabAdminBtn = document.getElementById('tabAdminBtn');
const tabStatsBtn = document.getElementById('tabStatsBtn');
const tabToolsBtn = document.getElementById('tabToolsBtn');
const viewApps = document.getElementById('viewApps');
const viewCreate = document.getElementById('viewCreate');
const viewAdminManage = document.getElementById('viewAdminManage');
const viewStats = document.getElementById('viewStats');
const viewTools = document.getElementById('viewTools');
const confirmModal = document.getElementById('confirmModal');
const refreshAppsBtn = document.getElementById('refreshAppsBtn');
const batchBar = document.getElementById('batchBar');
const batchCount = document.getElementById('batchCount');
const pinModal = document.getElementById('pinModal');

let tournamentsDataList = [];
let allApplicationsList = [];
let adminsList = [];
let activityLogs = [];
let editingTournamentId = null;
let dashboardLoaded = false;
let selectedAppIds = new Set();
let unsubscribeTournaments = null;
let unsubscribeApplications = null;
let unsubscribeAdmins = null;
let unsubscribeLogs = null;
let currentUser = null;
let currentUserRole = null;
let pinVerified = false;
let turnstileToken = null;

window.onTurnstileSuccess = function(token) {
  turnstileToken = token;
  const loginBtn = document.getElementById('googleLoginBtn');
  if (loginBtn) loginBtn.disabled = false;
};
window.onTurnstileError = function() {
  turnstileToken = null;
  const loginBtn = document.getElementById('googleLoginBtn');
  if (loginBtn) loginBtn.disabled = true;
};

// ── Toast System ─────────────────────────────────────────────────
function showToast(title, message, type = 'info', duration = 4000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icons[type] || icons.info}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" aria-label="Bildirimi kapat">✕</button>
  `;
  toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));
  toastContainer.appendChild(toast);
  if (duration > 0) setTimeout(() => removeToast(toast), duration);
  return toast;
}
function removeToast(toast) {
  if (!toast.parentNode) return;
  toast.classList.add('hiding');
  setTimeout(() => toast.remove(), 300);
}

// ── Confirmation Dialog ────────────────────────────────────────
function showConfirm(title, message, icon = '❓') {
  return new Promise(resolve => {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmIcon').textContent = icon;
    confirmModal.classList.add('open');
    const okBtn = document.getElementById('confirmOk');
    const cancelBtn = document.getElementById('confirmCancel');
    const cleanup = () => {
      confirmModal.classList.remove('open');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
    };
    const onOk = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    const onKey = (e) => { if (e.key === 'Escape') { cleanup(); resolve(false); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
  });
}

// ── Rejection Reason Dialog ──────────────────────────────────────
function showRejectionReasonDialog(teamName) {
  return new Promise(resolve => {
    const modal = document.createElement('div');
    modal.className = 'modal open';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="modal-content" style="max-width:480px;">
        <button class="modal-close" id="rejModalClose" aria-label="Kapat">✕</button>
        <div class="confirm-dialog">
          <div class="confirm-icon">🚫</div>
          <h3>Başvuru Red Gerekçesi</h3>
          <p style="color:var(--text-secondary);font-size:14px;margin-bottom:16px;">
            <strong style="color:#fff;">${teamName}</strong> takımının başvurusunu reddetmek üzeresiniz.
          </p>
          <div class="input-group" style="text-align:left;margin-bottom:20px;">
            <label style="display:block;margin-bottom:8px;">Red Gerekçesi <span class="required">*</span></label>
            <textarea id="rejectionReasonInput" rows="4" placeholder="Örn: Eksik bilgi, kurallara uygun değil..." 
              style="width:100%;padding:12px 14px;background:rgba(8,9,16,0.85);border:1px solid rgba(255,255,255,0.09);border-radius:12px;color:#fff;font-size:14px;resize:vertical;min-height:100px;"></textarea>
            <p class="hint-text" id="rejectionHint" style="margin-top:6px;">Bu metin kaptana e-posta olarak gönderilecektir.</p>
          </div>
          <div class="confirm-actions">
            <button class="btn-secondary" id="rejCancelBtn">Vazgeç</button>
            <button class="btn-danger" id="rejConfirmBtn" style="background:rgba(255,95,86,0.15);border-color:rgba(255,95,86,0.4);color:#ff5f56;">
              <span aria-hidden="true">🚫</span> Reddet ve Gönder
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const input = modal.querySelector('#rejectionReasonInput');
    input.focus();
    const cleanup = () => { modal.remove(); document.removeEventListener('keydown', onKey); };
    const onConfirm = () => {
      const reason = input.value.trim();
      if (!reason) {
        input.style.borderColor = '#ff5f56';
        document.getElementById('rejectionHint').textContent = '❌ Gerekçe zorunludur';
        document.getElementById('rejectionHint').style.color = '#ff5f56';
        return;
      }
      cleanup();
      resolve(reason);
    };
    const onCancel = () => { cleanup(); resolve(null); };
    const onKey = (e) => { if (e.key === 'Escape') { onCancel(); } };
    document.addEventListener('keydown', onKey);
    modal.querySelector('#rejConfirmBtn').addEventListener('click', onConfirm);
    modal.querySelector('#rejCancelBtn').addEventListener('click', onCancel);
    modal.querySelector('#rejModalClose').addEventListener('click', onCancel);
    modal.addEventListener('click', (e) => { if (e.target === modal) onCancel(); });
  });
}

// ── PIN Doğrulama ──────────────────────────────────────────────
function setupPinVerification() {
  const inputs = document.querySelectorAll('.pin-input');
  const submitBtn = document.getElementById('pinSubmitBtn');
  const errorMsg = document.getElementById('pinError');
  if (!inputs.length || !submitBtn) return;
  inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val && index < inputs.length - 1) inputs[index + 1].focus();
      if (errorMsg) errorMsg.style.display = 'none';
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) inputs[index - 1].focus();
      if (e.key === 'Enter') verifyPin();
    });
  });
  submitBtn.addEventListener('click', verifyPin);
}

async function verifyPin() {
  const inputs = document.querySelectorAll('.pin-input');
  const pin = Array.from(inputs).map(i => i.value).join('');
  const errorMsg = document.getElementById('pinError');
  if (pin.length !== 4) {
    if (errorMsg) { errorMsg.textContent = '❌ 4 haneli PIN giriniz'; errorMsg.style.display = 'block'; }
    return;
  }
  try {
    const adminDoc = await getDoc(doc(db, "admins", currentUser.uid));
    if (adminDoc.exists() && adminDoc.data().pin === pin) {
      pinVerified = true;
      pinModal.classList.remove('open');
      inputs.forEach(i => i.value = '');
      showToast("Başarılı", "PIN doğrulandı. Yönetim paneline hoş geldiniz.", "success");
      await loadDashboardProcedures();
    } else {
      if (errorMsg) { errorMsg.textContent = '❌ Hatalı PIN kodu'; errorMsg.style.display = 'block'; }
      inputs.forEach(i => { i.value = ''; i.classList.add('error'); });
      setTimeout(() => inputs[0].focus(), 100);
    }
  } catch (err) {
    if (errorMsg) { errorMsg.textContent = '❌ Doğrulama hatası'; errorMsg.style.display = 'block'; }
  }
}

function showPinModal() {
  if (pinModal) {
    pinModal.classList.add('open');
    setTimeout(() => document.querySelector('.pin-input[data-index="0"]')?.focus(), 300);
  }
}

// ── Loader ───────────────────────────────────────────────────────
function showLoader(text) {
  if (text) loader.querySelector('.loader-text').textContent = text;
  loader.style.display = 'flex';
  loader.style.opacity = '1';
}
function hideLoader() {
  loader.style.opacity = '0';
  setTimeout(() => { loader.style.display = 'none'; }, 400);
}

// ── Sekmeler ─────────────────────────────────────────────────────
function setActiveTab(tabName) {
  const tabs = [tabAppsBtn, tabCreateBtn, tabAdminBtn, tabStatsBtn, tabToolsBtn].filter(Boolean);
  const views = [viewApps, viewCreate, viewAdminManage, viewStats, viewTools].filter(Boolean);
  tabs.forEach(btn => btn?.classList.remove('active'));
  views.forEach(view => { if (view) view.style.display = 'none'; });
  if (tabName === 'apps' && tabAppsBtn) { tabAppsBtn.classList.add('active'); if (viewApps) viewApps.style.display = 'block'; }
  else if (tabName === 'create' && tabCreateBtn) { tabCreateBtn.classList.add('active'); if (viewCreate) viewCreate.style.display = 'block'; }
  else if (tabName === 'admin' && tabAdminBtn) { tabAdminBtn.classList.add('active'); if (viewAdminManage) viewAdminManage.style.display = 'block'; }
  else if (tabName === 'stats' && tabStatsBtn) { tabStatsBtn.classList.add('active'); if (viewStats) viewStats.style.display = 'block'; renderCharts(); }
  else if (tabName === 'tools' && tabToolsBtn) { tabToolsBtn.classList.add('active'); if (viewTools) viewTools.style.display = 'block'; loadToolsData(); }
}

tabAppsBtn?.addEventListener('click', () => setActiveTab('apps'));
tabCreateBtn?.addEventListener('click', () => setActiveTab('create'));
tabAdminBtn?.addEventListener('click', () => setActiveTab('admin'));
tabStatsBtn?.addEventListener('click', () => setActiveTab('stats'));
tabToolsBtn?.addEventListener('click', () => setActiveTab('tools'));

// ── Google Giriş ─────────────────────────────────────────────────
loginBtn.addEventListener('click', async () => {
  if (!turnstileToken) { showToast("Hata", "Güvenlik doğrulamasını tamamlayın.", "error"); return; }
  loginError.style.display = 'none';
  showLoader("GİRİŞ YAPILIYOR");
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
      try { await signInWithRedirect(auth, provider); } catch (e) { hideLoader(); showLoginError("Giriş başarısız. Sayfayı yenileyip tekrar deneyin."); }
    } else if (err.code === 'auth/cancelled-popup-request') { hideLoader(); }
    else { hideLoader(); showLoginError("Giriş hatası: " + (err.message || err.code)); }
  }
});

logoutBtn.addEventListener('click', async () => {
  const confirmed = await showConfirm("Çıkış Yap", "Yönetim panelinden çıkmak istediğinize emin misiniz?", "🚪");
  if (!confirmed) return;
  dashboardLoaded = false; pinVerified = false; selectedAppIds.clear(); updateBatchBar();
  currentUser = null; currentUserRole = null;
  await signOut(auth);
  showToast("Bilgi", "Güvenli çıkış yapıldı.", "info", 3000);
});

getRedirectResult(auth).then(result => {}).catch(err => {
  if (err?.code && err.code !== 'auth/no-current-user') { console.warn("Redirect sonucu:", err.code); hideLoader(); }
});

// ── Auth Durumu ───────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    let isAdmin = false;
    try {
      const adminDoc = await getDoc(doc(db, "admins", user.uid));
      if (adminDoc.exists()) { isAdmin = true; currentUserRole = adminDoc.data().role || 'admin'; }
      else if (user.email === SUPER_ADMIN_EMAIL) {
        isAdmin = true; currentUserRole = 'super';
        await setDoc(doc(db, "admins", user.uid), { email: user.email, name: user.displayName || 'Super Admin', role: 'super', pin: '0000', createdAt: new Date() });
      }
    } catch (err) { console.error("Admin kontrolü hatası:", err); }

    if (isAdmin) {
      loginSection.style.display = 'none';
      dashboardSection.style.display = 'block';
      loginError.style.display = 'none';
      if (tabAdminBtn && user.email === SUPER_ADMIN_EMAIL) tabAdminBtn.style.display = 'inline-block';
      if (!dashboardLoaded) {
        dashboardLoaded = true;
        if (!pinVerified) showPinModal();
        else await loadDashboardProcedures();
      }
    } else {
      showLoginError(`Yetkisiz hesap: ${user.email}`);
      loginSection.style.display = 'block'; dashboardSection.style.display = 'none';
      dashboardLoaded = false; signOut(auth);
    }
  } else {
    loginSection.style.display = 'block'; dashboardSection.style.display = 'none';
    applicationsList.innerHTML = ''; dashboardLoaded = false; pinVerified = false;
    currentUser = null; currentUserRole = null;
  }
  hideLoader();
});

function showLoginError(msg) {
  loginError.innerText = msg;
  loginError.style.display = 'block';
}

// ── Real-time Listeners ────────────────────────────────────────
function setupRealtimeListeners() {
  const tourQuery = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
  unsubscribeTournaments = onSnapshot(tourQuery, (snapshot) => {
    tournamentsDataList = [];
    snapshot.forEach(d => tournamentsDataList.push({ id: d.id, ...d.data() }));
    if (dashboardLoaded && pinVerified) {
      buildFilterDropdown();
      loadManageTournamentsList();
      updateStats();
      loadToolsData();
    }
  });

  const appQuery = query(collection(db, "applications"), orderBy("timestamp", "desc"));
  unsubscribeApplications = onSnapshot(appQuery, (snapshot) => {
    allApplicationsList = [];
    snapshot.forEach(d => allApplicationsList.push({ id: d.id, ...d.data() }));
    if (dashboardLoaded && pinVerified) {
      loadApplicationsList();
      updateStats();
    }
  });

  const adminsQuery = query(collection(db, "admins"), orderBy("createdAt", "desc"));
  unsubscribeAdmins = onSnapshot(adminsQuery, (snapshot) => {
    adminsList = [];
    snapshot.forEach(d => adminsList.push({ id: d.id, ...d.data() }));
    if (dashboardLoaded && pinVerified) loadAdminList();
  });

  const logsQuery = query(collection(db, "activityLogs"), orderBy("timestamp", "desc"));
  unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
    activityLogs = [];
    snapshot.forEach(d => activityLogs.push({ id: d.id, ...d.data() }));
    if (dashboardLoaded && pinVerified) loadActivityLogs();
  });
}

// ── Statistics — Özellik #10 (Gelişmiş) ───────────────────────
function updateStats() {
  const pending = allApplicationsList.filter(a => a.status === 'bekliyor').length;
  const approved = allApplicationsList.filter(a => a.status === 'onaylandi').length;
  const rejected = allApplicationsList.filter(a => a.status === 'reddedildi').length;
  const waitlist = allApplicationsList.filter(a => a.status === 'bekleme').length;
  const totalTournaments = tournamentsDataList.length;
  const totalApps = allApplicationsList.length;
  const conversion = totalApps > 0 ? Math.round((approved / totalApps) * 100) : 0;
  
  animateNumber('statTotalTournaments', totalTournaments);
  animateNumber('statPendingApps', pending);
  animateNumber('statApprovedApps', approved);
  animateNumber('statRejectedApps', rejected);
  animateNumber('statWaitlistApps', waitlist);
  document.getElementById('statConversionRate').textContent = conversion + '%';
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const diff = target - start;
  if (diff === 0) return;
  const duration = 600;
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + diff * easeOut);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ── Pano Yükleme ─────────────────────────────────────────────────
async function loadDashboardProcedures() {
  try {
    setupRealtimeListeners();
    buildFilterDropdown();
    loadApplicationsList();
    loadManageTournamentsList();
    loadAdminList();
    loadActivityLogs();
    updateStats();
    loadTemplates();
  } catch (err) {
    console.error("Pano yükleme hatası:", err);
    showToast("Hata", "Pano yüklenirken bir sorun oluştu.", "error");
  }
}

// ── Filtre ───────────────────────────────────────────────────────
function buildFilterDropdown() {
  const sel = document.getElementById('filterTournamentSelect');
  const currentVal = sel.value;
  sel.innerHTML = '<option value="all">Tüm Turnuvaların Başvuruları</option>';
  tournamentsDataList.forEach(t => {
    const o = document.createElement('option');
    o.value = t.id;
    o.textContent = t.name;
    sel.appendChild(o);
  });
  if (currentVal && [...sel.options].some(o => o.value === currentVal)) sel.value = currentVal;
}

document.getElementById('filterTournamentSelect').addEventListener('change', () => {
  selectedAppIds.clear();
  updateBatchBar();
  loadApplicationsList();
});

refreshAppsBtn.addEventListener('click', () => {
  showToast("Bilgi", "Başvurular yenileniyor...", "info", 2000);
  selectedAppIds.clear();
  updateBatchBar();
  loadApplicationsList();
});

// ── Basvuru Arama ve Filtreleme ────────────────────────────────
const appSearchInput = document.getElementById('appSearchInput');
const appStatusFilter = document.getElementById('appStatusFilter');

appSearchInput?.addEventListener('input', () => loadApplicationsList());
appStatusFilter?.addEventListener('change', () => {
  selectedAppIds.clear();
  updateBatchBar();
  loadApplicationsList();
});

function getFilteredApplications() {
  const searchTerm = appSearchInput?.value?.toLowerCase()?.trim() || '';
  const statusFilter = appStatusFilter?.value || 'bekliyor';
  const tournamentFilter = document.getElementById('filterTournamentSelect')?.value || 'all';

  return allApplicationsList.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (tournamentFilter !== 'all' && a.tournamentId !== tournamentFilter) return false;
    if (searchTerm) {
      const teamName = (a.teamName || '').toLowerCase();
      const captainEmail = (a.players?.[0]?.email || '').toLowerCase();
      const tName = (tournamentsDataList.find(t => t.id === a.tournamentId)?.name || '').toLowerCase();
      if (!teamName.includes(searchTerm) && !captainEmail.includes(searchTerm) && !tName.includes(searchTerm)) return false;
    }
    return true;
  });
}

// ── CSV Export ─────────────────────────────────────────────────
document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
  const filtered = getFilteredApplications();
  if (filtered.length === 0) { showToast("Uyarı", "Dışa aktarılacak başvuru bulunmuyor.", "warning"); return; }
  let csv = '\uFEFF';
  csv += 'Takım İsmi,Turnuva,Kaptan Adı,Kaptan Email,Durum,Başvuru Tarihi,Admin Notu\n';
  filtered.forEach(a => {
    const t = tournamentsDataList.find(x => x.id === a.tournamentId);
    const captain = a.players?.[0] || {};
    const date = a.timestamp ? new Date(a.timestamp.toDate ? a.timestamp.toDate() : a.timestamp).toLocaleDateString('tr-TR') : '-';
    const status = a.status === 'onaylandi' ? 'Onaylandı' : a.status === 'reddedildi' ? 'Reddedildi' : a.status === 'bekleme' ? 'Bekleme' : 'Bekliyor';
    csv += `"${(a.teamName || '').replace(/"/g, '""')}","${(t?.name || '').replace(/"/g, '""')}","${(captain.name || '').replace(/"/g, '""')}","${captain.email || ''}","${status}","${date}","${(a.adminNote || '').replace(/"/g, '""')}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `tms_basvurular_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  showToast("Başarılı", `${filtered.length} başvuru CSV olarak indirildi.`, "success");
});

// ── Batch Operations ─────────────────────────────────────────────
function updateBatchBar() {
  if (selectedAppIds.size > 0) {
    batchBar.classList.add('visible');
    batchCount.textContent = `${selectedAppIds.size} başvuru seçildi`;
  } else {
    batchBar.classList.remove('visible');
  }
}

document.getElementById('batchClearBtn').addEventListener('click', () => {
  selectedAppIds.clear();
  document.querySelectorAll('.app-checkbox').forEach(cb => cb.checked = false);
  updateBatchBar();
});

document.getElementById('batchApproveBtn').addEventListener('click', async () => {
  if (selectedAppIds.size === 0) return;
  const confirmed = await showConfirm("Toplu Onay", `${selectedAppIds.size} başvuruyu onaylamak istediğinize emin misiniz?`, "✅");
  if (!confirmed) return;
  await batchAction('onayla');
});

document.getElementById('batchRejectBtn').addEventListener('click', async () => {
  if (selectedAppIds.size === 0) return;
  const confirmed = await showConfirm("Toplu Red", `${selectedAppIds.size} başvuruyu reddetmek istediğinize emin misiniz?`, "❌");
  if (!confirmed) return;
  await batchAction('reddet');
});

document.getElementById('batchWaitlistBtn').addEventListener('click', async () => {
  if (selectedAppIds.size === 0) return;
  const confirmed = await showConfirm("Toplu Bekleme", `${selectedAppIds.size} başvuruyu bekleme listesine almak istediğinize emin misiniz?`, "📋");
  if (!confirmed) return;
  await batchAction('bekleme');
});

async function batchAction(action) {
  const statusMap = { 'onayla': 'onaylandi', 'reddet': 'reddedildi', 'bekleme': 'bekleme' };
  const newStatus = statusMap[action];
  const batch = writeBatch(db);
  let processed = 0;
  for (const docId of selectedAppIds) {
    const appRef = doc(db, "applications", docId);
    batch.update(appRef, { status: newStatus });
    processed++;
  }
  try {
    await batch.commit();
    await logActivity(`batch_${action}`, `${processed} başvuru ${newStatus} yapıldı`);
    showToast("Başarılı", `${processed} başvuru işlem gördü.`, "success");
    selectedAppIds.clear();
    updateBatchBar();
  } catch (err) { showToast("Hata", "İşlem sırasında sorun: " + err.message, "error"); }
}

// ── Görsel Doğrulama ───────────────────────────────────────────
function validateSquareImage(file) {
  return new Promise(r => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => r(img.width === img.height);
      img.onerror = () => r(false);
      img.src = e.target.result;
    };
    reader.onerror = () => r(false);
    reader.readAsDataURL(file);
  });
}

async function uploadLogo(file) {
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
  const json = await res.json();
  if (!json.success) throw new Error("Logo yüklenemedi.");
  return json.data.url;
}

// ── Admin File Upload with Preview ───────────────────────────────
const adminFileUpload = document.getElementById('adminFileUpload');
const adminLogoPreview = document.getElementById('adminLogoPreview');
const adminLogoHint = document.getElementById('adminLogoHint');
const newTLogoInput = document.getElementById('newTLogo');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  adminFileUpload.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); });
});
['dragenter', 'dragover'].forEach(eventName => {
  adminFileUpload.addEventListener(eventName, () => adminFileUpload.classList.add('dragover'));
});
['dragleave', 'drop'].forEach(eventName => {
  adminFileUpload.addEventListener(eventName, () => adminFileUpload.classList.remove('dragover'));
});
adminFileUpload.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files.length) { newTLogoInput.files = files; handleAdminLogoSelect(files[0]); }
});
newTLogoInput.addEventListener('change', (e) => { if (e.target.files[0]) handleAdminLogoSelect(e.target.files[0]); });

function handleAdminLogoSelect(file) {
  if (!file.type.startsWith('image/')) { showToast("Hata", "Lütfen geçerli bir görsel dosyası seçin.", "error"); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    adminLogoPreview.src = e.target.result;
    adminLogoPreview.classList.add('visible');
    const img = new Image();
    img.onload = () => {
      const isSquare = img.width === img.height;
      if (isSquare) { adminLogoHint.textContent = '✅ Logo boyutu uygun (' + img.width + 'x' + img.height + ')'; adminLogoHint.className = 'hint-text success'; }
      else { adminLogoHint.textContent = `⚠️ Logo kare olmalı! (${img.width}x${img.height})`; adminLogoHint.className = 'hint-text error'; }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── Yeni Turnuva — Özellik #2, #5, #6 (Kategori, Auto-close, Webhook) ──
document.getElementById('createTBtn').addEventListener('click', async () => {
  const btn = document.getElementById('createTBtn');
  const name = document.getElementById('newTName').value.trim();
  const deadline = document.getElementById('newTDeadline').value;
  const teamSize = document.getElementById('newTSize').value;
  const maxTeams = document.getElementById('newTMaxTeams').value;
  const rules = document.getElementById('newTRules').value.trim();
  const logoFile = newTLogoInput.files[0];
  const category = document.getElementById('newTCategory').value;
  const autoClose = document.getElementById('newTAutoClose').value === 'true';
  const webhook = document.getElementById('newTWebhook').value.trim();

  if (!name || !deadline || !rules || !logoFile) { showToast("Hata", "Tüm alanları doldurunuz ve logo seçiniz.", "error"); return; }
  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span aria-hidden="true">📐</span> Görsel İnceleniyor...';
  try {
    if (!(await validateSquareImage(logoFile))) { showToast("Hata", "Logo kare (1x1) olmalıdır!", "error"); return; }
    btn.innerHTML = '<span aria-hidden="true">☁️</span> Logo Yükleniyor...';
    const logoUrl = await uploadLogo(logoFile);
    btn.innerHTML = '<span aria-hidden="true">💾</span> Kaydediliyor...';
    await addDoc(collection(db, "tournaments"), {
      name, deadline, teamSize: parseInt(teamSize), maxTeams: parseInt(maxTeams), rules, logoUrl,
      category, autoClose, webhookUrl: webhook, status: 'active', createdAt: new Date()
    });
    await logActivity('create_tournament', `"${name}" turnuvası oluşturuldu`);
    showToast("Başarılı", "Turnuva başarıyla yayına alındı!", "success");
    ['newTName','newTDeadline','newTRules','newTWebhook'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('newTMaxTeams').value = '16';
    newTLogoInput.value = '';
    adminLogoPreview.classList.remove('visible');
    adminLogoHint.textContent = '⚠️ Logo tam kare (1x1) boyutta olmalıdır';
    adminLogoHint.className = 'hint-text';
    tabAppsBtn.click();
  } catch (err) {
    console.error(err);
    showToast("Hata", "İşlem sırasında sorun: " + err.message, "error");
  } finally { btn.disabled = false; btn.innerHTML = originalText; }
});

// ── Turnuva Şablonları — Özellik #8 ─────────────────────────
async function loadTemplates() {
  const container = document.getElementById('templateList');
  if (!container) return;
  container.innerHTML = '';
  const templates = [
    { name: 'FPS 5v5 Klasik', teamSize: 5, maxTeams: 16, category: 'fps', rules: 'Standard FPS kuralları...' },
    { name: 'MOBA 3v3 Hızlı', teamSize: 3, maxTeams: 8, category: 'moba', rules: 'MOBA kuralları...' },
    { name: 'BR Solo', teamSize: 1, maxTeams: 100, category: 'br', rules: 'Battle Royale kuralları...' }
  ];
  templates.forEach((tmpl, i) => {
    const row = document.createElement('div');
    row.style.cssText = "background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:12px;padding:14px 18px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;";
    row.innerHTML = `
      <div>
        <div style="font-weight:700;color:#fff;font-size:14px;">${tmpl.name}</div>
        <div style="font-size:12px;color:var(--text-muted);">${tmpl.teamSize}v${tmpl.teamSize} | ${tmpl.maxTeams} Takım | ${tmpl.category.toUpperCase()}</div>
      </div>
      <button class="btn-primary use-template-btn" style="padding:8px 16px;font-size:13px;" data-index="${i}">
        <span aria-hidden="true">📋</span> Kullan
      </button>
    `;
    row.querySelector('.use-template-btn').addEventListener('click', () => {
      document.getElementById('newTName').value = tmpl.name;
      document.getElementById('newTSize').value = tmpl.teamSize;
      document.getElementById('newTMaxTeams').value = tmpl.maxTeams;
      document.getElementById('newTCategory').value = tmpl.category;
      document.getElementById('newTRules').value = tmpl.rules;
      showToast("Bilgi", "Şablon yüklendi. Tarih ve logo ekleyin.", "info", 3000);
    });
    container.appendChild(row);
  });
}

// ── Turnuva Yönetim Listesi — Özellik #1 (Derve Dışı/Pause) ──
function loadManageTournamentsList() {
  const container = document.getElementById('manageTournamentsList');
  container.innerHTML = '';
  if (tournamentsDataList.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon" aria-hidden="true">📭</div><div class="empty-title">Turnuva Yok</div>Henüz kayıtlı turnuva bulunmuyor.</div>`;
    return;
  }
  tournamentsDataList.forEach(t => {
    const approved = allApplicationsList.filter(a => a.tournamentId === t.id && a.status === 'onaylandi').length;
    const pending = allApplicationsList.filter(a => a.tournamentId === t.id && a.status === 'bekliyor').length;
    const waitlist = allApplicationsList.filter(a => a.tournamentId === t.id && a.status === 'bekleme').length;
    const max = t.maxTeams || 16;
    const pct = Math.min(100, Math.round((approved / max) * 100));
    const isPaused = t.status === 'paused';
    const isCompleted = t.status === 'completed';
    
    const row = document.createElement('div');
    row.style.cssText = "background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:12px;padding:16px 20px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;transition:all 0.2s;";
    row.innerHTML = `
      <div style="flex:1;min-width:200px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <img src="${t.logoUrl || 'tms.png'}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;border:1px solid rgba(255,255,255,0.08);" onerror="this.style.display='none'">
          <div>
            <strong style="color:#fff;font-size:15px;">${t.name}</strong>
            ${isPaused ? '<span style="margin-left:8px;font-size:10px;background:rgba(255,95,86,0.15);color:var(--accent-red);padding:2px 8px;border-radius:10px;">DURDURULDU</span>' : ''}
            ${isCompleted ? '<span style="margin-left:8px;font-size:10px;background:rgba(156,163,175,0.15);color:#9ca3af;padding:2px 8px;border-radius:10px;">TAMAMLANDI</span>' : ''}
          </div>
        </div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--text-muted);">
          <span>🟢 Onaylı: <strong style="color:var(--accent-green);">${approved}</strong> / ${max}</span>
          <span>⏳ Bekleyen: <strong style="color:var(--accent-gold);">${pending}</strong></span>
          <span>📋 Bekleme: <strong style="color:var(--accent-cyan);">${waitlist}</strong></span>
          <span>📅 ${t.deadline}</span>
        </div>
        <div style="margin-top:8px;background:rgba(255,255,255,0.05);border-radius:6px;height:4px;overflow:hidden;">
          <div style="height:100%;background:var(--gradient-gold);border-radius:6px;width:${pct}%;transition:width 0.5s ease;"></div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn-ghost open-edit-trigger" style="padding:8px 16px;font-size:13px;white-space:nowrap;">
          <span aria-hidden="true">✏️</span> Düzenle
        </button>
        <button class="btn-warning pause-tournament-btn" style="padding:8px 16px;font-size:13px;white-space:nowrap;" data-id="${t.id}" data-action="${isPaused ? 'resume' : 'pause'}">
          <span aria-hidden="true">${isPaused ? '▶️' : '⏸️'}</span> ${isPaused ? 'Devam Ettir' : 'Durdur'}
        </button>
        <button class="btn-danger delete-tournament-btn" style="padding:8px 16px;font-size:13px;white-space:nowrap;" data-id="${t.id}">
          <span aria-hidden="true">🗑️</span> Sil
        </button>
      </div>
    `;
    
    // Düzenle
    row.querySelector('.open-edit-trigger').addEventListener('click', () => {
      editingTournamentId = t.id;
      document.getElementById('editTName').value = t.name;
      document.getElementById('editTMaxTeams').value = max;
      document.getElementById('editTRules').value = t.rules || '';
      document.getElementById('editTCategory').value = t.category || 'fps';
      document.getElementById('editTWebhook').value = t.webhookUrl || '';
      document.getElementById('editTSizeDisabled').value = `${t.teamSize} Kişilik Roster`;
      document.getElementById('editTIdDisabled').value = t.id;
      const sec = document.getElementById('editTournamentSection');
      sec.style.display = 'block';
      setTimeout(() => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    });
    
    // Derve Dışı / Durdur — Özellik #1
    row.querySelector('.pause-tournament-btn').addEventListener('click', async () => {
      const action = isPaused ? 'resume' : 'pause';
      const title = isPaused ? 'Turnuvayı Devam Ettir' : 'Turnuvayı Durdur';
      const msg = isPaused ? `"${t.name}" turnuvasını aktif etmek istediğinize emin misiniz?` : `"${t.name}" turnuvasını durdurmak istediğinize emin misiniz? Başvurular askıya alınacak.`;
      const confirmed = await showConfirm(title, msg, isPaused ? '▶️' : '⏸️');
      if (!confirmed) return;
      try {
        await updateDoc(doc(db, "tournaments", t.id), { status: isPaused ? 'active' : 'paused' });
        await logActivity(isPaused ? 'resume_tournament' : 'pause_tournament', `"${t.name}" turnuvası ${isPaused ? 'aktif' : 'durduruldu'}`);
        showToast("Başarılı", isPaused ? 'Turnuva aktif edildi.' : 'Turnuva durduruldu.', "success");
      } catch (err) { showToast("Hata", err.message, "error"); }
    });
    
    // Sil
    row.querySelector('.delete-tournament-btn').addEventListener('click', async () => {
      const appCount = allApplicationsList.filter(a => a.tournamentId === t.id).length;
      let warningMsg = `"${t.name}" turnuvasını silmek istediğinize emin misiniz?`;
      if (appCount > 0) warningMsg += `\n\n⚠️ BU TURNUVAYA ${appCount} BAŞVURU BULUNUYOR!\nSilme işlemi tüm başvuruları da silecektir.`;
      const confirmed = await showConfirm("Turnuva Silme", warningMsg, "🗑️");
      if (!confirmed) return;
      try {
        showLoader("SİLİNİYOR");
        const batch = writeBatch(db);
        const appsToDelete = allApplicationsList.filter(a => a.tournamentId === t.id);
        for (const app of appsToDelete) batch.delete(doc(db, "applications", app.id));
        await batch.commit();
        await deleteDoc(doc(db, "tournaments", t.id));
        await logActivity('delete_tournament', `"${t.name}" turnuvası ve ${appsToDelete.length} başvuru silindi`);
        showToast("Başarılı", "Turnuva ve bağlı başvurular silindi.", "success");
      } catch (err) { showToast("Hata", "Silme işlemi başarısız: " + err.message, "error"); }
      finally { hideLoader(); }
    });
    
    container.appendChild(row);
  });
}

// ── Turnuva Güncelle — Özellik #2, #6 (Kategori, Webhook) ──
document.getElementById('saveEditTBtn').addEventListener('click', async () => {
  if (!editingTournamentId) return;
  const confirmed = await showConfirm("Güncelleme Onayı", "Turnuva bilgilerini güncellemek istediğinize emin misiniz?", "🛠️");
  if (!confirmed) return;
  const btn = document.getElementById('saveEditTBtn');
  const name = document.getElementById('editTName').value.trim();
  const maxTeams = document.getElementById('editTMaxTeams').value;
  const rules = document.getElementById('editTRules').value.trim();
  const category = document.getElementById('editTCategory').value;
  const webhook = document.getElementById('editTWebhook').value.trim();
  if (!name || !maxTeams || !rules) { showToast("Hata", "Tüm alanları doldurunuz.", "error"); return; }
  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span aria-hidden="true">⏳</span> İşleniyor...';
  try {
    await updateDoc(doc(db, "tournaments", editingTournamentId), { name, maxTeams: parseInt(maxTeams), rules, category, webhookUrl: webhook });
    await logActivity('update_tournament', `"${name}" turnuvası güncellendi`);
    showToast("Başarılı", "Güncellendi! Esporcuların kayıtları korundu.", "success");
    document.getElementById('editTournamentSection').style.display = 'none';
    editingTournamentId = null;
  } catch (err) {
    console.error(err);
    showToast("Hata", "Güncelleme hatası: " + err.message, "error");
  } finally { btn.disabled = false; btn.innerHTML = originalText; }
});

document.getElementById('cancelEditTBtn').addEventListener('click', () => {
  document.getElementById('editTournamentSection').style.display = 'none';
  editingTournamentId = null;
});

// ── Basvuru Listesi — Özellik #3, #4 (Admin Notu, Öncelik) ──
function loadApplicationsList() {
  const filtered = getFilteredApplications();
  applicationsList.innerHTML = '';
  let counter = 0;

  filtered.forEach(data => {
    counter++;
    const tInfo = tournamentsDataList.find(x => x.id === data.tournamentId) || { name: 'Bilinmeyen Turnuva', teamSize: 3 };

    let playersHtml = '';
    (data.players || []).forEach((p, idx) => {
      playersHtml += `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:8px;background:rgba(255,255,255,0.02);border-radius:8px;">
          <span class="player-avatar" style="width:28px;height:28px;font-size:12px;" aria-hidden="true">${idx+1}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;color:#fff;">${p.name||'-'}</div>
            <div style="font-size:11px;color:var(--text-muted);">${p.email||'-'}</div>
          </div>
          <a href="${p.yt||'#'}" target="_blank" rel="noopener" style="color:var(--accent-cyan);text-decoration:none;font-size:12px;font-weight:600;white-space:nowrap;">Medya ↗</a>
        </div>`;
    });

    const card = document.createElement('div');
    card.className = 'accordion-item';
    card.style.animationDelay = `${counter * 0.03}s`;
    const isSelected = selectedAppIds.has(data.id);

    const statusBadge = data.status === 'onaylandi' ? '✅ Onaylandı' : data.status === 'reddedildi' ? '❌ Reddedildi' : data.status === 'bekleme' ? '📋 Bekleme' : '⏳ Bekliyor';
    const statusColor = data.status === 'onaylandi' ? 'var(--accent-green)' : data.status === 'reddedildi' ? 'var(--accent-red)' : data.status === 'bekleme' ? 'var(--accent-cyan)' : 'var(--accent-gold)';

    // Admin notu — Özellik #3
    const adminNoteHtml = data.adminNote ? `<div class="admin-note-box"><strong>📝 Admin Notu:</strong> ${data.adminNote}</div>` : '';

    // Öncelik yıldızları — Özellik #4
    const priority = data.priority || 0;
    let starsHtml = '<div class="priority-stars" style="margin-top:8px;">';
    for (let s = 1; s <= 5; s++) {
      starsHtml += `<span class="priority-star ${s <= priority ? 'active' : ''}" data-app="${data.id}" data-star="${s}">★</span>`;
    }
    starsHtml += '</div>';

    card.innerHTML = `
      <div class="accordion-header" role="button" tabindex="0" aria-expanded="false">
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">
          <input type="checkbox" class="app-checkbox" data-id="${data.id}" ${isSelected ? 'checked' : ''} 
            style="width:18px;height:18px;accent-color:var(--accent-gold);cursor:pointer;flex-shrink:0;" 
            onclick="event.stopPropagation()">
          <img src="${data.logoUrl||''}" style="width:36px;height:36px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">
          <div style="min-width:0;">
            <div style="font-weight:700;color:#fff;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${data.teamName}</div>
            <div style="font-size:11px;color:var(--text-muted);">🏆 ${tInfo.name} | <span style="color:${statusColor};">${statusBadge}</span></div>
          </div>
        </div>
        <span class="accordion-arrow" aria-hidden="true">▼</span>
      </div>
      <div class="accordion-content" style="display:none;">
        <div style="margin-bottom:16px;">
          <p style="font-size:11px;color:var(--text-muted);margin-bottom:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">Kadro Detayı</p>
          ${playersHtml}
          ${adminNoteHtml}
          ${starsHtml}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn-success btn-approve" style="flex:1;min-width:100px;padding:12px;border-radius:8px;" ${data.status !== 'bekliyor' && data.status !== 'bekleme' ? 'disabled' : ''}>
            <span aria-hidden="true">✔</span> Kabul Et
          </button>
          <button class="btn-danger btn-reject" style="flex:1;min-width:100px;padding:12px;border-radius:8px;" ${data.status !== 'bekliyor' && data.status !== 'bekleme' ? 'disabled' : ''}>
            <span aria-hidden="true">✕</span> Reddet
          </button>
          <button class="btn-ghost btn-detail" style="padding:12px;border-radius:8px;" data-id="${data.id}">
            <span aria-hidden="true">👁️</span> Detay
          </button>
          <button class="btn-ghost btn-note" style="padding:12px;border-radius:8px;" data-id="${data.id}">
            <span aria-hidden="true">📝</span> Not Ekle
          </button>
        </div>
      </div>
    `;

    const header = card.querySelector('.accordion-header');
    const content = card.querySelector('.accordion-content');
    const arrow = card.querySelector('.accordion-arrow');
    const checkbox = card.querySelector('.app-checkbox');

    header.addEventListener('click', () => {
      const open = content.style.display === 'block';
      content.style.display = open ? 'none' : 'block';
      arrow.textContent = open ? '▼' : '▲';
      header.setAttribute('aria-expanded', !open);
      if (!open) content.classList.add('open');
    });
    header.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); header.click(); } });
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedAppIds.add(data.id);
      else selectedAppIds.delete(data.id);
      updateBatchBar();
    });

    // Öncelik yıldızları — Özellik #4
    card.querySelectorAll('.priority-star').forEach(star => {
      star.addEventListener('click', async (e) => {
        e.stopPropagation();
        const starVal = parseInt(star.dataset.star);
        const appId = star.dataset.app;
        try {
          await updateDoc(doc(db, "applications", appId), { priority: starVal });
          showToast("Başarılı", `Öncelik ${starVal} yıldız olarak güncellendi.`, "success");
        } catch (err) { showToast("Hata", err.message, "error"); }
      });
    });

    // Admin notu ekle — Özellik #3
    card.querySelector('.btn-note').addEventListener('click', async (e) => {
      e.stopPropagation();
      const note = prompt('Admin notu giriniz:', data.adminNote || '');
      if (note === null) return;
      try {
        await updateDoc(doc(db, "applications", data.id), { adminNote: note });
        showToast("Başarılı", "Not kaydedildi.", "success");
      } catch (err) { showToast("Hata", err.message, "error"); }
    });

    const p1Email = data.players?.[0]?.email || '';
    const p1Name = data.players?.[0]?.name || 'Kaptan';

    if (data.status === 'bekliyor' || data.status === 'bekleme') {
      card.querySelector('.btn-approve').addEventListener('click', () => handleAction(data.id, 'onayla', p1Email, data.teamName, tInfo.name, p1Name, data.players, tInfo.teamSize));
      card.querySelector('.btn-reject').addEventListener('click', () => handleAction(data.id, 'reddet', p1Email, data.teamName, tInfo.name, p1Name, data.players, tInfo.teamSize));
    }

    card.querySelector('.btn-detail').addEventListener('click', () => openAdminAppDetail(data.id));
    applicationsList.appendChild(card);
  });

  if (counter === 0) {
    applicationsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">📭</div>
        <div class="empty-title">Başvuru Bulunamadı</div>
        Seçilen filtrelere uygun başvuru bulunmuyor.
      </div>`;
  }
}

// ── Basvuru Detay Modal (Admin) ────────────────────────────────
function openAdminAppDetail(appId) {
  const app = allApplicationsList.find(a => a.id === appId);
  if (!app) return;
  const t = tournamentsDataList.find(x => x.id === app.tournamentId) || { name: 'Bilinmeyen' };
  const modal = document.getElementById('adminAppDetailModal');
  const content = document.getElementById('adminAppDetailContent');
  if (!modal || !content) return;

  const sColor = app.status === 'onaylandi' ? 'var(--accent-green)' : app.status === 'reddedildi' ? 'var(--accent-red)' : app.status === 'bekleme' ? 'var(--accent-cyan)' : 'var(--accent-gold)';
  const sText = app.status === 'onaylandi' ? '✅ Onaylandı' : app.status === 'reddedildi' ? '❌ Reddedildi' : app.status === 'bekleme' ? '📋 Bekleme' : '⏳ Bekliyor';

  let playersHtml = '';
  (app.players || []).forEach((p, idx) => {
    playersHtml += `
      <div class="player-detail-row">
        <div class="player-detail-num">${idx + 1}</div>
        <div class="player-detail-info">
          <div class="player-detail-name">${p.name || '-'}</div>
          <div class="player-detail-email">${p.email || '-'}</div>
        </div>
        <a href="${p.yt || '#'}" target="_blank" rel="noopener" class="player-detail-link">Medya ↗</a>
      </div>
    `;
  });

  content.innerHTML = `
    <div class="app-detail-header">
      <img src="${app.logoUrl || 'tms.png'}" alt="${app.teamName}" class="app-detail-logo" onerror="this.src='tms.png'">
      <div>
        <div class="app-detail-title">${app.teamName}</div>
        <div class="app-detail-subtitle">🏆 ${t.name}</div>
      </div>
    </div>
    <div class="app-detail-section">
      <h4>📊 Durum</h4>
      <span class="my-app-status" style="color:${sColor};border-color:${sColor};">${sText}</span>
      ${app.adminNote ? `<div class="admin-note-box" style="margin-top:12px;"><strong>📝 Admin Notu:</strong> ${app.adminNote}</div>` : ''}
      ${app.rejectionReason ? `<div style="margin-top:12px;padding:12px;background:rgba(255,95,86,0.05);border-radius:8px;border:1px solid rgba(255,95,86,0.2);"><strong style="color:var(--accent-red);">Red Gerekçesi:</strong> <span style="color:var(--text-secondary);font-size:13px;">${app.rejectionReason}</span></div>` : ''}
    </div>
    <div class="app-detail-section"><h4>👥 Kadro</h4>${playersHtml}</div>
    <div class="app-detail-section">
      <h4>📅 Başvuru Tarihi</h4>
      <div style="color:var(--text-secondary);font-size:14px;">
        ${app.timestamp ? new Date(app.timestamp.toDate ? app.timestamp.toDate() : app.timestamp).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Bilinmiyor'}
      </div>
    </div>
    ${app.status === 'bekliyor' || app.status === 'bekleme' ? `
    <div style="display:flex;gap:12px;margin-top:20px;">
      <button class="btn-success" style="flex:1;" id="detailApproveBtn">✔ Onayla</button>
      <button class="btn-danger" style="flex:1;" id="detailRejectBtn">✕ Reddet</button>
    </div>
    ` : ''}
  `;

  modal.classList.add('open');
  document.getElementById('detailApproveBtn')?.addEventListener('click', () => {
    const p1Email = app.players?.[0]?.email || '';
    const p1Name = app.players?.[0]?.name || 'Kaptan';
    handleAction(app.id, 'onayla', p1Email, app.teamName, t.name, p1Name, app.players, t.teamSize);
    modal.classList.remove('open');
  });
  document.getElementById('detailRejectBtn')?.addEventListener('click', () => {
    const p1Email = app.players?.[0]?.email || '';
    const p1Name = app.players?.[0]?.name || 'Kaptan';
    handleAction(app.id, 'reddet', p1Email, app.teamName, t.name, p1Name, app.players, t.teamSize);
    modal.classList.remove('open');
  });
}

document.getElementById('adminAppDetailClose')?.addEventListener('click', () => {
  document.getElementById('adminAppDetailModal')?.classList.remove('open');
});

// ── Onayla / Reddet — Özellik #6 (Discord Webhook) ─────────────
async function handleAction(docId, action, p1Email, teamName, tournamentName, captainName, players, teamSize) {
  const isApproved = action === 'onayla';
  let rejectionReason = '';
  if (!isApproved) {
    rejectionReason = await showRejectionReasonDialog(teamName);
    if (rejectionReason === null) return;
  } else {
    const confirmed = await showConfirm("Başvuru Onayı", `"${teamName}" takımını onaylamak istediğinize emin misiniz?`, "✅");
    if (!confirmed) return;
  }

  try {
    const now = new Date();
    const appDate = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    const tInfo = tournamentsDataList.find(t => t.name === tournamentName);
    const tLogo = tInfo?.logoUrl || '';
    const tDeadline = tInfo?.deadline || '';
    const sizeText = teamSize == 1 ? '1v1 Solo' : `${teamSize}v${teamSize}`;
    const playerList = players || [];
    const p1 = playerList[0] || {}; const p2 = playerList[1] || {}; const p3 = playerList[2] || {};
    const p4 = playerList[3] || {}; const p5 = playerList[4] || {};

    const templateParams = {
      to_email: p1Email, captain_name: captainName || 'Kaptan', team_name: teamName,
      tournament_name: tournamentName || 'TMŞ Turnuvası', tournament_logo: tLogo, team_size: sizeText,
      application_date: appDate, tournament_deadline: tDeadline,
      tournament_url: `${window.location.origin}${window.location.pathname.replace('admin.html', 'index.html')}`,
      youtube_url: 'https://youtube.com', twitter_url: 'https://twitter.com', instagram_url: 'https://instagram.com', discord_url: 'https://discord.gg',
      admin_name: currentUser?.email?.split('@')[0] || 'Admin',
      player1_name: p1.name || '-', player1_email: p1.email || '-',
      player2_name: p2.name || '-', player2_email: p2.email || '-',
      player3_name: p3.name || '-', player3_email: p3.email || '-',
      player4_name: p4.name || '-', player4_email: p4.email || '-',
      player5_name: p5.name || '-', player5_email: p5.email || '-',
      rejection_reason: rejectionReason || ''
    };

    if (typeof emailjs !== 'undefined' && p1Email) {
      await emailjs.send('service_bftdxcy', isApproved ? 'template_01nnh1s' : 'template_cpy48jt', templateParams);
    }

    await updateDoc(doc(db, "applications", docId), {
      status: isApproved ? "onaylandi" : "reddedildi",
      ...(rejectionReason && { rejectionReason }),
      processedAt: new Date(), processedBy: currentUser?.email || 'Admin'
    });

    // Discord Webhook — Özellik #6
    if (tInfo?.webhookUrl) {
      const webhookBody = {
        content: isApproved ? `✅ **${teamName}** başvurusu **${tournamentName}** turnuvasında onaylandı!` : `❌ **${teamName}** başvurusu reddedildi.`,
        embeds: [{ title: teamName, description: `Kaptan: ${captainName}\nE-posta: ${p1Email}`, color: isApproved ? 0x00c853 : 0xff5f56 }]
      };
      fetch(tInfo.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(webhookBody) }).catch(() => {});
    }

    await logActivity(isApproved ? 'approve_application' : 'reject_application', `"${teamName}" takımı ${isApproved ? 'onaylandı' : 'reddedildi'}`);
    showToast("Başarılı", `İşlem tamamlandı! Kaptana e-posta iletildi.`, "success");
  } catch (err) {
    console.error(err);
    showToast("Hata", "İşlem sırasında sorun: " + err.message, "error");
  }
}

// ── Admin Yönetimi ─────────────────────────────────────────────
document.getElementById('addAdminBtn')?.addEventListener('click', async () => {
  if (currentUser?.email !== SUPER_ADMIN_EMAIL) { showToast("Yetkisiz", "Sadece Super Admin yeni admin ekleyebilir.", "error"); return; }
  const email = document.getElementById('newAdminEmail').value.trim().toLowerCase();
  const name = document.getElementById('newAdminName').value.trim();
  const role = document.getElementById('newAdminRole').value;
  if (!email || !name) { showToast("Hata", "Tüm alanları doldurunuz.", "error"); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast("Hata", "Geçerli e-posta giriniz.", "error"); return; }
  try {
    showLoader("EKLENİYOR");
    await addDoc(collection(db, "admins"), { email, name, role, addedBy: currentUser.email, createdAt: new Date() });
    await logActivity('add_admin', `"${name}" (${email}) admin olarak eklendi`);
    showToast("Başarılı", `"${name}" admin olarak eklendi.`, "success");
    document.getElementById('newAdminEmail').value = '';
    document.getElementById('newAdminName').value = '';
  } catch (err) { showToast("Hata", "Admin eklenirken hata: " + err.message, "error"); }
  finally { hideLoader(); }
});

function loadAdminList() {
  const container = document.getElementById('adminListContainer');
  if (!container) return;
  container.innerHTML = '';
  if (adminsList.length === 0) {
    container.innerHTML = `<div class="empty-state-small"><div style="font-size:32px;margin-bottom:8px;" aria-hidden="true">👤</div><div style="color:var(--text-secondary);font-weight:700;margin:8px 0;">Admin Bulunamadı</div><div style="color:var(--text-dark);font-size:13px;">Henüz admin eklenmemiş.</div></div>`;
    return;
  }
  adminsList.forEach(admin => {
    const isSuper = admin.email === SUPER_ADMIN_EMAIL;
    const roleClass = isSuper ? 'admin-role-super' : admin.role === 'admin' ? 'admin-role-admin' : 'admin-role-moderator';
    const roleText = isSuper ? 'Super Admin' : admin.role === 'admin' ? 'Admin' : 'Moderatör';
    const item = document.createElement('div');
    item.className = 'admin-list-item';
    item.innerHTML = `
      <div class="admin-list-info">
        <div class="admin-avatar">${(admin.name || admin.email).charAt(0).toUpperCase()}</div>
        <div>
          <div class="admin-email">${admin.name || admin.email}</div>
          <div style="font-size:12px;color:var(--text-muted);">${admin.email}</div>
          <div class="admin-added">${admin.addedBy ? admin.addedBy + ' tarafından eklendi' : ''}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <span class="admin-role-badge ${roleClass}">${roleText}</span>
        ${!isSuper && currentUser?.email === SUPER_ADMIN_EMAIL ? `<button class="btn-danger remove-admin-btn" style="padding:6px 14px;font-size:12px;" data-id="${admin.id}">🗑️ Kaldır</button>` : ''}
      </div>
    `;
    const removeBtn = item.querySelector('.remove-admin-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', async () => {
        const confirmed = await showConfirm("Admin Kaldır", `"${admin.name || admin.email}" admin yetkisini kaldırmak istediğinize emin misiniz?`, "🗑️");
        if (!confirmed) return;
        try {
          await deleteDoc(doc(db, "admins", admin.id));
          await logActivity('remove_admin', `"${admin.name || admin.email}" adminliğinden kaldırıldı`);
          showToast("Başarılı", "Admin kaldırıldı.", "success");
        } catch (err) { showToast("Hata", "Kaldırma işlemi başarısız: " + err.message, "error"); }
      });
    }
    container.appendChild(item);
  });
}

// ── Aktivite Logları ───────────────────────────────────────────
async function logActivity(action, description) {
  try {
    await addDoc(collection(db, "activityLogs"), {
      action, description, adminEmail: currentUser?.email || 'Bilinmeyen',
      adminName: currentUser?.displayName || currentUser?.email || 'Bilinmeyen', timestamp: new Date()
    });
  } catch (err) { console.warn("Log kaydedilemedi:", err); }
}

function loadActivityLogs() {
  const container = document.getElementById('activityLogContainer');
  if (!container) return;
  container.innerHTML = '';
  if (activityLogs.length === 0) { container.innerHTML = '<div class="empty-state-small">Henüz aktivite kaydı bulunmuyor.</div>'; return; }
  const icons = { approve_application: '✅', reject_application: '❌', batch_approve: '✅', batch_reject: '❌', batch_bekleme: '📋', create_tournament: '🚀', update_tournament: '🛠️', delete_tournament: '🗑️', pause_tournament: '⏸️', resume_tournament: '▶️', add_admin: '➕', remove_admin: '➖', login: '🔐' };
  const classes = { approve_application: 'approve', reject_application: 'reject', batch_approve: 'approve', batch_reject: 'reject', batch_bekleme: 'create', create_tournament: 'create', delete_tournament: 'delete', pause_tournament: 'reject', resume_tournament: 'approve', add_admin: 'create', remove_admin: 'delete', login: 'login' };
  
  activityLogs.slice(0, 50).forEach(log => {
    const item = document.createElement('div');
    item.className = 'activity-log-item';
    const icon = icons[log.action] || '📋';
    const cls = classes[log.action] || 'login';
    const time = log.timestamp ? new Date(log.timestamp.toDate ? log.timestamp.toDate() : log.timestamp).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';
    item.innerHTML = `
      <div class="activity-icon ${cls}">${icon}</div>
      <div class="activity-content">
        <div class="activity-text"><strong>${log.adminName || log.adminEmail}</strong> ${log.description}</div>
        <div class="activity-time">${time}</div>
      </div>
    `;
    container.appendChild(item);
  });
}

// ── İstatistik Grafikleri — Özellik #10 ────────────────────────
function renderCharts() {
  renderMonthlyChart();
  renderTournamentChart();
  renderStatusChart();
}

function renderMonthlyChart() {
  const canvas = document.getElementById('monthlyChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const months = []; const counts = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toLocaleDateString('tr-TR', { month: 'short' }));
    const count = allApplicationsList.filter(a => {
      if (!a.timestamp) return false;
      const appDate = new Date(a.timestamp.toDate ? a.timestamp.toDate() : a.timestamp);
      return appDate.getMonth() === d.getMonth() && appDate.getFullYear() === d.getFullYear();
    }).length;
    counts.push(count);
  }
  const maxCount = Math.max(...counts, 1);
  const barWidth = 40; const gap = 30; const chartHeight = 160; const startX = 40; const startY = 20;
  canvas.width = Math.max(400, months.length * (barWidth + gap) + startX + 20);
  canvas.height = chartHeight + 60;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { const y = startY + (chartHeight / 4) * i; ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(canvas.width - 20, y); ctx.stroke(); }
  months.forEach((month, i) => {
    const x = startX + i * (barWidth + gap);
    const height = (counts[i] / maxCount) * chartHeight;
    const y = startY + chartHeight - height;
    const gradient = ctx.createLinearGradient(0, y, 0, y + height);
    gradient.addColorStop(0, '#f39c12'); gradient.addColorStop(1, '#e67e22');
    ctx.fillStyle = gradient; ctx.beginPath(); ctx.roundRect(x, y, barWidth, height, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(counts[i], x + barWidth / 2, y - 8);
    ctx.fillStyle = 'var(--text-muted)'; ctx.font = '11px sans-serif';
    ctx.fillText(month, x + barWidth / 2, startY + chartHeight + 20);
  });
}

function renderTournamentChart() {
  const canvas = document.getElementById('tournamentChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const tournamentStats = tournamentsDataList.map(t => {
    const appCount = allApplicationsList.filter(a => a.tournamentId === t.id).length;
    return { name: t.name, count: appCount };
  }).sort((a, b) => b.count - a.count).slice(0, 6);
  if (tournamentStats.length === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'var(--text-muted)'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Henüz veri bulunmuyor', canvas.width / 2, canvas.height / 2); return;
  }
  const maxCount = Math.max(...tournamentStats.map(t => t.count), 1);
  const barHeight = 24; const gap = 16; const chartWidth = 300; const startX = 150; const startY = 20;
  canvas.width = 500; canvas.height = tournamentStats.length * (barHeight + gap) + 40;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  tournamentStats.forEach((t, i) => {
    const y = startY + i * (barHeight + gap);
    const width = (t.count / maxCount) * chartWidth;
    ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'right';
    const shortName = t.name.length > 18 ? t.name.substring(0, 18) + '...' : t.name;
    ctx.fillText(shortName, startX - 10, y + barHeight / 2 + 4);
    const gradient = ctx.createLinearGradient(startX, 0, startX + width, 0);
    gradient.addColorStop(0, '#f39c12'); gradient.addColorStop(1, '#e67e22');
    ctx.fillStyle = gradient; ctx.beginPath(); ctx.roundRect(startX, y, Math.max(width, 4), barHeight, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(t.count, startX + width + 8, y + barHeight / 2 + 4);
  });
}

// Durum dağılım grafiği — Özellik #10
function renderStatusChart() {
  const canvas = document.getElementById('statusChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const statuses = ['onaylandi', 'reddedildi', 'bekliyor', 'bekleme'];
  const labels = ['Onaylı', 'Reddedilen', 'Bekleyen', 'Bekleme'];
  const colors = ['#00c853', '#ff5f56', '#f39c12', '#a78bfa'];
  const counts = statuses.map(s => allApplicationsList.filter(a => a.status === s).length);
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  
  canvas.width = 400; canvas.height = 200;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  let startAngle = 0;
  const centerX = 120; const centerY = 100; const radius = 80;
  
  counts.forEach((count, i) => {
    const sliceAngle = (count / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    startAngle += sliceAngle;
  });
  
  // Legend
  let legendY = 60;
  labels.forEach((label, i) => {
    ctx.fillStyle = colors[i];
    ctx.fillRect(240, legendY, 12, 12);
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${label}: ${counts[i]}`, 260, legendY + 10);
    legendY += 24;
  });
}

// ── Araçlar Sekmesi — Özellik #7, #9 ─────────────────────────
function loadToolsData() {
  const sel = document.getElementById('bulkEmailTournament');
  if (!sel) return;
  sel.innerHTML = '<option value="all">Tüm Onaylı Takımlar</option>';
  tournamentsDataList.forEach(t => {
    const o = document.createElement('option');
    o.value = t.id; o.textContent = t.name;
    sel.appendChild(o);
  });
}

// Toplu E-posta — Özellik #7
document.getElementById('sendBulkEmailBtn')?.addEventListener('click', async () => {
  const tourId = document.getElementById('bulkEmailTournament').value;
  const subject = document.getElementById('bulkEmailSubject').value.trim();
  const body = document.getElementById('bulkEmailBody').value.trim();
  if (!subject || !body) { showToast("Hata", "Konu ve mesaj giriniz.", "error"); return; }
  
  let targets = allApplicationsList.filter(a => a.status === 'onaylandi');
  if (tourId !== 'all') targets = targets.filter(a => a.tournamentId === tourId);
  if (targets.length === 0) { showToast("Uyarı", "Hedef kitle bulunamadı.", "warning"); return; }
  
  showLoader("E-POSTA GÖNDERİLİYOR");
  let sent = 0;
  for (const t of targets) {
    const captainEmail = t.players?.[0]?.email;
    if (!captainEmail) continue;
    try {
      await emailjs.send('service_bftdxcy', 'template_01nnh1s', {
        to_email: captainEmail, subject, message: body, team_name: t.teamName
      });
      sent++;
    } catch (e) { console.warn("E-posta hatası:", e); }
  }
  hideLoader();
  showToast("Başarılı", `${sent} takıma e-posta gönderildi.`, "success");
  await logActivity('bulk_email', `${sent} takıma toplu e-posta gönderildi`);
});

// Veri Yedekleme — Özellik #9
document.getElementById('exportBackupBtn')?.addEventListener('click', async () => {
  const backup = {
    tournaments: tournamentsDataList,
    applications: allApplicationsList,
    admins: adminsList,
    exportedAt: new Date().toISOString(),
    version: '3.0'
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `tms_backup_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  showToast("Başarılı", "Yedek indirildi.", "success");
});

// Veri İçe Aktar — Özellik #9
const importZone = document.getElementById('importBackupZone');
const importInput = document.getElementById('importBackupInput');
importZone?.addEventListener('click', () => importInput.click());
importInput?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    showLoader("İÇE AKTARILIYOR");
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data.tournaments || !data.applications) throw new Error("Geçersiz yedek dosyası");
    
    // Turnuvaları ekle
    for (const t of data.tournaments) {
      const { id, ...rest } = t;
      await addDoc(collection(db, "tournaments"), { ...rest, importedAt: new Date() });
    }
    // Başvuruları ekle
    for (const a of data.applications) {
      const { id, ...rest } = a;
      await addDoc(collection(db, "applications"), { ...rest, importedAt: new Date() });
    }
    hideLoader();
    showToast("Başarılı", `${data.tournaments.length} turnuva ve ${data.applications.length} başvuru içe aktarıldı.`, "success");
    await logActivity('import_backup', 'Yedek içe aktarıldı');
  } catch (err) {
    hideLoader();
    showToast("Hata", "İçe aktarma başarısız: " + err.message, "error");
  }
});

// ── Webhook Test — Özellik #6 ─────────────────────────────────
document.getElementById('testWebhookBtn')?.addEventListener('click', async () => {
  const url = document.getElementById('testWebhookUrl').value.trim();
  if (!url) { showToast("Hata", "Webhook URL giriniz.", "error"); return; }
  try {
    showLoader("TEST EDİLİYOR");
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '🧪 TMŞ Webhook test mesajı! Başarılı bağlantı.' })
    });
    hideLoader();
    if (res.ok) showToast("Başarılı", "Test mesajı Discord'a gönderildi.", "success");
    else showToast("Hata", "Webhook hatası: " + res.status, "error");
  } catch (err) {
    hideLoader();
    showToast("Hata", "Webhook test başarısız: " + err.message, "error");
  }
});

// ── PIN Değiştirme ─────────────────────────────────────────────
document.getElementById('changePinBtn')?.addEventListener('click', async () => {
  const currentPin = document.getElementById('currentPin').value.trim();
  const newPin = document.getElementById('newPin').value.trim();
  const confirmNewPin = document.getElementById('confirmNewPin').value.trim();
  const hint = document.getElementById('pinChangeHint');

  if (!currentPin || !newPin || !confirmNewPin) {
    hint.textContent = '❌ Tüm alanları doldurunuz';
    hint.className = 'hint-text error';
    return;
  }
  if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin)) {
    hint.textContent = '❌ PIN 4 haneli sayı olmalıdır';
    hint.className = 'hint-text error';
    return;
  }
  if (newPin !== confirmNewPin) {
    hint.textContent = '❌ Yeni PINler eşleşmiyor';
    hint.className = 'hint-text error';
    return;
  }
  if (currentPin === newPin) {
    hint.textContent = '❌ Yeni PIN mevcut PINden farklı olmalıdır';
    hint.className = 'hint-text error';
    return;
  }

  try {
    showLoader("PIN GÜNCELLENİYOR");
    const adminDoc = await getDoc(doc(db, "admins", currentUser.uid));
    if (!adminDoc.exists()) {
      hint.textContent = '❌ Admin bilgisi bulunamadı';
      hint.className = 'hint-text error';
      hideLoader();
      return;
    }
    if (adminDoc.data().pin !== currentPin) {
      hint.textContent = '❌ Mevcut PIN hatalı';
      hint.className = 'hint-text error';
      hideLoader();
      return;
    }

    await updateDoc(doc(db, "admins", currentUser.uid), {
      pin: newPin,
      updatedAt: new Date()
    });

    await logActivity('change_pin', 'PIN kodu değiştirildi');

    hint.textContent = '✅ PIN başarıyla değiştirildi';
    hint.className = 'hint-text success';

    document.getElementById('currentPin').value = '';
    document.getElementById('newPin').value = '';
    document.getElementById('confirmNewPin').value = '';

    showToast("Başarılı", "PIN kodunuz güncellendi. Bir sonraki girişte yeni PINi kullanın.", "success", 5000);

  } catch (err) {
    hint.textContent = '❌ PIN değiştirme hatası: ' + err.message;
    hint.className = 'hint-text error';
    showToast("Hata", "PIN değiştirme başarısız: " + err.message, "error");
  } finally {
    hideLoader();
  }
});

// ── ESC ile modal kapat ──────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    confirmModal.classList.remove('open');
    document.getElementById('adminAppDetailModal')?.classList.remove('open');
  }
});
window.addEventListener('click', e => {
  if (e.target === confirmModal) confirmModal.classList.remove('open');
  if (e.target === document.getElementById('adminAppDetailModal')) {
    document.getElementById('adminAppDetailModal')?.classList.remove('open');
  }
});

// ── Cleanup ──────────────────────────────────────────────────────
window.addEventListener('beforeunload', () => {
  if (unsubscribeTournaments) unsubscribeTournaments();
  if (unsubscribeApplications) unsubscribeApplications();
  if (unsubscribeAdmins) unsubscribeAdmins();
  if (unsubscribeLogs) unsubscribeLogs();
});

// ── Initialization ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  setupPinVerification();

  // Admin Tema Toggle
  const themeBtn = document.getElementById('adminThemeToggle');
  const savedTheme = localStorage.getItem('tms_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (themeBtn) themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  
  themeBtn?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tms_theme', next);
    themeBtn.textContent = next === 'dark' ? '☀️' : '🌙';
  });

  // Admin Dil Toggle
  const langBtn = document.getElementById('adminLangToggle');
  const savedLang = localStorage.getItem('tms_lang') || 'tr';
  document.documentElement.lang = savedLang;
  if (langBtn) langBtn.textContent = savedLang === 'tr' ? '🇹🇷' : '🇬🇧';
  
  langBtn?.addEventListener('click', () => {
    const current = document.documentElement.lang || 'tr';
    const next = current === 'tr' ? 'en' : 'tr';
    document.documentElement.lang = next;
    localStorage.setItem('tms_lang', next);
    langBtn.textContent = next === 'tr' ? '🇹🇷' : '🇬🇧';
    showToast("Dil", next === 'tr' ? 'Türkçe' : 'English', "info", 2000);
  });
});
      
