// State
let currentFilter = '';
let feedData = null;

// DOM Elements
const feedList = document.querySelector('.feed-list');
const feedLoading = document.querySelector('.feed-loading');
const feedEmpty = document.querySelector('.feed-empty');
const itemCount = document.querySelector('.item-count');
const lastUpdated = document.querySelector('.last-updated');
const navLinks = document.querySelectorAll('.nav-link');

// Settings Elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModalBtn = document.getElementById('closeModal');
const cancelSettingsBtn = document.getElementById('cancelSettings');
const saveSettingsBtn = document.getElementById('saveSettings');
const telegramChannelsInput = document.getElementById('telegramChannels');
const themeToggle = document.getElementById('themeToggle');

// Fetch feed data
async function fetchFeed(source = '') {
  try {
    const url = source ? `/api/feed?source=${source}` : '/api/feed';
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching feed:', error);
    return null;
  }
}

// Format relative time
function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Format update timestamp
function formatUpdateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Extract domain from URL
function extractDomain(url) {
  if (!url) return null;
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return null;
  }
}

// Create feed item HTML
function createFeedItem(item, index) {
  const domain = item.meta.domain || extractDomain(item.url);
  const domainHtml = domain ? `<span class="item-domain">(${domain})</span>` : '';
  
  // Build meta parts
  const metaParts = [];
  
  // Source badge
  metaParts.push(`<span class="meta-source source-${item.source}">${item.sourceLabel}</span>`);
  
  // Upvotes/views
  if (item.meta.upvotes !== undefined) {
    metaParts.push(`<span>▲ ${item.meta.upvotes}</span>`);
  }
  
  // Comments
  if (item.meta.comments !== undefined) {
    metaParts.push(`<span>💬 ${item.meta.comments}</span>`);
  }
  
  // Author
  if (item.meta.author) {
    metaParts.push(`<span>by ${item.meta.author}</span>`);
  }
  
  // Channel (for Telegram)
  if (item.meta.channel) {
    metaParts.push(`<span>${item.meta.channel}</span>`);
  }
  
  // Time
  metaParts.push(`<span>${formatRelativeTime(item.postedAt)}</span>`);
  
  const li = document.createElement('li');
  li.className = 'feed-item';
  li.style.animationDelay = `${index * 30}ms`;
  
  // For Telegram posts: show full content and images
  const isTelegram = item.source === 'telegram';
  const showTitle = !isTelegram;
  
  // Get content HTML for Telegram (full content) or summary for others
  let contentHtml = '';
  if (isTelegram) {
    // Use full HTML content for Telegram posts, sanitized
    const fullContent = item.meta.fullTextHtml || item.meta.fullText || item.summary;
    contentHtml = `<div class="item-full-text telegram-content">${fullContent}</div>`;
  } else if (item.summary !== item.title || !showTitle) {
    contentHtml = `<p class="item-summary">${escapeHtml(item.summary)}</p>`;
  }
  
  // Build images HTML for Telegram posts
  let imagesHtml = '';
  if (isTelegram && item.meta.images && item.meta.images.length > 0) {
    const imageItems = item.meta.images.map((img, imgIndex) => 
      `<div class="image-tile" data-images='${JSON.stringify(item.meta.images)}' data-index="${imgIndex}">
        <img src="${img}" alt="Post image" loading="lazy">
      </div>`
    ).join('');
    imagesHtml = `<div class="item-images">${imageItems}</div>`;
  }
  
  li.innerHTML = `
    <div class="item-rank"></div>
    <div class="item-content">
      ${showTitle ? `<h3 class="item-title">
        <a href="${item.url || '#'}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>
        ${domainHtml}
      </h3>` : ''}
      ${contentHtml}
      ${imagesHtml}
      <div class="item-meta">
        ${metaParts.join('')}
      </div>
    </div>
  `;
  
  // Attach click handlers for image tiles
  if (isTelegram && item.meta.images && item.meta.images.length > 0) {
    li.querySelectorAll('.image-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const images = JSON.parse(tile.dataset.images);
        const startIndex = parseInt(tile.dataset.index, 10);
        openGallery(images, startIndex);
      });
    });
  }
  
  return li;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Render feed
function renderFeed(data) {
  feedLoading.style.display = 'none';
  feedList.innerHTML = '';
  
  if (!data || !data.items || data.items.length === 0) {
    feedEmpty.style.display = 'block';
    itemCount.textContent = '0 items';
    return;
  }
  
  feedEmpty.style.display = 'none';
  
  data.items.forEach((item, index) => {
    feedList.appendChild(createFeedItem(item, index));
  });
  
  // Update meta
  itemCount.textContent = `${data.filteredCount} items${data.filteredCount !== data.totalCount ? ` (of ${data.totalCount})` : ''}`;
  lastUpdated.textContent = `Updated: ${formatUpdateTime(data.lastUpdated)}`;
}

// Handle filter click
function handleFilterClick(e) {
  e.preventDefault();
  
  const filter = e.target.dataset.filter;
  
  // Update active state
  navLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.filter === filter);
  });
  
  currentFilter = filter;
  
  // Show loading
  feedLoading.style.display = 'flex';
  feedList.innerHTML = '';
  
  // Fetch and render
  fetchFeed(filter).then(data => {
    feedData = data;
    renderFeed(data);
  });
}

// Settings Modal Functions
async function fetchTelegramChannels() {
  try {
    const response = await fetch('/api/channels/telegram');
    const data = await response.json();
    return data.channels || [];
  } catch (error) {
    console.error('Error fetching channels:', error);
    return [];
  }
}

async function saveTelegramChannels(channels) {
  try {
    const response = await fetch('/api/channels/telegram', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channels }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error saving channels:', error);
    throw error;
  }
}

// Theme management
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  // Default to light theme
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    themeToggle.checked = true;
  }
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function openSettings() {
  settingsModal.classList.add('active');
  // Sync theme toggle with current state
  themeToggle.checked = document.body.classList.contains('dark-theme');
  fetchTelegramChannels().then(channels => {
    telegramChannelsInput.value = channels.join('\n');
  });
}

function closeSettings() {
  settingsModal.classList.remove('active');
}

async function saveSettings() {
  const channelsText = telegramChannelsInput.value;
  const channels = channelsText
    .split('\n')
    .map(ch => ch.trim())
    .filter(Boolean);
  
  try {
    saveSettingsBtn.textContent = 'Saving...';
    saveSettingsBtn.disabled = true;
    
    await saveTelegramChannels(channels);
    
    // Trigger a feed refresh
    await fetch('/api/refresh', { method: 'POST' });
    
    closeSettings();
    
    // Reload the feed
    feedLoading.style.display = 'flex';
    feedList.innerHTML = '';
    feedData = await fetchFeed(currentFilter);
    renderFeed(feedData);
  } catch (error) {
    alert('Failed to save settings: ' + error.message);
  } finally {
    saveSettingsBtn.textContent = 'Save & Refresh';
    saveSettingsBtn.disabled = false;
  }
}

// Initialize
async function init() {
  // Initialize theme (light by default)
  initTheme();
  
  // Initialize gallery
  initGallery();
  
  // Attach filter handlers
  navLinks.forEach(link => {
    link.addEventListener('click', handleFilterClick);
  });
  
  // Attach settings handlers
  settingsBtn.addEventListener('click', openSettings);
  closeModalBtn.addEventListener('click', closeSettings);
  cancelSettingsBtn.addEventListener('click', closeSettings);
  saveSettingsBtn.addEventListener('click', saveSettings);
  themeToggle.addEventListener('change', toggleTheme);
  
  // Close modal on overlay click
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettings();
    }
  });
  
  // Close modal on Escape key (handled by gallery for its own state)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsModal.classList.contains('active')) {
      closeSettings();
    }
  });
  
  // Initial load
  feedData = await fetchFeed();
  renderFeed(feedData);
  
  // Auto-refresh every 5 minutes (the server updates every 30 mins, but check more often for freshness)
  setInterval(async () => {
    const data = await fetchFeed(currentFilter);
    if (data) {
      feedData = data;
      renderFeed(data);
    }
  }, 5 * 60 * 1000);
}

// Image Gallery
let galleryImages = [];
let galleryIndex = 0;

function openGallery(images, startIndex = 0) {
  galleryImages = images;
  galleryIndex = startIndex;
  
  const gallery = document.getElementById('imageGallery');
  const galleryImage = document.getElementById('galleryImage');
  const galleryCounter = document.getElementById('galleryCounter');
  
  galleryImage.src = galleryImages[galleryIndex];
  galleryCounter.textContent = `${galleryIndex + 1} / ${galleryImages.length}`;
  
  // Show/hide navigation arrows based on image count
  document.getElementById('galleryPrev').style.display = galleryImages.length > 1 ? 'flex' : 'none';
  document.getElementById('galleryNext').style.display = galleryImages.length > 1 ? 'flex' : 'none';
  
  gallery.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeGallery() {
  const gallery = document.getElementById('imageGallery');
  gallery.classList.remove('active');
  document.body.style.overflow = '';
}

function navigateGallery(direction) {
  galleryIndex += direction;
  
  // Wrap around
  if (galleryIndex < 0) galleryIndex = galleryImages.length - 1;
  if (galleryIndex >= galleryImages.length) galleryIndex = 0;
  
  const galleryImage = document.getElementById('galleryImage');
  const galleryCounter = document.getElementById('galleryCounter');
  
  galleryImage.src = galleryImages[galleryIndex];
  galleryCounter.textContent = `${galleryIndex + 1} / ${galleryImages.length}`;
}

function initGallery() {
  const gallery = document.getElementById('imageGallery');
  const closeBtn = document.getElementById('galleryClose');
  const prevBtn = document.getElementById('galleryPrev');
  const nextBtn = document.getElementById('galleryNext');
  
  closeBtn.addEventListener('click', closeGallery);
  prevBtn.addEventListener('click', () => navigateGallery(-1));
  nextBtn.addEventListener('click', () => navigateGallery(1));
  
  // Close on overlay click
  gallery.addEventListener('click', (e) => {
    if (e.target === gallery || e.target.classList.contains('gallery-overlay')) {
      closeGallery();
    }
  });
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!gallery.classList.contains('active')) return;
    
    if (e.key === 'Escape') closeGallery();
    if (e.key === 'ArrowLeft') navigateGallery(-1);
    if (e.key === 'ArrowRight') navigateGallery(1);
  });
}

// Start
document.addEventListener('DOMContentLoaded', init);

