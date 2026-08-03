<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Confirm' },
  cancelLabel: { type: String, default: 'Cancel' },
  variant: { type: String, default: 'default' }, // default | danger
  inputMode: { type: Boolean, default: false },
  inputValue: { type: String, default: '' },
  inputLabel: { type: String, default: '' },
})
const emit = defineEmits(['update:open', 'update:inputValue', 'confirm', 'cancel'])

const inputRef = ref(null)

function close(cancelled) {
  if (cancelled) emit('cancel')
  emit('update:open', false)
}

function onConfirm() {
  if (props.inputMode && !props.inputValue.trim()) return
  emit('confirm')
  emit('update:open', false)
}

function onKeydown(e) {
  if (e.key === 'Escape') close(true)
}

function onAfterEnter() {
  inputRef.value?.focus()
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', onKeydown)
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', onKeydown)
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="cdlg-fade" @after-enter="onAfterEnter">
      <div v-if="open" class="cdlg" @click.self="close(true)">
        <div class="cdlg__panel" role="dialog" aria-modal="true" :aria-label="title">
          <h3 class="cdlg__title">{{ title }}</h3>
          <p v-if="message" class="cdlg__message">{{ message }}</p>

          <div v-if="inputMode" class="cdlg__field">
            <label v-if="inputLabel" class="cdlg__label">{{ inputLabel }}</label>
            <input
              ref="inputRef"
              class="cdlg__input"
              type="text"
              :value="inputValue"
              @input="$emit('update:inputValue', $event.target.value)"
              @keydown.enter="onConfirm"
            />
          </div>

          <div class="cdlg__actions">
            <button class="btn btn--ghost btn--sm" @click="close(true)">{{ cancelLabel }}</button>
            <button
              class="btn btn--sm"
              :class="variant === 'danger' ? 'cdlg__confirm--danger' : 'btn--ink'"
              :disabled="inputMode && !inputValue.trim()"
              @click="onConfirm"
            >{{ confirmLabel }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cdlg {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(26, 26, 26, 0.55);
  backdrop-filter: blur(4px);
}
.cdlg__panel {
  width: min(420px, 100%);
  background: var(--white);
  border-radius: var(--radius-lg);
  padding: clamp(1.5rem, 1.25rem + 1vw, 1.85rem);
  box-shadow: var(--shadow-lg);
}
.cdlg__title {
  font-size: var(--fs-h3);
  margin-bottom: 0.5rem;
}
.cdlg__message {
  color: var(--ink-2);
  font-size: 0.92rem;
}
.cdlg__field {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.cdlg__label {
  font-size: 0.8rem;
  color: var(--ink-3);
}
.cdlg__input {
  font: inherit;
  font-family: var(--font-mono);
  padding: 0.6em 0.8em;
  border: 1.5px solid var(--line);
  border-radius: var(--radius-sm);
  color: var(--ink);
}
.cdlg__input:focus-visible {
  border-color: var(--ink);
}
.cdlg__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 1.5rem;
}
.cdlg__confirm--danger {
  background: var(--error);
  color: var(--white);
  border-color: var(--error-deep);
}
.cdlg__confirm--danger:hover {
  background: var(--error-deep);
  box-shadow: var(--shadow);
}
.cdlg__confirm--danger:disabled,
.cdlg__actions .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.cdlg-fade-enter-active,
.cdlg-fade-leave-active {
  transition: opacity 0.15s var(--ease);
}
.cdlg-fade-enter-from,
.cdlg-fade-leave-to {
  opacity: 0;
}

@media (max-width: 560px) {
  .cdlg__panel {
    padding: 1.35rem;
  }
}
</style>
