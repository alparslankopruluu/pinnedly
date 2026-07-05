import { Platform } from 'react-native';
import type { MarkdownStyle } from '@expensify/react-native-live-markdown';

export const NOTE_MARKDOWN_STYLE: Partial<MarkdownStyle> = {
  syntax: {
    color: 'transparent',
  },
  link: {
    color: '#3B82F6',
  },
  code: {
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }) ?? 'monospace',
    fontSize: 15,
    color: '#374151',
    backgroundColor: '#F3F4F6',
  },
  pre: {
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }) ?? 'monospace',
    fontSize: 15,
    color: '#374151',
    backgroundColor: '#F3F4F6',
  },
};

export const NOTE_EDITOR_TEXT_STYLE = {
  fontSize: 16,
  lineHeight: 24,
  color: '#111827',
  ...(Platform.OS === 'android' ? { includeFontPadding: false as const } : {}),
};