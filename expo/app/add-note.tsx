import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Pressable, 
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { X, Lock, Globe, Users } from 'lucide-react-native';
import { useNoteStore } from '@/providers/OfflineProvider';
import { Button } from '@/components/ui/Button';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Visibility } from '@/types';

const visibilityOptions: { value: Visibility; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  { 
    value: 'private', 
    label: 'Private', 
    description: 'Only you can see this note',
    icon: <Lock size={20} color="#6B7280" />,
    color: '#6B7280'
  },
  { 
    value: 'shared', 
    label: 'Shared', 
    description: 'Share with specific people',
    icon: <Users size={20} color="#6366F1" />,
    color: '#6366F1'
  },
  { 
    value: 'public', 
    label: 'Public', 
    description: 'Anyone can view this note',
    icon: <Globe size={20} color="#10B981" />,
    color: '#10B981'
  },
];

export default function AddNoteScreen() {
  const { createNote } = useNoteStore();
  const [title, setTitle] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a note title.');
      return;
    }

    try {
      await createNote({
        title: title.trim(),
        markdown: markdown.trim(),
        visibility,
      });
    } catch (err) {
      console.error('Failed to create note:', err);
      Alert.alert('Error', 'Failed to create note. Please try again.');
      return;
    }

    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Add Note',
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <X size={24} color="#111827" />
            </Pressable>
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
              <Text style={styles.label}>Note Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter note title..."
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Visibility Selector */}
            <View style={styles.section}>
              <Text style={styles.label}>Visibility</Text>
              <View style={styles.visibilityGrid}>
                {visibilityOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    style={({ pressed }) => [
                      styles.visibilityCard,
                      visibility === option.value && styles.visibilityCardActive,
                      { borderColor: visibility === option.value ? option.color : '#E5E7EB' },
                      pressed && styles.visibilityCardPressed
                    ]}
                    onPress={() => setVisibility(option.value)}
                  >
                    <View style={[
                      styles.visibilityIconContainer,
                      { backgroundColor: visibility === option.value ? option.color + '15' : '#F3F4F6' }
                    ]}>
                      {option.icon}
                    </View>
                    <Text style={[
                      styles.visibilityLabel,
                      visibility === option.value && { color: option.color, fontWeight: '600' }
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.visibilityDescription}>
                      {option.description}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Content */}
            <View style={styles.section}>
              <Text style={styles.label}>Content</Text>
              <RichTextEditor
                value={markdown}
                onChangeText={(text, md) => setMarkdown(md)}
                placeholder="Write your note..."
                autoFocus={false}
              />
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Select text and use the toolbar to apply formatting. The text appears styled as you type.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <Button
            title="Create Note"
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
  visibilityGrid: {
    gap: 8,
  },
  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    gap: 12,
  },
  visibilityCardActive: {
    backgroundColor: '#F9FAFB',
  },
  visibilityCardPressed: {
    opacity: 0.8,
  },
  visibilityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  visibilityDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    flex: 1,
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
