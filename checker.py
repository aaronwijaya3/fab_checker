import csv
import random
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlencode

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://fab-digital.myrepublic.net.id/fabdigitallg"
SALES_ID = "6222373"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/153.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8",
}

DEFAULT_COOKIE_STR = "JSESSIONID=98EB437F2A9537A91D1A42C6D9434203"
DEFAULT_COOKIES = {"JSESSIONID": "98EB437F2A9537A91D1A42C6D9434203"}


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def is_target_matched(target: str, name: str) -> bool:
    """
    Pencocokan Kata Utuh (Word Boundary Match):
    Target "susi" hanya cocok jika kata "susi" adalah kata utuh.
    Contoh cocok: "Susi", "Susi Wijaya", "Ibu Susi".
    Tidak cocok: "Susilo Wijaya", "Susilan Harto", "Susiani".
    """
    if not target or not name:
        return False
    t_clean = target.strip()
    if not t_clean:
        return False
    words = [re.escape(w) for w in t_clean.split()]
    pattern = r"\b" + r"\s+".join(words) + r"\b"
    return bool(re.search(pattern, name, re.IGNORECASE))


def build_url(fab_id: str, sales_id: str = SALES_ID) -> str:
    return BASE_URL + "?" + urlencode({
        "sales_id": sales_id or SALES_ID,
        "request_custom_id": fab_id,
    })


def extract_customer(html: str):
    soup = BeautifulSoup(html, "html.parser")
    nama = ""
    alamat = ""

    for label in soup.find_all("label"):
        label_text = normalize(label.get_text(" ", strip=True)).lower()
        target_id = label.get("for")
        if not target_id:
            continue

        field = soup.find(id=target_id)
        if not field:
            continue

        value = normalize(
            field.get("value") or field.get_text(" ", strip=True)
        )

        if "nama" in label_text:
            nama = value
        elif "alamat pemasangan" in label_text:
            alamat = value

    # Fallback berdasarkan atribut field.
    for field in soup.find_all(["input", "textarea"]):
        attrs = " ".join([
            str(field.get("id", "")),
            str(field.get("name", "")),
            str(field.get("placeholder", "")),
        ]).lower()

        value = normalize(
            field.get("value") or field.get_text(" ", strip=True)
        )

        if not nama and "nama" in attrs:
            nama = value
        if not alamat and "alamat" in attrs:
            alamat = value

    return nama, alamat


API_GATEWAY_URL = "https://fab-digital.myrepublic.net.id/MyAPI"
CLIENT_ID = "43fa82c5f94c1cb705e632e022939dc6de1e41f5"
MY_CODE = "lokal-microsite"


def check_fab(
    fab_id: str,
    target: str,
    sales_id: str = SALES_ID,
    timeout: int = 15,
    cookies: dict = None,
    custom_headers: dict = None,
    smart_delay: float = 0.0,
    session: requests.Session = None,
):
    if smart_delay > 0:
        time.sleep(smart_delay + random.uniform(0.01, 0.04))

    fab_id = normalize(fab_id)

    if not re.fullmatch(r"\d{10,20}", fab_id):
        return {
            "fab": fab_id,
            "nama": "",
            "alamat": "",
            "status": "INVALID_FAB",
            "matched": False,
        }

    if session is None:
        session = requests.Session()

    req_headers = dict(HEADERS)
    if custom_headers:
        req_headers.update(custom_headers)
    
    active_cookies = dict(DEFAULT_COOKIES)
    if cookies:
        active_cookies.update(cookies)
    session.cookies.update(active_cookies)

    url = build_url(fab_id, sales_id=sales_id)

    try:
        # Step 1: Buka halaman awal FAB
        r1 = session.get(url, headers=req_headers, timeout=timeout)
        r1.raise_for_status()

        # Step 2: Coba deteksi data pelanggan langsung dari halaman awal
        nama, alamat = extract_customer(r1.text)

        # Cek apakah ada GLOBAL_MY_TOKEN di r1
        token_match = re.search(r"GLOBAL_MY_TOKEN\s*=\s*['\"]([^'\"]*)['\"]", r1.text)
        token = token_match.group(1) if token_match else ""

        # Deteksi form login / tamu
        soup = BeautifulSoup(r1.text, "html.parser")
        form = soup.find("form", id="kt_login_signin_form")

        # Jika form login muncul dan tidak ada cookie sesi yang diberikan,
        # jangan kirimkan POST dengan recaptcha kosong karena akan hang (ReadTimeout) di server MyRepublic
        if form and not token and not cookies:
            return {
                "fab": fab_id,
                "nama": "",
                "alamat": "",
                "status": "BUTUH_LOGIN",
                "matched": False,
            }

        # Jika ada cookie atau token, atau ingin mencoba submit form dengan timeout singkat
        if form and not token:
            form_data = {}
            for inp in form.find_all("input"):
                form_data[inp.get("name", "")] = inp.get("value", "")

            try:
                # Gunakan timeout pendek (3 detik) agar tidak memblokir antrean jika server tarpit
                r2 = session.post(url, headers=req_headers, data=form_data, timeout=min(timeout, 3))
                if r2.ok:
                    token_match = re.search(r"GLOBAL_MY_TOKEN\s*=\s*['\"]([^'\"]*)['\"]", r2.text)
                    if token_match:
                        token = token_match.group(1)
                    if not nama and not alamat:
                        nama, alamat = extract_customer(r2.text)
            except requests.RequestException:
                pass

        # Step 4: Panggil API Gateway MyAPI resmi jika token tersedia
        if token:
            api_headers = {
                "User-Agent": req_headers["User-Agent"],
                "Content-Type": "application/json",
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "x-my-clientid": CLIENT_ID,
                "x-my-code": MY_CODE,
                "x-my-token": token,
                "x-my-language": "en",
                "x-my-cmd": "portalautotable",
                "x-my-cls": "api.micromod.CtmWoRequestCustomAPI",
                "x-my-opt": "getListWithAttachmentCustomTable",
                "isincog": "not private",
            }

            body = {"dform0": {"request_custom_id": fab_id}}
            try:
                r3 = session.post(API_GATEWAY_URL, headers=api_headers, json=body, timeout=timeout)
                if r3.ok:
                    data = r3.json() if r3.text else {}
                    records = data.get("records") or []

                    for rec in records:
                        fn = str(rec.get("custom_field_name", "")).strip()
                        fv = normalize(rec.get("custom_field_value", ""))

                        if fn == "custName" or (not nama and any(k in fn.lower() for k in ["name", "nama", "customer"])):
                            if not any(ign in fn.lower() for ign in ["file", "image", "officer", "technician", "cluster", "city"]):
                                nama = fv

                        if fn == "custAddress" or (not alamat and any(k in fn.lower() for k in ["address", "alamat", "location"])):
                            if not any(ign in fn.lower() for ign in ["officer", "technician"]):
                                alamat = fv
            except requests.RequestException:
                pass

        nama = ""
        alamat = ""

        for rec in records:
            fn = str(rec.get("custom_field_name", "")).strip()
            fv = normalize(rec.get("custom_field_value", ""))

            if fn == "custName" or (not nama and any(k in fn.lower() for k in ["name", "nama", "customer"])):
                if not any(ign in fn.lower() for ign in ["file", "image", "officer", "technician", "cluster", "city"]):
                    nama = fv

            if fn == "custAddress" or (not alamat and any(k in fn.lower() for k in ["address", "alamat", "location"])):
                if not any(ign in fn.lower() for ign in ["officer", "technician"]):
                    alamat = fv

        # Fallback jika MyAPI tidak mengembalikan records: coba ekstrak dari HTML r2
        if not nama and not alamat:
            nama, alamat = extract_customer(r2.text)

        matched = is_target_matched(target, nama)

        return {
            "fab": fab_id,
            "nama": nama,
            "alamat": alamat,
            "status": "FOUND" if (nama or alamat) else "NO_DATA",
            "matched": matched,
        }

    except requests.RequestException as exc:
        is_rate_limited = False
        if hasattr(exc, "response") and exc.response is not None:
            if exc.response.status_code == 429:
                is_rate_limited = True
                time.sleep(2.5)  # Adaptive backoff jika terkena limit

        status_text = "RATE_LIMITED_429" if is_rate_limited else f"REQUEST_ERROR: {type(exc).__name__}"
        return {
            "fab": fab_id,
            "nama": "",
            "alamat": "",
            "status": status_text,
            "matched": False,
        }


def load_fabs(path="fab_list.txt"):
    with open(path, encoding="utf-8") as handle:
        return [
            line.strip()
            for line in handle
            if line.strip() and not line.lstrip().startswith("#")
        ]


def save_csv(results, path="hasil_checker.csv"):
    with open(path, "w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["fab", "nama", "alamat", "status", "matched"],
        )
        writer.writeheader()
        writer.writerows(results)


def main():
    print("=" * 72)
    print("                 FAB NAME CHECKER")
    print("=" * 72)

    target = input("Nama target > ").strip()
    if not target:
        print("Target kosong.")
        return

    fabs = load_fabs()
    if not fabs:
        print("fab_list.txt masih kosong.")
        return

    print(f"\nTarget : {target}")
    print(f"FAB    : {len(fabs)}")

    workers_str = input("Jumlah Workers [default 10, rekomendasi 5-20] > ").strip()
    max_workers = int(workers_str) if workers_str.isdigit() and int(workers_str) > 0 else 10
    print(f"Workers Aktif: {max_workers}\n")

    results = []

    session = requests.Session()
    adapter = requests.adapters.HTTPAdapter(pool_connections=max_workers, pool_maxsize=max_workers * 2)
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {
            pool.submit(check_fab, fab, target, session=session): fab
            for fab in fabs
        }

        for future in as_completed(futures):
            result = future.result()
            results.append(result)

            print(
                f"[{result['status']:<20}] "
                f"{result['fab']} -> {result['nama'] or '-'}"
            )

            if result["matched"]:
                print("\n" + "=" * 72)
                print("TARGET FOUND")
                print("=" * 72)
                print("FAB    :", result["fab"])
                print("NAMA   :", result["nama"])
                print("ALAMAT :", result["alamat"] or "-")
                print("=" * 72)
                break

    save_csv(results)
    print("\nHasil parsial/akhir: hasil_checker.csv")


if __name__ == "__main__":
    main()
