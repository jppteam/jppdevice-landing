<script setup>
import { useI18n } from 'vue-i18n'
import IconGlyph from '../IconGlyph.vue'

const cert = defineModel('cert', { type: String, required: true })
const certSig = defineModel('certSig', { type: String, required: true })
const challenge = defineModel('challenge', { type: String, required: true })
const respSig = defineModel('respSig', { type: String, required: true })

defineProps({
  responsePartial: { type: Boolean, default: false },
  canReset: { type: Boolean, default: false },
})
defineEmits(['submit', 'reset'])

const { t } = useI18n()

// Every field shares the same paste-friendly attributes and its label,
// placeholder and error copy all hang off one `verify.form.*` key — only the
// row count differs, with 0 meaning a single-line input.
const FIELDS = [
  { id: 'v-cert', key: 'cert', model: cert, rows: 6, required: true },
  { id: 'v-certsig', key: 'certSig', model: certSig, rows: 2, required: true },
  { id: 'v-challenge', key: 'challenge', model: challenge, rows: 0 },
  { id: 'v-respsig', key: 'respSig', model: respSig, rows: 2 },
]
</script>

<template>
  <form class="mg-card vform" @submit.prevent="$emit('submit')">
    <div class="mg-card__heading">
      <IconGlyph name="shield" />
      <h3>{{ t('verify.form.title') }}</h3>
    </div>
    <hr class="mg-card__sep">

    <div v-for="field in FIELDS" :key="field.id" class="field">
      <label :for="field.id">
        {{ t(`verify.form.${field.key}`) }}
        <span v-if="field.required" class="req">*</span>
      </label>
      <textarea
        v-if="field.rows"
        :id="field.id"
        v-model="field.model.value"
        class="mono"
        :rows="field.rows"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        :placeholder="t(`verify.form.${field.key}Placeholder`)"
      />
      <input
        v-else
        :id="field.id"
        v-model="field.model.value"
        type="text"
        class="mono"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        :placeholder="t(`verify.form.${field.key}Placeholder`)"
      >
    </div>

    <p v-if="responsePartial" class="field-hint">
      <IconGlyph name="alert" /> {{ t('verify.form.responsePartialHint') }}
    </p>

    <div class="mg-card__actions">
      <button type="submit" class="btn btn--yellow">{{ t('verify.form.submit') }}</button>
    </div>
  </form>
</template>

<style scoped>
.vform {
  margin-bottom: 1.5rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1.1rem;
}
.field label {
  font-size: 0.85rem;
  color: var(--ink-3);
}
.req {
  color: var(--error);
}
.field textarea,
.field input {
  font: inherit;
  font-size: 0.88rem;
  padding: 0.7em 0.85em;
  border: 1.5px solid var(--line);
  border-radius: var(--radius-sm);
  color: var(--ink);
  background: var(--white);
  resize: vertical;
  width: 100%;
  font-family: var(--font-mono);
}
.field textarea:focus-visible,
.field input:focus-visible {
  outline: none;
  border-color: var(--ink);
}
.field-hint {
  display: flex;
  align-items: center;
  gap: 0.4em;
  font-size: 0.82rem;
  color: var(--warning-deep);
  margin: -0.5rem 0 1rem;
}
</style>
