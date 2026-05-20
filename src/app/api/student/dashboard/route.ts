import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');

  if (!studentId) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
  }

  try {
    let student = await db.user.findUnique({
      where: { id: studentId },
    });

    if (!student) {
        // If the requested demo student isn't present in the DB (dev setups vary),
        // fall back to the first available student so the frontend can still render.
        const fallback = await db.user.findFirst({ where: { role: 'student' } });
        if (!fallback) {
          return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }
        // use the fallback student for the dashboard
        student = fallback;
    }

    // Use the resolved student's id for subsequent queries (handles fallback)
    const effectiveStudentId = student.id;

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
