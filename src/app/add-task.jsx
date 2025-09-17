import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Animated,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  CalendarDays,
  Timer,
  Save,
  ChevronDown,
  Star,
  Edit3,
} from "lucide-react-native";
import { addTask, updateTask } from "../utils/storage";
import {
  scheduleRecurringReminder,
  cancelTaskNotification,
} from "../utils/notifications";

export default function AddTaskScreen() {
  const params = useLocalSearchParams();
  const editTaskData = params.editTask ? JSON.parse(params.editTask) : null;
  const isEditing = !!editTaskData;

  const [title, setTitle] = useState(editTaskData?.title || "");
  const [description, setDescription] = useState(editTaskData?.description || "");
  const [type, setType] = useState(editTaskData?.type || "Assignment");
  const [dueDate, setDueDate] = useState(editTaskData ? new Date(editTaskData.dueDate) : new Date());
  const [dueTime, setDueTime] = useState(() => {
    if (editTaskData?.dueTime) {
      const [hours, minutes] = editTaskData.dueTime.split(":");
      return `${hours}:${minutes}`;
    }
    return "09:00";
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const insets = useSafeAreaInsets();

  // Animations
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const taskTypes = [
    { label: "Assignment", icon: "📝", color: "#4ECDC4" },
    { label: "Exam", icon: "📚", color: "#FF6B6B" },
    { label: "Class", icon: "🎓", color: "#45B7D1" },
    { label: "Study Session", icon: "📖", color: "#96CEB4" },
    { label: "Project", icon: "🚀", color: "#FECA57" },
  ];

  const dateOptions = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(); 
    d.setDate(d.getDate() + i); 
    return d;
  });

  const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = Math.floor(i / 4); 
    const minute = (i % 4) * 15;
    return `${hour.toString().padStart(2,"0")}:${minute.toString().padStart(2,"0")}`;
  });

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert("Error", "Please enter a task title");

    setLoading(true);
    try {
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        type,
        dueDate: dueDate.toISOString(),
        dueTime,
      };
      let savedTask;
      if (isEditing) {
        if (editTaskData.notificationId) await cancelTaskNotification(editTaskData.notificationId);
        savedTask = await updateTask(editTaskData.id, taskData);
      } else savedTask = await addTask(taskData);

      if (savedTask) {
        const notificationId = await scheduleRecurringReminder(savedTask);
        if (notificationId) await updateTask(savedTask.id, { notificationId });
        Alert.alert(
          "Success! 🎉",
          `Task ${isEditing ? "updated" : "added"} successfully!`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else Alert.alert("Error", `Failed to ${isEditing ? "update" : "add"} task`);
    } catch { Alert.alert("Error", "Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  const formatDate = (date) => date.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  const formatTime = (time) => {
    const [h, m] = time.split(":"); 
    const hour = parseInt(h); 
    const ampm = hour >= 12 ? "PM" : "AM"; 
    const displayHour = hour % 12 || 12; 
    return `${displayHour}:${m} ${ampm}`;
  };
  const getTaskTypeData = (t) => taskTypes.find((tt) => tt.label === t) || taskTypes[0];
  const currentTaskType = getTaskTypeData(type);

  const PickerModal = ({ visible, onClose, title, options, selectedValue, onSelect, renderOption, isTaskType }) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={[styles.modalHeader, { backgroundColor: currentTaskType.color }]}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScrollView}>
            {options.map((opt, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.modalOption, selectedValue === (isTaskType ? opt.label : opt) && styles.selectedOption]}
                onPress={() => { onSelect(isTaskType ? opt.label : opt); onClose(); }}
              >
                {isTaskType ? (
                  <View style={styles.taskTypeOption}>
                    <Text style={styles.taskTypeEmoji}>{opt.icon}</Text>
                    <Text style={[styles.modalOptionText, selectedValue === opt.label && styles.selectedOptionText]}>{opt.label}</Text>
                    <View style={[styles.taskTypeColorDot, { backgroundColor: opt.color }]} />
                  </View>
                ) : (
                  <Text style={[styles.modalOptionText, selectedValue === opt && styles.selectedOptionText]}>
                    {renderOption ? renderOption(opt) : opt}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{isEditing ? "Edit Task" : "Add New Task"}</Text>
          <Text style={styles.headerSubtitle}>{isEditing ? "Update your task details" : "Create something amazing!"}</Text>
        </View>
        <TouchableOpacity onPress={handleSave} style={[styles.saveButton, loading && styles.saveButtonDisabled]} disabled={loading}>
          <Save size={24} color={loading ? "#ccc" : "#fff"} />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <Star size={16} color={currentTaskType.color} />
                <Text style={[styles.label, { color: "#333" }]}>Task Title *</Text>
              </View>
              <TextInput style={[styles.input, styles.inputFocused]} value={title} onChangeText={setTitle} placeholder="Enter task title..." placeholderTextColor="#999" />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <Edit3 size={16} color={currentTaskType.color} />
                <Text style={styles.label}>Description</Text>
              </View>
              <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Add details (optional)..." placeholderTextColor="#999" multiline />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Task Type</Text>
              <TouchableOpacity style={[styles.pickerButton, { borderColor: currentTaskType.color }]} onPress={() => setShowTypePicker(true)}>
                <View style={styles.taskTypeContent}>
                  <Text style={styles.taskTypeEmoji}>{currentTaskType.icon}</Text>
                  <Text style={styles.pickerButtonText}>{type}</Text>
                  <View style={[styles.taskTypeColorDot, { backgroundColor: currentTaskType.color }]} />
                </View>
                <ChevronDown size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { marginBottom: 8 }]}>Due Date & Time</Text>

            <TouchableOpacity style={[styles.dateTimeButton, { borderColor: currentTaskType.color }]} onPress={() => setShowDatePicker(true)}>
              <CalendarDays size={20} color={currentTaskType.color} />
              <Text style={styles.dateTimeText}>{formatDate(dueDate)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.dateTimeButton, { borderColor: currentTaskType.color }]} onPress={() => setShowTimePicker(true)}>
              <Timer size={20} color={currentTaskType.color} />
              <Text style={styles.dateTimeText}>{formatTime(dueTime)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.submitButton, { backgroundColor: currentTaskType.color }]} onPress={handleSave} disabled={loading}>
              <View style={styles.submitButtonContent}>
                <Text style={styles.submitButtonEmoji}>{loading ? "⏳" : isEditing ? "✅" : "🚀"}</Text>
                <Text style={styles.submitButtonText}>{loading ? "Saving..." : isEditing ? "Update Task" : "Create Task"}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>

      <PickerModal visible={showTypePicker} onClose={() => setShowTypePicker(false)} title="Select Task Type" options={taskTypes} selectedValue={type} onSelect={setType} isTaskType />
      <PickerModal visible={showDatePicker} onClose={() => setShowDatePicker(false)} title="Select Due Date" options={dateOptions} selectedValue={dueDate} onSelect={setDueDate} renderOption={formatDate} />
      <PickerModal visible={showTimePicker} onClose={() => setShowTimePicker(false)} title="Select Due Time" options={timeOptions} selectedValue={dueTime} onSelect={setDueTime} renderOption={formatTime} />
    </KeyboardAvoidingView>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fa" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "#4ECDC4", borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)" },
  headerTitleContainer: { flex: 1, alignItems: "center", marginHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },
  headerSubtitle: { fontSize: 14, color: "#e0f7fa", marginTop: 2 },
  saveButton: { padding: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)" },
  saveButtonDisabled: { opacity: 0.5 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  form: { paddingBottom: 40 },
  inputContainer: { marginBottom: 24 },
  labelContainer: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  label: { fontSize: 16, fontWeight: "600", color: "#333", marginLeft: 8 },
  input: { borderWidth: 0, borderRadius: 20, padding: 18, fontSize: 16, backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 4 },
  inputFocused: { borderColor: "#007AFF" },
  textArea: { height: 120, textAlignVertical: "top" },
  pickerButton: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderRadius: 20, padding: 18, backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 4 },
  taskTypeContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  taskTypeEmoji: { fontSize: 24, marginRight: 12 },
  taskTypeColorDot: { width: 14, height: 14, borderRadius: 7, marginLeft: "auto", marginRight: 8 },
  pickerButtonText: { fontSize: 16, color: "#333", fontWeight: "600" },
  dateTimeButton: { flexDirection: "row", alignItems: "center", borderRadius: 20, padding: 16, backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 3, marginBottom: 12 },
  dateTimeText: { fontSize: 16, color: "#333", marginLeft: 12, fontWeight: "500" },
  submitButton: { borderRadius: 24, padding: 18, alignItems: "center", marginTop: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  submitButtonContent: { flexDirection: "row", alignItems: "center" },
  submitButtonEmoji: { fontSize: 20, marginRight: 8 },
  submitButtonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "70%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#e9ecef" },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
  modalCloseButton: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  modalCloseText: { fontSize: 16, color: "#fff", fontWeight: "600" },
  modalScrollView: { maxHeight: 400 },
  modalOption: { padding: 18, borderBottomWidth: 1, borderBottomColor: "#f1f3f6" },
  selectedOption: { backgroundColor: "#e0f7fa", borderLeftWidth: 4, borderLeftColor: "#4ECDC4" },
  modalOptionText: { fontSize: 16, color: "#333", fontWeight: "500" },
  selectedOptionText: { color: "#007AFF", fontWeight: "700" },
  taskTypeOption: { flexDirection: "row", alignItems: "center" },
});
