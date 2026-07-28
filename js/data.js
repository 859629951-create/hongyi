/**
 * 弘毅暑期打卡奖励系统 - 数据文件
 * 包含：作业任务数据 + 祈愿角色池数据
 */

// ========== 作业任务数据 ==========
// 每个周期3天，从起始日开始计算

const CYCLES = [
  { id: 1,  startDate: '2026-07-05', endDate: '2026-07-07' },
  { id: 2,  startDate: '2026-07-08', endDate: '2026-07-10' },
  { id: 3,  startDate: '2026-07-11', endDate: '2026-07-13' },
  { id: 4,  startDate: '2026-07-14', endDate: '2026-07-16' },
  { id: 5,  startDate: '2026-07-17', endDate: '2026-07-19' },
  { id: 6,  startDate: '2026-07-20', endDate: '2026-07-22' },
  { id: 7,  startDate: '2026-07-23', endDate: '2026-07-25' },
  { id: 8,  startDate: '2026-07-26', endDate: '2026-07-28' },
  { id: 9,  startDate: '2026-07-29', endDate: '2026-07-31' },
  { id: 10, startDate: '2026-08-01', endDate: '2026-08-03' },
  { id: 11, startDate: '2026-08-04', endDate: '2026-08-06' },
  { id: 12, startDate: '2026-08-07', endDate: '2026-08-09' },
  { id: 13, startDate: '2026-08-10', endDate: '2026-08-12' },
  { id: 14, startDate: '2026-08-13', endDate: '2026-08-15' },
  { id: 15, startDate: '2026-08-16', endDate: '2026-08-18' },
  { id: 16, startDate: '2026-08-19', endDate: '2026-08-21' },
  { id: 17, startDate: '2026-08-22', endDate: '2026-08-24' },
  { id: 18, startDate: '2026-08-25', endDate: '2026-08-27' },
  { id: 19, startDate: '2026-08-28', endDate: '2026-08-30' },
];

// 科目配置
const SUBJECTS = {
  '英语': { icon: '📖', color: '#74e8b4', element: '风' },
  '历史': { icon: '📜', color: '#e8a874', element: '岩' },
  '地理': { icon: '🌍', color: '#74b8e8', color2: '#5a9fd4', element: '水' },
  '政治': { icon: '⚖️', color: '#e874b8', element: '雷' },
  '生物': { icon: '🌿', color: '#8de874', element: '草' },
  '数学': { icon: '📐', color: '#b874e8', element: '雷' },
  '语文': { icon: '✏️', color: '#e87474', element: '火' },
  '物理': { icon: '⚡', color: '#74c8e8', element: '冰' },
};

// 科目缩写
const SUBJECT_PREFIX = {
  '英语': 'EN', '历史': 'HI', '地理': 'GE', '政治': 'PO',
  '生物': 'BI', '数学': 'MA', '语文': 'CN', '物理': 'PH'
};

function makeTaskId(subject, cycleId, suffix) {
  const prefix = SUBJECT_PREFIX[subject] || 'XX';
  return suffix ? `${prefix}-${cycleId}-D${suffix}` : `${prefix}-${cycleId}`;
}

/**
 * 根据"做到DayX"和"预习DayX-Y"模式推算每个周期的Day范围
 * 返回 { startDay, endDay }，null表示不需要拆分
 */
function getSplitRange(task) {
  // 匹配 "做到DayN" 模式
  const zuodao = task.name.match(/做到Day(\d+)/);
  if (zuodao) {
    const targetDay = parseInt(zuodao[1]);
    // 根据科目和周期推算起始Day
    if (task.subject === '物理') {
      // 物理：每周期3天，从周期4 Day10开始 (周期4→Day10-12)
      const startDay = (task.cycle - 1) * 3 + 1;
      const endDay = targetDay;
      // 本周期实际需要做的Day范围
      const cycleStart = (task.cycle - 4) * 3 + 10;
      const cycleEnd = Math.min(task.cycle * 3, endDay);
      return { startDay: cycleStart, endDay: cycleEnd };
    }
    if (task.subject === '数学') {
      // 数学：每周期4天，从周期8 Day1开始
      const cycleStart = (task.cycle - 8) * 4 + 1;
      const cycleEnd = Math.min(cycleStart + 3, targetDay);
      return { startDay: cycleStart, endDay: cycleEnd };
    }
    if (task.subject === '英语') {
      // 英语：每周期8天，从周期13 Day1开始
      const cycleStart = (task.cycle - 13) * 8 + 1;
      const cycleEnd = Math.min(cycleStart + 7, targetDay);
      return { startDay: cycleStart, endDay: cycleEnd };
    }
    if (task.subject === '语文') {
      // 语文：每周期8天，从周期13 Day1开始
      const cycleStart = (task.cycle - 13) * 8 + 1;
      const cycleEnd = Math.min(cycleStart + 7, targetDay);
      return { startDay: cycleStart, endDay: cycleEnd };
    }
    return null;
  }

  // 匹配 "预习DayX-Y" 模式
  const yuxi = task.name.match(/预习Day(\d+)-(\d+)/);
  if (yuxi) {
    return { startDay: parseInt(yuxi[1]), endDay: parseInt(yuxi[2]) };
  }

  return null;
}

// 原始作业任务（来自Word文档）
const TASKS_RAW = [
  // 周期4 (7月14日-16日)
  { cycle: 4, subject: '物理', name: '做到Day12', content: '物理练习册' },

  // 周期5 (7月17日-19日)
  { cycle: 5, subject: '历史', name: '抄写清单', content: '历史知识点抄写清单' },
  { cycle: 5, subject: '数学', name: '二、三、四', content: '数学第二、三、四章节' },
  // 语文每日任务见下方专用生成块（周期5-11，每天3项）
  { cycle: 5, subject: '物理', name: '做到Day15', content: '物理练习册' },

  // 周期6 (7月20日-22日)
  { cycle: 6, subject: '地理', name: '观后感', content: '地理纪录片观后感' },
  { cycle: 6, subject: '数学', name: '五、六、七', content: '数学第五、六、七章节' },
  { cycle: 6, subject: '物理', name: '做到Day18', content: '物理练习册' },

  // 周期7 (7月23日-25日)
  { cycle: 7, subject: '历史', name: '阅读笔记', content: '历史阅读笔记' },
  { cycle: 7, subject: '数学', name: '八', content: '数学第八章节' },
  { cycle: 7, subject: '物理', name: '做到Day21', content: '物理练习册' },

  // 周期8 (7月26日-28日)
  { cycle: 8, subject: '英语', name: '三、手绘册', content: '英语第三单元+手绘册' },
  { cycle: 8, subject: '地理', name: '学唱豫剧', content: '地理文化课：学唱豫剧' },
  { cycle: 8, subject: '数学', name: '做到Day4', content: '数学练习册' },
  { cycle: 8, subject: '物理', name: '做到Day24', content: '物理练习册' },

  // 周期9 (7月29日-31日)
  { cycle: 9, subject: '英语', name: 'unit1单词', content: '英语Unit1单词背诵' },
  { cycle: 9, subject: '地理', name: 'A4硬笔字', content: '地理A4硬笔书法字帖' },
  { cycle: 9, subject: '数学', name: '做到Day8', content: '数学练习册' },
  { cycle: 9, subject: '物理', name: '做到Day27', content: '物理练习册' },

  // 周期10 (8月1日-3日)
  { cycle: 10, subject: '英语', name: 'unit2单词', content: '英语Unit2单词背诵' },
  { cycle: 10, subject: '地理', name: '手抄报', content: '地理手抄报制作' },
  { cycle: 10, subject: '数学', name: '做到Day12', content: '数学练习册' },
  { cycle: 10, subject: '物理', name: '做到Day30', content: '物理练习册' },

  // 周期11 (8月4日-6日)
  { cycle: 11, subject: '英语', name: 'unit3单词', content: '英语Unit3单词背诵' },
  { cycle: 11, subject: '历史', name: '预习Day1-3', content: '历史预习' },
  { cycle: 11, subject: '数学', name: '做到Day16', content: '数学练习册' },
  { cycle: 11, subject: '物理', name: '做到Day33', content: '物理练习册' },

  // 周期12 (8月7日-9日)
  { cycle: 12, subject: '英语', name: 'unit4单词', content: '英语Unit4单词背诵' },
  { cycle: 12, subject: '历史', name: '预习Day4-6', content: '历史预习' },
  { cycle: 12, subject: '数学', name: '做到Day20', content: '数学练习册' },
  { cycle: 12, subject: '语文', name: '简易研学报告', content: '语文简易研学报告撰写' },
  { cycle: 12, subject: '物理', name: '做到Day36', content: '物理练习册' },

  // 周期13 (8月10日-12日)
  { cycle: 13, subject: '英语', name: '做到Day8', content: '英语练习' },
  { cycle: 13, subject: '历史', name: '预习Day7-9', content: '历史预习' },
  { cycle: 13, subject: '数学', name: '做到Day24', content: '数学练习册' },
  { cycle: 13, subject: '语文', name: '做到Day8', content: '语���练习' },
  { cycle: 13, subject: '物理', name: '做到Day39', content: '物理练习册' },

  // 周期14 (8月13日-15日)
  { cycle: 14, subject: '英语', name: '做到Day16', content: '英语练习' },
  { cycle: 14, subject: '历史', name: '预习Day10-12', content: '历史预习' },
  { cycle: 14, subject: '数学', name: '做到Day28', content: '数学练习册' },
  { cycle: 14, subject: '语文', name: '做到Day16', content: '语文练习' },
  { cycle: 14, subject: '物理', name: '做到Day42', content: '物理练习册' },

  // 周期15 (8月16日-18日)
  { cycle: 15, subject: '英语', name: '做到Day24', content: '英语练习' },
  { cycle: 15, subject: '历史', name: '预习Day13-14', content: '历史预习' },
  { cycle: 15, subject: '数学', name: '做到Day32', content: '数学练习册' },
  { cycle: 15, subject: '语文', name: '做到Day24', content: '语文练习' },
  { cycle: 15, subject: '物理', name: '复习', content: '物理总复习' },

  // 周期16 (8月19日-21日)
  { cycle: 16, subject: '英语', name: '做到Day32', content: '英语练习' },
  { cycle: 16, subject: '数学', name: '做到Day36', content: '数学练习册' },
  { cycle: 16, subject: '语文', name: '做到Day32', content: '语文练习' },
  { cycle: 16, subject: '物理', name: '复习', content: '物理总复习' },

  // 周期17 (8月22日-24日)
  { cycle: 17, subject: '英语', name: '做到Day40', content: '英语练习' },
  { cycle: 17, subject: '数学', name: '做到Day40', content: '数学练习册' },
  { cycle: 17, subject: '语文', name: '做到Day40', content: '语文练习' },
  { cycle: 17, subject: '物理', name: '复习', content: '物理总复习' },

  // 周期18 (8月25日-27日) - 模拟卷
  { cycle: 18, subject: '英语', name: '模拟卷', content: '英语模拟试卷' },
  { cycle: 18, subject: '历史', name: '模拟卷', content: '历史模拟试卷' },
  { cycle: 18, subject: '地理', name: '模拟卷', content: '地理模拟试卷' },
  { cycle: 18, subject: '政治', name: '模拟卷', content: '政治模拟试卷' },
  { cycle: 18, subject: '生物', name: '模拟卷', content: '生物模拟试卷' },
  { cycle: 18, subject: '数学', name: '模拟卷', content: '数学模拟���卷' },
  { cycle: 18, subject: '语文', name: '模拟卷', content: '语文模拟试卷' },
  { cycle: 18, subject: '物理', name: '模拟卷', content: '物理模拟试卷' },

  // 周期19 (8月28日-30日) - 模拟卷
  { cycle: 19, subject: '英语', name: '模拟卷', content: '英语模拟试卷' },
  { cycle: 19, subject: '历史', name: '模拟卷', content: '历史模拟试卷' },
  { cycle: 19, subject: '地理', name: '模拟卷', content: '地理模拟试卷' },
  { cycle: 19, subject: '政治', name: '模拟卷', content: '政治模拟试卷' },
  { cycle: 19, subject: '生物', name: '模拟卷', content: '生物模拟试卷' },
  { cycle: 19, subject: '数学', name: '模拟卷', content: '数学模拟试卷' },
  { cycle: 19, subject: '语文', name: '模拟卷', content: '语文模拟试卷' },
  { cycle: 19, subject: '物理', name: '模拟卷', content: '物理模拟试卷' },
];

// 生成完整��务列表（拆分Range任务为独立Day任务）
const TASKS = [];
TASKS_RAW.forEach(t => {
  const range = getSplitRange(t);
  const cycle = CYCLES.find(c => c.id === t.cycle);

  if (range) {
    // 拆分：每个Day一个独立任务
    for (let d = range.startDay; d <= range.endDay; d++) {
      TASKS.push({
        id: makeTaskId(t.subject, t.cycle, d),
        cycleId: t.cycle,
        subject: t.subject,
        name: `Day${d}`,
        content: `${t.content} Day${d}`,
        originalDeadline: cycle.endDate,
        deadline: cycle.endDate,
        status: 'pending',
        completedDate: null,
        leaveDate: null,
        adjustedDate: null,
        createdAt: new Date().toISOString(),
        isCustom: false,
      });
    }
  } else {
    // 不需要拆分，直接添加
    TASKS.push({
      id: makeTaskId(t.subject, t.cycle),
      cycleId: t.cycle,
      subject: t.subject,
      name: t.name,
      content: t.content,
      originalDeadline: cycle.endDate,
      deadline: cycle.endDate,
      status: 'pending',
      completedDate: null,
      leaveDate: null,
      adjustedDate: null,
      createdAt: new Date().toISOString(),
      isCustom: false,
    });
  }
});

// ===== 语文每日任务：周期5-11 (7月17日-8月6日) =====
// 每天3项独立任务 → 阅读计划 / 读书笔记 / 古诗文背诵
for (let c = 5; c <= 11; c++) {
  const cycle = CYCLES.find(cy => cy.id === c);
  const startDate = new Date(cycle.startDate + 'T00:00:00+08:00');
  for (let d = 0; d < 3; d++) {
    const dayNum = (c - 5) * 3 + d + 1;
    const taskDate = new Date(startDate);
    taskDate.setDate(taskDate.getDate() + d);
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${taskDate.getFullYear()}-${pad(taskDate.getMonth() + 1)}-${pad(taskDate.getDate())}`;

    TASKS.push({
      id: `CN-${c}-D${dayNum}R`,
      cycleId: c,
      subject: '语文',
      name: `Day${dayNum} 阅读计划`,
      content: '每日阅读计划',
      originalDeadline: dateStr,
      deadline: dateStr,
      status: 'pending',
      completedDate: null,
      leaveDate: null,
      adjustedDate: null,
      createdAt: new Date().toISOString(),
      isCustom: false,
    });
    TASKS.push({
      id: `CN-${c}-D${dayNum}N`,
      cycleId: c,
      subject: '语文',
      name: `Day${dayNum} 读书笔记`,
      content: '每天读书笔记1篇',
      originalDeadline: dateStr,
      deadline: dateStr,
      status: 'pending',
      completedDate: null,
      leaveDate: null,
      adjustedDate: null,
      createdAt: new Date().toISOString(),
      isCustom: false,
    });
    TASKS.push({
      id: `CN-${c}-D${dayNum}P`,
      cycleId: c,
      subject: '语文',
      name: `Day${dayNum} 古诗文背诵`,
      content: '背诵古诗文+古诗含意',
      originalDeadline: dateStr,
      deadline: dateStr,
      status: 'pending',
      completedDate: null,
      leaveDate: null,
      adjustedDate: null,
      createdAt: new Date().toISOString(),
      isCustom: false,
    });
  }
}


// ========== 祈愿角色池数据 ==========

const GACHA_POOL = {
  five: [
    { name: '温迪', element: '风', weapon: '弓', region: '蒙德', desc: '自由的吟游诗人，风之神巴巴托斯' },
    { name: '钟离', element: '岩', weapon: '长柄武器', region: '璃月', desc: '岩王帝君，契约之神' },
    { name: '雷电将军', element: '雷', weapon: '长柄武器', region: '稻妻', desc: '雷电将军，永恒之神' },
    { name: '神里绫华', element: '冰', weapon: '单手剑', region: '稻妻', desc: '白鹭公主，神里家嫡女' },
    { name: '胡桃', element: '火', weapon: '长柄武器', region: '璃月', desc: '往生堂第七十七代堂主' },
    { name: '甘雨', element: '冰', weapon: '弓', region: '璃月', desc: '月海亭的秘书，麒麟血脉' },
    { name: '夜兰', element: '水', weapon: '弓', region: '璃月', desc: '神秘谍报人员' },
    { name: '妮露', element: '水', weapon: '单手剑', region: '须弥', desc: '祖拜尔剧场的明星舞者' },
    { name: '纳西妲', element: '草', weapon: '法器', region: '须弥', desc: '草神，智慧之神' },
    { name: '芙宁娜', element: '水', weapon: '单手剑', region: '枫丹', desc: '枫丹的水之神，正义的化身' },
    { name: '那维莱特', element: '水', weapon: '法器', region: '枫丹', desc: '最高审判官，龙族后裔' },
    { name: '阿蕾奇诺', element: '火', weapon: '长柄武器', region: '至冬', desc: '愚人众第四执行官「仆人」' },
  ],
  four: [
    { name: '班尼特', element: '火', weapon: '单手剑', region: '蒙德', desc: '冒险家，运气极差但心地善良' },
    { name: '香菱', element: '火', weapon: '长柄武器', region: '璃月', desc: '万民堂的新任大厨' },
    { name: '行秋', element: '水', weapon: '单手剑', region: '璃月', desc: '飞云商会二少爷，爱好读书' },
    { name: '重云', element: '冰', weapon: '双手剑', region: '璃月', desc: '方士，纯阳之体' },
    { name: '凝光', element: '岩', weapon: '法器', region: '璃月', desc: '璃月七星之天权星' },
    { name: '菲谢尔', element: '雷', weapon: '弓', region: '蒙德', desc: '自称「断罪皇女」的冒险家' },
    { name: '砂糖', element: '风', weapon: '法器', region: '蒙德', desc: '炼金术士，热爱生物研究' },
    { name: '迪奥娜', element: '冰', weapon: '弓', region: '蒙德', desc: '猫尾酒馆的调酒师' },
    { name: '烟绯', element: '火', weapon: '法器', region: '璃月', desc: '律法咨询师，半仙之兽' },
    { name: '久岐忍', element: '雷', weapon: '单手剑', region: '稻妻', desc: '荒泷派二把手，巫女' },
    { name: '珐露珊', element: '风', weapon: '弓', region: '须弥', desc: '百年前的教令院学者' },
    { name: '莱依拉', element: '冰', weapon: '单手剑', region: '须弥', desc: '梨多梵谛学院的学生' },
  ],
  three: [
    { name: '旅行剑', element: '物理', weapon: '单手剑', region: '—', desc: '旅人随身携带的短剑' },
    { name: '鸦羽弓', element: '物理', weapon: '弓', region: '—', desc: '以鸦羽装饰的轻弓' },
    { name: '魔导绪论', element: '物理', weapon: '法器', region: '—', desc: '魔法入门教材' },
    { name: '白铁大剑', element: '物理', weapon: '双手剑', region: '—', desc: '白铁打造的重剑' },
    { name: '白缨枪', element: '物理', weapon: '长柄武器', region: '—', desc: '枪头有白缨的长枪' },
    { name: '翡翠法球', element: '物理', weapon: '法器', region: '—', desc: '翡翠制成的法球' },
    { name: '讨龙英杰谭', element: '物理', weapon: '法器', region: '—', desc: '记载英雄传说的书卷' },
    { name: '异世界行记', element: '物理', weapon: '法器', region: '—', desc: '异世界旅行的笔记' },
    { name: '信使', element: '物理', weapon: '弓', region: '—', desc: '信使使用的弓' },
    { name: '训练大剑', element: '物理', weapon: '双手剑', region: '—', desc: '用于训练的木剑' },
    { name: '黑缨枪', element: '物理', weapon: '长柄武器', region: '—', desc: '枪头有黑缨的长枪' },
    { name: '银剑', element: '物理', weapon: '单手剑', region: '—', desc: '银质打造的剑' },
  ],
};

// 元素颜色映射
const ELEMENT_COLORS = {
  '风': '#74e8b4',
  '岩': '#e8c874',
  '雷': '#b874e8',
  '草': '#8de874',
  '水': '#74b8e8',
  '火': '#e87474',
  '冰': '#74c8e8',
  '物理': '#cccccc',
};

// 原石奖励配置
const REWARD_PRIMOGEMS = 15;       // 每完成一项任务奖励15原石
const WISH_COST = 20;              // 单次祈愿消耗20原石
const MAX_LEAVE_PER_TASK = 1;      // 每个任务最多请假1次

// 全局导出
if (typeof window !== 'undefined') {
  window.CYCLES = CYCLES;
  window.SUBJECTS = SUBJECTS;
  window.TASKS = TASKS;
  window.GACHA_POOL = GACHA_POOL;
  window.ELEMENT_COLORS = ELEMENT_COLORS;
  window.REWARD_PRIMOGEMS = REWARD_PRIMOGEMS;
  window.WISH_COST = WISH_COST;
  window.MAX_LEAVE_PER_TASK = MAX_LEAVE_PER_TASK;
}
