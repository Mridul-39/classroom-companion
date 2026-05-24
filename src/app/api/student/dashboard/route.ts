import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const student = session.user;
  const effectiveStudentId = student.id;

  try {

    const rows = await db.assignment.findMany({
      where: { studentId: effectiveStudentId },
      orderBy: { dueDate: 'asc' },
    });

    const assignments = await Promise.all(
      rows.map(async (a) => {
        const teacher = await db.user.findUnique({ where: { id: a.teacherId } });
        return { ...a, teacher };
      })
    );

    const dueSoon = assignments
      .filter((a) => ['pending', 'assigned', 'in_progress'].includes(a.status))
      .slice(0, 3);

    const continueWorking = assignments.filter((a) =>
      ['stuck', 'in_progress'].includes(a.status)
    );

    const recentFeedbackList = await db.feedback.findMany({
      where: { studentId: effectiveStudentId },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    const recentFeedback = await Promise.all(
      recentFeedbackList.map(async (fb) => {
        const assignment = await db.assignment.findUnique({ where: { id: fb.assignmentId } });
        return { ...fb, assignment };
      })
    );

    const stats = {
      completed: assignments.filter((a) => a.status === 'completed').length,
      todo: assignments.filter((a) => ['pending', 'assigned'].includes(a.status)).length,
      inProgress: assignments.filter((a) => a.status === 'in_progress').length,
      needsAttention: assignments.filter((a) => a.status === 'stuck' || a.status === 'overdue').length,
    };

    return NextResponse.json({
      student,
      stats,
      dueSoon,
      continueWorking,
      recentFeedback,
    });
  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
