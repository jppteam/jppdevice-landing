// The same clock app, both supported languages, written against the real SDK
// (verified in jppdos app docs/). Kept deliberately short — the point is that a
// working app is tiny.

export const clockPython = `import jppsdk

def create_app(sdk):
    return Clock(sdk)

class Clock:
    def __init__(self, sdk):
        self.sdk = sdk

    def on_start(self):
        self._draw()

    def on_idle(self):
        if self.sdk.poll_key() == jppsdk.KEY_CENTER_LONG:
            self.sdk.request_close()
        self._draw()

    def _draw(self):
        try:
            now = self.sdk.get_time()        # "YYYY-MM-DD HH:mm"
        except jppsdk.SdkError:
            now = "--:--"                    # no RTC and time unset
        self.sdk.set_frame(["Clock", "", now, "", "hold OK to exit"])
`

export const clockC = `#include "jpp_sdk_bridge.h"

void jpp_app_entry(jpp_sdk_context_t *ctx)
{
    jpp_sdk_key_event_t key;
    jpp_broker_result_t t;

    for (;;) {
        const char *now = jpp_sdk_get_time(ctx, &t) == JPP_SDK_OK
                              ? t.text : "--:--";
        const char *lines[] = { "Clock", "", now, "", "hold OK to exit" };
        jpp_sdk_set_frame(ctx, lines, 5);

        /* refresh every second; also wakes on any key press */
        jpp_sdk_wait_key(ctx, 1000, &key);
        if (key == JPP_SDK_KEY_CENTER_LONG) {
            break;
        }
    }
    jpp_sdk_request_close(ctx);
}
`

// Every app ships a manifest.json next to its entry file — metadata plus the
// capabilities it may request. The clock needs none.
export const manifestJson = `{
  "schema_version": 2,
  "app_id": "clock",
  "name": "Clock",
  "version": "1.0.0",
  "sdk_min": 1,
  "sdk_max": 1,
  "app_type": "micropython",
  "entry": "main.mpy",
  "capabilities": [],
  "background": { "enabled": false }
}
`

export const codeSamples = [
  { id: 'py', label: 'MicroPython', lang: 'python', file: 'main.py', code: clockPython },
  { id: 'c', label: 'Native C', lang: 'c', file: 'clock.c', code: clockC },
  { id: 'manifest', label: 'Manifest', lang: 'json', file: 'manifest.json', code: manifestJson },
]

// The SDK surface, grouped — for the "what you get" list next to the code.
// `calls` are literal API names (not translated); group names live in the
// i18n locale files under developers.sdkGroups.<id>.
export const sdkGroups = [
  { id: 'appControl', calls: 'set_frame · request_close · log' },
  { id: 'keyInput', calls: 'poll_key · wait_key' },
  { id: 'canvas', calls: 'canvas_write · draw_pixel · clear · fullscreen' },
  { id: 'uiHelpers', calls: 'dialog · list · input · confirm · file_pick' },
  { id: 'soundLight', calls: 'buzzer_play · play_sequence · led_set_color' },
  { id: 'deviceStatus', calls: 'device_status · get_time · is_dummy_mode' },
  { id: 'storage', calls: 'file I/O (scoped/shared/full) · kv_get/set/delete' },
  { id: 'comms', calls: 'ipc_send/recv · http_request · net (TCP) · ble' },
]

// Capability tiers — the honest security story. Copy lives in the i18n
// locale files under developers.tiers.<id>.
export const capabilityTiers = [
  { id: 'noPermission' },
  { id: 'prompted' },
]

export default codeSamples
