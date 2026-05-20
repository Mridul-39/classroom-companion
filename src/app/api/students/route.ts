import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendStudentInviteEmail } from '@/lib/email';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');

  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId is required' }, { status: 400 });
  }

  try {
    const teacherStudents = await db.teacherStudent.findMany({
      where: { teacherId },
      include: { student: true },
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
  try {
    const body = await request.json();
    const { firstName, lastName, email, teacherId } = body;

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

    let inviteCode: string | undefined;
    if (teacherId) {
      inviteCode = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await db.teacherStudent.create({
        data: {
          teacherId,
          studentId: newStudentId,
          inviteCode,
        },
      });
    }

    let emailSent = false;
    if (teacherId) {
      try {
        const teacher = await db.user.findUnique({ where: { id: teacherId } });
        const teacherName = teacher
          ? `${teacher.firstName} ${teacher.lastName}`
          : 'Your teacher';

        const emailResult = await sendStudentInviteEmail({
          to: email,
          studentFirstName: firstName,
          studentLastName: lastName,
          teacherName,
          inviteCode: inviteCode!,
        });
        emailSent = emailResult.sent;
        if (!emailResult.sent) {
          console.warn('Failed to send invitation email:', emailResult.reason);
        }
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
      }
    }

    return NextResponse.json({ student, emailSent }, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
