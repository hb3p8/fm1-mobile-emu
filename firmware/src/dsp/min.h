/* SPDX-License-Identifier: GPL-3.0-only */
/* Jazz Box: four parts, ten recipes, fixed harmony and reusable phrase forms.
 * Render/command threading and the modal piano/plate originate in MIN-1. */
#pragma once
#include <stdint.h>
#define EN_SR 44100.0f
#define EN_PPQN 24
#define EN_CYC_MAX 8
#define EN_NPART 4
enum { PT_DRUMS, PT_KEYS, PT_BASS, PT_CHORDS };
#define EN_NPIECES 10
#define EN_NCYCLES 10
#define EN_CYC_ROMANCE 7
#define EN_CYC_ROMANCE_FORMS 8
#define EN_CYC_AFTER_FORMS 9
enum { I_PIANO, I_UPRIGHT, I_HYBRID_BASS, EN_NINST };
extern const char *const EN_NOTE_NAME[12], *const EN_PART_NAME[EN_NPART];
/* Stable storage IDs. Gaps are reserved bytes, not parameters or modes. */
enum {
 P_VARIATION=0,P_SWING=2,P_BEATS=3,P_DR_LEVEL=4,P_KEYS_LEVEL=8,
 P_BS_LEVEL=12,P_BS_SOUND=13,P_BS_STYLE=14,P_BS_OCT=15,
 P_CH_LEVEL=20,P_VOICING=21,P_CH_RHYTHM=22,P_ROOM=23,
 P_TEMPO=24,P_ROOT=25,P_MIDI=29,P_CYCLE=30,P_KEYS_OCT=31,P_SEED=32,
 P_BS_PLUCK=36,P_BS_WOOD=37,P_BS_DECAY=38,P_BS_DAMP=39,P_BS_REVERB=40,P_NPARAMS=41
};
#define EN_SEED_MAX 32767
typedef struct {const char *name;int16_t lo,hi,def;} en_param_t;
const en_param_t *en_param_info(int i);
int en_param_active(int i);
void en_param_text(int i,int v,char *buf);
const char *en_param_label(int i);
void en_init(void);
void en_set(int p,int v);
void en_play(int on);
void en_next(void);
void en_seed(uint32_t seed);
void en_panic(void);
void en_regrow(void);
void en_note(int note,int velocity);
void en_audition(int part,int note,int velocity);
void en_part(int part,int on);
enum {EN_CLK_TICK,EN_CLK_START,EN_CLK_CONTINUE,EN_CLK_STOP};
void en_clock(int msg);
void en_render(int32_t *out_lr,uint32_t n,uint32_t gain_q12);
void en_load(uint32_t pct,uint32_t frames);
extern volatile uint8_t en_guarding;
extern volatile uint32_t en_guard_count;
void en_midi_out(uint32_t st,uint32_t d1,uint32_t d2);
#define EN_SONG_MAX 1880
#define EN_SONG_MAGIC 0x33474E53u /* SNG3: Jazz-only, no learned-cycle payload */
typedef struct {uint32_t magic,n,seed,end;int16_t par[P_NPARAMS];uint8_t piece,rsv[3];uint32_t ev[EN_SONG_MAX][2];} en_song_t;
#define EN_SONG_BYTES(n) ((uint32_t)(sizeof(en_song_t)-sizeof(((en_song_t*)0)->ev)+8u*(uint32_t)(n)))
en_song_t *en_song(void);
enum {EN_SONG_REC,EN_SONG_STOP,EN_SONG_PLAY};
enum {SONG_IDLE,SONG_RECORDING,SONG_PLAYING};
void en_song_cmd(int what,int piece);
extern volatile uint8_t en_song_state,en_song_full;
extern volatile uint32_t en_song_tick;
const int16_t *en_params(void);
extern volatile uint8_t en_playing,en_ext,en_cyc_n,en_cyc_pos,en_cyc_rep,en_cyc_reps;
extern volatile uint16_t en_cyc_mask[EN_CYC_MAX],en_chord_mask;
extern volatile uint8_t en_cyc_bass[EN_CYC_MAX],en_chord_bass,en_part_on[EN_NPART],en_voices;
extern volatile float en_chord_t,en_part_glow[EN_NPART];
extern volatile uint32_t en_beats,en_section,en_notes[EN_NPART];
int en_cycle_get(int cycle,int seed,int k,uint16_t *mask,uint8_t *bass);
const char *en_cycle_name(int cycle);
const char *en_chord_name(uint32_t mask,int bass,char *buf);
void en_spell(int root,int minor);
const char *en_note_name(int pc);
void en_voice_lead(const int *from,const int *pcs,int nt,int *to,int lo,int hi);
const char *en_piece_name(int i);
void en_piece(int i,int16_t *params);
extern volatile uint16_t en_jazz_scale,en_jazz_anchor,en_jazz_form_bass,en_jazz_form_piano;
extern volatile uint8_t en_jazz_bass_note,en_jazz_bar,en_jazz_chorus,en_jazz_walking;
int en_jazz_score_active(void);
int en_jazz_forms_active(void);
int en_jazz_form_count(void);
const char *en_jazz_form_name(int part);
const char *en_jazz_scale_name(void);
uint16_t en_jazz_scale_for(uint16_t mask,int bass,int key,uint16_t *anchors);

int en_form_decode(int role,int octave,int alter,int base,uint16_t mask,uint16_t scale,int next_pc);
