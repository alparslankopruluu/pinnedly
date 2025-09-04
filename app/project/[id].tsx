import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ImageBackground,
  Alert,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';
import { Task, ID } from '@/types';
import {
  ArrowLeft,
  Share,
  Archive,
  Edit,
  Bell,
  Plus,
  Check,
  Bookmark,
  FileText,
  Calendar,
  Clock,
  MoreHorizontal,
  Trash2,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

type TabType = 'tasks' | 'timeline' | 'gallery';

interface ActivityItem {
  id: string;
  type: 'task_created' | 'task_completed' | 'note_added' | 'bookmark_linked';
  title: string;
  subtitle?: string;
  timestamp: number;
}

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [swipedTaskId, setSwipedTaskId] = useState<string | null>(null);

  const {
    projects,
    bookmarks,
    notes,
    activities,
    addTask,
    updateTask,
    deleteTask,
    updateProject,
  } = useAppStore();

  const project = projects.find((p) => p.id === id);
  const relatedBookmarks = bookmarks.filter((b) =>
    notes.some((n) => n.links.some((l) => l.type === 'project' && l.id === id))
  );
  const relatedNotes = notes.filter((n) =>
    n.links.some((l) => l.type === 'project' && l.id === id)
  );

  const projectActivities: ActivityItem[] = useMemo(() => {
    if (!project) return [];
    return activities
      .filter((a) => a.relatedId === id || project.tasks.some((t) => t.id === a.relatedId))
      .map((a) => ({
        id: a.id,
        type: a.type as any,
        title: a.title,
        subtitle: a.subtitle,
        timestamp: a.timestamp,
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);
  }, [activities, project, id]);

  if (!project) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Project not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const completedTasks = project.tasks.filter((t) => t.status === 'done').length;
  const totalTasks = project.tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const getDeadlineStatus = () => {
    if (!project.deadline) return null;
    const now = Date.now();
    const timeLeft = project.deadline - now;
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { text: 'Overdue', color: '#EF4444', bgColor: '#FEE2E2' };
    } else if (daysLeft <= 7) {
      return { text: `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`, color: '#F59E0B', bgColor: '#FEF3C7' };
    } else {
      return { text: `${daysLeft} days left`, color: '#10B981', bgColor: '#D1FAE5' };
    }
  };

  const deadlineStatus = getDeadlineStatus();

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      addTask(project.id, {
        title: newTaskTitle.trim(),
        status: 'todo',
      });
      setNewTaskTitle('');
    }
  };

  const handleToggleTask = (taskId: string) => {
    const task = project.tasks.find((t) => t.id === taskId);
    if (task) {
      updateTask(taskId, {
        status: task.status === 'done' ? 'todo' : 'done',
      });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTask(taskId),
        },
      ]
    );
  };

  const handleShare = () => {
    Alert.alert('Share Project', 'Share functionality would be implemented here.');
  };

  const handleArchive = () => {
    Alert.alert('Archive Project', 'Archive functionality would be implemented here.');
  };

  const handleNudgeMe = () => {
    Alert.alert('Nudge Me', 'Reminder notification would be scheduled here.');
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const TaskItem = ({ task }: { task: Task }) => {
    const translateX = new Animated.Value(0);

    const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -100));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true,
          }).start();
          setSwipedTaskId(task.id);
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          setSwipedTaskId(null);
        }
      },
    });

    return (
      <View style={styles.taskItemContainer}>
        <Animated.View
          style={[
            styles.taskItem,
            { transform: [{ translateX }] },
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            style={[
              styles.checkbox,
              task.status === 'done' && styles.checkboxChecked,
            ]}
            onPress={() => handleToggleTask(task.id)}
          >
            {task.status === 'done' && (
              <Check size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          <Text
            style={[
              styles.taskTitle,
              task.status === 'done' && styles.taskTitleCompleted,
            ]}
          >
            {task.title}
          </Text>
        </Animated.View>
        {swipedTaskId === task.id && (
          <View style={styles.taskActions}>
            <TouchableOpacity
              style={styles.deleteAction}
              onPress={() => handleDeleteTask(task.id)}
            >
              <Trash2 size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tasks':
        return (
          <View style={styles.tabContent}>
            <View style={styles.tasksSection}>
              {project.tasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
              
              <View style={styles.addTaskContainer}>
                <Plus size={20} color="#6B7280" />
                <TextInput
                  style={styles.addTaskInput}
                  placeholder="Add Task"
                  placeholderTextColor="#6B7280"
                  value={newTaskTitle}
                  onChangeText={setNewTaskTitle}
                  onSubmitEditing={handleAddTask}
                  returnKeyType="done"
                />
              </View>
              
              {project.tasks.length > 0 && (
                <Text style={styles.swipeHint}>
                  Swipe left on a task for more options
                </Text>
              )}
            </View>

            {(relatedBookmarks.length > 0 || relatedNotes.length > 0) && (
              <View style={styles.relatedSection}>
                <Text style={styles.sectionTitle}>Related Content</Text>
                
                {relatedBookmarks.map((bookmark) => (
                  <TouchableOpacity
                    key={bookmark.id}
                    style={styles.relatedItem}
                    onPress={() => router.push(`/bookmark/${bookmark.id}` as any)}
                  >
                    <Bookmark size={20} color="#4F46E5" />
                    <View style={styles.relatedItemContent}>
                      <Text style={styles.relatedItemTitle}>
                        {bookmark.title || bookmark.url}
                      </Text>
                      <Text style={styles.relatedItemSubtitle}>
                        {bookmark.url ? new URL(bookmark.url).hostname : 'Bookmark'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                
                {relatedNotes.map((note) => (
                  <TouchableOpacity
                    key={note.id}
                    style={styles.relatedItem}
                    onPress={() => router.push(`/note/${note.id}` as any)}
                  >
                    <FileText size={20} color="#F59E0B" />
                    <View style={styles.relatedItemContent}>
                      <Text style={styles.relatedItemTitle}>{note.title}</Text>
                      <Text style={styles.relatedItemSubtitle}>
                        Created {formatDate(note.createdAt)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );

      case 'timeline':
        return (
          <View style={styles.tabContent}>
            {projectActivities.length > 0 ? (
              projectActivities.map((activity) => (
                <View key={activity.id} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>{activity.title}</Text>
                    {activity.subtitle && (
                      <Text style={styles.timelineSubtitle}>{activity.subtitle}</Text>
                    )}
                    <Text style={styles.timelineTime}>
                      {formatDate(activity.timestamp)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Clock size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateTitle}>No Activity Yet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Project activity will appear here as you work
                </Text>
              </View>
            )}
          </View>
        );

      case 'gallery':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyState}>
              <Plus size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No Images Yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Add images to showcase your project progress
              </Text>
              <TouchableOpacity style={styles.uploadButton}>
                <Text style={styles.uploadButtonText}>Upload Image</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Header with Cover Image */}
        <View style={styles.headerContainer}>
          <ImageBackground
            source={{
              uri: project.coverImage ||
                'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop',
            }}
            style={styles.coverImage}
          >
            <View style={styles.overlay} />
            <SafeAreaView style={styles.headerContent}>
              <View style={styles.headerTop}>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => router.back()}
                >
                  <ArrowLeft size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={handleShare}
                  >
                    <Share size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={handleArchive}
                  >
                    <Archive size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          </ImageBackground>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Project Overview Card */}
          <View style={styles.overviewCard}>
            <Text style={styles.projectTitle}>{project.title}</Text>
            {project.description && (
              <Text style={styles.projectDescription}>{project.description}</Text>
            )}
            
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.overviewActions}>
              {deadlineStatus && (
                <View
                  style={[
                    styles.deadlineChip,
                    { backgroundColor: deadlineStatus.bgColor },
                  ]}
                >
                  <Clock size={16} color={deadlineStatus.color} />
                  <Text
                    style={[
                      styles.deadlineText,
                      { color: deadlineStatus.color },
                    ]}
                  >
                    {deadlineStatus.text}
                  </Text>
                </View>
              )}
              
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.editButton}>
                  <Edit size={16} color="#6B7280" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.nudgeButton}
                  onPress={handleNudgeMe}
                >
                  <Bell size={16} color="#4F46E5" />
                  <Text style={styles.nudgeButtonText}>Nudge Me</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {(['tasks', 'timeline', 'gallery'] as TabType[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  activeTab === tab && styles.activeTab,
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          {renderTabContent()}
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity style={styles.fab}>
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    height: 250,
  },
  coverImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  headerContent: {
    flex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  content: {
    flex: 1,
    marginTop: -60,
    paddingHorizontal: 16,
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  projectTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  projectDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 4,
  },
  overviewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deadlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  nudgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    gap: 6,
  },
  nudgeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F46E5',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  activeTabText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  tabContent: {
    paddingBottom: 100,
  },
  tasksSection: {
    marginBottom: 24,
  },
  taskItemContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  taskItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  taskActions: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteAction: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 60,
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTaskContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },
  addTaskInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    marginLeft: 8,
    padding: 4,
  },
  swipeHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  relatedSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  relatedItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  relatedItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  relatedItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  relatedItemSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingLeft: 8,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
    marginTop: 6,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  timelineSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  uploadButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});