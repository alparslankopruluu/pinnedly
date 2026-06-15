import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Bold, Italic, List, Link as LinkIcon } from 'lucide-react-native';

interface RichTextEditorProps {
  value: string;
  onChangeText: (text: string, markdown: string) => void;
  placeholder?: string;
  style?: any;
  autoFocus?: boolean;
}

/**
 * Rich text editor that shows styled text while storing markdown.
 * Toolbar buttons toggle formatting on selected text without inserting
 * placeholder template text like "**bold text**".
 * When no text is selected, buttons just toggle their visual state;
 * users type directly and formatting is applied via markdown markers.
 */
export function RichTextEditor({
  value,
  onChangeText,
  placeholder,
  style,
  autoFocus = false
}: RichTextEditorProps) {
  const [text, setText] = useState(value);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [activeStyles, setActiveStyles] = useState<Set<string>>(new Set());
  const inputRef = useRef<TextInput>(null);

  // Sync external value changes
  React.useEffect(() => {
    if (value !== text) {
      setText(value);
    }
  }, [value]);

  const updateSelection = useCallback((sel: { start: number; end: number }) => {
    setSelection(sel);
    const styles = new Set<string>();
    if (sel.start !== sel.end) {
      const selectedText = text.substring(sel.start, sel.end);
      if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
        styles.add('bold');
      }
      if (selectedText.startsWith('*') && selectedText.endsWith('*') && !selectedText.startsWith('**')) {
        styles.add('italic');
      }
    }
    setActiveStyles(styles);
  }, [text]);

  const applyStyle = useCallback((styleType: 'bold' | 'italic' | 'list' | 'link') => {
    const { start, end } = selection;

    // If no text selected, toggle toolbar state only — don't insert template text
    if (start === end) {
      const styles = new Set(activeStyles);
      if (styles.has(styleType)) {
        styles.delete(styleType);
      } else {
        styles.add(styleType);
      }
      setActiveStyles(styles);
      return;
    }

    const selectedText = text.substring(start, end);
    let newText = text;
    let newStart = start;
    let newEnd = end;

    switch (styleType) {
      case 'bold':
        if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
          newText = text.slice(0, start) + selectedText.slice(2, -2) + text.slice(end);
          newEnd = end - 4;
        } else {
          newText = text.slice(0, start) + '**' + selectedText + '**' + text.slice(end);
          newStart = start;
          newEnd = end + 4;
        }
        break;
      case 'italic':
        if (selectedText.startsWith('*') && selectedText.endsWith('*') && !selectedText.startsWith('**')) {
          newText = text.slice(0, start) + selectedText.slice(1, -1) + text.slice(end);
          newEnd = end - 2;
        } else {
          newText = text.slice(0, start) + '*' + selectedText + '*' + text.slice(end);
          newStart = start;
          newEnd = end + 2;
        }
        break;
      case 'list':
        const lines = selectedText.split('\n');
        const allAreListItems = lines.every(line => line.startsWith('- '));
        if (allAreListItems) {
          const unformattedLines = lines.map(line => line.slice(2));
          newText = text.slice(0, start) + unformattedLines.join('\n') + text.slice(end);
          newEnd = start + unformattedLines.join('\n').length;
        } else {
          const formattedLines = lines.map(line => line.startsWith('- ') ? line : '- ' + line);
          const newSelectedText = formattedLines.join('\n');
          newText = text.slice(0, start) + newSelectedText + text.slice(end);
          newEnd = start + newSelectedText.length;
        }
        break;
      case 'link':
        if (selectedText.startsWith('[') && selectedText.includes('](')) {
          const bracketEnd = selectedText.indexOf('](');
          newText = text.slice(0, start) + selectedText.slice(1, bracketEnd) + text.slice(end);
          newEnd = end - (selectedText.length - bracketEnd + 1);
        } else {
          newText = text.slice(0, start) + '[' + selectedText + '](url)' + text.slice(end);
          newStart = start;
          newEnd = end + selectedText.length + 5;
        }
        break;
    }

    setText(newText);
    onChangeText(newText, newText);

    // Restore cursor position after render
    setTimeout(() => {
      inputRef.current?.setNativeProps({
        selection: { start: newStart, end: newEnd }
      });
    }, 0);
  }, [text, selection, activeStyles, onChangeText]);

  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
    onChangeText(newText, newText);
  }, [onChangeText]);

  const renderStyledContent = () => {
    const lines = text.split('\n');
    return lines.map((line, lineIndex) => {
      const parts: React.ReactNode[] = [];
      let currentIndex = 0;

      // Strip list prefix for rendering
      const isListItem = /^- /.test(line);
      const processedLine = isListItem ? line.slice(2) : line;

      // Find all formatting markers
      interface Match {
        start: number;
        end: number;
        type: 'bold' | 'italic' | 'link';
        text: string;
        url?: string;
      }

      const matches: Match[] = [];

      // Find bold: **text**
      const boldRegex = /\*\*(.+?)\*\*/g;
      let match: RegExpExecArray | null;
      boldRegex.lastIndex = 0;
      while ((match = boldRegex.exec(processedLine)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          type: 'bold',
          text: match[1]
        });
      }

      // Find italic: *text* (not **)
      const italicRegex = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;
      italicRegex.lastIndex = 0;
      while ((match = italicRegex.exec(processedLine)) !== null) {
        const overlapsBold = matches.some(
          m => m.type === 'bold' && m.start <= match!.index && m.end >= match!.index + match![0].length
        );
        if (!overlapsBold) {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            type: 'italic',
            text: match[1]
          });
        }
      }

      // Find links: [text](url)
      const linkRegex = /\[(.+?)\]\((.+?)\)/g;
      linkRegex.lastIndex = 0;
      while ((match = linkRegex.exec(processedLine)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          type: 'link',
          text: match[1],
          url: match[2]
        });
      }

      matches.sort((a, b) => a.start - b.start);

      // Build segments
      matches.forEach((m, i) => {
        if (currentIndex < m.start) {
          parts.push(
            <Text key={`txt-${lineIndex}-${i}`} style={styles.normalText}>
              {processedLine.slice(currentIndex, m.start)}
            </Text>
          );
        }

        switch (m.type) {
          case 'bold':
            parts.push(
              <Text key={`b-${lineIndex}-${i}`} style={styles.boldText}>
                {m.text}
              </Text>
            );
            break;
          case 'italic':
            parts.push(
              <Text key={`i-${lineIndex}-${i}`} style={styles.italicText}>
                {m.text}
              </Text>
            );
            break;
          case 'link':
            parts.push(
              <Text key={`l-${lineIndex}-${i}`} style={styles.linkText}>
                {m.text}
              </Text>
            );
            break;
        }

        currentIndex = m.end;
      });

      if (currentIndex < processedLine.length) {
        parts.push(
          <Text key={`txt-${lineIndex}-end`} style={styles.normalText}>
            {processedLine.slice(currentIndex)}
          </Text>
        );
      }

      return (
        <Text key={`line-${lineIndex}`} style={styles.line}>
          {isListItem && <Text style={styles.bullet}>{'\u2022'} </Text>}
          {parts.length > 0 ? parts : <Text style={styles.normalText}>{processedLine}</Text>}
          {lineIndex < lines.length - 1 ? '\n' : ''}
        </Text>
      );
    });
  };

  return (
    <View style={[styles.container, style]}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <Pressable
          style={({ pressed }) => [
            styles.toolButton,
            activeStyles.has('bold') && styles.activeToolButton,
            pressed && styles.toolPressed
          ]}
          onPress={() => applyStyle('bold')}
        >
          <Bold size={18} color={activeStyles.has('bold') ? '#EF4444' : '#6B7280'} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.toolButton,
            activeStyles.has('italic') && styles.activeToolButton,
            pressed && styles.toolPressed
          ]}
          onPress={() => applyStyle('italic')}
        >
          <Italic size={18} color={activeStyles.has('italic') ? '#EF4444' : '#6B7280'} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.toolButton,
            pressed && styles.toolPressed
          ]}
          onPress={() => applyStyle('list')}
        >
          <List size={18} color="#6B7280" />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.toolButton,
            pressed && styles.toolPressed
          ]}
          onPress={() => applyStyle('link')}
        >
          <LinkIcon size={18} color="#6B7280" />
        </Pressable>
        <View style={styles.toolbarHint}>
          <Text style={styles.toolbarHintText}>Select text to format</Text>
        </View>
      </View>

      {/* Editor area with styled text overlay */}
      <View style={styles.editorContainer}>
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={text}
          onChangeText={handleTextChange}
          onSelectionChange={(e) => updateSelection(e.nativeEvent.selection)}
          multiline
          autoFocus={autoFocus}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          textAlignVertical="top"
        />
        <View style={styles.styledTextContainer} pointerEvents="none">
          <Text style={styles.styledText}>
            {text ? renderStyledContent() : (
              <Text style={styles.placeholderText}>{placeholder}</Text>
            )}
          </Text>
        </View>
      </View>
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
  },
  toolbarHintText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  editorContainer: {
    minHeight: 200,
    maxHeight: 400,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    fontSize: 16,
    color: 'transparent',
    caretColor: '#EF4444',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 24,
    zIndex: 1,
  },
  styledTextContainer: {
    padding: 16,
    pointerEvents: 'none',
  },
  styledText: {
    fontSize: 16,
    lineHeight: 24,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  line: {
    fontSize: 16,
    lineHeight: 24,
  },
  normalText: {
    color: '#111827',
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
  italicText: {
    fontStyle: 'italic',
    color: '#111827',
  },
  linkText: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  bullet: {
    color: '#EF4444',
    fontWeight: '700',
  },
});
