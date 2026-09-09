const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error("❌ Błąd: Brak zmiennych SUPABASE_URL lub SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function fetchAllJdwPubs() {
  let allPubs = [];
  for (let page = 1; page <= 9; page++) {
    const res = await fetch(`https://www.jdwetherspoon.com/wp-json/wp/v2/pubs?per_page=100&page=${page}`);
    if (!res.ok) break;
    const data = await res.json();
    if (data.length === 0) break;
    allPubs = allPubs.concat(data);
  }
  return allPubs;
}

async function runSync() {
  console.log("🕵️‍♂️ Inicjalizacja automatycznego skanera na bazie JDWetherspoon API...");

  try {
    console.log("1. Pobieram bazę z Supabase...");
    const { data: supabasePubs, error } = await supabase.from("pubs").select("*").limit(3000);
    if (error) throw error;
    console.log(`   ✔️ Posiadasz ${supabasePubs.length} pubów w bazie.\n`);

    console.log("2. Pobieram aktualne dane z oficjalnej strony JDWetherspoon...");
    const jdwPubs = await fetchAllJdwPubs();
    console.log(`   ✔️ Znalazłem ${jdwPubs.length} pubów na oficjalnej stronie.\n`);

    console.log("3. Analizuję braki...");
    let pubsToInsert = [];

    for (const jdw of jdwPubs) {
      if (!jdw.acf || !jdw.acf.latitude || !jdw.acf.longitude) continue;
      
      const lat = parseFloat(jdw.acf.latitude);
      const lng = parseFloat(jdw.acf.longitude);
      let name = "Wetherspoon";
      if (jdw.title && jdw.title.rendered) {
        // Remove HTML entities like &#8217;
        name = jdw.title.rendered.replace(/&#8217;/g, "'").replace(/&amp;/g, "&");
      }

      const found = supabasePubs.some(subPub => getDistance(lat, lng, subPub.lat, subPub.lng) <= 0.5);

      if (!found) {
        const address = jdw.acf.full_address || [jdw.acf.address_line_1, jdw.acf.address_line_2, jdw.acf.towncity, jdw.acf.postcode].filter(Boolean).join(", ");
        let image_url = "https://www.jdwetherspoon.com/~/media/Images/Jdw/icons/jdw-logo-red.png";
        if (jdw.yoast_head_json && jdw.yoast_head_json.og_image && jdw.yoast_head_json.og_image.length > 0) {
          image_url = jdw.yoast_head_json.og_image[0].url;
        } else if (jdw.yoast_head_json && jdw.yoast_head_json.schema && jdw.yoast_head_json.schema["@graph"]) {
          const primaryImage = jdw.yoast_head_json.schema["@graph"].find(g => g["@type"] === "ImageObject" && g.url && !g.url.includes("logomark"));
          if (primaryImage) image_url = primaryImage.url;
        }

        pubsToInsert.push({ name, lat, lng, address, image_url });
      }
    }

    if (pubsToInsert.length === 0) {
      console.log("✅ Baza jest w 100% aktualna. Nie ma nic do dodania.");
      return;
    }

    console.log(`🚨 Znaleziono ${pubsToInsert.length} nowych pubów! Rozpoczynam dodawanie...`);

    const { error: insertError } = await supabase.from("pubs").insert(pubsToInsert);
    if (insertError) throw insertError;

    console.log(`✅ Pomyślnie dodano ${pubsToInsert.length} pubów do bazy Supabase!`);
    
  } catch (error) {
    console.error("❌ Wystąpił krytyczny błąd:", error.message);
    process.exit(1);
  }
}

runSync();
