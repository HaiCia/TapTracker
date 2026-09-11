// pwa.js - Progressive Web App Install Controller & iOS Safari Fallback

let deferredPrompt = null;

export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function isIOS() {
  const userAgent = window.navigator.userAgent || '';
  const isAppleTouch = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isAppleTouch || isIPadOS;
}

export function showInstallButtons() {
  if (isStandalone()) {
    hideInstallButtons();
    return;
  }
  const buttons = document.querySelectorAll('.pwa-install-btn');
  buttons.forEach((btn) => {
    btn.style.display = btn.classList.contains('header-install-btn') ? 'inline-flex' : 'flex';
  });
}

export function hideInstallButtons() {
  const buttons = document.querySelectorAll('.pwa-install-btn');
  buttons.forEach((btn) => {
    btn.style.display = 'none';
  });
}

export async function handlePwaInstall() {
  if (isStandalone()) {
    hideInstallButtons();
    return;
  }

  // Close user dropdown if open
  const dropdown = document.getElementById('user-dropdown');
  if (dropdown && dropdown.classList.contains('show')) {
    dropdown.classList.remove('show');
  }

  if (deferredPrompt) {
    // Chromium (Android, Chrome, Edge, Brave, etc.) flow
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        hideInstallButtons();
      }
    } catch (err) {
      console.warn('PWA install prompt error:', err);
    }
    deferredPrompt = null;
  } else if (isIOS()) {
    // iOS Safari instructions modal
    showIosInstallModal();
  } else {
    // Fallback if accessed on other browser without native prompt
    showIosInstallModal();
  }
}

export function showIosInstallModal() {
  let modal = document.getElementById('pwa-install-modal');
  if (!modal) {
    modal = createIosInstallModal();
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  void modal.offsetWidth; // Force reflow
  modal.classList.add('show');

  // Handle escape key
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      closeIosInstallModal();
      document.removeEventListener('keydown', handleKeydown);
    }
  };
  document.addEventListener('keydown', handleKeydown);
}

export function closeIosInstallModal() {
  const modal = document.getElementById('pwa-install-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 250);
  }
}

function createIosInstallModal() {
  const overlay = document.createElement('div');
  overlay.id = 'pwa-install-modal';
  overlay.className = 'ios-install-overlay';
  overlay.onclick = (e) => {
    if (e.target === overlay) closeIosInstallModal();
  };

  overlay.innerHTML = `
    <div class="ios-install-card" role="dialog" aria-modal="true" aria-labelledby="pwa-modal-title">
      <div class="ios-install-header">
        <h3 id="pwa-modal-title" class="ios-install-title">
          <span>🍺</span> Zainstaluj TapTracker
        </h3>
        <button type="button" class="ios-install-close" onclick="window.closeIosInstallModal()" aria-label="Zamknij">✕</button>
      </div>
      <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.4;">
        Zainstaluj TapTracker na ekranie głównym swojego telefonu, aby cieszyć się pełnym ekranem i błyskawicznym dostępem do pubów.
      </p>
      <div class="ios-install-steps">
        <div class="ios-install-step">
          <div class="ios-step-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <polyline points="16 6 12 2 8 6"></polyline>
              <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
          </div>
          <div class="ios-step-text">
            1. W przeglądarce Safari stuknij ikonę <strong>Udostępnij</strong> na dolnym pasku narzędzi.
          </div>
        </div>
        <div class="ios-install-step">
          <div class="ios-step-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="4" ry="4"></rect>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </div>
          <div class="ios-step-text">
            2. Przewiń listę opcji w dół i wybierz <strong>Do ekranu początkowego</strong>.
          </div>
        </div>
        <div class="ios-install-step">
          <div class="ios-step-icon-box">
            <span style="font-size: 16px;">➕</span>
          </div>
          <div class="ios-step-text">
            3. W prawym górnym rogu ekranu kliknij <strong>Dodaj</strong>.
          </div>
        </div>
      </div>
      <button type="button" class="ios-install-btn-action" onclick="window.closeIosInstallModal()">
        Rozumiem
      </button>
    </div>
  `;
  return overlay;
}

export function initPwa() {
  // If already installed/standalone, keep buttons hidden
  if (isStandalone()) {
    hideInstallButtons();
    return;
  }

  // Listen for Chromium beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButtons();
  });

  // Listen for appinstalled
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideInstallButtons();
    if (window.showToast) {
      window.showToast('TapTracker został pomyślnie zainstalowany!', 'success');
    }
  });

  // iOS Safari fallback: show button immediately if on iOS and not in standalone mode
  if (isIOS() && !isStandalone()) {
    showInstallButtons();
  }

  // Register service worker if supported
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('PWA Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.log('PWA Service Worker registration skipped or failed:', err);
        });
    });
  }
}

// Bind to window for HTML inline access
window.handlePwaInstall = handlePwaInstall;
window.closeIosInstallModal = closeIosInstallModal;
