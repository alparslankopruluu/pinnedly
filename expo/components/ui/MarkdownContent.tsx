import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { NOTE_EDITOR_TEXT_STYLE, NOTE_MARKDOWN_STYLE } from '@/utils/markdownEditor';

interface MarkdownContentProps {
  value: string;
  style?: object;
}

type LiveMarkdownModule = typeof import('@expensify/react-native-live-markdown');

export function MarkdownContent({ value, style }: MarkdownContentProps) {
  const [liveMarkdown, setLiveMarkdown] = useState<LiveMarkdownModule | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return;

    let isMounted = true;
    import('@expensify/react-native-live-markdown')
      .then((module) => {
        if (isMounted) setLiveMarkdown(module);
      })
      .catch(() => {
        if (isMounted) setLiveMarkdown(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (Platform.OS === 'web' && typeof window === 'undefined') {
    return <Text style={[styles.content, style]}>{value}</Text>;
  }

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
