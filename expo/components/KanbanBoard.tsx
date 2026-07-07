import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { Plus } from '@/components/icons/lucide';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Project, Task } from '@/types';
import { isOverdue } from '@/utils/date';
import { getNextTaskStatus } from '@/utils/taskStatus';
import { TaskStatusCheckbox } from '@/components/TaskStatusCheckbox';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { hapticError, hapticImpactMedium, hapticSelection, hapticSuccess } from '@/utils/haptics';

type KanbanTask = Task & { projectTitle: string; projectId: string };

type ColumnDef = {
  id: Task['status'];
  title: string;
  color: string;
};

interface KanbanBoardProps {
  projects: Project[];
  bottomPadding: number;
  onAddTask: (projectId: string, status: Task['status']) => void;
  onUpdateTask: (taskId: string, status: Task['status']) => Promise<void>;
}

interface ColumnBounds {
  x: number;
  width: number;
}

function findColumnAtX(
  x: number,
  bounds: Partial<Record<Task['status'], ColumnBounds>>
): Task['status'] | null {
  const entries = Object.entries(bounds) as [Task['status'], ColumnBounds][];
  for (const [id, rect] of entries) {
    if (x >= rect.x && x <= rect.x + rect.width) {
      return id;
    }
  }
  return null;
}

interface KanbanTaskCardProps {
  task: KanbanTask;
  onPress: () => void;
  onToggleStatus: () => void;
  onLongPress: (task: KanbanTask, x: number, y: number) => void;
  isDragging: boolean;
}

function KanbanTaskCard({
  task,
  onPress,
  onToggleStatus,
  onLongPress,
  isDragging,
}: KanbanTaskCardProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.taskCard,
        pressed && !isDragging && styles.taskCardPressed,
        isDragging && styles.taskCardHidden,
      ]}
      onPress={onPress}
      delayLongPress={300}
      onLongPress={(event) => {
        const { pageX, pageY } = event.nativeEvent;
        onLongPress(task, pageX, pageY);
      }}
    >
      <View style={styles.taskCardHeader}>
        <TaskStatusCheckbox
          status={task.status}
          onPress={onToggleStatus}
          size={16}
          style={styles.taskCheckbox}
        />
        <Text style={styles.taskTitle} numberOfLines={2}>
          {task.title}
        </Text>
      </View>
      <Text style={styles.taskProject} numberOfLines={1}>
        {task.projectTitle}
      </Text>
      {task.dueDate && (
        <Text
          style={[
            styles.taskDueDate,
            isOverdue(task.dueDate) && styles.taskOverdue,
          ]}
        >
          {t('projects.due')}
          {new Date(task.dueDate).toLocaleDateString()}
        </Text>
      )}
    </Pressable>
  );
}

export function KanbanBoard({
  projects,
  bottomPadding,
  onAddTask,
  onUpdateTask,
}: KanbanBoardProps) {
  const { t } = useTranslation();
  const { width, readableWidth, isDesktop, isTabletOrLarger } = useResponsiveLayout();
  const [draggingTask, setDraggingTask] = useState<KanbanTask | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [activeColumnId, setActiveColumnId] = useState<Task['status'] | null>(null);
  const columnBounds = useRef<Partial<Record<Task['status'], ColumnBounds>>>({});
  const columnRefs = useRef<Map<Task['status'], View | null>>(new Map());
  const draggingTaskRef = useRef<KanbanTask | null>(null);

  useEffect(() => {
    draggingTaskRef.current = draggingTask;
  }, [draggingTask]);

  const columns: ColumnDef[] = useMemo(
    () => [
      { id: 'todo', title: t('projects.kanban.todo'), color: '#6B7280' },
      { id: 'in-progress', title: t('projects.kanban.inProgress'), color: '#F59E0B' },
      { id: 'done', title: t('projects.kanban.done'), color: '#10B981' },
    ],
    [t]
  );
  const boardWidth = typeof readableWidth === 'number' ? readableWidth : width;
  const columnWidth = useMemo(() => {
    if (isDesktop) {
      return Math.max(280, Math.min(360, Math.floor((boardWidth - 96) / 3)));
    }
    if (isTabletOrLarger) return 320;
    return Math.max(260, Math.min(300, width - 48));
  }, [boardWidth, isDesktop, isTabletOrLarger, width]);

  const getTasksByStatus = useCallback(
    (status: Task['status']) => {
      const allTasks: KanbanTask[] = [];
      projects.forEach((project) => {
        project.tasks.forEach((task) => {
          if (task.status === status) {
            allTasks.push({
              ...task,
              projectTitle: project.title,
              projectId: project.id,
            });
          }
        });
      });
      return allTasks;
    },
    [projects]
  );

  const measureColumns = useCallback(() => {
    columnRefs.current.forEach((ref, columnId) => {
      ref?.measureInWindow((x, _y, width) => {
        columnBounds.current[columnId as Task['status']] = { x, width };
      });
    });
  }, []);

  const updateActiveColumn = useCallback((x: number) => {
    const next = findColumnAtX(x, columnBounds.current);
    setActiveColumnId(next);
  }, []);

  const finishDrag = useCallback(
    async (x: number) => {
      const task = draggingTaskRef.current;
      if (!task) return;

      const targetStatus = findColumnAtX(x, columnBounds.current);
      if (targetStatus && targetStatus !== task.status) {
        try {
          await onUpdateTask(task.id, targetStatus);
          hapticSuccess();
        } catch {
          hapticError();
        }
      }

      setDraggingTask(null);
      setActiveColumnId(null);
    },
    [onUpdateTask]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !!draggingTaskRef.current,
      onMoveShouldSetPanResponder: () => !!draggingTaskRef.current,
      onPanResponderMove: (_, gesture) => {
        setDragPosition({ x: gesture.moveX, y: gesture.moveY });
        updateActiveColumn(gesture.moveX);
      },
      onPanResponderRelease: (_, gesture) => {
        void finishDrag(gesture.moveX);
      },
      onPanResponderTerminate: (_, gesture) => {
        void finishDrag(gesture.moveX);
      },
    })
  ).current;

  const startDrag = useCallback(
    (task: KanbanTask, x: number, y: number) => {
      measureColumns();
      setDraggingTask(task);
      setDragPosition({ x, y });
      setActiveColumnId(task.status);
      hapticImpactMedium();
    },
    [measureColumns]
  );

  const handleToggleStatus = useCallback(
    async (task: KanbanTask) => {
      const nextStatus = getNextTaskStatus(task.status);
      try {
        await onUpdateTask(task.id, nextStatus);
        hapticSelection();
      } catch {
        hapticError();
      }
    },
    [onUpdateTask]
  );

  const handleColumnLayout = (_columnId: Task['status']) => (_event: LayoutChangeEvent) => {
    measureColumns();
  };

  const renderColumn = (column: ColumnDef) => {
    const tasks = getTasksByStatus(column.id);
    const isDropTarget = draggingTask !== null && activeColumnId === column.id;

    return (
      <View
        key={column.id}
        ref={(ref) => {
          columnRefs.current.set(column.id, ref);
        }}
        onLayout={handleColumnLayout(column.id)}
        style={[
          styles.kanbanColumn,
          { width: columnWidth },
          isDropTarget && styles.kanbanColumnActive,
        ]}
      >
        <View style={[styles.kanbanHeader, { borderTopColor: column.color }]}>
          <Text style={styles.kanbanTitle}>{column.title}</Text>
          <View style={[styles.taskCount, { backgroundColor: column.color }]}>
            <Text style={styles.taskCountText}>{tasks.length}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.kanbanTasks}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!draggingTask}
        >
          {tasks.map((task) => (
            <KanbanTaskCard
              key={`${task.projectId}-${task.id}`}
              task={task}
              isDragging={draggingTask?.id === task.id}
              onPress={() => router.push(`/project/${task.projectId}` as never)}
              onToggleStatus={() => void handleToggleStatus(task)}
              onLongPress={startDrag}
            />
          ))}

          {column.id !== 'done' && (
            <Pressable
              style={({ pressed }) => [
                styles.addTaskButton,
                pressed && styles.addTaskPressed,
              ]}
              onPress={() => {
                if (projects.length > 0) {
                  onAddTask(projects[0].id, column.id);
                } else {
                  router.push('/add-project');
                }
              }}
            >
              <Plus size={16} color="#6B7280" />
              <Text style={styles.addTaskText}>{t('projects.addTask.title')}</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        style={styles.kanbanContainer}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.kanbanContent,
          isDesktop && { alignSelf: 'center', width: boardWidth },
          { paddingBottom: bottomPadding },
        ]}
        scrollEnabled={!draggingTask}
        onScrollEndDrag={measureColumns}
        onMomentumScrollEnd={measureColumns}
      >
        {columns.map(renderColumn)}
      </ScrollView>

      {draggingTask && (
        <View style={styles.dragOverlay} {...panResponder.panHandlers}>
          <View
            style={[
              styles.dragGhost,
              {
                left: dragPosition.x - 120,
                top: dragPosition.y - 36,
              },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.taskTitle} numberOfLines={2}>
              {draggingTask.title}
            </Text>
            <Text style={styles.taskProject} numberOfLines={1}>
              {draggingTask.projectTitle}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  kanbanContainer: {
    flex: 1,
  },
  kanbanContent: {
    paddingHorizontal: 16,
  },
  kanbanColumn: {
    marginRight: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  kanbanColumnActive: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  kanbanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  kanbanTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  taskCount: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taskCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  kanbanTasks: {
    maxHeight: 500,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  taskCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  taskCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  taskCardHidden: {
    opacity: 0.35,
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  taskCheckbox: {
    marginTop: 1,
  },
  taskTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  taskProject: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    marginLeft: 24,
  },
  taskDueDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 24,
  },
  taskOverdue: {
    color: '#EF4444',
    fontWeight: '500',
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addTaskPressed: {
    opacity: 0.8,
  },
  addTaskText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  dragOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  dragGhost: {
    position: 'absolute',
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#6366F1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});
