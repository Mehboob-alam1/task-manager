import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();

// Daily Report Generation (runs daily at 9 AM)
export const generateDailyReport = functions.pubsub
  .schedule('0 9 * * *') // 9 AM every day
  .timeZone('America/New_York')
  .onRun(async (context) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      // Get all tasks
      const tasksSnapshot = await db.collection('tasks').get();
      const tasks = tasksSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Calculate metrics
      const tasksCompletedToday = tasks.filter(
        (task: any) =>
          task.status === 'Completed' &&
          task.completedAt &&
          task.completedAt.toDate() >= today &&
          task.completedAt.toDate() < tomorrow
      );

      const tasksPending = tasks.filter((task: any) => task.status === 'Pending');
      const overdueTasks = tasks.filter(
        (task: any) =>
          task.status !== 'Completed' && task.deadline.toDate() < new Date()
      );

      const taskDetails = tasksCompletedToday.map((task: any) => ({
        taskId: task.id,
        taskTitle: task.title,
        daysTaken: task.daysTaken || 0,
        status: task.status,
      }));

      // Create daily report
      const report = {
        date: admin.firestore.Timestamp.fromDate(today),
        tasksCompletedToday: tasksCompletedToday.length,
        tasksPending: tasksPending.length,
        overdueTasks: overdueTasks.length,
        taskDetails,
        generatedAt: admin.firestore.Timestamp.now(),
      };

      await db.collection('dailyReports').add(report);

      // Get admin users to send email
      const usersSnapshot = await db.collection('users').where('role', '==', 'admin').get();
      const adminEmails = usersSnapshot.docs.map((doc) => doc.data().email);

      // TODO: Send email to admins using a 3rd party email service
      // For now, we'll just log it
      console.log('Daily report generated:', report);
      console.log('Admin emails:', adminEmails);

      return null;
    } catch (error) {
      console.error('Error generating daily report:', error);
      return null;
    }
  });

// Check for approaching deadlines (runs every hour)
export const checkApproachingDeadlines = functions.pubsub
  .schedule('0 * * * *') // Every hour
  .onRun(async (context) => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      const tasksSnapshot = await db
        .collection('tasks')
        .where('status', '!=', 'Completed')
        .get();

      const tasks = tasksSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      for (const task of tasks) {
        const deadline = (task as any).deadline.toDate();
        const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Send notification if deadline is within 24 hours
        if (hoursUntilDeadline > 0 && hoursUntilDeadline <= 24) {
          // Check if notification already sent (to avoid duplicates)
          const existingNotifications = await db
            .collection('notifications')
            .where('userId', '==', (task as any).assignedEmployeeId)
            .where('taskId', '==', task.id)
            .where('type', '==', 'deadline_approaching')
            .where('createdAt', '>', admin.firestore.Timestamp.fromDate(new Date(now.getTime() - 60 * 60 * 1000))) // Last hour
            .get();

          if (existingNotifications.empty) {
            await db.collection('notifications').add({
              userId: (task as any).assignedEmployeeId,
              title: 'Deadline Approaching',
              message: `Task "${(task as any).title}" is due within 24 hours`,
              type: 'deadline_approaching',
              taskId: task.id,
              read: false,
              createdAt: admin.firestore.Timestamp.now(),
            });

            // Send FCM notification
            const userDoc = await db.collection('users').doc((task as any).assignedEmployeeId).get();
            const fcmToken = userDoc.data()?.fcmToken;
            if (fcmToken) {
              await admin.messaging().send({
                token: fcmToken,
                notification: {
                  title: 'Deadline Approaching',
                  body: `Task "${(task as any).title}" is due within 24 hours`,
                },
              });
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error checking approaching deadlines:', error);
      return null;
    }
  });

// Check for overdue tasks (runs every hour)
export const checkOverdueTasks = functions.pubsub
  .schedule('0 * * * *') // Every hour
  .onRun(async (context) => {
    const now = new Date();

    try {
      const tasksSnapshot = await db
        .collection('tasks')
        .where('status', '!=', 'Completed')
        .get();

      const tasks = tasksSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      for (const task of tasks) {
        const deadline = (task as any).deadline.toDate();

        if (deadline < now) {
          // Check if notification already sent (to avoid duplicates)
          const existingNotifications = await db
            .collection('notifications')
            .where('userId', '==', (task as any).assignedEmployeeId)
            .where('taskId', '==', task.id)
            .where('type', '==', 'task_overdue')
            .where('createdAt', '>', admin.firestore.Timestamp.fromDate(new Date(now.getTime() - 60 * 60 * 1000))) // Last hour
            .get();

          if (existingNotifications.empty) {
            await db.collection('notifications').add({
              userId: (task as any).assignedEmployeeId,
              title: 'Task Overdue',
              message: `Task "${(task as any).title}" is now overdue`,
              type: 'task_overdue',
              taskId: task.id,
              read: false,
              createdAt: admin.firestore.Timestamp.now(),
            });

            // Send FCM notification
            const userDoc = await db.collection('users').doc((task as any).assignedEmployeeId).get();
            const fcmToken = userDoc.data()?.fcmToken;
            if (fcmToken) {
              await admin.messaging().send({
                token: fcmToken,
                notification: {
                  title: 'Task Overdue',
                  body: `Task "${(task as any).title}" is now overdue`,
                },
              });
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error checking overdue tasks:', error);
      return null;
    }
  });

// Calculate days taken when task is completed
export const onTaskStatusUpdate = functions.firestore
  .document('tasks/{taskId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // If task was just completed, calculate days taken
    if (before.status !== 'Completed' && after.status === 'Completed') {
      const createdAt = before.createdAt.toDate();
      const completedAt = new Date();
      const daysTaken = Math.ceil(
        (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      await change.after.ref.update({
        daysTaken,
        completedAt: admin.firestore.Timestamp.fromDate(completedAt),
      });
    }

    return null;
  });

