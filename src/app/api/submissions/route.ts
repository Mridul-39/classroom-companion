import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');

  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId is required' }, { status: 400 });
  }

  try {
    const assignments = await db.assignment.findMany({
      where: { teacherId },
      select: { id: true, title: true, teacherId: true },
    });

    const assignmentIds = assignments.map(a => a.id);

    const submissionsList = await db.submission.findMany({
      where: {
        assignmentId: { in: assignmentIds },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const formattedSubmissions = await Promise.all(
      submissionsList.map(async (sub) => {
        const assignment = assignments.find(a => a.id === sub.assignmentId);
        const student = await db.user.findUnique({ where: { id: sub.studentId } });
        return {
          sub,
          student,
          assignment,
        };
      })
    );

    return NextResponse.json({ submissions: formattedSubmissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
