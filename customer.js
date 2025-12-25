import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, onSnapshot, query, orderBy, updateDoc, increment, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCRjqWvCQRjij73KVcKIdCdyNb5jjlLSK8",
    authDomain: "mlbbbf.firebaseapp.com",
    projectId: "mlbbbf",
    storageBucket: "mlbbbf.firebasestorage.app",
    messagingSenderId: "725278425000",
    appId: "1:725278425000:web:09e91633b10c6e85c9679d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const BOT_TOKEN = "8509262213:AAHTB8EIG2lLxMPLxQpRiTpEuMSF0G0AYPk"; 
const CHAT_ID = "7788156126 ";
let userData = null;

// --- ၁။ အကောင့်ဝင်ခြင်းရှိမရှိ စစ်ဆေးခြင်း ---
onAuthStateChanged(auth, async (user) => {
    const authSec = document.getElementById('auth-section');
    const mainSec = document.getElementById('main-content');
    if (user) {
        authSec.style.display = 'none';
        mainSec.style.display = 'block';
        
        onSnapshot(doc(db, "users", user.uid), (d) => {
            if (d.exists()) {
                userData = d.data();
                document.getElementById('wallet-balance').innerText = (userData.balance || 0).toLocaleString();
                document.getElementById('user-display').innerText = userData.name;
            }
        });
        loadProducts();
    } else {
        authSec.style.display = 'block';
        mainSec.style.display = 'none';
    }
});

// --- ၂။ ပစ္စည်းများစာရင်းကို ဆွဲထုတ်ခြင်း ---
function loadProducts() {
    onSnapshot(query(collection(db, "products"), orderBy("createdAt", "desc")), (snap) => {
        const list = document.getElementById('product-list');
        list.innerHTML = "";
        snap.forEach(d => {
            const it = d.data();
            const sP = it.price;
            const ogP = it.originalPrice || 0;
            const imgJson = JSON.stringify(it.images).replace(/"/g, '&quot;');
            const safeName = it.name.replace(/'/g, "\\'");
            const safeDesc = (it.desc || "").replace(/'/g, "\\'").replace(/\n/g, "\\n");

            let badge = (ogP > sP) ? `<div class="discount-badge">${Math.round(((ogP - sP) / ogP) * 100)}% OFF</div>` : "";
            let priceHTML = (ogP > sP) 
                ? `<div><span class="text-muted small text-decoration-line-through me-1">${ogP.toLocaleString()} Ks</span><span class="text-danger fw-bold">${sP.toLocaleString()} Ks</span></div>`
                : `<div class="text-primary fw-bold">${sP.toLocaleString()} Ks</div>`;

            const isAvailable = !it.isSoldOut && it.stock > 0;
            const buyBtn = isAvailable 
                ? `<button class="btn btn-sm btn-primary w-50 fw-bold shadow-sm" onclick="window.openOrder('${safeName}', ${sP}, '${d.id}', '${it.category}')">BUY</button>`
                : `<button class="btn btn-sm btn-secondary w-50" disabled>SOLD OUT</button>`;

            list.innerHTML += `
            <div class="col-md-4 col-6 product-item" data-category="${it.category}">
                <div class="card product-card shadow-sm border-0">
                    ${badge}
                    <img src="${it.images[0]}" class="main-img" onclick="window.showDetail('${safeName}', '${safeDesc}', ${imgJson}, ${sP}, ${it.isSoldOut}, '${d.id}', '${it.category}')">
                    <div class="card-body p-2 text-center text-dark">
                        <h6 class="text-truncate fw-bold mb-1 small">${it.name}</h6>
                        <div class="small text-muted mb-1" style="font-size:0.7rem;">Stock: ${it.stock}</div>
                        ${priceHTML}
                        <div class="d-flex gap-1 mt-2">
                            <button class="btn btn-sm btn-outline-secondary w-50" onclick="window.showDetail('${safeName}', '${safeDesc}', ${imgJson}, ${sP}, ${it.isSoldOut}, '${d.id}', '${it.category}')">VIEW</button>
                            ${buyBtn}
                        </div>
                    </div>
                </div>
            </div>`;
        });
    });
}

// --- ၃။ UI ပိုင်းဆိုင်ရာ လုပ်ဆောင်ချက်များ ---
window.showDetail = (name, desc, imgs, price, isSoldOut, id, cat) => {
    document.getElementById('detailTitle').innerText = name;
    document.getElementById('detailDesc').innerText = desc.replace(/\\n/g, '\n');
    document.getElementById('detailImages').innerHTML = imgs.map((u, i) => `
        <div class="carousel-item ${i === 0 ? 'active' : ''}"><img src="${u}" class="d-block w-100"></div>`).join('');
    
    const btn = document.getElementById('detailBuyBtn');
    btn.disabled = isSoldOut;
    btn.onclick = () => { 
        const modalEl = document.getElementById('imageModal');
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
        window.openOrder(name, price, id, cat); 
    };
    new bootstrap.Modal(document.getElementById('imageModal')).show();
};

window.openOrder = (name, price, id, cat) => {
    document.getElementById('modalItemName').value = name;
    document.getElementById('displayItemName').value = name;
    document.getElementById('modalItemPrice').value = price;
    document.getElementById('modalProdId').value = id;
    document.getElementById('modalCatName').value = cat;

    document.getElementById('robuxInputs').style.display = (cat === "Robux") ? "block" : "none";
    document.getElementById('p_wallet').checked = true;
    document.getElementById('directPayDetails').style.display = "none";
    
    new bootstrap.Modal(document.getElementById('orderModal')).show();
};

// --- ၄။ Order တင်ခြင်း လုပ်ဆောင်ချက် (FIXED Version) ---
document.getElementById('orderForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('orderBtn');
    btn.disabled = true; btn.innerText = "Processing...";

    try {
        const payType = document.querySelector('input[name="payType"]:checked').value;
        const price = Number(document.getElementById('modalItemPrice').value);
        const prodId = document.getElementById('modalProdId').value;
        const cat = document.getElementById('modalCatName').value;

        // အကောင့်သစ်တွေမှာ userData လိုအပ်ရင် တိုက်ရိုက်ဆွဲယူမယ်
        let finalUserData = userData;
        if (!finalUserData) {
            const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
            if (userSnap.exists()) finalUserData = userSnap.data();
            else throw new Error("User data not found. Please refresh.");
        }

        const currentBalance = finalUserData.balance || 0;
        const tgHandle = finalUserData.telegram || "Not Set";

        if (payType === "Wallet" && currentBalance < price) {
            throw new Error("❌ Balance မလုံလောက်ပါ။");
        }

        // Markdown Error ကို ကာကွယ်ရန် HTML Format ပြောင်းသုံးခြင်း
        let caption = `<b>🛒 New Order</b>\n` +
                      `📦 Item: ${document.getElementById('modalItemName').value}\n` +
                      `💰 Price: ${price.toLocaleString()} Ks\n` +
                      `💳 Method: ${payType}\n` +
                      `👤 Name: ${document.getElementById('cusName').value}\n` +
                      `📞 Phone: ${document.getElementById('cusPhone').value}\n` +
                      `🎮 Info: ${document.getElementById('gameInfo').value}\n` +
                      `💬 TG: ${tgHandle}`;
        
        if (cat === "Robux") {
            caption += `\n\n<b>🔑 Roblox Account</b>\n` +
                       `User: ${document.getElementById('rbxUser').value}\n` +
                       `Pass: ${document.getElementById('rbxPass').value}`;
        }

        if (payType === "Wallet") {
            // Firestore မှာ Balance နဲ့ Stock ကို အရင်နှုတ်မယ်
            await updateDoc(doc(db, "users", auth.currentUser.uid), { balance: increment(-price) });
            await updateDoc(doc(db, "products", prodId), { stock: increment(-1) });

            // ပြီးမှ Telegram ပို့မယ်
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: "POST", headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: CHAT_ID, text: caption, parse_mode: "HTML" })
            });
        } else {
            // Direct Pay
            const slip = document.getElementById('orderSlip').files[0];
            if (!slip) throw new Error("ပြေစာပုံ ထည့်ပေးပါ။");
            const fd = new FormData();
            fd.append("chat_id", CHAT_ID); fd.append("photo", slip); fd.append("caption", caption); fd.append("parse_mode", "HTML");
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: "POST", body: fd });
        }

        alert("✅ Order တင်ခြင်း အောင်မြင်ပါသည်။");
        location.reload();
    } catch (err) { 
        console.error(err);
        alert("❌ Error: " + err.message); 
        btn.disabled = false; btn.innerText = "Confirm Order"; 
    }
};

// --- ၅။ Login ---
document.getElementById('login-form').onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.innerText = "Checking...";

    signInWithEmailAndPassword(auth, email, pass).catch((err) => {
        btn.disabled = false; btn.innerText = "Login";
        alert("❌ Login မှားယွင်းနေပါသည်။ (" + err.code + ")");
    });
};

// --- ၆။ Register ---
document.getElementById('reg-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.innerText = "Creating...";

    try {
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-pass').value;
        const name = document.getElementById('reg-name').value;
        const tg = document.getElementById('reg-tg').value;

        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, "users", res.user.uid), { 
            name: name, 
            telegram: tg, 
            balance: 0, 
            uid: res.user.uid 
        });
        alert("✅ အကောင့်ဖွင့်ခြင်း အောင်မြင်ပါသည်။");
        location.reload();
    } catch (err) {
        btn.disabled = false; btn.innerText = "Create Account";
        alert("❌ Register Error: " + err.message);
    }
};

// --- ၇။ Filter & Logout ---
window.filterCat = (cat, btn) => {
    document.querySelectorAll('#cat-bar .btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.product-item').forEach(item => {
        const itemCat = item.getAttribute('data-category');
        item.style.display = (cat === "All" || itemCat === cat) ? "block" : "none";
    });
};

document.getElementById('logout-btn').onclick = () => signOut(auth);

// --- ၈။ Deposit ---
document.getElementById('depositForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('depBtn'); btn.disabled = true;
    try {
        const amount = document.getElementById('depAmount').value;
        const fd = new FormData();
        fd.append("chat_id", CHAT_ID); 
        fd.append("photo", document.getElementById('depSlip').files[0]);
        fd.append("caption", `💰 <b>Deposit Request</b>\n💵 Amt: ${amount} Ks\n👤 User: ${userData ? userData.name : 'Unknown'}\n🆔 UID: <code>${auth.currentUser.uid}</code>`);
        fd.append("parse_mode", "HTML");
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: "POST", body: fd });
        alert("တင်ပြပြီးပါပြီ။ Admin စစ်ဆေးပြီးနောက် ငွေဖြည့်ပေးပါမည်။"); location.reload();
    } catch (err) { alert("Error: " + err.message); btn.disabled = false; }
};
        document.getElementById('p_wallet').checked = true;
   document.getElementById('p_wallet').checked = true;display = "none";
    
    new bootstrap.Modal(document.getElementById('orderModal')).show();
};

// --- ၄။ Order တင်ခြင်း လုပ်ဆောင်ချက် ---
document.getElementById('orderForm').onsubmit = async (e) => {
    e.preventDefault();
    const payType = document.querySelector('input[name="payType"]:checked').value;
    const price = Number(document.getElementById('modalItemPrice').value);
    const prodId = document.getElementById('modalProdId').value;
    const cat = document.getElementById('modalCatName').value;

    if (payType === "Wallet" && userData.balance < price) return alert("❌ Balance မလုံလောက်ပါ။");
    
    const btn = document.getElementById('orderBtn');
    btn.disabled = true; btn.innerText = "Processing...";

    try {
        let caption = `🛒 *New Order*\n📦 Item: ${document.getElementById('modalItemName').value}\n💰 Price: ${price} Ks\n💳 Method: ${payType}\n👤 Name: ${document.getElementById('cusName').value}\n📞 Phone: ${document.getElementById('cusPhone').value}\n🎮 Info: ${document.getElementById('gameInfo').value}`;
        
        if (cat === "Robux") {
            caption += `\n\n🔑 *Roblox Account*\nUser: \`${document.getElementById('rbxUser').value}\`\nPass: \`${document.getElementById('rbxPass').value}\``;
        }
        caption += `\n💬 TG: ${userData.telegram}`;

        if (payType === "Direct") {
            const slip = document.getElementById('orderSlip').files[0];
            if (!slip) throw new Error("ပြေစာပုံ ထည့်ပေးပါ။");
            const fd = new FormData();
            fd.append("chat_id", CHAT_ID); fd.append("photo", slip); fd.append("caption", caption); fd.append("parse_mode", "Markdown");
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: "POST", body: fd });
        } else {
            await updateDoc(doc(db, "users", auth.currentUser.uid), { balance: increment(-price) });
            await updateDoc(doc(db, "products", prodId), { stock: increment(-1) });
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: "POST", headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: CHAT_ID, text: caption, parse_mode: "Markdown" })
            });
        }
        alert("✅ Order တင်ခြင်း အောင်မြင်ပါသည်။"); location.reload();
    } catch (err) { alert(err.message); btn.disabled = false; btn.innerText = "Confirm Order"; }
};

// --- ၅။ Login လုပ်ဆောင်ချက် (သင်အလိုရှိသော Error Message များဖြင့်) ---
document.getElementById('login-form').onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    const btn = e.target.querySelector('button');

    btn.disabled = true;
    btn.innerText = "Checking...";

    signInWithEmailAndPassword(auth, email, pass)
    .catch((err) => {
        btn.disabled = false;
        btn.innerText = "Login";

        // Firebase error codes ကို စစ်ဆေးပြီး သင်ပြချင်သော စာသားများပြောင်းခြင်း
        if (err.code === 'auth/wrong-password') {
            alert("❌Incorrect Password");
        } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
            alert("Emailမှားနေသည်။ ပြန်စစ်ပေးပါ");
        } else {
            alert("Login ဝင်၍မရပါ။ ပြန်စစ်ပေးပါ။");
        }
    });
};

// --- ၆။ Register လုပ်ဆောင်ချက် ---
document.getElementById('reg-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;
    const btn = e.target.querySelector('button');

    btn.disabled = true;
    btn.innerText = "Creating...";

    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, "users", res.user.uid), { 
            name: document.getElementById('reg-name').value, 
            telegram: document.getElementById('reg-tg').value, 
            balance: 0, 
            uid: res.user.uid 
        });
        alert("✅ အကောင့်ဖွင့်ခြင်း အောင်မြင်ပါသည်။");
    } catch (err) {
        btn.disabled = false;
        btn.innerText = "Create Account";
        if (err.code === 'auth/email-already-in-use') {
            alert("❌ အကောင့်ရှိပြီးသားပါ");
        } else {
            alert("❌ Error: " + err.message);
        }
    }
};

// --- ၇။ အခြားသော လုပ်ဆောင်ချက်များ ---
window.filterCat = (cat, btn) => {
    document.querySelectorAll('#cat-bar .btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.product-item').forEach(item => {
        const itemCat = item.getAttribute('data-category');
        item.style.display = (cat === "All" || itemCat === cat) ? "block" : "none";
    });
};

document.getElementById('logout-btn').onclick = () => signOut(auth);

document.getElementById('depositForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('depBtn'); btn.disabled = true;
    try {
        const fd = new FormData();
        fd.append("chat_id", CHAT_ID); fd.append("photo", document.getElementById('depSlip').files[0]);
        fd.append("caption", `💰 *Deposit Request*\n💵 Amt: ${document.getElementById('depAmount').value} Ks\n👤 User: ${userData.name}\n🆔 UID: \`${auth.currentUser.uid}\``);
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: "POST", body: fd });
        alert("တင်ပြပြီးပါပြီ။ Admin စစ်ဆေးပြီးနောက် ငွေဖြည့်ပေးပါမည်။"); location.reload();
    } catch { alert("Error!"); btn.disabled = false; }
};
