// app.js

const feeds = [
    { name: 'El País', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/ultimas-noticias/portada' },
    { name: 'El Mundo', url: 'https://e00-elmundo.uecdn.es/rss/portada.xml' },
    { name: 'El Diario', url: 'https://www.eldiario.es/rss' },
    { name: 'La Vanguardia', url: 'https://www.lavanguardia.com/rss/home.xml' },
    { name: 'El Periódico', url: 'https://www.elperiodico.com/es/cds/rss/?id=board.xml' },
    { name: 'ABC', url: 'https://www.abc.es/rss/2.0/portada/' },
    { name: 'El Español', url: 'https://www.elespanol.com/rss/' },
    { name: '20 Minutos', url: 'https://www.20minutos.es/rss/' },
    { name: 'Huff Post', url: 'https://www.huffingtonpost.es/feeds/index.xml' }
];

let currentFilter = 'all';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const AUTO_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

// Format relative time (e.g., "2 hours ago")
function getRelativeTime(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// Check if cache is valid
function isCacheValid() {
    const cacheTime = localStorage.getItem('headlinesCacheTime');
    if (!cacheTime) return false;

    const now = Date.now();
    return (now - parseInt(cacheTime)) < CACHE_DURATION;
}

// Load headlines from cache
function loadFromCache() {
    const cachedData = localStorage.getItem('headlinesCache');
    if (!cachedData) return null;

    try {
        return JSON.parse(cachedData);
    } catch (e) {
        console.error('Error parsing cache:', e);
        return null;
    }
}

// Save headlines to cache
function saveToCache(headlines) {
    localStorage.setItem('headlinesCache', JSON.stringify(headlines));
    localStorage.setItem('headlinesCacheTime', Date.now().toString());
}

// Display headlines from data
function displayHeadlines(headlinesData) {
    const headlinesContainer = document.getElementById('headlines');
    const filtersContainer = document.getElementById('filters');

    // Clear existing content
    headlinesContainer.innerHTML = '';

    // Clear existing filter buttons (except "All")
    const filterButtons = filtersContainer.querySelectorAll('.filter-btn:not([data-source="all"])');
    filterButtons.forEach(btn => btn.remove());

    // Create filter buttons and display headlines
    const sourcesAdded = new Set();

    headlinesData.forEach(({ feed, items }) => {
        // Create filter button for this source (only once per source)
        if (!sourcesAdded.has(feed.name)) {
            const filterBtn = document.createElement('button');
            filterBtn.className = 'filter-btn';
            filterBtn.textContent = feed.name;
            filterBtn.dataset.source = feed.name;
            filterBtn.addEventListener('click', () => filterBySource(feed.name));
            filtersContainer.appendChild(filterBtn);
            sourcesAdded.add(feed.name);
        }

        // Display headlines
        items.forEach(item => {
            const headlineDiv = document.createElement('div');
            headlineDiv.className = 'headline';
            headlineDiv.dataset.source = feed.name;

            // Source tag
            const sourceTag = document.createElement('span');
            sourceTag.className = 'source-tag';
            sourceTag.textContent = `[${feed.name}]`;

            // Headline link
            const link = document.createElement('a');
            link.href = item.link;
            link.textContent = item.title;
            link.target = '_blank';

            // Timestamp
            const timestamp = document.createElement('span');
            timestamp.className = 'timestamp';
            timestamp.textContent = getRelativeTime(item.pubDate);

            headlineDiv.appendChild(sourceTag);
            headlineDiv.appendChild(link);
            headlineDiv.appendChild(timestamp);
            headlinesContainer.appendChild(headlineDiv);
        });
    });
}

async function fetchHeadlines(useCache = true) {
    // Check cache first
    if (useCache && isCacheValid()) {
        console.log('Loading from cache...');
        const cachedData = loadFromCache();
        if (cachedData) {
            displayHeadlines(cachedData);
            return;
        }
    }

    console.log('Fetching fresh data...');
    const headlinesData = [];

    for (const feed of feeds) {
        try {
            const response = await fetch(
                `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`
            );
            const data = await response.json();

            headlinesData.push({
                feed: feed,
                items: data.items
            });

        } catch (error) {
            console.error(`Error fetching ${feed.name}:`, error);
        }
    }

    // Save to cache
    saveToCache(headlinesData);

    // Display headlines
    displayHeadlines(headlinesData);
}

function filterBySource(source) {
    currentFilter = source;

    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.source === source) {
            btn.classList.add('active');
        }
    });

    // Show/hide headlines
    document.querySelectorAll('.headline').forEach(headline => {
        if (source === 'all' || headline.dataset.source === source) {
            headline.classList.remove('hidden');
        } else {
            headline.classList.add('hidden');
        }
    });
}

// Initialize the "All" button
function initAllButton() {
    const allButton = document.querySelector('[data-source="all"]');
    if (allButton) {
        allButton.addEventListener('click', () => filterBySource('all'));
    }
}

// Dark mode toggle
function initDarkMode() {
    const toggle = document.getElementById('dark-mode-toggle');

    // Check for saved preference first (user's choice takes priority)
    const savedMode = localStorage.getItem('darkMode');

    // If no saved preference, check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Determine initial state
    let isDarkMode = false;
    if (savedMode === 'enabled') {
        isDarkMode = true;
    } else if (savedMode === 'disabled') {
        isDarkMode = false;
    } else {
        // No saved preference, use system preference
        isDarkMode = prefersDark;
    }

    // Apply dark mode if needed
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        toggle.textContent = '☼ Light Mode';
    } else {
        toggle.textContent = '◐ Dark Mode';
    }

    // Toggle dark mode on click
    toggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');

        if (document.body.classList.contains('dark-mode')) {
            toggle.textContent = '☼ Light Mode';
            localStorage.setItem('darkMode', 'enabled');
        } else {
            toggle.textContent = '◐ Dark Mode';
            localStorage.setItem('darkMode', 'disabled');
        }
    });

    // Optional: Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // Only auto-switch if user hasn't set a manual preference
        if (!localStorage.getItem('darkMode')) {
            if (e.matches) {
                document.body.classList.add('dark-mode');
                toggle.textContent = '☼ Light Mode';
            } else {
                document.body.classList.remove('dark-mode');
                toggle.textContent = '◐ Dark Mode';
            }
        }
    });
}

// Auto-refresh functionality
function initAutoRefresh() {
    setInterval(() => {
        console.log('Auto-refreshing headlines...');
        fetchHeadlines(false); // Force fresh fetch
    }, AUTO_REFRESH_INTERVAL);
}

// Initialize everything
initAllButton();
fetchHeadlines();
initDarkMode();
initAutoRefresh();
