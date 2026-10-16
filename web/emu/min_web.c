/* SPDX-License-Identifier: GPL-3.0-only */
/* MIN-1 in the browser: the host simulator (host/min_host.c: the whole app, UI and instrument,
 * against a simulated FM-1) compiled to WebAssembly and run in an AudioWorklet (AMB-1's, from X0X's). The worklet asks
 * for audio; producing it advances the device's clock one millisecond at a time, which runs the
 * engine every 256 samples (the I2S half buffer) and the UI every 16 ms, as on the FM-1. The page
 * sends input, and reads the screen, the lights and the saved objects back through these exports.
 *
 *   web/emu/build.sh   ->  build/emu/min.wasm (+ the page) */
#include <stdint.h>

static void web_audio(const int32_t *blk, uint32_t n);
#include "../../host/min_host.c"

#undef __attribute__

/* output ring, stereo float, filled by run_ms, drained by web_render */
#define RING 4096u
static float ring[RING * 2];
static uint32_t ring_w, ring_r;
static void web_audio(const int32_t *blk, uint32_t n)
{
    uint32_t k;
    for (k = 0; k < n; k++) {
        uint32_t i = (ring_w++ % RING) * 2u;
        ring[i] = (float)blk[2 * k] / 8388608.0f;
        ring[i + 1] = (float)blk[2 * k + 1] / 8388608.0f;
    }
}

static float out_l[1024], out_r[1024];
__attribute__((used, visibility("default"))) float *web_out_l(void) { return out_l; }
__attribute__((used, visibility("default"))) float *web_out_r(void) { return out_r; }

/* n frames (<= 1024) into out_l / out_r: the device runs until they exist */
__attribute__((used, visibility("default"))) void web_render(uint32_t n)
{
    uint32_t k;
    if (n > 1024u)
        n = 1024u;
    while (ring_w - ring_r < n)
        run_ms(1);
    for (k = 0; k < n; k++) {
        uint32_t i = (ring_r++ % RING) * 2u;
        out_l[k] = ring[i];
        out_r[k] = ring[i + 1];
    }
}

__attribute__((used, visibility("default"))) void web_boot(void) { boot(); }
__attribute__((used, visibility("default"))) void web_buttons(uint32_t m) { held_btn = m; }
__attribute__((used, visibility("default"))) void web_keys(uint32_t m) { held_keys = m; }
__attribute__((used, visibility("default"))) void web_enc(int role, int32_t n)
{
    if (role >= 0 && role < NE)
        enc_acc[role] += n;
}
__attribute__((used, visibility("default"))) void web_master(uint32_t v) { master = v > 4096u ? 4096u : v; }
__attribute__((used, visibility("default"))) uint32_t web_lit_buttons(void) { return lit_btn; }
__attribute__((used, visibility("default"))) uint32_t web_lit_keys(void) { return lit_keys; }
__attribute__((used, visibility("default"))) uint16_t *web_fb(void) { return fb; }
__attribute__((used, visibility("default"))) uint32_t web_blits(void) { return blits; }
__attribute__((used, visibility("default"))) uint32_t web_now(void) { return now_ms; }
__attribute__((used, visibility("default"))) uint32_t web_cpu(void) { return cpu_pct; }
/* a song recording or playing (the FM-1's PLAY turns red while one records, plat_play_red) */
__attribute__((used, visibility("default"))) uint32_t web_song_state(void) { return en_song_state; }

/* a name for a recording of what plays: the piece, or in SONGS the song and its piece */
__attribute__((used, visibility("default"))) const char *web_title(void)
{
    static char t[40];
    if (ui.mode == MODE_SONGS && proj.songs[proj.song].used)
        snprintf(t, sizeof t, "Song %u %s", proj.song + 1u, piece_name(proj.songs[proj.song].piece));
    else
        snprintf(t, sizeof t, "%s", piece_name(proj.piece));
    return t;
}

/* saved objects: the page keeps them (localStorage) and gives them back before boot */
__attribute__((used, visibility("default"))) uint8_t *web_store(uint32_t obj) { return obj < OBJ_NOBJ ? store[obj] : 0; }
__attribute__((used, visibility("default"))) int web_store_len(uint32_t obj) { return obj < OBJ_NOBJ ? store_len[obj] : -1; }
__attribute__((used, visibility("default"))) void web_store_set_len(uint32_t obj, int n)
{
    if (obj < OBJ_NOBJ)
        store_len[obj] = n < 0 ? -1 : n > (int)PLAT_STORE_MAX ? (int)PLAT_STORE_MAX : n;
}
__attribute__((used, visibility("default"))) uint32_t web_store_writes(void) { return store_writes; }
__attribute__((used, visibility("default"))) uint32_t web_nobj(void) { return OBJ_NOBJ; }
__attribute__((used, visibility("default"))) uint32_t web_store_max(void) { return PLAT_STORE_MAX; }

/* Jazz Box browser controls operate the device app, never a second JS synth. */
__attribute__((used, visibility("default"))) void web_param(int p,int v) { if(p>=0 && p<P_NPARAMS) knob_set(p,v); }
__attribute__((used, visibility("default"))) void web_preset(int i) { if(i>=0 && i<EN_NPIECES) set_piece(i); }
__attribute__((used, visibility("default"))) void web_transport(void) { button(B_PLAY); }
__attribute__((used, visibility("default"))) uint32_t web_scale(void) { return en_jazz_scale; }
__attribute__((used, visibility("default"))) uint32_t web_anchors(void) { return en_jazz_anchor; }
__attribute__((used, visibility("default"))) uint32_t web_playing(void) { return en_playing; }
__attribute__((used, visibility("default"))) uint32_t web_position(void) { return en_cyc_pos; }
__attribute__((used, visibility("default"))) uint32_t web_cycle_count(void) { return en_cyc_n; }
__attribute__((used, visibility("default"))) const char *web_chord_at(int i) {
    static char name[24];
    if(i<0 || i>=en_cyc_n) return "";
    en_chord_name(en_cyc_mask[i],en_cyc_bass[i],name); return name;
}
__attribute__((used, visibility("default"))) const char *web_scale_name(void) { return en_jazz_scale_name(); }
__attribute__((used, visibility("default"))) const int16_t *web_params(void) { return en_params(); }
__attribute__((used, visibility("default"))) uint32_t web_params_count(void) { return P_NPARAMS; }
__attribute__((used, visibility("default"))) uint32_t web_part_notes(int p) { return p>=0 && p<EN_NPART ? en_notes[p] : 0; }
__attribute__((used, visibility("default"))) uint32_t web_yours(void) { return 0; }
__attribute__((used, visibility("default"))) uint32_t web_score_active(void) { return (uint32_t)en_jazz_score_active(); }
__attribute__((used, visibility("default"))) uint32_t web_score_bar(void) { return en_jazz_bar; }
__attribute__((used, visibility("default"))) uint32_t web_score_chorus(void) { return en_jazz_chorus; }
__attribute__((used, visibility("default"))) uint32_t web_score_walking(void) { return en_jazz_walking; }
__attribute__((used, visibility("default"))) uint32_t web_forms_active(void) { return (uint32_t)en_jazz_forms_active(); }
__attribute__((used, visibility("default"))) uint32_t web_form_count(void) { return (uint32_t)en_jazz_form_count(); }
__attribute__((used, visibility("default"))) uint32_t web_form_bass(void) { return en_jazz_form_bass; }
__attribute__((used, visibility("default"))) uint32_t web_form_piano(void) { return en_jazz_form_piano; }
__attribute__((used, visibility("default"))) const char *web_form_bass_name(void) { return en_jazz_form_name(PT_BASS); }
__attribute__((used, visibility("default"))) const char *web_form_piano_name(void) { return en_jazz_form_name(PT_CHORDS); }
