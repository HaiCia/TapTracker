const { createClient } = require("@supabase/supabase-js");
const { supabaseUrl, supabaseSecretKey } = require("./admin-keys.js");

const supabase = createClient(supabaseUrl, supabaseSecretKey);

// 2. Stabilny, główny serwer OpenStreetMap
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// ... reszta Twojego kodu zostaje dokładnie taka, jaka była!

// 2. Stabilny, główny serwer OpenStreetMap
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// 3. Zaawansowane zapytanie: szukamy i kropek (node) i budynków (way) w UK
const query = `
  [out:json][timeout:90];
  (
    node["amenity"="pub"]["operator"~"Wetherspoon",i](49.0, -8.0, 61.0, 2.0);
    way["amenity"="pub"]["operator"~"Wetherspoon",i](49.0, -8.0, 61.0, 2.0);
    node["brand"~"Wetherspoon",i](49.0, -8.0, 61.0, 2.0);
    way["brand"~"Wetherspoon",i](49.0, -8.0, 61.0, 2.0);
  );
  out center;
`;

// Formuła Haversine'a - oblicza kilometry na kuli ziemskiej
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function findMissingPubs() {
  console.log("🕵️‍♂️ Inicjalizacja skanera OpenStreetMap (OSM)...\n");

  try {
    console.log("1. Pobieram bazę z Supabase...");
    const { data: supabasePubs, error } = await supabase
      .from("pubs")
      .select("*")
      .limit(3000);
    if (error) throw error;
    console.log(`   ✔️ Pobrano ${supabasePubs.length} pubów z chmury.\n`);

    console.log("2. Łączenie z satelitami OSM (może potrwać do 30 sekund)...");

    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // BARDZO WAŻNE: Przedstawiamy się serwerowi, żeby nas nie zablokował!
        "User-Agent":
          "TapTracker-DataScanner/1.0 (test project for pub finding)",
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    // "Kuloodporne" sprawdzanie błędów
    const rawText = await response.text();

    if (!response.ok) {
      throw new Error(
        `Serwer OSM odmówił dostępu (Kod: ${response.status}). Zwrócił wiadomość: ${rawText.substring(0, 150)}`,
      );
    }

    let osmData;
    try {
      osmData = JSON.parse(rawText);
    } catch (e) {
      throw new Error(
        `Serwer znowu nie zwrócił JSONa! Oto co zwrócił:\n${rawText.substring(0, 200)}`,
      );
    }

    const osmPubs = osmData.elements.filter((el) => el.lat || el.center);
    console.log(
      `   ✔️ Znaleziono ${osmPubs.length} lokali Wetherspoon na mapach OSM.\n`,
    );

    console.log("3. Rozpoczynam radarowe zderzanie danych (promień 500m)...");
    let missingPubs = [];

    osmPubs.forEach((osmPub) => {
      const lat = osmPub.lat || osmPub.center.lat;
      const lng = osmPub.lon || osmPub.center.lon;
      const name =
        osmPub.tags && osmPub.tags.name
          ? osmPub.tags.name
          : "Wetherspoon (Brak nazwy)";

      const found = supabasePubs.some(
        (subPub) => getDistance(lat, lng, subPub.lat, subPub.lng) <= 0.5,
      );

      if (!found) {
        missingPubs.push({ name, lat, lng });
      }
    });

    console.log(
      `\n🚨 ZNALAZŁEM ${missingPubs.length} PUBÓW Z MAPY, KTÓRYCH NIE MA W TWOJEJ BAZIE! 🚨\n`,
    );

    missingPubs.slice(0, 20).forEach((pub, index) => {
      console.log(`${index + 1}. ${pub.name}`);
      console.log(
        `   Google Maps: https://www.google.com/maps/search/?api=1&query=${pub.lat},${pub.lng}\n`,
      );
    });

    if (missingPubs.length > 20)
      console.log(`...oraz ${missingPubs.length - 20} innych lokali.`);
  } catch (error) {
    console.error("\n❌ Wystąpił błąd:", error.message);
  }
}

findMissingPubs();
