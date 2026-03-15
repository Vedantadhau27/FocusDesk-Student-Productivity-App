export interface Unit {
  id: string;
  name: string;
  completed: boolean;
}

export interface Subject {
  id: string;
  name: string;
  units: Unit[];
  color: string;
  studyMinutes: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface Goal {
  id: string;
  text: string;
  completed: boolean;
}

export interface Habit {
  id: string;
  name: string;
  completedToday: boolean;
  streak: number;
  lastCompletedDate?: string;
}

export interface Settings {
  showQuotes: boolean;
  showStreak: boolean;
  studyTime: number; // in minutes
  breakTime: number; // in minutes
  darkMode: boolean;
}

export interface AppState {
  subjects: Subject[];
  notes: Note[];
  goals: Goal[];
  habits: Habit[];
  settings: Settings;
  stats: {
    totalStudySessions: number;
    todayStudyMinutes: number;
    weeklyStudyMinutes: number[]; // 7 days
  };
}
