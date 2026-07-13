import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import { X, Send, Save, Sparkles } from '@/components/icons/lucide';
import { useNoteStore } from '@/providers/OfflineProvider';
import { ChatTypingIndicator } from '@/components/ChatTypingIndicator';
import { sendWorkspaceChat, WorkspaceChatError } from '@/services/aiWorkspaceChat';
import { useSubscriptionAccess } from '@/providers/SubscriptionProvider';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function AIChatScreen() {
  const { t } = useTranslation();
  const { createNote } = useNoteStore();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isResponding, setIsResponding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const savingNoteRef = useRef(false);
  const { snapshot, can, refresh, showPaywall } = useSubscriptionAccess();

  useEffect(() => {
    if (snapshot.status === 'loading' || snapshot.status === 'error') return;
    if (!can('ai').allowed) showPaywall();
  }, [can, showPaywall, snapshot.status]);

  const getSendErrorMessage = useCallback((err: unknown) => {
    if (!(err instanceof WorkspaceChatError)) {
      return t('aiChat.alerts.sendFailed');
    }

    const messageKey = (() => {
      switch (err.code) {
        case 'AUTH_REQUIRED':
          return 'aiChat.alerts.authRequired';
        case 'MESSAGE_REQUIRED':
          return 'aiChat.alerts.messageRequired';
        case 'NETWORK_ERROR':
          return 'aiChat.alerts.networkError';
        case 'TIMEOUT':
          return 'aiChat.alerts.timeout';
        case 'EMPTY_RESPONSE':
        case 'INVALID_RESPONSE':
          return 'aiChat.alerts.invalidResponse';
        case 'PREMIUM_REQUIRED':
          return 'subscription.errors.premiumRequired';
        case 'AI_QUOTA_EXHAUSTED':
          return 'subscription.errors.aiQuotaExhausted';
        case 'ENTITLEMENT_UNAVAILABLE':
          return 'subscription.errors.unavailable';
        case 'REQUEST_FAILED':
        default:
          return 'aiChat.alerts.sendFailed';
      }
    })();

    const baseMessage = t(messageKey);
    return err.requestId
      ? `${baseMessage}\n${t('aiChat.alerts.requestId', { requestId: err.requestId })}`
      : baseMessage;
  }, [t]);

  const handleSend = useCallback(async () => {
    const userMessage = input.trim();
    if (!userMessage || isResponding) return;

    setInput('');
    setErrorText(null);

    const userEntry: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userEntry]);
    setIsResponding(true);

    try {
      const conversation = [...messages, userEntry].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const result = await sendWorkspaceChat(userMessage, conversation);
      const assistantEntry: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.answer,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantEntry]);
      await refresh().catch(() => undefined);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      const message = getSendErrorMessage(err);
      setErrorText(message);

      if (err instanceof WorkspaceChatError) {
        if (err.code === 'PREMIUM_REQUIRED' || err.code === 'AI_QUOTA_EXHAUSTED') {
          showPaywall();
        }
        console.warn('Workspace chat send failed:', {
          code: err.code,
          status: err.status,
          requestId: err.requestId,
          serverMessage: err.serverMessage,
        });
      } else {
        console.warn('Workspace chat send failed:', err);
      }

      showAppAlert(t('common.error'), message, undefined, { variant: 'error' });
    } finally {
      setIsResponding(false);
    }
  }, [getSendErrorMessage, input, isResponding, messages, refresh, showPaywall, t]);

  const handleSaveAsNote = async () => {
    if (savingNoteRef.current || messages.length === 0) {
      if (messages.length === 0) {
        showAppAlert(t('aiChat.alerts.noConversation'), t('aiChat.alerts.noMessagesToSave'));
      }
      return;
    }

    savingNoteRef.current = true;
    setIsSaving(true);

    try {
      const conversationText = messages
        .map((msg) => `**${msg.role === 'user' ? t('aiChat.roles.you') : t('aiChat.roles.ai')}:** ${msg.content}`)
        .join('\n\n');

      const firstUserMessage = messages.find((m) => m.role === 'user')?.content || 'AI Conversation';
      const title = firstUserMessage.length > 50
        ? `${firstUserMessage.substring(0, 50)}...`
        : firstUserMessage;

      await createNote({
        title: t('aiChat.savedNoteTitle', { title }),
        markdown: conversationText,
        visibility: 'private',
      });

      showAppAlert(t('common.success'), t('aiChat.alerts.savedAsNote'), [
        { text: t('common.ok'), style: 'cancel' },
        { text: t('common.viewNotes'), onPress: () => router.push('/notes') },
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

  const suggestions = [
    t('aiChat.empty.suggestions.savedThisMonth'),
    t('aiChat.empty.suggestions.remainingTasks'),
    t('aiChat.empty.suggestions.projectProgress'),
  ];

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Sparkles size={48} color="#EF4444" />
      </View>
      <Text style={styles.emptyTitle}>{t('aiChat.empty.title')}</Text>
      <Text style={styles.emptyDescription}>{t('aiChat.empty.description')}</Text>
      <View style={styles.suggestionContainer}>
        <Text style={styles.suggestionTitle}>{t('aiChat.empty.tryAsking')}</Text>
        {suggestions.map((suggestion) => (
          <Pressable
            key={suggestion}
            style={styles.suggestionChip}
            onPress={() => setInput(suggestion)}
          >
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </Pressable>
        ))}
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
              disabled={isSaving || messages.length === 0}
              style={styles.headerButton}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Save size={24} color={messages.length === 0 ? '#D1D5DB' : '#EF4444'} />
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
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={
            isResponding ? () => <ChatTypingIndicator label={t('aiChat.thinking')} /> : null
          }
          contentContainerStyle={
            messages.length === 0 ? styles.emptyContainer : styles.listContainer
          }
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {errorText && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorText}</Text>
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
