import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendTeacherInviteEmail } from '@/lib/email';

export async function GET() {
  try {
    const teachers = await db.user.findMany({
      where: { role: 'teacher' },
      orderBy: { firstName: 'asc' },
    });

    return NextResponse.json({ teachers });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, schoolName, inviterId } = body;

    if (!firstName || !lastName || !email || !inviterId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const inviter = await db.user.findUnique({ where: { id: inviterId } });
    const adminName = inviter ? `${inviter.firstName} ${inviter.lastName}` : 'Your administrator';

    let teacher = await db.user.findFirst({ where: { email: normalizedEmail } });
    const inviteCode = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    if (teacher) {
      if (teacher.role !== 'teacher') {
        return NextResponse.json({ error: 'This email is already registered as a student.' }, { status: 400 });
      }
      if (teacher.telegramId) {
        return NextResponse.json({ error: 'This teacher is already registered.' }, { status: 400 });
      }

      teacher = await db.user.update({
        where: { id: teacher.id },
        data: { inviteCode },
      });
    } else {
      const id = `teacher-${Date.now()}`;
      teacher = await db.user.create({
        data: {
          id,
          role: 'teacher',
          firstName,
          lastName,
          email: normalizedEmail,
          schoolName,
          inviteCode,
        },
      });
    }

    try {
      await sendTeacherInviteEmail({
        to: normalizedEmail,
        teacherFirstName: firstName,
        adminName,
        schoolName,
        inviteCode,
      });
    } catch (emailError) {
      console.error('Failed to send teacher invite email:', emailError);
    }

    return NextResponse.json({ teacher, inviteCodeSent: true });
  } catch (error) {
    console.error('Error inviting teacher:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
