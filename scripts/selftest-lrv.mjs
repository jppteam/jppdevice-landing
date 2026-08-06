// Build-time self-test for the LRV Ed25519 verification path (see
// "dev only assets/lrv-verify-page-spec.md" §6/§10). Runs the worked test
// vector (positive) and a bit-flipped variant of each signature (negative).
// mfr_pubkey is a load-bearing constant — this catches a transcription error
// or a swapped key before it ships.

import {
  utf8ToBytes,
  hexToBytes,
  bytesToHex,
  b64urlToBytes,
  bytesToB64url,
  verifyCertBytes,
  verifyResponseBytes,
  parseCertText,
  computeVerdict,
  VERDICT,
  MFR_PUBKEY_HEX,
} from '../src/lib/lrv.js'

const vector = {
  mfr_pubkey_hex: '78d8ff9fc9a4c9898f02aa3d3ad4342037facbd0144ad8576f7fdc69922f782f',
  cert_text:
    'serial=7\nrun_size=20\ndevice_type=0\nhwid=AA:BB:CC:DD:EE:FF\ndevice_pubkey=d04ab232742bb4ab3a1368bd4615e4e6d0224ab71a016baf8520a332c9778737\n',
  cert_sig_hex:
    'E719EC979348409550441473D39D6DBAAA3C6ACAE7F3D55DFCB784DC55EF0CBC8658C992B4D177A7EC2F9F52E3E6BA8631412B7D30F64CF1920E7A1AF278600B',
  cert_b64url:
    'c2VyaWFsPTcKcnVuX3NpemU9MjAKZGV2aWNlX3R5cGU9MApod2lkPUFBOkJCOkNDOkREOkVFOkZGCmRldmljZV9wdWJrZXk9ZDA0YWIyMzI3NDJiYjRhYjNhMTM2OGJkNDYxNWU0ZTZkMDIyNGFiNzFhMDE2YmFmODUyMGEzMzJjOTc3ODczNwo=',
  cert_sig_b64url:
    '5xnsl5NIQJVQRBRz051tuqo8asrn89Vd_LeE3FXvDLyGWMmStNF3p-wvn1Lj5rqGMUErfTD2TPGSDnoa8nhgCw==',
  challenge: 'Ada|2026-08-06T12:00:00Z',
  resp_sig_hex:
    '84581C4A23EB7088680AC52F69F71A832B1B5A7485B44CD5A3CD983E4A5C90CFD621561D8975DB8D328D97D0E7D20F5AD43F881C4435B76DBC0DE30A1297180F',
  resp_sig_b64url:
    'hFgcSiPrcIhoCsUvafcagysbWnSFtEzVo82YPkpckM_WIVYdiXXbjTKNl9Dn0g9a1D-IHEQ1t228DeMKEpcYDw==',
}

let failures = 0

function check(label, cond) {
  if (cond) {
    console.log(`  ok  - ${label}`)
  } else {
    failures++
    console.error(`FAIL  - ${label}`)
  }
}

function flipOneBit(hex) {
  const bytes = hexToBytes(hex)
  bytes[0] ^= 0x01
  return bytesToHex(bytes)
}

console.log('LRV self-test — mfr_pubkey:', MFR_PUBKEY_HEX)

check('mfr_pubkey matches spec constant', MFR_PUBKEY_HEX === vector.mfr_pubkey_hex)

// --- base64url codec round-trips against the spec's own known-good values ---
check('cert_b64url decodes to the exact cert text', bytesToUtf8Compat(b64urlToBytes(vector.cert_b64url)) === vector.cert_text)
check('cert_sig_b64url decodes to the same bytes as cert_sig_hex', bytesToHex(b64urlToBytes(vector.cert_sig_b64url)).toUpperCase() === vector.cert_sig_hex)
check('resp_sig_b64url decodes to the same bytes as resp_sig_hex', bytesToHex(b64urlToBytes(vector.resp_sig_b64url)).toUpperCase() === vector.resp_sig_hex)
check('re-encoding cert bytes to b64url matches the spec value', bytesToB64url(utf8ToBytes(vector.cert_text)) === vector.cert_b64url)

// --- Check 1: cert authenticity (positive) ---
const certBytes = utf8ToBytes(vector.cert_text)
const certSigBytes = hexToBytes(vector.cert_sig_hex)
const certValid = verifyCertBytes(certBytes, certSigBytes)
check('Check 1 (cert_sig) verifies against mfr_pubkey', certValid)

const parsed = parseCertText(vector.cert_text)
check('cert text parses into the 5 expected fields', !!parsed && parsed.serial === '7' && parsed.runSize === '20' && parsed.deviceType === 0 && parsed.hwid === 'AA:BB:CC:DD:EE:FF' && parsed.devicePubkeyHex === 'd04ab232742bb4ab3a1368bd4615e4e6d0224ab71a016baf8520a332c9778737')

// --- Check 2: live response (positive) ---
const devicePubkeyBytes = hexToBytes(parsed.devicePubkeyHex)
const challengeBytes = utf8ToBytes(vector.challenge)
const respSigBytes = hexToBytes(vector.resp_sig_hex)
const responseValid = verifyResponseBytes(challengeBytes, respSigBytes, devicePubkeyBytes)
check('Check 2 (resp_sig) verifies against cert-derived device_pubkey', responseValid)

const verdict = computeVerdict({
  certAttempted: true,
  certValid,
  certParsed: parsed,
  responseAttempted: true,
  responseValid,
})
check('combined verdict is VERIFIED for the full positive vector', verdict === VERDICT.VERIFIED)

// --- Negative: bit-flipped cert_sig must fail cleanly, not throw ---
const badCertSig = hexToBytes(flipOneBit(vector.cert_sig_hex))
let badCertValid
try {
  badCertValid = verifyCertBytes(certBytes, badCertSig)
  check('bit-flipped cert_sig fails Check 1 without throwing', badCertValid === false)
} catch (e) {
  failures++
  console.error('FAIL  - bit-flipped cert_sig threw instead of failing cleanly:', e)
}

// --- Negative: bit-flipped resp_sig must fail cleanly, not throw ---
const badRespSig = hexToBytes(flipOneBit(vector.resp_sig_hex))
try {
  const badResponseValid = verifyResponseBytes(challengeBytes, badRespSig, devicePubkeyBytes)
  check('bit-flipped resp_sig fails Check 2 without throwing', badResponseValid === false)
} catch (e) {
  failures++
  console.error('FAIL  - bit-flipped resp_sig threw instead of failing cleanly:', e)
}

// --- Negative: wrong pubkey (device_pubkey instead of mfr_pubkey) must not verify ---
check('cert_sig does not verify against the wrong key', verifyCertBytes(certBytes, certSigBytes, devicePubkeyBytes) === false)

function bytesToUtf8Compat(bytes) {
  return new TextDecoder().decode(bytes)
}

console.log('')
if (failures > 0) {
  console.error(`LRV self-test FAILED (${failures} check${failures === 1 ? '' : 's'})`)
  process.exit(1)
} else {
  console.log('LRV self-test passed.')
}
