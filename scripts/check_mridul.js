const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const student = await prisma.user.findUnique({ where: { id: 'student-mridul' } });
    console.log('Student:', student);
    const assignments = await prisma.assignment.findMany({ where: { studentId: 'student-mridul' }, orderBy: { dueDate: 'asc' } });
    console.log('Assignments count:', assignments.length);
    console.log(assignments);
  } catch (err) {
    console.error('Query failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
