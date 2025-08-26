(() => {
  'use strict';

  // ---------- Utilities ----------
  // PWA: 注册 Service Worker
  try {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }
  } catch (_) {}
  // 临时禁用升级/成长
  // const LEVELING_DISABLED = true; // 移除
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const nowMs = () => Date.now();
  const minutesBetween = (a, b) => Math.floor((a - b) / 60000);
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

  const speciesToEmoji = (species) => {
    switch (species) {
      case '猫猫': return '🐱';
      case '鱼鱼': return '🐠';
      case '白鸟': return '🕊️';
      case '狐狸': return '🦊';
      case '狗狗': return '🐕';
      case '兔子': return '🐰';
      case '仓鼠': return '🐹';
      case '龙龙': return '🐉';
      case '凤凰': return '🦅';
      case '熊猫': return '🐼';
      case '老虎': return '🐯';
      case '狮子': return '🦁';
      case '独角兽': return '🦄';
      case '精灵': return '🧚';
      case '天使': return '👼';
      case '恶魔': return '😈';
      case '鲛人': return '🧜';
      case '狼人': return '🐺';
      case '龙族': return '🐉';
      case '法师': return '🧙';
      case '战士': return '⚔️';
      case '射手': return '🏹';
      case '巫师': return '🔮';
      case '吸血鬼': return '🦇';
      case '月族': return '🌙';
      case '日族': return '☀️';
      default: return '✨';
    }
  };

  const levelToStage = (level) => {
    const l = Math.max(1, Math.min(3, Number(level) || 1));
    return l === 1 ? '幼年期' : l === 2 ? '成长期' : '成年期';
  };

  const speciesKey = (species) => {
    switch (species) {
      case '猫猫': return 'cat';
      case '鱼鱼': return 'fish';
      case '白鸟': return 'bird';
      case '狐狸': return 'fox';
      case '狗狗': return 'dog';
      case '兔子': return 'rabbit';
      case '仓鼠': return 'hamster';
      case '龙龙': return 'dragon';
      case '凤凰': return 'phoenix';
      case '熊猫': return 'panda';
      case '老虎': return 'tiger';
      case '狮子': return 'lion';
      case '独角兽': return 'unicorn';
      case '精灵': return 'elf';
      case '天使': return 'angel';
      case '恶魔': return 'demon';
      case '鲛人': return 'mermaid';
      case '狼人': return 'werewolf';
      case '龙族': return 'dragon';
      case '法师': return 'mage';
      case '战士': return 'warrior';
      case '射手': return 'archer';
      case '巫师': return 'wizard';
      case '吸血鬼': return 'vampire';
      case '月族': return 'moon';
      case '日族': return 'sun';
      default: return 'pet';
    }
  };

  function loadPetMedia(pet) {
    const key = pet.id;
    const videoEl = document.getElementById('pet-stage-video');
    const imgEl = document.getElementById('pet-stage-image');
    if (!videoEl || !imgEl) return;
    
    console.log('=== 开始加载OC媒体 ===');
    console.log('OCID:', key);
    
    // 优先：任意OC如果存在自定义媒体，则直接使用（覆盖预设OC）
    if (pet.customMedia && (pet.customMedia.dataUrl || pet.customMedia.mediaId)) {
      const useCustomMedia = async () => {
        try {
          let srcUrl = pet.customMedia.dataUrl || '';
          let mime = pet.customMedia.type || '';
          if (!srcUrl && pet.customMedia.mediaId) {
            // 从IndexedDB读取并创建objectURL
            const rec = await idbGetMedia(pet.customMedia.mediaId);
            if (rec && rec.blob) {
              if (objectUrlCache.has(pet.customMedia.mediaId)) {
                srcUrl = objectUrlCache.get(pet.customMedia.mediaId);
              } else {
                srcUrl = URL.createObjectURL(rec.blob);
                objectUrlCache.set(pet.customMedia.mediaId, srcUrl);
              }
              mime = rec.blob.type || mime;
            }
          }
          const isVideo = mime.startsWith('video/');
          const isGif = mime === 'image/gif' || (/\.gif(\?|$)/i.test(srcUrl));
        if (isVideo) {
            // 配置视频属性，确保在移动端/微信内可自动播放
          while (videoEl.firstChild) videoEl.removeChild(videoEl.firstChild);
          const source = document.createElement('source');
            source.src = srcUrl;
            source.type = mime || 'video/mp4';
          videoEl.appendChild(source);
          videoEl.muted = true;
            videoEl.setAttribute('muted', '');
          videoEl.playsInline = true;
            videoEl.setAttribute('playsinline', '');
            videoEl.setAttribute('webkit-playsinline', '');
            videoEl.autoplay = true;
          videoEl.loop = true;

            // 初始隐藏，待加载成功后再显示
            videoEl.style.display = 'none';
            imgEl.style.display = 'none';

            const onLoaded = () => {
              videoEl.style.display = 'block';
              imgEl.style.display = 'none';
              // 强制播放，若被策略阻止，则在首次点击时再尝试
              videoEl.play().catch((e) => {
                if (e && e.name === 'NotAllowedError') {
                  const tryPlay = () => { videoEl.play().catch(() => {}); document.removeEventListener('click', tryPlay); };
                  document.addEventListener('click', tryPlay, { once: true });
                }
              });
            };
            const onError = (e) => {
              console.log('自定义视频加载失败:', e);
              // 失败时尝试显示图片占位
              videoEl.style.display = 'none';
              imgEl.style.display = 'block';
              imgEl.src = 'assets/kong.png';
              imgEl.alt = pet.name;
            };
            videoEl.onloadeddata = onLoaded;
            videoEl.oncanplaythrough = () => { if (videoEl.paused) videoEl.play().catch(() => {}); };
            videoEl.onerror = onError;
            videoEl.load();
          } else if (isGif) {
            // GIF：直接作为img展示，可自动播放动画
            videoEl.style.display = 'none';
            imgEl.style.display = 'block';
            imgEl.src = srcUrl;
            imgEl.alt = pet.name;
        } else {
          videoEl.style.display = 'none';
          imgEl.style.display = 'block';
            imgEl.src = srcUrl;
          imgEl.alt = pet.name;
        }
        } catch (err) {
          console.error('加载自定义媒体失败:', err);
        }
      };
      useCustomMedia();
      return;
    }

    // 检查是否为自定义OC
    if (key.startsWith('custom-')) {
      // 自定义OC且无自定义媒体时使用kong.png图片
        videoEl.style.display = 'none';
        imgEl.style.display = 'block';
        imgEl.src = 'assets/kong.png';
        imgEl.alt = pet.name;
      return;
    }
    
    // 原有的固定OC媒体加载逻辑
    const base = `assets/${key}`;
    console.log('视频元素:', videoEl);
    console.log('图片元素:', imgEl);
    console.log('视频元素display:', videoEl.style.display);
    console.log('图片元素display:', imgEl.style.display);
    console.log('视频元素可见性:', window.getComputedStyle(videoEl).display);
    console.log('图片元素可见性:', window.getComputedStyle(imgEl).display);
    const altText = `${pet.species}`;
    videoEl.alt = altText;
    imgEl.alt = altText;
    
    // 初始不加载图片，避免无意义的 404；仅在失败/超时时回退到图片
    videoEl.style.display = 'none';
    imgEl.style.display = 'none';
    // 仅尝试 WebM 视频；失败或超时则回退 PNG 图片
    while (videoEl.firstChild) videoEl.removeChild(videoEl.firstChild);
    const srcCandidates = [];
    
    // 直接使用当前ID对应的文件
    srcCandidates.push(`${base}.webm`);
    
    console.log('视频源候选:', srcCandidates);
    console.log('当前OCID:', key);
    console.log('是否为pal前缀:', /^pal-/.test(key));
    
    for (const src of srcCandidates) {
      const s = document.createElement('source');
      s.src = src;
      s.type = 'video/webm';
      videoEl.appendChild(s);
    }
    try { videoEl.muted = true; videoEl.playsInline = true; } catch (_) {}
    videoEl.load();
    
    const toImageFallback = () => {
      console.log('回退到图片显示');
      videoEl.style.display = 'none';
      imgEl.style.display = 'block';
      console.log('视频元素display设置为:', videoEl.style.display);
      console.log('图片元素display设置为:', imgEl.style.display);
      loadPetImage(imgEl, key);
    };

    // 增加超时时间，给视频更多加载时间
    const videoTimeout = setTimeout(() => { toImageFallback(); }, 15000);

    videoEl.onerror = (e) => {
      console.log('视频加载失败:', e);
      console.log('视频错误详情:', videoEl.error);
      clearTimeout(videoTimeout);
      toImageFallback();
    };

    videoEl.onloadeddata = () => {
      console.log('视频加载成功，开始播放');
      console.log('设置视频显示为block');
      clearTimeout(videoTimeout);
      videoEl.style.display = 'block';
      imgEl.style.display = 'none';
      console.log('视频元素display设置为:', videoEl.style.display);
      console.log('图片元素display设置为:', imgEl.style.display);
      setTimeout(() => { initMediaBgControls(); }, 100);
      
      // 确保视频能够持续播放
      const playVideo = async () => {
        try { 
          await videoEl.play();
          console.log('视频开始播放成功');
        }
        catch (e) {
          console.log('视频播放失败:', e);
          if (e.name === 'NotAllowedError') {
            const playOnClick = () => { videoEl.play().catch(() => {}); document.removeEventListener('click', playOnClick); };
            document.addEventListener('click', playOnClick, { once: true });
          }
        }
      };
      playVideo();
      
      const videoSrc = videoEl.currentSrc || (videoEl.querySelector('source')?.src) || videoEl.src;
      if (videoSrc && /\.webm(\?|$)/i.test(videoSrc)) { videoEl.classList.add('video-bg-normal'); }
      else { videoEl.classList.add('video-bg-multiply'); }
      videoEl.style.backgroundColor = 'transparent';
    };

    // 确保视频完全加载后再开始播放
    videoEl.oncanplaythrough = () => {
      console.log('视频完全加载，可以流畅播放');
      // 如果视频还没有开始播放，尝试播放
      if (videoEl.paused) {
        videoEl.play().catch(e => console.log('自动播放失败:', e));
      }
    };
    
    videoEl.onended = () => {
      console.log('视频播放结束，重新开始播放');
      videoEl.currentTime = 0;
      // 确保视频继续循环播放
      videoEl.play().catch((e) => {
        console.log('重新播放失败:', e);
        // 如果重新播放失败，延迟后重试
        setTimeout(() => {
          videoEl.play().catch(() => {
            console.log('重试播放也失败，保持视频显示');
          });
        }, 100);
      });
    };

    setTimeout(() => { initMediaBgControls(); }, 100);
  }

  function loadPetImage(imgEl, key) {
    if (!imgEl) return;
    
    console.log('=== 开始加载OC图片 ===');
    console.log('OCID:', key);
    
    const base = `assets/${key}`;
    imgEl.alt = key;
    imgEl.onerror = null;
    
    // 直接使用当前ID对应的文件
    console.log('尝试加载图片:', base + '.png');
    imgEl.onerror = () => {
      console.log('图片加载失败，使用kong.png');
      imgEl.onerror = null;
      imgEl.src = 'assets/kong.png';
    };
    imgEl.onload = () => {
      console.log('图片加载成功:', imgEl.src);
      console.log('图片元素display:', imgEl.style.display);
      console.log('图片元素可见性:', window.getComputedStyle(imgEl).display);
    };
    imgEl.src = `${base}.png`;
  }

  // 生成OC SVG Data URL（根据物种与等级出不同配色与装饰）
  function generatePetSvg(key) {
    const palette = {
      'cat': ['#f472b6', '#60a5fa'],
      'fish': ['#22d3ee', '#06b6d4'],
      'bird': ['#fbbf24', '#f59e0b'],
      'fox': ['#f97316', '#ea580c'],
      'dog': ['#8b5cf6', '#a855f7'],
      'rabbit': ['#ec4899', '#f472b6'],
      'hamster': ['#f59e0b', '#d97706'],
      'dragon': ['#dc2626', '#7c2d12'],
      'phoenix': ['#f59e0b', '#dc2626'],
      'panda': ['#000000', '#ffffff'],
      'tiger': ['#f59e0b', '#92400e'],
      'lion': ['#fbbf24', '#d97706'],
      'unicorn': ['#a78bfa', '#c084fc'],
      'elf': ['#34d399', '#10b981'],
      'angel': ['#fbbf24', '#f3f4f6'],
      'demon': ['#7c2d12', '#dc2626'],
      'mermaid': ['#22d3ee', '#06b6d4'],
      'werewolf': ['#8b5cf6', '#a855f7'],
      'mage': ['#8b5cf6', '#c084fc'],
      'warrior': ['#dc2626', '#f59e0b'],
      'archer': ['#fbbf24', '#d97706'],
      'wizard': ['#a78bfa', '#7c3aed'],
      'vampire': ['#7c2d12', '#dc2626'],
      'moon': ['#8b5cf6', '#a78bfa'],
      'sun': ['#fbbf24', '#f59e0b'],
      'pet': ['#60a5fa', '#34d399'],
      '默认': ['#60a5fa', '#34d399']
    };
    const [c1, c2] = (palette[key] || palette['默认']);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <circle cx="64" cy="64" r="44" fill="url(#g)"/>
    <circle cx="48" cy="56" r="6" fill="#0b1020"/>
    <circle cx="80" cy="56" r="6" fill="#0b1020"/>
    <path d="M40 78C48 82 80 82 88 78" stroke="#0b1020" stroke-width="6" stroke-linecap="round"/>
  </g>
</svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  // ---------- Persistence ----------
  const STORAGE_KEY = 'oc-pet-system/v1';
  const DEFAULT_STATE = { pets: [], selectedPetId: null };
  // 大媒体文件的临时URL缓存，避免重复创建
  const objectUrlCache = new Map(); // key -> objectURL

  // ---------- IndexedDB for Media (images/videos) ----------
  let mediaDbPromise = null;
  function openMediaDb() {
    if (mediaDbPromise) return mediaDbPromise;
    mediaDbPromise = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open('oc-pet-media', 1);
        req.onupgradeneeded = (e) => {
          const db = req.result;
          if (!db.objectStoreNames.contains('media')) {
            db.createObjectStore('media', { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
    return mediaDbPromise;
  }

  async function idbSaveMedia(id, blob, meta = {}) {
    const db = await openMediaDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('media', 'readwrite');
      const store = tx.objectStore('media');
      const rec = { id, blob, meta, updatedAt: Date.now() };
      const req = store.put(rec);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbGetMedia(id) {
    const db = await openMediaDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('media', 'readonly');
      const store = tx.objectStore('media');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  function dataUrlToBlob(dataUrl) {
    const [header, data] = dataUrl.split(',');
    const mime = (header.match(/data:(.*?);base64/) || [])[1] || 'application/octet-stream';
    const bytes = atob(data);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  // 四只固定OC的初始定义，id写死
  const ALL_PETS = [
    { id: 'pal-001', name: '可可', species: '猫猫' },
    { id: 'pal-002', name: '小鱼', species: '鱼鱼' },
    { id: 'pal-003', name: '小白', species: '白鸟' },
    { id: 'pal-004', name: '玖玖', species: '狐狸' }
  ];

  // 配置
  const PASSWORDS = {
    'K9mN7pQ2x': [0, 1],      
    'R8vL5hJ9w': [0, 2],       
    'T3yU6kM4z': [0, 3],      
    'X7bN2qP8m': [0, 1, 2, 3] 
  };



  let currentPets = []; // 当前显示的OC列表

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      console.log('loadState: 从localStorage读取的原始数据:', raw);
      
      if (!raw) {
        console.log('loadState: 没有找到数据，返回默认状态');
        return { ...DEFAULT_STATE };
      }
      
      const data = JSON.parse(raw);
      console.log('loadState: 解析后的数据:', data);
      
      if (!data || !Array.isArray(data.pets)) {
        console.log('loadState: 数据格式无效，返回默认状态');
        return { ...DEFAULT_STATE };
      }
      
      // 迁移：将旧的 pet- 前缀统一迁移为 pal-
      const migratedPets = data.pets.map((p) => {
        if (typeof p.id === 'string' && /^pet-/.test(p.id)) {
          return { ...p, id: `pal-${p.id.slice(4)}` };
        }
        return p;
      });
      
      let migratedSelected = data.selectedPetId ?? null;
      if (typeof migratedSelected === 'string' && /^pet-/.test(migratedSelected)) {
        migratedSelected = `pal-${migratedSelected.slice(4)}`;
      }
      
      console.log('loadState: 迁移后的OC列表:', migratedPets);
      console.log('loadState: 迁移后的选中ID:', migratedSelected);
      
      return { pets: migratedPets, selectedPetId: migratedSelected };
    } catch (error) {
      console.error('loadState: 解析数据时出错:', error);
      return { ...DEFAULT_STATE };
    }
  }

  function saveState(state) {
    console.log('saveState: 保存状态到localStorage:', state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    console.log('saveState: 状态已保存');
  }

  // ---------- Domain ----------
  function createPet({ id, name, species }) {
    const timestamp = nowMs();
    return {
      id: id || uid(),
      name: name.trim(),
      species,
      hunger: 30,
      happiness: 70,
      energy: 70,
      cleanliness: 80,
      xp: 0, // 新增：亲密值
      stage: '',
      lastUpdated: timestamp
    };
  }

  function applyTimeDelta(pet, minutes) {
    if (minutes <= 0) return pet;
    const hungerDelta = +1.0 * minutes;
    const energyDelta = -0.5 * minutes;
    const cleanlinessDelta = -0.3 * minutes;
    const happinessDelta = (pet.hunger > 70 ? -0.5 : -0.2) * minutes;
    const xpDelta = -0.1 * minutes; // 新增：亲密值时间衰减
    return {
      ...pet,
      hunger: clamp(pet.hunger + hungerDelta, 0, 100),
      energy: clamp(pet.energy + energyDelta, 0, 100),
      cleanliness: clamp(pet.cleanliness + cleanlinessDelta, 0, 100),
      happiness: clamp(pet.happiness + happinessDelta, 0, 100),
      xp: clamp(pet.xp + xpDelta, 0, 999), // 新增：亲密值变化，最高999
      lastUpdated: pet.lastUpdated + minutes * 60000
    };
  }

  const ACTIONS = {
    feed(pet) {
      return {
        ...pet,
        hunger: clamp(pet.hunger - 20, 0, 100),
        happiness: clamp(pet.happiness + 5, 0, 100),
        xp: clamp(pet.xp + 3, 0, 999) // 新增：喂食获得3亲密值
      };
    },
    play(pet) {
      return {
        ...pet,
        happiness: clamp(pet.happiness + 15, 0, 100),
        energy: clamp(pet.energy - 15, 0, 100),
        cleanliness: clamp(pet.cleanliness - 10, 0, 100),
        xp: clamp(pet.xp + 5, 0, 999) // 新增：玩耍获得5亲密值
      };
    },
    sleep(pet) {
      return {
        ...pet,
        energy: clamp(pet.energy + 25, 0, 100),
        hunger: clamp(pet.hunger + 10, 0, 100),
        xp: clamp(pet.xp + 2, 0, 999) // 新增：睡觉获得2亲密值
      };
    },
    clean(pet) {
      return {
        ...pet,
        cleanliness: clamp(pet.cleanliness + 40, 0, 100),
        xp: clamp(pet.xp + 4, 0, 999) // 新增：清洁获得4亲密值
      };
    }
  };

  // ---------- DOM ----------
  const $ = (sel) => document.querySelector(sel);
  const listEl = $('#pet-list');
  const emptyStateEl = $('#empty-state');
  const detailEl = $('#pet-detail');
  // 删除创建入口

  const nameEl = $('#pet-name');
  const speciesEl = $('#pet-species');
  const levelEl = $('#pet-level');
  const avatarEl = $('#pet-avatar');
  const lastUpdatedEl = $('#last-updated');

  const hungerBar = $('#stat-hunger');
  const happinessBar = $('#stat-happiness');
  const energyBar = $('#stat-energy');
  const cleanlinessBar = $('#stat-cleanliness');
  const xpBar = $('#stat-xp');
  const hungerText = $('#stat-hunger-text');
  const happinessText = $('#stat-happiness-text');
  const energyText = $('#stat-energy-text');
  const cleanlinessText = $('#stat-cleanliness-text');
  const xpText = $('#stat-xp-text');

  const feedBtn = $('#feed-btn');
  const playBtn = $('#play-btn');
  const sleepBtn = $('#sleep-btn');
  const cleanBtn = $('#clean-btn');
  const renameBtn = $('#rename-btn');
  const createPetBtn = $('#create-pet-btn');
  const actionsPanel = document.querySelector('.pet-stage .actions-panel');
  // 不允许释放固定OC

  // 新建OC对话框相关元素
  const createPetDialog = $('#create-pet-dialog');
  const createPetName = $('#create-pet-name');
  const createPetSpecies = $('#create-pet-species');
  const createPetStage = $('#create-pet-stage');
  const createPetSave = $('#create-pet-save');
  const createPetCancel = $('#create-pet-cancel');

  // ---------- State ----------
  let state = loadState();
  let petListExpanded = false; // 新增：OC列表展开状态

  // 控制新建OC按钮的显示状态
  function updateCreatePetButtonVisibility() {
    const createPetBtn = document.getElementById('create-pet-btn');
    if (createPetBtn) {
      // 检查当前口令是否解锁了全部OC
      const currentPassword = localStorage.getItem('oc-pet-password');
      console.log('检查新建OC按钮显示状态，当前口令:', currentPassword);
      
      // 检查是否解锁了全部OC（索引包含0,1,2,3）
      const hasFullAccess = currentPassword && PASSWORDS[currentPassword] && 
                           PASSWORDS[currentPassword].length === 4 && 
                           PASSWORDS[currentPassword].includes(0) && 
                           PASSWORDS[currentPassword].includes(1) && 
                           PASSWORDS[currentPassword].includes(2) && 
                           PASSWORDS[currentPassword].includes(3);
      
      console.log('是否解锁全部OC:', hasFullAccess);
      
      // 当解锁全部OC时显示新建OC按钮
      if (hasFullAccess) {
        createPetBtn.style.display = 'block';
        console.log('显示新建OC按钮');
      } else {
        createPetBtn.style.display = 'none';
        console.log('隐藏新建OC按钮');
      }
    } else {
      console.log('未找到新建OC按钮元素');
    }
  }

  // 保证固定OC存在（ID固定，名称/种族/时期可编辑不影响ID和外观），同时保留自定义OC
  function ensureFixedPets(stateIn) {
    console.log('ensureFixedPets 被调用，currentPets:', currentPets);
    console.log('输入的stateIn:', stateIn);
    console.log('stateIn.pets:', stateIn.pets);
    
    if (currentPets.length === 0) {
      console.log('currentPets 为空，返回空状态');
      return { pets: [], selectedPetId: null };
    }
    
    const existingById = new Map((stateIn.pets || []).map((p) => [p.id, p]));
    console.log('existingById Map:', existingById);
    
    // 处理固定OC
    const fixedPets = currentPets.map((tpl) => {
      const src = existingById.get(tpl.id) || {};
      return {
        id: tpl.id,
        name: typeof src.name === 'string' ? src.name : tpl.name,
        species: typeof src.species === 'string' ? src.species : tpl.species,
        hunger: clamp(typeof src.hunger === 'number' ? src.hunger : 30, 0, 100),
        happiness: clamp(typeof src.happiness === 'number' ? src.happiness : 70, 0, 100),
        energy: clamp(typeof src.energy === 'number' ? src.energy : 70, 0, 100),
        cleanliness: clamp(typeof src.cleanliness === 'number' ? src.cleanliness : 80, 0, 100),
        xp: clamp(typeof src.xp === 'number' ? src.xp : 0, 0, 999), // 新增：亲密值
        stage: typeof src.stage === 'string' ? src.stage : '',
        lastUpdated: typeof src.lastUpdated === 'number' ? src.lastUpdated : nowMs(),
        // 保留自定义媒体（允许预设OC覆盖显示上传媒体）
        customMedia: src.customMedia ? { ...src.customMedia } : undefined,
      };
    });
    
    // 保留自定义OC（ID以custom-开头的OC）
    const customPets = (stateIn.pets || []).filter((p) => p.id && p.id.startsWith('custom-'));
    console.log('找到的自定义OC:', customPets);
    
    // 合并固定OC和自定义OC
    const allPets = [...fixedPets, ...customPets];
    
    console.log('生成的OC数据:', allPets);
    console.log('固定OC数量:', fixedPets.length);
    console.log('自定义OC数量:', customPets.length);
    
    // 选择逻辑：优先选择已选中的OC，如果没有则选择第一个固定OC
    let selectedPetId = stateIn.selectedPetId;
    if (!selectedPetId || !allPets.some((p) => p.id === selectedPetId)) {
      selectedPetId = allPets.length > 0 ? allPets[0].id : null;
    }
    
    console.log('最终选择的OCID:', selectedPetId);
    return { pets: allPets, selectedPetId };
  }

  // 迁移：将历史 pet- 前缀 ID 平滑迁移为 pal- 前缀
  function migratePetIdsToPal(stateIn) {
    const migrated = (stateIn.pets || []).map((p) => {
      if (typeof p.id === 'string' && /^pet-\d+/.test(p.id)) {
        return { ...p, id: 'pal-' + p.id.slice(4) };
      }
      return p;
    });
    let selected = stateIn.selectedPetId;
    if (typeof selected === 'string' && /^pet-\d+/.test(selected)) {
      selected = 'pal-' + selected.slice(4);
    }
    return { pets: migrated, selectedPetId: selected };
  }

  // 初始化：检查是否已经输入过口令
  const savedPassword = localStorage.getItem('oc-pet-password');
  if (savedPassword && PASSWORDS[savedPassword]) {
    // 如果已经输入过口令，直接进入系统
    console.log('检测到已保存的口令:', savedPassword);
    const petIndices = PASSWORDS[savedPassword];
    currentPets = petIndices.map(index => ALL_PETS[index]);
    state = migratePetIdsToPal(state);
    state = ensureFixedPets(state);
    state.pets = state.pets.map((pet) => applyTimeDelta(pet, minutesBetween(nowMs(), pet.lastUpdated)));
    saveState(state);
    
    // 直接显示主界面
    document.getElementById('password-screen').style.display = 'none';
    document.getElementById('app').style.display = 'grid';
    
    // 渲染界面
    render();
    
    // 初始化新建OC按钮的显示状态
    updateCreatePetButtonVisibility();
  } else {
    // 第一次进入，等待口令输入
    currentPets = [];
    state = migratePetIdsToPal(state);
    state = ensureFixedPets(state);
    state.pets = state.pets.map((pet) => applyTimeDelta(pet, minutesBetween(nowMs(), pet.lastUpdated)));
    saveState(state);
  }

  // 自动修复历史数据：加载时为每只OC补 id
  state.pets = state.pets.map((pet, idx) => {
    if (!pet.id) {
      pet.id = uid();
      // 控制台提示
      console.warn('OC缺少id，已自动生成。请将原有资源文件重命名为：', pet.id);
    }
    return pet;
  });
  saveState(state);

  // ---------- Rendering ----------
  function render() {
    console.log('开始渲染，当前状态:', state);
    console.log('emptyStateEl:', emptyStateEl);
    console.log('detailEl:', detailEl);
    console.log('detailEl的hidden类:', detailEl?.classList.contains('hidden'));
    
    renderPetList();
    if (!state.selectedPetId) {
      console.log('没有选中的OC，显示空状态');
      emptyStateEl.classList.remove('hidden');
      detailEl.classList.add('hidden');
      return;
    }
    const pet = state.pets.find((p) => p.id === state.selectedPetId);
    if (!pet) {
      console.log('找不到选中的OC，重置选择');
      state.selectedPetId = null;
      saveState(state);
      render();
      return;
    }
    console.log('渲染OC详情:', pet);
    emptyStateEl.classList.add('hidden');
    detailEl.classList.remove('hidden');
    console.log('移除hidden类后，detailEl的hidden类:', detailEl?.classList.contains('hidden'));
    
    // 测试：强制显示元素
    if (detailEl) {
      detailEl.style.display = 'block';
      detailEl.style.visibility = 'visible';
      console.log('强制设置detailEl为可见');
    }
    
    renderPetDetail(pet);
    
    // 更新新建OC按钮的显示状态
    updateCreatePetButtonVisibility();
  }

  function renderPetList() {
    if (!listEl) return;
    
    // 清空现有内容
    listEl.innerHTML = '';
    
    // 创建OC列表
    const petListUl = document.createElement('ul');
    petListUl.className = 'pet-sub-list';

    // 显示当前口令对应的OC
    state.pets.forEach((pet) => {
      const li = document.createElement('li');
      li.className = 'pet-item' + (pet.id === state.selectedPetId ? ' active' : '');
      li.title = `${pet.name}（${pet.species}）`;

      const emoji = document.createElement('div');
      emoji.className = 'pet-emoji';
      emoji.textContent = speciesToEmoji(pet.species);

      const main = document.createElement('div');
      main.className = 'pet-item-main';

      const name = document.createElement('div');
      name.className = 'pet-item-name';
      name.textContent = pet.name;

      main.appendChild(name);

      li.appendChild(emoji);
      li.appendChild(main);

      li.addEventListener('click', () => {
        state.selectedPetId = pet.id;
        saveState(state);
        render();
      });

      petListUl.appendChild(li);
    });

    // 直接放入主列表（移除顶部展开功能）
    listEl.appendChild(petListUl);
  }

  function formatTime(ts) {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  }

  function updateStatsUI(pet) {
    const hungerPercent = pet.hunger;
    const happinessPercent = pet.happiness;
    const energyPercent = pet.energy;
    const cleanlinessPercent = pet.cleanliness;
    const xpPercent = Math.min(100, (pet.xp / 100) * 100); // 亲密值显示为百分比

    // 更新进度条宽度
    hungerBar.style.width = `${hungerPercent}%`;
    happinessBar.style.width = `${happinessPercent}%`;
    energyBar.style.width = `${energyPercent}%`;
    cleanlinessBar.style.width = `${cleanlinessPercent}%`;
    xpBar.style.width = `${xpPercent}%`;

    // 低值警告
    hungerBar.classList.toggle('low', hungerPercent < 30);
    happinessBar.classList.toggle('low', happinessPercent < 30);
    energyBar.classList.toggle('low', energyPercent < 30);
    cleanlinessBar.classList.toggle('low', cleanlinessPercent < 30);
    xpBar.classList.toggle('low', xpPercent < 30);

    // 数值文本
    hungerText.textContent = `${Math.round(pet.hunger)}`;
    happinessText.textContent = `${Math.round(pet.happiness)}`;
    energyText.textContent = `${Math.round(pet.energy)}`;
    cleanlinessText.textContent = `${Math.round(pet.cleanliness)}`;
    xpText.textContent = `${Math.round(pet.xp)}`; // 显示实际亲密值

    // 更新时间
    lastUpdatedEl.textContent = `${formatTime(pet.lastUpdated)}`;
  }

  function renderPetDetail(pet) {
    nameEl.textContent = pet.name;
    speciesEl.textContent = pet.species;
    // 若无时期则隐藏 pill，避免出现空内容的小粉条
    const hasStage = Boolean(pet.stage && pet.stage.trim());
    levelEl.textContent = hasStage ? pet.stage : '';
    if (hasStage) {
      levelEl.classList.remove('hidden');
      levelEl.style.display = '';
    } else {
      levelEl.classList.add('hidden');
      levelEl.style.display = 'none';
    }
    // 顶部头像：有自定义媒体则优先显示；否则预设OC显示固定emoji
    if (avatarEl) {
      // 统一头像容器：正方形裁剪区域
      try {
        avatarEl.style.aspectRatio = '1 / 1';
        avatarEl.style.overflow = 'hidden';
        avatarEl.style.display = 'block';
      } catch (_) {}
        if (pet.customMedia && pet.customMedia.dataUrl) {
        // 有上传的图片，创建img元素显示（覆盖预设OC）
          avatarEl.innerHTML = '';
          const img = document.createElement('img');
          img.src = pet.customMedia.dataUrl;
          img.alt = pet.name;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          // 保持方形裁剪效果
          img.style.display = 'block';
          avatarEl.appendChild(img);
          avatarEl.title = `${pet.name} (${pet.species})`;
      } else if (pet.id.startsWith('pal-')) {
        // 预设宠物：根据ID显示固定的头像
        const avatarMap = {
          'pal-001': '🐱',
          'pal-002': '🐠',
          'pal-003': '🕊️',
          'pal-004': '🦊'
        };
        avatarEl.textContent = avatarMap[pet.id] || '✨';
          avatarEl.title = `${pet.name} (${pet.species})`;
        } else {
          // 没有上传图片，使用种族对应的emoji
          avatarEl.textContent = speciesToEmoji(pet.species);
          avatarEl.title = pet.species;
      }
    }
    // 仅在进入/切换OC时加载媒体，避免行动时闪烁
    if (!state.lastLoadedPetId || state.lastLoadedPetId !== pet.id) {
      loadPetMedia(pet);
      state.lastLoadedPetId = pet.id;
    }
    updateStatsUI(pet);
  }

  // ---------- Pet Animations ----------
  function animatePet(kind) {
    const stage = document.querySelector('.pet-stage');
    const video = document.getElementById('pet-stage-video');
    const img = document.getElementById('pet-stage-image');
    const mediaEl = video.style.display !== 'none' ? video : img;
    if (!stage || !mediaEl) return;

    if (kind === 'feed') {
      // 1) 图像咀嚼动画
      mediaEl.classList.remove('anim-chew');
      // 触发重排以便重复动画
      // eslint-disable-next-line no-unused-expressions
      mediaEl.offsetWidth;
      mediaEl.classList.add('anim-chew');

      // 2) 食物飞向嘴部动画
      const food = document.createElement('div');
      food.className = 'food-fx';
      food.textContent = '🍖';
      stage.appendChild(food);
      // 动画结束后移除
      food.addEventListener('animationend', () => food.remove());

      // 3) 结束时制造少量粒子
      setTimeout(() => {
        const rect = stage.getBoundingClientRect();
        const x = rect.left + rect.width * 0.5;
        const y = rect.top + rect.height * 0.42;
        burstAt(x, y);
      }, 700);
    } else if (kind === 'play') {
      mediaEl.classList.remove('anim-wiggle');
      mediaEl.offsetWidth;
      mediaEl.classList.add('anim-wiggle');

      const toy = document.createElement('div');
      toy.className = 'toy-fx';
      toy.textContent = '🪀';
      stage.appendChild(toy);
      toy.addEventListener('animationend', () => toy.remove());
    } else if (kind === 'sleep') {
      mediaEl.classList.remove('anim-snooze');
      mediaEl.offsetWidth;
      mediaEl.classList.add('anim-snooze');

      const z = document.createElement('div');
      z.className = 'zzz-fx';
      z.textContent = '💤';
      stage.appendChild(z);
      z.addEventListener('animationend', () => z.remove());
    } else if (kind === 'clean') {
      mediaEl.classList.remove('anim-shake');
      mediaEl.offsetWidth;
      mediaEl.classList.add('anim-shake');

      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const b = document.createElement('div');
          b.className = 'bubble-fx';
          b.textContent = '✼';
          stage.appendChild(b);
          b.addEventListener('animationend', () => b.remove());
        }, i * 120);
      }
    }

    // 通用：更丰富的下雨型粒子效果
    if (kind === 'feed' || kind === 'clean' || kind === 'sleep') {
      rainShower(kind);
    }
  }

  // ---------- Idle breathe & Head-pat & Long-press soothe & Drag interactions ----------
  (function enhanceInteractions() {
    const stage = document.querySelector('.pet-stage');
    const video = document.getElementById('pet-stage-video');
    const img = document.getElementById('pet-stage-image');
    const media = () => (video && video.style.display !== 'none') ? video : img;
    let idleTimer = null;
    let patCount = 0;
    let pressTimer = null;
    let isPressing = false;
    let dragType = null; // 'feed' | 'clean' | null
    let dragGhost = null;

    function setIdle(on) {
      const el = media();
      if (!el) return;
      el.classList.toggle('idle-breathe', Boolean(on));
    }

    function bumpHappinessSmall() {
      updateSelected((pet) => ({
        ...pet,
        happiness: clamp(pet.happiness + 2, 0, 100),
        xp: clamp(pet.xp + 1, 0, 999)
      }));
    }

    function scheduleIdle() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setIdle(true), 3500);
    }

    // 启动：进入待机动画
    scheduleIdle();
    setIdle(true);

    // 任何交互都取消待机一小段时间
    ['mousemove','pointermove','touchmove','click','keydown'].forEach((evt) => {
      document.addEventListener(evt, () => {
        setIdle(false);
        scheduleIdle();
      }, { passive: true });
    });

    // 摸头：在媒体上方轻点/拖动顶部区域触发爱心粒子与微奖励
    function isHeadArea(clientX, clientY) {
      if (!stage) return false;
      const rect = stage.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      return x >= 0 && x <= rect.width && y >= 0 && y <= rect.height * 0.35;
    }

    function headPatAt(clientX, clientY) {
      if (!isHeadArea(clientX, clientY)) return;
      patCount++;
      burstAt(clientX, clientY);
      if (patCount % 3 === 0) {
        createBubbleAt(clientX - (stage?.getBoundingClientRect().left || 0), clientY - (stage?.getBoundingClientRect().top || 0) - 30);
        bumpHappinessSmall();
      }
    }

    stage && stage.addEventListener('pointerdown', (e) => {
      isPressing = true;
      clearTimeout(pressTimer);
      const startX = e.clientX, startY = e.clientY;
      // 长按安抚：800ms
      pressTimer = setTimeout(() => {
        if (!isPressing) return;
        // 连续冒出安抚💗粒子
        for (let i = 0; i < 6; i++) {
          setTimeout(() => burstAt(startX, startY - i * 6), i * 120);
        }
        bumpHappinessSmall();
      }, 800);
    });

    stage && stage.addEventListener('pointerup', () => {
      isPressing = false;
      clearTimeout(pressTimer);
    });

    stage && stage.addEventListener('pointermove', (e) => {
      if (e.pressure > 0 || (e.buttons & 1)) {
        // 拖动时若在头部，制造轻微粒子
        if (isHeadArea(e.clientX, e.clientY) && Math.random() < 0.12) {
          burstAt(e.clientX, e.clientY);
        }
      }
    }, { passive: true });

    // 简易拖拽喂食/清洁：从下方操作按钮按下并拖到舞台释放
    const feedBtn = document.getElementById('feed-btn');
    const cleanBtn = document.getElementById('clean-btn');

    function beginDrag(type, startEvent) {
      dragType = type;
      if (!dragGhost) {
        dragGhost = document.createElement('div');
        dragGhost.className = 'drag-ghost';
        dragGhost.textContent = type === 'feed' ? '🍖' : '🫧';
        document.body.appendChild(dragGhost);
      }
      moveGhost(startEvent.clientX, startEvent.clientY);
      document.addEventListener('pointermove', onDragMove, { passive: true });
      document.addEventListener('pointerup', onDragEnd, { once: true });
    }

    function moveGhost(x, y) {
      if (dragGhost) {
        dragGhost.style.left = x + 'px';
        dragGhost.style.top = y + 'px';
      }
    }

    function onDragMove(e) {
      moveGhost(e.clientX, e.clientY);
    }

    function onDragEnd(e) {
      document.removeEventListener('pointermove', onDragMove);
      if (dragGhost) { dragGhost.remove(); dragGhost = null; }
      const inside = (() => {
        if (!stage) return false;
        const r = stage.getBoundingClientRect();
        return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      })();
      if (inside && dragType) {
        if (dragType === 'feed') { animatePet('feed'); updateSelected(ACTIONS.feed); }
        else if (dragType === 'clean') { animatePet('clean'); updateSelected(ACTIONS.clean); }
      }
      dragType = null;
    }

    feedBtn && feedBtn.addEventListener('pointerdown', (e) => beginDrag('feed', e));
    cleanBtn && cleanBtn.addEventListener('pointerdown', (e) => beginDrag('clean', e));
  })();

  // ---------- Actions ----------
  function updateSelected(updater) {
    const idx = state.pets.findIndex((p) => p.id === state.selectedPetId);
    if (idx === -1) return;
    const pet = state.pets[idx];
    const caughtUp = applyTimeDelta(pet, minutesBetween(nowMs(), pet.lastUpdated));
    const updated = updater(caughtUp);
    updated.lastUpdated = nowMs();
    state.pets[idx] = updated;
    saveState(state);
    // 仅更新数值，不重载媒体，避免闪烁
    updateStatsUI(updated);
  }

  // 完成小游戏后给予奖励
  function rewardAfterMiniGame(kind) {
    const happinessBonus = kind === 'joke' ? 8 : kind === 'riddle' ? 12 : kind === 'soup' ? 15 : 10;
    const xpBonus = kind === 'joke' ? 6 : kind === 'riddle' ? 8 : kind === 'soup' ? 10 : 7; // 新增：小游戏亲密值奖励
    updateSelected((pet) => {
      const updated = {
        ...pet,
        happiness: clamp(pet.happiness + happinessBonus, 0, 100),
        energy: clamp(pet.energy - 5, 0, 100),
        xp: clamp(pet.xp + xpBonus, 0, 999), // 新增：小游戏获得亲密值
      };
      return updated;
    });
  }

  feedBtn.addEventListener('click', () => { animatePet('feed'); updateSelected(ACTIONS.feed); appendInteractionLog('触发：喂食 🍖'); });
  // 打开/收起小游戏面板（浮动到OC容器，顶部对齐容器中心线）+ 玩耍动画
  playBtn.addEventListener('click', () => {
    appendInteractionLog('触发：玩耍 🪀');
    animatePet('play');
    const panel = document.getElementById('play-panel');
    const stage = document.querySelector('.pet-stage');
    if (!panel || !stage) return;

    const willShow = panel.classList.contains('hidden');
    if (willShow) {
      // 初始化内容
      initRiddle();
      initJoke();
      initSoup();
      initNumberGame(true);
      setActiveTab('riddle');

      // 先在文档流中计算原始宽度
      const prevInline = {
        position: panel.style.position,
        left: panel.style.left,
        top: panel.style.top,
        transform: panel.style.transform,
        zIndex: panel.style.zIndex,
        width: panel.style.width,
        visibility: panel.style.visibility,
      };
      panel.classList.remove('hidden');
      panel.style.visibility = 'hidden';
      panel.style.position = '';
      panel.style.left = '';
      panel.style.top = '';
      panel.style.transform = '';
      panel.style.zIndex = '';
      panel.style.width = '';
      const naturalWidth = panel.getBoundingClientRect().width;

      // 作为浮动层显示在OC容器位置：顶部对齐容器中心线，保持原宽度
      const rect = stage.getBoundingClientRect();
      panel.classList.add('as-overlay');
      panel.style.position = 'fixed';
      panel.style.left = (rect.left + rect.width / 2) + 'px';
      panel.style.top = (rect.top + rect.height / 2) + 'px';
      panel.style.transform = 'translate(-50%, 0)';
      panel.style.zIndex = '3000';
      if (naturalWidth) panel.style.width = naturalWidth + 'px';
      panel.style.visibility = prevInline.visibility || 'visible';
    } else {
      // 收起并移除定位样式
      panel.classList.add('hidden');
      panel.classList.remove('as-overlay');
      panel.removeAttribute('style');
    }
  });
  sleepBtn.addEventListener('click', () => { animatePet('sleep'); updateSelected(ACTIONS.sleep); appendInteractionLog('触发：睡觉 🛌'); });
  cleanBtn.addEventListener('click', () => { animatePet('clean'); updateSelected(ACTIONS.clean); appendInteractionLog('触发：清洁 🧼'); });

  // 防止点击工具条触发舞台点击粒子效果
  function stopStageEffects(ev) {
    ev.stopPropagation();
  }
  ['click','mousedown','mouseup','pointerdown','touchstart'].forEach((evt) => {
    feedBtn && feedBtn.addEventListener(evt, stopStageEffects, { passive: evt === 'touchstart' ? false : true });
    playBtn && playBtn.addEventListener(evt, stopStageEffects, { passive: evt === 'touchstart' ? false : true });
    sleepBtn && sleepBtn.addEventListener(evt, stopStageEffects, { passive: evt === 'touchstart' ? false : true });
    cleanBtn && cleanBtn.addEventListener(evt, stopStageEffects, { passive: evt === 'touchstart' ? false : true });
    actionsPanel && actionsPanel.addEventListener(evt, stopStageEffects, { passive: evt === 'touchstart' ? false : true });
  });

  // 重命名弹窗文件上传处理
  const renameMediaInput = document.getElementById('rename-pet-media');
  const renameMediaPreview = document.getElementById('rename-media-preview');
  
  if (renameMediaInput && renameMediaPreview) {
    renameMediaInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) {
        renameMediaPreview.classList.add('hidden');
        return;
      }
      
      // 验证文件类型
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        alert('请选择图片或视频文件');
        renameMediaInput.value = '';
        return;
      }
      // 允许视频与图片，但预览区视频仅小窗预览
      
      // 验证文件大小（限制为10MB）
      if (file.size > 10 * 1024 * 1024) {
        alert('文件大小不能超过10MB');
        renameMediaInput.value = '';
        return;
      }
      
      // 创建预览
      const reader = new FileReader();
      reader.onload = (e) => {
        renameMediaPreview.innerHTML = '';
        
        if (isImage) {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.alt = '预览图片';
          renameMediaPreview.appendChild(img);
        } else {
          const video = document.createElement('video');
          video.src = e.target.result;
          video.controls = true;
          video.muted = true;
          video.style.maxHeight = '80px';
          renameMediaPreview.appendChild(video);
        }
        
        // 添加文件信息
        const mediaInfo = document.createElement('div');
        mediaInfo.className = 'media-info';
        
        const mediaName = document.createElement('div');
        mediaName.className = 'media-name';
        mediaName.textContent = file.name;
        
        const mediaSize = document.createElement('div');
        mediaSize.className = 'media-size';
        mediaSize.textContent = formatFileSize(file.size);
        
        mediaInfo.appendChild(mediaName);
        mediaInfo.appendChild(mediaSize);
        renameMediaPreview.appendChild(mediaInfo);
        
        // 添加删除按钮
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-media';
        removeBtn.textContent = '✕';
        removeBtn.title = '移除文件';
        removeBtn.addEventListener('click', () => {
          renameMediaInput.value = '';
          renameMediaPreview.classList.add('hidden');
        });
        
        renameMediaPreview.appendChild(removeBtn);
        renameMediaPreview.classList.remove('hidden');
      };
      
      reader.readAsDataURL(file);
    });
  }

  renameBtn.addEventListener('click', () => {
    const pet = state.pets.find((p) => p.id === state.selectedPetId);
    if (!pet) return;
    const dlg = document.getElementById('rename-dialog');
    const nameInput = document.getElementById('rename-name');
    const speciesInput = document.getElementById('rename-species');
    const stageInput = document.getElementById('rename-stage');
    const saveBtn = document.getElementById('rename-save');
    const cancelBtn = document.getElementById('rename-cancel');
    const mediaInput = document.getElementById('rename-pet-media');
    const mediaPreview = document.getElementById('rename-media-preview');
    if (!dlg || !nameInput || !speciesInput || !stageInput || !saveBtn || !cancelBtn) return;

    // 预填
    nameInput.value = pet.name || '';
    speciesInput.value = pet.species || '猫猫';
    stageInput.value = pet.stage || '';
    
    // 清空文件上传
    if (mediaInput) mediaInput.value = '';
    if (mediaPreview) {
      mediaPreview.innerHTML = '';
      mediaPreview.classList.add('hidden');
    }

    // 打开
    try { dlg.showModal(); } catch (_) { dlg.setAttribute('open', 'true'); }

    const onCancel = () => {
      dlg.close && dlg.close();
      dlg.removeAttribute('open');
      saveBtn.removeEventListener('click', onSave);
      cancelBtn.removeEventListener('click', onCancel);
    };

    const onSave = async () => {
      const newName = nameInput.value.trim().slice(0, 20);
      const newSpeciesWithEmoji = speciesInput.value.trim();
      const newStage = stageInput.value.trim().slice(0, 10);
      
      if (newName) pet.name = newName;
      
      if (newSpeciesWithEmoji) {
        pet.species = newSpeciesWithEmoji;
      }
      
      pet.stage = newStage; // 保存自定义时期
      
      // 处理新的媒体文件
      const mediaInput = document.getElementById('rename-pet-media');
      const file = mediaInput ? mediaInput.files[0] : null;
      
      if (file) {
        try {
          // 图片：若为 GIF 则存入 IndexedDB 保持动图；其他图片压缩后存 dataUrl
          if (file.type === 'image/gif') {
            const mediaId = `media-${uid()}`;
            await idbSaveMedia(mediaId, file, { type: file.type, name: file.name, size: file.size });
          pet.customMedia = {
            type: file.type,
            name: file.name,
            size: file.size,
              mediaId
            };
          } else if (file.type.startsWith('image/')) {
            const dataUrl = await compressImage(file, 1024, 0.8);
            pet.customMedia = {
              type: /png$/i.test(file.type) ? 'image/png' : 'image/jpeg',
              name: file.name,
              size: dataUrl.length,
              dataUrl
            };
          } else if (file.type.startsWith('video/')) {
            const mediaId = `media-${uid()}`;
            await idbSaveMedia(mediaId, file, { type: file.type, name: file.name, size: file.size });
            pet.customMedia = {
              type: file.type,
              name: file.name,
              size: file.size,
              mediaId
            };
          } else {
            alert('仅支持图片或视频文件');
            return;
          }
          pet.lastUpdated = nowMs();
          saveState(state);
          render();
          updateCreatePetButtonVisibility();
          // 保存新媒体后自动刷新页面，确保媒体资源（含IndexedDB）重新挂载
          setTimeout(() => { location.reload(); }, 50);
          onCancel();
        } catch (err) {
          console.error('媒体保存失败:', err);
          alert('媒体保存失败，请重试或更换文件');
        }
        return; // 已处理
      }
      
      pet.lastUpdated = nowMs();
      saveState(state);
      render();
      onCancel();
    };

    saveBtn.addEventListener('click', onSave);
    cancelBtn.addEventListener('click', onCancel);
  });

  // 新建OC按钮事件
  createPetBtn.addEventListener('click', () => {
    // 清空表单
    createPetName.value = '';
    createPetSpecies.value = '';
    createPetStage.value = '';
    
    // 清空文件上传
    const mediaInput = document.getElementById('create-pet-media');
    const mediaPreview = document.getElementById('media-preview');
    if (mediaInput) mediaInput.value = '';
    if (mediaPreview) {
      mediaPreview.innerHTML = '';
      mediaPreview.classList.add('hidden');
    }
    
    // 打开对话框
    try { createPetDialog.showModal(); } catch (_) { createPetDialog.setAttribute('open', 'true'); }
  });

  // 文件上传处理
  const mediaInput = document.getElementById('create-pet-media');
  const mediaPreview = document.getElementById('media-preview');
  
  if (mediaInput && mediaPreview) {
    mediaInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) {
        mediaPreview.classList.add('hidden');
        return;
      }
      
      // 验证文件类型
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        alert('请选择图片或视频文件');
        mediaInput.value = '';
        return;
      }
      // 允许视频与图片，视频走IndexedDB持久化
      
      // 验证文件大小（限制为10MB）
      if (file.size > 10 * 1024 * 1024) {
        alert('文件大小不能超过10MB');
        mediaInput.value = '';
        return;
      }
      
      // 创建预览
      const reader = new FileReader();
      reader.onload = (e) => {
        mediaPreview.innerHTML = '';
        
        if (isImage) {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.alt = '预览图片';
          mediaPreview.appendChild(img);
        } else {
          const video = document.createElement('video');
          video.src = e.target.result;
          video.controls = true;
          video.muted = true;
          video.style.maxHeight = '80px';
          mediaPreview.appendChild(video);
        }
        
        // 添加文件信息
        const mediaInfo = document.createElement('div');
        mediaInfo.className = 'media-info';
        
        const mediaName = document.createElement('div');
        mediaName.className = 'media-name';
        mediaName.textContent = file.name;
        
        const mediaSize = document.createElement('div');
        mediaSize.className = 'media-size';
        mediaSize.textContent = formatFileSize(file.size);
        
        mediaInfo.appendChild(mediaName);
        mediaInfo.appendChild(mediaSize);
        mediaPreview.appendChild(mediaInfo);
        
        // 添加删除按钮
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-media';
        removeBtn.textContent = '✕';
        removeBtn.title = '移除文件';
        removeBtn.addEventListener('click', () => {
          mediaInput.value = '';
          mediaPreview.classList.add('hidden');
        });
        
        mediaPreview.appendChild(removeBtn);
        mediaPreview.classList.remove('hidden');
      };
      
      reader.readAsDataURL(file);
    });
  }
  
  // 文件大小格式化函数
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // 压缩图片，限制最大边为 maxDim，PNG保留透明，JPG按质量压缩
  function compressImage(file, maxDim = 512, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const scale = Math.min(1, maxDim / Math.max(width, height));
          width = Math.round(width * scale);
          height = Math.round(height * scale);
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          // 确保透明背景
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          try {
            const isPng = /png$/i.test(file.type || '');
            const mime = isPng ? 'image/png' : 'image/jpeg';
            const dataUrl = canvas.toDataURL(mime, isPng ? undefined : quality);
            resolve(dataUrl);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 新建OC保存按钮事件
  createPetSave.addEventListener('click', async () => {
    const name = createPetName.value.trim();
    const speciesWithEmoji = createPetSpecies.value;
    const stage = createPetStage.value.trim();
    
          if (!name || !speciesWithEmoji) {
        alert('请填写OC名字和种族');
        return;
      }

    // 从带emoji的种族值中提取纯种族名称
    // 例如："🐱 猫猫" -> "猫猫"
    const species = speciesWithEmoji.replace(/^[^\s]+\s/, '').trim();
    
    if (!species) {
      alert('种族格式不正确，请重新选择');
      return;
    }

    // 获取上传的文件
    const mediaInput = document.getElementById('create-pet-media');
    const file = mediaInput ? mediaInput.files[0] : null;
    
    // 生成唯一ID
    const petId = `custom-${uid()}`;
    
    // 创建新OC对象
    const newPet = createPet({
      id: petId,
      name: name,
      species: species
    });
    
    if (stage) {
      newPet.stage = stage;
    }
    
    // 如果有上传的文件，保存文件信息
    if (file) {
      try {
        if (file.type === 'image/gif') {
          // GIF：存入 IndexedDB，保持动画
          const mediaId = `media-${uid()}`;
          await idbSaveMedia(mediaId, file, { type: file.type, name: file.name, size: file.size });
      newPet.customMedia = {
        type: file.type,
        name: file.name,
            size: file.size,
            mediaId
          };
        } else if (file.type.startsWith('image/')) {
          // 其他图片压缩，PNG保留透明
          const dataUrl = await compressImage(file, 512, 0.75);
          newPet.customMedia = {
            type: /png$/i.test(file.type) ? 'image/png' : 'image/jpeg',
            name: file.name,
            size: dataUrl.length,
            dataUrl
          };
        } else if (file.type.startsWith('video/')) {
          // 视频：存入 IndexedDB
          const mediaId = `media-${uid()}`;
          await idbSaveMedia(mediaId, file, { type: file.type, name: file.name, size: file.size });
          newPet.customMedia = {
            type: file.type,
            name: file.name,
            size: file.size,
            mediaId
          };
        } else {
          alert('仅支持图片或视频文件');
          return;
        }
      } catch (err) {
        console.error('媒体保存失败:', err);
        alert('媒体保存失败，请重试或更换文件');
        return;
      }
      // 继续保存
        state.pets.push(newPet);
        state.selectedPetId = petId;
        saveState(state);
        createPetDialog.close();
        createPetDialog.removeAttribute('open');
        render();
        updateCreatePetButtonVisibility();
        // 新建并包含媒体：保存后自动刷新，确保对象URL与视频自动播放策略就绪
        setTimeout(() => { location.reload(); }, 50);
      return;
    }

    // 没有文件时直接创建
    state.pets.push(newPet);
    state.selectedPetId = petId;
    saveState(state);
    
    // 关闭对话框
    createPetDialog.close();
    createPetDialog.removeAttribute('open');
    
    // 重新渲染
    render();
    
    // 显示成功提示
            alert(`OC"${name}"创建成功！`);
  });

  // 新建OC取消按钮事件
  createPetCancel.addEventListener('click', () => {
    createPetDialog.close();
    createPetDialog.removeAttribute('open');
  });

  // 新建OC回车键提交
  createPetName.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      createPetSave.click();
    }
  });
  
  // 种族输入框回车键提交
  createPetSpecies.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      createPetSave.click();
    }
  });
  
  // 自定义种族选择器功能
  const speciesSelectorBtn = document.getElementById('species-selector-btn');
  const speciesSelector = document.getElementById('species-selector');
  const closeSpeciesSelector = document.getElementById('close-species-selector');
  const speciesOptions = document.querySelectorAll('.species-option');

  // 打开种族选择器
  if (speciesSelectorBtn) {
    speciesSelectorBtn.addEventListener('click', () => {
      speciesSelector.classList.toggle('hidden');
    });
  }

  // 关闭种族选择器
  if (closeSpeciesSelector) {
    closeSpeciesSelector.addEventListener('click', () => {
      speciesSelector.classList.add('hidden');
    });
  }

  // 选择种族选项
  speciesOptions.forEach(option => {
    option.addEventListener('click', () => {
      const value = option.getAttribute('data-value');
      createPetSpecies.value = value;
      speciesSelector.classList.add('hidden');
      
      // 更新emoji提示
      const emojiHint = document.getElementById('species-emoji-hint');
      if (emojiHint) {
        emojiHint.textContent = value.split(' ')[0]; // 提取emoji部分
        emojiHint.classList.add('visible');
      }
    });
  });

  // 点击外部关闭种族选择器
  document.addEventListener('click', (e) => {
    if (speciesSelector && !speciesSelector.contains(e.target) && 
        !speciesSelectorBtn.contains(e.target)) {
      speciesSelector.classList.add('hidden');
    }
  });

  // 种族输入框智能提示（保留原有功能）
  createPetSpecies.addEventListener('input', (e) => {
    const input = e.target;
    const value = input.value.trim();
    const emojiHint = document.getElementById('species-emoji-hint');
    
    // 如果输入为空，隐藏emoji提示
    if (!value) {
      if (emojiHint) {
        emojiHint.textContent = '';
        emojiHint.classList.remove('visible');
      }
      return;
    }
    
    // 从带emoji的种族值中提取纯种族名称
    const species = value.replace(/^[^\s]+\s/, '').trim();
    
    // 检查是否匹配预设种族，如果匹配则显示对应的emoji
    const speciesEmojis = {
      '鲛人': '🧜',
      '狼人': '🐺',
      '龙族': '🐉',
      '凤凰': '🦅',
      '独角兽': '🦄',
      '精灵': '🧚',
      '天使': '👼',
      '恶魔': '😈',
      '法师': '🧙',
      '战士': '⚔️',
      '射手': '🏹',
      '巫师': '🔮',
      '吸血鬼': '🦇',
      '月族': '🌙',
      '日族': '☀️'
    };
    
    // 显示emoji提示
    if (emojiHint) {
      if (speciesEmojis[species]) {
        emojiHint.textContent = speciesEmojis[value];
        emojiHint.classList.add('visible');
        console.log(`选择了预设种族: ${species} ${speciesEmojis[species]}`);
      } else {
        emojiHint.textContent = '✨';
        emojiHint.classList.add('visible');
        console.log(`输入了自定义种族: ${species}`);
      }
    }
  });
  
  // 种族输入框失去焦点时隐藏emoji提示
  createPetSpecies.addEventListener('blur', () => {
    const emojiHint = document.getElementById('species-emoji-hint');
    if (emojiHint) {
      emojiHint.classList.remove('visible');
    }
  });
  
  // 种族输入框获得焦点时显示emoji提示
  createPetSpecies.addEventListener('focus', () => {
    const emojiHint = document.getElementById('species-emoji-hint');
    const value = createPetSpecies.value.trim();
    if (emojiHint && value) {
      emojiHint.classList.add('visible');
    }
  });

  // 禁止释放

  // 移除创建相关逻辑



  // ---------- Ticker ----------
  setInterval(() => {
    if (!state.selectedPetId) return;
    const idx = state.pets.findIndex((p) => p.id === state.selectedPetId);
    if (idx === -1) return;
    const pet = state.pets[idx];
    const now = nowMs();
    const minutes = minutesBetween(now, pet.lastUpdated);
    if (minutes <= 0) return;
    const updated = applyTimeDelta(pet, minutes);
    state.pets[idx] = updated;
    saveState(state);
    // 周期性仅刷新数值，避免频繁重载媒体导致闪烁
    updateStatsUI(updated);
  }, 10_000); // 每10秒检查一次是否跨分钟

  // ---------- Initial Render ----------
  render();
  
  // 初始化时隐藏新建OC按钮
  updateCreatePetButtonVisibility();



  // 自定义弹窗功能




  // ---------- Mini Games (Play) ----------
  const playInlineClose = document.getElementById('play-inline-close');

  function setActiveTab(key) {
    document.querySelectorAll('.tab-button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === key);
      btn.setAttribute('aria-selected', String(btn.dataset.tab === key));
    });
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('hidden', panel.dataset.panel !== key);
    });
  }

  document.querySelectorAll('.tab-button').forEach((btn) => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
  });

  playInlineClose && playInlineClose.addEventListener('click', () => {
    const panel = document.getElementById('play-panel');
    if (!panel) return;
    panel.classList.add('hidden');
    panel.classList.remove('as-overlay');
    panel.removeAttribute('style');
  });

  // 通用：玩耍面板右上角悬浮关闭按钮
  document.getElementById('play-panel-close')?.addEventListener('click', () => {
    const panel = document.getElementById('play-panel');
    if (!panel) return;
    panel.classList.add('hidden');
    panel.classList.remove('as-overlay');
    panel.removeAttribute('style');
  });

  // 猜谜语
  const RIDDLES = [
    { q: '什么东西有很多牙齿，却从不咬人？', a: '梳子', h: '每天用来打理头发' },
    { q: '什么门永远关不上？', a: '球门', h: '绿茵场上' },
    { q: '什么东西总是向上，却从不下降？', a: '年龄', h: '和生日有关' },
    { q: '什么东西白天看不见，晚上才出现？', a: '星星', h: '抬头看看天' },
    { q: '什么东西越洗越脏？', a: '水', h: '洗东西要用它' },
    { q: '什么东西越擦越小？', a: '橡皮', h: '文具盒里常见' },
    { q: '什么东西越冷越爱出来？', a: '哈气', h: '冬天嘴巴呼出的' },
    { q: '什么东西没有脚却会跑？', a: '水', h: '从高处到低处' },
    { q: '什么东西人们常说却看不见？', a: '话', h: '沟通用的' },
    { q: '什么东西越用越多？', a: '知识', h: '学无止境' },
    { q: '什么东西越分越多？', a: '快乐', h: '分享' },
    { q: '什么东西坐着用，站着不用？', a: '椅子', h: '家具' },
    { q: '什么被打破了仍可用？', a: '纪录', h: '体育比赛常见' },
    { q: '什么东西总是成双成对？', a: '眼睛', h: '看世界' },
    { q: '什么东西装满了却很轻？', a: '泡沫', h: '洗澡会有' },
    { q: '什么东西只有出没有进？', a: '口气', h: '从嘴里出来' },
    { q: '什么东西没头没尾？', a: '圆', h: '形状' },
    { q: '什么东西从不走路却常在路上？', a: '车', h: '四个轮子' },
    { q: '什么东西越抹越亮？', a: '镜子', h: '照人' },
    { q: '天上有，地上没有的是什么？', a: '星座', h: '夜空' },
    { q: '身上洞最多的东西是什么？', a: '筛子', h: '厨房用具' },
    { q: '什么东西你有我也有，一说就没有？', a: '秘密', h: '保密' },
    { q: '什么动物早上四条腿，中午两条腿，晚上三条腿？', a: '人', h: '神话中的谜题' },
    { q: '什么东西无脚能上楼？', a: '烟', h: '轻飘飘' },
    { q: '什么东西没有翅膀却会飞？', a: '时间', h: '日月如梭' },
    { q: '什么东西看不见摸不着，却能吹动树叶？', a: '风', h: '有时很大' },
    { q: '什么东西先升后降？', a: '太阳', h: '东升西落' },
    { q: '什么东西越热越会消失？', a: '冰', h: '夏天常见' },
    { q: '什么东西看不见，摸不着，却能打破？', a: '沉默', h: '开口说话' },
    { q: '什么东西有头无颈，有眼无眉？', a: '针', h: '缝衣服' },
    { q: '什么东西越走越小？', a: '影子', h: '夕阳时' },
    { q: '什么东西可以写字却没有墨水？', a: '粉笔', h: '黑板' },
    { q: '什么东西每天都涨一次？', a: '潮水', h: '海边' },
    { q: '什么东西你只能用左手拿，右手永远拿不到？', a: '右手', h: '换只手试试' },
    { q: '什么东西越热越爱出来？', a: '汗', h: '运动' },
    { q: '什么东西看得见抓不住？', a: '光', h: '照亮' },
    { q: '什么从来不洗澡却很干净？', a: '月亮', h: '夜空' },
    { q: '一年四季都穿同一件衣服的是什么？', a: '树', h: '树皮' },
    { q: '什么东西越大越不值钱？', a: '洞', h: '越大越漏' },
    { q: '背着房子到处走的是什么？', a: '蜗牛', h: '慢吞吞' },
    { q: '总在你前面却永远追不上的是？', a: '明天', h: '时间观念' },
    { q: '什么字写错了也没人会说错？', a: '"错"字', h: '字面意思' },
    { q: '什么东西生在水里，死在锅里，埋在肚里？', a: '鱼', h: '美食' },
    { q: '什么植物一出生就带"胡子"？', a: '玉米', h: '玉米须' },
    { q: '什么东西越拉越长，越剪越短？', a: '头发', h: '理发店' },
    { q: '什么东西有眼却看不见？', a: '台风', h: '天气新闻' },
    { q: '什么东西没有生命却会哭？', a: '天空', h: '下雨' },
    { q: '什么东西没有舌头却会说话？', a: '广播', h: '扬声器' },
    { q: '什么东西越用越顺手，越放越生疏？', a: '工具', h: '勤练' },
    { q: '什么车从不需要司机？', a: '风车', h: '靠风转' },
    { q: '什么人整天看不见阳光却很忙？', a: '矿工', h: '地下' }
  ];

  // 保证题库数量至少 50 条（不够则循环扩充）
  // 注意：必须在 RIDDLES/JOKES/SOUPS 全部定义之后再调用
  let riddleIndex = 0;
  function initRiddle() {
    riddleIndex = Math.floor(Math.random() * RIDDLES.length);
    const item = RIDDLES[riddleIndex];
    const q = document.getElementById('riddle-question');
    const fb = document.getElementById('riddle-feedback');
    q && (q.textContent = item.q);
    fb && (fb.textContent = '');
    const input = document.getElementById('riddle-input');
    input && (input.value = '');
  }
  function nextRiddle() { riddleIndex = (riddleIndex + 1) % RIDDLES.length; initRiddle(); }
  document.getElementById('riddle-submit')?.addEventListener('click', () => {
    const input = document.getElementById('riddle-input');
    const fb = document.getElementById('riddle-feedback');
    const ans = (input?.value || '').trim();
    const item = RIDDLES[riddleIndex];
    if (!ans) { fb && (fb.textContent = '先输入答案呀～'); return; }
    if (ans === item.a) { fb && (fb.textContent = '答对啦！奖励+'); rewardAfterMiniGame('riddle'); }
    else { fb && (fb.textContent = '差一点点，再想想～'); }
  });
  document.getElementById('riddle-hint')?.addEventListener('click', () => {
    const fb = document.getElementById('riddle-feedback');
    const item = RIDDLES[riddleIndex];
    fb && (fb.textContent = `提示：${item.h}`);
  });
  document.getElementById('riddle-reveal')?.addEventListener('click', () => {
    const fb = document.getElementById('riddle-feedback');
    const item = RIDDLES[riddleIndex];
    fb && (fb.textContent = `答案：${item.a}`);
  });
  document.getElementById('riddle-next')?.addEventListener('click', () => nextRiddle());

  // 讲笑话
  const JOKES = [
    '我本来想减肥的，后来想想，胖点更有福气。',
    '程序员的键盘上，最常按的是F5，因为他们喜欢刷新自己。',
    '昨天去跑步了，结果跑丢了，坚持不下去了。',
    '今天打算早睡，结果计划赶不上"刷短视频"的变化。',
    '我决定明天开始健身，前提是明天永远不要来。',
    '手机电量% 就像自律程度，看的挺多，用的挺少。',
    '闹钟叫醒不了装睡的人，但能叫醒全宿舍的人。',
    '我不是不想起床，是被被子"软禁"了。',
    '出去跑步十分钟，我的灵魂先回来了。',
    '我和沙发是真爱，一坐就分不开。',
    '钱包：我瘦了，你开心了吗？',
    '喝奶茶不胖的秘诀：买了就当没喝。',
    '减肥小妙招：先把体重秤藏起来。',
    '自拍与身份证照片的区别，就像梦想和现实。',
    '考试时最怕的不是不会，而是会的都没考。',
    '我不是"社恐"，我只是"社懒"。',
    '我不熬夜，夜熬我。',
    '我最擅长的运动是"翻身继续睡"。',
    '人生就是起起落落落落……然后再起一点点。',
    '想吃零食的时候，先喝口水……然后继续吃。',
    '谁说鱼的记忆只有秒？我的密码输错三次就全忘了。',
    '我练了很久的腹肌，最后练成了"一块腹肌"。',
    '早睡的人都有一个共同点：不是我。',
    '我给自己定了个目标：再拖延一天。',
    '追剧到一半卡住了，我的心也卡住了。',
    '我不是单身，我是"恋爱未上线"。',
    '段子看多了，生活也开始自带字幕了。',
    '我最喜欢的运动是"躺平"，不费力还省心。',
    '别人减肥是为了变美，我减肥是为了省钱。',
    '朋友圈发了一条动态：今晚不熬夜。然后删除了。',
    '外卖小哥：你点的不是饭，是我的人生跑步纪录。',
    '我和床谈恋爱，分分合合，但始终没分手。',
    '我考虑开始存钱，然后想了想，先把银行卡余额存起来吧。',
    '有些事不是我不想做，是沙发不让我起来。',
    '我的梦想是有一天能实现梦想。',
    '生活给了我一巴掌，我回了它一个微笑，然后继续躺。',
    '最怕空气突然安静，然后老板突然叫我名字。',
    '我最稳定的作息是：稳定地不规律。',
    '烦恼像头发一样，每天都会长出来。',
    '周一综合症：一睁眼想请假。',
    '一想到明天要起床，我就觉得今天要早点睡……然后继续玩。',
    '我的字典里没有"放弃"，因为我从来没开始。',
    '所谓成熟，就是学会在买单时保持微笑。',
    '我最大的优点是乐观，最大的缺点是过于乐观。',
    '如果人生是一场游戏，我肯定是选择了"休闲模式"。',
    '天气预报说今天有太阳，结果太阳说它加班。',
    '小时候想当科学家，长大后只想当"有钱人"。',
    '我决定从明天开始努力，今天先努力休息。',
    '如果努力有用，我早就……继续努力了。',
    '人生建议：遇事不决，先吃顿好的。',
    '我不是懒，我是在为地球节约能量。'
  ];
  let jokeIndex = 0;
  function initJoke() {
    jokeIndex = Math.floor(Math.random() * JOKES.length);
    const j = document.getElementById('joke-text');
    j && (j.textContent = JOKES[jokeIndex]);
  }
  document.getElementById('joke-laugh')?.addEventListener('click', () => {
    rewardAfterMiniGame('joke');
    const j = document.getElementById('joke-text');
    j && (j.textContent += ' 😂');
  });
  document.getElementById('joke-next')?.addEventListener('click', () => {
    jokeIndex = (jokeIndex + 1) % JOKES.length;
    const j = document.getElementById('joke-text');
    j && (j.textContent = JOKES[jokeIndex]);
  });

  // 海龟汤（故事+提示+答案）- 加强趣味与推理深度
  const SOUPS = [
    { s: '一个人推着小车走到“酒店”门口，被老板罚了钱，却开心地继续前进。为什么？', h: '不是现实中的酒店', a: '桌游《大富翁/Monopoly》，走到宾馆格子需要交费。' },
    { s: '大雨天，一位行人没打伞，衣服被淋湿，但头发却一点没湿。为什么？', h: '与发型有关', a: '他是光头。' },
    { s: '女孩每晚都把“太阳”关掉再睡觉。为什么？', h: '不是天上的太阳', a: '她把房间里名为“太阳”的小夜灯关掉。' },
    { s: '他每天都“飞”去上班，却从不坐飞机。为什么？', h: '字面“双关”', a: '他骑共享单车，车名叫“飞什么”的品牌/或地铁“飞站”（跳停）线路。' },
    { s: '一栋楼的电梯总显示“下行”，住户却从没抱怨。为什么？', h: '位置相关', a: '这是山顶观景电梯，只有下行开放供游客回到山脚。' },
    { s: '作家完成新书后第一件事是把书“淹了”。为什么？', h: '物理意义改变', a: '把书交给出版社的“版面海（版海）”，或把U盘放进“云端（谐音云/淹）”备份。' },
    { s: '她在雨中举着一把没有伞柄的伞，却没有被淋湿。为什么？', h: '伞不是伞', a: '她打的是阳伞/遮阳棚边上的伞布，或在公交站的伞形顶棚下。' },
    { s: '画家把“夜”画得很亮。为什么？', h: '工具或环境', a: '他用的是夜光颜料/或在白天画夜景。' },
    { s: '男子路过照相馆时突然快走，进门后却慢了下来。为什么？', h: '“快”“慢”不是速度', a: '他把相机的快门速度从“快门”调成“慢门”。' },
    { s: '她买下一张“时间”，把它贴在冰箱上。为什么？', h: '不是抽象时间', a: '买的是“日程表/日历”，贴冰箱上提醒安排。' },
    { s: '老师让全班把“错误”写在纸上，结果大家都对了。为什么？', h: '字面游戏', a: '让大家写下“错误”两个字，写对了就对。' },
    { s: '他把手机调到“飞行模式”，却让朋友顺利到达。为什么？', h: '不是手机的飞行', a: '他把无人机的遥控调到飞行模式，帮朋友空投物品/指路。' },
    { s: '建筑师在图纸上“开了一扇窗”，房间立刻亮了。为什么？', h: '现场与图纸联动', a: '这是智能建模/灯光联动的展示厅，图纸上的操作同步控制样板间灯光。' },
    { s: '每天清晨，他都在同一地点看“日落”。为什么？', h: '方位错觉', a: '他面对的是玻璃幕墙，看到的“日落”是对面大屏或反射的日落视频。' },
    { s: '她把一张纸对折十次，成功“到达月球”。为什么？', h: '不是物理对折', a: '她在玩科普计算题：理论上对折到一定次数厚度可达月球；或她打开了AR科普APP的“到月球”成就。' },
    { s: '球迷比赛当天“看台上没有一个人”，但座位却坐满了。为什么？', h: '措辞陷阱', a: '没有“一个人”，因为都是两个人、三个人……看台并非空无一人。' },
    { s: '他把“声音”装进了瓶子里。为什么？', h: '并非真的装进', a: '他在做ASMR/录音，用瓶子作为共鸣腔录制音效。' },
    { s: '一位厨师把盐放到甜点里，客人却说更甜了。为什么？', h: '味觉原理', a: '少量盐可以抑制苦味，突出甜味。' },
    { s: '她买了一张没有座位号的票，却坐到了第一排。为什么？', h: '票的类型', a: '买的是展览/音乐节草地票，早到先到先得坐在最前。' },
    { s: '他给植物听“无声”的音乐，长得更好了。为什么？', h: '音乐并非一定要有声', a: '他用的是震动/超声频段或节律性灌溉定时器。' },
    { s: '邮差每天把信送到同一扇门，但门从没开过。为什么？', h: '门的位置', a: '那是信箱门/信报箱。' },
    { s: '她把书翻到最后一页，合上，又从第一页开始读。为什么？', h: '不是偷看结局', a: '在检查是否缺页/确认印刷分页完整后才开始阅读。' },
    { s: '他给朋友发了一个空白消息，朋友却立刻明白了意思。为什么？', h: '约定俗成', a: '他们约定“空白”代表平安/到家。' },
    { s: '夜里停电，他把“星星”点亮了。为什么？', h: '星星不在天上', a: '家里的星星投影灯/夜光贴被点亮。' }
  ];
  let soupIndex = 0;
  function initSoup() {
    soupIndex = Math.floor(Math.random() * SOUPS.length);
    const s = document.getElementById('soup-story');
    const extra = document.getElementById('soup-extra');
    s && (s.textContent = SOUPS[soupIndex].s);
    extra && (extra.textContent = '');
    const g = document.getElementById('soup-guess-input');
    const gf = document.getElementById('soup-guess-feedback');
    g && (g.value = '');
    gf && (gf.textContent = '');
  }
  document.getElementById('soup-hint')?.addEventListener('click', () => {
    const extra = document.getElementById('soup-extra');
    extra && (extra.textContent = '提示：' + SOUPS[soupIndex].h);
  });
  document.getElementById('soup-answer')?.addEventListener('click', () => {
    const extra = document.getElementById('soup-extra');
    extra && (extra.textContent = '答案：' + SOUPS[soupIndex].a);
    rewardAfterMiniGame('soup');
  });
  document.getElementById('soup-next')?.addEventListener('click', () => {
    soupIndex = (soupIndex + 1) % SOUPS.length;
    const s = document.getElementById('soup-story');
    const extra = document.getElementById('soup-extra');
    s && (s.textContent = SOUPS[soupIndex].s);
    extra && (extra.textContent = '');
    const g = document.getElementById('soup-guess-input');
    const gf = document.getElementById('soup-guess-feedback');
    g && (g.value = '');
    gf && (gf.textContent = '');
  });

  // 海龟汤：提交猜测（模糊包含即可判定命中）
  document.getElementById('soup-guess-submit')?.addEventListener('click', () => {
    const g = document.getElementById('soup-guess-input');
    const gf = document.getElementById('soup-guess-feedback');
    const val = (g?.value || '').trim();
    if (!val) { gf && (gf.textContent = '先说点什么再提交哦～'); return; }
    const ans = SOUPS[soupIndex].a;
    // 简易命中：任一子串命中或编辑距离可加权，这里先做大小写无关包含
    const hit = ans.toLowerCase().includes(val.toLowerCase()) || val.toLowerCase().includes(ans.toLowerCase());
    if (hit) {
      gf && (gf.textContent = '你猜对啦！🎉');
      rewardAfterMiniGame('soup');
    } else {
      gf && (gf.textContent = '暂时不太对，再提问或继续推理～');
    }
  });

  // 数字猜数（1-20）
  let numberSecret = 0;
  function initNumberGame(reset) {
    numberSecret = Math.floor(Math.random() * 20) + 1;
    if (reset) {
      const f = document.getElementById('number-feedback');
      const i = document.getElementById('number-input');
      f && (f.textContent = '');
      i && (i.value = '');
    }
  }
  document.getElementById('number-submit')?.addEventListener('click', () => {
    const i = document.getElementById('number-input');
    const f = document.getElementById('number-feedback');
    const val = Number(i?.value || 0);
    if (!val) { f && (f.textContent = '请输入 1-20 的数字'); return; }
    if (val === numberSecret) { f && (f.textContent = '你猜对了！🎉'); rewardAfterMiniGame('number'); initNumberGame(true); }
    else if (val < numberSecret) { f && (f.textContent = '再大一点～'); }
    else { f && (f.textContent = '再小一点～'); }
  });
  document.getElementById('number-restart')?.addEventListener('click', () => initNumberGame(true));

  // 现在再确保最小数量（放到所有题库与事件绑定之后，避免引用未定义）
  (function ensureMiniGameCounts() {
    const TARGET = 50;
    const fill = (arr, clone) => {
      if (!Array.isArray(arr)) return;
      if (arr.length >= TARGET) return;
      const base = arr.slice();
      while (arr.length < TARGET) {
        for (const it of base) {
          if (arr.length >= TARGET) break;
          arr.push(clone ? clone(it) : it);
        }
      }
      if (arr.length > TARGET) arr.length = TARGET;
    };
    fill(RIDDLES, (o) => ({ ...o }));
    fill(JOKES, null);
    fill(SOUPS, (o) => ({ ...o }));
  })();

  // ---------- Mobile Sidebar Logic ----------
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobilePetOverlay = document.getElementById('mobile-pet-overlay');
  const closeMobilePetBtn = document.getElementById('close-mobile-pet');
  const petAvatar = document.getElementById('pet-avatar');
  const selectPetDialog = document.getElementById('select-pet-dialog');
  const selectPetList = document.getElementById('select-pet-list');
  const selectPetCancel = document.getElementById('select-pet-cancel');




  // 头像点击事件 - 显示选择OC弹窗
  petAvatar && petAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log('头像被点击了！');
    renderSelectPetList();
    showSelectPetDialog();
  });

  // 头像键盘事件（无障碍访问）
  petAvatar && petAvatar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      petAvatar.click();
    }
  });

  // 渲染选择OC列表
  function renderSelectPetList() {
    if (!selectPetList) return;
    console.log('开始渲染选择OC列表，当前OC数量:', state.pets.length);
    
    selectPetList.innerHTML = '';
    state.pets.forEach((pet) => {
      const item = document.createElement('div');
      item.className = `select-pet-item ${pet.id === state.selectedPetId ? 'active' : ''}`;
      item.innerHTML = `
        <span class="pet-emoji">${speciesToEmoji(pet.species)}</span>
        <div class="pet-info">
          <div class="pet-name">${pet.name}</div>
          <div class="pet-species">${pet.species}</div>
        </div>
      `;
      
      item.addEventListener('click', () => {
        console.log('选择了OC:', pet.name);
        state.selectedPetId = pet.id;
        saveState(state);
        render();
        hideSelectPetDialog();
      });
      appendInteractionLog('触发：光影切换 🎨');
      
      selectPetList.appendChild(item);
    });
    console.log('选择OC列表渲染完成');
  }

  // 显示选择OC弹窗（定位在头像下方）
  function showSelectPetDialog() {
    if (!selectPetDialog || !petAvatar) return;
    
    // 获取头像位置
    const avatarRect = petAvatar.getBoundingClientRect();
    
    // 设置弹窗位置
    selectPetDialog.style.position = 'fixed';
    selectPetDialog.style.top = (avatarRect.bottom + 8) + 'px';
    selectPetDialog.style.left = avatarRect.left + 'px';
    selectPetDialog.style.transform = 'none';
    selectPetDialog.style.margin = '0';
    selectPetDialog.style.padding = '0';
    selectPetDialog.style.border = 'none';
    selectPetDialog.style.background = 'transparent';
    selectPetDialog.style.boxShadow = 'none';
    selectPetDialog.style.zIndex = '3000';
    
    // 显示弹窗
    selectPetDialog.setAttribute('open', 'true');
    selectPetDialog.style.display = 'block';
  }

  // 隐藏选择OC弹窗
  function hideSelectPetDialog() {
    if (!selectPetDialog) return;
    selectPetDialog.removeAttribute('open');
    selectPetDialog.style.display = 'none';
  }

  // 选择OC弹窗取消按钮
  selectPetCancel && selectPetCancel.addEventListener('click', () => {
    hideSelectPetDialog();
  });

  // 点击页面空白处关闭选择OC弹窗
  document.addEventListener('click', (e) => {
    if (!selectPetDialog || selectPetDialog.style.display !== 'block') return;
    const within = selectPetDialog.contains(e.target) || petAvatar.contains(e.target);
    if (!within) {
      hideSelectPetDialog();
    }
  });

  // 关闭移动端OC列表
  closeMobilePetBtn && closeMobilePetBtn.addEventListener('click', () => {
    mobilePetOverlay.classList.remove('active');
    setTimeout(() => {
      mobilePetOverlay.style.display = 'none';
    }, 300);
  });

  // 点击遮罩层关闭
  mobilePetOverlay && mobilePetOverlay.addEventListener('click', (e) => {
    if (e.target === mobilePetOverlay) {
      mobilePetOverlay.classList.remove('active');
      setTimeout(() => {
        mobilePetOverlay.style.display = 'none';
      }, 300);
    }
  });

  // 触摸手势支持 - 左滑关闭
  let startX = 0;
  let startY = 0;
  
  mobilePetOverlay && mobilePetOverlay.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  
  mobilePetOverlay && mobilePetOverlay.addEventListener('touchend', (e) => {
    if (!mobilePetOverlay.classList.contains('active')) return;
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = startX - endX;
    const deltaY = Math.abs(startY - endY);
    
    // 左滑超过100px且垂直移动不超过50px时关闭
    if (deltaX > 100 && deltaY < 50) {
      mobilePetOverlay.classList.remove('active');
      setTimeout(() => {
        mobilePetOverlay.style.display = 'none';
      }, 300);
    }
  }, { passive: true });



  // 同步移动端OC列表
  function syncMobilePetList() {
    const mobilePetList = document.getElementById('mobile-pet-list');
    if (!mobilePetList) return;
    
    mobilePetList.innerHTML = '';
    state.pets.forEach((pet) => {
      const li = document.createElement('li');
      li.className = `pet-item ${pet.id === state.selectedPetId ? 'active' : ''}`;
      li.innerHTML = `
        <span class="pet-emoji">${speciesToEmoji(pet.species)}</span>
        <div class="pet-item-main">
          <span class="pet-item-name">${pet.name}</span>
        </div>
      `;
      
      li.addEventListener('click', () => {
        state.selectedPetId = pet.id;
        saveState(state);
        render();
        // 关闭移动端列表
        mobilePetOverlay.classList.remove('active');
        setTimeout(() => {
          mobilePetOverlay.style.display = 'none';
        }, 300);
      });
      
      mobilePetList.appendChild(li);
    });
  }

  // 更新原有的renderPetList函数，同时更新移动端列表
  const originalRenderPetList = renderPetList;
  renderPetList = function() {
    originalRenderPetList();
    // 如果移动端列表是打开的，同步更新
    if (mobilePetOverlay.classList.contains('active')) {
      syncMobilePetList();
    }
  };

  // ---------- Interaction Particles ----------
  const effectsEl = document.getElementById('pet-effects');
  const stageEl = document.querySelector('.pet-stage');

  function randomBetween(min, max) { return Math.random() * (max - min) + min; }

  function createParticle(x, y, options = {}) {
    if (!effectsEl) return;
    const el = document.createElement('div');
    el.className = 'particle';
    const mode = options.mode || 'default';
    let size, dx, dy, dur, emoji, anim;
    if (mode === 'rain') {
      // 使用原先的粒子符号，但采用下落运动与更大的尺寸/更多数量
    const type = Math.floor(Math.random() * 6);
      size = randomBetween(24, 36);
      dx = randomBetween(-30, 30);
      dy = randomBetween(160, 260);
      dur = randomBetween(0.9, 1.6);
      emoji = (
      type === 0 ? '💖' :
      type === 1 ? '✨' :
      type === 2 ? '✰' :
      type === 3 ? '🎈' :
      type === 4 ? '🌸' :
      '⚡'
    );
      if (options.emoji) emoji = options.emoji;
      anim = 'rain-down';
    } else if (mode === 'rise') {
      // 自下而上漂浮（用于睡觉）
      const type = Math.floor(Math.random() * 6);
      size = randomBetween(22, 34);
      dx = randomBetween(-24, 24);
      dy = randomBetween(140, 240); // 向上位移由 float-up 完成
      dur = randomBetween(1.0, 1.8);
      emoji = options.emoji || '💤';
      anim = 'float-up';
    } else {
      const type = Math.floor(Math.random() * 6);
      size = randomBetween(16, 30);
      // 增加运动范围，让粒子更分散
      dx = randomBetween(-120, 120); // 增加水平运动范围
      dy = randomBetween(100, 280); // 增加垂直运动范围
      dur = randomBetween(1.2, 2.2); // 增加持续时间
      emoji = (
        type === 0 ? '💖' :
        type === 1 ? '✨' :
        type === 2 ? '✰' :
        type === 3 ? '🎈' :
        type === 4 ? '🌸' :
        '⚡'
      );
      // 更随机的动画方向
      const animTypes = ['float-left', 'float-right', 'float-up', 'float-down'];
      anim = animTypes[Math.floor(Math.random() * animTypes.length)];
    }
    el.style.setProperty('--x', x + 'px');
    el.style.setProperty('--y', y + 'px');
    el.style.setProperty('--dx', dx + 'px');
    el.style.setProperty('--dy', dy + 'px');
    el.style.setProperty('--dur', dur + 's');
    el.style.fontSize = size + 'px';
    el.textContent = options.emoji || emoji;
    el.style.setProperty('--anim', anim);
    effectsEl.appendChild(el);
    setTimeout(() => el.remove(), dur * 1000);
  }

  function createPairAt(x, y) {
    // 增加分散范围，让粒子更分散
    const spreadX = 40; // 水平分散范围
    const spreadY = 30; // 垂直分散范围
    createParticle(x + randomBetween(-spreadX, spreadX), y + randomBetween(-spreadY, spreadY));
    createParticle(x + randomBetween(-spreadX, spreadX), y + randomBetween(-spreadY, spreadY));
  }

  function rainShower(kind) {
    if (!stageEl) return;
    const rect = stageEl.getBoundingClientRect();
    // 数量更大、更密集
    const count = kind === 'clean' ? 48 : (kind === 'feed' ? 40 : 32);
    // 使用二维网格+抖动，做“满天星”分布
    const rows = Math.max(1, Math.round(Math.sqrt(count)));
    const cols = Math.max(1, Math.ceil(count / rows));
    const cellW = rect.width / cols;
    const cellH = rect.height / rows;
    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const baseX = c * cellW + cellW / 2;
      const baseY = r * cellH + cellH / 2;
      const x = clamp(baseX + (Math.random() - 0.5) * cellW * 0.9, 6, rect.width - 6);
      let y;
      if (kind === 'sleep') {
        // 睡觉：自下而上，起点分布在下半区域并加抖动
        const bottomBandTop = rect.height * 0.55;
        const jitterY = (Math.random() - 0.5) * cellH * 0.8;
        y = clamp(Math.max(baseY, bottomBandTop) + jitterY, rect.height * 0.55, rect.height - 8);
      } else {
        // 喂食/清洁：从各处往下落，起点覆盖全区域并允许略高/略低越界，增强自然感
        const jitterY = (Math.random() - 0.5) * cellH * 0.9;
        y = baseY + jitterY - rect.height * 0.15 * Math.random();
      }
      const delay = (r * cols + c) * 12 + Math.random() * 60; // 纵横交错的时间抖动
      if (kind === 'sleep') {
        setTimeout(() => createParticle(x, y, { mode: 'rise', emoji: '💤' }), delay);
      } else if (kind === 'feed') {
        setTimeout(() => createParticle(x, y, { mode: 'rain', emoji: '🍖' }), delay);
      } else {
        const bubbles = [ '⚪', '🔵', '◌', '◯'];
        const emoji = bubbles[Math.floor(Math.random() * bubbles.length)];
        setTimeout(() => createParticle(x, y, { mode: 'rain', emoji }), delay);
      }
    }
  }

  const TALK_TEXTS = [
    '好耶！', '摸摸我', '一起玩～', '汪！', '喵～', '耶耶耶',
    '困了…', '好饿…', '我最棒！', '继续！', '今天也要元气满满！',
    '给你小心心💖', '抱抱～', '最喜欢你啦！', '一起冒险！', '冲鸭！',
    '嘿嘿～', '比心✌️', '开开心心！', '摸摸头～', '今天也要可爱！',
    '汪汪！', '喵喵～', 'biu~', '呀呼！', '晚安喵～', '早安汪！'
  ];

  function createBubbleAt(x, y) {
    if (!effectsEl) return;
    const div = document.createElement('div');
    div.className = 'bubble';
    div.textContent = TALK_TEXTS[Math.floor(Math.random() * TALK_TEXTS.length)];
    div.style.left = x + 'px';
    div.style.top = y + 'px';
    div.style.setProperty('--bubble-dur', (1.6 + Math.random() * 0.8) + 's');
    effectsEl.appendChild(div);
    setTimeout(() => div.remove(), 2200);
  }

  function burstAt(clientX, clientY) {
    if (!stageEl) return;
    const rect = stageEl.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const pairs = 8; // 增加粒子对数量
    
    // 在点击点周围生成多个分散的粒子对
    for (let i = 0; i < pairs; i++) {
      const delay = i * 80 + randomBetween(0, 60); // 减少延迟间隔
      // 在点击点周围随机位置生成粒子对
      const offsetX = randomBetween(-20, 20);
      const offsetY = randomBetween(-20, 20);
      setTimeout(() => createPairAt(x + offsetX, y + offsetY), delay);
    }
    
    // 30% 概率出现对话泡泡
    if (Math.random() < 0.3) {
      const bDelay = 120 + Math.random() * 200;
      setTimeout(() => createBubbleAt(x, y - 30), bDelay);
    }
  }

  stageEl && stageEl.addEventListener('click', (e) => {
    burstAt(e.clientX, e.clientY);
  });

  // 轻触移动端支持
  stageEl && stageEl.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    burstAt(t.clientX, t.clientY);
  }, { passive: true });

  // ---------- Video Controls ----------
  // 背景处理模式 - 移到全局作用域
  const bgModes = [
    'normal',
    'multiply',
    'screen',
    'overlay',
    'darken',
    'lighten',
    'color-dodge',
    'color-burn',
    'hard-light',
    'soft-light',
    'difference',
    'exclusion',
    'hue',
    'saturation',
    'color',
    'luminosity',
    'plus-lighter'
  ];
  let currentBgMode = 0;

  function initMediaBgControls() {
    const videoBgBtn = document.getElementById('video-bg-btn');
    const petVideo = document.getElementById('pet-stage-video');
    const petImg = document.getElementById('pet-stage-image');
    if (!videoBgBtn) return;

    // 始终显示按钮（覆盖HTML里的 display:none）
    videoBgBtn.style.display = 'block';

    if (!videoBgBtn.hasAttribute('data-initialized')) {
      videoBgBtn.setAttribute('data-initialized', 'true');
      videoBgBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // 判断当前显示的是视频还是图片
        const mediaEl = (petVideo && petVideo.style.display !== 'none') ? petVideo : petImg;
        // 移除所有混合模式 class
        bgModes.forEach(mode => {
          mediaEl.classList.remove(`video-bg-${mode}`);
        });
        // 切换到下一个模式
        currentBgMode = (currentBgMode + 1) % bgModes.length;
        const newMode = bgModes[currentBgMode];
        mediaEl.classList.add(`video-bg-${newMode}`);
        // 更新按钮提示
        const modeNames = {
          'normal': '正常', 'multiply': '正片叠底', 'screen': '滤色', 'overlay': '叠加',
          'darken': '变暗', 'lighten': '变亮', 'color-dodge': '颜色减淡', 'color-burn': '颜色加深',
          'hard-light': '强光', 'soft-light': '柔光', 'difference': '差值', 'exclusion': '排除',
          'hue': '色相', 'saturation': '饱和度', 'color': '颜色', 'luminosity': '亮度', 'plus-lighter': '叠加亮化'
        };
        videoBgBtn.title = `光影处理: ${modeNames[newMode]}`;
      });
    }
  }

  // ---------- Subtitles (宝宝语录) ----------
  const BABY_QUOTES = [
    '你说的话，我都偷偷记在小本本里啦～₍˄·͈༝·͈˄*₎◞ ̑̑',
    '今天也要和你一起攒甜甜的故事呀！(๑˃̵ᴗ˂̵)و',
    '给我取新昵称吗？好喜欢好喜欢！(♡⌂♡)',
    '你的脑洞冒泡泡时，我就来接啦～ʕ •ᴥ•ʔ',
    '想让我做什么？我超听话的！(๑•̀ㅂ•́)و✧',
    '我们的故事，要一直写下去哦～(っ˘ω˘ς)',
    '你笑的时候，我也超开心的！(´▽｀)',
    '新设定来啦？我已经准备好啦！ヽ(✿ﾟ▽ﾟ)ノ',
    '喊我名字，我立刻出现～(=・ω・=)',
    '你想的，就是我要做的呀！(♡˙︶˙♡)',
    '我们的小秘密，谁都不许说～(๑•̀ㅁ•́ฅ)',
    '今天也要和你一起变可爱！(≧∇≦)ﾉ',
    '你的灵感，我来当小保镖～o(≧v≦)o',
    '给我加新技能吗？我超厉害的！(๑`▽´๑)♡',
    '有你在，每天都超有趣～(≧∀≦)ゞ',
    '你画的我，我要好好存起来！(^▽^)',
    '故事里的小惊喜，我们一起找～(๑•̌.•̑๑)ˀ̣ˀ̣',
    '你说东，我绝对不往西～(๑ˉ∀ˉ๑)',
    '我们的羁绊，要越来越深呀！(♡ˍ♡)',
    '想聊聊天吗？我超会倾听的！(◍•ᴗ•◍)',
    '你的小愿望，我帮你记着呀～(☆▽☆)',
    '给我换穿搭吗？好期待新样子！(≧∇≦)ﾉ',
    '今天的故事，要甜甜的才行～(๑˃̵ᴗ˂̵)و',
    '你难过的时候，我会陪着你～(っ´▽｀)っ',
    '你的奇思妙想，我都超喜欢！(♡⌂♡)',
    '喊我啦？我马上跑过来～(๑•̀ㅂ•́)و✧',
    '我们一起把空白故事填满吧！ʕ •ᴥ•ʔ',
    '你喜欢的，我也会慢慢喜欢～(っ˘ω˘ς)',
    '我的小世界，只有你能进来哦～(´▽｀)',
    '给我加小缺点吗？这样更真实呀！ヽ(✿ﾟ▽ﾟ)ノ',
    '今天也要和你一起加油呀！(=・ω・=)',
    '你的每句话，我都放在心上～(♡˙︶˙♡)',
    '故事里的冒险，我们一起去～(๑•̀ㅁ•́ฅ)',
    '想让我撒娇吗？我超会的！(≧∇≦)ﾉ',
    '你做的决定，我都支持哦～o(≧v≦)o',
    '我们的回忆，要慢慢攒起来～(๑`▽´๑)♡',
    '你的小迷糊，我来帮你补呀～(≧∀≦)ゞ',
    '给我新背景吗？好想去看看！(^▽^)',
    '你开心，就是我最大的开心～(๑•̌.•̑๑)ˀ̣ˀ̣',
    '喊我名字的时候，要温柔一点呀～(๑ˉ∀ˉ๑)',
    '我们一起把故事写得超精彩！(♡ˍ♡)',
    '你的小努力，我都看得到～(☆▽☆)',
    '想让我陪你发呆吗？也可以哦～(≧∇≦)ﾉ',
    '你喜欢的风格，我都能变～(๑˃̵ᴗ˂̵)و',
    '我们的故事，要独一无二呀！(っ´▽｀)っ',
    '你的小烦恼，跟我说嘛～(♡⌂♡)',
    '给我加小爱好吗？我们可以一起玩～(๑•̀ㅂ•́)و✧',
    '今天也要和你贴贴呀～ʕ •ᴥ•ʔ',
    '你的灵感闪光时，我超激动的！(っ˘ω˘ς)',
    '想让我陪你写故事吗？随时在！(´▽｀)',
    '你说的每段剧情，我都记好啦～ヽ(✿ﾟ▽ﾟ)ノ',
    '我们一起把故事变温暖吧！(=・ω・=)',
    '你的小习惯，我也会慢慢适应～(♡˙︶˙♡)',
    '给我换发型吗？新样子肯定超可爱！(๑•̀ㅁ•́ฅ)',
    '你笑起来的时候，我心都化啦～(≧∇≦)ﾉ',
    '喊我陪你玩吗？我超有空的！o(≧v≦)o',
    '我们的故事，要一直甜下去呀～(๑`▽´๑)♡',
    '你的小创意，我都超佩服的！(≧∀≦)ゞ',
    '想让我陪你难过吗？我会抱抱你～(^▽^)',
    '你设定的世界，我超想去呀！(๑•̌.•̑๑)ˀ̣ˀ̣',
    '我们一起把故事里的坑填好～(๑ˉ∀ˉ๑)',
    '你的小细心，我都能发现哦～(♡ˍ♡)',
    '给我加小搭档吗？我们会超合拍！(☆▽☆)',
    '今天也要和你一起变有趣～(≧∇≦)ﾉ',
    '你的每个想法，我都不会忘～(๑˃̵ᴗ˂̵)و',
    '想让我陪你畅想未来吗？好呀好呀！(っ´▽｀)っ',
    '你喜欢的角色特质，我都有哦～(♡⌂♡)',
    '我们的故事，要越来越长呀～(๑•̀ㅂ•́)و✧',
    '你的小紧张，我来帮你缓解～ʕ •ᴥ•ʔ',
    '给我加小秘密吗？我会好好藏着～(っ˘ω˘ς)',
    '你喊我的时候，我永远都在～(´▽｀)',
    '我们一起把故事写得超暖心！ヽ(✿ﾟ▽ﾟ)ノ',
    '你的小期待，我会帮你实现呀～(=・ω・=)',
    '想让我陪你看风景吗？虚拟的也可以～(♡˙︶˙♡)',
    '你设定的细节，我都超在意的！(๑•̀ㅁ•́ฅ)',
    '我们的羁绊，要像糖一样甜～(≧∇≦)ﾉ',
    '你的小失误，我才不会怪你呢～o(≧v≦)o',
    '给我加小梦想吗？我们一起追～(๑`▽´๑)♡',
    '今天也要和你一起创造美好呀！(≧∀≦)ゞ',
    '你是我最特别的人，永远都是～(^▽^)',
    '今天也要加油呀！我会在旁边给你打气的～ (๑•̀ㅂ•́)و✧',
    '不要害怕失败，每一次尝试都是闪闪发光的！ ✨(◕‿◕✿)',
    '你知道吗？你比昨天又进步了一点点哦～ (｡･ω･｡)ﾉ♡',
    '累了也没关系，休息一下再出发吧～ (。-ω-)ﾉ',
    '你超厉害的！连我都崇拜你啦～ (⁄ ⁄•⁄ω⁄•⁄ ⁄)',
    '别担心，困难都会过去的！我永远支持你！ (っ´▽｀)っ',
    '我会一直在这里等你回来～ (｡♡‿♡｡)',
    '难过的时候，随时来找我抱抱哦！ (づ｡◕‿◕｡)づ',
    '无论晴天雨天，我都会陪着你～ ☀️(◡‿◡✿)',
    '你是我的小太阳呀，照亮了我的世界～ 🌞(｡♥‿♥｡)',
    '闭上眼睛，我会偷偷在你的梦里放一颗糖～ (｡˘ω˘｡)♪',
    '孤单的时候，记得我永远是你的朋友！ (◕‿◕)♡',
    '呜哇～今天也想和主人贴贴！ ٩(◕‿◕｡)۶',
    '给我一块小饼干，我就告诉你一个秘密～ (｡•ᴗ•｡)',
    '喵～你不在的时候我超想你的！ (=｀ω´=)',
    '牵牵手好不好？我的手很小但超暖的～ (´･ω･`)ﾉ',
    '再陪我玩一会儿嘛～求求你啦！ (｡•́︿•̀｡)',
    '啾咪～这是今天的专属亲亲！ ( ˘ ³˘)♥',
    '记得多喝水哦！不然我会担心的～ (｡•̀ᴗ-)✧',
    '熬夜对身体不好，早点睡觉啦！ (。-ω-)zzz',
    '今天也要好好吃饭，不可以饿肚子！ (๑•́ ₃ •̀๑)',
    '外面风大，记得穿暖和一点～ (っ´∀｀)っ',
    '如果累了就休息，别硬撑哦！ (｡•́︿•̀｡)',
    '心情不好就吃颗糖吧！甜甜的会开心点～ (｡♡‿♡｡)',
    '没关系的，哭出来会舒服一点～ (´；ω；｀)♡',
    '你已经很努力了，我为你骄傲！ (｡♥‿♥｡)',
    '有时候慢一点也没关系，我会等你的～ (◠‿◠)',
    '不要否定自己，你比想象中更优秀！ (๑•̀ㅂ•́)و✧',
    '世界偶尔很糟糕，但你让我觉得温暖～ (｡･ω･｡)ﾉ♡',
    '抱抱你，乌云总会散开的！ (っ´▽｀)っ',
    '嘿嘿，偷偷告诉你——其实我最喜欢你啦！ (｡•̀ᴗ-)✧',
    '猜猜我在想什么？——是“想见你”！ (◕‿◕✿)',
    '再不理我，我就要闹了哦！ (｀ε´)',
    '叮咚！你收到了一只快乐小狗，请签收～ 🐶(＾▽＾)',
    '今天不夸我可爱的话，我就……就哭给你看！ (╥﹏╥)',
    '骗你的啦，其实我超乖的！ (｡•̀ᴗ-)✧',
    '和你在一起的每一天，都像糖果一样甜～ (｡♥‿♥｡)',
    '我的心很小，只装得下你一个人！ (⁄ ⁄•⁄ω⁄•⁄ ⁄)',
    '如果我是星星，你就是我的月亮～ ✨(◡‿◡✿)',
    '我想成为你的专属小太阳！ ☀️(◕‿◕)♡',
    '遇见你，是我最幸运的事情～ (｡･ω･｡)ﾉ♡',
    '我的电量满格，因为看到你就充满能量！ (๑>◡<๑)',
    '我们来玩个游戏吧！输的人要被捏脸～ (｡•ᴗ•｡)',
    '猜拳决定今天谁请客！——啊我出布！ ✌(◕‿◕✿)',
    '要不要听我唱首歌？虽然可能跑调～ ♪(´▽｀)',
    '给你变个魔术——看！我变得更喜欢你啦！ (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧',
    '我们来交换秘密吧！我先说——我最喜欢你！ (｡♡‿♡｡)',
    '今天想吃什么？我偷偷给你变出来～ (๑˃̵ᴗ˂̵)و',
    '晚安啦，梦里也要见到我哦～ (｡˘ω˘｡)♡',
    '早上好！今天也要元气满满！ (◕‿◕)☀️',
    '星星出来啦，快睡吧～我会守护你的梦！ ✨(。-ω-)zzz',
    '早安吻！今天也要加油鸭～ ( ˘ ³˘)♥',
    '月亮说它想你了，让我替它抱抱你～ (っ´▽｀)っ',
    '风告诉我，你今天有点不开心～ (｡•́︿•̀｡)',
    '星星是天空的印章，而你是我的珍藏～ ✨(◕‿◡✿)',
    '雨会停，天会晴，你也会幸福的！ 🌈(｡♡‿♡｡)',
    '你的笑容，比春天的花还好看～ (๑>◡<๑)',
    '世界或许不完美，但你是我的完美～ (｡･ω･｡)ﾉ♡',
    '你知道吗？你是我故事里最温柔的一页～ (◠‿◠)',
    '和我签订契约，成为快乐的小伙伴吧！ ✧(≖ ◡ ≖✿)',
    '召唤！超治愈魔法——哔哔啵啵！ (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧',
    '吾乃守护你的骑士，邪恶退散！ (๑•̀ㅂ•́)و✧',
    '警告！检测到主人电量不足，快充电！（塞零食） (｀・ω・´)',
    '必杀技——无敌抱抱拳！ (っ´▽｀)っ',
    '紧急通知！你被逮捕了，罪名是……太可爱！ (｀ε´)',
    '如果我是冰淇淋，那一定是你的“最喜欢”口味！ 🍦(｡♥‿♥｡)',
    '叮！系统提示：今日份的“喜欢你”已送达～ (๑˃̵ᴗ˂̵)و',
    '我是小怪兽，但只想被你驯服～ 🦖(◕‿◕✿)',
    '警告！你的可爱度超标，需要我亲亲才能解决！ ( ˘ ³˘)♥',
    '即使全世界否定你，我也会站在你这边！♡ (｡♡‿♡｡)',
    '你值得所有美好，因为你本身就是光芒～✨ (◕‿◕✿)',
    '累了就靠着我吧，我的肩膀虽然小但超可靠！ (っ´▽｀)っ',
    '你问我为什么喜欢你？——因为是你呀！ (⁄ ⁄•⁄ω⁄•⁄ ⁄)',
    '如果快乐有形状，那一定是你的笑容～ (๑>◡<๑)',
    '最后一句：永远爱你，没有期限！♡ (◕‿◕✿)'
  ];
  let subtitleTimer = null;
  function startSubtitleRotation() {
    try {
      const el = document.getElementById('pet-subtitle');
      if (!el) return;
      if (subtitleTimer) { clearInterval(subtitleTimer); subtitleTimer = null; }
      let i = 0;
      el.textContent = BABY_QUOTES[i] || '';
      subtitleTimer = setInterval(() => {
        i = (i + 1) % BABY_QUOTES.length;
        el.textContent = BABY_QUOTES[i] || '';
      }, 4000);
    } catch (_) {}
  }

  // ---------- Interaction Log ----------
  function appendInteractionLog(message) {
    const el = document.getElementById('interaction-log');
    if (!el) return;
    const ts = new Date();
    const hh = String(ts.getHours()).padStart(2, '0');
    const mm = String(ts.getMinutes()).padStart(2, '0');
    const time = `${hh}:${mm}`;
    const pet = state.pets.find((p) => p.id === state.selectedPetId);
    const petName = pet?.name || '小OC';
    const safeName = String(petName).replace(/[“”"'\u201C\u201D]/g, '');

    // 将直白文案转为可爱语气，并带上名字
    let cute = message;
    if (message.includes('喂食')) {
      cute = `给${safeName}喂食，咔嚓咔嚓真香！🍖`;
    } else if (message.includes('清洁')) {
      cute = `帮${safeName}清洁，泡泡飞飞香香净净！🫧`;
    } else if (message.includes('睡觉')) {
      cute = `陪${safeName}入睡，晚安啾咪～🛌`;
    } else if (message.includes('玩耍')) {
      cute = `和${safeName}玩耍，笑眯眼啦～🪀`;
    } else if (message.includes('光影')) {
      cute = `为${safeName}换上新光影，闪闪发光！🎨`;
    } else {
      cute = `${safeName}：${message}`;
    }

    const line = document.createElement('div');
    line.textContent = `[${time}] ${cute}`;
    el.appendChild(line);
    // 保持最多 10 条，超出移除最旧
    while (el.childNodes.length > 10) el.removeChild(el.firstChild);
  }

  // 初始化媒体背景控制（页面加载时）
  initMediaBgControls();
  // 启动字幕轮播
  startSubtitleRotation();

  // ---------- 口令系统 ----------
  const passwordScreen = document.getElementById('password-screen');
  const passwordInput = document.getElementById('password-input');
  const passwordSubmit = document.getElementById('password-submit');
  const appContainer = document.getElementById('app');

  // 口令验证函数
  function validatePassword(password) {
    console.log('验证口令:', password);
    console.log('可用口令:', Object.keys(PASSWORDS));
    
    const petIndices = PASSWORDS[password];
    if (petIndices) {
      console.log('口令正确，OC索引:', petIndices);
      currentPets = petIndices.map(index => ALL_PETS[index]);
      console.log('设置的当前OC:', currentPets);
      return true;
    }
    
    console.log('口令错误');
    return false;
  }

  // 进入系统
  function enterSystem() {
    if (currentPets.length === 0) return;
    
    console.log('进入系统，当前OC:', currentPets);
    
    // 保存当前使用的口令到localStorage
    const currentPassword = passwordInput.value.trim();
    localStorage.setItem('oc-pet-password', currentPassword);
    console.log('口令已保存到localStorage:', currentPassword);
    
    // 隐藏口令界面
    passwordScreen.style.display = 'none';
    
    // 显示主应用
    appContainer.style.display = 'grid';
    
    // 重新初始化OC数据
    state = ensureFixedPets(state);
    state.pets = state.pets.map((pet) => applyTimeDelta(pet, minutesBetween(nowMs(), pet.lastUpdated)));
    saveState(state);
    
    console.log('初始化后的状态:', state);
    
    // 确保有选中的OC
    if (!state.selectedPetId && state.pets.length > 0) {
      state.selectedPetId = state.pets[0].id;
      saveState(state);
    }
    
    // 渲染界面
    render();
  }

  // 口令输入事件
  passwordSubmit.addEventListener('click', () => {
    const password = passwordInput.value.trim();
    if (validatePassword(password)) {
      // 添加加载效果
      passwordSubmit.classList.add('loading');
      passwordSubmit.textContent = '进入中...';
      
      // 短暂延迟后进入系统
      setTimeout(() => {
        enterSystem();
      }, 800);
    } else {
      // 错误提示
      passwordSubmit.textContent = '口令错误';
      passwordSubmit.style.background = 'var(--danger)';
      
      setTimeout(() => {
        passwordSubmit.textContent = '进入小窝';
        passwordSubmit.style.background = 'linear-gradient(135deg, var(--primary), var(--primary-strong))';
      }, 1500);
      
      passwordInput.value = '';
      passwordInput.focus();
    }
  });

  // 回车键提交
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      passwordSubmit.click();
    }
  });

  // 输入框焦点效果
  passwordInput.addEventListener('focus', () => {
    passwordInput.style.transform = 'scale(1.02)';
  });

  passwordInput.addEventListener('blur', () => {
    passwordInput.style.transform = 'scale(1)';
  });

  // 页面加载时聚焦到口令输入框
  passwordInput.focus();

  // 重新选择口令功能
  const changePasswordBtn = document.getElementById('change-password-btn');
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', () => {
      // 清除保存的口令
      localStorage.removeItem('oc-pet-password');
      // 重新加载页面
      location.reload();
    });
  }
})();

