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

// --- PROFIL UŻYTKOWNIKA I KODY ZNAJOMYCH (Połączona i naprawiona wersja) ---
async function setupUserProfile() {
  let displayName = currentUser.email.split("@")[0];

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

      // 2. Przycisk degradowania
      const revokeBtn = document.createElement("button");
      revokeBtn.id = "btn-revoke-admin";
      revokeBtn.innerHTML = "❌ Revoke Admin";
      revokeBtn.style.color = "#e74c3c"; // Czerwony
      revokeBtn.onclick = window.revokeAdminStatus;
      dropdown.insertBefore(revokeBtn, grantBtn.nextSibling);
    }
  }
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

// Oblicza ile dni zostało z 30-dniowego limitu
function getDaysRemaining(lastDateString) {
  if (!lastDateString) return 0; // Nigdy nie zmieniano

  const lastDate = new Date(lastDateString);
  const now = new Date();
  const diffTime = now - lastDate;
  const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, 30 - daysPassed);
}

async function changeNickname() {
  const daysLeft = getDaysRemaining(lastNicknameChange);

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
  const nowIso = new Date().toISOString();

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      nickname: cleanName,
      last_nickname_change: nowIso,
    })
    .eq("id", currentUser.id);

  if (error) {
    alert("Error changing nickname: " + error.message);
  } else {
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
        last_friend_code_change: nowIso,
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
    options: { position: "topleft" },
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

      L.DomEvent.disableClickPropagation(button);

      L.DomEvent.on(button, "click", function (e) {
        L.DomEvent.preventDefault(e);
        map.locate({ setView: true, maxZoom: 15 });
      });

      return container;
    },
  });
  map.addControl(new LocateControl());

  map.locate({ setView: true, maxZoom: 15 });

  map.on("locationfound", function (e) {
    if (userLocationMarker) {
      userLocationMarker.setLatLng(e.latlng);
    } else {
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

  const { data: allCommunityData } = await supabaseClient
    .from("visits")
    .select("pub_id, rating, review");

  const communityData = {};
  if (allCommunityData) {
    const sums = {};
    const counts = {};
    const reviewsCounts = {};

    allCommunityData.forEach((v) => {
      if (!sums[v.pub_id]) {
        sums[v.pub_id] = 0;
        counts[v.pub_id] = 0;
        reviewsCounts[v.pub_id] = 0;
      }

      if (v.rating > 0) {
        sums[v.pub_id] += v.rating;
        counts[v.pub_id]++;
      }

      if (v.review && v.review.trim().length > 0) {
        reviewsCounts[v.pub_id]++;
      }
    });

    Object.keys(sums).forEach((id) => {
      communityData[id] = {
        avg: counts[id] > 0 ? (sums[id] / counts[id]).toFixed(1) : 0,
        count: counts[id],
        reviewsCount: reviewsCounts[id],
      };
    });
  }

  const visitedMap = {};
  if (visits) {
    visits.forEach((v) => {
      let history = v.visit_history;
      if (!history || history.length === 0) {
        history = v.visit_date ? [v.visit_date] : [];
      }
      visitedMap[v.pub_id] = {
        date: v.visit_date,
        note: v.note || "",
        review: v.review || "",
        rating: v.rating,
        is_favorite: v.is_favorite === true,
        visit_history: history,
      };
    });
  }

  markers = [];
  if (pubs) {
    pubs.forEach((pub) => {
      const isVisited = !!visitedMap[pub.id];
      pub.visited = isVisited;
      pub.visit_date = isVisited ? visitedMap[pub.id].date : null;
      pub.note = isVisited ? visitedMap[pub.id].note : "";
      pub.review = isVisited ? visitedMap[pub.id].review : "";
      pub.rating = isVisited ? visitedMap[pub.id].rating : 0;
      pub.is_favorite = isVisited ? visitedMap[pub.id].is_favorite : false;
      pub.visit_history = isVisited ? visitedMap[pub.id].visit_history : [];
      pub.community = communityData[pub.id] || {
        avg: 0,
        count: 0,
        reviewsCount: 0,
      };

      const marker = L.marker([pub.lat, pub.lng], {
        icon: L.divIcon({
          html: getMarkerHtml(isVisited, pub.id, false),
          className: "custom-icon",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
      });
      marker.pubData = pub;

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

  return `<div class="pub-icon-container ${containerClass}">${innerHtml}</div>`;
}

// Generates HTML for the stars inside the Leaflet popup
function getStarsHtml(pubId, currentRating) {
  const rating = currentRating || 0;
  let html = '<div class="star-rating-container">';
  html +=
    '<div class="stars" style="display: flex; flex-direction: row; justify-content: center;">';

  for (let i = 1; i <= 5; i++) {
    const isChecked = i === rating ? "checked" : "";
    html += `<input type="radio" id="star-${i}-${pubId}" name="rating-${pubId}" value="${i}" ${isChecked} onchange="window.saveRating('${pubId}', ${i})">`;
    html += `<label for="star-${i}-${pubId}" style="cursor:pointer; padding: 0 2px;">★</label>`;
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

    // Zostawiamy tylko etykietkę po najechaniu myszką
    marker.bindTooltip(
      `<div style="font-size:12px; font-weight:bold;">${marker.pubData.name}</div>`,
      { direction: "top", offset: [0, -15], opacity: 0.95 },
    );

    // CAŁKOWICIE USUWAMY STARE DYMKI (okienka)
    marker.unbindPopup();
    marker.off("click");

    // Kliknięcie zawsze otwiera tylko i wyłącznie Modal
    marker.on("click", () => {
      window.highlightSidebar(pubId);
      window.openPubDetails(pubId);
    });

    if (marker.matchesFilters) {
      markerCluster.addLayer(marker);
    }
  });

  updateSidebarList();
}
window.highlightSidebar = function (pubId) {
  document
    .querySelectorAll(".pub-list-item")
    .forEach((el) => el.classList.remove("active-sidebar-item"));

  const activeItem = document.getElementById(`sidebar-item-${pubId}`);
  if (activeItem) {
    activeItem.classList.add("active-sidebar-item");
    activeItem.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

function updateSidebarList() {
  let visibleCount = 0;
  let listHtml = "";

  const currentBounds = map.getBounds();

  markers.forEach((marker) => {
    if (marker.matchesFilters && currentBounds.contains(marker.getLatLng())) {
      visibleCount++;

      const pubId = marker.pubData.id;
      const isVisited = marker.pubData.visited;

      let addressHtml = marker.pubData.address
        ? `<div style="font-size: 10px; color: #777; margin-top: 3px;">📍 ${marker.pubData.address}</div>`
        : "";

      let imgHtml = marker.pubData.image_url
        ? `<img src="${marker.pubData.image_url}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 4px; margin-right: 10px;">`
        : "";

      let noteHtml = marker.pubData.note
        ? `<div style="font-size: 10px; color: #333; margin-top: 4px;">⚠️ ${marker.pubData.note}</div>`
        : "";

      let adminButtons =
        isAdmin || isSuperadmin
          ? `<button onclick="event.stopPropagation(); window.editNote('${pubId}')" style="background:none; border:none; cursor:pointer; font-size:10px;">✏️ note</button>`
          : "";

      listHtml += `
        <div id="sidebar-item-${pubId}" class="pub-list-item" onclick="flyToPub(${marker.pubData.lat}, ${marker.pubData.lng}); window.highlightSidebar('${pubId}');">
            <div class="pub-info-group" style="display: flex; align-items: center; width: 100%;">
                ${imgHtml}
                <div style="flex-grow: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <span class="pub-name">${marker.pubData.name}</span>
                        ${adminButtons}
                    </div>
                    ${addressHtml}
                    ${noteHtml}
                </div>
            </div>
            <div class="pub-list-bottom" style="margin-top: 8px;">
                <span style="font-size: 8px; font-weight: 900; color: #666; text-transform: uppercase;">
                    ${isVisited ? "VISITED" : "TO VISIT"}
                </span>
                <button class="pub-status-btn ${isVisited ? "status-visited" : "status-unvisited"}" onclick="event.stopPropagation(); window.toggleVisitState('${pubId}')">
                    ${isVisited ? "✓ VISITED" : "+ MARK"}
                </button>
            </div>
        </div>
      `;
    }
  });

  const pubInfoEl = document.getElementById("pub-info");
  if (pubInfoEl) pubInfoEl.innerText = `VISIBLE: ${visibleCount}`;

  const pubListContainerEl = document.getElementById("pub-list-container");
  if (pubListContainerEl) pubListContainerEl.innerHTML = listHtml;
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

// NAPRAWIONE: Upewniono się, że z paska bocznego wizyta też dostaje "visit_history"
window.toggleVisitState = async function (pubId) {
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
    marker.pubData.review = null;
    marker.pubData.rating = 0;
    marker.pubData.is_favorite = false;
    marker.pubData.visit_history = [];
    marker.closePopup();
  } else {
    const today = new Date().toISOString().split("T")[0];
    await supabaseClient.from("visits").insert([
      {
        user_id: currentUser.id,
        pub_id: pubId,
        visit_date: today,
        rating: 0,
        is_favorite: false,
        visit_history: [today],
      },
    ]);
    marker.pubData.visited = true;
    marker.pubData.visit_date = today;
    marker.pubData.rating = 0;
    marker.pubData.is_favorite = false;
    marker.pubData.visit_history = [today];
  }
  applyFilters();
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

window.saveRating = async function (pubId, ratingValue) {
  try {
    const marker = markers.find((m) => String(m.pubData.id) === String(pubId));
    if (!marker) return;

    const today = new Date().toISOString().split("T")[0];

    // Jeśli pub nieodwiedzony, stwórz wizytę w locie!
    if (!marker.pubData.visited) {
      await supabaseClient.from("visits").insert([
        {
          user_id: currentUser.id,
          pub_id: pubId,
          visit_date: today,
          rating: ratingValue,
          is_favorite: false,
          visit_history: [today],
        },
      ]);
      marker.pubData.visited = true;
      marker.pubData.visit_date = today;
      marker.pubData.visit_history = [today];
      marker.pubData.rating = ratingValue;
      applyFilters();
      window.openPubDetails(pubId);
      return;
    }

    // Normalna aktualizacja dla już odwiedzonych
    await supabaseClient
      .from("visits")
      .update({ rating: ratingValue })
      .eq("pub_id", pubId)
      .eq("user_id", currentUser.id);
    marker.pubData.rating = ratingValue;
  } catch (err) {
    console.error("Error saving rating:", err.message);
  }
};

async function markAsVisited(pubId) {
  const marker = markers.find((m) => String(m.pubData.id) === String(pubId));
  if (!marker || marker.pubData.visited) return;

  const today = new Date().toISOString().split("T")[0];
  await supabaseClient.from("visits").insert([
    {
      user_id: currentUser.id,
      pub_id: pubId,
      visit_date: today,
      rating: 0,
      is_favorite: false,
      visit_history: [today],
    },
  ]);

  marker.pubData.visited = true;
  marker.pubData.visit_date = today;
  marker.pubData.rating = 0;
  marker.pubData.is_favorite = false;
  marker.pubData.visit_history = [today];
}

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
  marker.pubData.review = null;
  marker.pubData.rating = 0;
  marker.pubData.visit_history = [];
  marker.pubData.is_favorite = false;
  marker.closePopup();
  applyFilters();
};

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

window.toggleFavorite = async function (pubId) {
  const marker = markers.find((m) => String(m.pubData.id) === String(pubId));
  if (!marker) return;

  const newState = !marker.pubData.is_favorite;
  const today = new Date().toISOString().split("T")[0];

  // Jeśli pub nieodwiedzony, stwórz wizytę w locie!
  if (!marker.pubData.visited) {
    await supabaseClient.from("visits").insert([
      {
        user_id: currentUser.id,
        pub_id: pubId,
        visit_date: today,
        rating: 0,
        is_favorite: newState,
        visit_history: [today],
      },
    ]);
    marker.pubData.visited = true;
    marker.pubData.visit_date = today;
    marker.pubData.visit_history = [today];
    marker.pubData.is_favorite = newState;
    applyFilters();
    window.openPubDetails(pubId);
    return;
  }

  const { error } = await supabaseClient
    .from("visits")
    .update({ is_favorite: newState })
    .eq("user_id", currentUser.id)
    .eq("pub_id", pubId);

  if (!error) {
    marker.pubData.is_favorite = newState;
    const btn = document.getElementById("favorite-btn");
    if (btn) {
      btn.style.color = newState ? "#e74c3c" : "#777";
      btn.style.borderColor = newState ? "#e74c3c" : "#ccc";
      btn.innerHTML = newState ? "❤️ Favorited" : "🤍 Mark as Favorite";
    }
    applyFilters();
  }
};

window.openPubDetails = function (pubId) {
  const marker = markers.find((m) => String(m.pubData.id) === String(pubId));
  if (!marker) return;

  const pub = marker.pubData;
  const currentRating = pub.rating || 0;
  const comm = pub.community;
  const isVisited = pub.visited;

  const communityText =
    comm && comm.count > 0
      ? `Community: <strong style="color: #ffd700;">${comm.avg} ★</strong> <span style="font-size: 9px;">(${comm.count} total)</span>`
      : `No community ratings yet`;

  const oldModal = document.getElementById("pub-modal-overlay");
  if (oldModal) oldModal.remove();

  // Adres i zdjęcie (widoczne zawsze)
  const imgHtml = pub.image_url
    ? `<img src="${pub.image_url}" style="width: 100%; height: 130px; object-fit: cover; border-radius: 6px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">`
    : "";
  const addressHtml = pub.address
    ? `<div style="font-size: 12px; color: #777; margin-bottom: 15px;">📍 ${pub.address}</div>`
    : "";

  // Historia i Teksty przycisków dopasowane do stanu pubu
  let historyHtml =
    pub.visit_history && pub.visit_history.length > 0
      ? pub.visit_history
          .map((d) => `<li style="margin-bottom:4px;">${d}</li>`)
          .join("")
      : isVisited && pub.visit_date
        ? `<li>${pub.visit_date}</li>`
        : `<li style="color: #999; font-style: italic;">No visits yet</li>`;

  const visitsCount = pub.visit_history
    ? pub.visit_history.length
    : isVisited
      ? 1
      : 0;
  const buttonAddText = isVisited
    ? "+ Add another visit"
    : "+ Add your first visit";

  const modalHtml = `
    <div id="pub-modal-overlay" style="position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; justify-content: center; align-items: center; font-family: sans-serif;">
      <div style="background: white; padding: 20px; border-radius: 8px; width: 90%; max-width: 320px; position: relative; box-shadow: 0 4px 15px rgba(0,0,0,0.3); max-height: 90vh; overflow-y: auto; text-align: center;">
        
        <button onclick="document.getElementById('pub-modal-overlay').remove()" style="position: absolute; top: 12px; right: 12px; border: none; background: #eee; border-radius: 50%; width: 26px; height: 26px; font-size: 14px; cursor: pointer; z-index: 10; display:flex; align-items:center; justify-content:center;">✖</button>
        
        <h2 style="margin: 0 0 5px 0; font-size: 20px; padding-right: 25px;">${pub.name}</h2>
        ${addressHtml}
        ${imgHtml}
        
        <button id="favorite-btn" onclick="window.toggleFavorite('${pubId}')" style="background: none; border: 1px solid ${pub.is_favorite ? "#e74c3c" : "#ccc"}; padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 13px; font-weight: bold; margin-bottom: 15px; color: ${pub.is_favorite ? "#e74c3c" : "#777"};">
          ${pub.is_favorite ? "❤️ Favorited" : "🤍 Mark as Favorite"}
        </button>

        <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; margin-bottom: 15px;">
          <span style="font-size: 12px; font-weight: bold; color: #555;">Your rating:</span><br>
          ${getStarsHtml(pubId, currentRating)}
          <div style="font-size: 11px; color: #666; margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">${communityText}</div>
        </div>
        
        <div style="margin-bottom: 15px; text-align: left;">
          <label style="font-size: 11px; font-weight: bold; color: #555; display: block; margin-bottom: 3px;">🔒 Private Note:</label>
          <textarea id="modal-note" style="width: 100%; height: 45px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px; padding: 6px; margin-bottom: 8px; box-sizing: border-box;">${pub.note || ""}</textarea>

          <label style="font-size: 11px; font-weight: bold; color: #555; display: block; margin-bottom: 3px;">💬 Public Review:</label>
          <textarea id="modal-review" style="width: 100%; height: 45px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px; padding: 6px; margin-bottom: 8px; box-sizing: border-box;">${pub.review || ""}</textarea>
          
          <button onclick="window.savePubTexts('${pubId}')" style="background: #f39c12; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; width: 100%; font-weight: bold;">💾 Save Note & Review</button>
        </div>
        
        <div style="margin-bottom: 20px;">
          <strong style="font-size: 13px; color: #333;">History (${visitsCount}):</strong>
          <ul style="padding-left: 20px; margin-top: 8px; font-size: 13px; color: #555; max-height: 80px; overflow-y: auto; text-align: left;">${historyHtml}</ul>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button onclick="window.handleAddVisit('${pubId}')" style="background: #2ecc71; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold;">${buttonAddText}</button>
          ${isVisited ? `<button onclick="if(confirm('Delete ALL visits?')) { window.removeVisit('${pubId}'); document.getElementById('pub-modal-overlay').remove(); }" style="background: #fff; color: #e74c3c; border: 1px solid #e74c3c; padding: 8px; border-radius: 4px; cursor: pointer; width: 100%; font-size: 12px; font-weight:bold;">🗑️ Remove pub from list</button>` : ""}
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
};

window.savePubTexts = async function (pubId) {
  const noteVal = document.getElementById("modal-note").value;
  const reviewVal = document.getElementById("modal-review").value;
  const marker = markers.find((m) => String(m.pubData.id) === String(pubId));
  if (!marker) return;

  const today = new Date().toISOString().split("T")[0];

  // Jeśli pub nieodwiedzony, stwórz wizytę w locie!
  if (!marker.pubData.visited) {
    await supabaseClient.from("visits").insert([
      {
        user_id: currentUser.id,
        pub_id: pubId,
        visit_date: today,
        rating: 0,
        is_favorite: false,
        visit_history: [today],
        note: noteVal,
        review: reviewVal,
      },
    ]);
    marker.pubData.visited = true;
    marker.pubData.visit_date = today;
    marker.pubData.visit_history = [today];
    marker.pubData.note = noteVal;
    marker.pubData.review = reviewVal;
    applyFilters();
    window.openPubDetails(pubId);
    alert("Visit created & Text saved! 💾");
    return;
  }

  const { error } = await supabaseClient
    .from("visits")
    .update({ note: noteVal, review: reviewVal })
    .eq("user_id", currentUser.id)
    .eq("pub_id", pubId);

  if (!error) {
    marker.pubData.note = noteVal;
    marker.pubData.review = reviewVal;
    loadPubs();
    alert("Note & Review saved successfully! 💾");
  } else {
    alert("Error saving text: " + error.message);
  }
};
window.handleAddVisit = async function (pubId) {
  const marker = markers.find((m) => String(m.pubData.id) === String(pubId));
  if (!marker) return;

  const isFirstVisit = !marker.pubData.visited;

  // Wspólny dymek pytający o datę
  const promptText = isFirstVisit
    ? "Enter your first visit date (YYYY-MM-DD):"
    : "Enter new visit date (YYYY-MM-DD):";

  const newDate = window.prompt(
    promptText,
    new Date().toISOString().split("T")[0],
  );
  if (!newDate) return;

  if (isFirstVisit) {
    // 1. Scenariusz: Pierwsza wizyta
    const { error } = await supabaseClient.from("visits").insert([
      {
        user_id: currentUser.id,
        pub_id: pubId,
        visit_date: newDate,
        rating: 0,
        is_favorite: false,
        visit_history: [newDate],
      },
    ]);

    if (!error) {
      marker.pubData.visited = true;
      marker.pubData.visit_date = newDate;
      marker.pubData.rating = 0;
      marker.pubData.is_favorite = false;
      marker.pubData.visit_history = [newDate];
    } else {
      alert("Error marking pub as visited: " + error.message);
      return;
    }
  } else {
    // 2. Scenariusz: Kolejna wizyta
    const history = [...(marker.pubData.visit_history || [])];
    history.push(newDate);
    history.sort().reverse();

    const { error } = await supabaseClient
      .from("visits")
      .update({ visit_history: history, visit_date: history[0] })
      .eq("user_id", currentUser.id)
      .eq("pub_id", pubId);

    if (!error) {
      marker.pubData.visit_history = history;
      marker.pubData.visit_date = history[0];
    } else {
      alert("Error adding visit: " + error.message);
      return;
    }
  }

  applyFilters();
  window.openPubDetails(pubId); // Otwieramy/odświeżamy Modal z nowymi danymi!
};

window.changePassword = changePassword;
window.changeNickname = changeNickname;
window.onload = startApp;
