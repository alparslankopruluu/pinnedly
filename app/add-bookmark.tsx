import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { X, Camera, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/Button';
import { fetchUrlMetadata, getSourceFromUrl } from '@/utils/metadata';

export default function AddBookmarkScreen() {
  const { addBookmark, tags, addTag } = useAppStore();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUrlChange = async (text: string) => {
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
        Alert.alert(
          'Metadata Fetch Failed', 
          'Could not automatically fetch page details. You can still add the bookmark manually.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload screenshots.');
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

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      addTag({ name: newTag.trim() });
      setNewTag('');
    }
  };

  const handleSave = () => {
    if (!url.trim() && !screenshotUri) {
      Alert.alert('Error', 'Please provide either a URL or upload a screenshot.');
      return;
    }

    const bookmarkTags = tags.filter(tag => selectedTags.includes(tag.id));
    const source = url ? getSourceFromUrl(url) : 'other';

    addBookmark({
      url: url.trim() || undefined,
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      imagePreview: imagePreview || undefined,
      screenshotUri: screenshotUri || undefined,
      tags: bookmarkTags,
      source,
    });

    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Add Bookmark',
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
            {/* URL Input */}
            <View style={styles.section}>
              <Text style={styles.label}>URL</Text>
              <TextInput
                style={styles.input}
                value={url}
                onChangeText={handleUrlChange}
                placeholder="Paste URL here..."
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            {/* OR Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Screenshot Upload */}
            <View style={styles.section}>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <Camera size={24} color="#6B7280" />
                <Text style={styles.uploadText}>Upload Screenshot</Text>
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
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter title..."
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter description..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Comment */}
            <View style={styles.section}>
              <Text style={styles.label}>Comment (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={comment}
                onChangeText={setComment}
                placeholder="Add a quick note..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Tags */}
            <View style={styles.section}>
              <Text style={styles.label}>Tags</Text>
              <View style={styles.tagsContainer}>
                {tags.map((tag) => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.tag,
                      selectedTags.includes(tag.id) && styles.selectedTag,
                    ]}
                    onPress={() => toggleTag(tag.id)}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        selectedTags.includes(tag.id) && styles.selectedTagText,
                      ]}
                    >
                      {tag.name}
                    </Text>
                    {selectedTags.includes(tag.id) && (
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
                  placeholder="Add tags..."
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity style={styles.addTagButton} onPress={handleAddTag}>
                  <Plus size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <Button
            title={isLoading ? 'Loading...' : 'Add Bookmark'}
            onPress={handleSave}
            disabled={isLoading}
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