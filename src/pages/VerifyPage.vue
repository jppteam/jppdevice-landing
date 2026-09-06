<script setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import SectionHeading from '../components/SectionHeading.vue'
import IconGlyph from '../components/IconGlyph.vue'
import VerifyForm from '../components/verify/VerifyForm.vue'
import VerifyCertSummary from '../components/verify/VerifyCertSummary.vue'
import VerifyResult from '../components/verify/VerifyResult.vue'
import { useLrvVerify } from '../lib/useLrvVerify.js'

const { t } = useI18n()
const route = useRoute()
const { inputs, result, prefillWarnings, hasAnyInput, applyPrefill, verify, reset } = useLrvVerify()

// Once a result is on screen the form collapses to a quiet recap; this brings
// it back for editing without clearing what was entered.
const showForm = ref(false)

function runVerify() {
  verify()
  showForm.value = false
}

function resetForm() {
  reset()
  showForm.value = false
}

onMounted(() => {
  if (applyPrefill(route.query)) runVerify()
})
</script>

<template>
  <div class="vpage">
    <div class="container container-narrow">
      <SectionHeading :title="t('verify.title')"/>

      <ul v-if="prefillWarnings.length" class="mg-card vpage__prefill-warn">
        <IconGlyph class="vpage__prefill-warn-icon" name="alert" /> 
        <li v-for="code in prefillWarnings" :key="code" class="vpage__prefill-warn-item">
          {{ t(`verify.prefill.${code}`) }}
        </li>
      </ul>

      <VerifyResult v-if="result" :result="result" />

      <VerifyCertSummary
        v-if="result && !showForm"
        :cert="inputs.cert"
        :challenge="inputs.challenge"
        :resp-sig="inputs.respSig"
        @edit="showForm = true"
      />

      <VerifyForm
        v-if="!result || showForm"
        v-model:cert="inputs.cert"
        v-model:cert-sig="inputs.certSig"
        v-model:challenge="inputs.challenge"
        v-model:resp-sig="inputs.respSig"
        :response-partial="!!result?.responsePartial"
        :can-reset="hasAnyInput"
        @submit="runVerify"
        @reset="resetForm"
      />

      <p class="vpage__footnote">
        {{ t('verify.localNote') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.vpage {
  padding-block: clamp(2.5rem, 1.5rem + 4vw, 4.5rem) var(--section-y);
  background: var(--paper);
  min-height: 60vh;
}
.vpage__prefill-warn {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-auto-flow: row;
  gap: 0.25rem 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
}
.vpage__prefill-warn-icon{
  width: 1.5em;
  height: 1.5em;
  color: var(--error);
  grid-row: 1 / -1;
}
.vpage__prefill-warn-item {
  font-size: 0.85rem;
  color: var(--error-deep);
  font-weight: 600;
  display: block;
  grid-column: 2;
}
.vpage__footnote {
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-size: 0.82rem;
  color: var(--ink-3);
}
</style>
