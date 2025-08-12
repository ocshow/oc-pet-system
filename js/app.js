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
  const exportBtn = $('#export-btn');
  const importInput = $('#import-input');

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
  // 不允许释放固定宠物

  // 移除创建对话框相关节点引用

  // ---------- State ----------
  let state = loadState();

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
    listEl.innerHTML = '';

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

      listEl.appendChild(li);
    });
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

  feedBtn.addEventListener('click', () => updateSelected(ACTIONS.feed));
  // 打开/收起右侧内嵌小游戏面板
  playBtn.addEventListener('click', () => {
    const panel = document.getElementById('play-panel');
    if (!panel) return;
    const willShow = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !willShow);
    if (willShow) {
      initRiddle();
      initJoke();
      initSoup();
      initNumberGame(true);
      setActiveTab('riddle');
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
  sleepBtn.addEventListener('click', () => updateSelected(ACTIONS.sleep));
  cleanBtn.addEventListener('click', () => updateSelected(ACTIONS.clean));

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

  // ---------- Import / Export ----------
  exportBtn.addEventListener('click', () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    a.href = url;
    a.download = `oc-pets-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  importInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const incoming = JSON.parse(text);
      if (!incoming || !Array.isArray(incoming.pets)) throw new Error('格式不正确');
      if (!confirm('导入将替换当前数据，是否继续？')) return;
      state = {
        pets: (incoming.pets || []).map((p) => ({ ...p, lastUpdated: p.lastUpdated ?? nowMs() })),
        selectedPetId: incoming.selectedPetId ?? null
      };
      // 固定三只并追帧
      state = ensureFixedPets(state);
      state.pets = state.pets.map((pet) => applyTimeDelta(pet, minutesBetween(nowMs(), pet.lastUpdated)));
      saveState(state);
      render();
    } catch (err) {
      alert('导入失败：' + (err?.message || '未知错误'));
    } finally {
      importInput.value = '';
    }
  });

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
    panel && panel.classList.add('hidden');
  });

  // 猜谜语
  const RIDDLES = [
    { q: '什么东西有很多牙齿，却从不咬人？', a: '梳子', h: '每天用来打理头发' },
    { q: '什么门永远关不上？', a: '球门', h: '绿茵场上' },
    { q: '什么东西总是向上，却从不下降？', a: '年龄', h: '和生日有关' },
  ];
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
  ];
  let soupIndex = 0;
  function initSoup() {
    soupIndex = Math.floor(Math.random() * SOUPS.length);
    const s = document.getElementById('soup-story');
    const extra = document.getElementById('soup-extra');
    s && (s.textContent = SOUPS[soupIndex].s);
    extra && (extra.textContent = '');
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

  // ---------- Mobile Sidebar Logic ----------
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobilePetOverlay = document.getElementById('mobile-pet-overlay');
  const closeMobilePetBtn = document.getElementById('close-mobile-pet');
  const closeSidebarBtn = document.getElementById('close-sidebar-btn');
  const mobileExportBtn = document.getElementById('mobile-export-btn');
  const mobileImportInput = document.getElementById('mobile-import-input');

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

  // 移动端导入导出功能
  mobileExportBtn && mobileExportBtn.addEventListener('click', () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    a.href = url;
    a.download = `oc-pets-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  mobileImportInput && mobileImportInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const incoming = JSON.parse(text);
      if (!incoming || !Array.isArray(incoming.pets)) throw new Error('格式不正确');
      if (!confirm('导入将替换当前数据，是否继续？')) return;
      state = {
        pets: (incoming.pets || []).map((p) => ({ ...p, lastUpdated: p.lastUpdated ?? nowMs() })),
        selectedPetId: incoming.selectedPetId ?? null
      };
      // 固定三只并追帧
      state = ensureFixedPets(state);
      state.pets = state.pets.map((pet) => applyTimeDelta(pet, minutesBetween(nowMs(), pet.lastUpdated)));
      saveState(state);
      render();
    } catch (err) {
      alert('导入失败：' + (err?.message || '未知错误'));
    } finally {
      mobileImportInput.value = '';
    }
  });

  // 同步移动端宠物列表
  function syncMobilePetList() {
    const mobilePetList = document.getElementById('mobile-pet-list');
    if (!mobilePetList) return;
    
    mobilePetList.innerHTML = '';
    state.pets.forEach((pet, index) => {
      const li = document.createElement('li');
      li.className = `pet-item ${index === state.selectedPetIndex ? 'active' : ''}`;
      li.innerHTML = `
        <span class="pet-emoji">${speciesToEmoji(pet.species)}</span>
        <div class="pet-item-main">
          <span class="pet-item-name">${pet.name}</span>
          <span class="pill">${pet.species}</span>
        </div>
      `;
      
      li.addEventListener('click', () => {
        selectPet(index);
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
      type === 2 ? '🫧' :
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

