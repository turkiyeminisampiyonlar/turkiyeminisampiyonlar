import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import {
  getFirestore, collection, getDocs, doc, updateDoc, addDoc,
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

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getFirestore(app);
const provider = new GoogleAuthProvider();

const IMGBB_API_KEY = "43c8e0a8c3277336886330d1172f988a";
const ADMIN_EMAIL   = "necron.offical@gmail.com";

// ── DOM Elements ─────────────────────────────────────────────────
const loader           = document.getElementById('tms-loader');
const toastContainer   = document.getElementById('toastContainer');
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
const confirmModal     = document.getElementById('confirmModal');
const refreshAppsBtn   = document.getElementById('refreshAppsBtn');
const batchBar         = document.getElementById('batchBar');
const batchCount       = document.getElementById('batchCount');

let tournamentsDataList = [];
let allApplicationsList = [];
let editingTournamentId = null;
let dashboardLoaded     = false;
let selectedAppIds      = new Set();
let unsubscribeTournaments = null;
let unsubscribeApplications = null;

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

  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }
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

    const onKey = (e) => {
      if (e.key === 'Escape') { cleanup(); resolve(false); document.removeEventListener('keydown', onKey); }
    };
    document.addEventListener('keydown', onKey);
  });
}

// ── Rejection Reason Dialog ──────────────────────────────────────
function showRejectionReasonDialog(teamName) {
  return new Promise(resolve => {
    // Create custom modal for rejection reason
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
            <strong style="color:#fff;">${teamName}</strong> takımının başvurusunu reddetmek üzeresiniz. Lütfen gerekçeyi açıklayın:
          </p>
          <div class="input-group" style="text-align:left;margin-bottom:20px;">
            <label style="display:block;margin-bottom:8px;">Red Gerekçesi <span class="required">*</span></label>
            <textarea id="rejectionReasonInput" rows="4" placeholder="Örn: Eksik bilgi, kurallara uygun değil, kontenjan dolu..." 
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

    const cleanup = () => {
      modal.remove();
      document.removeEventListener('keydown', onKey);
    };

    const onConfirm = () => {
      const reason = input.value.trim();
      if (!reason) {
        input.style.borderColor = '#ff5f56';
        input.style.boxShadow = '0 0 0 3px rgba(255,95,86,0.1)';
        document.getElementById('rejectionHint').textContent = '❌ Gerekçe zorunludur';
        document.getElementById('rejectionHint').style.color = '#ff5f56';
        return;
      }
      cleanup();
      resolve(reason);
    };

    const onCancel = () => {
      cleanup();
      resolve(null);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') { onCancel(); }
    };
    document.addEventListener('keydown', onKey);

    modal.querySelector('#rejConfirmBtn').addEventListener('click', onConfirm);
    modal.querySelector('#rejCancelBtn').addEventListener('click', onCancel);
    modal.querySelector('#rejModalClose').addEventListener('click', onCancel);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) onCancel();
    });
  });
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
tabAppsBtn.addEventListener('click', () => {
  tabAppsBtn.classList.add('active');
  tabCreateBtn.classList.remove('active');
  viewApps.style.display = 'block';
  viewCreate.style.display = 'none';
});

tabCreateBtn.addEventListener('click', () => {
  tabCreateBtn.classList.add('active');
  tabAppsBtn.classList.remove('active');
  viewApps.style.display = 'none';
  viewCreate.style.display = 'block';
});

// ── Google Giriş ─────────────────────────────────────────────────
loginBtn.addEventListener('click', async () => {
  loginError.style.display = 'none';
  showLoader("GİRİŞ YAPILIYOR");
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
      try { 
        await signInWithRedirect(auth, provider); 
      } catch (e) { 
        hideLoader(); 
        showLoginError("Giriş başarısız. Sayfayı yenileyip tekrar deneyin."); 
      }
    } else if (err.code === 'auth/cancelled-popup-request') {
      hideLoader();
    } else {
      hideLoader();
      showLoginError("Giriş hatası: " + (err.message || err.code));
    }
  }
});

logoutBtn.addEventListener('click', async () => {
  const confirmed = await showConfirm("Çıkış Yap", "Yönetim panelinden çıkmak istediğinize emin misiniz?", "🚪");
  if (!confirmed) return;

  dashboardLoaded = false;
  selectedAppIds.clear();
  updateBatchBar();
  await signOut(auth);
  showToast("Bilgi", "Güvenli çıkış yapıldı.", "info", 3000);
});

// Redirect dönüşünü yakala
getRedirectResult(auth).then(result => {
  // onAuthStateChanged zaten tetiklenecek
}).catch(err => {
  if (err?.code && err.code !== 'auth/no-current-user') {
    console.warn("Redirect sonucu:", err.code);
    hideLoader();
  }
});

// ── Auth Durumu ───────────────────────────────────────────────────
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

// ── Real-time Listeners ────────────────────────────────────────
function setupRealtimeListeners() {
  const tourQuery = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
  unsubscribeTournaments = onSnapshot(tourQuery, (snapshot) => {
    tournamentsDataList = [];
    snapshot.forEach(d => tournamentsDataList.push({ id: d.id, ...d.data() }));
    if (dashboardLoaded) {
      buildFilterDropdown();
      loadManageTournamentsList();
      updateStats();
    }
  });

  const appQuery = query(collection(db, "applications"), orderBy("timestamp", "desc"));
  unsubscribeApplications = onSnapshot(appQuery, (snapshot) => {
    allApplicationsList = [];
    snapshot.forEach(d => allApplicationsList.push({ id: d.id, ...d.data() }));
    if (dashboardLoaded) {
      loadApplicationsList();
      updateStats();
    }
  });
}

// ── Statistics ─────────────────────────────────────────────────
function updateStats() {
  const pending = allApplicationsList.filter(a => a.status === 'bekliyor').length;
  const approved = allApplicationsList.filter(a => a.status === 'onaylandi').length;
  const rejected = allApplicationsList.filter(a => a.status === 'reddedildi').length;
  const totalTournaments = tournamentsDataList.length;

  animateNumber('statTotalTournaments', totalTournaments);
  animateNumber('statPendingApps', pending);
  animateNumber('statApprovedApps', approved);
  animateNumber('statRejectedApps', rejected);
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
    updateStats();
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
  if (currentVal && [...sel.options].some(o => o.value === currentVal)) {
    sel.value = currentVal;
  }
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
  const confirmed = await showConfirm(
    "Toplu Onay", 
    `${selectedAppIds.size} başvuruyu onaylamak istediğinize emin misiniz?`,
    "✅"
  );
  if (!confirmed) return;
  await batchAction('onayla');
});

document.getElementById('batchRejectBtn').addEventListener('click', async () => {
  if (selectedAppIds.size === 0) return;
  const confirmed = await showConfirm(
    "Toplu Red", 
    `${selectedAppIds.size} başvuruyu reddetmek istediğinize emin misiniz?`,
    "❌"
  );
  if (!confirmed) return;
  await batchAction('reddet');
});

async function batchAction(action) {
  const isApproved = action === 'onayla';
  const batch = writeBatch(db);
  let processed = 0;

  for (const docId of selectedAppIds) {
    const appRef = doc(db, "applications", docId);
    batch.update(appRef, { status: isApproved ? "onaylandi" : "reddedildi" });
    processed++;
  }

  try {
    await batch.commit();
    showToast("Başarılı", `${processed} başvuru ${isApproved ? 'onaylandı' : 'reddedildi'}.`, "success");
    selectedAppIds.clear();
    updateBatchBar();
  } catch (err) {
    showToast("Hata", "İşlem sırasında bir sorun oluştu: " + err.message, "error");
  }
}

// ── Görsel Doğrulama ───────────────────────────────────────────
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
  const fd = new FormData();
  fd.append("image", file);
  const res  = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
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
  adminFileUpload.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
});

['dragenter', 'dragover'].forEach(eventName => {
  adminFileUpload.addEventListener(eventName, () => adminFileUpload.classList.add('dragover'));
});

['dragleave', 'drop'].forEach(eventName => {
  adminFileUpload.addEventListener(eventName, () => adminFileUpload.classList.remove('dragover'));
});

adminFileUpload.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files.length) {
    newTLogoInput.files = files;
    handleAdminLogoSelect(files[0]);
  }
});

newTLogoInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleAdminLogoSelect(e.target.files[0]);
});

function handleAdminLogoSelect(file) {
  if (!file.type.startsWith('image/')) {
    showToast("Hata", "Lütfen geçerli bir görsel dosyası seçin.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    adminLogoPreview.src = e.target.result;
    adminLogoPreview.classList.add('visible');

    const img = new Image();
    img.onload = () => {
      const isSquare = img.width === img.height;
      if (isSquare) {
        adminLogoHint.textContent = '✅ Logo boyutu uygun (' + img.width + 'x' + img.height + ')';
        adminLogoHint.className = 'hint-text success';
      } else {
        adminLogoHint.textContent = `⚠️ Logo kare olmalı! (${img.width}x${img.height})`;
        adminLogoHint.className = 'hint-text error';
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── Yeni Turnuva ─────────────────────────────────────────────────
document.getElementById('createTBtn').addEventListener('click', async () => {
  const btn      = document.getElementById('createTBtn');
  const name     = document.getElementById('newTName').value.trim();
  const deadline = document.getElementById('newTDeadline').value;
  const teamSize = document.getElementById('newTSize').value;
  const maxTeams = document.getElementById('newTMaxTeams').value;
  const rules    = document.getElementById('newTRules').value.trim();
  const logoFile = newTLogoInput.files[0];

  if (!name || !deadline || !rules || !logoFile) {
    showToast("Hata", "Lütfen tüm alanları doldurunuz ve logo seçiniz.", "error");
    return;
  }

  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span aria-hidden="true">📐</span> Görsel İnceleniyor...';

  try {
    if (!(await validateSquareImage(logoFile))) {
      showToast("Hata", "Logo kare (1x1) boyutta olmalıdır!", "error");
      return;
    }

    btn.innerHTML = '<span aria-hidden="true">☁️</span> Logo Yükleniyor...';
    const logoUrl = await uploadLogo(logoFile);

    btn.innerHTML = '<span aria-hidden="true">💾</span> Kaydediliyor...';
    await addDoc(collection(db, "tournaments"), {
      name, deadline, teamSize: parseInt(teamSize),
      maxTeams: parseInt(maxTeams), rules, logoUrl, createdAt: new Date()
    });

    showToast("Başarılı", "Turnuva başarıyla yayına alındı!", "success");

    // Reset form
    ['newTName','newTDeadline','newTMaxTeams','newTRules'].forEach(id =>
      document.getElementById(id).value = id === 'newTMaxTeams' ? '16' : ''
    );
    newTLogoInput.value = '';
    adminLogoPreview.classList.remove('visible');
    adminLogoHint.textContent = '⚠️ Logo tam kare (1x1) boyutta olmalıdır';
    adminLogoHint.className = 'hint-text';

    tabAppsBtn.click();
  } catch (err) {
    console.error(err);
    showToast("Hata", "İşlem sırasında bir sorun oluştu: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});

// ── Turnuva Yönetim Listesi ────────────────────────────────────
function loadManageTournamentsList() {
  const container = document.getElementById('manageTournamentsList');
  container.innerHTML = '';

  if (tournamentsDataList.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">📭</div>
        <div class="empty-title">Turnuva Yok</div>
        Henüz kayıtlı turnuva bulunmuyor.
      </div>`;
    return;
  }

  tournamentsDataList.forEach(t => {
    const approved = allApplicationsList.filter(a => a.tournamentId === t.id && a.status === 'onaylandi').length;
    const pending = allApplicationsList.filter(a => a.tournamentId === t.id && a.status === 'bekliyor').length;
    const max = t.maxTeams || 16;
    const pct = Math.min(100, Math.round((approved / max) * 100));

    const row = document.createElement('div');
    row.style.cssText = "background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:12px;padding:16px 20px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;transition:all 0.2s;";
    row.innerHTML = `
      <div style="flex:1;min-width:200px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <img src="${t.logoUrl || 'tmş.png'}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;border:1px solid rgba(255,255,255,0.08);" onerror="this.style.display='none'">
          <strong style="color:#fff;font-size:15px;">${t.name}</strong>
        </div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--text-muted);">
          <span>🟢 Onaylı: <strong style="color:var(--accent-green);">${approved}</strong> / ${max}</span>
          <span>⏳ Bekleyen: <strong style="color:var(--accent-gold);">${pending}</strong></span>
          <span>📅 ${t.deadline}</span>
        </div>
        <div style="margin-top:8px;background:rgba(255,255,255,0.05);border-radius:6px;height:4px;overflow:hidden;">
          <div style="height:100%;background:var(--gradient-gold);border-radius:6px;width:${pct}%;transition:width 0.5s ease;"></div>
        </div>
      </div>
      <button class="btn-ghost open-edit-trigger" style="padding:8px 16px;font-size:13px;white-space:nowrap;">
        <span aria-hidden="true">✏️</span> Düzenle
      </button>
    `;

    row.addEventListener('mouseenter', () => {
      row.style.borderColor = 'var(--border-active)';
      row.style.transform = 'translateX(4px)';
    });
    row.addEventListener('mouseleave', () => {
      row.style.borderColor = 'var(--border-subtle)';
      row.style.transform = 'translateX(0)';
    });

    row.querySelector('.open-edit-trigger').addEventListener('click', () => {
      editingTournamentId = t.id;
      document.getElementById('editTName').value         = t.name;
      document.getElementById('editTMaxTeams').value     = max;
      document.getElementById('editTRules').value        = t.rules || '';
      document.getElementById('editTSizeDisabled').value = `${t.teamSize} Kişilik Roster`;
      document.getElementById('editTIdDisabled').value   = t.id;
      const sec = document.getElementById('editTournamentSection');
      sec.style.display = 'block';
      setTimeout(() => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    });

    container.appendChild(row);
  });
}

// ── Turnuva Güncelle ───────────────────────────────────────────
document.getElementById('saveEditTBtn').addEventListener('click', async () => {
  if (!editingTournamentId) return;

  const confirmed = await showConfirm(
    "Güncelleme Onayı",
    "Turnuva bilgilerini güncellemek istediğinize emin misiniz? Kayıtlı oyuncuların verileri korunacaktır.",
    "🛠️"
  );
  if (!confirmed) return;

  const btn      = document.getElementById('saveEditTBtn');
  const name     = document.getElementById('editTName').value.trim();
  const maxTeams = document.getElementById('editTMaxTeams').value;
  const rules    = document.getElementById('editTRules').value.trim();

  if (!name || !maxTeams || !rules) {
    showToast("Hata", "Tüm alanları doldurunuz.", "error");
    return;
  }

  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span aria-hidden="true">⏳</span> İşleniyor...';

  try {
    await updateDoc(doc(db, "tournaments", editingTournamentId), {
      name, maxTeams: parseInt(maxTeams), rules
    });
    showToast("Başarılı", "Güncellendi! Esporcuların kayıtları korundu.", "success");
    document.getElementById('editTournamentSection').style.display = 'none';
    editingTournamentId = null;
  } catch (err) {
    console.error(err);
    showToast("Hata", "Güncelleme hatası: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});

document.getElementById('cancelEditTBtn').addEventListener('click', () => {
  document.getElementById('editTournamentSection').style.display = 'none';
  editingTournamentId = null;
});

// ── Başvuru Listesi ──────────────────────────────────────────────
function loadApplicationsList() {
  const filter = document.getElementById('filterTournamentSelect').value;
  applicationsList.innerHTML = '';
  let counter = 0;

  allApplicationsList.forEach(data => {
    if (data.status !== "bekliyor") return;
    if (filter !== 'all' && data.tournamentId !== filter) return;
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
          <a href="${p.yt||'#'}" target="_blank" rel="noopener" style="color:var(--accent-cyan);text-decoration:none;font-size:12px;font-weight:600;white-space:nowrap;">
            Medya ↗
          </a>
        </div>`;
    });

    const card = document.createElement('div');
    card.className = 'accordion-item';
    card.style.animationDelay = `${counter * 0.03}s`;

    const isSelected = selectedAppIds.has(data.id);

    card.innerHTML = `
      <div class="accordion-header" role="button" tabindex="0" aria-expanded="false">
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">
          <input type="checkbox" class="app-checkbox" data-id="${data.id}" ${isSelected ? 'checked' : ''} 
            style="width:18px;height:18px;accent-color:var(--accent-gold);cursor:pointer;flex-shrink:0;" 
            onclick="event.stopPropagation()">
          <img src="${data.logoUrl||''}" style="width:36px;height:36px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">
          <div style="min-width:0;">
            <div style="font-weight:700;color:#fff;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${data.teamName}</div>
            <div style="font-size:11px;color:var(--text-muted);">🏆 ${tInfo.name}</div>
          </div>
        </div>
        <span class="accordion-arrow" aria-hidden="true">▼</span>
      </div>
      <div class="accordion-content" style="display:none;">
        <div style="margin-bottom:16px;">
          <p style="font-size:11px;color:var(--text-muted);margin-bottom:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">Kadro Detayı</p>
          ${playersHtml}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn-success btn-approve" style="flex:1;min-width:100px;padding:12px;border-radius:8px;">
            <span aria-hidden="true">✔</span> Kabul Et
          </button>
          <button class="btn-danger btn-reject" style="flex:1;min-width:100px;padding:12px;border-radius:8px;">
            <span aria-hidden="true">✕</span> Reddet
          </button>
        </div>
      </div>
    `;

    const header  = card.querySelector('.accordion-header');
    const content = card.querySelector('.accordion-content');
    const arrow   = card.querySelector('.accordion-arrow');
    const checkbox = card.querySelector('.app-checkbox');

    header.addEventListener('click', () => {
      const open = content.style.display === 'block';
      content.style.display = open ? 'none' : 'block';
      arrow.textContent = open ? '▼' : '▲';
      header.setAttribute('aria-expanded', !open);
      if (!open) content.classList.add('open');
    });

    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        header.click();
      }
    });

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedAppIds.add(data.id);
      } else {
        selectedAppIds.delete(data.id);
      }
      updateBatchBar();
    });

    const p1Email = data.players?.[0]?.email || '';
    const p1Name = data.players?.[0]?.name || 'Kaptan';

    card.querySelector('.btn-approve').addEventListener('click', () => 
      handleAction(data.id, 'onayla', p1Email, data.teamName, tInfo.name, p1Name, data.players, tInfo.teamSize)
    );
    card.querySelector('.btn-reject').addEventListener('click', () => 
      handleAction(data.id, 'reddet', p1Email, data.teamName, tInfo.name, p1Name, data.players, tInfo.teamSize)
    );

    applicationsList.appendChild(card);
  });

  if (counter === 0) {
    applicationsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">📭</div>
        <div class="empty-title">Bekleyen Başvuru Yok</div>
        Şu anda incelenmeyi bekleyen başvuru bulunmuyor.
      </div>`;
  }
}

// ── Onayla / Reddet ──────────────────────────────────────────────
async function handleAction(docId, action, p1Email, teamName, tournamentName, captainName, players, teamSize) {
  const isApproved = action === 'onayla';
  const actionText = isApproved ? 'onaylamak' : 'reddetmek';

  // For rejection, show reason dialog first
  let rejectionReason = '';
  if (!isApproved) {
    rejectionReason = await showRejectionReasonDialog(teamName);
    if (rejectionReason === null) return; // User cancelled
  } else {
    const confirmed = await showConfirm(
      isApproved ? "Başvuru Onayı" : "Başvuru Reddi",
      `"${teamName}" takımını ${actionText} istediğinize emin misiniz?`,
      isApproved ? "✅" : "❌"
    );
    if (!confirmed) return;
  }

  try {
    // Format player list for email
    const playerList = (players || []).map((p, idx) => ({
      name: p.name || '-',
      email: p.email || '-',
      yt: p.yt || '-',
      isCaptain: idx === 0
    }));

    // Format date
    const now = new Date();
    const applicationDate = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    if (typeof emailjs !== 'undefined' && p1Email) {
      const templateParams = {
        to_email: p1Email,
        captain_name: captainName || 'Kaptan',
        team_name: teamName,
        tournament_name: tournamentName || 'TMŞ Turnuvası',
        tournament_logo: tournamentsDataList.find(t => t.name === tournamentName)?.logoUrl || '',
        team_size: teamSize == 1 ? '1v1 Solo' : `${teamSize}v${teamSize}`,
        application_date: applicationDate,
        tournament_deadline: tournamentsDataList.find(t => t.name === tournamentName)?.deadline || '',
        tournament_url: `${window.location.origin}/index.html`,
        youtube_url: 'https://youtube.com/@turkiyeminisampiyonlar',
        twitter_url: 'https://twitter.com/tms_official',
        instagram_url: 'https://instagram.com/turkiyeminisampiyonlar',
        discord_url: 'https://discord.gg/tms',
        admin_name: ADMIN_EMAIL.split('@')[0],
        // Player data as JSON string for template processing
        players: JSON.stringify(playerList),
        // Individual player fields for simple templates
        player1_name: playerList[0]?.name || '-',
        player1_email: playerList[0]?.email || '-',
        player2_name: playerList[1]?.name || '-',
        player2_email: playerList[1]?.email || '-',
        player3_name: playerList[2]?.name || '-',
        player3_email: playerList[2]?.email || '-',
        player4_name: playerList[3]?.name || '-',
        player4_email: playerList[3]?.email || '-',
        player5_name: playerList[4]?.name || '-',
        player5_email: playerList[4]?.email || '-'
      };

      // Add rejection reason if applicable
      if (!isApproved) {
        templateParams.rejection_reason = rejectionReason;
      }

      await emailjs.send('service_bftdxcy', isApproved ? 'template_01nnh1s' : 'template_cpy48jt', templateParams);
    }

    await updateDoc(doc(db, "applications", docId), {
      status: isApproved ? "onaylandi" : "reddedildi",
      ...(rejectionReason && { rejectionReason }),
      processedAt: new Date(),
      processedBy: ADMIN_EMAIL
    });

    showToast("Başarılı", `İşlem tamamlandı! Kaptana e-posta iletildi.`, "success");
  } catch (err) {
    console.error(err);
    showToast("Hata", "İşlem sırasında bir sorun oluştu: " + err.message, "error");
  }
}

// ── ESC ile modal kapat ──────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    confirmModal.classList.remove('open');
  }
});

window.addEventListener('click', e => {
  if (e.target === confirmModal) confirmModal.classList.remove('open');
});

// ── Cleanup ──────────────────────────────────────────────────────
window.addEventListener('beforeunload', () => {
  if (unsubscribeTournaments) unsubscribeTournaments();
  if (unsubscribeApplications) unsubscribeApplications();
});
