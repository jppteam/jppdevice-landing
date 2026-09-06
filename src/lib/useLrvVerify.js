// ---------------------------------------------------------------------------
// Form state and the two Ed25519 checks behind the /verify page. Lives here
// rather than in the component so the page stays presentational, and stays
// i18n-free on purpose — prefill problems come back as codes the caller
// translates.
// ---------------------------------------------------------------------------

import { computed, reactive, ref } from 'vue'
import {
  utf8ToBytes,
  bytesToUtf8,
  hexToBytes,
  b64urlToBytes,
  normalizeCertText,
  parseCertText,
  decodeSignatureInput,
  verifyCertBytes,
  verifyResponseBytes,
  splitChallengeForDisplay,
  computeVerdict,
  VERDICT,
} from './lrv.js'

const EMPTY_INPUTS = { cert: '', certSig: '', challenge: '', respSig: '' }

function decodeQueryCert(raw) {
  try {
    const bytes = b64urlToBytes(raw)
    return { bytes, text: bytesToUtf8(bytes) }
  } catch {
    return null
  }
}

export function useLrvVerify() {
  const inputs = reactive({ ...EMPTY_INPUTS })
  const result = ref(null)
  const prefillWarnings = ref([])

  // Flow 2 (query-param redirect) carries the exact issued cert bytes — those
  // get verified as-is, with none of the manual-paste cleanup below applied
  // (spec §4). We hold onto them for as long as the textarea still matches
  // what was decoded; editing the field switches back to the normal
  // manual-paste path automatically.
  let exact = null

  function certBytesForVerify() {
    if (exact && inputs.cert === exact.text) return exact.bytes
    return utf8ToBytes(normalizeCertText(inputs.cert))
  }

  // Fills the form from a device redirect's query params. Returns whether the
  // link arrived complete (and undamaged) enough to verify straight away.
  function applyPrefill(query) {
    let certOk = true

    if (typeof query.cert === 'string') {
      const decoded = decodeQueryCert(query.cert)
      if (decoded) {
        inputs.cert = decoded.text
        exact = decoded
      } else {
        certOk = false
        prefillWarnings.value.push('badCert')
      }
    }
    if (typeof query.certsig === 'string') inputs.certSig = query.certsig
    if (typeof query.challenge === 'string') inputs.challenge = query.challenge
    if (typeof query.resp === 'string') inputs.respSig = query.resp

    const hasMinimum = inputs.cert.trim() !== '' && inputs.certSig.trim() !== ''
    return hasMinimum && certOk
  }

  function verify() {
    const certBytes = inputs.cert.trim() ? certBytesForVerify() : null
    const certSigBytes = inputs.certSig.trim() ? decodeSignatureInput(inputs.certSig) : null
    const certAttempted = !!(certBytes && certBytes.length > 0 && certSigBytes)
    const certValid = certAttempted && verifyCertBytes(certBytes, certSigBytes)
    const certParsed = certBytes ? parseCertText(bytesToUtf8(certBytes)) : null

    const challengeRaw = inputs.challenge
    const respSigBytes = inputs.respSig.trim() ? decodeSignatureInput(inputs.respSig) : null
    const responseAttempted = certValid && !!challengeRaw && !!respSigBytes
    const responseValid = responseAttempted && certParsed
      ? verifyResponseBytes(utf8ToBytes(challengeRaw), respSigBytes, hexToBytes(certParsed.devicePubkeyHex))
      : false

    const verdict = computeVerdict({ certAttempted, certValid, certParsed, responseAttempted, responseValid })

    result.value = {
      verdict,
      // Never expose parsed fields from a cert whose signature didn't verify —
      // they're attacker-controlled text at that point, not authenticated data.
      certParsed: certValid ? certParsed : null,
      // Same rule for the challenge: only a verified response makes the
      // username/timestamp inside it a statement of fact.
      challenge: verdict === VERDICT.VERIFIED ? splitChallengeForDisplay(challengeRaw) : null,
      challengeRaw,
      responsePartial: certValid && !responseAttempted && !!(challengeRaw || respSigBytes),
    }
  }

  function reset() {
    Object.assign(inputs, EMPTY_INPUTS)
    result.value = null
    prefillWarnings.value = []
    exact = null
  }

  const hasAnyInput = computed(() => Object.values(inputs).some(Boolean))

  return { inputs, result, prefillWarnings, hasAnyInput, applyPrefill, verify, reset }
}
