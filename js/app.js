(() => {
  'use strict';

  // ---------- Utilities ----------
  // 临时禁用升级/成长
  const LEVELING_DISABLED = true;
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

  function loadPetImage(imgEl, species, level) {
    if (!imgEl) return;
    const safeLevel = LEVELING_DISABLED ? 1 : Math.max(1, Math.min(3, Number(level) || 1));
    const key = speciesKey(species);
    const base = `assets/${key}-${safeLevel}`;
    imgEl.alt = `${species} - ${levelToStage(level)}`;
    // 尝试 PNG → JPG → SVG 回退
    imgEl.onerror = null;
    imgEl.src = `${base}.png`;
    imgEl.onerror = () => {
      imgEl.onerror = null;
      imgEl.src = `${base}.jpg`;
      imgEl.onerror = () => {
        imgEl.onerror = null;
        imgEl.src = generatePetSvg(species, safeLevel);
      };
    };
  }

  // 生成宠物 SVG Data URL（根据物种与等级出不同配色与装饰）
  function generatePetSvg(species, level) {
    const safeLevel = LEVELING_DISABLED ? 1 : Math.max(1, Math.min(3, Number(level) || 1));
    // 物种配色
    const palette = {
      '猫': ['#f472b6', '#60a5fa'],     // 粉 + 蓝
      '狗': ['#f59e0b', '#f97316'],     // 黄 + 橙
      '龙': ['#10b981', '#22d3ee'],     // 绿 + 青
      '默认': ['#60a5fa', '#34d399']
    };
    const [c1, c2] = (palette[species] || palette['默认']);
    // 依据等级改变面部表情/装饰
    const mouthPath = safeLevel === 1
      ? 'M40 78C48 82 80 82 88 78'
      : safeLevel === 2
      ? 'M40 78C48 90 80 90 88 78'
      : 'M42 82C56 70 72 70 86 82';
    const blush = safeLevel >= 2
      ? '<circle cx="44" cy="68" r="3" fill="#fda4af"/><circle cx="84" cy="68" r="3" fill="#fda4af"/>'
      : '';
    const ear = species === '猫'
      ? '<path d="M32 46L44 30L50 52" fill="#fff" fill-opacity="0.18"/><path d="M96 46L84 30L78 52" fill="#fff" fill-opacity="0.18"/>'
      : species === '狗'
      ? '<path d="M30 48C30 34 46 28 50 38C46 48 38 54 30 48Z" fill="#000" fill-opacity="0.12"/><path d="M98 48C98 34 82 28 78 38C82 48 90 54 98 48Z" fill="#000" fill-opacity="0.12"/>'
      : species === '龙'
      ? '<path d="M32 40L46 36L40 52Z" fill="#0ea5e9" fill-opacity="0.35"/><path d="M96 40L82 36L88 52Z" fill="#0ea5e9" fill-opacity="0.35"/>'
      : '';
    const badgeText = safeLevel === 1 ? '幼年' : safeLevel === 2 ? '成长' : '成年';
    const badge = `<rect x="78" y="18" rx="8" ry="8" width="40" height="24" fill="#0b1020" fill-opacity="0.55"/>
<text x="98" y="35" font-size="12" text-anchor="middle" fill="#e2e8f0" font-family="Inter,Arial">${badgeText}</text>`;
    const deco = safeLevel === 2
      ? '<path d="M64 14l3 6 6 1-6 2-3 6-3-6-6-2 6-1 3-6Z" fill="#fcd34d" fill-opacity="0.8"/>'
      : safeLevel === 3
      ? '<path d="M52 16L64 10L76 16L74 28H54L52 16Z" fill="#f59e0b" fill-opacity="0.9"/>'
      : '';
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
    ${deco}
    <circle cx="64" cy="64" r="44" fill="url(#g)"/>
    ${ear}
    <circle cx="48" cy="56" r="6" fill="#0b1020"/>
    <circle cx="80" cy="56" r="6" fill="#0b1020"/>
    <path d="${mouthPath}" stroke="#0b1020" stroke-width="6" stroke-linecap="round"/>
    ${blush}
    ${badge}
  </g>
</svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  // ---------- Persistence ----------
  const STORAGE_KEY = 'oc-pet-system/v1';
  const DEFAULT_STATE = { pets: [], selectedPetId: null };

  // 三只固定宠物的初始定义
  const FIXED_PETS = [
    { name: '可可', species: '猫' },
    { name: '旺财', species: '狗' },
    { name: '小青', species: '龙' }
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
  function createPet({ name, species }) {
    const timestamp = nowMs();
    return {
      id: uid(),
      name: name.trim(),
      species,
      hunger: 30,       // 0 好，100 饿
      happiness: 70,    // 0 差，100 好
      energy: 70,       // 0 困，100 精力足
      cleanliness: 80,  // 0 脏，100 干净
      xp: 0,            // 0..100 每升1级清零
      level: 1,
      lastUpdated: timestamp
    };
  }

  function applyTimeDelta(pet, minutes) {
    if (minutes <= 0) return pet;
    // 按分钟衰减/增长
    const hungerDelta = +1.0 * minutes; // 越来越饿
    const energyDelta = -0.5 * minutes;
    const cleanlinessDelta = -0.3 * minutes;
    // 快乐根据饥饿程度变化
    const happinessDelta = (pet.hunger > 70 ? -0.5 : -0.2) * minutes;

    return {
      ...pet,
      hunger: clamp(pet.hunger + hungerDelta, 0, 100),
      energy: clamp(pet.energy + energyDelta, 0, 100),
      cleanliness: clamp(pet.cleanliness + cleanlinessDelta, 0, 100),
      happiness: clamp(pet.happiness + happinessDelta, 0, 100),
      lastUpdated: pet.lastUpdated + minutes * 60000
    };
  }

  function gainXpAndMaybeLevelUp(pet, gained) {
    // 升级功能暂时关闭：不增加经验、不改变等级
    if (LEVELING_DISABLED) {
      return pet;
    }
    // 限定 1..3 级；达到 3 级后经验固定满
    if (pet.level >= 3) {
      return { ...pet, level: 3, xp: 100 };
    }
    let xp = clamp(pet.xp + gained, 0, 1000);
    let level = pet.level;
    while (xp >= 100 && level < 3) {
      xp -= 100;
      level += 1;
    }
    if (level >= 3) {
      level = 3;
      xp = 100;
    }
    return { ...pet, xp, level };
  }

  const ACTIONS = {
    feed(pet) {
      const updated = {
        ...pet,
        hunger: clamp(pet.hunger - 20, 0, 100),
        happiness: clamp(pet.happiness + 5, 0, 100)
      };
      return gainXpAndMaybeLevelUp(updated, 5);
    },
    play(pet) {
      const updated = {
        ...pet,
        happiness: clamp(pet.happiness + 15, 0, 100),
        energy: clamp(pet.energy - 15, 0, 100),
        cleanliness: clamp(pet.cleanliness - 10, 0, 100)
      };
      return gainXpAndMaybeLevelUp(updated, 10);
    },
    sleep(pet) {
      const updated = {
        ...pet,
        energy: clamp(pet.energy + 25, 0, 100),
        hunger: clamp(pet.hunger + 10, 0, 100)
      };
      return gainXpAndMaybeLevelUp(updated, 5);
    },
    clean(pet) {
      const updated = {
        ...pet,
        cleanliness: clamp(pet.cleanliness + 40, 0, 100)
      };
      return gainXpAndMaybeLevelUp(updated, 3);
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

  // 保证固定三只宠物存在（首次自动生成；导入后也调用同逻辑）
  function ensureFixedPets(stateIn) {
    const existing = stateIn.pets || [];
    // 若已有存档，原样保留，仅校正选中项
    if (existing.length > 0) {
      let selectedPetId = stateIn.selectedPetId;
      if (!existing.find((p) => p.id === selectedPetId)) selectedPetId = existing[0]?.id || null;
      return { pets: existing, selectedPetId };
    }
    // 无存档时，提供三只默认宠物作为初始数据
    const pets = FIXED_PETS.map((fp) => createPet(fp));
    const selectedPetId = pets[0]?.id || null;
    return { pets, selectedPetId };
  }

  // 固定三只并追帧
  state = ensureFixedPets(state);
  state.pets = state.pets.map((pet) => applyTimeDelta(pet, minutesBetween(nowMs(), pet.lastUpdated)));
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

    // 创建外层下拉容器（相对定位）
    const dropdownLi = document.createElement('li');
    dropdownLi.className = 'pet-dropdown';

    // 创建品牌标题（可点击展开）
    const brandLi = document.createElement('li');
    brandLi.className = 'brand-toggle';
    brandLi.setAttribute('role', 'button');
    brandLi.setAttribute('aria-expanded', String(petListExpanded));
    brandLi.innerHTML = `
      <div class="brand">
        <div class="brand-logo">🐾</div>
        <div class="brand-name">OC 宠物系统</div>
      </div>
      <span class="toggle-icon">${petListExpanded ? '▼' : '▶'}</span>
    `;
    brandLi.addEventListener('click', () => {
      petListExpanded = !petListExpanded;
      renderPetList();
    });

    // 创建浮动宠物列表容器（绝对定位到品牌项下方）
    const floatingContainer = document.createElement('div');
    floatingContainer.className = `floating-pet-list ${petListExpanded ? 'expanded' : 'collapsed'}`;
    
    // 创建宠物列表
    const petListUl = document.createElement('ul');
    petListUl.className = 'pet-sub-list';

    // 固定三只，列表必然有内容
    state.pets.forEach((pet) => {
      const li = document.createElement('li');
      li.className = 'pet-item' + (pet.id === state.selectedPetId ? ' active' : '');
      li.title = `${pet.name}（${pet.species}） Lv.${LEVELING_DISABLED ? 1 : pet.level}`;

      const emoji = document.createElement('div');
      emoji.className = 'pet-emoji';
      emoji.textContent = speciesToEmoji(pet.species);

      const main = document.createElement('div');
      main.className = 'pet-item-main';

      const name = document.createElement('div');
      name.className = 'pet-item-name';
      name.textContent = pet.name;

      const meta = document.createElement('span');
      meta.className = 'pill';
      meta.textContent = `Lv.${LEVELING_DISABLED ? 1 : pet.level}`;

      main.appendChild(name);
      main.appendChild(meta);

      li.appendChild(emoji);
      li.appendChild(main);

      li.addEventListener('click', () => {
        state.selectedPetId = pet.id;
        saveState(state);
        render();
      });

      petListUl.appendChild(li);
    });

    floatingContainer.appendChild(petListUl);

    // 组装：品牌 + 浮动列表 放入同一个 li
    dropdownLi.appendChild(brandLi);
    dropdownLi.appendChild(floatingContainer);

    // 放入主列表
    listEl.appendChild(dropdownLi);
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

  function renderPetDetail(pet) {
    nameEl.textContent = pet.name;
    speciesEl.textContent = pet.species;
    levelEl.textContent = levelToStage(LEVELING_DISABLED ? 1 : pet.level);
    const stageImg = document.getElementById('pet-stage-image');
    loadPetImage(stageImg, pet.species, pet.level);

    const hungerPercent = pet.hunger;            // 越小越好
    const happinessPercent = pet.happiness;
    const energyPercent = pet.energy;
    const cleanlinessPercent = pet.cleanliness;
    const xpPercent = (pet.xp / 100) * 100;

    // 更新进度条宽度
    hungerBar.style.width = `${hungerPercent}%`;
    happinessBar.style.width = `${happinessPercent}%`;
    energyBar.style.width = `${energyPercent}%`;
    cleanlinessBar.style.width = `${cleanlinessPercent}%`;
    xpBar.style.width = `${xpPercent}%`;

    // 添加低值警告效果
    hungerBar.classList.toggle('low', hungerPercent < 30);
    happinessBar.classList.toggle('low', happinessPercent < 30);
    energyBar.classList.toggle('low', energyPercent < 30);
    cleanlinessBar.classList.toggle('low', cleanlinessPercent < 30);
    xpBar.classList.toggle('low', xpPercent < 30);

    hungerText.textContent = `${Math.round(pet.hunger)}`;
    happinessText.textContent = `${Math.round(pet.happiness)}`;
    energyText.textContent = `${Math.round(pet.energy)}`;
    cleanlinessText.textContent = `${Math.round(pet.cleanliness)}`;
    xpText.textContent = `${Math.round(pet.xp)}/100`;

    lastUpdatedEl.textContent = `上次更新：${formatTime(pet.lastUpdated)}`;
  }

  // ---------- Pet Animations ----------
  function animatePet(kind) {
    const stage = document.querySelector('.pet-stage');
    const img = document.getElementById('pet-stage-image');
    if (!stage || !img) return;

    if (kind === 'feed') {
      // 1) 图像咀嚼动画
      img.classList.remove('anim-chew');
      // 触发重排以便重复动画
      // eslint-disable-next-line no-unused-expressions
      img.offsetWidth;
      img.classList.add('anim-chew');

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
      img.classList.remove('anim-wiggle');
      img.offsetWidth;
      img.classList.add('anim-wiggle');

      const toy = document.createElement('div');
      toy.className = 'toy-fx';
      toy.textContent = '🪀';
      stage.appendChild(toy);
      toy.addEventListener('animationend', () => toy.remove());
    } else if (kind === 'sleep') {
      img.classList.remove('anim-snooze');
      img.offsetWidth;
      img.classList.add('anim-snooze');

      const z = document.createElement('div');
      z.className = 'zzz-fx';
      z.textContent = '💤';
      stage.appendChild(z);
      z.addEventListener('animationend', () => z.remove());
    } else if (kind === 'clean') {
      img.classList.remove('anim-shake');
      img.offsetWidth;
      img.classList.add('anim-shake');

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
    render();
  }

  // 完成小游戏后给予奖励
  function rewardAfterMiniGame(kind) {
    const bonus = kind === 'joke' ? 8 : kind === 'riddle' ? 12 : kind === 'soup' ? 15 : 10;
    updateSelected((pet) => {
      const updated = {
        ...pet,
        happiness: clamp(pet.happiness + bonus, 0, 100),
        energy: clamp(pet.energy - 5, 0, 100),
      };
      return gainXpAndMaybeLevelUp(updated, Math.ceil(bonus / 2));
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
    const name = prompt('请输入新的名字：', pet.name);
    if (!name) return;
    pet.name = name.trim().slice(0, 20) || pet.name;
    saveState(state);
    render();
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
    renderPetDetail(updated);
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
    { q: '什么字写错了也没人会说错？', a: '“错”字', h: '字面意思' },
    { q: '什么东西生在水里，死在锅里，埋在肚里？', a: '鱼', h: '美食' },
    { q: '什么植物一出生就带“胡子”？', a: '玉米', h: '玉米须' },
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
    '今天打算早睡，结果计划赶不上“刷短视频”的变化。',
    '我决定明天开始健身，前提是明天永远不要来。',
    '手机电量% 就像自律程度，看的挺多，用的挺少。',
    '闹钟叫醒不了装睡的人，但能叫醒全宿舍的人。',
    '我不是不想起床，是被被子“软禁”了。',
    '出去跑步十分钟，我的灵魂先回来了。',
    '我和沙发是真爱，一坐就分不开。',
    '钱包：我瘦了，你开心了吗？',
    '喝奶茶不胖的秘诀：买了就当没喝。',
    '减肥小妙招：先把体重秤藏起来。',
    '自拍与身份证照片的区别，就像梦想和现实。',
    '考试时最怕的不是不会，而是会的都没考。',
    '我不是“社恐”，我只是“社懒”。',
    '我不熬夜，夜熬我。',
    '我最擅长的运动是“翻身继续睡”。',
    '人生就是起起落落落落……然后再起一点点。',
    '想吃零食的时候，先喝口水……然后继续吃。',
    '谁说鱼的记忆只有秒？我的密码输错三次就全忘了。',
    '我练了很久的腹肌，最后练成了“一块腹肌”。',
    '早睡的人都有一个共同点：不是我。',
    '我给自己定了个目标：再拖延一天。',
    '追剧到一半卡住了，我的心也卡住了。',
    '我不是单身，我是“恋爱未上线”。',
    '段子看多了，生活也开始自带字幕了。',
    '我最喜欢的运动是“躺平”，不费力还省心。',
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
    '我的字典里没有“放弃”，因为我从来没开始。',
    '所谓成熟，就是学会在买单时保持微笑。',
    '我最大的优点是乐观，最大的缺点是过于乐观。',
    '如果人生是一场游戏，我肯定是选择了“休闲模式”。',
    '天气预报说今天有太阳，结果太阳说它加班。',
    '小时候想当科学家，长大后只想当“有钱人”。',
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
    { s: '他收到了一个空盒子，却异常开心。为什么？', h: '象征意义', a: '空盒子代表“重启”，是朋友的鼓励。' },
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

  // 移动端菜单按钮点击事件
  mobileMenuBtn && mobileMenuBtn.addEventListener('click', () => {
    mobilePetOverlay.style.display = 'block';
    // 强制重排后添加active类
    requestAnimationFrame(() => {
      mobilePetOverlay.classList.add('active');
    });
    // 同步移动端宠物列表
    syncMobilePetList();
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
          <span class="pill">${pet.species}</span>
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

  function createParticle(x, y) {
    if (!effectsEl) return;
    const el = document.createElement('div');
    el.className = 'particle';
    const type = Math.floor(Math.random() * 6);
    const size = randomBetween(16, 30);
    const dx = randomBetween(-80, 80);
    const dy = randomBetween(120, 200);
    const dur = randomBetween(1.0, 1.8);
    el.style.setProperty('--x', x + 'px');
    el.style.setProperty('--y', y + 'px');
    el.style.setProperty('--dx', dx + 'px');
    el.style.setProperty('--dy', dy + 'px');
    el.style.setProperty('--dur', dur + 's');
    el.style.fontSize = size + 'px';
    // 更多样式：爱心、星、泡泡、气球、花朵、闪电
    el.textContent = (
      type === 0 ? '💖' :
      type === 1 ? '✨' :
      type === 2 ? '✰' :
      type === 3 ? '🎈' :
      type === 4 ? '🌸' :
      '⚡'
    );
    // 随机动画方向
    const anim = Math.random() < 0.33 ? 'float-left' : (Math.random() < 0.5 ? 'float-right' : 'float-up');
    el.style.setProperty('--anim', anim);
    effectsEl.appendChild(el);
    setTimeout(() => el.remove(), dur * 1000);
  }

  function createPairAt(x, y) {
    createParticle(x + randomBetween(-12, 12), y + randomBetween(-12, 12));
    createParticle(x + randomBetween(-12, 12), y + randomBetween(-12, 12));
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
    const pairs = 5; // 共生成5对
    for (let i = 0; i < pairs; i++) {
      const delay = i * 120 + randomBetween(0, 80);
      setTimeout(() => createPairAt(x, y), delay);
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
})();

