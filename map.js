import { supabaseClient } from './api.js';
import { state } from './state.js';
import { getMarkerHtml, updateSidebarList, openPubDetails, highlightSidebar, escapeHTML } from './ui.js';

export function initMap() {
  state.map = L.map("map").setView([53.8008, -1.5491], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(state.map);

  state.markerCluster = L.markerClusterGroup({
    maxClusterRadius: 40,
    disableClusteringAtZoom: 16,
  });
  state.map.addLayer(state.markerCluster);

  const LocateControl = L.Control.extend({
    options: { position: "topleft" },
    onAdd: function (map) {
      const container = L.DomUtil.create("div", "leaflet-control-locate leaflet-bar leaflet-control");
      const button = L.DomUtil.create("a", "leaflet-control-locate-btn", container);

      button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7"></circle><line x1="12" y1="1" x2="12" y2="5"></line><line x1="12" y1="19" x2="12" y2="23"></line><line x1="1" y1="12" x2="5" y2="12"></line><line x1="19" y1="12" x2="23" y2="12"></line><circle cx="12" cy="12" r="2"></circle></svg>`;
      button.href = "#";
      button.title = "Find my location";
      button.setAttribute("role", "button");
      button.setAttribute("aria-label", "Find my location");

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);
      L.DomEvent.disableClickPropagation(button);
      L.DomEvent.disableScrollPropagation(button);

      L.DomEvent.on(button, "click", function (e) {
        L.DomEvent.preventDefault(e);
        map.locate({ setView: true, maxZoom: 15 });
      });

      return container;
    },
  });
  state.map.addControl(new LocateControl());

  state.map.locate({ setView: true, maxZoom: 15 });

  state.map.on("locationfound", function (e) {
    if (state.userLocationMarker) {
      state.userLocationMarker.setLatLng(e.latlng);
    } else {
      state.userLocationMarker = L.circleMarker(e.latlng, {
        radius: 8,
        fillColor: "#2196f3",
        color: "#ffffff",
        weight: 3,
        opacity: 1,
        fillOpacity: 1,
      })
        .addTo(state.map)
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
    state.userLocationMarker.openPopup();
  });

  state.map.on("locationerror", function (e) {
    console.log("Geolocation access denied or failed.");
  });

  state.map.on("click", function () {
    const dropdown = document.getElementById("user-dropdown");
    if (dropdown && dropdown.classList.contains("show")) {
      dropdown.classList.remove("show");
    }
    const legendWrapper = document.getElementById("map-legend");
    if (legendWrapper && legendWrapper.classList.contains("is-open")) {
      legendWrapper.classList.remove("is-open");
    }
  });

  state.map.on("moveend", updateSidebarList);

  loadPubs();

  const sidebarEl = document.querySelector('.sidebar');
  if (sidebarEl && typeof L !== 'undefined' && L.DomEvent) {
    L.DomEvent.disableClickPropagation(sidebarEl);
    L.DomEvent.disableScrollPropagation(sidebarEl);
  }

  const legendWrapper = document.getElementById("map-legend");
  if (legendWrapper && typeof L !== 'undefined' && L.DomEvent) {
    L.DomEvent.disableClickPropagation(legendWrapper);
    L.DomEvent.disableScrollPropagation(legendWrapper);
  }
}

export async function loadPubs() {
  const { data: pubs } = await supabaseClient.from("pubs").select("*");
  const { data: activeCheckins } = await supabaseClient.from("checkins").select("*").gt("expires_at", new Date().toISOString());

  state.checkins = {};
  if (activeCheckins) {
    activeCheckins.forEach(c => {
      if (!state.checkins[c.pub_id]) state.checkins[c.pub_id] = 0;
      state.checkins[c.pub_id]++;
    });
  }
  const { data: visits } = await supabaseClient
    .from("visits")
    .select("*")
    .eq("user_id", state.currentUser.id);

  const { data: allCommunityData } = await supabaseClient
    .from("visits")
    .select("pub_id, rating, review");

  const communityData = {};
  if (allCommunityData) {
    const sums = {};
    const counts = {};
    const reviewsCounts = {};
    const reviewsList = {};

    allCommunityData.forEach((v) => {
      if (!sums[v.pub_id]) {
        sums[v.pub_id] = 0;
        counts[v.pub_id] = 0;
        reviewsCounts[v.pub_id] = 0;
        reviewsList[v.pub_id] = [];
      }

      if (v.rating > 0) {
        sums[v.pub_id] += v.rating;
        counts[v.pub_id]++;
      }

      if (v.review && v.review.trim().length > 0) {
        reviewsCounts[v.pub_id]++;
        reviewsList[v.pub_id].push(v.review.trim());
      }
    });

    Object.keys(sums).forEach((id) => {
      communityData[id] = {
        avg: counts[id] > 0 ? (sums[id] / counts[id]).toFixed(1) : 0,
        count: counts[id],
        reviewsCount: reviewsCounts[id],
        reviewsList: reviewsList[id]
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

  state.markers = [];
  if (!state.markerRegistry) {
    state.markerRegistry = new Map();
  } else {
    state.markerRegistry.clear();
  }

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
      pub.community = communityData[pub.id] || { avg: 0, count: 0, reviewsCount: 0 };

      const marker = L.marker([pub.lat, pub.lng], {
        icon: L.divIcon({
          html: getMarkerHtml(isVisited, pub.id, false, pub.is_favorite),
          className: "custom-icon",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
      });
      marker.pubData = pub;

      state.markers.push(marker);
      state.markerRegistry.set(String(pub.id), marker);
      state.markerRegistry.set(Number(pub.id), marker);
    });
  }
  applyFilters();
}

export function applyFilters() {
  state.markerCluster.clearLayers();

  if (!state.markerRegistry) {
    state.markerRegistry = new Map();
  }

  state.markers.forEach((marker) => {
    const isVisited = marker.pubData.visited;
    const isFavorite = marker.pubData.is_favorite;
    const pubId = marker.pubData.id;
    state.markerRegistry.set(String(pubId), marker);
    state.markerRegistry.set(Number(pubId), marker);

    const isFriendVisited = state.isComparing &&
      (state.friendVisitData[pubId] || state.friendVisitData[String(pubId)] || state.friendVisitData[Number(pubId)]);

    const matchesFilter =
      state.currentFilterType === "all" ||
      (state.currentFilterType === "visited" && (isVisited || isFriendVisited)) ||
      (state.currentFilterType === "unvisited" && !isVisited) ||
      (state.currentFilterType === "favorites" && isFavorite);

    // Search by name, address, postcode
    const query = state.currentSearchQuery.toLowerCase();
    const nameMatch = marker.pubData.name.toLowerCase().includes(query);
    const addressMatch = marker.pubData.address ? marker.pubData.address.toLowerCase().includes(query) : false;
    const matchesSearch = nameMatch || addressMatch;
    
    marker.matchesFilters = matchesFilter && matchesSearch;

    const updatedHtml = getMarkerHtml(isVisited, pubId, isFriendVisited, isFavorite);
    marker.setIcon(
      L.divIcon({
        html: updatedHtml,
        className: "custom-icon",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })
    );

    marker.bindTooltip(
      `<div style="font-size:12px; font-weight:bold;">${escapeHTML(marker.pubData.name)}</div>`,
      { direction: "top", offset: [0, -15], opacity: 0.95 }
    );

    marker.unbindPopup();
    marker.off("click");

    marker.on("click", (e) => {
      if (e && e.originalEvent) {
        L.DomEvent.stopPropagation(e);
      }
      selectPub(pubId, "map", state.map);
    });

    if (marker.matchesFilters) {
      state.markerCluster.addLayer(marker);
      if (state.selectedPubId && String(state.selectedPubId) === String(pubId)) {
        setTimeout(() => {
          const el = marker.getElement();
          if (el) el.classList.add("marker-active");
        }, 0);
      }
    }
  });

  updateSidebarList();
}

export function selectPub(pubId, source = "code", map = state.map) {
  if (!pubId) return;
  const idStr = String(pubId);
  state.selectedPubId = idStr;

  // 1. Update Marker Highlight
  document.querySelectorAll(".leaflet-marker-icon.marker-active, .marker-active").forEach((el) => {
    el.classList.remove("marker-active");
  });

  const marker = (state.markerRegistry && state.markerRegistry.get(idStr)) ||
    state.markers.find((m) => String(m.pubData?.id) === idStr);

  if (marker) {
    const applyMarkerActive = () => {
      const el = marker.getElement();
      if (el) {
        el.classList.add("marker-active");
      }
    };

    if (source === "list") {
      const targetMap = map || state.map;
      if (targetMap && marker.pubData?.lat != null && marker.pubData?.lng != null) {
        targetMap.panTo([marker.pubData.lat, marker.pubData.lng], { animate: true, duration: 0.4 });
      }
    }

    if (state.markerCluster && typeof state.markerCluster.zoomToShowLayer === "function") {
      state.markerCluster.zoomToShowLayer(marker, () => {
        applyMarkerActive();
      });
    } else {
      applyMarkerActive();
    }
  }

  // 2. Update List Item Highlight
  document.querySelectorAll(".pub-card, .pub-sidebar-card, .pub-full-row, .pub-list-item").forEach((el) => {
    el.classList.remove("is-selected", "active-sidebar-item");
  });

  const cardEl = document.querySelector(`.pub-card[data-pub-id="${idStr}"], [data-pub-id="${idStr}"]`);
  if (cardEl) {
    cardEl.classList.add("is-selected", "active-sidebar-item");
    if (source === "map") {
      cardEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }
}

window.selectPub = selectPub;

export function flyToPub(lat, lng) {
  state.map.setView([lat, lng], 16);
}
