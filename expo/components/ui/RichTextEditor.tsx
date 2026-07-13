import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { Bold, Italic, List, Link as LinkIcon, Strikethrough } from '@/components/icons/lucide';
import { NOTE_EDITOR_TEXT_STYLE, NOTE_MARKDOWN_STYLE } from '@/utils/markdownEditor';
import { useTranslation } from 'react-i18next';

interface RichTextEditorProps {
  value: string;
  onChangeText: (text: string, markdown: string) => void;
  placeholder?: string;
  toolbarHint?: string;
  style?: object;
  autoFocus?: boolean;
  editable?: boolean;
}

type StyleType = 'bold' | 'italic' | 'strikethrough' | 'list' | 'link';
type LiveMarkdownModule = typeof import('@expensify/react-native-live-markdown');

const EDITOR_PADDING = 16;

const MARKER_PAIRS: Record<'bold' | 'italic' | 'strikethrough', { open: string; close: string }> = {
  bold: { open: '**', close: '**' },
  italic: { open: '*', close: '*' },
  strikethrough: { open: '~~', close: '~~' },
};

function wrapWithMarkers(text: string, start: number, end: number, open: string, close: string): string {
  const selected = text.substring(start, end);
  return text.slice(0, start) + open + selected + close + text.slice(end);
}

function unwrapMarkers(
  text: string,
  start: number,
  end: number,
  open: string,
  close: string
): { text: string; newStart: number; newEnd: number } {
  const selected = text.substring(start, end);
  const unwrapped = selected.slice(open.length, selected.length - close.length);
  const newText = text.slice(0, start) + unwrapped + text.slice(end);
  return {
    text: newText,
    newStart: start,
    newEnd: start + unwrapped.length,
  };
}

function hasMarkers(selected: string, open: string, close: string): boolean {
  return selected.startsWith(open) && selected.endsWith(close);
}

export function RichTextEditor({
  value,
  onChangeText,
  placeholder,
  toolbarHint,
  style,
  autoFocus = false,
  editable = true,
}: RichTextEditorProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(value);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [activeStyles, setActiveStyles] = useState<Set<string>>(new Set());
  const [liveMarkdown, setLiveMarkdown] = useState<LiveMarkdownModule | null>(null);
  const inputRef = useRef<TextInput>(null);
  const MarkdownTextInput = liveMarkdown?.MarkdownTextInput;
  const parseExpensiMark = liveMarkdown?.parseExpensiMark;

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return;

    let isMounted = true;
    import('@expensify/react-native-live-markdown')
      .then((module) => {
        if (isMounted) setLiveMarkdown(module);
      })
      .catch((error) => {
        console.warn('Live markdown module unavailable:', error);
        if (isMounted) setLiveMarkdown(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (value !== text) {
      setText(value);
    }
  }, [value, text]);

  const updateSelection = useCallback((sel: { start: number; end: number }) => {
    setSelection(sel);
    const styles = new Set<string>();
    if (sel.start !== sel.end) {
      const selectedText = text.substring(sel.start, sel.end);
      if (hasMarkers(selectedText, '**', '**')) {
        styles.add('bold');
      }
      if (hasMarkers(selectedText, '*', '*') && !hasMarkers(selectedText, '**', '**')) {
        styles.add('italic');
      }
      if (hasMarkers(selectedText, '~~', '~~')) {
        styles.add('strikethrough');
      }
    }
    setActiveStyles(styles);
  }, [text]);

  const setTextAndNotify = useCallback((newText: string, cursor: number) => {
    setText(newText);
    onChangeText(newText, newText);
    setTimeout(() => {
      inputRef.current?.setNativeProps({
        selection: { start: cursor, end: cursor },
      });
    }, 0);
  }, [onChangeText]);

  const applyStyle = useCallback((styleType: StyleType) => {
    const { start, end } = selection;

    if (start === end) {
      if (styleType === 'list') {
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        const nextNewline = text.indexOf('\n', start);
        const lineEnd = nextNewline === -1 ? text.length : nextNewline;
        const line = text.slice(lineStart, lineEnd);
        if (line.startsWith('- ')) {
          const newText = text.slice(0, lineStart) + line.slice(2) + text.slice(lineEnd);
          const cursor = Math.max(lineStart, start - 2);
          setTextAndNotify(newText, cursor);
        } else {
          const newText = text.slice(0, lineStart) + '- ' + text.slice(lineStart);
          const cursor = start + 2;
          setTextAndNotify(newText, cursor);
        }
        return;
      }

      if (styleType === 'link') {
        const newText = text.slice(0, start) + '[](url)' + text.slice(end);
        setTextAndNotify(newText, start + 1);
        return;
      }

      const markers = MARKER_PAIRS[styleType];
      const newText = text.slice(0, start) + markers.open + markers.close + text.slice(end);
      const cursor = start + markers.open.length;
      setTextAndNotify(newText, cursor);

      const nextStyles = new Set(activeStyles);
      nextStyles.add(styleType);
      setActiveStyles(nextStyles);
      return;
    }

    const selectedText = text.substring(start, end);
    let newText = text;
    let newStart = start;
    let newEnd = end;

    switch (styleType) {
      case 'bold': {
        if (hasMarkers(selectedText, '**', '**')) {
          const result = unwrapMarkers(text, start, end, '**', '**');
          newText = result.text;
          newStart = result.newStart;
          newEnd = result.newEnd;
        } else {
          newText = wrapWithMarkers(text, start, end, '**', '**');
          newEnd = end + 4;
        }
        break;
      }
      case 'italic': {
        if (hasMarkers(selectedText, '*', '*') && !hasMarkers(selectedText, '**', '**')) {
          const result = unwrapMarkers(text, start, end, '*', '*');
          newText = result.text;
          newStart = result.newStart;
          newEnd = result.newEnd;
        } else {
          newText = wrapWithMarkers(text, start, end, '*', '*');
          newEnd = end + 2;
        }
        break;
      }
      case 'strikethrough': {
        if (hasMarkers(selectedText, '~~', '~~')) {
          const result = unwrapMarkers(text, start, end, '~~', '~~');
          newText = result.text;
          newStart = result.newStart;
          newEnd = result.newEnd;
        } else {
          newText = wrapWithMarkers(text, start, end, '~~', '~~');
          newEnd = end + 4;
        }
        break;
      }
      case 'list': {
        const lines = selectedText.split('\n');
        const allAreListItems = lines.every((line) => line.startsWith('- '));
        if (allAreListItems) {
          const unformattedLines = lines.map((line) => line.slice(2));
          const unformatted = unformattedLines.join('\n');
          newText = text.slice(0, start) + unformatted + text.slice(end);
          newEnd = start + unformatted.length;
        } else {
          const formattedLines = lines.map((line) => (line.startsWith('- ') ? line : `- ${line}`));
          const formatted = formattedLines.join('\n');
          newText = text.slice(0, start) + formatted + text.slice(end);
          newEnd = start + formatted.length;
        }
        break;
      }
      case 'link': {
        if (selectedText.startsWith('[') && selectedText.includes('](')) {
          const bracketEnd = selectedText.indexOf('](');
          newText = text.slice(0, start) + selectedText.slice(1, bracketEnd) + text.slice(end);
          newEnd = end - (selectedText.length - bracketEnd + 1);
        } else {
          newText = text.slice(0, start) + `[${selectedText}](url)` + text.slice(end);
          newEnd = end + selectedText.length + 5;
        }
        break;
      }
    }

    setText(newText);
    onChangeText(newText, newText);

    setTimeout(() => {
      inputRef.current?.setNativeProps({
        selection: { start: newStart, end: newEnd },
      });
    }, 0);
  }, [text, selection, activeStyles, onChangeText, setTextAndNotify]);

  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
    onChangeText(newText, newText);
  }, [onChangeText]);

  return (
    <View style={[styles.container, style]}>
      {editable ? (
        <View style={styles.toolbar}>
          <Pressable
            style={({ pressed }) => [
              styles.toolButton,
              activeStyles.has('bold') && styles.activeToolButton,
              pressed && styles.toolPressed,
            ]}
            onPress={() => applyStyle('bold')}
            accessibilityRole="togglebutton"
            accessibilityLabel={t('accessibility.formatBold')}
            accessibilityState={{ checked: activeStyles.has('bold') }}
          >
            <Bold size={18} color={activeStyles.has('bold') ? '#EF4444' : '#6B7280'} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.toolButton,
              activeStyles.has('italic') && styles.activeToolButton,
              pressed && styles.toolPressed,
            ]}
            onPress={() => applyStyle('italic')}
            accessibilityRole="togglebutton"
            accessibilityLabel={t('accessibility.formatItalic')}
            accessibilityState={{ checked: activeStyles.has('italic') }}
          >
            <Italic size={18} color={activeStyles.has('italic') ? '#EF4444' : '#6B7280'} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.toolButton,
              activeStyles.has('strikethrough') && styles.activeToolButton,
              pressed && styles.toolPressed,
            ]}
            onPress={() => applyStyle('strikethrough')}
            accessibilityRole="togglebutton"
            accessibilityLabel={t('accessibility.formatStrikethrough')}
            accessibilityState={{ checked: activeStyles.has('strikethrough') }}
          >
            <Strikethrough size={18} color={activeStyles.has('strikethrough') ? '#EF4444' : '#6B7280'} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.toolButton, pressed && styles.toolPressed]}
            onPress={() => applyStyle('list')}
            accessibilityRole="button"
            accessibilityLabel={t('accessibility.formatList')}
          >
            <List size={18} color="#6B7280" />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.toolButton, pressed && styles.toolPressed]}
            onPress={() => applyStyle('link')}
            accessibilityRole="button"
            accessibilityLabel={t('accessibility.insertLink')}
          >
            <LinkIcon size={18} color="#6B7280" />
          </Pressable>
          {toolbarHint ? (
            <View style={styles.toolbarHint}>
              <Text style={styles.toolbarHintText}>{toolbarHint}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {MarkdownTextInput && parseExpensiMark ? (
        <MarkdownTextInput
          ref={inputRef as never}
          style={[styles.input, !editable && styles.readOnlyInput]}
          value={text}
          onChangeText={handleTextChange}
          onSelectionChange={(e) => updateSelection(e.nativeEvent.selection)}
          parser={parseExpensiMark}
          markdownStyle={NOTE_MARKDOWN_STYLE}
          multiline
          editable={editable}
          autoFocus={autoFocus}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          textAlignVertical="top"
          selectionColor="#EF4444"
          cursorColor="#EF4444"
          scrollEnabled={editable}
        />
      ) : (
        <TextInput
          ref={inputRef}
          style={[styles.input, !editable && styles.readOnlyInput]}
          value={text}
          onChangeText={handleTextChange}
          onSelectionChange={(e) => updateSelection(e.nativeEvent.selection)}
          multiline
          editable={editable}
          autoFocus={autoFocus}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          textAlignVertical="top"
          selectionColor="#EF4444"
          cursorColor="#EF4444"
          scrollEnabled={editable}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  toolButton: {
    padding: 8,
    marginRight: 2,
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeToolButton: {
    backgroundColor: '#FEE2E2',
  },
  toolPressed: {
    opacity: 0.7,
  },
  toolbarHint: {
    marginLeft: 'auto',
    paddingRight: 4,
    flexShrink: 1,
  },
  toolbarHintText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  input: {
    minHeight: 200,
    maxHeight: 400,
    padding: EDITOR_PADDING,
    ...NOTE_EDITOR_TEXT_STYLE,
  },
  readOnlyInput: {
    minHeight: 0,
    maxHeight: undefined,
    padding: 0,
    borderWidth: 0,
  },
});
