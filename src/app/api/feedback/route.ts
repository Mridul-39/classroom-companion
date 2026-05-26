import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { assignmentId, studentId, message } = await request.json();

    if (!assignmentId || !studentId || !message?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const assignment = await db.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const feedback = await db.feedback.create({
      data: {
        assignmentId,
        teacherId: session.user.id,
        studentId,
        message: message.trim(),
      },
    });

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    console.error('Error saving feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
