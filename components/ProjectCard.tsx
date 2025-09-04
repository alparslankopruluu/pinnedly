import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Project } from '@/types';
import { ProgressRing } from './ui/ProgressRing';
import { formatRelativeTime, isOverdue, isDueToday } from '@/utils/date';

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
}

export function ProjectCard({ project, onPress }: ProjectCardProps) {
  const completedTasks = project.tasks.filter((task) => task.status === 'done').length;
  const totalTasks = project.tasks.length;
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;

  const getDeadlineChip = () => {
    if (!project.deadline) return null;

    const isOverdueTask = isOverdue(project.deadline);
    const isDueTodayTask = isDueToday(project.deadline);

    let chipStyle = styles.deadlineChipGreen;
    let text = formatRelativeTime(project.deadline);

    if (isOverdueTask) {
      chipStyle = styles.deadlineChipRed;
      text = 'Overdue';
    } else if (isDueTodayTask) {
      chipStyle = styles.deadlineChipAmber;
      text = 'Due Today';
    } else {
      const daysLeft = Math.ceil((project.deadline - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7) {
        chipStyle = styles.deadlineChipAmber;
        text = `${daysLeft} days left`;
      } else if (daysLeft <= 30) {
        text = `${Math.ceil(daysLeft / 7)} weeks left`;
      } else {
        text = `${Math.ceil(daysLeft / 30)} months left`;
      }
    }

    return (
      <View style={chipStyle}>
        <Text style={styles.deadlineText}>{text}</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
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
              {completedTasks}/{totalTasks} tasks done
            </Text>
          </View>
          
          <ProgressRing progress={progress} />
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