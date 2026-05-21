export interface KeyResult {
  id: string;
  objectiveId: string;
  title: string;
  metric: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
  dueDate: string;
}

export interface Objective {
  id: string;
  title: string;
  category: string;
  cycle: string; // 'year' | 'month'
  startDate: string;
  endDate: string;
  status: string;
  parentObjectiveId?: string | null;
  parent?: { id: string; title: string; cycle: string } | null;
  children?: { id: string; title: string; cycle: string; status: string }[];
  wish?: string | null;
  outcome?: string | null;
  obstacle?: string | null;
  plan?: string | null;
  keyResults: KeyResult[];
}

export interface CheckIn {
  id: string;
  habitId: string;
  checkDate: string;
  value: number;
  mood?: string | null;
  note?: string | null;
  isMakeUp: boolean;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  objectiveId?: string | null;
  frequencyType: string;
  frequencyValue: string;
  type: string;
  targetValue: number;
  unit: string;
  difficulty: string;
  reminderTime?: string | null;
  stackAfter?: string | null;
  reward?: string | null;
  category: string;
  kind: string;       // 学习 / 实践
  priority: string;   // P0 / P1 / P2
  cadence: string;    // daily / weekly / monthly / yearly
  note?: string | null;
  streak: number;
  checkedToday: boolean;
  recentCheckIns: CheckIn[];
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  keyResultId?: string | null;
  dueDate?: string | null;
}

export interface WeeklySummary {
  periodKey: string;
  weekRange: { start: string; end: string };
  habitsCount: number;
  checkInsCount: number;
  habitCompletionRate: number;
  tasksCount: number;
  tasksDoneCount: number;
  taskCompletionRate: number;
}

export interface Review {
  id: string;
  type: string;
  periodKey: string;
  keep?: string | null;
  problem?: string | null;
  tryNext?: string | null;
  summary?: string | null;
  createdAt: string;
}
