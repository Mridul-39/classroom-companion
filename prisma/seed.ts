import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clear existing data
  await prisma.appSettings.deleteMany()
  await prisma.reminder.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.submission.deleteMany()
  await prisma.progressUpdate.deleteMany()
  await prisma.assignment.deleteMany()
  await prisma.teacherStudent.deleteMany()
  await prisma.user.deleteMany()

  // 1. Create Teacher
  const teacher = await prisma.user.create({
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
  })

  // 2. Create Students
  const riya = await prisma.user.create({
    data: {
      id: 'student-riya',
      firstName: 'Riya',
      lastName: 'Sharma',
      email: 'riya.sharma@example.com',
      role: 'student',
      telegramUsername: 'riya_student',
      avatarUrl: 'https://i.pravatar.cc/150?u=riya',
    },
  })

  const aarav = await prisma.user.create({
    data: {
      id: 'student-aarav',
      firstName: 'Aarav',
      lastName: 'Patel',
      email: 'aarav.patel@example.com',
      role: 'student',
      telegramUsername: 'aarav_student',
      avatarUrl: 'https://i.pravatar.cc/150?u=aarav',
    },
  })

  const mridul = await prisma.user.create({
    data: {
      id: 'student-mridul',
      firstName: 'Mridul',
      lastName: 'Goyal',
      email: 'mridul.goyal@example.com',
      role: 'student',
      telegramUsername: 'mridul_student',
      avatarUrl: 'https://i.pravatar.cc/150?u=mridul',
    },
  })

  // 3. Create TeacherStudent Links
  await prisma.teacherStudent.create({
    data: { id: 'ts-1', teacherId: teacher.id, studentId: riya.id },
  })
  
  await prisma.teacherStudent.create({
    data: { id: 'ts-2', teacherId: teacher.id, studentId: aarav.id },
  })

  await prisma.teacherStudent.create({
    data: { id: 'ts-3', teacherId: teacher.id, studentId: mridul.id },
  })

  // 4. Create AppSettings for Teacher
  await prisma.appSettings.create({
    data: {
      id: 'app-settings-meera',
      teacherId: teacher.id,
      llmProvider: 'openai',
      llmModel: 'gpt-4',
      // TODO: encrypt api key in production
      encryptedApiKey: 'sk-mock-api-key-12345',
    }
  })

  // 5. Create Assignments
  
  // Assignment 1: Photosynthesis (in_progress)
  const a1 = await prisma.assignment.create({
    data: {
      id: 'assign-photosynthesis-riya',
      teacherId: teacher.id,
      studentId: riya.id,
      title: '500-word essay on photosynthesis',
      description: 'Write a comprehensive essay explaining the process of photosynthesis, including light-dependent and light-independent reactions.',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      status: 'in_progress',
    }
  })

  await prisma.progressUpdate.create({
    data: {
      assignmentId: a1.id,
      studentId: riya.id,
      message: 'I have finished the outline and started writing the light-dependent reactions section.',
      aiStatus: 'On track',
    }
  })

  // Assignment 2: Fractions (stuck)
  const a2 = await prisma.assignment.create({
    data: {
      id: 'assign-fractions-aarav',
      teacherId: teacher.id,
      studentId: aarav.id,
      title: 'Math worksheet on fractions',
      description: 'Complete the attached worksheet focusing on adding, subtracting, and simplifying fractions.',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
      status: 'stuck',
    }
  })

  await prisma.progressUpdate.create({
    data: {
      assignmentId: a2.id,
      studentId: aarav.id,
      message: 'I am confused about how to find the common denominator.',
      aiStatus: 'Stuck',
      needsTeacherAttention: true,
    }
  })

  // Assignment 3: Reading (overdue)
  const a3 = await prisma.assignment.create({
    data: {
      id: 'assign-reading-riya',
      teacherId: teacher.id,
      studentId: riya.id,
      title: 'Reading comprehension summary',
      description: 'Read Chapter 4 of the history textbook and write a half-page summary of the key events.',
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // yesterday
      status: 'overdue',
    }
  })

  await prisma.reminder.create({
    data: {
      assignmentId: a3.id,
      reminderType: 'Overdue Notice',
      message: 'Your assignment is overdue. Please submit it as soon as possible.',
      scheduledFor: new Date(),
      sentAt: new Date(),
      status: 'sent',
    }
  })

  // Assignment 4: Science Diagram (submitted)
  const a4 = await prisma.assignment.create({
    data: {
      id: 'assign-science-aarav',
      teacherId: teacher.id,
      studentId: aarav.id,
      title: 'Science diagram submission',
      description: 'Draw and label the parts of an animal cell. Submit a clear photo of your diagram.',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      status: 'submitted',
    }
  })

  await prisma.submission.create({
    data: {
      id: 'sub-science-aarav',
      assignmentId: a4.id,
      studentId: aarav.id,
      content: 'I have attached the photo of my drawing.',
      fileName: 'cell_diagram.jpg',
      fileUrl: 'https://example.com/cell_diagram.jpg',
    }
  })

  await prisma.feedback.create({
    data: {
      id: 'feed-science-aarav',
      assignmentId: a4.id,
      teacherId: teacher.id,
      studentId: aarav.id,
      message: 'Great job, Aarav! The labels are very clear. Next time, try to use a ruler for the lines.',
    }
  })
  
  // Also create a completed assignment for Riya to test feedback page
  const a5 = await prisma.assignment.create({
    data: {
      id: 'assign-poetry-riya',
      teacherId: teacher.id,
      studentId: riya.id,
      title: 'Write a short poem',
      description: 'Write a 3-stanza poem about nature.',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'completed',
    }
  })
  
  await prisma.submission.create({
    data: {
      id: 'sub-poetry-riya',
      assignmentId: a5.id,
      studentId: riya.id,
      content: 'Here is my poem about the autumn leaves.',
    }
  })
  
  await prisma.feedback.create({
    data: {
      id: 'feed-poetry-riya',
      assignmentId: a5.id,
      teacherId: teacher.id,
      studentId: riya.id,
      message: 'Beautiful imagery, Riya. I loved the metaphor in the second stanza!',
    }
  })

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
