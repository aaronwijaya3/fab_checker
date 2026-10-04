# FAB Checker — Antigravity Starter

Tool untuk memeriksa **daftar FAB ID yang memang sudah dimiliki/diizinkan untuk diakses**, kemudian mencari nama target.

## Struktur
- `fab_list.txt` — masukkan FAB ID satu per baris.
- `checker.py` — checker CLI.
- `requirements.txt` — dependency Python.
- `NEXT_STEPS.md` — panduan melanjutkan di Antigravity.

## Jalankan
```bash
pip install -r requirements.txt
python checker.py
```

Masukkan target nama saat diminta, misalnya `ANGELIA`.

> Catatan: versi ini sengaja tidak melakukan brute-force/enumerasi FAB ID yang tidak diketahui. Untuk melanjutkan integrasi dengan halaman dinamis, gunakan browser developer tools pada akun/akses yang sah untuk menemukan request data yang dibuat oleh halaman.
