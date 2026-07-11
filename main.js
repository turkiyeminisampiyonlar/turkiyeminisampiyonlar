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

const selectEl = document.getElementById('tournamentSelect');
const detailsBox = document.getElementById('tournamentDetails');
const playersGrid = document.getElementById('dynamicPlayersGrid');
const submitBtn = document.getElementById('submitBtn');
const statusModal = document.getElementById("statusModal");

let currentTournamentData = null;

document.getElementById("closeStatusBtn").addEventListener("click", () => statusModal.style.display = "none");
window.addEventListener("click", (e) => { if (e.target === statusModal) statusModal.style.display = "none"; });

function showPopup(title, msg, isSuccess = true) {
    document.getElementById("statusTitle").innerText = title;
    document.getElementById("statusMessage").innerText = msg;
    document.getElementById("statusIcon").innerHTML = isSuccess ? 
        `<span style="font-size: 50px; color: #00ff87;">✓</span>` : `<span style="font-size: 50px; color: #ff0055;">✕</span>`;
    statusModal.style.display = "flex";
}

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const snap = await getDocs(collection(db, "tournaments"));
        selectEl.innerHTML = '<option value="">-- Turnuva Seçiniz --</option>';
        snap.forEach(d => {
            const t = d.data();
            selectEl.innerHTML += `<option value="${d.id}">${t.title}</option>`;
        });
    } catch (err) {
        console.error("Turnuva listesi alınamadı:", err);
    }
});

selectEl.addEventListener('change', async (e) => {
    const tId = e.target.value;
    if (!tId) { detailsBox.style.display = 'none'; playersGrid.innerHTML = ''; return; }

    try {
        const dSnap = await getDoc(doc(db, "tournaments", tId));
        if (dSnap.exists()) {
            currentTournamentData = { id: dSnap.id, ...dSnap.data() };
            
            document.getElementById('viewTitle').innerText = currentTournamentData.title;
            document.getElementById('viewDate').innerText = currentTournamentData.date || '-';
            document.getElementById('viewReward').innerText = currentTournamentData.reward || '-';
            document.getElementById('viewSize').innerText = currentTournamentData.teamSize || '3';

            const appSnap = await getDocs(collection(db, "applications"));
            let approvedCount = 0;
            appSnap.forEach(docBox => {
                const a = docBox.data();
                if (a.tournamentId === tId && a.status === "onaylandi") approvedCount++;
            });

            const maxTeams = parseInt(currentTournamentData.maxTeams) || 16;
            const fillPercent = Math.min((approvedCount / maxTeams) * 100, 100);
            document.getElementById('quotaFill').style.width = fillPercent + '%';
            document.getElementById('quotaText').innerText = `Kayıtlı Takım: ${approvedCount} / ${maxTeams}`;

            if (approvedCount >= maxTeams) {
                submitBtn.disabled = true;
                submitBtn.innerText = "KONTENJAN DOLDU";
            } else {
                submitBtn.disabled = false;
                submitBtn.innerText = "Savaşa Katıl";
            }

            playersGrid.innerHTML = '';
            const size = parseInt(currentTournamentData.teamSize) || 3;
            for (let i = 1; i <= size; i++) {
                playersGrid.innerHTML += `
                    <div class="player-card">
                        <h3>Oyuncu ${i} ${i===1 ? '(Kaptan)' : ''}</h3>
                        <input type="text" class="p-name" placeholder="Oyun İçi Adı (IGN)" required>
                        <input type="email" class="p-email" placeholder="E-Posta Adresi" required>
                        <input type="text" class="p-yt" placeholder="YouTube / Sosyal Medya" required>
                    </div>
                `;
            }
            detailsBox.style.display = 'block';
        }
    } catch (err) {
        console.error(err);
    }
});

document.getElementById('registrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectEl.value) { alert("Lütfen önce bir turnuva seçin!"); return; }

    submitBtn.disabled = true;
    submitBtn.innerText = "Logonuz Yükleniyor...";

    const logoFile = document.getElementById('teamLogo').files[0];
    const teamName = document.getElementById('teamName').value;

    try {
        const formData = new FormData();
        formData.append('image', logoFile);
        const imgRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
        const imgData = await imgRes.json();
        const logoUrl = imgData.data.url;

        submitBtn.innerText = "Kaydediliyor...";

        const playerCards = document.querySelectorAll('.player-card');
        const playersList = [];
        playerCards.forEach(card => {
            playersList.push({
                name: card.querySelector('.p-name').value,
                email: card.querySelector('.p-email').value,
                yt: card.querySelector('.p-yt').value
            });
        });

        await addDoc(collection(db, "applications"), {
            tournamentId: selectEl.value,
            tournamentTitle: currentTournamentData.title,
            teamName: teamName,
            logoUrl: logoUrl,
            status: "bekliyor",
            players: playersList,
            timestamp: new Date()
        });

        showPopup("BAŞVURU ALINDI!", "Takım başvurunuz sisteme eklendi. Admin onayından sonra kaptana mail gönderilecektir.", true);
        document.getElementById('registrationForm').reset();
        playersGrid.innerHTML = '';
        detailsBox.style.display = 'none';
    } catch (err) {
        console.error(err);
        showPopup("HATA!", "İşlem sırasında teknik sorun oluştu.", false);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Savaşa Katıl";
    }
});
