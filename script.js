const places = window.places;

function sortByRating(data) {
  return data.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
}

function renderCards(data) {
  const cardRow = document.getElementById("matcha-card-row");
  if (!cardRow) return;
  cardRow.innerHTML = data
    .map(
      (place) => `
        <article class="card">
          <img src="${place.image}" alt="${place.name}" class="card-image" />
          <div class="card-content">
            <h3>${place.name}</h3>
            <p>${place.location}</p>
            <div class="card-caption">${place.rating}</div>
          </div>
        </article>
      `
    )
    .join("");
}

function updateLoadMoreButton() {
  const btn = document.getElementById("load-more-btn");
  if (!btn) return;
  btn.style.display = currentCount >= filteredData.length ? "none" : "";
}

function renderExploreCards() {
  const container = document.getElementById("explore-card-row");
  if (!container || !window.places) return;

  container.innerHTML = window.places
    .map(
      (place, idx) => `
        <article class="card" data-idx="${idx}">
          <img src="${place.image}" alt="${place.name}" class="card-image" />
          <div class="card-content">
            <h3>${place.name}</h3>
            <p>${place.location}</p>
            <div class="card-caption">${place.rating.toFixed(1)}</div>
          </div>
        </article>
      `
    )
    .join("");

  // Modal trigger
  container.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => {
      const idx = card.getAttribute("data-idx");
      showPlaceModal(window.places[idx]);
    });
  });
}

// load api
function loadGoogleMapsApi(callbackName = "initMap") {
  const apiKey = window.GOOGLE_MAPS_API_KEY; // injected

  if (!apiKey) {
    console.error("Google Maps API key not found!");
    return;
  }

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

function showPlaceModal(place) {
  if (!place) return;
  const overlay = document.getElementById("place-modal-overlay");
  if (!overlay) return;

  document.getElementById("modal-image").src = place.image || "";
  document.getElementById("modal-image").alt = place.name || "";
  document.getElementById("modal-title").textContent = place.name || "";
  document.getElementById("modal-location").textContent = place.location || "";
  document.getElementById("modal-rating").textContent = place.rating
    ? place.rating.toFixed(1)
    : "";
  document.getElementById("modal-address").textContent = place.address || "";
  document.getElementById("modal-description").textContent =
    place.description || "";

  overlay.style.display = "flex";

  // Try geocoding via API and show map
  if (place.address) {
    fetch(`/api/maps?address=${encodeURIComponent(place.address)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "OK" && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry.location;
          initMap(lat, lng);
        } else {
          console.warn("Geocoding failed:", data);
        }
      })
      .catch((err) => console.error("API call failed:", err));
  }
}

function closePlaceModal() {
  const overlay = document.getElementById("place-modal-overlay");
  if (overlay) overlay.style.display = "none";
}

function initMap() {
  const mapElement = document.getElementById("map");
  if (!mapElement || !window.google) return;

  const map = new google.maps.Map(mapElement, {
    center: { lat: 40.7228, lng: -74.001 },
    zoom: 3,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  });

  const geocoder = new google.maps.Geocoder();
  const bounds = new google.maps.LatLngBounds();

  (window.places || []).forEach((place) => {
    if (!place.address) return;

    geocoder.geocode({ address: place.address }, (results, status) => {
      if (status === "OK") {
        const location = results[0].geometry.location;

        const marker = new google.maps.Marker({
          map,
          position: location,
          title: place.name,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
                <div style='min-width:180px;text-align:center;'>
                  <img src='${place.image}' alt='${place.name}' style='width:100px;height:auto;border-radius:8px;margin-bottom:8px;'><br>
                  <b>${place.name}</b><br>${place.address}<br>Rating: ${place.rating}
                </div>`,
        });

        marker.addListener("click", () => infoWindow.open(map, marker));
        bounds.extend(location);
        map.fitBounds(bounds);
      } else {
        console.error(`Geocoding failed for ${place.name}: ${status}`);
      }
    });
  });
}

// === Variables to hold state ===
let matchaData = [];
let filteredData = [];
const cardsToShow = 4;
let currentCount = 0;

// window.initMap = initMap;

// === On DOM Ready ===
document.addEventListener("DOMContentLoaded", () => {
  // Nav toggle
  const hamburger = document.querySelector(".hamburger-menu");
  const navLinks = document.querySelector(".nav-links");
  const navBar = document.querySelector("nav");

  if (hamburger && navLinks && navBar) {
    hamburger.addEventListener("click", (e) => {
      e.preventDefault();
      hamburger.classList.toggle("active");
      navLinks.classList.toggle("active");
      navBar.classList.toggle("active");
    });

    document.querySelectorAll(".nav-links a").forEach((link) => {
      link.addEventListener("click", () => {
        hamburger.classList.remove("active");
        navLinks.classList.remove("active");
        navBar.classList.remove("active");
      });
    });

    document.addEventListener("click", (e) => {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        hamburger.classList.remove("active");
        navLinks.classList.remove("active");
        navBar.classList.remove("active");
      }
    });
  }

  loadGoogleMapsApi();

  // Load matcha data
  fetch("matcha_places.json")
    .then((res) => res.json())
    .then((data) => {
      matchaData = sortByRating(data);
      filteredData = matchaData;
      currentCount = cardsToShow;
      renderCards(filteredData.slice(0, currentCount));
      updateLoadMoreButton();
    })
    .catch((err) => console.error("Failed to load JSON:", err));

  // Filters
  const select = document.querySelector(".filters-row select");
  if (select) {
    select.addEventListener("change", () => {
      const city = select.value;
      filteredData = city
        ? sortByRating(
            matchaData.filter((place) =>
              place.location.toLowerCase().includes(city.toLowerCase())
            )
          )
        : sortByRating(matchaData);

      currentCount = cardsToShow;
      renderCards(filteredData.slice(0, currentCount));
      updateLoadMoreButton();
    });
  }

  // Load more
  const btn = document.getElementById("load-more-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      currentCount += cardsToShow;
      renderCards(filteredData.slice(0, currentCount));
      updateLoadMoreButton();
    });
  }

  // Explore cards
  renderExploreCards();

  const closeBtn = document.getElementById("close-modal");
  if (closeBtn) closeBtn.onclick = closePlaceModal;

  const modalOverlay = document.getElementById("place-modal-overlay");
  if (modalOverlay) {
    modalOverlay.onclick = (e) => {
      if (e.target === modalOverlay) closePlaceModal();
    };
  }
});
