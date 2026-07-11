import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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

const ADMIN_EMAIL = "necron.offical@gmail.com";

const loginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const adminSelect = document.getElementById('adminTournamentSelect');
const tournamentForm = document.getElementById('tournamentForm');
const applicationsList = document.getElementById('applicationsList');
const loginError = document.getElementById('loginError');

loginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(err => {
        console.error(err);
        loginError.innerText = "Giriş ekranı açılırken hata!";
    });
});

logoutBtn.addEventListener('click', () => { signOut(auth); });

onAuthStateChanged(auth, (user) => {
    if (user) {
        if (user.email === ADMIN_EMAIL) {
            loginSection.style.display = 'none';
            dashboardSection.style.display = 'block';
            syncAdminPanel();
        } else {
            loginError.innerText = "Yetkisiz hesap! Giriş engellendi.";
            signOut(auth);
        }
    } else {
        loginSection.style.display = 'block';
        dashboardSection.style.display = 'none';
    }
});

async function syncAdminPanel() {
    try {
        const snap = await getDocs(collection(db, "tournaments"));
        adminSelect.innerHTML = '<option value="new">++ Yeni Turnuva Ekle ++</option>';
        snap.forEach(d => {
            adminSelect.innerHTML += `<option value="${d.id}">${d.data().title}</option>`;
        });
    } catch (e) { console.error(e); }

    applicationsList.innerHTML = '<p style="color:#f39c12;">Başvurular taranıyor...</p>';
    try {
        const querySnapshot = await getDocs(collection(db, "applications"));
        applicationsList.innerHTML = '';
        
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.status === "bekliyor") {
                const card = document.createElement('div');
                card.style = "background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #252932;";
                
                let playersHtml = '';
                (data.players || []).forEach((p, idx) => {
                    playersHtml += `<p style="font-size:12px; margin: 3px 0;"><b>Oyuncu ${idx+1}:</b> ${p.name || ''} - <a href="${p.yt || '#'}" target="_blank" style="color:#60efff;">Sosyal Medya</a></p>`;
                });

                card.innerHTML = `
                    <p style="font-size:11px; color:#f39c12; font-weight:700; text-transform:uppercase;">🏆 ${data.tournamentTitle || 'Belirsiz Turnuva'}</p>
                    <h4 style="margin: 5px 0; color:#fff;">Takım: ${data.teamName || 'İsimsiz'}</h4>
                    <img src="${data.logoUrl || ''}" style="max-height:50px; border-radius:4px; margin-bottom:5px;">
                    ${playersHtml}
                    <div style="margin-top:10px; display:flex; gap:8px;">
                        <button class="btn-primary" style="padding:5px 12px; font-size:12px; background:#00ff87; color:#000;" id="ok-${docSnap.id}">Onayla</button>
                        <button class="btn-secondary" style="padding:5px 12px; font-size:12px; background:#ff0055; color:#fff; border:none;" id="no-${docSnap.id}">Reddet</button>
                    </div>
                `;
                applicationsList.appendChild(card);

                card.querySelector(`#ok-${docSnap.id}`).addEventListener('click', () => handleAction(docSnap.id, 'onayla', data.players?.[0]?.email, data.teamName));
                card.querySelector(`#no-${docSnap.id}`).addEventListener('click', () => handleAction(docSnap.id, 'reddet', data.players?.[0]?.email, data.teamName));
            }
        });

        if (applicationsList.innerHTML === '') {
            applicationsList.innerHTML = '<p style="color:#727991; font-size:13px;">Bekleyen yeni kayıt bulunmuyor.</p>';
        }
    } catch (error) {
        console.error(error);
        applicationsList.innerHTML = `<p style="color:#ff0055; font-size:13px;">Hata oluştu: ${error.message}</p>`;
    }
}

adminSelect.addEventListener('change', async (e) => {
    if (e.target.value === 'new') { tournamentForm.reset(); return; }
    try {
        const snap = await getDocs(collection(db, "tournaments"));
        snap.forEach(d => {
            if (d.id === e.target.value) {
                const t = d.data();
                document.getElementById('tTitle').value = t.title || '';
                document.getElementById('tDate').value = t.date || '';
                document.getElementById('tReward').value = t.reward || '';
                document.getElementById('tMaxTeams').value = t.maxTeams || '';
            }
        });
    } catch (err) { console.error(err); }
});

tournamentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tId = adminSelect.value;
    const tData = {
        title: document.getElementById('tTitle').value,
        date: document.getElementById('tDate').value,
        reward: document.getElementById('tReward').value,
        maxTeams: document.getElementById('tMaxTeams').value,
        teamSize: "3"
    };

    try {
        if (tId === 'new') {
            await addDoc(collection(db, "tournaments"), tData);
            alert("Yeni turnuva başarıyla oluşturuldu.");
        } else {
            await updateDoc(doc(db, "tournaments", tId), tData);
            alert("Mevcut turnuva esporcu verilerine zarar verilmeden güncellendi.");
        }
        tournamentForm.reset();
        syncAdminPanel();
    } catch (err) { alert("Hata: " + err.message); }
});

async function handleAction(docId, action, p1Email, teamName) {
    const isApproved = action === 'onayla';
    try {
        if (p1Email) {
            await emailjs.send('service_bftdxcy', isApproved ? 'template_01nnh1s' : 'template_cpy48jt', {
                to_email: p1Email,
                team_name: teamName
            });
        }
        await updateDoc(doc(db, "applications", docId), { status: isApproved ? "onaylandi" : "reddedildi" });
        alert("Prosedür başarıyla tamamlandı.");
        syncAdminPanel();
    } catch (e) { alert("İşlem başarısız: " + e.message); }
}
