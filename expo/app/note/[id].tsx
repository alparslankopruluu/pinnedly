import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { 
  Edit3, 
  Share2, 
  Trash2, 
  Users, 
  Save, 
  X,
  Calendar,
  User
} from 'lucide-react-native';
import { useAppStore } from '@/store/useAppStore';
import { ShareModal } from '@/components/ShareModal';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams();
  const { notes, updateNote, deleteNote } = useAppStore();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [editedContent, setEditedContent] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  const note = notes.find(n => n.id === id);

  useEffect(() => {
    if (note) {
      setEditedTitle(note.title);
      setEditedContent(note.markdown);
    }
  }, [note]);

  const handleSave = () => {
    if (!note) return;
    
    if (!editedTitle.trim()) {
      Alert.alert('Error', 'Note title cannot be empty');
      return;
    }

    updateNote(note.id, {
      title: editedTitle.trim(),
      markdown: editedContent.trim(),
      updatedAt: Date.now()
    });
    
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (note) {
      setEditedTitle(note.title);
      setEditedContent(note.markdown);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!note) return;
    
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteNote(note.id);
            router.back();
          },
        },
      ]
    );
  };

  if (!note) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Note not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: isEditing ? 'Edit Note' : note.title,
          headerRight: () => (
            <View style={styles.headerActions}>
              {isEditing ? (
                <>
                  <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
                    <X size={20} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
                    <Save size={20} color="#EF4444" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.headerButton}>
                    <Edit3 size={20} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowShareModal(true)} style={styles.headerButton}>
                    <Share2 size={20} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
                    <Trash2 size={20} color="#EF4444" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          ),
        }}
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.titleInput}
                value={editedTitle}
                onChangeText={setEditedTitle}
                placeholder="Note title"
                multiline
              />
              <TextInput
                style={styles.contentInput}
                value={editedContent}
                onChangeText={setEditedContent}
                placeholder="Write your note here..."
                multiline
                textAlignVertical="top"
              />
            </View>
          ) : (
            <View style={styles.content}>
              <Text style={styles.title}>{note.title}</Text>
              
              <View style={styles.metadata}>
                <View style={styles.metadataItem}>
                  <Calendar size={16} color="#6B7280" />
                  <Text style={styles.metadataText}>
                    Created {new Date(note.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {note.updatedAt && note.updatedAt !== note.createdAt && (
                  <View style={styles.metadataItem}>
                    <Edit3 size={16} color="#6B7280" />
                    <Text style={styles.metadataText}>
                      Updated {new Date(note.updatedAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                <View style={styles.metadataItem}>
                  <User size={16} color="#6B7280" />
                  <Text style={styles.metadataText}>You</Text>
                </View>
              </View>

              <View style={styles.contentContainer}>
                <Text style={styles.noteContent}>{note.markdown}</Text>
              </View>

              {/* Collaboration Section */}
              <View style={styles.collaborationSection}>
                <View style={styles.sectionHeader}>
                  <Users size={20} color="#6B7280" />
                  <Text style={styles.sectionTitle}>Shared with</Text>
                </View>
                <TouchableOpacity 
                  style={styles.addMemberButton}
                  onPress={() => setShowShareModal(true)}
                >
                  <Text style={styles.addMemberText}>Add people</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Share Modal */}
        <ShareModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          entityType="note"
          entityId={note.id}
          entityTitle={note.title}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    lineHeight: 36,
  },
  metadata: {
    marginBottom: 24,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  contentContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  noteContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },
  collaborationSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  addMemberButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addMemberText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  editContainer: {
    padding: 20,
  },
  titleInput: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 60,
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 300,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});