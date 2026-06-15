import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { List, Grid3X3, Plus, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { useProjectStore } from '@/providers/OfflineProvider';
import { FilterChips } from '@/components/ui/FilterChips';
import { ProjectCard } from '@/components/ProjectCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Project, Task } from '@/types';
import { isOverdue } from '@/utils/date';

type ViewMode = 'list' | 'kanban';
type FilterOption = 'on-track' | 'at-risk' | 'overdue';

export default function ProjectsScreen() {
  const { projects, loading, error, addTask, deleteTask, updateTask } = useProjectStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('on-track');
  const insets = useSafeAreaInsets();

  // Inline task creation state
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskProjectId, setNewTaskProjectId] = useState<string | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<'todo' | 'in-progress' | 'done'>('todo');

  const getProjectStatus = (project: Project): FilterOption => {
    if (!project.deadline) return 'on-track';
    const daysUntilDeadline = Math.ceil((project.deadline - Date.now()) / (1000 * 60 * 60 * 24));
    if (isOverdue(project.deadline)) return 'overdue';
    if (daysUntilDeadline <= 7) return 'at-risk';
    return 'on-track';
  };

  const filteredProjects = projects.filter((project) => {
    const status = getProjectStatus(project);
    return selectedFilter === status;
  });

  const filterChips = [
    { id: 'on-track', label: 'On track', count: projects.filter(p => getProjectStatus(p) === 'on-track').length },
    { id: 'at-risk', label: 'At risk', count: projects.filter(p => getProjectStatus(p) === 'at-risk').length },
    { id: 'overdue', label: 'Overdue', count: projects.filter(p => getProjectStatus(p) === 'overdue').length },
  ];

  const openAddTaskModal = (projectId: string, status: 'todo' | 'in-progress' | 'done') => {
    setNewTaskProjectId(projectId);
    setNewTaskStatus(status);
    setNewTaskTitle('');
    setShowAddTaskModal(true);
  };

  const handleCreateTask = useCallback(async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Error', 'Please enter a task title.');
      return;
    }
    if (!newTaskProjectId) return;

    try {
      await addTask(newTaskProjectId, {
        title: newTaskTitle.trim(),
        status: newTaskStatus,
      });
      setShowAddTaskModal(false);
      setNewTaskTitle('');
      setNewTaskProjectId(null);
    } catch (err) {
      Alert.alert('Error', 'Failed to create task.');
    }
  }, [newTaskTitle, newTaskProjectId, newTaskStatus, addTask]);

  const renderProject = ({ item }: { item: Project }) => (
    <ProjectCard
      project={item}
      onPress={() => router.push(`/project/${item.id}` as any)}
      onEdit={() => console.log('Edit project:', item.id)}
    />
  );

  const renderHeader = () => (
    <View>
      <View style={styles.viewToggle}>
        <Pressable
          style={({ pressed }) => [
            styles.toggleButton,
            viewMode === 'list' && styles.activeToggle,
            pressed && styles.togglePressed
          ]}
          onPress={() => setViewMode('list')}
        >
          <List size={20} color={viewMode === 'list' ? '#EF4444' : '#6B7280'} />
          <Text style={[styles.toggleText, viewMode === 'list' && styles.activeToggleText]}>
            List
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.toggleButton,
            viewMode === 'kanban' && styles.activeToggle,
            pressed && styles.togglePressed
          ]}
          onPress={() => setViewMode('kanban')}
        >
          <Grid3X3 size={20} color={viewMode === 'kanban' ? '#EF4444' : '#6B7280'} />
          <Text style={[styles.toggleText, viewMode === 'kanban' && styles.activeToggleText]}>
            Kanban
          </Text>
        </Pressable>
      </View>
      <FilterChips
        chips={filterChips}
        selectedId={selectedFilter}
        onSelect={(id) => setSelectedFilter(id as FilterOption)}
      />
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      title="No Projects Yet"
      description="Get started by creating your first project."
      buttonTitle="Create New Project"
      onButtonPress={() => router.push('/add-project')}
    />
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading projects...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  const renderKanbanView = () => {
    const columns = [
      { id: 'todo', title: 'To Do', color: '#6B7280' },
      { id: 'in-progress', title: 'In Progress', color: '#F59E0B' },
      { id: 'done', title: 'Done', color: '#10B981' }
    ] as const;

    const getTasksByStatus = (status: 'todo' | 'in-progress' | 'done') => {
      const allTasks: (Task & { projectTitle: string; projectId: string })[] = [];
      filteredProjects.forEach(project => {
        project.tasks.forEach(task => {
          if (task.status === status) {
            allTasks.push({ ...task, projectTitle: project.title, projectId: project.id });
          }
        });
      });
      return allTasks;
    };

    const renderKanbanColumn = (column: typeof columns[number]) => {
      const tasks = getTasksByStatus(column.id);

      return (
        <View key={column.id} style={styles.kanbanColumn}>
          <View style={[styles.kanbanHeader, { borderTopColor: column.color }]}>
            <Text style={styles.kanbanTitle}>{column.title}</Text>
            <View style={[styles.taskCount, { backgroundColor: column.color }]}>
              <Text style={styles.taskCountText}>{tasks.length}</Text>
            </View>
          </View>

          <ScrollView style={styles.kanbanTasks} showsVerticalScrollIndicator={false}>
            {tasks.map((task) => (
              <Pressable
                key={task.id}
                style={({ pressed }) => [
                  styles.taskCard,
                  pressed && styles.taskCardPressed
                ]}
                onPress={() => {
                  const project = filteredProjects.find(p => p.id === task.projectId);
                  if (project) {
                    router.push(`/project/${project.id}` as any);
                  }
                }}
              >
                <Text style={styles.taskTitle} numberOfLines={2}>
                  {task.title}
                </Text>
                <Text style={styles.taskProject} numberOfLines={1}>
                  {task.projectTitle}
                </Text>
                {task.dueDate && (
                  <Text style={[
                    styles.taskDueDate,
                    isOverdue(task.dueDate) && styles.taskOverdue
                  ]}>
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </Text>
                )}
              </Pressable>
            ))}

            {/* Add task button per column */}
            {column.id !== 'done' && (
              <Pressable
                style={({ pressed }) => [
                  styles.addTaskButton,
                  pressed && styles.addTaskPressed
                ]}
                onPress={() => {
                  // For "To Do" and "In Progress" columns, add to the first project
                  // or let user pick from filtered projects
                  if (filteredProjects.length > 0) {
                    openAddTaskModal(filteredProjects[0].id, column.id);
                  } else {
                    router.push('/add-project');
                  }
                }}
              >
                <Plus size={16} color="#6B7280" />
                <Text style={styles.addTaskText}>Add Task</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      );
    };

    return (
      <ScrollView
        horizontal
        style={styles.kanbanContainer}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.kanbanContent, { paddingBottom: insets.bottom + 80 }]}
      >
        {columns.map(renderKanbanColumn)}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}

      {viewMode === 'kanban' ? (
        renderKanbanView()
      ) : (
        <FlatList
          data={filteredProjects}
          renderItem={renderProject}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            filteredProjects.length === 0 ? styles.emptyContainer : styles.listContainer,
            { paddingBottom: insets.bottom + 80 }
          ]}
        />
      )}

      {/* Inline Add Task Modal */}
      <Modal
        visible={showAddTaskModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddTaskModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowAddTaskModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Task</Text>
              <Pressable onPress={() => setShowAddTaskModal(false)}>
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>

            {/* Status selector */}
            <Text style={styles.modalLabel}>Status</Text>
            <View style={styles.statusSelector}>
              {(['todo', 'in-progress', 'done'] as const).map((status) => (
                <Pressable
                  key={status}
                  style={[
                    styles.statusOption,
                    newTaskStatus === status && styles.statusOptionActive
                  ]}
                  onPress={() => setNewTaskStatus(status)}
                >
                  <Text style={[
                    styles.statusOptionText,
                    newTaskStatus === status && styles.statusOptionTextActive
                  ]}>
                    {status === 'todo' ? 'To Do' : status === 'in-progress' ? 'In Progress' : 'Done'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Project selector */}
            <Text style={styles.modalLabel}>Project</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectSelector}>
              {filteredProjects.map((project) => (
                <Pressable
                  key={project.id}
                  style={[
                    styles.projectOption,
                    newTaskProjectId === project.id && styles.projectOptionActive
                  ]}
                  onPress={() => setNewTaskProjectId(project.id)}
                >
                  <Text style={[
                    styles.projectOptionText,
                    newTaskProjectId === project.id && styles.projectOptionTextActive
                  ]} numberOfLines={1}>
                    {project.title}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Task Title</Text>
            <TextInput
              style={styles.modalInput}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              placeholder="Enter task title..."
              placeholderTextColor="#9CA3AF"
              autoFocus
              onSubmitEditing={handleCreateTask}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setShowAddTaskModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Button title="Create Task" onPress={handleCreateTask} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContainer: {
    padding: 16,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeToggle: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
  },
  activeToggleText: {
    color: '#EF4444',
  },
  emptyContainer: {
    flexGrow: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  // Kanban styles
  kanbanContainer: {
    flex: 1,
  },
  kanbanContent: {
    paddingHorizontal: 16,
  },
  kanbanColumn: {
    width: 280,
    marginRight: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  taskProject: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  taskDueDate: {
    fontSize: 11,
    color: '#9CA3AF',
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
  addTaskText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  togglePressed: {
    opacity: 0.8,
  },
  taskCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  addTaskPressed: {
    opacity: 0.8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
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
    color: '#111827',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 4,
  },
  statusSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  statusOptionActive: {
    backgroundColor: '#FEE2E2',
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  statusOptionTextActive: {
    color: '#EF4444',
    fontWeight: '600',
  },
  projectSelector: {
    marginBottom: 16,
    maxHeight: 44,
  },
  projectOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  projectOptionActive: {
    backgroundColor: '#FEE2E2',
  },
  projectOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  projectOptionTextActive: {
    color: '#EF4444',
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});
