import "server-only";

import { db } from "@/lib/db";

/**
 * Hard-delete a user and every classroom record tied to them.
 *
 * Done as a transaction so a mid-flight failure can't leave dangling rows.
 * `Session` rows already cascade through the Prisma FK relation; everything
 * else is wiped explicitly because the project's schema models the other
 * tables as loose `userId` strings (no FK).
 */
export async function cascadeDeleteUser(userId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    // Find assignments owned by this user (as teacher or student) so we can
    // wipe their downstream rows (Reminder/Submission/Feedback/Progress).
    const ownedAssignments = await tx.assignment.findMany({
      where: { OR: [{ teacherId: userId }, { studentId: userId }] },
      select: { id: true },
    });
    const assignmentIds = ownedAssignments.map((a) => a.id);

    if (assignmentIds.length > 0) {
      await tx.reminder.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
      await tx.submission.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
      await tx.feedback.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
      await tx.progressUpdate.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
    }

    // Any feedback/progress/submissions still keyed only to the user but no
    // longer covered above (e.g. orphan rows from manual fixes) — sweep.
    await tx.feedback.deleteMany({
      where: { OR: [{ teacherId: userId }, { studentId: userId }] },
    });
    await tx.progressUpdate.deleteMany({ where: { studentId: userId } });
    await tx.submission.deleteMany({ where: { studentId: userId } });

    await tx.assignment.deleteMany({
      where: { OR: [{ teacherId: userId }, { studentId: userId }] },
    });

    await tx.teacherStudent.deleteMany({
      where: { OR: [{ teacherId: userId }, { studentId: userId }] },
    });

    await tx.appSettings.deleteMany({ where: { teacherId: userId } });

    // Sessions cascade via the FK on Session.userId, but be explicit so the
    // user can be reused for a different test login immediately.
    await tx.session.deleteMany({ where: { userId } });

    await tx.user.delete({ where: { id: userId } });
  });
}

export async function suspendUser(userId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { suspendedAt: new Date() } });
    await tx.session.deleteMany({ where: { userId } });
  });
}

export async function unsuspendUser(userId: string): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { suspendedAt: null } });
}
