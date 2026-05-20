const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    // Ensure teacher exists
    let teacher = await prisma.user.findUnique({ where: { id: 'teacher-meera' } });
    if (!teacher) {
      teacher = await prisma.user.create({
        data: {
          id: 'teacher-meera',
          firstName: 'Meera',
          lastName: 'Kapoor',
          email: 'meera.kapoor@example.com',
          role: 'teacher',
          telegramUsername: 'meera_teacher',
          schoolName: 'Greenwood High',
          avatarUrl: 'https://i.pravatar.cc/150?u=meera',
        },
      });
      console.log('Created teacher-meera');
    } else {
      console.log('Teacher already exists');
    }

    // Ensure student exists
    let student = await prisma.user.findUnique({ where: { id: 'student-mridul' } });
    if (!student) {
      student = await prisma.user.create({
        data: {
          id: 'student-mridul',
          firstName: 'Mridul',
          lastName: 'Goyal',
          email: 'mridul.goyal@example.com',
          role: 'student',
          telegramUsername: 'mridul_student',
          avatarUrl: 'https://i.pravatar.cc/150?u=mridul',
        },
      });
      console.log('Created student-mridul');
    } else {
      console.log('Student already exists');
    }

    // Ensure teacherStudent link exists
    const ts = await prisma.teacherStudent.findFirst({ where: { teacherId: teacher.id, studentId: student.id } });
    if (!ts) {
      await prisma.teacherStudent.create({ data: { id: `ts-${Date.now()}`, teacherId: teacher.id, studentId: student.id } });
      console.log('Created teacher-student link');
    }

    // Create two assignments for Mridul
    const existing = await prisma.assignment.findMany({ where: { studentId: student.id } });
    if (existing.length === 0) {
      const a1 = await prisma.assignment.create({
        data: {
          id: `assign-mridul-1-${Date.now()}`,
          teacherId: teacher.id,
          studentId: student.id,
          title: 'Practice essay: Ecosystems',
          description: 'Write a short essay on ecosystems and food chains.',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          status: 'assigned',
        },
      });

      const a2 = await prisma.assignment.create({
        data: {
          id: `assign-mridul-2-${Date.now()}`,
          teacherId: teacher.id,
          studentId: student.id,
          title: 'Math practice: Word problems',
          description: 'Solve the attached set of word problems covering percentages.',
          dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          status: 'in_progress',
        },
      });

      console.log('Created 2 assignments for Mridul');
    } else {
      console.log('Mridul already has assignments:', existing.length);
    }
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
