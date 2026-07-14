<script lang="ts">
export interface MarkdownEditorExpose {
  insertMarkdown: (text: string) => void
}
</script>

<script setup lang="ts">
import { defaultKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

const model = defineModel<string>({ required: true })
const editorRoot = useTemplateRef<HTMLDivElement>('editorRoot')
let editorView: EditorView | undefined

onMounted(() => {
  if (!editorRoot.value) return

  const state = EditorState.create({
    doc: model.value,
    extensions: [
      keymap.of(defaultKeymap),
      markdown(),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({
        'aria-label': 'Markdown / Comark 正文编辑器',
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) model.value = update.state.doc.toString()
      }),
    ],
  })
  editorView = new EditorView({ state, parent: editorRoot.value })
})

function insertMarkdown(text: string) {
  if (!text) return

  if (!editorView) {
    model.value += text
    return
  }

  const selection = editorView.state.selection.main
  editorView.dispatch({
    changes: {
      from: selection.from,
      to: selection.to,
      insert: text,
    },
    selection: {
      anchor: selection.from + text.length,
    },
    scrollIntoView: true,
  })
  editorView.focus()
}

defineExpose<MarkdownEditorExpose>({ insertMarkdown })

watch(model, (nextValue) => {
  if (!editorView || nextValue === editorView.state.doc.toString()) return
  editorView.dispatch({ changes: { from: 0, to: editorView.state.doc.length, insert: nextValue } })
})

onBeforeUnmount(() => {
  editorView?.destroy()
  editorView = undefined
})
</script>

<template>
  <div ref="editorRoot" class="markdown-editor" />
</template>

<style scoped>
.markdown-editor {
  min-height: 32rem;
  overflow: hidden;
  border: 1px solid var(--outline-ghost, var(--border));
  border-radius: 0.5rem;
  background: var(--bg-elevated);
}

.markdown-editor :deep(.cm-editor) {
  min-height: 32rem;
  background: var(--bg-elevated);
  color: var(--text);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9rem;
}

.markdown-editor :deep(.cm-content) {
  min-height: 32rem;
  padding: 0.8rem 0;
  caret-color: var(--accent);
}

.markdown-editor :deep(.cm-gutters) {
  border-right: 1px solid var(--outline-ghost, var(--border));
  background: var(--bg-soft);
  color: var(--text-faint);
}

.markdown-editor :deep(.cm-activeLine),
.markdown-editor :deep(.cm-activeLineGutter) {
  background: color-mix(in srgb, var(--accent-soft) 55%, transparent);
}

.markdown-editor :deep(.cm-selectionBackground),
.markdown-editor :deep(.cm-content ::selection) {
  background: var(--accent-soft) !important;
}

.markdown-editor :deep(.cm-cursor) {
  border-left-color: var(--accent);
}

.markdown-editor :deep(.cm-focused) {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
</style>
