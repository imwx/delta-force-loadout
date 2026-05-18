// ============================================
// Delta Force Loadout - 主应用
// ============================================

// ---- 数据加载 ----
let WEAPONS_DATA = [];
let VEHICLES_DATA = [];
let AMMO_DATA = [];
let OPERATORS_DATA = [];
let ATTACHMENTS_DATA = [];
let BATTLE_GEAR_DATA = [];

// ---- 当前状态 ----
let state = {
  page: 'home',
  mode: 'warfare',
  selectedWeapon: null,
  selectedVehicle: null,
  selectedOperator: null,
  selectedAmmo: null,
  analysisResult: null,
  filterType: 'all',
  filterMode: 'all',
  searchQuery: '',
  // 搭配构建器配件
  builderAttachments: {},
  // 战备中心专用状态
  selectedAttachments: {},
  selectedGear: {},
  liveCost: 0
};

// ---- 工具函数 ----
function $ (sel) { return document.querySelector(sel); }
function $$ (sel) { return document.querySelectorAll(sel); }

function lerp(a, b, t) { return a + (b - a) * t; }

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n;
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ---- 数据模块 ----
const DataDB = {
  async load() {
    try {
      const CACHE_BUST = '?v=6';
      const [w, v, a, o, att, gear] = await Promise.all([
        fetch('./data/weapons.json' + CACHE_BUST).then(r => r.json()),
        fetch('./data/vehicles.json' + CACHE_BUST).then(r => r.json()),
        fetch('./data/ammo.json' + CACHE_BUST).then(r => r.json()),
        fetch('./data/operators.json' + CACHE_BUST).then(r => r.json()),
        fetch('./data/attachments.json' + CACHE_BUST).then(r => { if (!r.ok) throw new Error('attachments HTTP '+r.status); return r.json(); }).catch(e => { console.error('附件加载失败:', e); return []; }),
        fetch('./data/battle-gear.json' + CACHE_BUST).then(r => { if (!r.ok) throw new Error('battle-gear HTTP '+r.status); return r.json(); }).catch(e => { console.error('战备装备加载失败:', e); return []; })
      ]);
      WEAPONS_DATA = w;
      VEHICLES_DATA = v;
      AMMO_DATA = a;
      OPERATORS_DATA = o;
      ATTACHMENTS_DATA = Array.isArray(att) ? att : (att.data || []);
      BATTLE_GEAR_DATA = Array.isArray(gear) ? gear : (gear.data || []);
      console.log('数据加载完成:', { weapons: WEAPONS_DATA.length, attachments: ATTACHMENTS_DATA.length, battleGear: BATTLE_GEAR_DATA.length });
    } catch(e) {
      console.warn('数据加载失败，使用内联数据');
      WEAPONS_DATA = inlineWeapons;
      VEHICLES_DATA = inlineVehicles;
      AMMO_DATA = inlineAmmo;
      OPERATORS_DATA = inlineOperators;
      ATTACHMENTS_DATA = [];
      BATTLE_GEAR_DATA = [];
    }
  },

  getWeapons() { return WEAPONS_DATA; },
  getVehicles() { return VEHICLES_DATA; },
  getAmmo() { return AMMO_DATA; },
  getOperators() { return OPERATORS_DATA; },

  getWeaponById(id) {
    return WEAPONS_DATA.find(w => w.id === id);
  },

  getVehicleById(id) {
    return VEHICLES_DATA.find(v => v.id === id);
  },

  getAmmoById(id) {
    return AMMO_DATA.find(a => a.id === id);
  },

  getOperatorById(id) {
    return OPERATORS_DATA.find(o => o.id === id);
  },

  getAttachmentById(id) {
    return ATTACHMENTS_DATA.find(a => a.id === id) || null;
  },

  getGearById(id) {
    return BATTLE_GEAR_DATA.find(g => g.id === id) || null;
  },

  getAttachmentsForWeapon(weaponType) {
    return ATTACHMENTS_DATA.filter(att =>
      att.slot && (att.compatible || []).includes(weaponType)
    );
  },

  getGearBySlot(slot) {
    return BATTLE_GEAR_DATA.filter(g => g.slot === slot);
  }
};

const AmmoDB = {
  get(id) {
    return AMMO_DATA.find(a => a.id === id) || null;
  },
  getForWeapon(weapon) {
    if (!weapon || !weapon.ammo_type) return [];
    return weapon.ammo_type.map(t => AMMO_DATA.find(a => a.caliber === t || a.id === t)).filter(Boolean);
  }
};

// ---- 路由 ----
function navigate(page) {
  state.page = page;
  $$('.nav-link').forEach(l => l.classList.remove('active'));
  const link = $(`.nav-link[data-page="${page}"]`);
  if (link) link.classList.add('active');
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
  // 导航事件
  document.addEventListener('click', e => {
    const navLink = e.target.closest('.nav-link');
    if (navLink) {
      e.preventDefault();
      navigate(navLink.dataset.page);
    }
  });
});

// ---- 渲染函数 ----
function render() {
  const main = $('#app');
  if (!main) return;

  switch (state.page) {
    case 'home': main.innerHTML = renderHome(); break;
    case 'weapons': main.innerHTML = renderWeapons(); initWeaponsPage(); break;
    case 'vehicles': main.innerHTML = renderVehicles(); initVehiclesPage(); break;
    case 'ammo': main.innerHTML = renderAmmo(); break;
    case 'build': main.innerHTML = renderBuilder(); initBuilderPage(); break;
    case 'meta': main.innerHTML = renderMeta(); break;
    case 'gear-center': main.innerHTML = renderGearCenter(); initGearCenter(); break;
    default: main.innerHTML = renderHome();
  }
}

function renderHome() {
  const topWeapons = WEAPONS_DATA.sort((a,b) => (b.copy_count||0) - (a.copy_count||0)).slice(0, 6);
  const metaS = WEAPONS_DATA.filter(w => w.meta_tier === 'S').slice(0, 4);

  return `
  <div class="page-header container">
    <h1 class="page-title">
      <span class="icon">🎯</span>
      三角洲行动 · 装备搭配分析站
    </h1>
    <p class="page-subtitle">武器 / 载具 / 弹药量化评分 · 版本强势推荐 · 一键配装码</p>
  </div>

  <div class="container">
    <!-- 快捷入口 -->
    <div class="cards-grid" style="margin-bottom: 40px;">
      <div class="shortcut-card" onclick="navigate('build')">
        <div class="sc-icon">⚙️</div>
        <div class="sc-title">搭配构建器</div>
        <div class="sc-desc">选择武器+配件+弹药，量化分析优劣</div>
      </div>
      <div class="shortcut-card" onclick="navigate('weapons')">
        <div class="sc-icon">🔫</div>
        <div class="sc-title">武器库</div>
        <div class="sc-desc">${WEAPONS_DATA.length} 把武器数据，含S/A/B级Tier</div>
      </div>
      <div class="shortcut-card" onclick="navigate('vehicles')">
        <div class="sc-icon">🚁</div>
        <div class="sc-title">载具库</div>
        <div class="sc-desc">全面战场 ${VEHICLES_DATA.length} 种载具数据</div>
      </div>
      <div class="shortcut-card" onclick="navigate('meta')">
        <div class="sc-icon">🏆</div>
        <div class="sc-title">版本强势推荐</div>
        <div class="sc-desc">当前版本S/A级武器排行榜</div>
      </div>
    </div>

    <!-- 热门武器 -->
    <section style="margin-bottom: 48px;">
      <h2 class="section-heading">
        <span>🔥</span> 热门武器 TOP · 使用率最高
      </h2>
      <div class="cards-grid">
        ${topWeapons.map(w => renderWeaponCard(w)).join('')}
      </div>
    </section>

    <!-- S级推荐 -->
    <section style="margin-bottom: 48px;">
      <h2 class="section-heading">
        <span>⭐</span> 版本 S 级推荐
      </h2>
      <div class="cards-grid">
        ${metaS.map(w => renderWeaponCard(w)).join('')}
      </div>
    </section>

    <style>
      .shortcut-card {
        background: var(--bg-card);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        padding: 24px 20px;
        cursor: pointer;
        transition: all 0.25s;
        text-align: center;
      }
      .shortcut-card:hover {
        background: var(--bg-card-hover);
        border-color: var(--accent-primary);
        transform: translateY(-2px);
        box-shadow: 0 0 20px rgba(240,192,64,0.12);
      }
      .sc-icon { font-size: 2rem; margin-bottom: 12px; }
      .sc-title { font-size: 1rem; font-weight: 700; margin-bottom: 6px; }
      .sc-desc { font-size: 0.8rem; color: var(--text-secondary); }
      .section-heading {
        font-size: 1.1rem;
        font-weight: 700;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--text-primary);
      }
    </style>
  </div>`;
}

function renderWeaponCard(w) {
  const s = w.base_stats;
  return `
  <div class="weapon-card" onclick="showWeaponDetail('${w.id}')">
    <div class="card-header">
      <div>
        <div class="card-name">${w.name_cn}</div>
        <div class="card-name-en">${w.name_en}</div>
      </div>
      <span class="tier-badge ${w.meta_tier}">${w.meta_tier}级</span>
    </div>
    <div class="card-meta">
      <span class="mode-badge ${w.mode}">${modeLabel(w.mode)}</span>
      <span class="tag">${w.type}</span>
      ${(w.tags||[]).slice(0,2).map(t => `<span class="tag">${t}</span>`).join('')}
    </div>
    <div class="card-stats">
      <div class="stat-item">
        <div class="stat-label">伤害</div>
        <div class="stat-bar"><div class="stat-fill damage" style="width:${s.damage}%"></div></div>
        <div class="stat-value">${s.damage}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">射速</div>
        <div class="stat-bar"><div class="stat-fill rate" style="width:${Math.min(s.rate_of_fire/12,100)}%"></div></div>
        <div class="stat-value">${s.rate_of_fire}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">精准</div>
        <div class="stat-bar"><div class="stat-fill accuracy" style="width:${s.accuracy}%"></div></div>
        <div class="stat-value">${s.accuracy}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">机动</div>
        <div class="stat-bar"><div class="stat-fill mobility" style="width:${s.mobility}%"></div></div>
        <div class="stat-value">${s.mobility}</div>
      </div>
    </div>
    ${w.copy_count ? `<div style="margin-top:12px;font-size:0.72rem;color:var(--text-muted);">👥 ${formatNumber(w.copy_count)} 人使用</div>` : ''}
  </div>`;
}

function renderVehicleCard(v) {
  const vs = v.stats;
  return `
  <div class="vehicle-card" onclick="showVehicleDetail('${v.id}')">
    <div class="card-header">
      <div>
        <div class="card-name">${v.name_cn}</div>
        <div class="card-name-en">${v.name_en}</div>
      </div>
      <span class="tag">${v.type}</span>
    </div>
    <div class="card-meta">
      <span class="tag">阵营: ${v.faction === 'nato' ? '北约' : '东方'}</span>
      <span class="tag">载员: ${vs.passenger_capacity}人</span>
    </div>
    <div class="vehicle-stats-grid">
      <div class="vehicle-stat">
        <div class="vehicle-stat-value attack">${vs.hp}</div>
        <div class="vehicle-stat-label">生命值</div>
      </div>
      <div class="vehicle-stat">
        <div class="vehicle-stat-value defense">${vs.armor}</div>
        <div class="vehicle-stat-label">装甲</div>
      </div>
      <div class="vehicle-stat">
        <div class="vehicle-stat-value">${vs.main_weapon_damage}</div>
        <div class="vehicle-stat-label">主武器伤害</div>
      </div>
      <div class="vehicle-stat">
        <div class="vehicle-stat-value mobility">${vs.speed}</div>
        <div class="vehicle-stat-label">速度</div>
      </div>
      <div class="vehicle-stat">
        <div class="vehicle-stat-value">${vs.stealth}</div>
        <div class="vehicle-stat-label">隐蔽</div>
      </div>
    </div>
    <div class="vehicle-weapons">
      ${(v.weapons||[]).slice(0,2).map(wp => `<span class="vehicle-weapon-tag">${wp}</span>`).join('')}
    </div>
  </div>`;
}

function renderWeapons() {
  return `
  <div class="page-header container">
    <h1 class="page-title"><span class="icon">🔫</span> 武器库</h1>
    <p class="page-subtitle">共 ${WEAPONS_DATA.length} 把武器，支持按类型/模式/S/A级筛选</p>
  </div>
  <div class="container">
    <div class="filter-bar">
      <div class="search-box">
        <span class="icon">🔍</span>
        <input type="text" id="weapon-search" placeholder="搜索武器名称...">
      </div>
      <button class="filter-btn active" data-filter="type" data-val="all" onclick="filterWeapons('type','all')">全部</button>
      <button class="filter-btn" data-filter="type" data-val="突击步枪" onclick="filterWeapons('type','突击步枪')">突击步枪</button>
      <button class="filter-btn" data-filter="type" data-val="冲锋枪" onclick="filterWeapons('type','冲锋枪')">冲锋枪</button>
      <button class="filter-btn" data-filter="type" data-val="狙击步枪" onclick="filterWeapons('type','狙击步枪')">狙击</button>
      <button class="filter-btn" data-filter="type" data-val="精确射手步枪" onclick="filterWeapons('type','精确射手步枪')">精确射手</button>
      <button class="filter-btn" data-filter="type" data-val="轻机枪" onclick="filterWeapons('type','轻机枪')">机枪</button>
      <button class="filter-btn" data-filter="type" data-val="霰弹枪" onclick="filterWeapons('type','霰弹枪')">霰弹枪</button>
      <button class="filter-btn" data-filter="type" data-val="战斗步枪" onclick="filterWeapons('type','战斗步枪')">战斗步枪</button>
      <div style="display:flex;gap:6px;margin-left:auto;">
        <button class="filter-btn" data-filter="mode" data-val="all" onclick="filterWeapons('mode','all')">全部模式</button>
        <button class="filter-btn" data-filter="mode" data-val="warfare" onclick="filterWeapons('mode','warfare')">全面战场</button>
        <button class="filter-btn" data-filter="mode" data-val="operations" onclick="filterWeapons('mode','operations')">危险行动</button>
        <button class="filter-btn" data-filter="mode" data-val="both" onclick="filterWeapons('mode','both')">双模式</button>
      </div>
    </div>
    <div class="cards-grid" id="weapons-grid">
      ${renderFilteredWeapons()}
    </div>
  </div>`;
}

function renderFilteredWeapons() {
  let filtered = WEAPONS_DATA;

  if (state.filterType !== 'all') {
    filtered = filtered.filter(w => w.type === state.filterType);
  }
  if (state.filterMode !== 'all') {
    filtered = filtered.filter(w => w.mode === state.filterMode || w.mode === 'both');
  }
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(w =>
      w.name_cn.includes(q) || w.name_en.toLowerCase().includes(q) || w.type.includes(q)
    );
  }

  return filtered.map(w => renderWeaponCard(w)).join('');
}

function initWeaponsPage() {
  const input = $('#weapon-search');
  if (input) {
    input.addEventListener('input', debounce(e => {
      state.searchQuery = e.target.value;
      $('#weapons-grid').innerHTML = renderFilteredWeapons();
    }, 200));
  }
}

function filterWeapons(type, val) {
  if (type === 'type') state.filterType = val;
  if (type === 'mode') state.filterMode = val;

  $$('.filter-btn').forEach(btn => {
    if (btn.dataset.filter === type && btn.dataset.val === val) {
      btn.classList.add('active');
    } else if (btn.dataset.filter === type) {
      btn.classList.remove('active');
    }
  });

  const grid = $('#weapons-grid');
  if (grid) grid.innerHTML = renderFilteredWeapons();
}

function renderVehicles() {
  return `
  <div class="page-header container">
    <h1 class="page-title"><span class="icon">🚁</span> 全面战场载具库</h1>
    <p class="page-subtitle">${VEHICLES_DATA.length} 种载具，含坦克/直升机/装甲车/攻击机</p>
  </div>
  <div class="container">
    <div class="filter-bar">
      <div class="search-box">
        <span class="icon">🔍</span>
        <input type="text" id="vehicle-search" placeholder="搜索载具...">
      </div>
      <button class="filter-btn active" data-vtype="all" onclick="filterVehicles('all')">全部</button>
      <button class="filter-btn" data-vtype="主战坦克" onclick="filterVehicles('主战坦克')">坦克</button>
      <button class="filter-btn" data-vtype="武装直升机" onclick="filterVehicles('武装直升机')">直升机</button>
      <button class="filter-btn" data-vtype="运输直升机" onclick="filterVehicles('运输直升机')">运输机</button>
      <button class="filter-btn" data-vtype="步兵战车" onclick="filterVehicles('步兵战车')">步战车</button>
      <button class="filter-btn" data-vtype="轮式装甲车" onclick="filterVehicles('轮式装甲车')">轮式装甲</button>
      <button class="filter-btn" data-vtype="攻击机" onclick="filterVehicles('攻击机')">攻击机</button>
      <button class="filter-btn" data-vtype="防空载具" onclick="filterVehicles('防空载具')">防空</button>
      <button class="filter-btn" data-vtype="轻型突击车" onclick="filterVehicles('轻型突击车')">突击车</button>
    </div>
    <div class="cards-grid" id="vehicles-grid">
      ${VEHICLES_DATA.map(v => renderVehicleCard(v)).join('')}
    </div>
  </div>`;
}

function initVehiclesPage() {
  const input = $('#vehicle-search');
  if (input) {
    input.addEventListener('input', debounce(e => {
      const q = e.target.value.toLowerCase();
      const filtered = VEHICLES_DATA.filter(v =>
        v.name_cn.includes(q) || v.name_en.toLowerCase().includes(q) || v.type.includes(q)
      );
      $('#vehicles-grid').innerHTML = filtered.map(v => renderVehicleCard(v)).join('');
    }, 200));
  }
}

function filterVehicles(type) {
  $$('.filter-btn[data-vtype]').forEach(btn => {
    if (btn.dataset.vtype === type) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  const filtered = type === 'all' ? VEHICLES_DATA : VEHICLES_DATA.filter(v => v.type === type);
  $('#vehicles-grid').innerHTML = filtered.map(v => renderVehicleCard(v)).join('');
}

function renderAmmo() {
  return `
  <div class="page-header container">
    <h1 class="page-title"><span class="icon">💨</span> 弹药对比</h1>
    <p class="page-subtitle">${AMMO_DATA.length} 种弹药口径，量化穿深/伤害/射程</p>
  </div>
  <div class="container">
    <table class="ammo-table">
      <thead>
        <tr>
          <th>弹药</th>
          <th>口径</th>
          <th style="width:200px">穿深</th>
          <th style="width:200px">伤害</th>
          <th style="width:200px">射程</th>
          <th>适用武器</th>
          <th>价格</th>
        </tr>
      </thead>
      <tbody>
        ${AMMO_DATA.map(a => `
        <tr>
          <td><strong>${a.name_cn}</strong><br><span style="font-size:0.72rem;color:var(--text-muted)">${a.name_en}</span></td>
          <td><span class="tag">${a.caliber}</span></td>
          <td>
            <div class="ammo-bar">
              <div class="ammo-bar-track"><div class="ammo-bar-fill penetration" style="width:${a.stats.penetration}%"></div></div>
              <span class="ammo-bar-value">${a.stats.penetration}</span>
            </div>
          </td>
          <td>
            <div class="ammo-bar">
              <div class="ammo-bar-track"><div class="ammo-bar-fill damage" style="width:${a.stats.damage}%"></div></div>
              <span class="ammo-bar-value">${a.stats.damage}</span>
            </div>
          </td>
          <td>
            <div class="ammo-bar">
              <div class="ammo-bar-track"><div class="ammo-bar-fill range" style="width:${a.stats.range}%"></div></div>
              <span class="ammo-bar-value">${a.stats.range}</span>
            </div>
          </td>
          <td><span style="font-size:0.8rem;color:var(--text-secondary)">${(a.best_for||[]).slice(0,3).join(', ')}</span></td>
          <td><span class="tag">💰 ${a.price}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

// ---- 搭配构建器 ----
function renderBuilder() {
  const weapons = WEAPONS_DATA.filter(w => w.mode === state.mode || w.mode === 'both');
  const vehicles = VEHICLES_DATA;
  const operators = OPERATORS_DATA;
  const ammos = AMMO_DATA;

  return `
  <div class="page-header container">
    <h1 class="page-title"><span class="icon">⚙️</span> 搭配构建器</h1>
    <p class="page-subtitle">选择武器、弹药、干员和载具，量化分析搭配优劣</p>
  </div>
  <div class="container">
    <div class="builder-container">
      <!-- 左侧选择面板 -->
      <div class="builder-panel">
        <h3>⚙️ 配置你的搭配</h3>

        <div class="mode-toggle">
          <button class="mode-toggle-btn ${state.mode === 'warfare' ? 'active-warfare' : ''}" onclick="setMode('warfare')">
            🗺️ 全面战场
          </button>
          <button class="mode-toggle-btn ${state.mode === 'operations' ? 'active-operations' : ''}" onclick="setMode('operations')">
            🎒 危险行动
          </button>
        </div>

        <div class="step-section">
          <div class="step-title"><span class="step-number">1</span> 选择干员</div>
          <select class="step-select" id="sel-operator" onchange="selectOperator(this.value)">
            <option value="">— 选择干员（可选）—</option>
            ${operators.map(op => `<option value="${op.id}">${op.name_cn} · ${op.class}</option>`).join('')}
          </select>
        </div>

        <div class="step-section">
          <div class="step-title"><span class="step-number">2</span> 选择武器</div>
          <select class="step-select" id="sel-weapon" onchange="selectWeapon(this.value)">
            <option value="">— 选择主武器 —</option>
            ${weapons.map(w => `<option value="${w.id}">${w.name_cn} (${w.type})</option>`).join('')}
          </select>
        </div>

        <div class="step-section">
          <div class="step-title"><span class="step-number">3</span> 武器配件</div>
          <div id="builder-attachments-area">
          ${state.selectedWeapon ? `
          <div class="builder-attachments-grid">
            ${GEAR_SLOTS.map(slot => renderBuilderAttachmentSlot(slot)).join('')}
          </div>
          ` : `<div class="builder-att-placeholder">请先选择一把武器以配置配件</div>`}
          </div>
        </div>

        <div class="step-section">
          <div class="step-title"><span class="step-number">4</span> 选择弹药</div>
          <select class="step-select" id="sel-ammo" onchange="selectAmmo(this.value)">
            <option value="">— 选择弹药（可选）—</option>
            ${ammos.map(a => `<option value="${a.id}">${a.name_cn}</option>`).join('')}
          </select>
        </div>

        ${state.mode === 'warfare' ? `
        <div class="step-section">
          <div class="step-title"><span class="step-number">5</span> 选择载具</div>
          <select class="step-select" id="sel-vehicle" onchange="selectVehicle(this.value)">
            <option value="">— 选择载具（可选）—</option>
            ${vehicles.map(v => `<option value="${v.id}">${v.name_cn}</option>`).join('')}
          </select>
        </div>` : ''}

        <button class="analyze-btn" onclick="analyzeBuild()">
          🎯 分析搭配
        </button>
      </div>

      <!-- 右侧结果 -->
      <div class="analysis-area">
        <div id="analysis-placeholder" style="text-align:center;padding:60px 20px;color:var(--text-muted);">
          <div style="font-size:3rem;margin-bottom:16px;">📊</div>
          <div style="font-size:1rem;">在左侧选择武器和配置</div>
          <div style="font-size:0.85rem;margin-top:8px;">点击「分析搭配」查看量化结果</div>
        </div>
        <div class="analysis-result" id="analysis-result">
          <!-- 动态填充 -->
        </div>
      </div>
    </div>
  </div>`;
}

function renderBuilderAttachmentSlot(slot) {
  const w = state.selectedWeapon;
  const selected = state.builderAttachments[slot];
  const atts = getAvailableAttachments(w, slot);
  const selAtt = selected ? DataDB.getAttachmentById(selected) : null;

  return `
  <div class="builder-att-slot">
    <div class="builder-att-label">${GEAR_SLOT_LABELS[slot] || slot}</div>
    <select class="step-select" onchange="selectBuilderAttachment('${slot}', this.value)">
      <option value="">— 不装备 —</option>
      ${atts.map(att => `
        <option value="${att.id}" ${selected === att.id ? 'selected' : ''}>
          ${att.name_cn} ${att.price > 0 ? `(¥${att.price.toLocaleString()})` : '(免费)'}
        </option>
      `).join('')}
    </select>
    ${selAtt && Object.keys(selAtt.stat_mods||{}).length ? `
    <div class="gear-stat-preview" style="margin-top:2px;">
      ${Object.entries(selAtt.stat_mods).map(([k,v]) => `
        <span class="${v >= 0 ? 'stat-pos' : 'stat-neg'}">${k === 'accuracy' ? '精准' : k === 'range' ? '射程' : k === 'mobility' ? '机动' : k === 'control' ? '控制' : k === 'handling' ? '操控' : k === 'damage' ? '伤害' : k}(${v > 0 ? '+' : ''}${v})</span>
      `).join('')}
    </div>` : ''}
  </div>`;
}

function initBuilderPage() {
  // 初始化默认选中
  if (state.selectedWeapon) {
    const sel = $('#sel-weapon');
    if (sel) sel.value = state.selectedWeapon.id;
  }
}

function setMode(mode) {
  state.mode = mode;
  state.selectedWeapon = null;
  state.selectedVehicle = null;
  state.selectedAmmo = null;
  state.builderAttachments = {};
  state.analysisResult = null;
  render();
}

function selectWeapon(id) {
  state.selectedWeapon = id ? DataDB.getWeaponById(id) : null;
  state.builderAttachments = {};
  state.analysisResult = null;
  // 更新配件区域
  const attArea = $('#builder-attachments-area');
  if (attArea) {
    attArea.innerHTML = state.selectedWeapon
      ? `<div class="builder-attachments-grid">${GEAR_SLOTS.map(slot => renderBuilderAttachmentSlot(slot)).join('')}</div>`
      : `<div class="builder-att-placeholder">请先选择一把武器以配置配件</div>`;
  }
  // 自动更新弹药选项
  if (id) {
    const w = state.selectedWeapon;
    const ammoSel = $('#sel-ammo');
    if (ammoSel && w.ammo_type && w.ammo_type.length > 0) {
      ammoSel.value = w.ammo_type[0];
      selectAmmo(w.ammo_type[0]);
    }
  }
  hideResult();
}

function selectAmmo(id) {
  state.selectedAmmo = id ? DataDB.getAmmoById(id) : null;
  hideResult();
}

function selectVehicle(id) {
  state.selectedVehicle = id ? DataDB.getVehicleById(id) : null;
  hideResult();
}

function selectOperator(id) {
  state.selectedOperator = id ? DataDB.getOperatorById(id) : null;
  hideResult();
}

function hideResult() {
  const placeholder = $('#analysis-placeholder');
  const result = $('#analysis-result');
  if (placeholder) placeholder.style.display = 'block';
  if (result) result.classList.remove('show');
}

function analyzeBuild() {
  if (!state.selectedWeapon) {
    alert('请先选择一把武器');
    return;
  }

  const result = Calculator.calculateBuildScore(
    state.selectedWeapon,
    state.selectedVehicle,
    state.selectedOperator,
    state.mode,
    state.selectedAmmo?.id,
    state.builderAttachments
  );

  const analysis = Calculator.generateAnalysis(result, state.selectedWeapon, state.selectedVehicle, state.selectedOperator, state.mode);
  const similar = Calculator.findSimilarWeapons(state.selectedWeapon, WEAPONS_DATA);

  state.analysisResult = { result, analysis, similar };

  const placeholder = $('#analysis-placeholder');
  const resultDiv = $('#analysis-result');

  if (placeholder) placeholder.style.display = 'none';
  if (resultDiv) {
    resultDiv.innerHTML = renderAnalysisResult(result, analysis, similar);
    resultDiv.classList.add('show');
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderAnalysisResult(result, analysis, similar) {
  const w = state.selectedWeapon;
  const ws = result.weaponScore;
  const vScore = result.vehicleScore;

  const attNames = Object.entries(state.builderAttachments)
    .filter(([_, id]) => id)
    .map(([slot, id]) => {
      const att = DataDB.getAttachmentById(id);
      return att ? `${GEAR_SLOT_LABELS[slot] || slot}: ${att.name_cn}` : '';
    })
    .filter(Boolean);

  return `
  <div class="result-header">
    <div class="result-score">${result.total}</div>
    <div class="result-score-label">综合评分 / 100</div>
    <div class="result-tags">
      ${analysis.tags.map(t => `<span class="result-tag pro">${t}</span>`).join('')}
    </div>
    <div class="result-dimension-scores">
      <div class="dim-score">
        <div class="dim-score-value attack">${result.dimensions.attack}</div>
        <div class="dim-score-label">攻击力</div>
      </div>
      <div class="dim-score">
        <div class="dim-score-value defense">${result.dimensions.defense}</div>
        <div class="dim-score-label">防御/生存</div>
      </div>
      <div class="dim-score">
        <div class="dim-score-value mobility">${result.dimensions.mobility}</div>
        <div class="dim-score-label">机动性</div>
      </div>
      <div class="dim-score">
        <div class="dim-score-value sustain">${result.dimensions.sustain}</div>
        <div class="dim-score-label">续航/操控</div>
      </div>
    </div>
  </div>

  <!-- 已选配件 -->
  ${attNames.length > 0 ? `
  <div class="gear-selected-list" style="margin-bottom:20px;">
    <div class="gsl-title">已选配件</div>
    ${attNames.map(n => `<span class="gsl-tag att">${n}</span>`).join('')}
  </div>` : ''}

  <!-- 武器详细属性 -->
  <div class="radar-container">
    <h3>📊 武器属性雷达图</h3>
    <canvas id="radarChart" width="400" height="300"></canvas>
    <div class="card-stats" style="margin-top:20px;grid-template-columns:repeat(3,1fr);">
      <div class="stat-item">
        <div class="stat-label">伤害</div>
        <div class="stat-bar"><div class="stat-fill damage" style="width:${ws.damage}%"></div></div>
        <div class="stat-value">${ws.damage}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">精准度</div>
        <div class="stat-bar"><div class="stat-fill accuracy" style="width:${ws.accuracy}%"></div></div>
        <div class="stat-value">${ws.accuracy}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">控制性</div>
        <div class="stat-bar"><div class="stat-fill control" style="width:${ws.control}%"></div></div>
        <div class="stat-value">${ws.control}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">射程</div>
        <div class="stat-bar"><div class="stat-fill range" style="width:${ws.range}%"></div></div>
        <div class="stat-value">${ws.range}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">机动性</div>
        <div class="stat-bar"><div class="stat-fill mobility" style="width:${ws.mobility}%"></div></div>
        <div class="stat-value">${ws.mobility}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">操控速度</div>
        <div class="stat-bar"><div class="stat-fill mobility" style="width:${ws.handling}%"></div></div>
        <div class="stat-value">${ws.handling}</div>
      </div>
    </div>
  </div>

  <!-- 配装码 -->
  ${w.loadout_code ? `
  <div class="loadout-code-box">
    <div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">配装码（可导入游戏）</div>
      <div class="loadout-code">${w.loadout_code}</div>
    </div>
    <button class="copy-btn" onclick="copyLoadout('${w.loadout_code}', this)">复制</button>
  </div>` : ''}

  <!-- 优劣分析 -->
  <div class="pros-cons">
    <div class="pros-section">
      <div class="section-title">✅ 优势</div>
      <ul class="section-list">
        ${analysis.pros.map(p => `<li>${p}</li>`).join('')}
      </ul>
    </div>
    <div class="cons-section">
      <div class="section-title">⚠️ 劣势/注意事项</div>
      <ul class="section-list">
        ${analysis.cons.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </div>
  </div>

  <!-- 替代方案 -->
  ${similar.length > 0 ? `
  <div class="recommended-alternatives">
    <h4>🔄 类似替代方案</h4>
    <div class="alt-weapons">
      ${similar.map(item => `
      <div class="alt-weapon" onclick="switchWeapon('${item.weapon.id}')">
        <span>${item.weapon.name_cn}</span>
        <span class="alt-score">综合 ${item.totalScore}分</span>
      </div>`).join('')}
    </div>
  </div>` : ''}
  `;
}

function switchWeapon(id) {
  selectWeapon(id);
  const sel = $('#sel-weapon');
  if (sel) sel.value = id;
  analyzeBuild();
}

function copyLoadout(code, btn) {
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = '已复制 ✓';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '复制';
      btn.classList.remove('copied');
    }, 2000);
  });
}

// ---- 战备中心：主页面 ----
const GEAR_SLOTS = ['optic', 'barrel', 'stock', 'grip', 'magazine', 'muzzle', 'laser'];
const GEAR_SLOT_LABELS = {
  optic: '瞄具', barrel: '枪管', stock: '枪托',
  grip: '握把', magazine: '弹匣', muzzle: '枪口', laser: '激光'
};
const BATTLE_SLOTS = ['vest', 'helmet', 'knee', 'boots', 'tactical'];
const BATTLE_SLOT_LABELS = {
  vest: '战术背心', helmet: '战术头盔', knee: '战术护膝',
  boots: '战斗靴', tactical: '战术配件'
};

function renderGearCenter() {
  const w = state.selectedWeapon;
  const weapons = WEAPONS_DATA;

  return `
  <div class="page-header container">
    <div class="gear-center-header">
      <div>
        <h1 class="page-title"><span class="icon">⚔️</span> 战备中心</h1>
        <p class="page-subtitle">组枪配件 · 卡战备装备 · 实时金额计算</p>
      </div>
      <div class="gear-cost-display" id="gear-cost-display">
        <div class="cost-label">实时金额</div>
        <div class="cost-value" id="cost-value">¥ 0</div>
        <div class="cost-note">价格数据为估算值</div>
      </div>
    </div>
  </div>
  <div class="container">
    <div class="gear-container">
      <!-- 左侧选择面板 -->
      <div class="gear-panel">
        <!-- 武器选择 -->
        <div class="gear-section">
          <div class="gear-section-title">
            <span class="icon">🔫</span> 选择武器
          </div>
          <div class="gear-weapon-grid">
            ${['手枪','冲锋枪','霰弹枪','突击步枪','战斗步枪','精确射手步枪','狙击步枪','轻机枪','通用机枪','特殊武器'].map(type => {
              const guns = weapons.filter(w => w.type === type);
              if (!guns.length) return '';
              return `
              <div class="gear-weapon-group">
                <div class="gear-group-label">${type} <span class="gear-group-count">(${guns.length})</span></div>
                <div class="gear-weapon-list">
                  ${guns.map(g => `
                    <button class="gear-weapon-btn ${state.selectedWeapon?.id === g.id ? 'active' : ''}"
                            onclick="selectGearWeapon('${g.id}')">
                      ${g.name_cn} ${g.price > 0 ? `<span class="gear-weapon-price">¥${g.price.toLocaleString()}</span>` : ''}
                    </button>
                  `).join('')}
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- 配件选择 -->
        ${w ? `
        <div class="gear-section">
          <div class="gear-section-title">
            <span class="icon">🔧</span> 武器配件
          </div>
          <div class="gear-slots-grid">
            ${GEAR_SLOTS.map(slot => renderGearSlotCard(slot)).join('')}
          </div>
        </div>
        ` : `
        <div class="gear-placeholder">
          <div style="font-size:2rem;margin-bottom:12px;">🔫</div>
          <div style="color:var(--text-secondary);font-size:0.9rem;">请先在上方选择一个武器以配置配件</div>
        </div>
        `}

        <!-- 战备装备（独立于武器，始终可选） -->
        <div class="gear-section">
          <div class="gear-section-title">
            <span class="icon">🎽</span> 战备装备
          </div>
          <div class="gear-slots-grid">
            ${BATTLE_SLOTS.map(slot => renderBattleSlotCard(slot)).join('')}
          </div>
        </div>
      </div>

      <!-- 右侧实时预览 -->
      <div class="gear-preview-panel">
        <div id="gear-preview-content">
          ${w || Object.keys(state.selectedGear).length > 0 ? renderGearPreview() : `
          <div class="gear-preview-empty">
            <div style="font-size:3rem;margin-bottom:16px;">📊</div>
            <div style="color:var(--text-secondary);font-size:0.9rem;">选择武器和配件后</div>
            <div style="color:var(--text-secondary);font-size:0.85rem;margin-top:4px;">实时预览属性变化</div>
          </div>`}
        </div>
      </div>
    </div>
  </div>`;
}

function renderGearSlotCard(slot) {
  const w = state.selectedWeapon;
  const selected = state.selectedAttachments[slot];
  const atts = getAvailableAttachments(w, slot);
  const selAtt = selected ? DataDB.getAttachmentById(selected) : null;

  return `
  <div class="gear-slot-card" id="slot-${slot}">
    <div class="gear-slot-header">
      <span class="gear-slot-name">${GEAR_SLOT_LABELS[slot] || slot}</span>
      <span class="gear-slot-selected ${selAtt ? 'has-item' : ''}">
        ${selAtt ? selAtt.name_cn : '— 未选择 —'}
      </span>
    </div>
    ${selected ? `<div class="gear-slot-price">¥${selected ? (DataDB.getAttachmentById(selected)?.price||0).toLocaleString() : ''}</div>` : ''}
    <select class="gear-select" onchange="selectAttachment('${slot}', this.value)"
            data-slot="${slot}">
      <option value="">— 不装备 —</option>
      ${atts.map(att => `
        <option value="${att.id}" ${selected === att.id ? 'selected' : ''}>
          ${att.name_cn} ${att.price > 0 ? `(¥${att.price.toLocaleString()})` : '(免费)'}
        </option>
      `).join('')}
    </select>
    ${selAtt && Object.keys(selAtt.stat_mods||{}).length ? `
    <div class="gear-stat-preview">
      ${Object.entries(selAtt.stat_mods).map(([k,v]) => `
        <span class="${v >= 0 ? 'stat-pos' : 'stat-neg'}">${k === 'accuracy' ? '精准' : k === 'range' ? '射程' : k === 'mobility' ? '机动' : k === 'control' ? '控制' : k === 'handling' ? '操控' : k === 'damage' ? '伤害' : k}(${v > 0 ? '+' : ''}${v})</span>
      `).join('')}
    </div>` : ''}
  </div>`;
}

function renderBattleSlotCard(slot) {
  const selected = state.selectedGear[slot];
  const gearList = DataDB.getGearBySlot(slot);
  const selGear = selected ? DataDB.getGearById(selected) : null;

  return `
  <div class="gear-slot-card battle-slot" id="bslot-${slot}">
    <div class="gear-slot-header">
      <span class="gear-slot-name">${BATTLE_SLOT_LABELS[slot] || slot}</span>
      <span class="gear-slot-selected ${selGear ? 'has-item' : ''}">
        ${selGear ? (selGear.name_cn || selGear.name || selGear.name_en) : '— 未选择 —'}
      </span>
    </div>
    <select class="gear-select" onchange="selectGearItem('${slot}', this.value)"
            data-bslot="${slot}">
      <option value="">— 不装备 —</option>
        ${gearList.map(g => `
        <option value="${g.id}" ${selected === g.id ? 'selected' : ''}>
          ${g.name_cn || g.name || g.name_en} ${g.price > 0 ? `(¥${g.price.toLocaleString()})` : '(免费)'}
        </option>
      `).join('')}
    </select>
    ${selGear && Object.keys(selGear.stat_mods||{}).length ? `
    <div class="gear-stat-preview">
      ${Object.entries(selGear.stat_mods).map(([k,v]) => `
        <span class="${v >= 0 ? 'stat-pos' : 'stat-neg'}">${
          k === 'armor' ? '护甲' : k === 'mobility' ? '机动' : k === 'handling' ? '操控'
          : k === 'accuracy' ? '精准' : k === 'stealth' ? '隐蔽' : k === 'range' ? '射程'
          : k === 'control' ? '控制' : k === 'damage' ? '伤害' : k
        }(${v > 0 ? '+' : ''}${v})</span>
      `).join('')}
    </div>` : ''}
  </div>`;
}

function getAvailableAttachments(weapon, slot) {
  if (!weapon || !weapon.type) return [];
  return ATTACHMENTS_DATA.filter(att =>
    att.slot === slot && (att.compatible || []).includes(weapon.type)
  );
}

function renderGearPreview() {
  const w = state.selectedWeapon;
  const base = w ? w.base_stats : null;
  const withAtt = w ? Calculator.calcWeaponWithAttachments(w, state.selectedAttachments) : null;
  const gearBonus = Calculator.calcGearBonuses(state.selectedGear);
  const cost = Calculator.calcTotalCost(w, state.selectedAttachments, state.selectedGear);

  // 更新金额显示
  const costEl = $('#cost-value');
  if (costEl) costEl.textContent = `¥ ${cost.toLocaleString()}`;

  const diff = (key) => {
    if (!withAtt || !base) return '';
    const b = base[key] || 0;
    const a = withAtt[key] || 0;
    const d = a - b;
    if (d === 0) return '';
    return `<span class="${d > 0 ? 'stat-pos' : 'stat-neg'}">${d > 0 ? '+' : ''}${d}</span>`;
  };

  const attNames = Object.entries(state.selectedAttachments)
    .filter(([_, id]) => id)
    .map(([slot, id]) => {
      const att = DataDB.getAttachmentById(id);
      return att ? `${att.name_cn}` : '';
    })
    .filter(Boolean);

  const gearNames = Object.entries(state.selectedGear)
    .filter(([_, id]) => id)
    .map(([slot, id]) => {
      const g = DataDB.getGearById(id);
      return g ? `${g.name_cn}` : '';
    })
    .filter(Boolean);

  return `
  <div class="gear-preview-inner">
    ${w ? `
    <div class="gear-preview-weapon">
      <div class="gpw-name">${w.name_cn}</div>
      <div class="gpw-meta">
        <span class="tag">${w.type}</span>
        <span class="tier-badge ${w.meta_tier}">${w.meta_tier}级</span>
      </div>
    </div>

    <!-- 雷达图 -->
    <div class="radar-container">
      <h4>属性雷达图</h4>
      <canvas id="gearRadarChart" width="320" height="260"></canvas>
    </div>

    <!-- 属性对比 -->
    <div class="gear-stats-compare">
      <div class="gear-compare-header">
        <span>属性</span><span>基础</span><span>加成</span><span>最终</span>
      </div>
      ${['damage','accuracy','range','control','mobility','handling'].map(key => `
        <div class="gear-compare-row">
          <span>${key === 'damage'?'伤害':key === 'accuracy'?'精准':key === 'range'?'射程':key==='control'?'控制':key==='mobility'?'机动':'操控'}</span>
          <span class="stat-base">${base[key]}</span>
          <span>${diff(key)}</span>
          <span class="stat-final">${withAtt ? withAtt[key] : base[key]}</span>
        </div>
      `).join('')}
    </div>
    ` : `
    <div class="gear-preview-weapon">
      <div class="gpw-name">仅战备配置</div>
      <div class="gpw-meta">
        <span class="tag">未选择武器</span>
      </div>
    </div>
    `}

    <!-- 已选配件列表 -->
    ${attNames.length ? `
    <div class="gear-selected-list">
      <div class="gsl-title">已选配件</div>
      ${attNames.map(n => `<span class="gsl-tag att">${n}</span>`).join('')}
    </div>` : ''}

    <!-- 已选战备列表 -->
    ${gearNames.length ? `
    <div class="gear-selected-list">
      <div class="gsl-title">已选战备</div>
      ${gearNames.map(n => `<span class="gsl-tag gear">${n}</span>`).join('')}
    </div>` : ''}

    <!-- 战备加成 -->
    ${(gearBonus.armor > 0 || gearBonus.stealth > 0 || gearBonus.mobility !== 0 || gearBonus.handling !== 0 || gearBonus.accuracy > 0) ? `
    <div class="gear-bonus-section">
      <div class="gsl-title">战备加成</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
        ${gearBonus.armor !== 0 ? `<span class="${gearBonus.armor >= 0 ? 'stat-pos' : 'stat-neg'}">护甲 ${gearBonus.armor > 0 ? '+' : ''}${gearBonus.armor}</span>` : ''}
        ${gearBonus.stealth !== 0 ? `<span class="${gearBonus.stealth >= 0 ? 'stat-pos' : 'stat-neg'}">隐蔽 ${gearBonus.stealth > 0 ? '+' : ''}${gearBonus.stealth}</span>` : ''}
        ${gearBonus.mobility !== 0 ? `<span class="${gearBonus.mobility >= 0 ? 'stat-pos' : 'stat-neg'}">机动 ${gearBonus.mobility > 0 ? '+' : ''}${gearBonus.mobility}</span>` : ''}
        ${gearBonus.handling !== 0 ? `<span class="${gearBonus.handling >= 0 ? 'stat-pos' : 'stat-neg'}">操控 ${gearBonus.handling > 0 ? '+' : ''}${gearBonus.handling}</span>` : ''}
        ${gearBonus.accuracy !== 0 ? `<span class="${gearBonus.accuracy >= 0 ? 'stat-pos' : 'stat-neg'}">精准 ${gearBonus.accuracy > 0 ? '+' : ''}${gearBonus.accuracy}</span>` : ''}
      </div>
    </div>` : ''}

    <!-- 配装码 -->
    ${w && w.loadout_code ? `
    <div class="loadout-code-box">
      <div>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:4px;">配装码（游戏内一键导入）</div>
        <div class="loadout-code">${w.loadout_code}</div>
      </div>
      <button class="copy-btn" onclick="copyLoadout('${w.loadout_code}', this)">复制</button>
    </div>` : ''}
  </div>`;
}

function initGearCenter() {
  // 初始化雷达图并更新金额
  setTimeout(() => {
    updateGearPreview();
    if (state.selectedWeapon) drawGearRadar();
  }, 50);
}

function selectGearWeapon(id) {
  state.selectedWeapon = id ? DataDB.getWeaponById(id) : null;
  state.selectedAttachments = {};
  state.selectedGear = {};
  state.liveCost = 0;
  render();
  setTimeout(() => {
    initGearCenter();
    drawGearRadar();
  }, 50);
}

function selectAttachment(slot, attId) {
  if (attId === '') {
    delete state.selectedAttachments[slot];
  } else {
    state.selectedAttachments[slot] = attId;
  }
  updateGearPreview();
  setTimeout(() => drawGearRadar(), 50);
}

function selectBuilderAttachment(slot, attId) {
  if (attId === '') {
    delete state.builderAttachments[slot];
  } else {
    state.builderAttachments[slot] = attId;
  }
  hideResult();
}

function selectGearItem(slot, gearId) {
  if (gearId === '') {
    delete state.selectedGear[slot];
  } else {
    state.selectedGear[slot] = gearId;
  }
  updateGearPreview();
}

function updateGearPreview() {
  const preview = $('#gear-preview-content');
  if (preview) {
    preview.innerHTML = renderGearPreview();
  }
  const cost = Calculator.calcTotalCost(state.selectedWeapon, state.selectedAttachments, state.selectedGear);
  state.liveCost = cost;
  const costEl = $('#cost-value');
  if (costEl) costEl.textContent = `¥ ${cost.toLocaleString()}`;
}

function drawGearRadar() {
  const canvas = $('#gearRadarChart');
  if (!canvas || !state.selectedWeapon) return;

  // 销毁旧图
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  const w = state.selectedWeapon;
  const base = w.base_stats;
  const withAtt = Calculator.calcWeaponWithAttachments(w, state.selectedAttachments);

  const labels = ['伤害', '精准', '射程', '控制', '机动', '操控'];
  const baseData = [base.damage, base.accuracy, base.range, base.control, base.mobility, base.handling];
  const attData = withAtt
    ? [withAtt.damage, withAtt.accuracy, withAtt.range, withAtt.control, withAtt.mobility, withAtt.handling]
    : baseData;

  new Chart(canvas, {
    type: 'radar',
    data: {
      labels,
      datasets: [
        {
          label: '基础属性',
          data: baseData,
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          borderColor: 'rgba(59, 130, 246, 0.8)',
          borderWidth: 1.5,
          pointBackgroundColor: 'rgba(59, 130, 246, 0.9)'
        },
        {
          label: '配件加成后',
          data: attData,
          backgroundColor: 'rgba(240, 192, 64, 0.15)',
          borderColor: 'rgba(240, 192, 64, 0.9)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(240, 192, 64, 1)'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { labels: { color: '#8a95a8', font: { size: 11 } } } },
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { color: '#4a5568', backdropColor: 'transparent', stepSize: 25, font: { size: 10 } },
          pointLabels: { color: '#8a95a8', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.06)' }
        }
      }
    }
  });
}

// ---- 强势推荐 ----
function renderMeta() {
  const sorted = [...WEAPONS_DATA].sort((a,b) => (b.copy_count||0) - (a.copy_count||0));
  const sTier = sorted.filter(w => w.meta_tier === 'S');
  const aTier = sorted.filter(w => w.meta_tier === 'A').slice(0, 8);

  return `
  <div class="page-header container">
    <h1 class="page-title"><span class="icon">🏆</span> 版本强势推荐</h1>
    <p class="page-subtitle">基于社区使用率和配装数据计算的版本强度排行</p>
  </div>
  <div class="container">
    <section style="margin-bottom: 48px;">
      <h2 class="section-heading"><span style="color:var(--tier-s)">⭐</span> S级 — 版本之子</h2>
      <div class="cards-grid">
        ${sTier.map(w => renderWeaponCard(w)).join('')}
      </div>
    </section>
    <section style="margin-bottom: 48px;">
      <h2 class="section-heading"><span style="color:var(--tier-a)">🔶</span> A级 — 强势选择</h2>
      <div class="cards-grid">
        ${aTier.map(w => renderWeaponCard(w)).join('')}
      </div>
    </section>
  </div>
  <style>.section-heading { font-size: 1.1rem; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }</style>`;
}

// ---- 详情弹窗 ----
function showWeaponDetail(id) {
  const w = DataDB.getWeaponById(id);
  if (!w) return;

  const result = Calculator.calculateBuildScore(w, null, null, w.mode === 'both' ? 'operations' : w.mode, w.ammo_type?.[0]);
  const similar = Calculator.findSimilarWeapons(w, WEAPONS_DATA);

  const modal = $('#modal-overlay');
  if (!modal) return;

  modal.innerHTML = `
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">${w.name_cn}</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
      <span class="tier-badge ${w.meta_tier}">${w.meta_tier}级</span>
      <span class="mode-badge ${w.mode}">${modeLabel(w.mode)}</span>
      <span class="tag">${w.type}</span>
      ${(w.tags||[]).map(t => `<span class="tag">${t}</span>`).join('')}
    </div>
    <div style="margin-bottom:16px;">
      <span style="font-size:0.8rem;color:var(--text-secondary)">${w.name_en}</span>
      ${result ? `<div style="margin-top:8px;font-size:1.5rem;font-weight:800;color:var(--accent-primary);font-family:var(--font-mono);">${result.total}<span style="font-size:0.8rem;color:var(--text-muted);font-weight:400;"> / 100</span></div>` : ''}
    </div>
    <div class="card-stats" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px;">
      <div class="stat-item">
        <div class="stat-label">伤害</div>
        <div class="stat-bar"><div class="stat-fill damage" style="width:${w.base_stats.damage}%"></div></div>
        <div class="stat-value">${w.base_stats.damage}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">精准</div>
        <div class="stat-bar"><div class="stat-fill accuracy" style="width:${w.base_stats.accuracy}%"></div></div>
        <div class="stat-value">${w.base_stats.accuracy}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">机动</div>
        <div class="stat-bar"><div class="stat-fill mobility" style="width:${w.base_stats.mobility}%"></div></div>
        <div class="stat-value">${w.base_stats.mobility}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">射速 RPM</div>
        <div class="stat-bar"><div class="stat-fill rate" style="width:${Math.min(w.base_stats.rate_of_fire/12,100)}%"></div></div>
        <div class="stat-value">${w.base_stats.rate_of_fire}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">射程</div>
        <div class="stat-bar"><div class="stat-fill range" style="width:${w.base_stats.range}%"></div></div>
        <div class="stat-value">${w.base_stats.range}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">控制</div>
        <div class="stat-bar"><div class="stat-fill control" style="width:${w.base_stats.control}%"></div></div>
        <div class="stat-value">${w.base_stats.control}</div>
      </div>
    </div>
    ${w.loadout_code ? `
    <div class="loadout-code-box">
      <div class="loadout-code">${w.loadout_code}</div>
      <button class="copy-btn" onclick="copyLoadout('${w.loadout_code}', this)">复制</button>
    </div>` : ''}
    ${w.copy_count ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:16px;">👥 ${formatNumber(w.copy_count)} 名玩家使用此配装</div>` : ''}
    ${similar.length > 0 ? `
    <div style="margin-top:16px;">
      <div style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);margin-bottom:10px;">类似武器推荐</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${similar.map(item => `<div class="alt-weapon" onclick="closeModal();showWeaponDetail('${item.weapon.id}')"><span>${item.weapon.name_cn}</span><span class="alt-score">${item.totalScore}分</span></div>`).join('')}
      </div>
    </div>` : ''}
  </div>`;
  modal.classList.add('show');
}

function showVehicleDetail(id) {
  const v = DataDB.getVehicleById(id);
  if (!v) return;

  const vScore = Calculator.calcVehicleScore(v);

  const modal = $('#modal-overlay');
  if (!modal) return;

  modal.innerHTML = `
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">${v.name_cn}</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div style="margin-bottom:8px;"><span class="tag">${v.type}</span> <span class="tag">${v.faction === 'nato' ? '北约' : '东方阵营'}</span></div>
    <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:16px;">${v.name_en}</div>

    ${vScore ? `<div style="margin-bottom:20px;font-size:1.5rem;font-weight:800;color:var(--accent-primary);font-family:var(--font-mono);">${vScore.attack}<span style="font-size:0.8rem;color:var(--text-muted);font-weight:400;"> 攻击分</span></div>` : ''}

    <div class="vehicle-stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px;">
      <div class="vehicle-stat">
        <div class="vehicle-stat-value">${v.stats.hp}</div>
        <div class="vehicle-stat-label">生命值</div>
      </div>
      <div class="vehicle-stat">
        <div class="vehicle-stat-value defense">${v.stats.armor}</div>
        <div class="vehicle-stat-label">装甲</div>
      </div>
      <div class="vehicle-stat">
        <div class="vehicle-stat-value attack">${v.stats.main_weapon_damage}</div>
        <div class="vehicle-stat-label">主武器伤害</div>
      </div>
      <div class="vehicle-stat">
        <div class="vehicle-stat-value mobility">${v.stats.speed}</div>
        <div class="vehicle-stat-label">速度</div>
      </div>
      <div class="vehicle-stat">
        <div class="vehicle-stat-value">${v.stats.stealth}</div>
        <div class="vehicle-stat-label">隐蔽</div>
      </div>
      <div class="vehicle-stat">
        <div class="vehicle-stat-value">${v.stats.passenger_capacity}</div>
        <div class="vehicle-stat-label">载员</div>
      </div>
    </div>

    <div style="margin-bottom:16px;">
      <div style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">武器配置</div>
      <div class="vehicle-weapons">
        ${(v.weapons||[]).map(wp => `<span class="vehicle-weapon-tag">${wp}</span>`).join('')}
      </div>
    </div>

    <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:14px;border:1px solid var(--border-default);">
      <div style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px;">战术分析</div>
      <div style="font-size:0.85rem;color:var(--text-primary);line-height:1.6;">${v.description || ''}</div>
    </div>
    ${vScore ? `
    <div style="margin-top:16px;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
      <div style="text-align:center;padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;">
        <div style="font-size:1.3rem;font-weight:800;color:var(--accent-red);font-family:var(--font-mono);">${vScore.attack}</div>
        <div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;">攻击</div>
      </div>
      <div style="text-align:center;padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;">
        <div style="font-size:1.3rem;font-weight:800;color:var(--accent-blue);font-family:var(--font-mono);">${vScore.defense}</div>
        <div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;">防御</div>
      </div>
      <div style="text-align:center;padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;">
        <div style="font-size:1.3rem;font-weight:800;color:var(--accent-cyan);font-family:var(--font-mono);">${vScore.mobility}</div>
        <div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;">机动</div>
      </div>
      <div style="text-align:center;padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;">
        <div style="font-size:1.3rem;font-weight:800;color:var(--accent-purple);font-family:var(--font-mono);">${vScore.tactical}</div>
        <div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;">战术</div>
      </div>
    </div>` : ''}
  </div>`;
  modal.classList.add('show');
}

function closeModal() {
  const modal = $('#modal-overlay');
  if (modal) modal.classList.remove('show');
}

// 点击遮罩关闭
document.addEventListener('click', e => {
  if (e.target === $('#modal-overlay')) closeModal();
});

// ---- 工具 ----
function modeLabel(mode) {
  const map = { warfare: '全面战场', operations: '危险行动', both: '双模式' };
  return map[mode] || mode;
}

// ---- 初始化 ----
(async function init() {
  await DataDB.load();
  render();
})();
