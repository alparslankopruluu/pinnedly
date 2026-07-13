import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { X, Camera, Plus } from '@/components/icons/lucide';
import { useBookmarkStore } from '@/providers/OfflineProvider';
import { useAuth } from '@/store/useAuthStore';
import { Button } from '@/components/ui/Button';
import { ScreenFooter } from '@/components/ui/ScreenFooter';
import { fetchUrlMetadata, getSourceFromUrl } from '@/utils/metadata';
import { useTrackFormOpen } from '@/hooks/useTrackFormOpen';
import { CategoryPicker } from '@/components/ui/CategoryPicker';
import { ContentCategoryId, DEFAULT_CONTENT_CATEGORY } from '@/constants/contentCategories';
import { useSubscriptionGate } from '@/hooks/useSubscriptionGate';

export default function AddBookmarkScreen() {
  useTrackFormOpen('bookmark');
  const { t } = useTranslation();
  const { url: initialUrl } = useLocalSearchParams<{ url?: string }>();
  const { createBookmark, bookmarks } = useBookmarkStore();
  const { ensureCreate, handleAccessError } = useSubscriptionGate();
  const { isAuthenticated } = useAuth();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const suggestedTags = [...new Set(bookmarks.flatMap((b) => b.tagNames))].slice(0, 12);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [category, setCategory] = useState<ContentCategoryId>(DEFAULT_CONTENT_CATEGORY);

  const handleUrlChange = useCallback(async (text: string) => {
    setUrl(text);
    
    // Clear previous metadata when URL changes
    if (!text.trim()) {
      setTitle('');
      setDescription('');
      setImagePreview(null);
      return;
    }
    
    // Only fetch metadata for valid URLs
    if (text.trim() && (text.includes('http://') || text.includes('https://'))) {
      setIsLoading(true);
      try {
        const metadata = await fetchUrlMetadata(text.trim());
        if (metadata.title) setTitle(metadata.title);
        if (metadata.description) setDescription(metadata.description);
        if (metadata.image) setImagePreview(metadata.image);
      } catch (error) {
        console.error('Failed to fetch metadata:', error);
        // Show user-friendly message but don't block the flow
        showAppAlert(
          t('addBookmark.metadataFetchFailed'),
          t('addBookmark.metadataFetchMessage'),
          [{ text: t('common.ok') }]
        );
      } finally {
        setIsLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    if (typeof initialUrl === 'string' && initialUrl.trim()) {
      handleUrlChange(decodeURIComponent(initialUrl.trim()));
    }
  }, [initialUrl, handleUrlChange]);

  const pickImage = async () => {
    const ImagePicker = await import('expo-image-picker');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAppAlert(t('addBookmark.alerts.permissionNeeded'), t('addBookmark.alerts.cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setScreenshotUri(result.assets[0].uri);
      setImagePreview(result.assets[0].uri);
    }
  };

  const toggleTag = (tagName: string) => {
    const normalized = tagName.trim().toLowerCase();
    setSelectedTags((prev) =>
      prev.includes(normalized)
        ? prev.filter((name) => name !== normalized)
        : [...prev, normalized]
    );
  };

  const handleAddTag = () => {
    const normalized = newTag.trim().toLowerCase();
    if (normalized && !selectedTags.includes(normalized)) {
      setSelectedTags((prev) => [...prev, normalized]);
    }
    setNewTag('');
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      showAppAlert(t('addBookmark.alerts.signInRequired'), t('addBookmark.alerts.signInToSave'));
      return;
    }

    if (!url.trim() && !screenshotUri) {
      showAppAlert(t('common.error'), t('addBookmark.alerts.provideUrlOrScreenshot'), undefined, { variant: 'error' });
      return;
    }
    if (!ensureCreate('bookmarks', bookmarks.length)) return;

    const source = url ? getSourceFromUrl(url) : 'other';

    try {
      setIsSaving(true);
      await createBookmark({
        url: url.trim() || undefined,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        imagePreview: imagePreview || undefined,
        screenshotUri: screenshotUri || undefined,
        tagNames: selectedTags,
        personalNote: comment.trim() || undefined,
        source,
        visibility: 'private',
        status: 'inbox',
        category,
      });
      router.back();
    } catch (error) {
      if (handleAccessError(error)) return;
      showAppAlert(t('addBookmark.alerts.saveFailed'), error instanceof Error ? error.message : t('addBookmark.alerts.couldNotSave'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen 
        options={{ 
          title: t('addBookmark.title'),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.close')}>
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
            {/* URL Input */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('addBookmark.labels.url')}</Text>
              <TextInput
                style={styles.input}
                value={url}
                onChangeText={handleUrlChange}
                placeholder={t('addBookmark.urlPlaceholder')}
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                keyboardType="url"
                accessibilityLabel={t('addBookmark.labels.url')}
              />
            </View>

            {/* OR Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('addBookmark.labels.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Screenshot Upload */}
            <View style={styles.section}>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage} accessibilityRole="button">
                <Camera size={24} color="#6B7280" />
                <Text style={styles.uploadText}>{t('addBookmark.labels.uploadScreenshot')}</Text>
              </TouchableOpacity>
            </View>

            {/* Preview Image */}
            {imagePreview && (
              <View style={styles.section}>
                <Image source={{ uri: imagePreview }} style={styles.previewImage} />
              </View>
            )}

            {/* Title */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('addBookmark.labels.title')}</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={t('addBookmark.titlePlaceholder')}
                placeholderTextColor="#9CA3AF"
                accessibilityLabel={t('addBookmark.labels.title')}
              />
            </View>

            {/* Category */}
            <View style={styles.section}>
              <CategoryPicker
                label={t('categories.label')}
                value={category}
                onChange={setCategory}
              />
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('addBookmark.labels.description')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('addBookmark.descriptionPlaceholder')}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                accessibilityLabel={t('addBookmark.labels.description')}
              />
            </View>

            {/* Comment */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('addBookmark.labels.commentOptional')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={comment}
                onChangeText={setComment}
                placeholder={t('addBookmark.notePlaceholder')}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
                accessibilityLabel={t('addBookmark.labels.commentOptional')}
              />
            </View>

            {/* Tags */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('addBookmark.labels.tags')}</Text>
              <View style={styles.tagsContainer}>
                {suggestedTags.map((tagName) => (
                  <TouchableOpacity
                    key={tagName}
                    style={[
                      styles.tag,
                      selectedTags.includes(tagName) && styles.selectedTag,
                    ]}
                    onPress={() => toggleTag(tagName)}
                    accessibilityRole="checkbox"
                    accessibilityLabel={tagName}
                    accessibilityState={{ checked: selectedTags.includes(tagName) }}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        selectedTags.includes(tagName) && styles.selectedTagText,
                      ]}
                    >
                      {tagName}
                    </Text>
                    {selectedTags.includes(tagName) && (
                      <X size={14} color="white" style={styles.tagRemove} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Add New Tag */}
              <View style={styles.newTagContainer}>
                <TextInput
                  style={styles.newTagInput}
                  value={newTag}
                  onChangeText={setNewTag}
                  placeholder={t('addBookmark.tagsPlaceholder')}
                  placeholderTextColor="#9CA3AF"
                  accessibilityLabel={t('addBookmark.tagsPlaceholder')}
                />
                <TouchableOpacity
                  style={styles.addTagButton}
                  onPress={handleAddTag}
                  accessibilityRole="button"
                  accessibilityLabel={t('addBookmark.tagsPlaceholder')}
                >
                  <Plus size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        <ScreenFooter>
          <Button
            title={isSaving ? t('common.saving') : isLoading ? t('common.loading') : t('addBookmark.addBookmark')}
            onPress={handleSave}
            disabled={isLoading || isSaving}
            style={styles.saveButton}
          />
        </ScreenFooter>
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
    height: 80,
    textAlignVertical: 'top',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 14,
    color: '#9CA3AF',
    paddingHorizontal: 16,
    fontWeight: '500',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  uploadText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
    fontWeight: '500',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedTag: {
    backgroundColor: '#EF4444',
  },
  tagText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedTagText: {
    color: 'white',
  },
  tagRemove: {
    marginLeft: 4,
  },
  newTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newTagInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  addTagButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  saveButton: {
    width: '100%',
  },
});
