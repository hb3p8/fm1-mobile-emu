/* SPDX-License-Identifier: GPL-3.0-only
 * Tonitor browser adapter. Panel, framebuffer and NOR hooks adapted from nzimas/tonitor's
 * tests/host/host.c; application modules are included unchanged. Device timing and output ring follow
 * this project's Felucca-family adapters. Firmware, sound generation and storage remain Tonitor's.
 */
#define HOST 1
#include <stdint.h>
#include <string.h>
#include "tonitor_tables.h"

#define NELEM(a) (sizeof(a) / sizeof((a)[0]))
#define RING_PUBLISH() __asm__ volatile("" ::: "memory")
static volatile uint32_t fm1_ms;
static uint32_t host_ticks;
static uint32_t fm1_ticks(void) { return host_ticks; }
static void host_pump(void);

static int str_eq(const char *a, const char *b) { return strcmp(a, b) == 0; }
static unsigned str_len(const char *s) { return (unsigned)strlen(s); }
static void str_cpy(char *d, const char *s, unsigned max)
{
    unsigned i = 0;
    while (s[i] && i + 1 < max) {
        d[i] = s[i];
        i++;
    }
    d[i] = 0;
}

static void fmt_fix(char *b, int32_t v, int decimals)   /* (libc.c's) */
{
    char t[12];
    int n = 0, neg = v < 0, i;
    uint32_t u = (uint32_t)(neg ? -v : v);
    do {
        t[n++] = (char)('0' + u % 10u);
        u /= 10u;
        if (n == decimals)
            t[n++] = '.';
    } while (u || n <= decimals);
    if (neg)
        t[n++] = '-';
    for (i = 0; i < n; i++)
        b[i] = t[n - 1 - i];
    b[n] = 0;
}
static void fmt_int(char *b, int32_t v) { fmt_fix(b, v, 0); }

/* the screen: a framebuffer instead of the panel */
static uint16_t fb[240 * 240];
static uint32_t draws;
static void lcd_sync(void) {}
static void lcd_blit(uint32_t x, uint32_t y, uint32_t w, uint32_t h, const uint16_t *px)
{
    uint32_t i, j;
    draws++;
    for (j = 0; j < h; j++)
        for (i = 0; i < w; i++)
            if (x + i < 240u && y + j < 240u) {
                uint16_t c = px[j * w + i];
                fb[(y + j) * 240u + x + i] = c; /* canvas is already RGB565 big-endian */
            }
}
static void lcd_fill(uint32_t x, uint32_t y, uint32_t w, uint32_t h, uint16_t c)
{
    uint32_t i, j;
    draws++;
    for (j = 0; j < h; j++)
        for (i = 0; i < w; i++)
            if (x + i < 240u && y + j < 240u)
                fb[(y + j) * 240u + x + i] = (uint16_t)((c >> 8) | (c << 8));
}

#include "dsp.h"
#include "gfx.c"
#include "logo.c"
#include "fm.c"
#include "anima.c"
#include "cal.c"
#include "russolo.c"
#include "druid.c"
#include "bayarea.c"
#include "hive.c"
#include "obrador.c"
#include "reverb.c"
/* CPU1's mailbox (src/audio_worker.h), as one core sees it: a job posted runs at the join -- the units of work are
 * apart, so the sound is the same as with the two cores at once. host_cores 1: CPU1 off (the one-core path) */
static int audio_worker_online;            /* (0: one core, as the host times it -- the sum of both; cores sets it) */
static void (*host_job)(void *);
static int host_jobs_n;
static void *host_job_ctx;
static int audio_worker_submit(void (*fn)(void *), void *ctx)
{
    if (!audio_worker_online)
        return 0;
    host_job = fn;
    host_job_ctx = ctx;
    return 1;
}
static int audio_worker_join(void)
{
    if (host_job) {
        host_job(host_job_ctx);
        host_jobs_n++;
    }
    host_job = 0;
    return 1;
}
static void audio_worker_check(void) {}
/* usb.c's side, as the tests see it: no host attached; what would be sent out kept, for the MIDI tests */
static struct { uint8_t config, suspended; } usb;
static uint32_t host_mout[256], host_mout_n;
static void midi_out_event(uint32_t pkt)
{
    if (host_mout_n < 256u)
        host_mout[host_mout_n] = pkt;
    host_mout_n++;
}
#define MQ 64u
static uint32_t midi_in_q[MQ];
static volatile uint32_t mi_w, mi_r;
#include "layers.c"

/* the panel */
#define FM1_NCOL 11u
static const int8_t FM1_KEYMAP[6][FM1_NCOL] = {
    {-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1}, {5, 11, 4, 10, 3, 9, 2, 8, -1, -1, -1},
    {34, 35, 36, 37, 38, 40, 39, 13, 7, 6, 12}, {23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33},
    {0, 1, 15, 14, 17, 16, 19, 18, 20, 21, 22}, {-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1}};
static struct { uint32_t notes, buttons; } fm1_in;
static uint32_t host_press;
static int32_t host_enc[7];
static uint8_t fm1_led_dim[FM1_NCOL];
static uint32_t fm1_input_edges(uint32_t *rel)
{
    uint32_t p = host_press;
    host_press = 0;
    if (rel)
        *rel = 0;
    return p;
}
static int32_t fm1_enc_take(uint32_t e)
{
    int32_t s = host_enc[e];
    host_enc[e] = 0;
    return s;
}
static uint8_t host_led[64];
static void fm1_led_key(uint32_t id, int on) { if (id < 64u) host_led[id] = (uint8_t)!!on; }
#include "ui.c"
#include "snaps.c"
#include "sessions.c"
#include "setup.c"
#include "backup.c"

/* the flash, emulated: NOR (erased to 0xFF, programming only clears bits); erases counted */
static uint8_t nor[0x100000];
static uint32_t flash_writes;
static int ses_flash_read(uint32_t off, void *p, uint32_t n)
{
    memcpy(p, nor + off, n);
    return 0;
}
static int ses_flash_erase(uint32_t off)
{
    if (off < SES_LO || off + 4096u > SES_HI || (off & 4095u))
        return -8;
    memset(nor + off, 0xFF, 4096u);
    flash_writes++;
    return 0;
}
static int ses_flash_prog(uint32_t off, const void *p, uint32_t n)
{
    uint32_t i;
    if (off < SES_LO || off + n > SES_HI)
        return -8;
    flash_writes++;
    for (i = 0; i < n; i++)
        nor[off + i] &= ((const uint8_t *)p)[i];
    return 0;
}


/* The same Q15 mix_block as main.c's audio interrupt: OUT_SHIFT=7 gives a -6 dB ceiling.
 * The host pump also advances audio while the UI waits for a published sound to be consumed. */
#define RING 4096u
static float ring[RING * 2], out_l[1024], out_r[1024];
static uint32_t ring_w, ring_r, ms_frac, last_frame, booted, master_adc = 700;
static int32_t knob = 512 * 16;
static void host_pump(void)
{
    int32_t out[CTL * 2];
    uint32_t k, before = fm1_ms;
    mix_block(out);
    for (k = 0; k < CTL; k++) {
        uint32_t i = (ring_w++ % RING) * 2u;
        ring[i] = out[2u * k] / 65536.0f;
        ring[i + 1] = out[2u * k + 1u] / 65536.0f;
    }
    ms_frac += CTL * 1000u;
    fm1_ms += ms_frac / FS;
    ms_frac %= FS;
    host_ticks += (fm1_ms - before) * 24000u;
}
static void web_frame(void)
{
    uint32_t l, quiet;
    knob += ((int32_t)master_adc * 16 - knob) / 8;
    uint32_t k10 = (uint32_t)(knob / 16);
    master_q12 = (int32_t)((k10 * k10) >> 8);
    ui_input();
    setup_poll();
    midi_poll();
    ui_leds();
    ui_draw();
    quiet = !ui.keys && !ui.save_down;
    for (l = 0; l < NLAYER && quiet; l++)
        quiet = !layer_sounding(l) && !loop[l].play && loop[l].rec != LR_REC;
    ses_idle((int)quiet);
}
#define EXPORT __attribute__((used, visibility("default")))
EXPORT void web_set_seed(uint32_t seed) { host_ticks = seed; }
EXPORT void web_boot(void)
{
    if (booted) return;
    ses_scan(1);
    setup_load();
    layers_init();
    ui_init();
    sounds_init();
    scale_draw();
    lx_post();
    ui.force = 1;
    booted = 1;
    web_frame();
}
EXPORT void web_render(uint32_t n)
{
    if (n > 1024u) n = 1024u;
    while (ring_w - ring_r < n) {
        host_pump();
        if (fm1_ms != last_frame) {
            if (fm1_ms - last_frame >= 15u) {
                last_frame = fm1_ms;
                web_frame();
            } else ui_input();
        }
    }
    for (uint32_t k = 0; k < n; k++) {
        uint32_t i = (ring_r++ % RING) * 2u;
        out_l[k] = ring[i]; out_r[k] = ring[i + 1];
    }
}
EXPORT float *web_out_l(void) { return out_l; }
EXPORT float *web_out_r(void) { return out_r; }
EXPORT uint8_t *web_nor(void) { return nor; }
EXPORT uint32_t web_nor_size(void) { return sizeof nor; }
EXPORT void web_nor_erase(void) { memset(nor, 255, sizeof nor); }
EXPORT uint32_t web_flash_writes_count(void) { return flash_writes; }
EXPORT uint16_t *web_screen(void) { return fb; }
EXPORT uint32_t web_screen_draws(void) { return draws; }
EXPORT uint32_t web_now_ms(void) { return fm1_ms; }
EXPORT void web_master(uint32_t v) { master_adc = v > 1023u ? 1023u : v; }
EXPORT void web_buttons(uint32_t labels)
{
    uint32_t m = 0;
    for (uint32_t b = 0; b < NB; b++) if ((labels >> b) & 1u) m |= 1u << PANEL_BTN[b];
    host_press |= m & ~fm1_in.buttons;
    fm1_in.buttons = m;
}
EXPORT void web_keys(uint32_t m) { fm1_in.notes = m & ((1u << 27) - 1u); }
EXPORT void web_enc(uint32_t role, int32_t n) { if (role < NE) host_enc[PANEL_ENC[role]] += n; }
static uint32_t lit(uint32_t id) { return host_led[id]; }
static uint32_t dim(uint32_t id)
{
    for (uint32_t c = 0; c < FM1_NCOL; c++)
        for (uint32_t r = 1; r < 5u; r++)
            if (FM1_KEYMAP[r][c] == (int8_t)id) return (fm1_led_dim[c] >> r) & 1u;
    return 0;
}
EXPORT uint32_t web_lit_buttons(void) { uint32_t m=0; for(uint32_t b=0;b<NB;b++) m |= lit(PANEL_BTN[b]) << b; return m; }
EXPORT uint32_t web_lit_keys(void) { uint32_t m=0; for(uint32_t k=0;k<27u;k++) m |= lit(14u+k) << k; return m; }
EXPORT uint32_t web_dim_buttons(void) { uint32_t m=0; for(uint32_t b=0;b<NB;b++) m |= dim(PANEL_BTN[b]) << b; return m; }
EXPORT uint32_t web_dim_keys(void) { uint32_t m=0; for(uint32_t k=0;k<27u;k++) m |= dim(14u+k) << k; return m; }
EXPORT void web_midi(uint32_t st, uint32_t d1, uint32_t d2)
{
    if(st >= 0x80u && st < 0xf0u && mi_w-mi_r < MQ) midi_in_q[mi_w++ % MQ] = (st >> 4) | (st << 8) | ((d1 & 127u) << 16) | ((d2 & 127u) << 24);
}
