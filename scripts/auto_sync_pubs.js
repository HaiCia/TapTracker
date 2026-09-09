const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error("❌ Błąd: Brak zmiennych SUPABASE_URL lub SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

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

async function runSync() {
  console.log("🕵️‍♂️ Inicjalizacja automatycznego skanera OSM...");

  try {
    console.log("1. Pobieram bazę z Supabase...");
    const { data: supabasePubs, error } = await supabase.from("pubs").select("*").limit(3000);
    if (error) throw error;
    console.log(`   ✔️ Posiadasz ${supabasePubs.length} pubów w bazie.\n`);

    console.log("2. Pobieram aktualne dane z OpenStreetMap...");
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "TapTracker-AutoSync/1.0 (GitHub Actions Automated Task)",
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`Błąd OSM API: ${response.status}`);
    }

    const rawText = await response.text();
    const osmData = JSON.parse(rawText);
    const osmPubs = osmData.elements.filter((el) => el.lat || el.center);
    
    console.log(`   ✔️ Znalazłem ${osmPubs.length} pubów Wetherspoon na mapach.\n`);

    console.log("3. Analizuję braki...");
    let pubsToInsert = [];

    osmPubs.forEach((osmPub) => {
      const lat = osmPub.lat || osmPub.center.lat;
      const lng = osmPub.lon || osmPub.center.lon;
      const name = osmPub.tags && osmPub.tags.name ? osmPub.tags.name : "Wetherspoon (Brak nazwy)";

      const found = supabasePubs.some(
        (subPub) => getDistance(lat, lng, subPub.lat, subPub.lng) <= 0.5
      );

      let fullAddress = "";
      if (osmPub.tags) {
        const street = osmPub.tags["addr:street"] || "";
        const houseNumber = osmPub.tags["addr:housenumber"] || "";
        const city = osmPub.tags["addr:city"] || "";
        const postcode = osmPub.tags["addr:postcode"] || "";
        
        let streetPart = street;
        if (houseNumber) streetPart += ` ${houseNumber}`;
        
        fullAddress = [streetPart, city, postcode].filter(Boolean).join(", ");
      }

      if (!found) {
        pubsToInsert.push({
          name: name,
          lat: lat,
          lng: lng,
          address: fullAddress,
          image_url: "https://www.jdwetherspoon.com/~/media/Images/Jdw/icons/jdw-logo-red.png"
        });
      }
    });

    if (pubsToInsert.length === 0) {
      console.log("✅ Baza jest w 100% aktualna. Nie ma nic do dodania.");
      return;
    }

    console.log(`🚨 Znaleziono ${pubsToInsert.length} nowych pubów! Rozpoczynam dodawanie...`);

    const { error: insertError } = await supabase.from("pubs").insert(pubsToInsert);
    
    if (insertError) {
      throw insertError;
    }

    console.log(`✅ Pomyślnie dodano ${pubsToInsert.length} pubów do bazy Supabase!`);
    
  } catch (error) {
    console.error("❌ Wystąpił krytyczny błąd:", error.message);
    process.exit(1);
  }
}

runSync();
