// Rozstrzyga najbliższy punkt przyciągania (Snap Point)
export function resolveSnapPoint(currentH, min, mid, max) {
  const diffs = [
    { snap: min, val: Math.abs(currentH - min) },
    { snap: mid, val: Math.abs(currentH - mid) },
    { snap: max, val: Math.abs(currentH - max) }
  ];
  return diffs.sort((a, b) => a.val - b.val)[0].snap;
}

// Inicjalizuje interaktywny przeciągany dolny arkusz (Draggable Bottom Sheet)
export function initBottomSheet(sheetEl, handleEl) {
  if (!sheetEl || !handleEl || typeof window === 'undefined') return;

  const getSnapPoints = () => {
    const vh = window.innerHeight || 800;
    return {
      MIN: 80,
      MID: Math.round(vh * 0.55),
      MAX: Math.round(vh * 0.90)
    };
  };

  let SNAP = getSnapPoints();

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      sheetEl.style.height = '';
      return;
    }
    SNAP = getSnapPoints();
  });

  let startY = 0;
  let startHeight = 0;
  let currentHeight = SNAP.MID;
  let isDragging = false;

  // Ustawienie wysokości początkowej na urządzeniach mobilnych (55dvh)
  if (window.innerWidth <= 768) {
    sheetEl.style.height = `${currentHeight}px`;
  }

  // Zabezpieczenie przed propagacją do mapy Leaflet i rejestracja punktu startowego
  handleEl.addEventListener('touchstart', (e) => {
    if (window.innerWidth > 768) return;
    e.stopPropagation();
    isDragging = true;
    if (e.touches && e.touches[0]) {
      startY = e.touches[0].clientY;
    }
    startHeight = sheetEl.getBoundingClientRect ? sheetEl.getBoundingClientRect().height : currentHeight;
    sheetEl.style.transition = 'none'; // Płynne śledzenie palca bez opóźnień
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    // Bezpieczne wywołanie preventDefault tylko gdy zdarzenie nie jest pasywne
    if (e.cancelable) {
      e.preventDefault();
    }
    if (e.touches && e.touches[0]) {
      const currentY = e.touches[0].clientY;
      const deltaY = startY - currentY; // Ruch w górę zwiększa wysokość
      // Ograniczenia brzegowe (clamp boundaries pomiędzy 80px a 90dvh)
      const newHeight = Math.max(SNAP.MIN, Math.min(SNAP.MAX, startHeight + deltaY));

      currentHeight = newHeight;
      sheetEl.style.height = `${newHeight}px`;
    }
  }, { passive: false }); // passive:false wymagane, żeby preventDefault() działało

  window.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    sheetEl.style.transition = 'height 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';

    // Przyciąganie do najbliższego punktu: 80px (collapsed), 55dvh (half) lub 90dvh (expanded)
    currentHeight = resolveSnapPoint(currentHeight, SNAP.MIN, SNAP.MID, SNAP.MAX);
    sheetEl.style.height = `${currentHeight}px`;
  });

  // Obsługa kliknięcia/tapnięcia w uchwyt do szybkiego rozwijania/zwijania
  handleEl.addEventListener('click', (e) => {
    if (window.innerWidth > 768) return;
    e.stopPropagation();
    sheetEl.style.transition = 'height 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';
    if (currentHeight <= SNAP.MIN + 30) {
      currentHeight = SNAP.MID;
    } else if (currentHeight <= SNAP.MID + 30) {
      currentHeight = SNAP.MAX;
    } else {
      currentHeight = SNAP.MID;
    }
    sheetEl.style.height = `${currentHeight}px`;
  });
}

// Izolacja zdarzeń sidebaru od mapy Leaflet
export function initSidebarEventIsolation(sidebarElement) {
  const el = sidebarElement || (typeof document !== 'undefined' ? document.querySelector('.sidebar') : null);
  if (!el) return;

  if (typeof L !== 'undefined' && L.DomEvent) {
    L.DomEvent.disableScrollPropagation(el);
    L.DomEvent.disableClickPropagation(el);
  }
}
