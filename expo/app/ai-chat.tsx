import React, { useState, useRef, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { showAppAlert } from '@/providers/DialogProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { X, Send, Save, Sparkles } from 'lucide-react-native';
import { useRorkAgent } from '@rork-ai/toolkit-sdk';
import { useNoteStore } from '@/providers/OfflineProvider';
import { ChatTypingIndicator } from '@/components/ChatTypingIndicator';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const SYSTEM_MESSAGE_ID = 'pinnedly-system-prompt';

export default function AIChatScreen() {
  const { t, i18n } = useTranslation();
  const { createNote } = useNoteStore();
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const savingNoteRef = useRef(false);

  const systemMessage = useMemo(
    () => ({
      id: SYSTEM_MESSAGE_ID,
      role: 'system' as const,
      parts: [{ type: 'text' as const, text: t('aiChat.systemPrompt') }],
    }),
    [t, i18n.language]
  );

  const { messages, error, sendMessage, setMessages, status } = useRorkAgent({
    tools: {},
  });

  const isResponding = status === 'submitted' || status === 'streaming';

  const latestAssistantText = useMemo(() => {
    const assistantMessages = messages.filter((message) => message.role === 'assistant');
    const latest = assistantMessages[assistantMessages.length - 1];
    if (!latest) return '';

    return latest.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as { text: string }).text)
      .join('');
  }, [messages]);

  const showTypingIndicator = isResponding && latestAssistantText.trim().length === 0;

  useEffect(() => {
    setMessages((prev) => {
      const conversation = prev.filter((message) => message.id !== SYSTEM_MESSAGE_ID);
      return [systemMessage, ...conversation];
    });
  }, [systemMessage, setMessages]);

  useEffect(() => {
    if (!showTypingIndicator) return;

    const timeoutId = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [showTypingIndicator]);

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
      showAppAlert(t('common.error'), t('aiChat.alerts.sendFailed'), undefined, { variant: 'error' });
    }
  };

  const handleSaveAsNote = async () => {
    if (savingNoteRef.current || localMessages.length === 0) {
      if (localMessages.length === 0) {
        showAppAlert(t('aiChat.alerts.noConversation'), t('aiChat.alerts.noMessagesToSave'));
      }
      return;
    }

    savingNoteRef.current = true;
    setIsSaving(true);

    try {
      const conversationText = localMessages
        .map((msg) => `**${msg.role === 'user' ? t('aiChat.roles.you') : t('aiChat.roles.ai')}:** ${msg.content}`)
        .join('\n\n');

      const firstUserMessage = localMessages.find((m) => m.role === 'user')?.content || 'AI Conversation';
      const title = firstUserMessage.length > 50 
        ? firstUserMessage.substring(0, 50) + '...' 
        : firstUserMessage;

      await createNote({
        title: t('aiChat.savedNoteTitle', { title }),
        markdown: conversationText,
        visibility: 'private',
      });

      showAppAlert(t('common.success'), t('aiChat.alerts.savedAsNote'), [
        {
          text: t('common.ok'),
          style: 'cancel',
        },
        {
          text: t('common.viewNotes'),
          onPress: () => router.push('/notes'),
        },
      ], { variant: 'success' });
    } catch (err) {
      console.error('Failed to save note:', err);
      showAppAlert(t('common.error'), t('aiChat.alerts.saveFailed'), undefined, { variant: 'error' });
    } finally {
      savingNoteRef.current = false;
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
      <Text style={styles.emptyTitle}>{t('aiChat.empty.title')}</Text>
      <Text style={styles.emptyDescription}>
        {t('aiChat.empty.description')}
      </Text>
      <View style={styles.suggestionContainer}>
        <Text style={styles.suggestionTitle}>{t('aiChat.empty.tryAsking')}</Text>
        <Pressable
          style={styles.suggestionChip}
          onPress={() => setInput(t('aiChat.empty.suggestions.quantum'))}
        >
          <Text style={styles.suggestionText}>{t('aiChat.empty.suggestions.quantum')}</Text>
        </Pressable>
        <Pressable
          style={styles.suggestionChip}
          onPress={() => setInput(t('aiChat.empty.suggestions.brainstorm'))}
        >
          <Text style={styles.suggestionText}>{t('aiChat.empty.suggestions.brainstorm')}</Text>
        </Pressable>
        <Pressable
          style={styles.suggestionChip}
          onPress={() => setInput(t('aiChat.empty.suggestions.meditation'))}
        >
          <Text style={styles.suggestionText}>{t('aiChat.empty.suggestions.meditation')}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: t('aiChat.title'),
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
          ListFooterComponent={
            showTypingIndicator
              ? () => <ChatTypingIndicator label={t('aiChat.thinking')} />
              : null
          }
          contentContainerStyle={
            localMessages.length === 0 ? styles.emptyContainer : styles.listContainer
          }
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{t('common.errorWithMessage', { message: String(error) })}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={t('aiChat.placeholder')}
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={2000}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (!input.trim() || isResponding) && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}
            onPress={handleSend}
            disabled={!input.trim() || isResponding}
          >
            {isResponding ? (
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
