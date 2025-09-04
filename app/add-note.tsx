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
import { X, Bold, Italic, List, Link } from 'lucide-react-native';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/Button';

export default function AddNoteScreen() {
  const { addNote } = useAppStore();
  const [title, setTitle] = useState('');
  const [markdown, setMarkdown] = useState('');

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a note title.');
      return;
    }

    addNote({
      title: title.trim(),
      markdown: markdown.trim(),
      links: [], // TODO: Parse links from markdown
    });

    router.back();
  };

  const insertMarkdown = (syntax: string, placeholder: string = '') => {
    const newText = markdown + syntax.replace('{}', placeholder);
    setMarkdown(newText);
  };

  const markdownButtons = [
    {
      icon: <Bold size={18} color="#6B7280" />,
      onPress: () => insertMarkdown('**bold text**'),
    },
    {
      icon: <Italic size={18} color="#6B7280" />,
      onPress: () => insertMarkdown('*italic text*'),
    },
    {
      icon: <List size={18} color="#6B7280" />,
      onPress: () => insertMarkdown('\n- List item'),
    },
    {
      icon: <Link size={18} color="#6B7280" />,
      onPress: () => insertMarkdown('[link text](url)'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Add Note',
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
              <Text style={styles.label}>Note Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter note title..."
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Markdown Toolbar */}
            <View style={styles.toolbar}>
              {markdownButtons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.toolbarButton}
                  onPress={button.onPress}
                >
                  {button.icon}
                </TouchableOpacity>
              ))}
            </View>

            {/* Content */}
            <View style={styles.section}>
              <Text style={styles.label}>Content</Text>
              <TextInput
                style={[styles.input, styles.contentArea]}
                value={markdown}
                onChangeText={setMarkdown}
                placeholder="Write your note in markdown...

# Heading 1
## Heading 2

**Bold text**
*Italic text*

- List item 1
- List item 2

[Link text](url)"
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                You can use markdown syntax for formatting. Links to bookmarks and projects can be added later.
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
  toolbar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toolbarButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  contentArea: {
    height: 300,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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