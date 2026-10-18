console.log("PWA.JS CARGADO");
if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
        try {
            const reg = await navigator.serviceWorker.register("/sw.js");
            console.log("✅ Service worker registrado:", reg.scope);
        } catch (err) {
            console.error("❌ No se pudo registrar el service worker:", err);
        }
    });
}

/* ---- 2. Botón de instalación ---- */
const installBtn = document.getElementById("installBtn");
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.hidden = false;
});

installBtn?.addEventListener("click", async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("Resultado de la instalación:", outcome);

    deferredPrompt = null;
    installBtn.hidden = true;
});

window.addEventListener("appinstalled", () => {
    console.log("🎉 App instalada");
    if (installBtn) installBtn.hidden = true;
});

/* ---- 3. Indicador de conexión ---- */
const offlineBadge = document.getElementById("offlineBadge");

function updateOnlineStatus() {
    if (offlineBadge) offlineBadge.hidden = navigator.onLine;
}

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();