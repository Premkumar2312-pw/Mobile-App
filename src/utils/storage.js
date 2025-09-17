import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USER: 'user',
  TASKS: 'tasks',
};

// User storage functions
export const saveUser = async (user) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    return true;
  } catch (error) {
    console.error('Error saving user:', error);
    return false;
  }
};

export const getUser = async () => {
  try {
    const user = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

export const removeUser = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    return true;
  } catch (error) {
    console.error('Error removing user:', error);
    return false;
  }
};

// Task storage functions
export const saveTasks = async (tasks) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error('Error saving tasks:', error);
    return false;
  }
};

export const getTasks = async () => {
  try {
    const tasks = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
    return tasks ? JSON.parse(tasks) : [];
  } catch (error) {
    console.error('Error getting tasks:', error);
    return [];
  }
};

export const addTask = async (task) => {
  try {
    const tasks = await getTasks();
    const newTask = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      completed: false,
    };
    tasks.push(newTask);
    await saveTasks(tasks);
    return newTask;
  } catch (error) {
    console.error('Error adding task:', error);
    return null;
  }
};

export const updateTask = async (taskId, updates) => {
  try {
    const tasks = await getTasks();
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
      tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
      await saveTasks(tasks);
      return tasks[taskIndex];
    }
    return null;
  } catch (error) {
    console.error('Error updating task:', error);
    return null;
  }
};

export const deleteTask = async (taskId) => {
  try {
    const tasks = await getTasks();
    const filteredTasks = tasks.filter(task => task.id !== taskId);
    await saveTasks(filteredTasks);
    return true;
  } catch (error) {
    console.error('Error deleting task:', error);
    return false;
  }
};

// Initialize with sample data
export const initializeSampleData = async () => {
  try {
    const existingTasks = await getTasks();
    if (existingTasks.length === 0) {
      const sampleTasks = [
        {
          id: '1',
          title: 'Math Exam',
          description: 'Final exam for Algebra II',
          type: 'Exam',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          dueTime: '09:00',
          completed: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'History Assignment',
          description: 'Write essay about World War II',
          type: 'Assignment',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
          dueTime: '23:59',
          completed: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          title: 'Physics Class',
          description: 'Quantum mechanics lecture',
          type: 'Class',
          dueDate: new Date().toISOString(), // Today
          dueTime: '14:30',
          completed: false,
          createdAt: new Date().toISOString(),
        },
      ];
      await saveTasks(sampleTasks);
    }
  } catch (error) {
    console.error('Error initializing sample data:', error);
  }
};