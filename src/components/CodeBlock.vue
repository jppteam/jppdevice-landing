<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  // [{ id, label, lang, file, code }]
  tabs: { type: Array, required: true },
})

const active = ref(props.tabs[0].id)
const current = computed(() => props.tabs.find((t) => t.id === active.value))

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Small, dependency-free highlighter for Python & C. Tokenizes comments,
// strings, numbers, and keywords into spans without disturbing HTML escaping.
const PY_KW = new Set(['import', 'def', 'class', 'return', 'if', 'elif', 'else', 'try', 'except', 'self', 'None', 'True', 'False', 'and', 'or', 'not', 'for', 'in', 'while', 'with', 'as', 'from', 'pass', 'raise'])
const C_KW = new Set(['void', 'int', 'char', 'const', 'for', 'if', 'else', 'return', 'break', 'while', 'struct', 'bool', 'true', 'false', 'sizeof', 'static', 'unsigned', 'size_t'])

function highlight(code, lang) {
  const kw = lang === 'python' ? PY_KW : C_KW
  const lineComment = lang === 'python' ? '#' : '//'
  return code
    .split('\n')
    .map((line) => highlightLine(line, kw, lineComment, lang))
    .join('\n')
}

function highlightLine(line, kw, lineComment, lang) {
  let out = ''
  let i = 0
  const n = line.length
  while (i < n) {
    const ch = line[i]
    // line comment
    if (line.startsWith(lineComment, i) && !insideStr) {
      out += `<span class="tok-com">${esc(line.slice(i))}</span>`
      break
    }
    // C block-comment (single line only, our samples use /* ... */ inline)
    if (lang === 'c' && line.startsWith('/*', i)) {
      const end = line.indexOf('*/', i + 2)
      const stop = end === -1 ? n : end + 2
      out += `<span class="tok-com">${esc(line.slice(i, stop))}</span>`
      i = stop
      continue
    }
    // strings
    if (ch === '"' || ch === "'") {
      let j = i + 1
      while (j < n && line[j] !== ch) { if (line[j] === '\\') j++; j++ }
      out += `<span class="tok-str">${esc(line.slice(i, Math.min(j + 1, n)))}</span>`
      i = j + 1
      continue
    }
    // C preprocessor
    if (lang === 'c' && ch === '#') {
      out += `<span class="tok-pre">${esc(line.slice(i))}</span>`
      break
    }
    // identifiers / keywords
    if (/[A-Za-z_]/.test(ch)) {
      let j = i
      while (j < n && /[A-Za-z0-9_]/.test(line[j])) j++
      const word = line.slice(i, j)
      if (kw.has(word)) out += `<span class="tok-kw">${esc(word)}</span>`
      else out += esc(word)
      i = j
      continue
    }
    // numbers
    if (/[0-9]/.test(ch)) {
      let j = i
      while (j < n && /[0-9a-fx.]/.test(line[j])) j++
      out += `<span class="tok-num">${esc(line.slice(i, j))}</span>`
      i = j
      continue
    }
    out += esc(ch)
    i++
  }
  return out
}

// (insideStr not tracked across the simple tokenizer; comment marker check is
// good enough for our curated samples.)
const insideStr = false

async function copy() {
  try {
    await navigator.clipboard.writeText(current.value.code)
    copied.value = true
    setTimeout(() => (copied.value = false), 1400)
  } catch (e) {
    /* clipboard unavailable */
  }
}
const copied = ref(false)
</script>

<template>
  <div class="cb">
    <div class="cb__bar">
      <div class="cb__tabs" role="tablist">
        <button
          v-for="t in tabs"
          :key="t.id"
          class="cb__tab"
          :class="{ 'is-active': t.id === active }"
          role="tab"
          :aria-selected="t.id === active"
          @click="active = t.id"
        >
          {{ t.label }}
        </button>
      </div>
      <div class="cb__meta">
        <span class="cb__file mono">{{ current.file }}</span>
        <button class="cb__copy" @click="copy">{{ copied ? t('codeBlock.copied') : t('codeBlock.copy') }}</button>
      </div>
    </div>
    <pre class="cb__pre"><code class="mono" v-html="highlight(current.code, current.lang)" /></pre>
  </div>
</template>

<style scoped>
.cb {
  background: #14161c;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  border: 1px solid #262a33;
  min-width: 0;
  max-width: 100%;
}
.cb__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: #0f1116;
  border-bottom: 1px solid #262a33;
  padding: 0 0.5rem 0 0;
}
.cb__tabs {
  display: flex;
}
.cb__tab {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.85rem;
  color: #9aa0ac;
  padding: 0.7rem 1.1rem;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}
.cb__tab:hover {
  color: #e7eaef;
}
.cb__tab.is-active {
  color: #fff;
  border-bottom-color: var(--yellow);
}
.cb__meta {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}
.cb__file {
  font-size: 0.75rem;
  color: #6b7280;
}
.cb__copy {
  font-family: var(--font-display);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #9aa0ac;
  border: 1px solid #2c313b;
  border-radius: 6px;
  padding: 0.25rem 0.6rem;
}
.cb__copy:hover {
  color: #fff;
  border-color: var(--yellow);
}
.cb__pre {
  margin: 0;
  padding: 1.25rem 1.35rem;
  overflow-x: auto;
  font-size: 0.82rem;
  line-height: 1.6;
  color: #e7eaef;
  tab-size: 4;
}
.cb__pre code {
  white-space: pre;
}
:deep(.tok-com) { color: #6b7280; font-style: italic; }
:deep(.tok-str) { color: #f7e08a; }
:deep(.tok-kw) { color: #ff9d5c; font-weight: 600; }
:deep(.tok-num) { color: #8fd3ff; }
:deep(.tok-pre) { color: #b58cff; }
</style>
