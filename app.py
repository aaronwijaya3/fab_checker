import csv
import io
import os
import threading
import time
from datetime import datetime, timedelta, timezone
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, as_completed, wait
from flask import Flask, jsonify, make_response, render_template, request
import requests

import checker

WIB = timezone(timedelta(hours=7))

CONFIG_PIN = os.environ.get("FAB_PIN", "1234")

def get_wib_date_str() -> str:
    return datetime.now(WIB).strftime("%Y%m%d")

def get_wib_time_str() -> str:
    return datetime.now(WIB).strftime("%H:%M:%S")

def send_telegram_alert(token: str, chat_id: str, item: dict, sales_id: str):
    if not token or not chat_id:
        return False, "Token atau Chat ID belum diisi."
    portal_url = checker.build_url(item.get("fab", ""), sales_id=sales_id)
    msg = (
        "🎯 *TARGET DITEMUKAN!*\n\n"
        f"👤 *Nama:* `{item.get('nama', '-')}`\n"
        f"🔢 *FAB ID:* `{item.get('fab', '-')}`\n"
        f"📍 *Alamat:* {item.get('alamat', '-')}\n"
        f"🕒 *Waktu:* {item.get('timestamp', get_wib_time_str())} WIB\n\n"
        f"🔗 [Buka Portal MyRepublic]({portal_url})"
    )
    try:
        url = f"https://api.telegram.org/bot{token.strip()}/sendMessage"
        resp = requests.post(
            url,
            json={
                "chat_id": chat_id.strip(),
                "text": msg,
                "parse_mode": "Markdown",
                "disable_web_page_preview": False,
            },
            timeout=10,
        )
        data = resp.json()
        return data.get("ok", False), data.get("description", "Notifikasi Telegram berhasil dikirim.")
    except Exception as e:
        return False, str(e)


def send_whatsapp_alert(provider: str, phone: str, token_or_key: str, item: dict, sales_id: str, custom_url: str = ""):
    from urllib.parse import quote
    phone = str(phone or "").strip()
    token_or_key = str(token_or_key or "").strip()
    provider = str(provider or "fonnte").lower().strip()

    if not phone and provider != "custom":
        return False, "Nomor WhatsApp belum diisi."

    portal_url = checker.build_url(item.get("fab", ""), sales_id=sales_id)
    msg = (
        "🎯 *TARGET DITEMUKAN!*\n\n"
        f"👤 *Nama:* {item.get('nama', '-')}\n"
        f"🔢 *FAB ID:* {item.get('fab', '-')}\n"
        f"📍 *Alamat:* {item.get('alamat', '-')}\n"
        f"🕒 *Waktu:* {item.get('timestamp', get_wib_time_str())} WIB\n\n"
        f"🔗 Link Portal: {portal_url}"
    )

    try:
        if provider == "fonnte":
            if not token_or_key:
                return False, "Token Fonnte belum diisi."
            resp = requests.post(
                "https://api.fonnte.com/send",
                headers={"Authorization": token_or_key},
                data={"target": phone, "message": msg},
                timeout=12,
            )
            data = resp.json() if resp.text else {}
            return bool(data.get("status")), data.get("reason", "Notifikasi Fonnte terkirim")

        elif provider == "callmebot":
            if not token_or_key:
                return False, "API Key CallMeBot belum diisi."
            clean_phone = phone.replace("+", "").replace("-", "").replace(" ", "").strip()
            url = f"https://api.callmebot.com/whatsapp.php?phone={clean_phone}&text={quote(msg)}&apikey={token_or_key}"
            resp = requests.get(url, timeout=15)
            ok = resp.status_code == 200 and "success" in resp.text.lower()
            return ok, "Notifikasi CallMeBot terkirim" if ok else (resp.text[:120] or f"HTTP {resp.status_code}")

        elif provider == "custom":
            if not custom_url:
                return False, "Custom Webhook URL belum diisi."
            resp = requests.post(
                custom_url,
                json={
                    "phone": phone,
                    "message": msg,
                    "item": item,
                    "portal_url": portal_url,
                },
                timeout=12,
            )
            ok = resp.status_code in [200, 201]
            return ok, "Notifikasi Webhook terkirim" if ok else f"HTTP {resp.status_code}"

        return False, f"Provider '{provider}' tidak didukung."
    except Exception as e:
        return False, str(e)



app = Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.jinja_env.auto_reload = True

# Global thread-safe state for the checker job
lock = threading.Lock()
active_pool = None
state = {
    "is_running": False,
    "should_stop": False,
    "target": "",
    "total": 0,
    "checked": 0,
    "matched_count": 0,
    "found_count": 0,
    "no_data_count": 0,
    "error_count": 0,
    "results": [],
    "start_time": None,
    "elapsed_seconds": 0,
    "current_fab": "",
    "status_message": "Siap memulai pengecekan.",
}


DEFAULT_SESSION_COOKIE = "JSESSIONID=98EB437F2A9537A91D1A42C6D9434203"


def parse_cookies(cookie_str: str) -> dict:
    raw = cookie_str.strip() if cookie_str and cookie_str.strip() else DEFAULT_SESSION_COOKIE
    cookies = {}
    for item in raw.split(";"):
        if "=" in item:
            k, v = item.strip().split("=", 1)
            cookies[k.strip()] = v.strip()
    return cookies if cookies else {"JSESSIONID": "98EB437F2A9537A91D1A42C6D9434203"}


def background_worker(
    target: str,
    fabs: list,
    sales_id: str,
    concurrency: int,
    timeout: int,
    cookie_str: str,
    stop_on_match: bool = True,
    telegram_token: str = "",
    telegram_chat_id: str = "",
    smart_delay: float = 0.0,
    wa_provider: str = "",
    wa_phone: str = "",
    wa_token: str = "",
    wa_custom_url: str = "",
):
    global state, active_pool

    cookies = parse_cookies(cookie_str)
    start_ts = time.time()

    with lock:
        state["is_running"] = True
        state["should_stop"] = False
        state["target"] = target
        state["total"] = len(fabs)
        state["checked"] = 0
        state["matched_count"] = 0
        state["found_count"] = 0
        state["no_data_count"] = 0
        state["error_count"] = 0
        state["results"] = []
        state["start_time"] = start_ts
        if len(fabs) >= 10000:
            state["status_message"] = f"Mencari target '{target}' mulai dari {fabs[0]} secara otomatis sampai ditemukan..."
        else:
            state["status_message"] = f"Memeriksa {len(fabs)} FAB ID dengan target '{target}'..."

    concurrency = max(1, min(50, concurrency))
    results = []

    # Connection pooling agar koneksi HTTP keep-alive dapat digunakan kembali antar worker
    session = requests.Session()
    adapter = requests.adapters.HTTPAdapter(
        pool_connections=concurrency,
        pool_maxsize=concurrency * 2,
        max_retries=1,
    )
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    pool = ThreadPoolExecutor(max_workers=concurrency)
    with lock:
        active_pool = pool

    try:
        fab_iter = iter(fabs)
        futures = {}

        # Prime initial tasks up to concurrency * 2 (sliding window prevents queue bloat)
        for _ in range(min(len(fabs), concurrency * 2)):
            if state["should_stop"]:
                break
            try:
                fab = next(fab_iter)
                fut = pool.submit(
                    checker.check_fab,
                    fab,
                    target,
                    sales_id=sales_id,
                    timeout=timeout,
                    cookies=cookies,
                    smart_delay=smart_delay,
                    session=session,
                )
                futures[fut] = fab
            except StopIteration:
                break

        while futures and not state["should_stop"]:
            done, _ = wait(list(futures.keys()), return_when=FIRST_COMPLETED, timeout=0.25)
            if not done:
                continue

            for fut in done:
                fab = futures.pop(fut, "")
                if state["should_stop"]:
                    break

                try:
                    res = fut.result()
                except Exception as e:
                    res = {
                        "fab": fab,
                        "nama": "",
                        "alamat": "",
                        "status": f"UNEXPECTED_ERROR: {str(e)}",
                        "matched": False,
                    }

                with lock:
                    state["checked"] += 1
                    state["current_fab"] = res["fab"]
                    state["elapsed_seconds"] = round(time.time() - start_ts, 1)

                    if res["matched"]:
                        state["matched_count"] += 1
                        if telegram_token and telegram_chat_id:
                            threading.Thread(
                                target=send_telegram_alert,
                                args=(telegram_token, telegram_chat_id, res, sales_id),
                                daemon=True,
                            ).start()

                        if wa_phone and (wa_token or wa_provider == "custom"):
                            threading.Thread(
                                target=send_whatsapp_alert,
                                args=(wa_provider, wa_phone, wa_token, res, sales_id, wa_custom_url),
                                daemon=True,
                            ).start()

                    if res["status"] == "FOUND":
                        state["found_count"] += 1
                    elif res["status"] in ["NO_DATA", "BUTUH_LOGIN"]:
                        state["no_data_count"] += 1
                    elif "ERROR" in res["status"] or "INVALID" in res["status"]:
                        state["error_count"] += 1

                    res["timestamp"] = get_wib_time_str()
                    state["results"].append(res)
                    results.append(res)

                    # Otomatis langsung stop jika target ditemukan dan fitur stop_on_match aktif
                    if res["matched"] and stop_on_match:
                        state["should_stop"] = True
                        state["status_message"] = (
                            f"🎯 TARGET DITEMUKAN! ({res['nama']}) pada FAB {res['fab']}. Pemeriksaan otomatis dihentikan."
                        )
                        break

                # Submit next task only if stop was not triggered
                if not state["should_stop"]:
                    try:
                        next_fab = next(fab_iter)
                        new_fut = pool.submit(
                            checker.check_fab,
                            next_fab,
                            target,
                            sales_id=sales_id,
                            timeout=timeout,
                            cookies=cookies,
                            smart_delay=smart_delay,
                            session=session,
                        )
                        futures[new_fut] = next_fab
                    except StopIteration:
                        pass
    finally:
        # Cancel any pending futures and immediately shut down without waiting
        try:
            pool.shutdown(wait=False, cancel_futures=True)
        except Exception:
            pass

        with lock:
            active_pool = None
            state["is_running"] = False
            state["current_fab"] = ""
            state["elapsed_seconds"] = round(time.time() - start_ts, 1)
            if state["should_stop"]:
                if not state["status_message"].startswith("🎯 TARGET DITEMUKAN"):
                    state["status_message"] = "Pemeriksaan dihentikan oleh pengguna."
            else:
                has_login_needed = any(r.get("status") == "BUTUH_LOGIN" for r in results)
                if has_login_needed:
                    state["status_message"] = (
                        "[PERHATIAN] PORTAL MEMERLUKAN LOGIN: Masukkan Cookie akun Anda di Pengaturan Lanjutan agar data pelanggan dapat diakses."
                    )
                else:
                    state["status_message"] = (
                        f"Selesai! {state['checked']}/{state['total']} FAB dicek. "
                        f"Ditemukan cocok: {state['matched_count']}."
                    )

        # Simpan juga ke hasil_checker.csv otomatis
        try:
            if results:
                checker.save_csv(results, "hasil_checker.csv")
        except Exception:
            pass


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/fabs/load", methods=["GET"])
def api_load_fabs():
    try:
        fabs = checker.load_fabs("fab_list.txt")
        raw_text = ""
        try:
            with open("fab_list.txt", "r", encoding="utf-8") as f:
                raw_text = f.read()
        except Exception:
            pass

        return jsonify({
            "success": True,
            "fabs": fabs,
            "count": len(fabs),
            "raw": raw_text,
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/fabs/save", methods=["POST"])
def api_save_fabs():
    try:
        data = request.get_json() or {}
        content = data.get("content", "")
        with open("fab_list.txt", "w", encoding="utf-8") as f:
            f.write(content)
        fabs = checker.load_fabs("fab_list.txt")
        return jsonify({"success": True, "count": len(fabs)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/fabs/generate_range", methods=["POST"])
def api_generate_range():
    try:
        data = request.get_json() or {}
        date_str = str(data.get("date_prefix", "")).replace("-", "").strip()
        if not date_str:
            date_str = get_wib_date_str()

        start_seq = max(1, int(data.get("start_seq", 1)))
        end_seq = max(start_seq, min(50000, int(data.get("end_seq", 10000))))
        padding = max(4, min(8, int(data.get("padding", 5))))
        save_to_file = bool(data.get("save_to_file", True))

        # Generate urutan nomor
        nums = [f"{date_str}{i:0{padding}d}" for i in range(start_seq, end_seq + 1)]

        if save_to_file:
            with open("fab_list.txt", "w", encoding="utf-8") as f:
                f.write("\n".join(nums) + "\n")

        return jsonify({
            "success": True,
            "count": len(nums),
            "first": nums[0],
            "last": nums[-1],
            "saved_to_file": save_to_file,
            "raw": "\n".join(nums),
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/check/start", methods=["POST"])
def api_start_check():
    global state
    with lock:
        if state["is_running"]:
            return jsonify({"success": False, "error": "Pemeriksaan sedang berjalan!"}), 400

    data = request.get_json() or {}
    target = str(data.get("target", "")).strip()
    fabs_input = data.get("fabs", [])
    sales_id = str(data.get("sales_id", checker.SALES_ID)).strip()
    concurrency = int(data.get("concurrency", 10))
    timeout = int(data.get("timeout", 15))
    cookie_str = str(data.get("cookie", "")).strip() or DEFAULT_SESSION_COOKIE

    # Jika input berupa teks multi-line
    if isinstance(fabs_input, str):
        fabs = [
            line.strip()
            for line in fabs_input.splitlines()
            if line.strip() and not line.lstrip().startswith("#")
        ]
    elif isinstance(fabs_input, list):
        fabs = [str(f).strip() for f in fabs_input if str(f).strip() and not str(f).lstrip().startswith("#")]
    else:
        fabs = []

    custom_date = str(data.get("date_str", "")).replace("-", "").strip()
    start_seq = data.get("start_seq", 1)
    telegram_token = str(data.get("telegram_token", "")).strip()
    telegram_chat_id = str(data.get("telegram_chat_id", "")).strip()
    smart_delay = float(data.get("smart_delay", 0.05))

    wa_provider = str(data.get("wa_provider", "fonnte")).strip()
    wa_phone = str(data.get("wa_phone", "")).strip()
    wa_token = str(data.get("wa_token", "")).strip()
    wa_custom_url = str(data.get("wa_custom_url", "")).strip()

    is_auto_generated = False
    date_code = get_wib_date_str()
    if not fabs:
        if len(custom_date) == 8 and custom_date.isdigit():
            date_code = custom_date
        try:
            start_num = max(1, int(start_seq or 1))
        except (ValueError, TypeError):
            start_num = 1
        end_num = min(start_num + 20000, 99999)
        fabs = [f"{date_code}{i:05d}" for i in range(start_num, end_num)]
        is_auto_generated = True

    stop_on_match = bool(data.get("stop_on_match", True))

    worker = threading.Thread(
        target=background_worker,
        args=(
            target,
            fabs,
            sales_id,
            concurrency,
            timeout,
            cookie_str,
            stop_on_match,
            telegram_token,
            telegram_chat_id,
            smart_delay,
            wa_provider,
            wa_phone,
            wa_token,
            wa_custom_url,
        ),
        daemon=True,
    )
    worker.start()

    msg = (
        f"Pencarian otomatis dimulai dari nomor ({fabs[0]}) tanggal {date_code} sampai target ditemukan."
        if is_auto_generated
        else f"Pengecekan dimulai untuk {len(fabs)} FAB ID."
    )
    return jsonify({
        "success": True,
        "message": msg,
        "total": len(fabs),
        "auto_generated": is_auto_generated,
        "first": fabs[0],
    })


@app.route("/api/check/stop", methods=["POST"])
def api_stop_check():
    global state, active_pool
    with lock:
        state["should_stop"] = True
        state["status_message"] = "Pemeriksaan dihentikan oleh pengguna."
        if active_pool is not None:
            try:
                active_pool.shutdown(wait=False, cancel_futures=True)
            except Exception:
                pass
        state["is_running"] = False
        state["current_fab"] = ""
    return jsonify({"success": True, "message": "Pemeriksaan berhasil dihentikan."})


@app.route("/api/check/reset", methods=["POST"])
def api_reset_check():
    global state, active_pool
    with lock:
        state["should_stop"] = True
        if active_pool is not None:
            try:
                active_pool.shutdown(wait=False, cancel_futures=True)
            except Exception:
                pass
        state["is_running"] = False
        state["target"] = ""
        state["total"] = 0
        state["checked"] = 0
        state["matched_count"] = 0
        state["found_count"] = 0
        state["no_data_count"] = 0
        state["error_count"] = 0
        state["results"] = []
        state["start_time"] = None
        state["elapsed_seconds"] = 0
        state["current_fab"] = ""
        state["status_message"] = "Siap memulai pengecekan."
    return jsonify({"success": True, "message": "Dashboard berhasil di-reset."})


@app.route("/api/check/status", methods=["GET"])
def api_check_status():
    with lock:
        # Perbarui elapsed jika masih berjalan
        if state["is_running"] and state["start_time"]:
            state["elapsed_seconds"] = round(time.time() - state["start_time"], 1)

        pct = 0
        if state["total"] > 0:
            pct = round((state["checked"] / state["total"]) * 100, 1)

        # Cari target yang matched terbaru
        matched_items = [r for r in state["results"] if r.get("matched")]

        return jsonify({
            "is_running": state["is_running"],
            "should_stop": state["should_stop"],
            "target": state["target"],
            "total": state["total"],
            "checked": state["checked"],
            "progress_percent": pct,
            "matched_count": state["matched_count"],
            "found_count": state["found_count"],
            "no_data_count": state["no_data_count"],
            "error_count": state["error_count"],
            "current_fab": state["current_fab"],
            "elapsed_seconds": state["elapsed_seconds"],
            "status_message": state["status_message"],
            "results": state["results"],
            "matched_items": matched_items,
        })


@app.route("/api/export", methods=["GET"])
def api_export_csv():
    with lock:
        results = list(state["results"])

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["fab", "nama", "alamat", "status", "matched", "timestamp"],
        extrasaction="ignore",
    )
    writer.writeheader()
    for row in results:
        writer.writerow(row)

    csv_data = output.getvalue().encode("utf-8-sig")
    response = make_response(csv_data)
    response.headers["Content-Disposition"] = "attachment; filename=hasil_checker.csv"
    response.headers["Content-Type"] = "text/csv; charset=utf-8-sig"
    return response


# --- AUTH & TELEGRAM API ENDPOINTS ---
@app.route("/api/auth/status", methods=["GET"])
def api_auth_status():
    global CONFIG_PIN
    return jsonify({
        "success": True,
        "pin_required": bool(CONFIG_PIN),
    })


@app.route("/api/auth/verify_pin", methods=["POST"])
def api_auth_verify_pin():
    global CONFIG_PIN
    data = request.get_json(force=True, silent=True) or {}
    pin = str(data.get("pin", "")).strip()
    if not CONFIG_PIN:
        return jsonify({"success": True, "token": "open"})
    if pin == str(CONFIG_PIN).strip():
        return jsonify({"success": True, "token": "valid"})
    return jsonify({"success": False, "error": "PIN salah! Silakan coba lagi."})


@app.route("/api/auth/change_pin", methods=["POST"])
def api_auth_change_pin():
    global CONFIG_PIN
    data = request.get_json(force=True, silent=True) or {}
    current_pin = str(data.get("current_pin", "")).strip()
    new_pin = str(data.get("new_pin", "")).strip()
    if CONFIG_PIN and current_pin != str(CONFIG_PIN).strip():
        return jsonify({"success": False, "error": "PIN lama salah!"})
    if len(new_pin) < 4:
        return jsonify({"success": False, "error": "PIN baru minimal 4 karakter!"})
    CONFIG_PIN = new_pin
    return jsonify({"success": True, "message": f"PIN berhasil diubah menjadi {new_pin}."})


@app.route("/api/telegram/test", methods=["POST"])
def api_telegram_test():
    data = request.get_json(force=True, silent=True) or {}
    token = str(data.get("token", "")).strip()
    chat_id = str(data.get("chat_id", "")).strip()
    sales_id = str(data.get("sales_id", "6222373")).strip()
    if not token or not chat_id:
        return jsonify({"success": False, "error": "Bot Token dan Chat ID wajib diisi."})

    test_item = {
        "fab": f"{get_wib_date_str()}00001",
        "nama": "TEST NOTIFIKASI TELEGRAM",
        "alamat": "Jl. Mawar No. 12 (Uji Coba Sistem FAB Checker)",
        "timestamp": get_wib_time_str(),
    }
    ok, desc = send_telegram_alert(token, chat_id, test_item, sales_id)
    if ok:
        return jsonify({"success": True, "message": "Pesan tes berhasil dikirim ke Telegram Anda!"})
    return jsonify({"success": False, "error": f"Gagal kirim: {desc}"})


@app.route("/api/whatsapp/test", methods=["POST"])
def api_whatsapp_test():
    data = request.get_json(force=True, silent=True) or {}
    provider = str(data.get("provider", "fonnte")).strip()
    phone = str(data.get("phone", "")).strip()
    token = str(data.get("token", "")).strip()
    custom_url = str(data.get("custom_url", "")).strip()
    sales_id = str(data.get("sales_id", "6222373")).strip()

    if not phone and provider != "custom":
        return jsonify({"success": False, "error": "Nomor WhatsApp wajib diisi."})

    test_item = {
        "fab": f"{get_wib_date_str()}00001",
        "nama": "TEST NOTIFIKASI WHATSAPP",
        "alamat": "Jl. Mawar No. 12 (Uji Coba Sistem FAB Checker)",
        "timestamp": get_wib_time_str(),
    }
    ok, desc = send_whatsapp_alert(provider, phone, token, test_item, sales_id, custom_url)
    if ok:
        return jsonify({"success": True, "message": f"Pesan tes WhatsApp ({provider.upper()}) berhasil dikirim!"})
    return jsonify({"success": False, "error": f"Gagal kirim WA: {desc}"})


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    print("=" * 60)
    print(" [FAB CHECKER WEB UI]")
    print(f" Server berjalan di port: {port}")
    print("=" * 60)
    app.run(host="0.0.0.0", port=port, debug=False)
