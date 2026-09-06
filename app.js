const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let map;
let markers = [];
let markerCluster;
let currentUser = null;
let currentFilterType = "all";
let currentSearchQuery = "";
let isSidebarHidden = false;
let isListOnly = false;
let friendVisitData = {};
let isComparing = false;
let isAdmin = false;
let isSuperadmin = false;
let lastNicknameChange = null;
let lastFriendCodeChange = null;
let userLocationMarker = null;

async function startApp() {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }
  currentUser = session.user;

  setupUserProfile();
  initMap();
}

function toggleUserMenu() {
  const dropdown = document.getElementById("user-dropdown");
  if (dropdown) dropdown.classList.toggle("show");
}

// --- PROFIL UŻYTKOWNIKA I KODY ZNAJOMYCH ---
async function setupUserProfile() {
  let displayName = currentUser.email.split("@")[0];

  // NOWE: Pobieramy daty ostatnich zmian
  const { data, error } = await supabaseClient
    .from("profiles")
    .select(
      "friend_code, nickname, is_admin, is_superadmin, last_nickname_change, last_friend_code_change",
    )
    .eq("id", currentUser.id);

  if (error) console.error("Profile fetch error:", error.message);

  if (data && data.length > 0) {
    const profile = data[0];
    isAdmin = profile.is_admin === true;
    isSuperadmin = profile.is_superadmin === true;

    // Zapisujemy daty w pamięci
    lastNicknameChange = profile.last_nickname_change;
    lastFriendCodeChange = profile.last_friend_code_change;

    document.getElementById("my-friend-code").innerText =
      profile.friend_code || "⏳...";
    if (profile.nickname) displayName = profile.nickname;
  } else {
    generateNewFriendCode();
  }

  // ... reszta funkcji (dodawanie koron i przycisków) zostaje bez zmian!

  document.getElementById("user-display").innerText = displayName + " ▼";
}

async function generateNewFriendCode() {
  const newCode =
    "TAP-" + Math.random().toString(36).substring(2, 6).toUpperCase();
  const { error } = await supabaseClient
    .from("profiles")
    .upsert({ id: currentUser.id, friend_code: newCode });
  if (!error) {
    document.getElementById("my-friend-code").innerText = newCode;
  }
}

function copyFriendCode() {
  const codeText = document.getElementById("my-friend-code").innerText;
  if (!codeText || codeText.includes("⏳")) return;
  navigator.clipboard
    .writeText(codeText)
    .then(() => alert("Copied: " + codeText));
}

async function changeNickname() {
  const daysLeft = getDaysRemaining(lastNicknameChange);

  // Sprawdzamy limit (Superadmin może ignorować limit, jeśli chcesz, ale na razie blokujemy wszystkich)
  if (daysLeft > 0) {
    alert(
      `You can only change your nickname once every 30 days. Please wait ${daysLeft} more days.`,
    );
    return;
  }

  const currentName = document
    .getElementById("user-display")
    .innerText.replace(/ ▼|👑 |🛠️ /g, "");
  const newName = window.prompt("Enter new nickname:", currentName);

  if (!newName || newName.trim() === "" || newName === currentName) return;

  const cleanName = newName.trim();
  const nowIso = new Date().toISOString(); // Aktualna data i czas

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      nickname: cleanName,
      last_nickname_change: nowIso, // Zapisujemy datę zmiany
    })
    .eq("id", currentUser.id);

  if (error) {
    alert("Error changing nickname: " + error.message);
  } else {
    // Aktualizujemy datę lokalnie i odświeżamy profil
    lastNicknameChange = nowIso;
    setupUserProfile();
    alert("Nickname updated successfully!");
  }
}

async function rotateFriendCode() {
  const daysLeft = getDaysRemaining(lastFriendCodeChange);

  if (daysLeft > 0) {
    alert(
      `You can only generate a new Friend Code once every 30 days. Please wait ${daysLeft} more days.`,
    );
    return;
  }

  if (confirm("Resetting your code will invalidate the old one. Continue?")) {
    const newCode =
      "TAP-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    const nowIso = new Date().toISOString();

    const { error } = await supabaseClient
      .from("profiles")
      .update({
        friend_code: newCode,
        last_friend_code_change: nowIso, // Zapisujemy datę zmiany
      })
      .eq("id", currentUser.id);

    if (error) {
      alert("Error generating new code: " + error.message);
    } else {
      lastFriendCodeChange = nowIso;
      document.getElementById("my-friend-code").innerText = newCode;
      alert("New Friend Code generated!");
    }
  }
}

async function changePassword() {
  const newPassword = window.prompt(
    "Enter new password (minimum 6 characters):",
  );

  if (!newPassword || newPassword.trim() === "") return;

  if (newPassword.length < 6) {
    alert("Password is too short! It must be at least 6 characters.");
    return;
  }

  const { error } = await supabaseClient.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    alert("Error changing password: " + error.message);
    console.error("Error details:", error);
  } else {
    alert(
      "Your password has been successfully changed! You can use it on your next login.",
    );
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.reload();
}

// --- MAPA I PUBY ---
function initMap() {
  map = L.map("map").setView([53.8008, -1.5491], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(map);

  markerCluster = L.markerClusterGroup({
    maxClusterRadius: 40,
    disableClusteringAtZoom: 16,
  });
  map.addLayer(markerCluster);

  // --- NOWE: PRZYCISK LOKALIZACJI NA MAPIE ---
  const LocateControl = L.Control.extend({
    options: { position: "topleft" }, // Pojawi się pod przyciskami +/-
    onAdd: function (map) {
      const container = L.DomUtil.create("div", "leaflet-bar leaflet-control");
      const button = L.DomUtil.create("a", "", container);

      button.innerHTML = "📍";
      button.href = "#";
      button.title = "Find my location";
      button.style.fontSize = "18px";
      button.style.lineHeight = "30px";
      button.style.textAlign = "center";
      button.style.textDecoration = "none";
      button.style.backgroundColor = "white";
      button.style.display = "block";
      button.style.width = "34px";
      button.style.height = "34px";

      // Zatrzymujemy kliknięcie, żeby nie klikało w mapę POD przyciskiem
      L.DomEvent.disableClickPropagation(button);

      // Co się dzieje po kliknięciu:
      L.DomEvent.on(button, "click", function (e) {
        L.DomEvent.preventDefault(e);
        map.locate({ setView: true, maxZoom: 15 }); // Centruje mapę!
      });

      return container;
    },
  });
  map.addControl(new LocateControl());
  // --- KONIEC PRZYCISKU ---

  // Pierwsze odpalenie lokalizacji przy wejściu do aplikacji
  map.locate({ setView: true, maxZoom: 15 });

  // Gdy telefon/komputer znajdzie pozycję:
  map.on("locationfound", function (e) {
    if (userLocationMarker) {
      // Jeśli kropka już istnieje, tylko uaktualniamy jej pozycję
      userLocationMarker.setLatLng(e.latlng);
    } else {
      // Jeśli kropki nie ma (pierwsze namierzenie), tworzymy ją
      userLocationMarker = L.circleMarker(e.latlng, {
        radius: 8,
        fillColor: "#2196f3",
        color: "#ffffff",
        weight: 3,
        opacity: 1,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-weight: bold; white-space: nowrap; color: #333;">You are here 📍</div>`,
          {
            closeButton: false,
            minWidth: 10,
            offset: [0, -5],
            className: "mini-location-popup",
          },
        );
    }
    userLocationMarker.openPopup();
  });

  map.on("locationerror", function (e) {
    console.log("Geolocation access denied or failed.");
  });

  map.on("moveend", updateSidebarList);

  loadPubs();
}

async function loadPubs() {
  const { data: pubs } = await supabaseClient.from("pubs").select("*");
  const { data: visits } = await supabaseClient
    .from("visits")
    .select("*")
    .eq("user_id", currentUser.id);

  // --- NOWE: Pobieramy wszystkie oceny (większe niż 0), by policzyć średnią społeczności ---
  const { data: allRatings } = await supabaseClient
    .from("visits")
    .select("pub_id, rating")
    .gt("rating", 0);

  const communityData = {};
  if (allRatings) {
    const sums = {};
    const counts = {};
    allRatings.forEach((v) => {
      if (!sums[v.pub_id]) {
        sums[v.pub_id] = 0;
        counts[v.pub_id] = 0;
      }
      sums[v.pub_id] += v.rating;
      counts[v.pub_id]++;
    });

    Object.keys(sums).forEach((id) => {
      communityData[id] = {
        avg: (sums[id] / counts[id]).toFixed(1), // formatujemy do 1 miejsca po przecinku (np. 4.2)
        count: counts[id],
      };
    });
  }

  const visitedMap = {};
  if (visits) {
    visits.forEach((v) => {
      visitedMap[v.pub_id] = {
        date: v.visit_date,
        note: v.note,
        rating: v.rating,
      };
    });
  }

  markers = [];
  if (pubs) {
    pubs.forEach((pub) => {
      const isVisited = !!visitedMap[pub.id];
      pub.visited = isVisited;
      pub.visit_date = isVisited ? visitedMap[pub.id].date : null;
      pub.note = isVisited ? visitedMap[pub.id].note : null;
      pub.rating = isVisited ? visitedMap[pub.id].rating : 0;

      // --- NOWE: Przypisujemy wyliczone dane do pubu ---
      pub.community = communityData[pub.id] || { avg: 0, count: 0 };

      const marker = L.marker([pub.lat, pub.lng], {
        icon: L.divIcon({
          html: getMarkerHtml(isVisited, pub.id, false),
          className: "custom-icon",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
      });
      marker.pubData = pub;

      marker.on("click", async () => {
        if (!marker.pubData.visited) {
          await markAsVisited(marker.pubData.id);
          marker.openPopup();
        }
      });

      markers.push(marker);
    });
  }
  applyFilters();
}

function getMarkerHtml(isVisited, pubId, isFriendVisited = false) {
  let containerClass = "";
  let innerHtml = "<span>🍺</span>";

  if (isVisited && isFriendVisited) {
    containerClass = "is-both-visited";
    innerHtml += '<div class="tick">🍻</div>';
  } else if (isVisited) {
    containerClass = "is-visited";
    innerHtml += '<div class="tick">✔️</div>';
  } else if (isFriendVisited) {
    containerClass = "is-friend-visited";
    innerHtml += '<div class="tick">👋</div>';
  }

  // Zwracamy czysty kod HTML, bez 'onclick' (kliknięcie obsługuje Leaflet)
  return `<div class="pub-icon-container ${containerClass}">${innerHtml}</div>`;
}

// --- STAR RATING SYSTEM ---

// Generates HTML for the stars inside the Leaflet popup
function getStarsHtml(pubId, currentRating) {
  const rating = currentRating || 0;
  let html = '<div class="star-rating-container">';
  html += '<div class="stars">';

  // We loop backwards (5 to 1) because of the CSS row-reverse trick
  for (let i = 5; i >= 1; i--) {
    const isChecked = i === rating ? "checked" : "";

    // FIX: Added single quotes around '${pubId}' and explicitly called window.saveRating
    html += `<input type="radio" id="star-${i}-${pubId}" name="rating-${pubId}" value="${i}" ${isChecked} onchange="window.saveRating('${pubId}', ${i})">`;
    html += `<label for="star-${i}-${pubId}">★</label>`;
  }

  html += "</div></div>";
  return html;
}

function applyFilters() {
  markerCluster.clearLayers();

  markers.forEach((marker) => {
    const isVisited = marker.pubData.visited;
    const pubId = marker.pubData.id;
    const isFriendVisited =
      isComparing &&
      (friendVisitData[pubId] ||
        friendVisitData[String(pubId)] ||
        friendVisitData[Number(pubId)]);

    const matchesFilter =
      currentFilterType === "all" ||
      (currentFilterType === "visited" && (isVisited || isFriendVisited)) ||
      (currentFilterType === "unvisited" && !isVisited);

    const matchesSearch = marker.pubData.name
      .toLowerCase()
      .includes(currentSearchQuery);

    // Zapisujemy w pamięci markera, czy spełnia filtry wpisane z palca
    marker.matchesFilters = matchesFilter && matchesSearch;

    const updatedHtml = getMarkerHtml(isVisited, pubId, isFriendVisited);
    marker.setIcon(
      L.divIcon({
        html: updatedHtml,
        className: "custom-icon",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      }),
    );

    // --- PRZYPINANIE DYMKA Z OCENĄ I DATĄ ---
    if (isVisited) {
      const currentRating = marker.pubData.rating || 0;
      const comm = marker.pubData.community;
      const visitDate = marker.pubData.visit_date || "Unknown date";

      const communityText =
        comm.count > 0
          ? `Community: <strong style="color: #ffd700;">${comm.avg} ★</strong> <span style="font-size: 9px;">(${comm.count} total)</span>`
          : `No community ratings yet`;

      const popupContent = `
        <div style="text-align: center; min-width: 170px; padding: 5px;">
          <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #333;">${marker.pubData.name}</h3>
          
          <div style="margin-bottom: 12px; font-size: 12px; color: #555; background: #f4f4f4; padding: 4px; border-radius: 4px; display: inline-block;">
            Visited: <strong>${visitDate}</strong>
            <button onclick="window.editVisitDate('${pubId}')" style="background: none; border: none; cursor: pointer; font-size: 12px; padding: 0 2px; margin-left: 4px;" title="Edit date">✏️</button>
          </div>
          
          <div style="margin-bottom: 8px;">
            <span style="font-size: 11px; font-weight: bold; color: #555;">Your rating:</span><br>
            ${getStarsHtml(pubId, currentRating)}
          </div>
          
          <div style="font-size: 11px; color: #666; margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
            ${communityText}
          </div>

          <button onclick="window.removeVisit('${pubId}')" style="margin-top: 12px; background: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; width: 100%;">Remove Visit</button>
        </div>
      `;
      marker.bindPopup(popupContent, { offset: [0, -15] });
    } else {
      marker.unbindPopup();
    }

    if (marker.matchesFilters) {
      markerCluster.addLayer(marker);
    }
  });

  // Odświeżamy pasek boczny
  updateSidebarList();
}
function updateSidebarList() {
  let visibleCount = 0;
  let listHtml = "";

  // Pobieramy obecne granice ekranu
  const currentBounds = map.getBounds();

  markers.forEach((marker) => {
    // Sprawdzamy czy pub pasuje do zakładek (np. "To Visit") ORAZ czy fizycznie widać go na mapie
    if (marker.matchesFilters && currentBounds.contains(marker.getLatLng())) {
      visibleCount++;

      const pubId = marker.pubData.id;
      const isVisited = marker.pubData.visited;

      let noteHtml = marker.pubData.note
        ? `<div style="font-size: 10px; color: #333;">⚠️ ${marker.pubData.note}</div>`
        : "";

      // Widoczne dla Admina LUB Superadmina
      let adminButtons =
        isAdmin || isSuperadmin
          ? `<button onclick="event.stopPropagation(); window.editNote('${pubId}')" style="background:none; border:none; cursor:pointer; font-size:10px;">✏️ note</button>`
          : "";

      listHtml += `
        <div class="pub-list-item" onclick="flyToPub(${marker.pubData.lat}, ${marker.pubData.lng})">
            <div class="pub-info-group">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <span class="pub-name">${marker.pubData.name}</span>
                    ${adminButtons}
                </div>
                ${noteHtml}
            </div>
            <div class="pub-list-bottom">
                <span style="font-size: 8px; font-weight: 900; color: #666; text-transform: uppercase;">
                    ${isVisited ? "VISITED" : "TO VISIT"}
                </span>
                <button class="pub-status-btn ${isVisited ? "status-visited" : "status-unvisited"}" onclick="event.stopPropagation(); toggleVisitState('${pubId}')">
                    ${isVisited ? "✓ VISITED" : "+ MARK"}
                </button>
            </div>
        </div>
      `;
    }
  });

  document.getElementById("pub-info").innerText = `VISIBLE: ${visibleCount}`;
  document.getElementById("pub-list-container").innerHTML = listHtml;
}

function setFilter(type, btn) {
  currentFilterType = type;
  document
    .querySelectorAll(".filters-container .filter-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  applyFilters();
}

function handleSearch(e) {
  currentSearchQuery = e.target.value.toLowerCase().trim();
  applyFilters();
}

function flyToPub(lat, lng) {
  map.setView([lat, lng], 16);
}

async function toggleVisitState(pubId) {
  const marker = markers.find((m) => String(m.pubData.id) === String(pubId));
  if (!marker) return;

  if (marker.pubData.visited) {
    await supabaseClient
      .from("visits")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("pub_id", pubId);
    marker.pubData.visited = false;
    marker.pubData.visit_date = null;
    marker.pubData.note = null;
  } else {
    const today = new Date().toISOString().split("T")[0];
    await supabaseClient
      .from("visits")
      .insert([{ user_id: currentUser.id, pub_id: pubId, visit_date: today }]);
    marker.pubData.visited = true;
    marker.pubData.visit_date = today;
  }
  applyFilters();
}

window.editVisitDate = async function (pubId) {
  const marker = markers.find((m) => String(m.pubData.id) === String(pubId));
  if (!marker) return;

  const currentDate =
    marker.pubData.visit_date || new Date().toISOString().split("T")[0];
  const newDate = prompt("Enter visit date (YYYY-MM-DD):", currentDate);

  if (!newDate || newDate.trim() === currentDate) return;

  // Zapis do bazy
  await supabaseClient
    .from("visits")
    .update({ visit_date: newDate })
    .eq("user_id", currentUser.id)
    .eq("pub_id", pubId);

  // Aktualizacja stanu i przeładowanie widoku
  marker.pubData.visit_date = newDate;
  applyFilters();

  // Ponownie otwieramy dymek, żeby użytkownik od razu zobaczył nową datę
  marker.openPopup();
};

// --- PORÓWNYWANIE MAP ---
async function compareMap() {
  const code = window.prompt("Enter friend's code (e.g. TAP-A1B2):");
  if (!code || !code.trim()) return;

  const cleanCode = code.trim().toUpperCase();
  const { data: profiles } = await supabaseClient
    .from("profiles")
    .select("id")
    .eq("friend_code", cleanCode);
  if (!profiles || profiles.length === 0) {
    alert("Friend not found!");
    return;
  }

  const friendId = profiles[0].id;
  const { data: visits } = await supabaseClient
    .from("visits")
    .select("pub_id")
    .eq("user_id", friendId)
    .limit(3000);

  friendVisitData = {};
  if (visits) visits.forEach((v) => (friendVisitData[String(v.pub_id)] = true));

  isComparing = true;
  document.getElementById("stop-compare-btn").style.display = "block";
  alert(`Loaded ${visits ? visits.length : 0} pubs from friend.`);
  applyFilters();
}

function stopComparing() {
  isComparing = false;
  friendVisitData = {};
  document.getElementById("stop-compare-btn").style.display = "none";
  applyFilters();
}

// --- WIDOKI ---
function toggleSidebar() {
  const contentArea = document.querySelector(".content-area");
  const btn = document.getElementById("sidebar-toggle-btn");
  if (isListOnly) toggleViewMode();

  isSidebarHidden = !isSidebarHidden;
  if (isSidebarHidden) {
    contentArea.classList.add("sidebar-hidden");
    btn.innerText = "◀";
  } else {
    contentArea.classList.remove("sidebar-hidden");
    btn.innerText = "▶";
    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 100);
  }
}

function toggleViewMode() {
  const contentArea = document.querySelector(".content-area");
  const btn = document.getElementById("view-toggle-btn");
  if (isSidebarHidden) {
    isSidebarHidden = false;
    contentArea.classList.remove("sidebar-hidden");
    document.getElementById("sidebar-toggle-btn").innerText = "▶";
  }

  isListOnly = !isListOnly;
  if (isListOnly) {
    contentArea.classList.add("list-only-mode");
    btn.innerText = "🗺️ Map";
  } else {
    contentArea.classList.remove("list-only-mode");
    btn.innerText = "Full List";
    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 100);
  }
}
// Sends the selected rating to the Supabase database
window.saveRating = async function (pubId, ratingValue) {
  try {
    const { data: userData, error: authError } =
      await supabaseClient.auth.getUser();
    if (authError || !userData?.user) {
      console.error("User not authenticated.");
      return;
    }

    const { error } = await supabaseClient
      .from("visits")
      .update({ rating: ratingValue })
      .eq("pub_id", pubId)
      .eq("user_id", userData.user.id);

    if (error) {
      console.error("Supabase update error:", error);
      throw error;
    }

    console.log(`Successfully saved rating ${ratingValue} for pub ${pubId}`);

    // Update local state so stars don't reset until next refresh
    const marker = markers.find((m) => String(m.pubData.id) === String(pubId));
    if (marker) {
      marker.pubData.rating = ratingValue;
    }
  } catch (err) {
    console.error("Error saving rating:", err.message);
  }
};

// Błyskawiczne oznaczanie wizyty przy kliknięciu ikony na mapie
async function markAsVisited(pubId) {
  const marker = markers.find((m) => String(m.pubData.id) === String(pubId));
  if (!marker || marker.pubData.visited) return;

  const today = new Date().toISOString().split("T")[0];
  await supabaseClient
    .from("visits")
    .insert([
      { user_id: currentUser.id, pub_id: pubId, visit_date: today, rating: 0 },
    ]);

  marker.pubData.visited = true;
  marker.pubData.visit_date = today;
  marker.pubData.rating = 0;
  applyFilters();
}

// Usuwanie wizyty za pomocą przycisku wewnątrz dymka
window.removeVisit = async function (pubId) {
  const marker = markers.find((m) => String(m.pubData.id) === String(pubId));
  if (!marker) return;

  await supabaseClient
    .from("visits")
    .delete()
    .eq("user_id", currentUser.id)
    .eq("pub_id", pubId);

  marker.pubData.visited = false;
  marker.pubData.visit_date = null;
  marker.pubData.note = null;
  marker.pubData.rating = 0;
  marker.closePopup();
  applyFilters();
};
async function setupUserProfile() {
  let displayName = currentUser.email.split("@")[0];

  // Pobieramy oba statusy z bazy
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("friend_code, nickname, is_admin, is_superadmin")
    .eq("id", currentUser.id);

  if (error) console.error("Profile fetch error:", error.message);

  if (data && data.length > 0) {
    const profile = data[0];
    isAdmin = profile.is_admin === true;
    isSuperadmin = profile.is_superadmin === true; // Zapisujemy status boski

    document.getElementById("my-friend-code").innerText =
      profile.friend_code || "⏳...";
    if (profile.nickname) displayName = profile.nickname;
  } else {
    generateNewFriendCode();
  }

  // Odpowiednia ikonka w zależności od rangi
  let displayHtml = `${displayName} ▼`;
  if (isSuperadmin) displayHtml = `👑 ${displayName} ▼`;
  else if (isAdmin) displayHtml = `🛠️ ${displayName} ▼`;

  document.getElementById("user-display").innerText = displayHtml;

  // Przycisk nadawania i odbierania uprawnień dodawany TYLKO dla Superadmina
  if (isSuperadmin) {
    let dropdown = document.getElementById("user-dropdown");
    if (dropdown && !document.getElementById("btn-make-admin")) {
      // 1. Przycisk awansowania
      const grantBtn = document.createElement("button");
      grantBtn.id = "btn-make-admin";
      grantBtn.innerHTML = "👑 Grant Admin";
      grantBtn.style.color = "#f39c12"; // Złoty
      grantBtn.onclick = window.grantAdminStatus;
      dropdown.insertBefore(grantBtn, dropdown.firstChild);

      // 2. Przycisk degradowania (NOWY)
      const revokeBtn = document.createElement("button");
      revokeBtn.id = "btn-revoke-admin";
      revokeBtn.innerHTML = "❌ Revoke Admin";
      revokeBtn.style.color = "#e74c3c"; // Czerwony
      revokeBtn.onclick = window.revokeAdminStatus;
      dropdown.insertBefore(revokeBtn, grantBtn.nextSibling);
    }
  }
}

window.grantAdminStatus = async function () {
  if (!isSuperadmin) {
    alert("Only a Superadmin can grant permissions.");
    return;
  }

  const code = window.prompt(
    "Enter the Friend Code to promote to Admin (e.g. TAP-A1B2):",
  );
  if (!code || !code.trim()) return;

  const cleanCode = code.trim().toUpperCase();

  const { data: profiles, error: searchError } = await supabaseClient
    .from("profiles")
    .select("id, nickname")
    .eq("friend_code", cleanCode);

  if (searchError || !profiles || profiles.length === 0) {
    alert("User not found! Make sure the Friend Code is correct.");
    return;
  }

  const targetUserId = profiles[0].id;
  const targetName = profiles[0].nickname || cleanCode;

  if (
    confirm(`Are you sure you want to make ${targetName} a Moderator (Admin)?`)
  ) {
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ is_admin: true })
      .eq("id", targetUserId);

    if (updateError) {
      alert("Error updating database. Check permissions.");
      console.error(updateError);
    } else {
      alert(`Success! ${targetName} is now an Admin 🛠️.`);
    }
  }
};
window.revokeAdminStatus = async function () {
  if (!isSuperadmin) {
    alert("Only a Superadmin can revoke permissions.");
    return;
  }

  const code = window.prompt(
    "Enter the Friend Code to REMOVE Admin rights from (e.g. TAP-A1B2):",
  );
  if (!code || !code.trim()) return;

  const cleanCode = code.trim().toUpperCase();

  const { data: profiles, error: searchError } = await supabaseClient
    .from("profiles")
    .select("id, nickname")
    .eq("friend_code", cleanCode);

  if (searchError || !profiles || profiles.length === 0) {
    alert("User not found! Make sure the Friend Code is correct.");
    return;
  }

  const targetUserId = profiles[0].id;
  const targetName = profiles[0].nickname || cleanCode;

  if (
    confirm(
      `Are you absolutely sure you want to REVOKE Admin rights from ${targetName}?`,
    )
  ) {
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ is_admin: false })
      .eq("id", targetUserId);

    if (updateError) {
      alert("Error updating database. Check permissions.");
      console.error(updateError);
    } else {
      alert(`Success! ${targetName} is no longer an Admin.`);
    }
  }
};
// Oblicza ile dni zostało z 30-dniowego limitu
function getDaysRemaining(lastDateString) {
  if (!lastDateString) return 0; // Nigdy nie zmieniano

  const lastDate = new Date(lastDateString);
  const now = new Date();
  const diffTime = now - lastDate;
  const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, 30 - daysPassed);
}

window.changePassword = changePassword;
window.changeNickname = changeNickname;
window.onload = startApp;
