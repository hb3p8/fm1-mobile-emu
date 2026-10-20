/* SPDX-License-Identifier: GPL-3.0-only
 * KAWA's unmodified browser simulator (Omnipotard / Guizmoh) behind the mobile panel.
 * Its audio interrupt renders 256 frames; the main loop follows each block, as in
 * source/web/emulator.html. Translate the printed control labels, deinterleave audio,
 * swap the screen to the panel's RGB565 byte order and expose projects and settings.
 */
#include "firmware/src/kawa.c"

#define EXPORT(name) WASM_EXPORT(#name)
static const uint8_t button_map[14] = {2,3,4,5,6,7,8,9,10,11,12,13,0,1};
static const uint8_t encoder_map[7] = {0,1,6,2,3,4,5};
static uint32_t held, booted, audio_at = HALF_FRAMES;
static float out_l[1024], out_r[1024];
static uint16_t screen[240 * 240];
static uint32_t screen_gen = ~0u, settings_gen;
static uint8_t settings_seen[sizeof w_settings];

EXPORT(web_boot) void web_boot(void)
{
    if (booted) return;
    kawa_init();
    if (!w_settings[0]) kawa_lang(1);   /* English on first launch; saved choices remain the firmware's. */
    kawa_store_loaded();
    memcpy(settings_seen, w_settings, sizeof w_settings);
    booted = 1;
}
EXPORT(web_render) void web_render(uint32_t n)
{
    if (n > 1024u) n = 1024u;
    for (uint32_t k = 0; k < n; k++) {
        if (audio_at == HALF_FRAMES) {
            kawa_audio();
            kawa_step();
            audio_at = 0;
        }
        out_l[k] = w_out[2u * audio_at];
        out_r[k] = w_out[2u * audio_at++ + 1u];
    }
}
EXPORT(web_out_l) float *web_out_l(void) { return out_l; }
EXPORT(web_out_r) float *web_out_r(void) { return out_r; }
EXPORT(web_blits) uint32_t web_blits(void) { return w_screen_gen; }
EXPORT(web_fb) uint16_t *web_fb(void)
{
    if (screen_gen != w_screen_gen) {
        for (uint32_t i = 0; i < 240u * 240u; i++) screen[i] = (uint16_t)(fb[i] >> 8 | fb[i] << 8);
        screen_gen = w_screen_gen;
    }
    return screen;
}
EXPORT(web_buttons) void web_buttons(uint32_t mask)
{
    for (uint32_t b = 0; b < 14u; b++)
        if ((mask ^ held) & (1u << b)) kawa_button(button_map[b], (mask >> b) & 1u);
    held = mask;
}
EXPORT(web_keys) void web_keys(uint32_t mask) { kawa_keys(mask); }
EXPORT(web_enc) void web_enc(uint32_t role, int32_t n) { if (role < 7u) kawa_turn(encoder_map[role], n); }
EXPORT(web_master) void web_master(uint32_t v) { kawa_master(v > 4096u ? 4096 : (int32_t)v); }
EXPORT(web_midi) void web_midi(uint32_t st, uint32_t d1, uint32_t d2) { kawa_midi(st, d1, d2); }
static uint32_t led_mask(uint32_t buttons, uint32_t level)
{
    uint32_t m = 0, n = buttons ? 14u : 27u;
    for (uint32_t i = 0; i < n; i++)
        if (w_leds[buttons ? button_map[i] : 14u + i] == level) m |= 1u << i;
    return m;
}
EXPORT(web_lit_buttons) uint32_t web_lit_buttons(void) { return led_mask(1, 2); }
EXPORT(web_dim_buttons) uint32_t web_dim_buttons(void) { return led_mask(1, 1); }
EXPORT(web_lit_keys) uint32_t web_lit_keys(void) { return led_mask(0, 2); }
EXPORT(web_dim_keys) uint32_t web_dim_keys(void) { return led_mask(0, 1); }

/* Objects 0 and 1 are KAWA's four project slots (including autosave) and settings.
 * The worklet restores them before app_init, then sends them after an actual firmware write. */
EXPORT(web_nobj) uint32_t web_nobj(void) { return 2; }
EXPORT(web_store_max) uint32_t web_store_max(void) { return sizeof host_flash; }
EXPORT(web_store) uint8_t *web_store(uint32_t o) { return o == 0 ? &host_flash[0][0] : w_settings; }
EXPORT(web_store_len) int32_t web_store_len(uint32_t o) { return o == 0 ? sizeof host_flash : o == 1 ? sizeof w_settings : -1; }
EXPORT(web_store_set_len) void web_store_set_len(uint32_t o, uint32_t n) { (void)o; (void)n; }
EXPORT(web_store_writes) uint32_t web_store_writes(void)
{
    if (memcmp(settings_seen, w_settings, sizeof w_settings)) {
        memcpy(settings_seen, w_settings, sizeof w_settings);
        settings_gen++;
    }
    return store_gen + settings_gen;
}
