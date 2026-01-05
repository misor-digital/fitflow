/**
 * Tiptap WYSIWYG Editor Component
 * 
 * Rich text editor for marketing campaign templates.
 * Supports bold, italic, underline, strike, links, lists, and more.
 */

'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Youtube from '@tiptap/extension-youtube';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import { useCallback, useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

interface TiptapEditorProps {
  /** Initial HTML content */
  content: string;
  /** Callback when content changes */
  onChange: (html: string) => void;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Additional CSS classes for the container */
  className?: string;
}

// ============================================================================
// Toolbar Button Component
// ============================================================================

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        px-2 py-1 rounded text-sm font-medium transition-colors
        ${isActive 
          ? 'bg-gray-200 text-gray-900' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Toolbar Divider
// ============================================================================

function ToolbarDivider() {
  return <div className="w-px bg-gray-300 mx-1" />;
}

// ============================================================================
// Main Editor Component
// ============================================================================

export function TiptapEditor({ 
  content, 
  onChange, 
  placeholder = 'Start typing...',
  className = '',
}: TiptapEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          HTMLAttributes: {
            style: 'margin: 0; padding-left: 20px;',
          },
        },
        orderedList: {
          HTMLAttributes: {
            style: 'margin: 0; padding-left: 20px;',
          },
        },
        codeBlock: {
          HTMLAttributes: {
            style: 'background: #f3f4f6; padding: 12px; border-radius: 6px; font-family: monospace;',
          },
        },
        blockquote: {
          HTMLAttributes: {
            style: 'border-left: 3px solid #d1d5db; padding-left: 12px; margin: 8px 0; color: #6b7280;',
          },
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          style: 'color: #ff6a00; text-decoration: underline;',
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Underline,
      Subscript,
      Superscript,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image.configure({
        HTMLAttributes: {
          style: 'max-width: 100%; height: auto;',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          style: 'border-collapse: collapse; width: 100%;',
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          style: 'border: 1px solid #d1d5db; padding: 8px;',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          style: 'border: 1px solid #d1d5db; padding: 8px; background: #f3f4f6; font-weight: bold;',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Youtube.configure({
        width: 480,
        height: 270,
      }),
      Dropcursor,
      Gapcursor,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[100px] p-3',
      },
    },
  });

  // Update content when prop changes (for external updates)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Link handling
  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl || 'https://');

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  // Image handling
  const addImage = useCallback(() => {
    if (!editor) return;

    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  // YouTube handling
  const addYoutube = useCallback(() => {
    if (!editor) return;

    const url = window.prompt('Enter YouTube URL:');
    if (url) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  }, [editor]);

  // Color handling
  const setColor = useCallback((color: string) => {
    if (!editor) return;
    editor.chain().focus().setColor(color).run();
    setShowColorPicker(false);
  }, [editor]);

  if (!editor) {
    return (
      <div className={`border border-gray-300 rounded-lg bg-gray-50 ${className}`}>
        <div className="p-3 text-gray-400">Loading editor...</div>
      </div>
    );
  }

  const colors = ['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar Row 1 - Text Formatting */}
      <div className="border-b border-gray-200 bg-gray-50 p-2 flex gap-1 flex-wrap">
        {/* Text Style */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline (Ctrl+U)"
        >
          <span className="underline">U</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <span className="line-through">S</span>
        </ToolbarButton>

        <ToolbarDivider />

        {/* Subscript/Superscript */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          isActive={editor.isActive('subscript')}
          title="Subscript"
        >
          X<sub>2</sub>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          isActive={editor.isActive('superscript')}
          title="Superscript"
        >
          X<sup>2</sup>
        </ToolbarButton>

        <ToolbarDivider />

        {/* Color */}
        <div className="relative">
          <ToolbarButton
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Text Color"
          >
            🎨
          </ToolbarButton>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded shadow-lg z-10 flex gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setColor(color)}
                  className="w-6 h-6 rounded border border-gray-300"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              <button
                type="button"
                onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false); }}
                className="w-6 h-6 rounded border border-gray-300 bg-white text-xs"
                title="Remove color"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
          isActive={editor.isActive('highlight')}
          title="Highlight"
        >
          <span className="bg-yellow-200 px-1">H</span>
        </ToolbarButton>

        <ToolbarDivider />

        {/* Link */}
        <ToolbarButton
          onClick={setLink}
          isActive={editor.isActive('link')}
          title="Add Link"
        >
          🔗
        </ToolbarButton>

        {editor.isActive('link') && (
          <ToolbarButton
            onClick={() => editor.chain().focus().unsetLink().run()}
            title="Remove Link"
          >
            ❌
          </ToolbarButton>
        )}

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          H1
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          H2
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          H3
        </ToolbarButton>
      </div>

      {/* Toolbar Row 2 - Structure & Media */}
      <div className="border-b border-gray-200 bg-gray-50 p-2 flex gap-1 flex-wrap">
        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          • List
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          1. List
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive('taskList')}
          title="Task List"
        >
          ☑ Tasks
        </ToolbarButton>

        <ToolbarDivider />

        {/* Text Align */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          ⬅
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          ⬌
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          ➡
        </ToolbarButton>

        <ToolbarDivider />

        {/* Block Elements */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Blockquote"
        >
          ❝
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Inline Code"
        >
          {'</>'}
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Code Block"
        >
          {'{ }'}
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          ―
        </ToolbarButton>

        <ToolbarDivider />

        {/* Media */}
        <ToolbarButton
          onClick={addImage}
          title="Insert Image"
        >
          🖼️
        </ToolbarButton>

        <ToolbarButton
          onClick={addYoutube}
          title="Insert YouTube Video"
        >
          ▶️
        </ToolbarButton>

        <ToolbarDivider />

        {/* Table */}
        <ToolbarButton
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Insert Table"
        >
          📊
        </ToolbarButton>

        {editor.isActive('table') && (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              title="Add Column"
            >
              +Col
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().addRowAfter().run()}
              title="Add Row"
            >
              +Row
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().deleteTable().run()}
              title="Delete Table"
            >
              🗑️
            </ToolbarButton>
          </>
        )}

        <ToolbarDivider />

        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          ↩
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
        >
          ↪
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className="bg-white text-gray-900"
      />

      {/* Styles for placeholder and editor elements */}
      <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #9ca3af;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .ProseMirror:focus {
          outline: none;
        }
        .ProseMirror p {
          margin: 0 0 0.5em 0;
        }
        .ProseMirror p:last-child {
          margin-bottom: 0;
        }
        .ProseMirror ul,
        .ProseMirror ol {
          margin: 0.5em 0;
        }
        .ProseMirror li {
          margin: 0.25em 0;
        }
        .ProseMirror a {
          color: #ff6a00;
          text-decoration: underline;
        }
        .ProseMirror h1 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.5em 0;
        }
        .ProseMirror h2 {
          font-size: 1.25em;
          font-weight: bold;
          margin: 0.5em 0;
        }
        .ProseMirror h3 {
          font-size: 1.1em;
          font-weight: bold;
          margin: 0.5em 0;
        }
        .ProseMirror code {
          background: #f3f4f6;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: monospace;
        }
        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }
        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .ProseMirror ul[data-type="taskList"] li > label {
          flex-shrink: 0;
        }
        .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 0.5em 0;
        }
        .ProseMirror th,
        .ProseMirror td {
          border: 1px solid #d1d5db;
          padding: 8px;
          text-align: left;
        }
        .ProseMirror th {
          background: #f3f4f6;
          font-weight: bold;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
        }
        .ProseMirror iframe {
          max-width: 100%;
        }
        .ProseMirror .ProseMirror-gapcursor {
          display: none;
          pointer-events: none;
          position: absolute;
        }
        .ProseMirror .ProseMirror-gapcursor:after {
          content: "";
          display: block;
          position: absolute;
          top: -2px;
          width: 20px;
          border-top: 1px solid black;
          animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
        }
        @keyframes ProseMirror-cursor-blink {
          to {
            visibility: hidden;
          }
        }
      `}</style>
    </div>
  );
}

export default TiptapEditor;
