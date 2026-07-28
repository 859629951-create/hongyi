/**
 * 弘毅暑期打卡奖励系统 - 祈愿抽卡系统
 * 仿原神祈愿动画 + 收集图鉴
 */

const Gacha = {
  isAnimating: false,

  // 开始祈愿
  startWish() {
    if (this.isAnimating) return;

    const state = Store.load();
    if (state.primogems < WISH_COST) {
      App.showToast(`原石不足！需要${WISH_COST}原石，当前仅有${state.primogems}原石`, 'error');
      return;
    }

    this.isAnimating = true;

    // 执行抽卡
    const result = Store.doWish();
    if (!result.success) {
      App.showToast(result.msg, 'error');
      this.isAnimating = false;
      return;
    }

    // 播放动画
    this.playWishAnimation(result.item, result.rarity, () => {
      this.isAnimating = false;
      App.updateTopBar();
      App.renderWishPage();

      // 刷新当前页面
      const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
      if (activeTab === 'collection') App.renderCollection();
      else if (activeTab === 'stats') Stats.render();
    });
  },

  // 祈愿动画序列
  playWishAnimation(item, rarity, onComplete) {
    const overlay = document.getElementById('wishOverlay');
    const starsContainer = document.getElementById('wishStars');
    const resultDiv = document.getElementById('wishResult');

    // 重置
    starsContainer.innerHTML = '';
    resultDiv.classList.remove('active');
    resultDiv.style.display = 'none';
    overlay.classList.add('active');

    // 阶段1：星辰粒子飞散 (0~1.5秒)
    this.spawnStarParticles(starsContainer, 40);

    // 阶段2：流星划过 (1~2秒)
    setTimeout(() => {
      this.spawnComet(starsContainer, rarity);
    }, 800);

    // 阶段3：显示结果 (2秒后)
    setTimeout(() => {
      this.showResult(item, rarity);
    }, 2000);

    // 完成回调在 closeWish 中处理
    this._onComplete = onComplete;
  },

  // 生成星辰粒子
  spawnStarParticles(container, count) {
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.className = 'wish-star-particle';

      const startX = 50 + (Math.random() - 0.5) * 30;  // 中心附近
      const startY = 50 + (Math.random() - 0.5) * 30;
      const tx = (Math.random() - 0.5) * 800;
      const ty = (Math.random() - 0.5) * 800;

      star.style.left = startX + '%';
      star.style.top = startY + '%';
      star.style.setProperty('--tx', tx + 'px');
      star.style.setProperty('--ty', ty + 'px');
      star.style.animationDelay = Math.random() * 0.5 + 's';
      star.style.width = (2 + Math.random() * 4) + 'px';
      star.style.height = star.style.width;

      // 随机颜色
      const colors = ['#fff', '#ffe8a0', '#a0e8ff', '#e8a0ff'];
      star.style.background = colors[Math.floor(Math.random() * colors.length)];
      star.style.boxShadow = `0 0 ${4 + Math.random() * 8}px ${star.style.background}`;

      container.appendChild(star);
    }
  },

  // 生成流星
  spawnComet(container, rarity) {
    const colors = {
      5: '#f0a020',   // 金色
      4: '#a858e8',   // 紫色
      3: '#5878e8',   // 蓝色
    };
    const color = colors[rarity] || '#fff';

    // 主流星
    const comet = document.createElement('div');
    comet.className = 'wish-comet';
    comet.style.setProperty('--comet-color', color);

    const angle = Math.random() * Math.PI * 2;
    const distance = 600;
    const endX = Math.cos(angle) * distance;
    const endY = Math.sin(angle) * distance;

    comet.style.setProperty('--end-x', `calc(-50% + ${endX}px)`);
    comet.style.setProperty('--end-y', `calc(-50% + ${endY}px)`);

    container.appendChild(comet);

    // 额外流星（5星和4星有更多特效）
    if (rarity >= 4) {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const c = document.createElement('div');
          c.className = 'wish-comet';
          c.style.setProperty('--comet-color', color);

          const a = Math.random() * Math.PI * 2;
          const d = 400 + Math.random() * 300;
          c.style.setProperty('--end-x', `calc(-50% + ${Math.cos(a) * d}px)`);
          c.style.setProperty('--end-y', `calc(-50% + ${Math.sin(a) * d}px)`);
          container.appendChild(c);
        }, i * 200);
      }
    }

    // 5星额外金色光环
    if (rarity === 5) {
      const ring = document.createElement('div');
      ring.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 0;
        height: 0;
        border: 2px solid ${color};
        border-radius: 50%;
        opacity: 0.8;
        animation: ringExpand 1s ease-out forwards;
      `;
      container.appendChild(ring);
    }
  },

  // 显示结果
  showResult(item, rarity) {
    const resultDiv = document.getElementById('wishResult');
    const glow = document.getElementById('resultGlow');
    const rarityEl = document.getElementById('resultRarity');
    const nameEl = document.getElementById('resultName');
    const infoEl = document.getElementById('resultInfo');
    const descEl = document.getElementById('resultDesc');

    const colors = {
      5: { color: 'rgba(240, 160, 32, 0.4)', class: 'r5', stars: '★★★★★' },
      4: { color: 'rgba(168, 88, 232, 0.4)', class: 'r4', stars: '★★★★' },
      3: { color: 'rgba(88, 120, 232, 0.3)', class: 'r3', stars: '★★★' },
    };
    const config = colors[rarity];
    const elementColor = ELEMENT_COLORS[item.element] || '#ccc';

    // 光晕
    glow.style.setProperty('--result-color', config.color);

    // 稀有度
    rarityEl.className = `result-rarity ${config.class}`;
    rarityEl.textContent = config.stars;

    // 名称
    nameEl.textContent = item.name;

    // 信息
    infoEl.innerHTML = `
      <span class="element-badge" style="background:${elementColor}22;color:${elementColor};border:1px solid ${elementColor}44;">
        ${item.element}
      </span>
      <span style="color:var(--text-secondary);">${item.weapon} · ${item.region}</span>
    `;

    // 描述
    descEl.textContent = item.desc;

    // 检查是否新获得
    const state = Store.load();
    const isNew = state.collection[item.name].count === 1;
    if (isNew) {
      const badge = document.createElement('div');
      badge.className = 'result-new-badge';
      badge.textContent = 'NEW';
      document.getElementById('resultCard').appendChild(badge);
    } else {
      // 移除可能存在的badge
      const existingBadge = document.querySelector('.result-new-badge');
      if (existingBadge) existingBadge.remove();
    }

    // 显示
    resultDiv.style.display = 'block';
    resultDiv.classList.add('active');
  },

  // 关闭祈愿结果
  closeWish() {
    const overlay = document.getElementById('wishOverlay');
    const resultDiv = document.getElementById('wishResult');

    overlay.classList.remove('active');
    resultDiv.classList.remove('active');
    resultDiv.style.display = 'none';

    // 清理粒子
    document.getElementById('wishStars').innerHTML = '';

    // 移除new badge
    const badge = document.querySelector('.result-new-badge');
    if (badge) badge.remove();

    // 完成回调
    if (this._onComplete) {
      this._onComplete();
      this._onComplete = null;
    }
  },
};

// 添加光环动画
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes ringExpand {
    0% { width: 0; height: 0; opacity: 0.8; }
    100% { width: 600px; height: 600px; opacity: 0; }
  }
`;
document.head.appendChild(styleSheet);

if (typeof window !== 'undefined') {
  window.Gacha = Gacha;
}
