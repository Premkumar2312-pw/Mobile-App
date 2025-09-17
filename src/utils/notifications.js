import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';

// Schedule a one-time notification for a task
export const scheduleTaskNotification = async (task) => {
  try {
    if (!task || !task.dueDate || !task.dueTime || !task.title) {
      console.warn('scheduleTaskNotification: missing task fields', task);
      return null;
    }

    // Cancel existing notification for this task
    if (task.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(task.notificationId);
    }

    const taskDate = new Date(task.dueDate);
    const [hours, minutes] = task.dueTime.split(':');
    taskDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    if (taskDate > new Date() && !task.completed) {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Reminder for ${task.title}`,
          body: `Due on ${taskDate.toLocaleDateString()} at ${taskDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}`,
          sound: true,
          data: { taskId: task.id },
        },
        trigger: { date: taskDate, repeats: false },
      });
      return notificationId;
    }
    return null;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

// Schedule a daily recurring reminder until task's due date
export const scheduleRecurringReminder = async (task) => {
  try {
    if (!task || !task.dueDate || !task.dueTime || !task.title) {
      console.warn('scheduleRecurringReminder: missing task fields', task);
      return null;
    }

    // Cancel existing notification
    if (task.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(task.notificationId);
    }
    if (task.completed) return null;

    const taskDate = new Date(task.dueDate);
    const [hours, minutes] = task.dueTime.split(':');

    const now = new Date();
    const firstReminder = new Date();
    firstReminder.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    if (firstReminder <= now) firstReminder.setDate(firstReminder.getDate() + 1);

    if (firstReminder <= taskDate) {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Reminder for ${task.title}`,
          body: `Due on ${taskDate.toLocaleDateString()} at ${taskDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}`,
          sound: true,
          data: { taskId: task.id, isRecurring: true },
        },
        trigger: {
          hour: parseInt(hours, 10),
          minute: parseInt(minutes, 10),
          repeats: true,
        },
      });
      return notificationId;
    }
    return null;
  } catch (error) {
    console.error('Error scheduling recurring reminder:', error);
    return null;
  }
};

// Cancel a specific task notification
export const cancelTaskNotification = async (notificationId) => {
  try {
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error canceling notification:', error);
    return false;
  }
};

// Cancel all scheduled notifications
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return true;
  } catch (error) {
    console.error('Error canceling all notifications:', error);
    return false;
  }
};

// Get all scheduled notifications
export const getAllScheduledNotifications = async () => {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
};

// Add a task and schedule a one-time notification
export const handleAddTask = async ({ title, dueDate, dueTime }) => {
  try {
    const isoDate = dueDate.replace(/\//g, '-'); // Convert 20/09/2025 → 2025-09-20
    const taskDate = new Date(`${isoDate}T${dueTime}`);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Reminder for ${title}`,
        body: `Due on ${taskDate.toLocaleDateString('en-GB')} at ${taskDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })}`,
        sound: true,
      },
      trigger: taskDate,
    });

    Alert.alert('Success! 🎉', 'Task added successfully!');
  } catch (error) {
    console.error(error);
    Alert.alert('Error', 'Could not schedule notification');
  }
};
