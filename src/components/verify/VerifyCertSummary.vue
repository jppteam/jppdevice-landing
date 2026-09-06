<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { normalizeCertText, parseCertText } from '../../lib/lrv.js'

// Quiet summary shown in place of the form while a result is up. This just
// echoes back what the user entered — it is not an authenticity claim, so it
// parses the cert text regardless of whether the signature verified.
const props = defineProps({
  cert: { type: String, default: '' },
  challenge: { type: String, default: '' },
  respSig: { type: String, default: '' },
})
defineEmits(['edit'])

const { t } = useI18n()

const parsed = computed(() => parseCertText(normalizeCertText(props.cert)))

const pubkeyShort = computed(() => {
  const pk = parsed.value?.devicePubkeyHex.toUpperCase()
  return pk ? `${pk.slice(0, 8)}…${pk.slice(-8)}` : null
})
</script>

<template>
  <div class="mg-card summary">
    <p class="summary__title">{{ t('verify.certsum.title') }}</p>
    <p class="summary__line" v-if="!parsed">
      {{ t('verify.certsum.certRaw', { chars: props.cert.trim().length }) }}
    </p>
    <template v-else>
      <p class="summary__line">{{ t('verify.certsum.serial', parsed) }}</p>
      <p class="summary__line">
        <i18n-t keypath="verify.certsum.hwid">
          <template #hwid>
            <span class="mono" v-if="parsed.hwid">{{ parsed.hwid }}</span>
            <span v-else>{{ t('verify.certsum.unknown') }}</span>
          </template>
        </i18n-t>
      </p>
      <p class="summary__line">
        <i18n-t keypath="verify.certsum.pubkey">
          <template #key>
            <span class="mono" v-if="pubkeyShort">{{ pubkeyShort }}</span>
            <span v-else>{{ t('verify.certsum.unknown') }}</span>
          </template>
        </i18n-t>
      </p>
    </template>
    <button type="button" class="btn btn--ghost" @click="$emit('edit')">
      {{ t('verify.certsum.edit') }}
    </button>
  </div>
</template>

<style scoped>
.summary {
  margin-bottom: 1.5rem;
  background: var(--paper-2);
  border-color: var(--line);
  color: var(--ink-3);
}
.summary__title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-2);
  margin-bottom: 0.6rem;
}
.summary__line {
  font-size: 0.88rem;
  overflow-wrap: anywhere;
}
.summary__line + .summary__line {
  margin-top: 0.25rem;
}
.summary__line--dim {
  font-size: 0.82rem;
  color: var(--ink-4, var(--ink-3));
}
.summary .btn {
  margin-top: 0.9rem;
}
</style>
