# Yayasan Permata Ar-Ridha — Firebase-enabled Frontend

Versi ini tersambung ke **Firebase (Firestore + Storage)** sehingga semua posting dan pesan bersifat publik dan sinkron untuk semua pengunjung.

## Cara pakai singkat

1. Pastikan Anda telah membuat **Firestore** database di Firebase Console (mode test untuk awal).
2. Pastikan **Storage** juga aktif (default aktif saat project dibuat).
3. Upload semua file di folder ini ke repo GitHub Anda dan aktifkan GitHub Pages (branch `main`).
4. Arahkan domain Hostinger ke GitHub Pages (CNAME) atau gunakan custom domain settings di GitHub Pages.

## Catatan keamanan
- Saat ini autentikasi disederhanakan: pengguna dan password disimpan di koleksi `users` Firestore (demo). Untuk produksi, gunakan **Firebase Authentication** dan atur **Firestore rules**.
- File `firebase-config.js` berisi konfigurasi proyek Anda — ini normal untuk aplikasi web Firebase, tetapi jaga izin dan rules di console agar aman.
