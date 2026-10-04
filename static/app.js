/**
 * FAB CHECKER PRO — FRONTEND CONTROLLER
 */

document.addEventListener("DOMContentLoaded", () => {
  // Elements - Inputs & Form
  const targetInput = document.getElementById("targetInput");
  const clearTargetBtn = document.getElementById("clearTargetBtn");
  const checkDateInput = document.getElementById("checkDateInput");
  const startSeqInput = document.getElementById("startSeqInput");
  const soundAlertCheck = document.getElementById("soundAlertCheck");
  const btnTestAudio = document.getElementById("btnTestAudio");

  // Settings
  const btnToggleSettings = document.getElementById("btnToggleSettings");
  const settingsBody = document.getElementById("settingsBody");
  const advancedAccordion = document.getElementById("advancedAccordion");
  const salesIdInput = document.getElementById("salesIdInput");
  const timeoutInput = document.getElementById("timeoutInput");
  const concurrencyRange = document.getElementById("concurrencyRange");
  const concurrencyValue = document.getElementById("concurrencyValue");
  const smartDelayRange = document.getElementById("smartDelayRange");
  const smartDelayValue = document.getElementById("smartDelayValue");
  const cookieInput = document.getElementById("cookieInput");
  const telegramTokenInput = document.getElementById("telegramTokenInput");
  const telegramChatIdInput = document.getElementById("telegramChatIdInput");
  const btnTestTelegram = document.getElementById("btnTestTelegram");
  const waProviderSelect = document.getElementById("waProviderSelect");
  const waPhoneInput = document.getElementById("waPhoneInput");
  const waTokenInput = document.getElementById("waTokenInput");
  const waTokenLabel = document.getElementById("waTokenLabel");
  const waCustomUrlGroup = document.getElementById("waCustomUrlGroup");
  const waCustomUrlInput = document.getElementById("waCustomUrlInput");
  const btnTestWhatsapp = document.getElementById("btnTestWhatsapp");
  const waHelpText = document.getElementById("waHelpText");
  const currentPinInput = document.getElementById("currentPinInput");
  const newPinInput = document.getElementById("newPinInput");
  const btnSaveNewPin = document.getElementById("btnSaveNewPin");

  // Auth Elements
  const btnLockApp = document.getElementById("btnLockApp");
  const pinLockOverlay = document.getElementById("pinLockOverlay");
  const pinForm = document.getElementById("pinForm");
  const pinCodeInput = document.getElementById("pinCodeInput");
  const btnSubmitPin = document.getElementById("btnSubmitPin");
  const pinErrorMsg = document.getElementById("pinErrorMsg");

  // Action Buttons
  const btnStartCheck = document.getElementById("btnStartCheck");
  const btnStopCheck = document.getElementById("btnStopCheck");
  const btnResetAll = document.getElementById("btnResetAll");
  const startSpinner = document.getElementById("startSpinner");
  const startIcon = document.getElementById("startIcon");
  const startBtnText = document.getElementById("startBtnText");

  // System & Navbar
  const systemStatus = document.getElementById("systemStatus");
  const statusLabel = document.getElementById("statusLabel");
  const btnExportCsvTop = document.getElementById("btnExportCsvTop");
  const btnExportCsvTable = document.getElementById("btnExportCsvTable");
  const btnHelpModal = document.getElementById("btnHelpModal");
  const helpModal = document.getElementById("helpModal");
  const btnCloseModal = document.getElementById("btnCloseModal");
  const btnCloseModalBtn = document.getElementById("btnCloseModalBtn");

  // Metrics
  const metricTotal = document.getElementById("metricTotal");
  const metricChecked = document.getElementById("metricChecked");
  const metricProgressPercent = document.getElementById("metricProgressPercent");
  const metricMatched = document.getElementById("metricMatched");
  const metricNoData = document.getElementById("metricNoData");
  const metricElapsed = document.getElementById("metricElapsed");
  const metricErrorSub = document.getElementById("metricErrorSub");
  const mainProgressBar = document.getElementById("mainProgressBar");
  const statusMessage = document.getElementById("statusMessage");
  const currentFabIndicator = document.getElementById("currentFabIndicator");

  // Matched Hero Banner
  const matchedHeroCard = document.getElementById("matchedHeroCard");
  const btnCloseHero = document.getElementById("btnCloseHero");
  const heroFabId = document.getElementById("heroFabId");
  const heroNama = document.getElementById("heroNama");
  const heroAlamat = document.getElementById("heroAlamat");
  const heroOpenLink = document.getElementById("heroOpenLink");
  const heroCopyBtn = document.getElementById("heroCopyBtn");

  // Table & Filters
  const tableBody = document.getElementById("tableBody");
  const tableCountBadge = document.getElementById("tableCountBadge");
  const tableSearchInput = document.getElementById("tableSearchInput");
  const tabButtons = document.querySelectorAll(".tab-btn");
  const countAll = document.getElementById("countAll");
  const countMatched = document.getElementById("countMatched");
  const countFound = document.getElementById("countFound");
  const countOthers = document.getElementById("countOthers");

  // State
  let pollTimer = null;
  let allResults = [];
  let activeFilter = "all";
  let activeSearchTerm = "";
  let lastMatchedId = null;
  let lastMatchedCount = 0;

  clearTargetBtn.addEventListener("click", () => {
    targetInput.value = "";
    targetInput.focus();
  });

  // --- Web Audio Chime & Mobile Vibrate ---
  function playChimeAlert() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const playTone = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.35, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      // Melodi bell nada naik C5 -> E5 -> G5 -> C6
      playTone(523.25, now, 0.35);
      playTone(659.25, now + 0.12, 0.35);
      playTone(783.99, now + 0.24, 0.35);
      playTone(1046.5, now + 0.36, 0.75);
    } catch (err) {
      console.warn("Audio chime error:", err);
    }

    if ("vibrate" in navigator) {
      try {
        navigator.vibrate([250, 100, 250, 100, 450]);
      } catch (e) {}
    }
  }

  btnTestAudio?.addEventListener("click", () => {
    playChimeAlert();
    showToast("Nada bel uji coba dibunyikan 🔔", "info");
  });

  // --- Tanggal Pengecekan ---
  function initCheckDate() {
    if (checkDateInput && !checkDateInput.value) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      checkDateInput.value = `${y}-${m}-${d}`;
    }
  }

  // --- Accordion & Sliders ---
  btnToggleSettings.addEventListener("click", () => {
    const isClosed = settingsBody.style.display === "none";
    settingsBody.style.display = isClosed ? "block" : "none";
    advancedAccordion.classList.toggle("open", isClosed);
  });

  function getSpeedLabel(val) {
    const v = parseInt(val, 10);
    if (v <= 5) return `${v} Workers (Santai)`;
    if (v <= 12) return `${v} Workers (Cepat)`;
    if (v <= 22) return `${v} Workers (Turbo 🚀)`;
    return `${v} Workers (Ultra 🔥)`;
  }

  function updateConcurrencyUI(val) {
    if (!concurrencyRange || !concurrencyValue) return;
    concurrencyRange.value = val;
    concurrencyValue.textContent = getSpeedLabel(val);
    localStorage.setItem("fab_concurrency", String(val));

    document.querySelectorAll(".btn-preset-worker").forEach((btn) => {
      const w = btn.getAttribute("data-workers");
      if (w === String(val)) {
        btn.style.outline = "2px solid #06b6d4";
        btn.style.fontWeight = "700";
      } else {
        btn.style.outline = "none";
        btn.style.fontWeight = "normal";
      }
    });
  }

  if (concurrencyRange) {
    const savedConc = localStorage.getItem("fab_concurrency") || "10";
    updateConcurrencyUI(savedConc);

    concurrencyRange.addEventListener("input", () => {
      updateConcurrencyUI(concurrencyRange.value);
    });

    document.querySelectorAll(".btn-preset-worker").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.getAttribute("data-workers");
        if (val) updateConcurrencyUI(val);
      });
    });
  }

  const DEFAULT_COOKIE_VAL = "JSESSIONID=98EB437F2A9537A91D1A42C6D9434203";
  if (cookieInput) {
    const savedCookie = localStorage.getItem("fab_cookie");
    cookieInput.value = savedCookie ? savedCookie : DEFAULT_COOKIE_VAL;
    cookieInput.addEventListener("input", () => {
      localStorage.setItem("fab_cookie", cookieInput.value.trim());
    });
  }

  smartDelayRange?.addEventListener("input", () => {
    const sec = (parseInt(smartDelayRange.value, 10) / 100).toFixed(2);
    smartDelayValue.textContent = `${sec} detik`;
  });

  // --- Telegram Bot Alert Handler ---
  if (telegramTokenInput) {
    telegramTokenInput.value = localStorage.getItem("fab_tg_token") || "";
    telegramTokenInput.addEventListener("input", () => {
      localStorage.setItem("fab_tg_token", telegramTokenInput.value.trim());
    });
  }

  if (telegramChatIdInput) {
    telegramChatIdInput.value = localStorage.getItem("fab_tg_chat_id") || "";
    telegramChatIdInput.addEventListener("input", () => {
      localStorage.setItem("fab_tg_chat_id", telegramChatIdInput.value.trim());
    });
  }

  btnTestTelegram?.addEventListener("click", async () => {
    const token = telegramTokenInput?.value.trim();
    const chatId = telegramChatIdInput?.value.trim();
    if (!token || !chatId) {
      showToast("Bot Token dan Chat ID Telegram wajib diisi terlebih dahulu!", "error");
      return;
    }
    btnTestTelegram.disabled = true;
    btnTestTelegram.textContent = "Mengirim...";
    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          chat_id: chatId,
          sales_id: salesIdInput.value.trim() || "6222373",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Pesan tes berhasil terkirim ke Telegram Anda!", "success");
      } else {
        showToast(`Gagal: ${data.error}`, "error");
      }
    } catch (e) {
      showToast("Gagal menghubungi server untuk tes Telegram.", "error");
    } finally {
      btnTestTelegram.disabled = false;
      btnTestTelegram.textContent = "Tes Kirim Pesan";
    }
  });

  // --- WhatsApp Bot Alert Handler ---
  function updateWaProviderUI() {
    const prov = waProviderSelect?.value || "fonnte";
    if (prov === "fonnte") {
      if (waTokenLabel) waTokenLabel.textContent = "Token Fonnte";
      if (waTokenInput) waTokenInput.placeholder = "Token Fonnte...";
      if (waCustomUrlGroup) waCustomUrlGroup.style.display = "none";
      if (waHelpText) waHelpText.innerHTML = "Gunakan token Fonnte dari dashboard <a href='https://fonnte.com' target='_blank' style='color:#4ade80;'>fonnte.com</a> (daftar gratis & cepat).";
    } else if (prov === "callmebot") {
      if (waTokenLabel) waTokenLabel.textContent = "API Key CallMeBot";
      if (waTokenInput) waTokenInput.placeholder = "API Key...";
      if (waCustomUrlGroup) waCustomUrlGroup.style.display = "none";
      if (waHelpText) waHelpText.innerHTML = "CallMeBot 100% gratis! Simpan nomor <code>+34 644 44 22 22</code> di kontak WA, lalu kirim chat <code>I allow callmebot to send me messages</code> untuk dapat apikey.";
    } else if (prov === "custom") {
      if (waTokenLabel) waTokenLabel.textContent = "API Key (Opsional)";
      if (waTokenInput) waTokenInput.placeholder = "API Key / Bearer...";
      if (waCustomUrlGroup) waCustomUrlGroup.style.display = "block";
      if (waHelpText) waHelpText.textContent = "Masukkan URL Webhook kustom Anda (metode POST JSON).";
    }
  }

  if (waProviderSelect) {
    waProviderSelect.value = localStorage.getItem("fab_wa_provider") || "fonnte";
    updateWaProviderUI();
    waProviderSelect.addEventListener("change", () => {
      localStorage.setItem("fab_wa_provider", waProviderSelect.value);
      updateWaProviderUI();
    });
  }

  if (waPhoneInput) {
    waPhoneInput.value = localStorage.getItem("fab_wa_phone") || "";
    waPhoneInput.addEventListener("input", () => {
      localStorage.setItem("fab_wa_phone", waPhoneInput.value.trim());
    });
  }

  if (waTokenInput) {
    waTokenInput.value = localStorage.getItem("fab_wa_token") || "";
    waTokenInput.addEventListener("input", () => {
      localStorage.setItem("fab_wa_token", waTokenInput.value.trim());
    });
  }

  if (waCustomUrlInput) {
    waCustomUrlInput.value = localStorage.getItem("fab_wa_url") || "";
    waCustomUrlInput.addEventListener("input", () => {
      localStorage.setItem("fab_wa_url", waCustomUrlInput.value.trim());
    });
  }

  btnTestWhatsapp?.addEventListener("click", async () => {
    const prov = waProviderSelect?.value || "fonnte";
    const phone = waPhoneInput?.value.trim();
    const token = waTokenInput?.value.trim();
    const customUrl = waCustomUrlInput?.value.trim();

    if (!phone && prov !== "custom") {
      showToast("Nomor WhatsApp wajib diisi terlebih dahulu!", "error");
      return;
    }
    if (!token && prov !== "custom") {
      showToast("Token / API Key WhatsApp wajib diisi!", "error");
      return;
    }

    btnTestWhatsapp.disabled = true;
    btnTestWhatsapp.textContent = "Mengirim...";
    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: prov,
          phone: phone,
          token: token,
          custom_url: customUrl,
          sales_id: salesIdInput.value.trim() || "6222373",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Pesan tes WhatsApp berhasil terkirim!", "success");
      } else {
        showToast(`Gagal: ${data.error}`, "error");
      }
    } catch (e) {
      showToast("Gagal menghubungi server untuk tes WhatsApp.", "error");
    } finally {
      btnTestWhatsapp.disabled = false;
      btnTestWhatsapp.textContent = "Tes Kirim WA";
    }
  });

  // --- PIN Auth Logic ---
  async function checkAuthLock() {
    const unlocked = sessionStorage.getItem("fab_pin_unlocked") === "true";
    if (unlocked) {
      if (pinLockOverlay) pinLockOverlay.style.display = "none";
      return;
    }
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      if (data.pin_required) {
        if (pinLockOverlay) pinLockOverlay.style.display = "flex";
        setTimeout(() => pinCodeInput?.focus(), 150);
      } else {
        if (pinLockOverlay) pinLockOverlay.style.display = "none";
      }
    } catch (e) {
      if (pinLockOverlay) pinLockOverlay.style.display = "none";
    }
  }

  async function submitPin() {
    const pin = pinCodeInput.value.trim();
    if (!pin) return;
    btnSubmitPin.disabled = true;
    try {
      const res = await fetch("/api/auth/verify_pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem("fab_pin_unlocked", "true");
        if (pinLockOverlay) pinLockOverlay.style.display = "none";
        if (pinErrorMsg) pinErrorMsg.style.display = "none";
        pinCodeInput.value = "";
        showToast("Akses terbuka!", "success");
      } else {
        if (pinErrorMsg) {
          pinErrorMsg.textContent = data.error || "PIN salah!";
          pinErrorMsg.style.display = "block";
        }
        pinCodeInput.select();
      }
    } catch (e) {
      if (pinErrorMsg) {
        pinErrorMsg.textContent = "Gagal memverifikasi PIN.";
        pinErrorMsg.style.display = "block";
      }
    } finally {
      btnSubmitPin.disabled = false;
    }
  }

  btnSubmitPin?.addEventListener("click", submitPin);
  pinForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    submitPin();
  });

  btnLockApp?.addEventListener("click", () => {
    sessionStorage.removeItem("fab_pin_unlocked");
    if (pinLockOverlay) pinLockOverlay.style.display = "flex";
    if (pinCodeInput) {
      pinCodeInput.value = "";
      pinCodeInput.focus();
    }
    if (pinErrorMsg) pinErrorMsg.style.display = "none";
    showToast("Aplikasi dikunci.", "info");
  });

  btnSaveNewPin?.addEventListener("click", async () => {
    const cur = currentPinInput?.value.trim() || "";
    const nxt = newPinInput?.value.trim() || "";
    if (!nxt || nxt.length < 4) {
      showToast("Masukkan PIN baru minimal 4 angka/karakter!", "error");
      return;
    }
    try {
      const res = await fetch("/api/auth/change_pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_pin: cur, new_pin: nxt }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        if (currentPinInput) currentPinInput.value = "";
        if (newPinInput) newPinInput.value = "";
      } else {
        showToast(data.error, "error");
      }
    } catch (e) {
      showToast("Gagal mengubah PIN.", "error");
    }
  });

  // --- Action: Start Check ---
  btnStartCheck.addEventListener("click", async () => {
    const target = targetInput.value.trim();

    if (!target) {
      showToast("Nama target pencarian tidak boleh kosong!", "error");
      targetInput.focus();
      return;
    }

    const dateVal = checkDateInput ? checkDateInput.value.replace(/-/g, "").trim() : "";
    const seqVal = startSeqInput ? parseInt(startSeqInput.value, 10) || 1 : 1;
    const tgToken = telegramTokenInput ? telegramTokenInput.value.trim() : "";
    const tgChat = telegramChatIdInput ? telegramChatIdInput.value.trim() : "";
    const smartDly = smartDelayRange ? parseInt(smartDelayRange.value, 10) / 100 : 0.05;

    const waProv = waProviderSelect ? waProviderSelect.value : "fonnte";
    const waPh = waPhoneInput ? waPhoneInput.value.trim() : "";
    const waTok = waTokenInput ? waTokenInput.value.trim() : "";
    const waUrl = waCustomUrlInput ? waCustomUrlInput.value.trim() : "";

    const payload = {
      target: target,
      fabs: [],
      date_str: dateVal,
      start_seq: seqVal,
      telegram_token: tgToken,
      telegram_chat_id: tgChat,
      smart_delay: smartDly,
      wa_provider: waProv,
      wa_phone: waPh,
      wa_token: waTok,
      wa_custom_url: waUrl,
      sales_id: salesIdInput.value.trim() || "6222373",
      concurrency: parseInt(concurrencyRange.value, 10) || 10,
      timeout: parseInt(timeoutInput.value, 10) || 15,
      cookie: (cookieInput && cookieInput.value.trim()) ? cookieInput.value.trim() : DEFAULT_COOKIE_VAL,
      stop_on_match: document.getElementById("stopOnMatchCheck") ? document.getElementById("stopOnMatchCheck").checked : true,
    };

    setRunningUI(true);

    try {
      const res = await fetch("/api/check/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) {
        showToast(data.error || "Gagal memulai pemeriksaan.", "error");
        setRunningUI(false);
        return;
      }

      showToast(data.message || `Pencarian otomatis dimulai dari nomor 00001 tanggal hari ini...`, "success");
      startPolling();
    } catch (err) {
      showToast("Gagal menghubungi server.", "error");
      setRunningUI(false);
    }
  });

  // --- Action: Stop Check ---
  btnStopCheck.addEventListener("click", async () => {
    try {
      btnStopCheck.disabled = true;
      btnStopCheck.textContent = "Menghentikan...";
      const res = await fetch("/api/check/stop", { method: "POST" });
      const data = await res.json();
      showToast(data.message || "Pemeriksaan dihentikan.", "info");
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      setRunningUI(false);
      await fetchStatus();
    } catch (err) {
      showToast("Gagal menghentikan proses.", "error");
    } finally {
      btnStopCheck.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="4" width="16" height="16" rx="2"/></svg> Berhenti`;
    }
  });

  // --- Action: Reset All ---
  btnResetAll.addEventListener("click", async () => {
    try {
      btnResetAll.disabled = true;
      const res = await fetch("/api/check/reset", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        allResults = [];
        lastMatchedId = null;
        renderTable();
        matchedHeroCard.style.display = "none";
        const heroItemsContainer = document.getElementById("heroItemsContainer");
        if (heroItemsContainer) heroItemsContainer.innerHTML = "";
        metricTotal.textContent = "0";
        metricChecked.textContent = "0";
        metricProgressPercent.textContent = "0% Selesai";
        metricMatched.textContent = "0";
        metricNoData.textContent = "0";
        metricElapsed.textContent = "Waktu: 0.0s";
        metricErrorSub.textContent = "0 error network";
        mainProgressBar.style.width = "0%";
        statusMessage.textContent = "Siap memulai pengecekan.";
        currentFabIndicator.textContent = "";
        systemStatus.className = "status-indicator";
        statusLabel.textContent = "Siap (Idle)";
        setRunningUI(false);
        showToast("Dashboard berhasil di-reset.", "success");
      } else {
        showToast(data.error || "Gagal me-reset.", "error");
      }
    } catch (err) {
      showToast("Gagal me-reset dashboard.", "error");
    } finally {
      btnResetAll.disabled = false;
    }
  });

  // --- Polling & Status Sync ---
  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    fetchStatus();
    pollTimer = setInterval(fetchStatus, 350);
  }

  async function fetchStatus() {
    try {
      const res = await fetch("/api/check/status");
      if (!res.ok) return;
      const data = await res.json();

      updateUIWithStatus(data);

      if (!data.is_running) {
        clearInterval(pollTimer);
        pollTimer = null;
        setRunningUI(false);
        if (data.checked > 0) {
          showToast(
            `Pemeriksaan selesai: ${data.checked}/${data.total} diproses. Cocok: ${data.matched_count}`,
            data.matched_count > 0 ? "success" : "info"
          );
        }
      }
    } catch (err) {
      console.warn("Status fetch error:", err);
    }
  }

  function updateUIWithStatus(data) {
    metricTotal.textContent = data.total;
    metricChecked.textContent = data.checked;
    metricProgressPercent.textContent = `${data.progress_percent}% Selesai`;
    metricMatched.textContent = data.matched_count;
    metricNoData.textContent = data.no_data_count + data.error_count;
    metricElapsed.textContent = `Waktu: ${data.elapsed_seconds}s`;
    metricErrorSub.textContent = `${data.error_count} error network`;

    mainProgressBar.style.width = `${data.progress_percent}%`;
    statusMessage.textContent = data.status_message;
    currentFabIndicator.textContent = data.current_fab ? `Memeriksa: ${data.current_fab}` : "";

    if (data.is_running) {
      systemStatus.className = "status-indicator running";
      statusLabel.textContent = `Pengecekan Aktif (${data.checked}/${data.total})`;
    } else {
      if (data.matched_count > 0) {
        systemStatus.className = "status-indicator matched";
        statusLabel.textContent = `Selesai • ${data.matched_count} Target Cocok`;
      } else {
        systemStatus.className = "status-indicator";
        statusLabel.textContent = "Selesai / Idle";
      }
    }

    // Hero Matched Card
    if (data.matched_items && data.matched_items.length > 0) {
      renderMatchedHero(data.matched_items);
    } else {
      matchedHeroCard.style.display = "none";
    }

    // Trigger Audio Alert & Vibrate if new match detected
    if (data.matched_count > lastMatchedCount) {
      if (soundAlertCheck && soundAlertCheck.checked) {
        playChimeAlert();
      }
      lastMatchedCount = data.matched_count;
    }

    // Results Table update
    allResults = data.results || [];
    renderTable();
  }

  window.copyItemDetail = function(fab, encNama, encAlamat, encLink) {
    const nama = decodeURIComponent(encNama);
    const alamat = decodeURIComponent(encAlamat);
    const link = decodeURIComponent(encLink);
    const text = `FAB ID: ${fab}\nNama: ${nama}\nAlamat: ${alamat}\nLink: ${link}`;
    navigator.clipboard.writeText(text);
    showToast(`Detail ${fab} (${nama}) berhasil disalin!`, "success");
  };

  function renderMatchedHero(items) {
    if (!items || items.length === 0) {
      matchedHeroCard.style.display = "none";
      return;
    }
    matchedHeroCard.style.display = "block";
    const heroBadgeText = document.getElementById("heroBadgeText");
    const heroItemsContainer = document.getElementById("heroItemsContainer");
    const btnFilterMatchedTab = document.getElementById("btnFilterMatchedTab");
    const salesId = salesIdInput.value.trim() || "6222373";

    if (heroBadgeText) {
      heroBadgeText.textContent = items.length === 1 
        ? "🎯 TARGET BERHASIL DITEMUKAN!" 
        : `🎯 ${items.length} TARGET BERHASIL DITEMUKAN!`;
    }

    if (btnFilterMatchedTab) {
      btnFilterMatchedTab.textContent = `Lihat di Tabel (${items.length})`;
      btnFilterMatchedTab.onclick = () => {
        const matchedTab = document.querySelector('.tab-btn[data-filter="matched"]');
        if (matchedTab) matchedTab.click();
        const tableCard = document.querySelector(".table-card");
        if (tableCard) tableCard.scrollIntoView({ behavior: "smooth" });
      };
    }

    heroItemsContainer.innerHTML = items.map((item, idx) => {
      const portalUrl = `https://fab-digital.myrepublic.net.id/fabdigitallg?sales_id=${encodeURIComponent(
        salesId
      )}&request_custom_id=${encodeURIComponent(item.fab)}`;

      return `
        <div class="hero-item-block" style="${idx > 0 ? 'margin-top: 1.15rem; padding-top: 1.15rem; border-top: 1px dashed rgba(245, 158, 11, 0.35);' : ''}">
          <div class="matched-hero-body">
            <div class="hero-item">
              <span class="hero-label">Nomor FAB ID ${items.length > 1 ? '#' + (idx + 1) : ''}:</span>
              <span class="hero-value font-mono highlight">${escapeHtml(item.fab)}</span>
            </div>
            <div class="hero-item">
              <span class="hero-label">Nama Pelanggan:</span>
              <span class="hero-value text-gold font-bold">${escapeHtml(item.nama || "-")}</span>
            </div>
            <div class="hero-item full-width">
              <span class="hero-label">Alamat Pemasangan:</span>
              <span class="hero-value">${escapeHtml(item.alamat || "-")}</span>
            </div>
          </div>
          <div class="matched-hero-footer">
            <a href="${portalUrl}" target="_blank" rel="noreferrer" class="btn btn-sm btn-accent">
              Buka Halaman Portal
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
            <button type="button" class="btn btn-sm btn-secondary" onclick="copyItemDetail('${item.fab}', '${encodeURIComponent(item.nama || '')}', '${encodeURIComponent(item.alamat || '')}', '${encodeURIComponent(portalUrl)}')">
              Salin Detail
            </button>
            <span style="font-size: 0.75rem; color: var(--text-dim); margin-left: auto;">Waktu: ${item.timestamp || '-'}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  btnCloseHero.addEventListener("click", () => {
    matchedHeroCard.style.display = "none";
  });

  function setRunningUI(isRunning) {
    btnStartCheck.disabled = isRunning;
    btnStopCheck.disabled = !isRunning;
    btnResetAll.disabled = false;

    if (isRunning) {
      startSpinner.style.display = "inline-block";
      startIcon.style.display = "none";
      startBtnText.textContent = "Sedang Memeriksa...";
    } else {
      startSpinner.style.display = "none";
      startIcon.style.display = "inline-block";
      startBtnText.textContent = "Mulai Pengecekan";
    }
  }

  // --- Filtering & Table Rendering ---
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      renderTable();
    });
  });

  tableSearchInput.addEventListener("input", (e) => {
    activeSearchTerm = e.target.value.trim().toLowerCase();
    renderTable();
  });

  function renderTable() {
    // Count stats for tabs
    let mCount = 0;
    let fCount = 0;
    let oCount = 0;

    allResults.forEach((r) => {
      if (r.matched) mCount++;
      if (r.status === "FOUND") fCount++;
      if (r.status === "NO_DATA" || r.status.includes("ERROR") || r.status.includes("INVALID")) oCount++;
    });

    countAll.textContent = allResults.length;
    countMatched.textContent = mCount;
    countFound.textContent = fCount;
    countOthers.textContent = oCount;

    // Filter results
    const filtered = allResults.filter((r) => {
      // Tab filter
      if (activeFilter === "matched" && !r.matched) return false;
      if (activeFilter === "found" && r.status !== "FOUND") return false;
      if (activeFilter === "nodata" && !(r.status === "NO_DATA" || r.status.includes("ERROR") || r.status.includes("INVALID"))) return false;

      // Search term filter
      if (activeSearchTerm) {
        const hay = `${r.fab} ${r.nama || ""} ${r.alamat || ""} ${r.status}`.toLowerCase();
        if (!hay.includes(activeSearchTerm)) return false;
      }

      return true;
    });

    tableCountBadge.textContent = `${filtered.length} dari ${allResults.length} Hasil`;

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="7">
            <div class="empty-state">
              <p class="empty-title">${allResults.length === 0 ? "Belum ada pemeriksaan dijalankan" : "Tidak ada hasil yang sesuai filter"}</p>
              <p class="empty-desc">${allResults.length === 0 ? "Masukkan nama target dan daftar FAB ID di panel sebelah kiri, lalu tekan 'Mulai Pengecekan'." : "Coba ubah tab filter atau kata kunci pencarian Anda."}</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const salesId = salesIdInput.value.trim() || "6222373";

    tableBody.innerHTML = filtered
      .map((row, index) => {
        const isMatched = row.matched;
        let badgeClass = "badge-warning";
        let badgeText = row.status;

        if (isMatched) {
          badgeClass = "badge-success";
          badgeText = "🎯 MATCHED";
        } else if (row.status === "FOUND") {
          badgeClass = "badge-info";
        } else if (row.status === "BUTUH_LOGIN") {
          badgeClass = "badge-danger";
          badgeText = "🔒 BUTUH LOGIN";
        } else if (row.status.includes("ERROR") || row.status.includes("INVALID")) {
          badgeClass = "badge-danger";
        }

        const portalUrl = `https://fab-digital.myrepublic.net.id/fabdigitallg?sales_id=${encodeURIComponent(
          salesId
        )}&request_custom_id=${encodeURIComponent(row.fab)}`;

        return `
          <tr class="${isMatched ? "row-matched" : ""}">
            <td style="color: var(--text-dim);">${index + 1}</td>
            <td>
              <span class="font-mono ${isMatched ? "text-gold font-bold" : ""}">${row.fab}</span>
            </td>
            <td>
              <strong>${row.status === "BUTUH_LOGIN" ? '<span style="color: #fca5a5;">Sesi login diperlukan</span>' : escapeHtml(row.nama || "-")}</strong>
            </td>
            <td style="font-size: 0.78rem; color: var(--text-muted);">
              ${row.status === "BUTUH_LOGIN" ? '<span style="color: #94a3b8;">' + escapeHtml(row.detail || "Masukkan cookie portal di Pengaturan Lanjutan") + '</span>' : escapeHtml(row.alamat || "-")}
            </td>
            <td>
              <span class="badge ${badgeClass}">${badgeText}</span>
            </td>
            <td style="font-size: 0.75rem; color: var(--text-dim);">
              ${row.timestamp || "-"}
            </td>
            <td>
              <a href="${portalUrl}" target="_blank" rel="noreferrer" class="btn btn-ghost btn-xs" title="Buka di Portal FAB">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // --- Export CSV Handlers ---
  function exportCsv() {
    if (allResults.length === 0) {
      showToast("Belum ada data hasil untuk di-export.", "error");
      return;
    }
    window.location.href = "/api/export";
    showToast("Mengunduh hasil_checker.csv...", "success");
  }

  btnExportCsvTop.addEventListener("click", exportCsv);
  btnExportCsvTable.addEventListener("click", exportCsv);

  // --- Modal Panduan ---
  btnHelpModal.addEventListener("click", () => {
    helpModal.style.display = "flex";
  });

  btnCloseModal.addEventListener("click", () => {
    helpModal.style.display = "none";
  });

  btnCloseModalBtn.addEventListener("click", () => {
    helpModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === helpModal) {
      helpModal.style.display = "none";
    }
  });

  // --- Toast System ---
  function showToast(message, type = "info") {
    const toastContainer = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let iconSvg = "";
    if (type === "success") {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === "error") {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(50px)";
      toast.style.transition = "all 0.3s ease-out";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Initial load
  initCheckDate();
  checkAuthLock();
  fetchStatus();
});
