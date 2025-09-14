import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { List, Grid3X3 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';
import { FilterChips } from '@/components/ui/FilterChips';
import { ProjectCard } from '@/components/ProjectCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Project } from '@/types';
import { isOverdue } from '@/utils/date';

type ViewMode = 'list' | 'kanban';
type FilterOption = 'on-track' | 'at-risk' | 'overdue';

export default function ProjectsScreen() {
  const { projects } = useAppStore();
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

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredProjects}
        renderItem={renderProject}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={filteredProjects.length === 0 ? styles.emptyContainer : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
});