/**
 * 弘毅暑期打卡奖励系统 - 统计记录系统
 */

const Stats = {
  render() {
    this.renderStatCards();
    this.renderCheckinRecords();
    this.renderLeaveRecords();
    this.renderAdjustRecords();
    this.renderWishRecords();
  },

  // 统计卡片
  renderStatCards() {
    const stats = Store.getStats();
    const state = Store.load();
    const completionRate = stats.totalTasks > 0
      ? ((stats.completedCount / stats.totalTasks) * 100).toFixed(1)
      : 0;
    const cycleBonusCount = Object.keys(state.cycleBonuses || {}).length;

    const cards = [
      {
        icon: '✅',
        value: `${stats.completedCount}/${stats.totalTasks}`,
        label: '打卡完成',
        color: 'var(--anemo)',
      },
      {
        icon: '⏳',
        value: stats.pendingCount,
        label: '待完成',
        color: 'var(--gold-light)',
      },
      {
        icon: '🏖️',
        value: state.leaveRecords.length,
        label: '已请假任务',
        color: 'var(--geo)',
      },
      {
        icon: '💎',
        value: stats.primogems,
        label: '当前原石',
        color: '#6ad4e8',
      },
      {
        icon: '🏆',
        value: `${cycleBonusCount}次`,
        label: '周期全勤奖励',
        color: 'var(--gold)',
      },
      {
        icon: '📈',
        value: stats.totalEarned,
        label: '累计获得原石',
        color: 'var(--gold-light)',
      },
      {
        icon: '🎯',
        value: stats.totalWishes,
        label: '祈愿次数',
        color: 'var(--electro)',
      },
      {
        icon: '📖',
        value: `${stats.collectionCount}/${stats.totalPoolSize}`,
        label: '图鉴收集',
        color: 'var(--dendro)',
      },
      {
        icon: '📅',
        value: stats.adjustCount,
        label: '日期调整次数',
        color: 'var(--cryo)',
      },
      {
        icon: '📊',
        value: completionRate + '%',
        label: '完成率',
        color: 'var(--anemo)',
      },
    ];

    document.getElementById('statsGrid').innerHTML = cards.map(c => `
      <div class="stat-card" style="--stat-color: ${c.color}">
        <div class="stat-icon">${c.icon}</div>
        <div class="stat-value">${c.value}</div>
        <div class="stat-label">${c.label}</div>
      </div>
    `).join('');
  },

  // 打卡记录
  renderCheckinRecords() {
    const state = Store.load();
    const list = document.getElementById('checkinRecordList');

    if (state.checkinRecords.length === 0) {
      list.innerHTML = '<div class="empty-record">暂无打卡记录</div>';
      return;
    }

    // 倒序显示（最新的在前）
    const records = [...state.checkinRecords].reverse();
    list.innerHTML = records.map(r => {
      const subj = SUBJECTS[r.subject] || { icon: '📝', color: '#ccc' };
      return `
        <div class="record-item">
          <span style="color:${subj.color}">${subj.icon}</span>
          <span style="font-weight:600;">周期${r.cycleId} · ${r.taskName}</span>
          <span style="color:var(--text-secondary)">[${r.subject}]</span>
          <span style="color:#6ad4e8;font-weight:600;">+${r.reward}原石</span>
          <span class="record-time">${App.formatDateTime(r.time)}</span>
        </div>
      `;
    }).join('');
  },

  // 请假记录
  renderLeaveRecords() {
    const state = Store.load();
    const list = document.getElementById('leaveRecordList');

    if (state.leaveRecords.length === 0) {
      list.innerHTML = '<div class="empty-record">暂无请假记录</div>';
      return;
    }

    const records = [...state.leaveRecords].reverse();
    list.innerHTML = records.map(r => {
      const subj = SUBJECTS[r.subject] || { icon: '📝', color: '#ccc' };
      return `
        <div class="record-item">
          <span style="color:${subj.color}">${subj.icon}</span>
          <span style="font-weight:600;">周期${r.cycleId} · ${r.taskName}</span>
          <span style="color:var(--text-secondary)">[${r.subject}]</span>
          <span style="color:var(--geo)">已请假</span>
          <span class="record-time">${App.formatDateTime(r.time)}</span>
        </div>
      `;
    }).join('');
  },

  // 日期调整记录
  renderAdjustRecords() {
    const state = Store.load();
    const list = document.getElementById('adjustRecordList');

    if (state.adjustRecords.length === 0) {
      list.innerHTML = '<div class="empty-record">暂无日期调整记录</div>';
      return;
    }

    const records = [...state.adjustRecords].reverse();
    list.innerHTML = records.map(r => {
      const subj = SUBJECTS[r.subject] || { icon: '📝', color: '#ccc' };
      const oldDate = App.formatDateShort(r.oldDate);
      const newDate = App.formatDateShort(r.newDate);
      return `
        <div class="record-item">
          <span style="color:${subj.color}">${subj.icon}</span>
          <span style="font-weight:600;">周期${r.cycleId} · ${r.taskName}</span>
          <span style="color:var(--text-secondary)">[${r.subject}]</span>
          <span style="color:var(--cryo)">${oldDate} → ${newDate}</span>
          <span class="record-time">${App.formatDateTime(r.time)}</span>
        </div>
      `;
    }).join('');
  },

  // 祈愿记录
  renderWishRecords() {
    const state = Store.load();
    const list = document.getElementById('wishRecordList');

    if (state.wishRecords.length === 0) {
      list.innerHTML = '<div class="empty-record">暂无祈愿记录</div>';
      return;
    }

    const records = [...state.wishRecords].reverse();
    const rarityStars = { 5: '★★★★★', 4: '★★★★', 3: '★★★' };
    const rarityClass = { 5: 'r5', 4: 'r4', 3: 'r3' };

    list.innerHTML = records.map(r => {
      const elementColor = ELEMENT_COLORS[r.element] || '#ccc';
      return `
        <div class="record-item">
          <span class="record-rarity ${rarityClass[r.rarity]}">${rarityStars[r.rarity]}</span>
          <span style="font-weight:600;color:var(--text-gold)">${r.itemName}</span>
          <span style="color:${elementColor}">[${r.element}]</span>
          <span style="color:var(--text-secondary)">-${WISH_COST}原石</span>
          <span class="record-time">${App.formatDateTime(r.time)}</span>
        </div>
      `;
    }).join('');
  },
};

if (typeof window !== 'undefined') {
  window.Stats = Stats;
}
