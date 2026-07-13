import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated } from 'react-native';
import { Project } from '@/types';
import { ProgressRing } from './ui/ProgressRing';
import { formatRelativeTime, isOverdue, isDueToday } from '@/utils/date';
import { Edit3 } from '@/components/icons/lucide';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from '@/hooks/useAccessibilityPreferences';

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
  onEdit?: () => void;
}

export function ProjectCard({ project, onPress, onEdit }: ProjectCardProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const completedTasks = project.tasks.filter((task) => task.status === 'done').length;
  const totalTasks = project.tasks.length;
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const scaleAnim = new Animated.Value(1);

  const handleEditPress = () => {
    if (reduceMotion) {
      onEdit?.();
      return;
    }
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onEdit?.();
  };

  const getDeadlineChip = () => {
    if (!project.deadline) return null;

    const isOverdueTask = isOverdue(project.deadline);
    const isDueTodayTask = isDueToday(project.deadline);

    let chipStyle = styles.deadlineChipGreen;
    let text = formatRelativeTime(project.deadline);

    if (isOverdueTask) {
      chipStyle = styles.deadlineChipRed;
      text = t('projectCard.overdue');
    } else if (isDueTodayTask) {
      chipStyle = styles.deadlineChipAmber;
      text = t('projectCard.dueToday');
    } else {
      const daysLeft = Math.ceil((project.deadline - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7) {
        chipStyle = styles.deadlineChipAmber;
        text = t('projectCard.daysLeft', { count: daysLeft });
      } else if (daysLeft <= 30) {
        text = t('projectCard.weeksLeft', { count: Math.ceil(daysLeft / 7) });
      } else {
        text = t('projectCard.monthsLeft', { count: Math.ceil(daysLeft / 30) });
      }
    }

    return (
      <View style={chipStyle}>
        <Text style={styles.deadlineText}>{text}</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${project.title}, ${t('projectCard.tasksDone', { completed: completedTasks, total: totalTasks })}`}
      accessibilityHint={t('accessibility.openProject')}
    >
      {project.coverImage && (
        <Image
          source={{ uri: project.coverImage }}
          style={styles.coverImage}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {project.title}
            </Text>
            <Text style={styles.taskCount}>
              {t('projectCard.tasksDone', { completed: completedTasks, total: totalTasks })}
            </Text>
          </View>
          
          <View style={styles.headerRight}>
            <ProgressRing progress={progress} />
            {onEdit && (
              <Animated.View style={[styles.editButtonContainer, { transform: [{ scale: scaleAnim }] }]}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={handleEditPress}
                  hitSlop={styles.editButtonHitSlop}
                  accessibilityRole="button"
                  accessibilityLabel={t('accessibility.editProject', { title: project.title })}
                >
                  <Edit3 size={16} color="#6366F1" />
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </View>
        
        {project.description && (
          <Text style={styles.description} numberOfLines={2}>
            {project.description}
          </Text>
        )}
        
        <View style={styles.footer}>
          {getDeadlineChip()}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: 120,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButtonContainer: {
    // Container for animated transform
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  editButtonHitSlop: {
    top: 8,
    bottom: 8,
    left: 8,
    right: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  taskCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  deadlineChipGreen: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  deadlineChipAmber: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  deadlineChipRed: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
});
