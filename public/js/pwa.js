console.log("PWA.JS CARGADO");
if ("serviceWorker" in navigator) {
    // Esperamos al load para no competir con la carga inicial de la página.
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

// El navegador dispara este evento cuando la app cumple los requisitos de instalación (manifest válido + service worker + HTTPS o localhost).
window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // evitamos el mini-banner automático de Chrome
    deferredPrompt = e; // y nos guardamos el evento para usarlo en nuestro botón
    if (installBtn) installBtn.hidden = false;
});

installBtn?.addEventListener("click", async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt(); // muestra el diálogo nativo del navegador
    const { outcome } = await deferredPrompt.userChoice;
    console.log("Resultado de la instalación:", outcome);

    deferredPrompt = null; // el evento solo se puede usar una vez
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