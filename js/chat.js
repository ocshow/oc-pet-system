(() => {
  'use strict';

  const CHAT_STORAGE_KEY = 'oc-pet-system/chat';
  const AI_SETTINGS_KEY = 'oc-pet-system/ai-settings';
  const STATE_KEY = 'oc-pet-system/v1';

  const $ = (s) => document.querySelector(s);
  const chatMessagesEl = $('#chat-messages');
  const chatInputEl = $('#chat-input');
  const chatSendBtn = $('#chat-send');
  const chatSettingsBtn = $('#chat-settings');
  const chatBackBtn = $('#chat-back-btn');
  const chatTitleEl = $('#chat-title');
  const chatPersonalityBtn = $('#chat-personality-btn');

  const params = new URLSearchParams(location.search);
  const currentPetId = params.get('pet') || (JSON.parse(localStorage.getItem(STATE_KEY) || '{}')?.selectedPetId || '');

  function loadState() { try { return JSON.parse(localStorage.getItem(STATE_KEY) || '{}'); } catch(_) { return {}; } }
  function loadChat() { try { return JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '{}'); } catch(_) { return {}; } }
  function saveChat(s) { try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(s||{})); } catch(_) {} }
  function loadAi() { try { return JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) || '{}'); } catch(_) { return {}; } }
  function loadPersonality() { try { return JSON.parse(localStorage.getItem('oc-pet-system/personality') || '{}'); } catch(_) { return {}; } }
  function savePersonality(s) { try { localStorage.setItem('oc-pet-system/personality', JSON.stringify(s||{})); } catch(_) {} }
  function loadInteractionLog() { try { return JSON.parse(localStorage.getItem('oc-pet-system/interaction-log') || '{}'); } catch(_) { return {}; } }

  let chatState = loadChat();
  
  // 获取最近的互动记录
  function getRecentInteractions() {
    const interactionLog = loadInteractionLog();
    const petInteractions = interactionLog[currentPetId] || [];
    const recentInteractions = petInteractions.slice(-10); // 最近10条互动
    
    if (recentInteractions.length === 0) return '';
    
    const interactionMap = {
      'feed': '投喂',
      'clean': '清洁', 
      'sleep': '睡觉',
      'play': '玩耍',
      'riddle': '猜谜语',
      'joke': '讲笑话',
      'soup': '海龟汤',
      'number': '猜数字'
    };
    
    const formattedInteractions = recentInteractions.map(interaction => {
      const action = interactionMap[interaction.action] || interaction.action;
      const time = new Date(interaction.timestamp).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      return `${time}：${action}`;
    });
    
    return `最近的互动记录：${formattedInteractions.join('、')}。`;
  }
  
  // 模拟互动记录（如果主页面没有保存的话）
  function createSampleInteractions() {
    const interactionLog = loadInteractionLog();
    if (interactionLog[currentPetId] && interactionLog[currentPetId].length > 0) return;
    
    // 创建一些示例互动记录
    const sampleInteractions = [
      { action: 'feed', message: '投喂', timestamp: Date.now() - 3600000 }, // 1小时前
      { action: 'play', message: '玩耍', timestamp: Date.now() - 1800000 }, // 30分钟前
      { action: 'clean', message: '清洁', timestamp: Date.now() - 900000 },  // 15分钟前
    ];
    
    interactionLog[currentPetId] = sampleInteractions;
    try {
      localStorage.setItem('oc-pet-system/interaction-log', JSON.stringify(interactionLog));
    } catch (err) {
      console.error('保存示例互动记录失败:', err);
    }
  }
  
  function renderChat() {
    if (!chatMessagesEl) return;
    const history = (chatState[currentPetId] || []).slice(-200);
    chatMessagesEl.innerHTML = '';
    for (const m of history) {
      const div = document.createElement('div');
      div.className = 'chat-line ' + (m.role === 'user' ? 'from-user' : 'from-ai');
      div.textContent = m.content;
      chatMessagesEl.appendChild(div);
    }
    
    // 如果当前OC正在思考，显示思考状态
    if (thinkingPetId === currentPetId) {
      const state = loadState();
      const pet = (state?.pets || []).find(p => p.id === currentPetId);
      if (pet) {
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'chat-line from-ai thinking';
        thinkingDiv.innerHTML = `<span class="thinking-text">${pet.name}正在思考中...</span><span class="thinking-dots">...</span>`;
        chatMessagesEl.appendChild(thinkingDiv);
      }
    }
    
    // 如果显示了思考状态但已经有AI回复，立即清除思考状态
    if (thinkingPetId === currentPetId && history.length > 0) {
      const lastMessage = history[history.length - 1];
      if (lastMessage.role === 'assistant') {
        // 延迟一帧清除，确保UI更新完成
        setTimeout(() => {
          thinkingPetId = null;
          renderChat();
        }, 0);
      }
    }
    
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }

  // 更新聊天标题
  function updateChatTitle() {
    const state = loadState();
    const pet = (state?.pets || []).find(p => p.id === currentPetId);
    if (chatTitleEl && pet) {
      chatTitleEl.textContent = pet.name;
    }
  }

  let isSending = false;
  let thinkingPetId = null; // 跟踪正在思考的OC
  
  // 清除思考状态的函数
  function clearThinkingState() {
    thinkingPetId = null;
    isSending = false;
    try { chatInputEl.disabled = false; } catch(_) {}
    try { if (chatSendBtn) { chatSendBtn.disabled = false; chatSendBtn.textContent = chatSendBtn.dataset.prevText || '发送'; delete chatSendBtn.dataset.prevText; } } catch(_) {}
    chatInputEl && chatInputEl.focus();
  }
  
  async function sendChat() {
    const state = loadState();
    const pet = (state?.pets || []).find(p => p.id === currentPetId);
    if (!pet) { alert('未找到OC'); return; }
    const content = (chatInputEl?.value || '').trim();
    if (!content || isSending) return;
    chatInputEl.value = '';
    try { chatInputEl.disabled = true; } catch(_) {}
    try { if (chatSendBtn) { chatSendBtn.disabled = true; chatSendBtn.dataset.prevText = chatSendBtn.textContent||''; chatSendBtn.textContent = '发送中…'; } } catch(_) {}

    // push user
    chatState[currentPetId] = chatState[currentPetId] || [];
    chatState[currentPetId].push({ role: 'user', content, ts: Date.now() });
    saveChat(chatState);
    renderChat();
    
    // 添加思考中的临时消息
    thinkingPetId = currentPetId;
    renderChat();

    isSending = true;
    const settings = loadAi();
    const baseUrl = (settings.baseUrl || '').replace(/\/$/, '');
    const path = settings.path || '/v1/chat/completions';
    const model = settings.model || 'gpt-3.5-turbo';
    const apiKey = settings.apiKey || '';
    if (!baseUrl || !apiKey) {
      chatState[currentPetId].push({ role: 'assistant', content: '请先在底部栏设置里配置 AI 接入信息～', ts: Date.now() });
      saveChat(chatState);
      renderChat();
      clearThinkingState();
      return;
    }

    // 加载人设信息
    const personality = loadPersonality();
    const petPersonality = personality[currentPetId] || {};
    const traits = petPersonality.traits || '';
    const speech = petPersonality.speech || '';
    const hobbies = petPersonality.hobbies || '';
    const background = petPersonality.background || '';
    
    let personalityDesc = '';
    if (traits) personalityDesc += `性格特点：${traits}。`;
    if (speech) personalityDesc += `说话风格：${speech}。`;
    if (hobbies) personalityDesc += `兴趣爱好：${hobbies}。`;
    if (background) personalityDesc += `背景设定：${background}。`;
    
    // 获取最近的互动记录
    const recentInteractions = getRecentInteractions();
    
    const sys = `你现在是用户的OC角色"${pet.name}"（物种：${pet.species}${pet.stage ? '，时期：' + pet.stage : ''}）。${personalityDesc}${recentInteractions}用可爱、贴心、简短的中文第一人称回复，严格符合该OC的个性设定。你可以自然地提及最近的互动经历，让对话更有连贯性和真实感。`;
    const recent = (chatState[currentPetId] || []).slice(-20).map(m => ({ role: m.role, content: m.content }));
    const messages = [{ role: 'system', content: sys }, ...recent];

    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    if (/openrouter\.ai$/i.test(baseUrl.replace(/^https?:\/\//, '').split('/')[0])) {
      headers['HTTP-Referer'] = (location?.origin || 'http://localhost');
      headers['X-Title'] = (document?.title || 'OC Chat');
    }

    const body = JSON.stringify({ model, messages, temperature: 0.8, stream: false });
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const maxRetries = 3; let attempt = 0; let data = null;
    while (attempt <= maxRetries) {
      const resp = await fetch(baseUrl + path, { method: 'POST', headers, body });
      if (resp.ok) { data = await resp.json(); break; }
      if (resp.status === 429 || resp.status >= 500) {
        if (attempt < maxRetries) {
          const ra = Number(resp.headers.get('Retry-After'));
          const backoff = !Number.isNaN(ra) && ra > 0 ? ra * 1000 : (800 * Math.pow(2, attempt)) + Math.floor(Math.random()*300);
          await sleep(backoff); attempt++; continue;
        }
      }
      let detail = ''; try { const j = await resp.json(); detail = j?.error?.message || j?.message || ''; } catch(_) {}
      let msg = `请求失败 (HTTP ${resp.status})`; if (resp.status===401) msg='认证失败：检查API Key。'; else if (resp.status===402) msg='额度不足：请充值或更换接口。'; else if (resp.status===403) msg='无权限：检查模型/白名单。'; else if (resp.status===429) msg='限流：稍后重试。'; else if (resp.status>=500) msg='服务端异常：稍后再试。';
      chatState[currentPetId].push({ role: 'assistant', content: msg + (detail ? ' 详情：' + detail : ''), ts: Date.now() });
      saveChat(chatState); renderChat(); clearThinkingState(); return;
    }
    const reply = data?.choices?.[0]?.message?.content || '（没有返回内容）';
    chatState[currentPetId].push({ role: 'assistant', content: reply, ts: Date.now() });
    saveChat(chatState); renderChat();
    clearThinkingState();
    return;
  }

  // 确保页面加载时清除任何残留的思考状态
  thinkingPetId = null;
  
  renderChat();
  updateChatTitle();
  createSampleInteractions(); // 创建示例互动记录
  
  // 处理手机物理返回键：如果没有有效的历史记录，则返回到主页
  (function ensureBackNavigatesToMain() {
    try {
      const mainPageUrl = new URL('index.html', location.href).href;
      // 如果直接打开了 chat.html（无同源 referrer），注入一个历史记录以触发 popstate
      const hasSameOriginReferrer = document.referrer && (() => {
        try { return new URL(document.referrer).origin === location.origin; } catch (_) { return false; }
      })();
      if (!hasSameOriginReferrer) {
        history.replaceState({ chat: true }, '');
        history.pushState({ chat: true }, '');
      }
      window.addEventListener('popstate', () => {
        // 无论是否有上页，都确保返回到主页面
        location.href = mainPageUrl;
      });
    } catch (_) {}
  })();
  
  // 调试：检查返回按钮是否存在
  console.log('返回按钮元素:', chatBackBtn);
  if (!chatBackBtn) {
    console.error('未找到返回按钮元素！');
  }
  
  // 返回按钮
  chatBackBtn && chatBackBtn.addEventListener('click', () => {
    console.log('返回按钮被点击');
    try {
      if (window.opener && !window.opener.closed) {
        console.log('关闭新窗口');
        window.close();
      } else {
        console.log('导航回主页');
        const mainPageUrl = new URL('index.html', location.href).href;
        console.log('目标URL:', mainPageUrl);
        window.location.href = mainPageUrl;
      }
    } catch (err) {
      console.error('返回按钮错误:', err);
      // 备用方案
      try {
        window.history.back();
      } catch (_) {
        window.location.href = './index.html';
      }
    }
  });
  
  chatSendBtn && chatSendBtn.addEventListener('click', sendChat);
  chatInputEl && chatInputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChat(); });
  
  // OC人设设置弹窗
  function openPersonalityDialog() {
    const dlg = document.getElementById('personality-dialog');
    const traitsEl = document.getElementById('personality-traits');
    const speechEl = document.getElementById('personality-speech');
    const hobbiesEl = document.getElementById('personality-hobbies');
    const backgroundEl = document.getElementById('personality-background');
    if (!dlg || !traitsEl || !speechEl || !hobbiesEl || !backgroundEl) return;
    
    const personality = loadPersonality();
    const petPersonality = personality[currentPetId] || {};
    traitsEl.value = petPersonality.traits || '';
    speechEl.value = petPersonality.speech || '';
    hobbiesEl.value = petPersonality.hobbies || '';
    backgroundEl.value = petPersonality.background || '';
    
    try { dlg.showModal(); } catch (_) { dlg.setAttribute('open','true'); }
  }

  function closePersonalityDialog() {
    const dlg = document.getElementById('personality-dialog');
    if (!dlg) return;
    dlg.close && dlg.close();
    dlg.removeAttribute('open');
  }

  chatPersonalityBtn && chatPersonalityBtn.addEventListener('click', () => openPersonalityDialog());
  document.getElementById('personality-cancel')?.addEventListener('click', () => closePersonalityDialog());
  document.getElementById('add-sample-interactions')?.addEventListener('click', () => {
    const interactionLog = loadInteractionLog();
    const petInteractions = interactionLog[currentPetId] || [];
    
    // 添加更多示例互动记录
    const newInteractions = [
      { action: 'feed', message: '投喂', timestamp: Date.now() - 7200000 }, // 2小时前
      { action: 'play', message: '玩耍', timestamp: Date.now() - 5400000 }, // 1.5小时前
      { action: 'clean', message: '清洁', timestamp: Date.now() - 3600000 }, // 1小时前
      { action: 'sleep', message: '睡觉', timestamp: Date.now() - 1800000 }, // 30分钟前
      { action: 'riddle', message: '猜谜语', timestamp: Date.now() - 900000 }, // 15分钟前
    ];
    
    interactionLog[currentPetId] = [...petInteractions, ...newInteractions];
    try {
      localStorage.setItem('oc-pet-system/interaction-log', JSON.stringify(interactionLog));
      alert('已添加示例互动记录！现在AI会记住这些互动。');
    } catch (err) {
      console.error('添加示例互动记录失败:', err);
      alert('添加失败，请重试');
    }
  });
  document.getElementById('personality-save')?.addEventListener('click', () => {
    const traitsEl = document.getElementById('personality-traits');
    const speechEl = document.getElementById('personality-speech');
    const hobbiesEl = document.getElementById('personality-hobbies');
    const backgroundEl = document.getElementById('personality-background');
    
    const personality = loadPersonality();
    personality[currentPetId] = {
      traits: (traitsEl?.value || '').trim(),
      speech: (speechEl?.value || '').trim(),
      hobbies: (hobbiesEl?.value || '').trim(),
      background: (backgroundEl?.value || '').trim()
    };
    savePersonality(personality);
    closePersonalityDialog();
    alert('OC人设信息已保存');
  });
  
  // AI 设置弹窗
  function openAiSettingsDialog() {
    const dlg = document.getElementById('ai-settings-dialog');
    const providerEl = document.getElementById('ai-provider');
    const baseEl = document.getElementById('ai-base-url');
    const pathEl = document.getElementById('ai-path');
    const modelEl = document.getElementById('ai-model');
    const keyEl = document.getElementById('ai-api-key');
    if (!dlg || !baseEl || !pathEl || !modelEl || !keyEl) return;
    const s = loadAi();
    if (providerEl) providerEl.value = s.provider || 'custom';
    baseEl.value = s.baseUrl || '';
    pathEl.value = s.path || '/v1/chat/completions';
    modelEl.value = s.model || 'gpt-3.5-turbo';
    keyEl.value = s.apiKey || '';
    try { dlg.showModal(); } catch (_) { dlg.setAttribute('open','true'); }
  }

  function closeAiSettingsDialog() {
    const dlg = document.getElementById('ai-settings-dialog');
    if (!dlg) return;
    dlg.close && dlg.close();
    dlg.removeAttribute('open');
  }

  chatSettingsBtn && chatSettingsBtn.addEventListener('click', () => openAiSettingsDialog());
  document.getElementById('ai-settings-cancel')?.addEventListener('click', () => closeAiSettingsDialog());
  document.getElementById('ai-settings-save')?.addEventListener('click', () => {
    const providerEl = document.getElementById('ai-provider');
    const baseEl = document.getElementById('ai-base-url');
    const pathEl = document.getElementById('ai-path');
    const modelEl = document.getElementById('ai-model');
    const keyEl = document.getElementById('ai-api-key');
    const provider = (providerEl?.value || 'custom');
    let baseUrl = (baseEl?.value || '').trim();
    let path = (pathEl?.value || '').trim();
    let model = (modelEl?.value || '').trim();
    if (provider === 'openai') {
      baseUrl = baseUrl || 'https://api.openai.com';
      path = path || '/v1/chat/completions';
      model = model || 'gpt-3.5-turbo';
    } else if (provider === 'openrouter') {
      baseUrl = baseUrl || 'https://openrouter.ai';
      path = path || '/api/v1/chat/completions';
      model = model || 'openrouter/auto';
    } else if (provider === 'siliconflow') {
      baseUrl = baseUrl || 'https://api.siliconflow.cn';
      path = path || '/v1/chat/completions';
      model = model || 'Qwen/Qwen2.5-7B-Instruct';
    } else {
      baseUrl = baseUrl || '';
      path = path || '/v1/chat/completions';
      model = model || 'gpt-3.5-turbo';
    }
    const v = { provider, baseUrl, path, model, apiKey: (keyEl?.value || '').trim() };
    try { localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(v)); } catch (_) {}
    closeAiSettingsDialog();
    alert('AI 接入信息已保存');
  });

  // 根据提供商选择自动填充 Base/Path
  (function bindProviderChange() {
    const providerEl = document.getElementById('ai-provider');
    const baseEl = document.getElementById('ai-base-url');
    const pathEl = document.getElementById('ai-path');
    if (!providerEl || !baseEl || !pathEl) return;
    providerEl.addEventListener('change', () => {
      const v = providerEl.value;
      if (v === 'openai') {
        if (!baseEl.value) baseEl.value = 'https://api.openai.com';
        if (!pathEl.value) pathEl.value = '/v1/chat/completions';
      } else if (v === 'openrouter') {
        if (!baseEl.value) baseEl.value = 'https://openrouter.ai';
        if (!pathEl.value) pathEl.value = '/api/v1/chat/completions';
      } else if (v === 'siliconflow') {
        if (!baseEl.value) baseEl.value = 'https://api.siliconflow.cn';
        if (!pathEl.value) pathEl.value = '/v1/chat/completions';
      }
    });
  })();
})();


