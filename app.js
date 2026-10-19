// public/app.js - IPTV UZ (Dedicated Live TV Streaming Platform)
document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_TELEGRAM_ID = '267256427'; // Faqat shu Telegram ID bot va ilova admini bo'la oladi

  // 1. Initialize Telegram WebApp SDK
  const tg = window.Telegram?.WebApp;
  let currentUserId = null;

  if (tg) {
    tg.ready();
    tg.expand();
    try {
      tg.setHeaderColor('#0b0e14');
      tg.setBackgroundColor('#0b0e14');
    } catch (e) {}

    if (tg.initDataUnsafe?.user?.id) {
      currentUserId = String(tg.initDataUnsafe.user.id);
    }
  }

  // Haptic Feedback helper
  function triggerHaptic(type = 'light') {
    try {
      if (tg?.HapticFeedback) {
        if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
        else if (type === 'warning') tg.HapticFeedback.notificationOccurred('warning');
        else tg.HapticFeedback.impactOccurred('light');
      }
    } catch (e) {}
  }

  // Toast Notification
  const toastBox = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');
  let toastTimer = null;

  function showToast(text, duration = 3000) {
    if (!toastBox || !toastMessage) return;
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.textContent = text;
    toastBox.style.display = 'block';
    toastTimer = setTimeout(() => {
      toastBox.style.display = 'none';
    }, duration);
  }

  // Header Close Button
  const closeBtn = document.getElementById('closeBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      triggerHaptic();
      if (tg && typeof tg.close === 'function') {
        tg.close();
      } else {
        showToast('Telegram ilovasi ichida to\'g\'ridan-to\'g\'ri yopiladi');
      }
    });
  }

  // State
  const state = {
    tvChannels: [],
    tvFilterGroup: 'all',
    tvSearch: '',
    currentPlayingChannel: null,
    hlsInstance: null,
    youtubeChannel: 'https://www.youtube.com/channel/UCAdY9HQG4Pf7_eLIQ6Tr3oA?sub_confirmation=1'
  };

  // DOM Elements - TV Player
  const tvVideoPlayer = document.getElementById('tvVideoPlayer');
  const tvPlayerContainer = document.getElementById('tvPlayerContainer');
  const tvCurrentChannelName = document.getElementById('tvCurrentChannelName');
  const tvPlayerLoading = document.getElementById('tvPlayerLoading');
  const tvRefreshBtn = document.getElementById('tvRefreshBtn');
  const tvFullscreenBtn = document.getElementById('tvFullscreenBtn');
  const headerFullscreenBtn = document.getElementById('headerFullscreenBtn');

  // DOM Elements - TV Channels List & Filters
  const tvChannelsGrid = document.getElementById('tvChannelsGrid');
  const tvSearchInput = document.getElementById('tvSearchInput');
  const tvClearSearchBtn = document.getElementById('tvClearSearchBtn');
  const tvFilterPills = document.querySelectorAll('.tv-filter-pill');

  // DOM Elements - Subscription Gate (YouTube Only)
  const subGateModal = document.getElementById('subGateModal');
  const gateYtLinkBtn = document.getElementById('gateYtLinkBtn');
  const gateVerifyBtn = document.getElementById('gateVerifyBtn');

  // DOM Elements - Admin Panel
  const appBrandHeader = document.getElementById('appBrandHeader');
  const menuDotsBtn = document.getElementById('menuDotsBtn');
  const adminModal = document.getElementById('adminModal');
  const adminModalCloseBtn = document.getElementById('adminModalCloseBtn');
  const formSettings = document.getElementById('formSettings');
  const cfgYtChannel = document.getElementById('cfgYtChannel');
  const cfgAdminPin = document.getElementById('cfgAdminPin');

  const adminPinModal = document.getElementById('adminPinModal');
  const adminPinInput = document.getElementById('adminPinInput');
  const adminPinSubmitBtn = document.getElementById('adminPinSubmitBtn');
  const adminPinCancelBtn = document.getElementById('adminPinCancelBtn');

  // Helper: Active User ID
  function getActiveUserId() {
    if (tg?.initDataUnsafe?.user?.id) return String(tg.initDataUnsafe.user.id);
    if (currentUserId) return String(currentUserId);
    return null;
  }

  // Helper: Admin Check
  function isOwnerAdmin() {
    const activeId = getActiveUserId();
    // Agar Telegramda ochilgan bo'lsa va ID 267256427 bo'lsa: ADMIN!
    if (activeId === ADMIN_TELEGRAM_ID) return true;

    // Begona Telegram foydalanuvchisi bo'lsa: ADMIN EMAS!
    if (activeId && activeId !== ADMIN_TELEGRAM_ID && activeId !== 'null') {
      localStorage.removeItem('dreamland_is_admin');
      return false;
    }

    // Brauzer / Desktop test rejimida PIN orqali saqlangan bo'lsa:
    return localStorage.getItem('dreamland_is_admin') === 'true';
  }

  // Update Admin Button Visibility
  if (menuDotsBtn) {
    menuDotsBtn.style.display = isOwnerAdmin() ? 'block' : 'none';
  }

  // =========================================================
  // 2. YOUTUBE MAJBURIY OBUNA (YOUTUBE-ONLY GATE)
  // =========================================================
  const DEFAULT_YT_CHANNEL = 'https://www.youtube.com/channel/UCAdY9HQG4Pf7_eLIQ6Tr3oA?sub_confirmation=1';
  function updateSubGateLinks() {
    const ytUrl = localStorage.getItem('dreamland_yt_channel') || DEFAULT_YT_CHANNEL;
    state.youtubeChannel = ytUrl;
    if (gateYtLinkBtn) {
      gateYtLinkBtn.href = ytUrl;
    }
    if (cfgYtChannel) {
      cfgYtChannel.value = ytUrl;
    }
  }

  function checkYouTubeSubscriptionGate() {
    const activeId = getActiveUserId();
    // Bosh admin uchun majburiy obuna so'ralmaydi
    if (activeId === ADMIN_TELEGRAM_ID) {
      if (subGateModal) subGateModal.style.display = 'none';
      return;
    }

    const isSubscribed = localStorage.getItem('dreamland_tv_sub') === 'true';
    if (!isSubscribed) {
      updateSubGateLinks();
      if (subGateModal) subGateModal.style.display = 'flex';
    } else {
      if (subGateModal) subGateModal.style.display = 'none';
    }
  }

  if (gateYtLinkBtn) {
    gateYtLinkBtn.addEventListener('click', () => {
      triggerHaptic('light');
    });
  }

  if (gateVerifyBtn) {
    gateVerifyBtn.addEventListener('click', () => {
      triggerHaptic('success');
      localStorage.setItem('dreamland_tv_sub', 'true');
      if (subGateModal) subGateModal.style.display = 'none';
      showToast('✅ YouTube kanalimizga obuna tasdiqlandi! Maroqli tomosha!');
    });
  }

  // =========================================================
  // 3. FULLSCREEN IMPLEMENTATION (Barcha ekranlar uchun)
  // =========================================================
  function isFullscreenActive() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }

  function toggleFullscreen() {
    triggerHaptic('light');

    // 1. Telegram Mini App to'liq ekrani (Android + iOS uchun asosiy yo'l)
    if (tg) {
      if (tg.isFullscreen) {
        if (typeof tg.exitFullscreen === 'function') {
          tg.exitFullscreen();
          return;
        }
      }
      if (typeof tg.requestFullscreen === 'function') {
        tg.requestFullscreen();
        return;
      }
    }

    // 2. Zaxira: Telegram bo'lmagan muhitlar uchun brauzer API'si
    const targetElement = tvPlayerContainer || tvVideoPlayer;

    if (!isFullscreenActive()) {
      if (targetElement.requestFullscreen) {
        targetElement.requestFullscreen().catch(() => {});
      } else if (targetElement.webkitRequestFullscreen) {
        targetElement.webkitRequestFullscreen();
      } else if (targetElement.mozRequestFullScreen) {
        targetElement.mozRequestFullScreen();
      } else if (targetElement.msRequestFullscreen) {
        targetElement.msRequestFullscreen();
      } else if (tvVideoPlayer && tvVideoPlayer.webkitEnterFullscreen) {
        // iOS Safari Native Video Fullscreen
        tvVideoPlayer.webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }

  if (headerFullscreenBtn) {
    headerFullscreenBtn.addEventListener('click', toggleFullscreen);
  }
  if (tvFullscreenBtn) {
    tvFullscreenBtn.addEventListener('click', toggleFullscreen);
  }

  // =========================================================
  // 4. TV VIDEO PLAYER & HLS STREAMING ENGINE
  // =========================================================
  function playTVChannel(channel) {
    if (!channel || !channel.url || !tvVideoPlayer) return;
    state.currentPlayingChannel = channel;

    if (tvCurrentChannelName) {
      tvCurrentChannelName.textContent = channel.title;
    }
    if (tvPlayerLoading) {
      tvPlayerLoading.style.display = 'flex';
    }

    // Active status styling on channel cards
    document.querySelectorAll('.tv-channel-card').forEach(c => {
      c.classList.toggle('playing', parseInt(c.dataset.id, 10) === channel.id);
    });

    // Sound is always enabled by default
    tvVideoPlayer.muted = false;
    tvVideoPlayer.volume = 1.0;

    // Helper to start playback with unmuted sound
    function startPlayback() {
      if (tvPlayerLoading) tvPlayerLoading.style.display = 'none';
      tvVideoPlayer.muted = false;
      tvVideoPlayer.volume = 1.0;
      const playPromise = tvVideoPlayer.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser requires user interaction for unmuted playback on initial load
          tvVideoPlayer.muted = true;
          tvVideoPlayer.play().then(() => {
            const unmuteOnTap = () => {
              tvVideoPlayer.muted = false;
              tvVideoPlayer.volume = 1.0;
              document.removeEventListener('click', unmuteOnTap);
              document.removeEventListener('touchstart', unmuteOnTap);
            };
            document.addEventListener('click', unmuteOnTap, { once: true, passive: true });
            document.addEventListener('touchstart', unmuteOnTap, { once: true, passive: true });
          }).catch(() => {});
        });
      }
    }

    // Clean up previous HLS instance
    if (state.hlsInstance) {
      state.hlsInstance.destroy();
      state.hlsInstance = null;
    }

    // Check Hls.js support
    if (window.Hls && window.Hls.isSupported()) {
      const hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 15,
        maxMaxBufferLength: 30
      });
      state.hlsInstance = hls;

      hls.loadSource(channel.url);
      hls.attachMedia(tvVideoPlayer);

      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        startPlayback();
      });

      hls.on(window.Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case window.Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case window.Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              if (tvPlayerLoading) tvPlayerLoading.style.display = 'none';
              hls.destroy();
              break;
          }
        }
      });
    } else if (tvVideoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari / iOS HLS
      tvVideoPlayer.src = channel.url;
      tvVideoPlayer.addEventListener('loadedmetadata', () => {
        startPlayback();
      }, { once: true });
    }
  }

  // Har qanday bosishda ovozni doimiy yoqiq saqlash
  function keepAudioEnabled() {
    if (tvVideoPlayer && tvVideoPlayer.muted) {
      tvVideoPlayer.muted = false;
      tvVideoPlayer.volume = 1.0;
    }
  }
  document.addEventListener('click', keepAudioEnabled, { passive: true });
  document.addEventListener('touchstart', keepAudioEnabled, { passive: true });

  // Refresh live stream
  if (tvRefreshBtn) {
    tvRefreshBtn.addEventListener('click', () => {
      triggerHaptic('light');
      showToast('🔄 Efir qayta yuklanmoqda...');
      if (state.currentPlayingChannel) {
        playTVChannel(state.currentPlayingChannel);
      }
    });
  }

  // =========================================================
  // 5. CHANNELS LIST, SEARCH & FILTER
  // =========================================================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderTVChannels() {
    if (!tvChannelsGrid) return;
    tvChannelsGrid.innerHTML = '';

    let filtered = state.tvChannels;
    if (state.tvFilterGroup !== 'all') {
      filtered = filtered.filter(c => c.group === state.tvFilterGroup);
    }

    if (state.tvSearch.trim()) {
      const q = state.tvSearch.toLowerCase().trim();
      filtered = filtered.filter(c => c.title.toLowerCase().includes(q) || (c.group && c.group.toLowerCase().includes(q)));
    }

    if (filtered.length === 0) {
      tvChannelsGrid.innerHTML = `
        <div class="empty-state-card" style="grid-column: 1 / -1;">
          <div class="empty-icon">📺</div>
          <div class="empty-title">Telekanal topilmadi</div>
          <div class="empty-desc">Qidiruv so'zini o'zgartirib ko'ring yoki boshqa toifani tanlang.</div>
        </div>
      `;
      return;
    }

    filtered.forEach(ch => {
      const card = document.createElement('div');
      card.className = 'tv-channel-card';
      card.dataset.id = ch.id;

      if (state.currentPlayingChannel && state.currentPlayingChannel.id === ch.id) {
        card.classList.add('playing');
      }

      const initials = ch.title.slice(0, 2).toUpperCase();
      const logoHtml = ch.logo
        ? `<img class="tv-logo-img" src="${ch.logo}" alt="${escapeHtml(ch.title)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><span class="tv-logo-fallback" style="display:none;">${initials}</span>`
        : `<span class="tv-logo-fallback">${initials}</span>`;

      card.innerHTML = `
        <div class="tv-logo-wrap">${logoHtml}</div>
        <div class="tv-meta">
          <div class="tv-title">${escapeHtml(ch.title)}</div>
          <div class="tv-category-tag">${ch.group || 'Jonli TV'}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        triggerHaptic('light');
        playTVChannel(ch);
      });

      tvChannelsGrid.appendChild(card);
    });
  }

  // Search input
  if (tvSearchInput) {
    tvSearchInput.addEventListener('input', (e) => {
      state.tvSearch = e.target.value;
      if (tvClearSearchBtn) {
        tvClearSearchBtn.style.display = state.tvSearch ? 'block' : 'none';
      }
      renderTVChannels();
    });
  }

  // Clear search button
  if (tvClearSearchBtn && tvSearchInput) {
    tvClearSearchBtn.addEventListener('click', () => {
      tvSearchInput.value = '';
      state.tvSearch = '';
      tvClearSearchBtn.style.display = 'none';
      renderTVChannels();
    });
  }

  // Category Filter Pills
  tvFilterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      triggerHaptic('light');
      tvFilterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.tvFilterGroup = pill.dataset.group;
      renderTVChannels();
    });
  });

  // Load Channels Data
  function loadTVChannels() {
    if (window.PRELOADED_CHANNELS && Array.isArray(window.PRELOADED_CHANNELS) && window.PRELOADED_CHANNELS.length > 0) {
      state.tvChannels = window.PRELOADED_CHANNELS;
    } else {
      // Fallback channels
      state.tvChannels = [
        { id: 4, title: "ZO‘R TV HD", group: "Milliy", url: "https://stream8.cinerama.uz/1016/tracks-v1a1/mono.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Zor_tv_logo.png/320px-Zor_tv_logo.png" },
        { id: 5, title: "Yoshlar", group: "Milliy", url: "https://stream8.cinerama.uz/1002/tracks-v1a1/mono.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Yoshlar_TV.png/320px-Yoshlar_TV.png" },
        { id: 6, title: "O‘zbekiston", group: "Milliy", url: "https://stream8.cinerama.uz/1001/tracks-v1a1/mono.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/O%CA%BBzbekiston_telekanali_logosi.png/320px-O%CA%BBzbekiston_telekanali_logosi.png" }
      ];
    }

    renderTVChannels();

    // Auto-play first channel (ZO'R TV HD or first in list)
    if (state.tvChannels.length > 0 && !state.currentPlayingChannel) {
      const defaultChannel = state.tvChannels.find(c => c.title.includes('ZO‘R TV') || c.title.includes("ZO'R TV")) || state.tvChannels[0];
      playTVChannel(defaultChannel);
    }
  }

  // =========================================================
  // 6. ADMIN AUTHENTICATION & MANAGEMENT (Faqat ID: 267256427)
  // =========================================================
  function populateAdminFields() {
    const savedYt = localStorage.getItem('dreamland_yt_channel') || DEFAULT_YT_CHANNEL;
    const savedPin = localStorage.getItem('dreamland_admin_pin') || '7777';
    if (cfgYtChannel) cfgYtChannel.value = savedYt;
    if (cfgAdminPin) cfgAdminPin.value = savedPin;
  }

  function openPinModal() {
    if (adminPinModal) {
      if (adminPinInput) adminPinInput.value = '';
      adminPinModal.style.display = 'flex';
      setTimeout(() => { if (adminPinInput) adminPinInput.focus(); }, 150);
    }
  }

  if (adminPinCancelBtn && adminPinModal) {
    adminPinCancelBtn.addEventListener('click', () => {
      adminPinModal.style.display = 'none';
    });
  }

  function verifyAdminPin() {
    const activeId = getActiveUserId();
    if (activeId && activeId !== ADMIN_TELEGRAM_ID && activeId !== 'null') {
      triggerHaptic('warning');
      showToast(`⛔ Ruxsat berilmadi! Faqat bot egasi (ID: 267256427) kira oladi.`);
      return;
    }

    const entered = adminPinInput ? adminPinInput.value.trim() : '';
    const currentPin = localStorage.getItem('dreamland_admin_pin') || '7777';

    if (entered === ADMIN_TELEGRAM_ID || entered === currentPin) {
      triggerHaptic('success');
      localStorage.setItem('dreamland_is_admin', 'true');
      if (menuDotsBtn) menuDotsBtn.style.display = 'block';
      if (adminPinModal) adminPinModal.style.display = 'none';
      populateAdminFields();
      if (adminModal) adminModal.style.display = 'flex';
      showToast('🔓 Admin huquqi tasdiqlandi (ID: 267256427)!');
    } else {
      triggerHaptic('warning');
      showToast('❌ Noto\'g\'ri Admin ID yoki PIN kod!');
    }
  }

  if (adminPinSubmitBtn) {
    adminPinSubmitBtn.addEventListener('click', verifyAdminPin);
  }
  if (adminPinInput) {
    adminPinInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') verifyAdminPin();
    });
  }

  // Triple tap on App Brand Header opens Admin Modal
  let brandTapCount = 0;
  let brandTapTimer = null;
  if (appBrandHeader) {
    appBrandHeader.addEventListener('click', () => {
      const activeId = getActiveUserId();
      if (activeId && activeId !== ADMIN_TELEGRAM_ID && activeId !== 'null') {
        triggerHaptic('warning');
        showToast(`⛔ Ruxsat yo'q! Sizning ID (${activeId}) admin emas.`);
        return;
      }

      brandTapCount++;
      if (brandTapTimer) clearTimeout(brandTapTimer);
      brandTapTimer = setTimeout(() => { brandTapCount = 0; }, 1800);

      if (brandTapCount >= 3) {
        brandTapCount = 0;
        triggerHaptic('light');

        if (activeId === ADMIN_TELEGRAM_ID) {
          if (menuDotsBtn) menuDotsBtn.style.display = 'block';
          populateAdminFields();
          if (adminModal) adminModal.style.display = 'flex';
          showToast('👑 Xush kelibsiz, Bosh Admin!');
        } else {
          openPinModal();
        }
      }
    });
  }

  if (menuDotsBtn && adminModal) {
    menuDotsBtn.addEventListener('click', () => {
      triggerHaptic('light');
      populateAdminFields();
      adminModal.style.display = 'flex';
    });
  }

  if (adminModalCloseBtn && adminModal) {
    adminModalCloseBtn.addEventListener('click', () => {
      adminModal.style.display = 'none';
    });
  }

  if (adminModal) {
    adminModal.addEventListener('click', (e) => {
      if (e.target === adminModal) adminModal.style.display = 'none';
    });
  }

  // Save Settings
  if (formSettings) {
    formSettings.addEventListener('submit', (e) => {
      e.preventDefault();
      triggerHaptic('success');

      const ytVal = cfgYtChannel ? cfgYtChannel.value.trim() : '';
      const pinVal = cfgAdminPin ? cfgAdminPin.value.trim() : '';

      if (ytVal) {
        state.youtubeChannel = ytVal;
        localStorage.setItem('dreamland_yt_channel', ytVal);
        if (gateYtLinkBtn) gateYtLinkBtn.href = ytVal;
      }

      if (pinVal) {
        localStorage.setItem('dreamland_admin_pin', pinVal);
      }

      showToast('✅ YouTube sozlamalari muvaffaqiyatli saqlandi!');
      if (adminModal) adminModal.style.display = 'none';
    });
  }

  // =========================================================
  // 7. INITIAL STARTUP
  // =========================================================
  updateSubGateLinks();
  checkYouTubeSubscriptionGate();
  loadTVChannels();
});