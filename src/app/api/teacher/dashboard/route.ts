import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const teacherId = session.user.id;
  const teacher = session.user;

  try {

    const assignmentsList = await db.assignment.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    });
    const assignments = await Promise.all(
      assignmentsList.map(async (a) => {
        const student = await db.user.findUnique({ where: { id: a.studentId } });
        return { ...a, student };
      })
    );

    const students = await db.teacherStudent.findMany({
      where: { teacherId },
      include: { student: true },
    });

    const recentSubmissionsList = await db.submission.findMany({
      orderBy: { submittedAt: 'desc' },
      take: 12,
    });

    const recentSubmissions = (
      await Promise.all(
        recentSubmissionsList.map(async (sub) => {
          const assignment = await db.assignment.findUnique({ where: { id: sub.assignmentId } });
          const student = await db.user.findUnique({ where: { id: sub.studentId } });
          return { sub, assignment, student };
        })
      )
    )
      .filter((r) => r.assignment?.teacherId === teacherId)
      .slice(0, 5);

    const progressUpdatesList = await db.progressUpdate.findMany({
      where: { needsTeacherAttention: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const rawAttention = (
      await Promise.all(
        progressUpdatesList.map(async (pu) => {
          const assignment = await db.assignment.findUnique({ where: { id: pu.assignmentId } });
          const student = await db.user.findUnique({ where: { id: pu.studentId } });
          return { update: pu, assignment, student };
        })
      )
    ).filter((r) => r.assignment?.teacherId === teacherId);

    const seen = new Set<string>();
    const studentsNeedingAttention = rawAttention.filter((r) => {
      const key = `${r.assignment?.id}-${r.update.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const stats = {
      activeAssignments: assignments.filter((a) => a.status !== 'completed').length,
      needsReview: assignments.filter((a) => a.status === 'submitted').length,
      totalStudents: students.length,
    };

    const stuckCount = assignments.filter((a) => a.status === 'stuck').length;
    const aiInsight =
      stuckCount > 0
        ? `${stuckCount} assignment(s) marked stuck — open assignments to help those students.`
        : null;

    return NextResponse.json({
      teacher,
      stats,
      recentAssignments: assignments.slice(0, 5),
      studentsNeedingAttention,
      recentSubmissions,
      aiInsight,
      students: students.map((s) => s.student),
    });
  } catch (error) {
    console.error('Error fetching teacher dashboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
