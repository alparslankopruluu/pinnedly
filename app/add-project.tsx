import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { X, Calendar } from 'lucide-react-native';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/Button';

export default function AddProjectScreen() {
  const { addProject } = useAppStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a project title.');
      return;
    }

    addProject({
      title: title.trim(),
      description: description.trim() || undefined,
      deadline: deadline?.getTime(),
    });

    router.back();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const setQuickDeadline = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setDeadline(date);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Add Project',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <X size={24} color="#111827" />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Title */}
            <View style={styles.section}>
              <Text style={styles.label}>Project Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter project title..."
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your project..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Deadline */}
            <View style={styles.section}>
              <Text style={styles.label}>Deadline (optional)</Text>
              
              {deadline ? (
                <View style={styles.deadlineContainer}>
                  <View style={styles.deadlineInfo}>
                    <Calendar size={20} color="#EF4444" />
                    <Text style={styles.deadlineText}>{formatDate(deadline)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setDeadline(null)}
                  >
                    <X size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.quickDeadlines}>
                  <TouchableOpacity
                    style={styles.quickDeadlineButton}
                    onPress={() => setQuickDeadline(7)}
                  >
                    <Text style={styles.quickDeadlineText}>1 week</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickDeadlineButton}
                    onPress={() => setQuickDeadline(30)}
                  >
                    <Text style={styles.quickDeadlineText}>1 month</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickDeadlineButton}
                    onPress={() => setQuickDeadline(90)}
                  >
                    <Text style={styles.quickDeadlineText}>3 months</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                You can add tasks and track progress after creating the project.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <Button
            title="Create Project"
            onPress={handleSave}
            style={styles.saveButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  deadlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineText: {
    fontSize: 16,
    color: '#111827',
    marginLeft: 8,
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  quickDeadlines: {
    flexDirection: 'row',
    gap: 8,
  },
  quickDeadlineButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickDeadlineText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  saveButton: {
    width: '100%',
  },
});