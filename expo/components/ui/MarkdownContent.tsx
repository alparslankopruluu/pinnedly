import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { NOTE_EDITOR_TEXT_STYLE, NOTE_MARKDOWN_STYLE } from '@/utils/markdownEditor';

declare const require: <T = unknown>(moduleName: string) => T;

interface MarkdownContentProps {
  value: string;
  style?: object;
}

export function MarkdownContent({ value, style }: MarkdownContentProps) {
  if (Platform.OS === 'web' && typeof window === 'undefined') {
    return <Text style={[styles.content, style]}>{value}</Text>;
  }

  const liveMarkdown = (() => {
    try {
      return require<typeof import('@expensify/react-native-live-markdown')>(
        '@expensify/react-native-live-markdown'
      );
    } catch {
      return null;
    }
  })();

  if (!liveMarkdown) {
    return <Text style={[styles.content, style]}>{value}</Text>;
  }

  const { MarkdownTextInput, parseExpensiMark } = liveMarkdown;

  return (
    <MarkdownTextInput
      style={[styles.content, style]}
      value={value}
      editable={false}
      parser={parseExpensiMark}
      markdownStyle={NOTE_MARKDOWN_STYLE}
      multiline
      scrollEnabled={false}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  content: {
    ...NOTE_EDITOR_TEXT_STYLE,
    padding: 0,
    minHeight: 0,
  },
});
