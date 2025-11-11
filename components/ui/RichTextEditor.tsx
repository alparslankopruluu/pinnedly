import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
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

  useEffect(() => {
    setText(value);
  }, [value]);

  const updateSelection = (sel: { start: number; end: number }) => {
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
  };

  const applyStyle = (styleType: 'bold' | 'italic' | 'list' | 'link') => {
    const { start, end } = selection;
    
    if (start === end) {
      let newText = text;
      let newCursorPos = start;
      
      switch (styleType) {
        case 'bold':
          newText = text.slice(0, start) + '**bold text**' + text.slice(start);
          newCursorPos = start + 2;
          break;
        case 'italic':
          newText = text.slice(0, start) + '*italic text*' + text.slice(start);
          newCursorPos = start + 1;
          break;
        case 'list':
          const beforeCursor = text.slice(0, start);
          const lineStart = beforeCursor.lastIndexOf('\n') + 1;
          newText = text.slice(0, lineStart) + '- ' + text.slice(lineStart);
          newCursorPos = start + 2;
          break;
        case 'link':
          newText = text.slice(0, start) + '[link text](url)' + text.slice(start);
          newCursorPos = start + 1;
          break;
      }
      
      setText(newText);
      onChangeText(newText, newText);
      
      setTimeout(() => {
        inputRef.current?.setNativeProps({
          selection: { start: newCursorPos, end: newCursorPos }
        });
      }, 0);
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
          newStart = start + 2;
          newEnd = end + 2;
        }
        break;
      case 'italic':
        if (selectedText.startsWith('*') && selectedText.endsWith('*') && !selectedText.startsWith('**')) {
          newText = text.slice(0, start) + selectedText.slice(1, -1) + text.slice(end);
          newEnd = end - 2;
        } else {
          newText = text.slice(0, start) + '*' + selectedText + '*' + text.slice(end);
          newStart = start + 1;
          newEnd = end + 1;
        }
        break;
      case 'list':
        const lines = selectedText.split('\n');
        const formattedLines = lines.map(line => {
          if (line.startsWith('- ')) return line;
          return '- ' + line;
        });
        const newSelectedText = formattedLines.join('\n');
        newText = text.slice(0, start) + newSelectedText + text.slice(end);
        newEnd = start + newSelectedText.length;
        break;
      case 'link':
        newText = text.slice(0, start) + '[' + selectedText + '](url)' + text.slice(end);
        newStart = start + 1;
        newEnd = end + 1;
        break;
    }

    setText(newText);
    onChangeText(newText, newText);

    setTimeout(() => {
      inputRef.current?.setNativeProps({
        selection: { start: newStart, end: newEnd }
      });
    }, 0);
  };

  const renderStyledText = () => {
    const lines = text.split('\n');
    return lines.map((line, lineIndex) => {
      const parts: React.ReactNode[] = [];
      let currentIndex = 0;

      const boldRegex = /\*\*(.*?)\*\*/g;
      const italicRegex = /\*(.*?)\*/g;
      const linkRegex = /\[(.*?)\]\((.*?)\)/g;
      const listRegex = /^- /;

      const isListItem = listRegex.test(line);
      const processedLine = isListItem ? line.slice(2) : line;

      let match;
      const matches: { start: number; end: number; type: string; text: string; url?: string }[] = [];

      boldRegex.lastIndex = 0;
      while ((match = boldRegex.exec(processedLine)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          type: 'bold',
          text: match[1]
        });
      }

      italicRegex.lastIndex = 0;
      while ((match = italicRegex.exec(processedLine)) !== null) {
        const isBold = matches.some(m => m.start <= match!.index && m.end >= match!.index + match![0].length);
        if (!isBold) {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            type: 'italic',
            text: match[1]
          });
        }
      }

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

      matches.forEach((m, i) => {
        if (currentIndex < m.start) {
          parts.push(
            <Text key={`text-${lineIndex}-${i}`} style={styles.normalText}>
              {processedLine.slice(currentIndex, m.start)}
            </Text>
          );
        }

        switch (m.type) {
          case 'bold':
            parts.push(
              <Text key={`bold-${lineIndex}-${i}`} style={styles.boldText}>
                {m.text}
              </Text>
            );
            break;
          case 'italic':
            parts.push(
              <Text key={`italic-${lineIndex}-${i}`} style={styles.italicText}>
                {m.text}
              </Text>
            );
            break;
          case 'link':
            parts.push(
              <Text key={`link-${lineIndex}-${i}`} style={styles.linkText}>
                {m.text}
              </Text>
            );
            break;
        }

        currentIndex = m.end;
      });

      if (currentIndex < processedLine.length) {
        parts.push(
          <Text key={`text-${lineIndex}-end`} style={styles.normalText}>
            {processedLine.slice(currentIndex)}
          </Text>
        );
      }

      return (
        <Text key={lineIndex} style={styles.line}>
          {isListItem && <Text style={styles.bullet}>• </Text>}
          {parts.length > 0 ? parts : <Text style={styles.normalText}>{processedLine}</Text>}
          {lineIndex < lines.length - 1 && '\n'}
        </Text>
      );
    });
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolButton, activeStyles.has('bold') && styles.activeToolButton]}
          onPress={() => applyStyle('bold')}
        >
          <Bold size={18} color={activeStyles.has('bold') ? '#EF4444' : '#6B7280'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, activeStyles.has('italic') && styles.activeToolButton]}
          onPress={() => applyStyle('italic')}
        >
          <Italic size={18} color={activeStyles.has('italic') ? '#EF4444' : '#6B7280'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => applyStyle('list')}
        >
          <List size={18} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => applyStyle('link')}
        >
          <LinkIcon size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.editorContainer}>
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={text}
          onChangeText={(newText) => {
            setText(newText);
            onChangeText(newText, newText);
          }}
          onSelectionChange={(e) => updateSelection(e.nativeEvent.selection)}
          multiline
          autoFocus={autoFocus}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
        />
        <View style={styles.styledTextContainer} pointerEvents="none">
          <Text style={styles.styledText}>
            {renderStyledText()}
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
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  toolButton: {
    padding: 8,
    marginRight: 4,
    borderRadius: 6,
  },
  activeToolButton: {
    backgroundColor: '#FEE2E2',
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
    textAlignVertical: 'top',
  },
  styledTextContainer: {
    padding: 16,
    pointerEvents: 'none',
  },
  styledText: {
    fontSize: 16,
    lineHeight: 24,
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
