import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc,
  onSnapshot, enableIndexedDbPersistence, query, orderBy, where
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
enableIndexedDbPersistence(db).catch(() => {});

const IMGBB_API_KEY = "43c8e0a8c3277336886330d1172f988a";

// ═══════════════════════════════════════════════════════════════
// ÇOKLU DİL (i18n) — Özellik #15
// ═══════════════════════════════════════════════════════════════
const i18n = {
  tr: {
    loaderText: "BAĞLANTI SAĞLANIYOR", navHome: "Ana Sayfa", navMyApps: "Katıldıklarım", navAdmin: "Yönetici",
    siteTitle: "Türkiye Mini Şampiyonlar", siteSubtitle: "Henüz keşfedilmemiş yeteneklerin düello meydanı",
    searchPlaceholder: "Turnuva ara...", filterAll: "Tümü", filterActive: "Açık", filterExpired: "Kapalı", filterFull: "Dolu", filterPaused: "Durdurulmuş",
    myAppsTitle: "🎮 Katıldığım Turnuvalar", emailPlaceholder: "Kaptan e-posta adresiniz", queryBtn: "Sorgula",
    notifSettings: "🔔 Bildirim Tercihleri", notifEmail: "E-posta Bildirimleri", notifPush: "Web Push Bildirimleri", notifReminder: "Deadline Hatırlatıcı",
    backToHub: "Turnuvalara Dön", backToMyApps: "Başvurularıma Dön", rateLimitTitle: "⏳ Çok Fazla Başvuru",
    rateLimitDesc: "Güvenlik nedeniyle kısa sürede tekrar başvuru yapamazsınız.", rateLimitRetry: "saniye sonra tekrar deneyebilirsiniz.",
    formTitle: "⚔️ Espor Kayıt Formu", teamNameLabel: "Takım / Oyuncu İsmi", teamLogoLabel: "Takım Logosu",
    uploadText: "Logoyu sürükleyin veya tıklayın", uploadHint: "Kare (1:1) format, max 5MB",
    logoHint: "Logo tam kare (1:1) boyutta olmalıdır", submitBtn: "Savaşa Katıl ve Kaydı Tamamla",
    editFormTitle: "✏️ Başvurunu Düzenle", saveChanges: "Değişiklikleri Kaydet", closeBtn: "Kapat",
    confirmTitle: "Emin misiniz?", confirmMessage: "Bu işlem geri alınamaz.", cancelBtn: "Vazgeç", confirmBtn: "Onayla",
    statusPending: "⏳ İnceleniyor", statusApproved: "✅ Onaylandı", statusRejected: "❌ Reddedildi", statusWaitlist: "📋 Bekleme Listesinde",
    cancelApp: "Başvuruyu İptal Et", editApp: "Düzenle", queuePosition: "Sıra", shareTitle: "Turnuvayı Paylaş",
    pausedMsg: "⏸️ Bu turnuva geçici olarak durdurulmuş.", waitlistMsg: "Kontenjan dolu. Bekleme listesine kaydolun.",
    waitlistBtn: "Bekleme Listesine Kaydol", fullMsg: "Kontenjan Dolu"
  },
  en: {
    loaderText: "CONNECTING", navHome: "Home", navMyApps: "My Apps", navAdmin: "Admin",
    siteTitle: "Turkey Mini Champions", siteSubtitle: "The arena of undiscovered talents",
    searchPlaceholder: "Search tournaments...", filterAll: "All", filterActive: "Open", filterExpired: "Closed", filterFull: "Full", filterPaused: "Paused",
    myAppsTitle: "🎮 My Tournaments", emailPlaceholder: "Captain email address", queryBtn: "Query",
    notifSettings: "🔔 Notification Settings", notifEmail: "Email Notifications", notifPush: "Web Push Notifications", notifReminder: "Deadline Reminder",
    backToHub: "Back to Tournaments", backToMyApps: "Back to My Apps", rateLimitTitle: "⏳ Too Many Applications",
    rateLimitDesc: "You cannot apply again shortly for security reasons.", rateLimitRetry: "seconds left before retry.",
    formTitle: "⚔️ Esports Registration Form", teamNameLabel: "Team / Player Name", teamLogoLabel: "Team Logo",
    uploadText: "Drag logo or click", uploadHint: "Square (1:1) format, max 5MB",
    logoHint: "Logo must be square (1:1)", submitBtn: "Join the Battle & Complete",
    editFormTitle: "✏️ Edit Your Application", saveChanges: "Save Changes", closeBtn: "Close",
    confirmTitle: "Are you sure?", confirmMessage: "This action cannot be undone.", cancelBtn: "Cancel", confirmBtn: "Confirm",
    statusPending: "⏳ Pending", statusApproved: "✅ Approved", statusRejected: "❌ Rejected", statusWaitlist: "📋 Waitlist",
    cancelApp: "Cancel Application", editApp: "Edit", queuePosition: "Queue", shareTitle: "Share Tournament",
    pausedMsg: "⏸️ This tournament is temporarily paused.", waitlistMsg: "Quota full. Join the waitlist.",
    waitlistBtn: "Join Waitlist", fullMsg: "Quota Full"
  }
};

let currentLang = localStorage.getItem('tms_lang') || 'tr';
function t(key) { return i18n[currentLang]?.[key] || i18n.tr[key] || key; }
function updateI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[currentLang][key]) el.textContent = i18n[currentLang][key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (i18n[currentLang][key]) el.placeholder = i18n[currentLang][key];
  });
  document.documentElement.lang = currentLang;
}

// ═══════════════════════════════════════════════════════════════
// TEMA MOTORU — Özellik #14
// ═══════════════════════════════════════════════════════════════
function initTheme() {
  const saved = localStorage.getItem('tms_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = saved === 'dark' ? '☀️' : '🌙';
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('tms_theme', next);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
}

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════
let localTournaments    = [];
let localApplications   = [];
let currentTournamentId = null;
let currentFilter       = 'all';
let unsubscribeTournaments = null;
let unsubscribeApplications = null;
let turnstileToken = null;
let editingAppId = null;

// ── DOM Elements ────────────────────────────────────────────────
const loader = document.getElementById('tms-loader');
const toastContainer = document.getElementById('toastContainer');
const tournamentHubView = document.getElementById('tournamentHubView');
const registrationFormView = document.getElementById('registrationFormView');
const myApplicationsView = document.getElementById('myApplicationsView');
const editApplicationView = document.getElementById('editApplicationView');
const heroSection = document.getElementById('heroSection');
const tournamentGrid = document.getElementById('tournamentGrid');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const filterBar = document.getElementById('filterBar');
const selectedCard = document.getElementById('selectedTournamentCard');
const backToHubBtn = document.getElementById('backToHubBtn');
const backToMyAppsBtn = document.getElementById('backToMyAppsBtn');
const submitBtn = document.getElementById('submitBtn');
const statusModal = document.getElementById('statusModal');
const confirmModal = document.getElementById('confirmModal');
const navHomeBtn = document.getElementById('navHomeBtn');
const navMyAppsBtn = document.getElementById('navMyAppsBtn');
const bottomNavHome = document.getElementById('bottomNavHome');
const bottomNavMyApps = document.getElementById('bottomNavMyApps');
const fileUploadZone = document.getElementById('fileUploadZone');
const logoPreview = document.getElementById('logoPreview');
const teamLogoInput = document.getElementById('teamLogo');

// ── Toast System ───────────────────────────────────────────────
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
    <button class="toast-close" aria-label="Kapat">✕</button>
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

// ── Loader ─────────────────────────────────────────────────────
function showLoader(text) {
  const el = loader.querySelector('.loader-text');
  if (el) el.textContent = text || t('loaderText');
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

// ── View Management ────────────────────────────────────────────
function showView(view) {
  tournamentHubView.style.display = 'none';
  registrationFormView.style.display = 'none';
  myApplicationsView.style.display = 'none';
  editApplicationView.style.display = 'none';
  heroSection.style.display = 'none';
  if (view === 'hub') { heroSection.style.display = 'block'; tournamentHubView.style.display = 'block'; }
  else if (view === 'form') { registrationFormView.style.display = 'block'; }
  else if (view === 'myapps') { myApplicationsView.style.display = 'block'; }
  else if (view === 'edit') { editApplicationView.style.display = 'block'; }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Navbar ─────────────────────────────────────────────────────
function setActiveNav(active) {
  [navHomeBtn, navMyAppsBtn, bottomNavHome, bottomNavMyApps].forEach(btn => {
    btn?.classList.remove('active');
    btn?.removeAttribute('aria-current');
  });
  if (active === 'home') { navHomeBtn?.classList.add('active'); navHomeBtn?.setAttribute('aria-current', 'page'); bottomNavHome?.classList.add('active'); }
  if (active === 'myapps') { navMyAppsBtn?.classList.add('active'); navMyAppsBtn?.setAttribute('aria-current', 'page'); bottomNavMyApps?.classList.add('active'); }
}

function setupNav() {
  const goHome = () => { setActiveNav('home'); showView('hub'); window.history.pushState({}, '', 'index.html'); };
  const goMyApps = () => { setActiveNav('myapps'); showView('myapps'); };
  navHomeBtn?.addEventListener('click', goHome);
  bottomNavHome?.addEventListener('click', goHome);
  navMyAppsBtn?.addEventListener('click', goMyApps);
  bottomNavMyApps?.addEventListener('click', goMyApps);
}

// ── Real-time Listeners ────────────────────────────────────────
function setupRealtimeListeners() {
  const tourQuery = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
  unsubscribeTournaments = onSnapshot(tourQuery, (snapshot) => {
    localTournaments = [];
    snapshot.forEach(d => localTournaments.push({ id: d.id, ...d.data() }));
    if (tournamentHubView.style.display !== 'none') renderTournaments(getFilteredTournaments());
    // Otomatik kapanış kontrolü — Özellik #5
    checkAutoClose();
  }, (err) => { console.warn("Turnuva dinleyici:", err); });

  const appQuery = query(collection(db, "applications"), orderBy("timestamp", "desc"));
  unsubscribeApplications = onSnapshot(appQuery, (snapshot) => {
    localApplications = [];
    snapshot.forEach(d => localApplications.push({ id: d.id, ...d.data() }));
    if (tournamentHubView.style.display !== 'none') renderTournaments(getFilteredTournaments());
  }, (err) => { console.warn("Başvuru dinleyici:", err); });
}

// ── Otomatik Kapanış — Özellik #5
function checkAutoClose() {
  const today = new Date(); today.setHours(0,0,0,0);
  localTournaments.forEach(async t => {
    if (t.status === 'active' && t.deadline) {
      const dl = new Date(t.deadline);
      if (dl < today && !t.autoClosed) {
        await updateDoc(doc(db, "tournaments", t.id), { status: 'completed', autoClosed: true });
      }
    }
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
  if (days > 0) return { text: `⏰ ${days} gün ${hours} saat`, urgent: days <= 2, expired: false };
  if (hours > 0) return { text: `⏰ ${hours} saat`, urgent: true, expired: false };
  return { text: '⏰ Son saatler!', urgent: true, expired: false };
}

// ── Tournament Filtering ───────────────────────────────────────
function getFilteredTournaments() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const today = new Date(); today.setHours(0,0,0,0);
  return localTournaments.filter(t => {
    if (searchTerm && !t.name.toLowerCase().includes(searchTerm)) return false;
    const isExpired = new Date(t.deadline) < today;
    const approvedCount = localApplications.filter(a => a.tournamentId === t.id && a.status === 'onaylandi').length;
    const maxTeams = parseInt(t.maxTeams) || 16;
    const isFull = approvedCount >= maxTeams;
    const isPaused = t.status === 'paused';
    if (currentFilter === 'active' && (isExpired || isFull || isPaused)) return false;
    if (currentFilter === 'expired' && !isExpired) return false;
    if (currentFilter === 'full' && !isFull) return false;
    if (currentFilter === 'paused' && !isPaused) return false;
    return true;
  });
}

// ── Kategori CSS — Özellik #2
function getCategoryClass(cat) {
  const map = { fps: 'cat-fps', moba: 'cat-moba', br: 'cat-br', strategy: 'cat-strategy', sports: 'cat-sports' };
  return map[cat] || 'cat-sports';
}
function getCategoryLabel(cat) {
  const map = { fps: 'FPS', moba: 'MOBA', br: 'Battle Royale', strategy: 'Strateji', sports: 'Spor' };
  return map[cat] || cat?.toUpperCase() || 'TURNUVA';
}

// ── Render Tournaments ─────────────────────────────────────────
function renderTournaments(list) {
  tournamentGrid.innerHTML = '';
  if (list.length === 0) {
    const emptyMsg = searchInput.value.trim() ? t('searchNoResult') : currentFilter !== 'all' ? t('filterNoResult') : t('noTournaments');
    tournamentGrid.innerHTML = `
      <div style="grid-column:1/-1;" class="empty-state">
        <div class="empty-icon" aria-hidden="true">🏆</div>
        <div class="empty-title" data-i18n="noTournaments">Turnuva Yok</div>
        ${emptyMsg}
      </div>`;
    return;
  }

  list.forEach((t, idx) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const isExpired = new Date(t.deadline) < today;
    const approvedCount = localApplications.filter(a => a.tournamentId === t.id && a.status === 'onaylandi').length;
    const maxTeams = parseInt(t.maxTeams) || 16;
    const isFull = approvedCount >= maxTeams;
    const isPaused = t.status === 'paused';
    const pct = Math.min(100, Math.round((approvedCount / maxTeams) * 100));
    const countdown = getCountdown(t.deadline);
    const modeText = t.teamSize == 1 ? "1v1 Solo" : `${t.teamSize}v${t.teamSize}`;

    let badgeClass = 't-badge-active', badgeText = t('filterActive');
    if (isPaused) { badgeClass = 't-badge-paused'; badgeText = '⏸️ ' + (currentLang === 'tr' ? 'Durduruldu' : 'Paused'); }
    else if (isExpired) { badgeClass = 't-badge-expired'; badgeText = t('filterExpired'); }
    else if (isFull) { badgeClass = 't-badge-full'; badgeText = t('filterFull'); }

    const disabled = isExpired || isFull || isPaused;
    const btnText = isPaused ? t('pausedMsg') : isExpired ? t('filterExpired') : (isFull ? t('fullMsg') : (currentLang === 'tr' ? 'Detay ve Kayıt Ol' : 'Details & Register'));

    const card = document.createElement('div');
    card.className = 'tournament-card';
    card.style.animationDelay = `${idx * 0.05}s`;
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${t.name}, ${badgeText}`);

    card.innerHTML = `
      <span class="t-badge ${badgeClass}">${badgeText}</span>
      ${isPaused ? '<div class="t-pause-badge">DURDURULDU</div>' : ''}
      <div class="t-logo-container">
        <img class="t-logo" src="${t.logoUrl || 'tmş.png'}" alt="${t.name} logosu" onerror="this.src='tmş.png'" loading="lazy">
      </div>
      ${t.category ? `<span class="category-badge ${getCategoryClass(t.category)}">${getCategoryLabel(t.category)}</span>` : ''}
      <div class="t-title">${t.name}</div>
      <div class="t-mode">${modeText}</div>
      <div class="t-deadline">📅 ${t.deadline}</div>
      ${!isExpired && !isPaused ? `<div class="t-countdown ${countdown.urgent ? 'urgent' : ''}">${countdown.text}</div>` : ''}
      <div class="quota-bar-wrap">
        <div class="quota-bar-track" role="progressbar" aria-valuenow="${approvedCount}" aria-valuemax="${maxTeams}" aria-label="Kontenjan">
          <div class="quota-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="quota-label">📊 ${approvedCount} / ${maxTeams} Takım</span>
      </div>
      <div class="t-desc">${t.rules || ''}</div>
      <div class="share-bar">
        <button class="share-btn twitter" title="Twitter" onclick="event.stopPropagation();shareTournament('${t.id}','twitter')">🐦</button>
        <button class="share-btn whatsapp" title="WhatsApp" onclick="event.stopPropagation();shareTournament('${t.id}','whatsapp')">📱</button>
        <button class="share-btn" title="Copy Link" onclick="event.stopPropagation();shareTournament('${t.id}','copy')">🔗</button>
      </div>
      <div class="t-actions">
        <button class="btn-primary select-t-btn" style="flex:1;" ${disabled ? 'disabled' : ''} aria-label="${t.name} kayıt">
          ${btnText}
        </button>
        <button class="btn-ghost detail-btn" data-id="${t.id}" aria-label="Detay" title="Detay">👁️</button>
        ${!disabled ? `<button class="btn-ghost copy-link-btn" data-id="${t.id}" aria-label="Link" title="Link">🔗</button>` : ''}
      </div>
    `;

    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !disabled) openRegistrationForm(t.id); });
    if (!disabled) {
      card.querySelector('.select-t-btn').addEventListener('click', () => {
        window.history.pushState({}, '', `?id=${t.id}`);
        openRegistrationForm(t.id);
      });
    }
    card.querySelector('.detail-btn').addEventListener('click', (e) => { e.stopPropagation(); openTournamentDetail(t.id); });
    const copyBtn = card.querySelector('.copy-link-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = `${window.location.origin}${window.location.pathname}?id=${t.id}`;
        navigator.clipboard.writeText(url).then(() => showToast(t('shareTitle'), currentLang === 'tr' ? 'Link kopyalandı!' : 'Link copied!', 'success', 2000));
      });
    }
    tournamentGrid.appendChild(card);
  });
}

// ── Sosyal Paylaşım — Özellik #19
window.shareTournament = function(tid, platform) {
  const t = localTournaments.find(x => x.id === tid);
  if (!t) return;
  const url = encodeURIComponent(`${window.location.origin}${window.location.pathname}?id=${tid}`);
  const text = encodeURIComponent(`${t.name} - TMŞ Turnuvası`);
  if (platform === 'twitter') window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
  else if (platform === 'whatsapp') window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
  else if (platform === 'copy') {
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?id=${tid}`);
    showToast(t('shareTitle'), 'Link copied!', 'success', 2000);
  }
};

// ── Search with Debounce ───────────────────────────────────────
let searchTimeout;
searchInput.addEventListener('input', () => {
  searchClear.classList.toggle('visible', searchInput.value.length > 0);
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => renderTournaments(getFilteredTournaments()), 200);
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

// ── Registration Form ──────────────────────────────────────────
async function openRegistrationForm(tournamentId) {
  currentTournamentId = tournamentId;
  let t = localTournaments.find(x => x.id === tournamentId);
  if (!t) {
    try {
      showLoader();
      const snap = await getDoc(doc(db, "tournaments", tournamentId));
      hideLoader();
      if (snap.exists()) t = { id: snap.id, ...snap.data() };
    } catch(e) { hideLoader(); console.error(e); }
  }
  if (!t) { showToast("Hata", "Turnuva bulunamadı.", "error"); window.history.pushState({}, '', 'index.html'); return; }

  const approved = localApplications.filter(a => a.tournamentId === t.id && a.status === 'onaylandi').length;
  const maxTeams = parseInt(t.maxTeams) || 16;
  const isFull = approved >= maxTeams;
  const isPaused = t.status === 'paused';
  const modeText = t.teamSize == 1 ? "1v1 Solo" : `${t.teamSize}v${t.teamSize}`;
  const countdown = getCountdown(t.deadline);

  selectedCard.innerHTML = `
    <img src="${t.logoUrl || 'tmş.png'}" alt="${t.name}" onerror="this.src='tmş.png'" style="width:68px;height:68px;border-radius:14px;object-fit:cover;border:2px solid var(--accent-gold);flex-shrink:0;display:block;">
    <div style="flex:1;min-width:0;">
      <div style="font-size:18px;font-weight:800;color:var(--text-primary);line-height:1.3;">
        ${t.name} <span style="color:var(--accent-gold);font-size:13px;font-weight:700;">[${modeText}]</span>
      </div>
      <div style="color:var(--text-secondary);font-size:13px;margin:8px 0;">
        ⏰ <strong style="color:var(--accent-gold);">${t.deadline}</strong> &nbsp;|&nbsp;
        📊 <strong style="color:var(--accent-green);">${approved}/${maxTeams} Onaylı</strong>
        ${countdown.urgent && !countdown.expired ? `<span style="color:var(--accent-red);margin-left:8px;">⚠️ ${countdown.text}</span>` : ''}
      </div>
      <div style="color:var(--text-secondary);font-size:13px;white-space:pre-line;background:rgba(0,0,0,0.25);padding:12px;border-radius:10px;max-height:140px;overflow-y:auto;line-height:1.6;">${t.rules || ''}</div>
    </div>
  `;

  // Durdurulmuş turnuva kontrolü
  if (isPaused) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span aria-hidden="true">⏸️</span> ' + t('pausedMsg');
  } else if (isFull) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span aria-hidden="true">📋</span> ' + t('waitlistBtn');
  } else {
    submitBtn.disabled = !turnstileToken;
    submitBtn.innerHTML = '<span aria-hidden="true">⚔️</span> ' + t('submitBtn');
  }

  // Reset form
  document.getElementById('teamName').value = '';
  document.getElementById('teamNameHint').textContent = '';
  document.getElementById('teamNameHint').className = 'hint-text';
  logoPreview.src = ''; logoPreview.classList.remove('visible');
  document.getElementById('logoHint').textContent = '⚠️ ' + t('logoHint');
  document.getElementById('logoHint').className = 'hint-text';
  teamLogoInput.value = '';

  const container = document.getElementById('dynamicPlayersContainer');
  container.innerHTML = '';
  const size = parseInt(t.teamSize) || 3;
  for (let i = 1; i <= size; i++) {
    const box = document.createElement('div');
    box.className = 'player-box';
    box.innerHTML = `
      <h4><span class="player-avatar" aria-hidden="true">${i}</span> ${i === 1 ? (currentLang === 'tr' ? 'Kaptan' : 'Captain') : (currentLang === 'tr' ? `Oyuncu ${i}` : `Player ${i}`)}</h4>
      <div class="input-grid">
        <div class="input-group">
          <label>IGN <span class="required">*</span></label>
          <input type="text" class="p-name" placeholder="Nick" autocomplete="off" data-player="${i}">
        </div>
        <div class="input-group">
          <label>E-Posta <span class="required">*</span></label>
          <input type="email" class="p-email" placeholder="ornek@gmail.com" autocomplete="email" data-player="${i}">
        </div>
        <div class="input-group">
          <label>Sosyal Medya <span class="required">*</span></label>
          <input type="url" class="p-yt" placeholder="https://youtube.com/..." data-player="${i}">
        </div>
      </div>
    `;
    container.appendChild(box);
  }

  setActiveNav('');
  showView('form');
}

// ── Back to Hub ────────────────────────────────────────────────
backToHubBtn.addEventListener('click', () => {
  window.history.pushState({}, '', 'index.html');
  setActiveNav('home');
  showView('hub');
  showSkeletons(3);
  renderTournaments(getFilteredTournaments());
});

// ── File Upload ──────────────────────────────────────────────────
['dragenter','dragover','dragleave','drop'].forEach(e => {
  fileUploadZone.addEventListener(e, (ev) => { ev.preventDefault(); ev.stopPropagation(); });
});
['dragenter','dragover'].forEach(e => fileUploadZone.addEventListener(e, () => fileUploadZone.classList.add('dragover')));
['dragleave','drop'].forEach(e => fileUploadZone.addEventListener(e, () => fileUploadZone.classList.remove('dragover')));
fileUploadZone.addEventListener('drop', (e) => { const files = e.dataTransfer.files; if (files.length) { teamLogoInput.files = files; handleLogoSelect(files[0]); } });
teamLogoInput.addEventListener('change', (e) => { if (e.target.files[0]) handleLogoSelect(e.target.files[0]); });

function handleLogoSelect(file) {
  if (!file.type.startsWith('image/')) { showToast("Hata", "Geçerli görsel seçin.", "error"); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    logoPreview.src = e.target.result;
    logoPreview.classList.add('visible');
    const img = new Image();
    img.onload = () => {
      const hint = document.getElementById('logoHint');
      if (img.width === img.height) { hint.textContent = '✅ Logo boyutu uygun'; hint.className = 'hint-text success'; }
      else { hint.textContent = `⚠️ Logo kare olmalı!`; hint.className = 'hint-text error'; }
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
  if (!teamName.value.trim()) { teamName.classList.add('error'); teamNameHint.textContent = '❌ Zorunlu'; teamNameHint.className = 'hint-text error'; isValid = false; }
  else { teamName.classList.remove('error'); teamName.classList.add('success'); teamNameHint.textContent = '✅ OK'; teamNameHint.className = 'hint-text success'; }
  const logoHint = document.getElementById('logoHint');
  if (!teamLogoInput.files[0]) { logoHint.textContent = '❌ Logo zorunlu'; logoHint.className = 'hint-text error'; isValid = false; }
  const pNames = document.querySelectorAll('.p-name');
  const pEmails = document.querySelectorAll('.p-email');
  const pYts = document.querySelectorAll('.p-yt');
  for (let i = 0; i < pNames.length; i++) {
    const inputs = [pNames[i], pEmails[i], pYts[i]];
    inputs.forEach(inp => {
      inp.classList.remove('error', 'success');
      if (!inp.value.trim()) { inp.classList.add('error'); isValid = false; }
      else inp.classList.add('success');
    });
    if (pEmails[i].value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pEmails[i].value.trim())) { pEmails[i].classList.add('error'); pEmails[i].classList.remove('success'); isValid = false; }
  }
  return isValid;
}

function setupLiveValidation() {
  document.getElementById('teamName')?.addEventListener('blur', () => {
    const teamName = document.getElementById('teamName');
    const hint = document.getElementById('teamNameHint');
    if (teamName.value.trim()) { teamName.classList.remove('error'); teamName.classList.add('success'); hint.textContent = '✅ OK'; hint.className = 'hint-text success'; }
  });
}

// ── Form Submit — Özellik #11, #12, #13 (Edit, Cancel, Waitlist)
submitBtn.addEventListener('click', async () => {
  if (!turnstileToken) { showToast("Hata", "Güvenlik doğrulamasını tamamlayın.", "error"); return; }
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) { showRateLimitWarning(rateCheck.remainingSeconds); return; }
  if (!checkHoneypot()) return;

  const tData = localTournaments.find(x => x.id === currentTournamentId);
  const isFull = localApplications.filter(a => a.tournamentId === currentTournamentId && a.status === 'onaylandi').length >= (parseInt(tData?.maxTeams) || 16);

  // Bekleme listesi kontrolü — Özellik #13
  const isWaitlist = isFull && tData?.status !== 'paused';

  if (!isWaitlist && !validateForm()) {
    showToast("Hata", "Tüm zorunlu alanları doldurun.", "error");
    return;
  }

  const teamName = document.getElementById('teamName').value.trim();
  const logoFile = teamLogoInput.files[0];
  const pNames = document.querySelectorAll('.p-name');
  const pEmails = document.querySelectorAll('.p-email');
  const pYts = document.querySelectorAll('.p-yt');

  submitBtn.disabled = true;
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span aria-hidden="true">⏳</span> İşleniyor...';

  try {
    let logoUrl = '';
    if (logoFile) {
      const isSquare = await validateImageIsSquare(logoFile);
      if (!isSquare) { showToast("Hata", "Logo kare olmalı.", "error"); return; }
      const fd = new FormData(); fd.append("image", logoFile);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) throw new Error("Logo yüklenemedi.");
      logoUrl = json.data.url;
    }

    const playersList = [];
    for (let i = 0; i < pNames.length; i++) {
      playersList.push({ name: pNames[i].value.trim(), email: pEmails[i].value.trim(), yt: pYts[i].value.trim() });
    }

    const status = isWaitlist ? 'bekleme' : 'bekliyor';
    await addDoc(collection(db, "applications"), {
      tournamentId: currentTournamentId, teamName, logoUrl, status,
      players: playersList, timestamp: new Date(), isWaitlist: !!isWaitlist
    });

    setRateLimit();
    showToast("Başarılı", isWaitlist ? t('waitlistMsg') : "Başvurunuz alındı!", "success", 6000);

    // Reset
    document.getElementById('teamName').value = '';
    teamLogoInput.value = ''; logoPreview.classList.remove('visible');
    document.querySelectorAll('.p-name, .p-email, .p-yt').forEach(i => { i.value = ''; i.classList.remove('error', 'success'); });
    backToHubBtn.click();

  } catch (err) {
    console.error(err);
    showToast("Hata", err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
});

function validateImageIsSquare(file) {
  return new Promise(r => {
    const reader = new FileReader();
    reader.onload = e => { const img = new Image(); img.onload = () => r(img.width === img.height); img.onerror = () => r(false); img.src = e.target.result; };
    reader.onerror = () => r(false);
    reader.readAsDataURL(file);
  });
}

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
function setRateLimit() { localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString()); }
function showRateLimitWarning(seconds) {
  const warning = document.getElementById('rateLimitWarning');
  const timer = document.getElementById('rateLimitTimer');
  warning.classList.add('visible');
  let remaining = seconds; timer.textContent = remaining;
  const interval = setInterval(() => {
    remaining--; timer.textContent = remaining;
    if (remaining <= 0) { clearInterval(interval); warning.classList.remove('visible'); }
  }, 1000);
}

// ── Honeypot ───────────────────────────────────────────────────
function checkHoneypot() { const honeypot = document.getElementById('website'); return !honeypot || !honeypot.value; }

// ── My Applications — Özellik #11, #12, #18 (Edit, Cancel, Queue)
document.getElementById('searchMyAppsBtn').addEventListener('click', () => {
  const email = document.getElementById('myEmailInput').value.trim().toLowerCase();
  const listEl = document.getElementById('myApplicationsList');
  if (!email) { listEl.innerHTML = '<p style="color:var(--accent-red);font-size:13px;padding:8px;">E-posta giriniz.</p>'; return; }
  const myApps = localApplications.filter(a => a.players?.some(p => (p.email || '').toLowerCase() === email));
  listEl.innerHTML = '';
  if (myApps.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon" aria-hidden="true">📭</div><div class="empty-title">Başvuru Bulunamadı</div>Bu e-posta ile kayıtlı başvuru bulunamadı.</div>`;
    return;
  }
  // Bildirim ayarlarını göster
  document.getElementById('notificationSettings').style.display = 'block';

  myApps.forEach((a, idx) => {
    const tInfo = localTournaments.find(t => t.id === a.tournamentId) || { name: 'Bilinmeyen' };
    const sColor = a.status === 'onaylandi' ? 'var(--accent-green)' : a.status === 'reddedildi' ? 'var(--accent-red)' : a.status === 'bekleme' ? 'var(--accent-purple)' : 'var(--accent-gold)';
    const sText = a.status === 'onaylandi' ? t('statusApproved') : a.status === 'reddedildi' ? t('statusRejected') : a.status === 'bekleme' ? t('statusWaitlist') : t('statusPending');
    const sBorder = a.status === 'onaylandi' ? 'rgba(0,200,83,0.3)' : a.status === 'reddedildi' ? 'rgba(255,95,86,0.3)' : a.status === 'bekleme' ? 'rgba(167,139,250,0.3)' : 'rgba(243,156,18,0.3)';
    
    // Sıra numarası — Özellik #18
    let queueHtml = '';
    if (a.status === 'bekliyor' || a.status === 'bekleme') {
      const queue = localApplications.filter(x => x.tournamentId === a.tournamentId && (x.status === 'bekliyor' || x.status === 'bekleme')).sort((a,b) => (a.timestamp?.seconds||0) - (b.timestamp?.seconds||0));
      const pos = queue.findIndex(x => x.id === a.id) + 1;
      if (pos > 0) queueHtml = `<div style="font-size:11px;color:var(--accent-cyan);margin-top:4px;">#${pos} ${t('queuePosition')}</div>`;
    }

    const el = document.createElement('div');
    el.className = 'my-app-card';
    el.style.animationDelay = `${idx * 0.05}s`;
    el.innerHTML = `
      <img src="${a.logoUrl || 'tmş.png'}" alt="${a.teamName}" class="my-app-logo" onerror="this.src='tmş.png'" loading="lazy">
      <div class="my-app-info">
        <div class="my-app-name">${a.teamName}</div>
        <div class="my-app-tour">🏆 ${tInfo.name}</div>
        ${queueHtml}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
        <span class="my-app-status" style="color:${sColor};border-color:${sBorder};">${sText}</span>
        <div class="my-app-actions">
          <button class="btn-ghost btn-edit-app" style="padding:4px 10px;font-size:11px;" data-id="${a.id}">✏️ ${t('editApp')}</button>
          <button class="btn-danger btn-cancel-app" style="padding:4px 10px;font-size:11px;" data-id="${a.id}">🗑️ ${t('cancelApp')}</button>
        </div>
      </div>
    `;
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => { if (!e.target.closest('.my-app-actions')) openApplicationDetail(a.id); });
    
    // Başvuru düzenleme — Özellik #11
    el.querySelector('.btn-edit-app').addEventListener('click', (e) => { e.stopPropagation(); openEditApplication(a.id); });
    // Başvuru iptali — Özellik #12
    el.querySelector('.btn-cancel-app').addEventListener('click', async (e) => {
      e.stopPropagation();
      const confirmed = await showConfirm(t('cancelApp'), currentLang === 'tr' ? 'Başvurunuzu iptal etmek istediğinize emin misiniz?' : 'Are you sure you want to cancel?', '🗑️');
      if (!confirmed) return;
      try { await deleteDoc(doc(db, "applications", a.id)); showToast("Başarılı", "Başvuru iptal edildi.", "success"); }
      catch(err) { showToast("Hata", err.message, "error"); }
    });
    
    listEl.appendChild(el);
  });
});
document.getElementById('myEmailInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('searchMyAppsBtn').click(); });

// ── Başvuru Düzenleme — Özellik #11
async function openEditApplication(appId) {
  const appData = localApplications.find(a => a.id === appId);
  if (!appData) return;
  editingAppId = appId;
  const container = document.getElementById('editFormContent');
  container.innerHTML = '';
  
  const box = document.createElement('div');
  box.innerHTML = `
    <div class="input-group">
      <label>Takım İsmi</label>
      <input type="text" id="editTeamName" value="${appData.teamName || ''}">
    </div>
    <div class="input-group">
      <label>Yeni Logo (Boş bırakılırsa eski kalır)</label>
      <input type="file" id="editTeamLogo" accept="image/*">
    </div>
    <div id="editPlayersContainer"></div>
  `;
  container.appendChild(box);
  
  const pContainer = box.querySelector('#editPlayersContainer');
  (appData.players || []).forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'player-box';
    div.innerHTML = `
      <h4><span class="player-avatar">${i+1}</span> ${i===0 ? 'Kaptan' : `Oyuncu ${i+1}`}</h4>
      <div class="input-grid">
        <div class="input-group"><label>IGN</label><input type="text" class="edit-p-name" value="${p.name || ''}"></div>
        <div class="input-group"><label>E-Posta</label><input type="email" class="edit-p-email" value="${p.email || ''}"></div>
        <div class="input-group"><label>Sosyal Medya</label><input type="url" class="edit-p-yt" value="${p.yt || ''}"></div>
      </div>
    `;
    pContainer.appendChild(div);
  });
  
  showView('edit');
}

document.getElementById('saveEditBtn').addEventListener('click', async () => {
  if (!editingAppId) return;
  const teamName = document.getElementById('editTeamName').value.trim();
  const logoFile = document.getElementById('editTeamLogo').files[0];
  const pNames = document.querySelectorAll('.edit-p-name');
  const pEmails = document.querySelectorAll('.edit-p-email');
  const pYts = document.querySelectorAll('.edit-p-yt');
  
  const playersList = [];
  for (let i = 0; i < pNames.length; i++) {
    playersList.push({ name: pNames[i].value.trim(), email: pEmails[i].value.trim(), yt: pYts[i].value.trim() });
  }
  
  try {
    const updateData = { teamName, players: playersList, updatedAt: new Date() };
    if (logoFile) {
      const fd = new FormData(); fd.append("image", logoFile);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
      const json = await res.json();
      if (json.success) updateData.logoUrl = json.data.url;
    }
    await updateDoc(doc(db, "applications", editingAppId), updateData);
    showToast("Başarılı", "Başvuru güncellendi.", "success");
    backToMyAppsBtn.click();
  } catch (err) { showToast("Hata", err.message, "error"); }
});

backToMyAppsBtn.addEventListener('click', () => { setActiveNav('myapps'); showView('myapps'); document.getElementById('searchMyAppsBtn').click(); });

// ── Modal Management ───────────────────────────────────────────
function showModal(title, message, isSuccess) {
  const color = isSuccess ? 'var(--accent-green)' : 'var(--accent-red)';
  document.getElementById('statusTitle').innerText = title;
  document.getElementById('statusTitle').style.color = color;
  document.getElementById('statusMessage').innerText = message;
  document.getElementById('statusIcon').innerHTML = `<div style="font-size:52px;margin-bottom:16px;" aria-hidden="true">${isSuccess ? '✅' : '❌'}</div>`;
  statusModal.classList.add('open');
}
document.getElementById('closeStatusBtn').addEventListener('click', () => statusModal.classList.remove('open'));
document.getElementById('modalCloseBtn').addEventListener('click', () => statusModal.classList.remove('open'));
window.addEventListener('click', e => {
  if (e.target === statusModal) statusModal.classList.remove('open');
  if (e.target === confirmModal) confirmModal.classList.remove('open');
  if (e.target === document.getElementById('appDetailModal')) closeApplicationDetail();
  if (e.target === document.getElementById('tournamentDetailModal')) closeTournamentDetail();
});
document.getElementById('appDetailCloseBtn')?.addEventListener('click', closeApplicationDetail);
document.getElementById('tourDetailCloseBtn')?.addEventListener('click', closeTournamentDetail);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { statusModal.classList.remove('open'); confirmModal.classList.remove('open'); } });

// ── Tournament Detail Modal — Özellik #14 (Takım Profili)
function openTournamentDetail(tournamentId) {
  const t = localTournaments.find(x => x.id === tournamentId);
  if (!t) return;
  const approved = localApplications.filter(a => a.tournamentId === t.id && a.status === 'onaylandi').length;
  const maxTeams = parseInt(t.maxTeams) || 16;
  const isFull = approved >= maxTeams;
  const isPaused = t.status === 'paused';
  const modeText = t.teamSize == 1 ? "1v1 Solo" : `${t.teamSize}v${t.teamSize}`;
  const countdown = getCountdown(t.deadline);
  const modal = document.getElementById('tournamentDetailModal');
  const content = document.getElementById('tourDetailContent');
  
  // Onaylı takımları listele — Takım Profili özelliği
  const approvedTeams = localApplications.filter(a => a.tournamentId === t.id && a.status === 'onaylandi').slice(0, 5);
  let teamsHtml = '';
  if (approvedTeams.length > 0) {
    teamsHtml = `<div style="margin-top:12px;"><h4 style="font-size:12px;color:var(--accent-gold);margin-bottom:8px;">🏆 ONAYLI TAKIMLAR</h4>`;
    approvedTeams.forEach(team => {
      teamsHtml += `<div style="display:flex;align-items:center;gap:8px;padding:8px;background:rgba(0,0,0,0.2);border-radius:8px;margin-bottom:6px;">
        <img src="${team.logoUrl || 'tmş.png'}" style="width:28px;height:28px;border-radius:6px;object-fit:cover;">
        <span style="font-size:13px;font-weight:600;color:var(--text-primary);">${team.teamName}</span>
      </div>`;
    });
    teamsHtml += '</div>';
  }

  content.innerHTML = `
    <div class="app-detail-header">
      <img src="${t.logoUrl || 'tmş.png'}" alt="${t.name}" class="app-detail-logo" onerror="this.src='tmş.png'">
      <div>
        <div class="app-detail-title">${t.name}</div>
        <div class="app-detail-subtitle">${getCategoryLabel(t.category)} | ${modeText} | ${t.deadline} | ${approved}/${maxTeams} Takım</div>
      </div>
    </div>
    <div class="app-detail-section">
      <h4>📋 Kurallar</h4>
      <div style="background:rgba(0,0,0,0.25);padding:16px;border-radius:10px;line-height:1.8;color:var(--text-secondary);font-size:14px;white-space:pre-line;">${t.rules || 'Açıklama bulunmuyor.'}</div>
    </div>
    <div class="app-detail-section">
      <h4>⏰ Durum</h4>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        ${isPaused ? '<span class="security-badge warning">⏸️ Durdurulmuş</span>' : countdown.expired ? '<span class="security-badge warning">🔴 Süre Doldu</span>' : isFull ? '<span class="security-badge warning">🟡 Kontenjan Doldu</span>' : '<span class="security-badge verified">🟢 Kayıtlar Açık</span>'}
        ${countdown.urgent && !countdown.expired ? `<span class="security-badge warning">⚠️ ${countdown.text}</span>` : ''}
      </div>
    </div>
    ${teamsHtml}
    <div style="display:flex;gap:12px;margin-top:24px;">
      <button class="btn-primary" style="flex:1;" onclick="closeTournamentDetail();openRegistrationForm('${t.id}');" ${isFull || isPaused || countdown.expired ? 'disabled' : ''}>
        ${isFull ? t('waitlistBtn') : (isPaused || countdown.expired ? '⛔ Kapalı' : '⚔️ Kayıt Ol')}
      </button>
      <button class="btn-secondary" style="flex:1;" onclick="closeTournamentDetail()">Kapat</button>
    </div>
  `;
  modal.classList.add('open');
}
function closeTournamentDetail() { document.getElementById('tournamentDetailModal').classList.remove('open'); }

// ── Application Detail Modal — Özellik #14
function openApplicationDetail(appId) {
  const app = localApplications.find(a => a.id === appId);
  if (!app) return;
  const t = localTournaments.find(x => x.id === app.tournamentId) || { name: 'Bilinmeyen' };
  const sColor = app.status === 'onaylandi' ? 'var(--accent-green)' : app.status === 'reddedildi' ? 'var(--accent-red)' : app.status === 'bekleme' ? 'var(--accent-purple)' : 'var(--accent-gold)';
  const sText = app.status === 'onaylandi' ? t('statusApproved') : app.status === 'reddedildi' ? t('statusRejected') : app.status === 'bekleme' ? t('statusWaitlist') : t('statusPending');
  const sBg = app.status === 'onaylandi' ? 'rgba(0,200,83,0.12)' : app.status === 'reddedildi' ? 'rgba(255,95,86,0.12)' : app.status === 'bekleme' ? 'rgba(167,139,250,0.12)' : 'rgba(243,156,18,0.12)';
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
      </div>`;
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
      <h4>📊 Durum</h4>
      <span class="my-app-status" style="color:${sColor};border-color:${sColor};background:${sBg};">${sText}</span>
      ${app.rejectionReason ? `<div style="margin-top:12px;padding:12px;background:rgba(255,95,86,0.05);border-radius:8px;border:1px solid rgba(255,95,86,0.2);"><strong style="color:var(--accent-red);">Red Gerekçesi:</strong> <span style="color:var(--text-secondary);font-size:13px;">${app.rejectionReason}</span></div>` : ''}
    </div>
    <div class="app-detail-section"><h4>👥 Kadro</h4>${playersHtml}</div>
    <div class="app-detail-section">
      <h4>📅 Tarih</h4>
      <div style="color:var(--text-secondary);font-size:14px;">
        ${app.timestamp ? new Date(app.timestamp.toDate ? app.timestamp.toDate() : app.timestamp).toLocaleDateString(currentLang === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
      </div>
    </div>
    <button class="btn-secondary" style="width:100%;margin-top:20px;" onclick="closeApplicationDetail()">Kapat</button>
  `;
  modal.classList.add('open');
}
function closeApplicationDetail() { document.getElementById('appDetailModal').classList.remove('open'); }

// ── Turnstile ──────────────────────────────────────────────────
window.onTurnstileSuccess = function(token) {
  turnstileToken = token;
  const submitBtn = document.getElementById('submitBtn');
  const tData = localTournaments.find(x => x.id === currentTournamentId);
  if (submitBtn && tData?.status !== 'paused') submitBtn.disabled = false;
};
window.onTurnstileError = function() {
  turnstileToken = null;
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) submitBtn.disabled = true;
  showToast("Hata", "Güvenlik doğrulaması başarısız.", "error");
};

// ── Bildirim Tercihleri — Özellik #17
function initNotificationSettings() {
  const toggles = document.querySelectorAll('.notif-toggle');
  toggles.forEach(toggle => {
    const type = toggle.dataset.type;
    const saved = localStorage.getItem(`tms_notif_${type}`) !== 'false';
    toggle.classList.toggle('active', saved);
    toggle.addEventListener('click', () => {
      const isActive = toggle.classList.toggle('active');
      localStorage.setItem(`tms_notif_${type}`, isActive);
      showToast("Ayar", `${type} ${isActive ? 'aktif' : 'pasif'}`, "info", 2000);
    });
  });
}

// ── Initialization ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  updateI18n();
  setupNav();
  setupLiveValidation();
  setupRealtimeListeners();
  initNotificationSettings();
  
  // Dil değiştirme
  document.getElementById('langToggle')?.addEventListener('click', () => {
    currentLang = currentLang === 'tr' ? 'en' : 'tr';
    localStorage.setItem('tms_lang', currentLang);
    document.getElementById('langToggle').textContent = currentLang === 'tr' ? '🇹🇷' : '🇬🇧';
    updateI18n();
    renderTournaments(getFilteredTournaments());
  });
  
  // Tema değiştirme
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

  const routeId = new URLSearchParams(window.location.search).get('id');
  if (!routeId) { setActiveNav('home'); showView('hub'); showSkeletons(4); }
  
  try {
    showLoader();
    await Promise.all([getDocs(collection(db, "tournaments")), getDocs(collection(db, "applications"))]);
    hideLoader();
  } catch (e) { hideLoader(); showToast("Uyarı", "Bağlantı yavaş. Önbellekten veriler gösteriliyor.", "warning", 4000); }
  
  if (routeId) { await openRegistrationForm(routeId); hideLoader(); }
  else { renderTournaments(getFilteredTournaments()); hideLoader(); }
});

window.addEventListener('beforeunload', () => {
  if (unsubscribeTournaments) unsubscribeTournaments();
  if (unsubscribeApplications) unsubscribeApplications();
});
