import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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
const db = getFirestore(app);

const IMGBB_API_KEY = "43c8e0a8c3277336886330d1172f988a"; 

document.getElementById('registrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    const statusMsg = document.getElementById('statusMessage');
    submitBtn.disabled = true;
    submitBtn.innerText = "Logonuz Yükleniyor...";

    const teamName = document.getElementById('teamName').value;
    const logoFile = document.getElementById('teamLogo').files[0];

    try {
        // ImgBB'ye resmi yükle
        const formData = new FormData();
        formData.append('image', logoFile);
        
        const imgResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        const imgData = await imgResponse.json();
        const logoUrl = imgData.data.url;

        submitBtn.innerText = "Başvuru Kaydediliyor...";

        // Veritabanına yaz
        await addDoc(collection(db, "applications"), {
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

        statusMsg.style.color = "lightgreen";
        statusMsg.innerText = "Başvurunuz başarıyla alındı!";
        document.getElementById('registrationForm').reset();
    } catch (error) {
        console.error(error);
        statusMsg.style.color = "red";
        statusMsg.innerText = "Bir hata oluştu. Lütfen tekrar deneyin.";
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Başvuruyu Gönder";
    }
});
