import type { User } from '@prisma/client';
import { db } from '@/lib/db';

export function userProfileFromDbUser(user: User) {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    role: user.role,
    email: user.email ?? undefined,
    telegramUsername: user.telegramUsername ?? undefined,
    schoolName: user.schoolName ?? undefined,
  };
}

export async function buildTeacherChatContext(teacherId: string, appBaseUrl: string) {
  const [students, assignments, feedback] = await Promise.all([
    db.teacherStudent.findMany({
      where: { teacherId },
      include: { student: true },
    }),
    db.assignment.findMany({
      where: { teacherId },
      orderBy: { dueDate: 'asc' },
    }),
    db.feedback.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const submissionRows = await db.submission.findMany({
    where: { assignmentId: { in: assignments.map((a) => a.id) } },
    orderBy: { submittedAt: 'desc' },
    take: 10,
  });
  const assignmentById = Object.fromEntries(assignments.map((a) => [a.id, a]));

  const assignmentSummaries = await Promise.all(
    assignments.map(async (a) => {
      const student = await db.user.findUnique({ where: { id: a.studentId } });
      return {
        id: a.id,
        title: a.title,
        student: student ? `${student.firstName} ${student.lastName}` : a.studentId,
        dueDate: a.dueDate.toISOString().slice(0, 10),
        status: a.status,
        description: a.description.slice(0, 120),
      };
    })
  );

  const studentList = students.map((ts) => ({
    name: `${ts.student.firstName} ${ts.student.lastName}`,
    email: ts.student.email,
  }));

  return {
    studentCount: studentList.length,
    students: studentList,
    dashboardUrl: `${appBaseUrl}/dashboard/teacher`,
    studentsPageUrl: `${appBaseUrl}/students/teacher`,
    assignmentsPageUrl: `${appBaseUrl}/assignments/teacher`,
    totalAssignments: assignments.length,
    pendingAssignments: assignments.filter((a) =>
      ['pending', 'assigned', 'in_progress', 'stuck'].includes(a.status)
    ).length,
    inProgressAssignments: assignments.filter((a) => a.status === 'in_progress').length,
    submittedAssignments: assignments.filter((a) => a.status === 'submitted').length,
    assignments: assignmentSummaries,
    recentSubmissions: submissionRows.map((s) => ({
      assignmentTitle: assignmentById[s.assignmentId]?.title,
      submittedAt: s.submittedAt.toISOString().slice(0, 10),
      preview: (s.content ?? '').slice(0, 80),
    })),
    recentFeedbackCount: feedback.length,
  };
}

export async function buildStudentChatContext(studentId: string) {
  const [assignments, feedback, progressUpdates] = await Promise.all([
    db.assignment.findMany({
      where: { studentId },
      orderBy: { dueDate: 'asc' },
    }),
    db.feedback.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.progressUpdate.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const teacherIds = [...new Set(assignments.map((a) => a.teacherId))];
  const teachers = await db.user.findMany({ where: { id: { in: teacherIds } } });
  const teacherById = Object.fromEntries(teachers.map((t) => [t.id, t]));

  return {
    teachers: teachers.map((t) => `${t.firstName} ${t.lastName}`),
    assignmentCount: assignments.length,
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      dueDate: a.dueDate.toISOString().slice(0, 10),
      status: a.status,
      description: a.description.slice(0, 120),
      teacher: teacherById[a.teacherId]
        ? `${teacherById[a.teacherId].firstName} ${teacherById[a.teacherId].lastName}`
        : a.teacherId,
    })),
    feedback: feedback.map((f) => {
      const assignment = assignments.find((a) => a.id === f.assignmentId);
      return {
        assignmentTitle: assignment?.title ?? f.assignmentId,
        message: f.message.slice(0, 200),
        date: f.createdAt.toISOString().slice(0, 10),
      };
    }),
    recentProgress: progressUpdates.map((p) => ({
      message: p.message.slice(0, 100),
      date: p.createdAt.toISOString().slice(0, 10),
    })),
  };
}
