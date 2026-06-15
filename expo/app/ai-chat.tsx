import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { X, Send, Save, Sparkles } from 'lucide-react-native';
import { useRorkAgent } from '@rork-ai/toolkit-sdk';
import { useNoteStore } from '@/providers/OfflineProvider';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function AIChatScreen() {
  const { createNote } = useNoteStore();
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { messages, error, sendMessage } = useRorkAgent({
    tools: {},
  });

  useEffect(() => {
    const newMessages: Message[] = messages.map((m, index) => ({
      id: `${m.id}-${index}`,
      role: m.role as 'user' | 'assistant',
      content: m.parts
        .filter((p) => p.type === 'text')
        .map((p) => (p as any).text)
        .join('\n'),
      timestamp: Date.now(),
    })).filter(m => m.role === 'user' || m.role === 'assistant');

    setLocalMessages(newMessages);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');

    try {
      await sendMessage(userMessage);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('Failed to send message:', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handleSaveAsNote = async () => {
    if (localMessages.length === 0) {
      Alert.alert('No Conversation', 'There are no messages to save.');
      return;
    }

    setIsSaving(true);

    try {
      const conversationText = localMessages
        .map((msg) => `**${msg.role === 'user' ? 'You' : 'AI'}:** ${msg.content}`)
        .join('\n\n');

      const firstUserMessage = localMessages.find((m) => m.role === 'user')?.content || 'AI Conversation';
      const title = firstUserMessage.length > 50 
        ? firstUserMessage.substring(0, 50) + '...' 
        : firstUserMessage;

      await createNote({
        title: `AI Chat: ${title}`,
        markdown: conversationText,
        visibility: 'private',
      });

      Alert.alert('Success', 'Conversation saved as a note!', [
        {
          text: 'View Notes',
          onPress: () => router.push('/notes'),
        },
        {
          text: 'OK',
        },
      ]);
    } catch (err) {
      console.error('Failed to save note:', err);
      Alert.alert('Error', 'Failed to save conversation. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          {!isUser && (
            <View style={styles.aiIcon}>
              <Sparkles size={14} color="#EF4444" />
            </View>
          )}
          <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Sparkles size={48} color="#EF4444" />
      </View>
      <Text style={styles.emptyTitle}>AI Chat Assistant</Text>
      <Text style={styles.emptyDescription}>
        Ask me anything! I can help you with research, brainstorming, writing, and more.
        You can save our conversation as a note anytime.
      </Text>
      <View style={styles.suggestionContainer}>
        <Text style={styles.suggestionTitle}>Try asking:</Text>
        <Pressable
          style={styles.suggestionChip}
          onPress={() => setInput('Explain quantum computing in simple terms')}
        >
          <Text style={styles.suggestionText}>Explain quantum computing</Text>
        </Pressable>
        <Pressable
          style={styles.suggestionChip}
          onPress={() => setInput('Help me brainstorm ideas for a mobile app')}
        >
          <Text style={styles.suggestionText}>Brainstorm app ideas</Text>
        </Pressable>
        <Pressable
          style={styles.suggestionChip}
          onPress={() => setInput('Write a summary of the benefits of meditation')}
        >
          <Text style={styles.suggestionText}>Benefits of meditation</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'AI Chat',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.headerButton}>
              <X size={24} color="#111827" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={handleSaveAsNote}
              disabled={isSaving || localMessages.length === 0}
              style={styles.headerButton}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Save
                  size={24}
                  color={localMessages.length === 0 ? '#D1D5DB' : '#EF4444'}
                />
              )}
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <FlatList
          ref={flatListRef}
          data={localMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={
            localMessages.length === 0 ? styles.emptyContainer : styles.listContainer
          }
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {String(error)}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask me anything..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={2000}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (!input.trim() || messages.some(m => m.parts.some(p => (p as any).state === 'input-streaming'))) && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}
            onPress={handleSend}
            disabled={!input.trim() || messages.some(m => m.parts.some(p => (p as any).state === 'input-streaming'))}
          >
            {messages.some(m => m.parts.some(p => (p as any).state === 'input-streaming')) ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Send size={20} color="white" />
            )}
          </Pressable>
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
  listContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  suggestionContainer: {
    width: '100%',
    alignItems: 'stretch',
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  suggestionChip: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionText: {
    fontSize: 15,
    color: '#111827',
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 20,
    padding: 16,
  },
  userBubble: {
    backgroundColor: '#EF4444',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 4,
  },
  aiIcon: {
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  userText: {
    color: 'white',
  },
  assistantText: {
    color: '#111827',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    maxHeight: 120,
    marginRight: 12,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  sendButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  headerButton: {
    padding: 8,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
});
