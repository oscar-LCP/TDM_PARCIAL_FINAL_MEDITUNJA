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
const installStatus = document.getElementById("installStatus");
let deferredPrompt = null;
const isInstalled = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

if (installBtn && !isInstalled) installBtn.hidden = false;

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.hidden = false;
});

installBtn?.addEventListener("click", async () => {
    if (!deferredPrompt) {
        if (installStatus) {
            installStatus.textContent = "Para instalarla, abre el menú del navegador y selecciona Instalar app o Instalar MediTunja.";
        }
        return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("Resultado de la instalación:", outcome);
    if (installStatus && outcome !== "accepted") installStatus.textContent = "La instalación fue cancelada.";

    deferredPrompt = null;
    if (outcome === "accepted") installBtn.hidden = true;
});

window.addEventListener("appinstalled", () => {
    console.log("🎉 App instalada");
    if (installBtn) installBtn.hidden = true;
    if (installStatus) installStatus.textContent = "MediTunja quedó instalada.";
});

/* ---- 3. Indicador de conexión ---- */
const offlineBadge = document.getElementById("offlineBadge");

function updateOnlineStatus() {
    if (offlineBadge) offlineBadge.hidden = navigator.onLine;
}

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();