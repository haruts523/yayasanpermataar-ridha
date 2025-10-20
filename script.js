// script.js (module) — uses Firebase Firestore & Storage
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage, ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Simple session (stored in sessionStorage)
function setSession(user){ sessionStorage.setItem('ya_session', JSON.stringify(user)); }
function getSession(){ try{ return JSON.parse(sessionStorage.getItem('ya_session')); }catch(e){return null;} }
function clearSession(){ sessionStorage.removeItem('ya_session'); }
function uid(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,9); }

document.addEventListener('DOMContentLoaded', ()=> {
  const path = location.pathname.split('/').pop();
  if(path === '' || path === 'index.html'){ renderIndex(); }
  if(path === 'donasi.html'){ renderDonasi(); }
  if(path === 'akun.html'){ renderAkun(); }
  if(path === 'inbox.html'){ renderInbox(); }
  updateStats();
});

async function updateStats(){
  const postsSnap = await getDocs(collection(db, 'posts'));
  const statusesSnap = await getDocs(collection(db, 'statuses'));
  document.getElementById('stat-posts') && (document.getElementById('stat-posts').textContent = postsSnap.size);
  document.getElementById('stat-status') && (document.getElementById('stat-status').textContent = statusesSnap.size);
}

/* ----------------- Donasi ----------------- */
function renderDonasi(){
  const session = getSession();
  const uploader = document.getElementById('uploaderArea');
  const alertBox = document.getElementById('alert');
  if(session && session.canPost){
    uploader.classList.remove('hidden');
  } else {
    uploader.classList.add('hidden');
    alertBox.hidden = false;
    alertBox.textContent = session ? 'Akun Anda tidak memiliki izin untuk memposting. Hubungi admin.' : 'Silakan masuk untuk memposting.';
  }

  const postsContainer = document.getElementById('postsContainer');
  postsContainer.innerHTML = '<div class="muted">Memuat berita…</div>';

  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
  onSnapshot(q, snap => {
    postsContainer.innerHTML = '';
    if(snap.empty){ postsContainer.innerHTML = '<div class="muted">Belum ada berita.</div>'; return; }
    snap.forEach(docSnap => {
      const p = docSnap.data();
      const el = document.createElement('article');
      el.className = 'post card';
      el.innerHTML = `
        <img src="${p.imageURL || ''}" alt="${escapeHTML(p.title)}">
        <div class="meta">
          <h4>${escapeHTML(p.title)}</h4>
          <p class="muted">${escapeHTML(p.desc)}</p>
          <p class="small muted">Oleh ${escapeHTML(p.author || 'Anon')} • ${new Date(p.createdAt?.toMillis ? p.createdAt.toMillis() : p.createdAt).toLocaleString()}</p>
        </div>
      `;
      postsContainer.appendChild(el);
    });
  });

  const form = document.getElementById('postForm');
  form && form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const title = document.getElementById('postTitle').value.trim();
    const file = document.getElementById('postImage').files[0];
    const desc = document.getElementById('postDesc').value.trim();
    if(!file) return alert('Pilih gambar terlebih dahulu.');
    const id = uid('post');
    const reader = new FileReader();
    reader.onload = async function(evt){
      const dataURL = evt.target.result;
      // upload to Firebase Storage
      const storageRef = ref(storage, `posts/${id}`);
      await uploadString(storageRef, dataURL, 'data_url');
      const imageURL = await getDownloadURL(storageRef);
      await addDoc(collection(db, 'posts'), {
        title, desc, imageURL, author: (getSession() && getSession().name) || 'Anon',
        createdAt: serverTimestamp()
      });
      form.reset();
      updateStats();
      alert('Berhasil dipublikasikan.');
    };
    reader.readAsDataURL(file);
  });

  const btnCancel = document.getElementById('btnCancel');
  btnCancel && btnCancel.addEventListener('click', ()=> form.reset());
}

/* ----------------- Akun ----------------- */
function renderAkun(){
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const accountBox = document.getElementById('accountBox');
  const regHint = document.getElementById('regHint');

  const session = getSession();
  if(session){
    accountBox.classList.remove('hidden');
    regHint.classList.add('hidden');
    document.getElementById('acctName').textContent = session.name;
    document.getElementById('acctEmail').textContent = session.email;
    document.getElementById('acctRole').textContent = session.canPost ? 'Izin: Bisa memposting berita' : 'Izin: Pengunjung';
    loginForm.parentElement.style.display = 'none';
    registerForm.parentElement.style.display = 'none';
  } else {
    accountBox.classList.add('hidden');
    loginForm.parentElement.style.display = '';
    registerForm.parentElement.style.display = '';
  }

  // Register: create user doc in 'users' collection
  registerForm && registerForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    const canPost = document.getElementById('regCanPost').checked === true;
    // basic duplicate check
    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);
    if(snap.docs.find(d=>d.data().email === email)){ alert('Email sudah terdaftar.'); return; }
    await addDoc(usersCol, {name, email, password, canPost, createdAt: serverTimestamp()});
    setSession({name, email, canPost});
    renderAkun();
    updateStats();
    alert('Pendaftaran sukses. Anda sekarang masuk.');
  });

  // Login: naive lookup (for demo). For production use Firebase Auth.
  loginForm && loginForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);
    const userDoc = snap.docs.find(d => d.data().email === email && d.data().password === password);
    if(!userDoc){ alert('Email atau password salah.'); return; }
    const u = userDoc.data();
    setSession({name: u.name, email: u.email, canPost: !!u.canPost});
    renderAkun();
    updateStats();
    alert('Berhasil masuk.');
  });

  const btnLogout = document.getElementById('btnLogout');
  btnLogout && btnLogout.addEventListener('click', ()=>{
    clearSession();
    renderAkun();
    alert('Anda telah keluar.');
    location.reload();
  });
}

/* ----------------- Inbox ----------------- */
function renderInbox(){
  const form = document.getElementById('statusForm');
  const container = document.getElementById('statusContainer');
  // realtime listener for statuses
  const q = query(collection(db, 'statuses'), orderBy('createdAt', 'desc'));
  onSnapshot(q, snap => {
    container.innerHTML = '';
    if(snap.empty){ container.innerHTML = '<div class="muted">Belum ada pesan publik.</div>'; return; }
    snap.forEach(d => {
      const s = d.data();
      const el = document.createElement('article');
      el.className = 'post card';
      el.innerHTML = `
        <div class="meta">
          <h4>${escapeHTML(s.name)}</h4>
          <p>${escapeHTML(s.text)}</p>
          <p class="small muted">${new Date(s.createdAt?.toMillis ? s.createdAt.toMillis() : s.createdAt).toLocaleString()}</p>
        </div>
      `;
      container.appendChild(el);
    });
  });

  form && form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = document.getElementById('statusName').value.trim() || 'Anon';
    const text = document.getElementById('statusText').value.trim();
    if(!text) return;
    await addDoc(collection(db, 'statuses'), {name, text, createdAt: serverTimestamp()});
    form.reset();
    updateStats();
  });
}

/* ----------------- Utilities ----------------- */
function escapeHTML(s){
  if(!s) return '';
  return s.replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]; });
}