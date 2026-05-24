export type Role = 'student' | 'teacher';

export type User = {
  id: string;
  role: Role;
  firstName: string;
  lastName: string;
  email: string;
  telegramUsername?: string;
  telegramId?: string;
  avatarUrl?: string;
  schoolName?: string;
  inviteCode?: string;
};

export type Student = User & {
  role: 'student';
  teacherId: string;
};

export type Teacher = User & {
  role: 'teacher';
  schoolName?: string;
  llmSettings?: {
    provider: 'OpenAI' | 'Gemini' | 'Claude' | 'Custom';
    model: string;
  };
};

export type AssignmentStatus = 'pending' | 'in_progress' | 'stuck' | 'submitted' | 'overdue' | 'completed';

export type Assignment = {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  studentId: string;
  groupId?: string | null;
  dueDate: string; // ISO string
  status: AssignmentStatus;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
};

export type ProgressUpdate = {
  id: string;
  assignmentId: string;
  studentId: string;
  message: string;
  statusReported: AssignmentStatus;
  createdAt: string;
};

export type Submission = {
  id: string;
  assignmentId: string;
  studentId: string;
  content?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  submittedAt: string;
};

export type Feedback = {
  id: string;
  assignmentId: string;
  teacherId: string;
  studentId: string;
  content: string;
  createdAt: string;
};

export type Reminder = {
  id: string;
  assignmentId: string;
  sentAt: string;
  message: string;
};
