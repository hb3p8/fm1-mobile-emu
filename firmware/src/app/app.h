/* SPDX-License-Identifier: GPL-3.0-only */
/* MIN-1 app: the project (everything that is saved) and the app's entry points. Included by the unity
 * build after gfx.c (drawing helpers in scope) and by the host simulator. (AMB-1's.) */
#pragma once
#include <stdint.h>
#include "plat.h"
#include "../dsp/min.h"

#ifndef EN_VERSION                       /* a release build passes its own (tools/build.py --release) */
#define EN_VERSION "DEV"
#endif
#define PROJ_MAGIC 0x315A5A4Au           /* "JZZ1" */
#define PROJ_FORMAT 9u                  /* Jazz-only ten-slot project */
#define NPIECES EN_NPIECES

typedef struct {int16_t par[P_NPARAMS];} slot_t;

typedef struct {                         /* a song slot, as the list shows it (the take is in its own objects) */
    uint8_t used, piece;
    uint16_t tempo;
    uint32_t ticks;                      /* its length */
} song_info_t;

typedef struct {
    uint32_t magic, format;
    int16_t par[P_NPARAMS];              /* the piece playing, as it is now (min.h P_*) */
    uint8_t leds;                        /* lights: 0 off, 1 keys and the buttons' glow, 2 keys only */
    uint8_t piece;                       /* which piece */
    uint8_t song;                        /* which song slot */
    uint8_t rsv0;
    slot_t slot[NPIECES];                /* each Jazz recipe as it was left; MIDI output is global */
    song_info_t songs[NSONGS];
    uint8_t rsv[16];                     /* room to grow */
} project_t;

extern project_t proj;

void project_defaults(void);
int project_load(void);                  /* 0 = loaded; else defaults are in place */
int project_save(void);                  /* 0 = saved and verified */
void project_apply(void);                /* every value to the engine (boot, load) */
const char *piece_name(int i);
void project_piece(int i);               /* the playing piece kept, piece i taken up as it was left */
void project_piece_reset(void);          /* the playing piece back to its recipe (other recipes kept) */
int song_save(int k);                    /* the take in memory into slot k (0 = saved) */
int song_load(int k);                    /* slot k's take into memory, while none records or plays (0 = loaded) */

void ui_init(void);
void ui_frame(void);
void ui_input_only(void);
int ui_dirty(void);
void ui_say(const char *a, const char *b);
