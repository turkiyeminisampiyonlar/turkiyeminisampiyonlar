import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, getDoc,
  onSnapshot, enableIndexedDbPersistence, query, orderBy
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

// Offline önbellek
enableIndexedDbPersistence(db).catch(() => {});

const IMGBB_API_KEY = "43c8e0a8c3277336886330d1172f988a";

// ── State ────────────────────────────────────────────────────────
let localTournaments    = [];
let localApplications   = [];
let currentTournamentId = null;
let currentFilter       = 'all';
let unsubscribeTournaments = null;
let unsubscribeApplications = null;

// ── DOM Elements ─────────────────────────────────────────────────
const loader               = document.getElementById('tms-loader');
const toastContainer       = document.getElementById('toastContainer');
const tournamentHubView      = document.getElementById('tournamentHubView');
const registrationFormView = document.getElementById('registrationFormView');
const myApplicationsView   = document.getElementById('myApplicationsView');
const heroSection          = document.getElementById('heroSection');
const tournamentGrid       = document.getElementById('tournamentGrid');
const searchInput          = document.getElementById('searchInput');
const searchClear          = document.getElementById('searchClear');
const filterBar            = document.getElementById('filterBar');
const selectedCard         = document.getElementById('selectedTournamentCard');
const backToHubBtn         = document.getElementById('backToHubBtn');
const submitBtn            = document.getElementById('submitBtn');
const statusModal          = document.getElementById('statusModal');
const confirmModal         = document.getElementById('confirmModal');
const navHomeBtn           = document.getElementById('navHomeBtn');
const navMyAppsBtn         = document.getElementById('navMyAppsBtn');
const bottomNavHome        = document.getElementById('bottomNavHome');
const bottomNavMyApps      = document.getElementById('bottomNavMyApps');
const fileUploadZone       = document.getElementById('fileUploadZone');
const logoPreview          = document.getElementById('logoPreview');
const teamLogoInput        = document.getElementById('teamLogo');

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

    // ESC ile kapat
    const onKey = (e) => {
      if (e.key === 'Escape') { cleanup(); resolve(false); document.removeEventListener('keydown', onKey); }
    };
    document.addEventListener('keydown', onKey);
  });
}

// ── Loader ───────────────────────────────────────────────────────
function showLoader(text = 'BAĞLANTI SAĞLANIYOR') {
  loader.querySelector('.loader-text').textContent = text;
  loader.style.display = 'flex';
  loader.style.opacity = '1';
}

function hideLoader() {
  loader.style.opacity = '0';
  setTimeout(() => { loader.style.display = 'none'; }, 400);
}

// ── Skeleton Loading ───────────────────────────────────────────
function showSkeletons(count = 4) {
  tournamentGrid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'skeleton-card';
    el.innerHTML = `
      <div class="skeleton skeleton-circle"></div>
      <div class="skeleton skeleton-line short"></div>
      <div class="skeleton skeleton-line medium"></div>
      <div class="skeleton skeleton-line long"></div>
      <div class="skeleton skeleton-line long"></div>
      <div class="skeleton skeleton-bar"></div>
    `;
    tournamentGrid.appendChild(el);
  }
}

// ── View Management ──────────────────────────────────────────────
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

// ── Navbar ───────────────────────────────────────────────────────
function setActiveNav(active) {
  [navHomeBtn, navMyAppsBtn, bottomNavHome, bottomNavMyApps].forEach(btn => {
    btn?.classList.remove('active');
    btn?.removeAttribute('aria-current');
  });

  if (active === 'home') {
    navHomeBtn?.classList.add('active');
    navHomeBtn?.setAttribute('aria-current', 'page');
    bottomNavHome?.classList.add('active');
  }
  if (active === 'myapps') {
    navMyAppsBtn?.classList.add('active');
    navMyAppsBtn?.setAttribute('aria-current', 'page');
    bottomNavMyApps?.classList.add('active');
  }
}

function setupNav() {
  const goHome = () => {
    setActiveNav('home');
    showView('hub');
    window.history.pushState({}, '', 'index.html');
  };
  const goMyApps = () => {
    setActiveNav('myapps');
    showView('myapps');
  };

  navHomeBtn?.addEventListener('click', goHome);
  bottomNavHome?.addEventListener('click', goHome);
  navMyAppsBtn?.addEventListener('click', goMyApps);
  bottomNavMyApps?.addEventListener('click', goMyApps);
}

// ── Real-time Firebase Listeners ─────────────────────────────────
function setupRealtimeListeners() {
  // Turnuvaları dinle
  const tourQuery = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
  unsubscribeTournaments = onSnapshot(tourQuery, (snapshot) => {
    localTournaments = [];
    snapshot.forEach(d => localTournaments.push({ id: d.id, ...d.data() }));
    if (tournamentHubView.style.display !== 'none') {
      renderTournaments(getFilteredTournaments());
    }
  }, (err) => {
    console.warn("Turnuva dinleyici hatası:", err);
    showToast("Uyarı", "Gerçek zamanlı güncellemeler geçici olarak kullanılamıyor.", "warning", 3000);
  });

  // Başvuruları dinle
  const appQuery = query(collection(db, "applications"), orderBy("timestamp", "desc"));
  unsubscribeApplications = onSnapshot(appQuery, (snapshot) => {
    localApplications = [];
    snapshot.forEach(d => localApplications.push({ id: d.id, ...d.data() }));
    if (tournamentHubView.style.display !== 'none') {
      renderTournaments(getFilteredTournaments());
    }
  }, (err) => {
    console.warn("Başvuru dinleyici hatası:", err);
  });
}

// ── Countdown Timer ────────────────────────────────────────────
function getCountdown(deadline) {
  const end = new Date(deadline + 'T23:59:59');
  const now = new Date();
  const diff = end - now;

  if (diff <= 0) return { text: 'Süre Doldu', urgent: true, expired: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return { text: `⏰ ${days} gün ${hours} saat kaldı`, urgent: days <= 2, expired: false };
  if (hours > 0) return { text: `⏰ ${hours} saat kaldı`, urgent: true, expired: false };
  return { text: '⏰ Son saatler!', urgent: true, expired: false };
}

// ── Tournament Filtering ───────────────────────────────────────
function getFilteredTournaments() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const today = new Date(); today.setHours(0,0,0,0);

  return localTournaments.filter(t => {
    // Arama filtresi
    if (searchTerm && !t.name.toLowerCase().includes(searchTerm)) return false;

    // Durum filtresi
    const isExpired = new Date(t.deadline) < today;
    const approvedCount = localApplications.filter(a => a.tournamentId === t.id && a.status === 'onaylandi').length;
    const maxTeams = parseInt(t.maxTeams) || 16;
    const isFull = approvedCount >= maxTeams;

    if (currentFilter === 'active' && (isExpired || isFull)) return false;
    if (currentFilter === 'expired' && !isExpired) return false;
    if (currentFilter === 'full' && !isFull) return false;

    return true;
  });
}

// ── Render Tournaments ─────────────────────────────────────────
function renderTournaments(list) {
  tournamentGrid.innerHTML = '';

  if (list.length === 0) {
    const emptyMsg = searchInput.value.trim() 
      ? 'Aramanıza uygun turnuva bulunamadı.'
      : currentFilter !== 'all' 
        ? 'Bu filtreye uygun turnuva bulunmuyor.'
        : 'Aktif turnuva bulunamadı.';

    tournamentGrid.innerHTML = `
      <div style="grid-column:1/-1;" class="empty-state">
        <div class="empty-icon" aria-hidden="true">🏆</div>
        <div class="empty-title">Turnuva Yok</div>
        ${emptyMsg}
      </div>`;
    return;
  }

  list.forEach((t, idx) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const isExpired     = new Date(t.deadline) < today;
    const approvedCount = localApplications.filter(a => a.tournamentId === t.id && a.status === 'onaylandi').length;
    const maxTeams      = parseInt(t.maxTeams) || 16;
    const isFull        = approvedCount >= maxTeams;
    const pct           = Math.min(100, Math.round((approvedCount / maxTeams) * 100));
    const countdown     = getCountdown(t.deadline);
    const modeText      = t.teamSize == 1 ? "1v1 Solo" : `${t.teamSize}v${t.teamSize}`;

    let badgeClass = 't-badge-active', badgeText = 'Kayıtlar Açık';
    if (isExpired)   { badgeClass = 't-badge-expired'; badgeText = 'Süre Doldu'; }
    else if (isFull) { badgeClass = 't-badge-full'; badgeText = 'Kontenjan Doldu'; }

    const disabled = isExpired || isFull;
    const btnText  = isExpired ? 'Süre Doldu' : (isFull ? 'Kontenjan Doldu' : 'Detay ve Kayıt Ol');

    const card = document.createElement('div');
    card.className = 'tournament-card';
    card.style.animationDelay = `${idx * 0.05}s`;
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${t.name}, ${badgeText}`);

    card.innerHTML = `
      <span class="t-badge ${badgeClass}">${badgeText}</span>
      <div class="t-logo-container">
        <img class="t-logo" src="${t.logoUrl || 'tmş.png'}" alt="${t.name} logosu" onerror="this.src='tmş.png'" loading="lazy">
      </div>
      <div class="t-title">${t.name}</div>
      <div class="t-mode">${modeText}</div>
      <div class="t-deadline">📅 ${t.deadline}</div>
      ${!isExpired ? `<div class="t-countdown ${countdown.urgent ? 'urgent' : ''}">${countdown.text}</div>` : ''}
      <div class="quota-bar-wrap">
        <div class="quota-bar-track" role="progressbar" aria-valuenow="${approvedCount}" aria-valuemax="${maxTeams}" aria-label="Kontenjan durumu">
          <div class="quota-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="quota-label">📊 ${approvedCount} / ${maxTeams} Takım</span>
      </div>
      <div class="t-desc">${t.rules || ''}</div>
      <div class="t-actions">
        <button class="btn-primary select-t-btn" style="flex:1;" ${disabled ? 'disabled' : ''} aria-label="${t.name} turnuvasına kayıt ol">
          ${btnText}
        </button>
        <button class="btn-ghost detail-btn" data-id="${t.id}" aria-label="Turnuva detaylarını gör" title="Detaylar">
          👁️
        </button>
        ${!disabled ? `<button class="btn-ghost copy-link-btn" data-id="${t.id}" aria-label="Turnuva linkini kopyala" title="Linki Kopyala">
          🔗
        </button>` : ''}
      </div>
    `;

    // Klavye navigasyonu
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !disabled) {
        openRegistrationForm(t.id);
      }
    });

    if (!disabled) {
      card.querySelector('.select-t-btn').addEventListener('click', () => {
        window.history.pushState({}, '', `?id=${t.id}`);
        openRegistrationForm(t.id);
      });

      const detailBtn = card.querySelector('.detail-btn');
      if (detailBtn) {
        detailBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openTournamentDetail(t.id);
        });
      }

      const copyBtn = card.querySelector('.copy-link-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const url = `${window.location.origin}${window.location.pathname}?id=${t.id}`;
          navigator.clipboard.writeText(url).then(() => {
            showToast("Başarılı", "Turnuva linki panoya kopyalandı!", "success", 2000);
          }).catch(() => {
            showToast("Hata", "Link kopyalanamadı.", "error", 2000);
          });
        });
      }
    }

    tournamentGrid.appendChild(card);
  });
}

// ── Search with Debounce ───────────────────────────────────────
let searchTimeout;
searchInput.addEventListener('input', () => {
  searchClear.classList.toggle('visible', searchInput.value.length > 0);
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    renderTournaments(getFilteredTournaments());
  }, 200);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.classList.remove('visible');
  renderTournaments(getFilteredTournaments());
  searchInput.focus();
});

// ── Filter Chips ───────────────────────────────────────────────
filterBar.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    filterBar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = chip.dataset.filter;
    renderTournaments(getFilteredTournaments());
  });
});

// ── Registration Form ──────────────────────────────────────────────
async function openRegistrationForm(tournamentId) {
  currentTournamentId = tournamentId;
  let t = localTournaments.find(x => x.id === tournamentId);

  if (!t) {
    try {
      showLoader("TURNUVA YÜKLENİYOR");
      const snap = await getDoc(doc(db, "tournaments", tournamentId));
      hideLoader();
      if (snap.exists()) t = { id: snap.id, ...snap.data() };
    } catch(e) { 
      hideLoader();
      console.error(e); 
    }
  }

  if (!t) {
    showToast("Hata", "Turnuva bulunamadı.", "error");
    window.history.pushState({}, '', 'index.html');
    return;
  }

  const approved  = localApplications.filter(a => a.tournamentId === t.id && a.status === 'onaylandi').length;
  const maxTeams  = parseInt(t.maxTeams) || 16;
  const isFull    = approved >= maxTeams;
  const modeText  = t.teamSize == 1 ? "1v1 Solo" : `${t.teamSize}v${t.teamSize}`;
  const countdown = getCountdown(t.deadline);

  selectedCard.innerHTML = `
    <img src="${t.logoUrl || 'tmş.png'}" alt="${t.name}" onerror="this.src='tmş.png'"
      style="width:68px;height:68px;border-radius:14px;object-fit:cover;border:2px solid var(--accent-gold);flex-shrink:0;display:block;">
    <div style="flex:1;min-width:0;">
      <div style="font-size:18px;font-weight:800;color:#fff;line-height:1.3;">
        ${t.name}
        <span style="color:var(--accent-gold);font-size:13px;font-weight:700;"> [${modeText}]</span>
      </div>
      <div style="color:var(--text-secondary);font-size:13px;margin:8px 0;">
        ⏰ <strong style="color:var(--accent-gold);">${t.deadline}</strong> &nbsp;|&nbsp;
        📊 <strong style="color:var(--accent-green);">${approved}/${maxTeams} Onaylı</strong>
        ${countdown.urgent && !countdown.expired ? `<span style="color:var(--accent-red);margin-left:8px;">⚠️ ${countdown.text}</span>` : ''}
      </div>
      <div style="color:var(--text-secondary);font-size:13px;white-space:pre-line;background:rgba(0,0,0,0.25);padding:12px;border-radius:10px;max-height:140px;overflow-y:auto;line-height:1.6;">${t.rules || ''}</div>
    </div>
  `;

  submitBtn.disabled  = isFull;
  submitBtn.innerHTML = isFull 
    ? '<span aria-hidden="true">⛔</span> Kontenjan Dolu — Kayıtlar Kapalı'
    : '<span aria-hidden="true">⚔️</span> Savaşa Katıl ve Kaydı Tamamla';

  // Reset form
  document.getElementById('teamName').value = '';
  document.getElementById('teamNameHint').textContent = '';
  document.getElementById('teamNameHint').className = 'hint-text';
  logoPreview.src = '';
  logoPreview.classList.remove('visible');
  document.getElementById('logoHint').textContent = '⚠️ Logo tam kare (1:1) boyutta olmalıdır';
  document.getElementById('logoHint').className = 'hint-text';
  teamLogoInput.value = '';

  const container = document.getElementById('dynamicPlayersContainer');
  container.innerHTML = '';
  const size = parseInt(t.teamSize) || 3;

  for (let i = 1; i <= size; i++) {
    const box = document.createElement('div');
    box.className = 'player-box';
    box.innerHTML = `
      <h4>
        <span class="player-avatar" aria-hidden="true">${i}</span>
        ${i === 1 ? 'Kaptan' : `Oyuncu ${i}`}
      </h4>
      <div class="input-grid">
        <div class="input-group">
          <label>Oyun İçi Adı (IGN) <span class="required">*</span></label>
          <input type="text" class="p-name" placeholder="Oyuncu Nick" autocomplete="off" data-player="${i}">
        </div>
        <div class="input-group">
          <label>E-Posta <span class="required">*</span></label>
          <input type="email" class="p-email" placeholder="ornek@gmail.com" autocomplete="email" data-player="${i}">
        </div>
        <div class="input-group">
          <label>Sosyal Medya Linki <span class="required">*</span></label>
          <input type="url" class="p-yt" placeholder="https://youtube.com/..." data-player="${i}">
        </div>
      </div>
    `;
    container.appendChild(box);
  }

  setActiveNav('');
  showView('form');
}

// ── Back to Hub ──────────────────────────────────────────────────
backToHubBtn.addEventListener('click', async () => {
  window.history.pushState({}, '', 'index.html');
  setActiveNav('home');
  showView('hub');
  showSkeletons(3);
  renderTournaments(getFilteredTournaments());
});

// ── File Upload with Drag & Drop ────────────────────────────────
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  fileUploadZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
});

['dragenter', 'dragover'].forEach(eventName => {
  fileUploadZone.addEventListener(eventName, () => {
    fileUploadZone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(eventName => {
  fileUploadZone.addEventListener(eventName, () => {
    fileUploadZone.classList.remove('dragover');
  });
});

fileUploadZone.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files.length) {
    teamLogoInput.files = files;
    handleLogoSelect(files[0]);
  }
});

teamLogoInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleLogoSelect(e.target.files[0]);
});

function handleLogoSelect(file) {
  if (!file.type.startsWith('image/')) {
    showToast("Hata", "Lütfen geçerli bir görsel dosyası seçin.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    logoPreview.src = e.target.result;
    logoPreview.classList.add('visible');

    const img = new Image();
    img.onload = () => {
      const isSquare = img.width === img.height;
      const hint = document.getElementById('logoHint');
      if (isSquare) {
        hint.textContent = '✅ Logo boyutu uygun (' + img.width + 'x' + img.height + ')';
        hint.className = 'hint-text success';
      } else {
        hint.textContent = `⚠️ Logo kare olmalı! (${img.width}x${img.height} değil, ${Math.max(img.width, img.height)}x${Math.max(img.width, img.height)} olmalı)`;
        hint.className = 'hint-text error';
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── Form Validation ──────────────────────────────────────────────
function validateForm() {
  let isValid = true;
  const teamName = document.getElementById('teamName');
  const teamNameHint = document.getElementById('teamNameHint');

  if (!teamName.value.trim()) {
    teamName.classList.add('error');
    teamNameHint.textContent = '❌ Takım ismi zorunludur';
    teamNameHint.className = 'hint-text error';
    isValid = false;
  } else {
    teamName.classList.remove('error');
    teamName.classList.add('success');
    teamNameHint.textContent = '✅ Takım ismi geçerli';
    teamNameHint.className = 'hint-text success';
  }

  const logoHint = document.getElementById('logoHint');
  if (!teamLogoInput.files[0]) {
    logoHint.textContent = '❌ Logo seçimi zorunludur';
    logoHint.className = 'hint-text error';
    isValid = false;
  }

  const pNames  = document.querySelectorAll('.p-name');
  const pEmails = document.querySelectorAll('.p-email');
  const pYts    = document.querySelectorAll('.p-yt');

  for (let i = 0; i < pNames.length; i++) {
    const inputs = [pNames[i], pEmails[i], pYts[i]];
    const allFilled = inputs.every(inp => inp.value.trim());

    inputs.forEach(inp => {
      inp.classList.remove('error', 'success');
      if (!inp.value.trim()) {
        inp.classList.add('error');
        isValid = false;
      } else {
        inp.classList.add('success');
      }
    });

    // Email validation
    const email = pEmails[i].value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      pEmails[i].classList.add('error');
      pEmails[i].classList.remove('success');
      isValid = false;
    }
  }

  return isValid;
}

// Real-time validation
function setupLiveValidation() {
  document.getElementById('teamName')?.addEventListener('blur', () => {
    const teamName = document.getElementById('teamName');
    const hint = document.getElementById('teamNameHint');
    if (teamName.value.trim()) {
      teamName.classList.remove('error');
      teamName.classList.add('success');
      hint.textContent = '✅ Takım ismi geçerli';
      hint.className = 'hint-text success';
    }
  });
}

// ── Form Submit ──────────────────────────────────────────────────
submitBtn.addEventListener('click', async () => {
  // Turnstile kontrolü
  if (!turnstileToken) {
    showToast("Hata", "Lütfen güvenlik doğrulamasını tamamlayın.", "error");
    return;
  }

  // Rate limit kontrolü
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    showRateLimitWarning(rateCheck.remainingSeconds);
    showToast("Uyarı", "Çok fazla başvuru yaptınız. Lütfen bekleyin.", "warning");
    return;
  }

  // Honeypot kontrolü
  if (!checkHoneypot()) {
    console.warn('Bot detected via honeypot');
    return;
  }

  if (!validateForm()) {
    showToast("Hata", "Lütfen tüm zorunlu alanları doğru şekilde doldurun.", "error");
    return;
  }

  const teamName = document.getElementById('teamName').value.trim();
  const logoFile = teamLogoInput.files[0];
  const pNames   = document.querySelectorAll('.p-name');
  const pEmails  = document.querySelectorAll('.p-email');
  const pYts     = document.querySelectorAll('.p-yt');

  submitBtn.disabled  = true;
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span aria-hidden="true">⏳</span> Görsel kontrol ediliyor...';

  try {
    // Validate square image
    const isSquare = await validateImageIsSquare(logoFile);
    if (!isSquare) {
      showToast("Logo Uyumsuz", "Logo tam kare (1x1) boyutta olmalıdır.", "error");
      return;
    }

    submitBtn.innerHTML = '<span aria-hidden="true">☁️</span> Logo yükleniyor...';
    const fd = new FormData();
    fd.append("image", logoFile);
    const res  = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
    const json = await res.json();
    if (!json.success) throw new Error("Logo yüklenemedi.");

    const playersList = [];
    for (let i = 0; i < pNames.length; i++) {
      playersList.push({
        name:  pNames[i].value.trim(),
        email: pEmails[i].value.trim(),
        yt:    pYts[i].value.trim()
      });
    }

    submitBtn.innerHTML = '<span aria-hidden="true">📝</span> Kaydediliyor...';
    await addDoc(collection(db, "applications"), {
      tournamentId: currentTournamentId,
      teamName, 
      logoUrl: json.data.url,
      status: "bekliyor", 
      players: playersList,
      timestamp: new Date()
    });

    setRateLimit();
    showToast("Başarılı", "Başvurunuz alındı! Admin onayından sonra e-posta gönderilecektir.", "success", 6000);

    // Reset form
    document.getElementById('teamName').value = '';
    teamLogoInput.value = '';
    logoPreview.classList.remove('visible');
    document.querySelectorAll('.p-name, .p-email, .p-yt').forEach(i => {
      i.value = '';
      i.classList.remove('error', 'success');
    });
    document.getElementById('teamName').classList.remove('error', 'success');
    document.getElementById('teamNameHint').textContent = '';
    document.getElementById('teamNameHint').className = 'hint-text';
    document.getElementById('logoHint').textContent = '⚠️ Logo tam kare (1x1) boyutta olmalıdır';
    document.getElementById('logoHint').className = 'hint-text';

    backToHubBtn.click();

  } catch (err) {
    console.error(err);
    showToast("Hata", "Bir sorun oluştu: " + err.message, "error");
  } finally {
    submitBtn.disabled  = false;
    submitBtn.innerHTML = originalText;
  }
});

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

// ── My Applications ────────────────────────────────────────────
document.getElementById('searchMyAppsBtn').addEventListener('click', () => {
  const email  = document.getElementById('myEmailInput').value.trim().toLowerCase();
  const listEl = document.getElementById('myApplicationsList');

  if (!email) {
    listEl.innerHTML = '<p style="color:var(--accent-red);font-size:13px;padding:8px;">E-posta giriniz.</p>';
    return;
  }

  const myApps = localApplications.filter(a =>
    a.players?.some(p => (p.email || '').toLowerCase() === email)
  );

  listEl.innerHTML = '';
  if (myApps.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">📭</div>
        <div class="empty-title">Başvuru Bulunamadı</div>
        Bu e-posta ile kayıtlı başvuru bulunamadı.
      </div>`;
    return;
  }

  myApps.forEach((a, idx) => {
    const tInfo  = localTournaments.find(t => t.id === a.tournamentId) || { name: 'Bilinmeyen' };
    const sColor = a.status === 'onaylandi' ? 'var(--accent-green)' : a.status === 'reddedildi' ? 'var(--accent-red)' : 'var(--accent-gold)';
    const sText  = a.status === 'onaylandi' ? '✅ Onaylandı' : a.status === 'reddedildi' ? '❌ Reddedildi' : '⏳ İnceleniyor';
    const sBorder = a.status === 'onaylandi' ? 'rgba(0,200,83,0.3)' : a.status === 'reddedildi' ? 'rgba(255,95,86,0.3)' : 'rgba(243,156,18,0.3)';

    const el = document.createElement('div');
    el.className = 'my-app-card';
    el.style.animationDelay = `${idx * 0.05}s`;
    el.innerHTML = `
      <img src="${a.logoUrl || 'tmş.png'}" alt="${a.teamName}" class="my-app-logo" onerror="this.src='tmş.png'" loading="lazy">
      <div class="my-app-info">
        <div class="my-app-name">${a.teamName}</div>
        <div class="my-app-tour">🏆 ${tInfo.name}</div>
      </div>
      <span class="my-app-status" style="color:${sColor};border-color:${sBorder};">${sText}</span>
    `;
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => openApplicationDetail(a.id));
    listEl.appendChild(el);
  });
});

// Enter ile sorgula
document.getElementById('myEmailInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('searchMyAppsBtn').click();
});

// ── Modal Management ───────────────────────────────────────────
function showModal(title, message, isSuccess) {
  const color = isSuccess ? 'var(--accent-green)' : 'var(--accent-red)';
  document.getElementById('statusTitle').innerText   = title;
  document.getElementById('statusTitle').style.color = color;
  document.getElementById('statusMessage').innerText = message;
  document.getElementById('statusIcon').innerHTML    =
    `<div style="font-size:52px;margin-bottom:16px;" aria-hidden="true">${isSuccess ? '✅' : '❌'}</div>`;
  statusModal.classList.add('open');
}

document.getElementById('closeStatusBtn').addEventListener('click', () => {
  statusModal.classList.remove('open');
});

document.getElementById('modalCloseBtn').addEventListener('click', () => {
  statusModal.classList.remove('open');
});

window.addEventListener('click', e => {
  if (e.target === statusModal) statusModal.classList.remove('open');
  if (e.target === confirmModal) confirmModal.classList.remove('open');
  if (e.target === document.getElementById('appDetailModal')) closeApplicationDetail();
  if (e.target === document.getElementById('tournamentDetailModal')) closeTournamentDetail();
});

document.getElementById('appDetailCloseBtn')?.addEventListener('click', closeApplicationDetail);
document.getElementById('tourDetailCloseBtn')?.addEventListener('click', closeTournamentDetail);

// ESC ile kapat
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    statusModal.classList.remove('open');
    confirmModal.classList.remove('open');
  }
});


// ═══════════════════════════════════════════════════════════════
// TMŞ v3.0 - Yeni Özellikler ve Güvenlik İyileştirmeleri
// ═══════════════════════════════════════════════════════════════

// ── Rate Limiting ──────────────────────────────────────────────
const RATE_LIMIT_MINUTES = 5;
const RATE_LIMIT_KEY = 'tms_last_application';

function checkRateLimit() {
  const lastApp = localStorage.getItem(RATE_LIMIT_KEY);
  if (!lastApp) return { allowed: true };

  const lastTime = parseInt(lastApp);
  const now = Date.now();
  const diffMs = now - lastTime;
  const diffMinutes = diffMs / (1000 * 60);

  if (diffMinutes < RATE_LIMIT_MINUTES) {
    const remainingSeconds = Math.ceil((RATE_LIMIT_MINUTES * 60 * 1000 - diffMs) / 1000);
    return { allowed: false, remainingSeconds };
  }
  return { allowed: true };
}

function setRateLimit() {
  localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString());
}

function showRateLimitWarning(seconds) {
  const warning = document.getElementById('rateLimitWarning');
  const timer = document.getElementById('rateLimitTimer');
  warning.classList.add('visible');

  let remaining = seconds;
  timer.textContent = remaining;

  const interval = setInterval(() => {
    remaining--;
    timer.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(interval);
      warning.classList.remove('visible');
    }
  }, 1000);
}

// ── Honeypot Check ─────────────────────────────────────────────
function checkHoneypot() {
  const honeypot = document.getElementById('website');
  return !honeypot || !honeypot.value;
}

// ── Tournament Detail Modal ────────────────────────────────────
function openTournamentDetail(tournamentId) {
  const t = localTournaments.find(x => x.id === tournamentId);
  if (!t) return;

  const approved = localApplications.filter(a => a.tournamentId === t.id && a.status === 'onaylandi').length;
  const maxTeams = parseInt(t.maxTeams) || 16;
  const isFull = approved >= maxTeams;
  const modeText = t.teamSize == 1 ? "1v1 Solo" : `${t.teamSize}v${t.teamSize}`;
  const countdown = getCountdown(t.deadline);

  const modal = document.getElementById('tournamentDetailModal');
  const content = document.getElementById('tourDetailContent');

  content.innerHTML = `
    <div class="app-detail-header">
      <img src="${t.logoUrl || 'tmş.png'}" alt="${t.name}" class="app-detail-logo" onerror="this.src='tmş.png'">
      <div>
        <div class="app-detail-title">${t.name}</div>
        <div class="app-detail-subtitle">${modeText} | ${t.deadline} | ${approved}/${maxTeams} Takım</div>
      </div>
    </div>
    <div class="app-detail-section">
      <h4>📋 Kurallar ve Açıklama</h4>
      <div style="background:rgba(0,0,0,0.25);padding:16px;border-radius:10px;line-height:1.8;color:var(--text-secondary);font-size:14px;white-space:pre-line;">${t.rules || 'Açıklama bulunmuyor.'}</div>
    </div>
    <div class="app-detail-section">
      <h4>⏰ Durum</h4>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        ${countdown.expired ? '<span class="security-badge warning">🔴 Süre Doldu</span>' : 
          isFull ? '<span class="security-badge warning">🟡 Kontenjan Doldu</span>' : 
          '<span class="security-badge verified">🟢 Kayıtlar Açık</span>'}
        ${countdown.urgent && !countdown.expired ? '<span class="security-badge warning">⚠️ ' + countdown.text + '</span>' : ''}
      </div>
    </div>
    <div style="display:flex;gap:12px;margin-top:24px;">
      <button class="btn-primary" style="flex:1;" onclick="closeTournamentDetail();openRegistrationForm('${t.id}');" ${isFull || countdown.expired ? 'disabled' : ''}>
        ${isFull || countdown.expired ? '⛔ Kayıtlar Kapalı' : '⚔️ Kayıt Ol'}
      </button>
      <button class="btn-secondary" style="flex:1;" onclick="closeTournamentDetail()">Kapat</button>
    </div>
  `;

  modal.classList.add('open');
}

function closeTournamentDetail() {
  document.getElementById('tournamentDetailModal').classList.remove('open');
}

// ── Application Detail Modal (for My Applications) ────────────
function openApplicationDetail(appId) {
  const app = localApplications.find(a => a.id === appId);
  if (!app) return;

  const t = localTournaments.find(x => x.id === app.tournamentId) || { name: 'Bilinmeyen' };
  const sColor = app.status === 'onaylandi' ? 'var(--accent-green)' : app.status === 'reddedildi' ? 'var(--accent-red)' : 'var(--accent-gold)';
  const sText = app.status === 'onaylandi' ? '✅ Onaylandı' : app.status === 'reddedildi' ? '❌ Reddedildi' : '⏳ İnceleniyor';
  const sBg = app.status === 'onaylandi' ? 'rgba(0,200,83,0.12)' : app.status === 'reddedildi' ? 'rgba(255,95,86,0.12)' : 'rgba(243,156,18,0.12)';

  const modal = document.getElementById('appDetailModal');
  const content = document.getElementById('appDetailContent');

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
      <img src="${app.logoUrl || 'tmş.png'}" alt="${app.teamName}" class="app-detail-logo" onerror="this.src='tmş.png'">
      <div>
        <div class="app-detail-title">${app.teamName}</div>
        <div class="app-detail-subtitle">🏆 ${t.name}</div>
      </div>
    </div>
    <div class="app-detail-section">
      <h4>📊 Başvuru Durumu</h4>
      <span class="my-app-status" style="color:${sColor};border-color:${sColor};background:${sBg};">${sText}</span>
      ${app.rejectionReason ? `<div style="margin-top:12px;padding:12px;background:rgba(255,95,86,0.05);border-radius:8px;border:1px solid rgba(255,95,86,0.2);"><strong style="color:var(--accent-red);">Red Gerekçesi:</strong> <span style="color:var(--text-secondary);font-size:13px;">${app.rejectionReason}</span></div>` : ''}
    </div>
    <div class="app-detail-section">
      <h4>👥 Kadro</h4>
      ${playersHtml}
    </div>
    <div class="app-detail-section">
      <h4>📅 Başvuru Tarihi</h4>
      <div style="color:var(--text-secondary);font-size:14px;">
        ${app.timestamp ? new Date(app.timestamp.toDate ? app.timestamp.toDate() : app.timestamp).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Bilinmiyor'}
      </div>
    </div>
    <button class="btn-secondary" style="width:100%;margin-top:20px;" onclick="closeApplicationDetail()">Kapat</button>
  `;

  modal.classList.add('open');
}

function closeApplicationDetail() {
  document.getElementById('appDetailModal').classList.remove('open');
}

// ── Enhanced Form Submit with Rate Limit & Honeypot ────────────
// Override the original submit handler

// ── Turnstile Global ───────────────────────────────────────────
let turnstileToken = null;

window.onTurnstileSuccess = function(token) {
  turnstileToken = token;
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) submitBtn.disabled = false;
};

window.onTurnstileError = function() {
  turnstileToken = null;
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) submitBtn.disabled = true;
  showToast("Hata", "Güvenlik doğrulaması başarısız. Lütfen tekrar deneyin.", "error");
};

// ── Initialization ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  setupNav();
  setupLiveValidation();
  setupRealtimeListeners();

  const routeId = new URLSearchParams(window.location.search).get('id');

  if (!routeId) {
    setActiveNav('home');
    showView('hub');
    showSkeletons(4);
  }

  // İlk veri yükleme
  try {
    showLoader();
    await Promise.all([
      getDocs(collection(db, "tournaments")),
      getDocs(collection(db, "applications"))
    ]);
    hideLoader();
  } catch (e) {
    hideLoader();
    showToast("Uyarı", "Bağlantı yavaş. Önbellekten veriler gösteriliyor.", "warning", 4000);
  }

  if (routeId) {
    await openRegistrationForm(routeId);
    hideLoader();
  } else {
    renderTournaments(getFilteredTournaments());
    hideLoader();
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (unsubscribeTournaments) unsubscribeTournaments();
  if (unsubscribeApplications) unsubscribeApplications();
});
