/* eslint-disable */
/**
 * 批量导入截图中给出的习惯清单。
 * 用法: node scripts/seed-habits.cjs <email>
 *   默认 email: 635003514@qq.com
 *
 * 行为：按 (userId, name) 去重；已存在则跳过。
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 颜色按分类区分
const CATEGORY_COLOR = {
  互联网项目管理: '#6366f1', // 紫蓝
  金融投资: '#f59e0b',       // 琥珀
  基础认知: '#22c55e',       // 绿色
};
// 类型 -> 默认图标（如未指定）
const KIND_ICON = {
  学习: '📘',
  实践: '🛠',
};
// 计划周期 -> frequencyType 默认（不强制单独打卡频率，复用既有默认）
const CADENCE_FREQ = {
  daily: { frequencyType: 'daily', frequencyValue: '' },
  weekly: { frequencyType: 'weekly_n', frequencyValue: '1' },
  monthly: { frequencyType: 'weekly_n', frequencyValue: '1' },
  yearly: { frequencyType: 'weekly_n', frequencyValue: '1' },
};

// 单一来源数据：与截图一致
const HABITS = [
  // 日计划
  { cadence: 'daily', category: '互联网项目管理', kind: '实践', priority: 'P0', name: '短视频创作', icon: '🎬', note: '中午午睡前：投资名言' },
  { cadence: 'daily', category: '金融投资', kind: '学习', priority: 'P0', name: '金融课程学习', icon: '💹', note: '早起时间：香帅北大金融学课' },
  { cadence: 'daily', category: '互联网项目管理', kind: '学习', priority: 'P0', name: '工作学习', icon: '💼', note: '工作期间：研效知识框架' },
  { cadence: 'daily', category: '基础认知', kind: '学习', priority: 'P0', name: '英语单词', icon: '🔤', note: '上班路上：百词斩15个单词' },
  { cadence: 'daily', category: '基础认知', kind: '学习', priority: 'P0', name: '文章阅读', icon: '📰', note: '上班路上：罗辑思维、刘润公众号文章' },
  { cadence: 'daily', category: '基础认知', kind: '学习', priority: 'P0', name: '书籍阅读', icon: '📖', note: '睡前：至少读 1 页纸质书' },
  { cadence: 'daily', category: '基础认知', kind: '实践', priority: 'P0', name: '语音日记', icon: '🎙', note: '睡觉前：至少一分钟语音日记' },
  { cadence: 'daily', category: '基础认知', kind: '实践', priority: 'P0', name: '3 杯水', icon: '💧', note: '工作期间；一大壶水' },
  { cadence: 'daily', category: '基础认知', kind: '实践', priority: 'P0', name: '9 点之后不进食', icon: '🚫', note: '21:00 后：只喝水，不再进食' },
  { cadence: 'daily', category: '基础认知', kind: '实践', priority: 'P1', name: '锻炼身体', icon: '💪', note: '睡前：5 分钟吕良伟锻炼法' },
  { cadence: 'daily', category: '基础认知', kind: '实践', priority: 'P1', name: '早睡（11:30 睡觉）', icon: '🌙', note: '11:30：放下电子设备，带上眼罩睡觉' },
  { cadence: 'daily', category: '基础认知', kind: '实践', priority: 'P1', name: '早起（7:30 起床）', icon: '🌅', note: '7:30：坐起来，看看手机' },
  { cadence: 'daily', category: '金融投资', kind: '学习', priority: 'P1', name: 'F 短视频', icon: '🎞', note: '中午午睡前：刷 1～2 个金融资讯相关短视频' },
  { cadence: 'daily', category: '互联网项目管理', kind: '学习', priority: 'P1', name: 'AI 学习', icon: '🤖', note: '中午午睡前：刷 1～2 个 AI 资讯相关短视频、课程' },

  // 周计划
  { cadence: 'weekly', category: '互联网项目管理', kind: '实践', priority: 'P0', name: '软件产品', icon: '🧩', note: '每周六：AI 开发一个软件产品' },
  { cadence: 'weekly', category: '互联网项目管理', kind: '实践', priority: 'P0', name: '公众号文章发布', icon: '📝', note: '每周六：发布一篇公众号文章' },
  { cadence: 'weekly', category: '基础认知', kind: '学习', priority: 'P1', name: '英语背诵', icon: '🗣', note: '每周六：一篇英语美文背诵 / 5 个句子' },
  { cadence: 'weekly', category: '基础认知', kind: '学习', priority: 'P1', name: '英语配音', icon: '🎧', note: '每周六：英语配音 1 节' },
  { cadence: 'weekly', category: '基础认知', kind: '学习', priority: 'P1', name: '英语对话', icon: '💬', note: '每周日：与分身英语对话' },
  { cadence: 'weekly', category: '基础认知', kind: '学习', priority: 'P2', name: '英语短视频', icon: '📺', note: '每周日：刷英语短视频 5 分钟' },
  { cadence: 'weekly', category: '基础认知', kind: '学习', priority: 'P2', name: '短学习', icon: '🎯', note: '每周六：有营养短视频（鹤老师、亿文、脱不花）' },
  { cadence: 'weekly', category: '基础认知', kind: '实践', priority: 'P2', name: '参加活动', icon: '🎪', note: '周末：参加社交活动' },
  { cadence: 'weekly', category: '基础认知', kind: '学习', priority: 'P1', name: '健康短视频', icon: '🏃', note: '周日：看至少 2 个健康相关短视频' },

  // 月计划
  { cadence: 'monthly', category: '金融投资', kind: '实践', priority: 'P0', name: '每月记账', icon: '💰', note: '每月末：记账' },
  { cadence: 'monthly', category: '基础认知', kind: '实践', priority: 'P1', name: '每日一句、思考、诗词整理', icon: '🖋', note: '每月末：个人作品整理' },
  { cadence: 'monthly', category: '基础认知', kind: '实践', priority: 'P2', name: '演讲练习', icon: '🎤', note: '每月初：定主题演讲练习，至少 1 分钟' },
  { cadence: 'monthly', category: '基础认知', kind: '学习', priority: 'P2', name: '吉他学习', icon: '🎸', note: '每月初：吉他学习课程至少 1 节' },

  // 年计划
  { cadence: 'yearly', category: '基础认知', kind: '实践', priority: 'P2', name: '年度个人计划制定', icon: '📅', note: '每年元旦期间：制定年度计划' },
  { cadence: 'yearly', category: '基础认知', kind: '实践', priority: 'P2', name: '年度家庭计划制定', icon: '🏠', note: '每年春节期间：制定年度家庭计划' },
];

async function main() {
  const email = process.argv[2] || '635003514@qq.com';
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  let inserted = 0;
  let skipped = 0;
  for (const h of HABITS) {
    const exists = await prisma.habit.findFirst({
      where: { userId: user.id, name: h.name, archivedAt: null },
    });
    if (exists) {
      skipped++;
      continue;
    }
    const freq = CADENCE_FREQ[h.cadence];
    await prisma.habit.create({
      data: {
        userId: user.id,
        name: h.name,
        icon: h.icon || KIND_ICON[h.kind] || '⭐',
        color: CATEGORY_COLOR[h.category] || '#6366f1',
        frequencyType: freq.frequencyType,
        frequencyValue: freq.frequencyValue,
        type: 'bool',
        targetValue: 1,
        unit: '次',
        difficulty: h.priority === 'P0' ? 'medium' : 'easy',
        category: h.category,
        kind: h.kind,
        priority: h.priority,
        cadence: h.cadence,
        note: h.note || null,
      },
    });
    inserted++;
  }
  console.log(`Done. inserted=${inserted}, skipped(existing)=${skipped}, total=${HABITS.length}`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
