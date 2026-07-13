import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
} from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFabBottomOffset, getScrollBottomPadding } from '@/utils/layout';
import { Check, Circle, Plus, Search, Trash2, Flag, ChevronRight, ListTodo } from '@/components/icons/lucide';
import { router } from 'expo-router';
import { useTodoStore, PriorityFilter, StatusFilter } from '@/store/useTodoStore';
import { TodoItem, ID } from '@/types';
import { isOverdue } from '@/utils/date';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { EntityReminderBell } from '@/components/ui/EntityReminderBell';

const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#6B7280',
};

function TodoRow({
  todo,
  onToggle,
  onDelete,
  onPress,
}: {
  todo: TodoItem;
  onToggle: (id: ID) => void;
  onDelete: (id: ID) => void;
  onPress: (id: ID) => void;
}) {
  const { t } = useTranslation();
  const priorityColor = PRIORITY_COLORS[todo.priority] || '#6B7280';
  const isOverdueTask = todo.dueDate && !todo.completed && isOverdue(todo.dueDate);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.todoRow,
        todo.completed && styles.todoRowCompleted,
        pressed && styles.todoRowPressed,
      ]}
      onPress={() => onPress(todo.id)}
      accessibilityRole="button"
      accessibilityLabel={`${todo.title}. ${t(`todos.filters.${todo.priority}`)}${todo.completed ? `. ${t('common.done')}` : ''}`}
      accessibilityHint={t('accessibility.openTodo')}
      accessibilityActions={[
        { name: 'activate', label: t('accessibility.openTodo') },
        { name: 'toggle', label: t('accessibility.toggleTodo') },
        { name: 'delete', label: t('common.delete') },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'activate') onPress(todo.id);
        if (event.nativeEvent.actionName === 'toggle') onToggle(todo.id);
        if (event.nativeEvent.actionName === 'delete') onDelete(todo.id);
      }}
    >
      {/* Checkbox */}
      <Pressable
        style={({ pressed }) => [
          styles.checkbox,
          { borderColor: todo.completed ? '#10B981' : '#D1D5DB' },
          todo.completed && styles.checkboxChecked,
          pressed && styles.checkboxPressed,
        ]}
        onPress={() => onToggle(todo.id)}
        hitSlop={8}
      >
        {todo.completed && <Check size={14} color="#fff" />}
      </Pressable>

      {/* Content */}
      <View style={styles.todoContent}>
        <Text
          style={[styles.todoTitle, todo.completed && styles.todoTitleCompleted]}
          numberOfLines={2}
        >
          {todo.title}
        </Text>
        {todo.description ? (
          <Text style={styles.todoDescription} numberOfLines={1}>
            {todo.description}
          </Text>
        ) : null}
        <View style={styles.todoMeta}>
          <CategoryBadge category={todo.category} compact />
          {/* Priority badge */}
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '18' }]}>
            <Flag size={10} color={priorityColor} />
            <Text style={[styles.priorityLabel, { color: priorityColor }]}>
              {t(`todos.filters.${todo.priority}`)}
            </Text>
          </View>
          {/* Due date */}
          {todo.dueDate ? (
            <Text style={[styles.dueDate, !!isOverdueTask && styles.dueDateOverdue]}>
              {isOverdueTask ? t('todos.overduePrefix') : t('todos.due')}
              {new Date(todo.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          ) : null}
          {/* Linked label */}
          {todo.projectId ? (
            <View style={styles.linkBadge}>
              <ChevronRight size={10} color="#9CA3AF" />
              <Text style={styles.linkLabel}>{t('todos.project')}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <EntityReminderBell
        entityType="todo"
        entityId={todo.id}
        title={todo.title}
        createdAt={todo.createdAt}
        schedule={todo.reminderSchedule}
        size={16}
      />

      {/* Delete button */}
      <Pressable
        style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
        onPress={() => {
          showAppAlert(t('todos.deleteConfirm.title'), t('todos.deleteConfirm.message'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.delete'), style: 'destructive', onPress: () => onDelete(todo.id) },
          ]);
        }}
        hitSlop={8}
      >
        <Trash2 size={16} color="#9CA3AF" />
      </Pressable>
    </Pressable>
  );
}

export default function TodosScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    todos,
    loading,
    error,
    priorityFilter,
    statusFilter,
    searchQuery,
    counts,
    setPriorityFilter,
    setStatusFilter,
    setSearchQuery,
    toggleTodo,
    deleteTodo,
  } = useTodoStore();

  const handlePress = useCallback((id: ID) => {
    router.push(`/add-todo?id=${id}` as any);
  }, []);

  const renderTodo = useCallback(
    ({ item }: { item: TodoItem }) => (
      <TodoRow
        todo={item}
        onToggle={toggleTodo}
        onDelete={deleteTodo}
        onPress={handlePress}
      />
    ),
    [toggleTodo, deleteTodo, handlePress]
  );

  const renderHeader = () => (
    <View>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('todos.searchPlaceholder')}
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Status filter chips */}
      <View style={styles.filterRow}>
        {([
          { id: 'active' as StatusFilter, label: t('todos.filters.active'), count: counts.active },
          { id: 'completed' as StatusFilter, label: t('todos.filters.done'), count: counts.completed },
          { id: 'all' as StatusFilter, label: t('todos.filters.all'), count: counts.total },
        ]).map((filter) => (
          <Pressable
            key={filter.id}
            style={({ pressed }) => [
              styles.filterChip,
              statusFilter === filter.id && styles.filterChipActive,
              pressed && styles.filterChipPressed,
            ]}
            onPress={() => setStatusFilter(filter.id)}
          >
            <Text style={[styles.filterChipText, statusFilter === filter.id && styles.filterChipTextActive]}>
              {filter.label}
            </Text>
            <View style={[styles.filterCount, statusFilter === filter.id && styles.filterCountActive]}>
              <Text style={[styles.filterCountText, statusFilter === filter.id && styles.filterCountTextActive]}>
                {filter.count}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Priority filter chips */}
      <View style={styles.filterRow}>
        {([
          { id: 'all' as PriorityFilter, label: t('todos.filters.allPriorities') },
          { id: 'high' as PriorityFilter, label: t('todos.filters.high'), count: counts.high },
          { id: 'medium' as PriorityFilter, label: t('todos.filters.medium') },
          { id: 'low' as PriorityFilter, label: t('todos.filters.low') },
        ]).map((filter) => (
          <Pressable
            key={filter.id}
            style={({ pressed }) => [
              styles.priorityChip,
              priorityFilter === filter.id && styles.priorityChipActive,
              pressed && styles.filterChipPressed,
            ]}
            onPress={() => setPriorityFilter(filter.id)}
          >
            {filter.id !== 'all' && (
              <Circle
                size={6}
                color={priorityFilter === filter.id ? '#fff' : PRIORITY_COLORS[filter.id]}
                fill={priorityFilter === filter.id ? '#fff' : PRIORITY_COLORS[filter.id]}
              />
            )}
            <Text style={[styles.priorityChipText, priorityFilter === filter.id && styles.priorityChipTextActive]}>
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <ListTodo size={48} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>{t('todos.empty.title')}</Text>
      <Text style={styles.emptyDescription}>
        {t('todos.emptyDescriptionLong')}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>{t('todos.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{t('common.errorWithMessage', { message: error })}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={todos}
        renderItem={renderTodo}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          todos.length === 0 && styles.emptyListContent,
          { paddingBottom: getScrollBottomPadding(insets.bottom) },
        ]}
      />

      {/* FAB for adding new todo */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: getFabBottomOffset(insets.bottom) },
          pressed && styles.fabPressed,
        ]}
        onPress={() => router.push('/add-todo' as any)}
      >
        <Plus size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flexGrow: 1,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#111827',
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  filterChipPressed: {
    opacity: 0.8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterCountTextActive: {
    color: '#fff',
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  priorityChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  priorityChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  priorityChipTextActive: {
    color: '#fff',
  },

  // Todo Row
  todoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  todoRowCompleted: {
    opacity: 0.6,
  },
  todoRowPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkboxPressed: {
    opacity: 0.7,
  },
  todoContent: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 22,
  },
  todoTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  todoDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  todoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  priorityLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  dueDate: {
    fontSize: 11,
    color: '#6B7280',
  },
  dueDateOverdue: {
    color: '#EF4444',
    fontWeight: '600',
  },
  linkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    gap: 2,
  },
  linkLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
    marginTop: 1,
    borderRadius: 8,
  },
  deleteButtonPressed: {
    backgroundColor: '#FEE2E2',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
});
