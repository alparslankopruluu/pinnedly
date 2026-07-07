import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ImageBackground,
  Image,
  Animated,
  PanResponder,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getOverlayFabBottomOffset } from '@/utils/layout';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useNoteStore, useProjectStore } from '@/providers/OfflineProvider';
import { useTrackContentOpen } from '@/hooks/useTrackContentOpen';
import { Task } from '@/types';
import {
  ArrowLeft,
  Share,
  Edit,
  Bell,
  Plus,
  Check,
  Bookmark,
  FileText,
  Clock,
  Trash2,
  Users,
  X,
} from '@/components/icons/lucide';
import { notificationService } from '@/utils/notifications';
import { DateTimePickerField } from '@/components/ui/DateTimePickerField';
import { ProjectMembersModal } from '@/components/ProjectMembersModal';
import { ShareModal } from '@/components/ShareModal';
import { TaskStatusCheckbox } from '@/components/TaskStatusCheckbox';
import { getActivityTitle } from '@/utils/activities';
import { getNextTaskStatus } from '@/utils/taskStatus';
import { CategoryPicker } from '@/components/ui/CategoryPicker';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { ContentCategoryId, DEFAULT_CONTENT_CATEGORY } from '@/constants/contentCategories';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

type TabType = 'tasks' | 'timeline' | 'gallery';

interface ProjectTaskRowProps {
  task: Task;
  isSwiped: boolean;
  onSwipe: (taskId: string | null) => void;
  onToggle: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

function ProjectTaskRow({
  task,
  isSwiped,
  onSwipe,
  onToggle,
  onDelete,
}: ProjectTaskRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 12 && Math.abs(gestureState.dy) < 12,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -80));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true,
          }).start();
          onSwipe(task.id);
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          onSwipe(null);
        }
      },
    })
  ).current;

  useEffect(() => {
    if (!isSwiped) {
      translateX.setValue(0);
    }
  }, [isSwiped, translateX]);

  return (
    <View style={styles.taskItemContainer}>
      {isSwiped && (
        <View style={styles.taskActions}>
          <TouchableOpacity
            style={styles.deleteAction}
            onPress={() => onDelete(task.id)}
          >
            <Trash2 size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
      <Animated.View style={[styles.taskItem, { transform: [{ translateX }] }]}>
        <TaskStatusCheckbox
          status={task.status}
          onPress={() => onToggle(task.id)}
          size={20}
          style={styles.checkbox}
        />
        <View style={styles.taskTitleContainer} {...panResponder.panHandlers}>
          <Text
            style={[
              styles.taskTitle,
              task.status === 'done' && styles.taskTitleCompleted,
            ]}
          >
            {task.title}
          </Text>
          <CategoryBadge category={task.category} compact />
        </View>
      </Animated.View>
    </View>
  );
}

interface ActivityItem {
  id: string;
  type: 'task_created' | 'task_completed' | 'note_added' | 'bookmark_linked';
  title: string;
  subtitle?: string;
  timestamp: number;
}

export default function ProjectDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth, readableWidth, isTabletOrLarger } = useResponsiveLayout();
  const { id } = useLocalSearchParams<{ id: string }>();
  const projectId = Array.isArray(id) ? id[0] : id;
  useTrackContentOpen('project', projectId);
  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskCategory, setNewTaskCategory] = useState<ContentCategoryId>(DEFAULT_CONTENT_CATEGORY);
  const [swipedTaskId, setSwipedTaskId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showMembersModal, setShowMembersModal] = useState<boolean>(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [showNudgeModal, setShowNudgeModal] = useState(false);
  const [nudgeTime, setNudgeTime] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [isSchedulingNudge, setIsSchedulingNudge] = useState(false);
  const [isHydratingProject, setIsHydratingProject] = useState(false);
  const taskInputRef = useRef<TextInput>(null);
  const attemptedHydrationIds = useRef<Set<string>>(new Set());
  const contentWidth = typeof readableWidth === 'number' ? readableWidth : undefined;
  const galleryColumns = isTabletOrLarger ? 3 : 2;
  const galleryGap = 8;
  const galleryAvailableWidth = (contentWidth ?? viewportWidth) - 32;
  const galleryItemSize = Math.max(
    120,
    Math.floor((galleryAvailableWidth - galleryGap * (galleryColumns - 1)) / galleryColumns)
  );

  const { bookmarks, activities } = useAppStore();
  const { notes } = useNoteStore();

  const {
    projects,
    loading: projectsLoading,
    hydrateProject,
    addTask,
    updateTask,
    deleteTask,
    updateProject,
    deleteProject,
  } = useProjectStore();

  useEffect(() => {
    notificationService.initialize();
  }, []);

  const project = projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (!projectId || attemptedHydrationIds.current.has(projectId)) return;
    if (project && project.tasks.length > 0) {
      attemptedHydrationIds.current.add(projectId);
      return;
    }

    let isMounted = true;
    attemptedHydrationIds.current.add(projectId);
    setIsHydratingProject(true);
    hydrateProject(projectId).finally(() => {
      if (isMounted) setIsHydratingProject(false);
    });

    return () => {
      isMounted = false;
    };
  }, [projectId, project, hydrateProject]);
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

  if ((projectsLoading || isHydratingProject) && !project) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
        </View>
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('projectDetail.notFound')}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
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
      return { text: t('projectDetail.deadline.overdue'), color: '#EF4444', bgColor: '#FEE2E2' };
    } else if (daysLeft <= 7) {
      return { text: t('projectDetail.deadline.daysLeft', { count: daysLeft }), color: '#F59E0B', bgColor: '#FEF3C7' };
    } else {
      return { text: t('projectDetail.deadline.daysLeft', { count: daysLeft }), color: '#10B981', bgColor: '#D1FAE5' };
    }
  };

  const deadlineStatus = getDeadlineStatus();

  const handleAddTask = async () => {
    if (!project || isAddingTask) return;

    const trimmedTitle = newTaskTitle.trim();
    if (!trimmedTitle) {
      taskInputRef.current?.focus();
      return;
    }

    setIsAddingTask(true);
    try {
      await addTask(project.id, {
        title: trimmedTitle,
        status: 'todo',
        category: newTaskCategory,
      });
      setNewTaskTitle('');
      setNewTaskCategory(DEFAULT_CONTENT_CATEGORY);
    } catch (error) {
      console.error('Failed to create task:', error);
      showAppAlert(t('common.error'), t('projectDetail.alerts.createTaskFailed'), undefined, { variant: 'error' });
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleFabPress = () => {
    showAppAlert(
      t('projectDetail.quickAdd.title'),
      t('projectDetail.quickAdd.message'),
      [
        {
          text: t('projectDetail.quickAdd.task'),
          onPress: () => {
            setActiveTab('tasks');
            setTimeout(() => taskInputRef.current?.focus(), 150);
          },
        },
        {
          text: t('projectDetail.quickAdd.note'),
          onPress: () =>
            router.push({
              pathname: '/add-note',
              params: { projectId: project.id },
            } as any),
        },
        {
          text: t('projectDetail.quickAdd.bookmark'),
          onPress: () => router.push('/add-bookmark' as any),
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const handleToggleTask = async (taskId: string) => {
    const task = project.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const nextStatus = getNextTaskStatus(task.status);
    try {
      await updateTask(taskId, { status: nextStatus });
    } catch (error) {
      console.error('Failed to update task:', error);
      showAppAlert(t('common.error'), t('projectDetail.alerts.updateTaskFailed'), undefined, { variant: 'error' });
    }
  };

  const handleUploadGalleryImage = async () => {
    if (!project || isUploadingGallery) return;

    const ImagePicker = await import('expo-image-picker');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAppAlert(
        t('common.error'),
        t('projectDetail.alerts.galleryPermissionDenied'),
        undefined,
        { variant: 'error' }
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;

    setIsUploadingGallery(true);
    try {
      const nextGallery = [
        ...(project.gallery ?? []),
        ...result.assets.map((asset) => asset.uri),
      ];
      await updateProject(project.id, { gallery: nextGallery });
    } catch (error) {
      console.error('Failed to upload gallery image:', error);
      showAppAlert(t('common.error'), t('projectDetail.alerts.uploadImageFailed'), undefined, { variant: 'error' });
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    showAppAlert(
      t('projectDetail.deleteTask.title'),
      t('projectDetail.deleteTask.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(taskId);
            } catch (error) {
              console.error('Failed to delete task:', error);
              showAppAlert(t('common.error'), t('projectDetail.alerts.deleteTaskFailed'), undefined, { variant: 'error' });
            }
          },
        },
      ]
    );
  };



  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleEdit = () => {
    if (project) {
      setEditTitle(project.title);
      setEditDescription(project.description || '');
      setShowEditModal(true);
    }
  };

  const handleShowMembers = () => {
    setShowMembersModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      showAppAlert(t('common.error'), t('projectDetail.alerts.titleRequired'), undefined, { variant: 'error' });
      return;
    }

    try {
      await updateProject(project.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });
      setShowEditModal(false);
      showAppAlert(t('common.success'), t('projectDetail.alerts.updatedSuccessfully'), undefined, { variant: 'success' });
    } catch (error) {
      console.error('Failed to update project:', error);
      showAppAlert(t('common.error'), t('projectDetail.alerts.updateFailed'), undefined, { variant: 'error' });
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteProject(project.id);
      setShowDeleteModal(false);
      router.back();
    } catch (error) {
      console.error('Failed to delete project:', error);
      showAppAlert(t('common.error'), t('projectDetail.alerts.deleteFailed'), undefined, { variant: 'error' });
    }
  };

  const handleNudgeMe = () => {
    if (Platform.OS === 'web') {
      showAppAlert(t('common.info'), t('projectDetail.alerts.notificationsNotSupported'), undefined, { variant: 'info' });
      return;
    }

    setNudgeTime(new Date(Date.now() + 60 * 60 * 1000));
    setShowNudgeModal(true);
  };

  const setQuickNudge = (hoursFromNow: number) => {
    setNudgeTime(new Date(Date.now() + hoursFromNow * 60 * 60 * 1000));
  };

  const scheduleNudgeAt = async (time: Date) => {
    if (time.getTime() <= Date.now()) {
      showAppAlert(t('common.error'), t('projectDetail.scheduleNudge.pastDate'), undefined, { variant: 'error' });
      return;
    }

    setIsSchedulingNudge(true);
    try {
      const notificationId = await notificationService.scheduleProjectNudge(
        project.id,
        project.title,
        time
      );

      if (notificationId) {
        setShowNudgeModal(false);
        showAppAlert(
          t('common.success'),
          t('projectDetail.alerts.nudgeScheduled', { time: time.toLocaleString() }),
          undefined,
          { variant: 'success' }
        );
      } else {
        showAppAlert(t('common.error'), t('projectDetail.alerts.scheduleNudgeFailed'), undefined, { variant: 'error' });
      }
    } catch (error) {
      console.error('Nudge scheduling error:', error);
      showAppAlert(t('common.error'), t('projectDetail.alerts.scheduleNudgeFailed'), undefined, { variant: 'error' });
    } finally {
      setIsSchedulingNudge(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('projectDetail.date.today');
    if (diffDays === 1) return t('projectDetail.date.yesterday');
    if (diffDays < 7) return t('projectDetail.date.daysAgo', { count: diffDays });
    return date.toLocaleDateString();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tasks':
        return (
          <View style={styles.tabContent}>
            <View style={styles.tasksSection}>
              {project.tasks.map((task) => (
                <ProjectTaskRow
                  key={task.id}
                  task={task}
                  isSwiped={swipedTaskId === task.id}
                  onSwipe={setSwipedTaskId}
                  onToggle={handleToggleTask}
                  onDelete={handleDeleteTask}
                />
              ))}

              <View style={styles.addTaskCategoryWrap}>
                <CategoryPicker
                  value={newTaskCategory}
                  onChange={setNewTaskCategory}
                />
              </View>

              <View style={styles.addTaskContainer}>
                <TextInput
                  ref={taskInputRef}
                  style={styles.addTaskInput}
                  placeholder={t('projectDetail.addTaskPlaceholder')}
                  placeholderTextColor="#6B7280"
                  value={newTaskTitle}
                  onChangeText={setNewTaskTitle}
                  onSubmitEditing={handleAddTask}
                  returnKeyType="done"
                  editable={!isAddingTask}
                />
                <TouchableOpacity
                  style={[
                    styles.addTaskActionButton,
                    (!newTaskTitle.trim() || isAddingTask) && styles.addTaskActionButtonDisabled,
                  ]}
                  onPress={handleAddTask}
                  disabled={isAddingTask}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {isAddingTask ? (
                    <ActivityIndicator size="small" color="#4F46E5" />
                  ) : newTaskTitle.trim() ? (
                    <Check size={22} color="#4F46E5" />
                  ) : (
                    <Plus size={22} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              </View>
              
              {project.tasks.length > 0 && (
                <Text style={styles.swipeHint}>
                  {t('projectDetail.swipeHint')}
                </Text>
              )}
            </View>

            {(relatedBookmarks.length > 0 || relatedNotes.length > 0) && (
              <View style={styles.relatedSection}>
                <Text style={styles.sectionTitle}>{t('projectDetail.relatedContent')}</Text>
                
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
                        {bookmark.url ? new URL(bookmark.url).hostname : t('entityTypes.bookmark')}
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
                        {t('projectDetail.created', { relative: formatDate(note.createdAt) })}
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
                    <Text style={styles.timelineTitle}>{getActivityTitle(activity, t)}</Text>
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
                <Text style={styles.emptyStateTitle}>{t('projectDetail.empty.activityTitle')}</Text>
                <Text style={styles.emptyStateSubtitle}>
                  {t('projectDetail.empty.activityDescription')}
                </Text>
              </View>
            )}
          </View>
        );

      case 'gallery': {
        const galleryImages = project.gallery ?? [];
        return (
          <View style={styles.tabContent}>
            {galleryImages.length > 0 ? (
              <View style={styles.gallerySection}>
                <View style={styles.galleryGrid}>
                  {galleryImages.map((uri, index) => (
                    <Image
                      key={`${uri}-${index}`}
                      source={{ uri }}
                      style={[
                        styles.galleryImage,
                        { width: galleryItemSize, height: galleryItemSize },
                      ]}
                      resizeMode="cover"
                    />
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleUploadGalleryImage}
                  disabled={isUploadingGallery}
                >
                  {isUploadingGallery ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.uploadButtonText}>{t('projectDetail.empty.uploadImage')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Plus size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateTitle}>{t('projectDetail.empty.imagesTitle')}</Text>
                <Text style={styles.emptyStateSubtitle}>
                  {t('projectDetail.empty.imagesDescription')}
                </Text>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleUploadGalleryImage}
                  disabled={isUploadingGallery}
                >
                  {isUploadingGallery ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.uploadButtonText}>{t('projectDetail.empty.uploadImage')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      }

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
                    onPress={handleDelete}
                  >
                    <Trash2 size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          </ImageBackground>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            contentWidth ? { width: contentWidth } : null,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Project Overview Card */}
          <View style={styles.overviewCard}>
            <Text style={styles.projectTitle}>{project.title}</Text>
            {project.description && (
              <Text style={styles.projectDescription}>{project.description}</Text>
            )}
            
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>{t('projectDetail.progress')}</Text>
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
                <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                  <Edit size={16} color="#6B7280" />
                  <Text style={styles.editButtonText}>{t('common.edit')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.editButton} onPress={handleShowMembers}>
                  <Users size={16} color="#6B7280" />
                  <Text style={styles.editButtonText}>{t('projectDetail.members')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.nudgeButton}
                  onPress={handleNudgeMe}
                >
                  <Bell size={16} color="#4F46E5" />
                  <Text style={styles.nudgeButtonText}>{t('projectDetail.nudgeMe')}</Text>
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
                  {t(`projectDetail.tabs.${tab}` as 'projectDetail.tabs.tasks')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          {renderTabContent()}
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity
          style={[styles.fab, { bottom: getOverlayFabBottomOffset(insets.bottom) }]}
          onPress={handleFabPress}
        >
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <ShareModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          entityId={project.id}
          entityType="project"
          entityTitle={project.title}
        />

        {/* Edit Modal */}
        <Modal
          visible={showEditModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('projectDetail.editProject')}</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>{t('projectDetail.projectTitle')}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder={t('projectDetail.titlePlaceholder')}
                  value={editTitle}
                  onChangeText={setEditTitle}
                />
                
                <Text style={styles.inputLabel}>{t('projectDetail.description')}</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder={t('projectDetail.descriptionPlaceholder')}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  numberOfLines={4}
                />
              </View>
              
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalButtonSecondary}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.modalButtonSecondaryText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButtonPrimary}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.modalButtonPrimaryText}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.deleteModalContent}>
              <Text style={styles.deleteModalTitle}>{t('projectDetail.deleteProject.title')}</Text>
              <Text style={styles.deleteModalText}>
                {t('projectDetail.deleteProject.message', { title: project?.title })}
              </Text>
              
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalButtonSecondary}
                  onPress={() => setShowDeleteModal(false)}
                >
                  <Text style={styles.modalButtonSecondaryText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={confirmDelete}
                >
                  <Text style={styles.deleteButtonText}>{t('common.delete')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Nudge Modal */}
        <Modal
          visible={showNudgeModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowNudgeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('projectDetail.scheduleNudge.title')}</Text>
                <TouchableOpacity onPress={() => setShowNudgeModal(false)}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.nudgeMessage}>{t('projectDetail.scheduleNudge.message')}</Text>

                <View style={styles.nudgeQuickOptions}>
                  <TouchableOpacity
                    style={styles.nudgeQuickButton}
                    onPress={() => setQuickNudge(1)}
                  >
                    <Text style={styles.nudgeQuickButtonText}>
                      {t('projectDetail.scheduleNudge.in1Hour')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.nudgeQuickButton}
                    onPress={() => setQuickNudge(24)}
                  >
                    <Text style={styles.nudgeQuickButtonText}>
                      {t('projectDetail.scheduleNudge.tomorrow')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.nudgeQuickButton}
                    onPress={() => setQuickNudge(72)}
                  >
                    <Text style={styles.nudgeQuickButtonText}>
                      {t('projectDetail.scheduleNudge.in3Days')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>{t('projectDetail.scheduleNudge.pickDateTime')}</Text>
                <DateTimePickerField
                  value={nudgeTime}
                  onChange={setNudgeTime}
                  minimumDate={new Date()}
                />
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalButtonSecondary}
                  onPress={() => setShowNudgeModal(false)}
                >
                  <Text style={styles.modalButtonSecondaryText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.nudgeScheduleButton, isSchedulingNudge && styles.nudgeScheduleButtonDisabled]}
                  onPress={() => scheduleNudgeAt(nudgeTime)}
                  disabled={isSchedulingNudge}
                >
                  <Bell size={16} color="#FFFFFF" />
                  <Text style={styles.modalButtonPrimaryText}>
                    {isSchedulingNudge ? t('common.processing') : t('projectDetail.scheduleNudge.schedule')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Project Members Modal */}
        <ProjectMembersModal
          visible={showMembersModal}
          onClose={() => setShowMembersModal(false)}
          projectId={project.id}
          projectTitle={project.title}
        />
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
  contentContainer: {
    alignSelf: 'center',
    width: '100%',
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
    marginRight: 12,
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
  addTaskCategoryWrap: {
    marginBottom: 10,
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
    padding: 4,
  },
  addTaskActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  addTaskActionButtonDisabled: {
    opacity: 0.5,
  },
  taskTitleContainer: {
    flex: 1,
    paddingVertical: 4,
  },
  gallerySection: {
    paddingBottom: 16,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  galleryImage: {
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  loadingText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalBody: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 16,
  },
  modalTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  permissionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  permissionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  permissionButtonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  permissionButtonTextActive: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nudgeMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  nudgeQuickOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  nudgeQuickButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  nudgeQuickButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F46E5',
  },
  nudgeScheduleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  nudgeScheduleButtonDisabled: {
    opacity: 0.6,
  },
  deleteModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
