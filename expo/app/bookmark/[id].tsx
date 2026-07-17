import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ExternalLink,
  Check,
  Archive,
  Trash2,
  Edit3,
  Link2,
  Camera,
  Plus,
  Folder,
} from '@/components/icons/lucide';
import { EntityReminderBell } from '@/components/ui/EntityReminderBell';
import { useBookmarkStore } from '@/providers/OfflineProvider';
import { Button } from '@/components/ui/Button';
import { getSourceLabel } from '@/utils/bookmark';
import { formatRelativeTime } from '@/utils/date';
import { BookmarkAttachment, BookmarkStatus } from '@/types';
import { useTrackContentOpen } from '@/hooks/useTrackContentOpen';
import { bookmarkRepository } from '@/repositories/BookmarkRepository';
import { useAuth } from '@/store/useAuthStore';
import { useBookmarkLists } from '@/store/useBookmarkListStore';
import {
  BOOKMARK_TAG_SUGGESTIONS,
  getBookmarkTagTranslationKey,
  normalizeBookmarkTag,
} from '@/constants/bookmarkTags';
import { deleteStoredFile, uploadBookmarkImage } from '@/lib/storage';

type AttachmentType = BookmarkAttachment['type'];

type SelectedAttachmentImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function BookmarkDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookmarkId = Array.isArray(id) ? id[0] : id;
  useTrackContentOpen('bookmark', bookmarkId);
  const { user } = useAuth();
  const { bookmarks, openBookmark, updateBookmark, deleteBookmark } = useBookmarkStore();
  const {
    myLists,
    addBookmarkToList,
    removeBookmarkFromList,
    isUpdatingMembership,
  } = useBookmarkLists();
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [personalNote, setPersonalNote] = useState('');
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [isAddingAttachment, setIsAddingAttachment] = useState(false);
  const [attachmentType, setAttachmentType] = useState<AttachmentType>('link');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentTitle, setAttachmentTitle] = useState('');
  const [selectedAttachmentImage, setSelectedAttachmentImage] = useState<SelectedAttachmentImage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [listMemberships, setListMemberships] = useState<Set<string>>(new Set());
  const [sharedBookmark, setSharedBookmark] = useState<Awaited<ReturnType<typeof bookmarkRepository.getById>>>(null);
  const [isLoadingSharedBookmark, setIsLoadingSharedBookmark] = useState(false);

  const storeBookmark = useMemo(
    () => bookmarks.find((item) => item.id === bookmarkId),
    [bookmarks, bookmarkId]
  );
  const bookmark = storeBookmark ?? sharedBookmark;
  const tagOptions = useMemo(() => {
    const generalTags = BOOKMARK_TAG_SUGGESTIONS.map((suggestion) => suggestion.value);
    const bookmarkTags = bookmark?.tagNames.map(normalizeBookmarkTag) ?? [];
    return [...new Set([...generalTags, ...bookmarkTags, ...editedTags])];
  }, [bookmark?.tagNames, editedTags]);

  useEffect(() => {
    if (!bookmarkId) return;
    setListMemberships(
      new Set(
        myLists
          .filter((list) => list.bookmarkIds.includes(bookmarkId))
          .map((list) => list.id)
      )
    );
  }, [bookmarkId, myLists]);

  useEffect(() => {
    let isMounted = true;

    if (!bookmarkId || storeBookmark) {
      setSharedBookmark(null);
      setIsLoadingSharedBookmark(false);
      return () => {
        isMounted = false;
      };
    }

    setIsLoadingSharedBookmark(true);
    bookmarkRepository
      .getById(bookmarkId)
      .then((result) => {
        if (isMounted) setSharedBookmark(result);
      })
      .catch((error) => {
        console.warn(`Failed to load shared bookmark ${bookmarkId}:`, error);
        if (isMounted) setSharedBookmark(null);
      })
      .finally(() => {
        if (isMounted) setIsLoadingSharedBookmark(false);
      });

    return () => {
      isMounted = false;
    };
  }, [bookmarkId, storeBookmark]);

  if (!bookmark && isLoadingSharedBookmark) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
        </View>
      </SafeAreaView>
    );
  }

  if (!bookmark) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.missingText}>{t('bookmarkDetail.notFound')}</Text>
      </SafeAreaView>
    );
  }

  const handleOpenUrl = async () => {
    if (!bookmark.url) {
      showAppAlert(t('bookmarkDetail.noUrl'), t('bookmarkDetail.noLinkToOpen'));
      return;
    }
    try {
      const updated = await openBookmark(bookmark.id);
      if (updated) setSharedBookmark(updated);
    } catch (error) {
      console.warn(`Failed to update bookmark open count ${bookmark.id}:`, error);
    }
    await Linking.openURL(bookmark.url);
  };

  const handleStatusChange = async (status: BookmarkStatus) => {
    const updates = {
      status,
      readAt: status === 'done' ? Date.now() : bookmark.readAt,
    };
    await updateBookmark(bookmark.id, updates);
    setSharedBookmark((current) => current ? { ...current, ...updates } : current);
  };

  const handleSaveNote = async () => {
    try {
      setIsSaving(true);
      const updates = { personalNote: personalNote.trim() };
      await updateBookmark(bookmark.id, updates);
      setSharedBookmark((current) => current ? { ...current, ...updates } : current);
      setIsEditingNote(false);
    } catch (error) {
      showAppAlert(t('common.error'), error instanceof Error ? error.message : t('bookmarkDetail.updateFailed'), undefined, { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const startEditingTags = () => {
    setEditedTags(bookmark.tagNames);
    setTagDraft('');
    setIsEditingTags(true);
  };

  const addTag = () => {
    const normalized = normalizeBookmarkTag(tagDraft);
    if (normalized && !editedTags.includes(normalized)) {
      setEditedTags((current) => [...current, normalized]);
    }
    setTagDraft('');
  };

  const toggleEditedTag = (tag: string) => {
    const normalized = normalizeBookmarkTag(tag);
    setEditedTags((current) =>
      current.includes(normalized)
        ? current.filter((item) => item !== normalized)
        : [...current, normalized]
    );
  };

  const saveTags = async () => {
    try {
      setIsSaving(true);
      await updateBookmark(bookmark.id, { tagNames: editedTags });
      setSharedBookmark((current) => current ? { ...current, tagNames: editedTags } : current);
      setIsEditingTags(false);
    } catch (error) {
      showAppAlert(t('common.error'), error instanceof Error ? error.message : t('bookmarkDetail.updateFailed'), undefined, { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const resetAttachmentEditor = () => {
    setAttachmentUrl('');
    setAttachmentTitle('');
    setSelectedAttachmentImage(null);
    setAttachmentType('link');
    setIsAddingAttachment(false);
  };

  const selectAttachmentType = (type: AttachmentType) => {
    setAttachmentType(type);
    setAttachmentUrl('');
    setSelectedAttachmentImage(null);
  };

  const pickAttachmentImage = async () => {
    const ImagePicker = await import('expo-image-picker');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAppAlert(
        t('bookmarkDetail.attachments.permissionTitle'),
        t('bookmarkDetail.attachments.permissionMessage')
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.82,
    });
    if (!result.canceled) {
      const image = result.assets[0];
      setSelectedAttachmentImage({
        uri: image.uri,
        fileName: image.fileName,
        mimeType: image.mimeType,
      });
      if (!attachmentTitle.trim() && image.fileName) {
        setAttachmentTitle(image.fileName.replace(/\.[^.]+$/, ''));
      }
    }
  };

  const saveAttachment = async () => {
    const attachmentId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let attachment: BookmarkAttachment;
    let uploadedStoragePath: string | undefined;

    try {
      setIsSaving(true);
      if (attachmentType === 'image') {
        if (!selectedAttachmentImage || !user?.id) {
          showAppAlert(t('common.error'), t('bookmarkDetail.attachments.chooseImageFirst'), undefined, { variant: 'error' });
          return;
        }
        const storedImage = await uploadBookmarkImage({
          ownerId: user.id,
          bookmarkId: bookmark.id,
          attachmentId,
          localUri: selectedAttachmentImage.uri,
          fileName: selectedAttachmentImage.fileName,
          mimeType: selectedAttachmentImage.mimeType,
        });
        attachment = {
          id: attachmentId,
          type: 'image',
          url: storedImage.url,
          storagePath: storedImage.storagePath,
          ...(attachmentTitle.trim() ? { title: attachmentTitle.trim() } : {}),
        };
        uploadedStoragePath = storedImage.storagePath;
      } else {
        const url = normalizeUrl(attachmentUrl);
        try {
          new URL(url);
        } catch {
          showAppAlert(t('common.error'), t('bookmarkDetail.attachments.invalidUrl'), undefined, { variant: 'error' });
          return;
        }
        attachment = {
          id: attachmentId,
          type: attachmentType,
          url,
          ...(attachmentTitle.trim() ? { title: attachmentTitle.trim() } : {}),
        };
      }

      const attachments = [...(bookmark.attachments ?? []), attachment];
      await updateBookmark(bookmark.id, { attachments });
      setSharedBookmark((current) => current ? { ...current, attachments } : current);
      resetAttachmentEditor();
    } catch (error) {
      console.warn('Could not save bookmark attachment:', error);
      if (uploadedStoragePath) {
        deleteStoredFile(uploadedStoragePath).catch((cleanupError) => {
          console.warn('Could not clean up failed bookmark image upload:', cleanupError);
        });
      }
      showAppAlert(
        t('common.error'),
        t(attachmentType === 'image'
          ? 'bookmarkDetail.attachments.uploadFailed'
          : 'bookmarkDetail.updateFailed'),
        undefined,
        { variant: 'error' }
      );
    } finally {
      setIsSaving(false);
    }
  };

  const removeAttachment = async (attachmentId: string) => {
    const removedAttachment = (bookmark.attachments ?? []).find((item) => item.id === attachmentId);
    const attachments = (bookmark.attachments ?? []).filter((item) => item.id !== attachmentId);
    try {
      setIsSaving(true);
      await updateBookmark(bookmark.id, { attachments });
      setSharedBookmark((current) => current ? { ...current, attachments } : current);
      if (removedAttachment?.storagePath) {
        deleteStoredFile(removedAttachment.storagePath).catch((error) => {
          console.warn('Could not delete bookmark attachment from storage:', error);
        });
      }
    } catch (error) {
      showAppAlert(t('common.error'), error instanceof Error ? error.message : t('bookmarkDetail.updateFailed'), undefined, { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleListMembership = async (listId: string) => {
    const isIncluded = listMemberships.has(listId);
    try {
      if (isIncluded) await removeBookmarkFromList(listId, bookmark.id);
      else await addBookmarkToList(listId, bookmark.id);
      setListMemberships((current) => {
        const next = new Set(current);
        if (isIncluded) next.delete(listId);
        else next.add(listId);
        return next;
      });
    } catch (error) {
      showAppAlert(t('common.error'), error instanceof Error ? error.message : t('bookmarkDetail.lists.updateFailed'), undefined, { variant: 'error' });
    }
  };

  const handleDelete = () => {
    showAppAlert(t('bookmarkDetail.deleteTitle'), t('bookmarkDetail.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteBookmark(bookmark.id);
          const storedAttachments = (bookmark.attachments ?? [])
            .map((attachment) => attachment.storagePath)
            .filter((storagePath): storagePath is string => Boolean(storagePath));
          await Promise.allSettled(storedAttachments.map(deleteStoredFile));
          router.back();
        },
      },
    ]);
  };

  const sourceLabel = bookmark.source ? getSourceLabel(bookmark.source) : t('sources.other');
  const isOwner = user?.id === bookmark.userId;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {bookmark.title || t('bookmarkDetail.bookmark')}
        </Text>
        <View style={styles.headerActions}>
          <EntityReminderBell
            entityType="bookmark"
            entityId={bookmark.id}
            title={bookmark.title || bookmark.url || t('common.untitled')}
            createdAt={bookmark.createdAt}
            schedule={bookmark.reminderSchedule}
            size={20}
          />
          {isOwner ? (
            <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
              <Trash2 size={20} color="#EF4444" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {(bookmark.imagePreview || bookmark.screenshotUri) && (
          <Image
            source={{ uri: bookmark.imagePreview || bookmark.screenshotUri }}
            style={styles.heroImage}
          />
        )}

        <View style={styles.metaRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{sourceLabel}</Text>
          </View>
          <Text style={styles.metaText}>{formatRelativeTime(bookmark.createdAt)}</Text>
          <Text style={styles.metaText}>{t('bookmarkDetail.openedCount', { count: bookmark.openCount })}</Text>
        </View>

        <Text style={styles.title}>{bookmark.title || bookmark.url || t('common.untitled')}</Text>

        {bookmark.description ? (
          <Text style={styles.description}>{bookmark.description}</Text>
        ) : null}

        {bookmark.url ? (
          <Text style={styles.url} numberOfLines={2}>
            {bookmark.url}
          </Text>
        ) : null}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>{t('bookmarkDetail.tags.title')}</Text>
            {isOwner && !isEditingTags ? (
              <TouchableOpacity onPress={startEditingTags} style={styles.smallIconButton}>
                <Edit3 size={17} color="#4F46E5" />
              </TouchableOpacity>
            ) : null}
          </View>
          {isEditingTags ? (
            <>
              <Text style={styles.suggestionHint}>{t('bookmarkDetail.tags.suggestions')}</Text>
              <View style={styles.tagsRow}>
                {tagOptions.map((tag) => {
                  const selected = editedTags.includes(tag);
                  const translationKey = getBookmarkTagTranslationKey(tag);
                  const label = translationKey ? t(translationKey) : tag;
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagChip, selected && styles.tagChipSelected]}
                      onPress={() => toggleEditedTag(tag)}
                      accessibilityRole="checkbox"
                      accessibilityLabel={label}
                      accessibilityState={{ checked: selected }}
                    >
                      <Text style={[styles.tagChipText, selected && styles.tagChipTextSelected]}>{label}</Text>
                      {selected ? <Check size={13} color="#FFFFFF" /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.inlineInputRow}>
                <TextInput
                  style={styles.inlineInput}
                  value={tagDraft}
                  onChangeText={setTagDraft}
                  placeholder={t('bookmarkDetail.tags.placeholder')}
                  onSubmitEditing={addTag}
                  returnKeyType="done"
                />
                <TouchableOpacity style={styles.addSquareButton} onPress={addTag}>
                  <Plus size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <View style={styles.editorActions}>
                <Button title={t('common.cancel')} variant="outline" size="small" onPress={() => setIsEditingTags(false)} />
                <Button title={t('common.save')} size="small" onPress={saveTags} disabled={isSaving} />
              </View>
            </>
          ) : bookmark.tagNames.length > 0 ? (
            <View style={styles.tagsRow}>
              {bookmark.tagNames.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>
                    {getBookmarkTagTranslationKey(tag) ? t(getBookmarkTagTranslationKey(tag)!) : tag}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptySectionText}>{t('bookmarkDetail.tags.empty')}</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>{t('bookmarkDetail.whySaved')}</Text>
          {isEditingNote ? (
            <>
              <TextInput
                style={styles.noteInput}
                value={personalNote}
                onChangeText={setPersonalNote}
                placeholder={t('bookmarkDetail.notePlaceholder')}
                multiline
              />
              <View style={styles.editorActions}>
                <Button title={t('common.cancel')} variant="outline" size="small" onPress={() => setIsEditingNote(false)} />
                <Button title={t('bookmarkDetail.saveNote')} size="small" onPress={handleSaveNote} disabled={isSaving} />
              </View>
            </>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setPersonalNote(bookmark.personalNote || '');
                setIsEditingNote(true);
              }}
            >
              <Text style={styles.noteText}>
                {bookmark.personalNote || t('bookmarkDetail.tapToAddNote')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>{t('bookmarkDetail.attachments.title')}</Text>
            {isOwner && !isAddingAttachment ? (
              <TouchableOpacity onPress={() => setIsAddingAttachment(true)} style={styles.smallIconButton}>
                <Plus size={18} color="#4F46E5" />
              </TouchableOpacity>
            ) : null}
          </View>

          {(bookmark.attachments ?? []).map((attachment) => (
            <View key={attachment.id} style={styles.attachmentCard}>
              {attachment.type === 'image' ? (
                <Image source={{ uri: attachment.url }} style={styles.attachmentImage} />
              ) : (
                <View style={styles.attachmentIcon}>
                  {attachment.type === 'video'
                    ? <Camera size={20} color="#4F46E5" />
                    : <Link2 size={20} color="#4F46E5" />}
                </View>
              )}
              <TouchableOpacity style={styles.attachmentContent} onPress={() => Linking.openURL(attachment.url)}>
                <Text style={styles.attachmentTitle} numberOfLines={1}>
                  {attachment.title || t(`bookmarkDetail.attachments.types.${attachment.type}`)}
                </Text>
                <Text style={styles.attachmentUrl} numberOfLines={1}>{attachment.url}</Text>
              </TouchableOpacity>
              {isOwner ? (
                <TouchableOpacity onPress={() => removeAttachment(attachment.id)} style={styles.smallIconButton}>
                  <Trash2 size={17} color="#EF4444" />
                </TouchableOpacity>
              ) : null}
            </View>
          ))}

          {(bookmark.attachments ?? []).length === 0 && !isAddingAttachment ? (
            <Text style={styles.emptySectionText}>{t('bookmarkDetail.attachments.empty')}</Text>
          ) : null}

          {isAddingAttachment ? (
            <View style={styles.attachmentEditor}>
              <View style={styles.attachmentTypes}>
                {(['link', 'image', 'video'] as AttachmentType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeButton, attachmentType === type && styles.typeButtonActive]}
                    onPress={() => selectAttachmentType(type)}
                  >
                    <Text style={[styles.typeButtonText, attachmentType === type && styles.typeButtonTextActive]}>
                      {t(`bookmarkDetail.attachments.types.${type}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {attachmentType === 'image' ? (
                <View style={styles.imagePickerArea}>
                  {selectedAttachmentImage ? (
                    <Image source={{ uri: selectedAttachmentImage.uri }} style={styles.selectedAttachmentPreview} />
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Camera size={30} color="#64748B" />
                      <Text style={styles.imagePickerPlaceholderText}>
                        {t('bookmarkDetail.attachments.imageHint')}
                      </Text>
                    </View>
                  )}
                  <Button
                    title={t(selectedAttachmentImage
                      ? 'bookmarkDetail.attachments.changeImage'
                      : 'bookmarkDetail.attachments.chooseImage')}
                    variant="outline"
                    size="small"
                    onPress={pickAttachmentImage}
                    disabled={isSaving}
                  />
                </View>
              ) : (
                <TextInput
                  style={styles.formInput}
                  value={attachmentUrl}
                  onChangeText={setAttachmentUrl}
                  placeholder={t('bookmarkDetail.attachments.urlPlaceholder')}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              )}
              <TextInput
                style={styles.formInput}
                value={attachmentTitle}
                onChangeText={setAttachmentTitle}
                placeholder={t('bookmarkDetail.attachments.titlePlaceholder')}
              />
              <View style={styles.editorActions}>
                <Button title={t('common.cancel')} variant="outline" size="small" onPress={resetAttachmentEditor} disabled={isSaving} />
                <Button
                  title={isSaving ? t('bookmarkDetail.attachments.uploading') : t('bookmarkDetail.attachments.add')}
                  size="small"
                  onPress={saveAttachment}
                  disabled={isSaving || (attachmentType === 'image' ? !selectedAttachmentImage : !attachmentUrl.trim())}
                />
              </View>
            </View>
          ) : null}
        </View>

        {isOwner ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>{t('bookmarkDetail.lists.title')}</Text>
              <Folder size={18} color="#64748B" />
            </View>
            {myLists.length > 0 ? myLists.map((list) => {
              const selected = listMemberships.has(list.id);
              return (
                <TouchableOpacity
                  key={list.id}
                  style={styles.listRow}
                  onPress={() => toggleListMembership(list.id)}
                  disabled={isUpdatingMembership}
                >
                  <View style={[styles.listCheckbox, selected && styles.listCheckboxSelected]}>
                    {selected ? <Check size={15} color="#FFFFFF" /> : null}
                  </View>
                  <View style={styles.listText}>
                    <Text style={styles.listName}>{list.name}</Text>
                    {list.description ? <Text style={styles.listDescription} numberOfLines={1}>{list.description}</Text> : null}
                  </View>
                </TouchableOpacity>
              );
            }) : (
              <View>
                <Text style={styles.emptySectionText}>{t('bookmarkDetail.lists.empty')}</Text>
                <Button
                  title={t('bookmarkDetail.lists.create')}
                  variant="outline"
                  size="small"
                  onPress={() => router.push('/create-list')}
                  style={styles.createListButton}
                />
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.actions}>
          {bookmark.url ? (
            <Button
              title={t('bookmarkDetail.openLink')}
              onPress={handleOpenUrl}
              style={styles.primaryButton}
            />
          ) : null}

          <View style={styles.statusRow}>
            <TouchableOpacity
              style={[styles.statusButton, bookmark.status === 'done' && styles.statusActive]}
              onPress={() => handleStatusChange('done')}
            >
              <Check size={16} color={bookmark.status === 'done' ? '#fff' : '#059669'} />
              <Text
                style={[
                  styles.statusButtonText,
                  bookmark.status === 'done' && styles.statusActiveText,
                ]}
              >
                {t('common.done')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusButton, bookmark.status === 'archived' && styles.statusActive]}
              onPress={() => handleStatusChange('archived')}
            >
              <Archive size={16} color={bookmark.status === 'archived' ? '#fff' : '#6B7280'} />
              <Text
                style={[
                  styles.statusButtonText,
                  bookmark.status === 'archived' && styles.statusActiveText,
                ]}
              >
                {t('bookmarkDetail.archive')}
              </Text>
            </TouchableOpacity>

            {bookmark.url ? (
              <TouchableOpacity style={styles.linkButton} onPress={handleOpenUrl}>
                <ExternalLink size={18} color="#EF4444" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  missingText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 12,
  },
  url: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  tagChipSelected: {
    backgroundColor: '#4F46E5',
  },
  tagChipTextSelected: {
    color: '#FFFFFF',
  },
  suggestionHint: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  smallIconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  emptySectionText: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  noteText: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  noteInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  inlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  inlineInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  addSquareButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  attachmentImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  attachmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentContent: {
    flex: 1,
    minWidth: 0,
  },
  attachmentTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  attachmentUrl: {
    color: '#64748B',
    fontSize: 12,
  },
  attachmentEditor: {
    marginTop: 12,
    gap: 10,
  },
  attachmentTypes: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeButtonActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  typeButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#4338CA',
  },
  formInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  imagePickerArea: {
    gap: 10,
  },
  imagePickerPlaceholder: {
    minHeight: 150,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
  },
  imagePickerPlaceholderText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },
  selectedAttachmentPreview: {
    width: '100%',
    height: 190,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingVertical: 7,
  },
  listCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCheckboxSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  listText: {
    flex: 1,
  },
  listName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  listDescription: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  createListButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    width: '100%',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  statusActiveText: {
    color: 'white',
  },
  linkButton: {
    marginLeft: 'auto',
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
