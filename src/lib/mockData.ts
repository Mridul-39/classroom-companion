import { DEMO_STUDENT_ID, DEMO_TEACHER_ID } from '@/lib/constants';
import type { Student, Teacher } from '@/lib/types';

export const MOCK_TEACHER: Teacher = {
  id: DEMO_TEACHER_ID,
  role: 'teacher',
  firstName: 'Meera',
  lastName: 'Kapoor',
  email: 'meera.kapoor@example.com',
  telegramUsername: 'meera_teacher',
  avatarUrl: 'https://i.pravatar.cc/150?u=meera',
  schoolName: 'Greenwood High',
};

export const MOCK_STUDENTS: Student[] = [
  {
    id: DEMO_STUDENT_ID,
    role: 'student',
    firstName: 'Riya',
    lastName: 'Sharma',
    email: 'riya.sharma@example.com',
    telegramUsername: 'riya_student',
    teacherId: DEMO_TEACHER_ID,
    avatarUrl: 'https://i.pravatar.cc/150?u=riya',
  },
];
