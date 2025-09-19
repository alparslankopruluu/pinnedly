import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { List, Grid3X3, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { useProjectStore } from '@/providers/OfflineProvider';
import { FilterChips } from '@/components/ui/FilterChips';
import { ProjectCard } from '@/components/ProjectCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Project, Task } from '@/types';
import { isOverdue } from '@/utils/date';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ViewMode = 'list' | 'kanban';
type FilterOption = 'on-track' | 'at-risk' | 'overdue';

export default function ProjectsScreen() {
  const { projects, loading, error } = useProjectStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('on-track');


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

  const renderProject = ({ item }: { item: Project }) => (
    <ProjectCard
      project={item}
      onPress={() => router.push(`/project/${item.id}` as any)}
      onEdit={() => {
        console.log('Edit project:', item.id);
      }}
    />
  );

  const renderHeader = () => (
    <View>
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'list' && styles.activeToggle]}
          onPress={() => setViewMode('list')}
        >
          <List size={20} color={viewMode === 'list' ? '#EF4444' : '#6B7280'} />
          <Text style={[styles.toggleText, viewMode === 'list' && styles.activeToggleText]}>
            List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'kanban' && styles.activeToggle]}
          onPress={() => setViewMode('kanban')}
        >
          <Grid3X3 size={20} color={viewMode === 'kanban' ? '#EF4444' : '#6B7280'} />
          <Text style={[styles.toggleText, viewMode === 'kanban' && styles.activeToggleText]}>
            Kanban
          </Text>
        </TouchableOpacity>
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
    ];

    const getTasksByStatus = (status: 'todo' | 'in-progress' | 'done') => {
      const allTasks: (Task & { projectTitle: string })[] = [];
      filteredProjects.forEach(project => {
        project.tasks.forEach(task => {
          if (task.status === status) {
            allTasks.push({ ...task, projectTitle: project.title });
          }
        });
      });
      return allTasks;
    };

    const renderKanbanColumn = (column: { id: string; title: string; color: string }) => {
      const tasks = getTasksByStatus(column.id as 'todo' | 'in-progress' | 'done');
      
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
              <TouchableOpacity
                key={task.id}
                style={styles.taskCard}
                onPress={() => {
                  // Find the project this task belongs to
                  const project = filteredProjects.find(p => p.tasks.some(t => t.id === task.id));
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
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity 
              style={styles.addTaskButton}
              onPress={() => router.push('/add-project')}
            >
              <Plus size={16} color="#6B7280" />
              <Text style={styles.addTaskText}>Add Task</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    };

    return (
      <ScrollView 
        horizontal 
        style={styles.kanbanContainer}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kanbanContent}
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
          contentContainerStyle={filteredProjects.length === 0 ? styles.emptyContainer : styles.listContainer}
        />
      )}
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
    paddingBottom: 20,
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
});