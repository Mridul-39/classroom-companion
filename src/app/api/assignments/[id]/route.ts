import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const assignment = await db.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const student = await db.user.findUnique({ where: { id: assignment.studentId } });
    const teacher = await db.user.findUnique({ where: { id: assignment.teacherId } });
    const progressUpdates = await db.progressUpdate.findMany({
      where: { assignmentId: id },
      orderBy: { createdAt: 'desc' },
    });
    
    // There can be multiple submissions per assignment, but normally we just take the latest
    const submission = await db.submission.findFirst({
      where: { assignmentId: id },
      orderBy: { submittedAt: 'desc' },
    });

    const feedback = await db.feedback.findMany({
      where: { assignmentId: id },
      orderBy: { createdAt: 'desc' },
    });

    const reminders = await db.reminder.findMany({
      where: { assignmentId: id },
      orderBy: { sentAt: 'desc' },
    });

    return NextResponse.json({
      assignment,
      student,
      teacher,
      progressUpdates,
      submission,
      feedback,
      reminders,
    });
  } catch (error) {
    console.error('Error fetching assignment detail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
