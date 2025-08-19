(() => {
  'use strict';

  // ---------- Utilities ----------
  // 临时禁用升级/成长
  // const LEVELING_DISABLED = true; // 移除
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const nowMs = () => Date.now();
  const minutesBetween = (a, b) => Math.floor((a - b) / 60000);
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

  const speciesToEmoji = (species) => {
    switch (species) {
      case '猫': return '🐱';
      case '狗': return '🐶';
      case '龙': return '🐉';
      case '狐狸': return '🦊';
      case '兔子': return '🐰';
      default: return '🐾';
    }
  };

  const levelToStage = (level) => {
    const l = Math.max(1, Math.min(3, Number(level) || 1));
    return l === 1 ? '幼年期' : l === 2 ? '成长期' : '成年期';
  };

  const speciesKey = (species) => {
    switch (species) {
      case '猫': return 'cat';
      case '狗': return 'dog';
      case '龙': return 'dragon';
      default: return 'pet';
    }
  };

  function loadPetMedia(pet) {
    const key = pet.id;
    const base = `assets/${key}`;
    const videoEl = document.getElementById('pet-stage-video');
    const imgEl = document.getElementById('pet-stage-image');
    if (!videoEl || !imgEl) return;
    const altText = `${pet.species}`;
    videoEl.alt = altText;
    imgEl.alt = altText;
    
    // 初始不加载图片，避免无意义的 404；仅在失败/超时时回退到图片
    videoEl.style.display = 'none';
    imgEl.style.display = 'none';
    // 仅尝试 WebM 视频；失败或超时则回退 PNG 图片
    while (videoEl.firstChild) videoEl.removeChild(videoEl.firstChild);
    const webmSource = document.createElement('source');
    webmSource.src = `${base}.webm`;
    webmSource.type = 'video/webm';
    videoEl.appendChild(webmSource);
    try { videoEl.muted = true; videoEl.playsInline = true; } catch (_) {}
    videoEl.load();
    
    const toImageFallback = () => {
      videoEl.style.display = 'none';
      imgEl.style.display = 'block';
      loadPetImage(imgEl, key);
    };

    const videoTimeout = setTimeout(() => { toImageFallback(); }, 8000);

    videoEl.onerror = () => {
      clearTimeout(videoTimeout);
      toImageFallback();
    };

    videoEl.onloadeddata = () => {
      clearTimeout(videoTimeout);
      videoEl.style.display = 'block';
      imgEl.style.display = 'none';
      setTimeout(() => { initMediaBgControls(); }, 100);
      const playVideo = async () => {
        try { await videoEl.play(); }
        catch (e) {
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
    
    videoEl.onended = () => {
      videoEl.currentTime = 0;
      videoEl.play().catch(() => { setTimeout(() => { videoEl.play().catch(() => {}); }, 100); });
    };

    setTimeout(() => { initMediaBgControls(); }, 100);
  }

  function loadPetImage(imgEl, key) {
    if (!imgEl) return;
    const base = `assets/${key}`;
    imgEl.alt = key;
    imgEl.onerror = null;
    imgEl.src = `${base}.png`;
    imgEl.onerror = () => {
      imgEl.onerror = null;
      imgEl.src = `${base}.jpg`;
      imgEl.onerror = () => {
        imgEl.onerror = null;
        imgEl.src = generatePetSvg(key);
      };
    };
  }

  // 生成宠物 SVG Data URL（根据物种与等级出不同配色与装饰）
  function generatePetSvg(key) {
    // 物种配色
    const palette = {
      'cat': ['#f472b6', '#60a5fa'],
      'dog': ['#f59e0b', '#f97316'],
      'dragon': ['#10b981', '#22d3ee'],
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

  // 三只固定宠物的初始定义，id写死
  const FIXED_PETS = [
    { id: 'pet-001', name: '可可', species: '猫' },
    { id: 'pet-002', name: '旺财', species: '狗' },
    { id: 'pet-003', name: '小青', species: '龙' },
    { id: 'pet-004', name: '阿狸', species: '狐狸' }
  ];

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_STATE };
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.pets)) return { ...DEFAULT_STATE };
      return { pets: data.pets, selectedPetId: data.selectedPetId ?? null };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  const actionsPanel = document.querySelector('.pet-stage .actions-panel');
  // 不允许释放固定宠物

  // 移除创建对话框相关节点引用

  // ---------- State ----------
  let state = loadState();
  let petListExpanded = false; // 新增：宠物列表展开状态

  // 保证四只固定宠物存在（ID固定，名称/种族/时期可编辑不影响ID和外观）
  function ensureFixedPets(stateIn) {
    const existingById = new Map((stateIn.pets || []).map((p) => [p.id, p]));
    const pets = FIXED_PETS.map((tpl) => {
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
      };
    });
    const selectedPetId = FIXED_PETS.some((p) => p.id === stateIn.selectedPetId) ? stateIn.selectedPetId : pets[0].id;
    return { pets, selectedPetId };
  }

  // 固定四只并追帧
  state = ensureFixedPets(state);
  state.pets = state.pets.map((pet) => applyTimeDelta(pet, minutesBetween(nowMs(), pet.lastUpdated)));
  saveState(state);

  // 自动修复历史数据：加载时为每只宠物补 id
  state.pets = state.pets.map((pet, idx) => {
    if (!pet.id) {
      pet.id = uid();
      // 控制台提示
      console.warn('宠物缺少id，已自动生成。请将原有资源文件重命名为：', pet.id);
    }
    return pet;
  });
  saveState(state);

  // ---------- Rendering ----------
  function render() {
    renderPetList();
    if (!state.selectedPetId) {
      emptyStateEl.classList.remove('hidden');
      detailEl.classList.add('hidden');
      return;
    }
    const pet = state.pets.find((p) => p.id === state.selectedPetId);
    if (!pet) {
      state.selectedPetId = null;
      saveState(state);
      render();
      return;
    }
    emptyStateEl.classList.add('hidden');
    detailEl.classList.remove('hidden');
    renderPetDetail(pet);
  }

  function renderPetList() {
    if (!listEl) return;
    
    // 清空现有内容
    listEl.innerHTML = '';
    
    // 创建宠物列表
    const petListUl = document.createElement('ul');
    petListUl.className = 'pet-sub-list';

    // 固定三只，列表必然有内容
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
    lastUpdatedEl.textContent = `上次更新：${formatTime(pet.lastUpdated)}`;
  }

  function renderPetDetail(pet) {
    nameEl.textContent = pet.name;
    speciesEl.textContent = pet.species;
    levelEl.textContent = pet.stage && pet.stage.trim() ? pet.stage : '';
    // 仅在进入/切换宠物时加载媒体，避免行动时闪烁
    loadPetMedia(pet);
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
          b.textContent = '🫧';
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

  feedBtn.addEventListener('click', () => { animatePet('feed'); updateSelected(ACTIONS.feed); });
  // 打开/收起小游戏面板（浮动到宠物容器，顶部对齐容器中心线）+ 玩耍动画
  playBtn.addEventListener('click', () => {
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

      // 作为浮动层显示在宠物容器位置：顶部对齐容器中心线，保持原宽度
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
  sleepBtn.addEventListener('click', () => { animatePet('sleep'); updateSelected(ACTIONS.sleep); });
  cleanBtn.addEventListener('click', () => { animatePet('clean'); updateSelected(ACTIONS.clean); });

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

  renameBtn.addEventListener('click', () => {
    const pet = state.pets.find((p) => p.id === state.selectedPetId);
    if (!pet) return;
    const dlg = document.getElementById('rename-dialog');
    const nameInput = document.getElementById('rename-name');
    const speciesInput = document.getElementById('rename-species');
    const stageInput = document.getElementById('rename-stage');
    const saveBtn = document.getElementById('rename-save');
    const cancelBtn = document.getElementById('rename-cancel');
    if (!dlg || !nameInput || !speciesInput || !stageInput || !saveBtn || !cancelBtn) return;

    // 预填
    nameInput.value = pet.name || '';
    speciesInput.value = pet.species || '猫';
    stageInput.value = pet.stage || '';

    // 打开
    try { dlg.showModal(); } catch (_) { dlg.setAttribute('open', 'true'); }

    const onCancel = () => {
      dlg.close && dlg.close();
      dlg.removeAttribute('open');
      saveBtn.removeEventListener('click', onSave);
      cancelBtn.removeEventListener('click', onCancel);
    };

    const onSave = () => {
      const newName = nameInput.value.trim().slice(0, 20);
      const newSpecies = speciesInput.value.trim().slice(0, 10);
      const newStage = stageInput.value.trim().slice(0, 10);
      if (newName) pet.name = newName;
      if (newSpecies) pet.species = newSpecies;
      pet.stage = newStage; // 保存自定义时期
      pet.lastUpdated = nowMs();
    saveState(state);
    render();
      onCancel();
    };

    saveBtn.addEventListener('click', onSave);
    cancelBtn.addEventListener('click', onCancel);
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

  // 海龟汤（简化为故事+提示+答案）
  const SOUPS = [
    { s: '一个人走进餐厅点了海龟汤，喝完后哭了。为什么？', h: '与过去经历相关', a: '他曾在海难中被救起，后来发现当时并不是海龟汤。' },
    { s: '深夜路口红灯亮着，没有车也没有人，一个人却一直不过。为什么？', h: '职业相关', a: '他是交警，正在值守。' },
    { s: '一个人看完一条短信后立刻松了口气。为什么？', h: '等待的结果来了', a: '医院短信告知手术成功。' },
    { s: '一个人半夜打电话给陌生人，说了声谢谢就挂了。为什么？', h: '确认了某件事', a: '拨错电话却确认了对方平安。' },
    { s: '男人进门看到桌上鲜花，转身离开家。为什么？', h: '不是送给他的', a: '花是妻子送给外卖小哥的感谢，男人误会了。' },
    { s: '一位司机到家后把方向盘带走了。为什么？', h: '避免被偷', a: '老旧车，方向盘可拆卸防盗。' },
    { s: '小孩每次考试都只拿第二名。为什么？', h: '与人有关', a: '父母名字分别叫一名和三名。' },
    { s: '她在婚礼前一晚剪坏了婚纱，却笑了。为什么？', h: '摆脱了某件事', a: '被迫婚约，借机取消婚礼。' },
    { s: '他每天都去海边捡瓶子。为什么？', h: '寻找线索', a: '在找遇难亲人的求救信息。' },
    { s: '他收到了一个空盒子，却异常开心。为什么？', h: '象征意义', a: '空盒子代表"重启"，是朋友的鼓励。' },
    { s: '她把戒指扔进湖里，第二天却戴上了。为什么？', h: '有人帮忙', a: '潜水员朋友帮她找回并劝和。' },
    { s: '他给自己寄了一封没有地址的信。为什么？', h: '测试', a: '测试邮局是否会退回，证明地址无效。' },
    { s: '他搬家后第一件事是敲门拜访邻居。为什么？', h: '确认安全', a: '确认火灾逃生通道和邻里支援。' },
    { s: '她每天睡前都把鞋子翻过来。为什么？', h: '心理暗示', a: '象征把不顺心倒出去。' },
    { s: '他把手机关机放进冰箱。为什么？', h: '冷却或隔绝', a: '被骚扰，暂时隔绝信号和降温。' },
    { s: '她拿着伞却被淋湿。为什么？', h: '风', a: '大风把雨吹到侧面，伞挡不住。' },
    { s: '老人每天清晨擦拭门牌。为什么？', h: '在等人', a: '怕邮差找不到门，等孙儿来信。' },
    { s: '他在电梯里对着镜头鞠躬。为什么？', h: '礼貌', a: '楼管监控前致意，感谢帮助。' },
    { s: '她每次看书都先翻到最后一页。为什么？', h: '确认结局', a: '焦虑，先读结局减轻焦虑。' },
    { s: '男子半夜常起床写字条。为什么？', h: '怕忘', a: '记录梦中灵感。' }
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
  const openPetListBtn = document.getElementById('open-pet-list-btn');
  const petPickerDropdown = document.getElementById('pet-picker-dropdown');

  // 顶部按钮改为下拉选择器
  function renderPetPicker() {
    if (!petPickerDropdown) return;
    petPickerDropdown.innerHTML = '';
    state.pets.forEach((pet) => {
      const item = document.createElement('div');
      item.className = `pet-picker-item ${pet.id === state.selectedPetId ? 'active' : ''}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', pet.id === state.selectedPetId ? 'true' : 'false');
      item.innerHTML = `
        <span class="pet-emoji">${speciesToEmoji(pet.species)}</span>
        <div class="pet-item-main">
          <span class="pet-item-name">${pet.name}</span>
        </div>
      `;
      item.addEventListener('click', () => {
        state.selectedPetId = pet.id;
        saveState(state);
        render();
        petPickerDropdown.classList.add('hidden');
      });
      petPickerDropdown.appendChild(item);
    });
  }

  openPetListBtn && openPetListBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!petPickerDropdown) return;
    renderPetPicker();
    petPickerDropdown.classList.toggle('hidden');
  });

  // 点击页面空白处关闭
  document.addEventListener('click', (e) => {
    if (!petPickerDropdown || petPickerDropdown.classList.contains('hidden')) return;
    const within = petPickerDropdown.contains(e.target) || (openPetListBtn && openPetListBtn.contains(e.target));
    if (!within) petPickerDropdown.classList.add('hidden');
  });

  // 关闭移动端宠物列表
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



  // 同步移动端宠物列表
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
        const bubbles = ['🫧', '⚪', '🔵', '◌', '◯'];
        const emoji = bubbles[Math.floor(Math.random() * bubbles.length)];
        setTimeout(() => createParticle(x, y, { mode: 'rain', emoji }), delay);
      }
    }
  }

  const TALK_TEXTS = [
    '好耶！', '给我摸摸', '一起玩～', '汪！', '喵～', '耶耶耶',
    '困了…', '好饿…', '我最棒！', '继续！', '今天也要元气满满！'
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
        videoBgBtn.title = `背景处理: ${modeNames[newMode]}`;
      });
    }
  }

  // 初始化媒体背景控制（页面加载时）
  initMediaBgControls();
})();

