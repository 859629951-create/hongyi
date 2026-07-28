/**
 * 数据持久化管理 - localStorage 封装
 */

const Store = {
  STORAGE_KEY: 'hongyi_checkin_v2',

  getDefaultState() {
    return {
      taskOverrides: {},
      // 自定义新增任务
      customTasks: [],
      primogems: 0,
      // 每任务请假记录 { taskId: true } — 标记该任务已请假
      taskLeaves: {},
      leaveRecords: [],
      adjustRecords: [],
      checkinRecords: [],
      wishRecords: [],
      collection: {},
      // 每日全勤奖励记录 { '2026-07-29': true }
      dailyBonuses: {},
      activeTab: 'home',
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      // 兼容旧版本数据迁移
      if (!raw && localStorage.getItem('hongyi_checkin_v1')) {
        const v1data = JSON.parse(localStorage.getItem('hongyi_checkin_v1'));
        const migrated = this.migrateFromV1(v1data);
        return { ...this.getDefaultState(), ...migrated };
      }
      if (!raw) return this.getDefaultState();
      const data = JSON.parse(raw);
      return { ...this.getDefaultState(), ...data };
    } catch (e) {
      console.error('load state error:', e);
      return this.getDefaultState();
    }
  },

  // 从v1迁移
  migrateFromV1(v1data) {
    return {
      taskOverrides: v1data.taskOverrides || {},
      customTasks: [],
      primogems: v1data.primogems || 0,
      taskLeaves: {},
      leaveRecords: v1data.leaveRecords || [],
      adjustRecords: v1data.adjustRecords || [],
      checkinRecords: v1data.checkinRecords || [],
      wishRecords: v1data.wishRecords || [],
      collection: v1data.collection || {},
      dailyBonuses: {},
      activeTab: v1data.activeTab || 'home',
    };
  },

  save(state) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('save state error:', e);
    }
    // 自动同步到 GitHub Gist（异步，不阻塞 UI）
    if (typeof Sync !== 'undefined' && Sync.isConfigured()) {
      Sync.push().catch(() => {});
    }
  },

  reset() {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem('hongyi_checkin_v1');
  },

  // 获取所有任务（内置 + 自定义）
  getAllTasks() {
    const state = this.load();
    const merged = TASKS.map(t => {
      const override = state.taskOverrides[t.id] || {};
      // 逾期重分配：如果用户未手动调整截止日期，应用新截止日期
      const redistDeadline = OVERDUE_REDISTRIBUTION[t.id] || null;
      const effectiveDeadline = override.deadline || redistDeadline || t.deadline;
      return {
        ...t,
        status: override.status || t.status,
        deadline: effectiveDeadline,
        completedDate: override.completedDate || null,
        leaveDate: override.leaveDate || null,
        adjustedDate: override.adjustedDate || null,
        isCustom: false,
      };
    });

    // 追加自定义任务
    const customs = (state.customTasks || []).map(ct => {
      const override = state.taskOverrides[ct.id] || {};
      return {
        ...ct,
        status: override.status || ct.status,
        deadline: override.deadline || ct.deadline,
        completedDate: override.completedDate || null,
        leaveDate: override.leaveDate || null,
        adjustedDate: override.adjustedDate || null,
        isCustom: true,
      };
    });

    return [...merged, ...customs];
  },

  // 兼容旧接口
  getMergedTasks() {
    return this.getAllTasks();
  },

  updateTask(taskId, updates) {
    const state = this.load();
    if (!state.taskOverrides[taskId]) {
      state.taskOverrides[taskId] = {};
    }
    Object.assign(state.taskOverrides[taskId], updates);
    this.save(state);
    return state;
  },

  // 获取今日日期字符串
  getTodayStr() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  },

  // 打卡完成
  completeTask(taskId) {
    const state = this.load();
    const allTasks = this.getAllTasks();
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return null;

    const existing = state.taskOverrides[taskId] || {};
    if (existing.status === 'completed' || existing.status === 'leave') return null;

    const now = new Date().toISOString();

    // 判断是否为逾期补打卡：原始截止日期在今天之前
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const origDl = new Date(task.originalDeadline + 'T00:00:00+08:00');
    const isOverdue = origDl < today;
    const reward = isOverdue ? OVERDUE_REWARD : REWARD_PRIMOGEMS;

    state.taskOverrides[taskId] = {
      ...state.taskOverrides[taskId],
      status: 'completed',
      completedDate: now,
    };
    state.primogems += reward;
    state.checkinRecords.push({
      taskId,
      taskName: task.name,
      subject: task.subject,
      cycleId: task.cycleId,
      time: now,
      reward,
      isOverdue,
    });

    // 检查每日全勤奖励
    const dailyResult = this._checkDailyBonus(state);

    this.save(state);
    return { state, reward, isOverdue, dailyBonus: dailyResult };
  },

  // 检查每日全勤：当天所有任务（含重分配任务）是否全部完成
  _checkDailyBonus(state) {
    const todayStr = this.getTodayStr();
    if (state.dailyBonuses && state.dailyBonuses[todayStr]) return null;

    const allTasks = this.getAllTasks();
    const todayTasks = allTasks.filter(t => {
      if (t.status === 'leave') return false;
      return t.deadline === todayStr;
    });

    if (todayTasks.length === 0) return null;

    const allDone = todayTasks.every(t => t.status === 'completed');
    if (!allDone) return null;

    // 全勤！奖励30原石
    if (!state.dailyBonuses) state.dailyBonuses = {};
    state.dailyBonuses[todayStr] = true;
    state.primogems += DAILY_BONUS;
    return { earned: DAILY_BONUS, taskCount: todayTasks.length };
  },

  // 请假 — 每个任务最多1次
  requestLeave(taskId) {
    const state = this.load();
    const allTasks = this.getAllTasks();
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return { success: false, msg: '任务不存在' };

    // 检查该任务是否已经请假过
    if (state.taskLeaves[taskId]) {
      return { success: false, msg: '该任务已请假（每任务限1次）' };
    }

    const existing = state.taskOverrides[taskId] || {};
    if (existing.status === 'completed') {
      return { success: false, msg: '该任务已完成，无法请假' };
    }
    if (existing.status === 'leave') {
      return { success: false, msg: '该任务已请假' };
    }

    const now = new Date().toISOString();
    state.taskOverrides[taskId] = {
      ...state.taskOverrides[taskId],
      status: 'leave',
      leaveDate: now,
    };
    state.taskLeaves[taskId] = true;
    state.leaveRecords.push({
      taskId,
      taskName: task.name,
      subject: task.subject,
      cycleId: task.cycleId,
      time: now,
    });
    this.save(state);
    return { success: true, state };
  },

  // 调整日期
  adjustDeadline(taskId, newDate) {
    const state = this.load();
    const allTasks = this.getAllTasks();
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return null;

    const oldDate = (state.taskOverrides[taskId] && state.taskOverrides[taskId].deadline) || task.deadline;
    state.taskOverrides[taskId] = {
      ...state.taskOverrides[taskId],
      deadline: newDate,
      adjustedDate: newDate,
    };
    state.adjustRecords.push({
      taskId,
      taskName: task.name,
      subject: task.subject,
      cycleId: task.cycleId,
      oldDate,
      newDate,
      time: new Date().toISOString(),
    });
    this.save(state);
    return state;
  },

  // 新增自定义任务
  addCustomTask({ subject, name, content, deadline }) {
    const state = this.load();
    const id = `CUSTOM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newTask = {
      id,
      cycleId: 0,
      subject,
      name,
      content,
      originalDeadline: deadline,
      deadline,
      status: 'pending',
      completedDate: null,
      leaveDate: null,
      adjustedDate: null,
      createdAt: new Date().toISOString(),
      isCustom: true,
    };

    if (!state.customTasks) state.customTasks = [];
    state.customTasks.push(newTask);
    this.save(state);
    return { success: true, task: newTask };
  },

  // 删除自定义任务
  deleteCustomTask(taskId) {
    const state = this.load();
    if (!state.customTasks) return { success: false, msg: '任务不存在' };

    const idx = state.customTasks.findIndex(t => t.id === taskId);
    if (idx === -1) return { success: false, msg: '任务不存在' };

    state.customTasks.splice(idx, 1);
    // 同时清除相关记录
    delete state.taskOverrides[taskId];
    delete state.taskLeaves[taskId];
    state.leaveRecords = state.leaveRecords.filter(r => r.taskId !== taskId);
    state.checkinRecords = state.checkinRecords.filter(r => r.taskId !== taskId);
    state.adjustRecords = state.adjustRecords.filter(r => r.taskId !== taskId);
    this.save(state);
    return { success: true };
  },

  // 祈愿
  doWish() {
    const state = this.load();
    if (state.primogems < WISH_COST) {
      return { success: false, msg: `原石不足！需要${WISH_COST}原石，当前仅有${state.primogems}原石` };
    }

    state.primogems -= WISH_COST;

    const pityCounter = state.pityCounter || 0;
    const guaranteed5 = pityCounter >= 89;
    const guaranteed4 = (state.pity4Counter || 0) >= 9;

    const rand = Math.random();
    let rarity;
    if (guaranteed5 || (!guaranteed4 && rand < 0.06)) {
      rarity = 5;
    } else if (guaranteed4 || rand < 0.36) {
      rarity = 4;
    } else {
      rarity = 3;
    }

    if (rarity === 5) {
      state.pityCounter = 0;
      state.pity4Counter = 0;
    } else {
      state.pityCounter = (state.pityCounter || 0) + 1;
      if (rarity === 4) {
        state.pity4Counter = 0;
      } else {
        state.pity4Counter = (state.pity4Counter || 0) + 1;
      }
    }

    const pool = rarity === 5 ? GACHA_POOL.five : (rarity === 4 ? GACHA_POOL.four : GACHA_POOL.three);
    const item = pool[Math.floor(Math.random() * pool.length)];

    if (!state.collection[item.name]) {
      state.collection[item.name] = {
        count: 1,
        rarity,
        firstDate: new Date().toISOString(),
        element: item.element,
        weapon: item.weapon,
        region: item.region,
        desc: item.desc,
      };
    } else {
      state.collection[item.name].count++;
    }

    state.wishRecords.push({
      itemName: item.name,
      rarity,
      element: item.element,
      time: new Date().toISOString(),
    });

    this.save(state);
    return { success: true, item, rarity, state };
  },

  // 获取统计数据
  getStats() {
    const state = this.load();
    const tasks = this.getAllTasks();
    const completed = tasks.filter(t => t.status === 'completed');
    const leave = tasks.filter(t => t.status === 'leave');
    const pending = tasks.filter(t => t.status === 'pending');
    const totalEarned = state.checkinRecords.reduce((sum, r) => sum + r.reward, 0);
    const dailyBonusTotal = Object.keys(state.dailyBonuses || {}).length * DAILY_BONUS;
    const totalSpent = state.wishRecords.length * WISH_COST;
    const collectionCount = Object.keys(state.collection).length;
    const totalPoolSize = GACHA_POOL.five.length + GACHA_POOL.four.length + GACHA_POOL.three.length;

    // 今日待完成任务
    const todayStr = this.getTodayStr();
    const todayTasks = tasks.filter(t => t.status !== 'leave' && t.deadline === todayStr);
    const todayDone = todayTasks.filter(t => t.status === 'completed').length;
    const todayAllDone = todayTasks.length > 0 && todayDone === todayTasks.length;

    return {
      totalTasks: tasks.length,
      completedCount: completed.length,
      leaveCount: state.leaveRecords.length,
      leaveUsed: state.leaveRecords.length,
      pendingCount: pending.length,
      primogems: state.primogems,
      totalEarned,
      dailyBonusTotal,
      totalSpent,
      totalWishes: state.wishRecords.length,
      collectionCount,
      totalPoolSize,
      adjustCount: state.adjustRecords.length,
      fiveStarCount: state.wishRecords.filter(w => w.rarity === 5).length,
      fourStarCount: state.wishRecords.filter(w => w.rarity === 4).length,
      threeStarCount: state.wishRecords.filter(w => w.rarity === 3).length,
      pityCounter: state.pityCounter || 0,
      todayTaskCount: todayTasks.length,
      todayDoneCount: todayDone,
      todayAllDone,
      dailyBonusClaimed: !!(state.dailyBonuses && state.dailyBonuses[todayStr]),
    };
  },

  // 获取当前周期
  getCurrentCycle() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const c of CYCLES) {
      const start = new Date(c.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(c.endDate);
      end.setHours(23, 59, 59, 999);
      if (today >= start && today <= end) {
        return c;
      }
    }
    for (let i = CYCLES.length - 1; i >= 0; i--) {
      const end = new Date(CYCLES[i].endDate);
      end.setHours(23, 59, 59, 999);
      if (today > end) {
        return CYCLES[Math.min(i + 1, CYCLES.length - 1)];
      }
    }
    return CYCLES[0];
  },
};

if (typeof window !== 'undefined') {
  window.Store = Store;
}
