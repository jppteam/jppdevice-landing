<script setup>
import { onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ManagerConsole from './ManagerConsole.vue'

const { t } = useI18n()

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['update:open'])

function close() {
  emit('update:open', false)
}

function onKeydown(e) {
  if (e.key === 'Escape') close()
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
    <Transition name="lgmodal-fade">
      <div v-if="open" class="lgmodal" @click.self="close">
        <div class="lgmodal__panel" role="dialog" aria-modal="true" :aria-label="t('manager.console.title')">
          <ManagerConsole closable @close="close" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.lgmodal {
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
.lgmodal__panel {
  width: min(640px, 100%);
  max-height: min(85vh, 720px);
  box-shadow: var(--shadow-lg);
  border-radius: var(--radius-lg);
}
.lgmodal__panel :deep(.con) {
  border-radius: var(--radius-lg);
}
.lgmodal__panel :deep(.con__body) {
  height: min(55vh, 480px);
}

.lgmodal-fade-enter-active,
.lgmodal-fade-leave-active {
  transition: opacity 0.15s var(--ease);
}
.lgmodal-fade-enter-from,
.lgmodal-fade-leave-to {
  opacity: 0;
}
</style>
