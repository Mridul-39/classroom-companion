import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');
  const studentId = searchParams.get('studentId');
  const assignmentId = searchParams.get('assignmentId');

  try {
    if (!teacherId && !studentId && !assignmentId) {
      return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
    }

    const feedbackList = await db.feedback.findMany({
      where: {
        ...(assignmentId ? { assignmentId } : {}),
        ...(teacherId ? { teacherId } : {}),
        ...(studentId ? { studentId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: true,
        student: true,
        assignment: true,
      },
    });

    return NextResponse.json({ feedback: feedbackList });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { assignmentId, teacherId, studentId, message } = await request.json();

    if (!assignmentId || !teacherId || !studentId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    if (assignment.teacherId !== teacherId || assignment.studentId !== studentId) {
      return NextResponse.json({ error: 'Teacher or student does not match assignment' }, { status: 403 });
    }

    const feedback = await db.feedback.create({
      data: {
        assignmentId,
        teacherId,
        studentId,
        message,
      },
      include: {
        teacher: true,
        student: true,
        assignment: true,
      },
    });

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    console.error('Error creating feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
