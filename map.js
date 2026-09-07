import { supabaseClient } from './api.js';
import { state } from './state.js';
import { getMarkerHtml, updateSidebarList, openPubDetails, highlightSidebar } from './ui.js';

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

  state.map.on("moveend", updateSidebarList);

  loadPubs();
}

export async function loadPubs() {
  const { data: pubs } = await supabaseClient.from("pubs").select("*");
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

  state.markers = [];
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
          html: getMarkerHtml(isVisited, pub.id, false),
          className: "custom-icon",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
      });
      marker.pubData = pub;

      state.markers.push(marker);
    });
  }
  applyFilters();
}

export function applyFilters() {
  state.markerCluster.clearLayers();

  state.markers.forEach((marker) => {
    const isVisited = marker.pubData.visited;
    const pubId = marker.pubData.id;
    const isFriendVisited = state.isComparing &&
      (state.friendVisitData[pubId] || state.friendVisitData[String(pubId)] || state.friendVisitData[Number(pubId)]);

    const matchesFilter =
      state.currentFilterType === "all" ||
      (state.currentFilterType === "visited" && (isVisited || isFriendVisited)) ||
      (state.currentFilterType === "unvisited" && !isVisited);

    const matchesSearch = marker.pubData.name.toLowerCase().includes(state.currentSearchQuery);
    marker.matchesFilters = matchesFilter && matchesSearch;

    const updatedHtml = getMarkerHtml(isVisited, pubId, isFriendVisited);
    marker.setIcon(
      L.divIcon({
        html: updatedHtml,
        className: "custom-icon",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })
    );

    marker.bindTooltip(
      `<div style="font-size:12px; font-weight:bold;">${marker.pubData.name}</div>`,
      { direction: "top", offset: [0, -15], opacity: 0.95 }
    );

    marker.unbindPopup();
    marker.off("click");

    marker.on("click", () => {
      highlightSidebar(pubId);
      openPubDetails(pubId);
    });

    if (marker.matchesFilters) {
      state.markerCluster.addLayer(marker);
    }
  });

  updateSidebarList();
}

export function flyToPub(lat, lng) {
  state.map.setView([lat, lng], 16);
}
