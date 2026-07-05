import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
import { useNoteStore } from '@/providers/OfflineProvider';
import { ShareModal } from '@/components/ShareModal';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { MarkdownContent } from '@/components/ui/MarkdownContent';

export default function NoteDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const noteId = Array.isArray(id) ? id[0] : id;
  const { notes, loading, updateNote, deleteNote } = useNoteStore();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [editedContent, setEditedContent] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  const note = useMemo(
    () => notes.find((item) => item.id === noteId),
    [notes, noteId]
  );

  useEffect(() => {
    if (note) {
      setEditedTitle(note.title);
      setEditedContent(note.markdown);
    }
  }, [note]);

  const handleSave = async () => {
    if (!note) return;
    
    if (!editedTitle.trim()) {
      showAppAlert(t('common.error'), t('noteDetail.alerts.titleEmpty'), undefined, { variant: 'error' });
      return;
    }

    try {
      await updateNote(note.id, {
        title: editedTitle.trim(),
        markdown: editedContent.trim(),
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update note:', err);
      showAppAlert(t('common.error'), t('noteDetail.alerts.updateFailed', { defaultValue: 'Failed to update note' }), undefined, { variant: 'error' });
    }
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
    
    showAppAlert(
      t('noteDetail.deleteTitle'),
      t('noteDetail.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNote(note.id);
              router.back();
            } catch (err) {
              console.error('Failed to delete note:', err);
              showAppAlert(t('common.error'), t('noteDetail.alerts.deleteFailed', { defaultValue: 'Failed to delete note' }), undefined, { variant: 'error' });
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: t('noteDetail.loading', { defaultValue: 'Note' }) }} />
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <ActivityIndicator size="large" color="#EF4444" />
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!note) {
    return (
      <>
        <Stack.Screen options={{ title: t('noteDetail.notFound') }} />
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{t('noteDetail.notFound')}</Text>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>{t('common.back')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: isEditing ? t('noteDetail.editNote') : note.title,
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
                placeholder={t('noteDetail.titlePlaceholder')}
                multiline
              />
              <RichTextEditor
                value={editedContent}
                onChangeText={(_text, md) => setEditedContent(md)}
                placeholder={t('noteDetail.contentPlaceholder')}
                toolbarHint={t('addNote.toolbarHint')}
              />
            </View>
          ) : (
            <View style={styles.content}>
              <Text style={styles.title}>{note.title}</Text>
              
              <View style={styles.metadata}>
                <View style={styles.metadataItem}>
                  <Calendar size={16} color="#6B7280" />
                  <Text style={styles.metadataText}>
                    {t('noteDetail.created', { date: new Date(note.createdAt).toLocaleDateString() })}
                  </Text>
                </View>
                {note.updatedAt && note.updatedAt !== note.createdAt && (
                  <View style={styles.metadataItem}>
                    <Edit3 size={16} color="#6B7280" />
                    <Text style={styles.metadataText}>
                      {t('noteDetail.updated', { date: new Date(note.updatedAt).toLocaleDateString() })}
                    </Text>
                  </View>
                )}
                <View style={styles.metadataItem}>
                  <User size={16} color="#6B7280" />
                  <Text style={styles.metadataText}>{t('noteDetail.you')}</Text>
                </View>
              </View>

              <View style={styles.contentContainer}>
                <MarkdownContent value={note.markdown} />
              </View>

              {/* Collaboration Section */}
              <View style={styles.collaborationSection}>
                <View style={styles.sectionHeader}>
                  <Users size={20} color="#6B7280" />
                  <Text style={styles.sectionTitle}>{t('noteDetail.sharedWith')}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.addMemberButton}
                  onPress={() => setShowShareModal(true)}
                >
                  <Text style={styles.addMemberText}>{t('noteDetail.addPeople')}</Text>
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