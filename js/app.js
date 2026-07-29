/**
 * 弘毅暑期打卡奖励系统 - 核心应用逻辑
 */

const App = {
  currentTaskId: null,
  collectionFilter: 'all',
  activeSubject: 'all',       // 当前学科筛选

  init() {
    this.bindEvents();
    // 初始化同步（异步拉取远程数据）
    this.initSync();
    this.renderAll();
  },

  // ===== 初始化同步 =====
  async initSync() {
    if (Sync.isConfigured()) {
      document.getElementById('syncIcon').className = 'sync-icon syncing';
      const result = await Sync.pull();
      if (result.success) {
        document.getElementById('syncIcon').className = 'sync-icon synced';
      } else {
        document.getElementById('syncIcon').className = 'sync-icon error';
      }
      this.updateSyncStatus();
    } else {
      document.getElementById('syncIcon').className = 'sync-icon unset';
    }
  },

  updateSyncStatus() {
    const cfg = Sync.getConfig();
    const statusBar = document.getElementById('syncStatusBar');
    if (!statusBar) return;
    if (Sync.isConfigured()) {
      statusBar.innerHTML = `
        <span class="sync-dot"></span>
        已连接 · ${cfg.username || 'GitHub'} · ${Sync.getLastSyncText()}
      `;
    } else {
      statusBar.innerHTML = `<span style="opacity:0.6;">未连接同步</span>`;
    }
  },

  bindEvents() {
    // 导航标签
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // 图鉴筛选
    document.querySelectorAll('.col-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.col-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.collectionFilter = btn.dataset.rarity;
        this.renderCollection();
      });
    });

    // 筛选器
    document.getElementById('cycleFilter').addEventListener('change', () => this.renderAllTasks());
    document.getElementById('statusFilter').addEventListener('change', () => this.renderAllTasks());

    // 弹窗关闭
    document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
    document.getElementById('taskModal').addEventListener('click', (e) => {
      if (e.target.id === 'taskModal') this.closeModal();
    });

    // 调整日期
    document.getElementById('adjustBtn').addEventListener('click', () => this.handleAdjustDate());

    // 祈愿
    document.getElementById('wishBtn').addEventListener('click', () => Gacha.startWish());
    document.getElementById('resultCloseBtn').addEventListener('click', () => Gacha.closeWish());

    // 新增任务（首页按钮 + 全部任务按钮 + 移动端FAB）
    document.getElementById('addTaskBtn').addEventListener('click', () => this.openAddTaskModal());
    const allTasksAddBtn = document.getElementById('allTasksAddBtn');
    if (allTasksAddBtn) allTasksAddBtn.addEventListener('click', () => this.openAddTaskModal());
    const fab = document.getElementById('fabAddTask');
    if (fab) fab.addEventListener('click', () => this.openAddTaskModal());
    document.getElementById('addTaskModalClose').addEventListener('click', () => this.closeAddTaskModal());
    document.getElementById('addTaskModal').addEventListener('click', (e) => {
      if (e.target.id === 'addTaskModal') this.closeAddTaskModal();
    });
    document.getElementById('submitAddTask').addEventListener('click', () => this.handleAddTask());
  },

  // ===== 切换标签 =====
  switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${tabName}`).classList.add('active');

    const state = Store.load();
    state.activeTab = tabName;
    Store.save(state);

    if (tabName === 'home') this.renderHome();
    else if (tabName === 'tasks') { this.buildSubjectNav(); this.renderAllTasks(); }
    else if (tabName === 'wish') this.renderWishPage();
    else if (tabName === 'collection') this.renderCollection();
    else if (tabName === 'stats') Stats.render();
    else if (tabName === 'settings') this.renderSettings();
  },

  renderAll() {
    this.updateTopBar();
    this.initFilters();
    this.renderHome();
  },

  // ===== 顶部栏更新 =====
  updateTopBar() {
    const state = Store.load();
    document.getElementById('primogemCount').textContent = state.primogems;
    const leaveCount = Object.keys(state.taskLeaves || {}).length;
    document.getElementById('leaveDisplay').querySelector('.leave-text').textContent =
      `请假 ${leaveCount}次`;
  },

  // ===== 初始化筛选器 =====
  initFilters() {
    const cycleFilter = document.getElementById('cycleFilter');
    CYCLES.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `📅 周期${c.id}`;
      cycleFilter.appendChild(opt);
    });

    // 构建学科导航
    this.buildSubjectNav();

    // 新增任务弹窗的科目下拉
    const addSubjectFilter = document.getElementById('addTaskSubject');
    Object.keys(SUBJECTS).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = `${SUBJECTS[s].icon} ${s}`;
      addSubjectFilter.appendChild(opt);
    });
  },

  // ===== 构建学科二级导航 =====
  buildSubjectNav() {
    const nav = document.getElementById('subjectNav');
    const tasks = Store.getMergedTasks();

    // 统计每科目待完成数
    const counts = {};
    tasks.forEach(t => {
      if (!counts[t.subject]) counts[t.subject] = { total: 0, pending: 0 };
      counts[t.subject].total++;
      if (t.status === 'pending') counts[t.subject].pending++;
    });

    const allPending = Object.values(counts).reduce((s, c) => s + c.pending, 0);

    let html = `
      <button class="subject-nav-pill ${this.activeSubject === 'all' ? 'active' : ''}"
              data-subject="all" style="--pill-color: var(--gold)">
        <span class="pill-icon">📋</span>全部<span class="pill-count">${allPending}</span>
      </button>`;

    Object.keys(SUBJECTS).forEach(s => {
      const subj = SUBJECTS[s];
      const cnt = counts[s] || { pending: 0 };
      html += `
        <button class="subject-nav-pill ${this.activeSubject === s ? 'active' : ''}"
                data-subject="${s}" style="--pill-color: ${subj.color}">
          <span class="pill-icon">${subj.icon}</span>${s}<span class="pill-count">${cnt.pending}</span>
        </button>`;
    });

    nav.innerHTML = html;

    // 绑定事件
    nav.querySelectorAll('.subject-nav-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.activeSubject = pill.dataset.subject;
        this.buildSubjectNav();
        this.renderAllTasks();
      });
    });
  },

  // ===== 首页渲染 =====
  renderHome() {
    this.renderCycleBanner();
    this.renderOverdue();
    this.renderCurrent();
  },

  renderCycleBanner() {
    const cycle = Store.getCurrentCycle();
    const tasks = Store.getMergedTasks().filter(t => t.cycleId === cycle.id);
    const completed = tasks.filter(t => t.status === 'completed').length;
    const total = tasks.length;

    const banner = document.getElementById('cycleBanner');
    banner.innerHTML = `
      <div class="cycle-banner-info">
        <div class="cycle-banner-title">周期 ${cycle.id} · 当前周</div>
        <div class="cycle-banner-date">
          ${this.formatDate(cycle.startDate)} ~ ${this.formatDate(cycle.endDate)}
        </div>
      </div>
      <div class="cycle-banner-status">
        <div class="cycle-banner-progress">${completed}/${total}</div>
        <div class="cycle-banner-label">已完成</div>
      </div>
    `;
  },

  renderOverdue() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks = Store.getMergedTasks().filter(t => {
      if (t.status !== 'pending') return false;
      const deadline = new Date(t.deadline);
      deadline.setHours(23, 59, 59, 999);
      return deadline < today;
    });

    const section = document.getElementById('overdueSection');

    if (overdueTasks.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    document.getElementById('overdueCount').textContent = overdueTasks.length;

    // 显示逾期重分配信息
    const redistCount = overdueTasks.filter(t => TASK_REDISTRIBUTION[t.id]).length;
    const hintEl = document.getElementById('overdueHint');
    if (hintEl && redistCount > 0) {
      hintEl.style.display = 'block';
      hintEl.textContent = `📌 ${redistCount} 项逾期任务已重新分配到后续日期，正常打卡即可`;
    } else if (hintEl) {
      hintEl.style.display = 'none';
    }

    const grid = document.getElementById('overdueGrid');
    const sortedOverdue = this.sortTasks(overdueTasks);
    grid.innerHTML = sortedOverdue.map(t => this.taskCardHTML(t, true)).join('');

    grid.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('click', () => this.openTaskDetail(card.dataset.taskId));
    });
  },

  renderCurrent() {
    const cycle = Store.getCurrentCycle();
    const tasks = Store.getMergedTasks().filter(t => t.cycleId === cycle.id && t.status === 'pending');
    const grid = document.getElementById('currentGrid');
    document.getElementById('currentCount').textContent = tasks.length;

    if (tasks.length === 0) {
      grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);grid-column:1/-1;">本周期任务全部完成！🎉</div>';
      return;
    }

    grid.innerHTML = this.sortTasks(tasks).map(t => this.taskCardHTML(t, false)).join('');
    grid.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('click', () => this.openTaskDetail(card.dataset.taskId));
    });
  },

  // ===== 任务卡片HTML =====
  taskCardHTML(task, isOverdue, showCycle) {
    const subj = SUBJECTS[task.subject] || { icon: '📝', color: '#ccc' };
    const statusText = task.status === 'completed' ? '已完成' : (task.status === 'leave' ? '已请假' : '待完成');
    const statusClass = `status-${task.status}`;
    const customBadge = task.isCustom ? '<span class="custom-badge">自定义</span>' : '';
    const cycleBadge = (showCycle && task.cycleId > 0)
      ? `<span class="task-card-cycle">周期${task.cycleId}</span>` : '';

    return `
      <div class="task-card ${task.status} ${isOverdue ? 'overdue' : ''}" data-task-id="${task.id}"
           style="--subject-color: ${subj.color}">
        <div class="task-card-header">
          <span class="task-card-icon">${subj.icon}</span>
          <span class="task-card-subject">${task.subject}</span>
          ${cycleBadge}
          ${customBadge}
        </div>
        <div class="task-card-name">${task.name}</div>
        <div class="task-card-content">${task.content}</div>
        <div class="task-card-footer">
          <span class="task-card-deadline">📅 ${this.formatDateShort(task.deadline)}</span>
          <span class="task-card-status ${statusClass}">${statusText}</span>
        </div>
      </div>
    `;
  },

  // ===== 任务排序（按科目顺序 + Day编号） =====
  sortTasks(tasks) {
    const subjectOrder = Object.keys(SUBJECTS);
    return [...tasks].sort((a, b) => {
      const aSubj = subjectOrder.indexOf(a.subject);
      const bSubj = subjectOrder.indexOf(b.subject);
      if (aSubj !== bSubj) return aSubj - bSubj;

      const aDay = parseInt((a.name.match(/Day(\d+)/) || [, '0'])[1]);
      const bDay = parseInt((b.name.match(/Day(\d+)/) || [, '0'])[1]);
      if (aDay !== bDay) return aDay - bDay;

      // 同Day编号按名称排序（处理语文R/N/P后缀等）
      return a.name.localeCompare(b.name);
    });
  },

  // ===== 全部任务列表（按学科+周期分组） =====
  renderAllTasks() {
    const cycleFilter = document.getElementById('cycleFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    let tasks = Store.getMergedTasks();
    if (this.activeSubject !== 'all') tasks = tasks.filter(t => t.subject === this.activeSubject);
    if (cycleFilter !== 'all') tasks = tasks.filter(t => t.cycleId === parseInt(cycleFilter));
    if (statusFilter !== 'all') tasks = tasks.filter(t => t.status === statusFilter);

    document.getElementById('allTaskCount').textContent = `${tasks.length} 项任务`;

    const container = document.getElementById('allTaskGroups');

    if (tasks.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:48px 0;color:var(--text-secondary);">
          <div style="font-size:48px;margin-bottom:12px;">📭</div>
          <div style="font-size:16px;">没有匹配的任务</div>
          <div style="font-size:13px;margin-top:4px;opacity:0.6;">试试切换学科或筛选条件</div>
        </div>`;
      return;
    }

    // 选中具体科目时：扁平列表按Day编号全局排序，不按周期分组
    if (this.activeSubject !== 'all') {
      const sorted = this.sortTasks(tasks);
      const subj = SUBJECTS[this.activeSubject] || { icon: '📝', color: '#ccc' };
      const completedCount = sorted.filter(t => t.status === 'completed').length;
      const pct = sorted.length > 0 ? Math.round(completedCount / sorted.length * 100) : 0;

      container.innerHTML = `
        <div class="cycle-group">
          <div class="cycle-group-header">
            <div class="cycle-badge" style="border-color:${subj.color}44;">
              <span class="cycle-badge-num" style="color:${subj.color};">${subj.icon}</span>
              <span class="cycle-badge-label">${this.activeSubject}</span>
            </div>
            <div class="cycle-group-info">
              <span style="font-size:16px;font-weight:700;color:var(--text-primary);">${this.activeSubject} 全部任务</span>
              <div class="cycle-group-date">
                <span class="date-dot" style="background:${subj.color};"></span>共 ${sorted.length} 项 · 已完成 ${completedCount} 项
              </div>
            </div>
            <div class="cycle-group-progress">
              <div class="cycle-progress-bar">
                <div class="cycle-progress-fill" style="width:${pct}%"></div>
              </div>
              <span class="cycle-progress-text">${completedCount}/${sorted.length}</span>
            </div>
          </div>
          <div class="cycle-group-tasks">
            ${sorted.map(t => this.taskCardHTML(t, false, true)).join('')}
          </div>
        </div>`;

      container.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('click', () => this.openTaskDetail(card.dataset.taskId));
      });
      return;
    }

    // "全部"科目时：按周期分组（原有逻辑）
    // 按周期分组
    const groups = {};
    tasks.forEach(t => {
      const cid = t.cycleId > 0 ? t.cycleId : 0;
      if (!groups[cid]) groups[cid] = [];
      groups[cid].push(t);
    });

    // 每个周期分组内按科目+Day编号排序
    Object.keys(groups).forEach(cid => {
      groups[cid] = this.sortTasks(groups[cid]);
    });

    // 排序周期
    const sortedCycles = Object.keys(groups).map(Number).sort((a, b) => {
      if (a === 0) return 1;  // 自定义任务排最后
      if (b === 0) return -1;
      return a - b;
    });

    container.innerHTML = sortedCycles.map(cid => {
      const cycleTasks = groups[cid];
      const completed = cycleTasks.filter(t => t.status === 'completed').length;
      const total = cycleTasks.length;
      const pct = total > 0 ? Math.round(completed / total * 100) : 0;

      if (cid === 0) {
        // 自定义任务分组
        return `
          <div class="cycle-group">
            <div class="cycle-group-header">
              <div class="cycle-badge" style="border-color:rgba(255,255,255,0.2);">
                <span class="cycle-badge-num" style="color:var(--text-secondary);">✦</span>
                <span class="cycle-badge-label">自定义</span>
              </div>
              <div class="cycle-group-info">
                <span style="font-size:16px;font-weight:700;color:var(--text-primary);">自定义任务</span>
                <div class="cycle-group-date">
                  <span class="date-dot"></span>不限截止日期
                </div>
              </div>
              <div class="cycle-group-progress">
                <div class="cycle-progress-bar">
                  <div class="cycle-progress-fill" style="width:${pct}%"></div>
                </div>
                <span class="cycle-progress-text">${completed}/${total}</span>
              </div>
            </div>
            <div class="cycle-group-tasks">
              ${cycleTasks.map(t => this.taskCardHTML(t, false)).join('')}
            </div>
          </div>`;
      }

      const cycle = CYCLES.find(c => c.id === cid);
      const chineseNum = ['零','一','二','三','四','五','六','七','八','九','十',
                          '十一','十二','十三','十四','十五','十六','十七','十八','十九'];
      const cycleName = chineseNum[cid] || cid;

      return `
        <div class="cycle-group">
          <div class="cycle-group-header">
            <div class="cycle-badge">
              <span class="cycle-badge-num">${cid}</span>
              <span class="cycle-badge-label">周期</span>
            </div>
            <div class="cycle-group-info">
              <span style="font-size:16px;font-weight:700;color:var(--text-primary);">
                周期${cycleName}
              </span>
              <div class="cycle-group-date">
                <span class="date-dot"></span>
                ${this.formatDateShort(cycle.startDate)} ~ ${this.formatDateShort(cycle.endDate)}
              </div>
            </div>
            <div class="cycle-group-progress">
              <div class="cycle-progress-bar">
                <div class="cycle-progress-fill" style="width:${pct}%"></div>
              </div>
              <span class="cycle-progress-text">${completed}/${total}</span>
            </div>
          </div>
          <div class="cycle-group-tasks">
            ${cycleTasks.map(t => this.taskCardHTML(t, false)).join('')}
          </div>
        </div>`;
    }).join('');

    // 绑定卡片点击
    container.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('click', () => this.openTaskDetail(card.dataset.taskId));
    });
  },

  // ===== 任务详情弹窗 =====
  openTaskDetail(taskId) {
    const task = Store.getMergedTasks().find(t => t.id === taskId);
    if (!task) return;

    this.currentTaskId = taskId;
    const subj = SUBJECTS[task.subject] || { icon: '📝', color: '#ccc' };
    const cycle = CYCLES.find(c => c.id === task.cycleId);
    const state = Store.load();

    // 状态标签
    const statusLabels = {
      completed: { text: '已完成', cls: 'completed', icon: '✅' },
      leave: { text: '已请假', cls: 'leave', icon: '🏖️' },
      pending: { text: '待完成', cls: 'pending', icon: '⏳' },
    };
    const sl = statusLabels[task.status] || statusLabels.pending;

    const chineseNum = ['零','一','二','三','四','五','六','七','八','九','十',
                        '十一','十二','十三','十四','十五','十六','十七','十八','十九'];
    const cycleName = task.cycleId > 0 ? `周期${chineseNum[task.cycleId] || task.cycleId}` : '自定义';
    const cycleLabel = cycle ? `${cycleName}（${this.formatDate(cycle.startDate)} ~ ${this.formatDate(cycle.endDate)}）` : '自定义任务';

    // 头部
    document.getElementById('taskDetailHeader').innerHTML = `
      <div class="detail-header-top">
        <div class="detail-subject-badge" style="background: ${subj.color}22; color: ${subj.color}; border: 1px solid ${subj.color}44;">
          ${subj.icon} ${task.subject}
        </div>
        <span class="detail-status-badge ${sl.cls}">${sl.icon} ${sl.text}</span>
        ${task.isCustom ? '<span class="detail-custom-badge">自定义</span>' : ''}
      </div>
      <div class="detail-title">${task.name}</div>
    `;

    // 正文
    document.getElementById('detailName').value = task.name;
    document.getElementById('detailContent').value = task.content;
    document.getElementById('detailFrequency').value = task.frequency || 'once';
    document.getElementById('detailCycle').textContent = cycleLabel;

    const adjustInput = document.getElementById('adjustDateInput');
    adjustInput.value = task.deadline;

    const completedInfo = document.getElementById('completedInfo');
    if (task.completedDate) {
      completedInfo.style.display = 'flex';
      document.getElementById('detailCompletedDate').textContent = this.formatDateTime(task.completedDate);
    } else {
      completedInfo.style.display = 'none';
    }

    // 操作按钮 — 每任务最多请假1次
    const actions = document.getElementById('detailActions');
    const taskLeaveCount = state.taskLeaves && state.taskLeaves[taskId] ? 1 : 0;
    const canLeave = taskLeaveCount < MAX_LEAVE_PER_TASK;

    if (task.status === 'completed') {
      actions.innerHTML = `
        <div class="btn-completed-badge">✅ 任务已完成</div>
        <div class="action-row">
          <button class="action-btn btn-edit-save" id="btnSaveTaskInfo">💾 保存编辑</button>
          <button class="action-btn btn-delete-task" id="btnDeleteTask">🗑️ 删除</button>
        </div>`;
      document.getElementById('btnSaveTaskInfo').addEventListener('click', () => this.handleSaveTaskInfo());
      document.getElementById('btnDeleteTask').addEventListener('click', () => this.handleDeleteTask());
    } else if (task.status === 'leave') {
      actions.innerHTML = `
        <div class="btn-leave-badge">🏖️ 已请假</div>
        <div class="action-row">
          <button class="action-btn btn-edit-save" id="btnSaveTaskInfo">💾 保存编辑</button>
          <button class="action-btn btn-delete-task" id="btnDeleteTask">🗑️ 删除</button>
        </div>`;
      document.getElementById('btnSaveTaskInfo').addEventListener('click', () => this.handleSaveTaskInfo());
      document.getElementById('btnDeleteTask').addEventListener('click', () => this.handleDeleteTask());
    } else {
      const rewardLabel = `✅ 打卡完成 (+${REWARD_PRIMOGEMS}原石)`;

      const leaveBtnDisabled = !canLeave ? 'disabled' : '';
      const leaveText = canLeave ? '🏖️ 请假' : '🏖️ 请假 (已用完)';
      actions.innerHTML = `
        <button class="action-btn btn-complete action-btn-full" id="btnComplete">
          ${rewardLabel}
        </button>
        <div class="action-row">
          <button class="action-btn btn-leave" id="btnLeave" ${leaveBtnDisabled}>
            ${leaveText}
          </button>
          <button class="action-btn btn-edit-save" id="btnSaveTaskInfo">💾 保存编辑</button>
        </div>
        <div class="action-row">
          <button class="action-btn btn-delete-task action-btn-full" id="btnDeleteTask">🗑️ 删除</button>
        </div>`;
      document.getElementById('btnComplete').addEventListener('click', () => this.handleComplete());
      document.getElementById('btnLeave').addEventListener('click', () => this.handleLeave());
      document.getElementById('btnSaveTaskInfo').addEventListener('click', () => this.handleSaveTaskInfo());
      document.getElementById('btnDeleteTask').addEventListener('click', () => this.handleDeleteTask());
    }

    document.getElementById('taskModal').classList.add('active');
  },

  closeModal() {
    document.getElementById('taskModal').classList.remove('active');
    this.currentTaskId = null;
  },

  // ===== 打卡完成 =====
  handleComplete() {
    if (!this.currentTaskId) return;
    const result = Store.completeTask(this.currentTaskId);
    if (!result) return;

    this.showRewardToast();
    this.closeModal();
    this.updateTopBar();

    let msg = `打卡成功！获得 ${result.reward} 原石`;
    if (result.cycleBonus) {
      msg += ` 🎉 周期${result.cycleBonus.cycleId}全勤！额外 +${result.cycleBonus.earned} 原石`;
      setTimeout(() => this.showCycleBonusToast(result.cycleBonus), 800);
    }
    this.showToast(msg, 'success');

    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    if (activeTab === 'home') this.renderHome();
    else if (activeTab === 'tasks') { this.buildSubjectNav(); this.renderAllTasks(); }
  },

  // ===== 请假 =====
  handleLeave() {
    if (!this.currentTaskId) return;
    const result = Store.requestLeave(this.currentTaskId);
    if (!result.success) {
      this.showToast(result.msg, 'error');
      return;
    }
    this.closeModal();
    this.updateTopBar();
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    if (activeTab === 'home') this.renderHome();
    else if (activeTab === 'tasks') { this.buildSubjectNav(); this.renderAllTasks(); }
    this.showToast('请假成功', 'success');
  },

  // ===== 调整日期 =====
  handleAdjustDate() {
    if (!this.currentTaskId) return;
    const newDate = document.getElementById('adjustDateInput').value;
    if (!newDate) {
      this.showToast('请选择日期', 'error');
      return;
    }
    Store.adjustDeadline(this.currentTaskId, newDate);
    this.showToast('日期已调整', 'success');
    this.openTaskDetail(this.currentTaskId);
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    if (activeTab === 'home') this.renderHome();
    else if (activeTab === 'tasks') this.renderAllTasks();
  },

  // ===== 保存任务编辑 =====
  handleSaveTaskInfo() {
    if (!this.currentTaskId) return;
    const name = document.getElementById('detailName').value.trim();
    const content = document.getElementById('detailContent').value.trim();
    const frequency = document.getElementById('detailFrequency').value;

    if (!name) { this.showToast('任务名称不能为空', 'error'); return; }

    Store.updateTaskInfo(this.currentTaskId, { name, content, frequency });
    this.showToast('任务信息已保存', 'success');

    // 刷新当前弹窗和列表
    this.openTaskDetail(this.currentTaskId);
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    if (activeTab === 'home') this.renderHome();
    else if (activeTab === 'tasks') { this.buildSubjectNav(); this.renderAllTasks(); }
  },

  // ===== 删除任务（所有任务通用） =====
  handleDeleteTask() {
    if (!this.currentTaskId) return;
    if (!confirm('确定删除该任务？相关打卡/请假记录也将被清除。')) return;
    Store.deleteTask(this.currentTaskId);
    this.closeModal();
    this.updateTopBar();
    this.renderHome();
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    if (activeTab === 'tasks') { this.buildSubjectNav(); this.renderAllTasks(); }
    this.showToast('任务已删除', 'success');
  },

  // ===== 新增任务弹窗 =====
  openAddTaskModal() {
    document.getElementById('addTaskModal').classList.add('active');
    document.getElementById('addTaskName').value = '';
    document.getElementById('addTaskFrequency').value = 'once';
  },

  closeAddTaskModal() {
    document.getElementById('addTaskModal').classList.remove('active');
  },

  handleAddTask() {
    const subject = document.getElementById('addTaskSubject').value;
    const name = document.getElementById('addTaskName').value.trim();
    const frequency = document.getElementById('addTaskFrequency').value;

    if (!name) { this.showToast('请输入任务名称', 'error'); return; }

    const result = Store.addCustomTask({ subject, name, frequency });
    if (!result.success) {
      this.showToast('添加失败', 'error');
      return;
    }

    this.closeAddTaskModal();
    this.updateTopBar();
    this.buildSubjectNav();
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    if (!activeTab || activeTab === 'home') this.renderHome();
    else if (activeTab === 'tasks') { this.buildSubjectNav(); this.renderAllTasks(); }
    const count = result.tasks ? result.tasks.length : 1;
    this.showToast(count > 1 ? `已添加 ${count} 个任务` : '任务添加成功', 'success');
  },

  // ===== 设置页面 =====
  renderSettings() {
    this.updateTopBar();
    const cfg = Sync.getConfig();
    const connected = Sync.isConfigured();
    const container = document.getElementById('settingsContent');

    container.innerHTML = `
      <div class="settings-card">
        <div class="settings-card-title">
          <span>☁️</span> GitHub 数据同步
        </div>
        <div class="settings-card-desc">
          通过 GitHub Gist 实现手机和电脑之间的数据同步。数据存储在您的私有 Gist 中，仅您本人可访问。
        </div>

        <div class="sync-status-display ${connected ? 'connected' : 'disconnected'}" id="syncStatusDisplay">
          ${connected ? `
            <div class="sync-status-row">
              <span class="sync-status-dot"></span>
              <span>已连接</span>
            </div>
            <div class="sync-status-detail">
              GitHub 用户：<strong>${cfg.username || '—'}</strong>
            </div>
            <div class="sync-status-detail">
              Gist ID：<code>${cfg.gistId}</code>
            </div>
            <div class="sync-status-detail">
              最后同步：${Sync.getLastSyncText()}
            </div>
          ` : `
            <div class="sync-status-row">
              <span class="sync-status-dot" style="background:var(--text-secondary);"></span>
              <span>未连接</span>
            </div>
            <div class="sync-status-detail">
              设置后即可在多设备间同步数据
            </div>
          `}
        </div>

        <div class="sync-form" id="syncForm" style="${connected ? 'display:none;' : ''}">
          <div class="detail-row">
            <label>GitHub Personal Access Token</label>
            <input type="password" id="githubToken" class="add-task-input" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx">
            <div class="settings-hint">
              需要 <strong>gist</strong> 权限。在 GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens 中创建。
            </div>
          </div>
          <button class="action-btn btn-complete" id="btnConnectSync" style="width:100%;flex:none;">
            🔗 连接同步
          </button>
        </div>

        <div class="sync-actions" style="${connected ? '' : 'display:none;'}">
          <button class="action-btn" id="btnSyncNow" style="background:linear-gradient(135deg, #2a4a6a, #3a6a8a);color:#fff;border:1px solid rgba(116,180,232,0.4);">
            🔄 立即同步
          </button>
          <button class="action-btn btn-delete-task" id="btnDisconnect" style="flex:0.5;">
            ⚠️ 断开连接
          </button>
        </div>
      </div>

      <div class="settings-card">
        <div class="settings-card-title">
          <span>💾</span> 数据导入导出
        </div>
        <div class="settings-card-desc">
          导出当前所有数据（打卡记录、原石、祈愿记录、图鉴等）为JSON文件备份。需要恢复时，从备份文件导入即可。
        </div>
        <div class="sync-actions" style="display:flex;gap:12px;">
          <button class="action-btn" id="btnExportData" style="background:linear-gradient(135deg, #2a4a6a, #3a6a8a);color:#fff;border:1px solid rgba(116,180,232,0.4);flex:1;">
            📤 导出数据
          </button>
          <button class="action-btn" id="btnImportData" style="background:linear-gradient(135deg, #2a6a4a, #3a8a5a);color:#fff;border:1px solid rgba(141,232,116,0.4);flex:1;">
            📥 导入数据
          </button>
        </div>
        <input type="file" id="importFileInput" accept=".json" style="display:none;">
      </div>

      <div class="settings-card">
        <div class="settings-card-title">
          <span>🔄</span> 同步说明
        </div>
        <div class="settings-card-desc">
          <ul style="margin:0;padding-left:20px;line-height:1.8;">
            <li>打卡/请假/祈愿后<strong>自动同步</strong>到云端</li>
            <li>打开页面时自动从云端拉取最新数据</li>
            <li>支持手机浏览器和电脑浏览器同时使用</li>
            <li>数据存储在您的<strong>私有</strong> GitHub Gist 中</li>
            <li>Token 仅需 <code>gist</code> 权限，不会访问您的代码仓库</li>
          </ul>
        </div>
      </div>
    `;

    // 绑定事件
    const btnConnect = document.getElementById('btnConnectSync');
    const btnSyncNow = document.getElementById('btnSyncNow');
    const btnDisconnect = document.getElementById('btnDisconnect');

    if (btnConnect) {
      btnConnect.addEventListener('click', () => this.handleConnectSync());
    }
    if (btnSyncNow) {
      btnSyncNow.addEventListener('click', () => this.handleSyncNow());
    }
    if (btnDisconnect) {
      btnDisconnect.addEventListener('click', () => this.handleDisconnect());
    }

    const btnExport = document.getElementById('btnExportData');
    const btnImport = document.getElementById('btnImportData');
    const importInput = document.getElementById('importFileInput');
    if (btnExport) {
      btnExport.addEventListener('click', () => this.handleExportData());
    }
    if (btnImport) {
      btnImport.addEventListener('click', () => importInput.click());
    }
    if (importInput) {
      importInput.addEventListener('change', (e) => this.handleImportData(e));
    }
  },

  async handleConnectSync() {
    const token = document.getElementById('githubToken').value.trim();
    if (!token) {
      this.showToast('请输入 GitHub Token', 'error');
      return;
    }

    const btn = document.getElementById('btnConnectSync');
    btn.disabled = true;
    btn.textContent = '⏳ 连接中...';

    try {
      const result = await Sync.setup(token);
      this.showToast(`连接成功！Gist 已创建`, 'success');
      document.getElementById('syncIcon').className = 'sync-icon synced';
      this.updateSyncStatus();
      this.renderSettings();
    } catch (e) {
      this.showToast(e.message, 'error');
      btn.disabled = false;
      btn.textContent = '🔗 连接同步';
    }
  },

  async handleSyncNow() {
    const btn = document.getElementById('btnSyncNow');
    btn.disabled = true;
    btn.textContent = '⏳ 同步中...';

    document.getElementById('syncIcon').className = 'sync-icon syncing';
    // 先拉取远程数据
    const pullResult = await Sync.pull();
    // 再推送本地数据
    const pushResult = await Sync.push();

    if (pullResult.success || pushResult.success) {
      this.showToast('同步完成', 'success');
      document.getElementById('syncIcon').className = 'sync-icon synced';
    } else {
      this.showToast('同步失败，请检查网络', 'error');
      document.getElementById('syncIcon').className = 'sync-icon error';
    }

    this.updateSyncStatus();
    // 刷新当前页面数据
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    if (activeTab === 'home') this.renderHome();
    else if (activeTab === 'tasks') { this.buildSubjectNav(); this.renderAllTasks(); }
    else if (activeTab === 'stats') Stats.render();
    this.updateTopBar();

    btn.disabled = false;
    btn.textContent = '🔄 立即同步';
  },

  handleDisconnect() {
    if (!confirm('确定断开同步连接？断开后数据仅保存在本设备上，不再自动同步。')) return;
    Sync.disconnect();
    document.getElementById('syncIcon').className = 'sync-icon unset';
    this.updateSyncStatus();
    this.renderSettings();
    this.showToast('已断开同步连接', 'success');
  },

  // ===== 数据导出 =====
  handleExportData() {
    const state = Store.load();
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hongyi-backup-${Store.getTodayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('数据已导出为文件', 'success');
  },

  // ===== 数据导入 =====
  handleImportData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (typeof data !== 'object' || data === null) {
          this.showToast('导入失败：文件格式不正确', 'error');
          return;
        }
        if (!confirm('导入数据将覆盖当前所有数据（打卡记录、原石、祈愿记录等），确定继续？')) return;
        const merged = { ...Store.getDefaultState(), ...data };
        Store.save(merged);
        this.updateTopBar();
        this.buildSubjectNav();
        this.renderAll();
        this.showToast('数据导入成功！', 'success');
      } catch (err) {
        this.showToast('导入失败：文件解析错误', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  },

  // ===== 祈愿页面渲染 =====
  renderWishPage() {
    this.updateTopBar();
    const state = Store.load();
    const pityCounter = state.pityCounter || 0;
    const pity4Counter = state.pity4Counter || 0;

    const pityInfo = document.getElementById('pityInfo');
    pityInfo.innerHTML = `
      距离5星保底还需 <span style="color:var(--rarity-5);font-weight:700;">${90 - pityCounter}</span> 抽 |
      距离4��保底还需 <span style="color:var(--rarity-4);font-weight:700;">${10 - pity4Counter}</span> 抽
    `;

    const wishBtn = document.getElementById('wishBtn');
    wishBtn.disabled = state.primogems < WISH_COST;
  },

  // ===== 图鉴渲染 =====
  renderCollection() {
    const state = Store.load();
    const grid = document.getElementById('collectionGrid');

    const allItems = [
      ...GACHA_POOL.five.map(i => ({ ...i, rarity: 5 })),
      ...GACHA_POOL.four.map(i => ({ ...i, rarity: 4 })),
      ...GACHA_POOL.three.map(i => ({ ...i, rarity: 3 })),
    ];

    let items = allItems;
    if (this.collectionFilter !== 'all') {
      items = allItems.filter(i => i.rarity === parseInt(this.collectionFilter));
    }

    const collected = Object.keys(state.collection).length;
    const total = GACHA_POOL.five.length + GACHA_POOL.four.length + GACHA_POOL.three.length;
    document.getElementById('collectionProgress').textContent = `${collected} / ${total}`;
    document.getElementById('progressFill').style.width = `${(collected / total * 100).toFixed(1)}%`;

    grid.innerHTML = items.map(item => {
      const coll = state.collection[item.name];
      const elementColor = ELEMENT_COLORS[item.element] || '#ccc';
      const rarityClass = `r${item.rarity}`;
      const stars = '★'.repeat(item.rarity);

      if (coll) {
        return `
          <div class="collection-card">
            <div class="collection-count">×${coll.count}</div>
            <div class="col-card-rarity ${rarityClass}">${stars}</div>
            <div class="col-card-element" style="background:${elementColor}22;color:${elementColor};border:1px solid ${elementColor}44;">
              ${item.element} · ${item.weapon}
            </div>
            <div class="collection-name">${item.name}</div>
            <div class="collection-desc">${item.desc}</div>
          </div>
        `;
      } else {
        return `
          <div class="collection-card locked">
            <div class="col-card-rarity ${rarityClass}">${stars}</div>
            <div class="col-card-locked-icon">🔒</div>
            <div class="collection-name">??? </div>
            <div class="collection-desc">未收集</div>
          </div>
        `;
      }
    }).join('');
  },

  // ===== 原石奖励提示 =====
  showRewardToast() {
    const toast = document.getElementById('rewardToast');
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1500);
  },

  // 周期全勤祝贺
  showCycleBonusToast(cycleBonus) {
    const toast = document.getElementById('dailyBonusToast');
    if (!toast) return;
    const titleEl = toast.querySelector('.daily-bonus-title');
    const msgEl = document.getElementById('dailyBonusMsg');
    const rewardEl = toast.querySelector('.daily-bonus-reward');
    if (titleEl) titleEl.textContent = `周期${cycleBonus.cycleId}全勤达成！`;
    if (msgEl) msgEl.textContent = `本周期${cycleBonus.taskCount}项任务全部完成！`;
    if (rewardEl) rewardEl.textContent = `+${cycleBonus.earned} 原石`;
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  },

  showToast(msg, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast show';
    if (type === 'error') toast.classList.add('error');
    setTimeout(() => toast.classList.remove('show'), 2500);
  },

  formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  },

  formatDateShort(dateStr) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  },

  formatDateTime(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
