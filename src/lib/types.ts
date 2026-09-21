export type Status = "not_started" | "doing" | "done";

export interface MainTask {
  id: string;
  category: "Mandatory" | "Company" | "Misc";
  name: string;
  status: Status;
  from: string; // HH:mm
  to: string;
  goalLink: string; // goal id
}

export interface TodoItem {
  id: string;
  text: string;
  status: Status;
}

export interface SubTaskItem {
  id?: string;
  text: string;
  status: Status;
}

export interface TaskChip {
  id?: string;
  text: string;
  status: Status;
  subtasks?: SubTaskItem[];
}

export interface SubTask {
  id: string;
  parentId: string; // mainTask id
  text: string;
  status: Status;
  employee?: string;
  chips?: TaskChip[];
  isSection?: boolean; // when true, renders as a named category heading, not a task
}

export interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  color: string;
}

export interface ManagerNote {
  id: string;
  date: string;
  content: string;
  status: Status;
  timestamp: number;
  employee?: string;
  chips?: TaskChip[];
}

export interface Meeting {
  id: string;
  projectId: string; // references Project.id OR custom project name
  employeeIds: string[]; // references Employee.id OR custom employee names
  time: string; // e.g. "14:30" or "10:30 AM"
  date?: string; // e.g. "2026-09-11"
  status: Status; // "not_started" | "doing" | "done"
}

export type EventCategory = "Ours" | "Others" | "Imp";
export type EventRecurrence = "one_time" | "weekly";

export interface EventItem {
  id: string;
  title: string;
  category: EventCategory; // "Ours" | "Others"
  time?: string;
  location?: string;
  date?: string; // e.g. "2026-09-11"
  recurrence?: EventRecurrence; // "one_time" | "weekly"
  recurringDay?: number; // 0 = Sunday, ..., 6 = Saturday
  status: Status;
}

export interface DayData {
  date: string;
  mainTasks: MainTask[];
  subTasks: SubTask[];
  rating: number; // 0-5
  managerNotes: ManagerNote[];
  meetings?: Meeting[];
  events?: EventItem[];
}

export type AppStatus = "In Development" | "In Review" | "Live" | "Paused" | "Idea";

export interface AppEntry {
  id: string;
  name: string;
  status: AppStatus;
  downloads: number;
}

export interface AppTracker {
  id: string;
  title: string;
  apps: AppEntry[];
}

export interface ProjectResource {
  id: string;
  name: string;
  url: string;
  category: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
}

export interface Employee {
  id: string;
  name: string;
}

export interface AppState {
  currentDate: string;
  days: Record<string, DayData>;
  goals: Goal[];
  streaks: Record<string, number>; // task id -> streak count
  categoryLabels?: Record<string, string>;
  appTrackers?: AppTracker[];
  projectResources?: ProjectResource[];
  contentPostedDates?: string[]; // Array of date strings like "2026-04-21"
  projects?: Project[];
  employees?: Employee[];
  recurringEvents?: EventItem[];
}

export type UserRole = "owner" | "manager";

export interface User {
  email: string;
  role: UserRole;
  name: string;
}
