/**
 * Tiptap WYSIWYG Editor Component
 * 
 * Rich text editor for marketing campaign templates.
 * Supports bold, italic, links, and lists.
 */

'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect } from 'react';

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
// Main Editor Component
// ============================================================================

export function TiptapEditor({ 
  content, 
  onChange, 
  placeholder = 'Start typing...',
  className = '',
}: TiptapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Disable heading as we don't need it for email content
        heading: false,
        // Keep paragraph, bold, italic, lists
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

    // Cancelled
    if (url === null) return;

    // Empty - remove link
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // Set link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className={`border border-gray-300 rounded-lg bg-gray-50 ${className}`}>
        <div className="p-3 text-gray-400">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-gray-50 p-2 flex gap-1 flex-wrap">
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

        <div className="w-px bg-gray-300 mx-1" />

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

        <div className="w-px bg-gray-300 mx-1" />

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
      </div>

      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className="bg-white text-gray-900"
      />

      {/* Styles for placeholder */}
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
      `}</style>
    </div>
  );
}

export default TiptapEditor;
