import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Plus,
  LogOut,
  CheckCircle,
  Circle,
  Trash2,
  Edit3,
  Clock,
} from "lucide-react-native";
import {
  getUser,
  removeUser,
  getTasks,
  updateTask,
  deleteTask,
} from "../utils/storage";
import {
  scheduleRecurringReminder,
  cancelTaskNotification,
} from "../utils/notifications";

export default function HomeScreen() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      loadUserAndTasks();
    }, []),
  );

  const loadUserAndTasks = async () => {
    try {
      const userData = await getUser();
      if (!userData) {
        router.replace("/login");
        return;
      }
      setUser(userData);

      const allTasks = await getTasks();
      setTasks(allTasks);
      categorizeTasksByDate(allTasks);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const categorizeTasksByDate = (allTasks) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activeTasks = allTasks.filter((task) => !task.completed);

    const todaysList = activeTasks.filter((task) => {
      const taskDate = new Date(task.dueDate);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() === today.getTime();
    });

    const upcomingList = activeTasks
      .filter((task) => {
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() >= tomorrow.getTime();
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    setTodayTasks(todaysList);
    setUpcomingTasks(upcomingList);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUserAndTasks();
    setRefreshing(false);
  }, []);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await removeUser();
          router.replace("/login");
        },
      },
    ]);
  };

  const toggleTaskCompletion = async (task) => {
    try {
      const updatedTask = await updateTask(task.id, {
        completed: !task.completed,
      });
      if (updatedTask) {
        if (updatedTask.completed && task.notificationId) {
          await cancelTaskNotification(task.notificationId);
        } else if (!updatedTask.completed) {
          const notificationId = await scheduleRecurringReminder(updatedTask);
          if (notificationId) {
            await updateTask(task.id, { notificationId });
          }
        }
        loadUserAndTasks();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update task");
    }
  };

  const handleDeleteTask = (task) => {
    Alert.alert(
      "Delete Task",
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (task.notificationId) {
              await cancelTaskNotification(task.notificationId);
            }
            const success = await deleteTask(task.id);
            if (success) {
              loadUserAndTasks();
            } else {
              Alert.alert("Error", "Failed to delete task");
            }
          },
        },
      ],
    );
  };

  const handleEditTask = (task) => {
    router.push({
      pathname: "/add-task",
      params: {
        editTask: JSON.stringify(task),
      },
    });
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getTaskTypeColor = (type) => {
    switch (type) {
      case "Exam":
        return "#FF6B6B";
      case "Assignment":
        return "#4ECDC4";
      case "Class":
        return "#45B7D1";
      default:
        return "#95A5A6";
    }
  };

  const TaskCard = ({ task, isCard = false }) => (
    <View style={[styles.taskItem, isCard && styles.taskCard]}>
      <View style={styles.taskHeader}>
        <TouchableOpacity
          onPress={() => toggleTaskCompletion(task)}
          style={styles.checkboxContainer}
        >
          {task.completed ? (
            <CheckCircle size={24} color="#4CAF50" />
          ) : (
            <Circle size={24} color="#666" />
          )}
        </TouchableOpacity>

        <View style={styles.taskContent}>
          <Text
            style={[styles.taskTitle, task.completed && styles.completedTask]}
          >
            {task.title}
          </Text>
          {task.description && (
            <Text
              style={[
                styles.taskDescription,
                task.completed && styles.completedTask,
              ]}
            >
              {task.description}
            </Text>
          )}
          <View style={styles.taskMeta}>
            <View
              style={[
                styles.taskTypeChip,
                { backgroundColor: getTaskTypeColor(task.type) },
              ]}
            >
              <Text style={styles.taskTypeText}>{task.type}</Text>
            </View>
            <View style={styles.timeContainer}>
              <Clock size={14} color="#666" />
              <Text style={styles.taskTime}>{formatTime(task.dueTime)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.taskActions}>
        <TouchableOpacity
          onPress={() => handleEditTask(task)}
          style={styles.actionButton}
        >
          <Edit3 size={20} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDeleteTask(task)}
          style={styles.actionButton}
        >
          <Trash2 size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!user) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>Hello, {user.name}! 👋</Text>
          <Text style={styles.subtitle}>Let's tackle your studies today</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{todayTasks.length}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{upcomingTasks.length}</Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Today's Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionTitle}>Today's Tasks ✨</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{todayTasks.length}</Text>
            </View>
          </View>
          {todayTasks.length > 0 ? (
            todayTasks.map((task) => (
              <TaskCard key={task.id} task={task} isCard={true} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>🎉</Text>
              <Text style={styles.emptyText}>No tasks for today!</Text>
              <Text style={styles.emptySubtext}>
                You're all caught up. Great job!
              </Text>
            </View>
          )}
        </View>

        {/* Upcoming Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionTitle}>Upcoming Tasks 📅</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>
                {upcomingTasks.length}
              </Text>
            </View>
          </View>
          {upcomingTasks.length > 0 ? (
            upcomingTasks.map((task) => (
              <View key={task.id} style={styles.upcomingTaskContainer}>
                <Text style={styles.upcomingDate}>
                  {formatDate(task.dueDate)}
                </Text>
                <TaskCard task={task} />
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>📚</Text>
              <Text style={styles.emptyText}>No upcoming tasks</Text>
              <Text style={styles.emptySubtext}>Time to add some goals!</Text>
            </View>
          )}
        </View>

        {/* Add some bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/add-task")}
      >
        <Plus size={28} color="#fff" />
        <Text style={styles.fabText}>Add Task</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: 12,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007AFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#ddd",
    marginHorizontal: 8,
  },
  logoutButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 28,
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  sectionBadge: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    minWidth: 30,
    alignItems: "center",
  },
  sectionBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  taskItem: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  taskCard: {
    borderLeftWidth: 5,
    borderLeftColor: "#007AFF",
    backgroundColor: "#f0f8ff",
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkboxContainer: {
    marginRight: 16,
    marginTop: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
    lineHeight: 24,
  },
  taskDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },
  completedTask: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  taskTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  taskTypeText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taskTime: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
    fontWeight: "500",
  },
  taskActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  actionButton: {
    padding: 10,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
  },
  upcomingTaskContainer: {
    marginBottom: 12,
  },
  upcomingDate: {
    fontSize: 14,
    fontWeight: "700",
    color: "#007AFF",
    marginBottom: 8,
    marginLeft: 8,
    backgroundColor: "#f0f8ff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  emptyState: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#007AFF",
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  fabText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
});
