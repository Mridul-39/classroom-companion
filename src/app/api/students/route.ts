import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendStudentInviteEmail } from '@/lib/email';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const teacherId = session.user.id;

  try {
    const teacherStudents = await db.teacherStudent.findMany({
      where: { teacherId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            telegramUsername: true,
            telegramId: true,
            suspendedAt: true,
            schoolName: true,
          },
        },
      },
    });

    const students = await Promise.all(
      teacherStudents.map(async (ts) => {
        const student = ts.student;
        const activeAssignments = await db.assignment.count({
          where: {
            teacherId,
            studentId: student.id,
            status: { not: 'completed' }
          }
        });

        return {
          student,
          activeAssignments,
          status: activeAssignments > 0 ? 'Active' : 'Idle',
          inviteCode: student.telegramId ? null : ts.inviteCode,
        };
      })
    );

    return NextResponse.json({ students });
  } catch (error) {
    console.error('Error fetching students:', error);
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
    const { firstName, lastName, email } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newStudentId = `student-${Date.now()}`;
    const student = await db.user.create({
      data: {
        id: newStudentId,
        firstName,
        lastName,
        email,
        role: 'student',
      },
    });

    const inviteCode = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await db.teacherStudent.create({
      data: {
        teacherId,
        studentId: newStudentId,
        inviteCode,
      },
    });

    let emailSent = false;
    try {
      const teacherName = `${session.user.firstName} ${session.user.lastName}`;
      const emailResult = await sendStudentInviteEmail({
        to: email,
        studentFirstName: firstName,
        studentLastName: lastName,
        teacherName,
        inviteCode,
      });
      emailSent = emailResult.sent;
      if (!emailResult.sent) {
        console.warn('Failed to send invitation email:', emailResult.reason);
      }
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
    }

    return NextResponse.json({ student, emailSent }, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
