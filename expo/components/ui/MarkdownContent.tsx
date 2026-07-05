import React from 'react';
import { StyleSheet } from 'react-native';
import { MarkdownTextInput, parseExpensiMark } from '@expensify/react-native-live-markdown';
import { NOTE_EDITOR_TEXT_STYLE, NOTE_MARKDOWN_STYLE } from '@/utils/markdownEditor';

interface MarkdownContentProps {
  value: string;
  style?: object;
}

export function MarkdownContent({ value, style }: MarkdownContentProps) {
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