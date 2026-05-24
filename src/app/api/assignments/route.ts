import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scheduleRemindersForAssignment } from '@/lib/telegram/reminders';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const whereClause =
    session.user.role === 'teacher'
      ? { teacherId: session.user.id }
      : { studentId: session.user.id };

  try {
    const assignmentsList = await db.assignment.findMany({
      where: whereClause,
      orderBy: { dueDate: 'asc' },
    });

    const assignments = await Promise.all(
      assignmentsList.map(async (a) => {
        const [student, teacher] = await Promise.all([
          db.user.findUnique({ where: { id: a.studentId } }),
          db.user.findUnique({ where: { id: a.teacherId } }),
        ]);
        return { ...a, student, teacher };
      })
    );

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const teacherId = session.user.id;

  try {
    const body = await request.json();
    const {
      studentId,
      studentIds,
      title,
      description,
      dueDate,
      status,
      attachmentUrl,
      attachmentName,
    } = body;

    if (!title || !dueDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const ids: string[] = Array.isArray(studentIds)
      ? studentIds.filter((x: unknown) => typeof x === 'string')
      : typeof studentId === 'string' && studentId
        ? [studentId]
        : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Select at least one student' }, { status: 400 });
    }

    const groupId = ids.length > 1 ? randomUUID() : null;
    const due = new Date(dueDate);
    const attUrl = typeof attachmentUrl === 'string' && attachmentUrl.trim() ? attachmentUrl.trim() : null;
    const attName =
      typeof attachmentName === 'string' && attachmentName.trim()
        ? attachmentName.trim()
        : attUrl
          ? 'Attachment'
          : null;

    const created = [];

    for (const sid of ids) {
      const link = await db.teacherStudent.findFirst({
        where: { teacherId, studentId: sid },
      });
      if (!link) {
        return NextResponse.json(
          { error: `Student ${sid} is not in your class. Add them from the Students page first.` },
          { status: 403 }
        );
      }

      const assignment = await db.assignment.create({
        data: {
          teacherId,
          studentId: sid,
          title,
          description: description || '',
          dueDate: due,
          status: status || 'in_progress',
          groupId,
          attachmentUrl: attUrl,
          attachmentName: attName,
        },
      });

      await scheduleRemindersForAssignment(assignment.id);
      created.push(assignment);
    }

    return NextResponse.json({ assignments: created }, { status: 201 });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
