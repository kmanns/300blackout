/* eslint-disable no-console, no-undef */
/* Store Locator v2.0 - NEW Places API & Advanced Markers - Pure Implementation */

const DEBUG_STORE_LOCATOR = Boolean(window.DEBUG_STORE_LOCATOR);
const debugLog = (...args) => {
  if (DEBUG_STORE_LOCATOR) {
    console.log(...args);
  }
};

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(url, fallback = '#') {
  if (!url) return fallback;
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch (e) {
    // ignore invalid URLs
  }
  return fallback;
}

function sanitizeTel(value = '') {
  const normalized = String(value).trim();
  const digits = normalized.replace(/\D/g, '');
  if (!digits) return '';
  const hasLeadingPlus = normalized.startsWith('+');
  return `tel:${hasLeadingPlus ? '+' : ''}${digits}`;
}

function getDisplayAddress(store = {}) {
  const formatted = store.address?.formattedAddress || store.address?.formatted || '';
  if (formatted && String(formatted).trim()) return String(formatted).trim();

  const parts = [
    store.address?.street,
    store.address?.city,
    store.address?.state,
    store.address?.zip,
  ].filter(Boolean);

  return parts.join(', ');
}

function getDisplayPhone(store = {}) {
  const international = store.contact?.internationalPhone || '';
  const national = store.contact?.phone || '';
  return international || national;
}

function getAddressLines(store = {}) {
  const premise = store.address?.premise?.trim?.() || '';
  const street = store.address?.street?.trim?.() || '';
  const city = store.address?.city?.trim?.() || '';
  const state = store.address?.state?.trim?.() || '';
  const zip = store.address?.zip?.trim?.() || '';
  const country = store.address?.country?.trim?.() || '';

  const line1 = [premise, street].filter(Boolean).join(', ') || street || premise;
  const locality = [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const line2 = [locality, country].filter(Boolean).join(', ');

  if (line1 || line2) {
    return {
      line1: line1 || line2,
      line2: line1 ? line2 : '',
    };
  }

  const fallbackAddress = getDisplayAddress(store);
  if (!fallbackAddress) {
    return {
      line1: 'Address not available',
      line2: '',
    };
  }

  const parts = fallbackAddress
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return {
      line1: fallbackAddress,
      line2: '',
    };
  }

  const splitIndex = Math.max(1, Math.ceil(parts.length / 2));
  return {
    line1: parts.slice(0, splitIndex).join(', '),
    line2: parts.slice(splitIndex).join(', '),
  };
}

function trackStoreLocatorEvent(action, payload = {}) {
  const eventPayload = {
    event: 'store_locator_interaction',
    action,
    component: 'store-locator',
    ...payload,
  };

  if (Array.isArray(window.adobeDataLayer)) {
    window.adobeDataLayer.push(eventPayload);
  }

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(eventPayload);
  }
}

const PLACES_FIELDS = {
  lite: [
    'displayName',
    'formattedAddress',
    'addressComponents',
    'location',
    'nationalPhoneNumber',
    'internationalPhoneNumber',
    'regularOpeningHours',
    'utcOffsetMinutes',
    'rating',
    'userRatingCount',
    'types',
  ],
  rich: [
    'displayName',
    'formattedAddress',
    'addressComponents',
    'location',
    'nationalPhoneNumber',
    'internationalPhoneNumber',
    'websiteURI',
    'regularOpeningHours',
    'utcOffsetMinutes',
    'rating',
    'userRatingCount',
    'photos',
    'types',
    'reviews',
  ],
};

const placeDetailsCache = new Map();

function getCacheKey(placeId, level) {
  return `storeLocator.place.${placeId}.${level}`;
}

function getCachedPlaceData(placeId, level, ttlMs) {
  const now = Date.now();
  const key = getCacheKey(placeId, level);
  const memoryEntry = placeDetailsCache.get(key);
  if (memoryEntry && now - memoryEntry.timestamp < ttlMs) {
    return memoryEntry.payload;
  }

  const richKey = getCacheKey(placeId, 'rich');
  if (level === 'lite') {
    const richMemoryEntry = placeDetailsCache.get(richKey);
    if (richMemoryEntry && now - richMemoryEntry.timestamp < ttlMs) {
      return richMemoryEntry.payload;
    }
  }

  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.timestamp && now - parsed.timestamp < ttlMs) {
        placeDetailsCache.set(key, parsed);
        return parsed.payload;
      }
    }
    if (level === 'lite') {
      const richRaw = sessionStorage.getItem(richKey);
      if (richRaw) {
        const parsed = JSON.parse(richRaw);
        if (parsed.timestamp && now - parsed.timestamp < ttlMs) {
          placeDetailsCache.set(richKey, parsed);
          return parsed.payload;
        }
      }
    }
  } catch (e) {
    // ignore invalid cache entries
  }
  return null;
}

function setCachedPlaceData(placeId, level, payload) {
  const key = getCacheKey(placeId, level);
  const entry = { timestamp: Date.now(), payload };
  placeDetailsCache.set(key, entry);
  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    // ignore storage quota errors
  }
}

function mapWithConcurrency(items, limit, mapper) {
  const max = Math.max(1, Number(limit) || 1);
  const results = new Array(items.length);
  let inFlight = 0;
  let index = 0;

  return new Promise((resolve, reject) => {
    function runNext() {
      if (index >= items.length && inFlight === 0) {
        resolve(results);
        return;
      }

      while (inFlight < max && index < items.length) {
        const currentIndex = index;
        index += 1;
        processItem(currentIndex);
      }
    }

    function processItem(currentIndex) {
      inFlight += 1;
      Promise.resolve(mapper(items[currentIndex], currentIndex))
        .then((result) => {
          results[currentIndex] = result;
          inFlight -= 1;
          runNext();
        })
        .catch(reject);
    }

    runNext();
  });
}

function hasValidCoordinates(store = {}) {
  const lat = store.address?.coordinates?.lat;
  const lng = store.address?.coordinates?.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function clearPlaceDetailsCache() {
  placeDetailsCache.clear();
  try {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('storeLocator.place.')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
  } catch (e) {
    // ignore storage access errors
  }
}

/**
 * Parse block configuration from DA.live table rows
 * @param {Element} block - The block element from DA.live
 * @returns {Object} Parsed configuration object
 */
function parseBlockConfig(block) {
  const config = {
    googleMapsApiKey: '',
    autocompleteProvider: 'google',
    defaultView: 'split',
    mapProvider: 'google',
    searchRadius: 0,
    maxResults: 10,
    autoDetect: true,
    showDistance: true,
    defaultLocation: 'Portland, OR',
    servicesFilter: ['pharmacy', 'pickup', 'delivery', '24-hour', 'deli', 'bakery'],
    zoomLevel: 11,
    dataSource: 'block-content',
    placesDataMode: 'lite',
    enrichOnLoad: true,
    enrichConcurrency: 4,
    cacheTtlMinutes: 30,
    enableReviews: true,
    enablePhotos: true,
    experienceMode: 'fast',
    radiusPresets: [0, 5, 10, 25, 50],
    units: 'miles',
    noResultsMessage: 'No stores found matching your criteria. Please try a different search or remove some filters.',
    maxReviewsPerStore: 5,
    mapStyle: 'default',
    primaryCtaLabel: 'Get Directions',
    cardDensity: 'comfortable',
  };

  // Parse configuration from table rows
  const rows = [...block.children];
  rows.forEach((row) => {
    const cells = [...row.children];
    if (cells.length >= 2) {
      const key = cells[0]?.textContent?.trim();
      const value = cells[1]?.textContent?.trim() ?? '';
      if (!key) return;
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Map configuration keys from DA.live to config object
      switch (normalizedKey) {
        case 'googlemapsapikey':
          config.googleMapsApiKey = value;
          debugLog('📍 Google Maps API Key found:', `${value.substring(0, 20)}...`);
          break;
        case 'autocompleteprovider':
          config.autocompleteProvider = value.toLowerCase();
          debugLog('🔍 Autocomplete Provider:', value);
          break;
        case 'defaultview':
          config.defaultView = value.toLowerCase();
          break;
        case 'mapprovider':
          config.mapProvider = value.toLowerCase();
          break;
        case 'datasource':
          config.dataSource = value.toLowerCase();
          break;
        case 'searchradius':
        case 'searchradiusmiles':
          // 0 or blank means "All" (no radius cap)
          if (value === '') {
            config.searchRadius = 0;
          } else {
            const parsedRadius = Number.parseInt(value, 10);
            config.searchRadius = Number.isNaN(parsedRadius) ? 25 : parsedRadius;
          }
          break;
        case 'maxresults':
        case 'maximumresults':
          config.maxResults = parseInt(value, 10) || 10;
          break;
        case 'autodetectlocation':
          config.autoDetect = value.toLowerCase() !== 'false';
          break;
        case 'showdistance':
          config.showDistance = value.toLowerCase() !== 'false';
          break;
        case 'defaultlocation':
          config.defaultLocation = value;
          break;
        case 'servicesfilter':
        case 'availableservicefilters':
          config.servicesFilter = value
            .split(',')
            .map((service) => service.trim().toLowerCase())
            .filter(Boolean);
          break;
        case 'zoomlevel':
          config.zoomLevel = parseInt(value, 10) || 11;
          break;
        case 'placesdatamode':
          config.placesDataMode = value.toLowerCase() === 'rich' ? 'rich' : 'lite';
          break;
        case 'enrichonload':
          config.enrichOnLoad = value.toLowerCase() !== 'false';
          break;
        case 'enrichconcurrency':
          config.enrichConcurrency = Math.max(1, Math.min(10, parseInt(value, 10) || 4));
          break;
        case 'cachettlminutes':
          config.cacheTtlMinutes = Math.max(1, Math.min(1440, parseInt(value, 10) || 30));
          break;
        case 'enablereviews':
          config.enableReviews = value.toLowerCase() !== 'false';
          break;
        case 'enablephotos':
          config.enablePhotos = value.toLowerCase() !== 'false';
          break;
        case 'experiencemode': {
          const mode = value.toLowerCase() === 'rich' ? 'rich' : 'fast';
          config.experienceMode = mode;
          config.placesDataMode = mode === 'rich' ? 'rich' : 'lite';
          config.enablePhotos = mode === 'rich';
          config.enableReviews = mode === 'rich';
          break;
        }
        case 'radiuspresets':
        case 'searchradiusoptions':
          config.radiusPresets = value
            .split(',')
            .map((entry) => parseInt(entry.trim(), 10))
            .filter((entry) => Number.isFinite(entry) && entry >= 0)
            .slice(0, 10);
          if (config.radiusPresets.length === 0) {
            config.radiusPresets = [0, 5, 10, 25, 50];
          }
          break;
        case 'units':
          config.units = value.toLowerCase() === 'km' ? 'km' : 'miles';
          break;
        case 'noresultsmessage':
          config.noResultsMessage = value || config.noResultsMessage;
          break;
        case 'maxreviewspersore':
        case 'maxreviewsperstore':
          config.maxReviewsPerStore = Math.max(1, Math.min(20, parseInt(value, 10) || 5));
          break;
        case 'mapstyle': {
          const style = value.toLowerCase();
          config.mapStyle = ['default', 'muted', 'minimal'].includes(style) ? style : 'default';
          break;
        }
        case 'primaryctalabel':
          config.primaryCtaLabel = value || 'Get Directions';
          break;
        case 'storecarddensity':
        case 'carddensity':
          config.cardDensity = value.toLowerCase() === 'compact' ? 'compact' : 'comfortable';
          break;
        default:
          // Not a config row, skip
          break;
      }
    }
  });

  if (!config.radiusPresets.includes(0)) {
    config.radiusPresets = [0, ...config.radiusPresets];
  }
  config.radiusPresets = [...new Set(config.radiusPresets)].sort((a, b) => a - b);

  return config;
}

/**
 * Dynamically load Google Maps API script with Places library
 * @param {string} apiKey - Google Maps API key from configuration
 * @returns {Promise<boolean>} Resolves when Google Maps is loaded
 */
async function loadGoogleMaps(apiKey) {
  // If Google Maps is already loaded, return immediately
  if (window.google?.maps) {
    debugLog('✅ Google Maps already loaded');
    return true;
  }

  // If no API key provided, fail gracefully
  if (!apiKey) {
    console.warn('⚠️ No Google Maps API key provided');
    return false;
  }

  debugLog('📍 Loading Google Maps API (NEW - requires "Places API (New)" enabled)...');

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    // Load the NEWEST Google Maps API with callback to ensure full initialization
    window.initGoogleMapsCallback = async () => {
      try {
        // Dynamically import libraries using the NEW importLibrary method
        await google.maps.importLibrary('places');
        await google.maps.importLibrary('marker');
        debugLog('✅ Google Maps API loaded with NEW Places & Marker libraries');
        debugLog(`   Version: ${google.maps.version}`);
        resolve(true);
      } catch (error) {
        console.error('❌ Failed to load Google Maps libraries:', error);
        console.error('💡 Make sure "Places API (New)" is enabled in Google Cloud Console');
        reject(error);
      }
    };

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=beta&callback=initGoogleMapsCallback`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      console.error('❌ Failed to load Google Maps API');
      reject(new Error('Failed to load Google Maps API'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Convert degrees to radians
 * @param {number} degrees - Degrees to convert
 * @returns {number} Radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in miles
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2))
    * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function milesToKm(miles) {
  return miles * 1.60934;
}

function kmToMiles(km) {
  return km / 1.60934;
}

function formatDistance(distanceMiles, units = 'miles') {
  if (!Number.isFinite(distanceMiles)) return '';
  if (units === 'km') {
    return `${milesToKm(distanceMiles).toFixed(1)} km away`;
  }
  return `${distanceMiles.toFixed(1)} miles away`;
}

function formatLabel(value = '') {
  const text = String(value).trim().replace(/\s+/g, ' ');
  if (!text) return '';
  return text
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get user's current location via Geolocation API
 * @returns {Promise<Object>} User coordinates {lat, lng}
 */
async function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      console.warn('❌ Geolocation not supported by browser');
      reject(new Error('Geolocation not supported'));
      return;
    }
    debugLog('🌍 Requesting user location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        debugLog('✅ User location obtained:', position.coords.latitude, position.coords.longitude);
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('❌ User location denied or unavailable:', error.message);
        reject(error);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  });
}

/**
 * Geocode address to coordinates using Nominatim (OpenStreetMap)
 * @param {string} address - Address to geocode
 * @returns {Promise<Object>} Coordinates {lat, lng}
 */
function buildNominatimSearchUrl(query, limit = 1, addressdetails = false) {
  return `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&addressdetails=${addressdetails ? 1 : 0}`;
}

async function geocodeAddress(address, fetchOptions = {}) {
  try {
    const url = buildNominatimSearchUrl(address, 1, false);

    debugLog('Geocoding address:', address);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'StoreLocator/1.0',
      },
      signal: fetchOptions.signal,
    });

    if (!response.ok) {
      throw new Error(`Geocoding API returned status ${response.status}`);
    }

    const data = await response.json();

    if (data?.[0]) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
      debugLog('Geocoded coordinates:', coords);
      return coords;
    }
    throw new Error('No results found for address');
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

/**
 * Parse hours from text format to structured object
 * @param {string} hoursText - Hours in format "Mon-Fri: 8AM-9PM, Sat-Sun: 9AM-8PM"
 * @returns {Object} Structured hours object
 */
function parseHours(hoursText) {
  const defaultHours = {
    monday: { open: '09:00', close: '21:00' },
    tuesday: { open: '09:00', close: '21:00' },
    wednesday: { open: '09:00', close: '21:00' },
    thursday: { open: '09:00', close: '21:00' },
    friday: { open: '09:00', close: '21:00' },
    saturday: { open: '09:00', close: '21:00' },
    sunday: { open: '10:00', close: '20:00' },
  };

  if (!hoursText || hoursText.trim() === '') {
    return defaultHours;
  }

  // Try parsing JSON format first
  try {
    const parsed = JSON.parse(hoursText);
    if (parsed.monday) return parsed;
  } catch (e) {
    // Not JSON, continue with text parsing
  }

  // Parse text format like "Mon-Fri: 8AM-9PM, Sat-Sun: 9AM-8PM" or "24 hours"
  const text = hoursText.toLowerCase().trim();

  if (text.includes('24') && text.includes('hour')) {
    const hours24 = { open: '00:00', close: '23:59' };
    return {
      monday: hours24,
      tuesday: hours24,
      wednesday: hours24,
      thursday: hours24,
      friday: hours24,
      saturday: hours24,
      sunday: hours24,
    };
  }

  // For simple format, return default
  return defaultHours;
}

/**
 * Parse stores from DA.live block content (rows)
 * @param {Element} block - The block element
 * @returns {Object} Store data object with stores array
 */
function parseStoresFromBlock(block) {
  const rows = [...block.children];
  const stores = [];
  let skippedCount = 0;

  // Find the data section (skip configuration rows)
  // Look for a row that starts with "Places ID" or "Name" (data headers)
  let dataStartIndex = -1;
  for (let i = 0; i < rows.length; i += 1) {
    const cells = [...rows[i].children];
    const firstCell = cells[0]?.textContent?.trim() || '';

    // Check if this row looks like a data table header
    if (firstCell.toLowerCase().includes('place')
        || firstCell.toLowerCase() === 'name') {
      dataStartIndex = i;
      debugLog(`🔍 Found data section at row ${i}, header: "${firstCell}"`);
      break;
    }
  }

  if (dataStartIndex === -1) {
    console.error('❌ No data table found in block!');
    return { stores: [] };
  }

  // Get the header row
  const headerRow = rows[dataStartIndex];
  const headerCells = [...headerRow.children];
  const firstHeader = headerCells[0]?.textContent?.trim() || '';

  // If header contains "Place" or "Places ID", use Place ID format
  const isPlaceIdFormat = firstHeader.toLowerCase().includes('place');

  if (isPlaceIdFormat) {
    debugLog('📍 Detected Place ID format (DA.live with Google Places)');
    return parseStoresFromPlaceIds(block, dataStartIndex);
  }

  debugLog('📍 Detected legacy format (Name, Address, Coordinates...)');

  // Legacy format parsing:
  // Row 0 = column headers
  // (Name | Address | Coordinates | Phone | Hours | Services | Photo | Details)
  // Row 1+ = actual store data
  rows.slice(1).forEach((row, index) => {
    const cells = [...row.children];

    // Need at least 6 columns (original): Name, Address, Coordinates,
    // Phone, Hours, Services. Optional columns 7-8: Photo, Details
    if (cells.length < 6) {
      skippedCount += 1;
      return;
    }

    const storeName = cells[0]?.textContent?.trim();
    const addressText = cells[1]?.textContent?.trim();
    const coordsText = cells[2]?.textContent?.trim();
    const phone = cells[3]?.textContent?.trim();
    const hoursText = cells[4]?.textContent?.trim();
    const servicesText = cells[5]?.textContent?.trim();
    const photoUrl = cells[6]?.textContent?.trim() || '';
    const detailsText = cells[7]?.textContent?.trim() || '';

    // Silently skip incomplete rows (for future/planned stores)
    if (!storeName || !addressText || !coordsText) {
      skippedCount += 1;
      return;
    }

    // Parse address (format: "123 Main St, Portland, OR, 97201")
    const addressParts = addressText.split(',').map((p) => p.trim());
    const street = addressParts[0] || '';
    const city = addressParts[1] || '';
    const state = addressParts[2] || '';
    const zip = addressParts[3] || '';

    // Parse coordinates (format: "45.5231, -122.6765" or "45.5231,-122.6765")
    const coordsParts = coordsText.split(',').map((p) => parseFloat(p.trim()));
    const lat = coordsParts[0] || 0;
    const lng = coordsParts[1] || 0;

    // Validate coordinates
    if (lat === 0 && lng === 0) {
      skippedCount += 1;
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      skippedCount += 1;
      return;
    }

    // Parse services (comma-separated: "pharmacy, pickup, delivery")
    const services = servicesText
      ? servicesText.split(',').map((s) => s.trim().toLowerCase()).filter((s) => s)
      : [];

    // Parse hours
    const hours = parseHours(hoursText);

    // Parse store details (comma-separated: "Free parking, Wheelchair accessible")
    const details = detailsText
      ? detailsText.split(',').map((d) => d.trim()).filter((d) => d)
      : [];

    // Create store object
    const store = {
      id: `store-${index}`,
      name: storeName,
      address: {
        street,
        city,
        state,
        zip,
        coordinates: { lat, lng },
      },
      contact: {
        phone: phone || '',
        email: '', // Not provided in DA.live
      },
      hours,
      services,
      photo: photoUrl,
      details,
      specialHours: [],
      featured: false,
    };

    stores.push(store);
  });

  // Summary log
  const skipMsg = skippedCount > 0 ? `, ${skippedCount} incomplete rows skipped` : '';
  debugLog(`✅ Store Locator: ${stores.length} stores loaded${skipMsg}`);

  return { stores };
}

/**
 * Parse stores from DA.live table with Place IDs
 * Table format: Places ID | Featured | Custom Services | Display Order | Override Name
 * @param {Element} block - The block element containing the table
 * @param {number} startIndex - Index of the header row (data starts at startIndex + 1)
 * @returns {Object} Object with stores array
 */
function parseStoresFromPlaceIds(block, startIndex = 0) {
  const rows = [...block.children];
  const stores = [];
  let skippedCount = 0;

  // Skip header row (data starts at startIndex + 1)
  rows.slice(startIndex + 1).forEach((row, index) => {
    const cells = [...row.children];

    // Need at least 1 column (Place ID)
    if (cells.length < 1) {
      skippedCount += 1;
      return;
    }

    const placeId = cells[0]?.textContent?.trim();
    const featured = cells[1]?.textContent?.trim().toLowerCase() === 'true';
    const customServicesText = cells[2]?.textContent?.trim() || '';
    const displayOrder = cells[3]?.textContent?.trim() || '';
    const overrideName = cells[4]?.textContent?.trim() || '';

    // Skip if no Place ID
    if (!placeId) {
      skippedCount += 1;
      return;
    }

    // Parse custom services (comma-separated)
    const customServices = customServicesText
      ? customServicesText.split(',').map((s) => s.trim().toLowerCase()).filter((s) => s)
      : [];

    // Create store object with Place ID (will be enriched later)
    const store = {
      id: placeId, // Use Place ID as store ID
      placeId, // Google Places ID
      name: overrideName || 'Loading...', // Placeholder, will be replaced by Places API
      featured,
      customServices,
      displayOrder: displayOrder ? parseInt(displayOrder, 10) : index,
      overrideName,
      requiresEnrichment: true, // Flag to indicate Places API enrichment needed
      // Minimal structure - will be filled by Places API
      address: {
        street: '',
        city: '',
        state: '',
        zip: '',
        coordinates: { lat: 0, lng: 0 },
      },
      contact: {
        phone: '',
        email: '',
      },
      hours: {},
      services: customServices, // Start with custom services
      photo: '',
      details: [],
      specialHours: [],
    };

    stores.push(store);
  });

  // Summary log
  const skipMsg = skippedCount > 0 ? `, ${skippedCount} incomplete rows skipped` : '';
  debugLog(`✅ Store Locator: ${stores.length} stores loaded from Place IDs${skipMsg}`);

  return { stores };
}

/**
 * Load store data from configured source
 * @param {Object} config - Block configuration
 * @param {Element} block - Block element for parsing rows
 * @returns {Promise<Object>} Store data
 */
async function loadStoreData(config, block) {
  debugLog('Loading store data from:', config.dataSource);

  if (config.dataSource === 'block-content') {
    return parseStoresFromBlock(block);
  }
  if (config.dataSource === 'json-file') {
    const response = await fetch('/data/stores.json');
    return response.json();
  }
  if (config.dataSource === 'api') {
    const response = await fetch('/api/stores');
    return response.json();
  }
  // Default to parsing from block content (DA.live table)
  return parseStoresFromBlock(block);
}

/**
 * Filter stores by selected services and open status
 * @param {Array} stores - Array of store objects
 * @param {Array} selectedServices - Array of service strings to filter by
 * @param {boolean} openNow - Filter for open stores only
 * @returns {Array} Filtered stores
 */
function filterStores(stores, selectedServices, openNow = false) {
  let filtered = stores;

  // Filter by services
  if (selectedServices.length > 0) {
    filtered = filtered.filter((store) => (
      selectedServices.every((service) => store.services.includes(service))
    ));
  }

  // Filter by open status
  if (openNow) {
    filtered = filtered.filter((store) => isStoreOpen(store));
  }

  return filtered;
}

/**
 * Sort stores by criteria
 * @param {Array} stores - Array of store objects
 * @param {string} sortBy - Sort criteria (distance, name, recent)
 * @param {Object} userLocation - User location {lat, lng} for distance calculation
 * @returns {Array} Sorted stores with distance calculated (if userLocation available)
 */
function sortStores(stores, sortBy, userLocation = null) {
  let sorted = [...stores];

  // Always calculate distance when user location is available (regardless of sort order)
  if (userLocation) {
    sorted = sorted.map((store) => ({
      ...store,
      distance: hasValidCoordinates(store)
        ? calculateDistance(
          userLocation.lat,
          userLocation.lng,
          store.address.coordinates.lat,
          store.address.coordinates.lng,
        )
        : undefined,
    }));
  }

  // Apply sorting based on selected criteria
  if (sortBy === 'distance' && userLocation) {
    return sorted.sort((a, b) => a.distance - b.distance);
  }

  if (sortBy === 'name') {
    return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (sortBy === 'recent') {
    // Most recently added stores first (reverse order)
    return sorted.reverse();
  }

  return sorted;
}

/**
 * Sort stores by distance from user location
 * @param {Array} stores - Array of store objects
 * @param {number} userLat - User latitude
 * @param {number} userLng - User longitude
 * @returns {Array} Stores with distance property, sorted by distance
 */
// eslint-disable-next-line no-unused-vars
function sortStoresByDistance(stores, userLat, userLng) {
  return stores
    .map((store) => ({
      ...store,
      distance: calculateDistance(
        userLat,
        userLng,
        store.address.coordinates.lat,
        store.address.coordinates.lng,
      ),
    }))
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Determine if store is currently open based on hours
 * @param {Object} store - Store object with hours
 * @returns {boolean} True if store is currently open
 */
function isStoreOpen(store) {
  const now = new Date();
  const utcNow = now.getTime() + (now.getTimezoneOffset() * 60000);
  const storeTime = typeof store.utcOffsetMinutes === 'number'
    ? new Date(utcNow + (store.utcOffsetMinutes * 60000))
    : now;
  const day = storeTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = storeTime.toTimeString().slice(0, 5); // "HH:MM"

  // Check special hours first
  const today = storeTime.toISOString().slice(0, 10);
  const specialHour = store.specialHours?.find((sh) => sh.date === today);
  if (specialHour?.status === 'closed') return false;

  const hours = store.hours[day];
  if (!hours) return false;

  // Handle 24-hour stores
  if (hours.open === '00:00' && hours.close === '23:59') return true;

  return currentTime >= hours.open && currentTime <= hours.close;
}

/**
 * Format time from 24h to 12h format
 * @param {string} time - Time in HH:MM format
 * @returns {string} Time in 12h format
 */
function formatTime(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function getNextOpenWindow(store, fromDayIndex, includeCurrentDay = false) {
  const daysOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const maxLookahead = 7;

  for (let offset = includeCurrentDay ? 0 : 1; offset <= maxLookahead; offset += 1) {
    const nextIndex = (fromDayIndex + offset) % 7;
    const nextDay = daysOrder[nextIndex];
    const nextHours = store.hours?.[nextDay];
    if (nextHours?.open && nextHours?.close) {
      return {
        day: nextDay,
        hours: nextHours,
      };
    }
  }

  return null;
}

function formatDayLabel(day) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

/**
 * Get today's closing time for display
 * @param {Object} store - Store object
 * @returns {string} Formatted closing time or status
 */
function getTodayHours(store) {
  const now = new Date();
  const utcNow = now.getTime() + (now.getTimezoneOffset() * 60000);
  const storeTime = typeof store.utcOffsetMinutes === 'number'
    ? new Date(utcNow + (store.utcOffsetMinutes * 60000))
    : now;
  const dayIndex = storeTime.getDay();
  const day = storeTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const hours = store.hours[day];

  if (!hours) {
    const nextWindow = getNextOpenWindow(store, dayIndex, false);
    if (nextWindow) {
      return `Opens ${formatDayLabel(nextWindow.day)} at ${formatTime(nextWindow.hours.open)}`;
    }
    return 'Hours not available';
  }

  // Check if 24-hour
  if (hours.open === '00:00' && hours.close === '23:59') {
    return 'Open 24 hours';
  }

  const isOpen = isStoreOpen(store);
  if (isOpen) {
    return `Open until ${formatTime(hours.close)}`;
  }

  const currentTime = storeTime.toTimeString().slice(0, 5);
  if (currentTime < hours.open) {
    return `Opens at ${formatTime(hours.open)}`;
  }

  const nextWindow = getNextOpenWindow(store, dayIndex, false);
  if (nextWindow) {
    return `Opens ${formatDayLabel(nextWindow.day)} at ${formatTime(nextWindow.hours.open)}`;
  }

  return `Opens at ${formatTime(hours.open)}`;
}

/**
 * Render a single store card (matches info window design)
 * @param {Object} store - Store object
 * @param {Object} [uiConfig] - UI config options
 * @returns {Element} Store card element
 */
function renderStoreCard(store, uiConfig = {}) {
  const showDistance = uiConfig.showDistance !== false;
  const showPhotos = uiConfig.enablePhotos !== false;
  const units = uiConfig.units || 'miles';
  const ctaLabel = uiConfig.primaryCtaLabel || 'Get Directions';
  const maxVisibleServiceTags = 3;
  const card = document.createElement('article');
  card.classList.add('store-card');
  card.dataset.storeId = store.id;

  // Mark featured stores
  if (store.featured) {
    card.dataset.featured = 'true';
  }

  const isOpen = isStoreOpen(store);
  const hoursText = getTodayHours(store);

  // Top row: Distance + Status badge
  const topRow = document.createElement('div');
  topRow.classList.add('card-top-row');
  const metaStrip = document.createElement('div');
  metaStrip.classList.add('card-meta-strip');

  // Distance badge (left side)
  if (showDistance && store.distance !== undefined) {
    const distanceBadge = document.createElement('div');
    distanceBadge.classList.add('card-distance-badge');
    distanceBadge.innerHTML = `
      <svg class="distance-icon" viewBox="0 0 24 24" width="14" height="14">
        <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      </svg>
      ${formatDistance(store.distance, units)}
    `;
    metaStrip.appendChild(distanceBadge);
  }

  // Status badge (right side)
  const statusBadge = document.createElement('div');
  statusBadge.classList.add('card-status-badge', isOpen ? 'open' : 'closed');
  statusBadge.setAttribute('aria-label', isOpen ? 'Store is open' : 'Store is closed');
  statusBadge.title = isOpen ? 'Store is open' : 'Store is closed';
  statusBadge.innerHTML = `
    <svg class="status-icon" viewBox="0 0 8 8" width="8" height="8">
      <circle cx="4" cy="4" r="4" fill="currentColor"/>
    </svg>
    ${isOpen ? 'Open' : 'Closed'}
  `;
  metaStrip.appendChild(statusBadge);

  topRow.appendChild(metaStrip);
  card.appendChild(topRow);

  if (showPhotos) {
    const cardPhotoUrl = Array.isArray(store.photos) && store.photos.length > 0
      ? store.photos[0]
      : store.photo;

    if (cardPhotoUrl) {
      const photoWrap = document.createElement('div');
      photoWrap.classList.add('card-photo-wrap');

      const photo = document.createElement('img');
      photo.classList.add('card-photo');
      photo.src = sanitizeUrl(cardPhotoUrl, '');
      photo.alt = `${store.name || 'Store'} photo`;
      photo.loading = 'lazy';
      photo.decoding = 'async';

      photoWrap.appendChild(photo);
      card.appendChild(photoWrap);
    } else {
      const photoFallback = document.createElement('div');
      photoFallback.classList.add('card-photo-wrap', 'card-photo-fallback');
      photoFallback.innerHTML = `
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <path fill="currentColor" d="M19 5h-3.2l-1.8-2H10L8.2 5H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-7 11a4 4 0 110-8 4 4 0 010 8z"/>
        </svg>
        <span>No photo available</span>
      `;
      card.appendChild(photoFallback);
    }
  }

  // Store name (always visible with fallback)
  const name = document.createElement('h3');
  name.classList.add('store-name');
  const storeName = store.name || 'Store Location';
  const nameLink = document.createElement('a');
  nameLink.classList.add('card-name-link');
  if (store.placeId) {
    nameLink.href = sanitizeUrl(`https://www.google.com/maps/place/?q=place_id:${store.placeId}`);
  } else {
    nameLink.href = sanitizeUrl(`https://maps.google.com/?q=${store.address.coordinates.lat},${store.address.coordinates.lng}`);
  }
  nameLink.target = '_blank';
  nameLink.rel = 'noopener noreferrer';
  nameLink.textContent = storeName;
  name.appendChild(nameLink);
  card.appendChild(name);

  if (store.rating && store.userRatingsTotal) {
    const ratingRow = document.createElement('div');
    ratingRow.classList.add('card-rating');
    const stars = '★'.repeat(Math.round(store.rating)) + '☆'.repeat(5 - Math.round(store.rating));
    ratingRow.innerHTML = `<span class="stars">${stars}</span> <span class="rating-value">${store.rating}</span> <span class="rating-count">(${store.userRatingsTotal})</span>`;
    card.appendChild(ratingRow);
  } else {
    const ratingRow = document.createElement('div');
    ratingRow.classList.add('card-rating', 'card-slot-empty');
    ratingRow.textContent = 'Ratings unavailable';
    card.appendChild(ratingRow);
  }

  // Address (always visible with fallback)
  const address = document.createElement('address');
  address.classList.add('card-address');
  const { line1: addressLine1, line2: addressLine2 } = getAddressLines(store);
  const line1 = document.createElement('span');
  line1.classList.add('card-address-line', 'card-address-line-primary');
  line1.textContent = addressLine1;

  const line2 = document.createElement('span');
  line2.classList.add('card-address-line', 'card-address-line-secondary');
  if (addressLine2) {
    line2.textContent = addressLine2;
  } else {
    line2.classList.add('is-empty');
    line2.setAttribute('aria-hidden', 'true');
    line2.textContent = '\u00A0';
  }

  address.setAttribute('aria-label', addressLine2 ? `${addressLine1}, ${addressLine2}` : addressLine1);
  address.appendChild(line1);
  address.appendChild(line2);
  card.appendChild(address);

  const phone = document.createElement('div');
  phone.classList.add('card-phone');
  const displayPhone = getDisplayPhone(store);
  const phoneHref = sanitizeTel(displayPhone || '');
  if (displayPhone && phoneHref) {
    const phoneLink = document.createElement('a');
    phoneLink.href = phoneHref;
    phoneLink.textContent = displayPhone;
    phone.appendChild(phoneLink);
  } else {
    phone.classList.add('card-slot-empty');
    phone.textContent = 'Phone unavailable';
  }
  card.appendChild(phone);

  const servicesTags = document.createElement('div');
  servicesTags.classList.add('card-services');
  let moreDetails = null;
  if (store.services && store.services.length > 0) {
    const visibleServices = store.services.slice(0, maxVisibleServiceTags);
    visibleServices.forEach((service) => {
      const tag = document.createElement('span');
      tag.classList.add('card-service-tag');
      tag.textContent = formatLabel(service);
      servicesTags.appendChild(tag);
    });

    if (store.services.length > maxVisibleServiceTags) {
      const moreTag = document.createElement('span');
      moreTag.classList.add('card-service-tag', 'card-service-more');
      moreTag.textContent = `+${store.services.length - maxVisibleServiceTags} more`;
      servicesTags.appendChild(moreTag);

      moreDetails = document.createElement('details');
      moreDetails.classList.add('card-more-details');
      const extraServices = store.services.slice(maxVisibleServiceTags)
        .map((service) => `<span class="card-service-tag">${escapeHtml(formatLabel(service))}</span>`)
        .join('');
      moreDetails.innerHTML = `
        <summary><span>Details</span><span class="card-more-chevron" aria-hidden="true">▾</span></summary>
        <div class="card-more-content">${extraServices}</div>
      `;
    }
  } else {
    servicesTags.classList.add('card-slot-empty');
    servicesTags.innerHTML = '<span class="card-service-tag card-service-placeholder">No listed services</span>';
  }
  card.appendChild(servicesTags);
  if (moreDetails) card.appendChild(moreDetails);

  const hours = document.createElement('div');
  hours.classList.add('card-hours');
  const hasAnyHours = store.hours && Object.keys(store.hours).length > 0;
  if (hasAnyHours) {
    hours.classList.add(isOpen ? 'open' : 'closed');
    const statusPrefix = isOpen ? 'Open' : 'Closed';
    const statusHoursText = hoursText && hoursText !== 'Hours not available'
      ? ` · ${hoursText}`
      : '';
    hours.setAttribute('aria-label', `${statusPrefix}${statusHoursText}`);
    hours.innerHTML = `
      <div class="card-hours-main">
        <span class="card-hours-dot" aria-hidden="true"></span>
        <span class="card-hours-text">${statusPrefix}${escapeHtml(statusHoursText)}</span>
      </div>
    `;
  } else {
    hours.classList.add('card-slot-empty');
    hours.innerHTML = `
      <div class="card-hours-main">
        <span class="card-hours-dot" aria-hidden="true"></span>
        <span class="card-hours-text">Hours unavailable</span>
      </div>
    `;
  }
  card.appendChild(hours);

  // Action buttons container
  const actions = document.createElement('div');
  actions.classList.add('card-actions');
  if (store.contact?.website) {
    actions.classList.add('has-website');
  }

  // Primary action: Get Directions button (full-width)
  const directionsBtn = document.createElement('a');
  directionsBtn.classList.add('info-link', 'info-link-primary');
  if (store.placeId) {
    directionsBtn.href = sanitizeUrl(`https://www.google.com/maps/place/?q=place_id:${store.placeId}`);
  } else {
    directionsBtn.href = sanitizeUrl(`https://maps.google.com/?q=${store.address.coordinates.lat},${store.address.coordinates.lng}`);
  }
  directionsBtn.target = '_blank';
  directionsBtn.rel = 'noopener noreferrer';
  directionsBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path fill="currentColor" d="M21.71 11.29l-9-9a.996.996 0 00-1.41 0l-9 9a.996.996 0 000 1.41l9 9c.39.39 1.02.39 1.41 0l9-9a.996.996 0 000-1.41zM14 14.5V12h-4v3H8v-4c0-.55.45-1 1-1h5V7.5l3.5 3.5-3.5 3.5z"/>
    </svg>
    ${escapeHtml(ctaLabel)}
  `;
  directionsBtn.addEventListener('click', () => {
    trackStoreLocatorEvent('directions_click', {
      source: 'store_card',
      storeId: store.id,
      placeId: store.placeId || '',
    });
  });
  actions.appendChild(directionsBtn);

  if (store.contact?.website) {
    const websiteBtn = document.createElement('a');
    websiteBtn.classList.add('info-link');
    websiteBtn.href = sanitizeUrl(store.contact.website);
    websiteBtn.target = '_blank';
    websiteBtn.rel = 'noopener noreferrer';
    websiteBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20zm7.93 9h-3.02a15.6 15.6 0 00-1.2-5.1A8.02 8.02 0 0119.93 11zM12 4c1.3 0 2.92 2.25 3.55 5H8.45C9.08 6.25 10.7 4 12 4zM4.07 13h3.02a15.6 15.6 0 001.2 5.1A8.02 8.02 0 014.07 13zM4.07 11A8.02 8.02 0 018.29 5.9 15.6 15.6 0 007.09 11H4.07zm7.93 9c-1.3 0-2.92-2.25-3.55-5h7.1C14.92 17.75 13.3 20 12 20zm3.71-1.9A15.6 15.6 0 0016.91 13h3.02a8.02 8.02 0 01-4.22 5.1z"/>
      </svg>
      Website
    `;
    actions.appendChild(websiteBtn);
  }

  card.appendChild(actions);

  return card;
}

/**
 * Get unique services from all stores
 * @param {Array} stores - Array of store objects
 * @returns {Array} Unique services found in store data
 */
function getAvailableServices(stores) {
  const servicesSet = new Set();

  stores.forEach((store) => {
    if (store.services && Array.isArray(store.services)) {
      store.services.forEach((service) => {
        if (service && service.trim()) {
          servicesSet.add(service.toLowerCase().trim());
        }
      });
    }
  });

  // Convert to array and sort alphabetically
  return Array.from(servicesSet).sort();
}

/**
 * Save user preferences to localStorage
 * @param {Object} preferences - Preferences object
 */
function savePreferences(preferences) {
  const existing = JSON.parse(localStorage.getItem('storeLocatorPrefs') || '{}');
  const updated = { ...existing, ...preferences };
  localStorage.setItem('storeLocatorPrefs', JSON.stringify(updated));
}

/**
 * Load user preferences from localStorage
 * @returns {Object} Preferences object
 */
function loadPreferences() {
  try {
    return JSON.parse(localStorage.getItem('storeLocatorPrefs') || '{}');
  } catch (e) {
    return {};
  }
}

/**
 * Create search section with input and filters
 * @param {Object} config - Block configuration
 * @param {Array} availableServices - Services found in actual store data
 * @param {Function} onSearch - Search callback function
 * @param {Function} onSortChange - Sort change callback
 * @param {Function} onViewChange - View change callback
 * @param {Promise<boolean>} googleMapsReadyPromise - Resolves when Google Maps is loaded
 * @param {AbortSignal} signal - Signal for listener cleanup
 * @returns {Element} Search section element
 */
function createSearchSection(
  config,
  availableServices,
  onSearch,
  onSortChange,
  onViewChange,
  googleMapsReadyPromise,
  signal,
) {
  const section = document.createElement('div');
  section.classList.add('store-locator-search');

  // Load saved preferences
  const prefs = loadPreferences();

  // Title
  const title = document.createElement('h2');
  title.classList.add('store-locator-title');
  title.textContent = 'Find Your Nearest Store';
  section.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.classList.add('store-locator-subtitle');
  subtitle.textContent = 'Search by ZIP, city, or full address and refine by distance or services.';
  section.appendChild(subtitle);

  // Search form
  const form = document.createElement('form');
  form.classList.add('store-search-form');
  form.setAttribute('role', 'search');

  const inputWrapper = document.createElement('div');
  inputWrapper.classList.add('search-input-wrapper');

  // Autocomplete wrapper
  const autocompleteWrapper = document.createElement('div');
  autocompleteWrapper.classList.add('autocomplete-wrapper');

  const input = document.createElement('input');
  input.type = 'text';
  input.classList.add('search-input');
  input.placeholder = 'Enter ZIP code, city, or address';
  input.setAttribute('aria-label', 'Enter location to search for stores');
  input.setAttribute('autocomplete', 'off');

  // Restore last search
  if (prefs.lastSearch) {
    input.value = prefs.lastSearch;
  }

  // Autocomplete dropdown
  const autocompleteList = document.createElement('div');
  autocompleteList.classList.add('autocomplete-list');
  autocompleteList.setAttribute('role', 'listbox');

  autocompleteWrapper.appendChild(input);
  autocompleteWrapper.appendChild(autocompleteList);

  const searchBtn = document.createElement('button');
  searchBtn.type = 'submit';
  searchBtn.classList.add('btn-search');
  searchBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="currentColor" d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 10-.71.71l.27.28v.79L20 21.5 21.5 20l-6-6zm-6 0A4.5 4.5 0 119.5 5a4.5 4.5 0 010 9z"/>
    </svg>
    <span>Search</span>
  `;

  const locationBtn = document.createElement('button');
  locationBtn.type = 'button';
  locationBtn.classList.add('btn-location');
  locationBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="currentColor" d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.25A2.25 2.25 0 1112 6.75a2.25 2.25 0 010 4.5z"/>
    </svg>
    <span>Use My Location</span>
  `;
  locationBtn.setAttribute('aria-label', 'Use my current location');

  inputWrapper.appendChild(autocompleteWrapper);
  inputWrapper.appendChild(searchBtn);
  inputWrapper.appendChild(locationBtn);
  form.appendChild(inputWrapper);

  // View toggle (mobile-first list/map with split reset)
  const viewToggle = document.createElement('div');
  viewToggle.classList.add('view-toggle');
  const mobileDefaultView = window.matchMedia('(max-width: 767px)').matches ? 'list' : null;
  const preferredView = prefs.preferredView || mobileDefaultView || config.defaultView || 'split';
  const viewOptions = [
    { value: 'list', label: 'List' },
    { value: 'map', label: 'Map' },
    { value: 'split', label: 'Split' },
  ];
  viewOptions.forEach((view) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.classList.add('view-toggle-btn');
    btn.dataset.view = view.value;
    btn.textContent = view.label;
    if (preferredView === view.value) {
      btn.classList.add('is-active');
    }
    btn.addEventListener('click', () => {
      viewToggle.querySelectorAll('.view-toggle-btn').forEach((node) => node.classList.remove('is-active'));
      btn.classList.add('is-active');
      savePreferences({ preferredView: view.value });
      onViewChange(view.value);
      trackStoreLocatorEvent('view_change', { view: view.value });
    }, { signal });
    viewToggle.appendChild(btn);
  });

  // Sort and filter controls row
  const controlsRow = document.createElement('div');
  controlsRow.classList.add('controls-row');
  controlsRow.appendChild(viewToggle);

  // Sort controls
  const sortSection = document.createElement('div');
  sortSection.classList.add('sort-controls', 'sort-controls-sort');

  const sortLabel = document.createElement('label');
  sortLabel.textContent = 'Sort';
  sortLabel.classList.add('sort-label');
  sortLabel.setAttribute('for', 'sort-select');
  sortSection.appendChild(sortLabel);

  const sortSelect = document.createElement('select');
  sortSelect.id = 'sort-select';
  sortSelect.classList.add('sort-select');
  sortSelect.setAttribute('aria-label', 'Sort stores by');

  const sortOptions = [
    { value: 'distance', label: 'Distance' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'recent', label: 'Recently Added' },
  ];

  sortOptions.forEach((option) => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    if (prefs.sortBy === option.value) {
      opt.selected = true;
    }
    sortSelect.appendChild(opt);
  });

  sortSection.appendChild(sortSelect);
  controlsRow.appendChild(sortSection);

  // Radius controls
  const radiusSection = document.createElement('div');
  radiusSection.classList.add('sort-controls', 'sort-controls-radius');

  const radiusLabel = document.createElement('label');
  radiusLabel.textContent = 'Radius';
  radiusLabel.classList.add('sort-label');
  radiusLabel.setAttribute('for', 'radius-select');
  radiusSection.appendChild(radiusLabel);

  const radiusSelect = document.createElement('select');
  radiusSelect.id = 'radius-select';
  radiusSelect.classList.add('sort-select');
  radiusSelect.setAttribute('aria-label', 'Filter stores by search radius');

  const selectedRadius = Number.isFinite(Number(prefs.selectedRadius))
    ? Number(prefs.selectedRadius)
    : Number(config.searchRadius);
  config.radiusPresets.forEach((radius) => {
    const opt = document.createElement('option');
    opt.value = String(radius);
    opt.textContent = radius === 0 ? 'All' : String(radius);
    if (radius === selectedRadius) {
      opt.selected = true;
    }
    radiusSelect.appendChild(opt);
  });

  radiusSection.appendChild(radiusSelect);
  controlsRow.appendChild(radiusSection);

  // Quick "Open Now" filter (kept visible in the toolbar)
  const openNowWrapper = document.createElement('label');
  openNowWrapper.classList.add('checkbox-label', 'checkbox-open-now', 'checkbox-open-now-inline');

  const openNowCheckbox = document.createElement('input');
  openNowCheckbox.type = 'checkbox';
  openNowCheckbox.value = 'open-now';
  openNowCheckbox.classList.add('open-now-checkbox');
  openNowCheckbox.setAttribute('aria-label', 'Show only open stores');

  // Restore open-now preference
  if (prefs.openNow) {
    openNowCheckbox.checked = true;
  }

  const openNowLabel = document.createElement('span');
  openNowLabel.textContent = 'Open Now';

  openNowWrapper.appendChild(openNowCheckbox);
  openNowWrapper.appendChild(openNowLabel);
  controlsRow.appendChild(openNowWrapper);

  // Services filter drawer
  const filterSection = document.createElement('div');
  filterSection.classList.add('services-filter');

  const filterToggleBtn = document.createElement('button');
  filterToggleBtn.type = 'button';
  filterToggleBtn.classList.add('filter-drawer-toggle');
  filterToggleBtn.setAttribute('aria-expanded', 'false');
  filterToggleBtn.setAttribute('aria-label', 'Open service filters');
  filterToggleBtn.textContent = 'Filters';

  const filterPanel = document.createElement('div');
  filterPanel.classList.add('filter-drawer-panel');
  filterPanel.hidden = true;

  const filterLabel = document.createElement('label');
  filterLabel.textContent = 'Services';
  filterLabel.classList.add('filter-label');
  filterPanel.appendChild(filterLabel);

  const filterWrapper = document.createElement('div');
  filterWrapper.classList.add('filter-checkboxes');

  // Add service filters (only services that actually exist in the data)
  availableServices.forEach((service) => {
    const checkboxWrapper = document.createElement('label');
    checkboxWrapper.classList.add('checkbox-label');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = service;
    checkbox.classList.add('service-checkbox');
    checkbox.setAttribute('aria-label', `Filter by ${service}`);

    // Restore service filter preferences
    if (prefs.selectedServices?.includes(service)) {
      checkbox.checked = true;
    }

    const labelText = document.createElement('span');
    labelText.textContent = service;

    checkboxWrapper.appendChild(checkbox);
    checkboxWrapper.appendChild(labelText);
    filterWrapper.appendChild(checkboxWrapper);
  });

  filterPanel.appendChild(filterWrapper);

  const filterPanelActions = document.createElement('div');
  filterPanelActions.classList.add('filter-panel-actions');

  const filterResetBtn = document.createElement('button');
  filterResetBtn.type = 'button';
  filterResetBtn.classList.add('filter-panel-btn', 'filter-panel-btn-reset');
  filterResetBtn.textContent = 'Reset';

  const filterApplyBtn = document.createElement('button');
  filterApplyBtn.type = 'button';
  filterApplyBtn.classList.add('filter-panel-btn', 'filter-panel-btn-apply');
  filterApplyBtn.textContent = 'Apply';

  filterPanelActions.appendChild(filterResetBtn);
  filterPanelActions.appendChild(filterApplyBtn);
  filterPanel.appendChild(filterPanelActions);
  filterSection.appendChild(filterToggleBtn);
  filterSection.appendChild(filterPanel);

  const updateFilterToggleLabel = () => {
    const selectedCount = filterWrapper.querySelectorAll('.service-checkbox:checked').length;
    filterToggleBtn.textContent = selectedCount > 0 ? `Filters (${selectedCount})` : 'Filters';
    filterToggleBtn.classList.toggle('has-selection', selectedCount > 0);
  };

  filterToggleBtn.addEventListener('click', () => {
    const expanded = filterToggleBtn.getAttribute('aria-expanded') === 'true';
    filterToggleBtn.setAttribute('aria-expanded', String(!expanded));
    filterPanel.hidden = expanded;
  }, { signal });

  document.addEventListener('click', (event) => {
    if (!filterSection.contains(event.target)) {
      filterPanel.hidden = true;
      filterToggleBtn.setAttribute('aria-expanded', 'false');
    }
  }, { signal });

  filterApplyBtn.addEventListener('click', () => {
    const selectedServices = Array.from(filterWrapper.querySelectorAll('.service-checkbox:checked'))
      .map((cb) => cb.value);
    const openNow = openNowCheckbox.checked;
    const radius = Number.parseInt(radiusSelect.value, 10) || 0;

    savePreferences({
      selectedServices,
      openNow,
      selectedRadius: radius,
    });
    trackStoreLocatorEvent('filter_apply', {
      services: selectedServices.join(','),
      openNow,
      radius,
    });
    onSearch({
      type: 'filter',
      services: selectedServices,
      openNow,
      radius,
    });
    filterPanel.hidden = true;
    filterToggleBtn.setAttribute('aria-expanded', 'false');
  }, { signal });

  filterResetBtn.addEventListener('click', () => {
    filterWrapper.querySelectorAll('.service-checkbox').forEach((checkbox) => {
      checkbox.checked = false;
    });
    updateFilterToggleLabel();

    const selectedServices = [];
    const openNow = openNowCheckbox.checked;
    const radius = Number.parseInt(radiusSelect.value, 10) || 0;

    savePreferences({
      selectedServices,
      openNow,
      selectedRadius: radius,
    });
    trackStoreLocatorEvent('filter_reset_services', {
      openNow,
      radius,
    });
    onSearch({
      type: 'filter',
      services: selectedServices,
      openNow,
      radius,
    });
  }, { signal });

  updateFilterToggleLabel();

  controlsRow.appendChild(filterSection);
  section.appendChild(form);
  section.appendChild(controlsRow);

  // Autocomplete functionality (Google Places or Nominatim)
  let autocompleteTimeout;
  let googleAutocompleteService = null;
  let autocompleteFetchController = null;

  const initGoogleAutocomplete = () => {
    if (googleAutocompleteService) return;
    if (window.google?.maps?.places) {
      googleAutocompleteService = new google.maps.places.AutocompleteService();
      debugLog('🔍 Using Google Places Autocomplete');
    }
  };

  // Initialize Google Places Autocomplete Service if using Google
  if (config.autocompleteProvider === 'google') {
    if (window.google?.maps?.places) {
      initGoogleAutocomplete();
    } else if (googleMapsReadyPromise) {
      googleMapsReadyPromise
        .then((loaded) => {
          if (loaded) {
            initGoogleAutocomplete();
          } else {
            console.warn('⚠️ Google autocomplete selected but Google Maps not loaded. Falling back to Nominatim.');
          }
        })
        .catch(() => {
          console.warn('⚠️ Google autocomplete selected but Google Maps failed to load. Falling back to Nominatim.');
        });
    } else {
      console.warn('⚠️ Google autocomplete selected but Google Maps not loaded. Falling back to Nominatim.');
    }
  }

  input.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    clearTimeout(autocompleteTimeout);

    if (query.length < 3) {
      if (autocompleteFetchController) {
        autocompleteFetchController.abort();
        autocompleteFetchController = null;
      }
      autocompleteList.innerHTML = '';
      autocompleteList.classList.remove('visible');
      return;
    }

    debugLog('🔍 Autocomplete triggered for:', query);

    autocompleteTimeout = setTimeout(async () => {
      try {
        // Use Google Places Autocomplete
        if (config.autocompleteProvider === 'google' && googleAutocompleteService) {
          googleAutocompleteService.getPlacePredictions(
            {
              input: query,
              types: ['geocode'],
            },
            (predictions, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                autocompleteList.innerHTML = '';
                predictions.forEach((prediction) => {
                  const item = document.createElement('div');
                  item.classList.add('autocomplete-item');
                  item.setAttribute('role', 'option');
                  item.textContent = prediction.description;
                  item.addEventListener('click', () => {
                    input.value = prediction.description;
                    autocompleteList.innerHTML = '';
                    autocompleteList.classList.remove('visible');
                    onSearch({ type: 'address', value: prediction.description });
                  });
                  autocompleteList.appendChild(item);
                });
                autocompleteList.classList.add('visible');
              } else {
                autocompleteList.innerHTML = '';
                autocompleteList.classList.remove('visible');
              }
            },
          );
        } else {
          // Use Nominatim (OpenStreetMap) - FREE
          debugLog('🌍 Using Nominatim autocomplete for:', query);

          if (autocompleteFetchController) {
            autocompleteFetchController.abort();
          }
          autocompleteFetchController = new AbortController();
          const url = buildNominatimSearchUrl(query, 5, true);
          const response = await fetch(url, {
            headers: { 'User-Agent': 'StoreLocator/1.0' },
            signal: autocompleteFetchController.signal,
          });
          const results = await response.json();
          debugLog('✅ Nominatim results:', results.length, 'suggestions');

          if (results.length > 0) {
            autocompleteList.innerHTML = '';
            results.forEach((result) => {
              const item = document.createElement('div');
              item.classList.add('autocomplete-item');
              item.setAttribute('role', 'option');
              item.textContent = result.display_name;
              item.addEventListener('click', () => {
                input.value = result.display_name;
                autocompleteList.innerHTML = '';
                autocompleteList.classList.remove('visible');
                onSearch({ type: 'address', value: result.display_name });
              });
              autocompleteList.appendChild(item);
            });
            autocompleteList.classList.add('visible');
            debugLog('👁️ Autocomplete dropdown shown with', results.length, 'items');
          } else {
            autocompleteList.innerHTML = '';
            autocompleteList.classList.remove('visible');
            debugLog('⚠️ No autocomplete results found');
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Autocomplete error:', error);
        }
      }
    }, 300);
  }, { signal });

  // Close autocomplete on outside click
  document.addEventListener('click', (e) => {
    if (!autocompleteWrapper.contains(e.target)) {
      autocompleteList.innerHTML = '';
      autocompleteList.classList.remove('visible');
    }
  }, { signal });

  // Event handlers
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const searchValue = input.value.trim();
    if (searchValue) {
      const selectedServices = Array.from(filterWrapper.querySelectorAll('.service-checkbox:checked'))
        .map((cb) => cb.value);
      const openNow = openNowCheckbox.checked;
      const radius = Number.parseInt(radiusSelect.value, 10) || 0;
      savePreferences({ lastSearch: searchValue });
      autocompleteList.innerHTML = '';
      autocompleteList.classList.remove('visible');
      trackStoreLocatorEvent('search_submit', { query: searchValue });
      onSearch({
        type: 'address',
        value: searchValue,
        services: selectedServices,
        openNow,
        radius,
      });
    }
  }, { signal });

  locationBtn.addEventListener('click', () => {
    const selectedServices = Array.from(filterWrapper.querySelectorAll('.service-checkbox:checked'))
      .map((cb) => cb.value);
    const openNow = openNowCheckbox.checked;
    const radius = Number.parseInt(radiusSelect.value, 10) || 0;
    trackStoreLocatorEvent('use_my_location');
    onSearch({
      type: 'geolocation',
      services: selectedServices,
      openNow,
      radius,
    });
  }, { signal });

  sortSelect.addEventListener('change', (e) => {
    savePreferences({ sortBy: e.target.value });
    onSortChange(e.target.value);
  }, { signal });

  filterWrapper.addEventListener('change', () => {
    updateFilterToggleLabel();
  }, { signal });

  openNowCheckbox.addEventListener('change', () => {
    const selectedServices = Array.from(filterWrapper.querySelectorAll('.service-checkbox:checked'))
      .map((cb) => cb.value);
    const openNow = openNowCheckbox.checked;
    const radius = Number.parseInt(radiusSelect.value, 10) || 0;

    savePreferences({
      selectedServices,
      openNow,
      selectedRadius: radius,
    });
    trackStoreLocatorEvent('filter_change', {
      services: selectedServices.join(','),
      openNow,
      radius,
    });

    onSearch({
      type: 'filter',
      services: selectedServices,
      openNow,
      radius,
    });
  }, { signal });

  radiusSelect.addEventListener('change', () => {
    const selectedServices = Array.from(filterWrapper.querySelectorAll('.service-checkbox:checked'))
      .map((cb) => cb.value);
    const openNow = openNowCheckbox.checked;
    const radius = Number.parseInt(radiusSelect.value, 10) || 0;

    savePreferences({ selectedRadius: radius });
    trackStoreLocatorEvent('radius_change', {
      radius,
      units: config.units,
    });
    onSearch({
      type: 'filter',
      services: selectedServices,
      openNow,
      radius,
    });
  }, { signal });

  signal.addEventListener('abort', () => {
    if (autocompleteFetchController) {
      autocompleteFetchController.abort();
      autocompleteFetchController = null;
    }
  }, { once: true });

  return section;
}

/**
 * Create rich info window HTML content with all Places API data
 * @param {Object} store - Store object with Places API data
 * @returns {string} HTML content for info window
 */
function createInfoWindowContent(store, uiConfig = {}) {
  const units = uiConfig.units || 'miles';
  const ctaLabel = uiConfig.primaryCtaLabel || 'Get Directions';
  const maxVisibleInfoTags = 4;
  const safeStoreName = escapeHtml(store.name || 'Store');
  const safeAddress = escapeHtml(getDisplayAddress(store) || 'Address not available');
  const displayPhone = getDisplayPhone(store);
  const safePhoneText = escapeHtml(displayPhone || '');
  const safePhoneHref = sanitizeTel(displayPhone || '');
  const safeWebsiteHref = sanitizeUrl(store.contact?.website || '');
  const safeDirectionsHref = sanitizeUrl(store.directionsUrl || '#');
  const isOpen = isStoreOpen(store);
  const statusClass = isOpen ? 'open' : 'closed';
  const hoursText = getTodayHours(store);

  // Build photo carousel HTML (max 3 images)
  let photos = [];
  if (Array.isArray(store.photos) && store.photos.length > 0) {
    photos = store.photos.slice(0, 3);
  } else if (store.photo) {
    photos = [store.photo];
  }
  let photoHTML = '';
  if (photos.length > 0) {
    const photoSlides = photos.map((url, index) => `
      <div class="info-photo-slide">
        <img src="${sanitizeUrl(url, '')}" alt="${safeStoreName} photo ${index + 1}" class="info-photo" />
      </div>
    `).join('');
    photoHTML = `
      <div class="info-photos-container">
        <div class="info-photos" role="group" aria-label="Photos of ${safeStoreName}">
          ${photoSlides}
        </div>
        ${photos.length > 1 ? `
          <div class="info-photo-indicators">
            ${photos.map((_, index) => `<span class="info-photo-dot" data-index="${index}"></span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  // Build rating HTML
  let ratingHTML = '';
  if (store.rating && store.userRatingsTotal) {
    const stars = '★'.repeat(Math.round(store.rating)) + '☆'.repeat(5 - Math.round(store.rating));
    ratingHTML = `
      <div class="info-rating">
        <span class="info-stars">${stars}</span>
        <span class="info-rating-value">${store.rating}</span>
        <span class="info-rating-count">· ${store.userRatingsTotal} reviews</span>
      </div>
    `;
  }

  // Build reviews section (shown in progressive details area)
  let reviewsHTML = '';
  if (store.reviews && store.reviews.length > 0) {
    const reviewCards = store.reviews.map((review) => {
      const reviewStars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
      const truncatedText = review.text.length > 150
        ? `${review.text.substring(0, 150)}...`
        : review.text;
      return `
        <div class="info-review-card">
          <div class="info-review-header">
            <div class="info-review-author">
              <div class="info-review-author-info">
                <span class="info-review-author-name">${escapeHtml(review.author)}</span>
                <span class="info-review-time">${escapeHtml(review.relativeTime)}</span>
              </div>
            </div>
            <div class="info-review-rating">
              <span class="info-review-stars">${reviewStars}</span>
            </div>
          </div>
          <p class="info-review-text">${escapeHtml(truncatedText)}</p>
        </div>
      `;
    }).join('');

    reviewsHTML = `
      <div class="info-reviews-section">
        <h3 class="info-reviews-title">Recent Reviews</h3>
        <div class="info-reviews-container">
          ${reviewCards}
        </div>
      </div>
    `;
  }

  // Build status/hours HTML with expandable dropdown
  let statusHoursText = '';
  if (hoursText && hoursText !== 'Hours not available') {
    statusHoursText = ` · ${hoursText}`;
  }

  // Build full weekly hours HTML (for dropdown)
  let fullHoursHTML = '';
  if (store.hours && Object.keys(store.hours).length > 0) {
    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const hoursRows = daysOrder.map((day) => {
      const dayHours = store.hours[day];
      const isToday = day === today;
      const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);

      if (dayHours) {
        const openTime = formatTime(dayHours.open);
        const closeTime = formatTime(dayHours.close);
        return `
          <div class="info-hours-row ${isToday ? 'today' : ''}">
            <span class="info-hours-day">${dayLabel}</span>
            <span class="info-hours-time">${openTime} – ${closeTime}</span>
          </div>
        `;
      }
      return `
        <div class="info-hours-row ${isToday ? 'today' : ''}">
          <span class="info-hours-day">${dayLabel}</span>
          <span class="info-hours-time">Closed</span>
        </div>
      `;
    }).join('');

    fullHoursHTML = `
      <div class="info-opening-times">
        <button class="info-hours-toggle" type="button" aria-expanded="false" data-toggle-hours>
          <div class="info-status-row">
            <span class="info-status-dot ${statusClass}"></span>
            <span class="info-status-text">${isOpen ? 'Open' : 'Closed'}${statusHoursText}</span>
          </div>
          <svg class="info-hours-arrow" viewBox="0 0 24 24" width="20" height="20">
            <path fill="#5f6368" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
          </svg>
        </button>
        <div class="info-hours-dropdown" data-hours-dropdown>
          ${hoursRows}
        </div>
      </div>
    `;
  } else {
    // No hours available - show static status
    fullHoursHTML = `
      <div class="info-status-row info-status-static">
        <span class="info-status-dot ${statusClass}"></span>
        <span class="info-status-text">${isOpen ? 'Open' : 'Closed'}${statusHoursText}</span>
      </div>
    `;
  }

  // Build supplementary info HTML
  const supplementaryItems = [
    ...(Array.isArray(store.services) ? store.services : []),
    ...(Array.isArray(store.details) ? store.details : []),
  ].filter((item) => item);

  const visibleTags = supplementaryItems.slice(0, maxVisibleInfoTags);
  const hiddenTagCount = Math.max(0, supplementaryItems.length - visibleTags.length);
  const tagsHTML = visibleTags.length > 0
    ? `
      <div class="info-supplementary-tags info-card-services">
        ${visibleTags.map((item) => `<span class="card-service-tag">${escapeHtml(formatLabel(item))}</span>`).join('')}
        ${hiddenTagCount > 0 ? `<span class="card-service-tag card-service-more">+${hiddenTagCount} more</span>` : ''}
      </div>
    `
    : '';

  const actionsHTML = (store.contact?.website || store.directionsUrl)
    ? `
      <div class="info-links-row">
        ${store.directionsUrl ? `
          <a
            href="${safeDirectionsHref}"
            target="_blank"
            rel="noopener noreferrer"
            class="info-link info-link-primary"
            data-analytics="directions"
            data-store-id="${escapeHtml(store.id)}"
            data-place-id="${escapeHtml(store.placeId || '')}"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M21.71 11.29l-9-9a.996.996 0 00-1.41 0l-9 9a.996.996 0 000 1.41l9 9c.39.39 1.02.39 1.41 0l9-9a.996.996 0 000-1.41zM14 14.5V12h-4v3H8v-4c0-.55.45-1 1-1h5V7.5l3.5 3.5-3.5 3.5z"/>
            </svg>
            <span>${escapeHtml(ctaLabel)}</span>
          </a>
        ` : ''}
        ${store.contact?.website ? `
          <a href="${safeWebsiteHref}" target="_blank" rel="noopener noreferrer" class="info-link">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20zm7.93 9h-3.02a15.6 15.6 0 00-1.2-5.1A8.02 8.02 0 0119.93 11zM12 4c1.3 0 2.92 2.25 3.55 5H8.45C9.08 6.25 10.7 4 12 4zM4.07 13h3.02a15.6 15.6 0 001.2 5.1A8.02 8.02 0 014.07 13zM4.07 11A8.02 8.02 0 018.29 5.9 15.6 15.6 0 007.09 11H4.07zm7.93 9c-1.3 0-2.92-2.25-3.55-5h7.1C14.92 17.75 13.3 20 12 20zm3.71-1.9A15.6 15.6 0 0016.91 13h3.02a8.02 8.02 0 01-4.22 5.1z"/>
            </svg>
            <span>Website</span>
          </a>
        ` : ''}
      </div>
    `
    : '';

  const detailSections = [];
  if (tagsHTML) detailSections.push(tagsHTML);
  if (reviewsHTML) detailSections.push(reviewsHTML);

  const moreDetailsHTML = detailSections.length > 0
    ? `
      <details class="info-more-details card-more-details">
        <summary><span>Details & reviews</span><span class="info-more-chevron" aria-hidden="true">▾</span></summary>
        <div class="info-more-content">
          ${detailSections.join('')}
        </div>
      </details>
    `
    : '';

  // Build phone HTML
  let phoneHTML = '';
  if (displayPhone && safePhoneHref) {
    phoneHTML = `
      <div class="info-row">
        <svg class="info-icon-svg" viewBox="0 0 24 24" width="20" height="20">
          <path fill="#5f6368" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
        </svg>
        <a href="${safePhoneHref}">${safePhoneText}</a>
      </div>
    `;
  }

  // Build distance HTML
  let distanceHTML = '';
  if (store.distance !== undefined) {
    distanceHTML = `
      <div class="info-row info-distance-row">
        <svg class="info-icon-svg" viewBox="0 0 24 24" width="20" height="20">
          <path fill="#1a73e8" d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
        <span class="info-distance-text">${formatDistance(store.distance, units)}</span>
      </div>
    `;
  }

  return `
    <div class="map-info-window map-info-window-compact">
      ${photoHTML}
      <div class="info-content">
        <h4 class="info-name">
          <a href="${safeDirectionsHref}" target="_blank" rel="noopener noreferrer" class="info-name-link">${safeStoreName}</a>
        </h4>
        ${ratingHTML}
        ${fullHoursHTML}
        ${distanceHTML}
        ${actionsHTML}
        <div class="info-row">
          <svg class="info-icon-svg" viewBox="0 0 24 24" width="20" height="20">
            <path fill="#ea4335" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          <span class="info-address-text">${safeAddress}</span>
        </div>
        ${phoneHTML}
        ${moreDetailsHTML}
      </div>
    </div>
  `;
}

/**
 * Initialize Google Maps with NEW Advanced Markers (replaces deprecated Marker)
 * @param {Element} container - Map container element
 * @param {Array} stores - Array of stores to display
 * @param {Object} center - Center coordinates {lat, lng}
 * @param {number} zoomLevel - Map zoom level
 * @returns {Promise<Object|null>} Map instance or null
 */
async function initializeMap(
  container,
  stores,
  center,
  zoomLevel,
  existingMapState = null,
  onOpenStoreDetails = null,
  uiConfig = {},
) {
  // Check if Google Maps is available
  if (typeof google === 'undefined' || !google.maps) {
    container.innerHTML = '<p class="map-placeholder">📍 Map requires Google Maps API key.<br><br>Add <strong>"Google Maps API Key"</strong> in your DA.live block configuration to enable the interactive map.<br><br>The store list and search features work without it!</p>';
    return null;
  }

  try {
    // Import the NEW marker library using importLibrary (pure new approach)
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary('marker');
    const isMobileViewport = window.matchMedia('(max-width: 767px)').matches;
    const mapInteractionOptions = {
      // Preserve page scroll on desktop/tablet; allow direct map gestures on mobile.
      gestureHandling: isMobileViewport ? 'greedy' : 'cooperative',
      scrollwheel: true,
      clickableIcons: false,
    };

    const mapState = existingMapState || {
      map: null,
      storeMarkers: [],
      userMarker: null,
      infoWindows: [],
    };

    if (!mapState.map) {
      const mapIdByStyle = {
        default: 'STORE_LOCATOR_MAP',
        muted: 'STORE_LOCATOR_MAP_MUTED',
        minimal: 'STORE_LOCATOR_MAP_MINIMAL',
      };
      const mapId = mapIdByStyle[uiConfig.mapStyle] || mapIdByStyle.default;
      mapState.map = new google.maps.Map(container, {
        center: { lat: center.lat, lng: center.lng },
        zoom: zoomLevel,
        mapTypeControl: false,
        streetViewControl: false,
        ...mapInteractionOptions,
        mapId, // Required for Advanced Markers
      });
    } else {
      mapState.map.setOptions(mapInteractionOptions);
      mapState.map.setCenter({ lat: center.lat, lng: center.lng });
      mapState.map.setZoom(zoomLevel);
    }

    // Clean up old store markers and info windows before rendering new set
    mapState.storeMarkers.forEach((marker) => {
      marker.map = null;
    });
    mapState.storeMarkers = [];
    mapState.infoWindows.forEach((iw) => iw.close());
    mapState.infoWindows = [];

    // Add/update user location marker using NEW AdvancedMarkerElement
    const userPin = new PinElement({
      scale: 1.2,
      background: '#4285F4',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
    });

    if (mapState.userMarker) {
      mapState.userMarker.map = null;
      mapState.userMarker = null;
    }
    mapState.userMarker = new AdvancedMarkerElement({
      map: mapState.map,
      position: { lat: center.lat, lng: center.lng },
      title: 'Your Location',
      content: userPin.element,
    });

    // Add NEW Advanced Markers for each store
    stores.forEach((store) => {
      const storePin = new PinElement({
        scale: 1.0,
        background: '#EA4335',
        borderColor: '#ffffff',
        glyphColor: '#ffffff',
      });

      const marker = new AdvancedMarkerElement({
        map: mapState.map,
        position: {
          lat: store.address.coordinates.lat,
          lng: store.address.coordinates.lng,
        },
        title: store.name,
        content: storePin.element,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: createInfoWindowContent(store, uiConfig),
        maxWidth: 300,
        disableAutoPan: false,
      });
      mapState.infoWindows.push(infoWindow);
      mapState.storeMarkers.push(marker);

      marker.addListener('click', async () => {
        let activeStore = store;
        if (typeof onOpenStoreDetails === 'function') {
          activeStore = await onOpenStoreDetails(store);
          infoWindow.setContent(createInfoWindowContent(activeStore || store, uiConfig));
        }

        infoWindow.open(mapState.map, marker);
        if (window.matchMedia('(min-width: 768px)').matches) {
          mapState.map.panBy(0, -80);
        }

        // Wait for InfoWindow to render, then attach event listeners
        google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
          // Hours dropdown toggle
          const infoRoot = document.querySelector('.gm-style .map-info-window');
          if (!infoRoot) return;

          const toggleBtn = infoRoot.querySelector('[data-toggle-hours]');
          const dropdown = infoRoot.querySelector('[data-hours-dropdown]');

          if (toggleBtn && dropdown) {
            toggleBtn.addEventListener('click', () => {
              const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
              toggleBtn.setAttribute('aria-expanded', !isExpanded);
              toggleBtn.classList.toggle('expanded');
              dropdown.classList.toggle('expanded');
            });
          }

          // Photo carousel scroll indicators
          const photosContainer = infoRoot.querySelector('.info-photos');
          const indicators = infoRoot.querySelectorAll('.info-photo-dot');

          if (photosContainer && indicators.length > 0) {
            // Update active indicator on scroll
            photosContainer.addEventListener('scroll', () => {
              const { scrollLeft } = photosContainer;
              const slideWidth = photosContainer.offsetWidth;
              const activeIndex = Math.round(scrollLeft / slideWidth);

              indicators.forEach((dot, index) => {
                dot.classList.toggle('active', index === activeIndex);
              });
            });

            // Click indicator to scroll to that photo
            indicators.forEach((dot, index) => {
              dot.addEventListener('click', () => {
                const slideWidth = photosContainer.offsetWidth;
                photosContainer.scrollTo({
                  left: slideWidth * index,
                  behavior: 'smooth',
                });
              });
            });

            // Set first indicator as active on load
            indicators[0]?.classList.add('active');
          }

          infoRoot.querySelectorAll('[data-analytics="directions"]').forEach((link) => {
            link.addEventListener('click', () => {
              trackStoreLocatorEvent('directions_click', {
                source: 'map_info_window',
                storeId: link.dataset.storeId || '',
                placeId: link.dataset.placeId || '',
              });
            }, { once: true });
          });
        });
      });
    });

    debugLog('✅ Map initialized with NEW Advanced Markers');
    return mapState;
  } catch (error) {
    console.error('Map initialization error:', error);
    container.innerHTML = '<p class="map-error">Unable to load map. Please try again later.</p>';
    return null;
  }
}

/**
 * Enrich a store with Google Places API data using NEW Place class
 * @param {Object} store - Store object with Place ID
 * @returns {Promise<Object>} Enriched store object
 */
/**
 * Convert Google's regularOpeningHours to our simplified hours format
 * @param {Object} regularOpeningHours - Google's opening hours object
 * @returns {Object} Simplified hours object {monday: {open: '09:00', close: '17:00'}, ...}
 */
function parseGoogleOpeningHours(regularOpeningHours) {
  if (!regularOpeningHours || !regularOpeningHours.periods) {
    return {};
  }

  const hours = {};
  const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  regularOpeningHours.periods.forEach((period) => {
    if (period.open && period.close) {
      const dayName = dayMap[period.open.day];
      hours[dayName] = {
        open: `${period.open.hour.toString().padStart(2, '0')}:${period.open.minute.toString().padStart(2, '0')}`,
        close: `${period.close.hour.toString().padStart(2, '0')}:${period.close.minute.toString().padStart(2, '0')}`,
      };
    } else if (period.open && !period.close) {
      // 24-hour day
      const dayName = dayMap[period.open.day];
      hours[dayName] = {
        open: '00:00',
        close: '23:59',
      };
    }
  });

  return hours;
}

function getAddressComponent(type, components = []) {
  return components.find(
    (component) => Array.isArray(component.types) && component.types.includes(type),
  );
}

function getComponentLongText(component) {
  return component?.longText || component?.long_name || '';
}

function getComponentShortText(component) {
  return component?.shortText || component?.short_name || '';
}

function parseAddressFromComponents(addressComponents = []) {
  const premise = getComponentLongText(getAddressComponent('premise', addressComponents));
  const streetNumber = getComponentLongText(getAddressComponent('street_number', addressComponents));
  const route = getComponentLongText(getAddressComponent('route', addressComponents));
  const locality = getComponentLongText(getAddressComponent('locality', addressComponents))
    || getComponentLongText(getAddressComponent('postal_town', addressComponents))
    || getComponentLongText(getAddressComponent('administrative_area_level_2', addressComponents));
  const state = getComponentShortText(getAddressComponent('administrative_area_level_1', addressComponents));
  const zip = getComponentLongText(getAddressComponent('postal_code', addressComponents));
  const country = getComponentLongText(getAddressComponent('country', addressComponents));

  const street = [streetNumber, route].filter(Boolean).join(' ').trim();
  const formattedStructured = [premise, street, locality, zip, country].filter(Boolean).join(', ');

  return {
    premise,
    street,
    city: locality,
    state,
    zip,
    country,
    formattedStructured,
  };
}

function getPlaceFields(detailLevel, config) {
  if (detailLevel === 'rich') {
    return PLACES_FIELDS.rich.filter((field) => {
      if (field === 'reviews' && !config.enableReviews) return false;
      if (field === 'photos' && !config.enablePhotos) return false;
      return true;
    });
  }
  return [...PLACES_FIELDS.lite];
}

function buildPlacePayload(place, detailLevel, config) {
  const parsedAddress = parseAddressFromComponents(place.addressComponents || []);
  const fallbackFormattedAddress = place.formattedAddress || '';
  const fallbackAddressParts = fallbackFormattedAddress.split(',').map((p) => p.trim());
  const fallbackStreet = fallbackAddressParts[0] || '';
  const fallbackCity = fallbackAddressParts[1] || '';

  // Parse Google's opening hours to our format
  const parsedHours = parseGoogleOpeningHours(place.regularOpeningHours);

  // Filter out generic Google Places types (keep only meaningful ones)
  const excludedTypes = [
    'establishment',
    'point_of_interest',
    'finance',
    'store',
    'general_contractor',
  ];
  const meaningfulTypes = (place.types || [])
    .filter((type) => !excludedTypes.includes(type))
    .map((type) => type.replace(/_/g, ' ')); // Convert snake_case to readable

  // Prepare photos array at high resolution
  let storePhotos = [];
  if (config.enablePhotos && place.photos && place.photos.length > 0) {
    storePhotos = place.photos.slice(0, 6).map((photo) => photo.getURI({ maxHeight: 1200 }));
  }

  // Prepare reviews array (top 5 most helpful)
  let storeReviews = [];
  if (config.enableReviews && place.reviews && place.reviews.length > 0) {
    storeReviews = place.reviews.slice(0, config.maxReviewsPerStore).map((review) => {
      // Try multiple property paths for author photo (often not provided by Google)
      const photoUri = review.authorAttribution?.photoUri
        || review.authorAttribution?.photoURI
        || review.author_photo
        || '';

      return {
        author: review.authorAttribution?.displayName || 'Anonymous',
        rating: review.rating || 0,
        text: review.text?.text || review.text || '',
        relativeTime: review.relativePublishTimeDescription || '',
        authorPhotoUri: photoUri,
      };
    });
  }

  return {
    displayName: place.displayName,
    address: {
      formattedAddress: parsedAddress.formattedStructured || fallbackFormattedAddress,
      street: parsedAddress.street || fallbackStreet,
      city: parsedAddress.city || fallbackCity,
      state: parsedAddress.state || '',
      zip: parsedAddress.zip || '',
      country: parsedAddress.country || '',
      premise: parsedAddress.premise || '',
      coordinates: {
        lat: place.location?.lat?.() || 0,
        lng: place.location?.lng?.() || 0,
      },
    },
    contact: {
      phone: place.nationalPhoneNumber || '',
      internationalPhone: place.internationalPhoneNumber
        || place.international_phone_number
        || '',
      email: '',
      website: place.websiteURI || '',
    },
    hours: parsedHours,
    regularOpeningHours: place.regularOpeningHours,
    utcOffsetMinutes: place.utcOffsetMinutes,
    meaningfulTypes,
    photo: storePhotos[0] || '',
    photos: storePhotos,
    rating: place.rating || 0,
    userRatingsTotal: place.userRatingCount || 0,
    reviews: storeReviews,
    richDetailsLoaded: detailLevel === 'rich',
  };
}

function applyPlacePayloadToStore(store, payload) {
  return {
    ...store,
    name: store.overrideName || payload.displayName,
    address: payload.address,
    contact: payload.contact,
    hours: payload.hours,
    regularOpeningHours: payload.regularOpeningHours,
    utcOffsetMinutes: payload.utcOffsetMinutes,
    services: store.customServices.length > 0
      ? store.customServices
      : payload.meaningfulTypes,
    photo: payload.photo || store.photo || '',
    photos: payload.photos.length > 0 ? payload.photos : (store.photos || []),
    rating: payload.rating,
    userRatingsTotal: payload.userRatingsTotal,
    reviews: payload.reviews,
    requiresEnrichment: false,
    richDetailsLoaded: payload.richDetailsLoaded || store.richDetailsLoaded || false,
    // Generate 'Get Directions' URL using Place ID
    directionsUrl: `https://www.google.com/maps/place/?q=place_id:${store.placeId}`,
  };
}

async function enrichStoreWithPlacesData(store, config, detailLevel = 'lite') {
  if (!store.placeId) {
    console.warn(`⚠️ Store ${store.name || store.id} has no Place ID`);
    return store;
  }

  // Check if Places API is available
  if (!window.google?.maps?.places?.Place) {
    console.error('❌ Google Places API (New) not loaded! Cannot enrich stores.');
    return store;
  }

  const ttlMs = config.cacheTtlMinutes * 60 * 1000;
  const cachedPayload = getCachedPlaceData(store.placeId, detailLevel, ttlMs);
  const shouldBypassCachedPhotos = detailLevel === 'rich'
    && config.enablePhotos
    && (!Array.isArray(cachedPayload?.photos) || cachedPayload.photos.length === 0);
  const shouldBypassCachedPhone = Boolean(cachedPayload?.contact?.phone)
    && !cachedPayload?.contact?.internationalPhone;
  if (cachedPayload && !shouldBypassCachedPhotos && !shouldBypassCachedPhone) {
    return applyPlacePayloadToStore(store, cachedPayload);
  }

  try {
    // Use the NEW Place class (Places API New)
    const place = new google.maps.places.Place({
      id: store.placeId,
    });

    // Fetch fields using the new fetchFields method with field mask
    await place.fetchFields({
      fields: getPlaceFields(detailLevel, config),
    });

    // Extract data from the new Place object
    if (place && place.displayName) {
      const payload = buildPlacePayload(place, detailLevel, config);
      setCachedPlaceData(store.placeId, detailLevel, payload);
      const enrichedStore = applyPlacePayloadToStore(store, payload);

      debugLog(`✅ Enriched store: ${enrichedStore.name} (NEW Places API, ${detailLevel})`);
      debugLog('  📍 Address:', enrichedStore.address);
      debugLog('  📞 Phone:', enrichedStore.contact.phone || '❌ NOT PROVIDED BY GOOGLE');
      debugLog(
        '  🕒 Hours:',
        Object.keys(payload.hours).length > 0
          ? `✅ ${Object.keys(payload.hours).length} days`
          : '❌ NOT PROVIDED BY GOOGLE',
      );
      debugLog('  ⭐ Rating:', enrichedStore.rating || '❌ NOT PROVIDED BY GOOGLE');
      debugLog('  📊 Reviews:', enrichedStore.userRatingsTotal || '❌ NOT PROVIDED BY GOOGLE');
      return enrichedStore;
    }
    console.warn(`⚠️ Could not enrich store with Place ID ${store.placeId}: No data returned`);
    return store;
  } catch (error) {
    console.error(`❌ Error enriching store with Place ID ${store.placeId}:`, error);
    console.error('   Error details:', error.message);
    return store; // Return original store if enrichment fails
  }
}

/**
 * Enrich all stores that need Places API data using NEW Place class
 * @param {Array} stores - Array of store objects
 * @returns {Promise<Array>} Array of enriched stores
 */
async function enrichStoresWithPlacesData(stores, config, detailLevel = 'lite') {
  const storesToEnrich = stores.filter((store) => store.requiresEnrichment);

  if (storesToEnrich.length === 0) {
    debugLog('No stores require Places API enrichment');
    return stores;
  }

  // Safety check: Ensure Places API is loaded
  if (!window.google?.maps?.places?.Place) {
    console.error('❌ CRITICAL: Google Places API (New) not loaded!');
    console.error('   Cannot enrich stores with Place IDs.');
    console.error('   Stores will show with placeholder data only.');
    return stores; // Return un-enriched stores
  }

  debugLog(`🔄 Enriching ${storesToEnrich.length} stores with NEW Places API (${detailLevel})...`);

  const enrichedStores = await mapWithConcurrency(
    stores,
    config.enrichConcurrency,
    (store) => {
      if (store.requiresEnrichment) {
        return enrichStoreWithPlacesData(store, config, detailLevel);
      }
      return Promise.resolve(store);
    },
  );

  const successfulEnrichments = enrichedStores.filter((s) => !s.requiresEnrichment).length;
  debugLog(
    `✅ Successfully enriched ${successfulEnrichments}/${storesToEnrich.length} stores with NEW Places API`,
  );
  return enrichedStores;
}

/**
 * Create loading spinner overlay (lives in DOM, toggled on/off)
 * @returns {Element} Loading spinner element
 */
function createLoadingSpinner() {
  const spinner = document.createElement('div');
  spinner.classList.add('loading-spinner');
  spinner.innerHTML = '<div class="spinner"></div><p>Loading stores...</p>';
  return spinner;
}

/**
 * Show loading overlay
 * @param {Element} listContainer - The list container
 * @param {Element} spinner - The spinner element
 */
function showLoading(listContainer, spinner) {
  spinner.classList.add('active');
}

/**
 * Hide loading overlay
 * @param {Element} spinner - The spinner element
 */
function hideLoading(spinner) {
  spinner.classList.remove('active');
}

/**
 * Main decorate function for store-locator block
 * @param {Element} block - The store-locator block element
 */
export default async function decorate(block) {
  const config = parseBlockConfig(block);
  const eventsController = new AbortController();
  const { signal } = eventsController;

  if (config.mapProvider !== 'google') {
    console.warn(`Unsupported map provider "${config.mapProvider}". Falling back to "google".`);
    config.mapProvider = 'google';
  }

  const googleMapsReadyPromise = (config.googleMapsApiKey && config.mapProvider === 'google')
    ? loadGoogleMaps(config.googleMapsApiKey).catch((error) => {
      console.error('Failed to load Google Maps:', error);
      return false;
    })
    : Promise.resolve(false);

  // IMPORTANT: Parse stores BEFORE clearing block content!
  let storeDataObj;
  try {
    storeDataObj = await loadStoreData(config, block);
  } catch (error) {
    console.error('Failed to load store data:', error);
    block.innerHTML = '<p class="error">Unable to load store data. Please try again later.</p>';
    return;
  }

  // State management
  let allStores = storeDataObj.stores;
  let filteredStores = [];
  let userLocation = null;
  let mapInstance = null;
  let loadingSpinner; // Declared here, assigned later
  if (!config.googleMapsApiKey && allStores.some((store) => store.requiresEnrichment)) {
    clearPlaceDetailsCache();
  }

  // Get available services from actual store data (for dynamic filters)
  const detectedServices = getAvailableServices(allStores);
  const configuredServices = Array.isArray(config.servicesFilter) ? config.servicesFilter : [];
  const availableServices = configuredServices.length > 0
    ? detectedServices.filter((service) => configuredServices.includes(service))
    : detectedServices;

  // Create UI structure AFTER parsing stores
  const container = document.createElement('div');
  container.classList.add('store-locator-container');
  container.dataset.cardDensity = config.cardDensity;

  const listContainer = document.createElement('div');
  listContainer.classList.add('store-list');

  const mapContainer = document.createElement('div');
  mapContainer.classList.add('store-map');

  const resultsSummary = document.createElement('p');
  resultsSummary.classList.add('store-results-summary');
  resultsSummary.setAttribute('aria-live', 'polite');
  resultsSummary.hidden = true;

  let contentArea = null;
  let searchSectionEl = null;

  function setView(view) {
    if (!contentArea) return;
    const normalizedView = ['list', 'map', 'split'].includes(view) ? view : 'split';
    contentArea.setAttribute('data-view', normalizedView);
    if (searchSectionEl) {
      searchSectionEl.setAttribute('data-view', normalizedView);
    }
    const toggleButtons = container.querySelectorAll('.view-toggle-btn');
    toggleButtons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.view === normalizedView);
    });
  }

  function getSelectedFilters() {
    const services = Array.from(container.querySelectorAll('.service-checkbox:checked'))
      .map((cb) => cb.value);
    const openNow = container.querySelector('.open-now-checkbox')?.checked || false;
    const radius = Number.parseInt(
      container.querySelector('#radius-select')?.value ?? `${config.searchRadius}`,
      10,
    ) || 0;
    return { services, openNow, radius };
  }

  function updateFilterMeta(stores) {
    const { services, openNow, radius } = getSelectedFilters();
    const summaryParts = [`Showing ${stores.length} of ${allStores.length}`];
    const chips = [];
    const currentView = contentArea?.getAttribute('data-view') || config.defaultView || 'split';
    chips.push(`${currentView.charAt(0).toUpperCase() + currentView.slice(1)} view`);
    if (userLocation) {
      if (radius > 0) {
        chips.push(`Within ${radius} ${config.units === 'km' ? 'km' : 'mi'}`);
        summaryParts.push(`within ${radius} ${config.units === 'km' ? 'km' : 'mi'}`);
      } else {
        chips.push('All distances');
        summaryParts.push('across all distances');
      }
    } else {
      chips.push('All distances');
    }
    if (openNow) {
      chips.push('Open now');
      summaryParts.push('Open now');
    }
    if (services.length > 0) {
      chips.push(`${services.length} filter${services.length === 1 ? '' : 's'}`);
      summaryParts.push(`${services.length} service filters`);
    }
    const accessibleText = summaryParts.join(' · ');
    const chipsMarkup = chips
      .map((chip) => `<span class="summary-chip">${escapeHtml(chip)}</span>`)
      .join('');
    resultsSummary.setAttribute('aria-label', accessibleText);
    resultsSummary.innerHTML = `
      <span class="summary-count">${escapeHtml(summaryParts[0])}</span>
      <span class="summary-chips" aria-hidden="true">${chipsMarkup}</span>
    `;
    resultsSummary.hidden = false;
  }

  /**
   * Render stores in the list
   * @param {Array} stores - Stores to render
   */
  function renderStores(stores) {
    // Adobe Commerce Best Practice: Build DOM fragment first
    const fragment = document.createDocumentFragment();

    if (stores.length === 0) {
      const noResults = document.createElement('p');
      noResults.classList.add('no-results');
      const { radius } = getSelectedFilters();
      if (userLocation && radius > 0) {
        noResults.textContent = `No stores found within ${radius} ${config.units === 'km' ? 'km' : 'mi'}. Try increasing radius or removing filters.`;
      } else {
        noResults.textContent = config.noResultsMessage;
      }
      fragment.appendChild(noResults);
    } else {
      stores.forEach((store) => {
        const card = renderStoreCard(store, {
          showDistance: config.showDistance,
          enablePhotos: config.enablePhotos,
          units: config.units,
          primaryCtaLabel: config.primaryCtaLabel,
        });
        fragment.appendChild(card);
      });
    }

    // Clear only non-spinner children to preserve overlay
    Array.from(listContainer.children).forEach((child) => {
      if (!child.classList.contains('loading-spinner')) {
        child.remove();
      }
    });

    // Insert new content before spinner (spinner stays on top as overlay)
    listContainer.insertBefore(fragment, loadingSpinner);
  }

  // Get saved preferences
  const prefs = loadPreferences();
  let currentSort = prefs.sortBy || 'distance';

  /**
   * Apply filters and sorting to stores
   * @param {Array} stores - Stores to process
   * @param {Array} services - Selected services
   * @param {boolean} openNow - Open now filter
   * @returns {Array} Processed stores
   */
  function applyFiltersAndSort(
    stores,
    services = [],
    openNow = false,
    radius = config.searchRadius,
  ) {
    let processed = filterStores(stores, services, openNow);
    processed = sortStores(processed, currentSort, userLocation);
    const radiusMiles = config.units === 'km' ? kmToMiles(radius) : radius;
    if (userLocation && Number.isFinite(radiusMiles) && radiusMiles > 0) {
      processed = processed.filter((store) => (
        typeof store.distance === 'number' && store.distance <= radiusMiles
      ));
    }
    return processed.slice(0, config.maxResults);
  }

  async function hydrateStoreDetails(store) {
    if (!store?.placeId) return store;
    if (store.richDetailsLoaded) return store;

    try {
      const enriched = await enrichStoreWithPlacesData(store, config, 'rich');
      allStores = allStores.map((entry) => (entry.id === enriched.id ? enriched : entry));
      filteredStores = filteredStores.map((entry) => (entry.id === enriched.id ? enriched : entry));
      return enriched;
    } catch (error) {
      console.error(`Unable to hydrate rich details for ${store.id}:`, error);
      return store;
    }
  }

  /**
   * Handle sort change
   * @param {string} sortBy - New sort criteria
   */
  function handleSortChange(sortBy) {
    currentSort = sortBy;
    const services = Array.from(container.querySelectorAll('.service-checkbox:checked'))
      .map((cb) => cb.value);
    const openNow = container.querySelector('.open-now-checkbox')?.checked || false;

    const radius = Number.parseInt(
      container.querySelector('#radius-select')?.value ?? `${config.searchRadius}`,
      10,
    ) || 0;
    filteredStores = applyFiltersAndSort(allStores, services, openNow, radius);
    renderStores(filteredStores);
    updateFilterMeta(filteredStores);
    trackStoreLocatorEvent('sort_change', { sortBy });

    // Update map if needed
    if (mapInstance && userLocation) {
      const fallback = { lat: 45.5231, lng: -122.6765 };
      const mapCenter = userLocation || filteredStores[0]?.address.coordinates || fallback;
      initializeMap(
        mapContainer,
        filteredStores,
        mapCenter,
        config.zoomLevel,
        mapInstance,
        hydrateStoreDetails,
        config,
      )
        .then((nextMapInstance) => { mapInstance = nextMapInstance; })
        .catch((error) => console.error('Map refresh failed:', error));
    }
  }

  /**
   * Handle search actions
   * @param {Object} searchData - Search data object
   */
  async function handleSearch(searchData) {
    if (searchData.type === 'geolocation') {
      // Show loading overlay without touching existing content
      showLoading(listContainer, loadingSpinner);

      try {
        userLocation = await getUserLocation();
        savePreferences({ lastLocation: userLocation });

        const services = searchData.services || [];
        const openNow = searchData.openNow || false;
        const radius = Number.isFinite(searchData.radius) ? searchData.radius : config.searchRadius;
        filteredStores = applyFiltersAndSort(allStores, services, openNow, radius);
        renderStores(filteredStores);
        updateFilterMeta(filteredStores);

        // Update map
        if (mapInstance) {
          initializeMap(
            mapContainer,
            filteredStores,
            userLocation,
            config.zoomLevel,
            mapInstance,
            hydrateStoreDetails,
            config,
          )
            .then((nextMapInstance) => { mapInstance = nextMapInstance; })
            .catch((error) => console.error('Map refresh failed:', error));
        }
      } catch (error) {
        const errorMsg = document.createElement('p');
        errorMsg.classList.add('error');
        errorMsg.textContent = 'Unable to access your location. Please enter an address manually.';
        // Build fragment to avoid layout shift
        const fragment = document.createDocumentFragment();
        fragment.appendChild(errorMsg);
        // Clear all children except spinner
        Array.from(listContainer.children).forEach((child) => {
          if (!child.classList.contains('loading-spinner')) {
            child.remove();
          }
        });
        listContainer.insertBefore(fragment, loadingSpinner);
      } finally {
        hideLoading(loadingSpinner);
      }
    } else if (searchData.type === 'address') {
      // Show loading overlay without touching existing content
      showLoading(listContainer, loadingSpinner);

      try {
        userLocation = await geocodeAddress(searchData.value, { signal });
        savePreferences({ lastLocation: userLocation });

        const services = searchData.services || [];
        const openNow = searchData.openNow || false;
        const radius = Number.isFinite(searchData.radius) ? searchData.radius : config.searchRadius;
        filteredStores = applyFiltersAndSort(allStores, services, openNow, radius);
        renderStores(filteredStores);
        updateFilterMeta(filteredStores);

        // Update map
        if (mapInstance) {
          initializeMap(
            mapContainer,
            filteredStores,
            userLocation,
            config.zoomLevel,
            mapInstance,
            hydrateStoreDetails,
            config,
          )
            .then((nextMapInstance) => { mapInstance = nextMapInstance; })
            .catch((error) => console.error('Map refresh failed:', error));
        }
      } catch (error) {
        console.error('Address search error:', error);
        // Show error message
        const errorMsg = document.createElement('p');
        errorMsg.classList.add('error');
        errorMsg.textContent = `Unable to geocode "${searchData.value}". Showing all stores (${allStores.length}):`;
        // Build fragment to avoid layout shift
        const fragment = document.createDocumentFragment();
        fragment.appendChild(errorMsg);
        // Clear all children except spinner
        Array.from(listContainer.children).forEach((child) => {
          if (!child.classList.contains('loading-spinner')) {
            child.remove();
          }
        });
        listContainer.insertBefore(fragment, loadingSpinner);

        // Still show stores below error
        filteredStores = allStores.slice(0, config.maxResults);
        renderStores(filteredStores);
        updateFilterMeta(filteredStores);
      } finally {
        hideLoading(loadingSpinner);
      }
    } else if (searchData.type === 'filter') {
      filteredStores = applyFiltersAndSort(
        allStores,
        searchData.services || [],
        searchData.openNow || false,
        Number.isFinite(searchData.radius) ? searchData.radius : config.searchRadius,
      );
      renderStores(filteredStores);
      updateFilterMeta(filteredStores);

      // Update map if needed
      if (mapInstance && userLocation) {
        initializeMap(
          mapContainer,
          filteredStores,
          userLocation,
          config.zoomLevel,
          mapInstance,
          hydrateStoreDetails,
          config,
        )
          .then((nextMapInstance) => { mapInstance = nextMapInstance; })
          .catch((error) => console.error('Map refresh failed:', error));
      }
    }
  }

  function handleViewChange(view) {
    setView(view);
  }

  // Search header (with dynamic services from actual data)
  searchSectionEl = createSearchSection(
    config,
    availableServices,
    handleSearch,
    handleSortChange,
    handleViewChange,
    googleMapsReadyPromise,
    signal,
  );
  searchSectionEl.appendChild(resultsSummary);
  container.appendChild(searchSectionEl);

  // Main content area
  contentArea = document.createElement('div');
  contentArea.classList.add('store-locator-content');
  contentArea.setAttribute('data-view', config.defaultView);

  contentArea.appendChild(listContainer);
  contentArea.appendChild(mapContainer);
  container.appendChild(contentArea);

  const mobileDefaultView = window.matchMedia('(max-width: 767px)').matches ? 'list' : null;
  const preferredView = prefs.preferredView || mobileDefaultView || config.defaultView || 'split';
  setView(preferredView);

  // Compact toolbar mode on scroll (desktop/tablet)
  let compactTicking = false;
  const updateCompactToolbar = () => {
    if (!searchSectionEl) return;
    const isWideViewport = window.matchMedia('(min-width: 1024px)').matches;
    const compactThreshold = searchSectionEl.offsetTop + 24;
    const shouldCompact = isWideViewport && window.scrollY > compactThreshold;
    searchSectionEl.classList.toggle('is-compact', shouldCompact);
  };

  const onCompactToolbarScroll = () => {
    if (compactTicking) return;
    compactTicking = true;
    window.requestAnimationFrame(() => {
      updateCompactToolbar();
      compactTicking = false;
    });
  };

  window.addEventListener('scroll', onCompactToolbarScroll, { passive: true, signal });
  window.addEventListener('resize', onCompactToolbarScroll, { passive: true, signal });
  updateCompactToolbar();

  // Replace block content
  block.innerHTML = '';
  block.appendChild(container);

  // Create persistent loading spinner overlay
  loadingSpinner = createLoadingSpinner();
  listContainer.appendChild(loadingSpinner);

  // Load and initialize stores
  try {
    // Show loading overlay
    showLoading(listContainer, loadingSpinner);

    // Stores already loaded at the top of decorate()

    // Try to get user location if auto-detect is enabled OR if we have saved location
    if (config.autoDetect || prefs.lastLocation) {
      try {
        // Use saved location if available, otherwise request new
        if (prefs.lastLocation && prefs.lastLocation.lat && prefs.lastLocation.lng) {
          userLocation = prefs.lastLocation;
          debugLog('Using saved location:', userLocation);
        } else {
          debugLog('🔍 Auto-detecting your location...');
          userLocation = await getUserLocation();
          savePreferences({ lastLocation: userLocation });
          debugLog('✅ Location detected:', userLocation);
        }
      } catch (err) {
        // Silently fall back - user may have denied permission
        debugLog('Geolocation not available, using default view');
      }
    }

    // Fallback to configured default location if no geolocation available
    if (!userLocation && config.defaultLocation) {
      try {
        userLocation = await geocodeAddress(config.defaultLocation, { signal });
      } catch (error) {
        console.warn(`Default location geocoding failed for "${config.defaultLocation}"`);
      }
    }

    // Apply saved filters
    const savedServices = prefs.selectedServices || [];
    const savedOpenNow = prefs.openNow || false;
    const savedRadius = Number.isFinite(Number(prefs.selectedRadius))
      ? Number(prefs.selectedRadius)
      : config.searchRadius;

    // Apply filters and sort
    filteredStores = applyFiltersAndSort(allStores, savedServices, savedOpenNow, savedRadius);

    // Render store list
    renderStores(filteredStores);
    updateFilterMeta(filteredStores);

    // Hide loading overlay
    hideLoading(loadingSpinner);

    // Load Google Maps dynamically if API key is provided
    if (config.googleMapsApiKey && config.mapProvider === 'google') {
      try {
        const mapsLoaded = await googleMapsReadyPromise;
        if (!mapsLoaded) {
          throw new Error('Google Maps failed to load');
        }

        // Enrich stores that have Place IDs using NEW Places API
        if (allStores.some((store) => store.requiresEnrichment)) {
          showLoading(listContainer, loadingSpinner);
          const detailLevel = config.placesDataMode === 'rich' ? 'rich' : 'lite';
          if (config.enrichOnLoad) {
            allStores = await enrichStoresWithPlacesData(allStores, config, detailLevel);
          }
          // Re-apply filters and sort (this recalculates distances with userLocation)
          filteredStores = applyFiltersAndSort(allStores, savedServices, savedOpenNow, savedRadius);
          renderStores(filteredStores);
          updateFilterMeta(filteredStores);
          hideLoading(loadingSpinner);
        }

        const fallback = { lat: 45.5231, lng: -122.6765 };
        const mapCenter = userLocation
          || filteredStores[0]?.address.coordinates || fallback;
        mapInstance = await initializeMap(
          mapContainer,
          filteredStores,
          mapCenter,
          config.zoomLevel,
          mapInstance,
          hydrateStoreDetails,
          config,
        );
      } catch (error) {
        console.error('Failed to load Google Maps:', error);
        const errorMsg = 'Unable to load map. Please check your API key and try again.';
        mapContainer.innerHTML = `<p class="map-placeholder">${errorMsg}</p>`;
      }
    } else {
      // No API key provided - show helpful message
      const fallback = { lat: 45.5231, lng: -122.6765 };
      const mapCenter = userLocation || filteredStores[0]?.address.coordinates || fallback;
      mapInstance = await initializeMap(
        mapContainer,
        filteredStores,
        mapCenter,
        config.zoomLevel,
        mapInstance,
        hydrateStoreDetails,
        config,
      );
    }
  } catch (error) {
    console.error('Store locator error:', error);
    const errorMsg = document.createElement('p');
    errorMsg.classList.add('error');
    errorMsg.textContent = 'Unable to load stores. Please try again later.';
    // Clear non-spinner children
    Array.from(listContainer.children).forEach((child) => {
      if (!child.classList.contains('loading-spinner')) {
        child.remove();
      }
    });
    listContainer.insertBefore(errorMsg, loadingSpinner);
    hideLoading(loadingSpinner);
  }

  const observer = new MutationObserver(() => {
    if (!document.body.contains(block)) {
      eventsController.abort();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
