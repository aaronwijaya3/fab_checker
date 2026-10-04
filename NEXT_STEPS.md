# Melanjutkan di Antigravity

Paste prompt berikut setelah membuka folder ZIP:

> Baca seluruh project FAB Checker ini. Jangan mengubah tujuan tool.
>
> Target saya: saya punya daftar FAB ID yang memang saya berwenang akses. Saya ingin mencari nama pelanggan tertentu dari daftar tersebut.
>
> Halaman target:
> https://fab-digital.myrepublic.net.id/fabdigitallg?sales_id=6222373&request_custom_id=2026091506479
>
> Versi requests/BeautifulSoup mungkin tidak mendapatkan data karena halaman dapat memuat data secara dinamis.
>
> Tugas:
> 1. Audit HTML/JavaScript yang tersedia secara sah.
> 2. Identifikasi request network yang digunakan halaman untuk mengisi field Nama dan Alamat setelah FAB ID diproses.
> 3. Jika perlu, buat mode browser automation menggunakan Playwright untuk akun/session yang memang berwenang.
> 4. Pertahankan input dari `fab_list.txt`, target nama, progress, dan hasil CSV.
> 5. Tambahkan retry/backoff, timeout, logging, dan penanganan session/cookie yang benar.
> 6. Jangan melakukan brute-force atau menghasilkan FAB ID secara otomatis di luar daftar `fab_list.txt`.
> 7. Jangan menyimpan cookie, token, password, atau credential ke repository.
>
> Setelah menemukan mekanisme request yang benar, refactor checker agar mengambil Nama + Alamat secara stabil dan jelaskan file mana yang berubah.
