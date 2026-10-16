/* SPDX-License-Identifier: GPL-3.0-only */
/* Jazz-only engine. Audio ISR owns voices, clocks, RNG and song commands. */
#include "min.h"
#include "fastmath.h"
#include "drum909.h"
#include "upright.h"
#include "romance_score.h"
#include "romance_forms.h"
#include "after_forms.h"
#ifdef EN_HOST
#define EN_POOL
#else
#define EN_POOL __attribute__((section(".pool")))
#endif
#define BARRIER() __asm__ volatile("" ::: "memory")
const char *const EN_NOTE_NAME[12]={"C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"};
const char *const EN_PART_NAME[EN_NPART]={"Drums","Keys","Bass","Piano"};
static const en_param_t PARAMS[P_NPARAMS]={
 [P_VARIATION]={"Variation",0,100,75},[P_SWING]={"Swing",0,100,90},[P_BEATS]={"Chord",0,3,1},
 [P_DR_LEVEL]={"Drums",0,100,44},[P_KEYS_LEVEL]={"Keys",0,100,85},
 [P_BS_LEVEL]={"Bass",0,100,74},[P_BS_SOUND]={"Bass sound",0,2,2},[P_BS_STYLE]={"Bass style",0,3,2},[P_BS_OCT]={"Bass octave",-1,1,0},
 [P_CH_LEVEL]={"Piano",0,100,65},[P_VOICING]={"Voicing",0,2,0},[P_CH_RHYTHM]={"Rhythm",0,4,2},[P_ROOM]={"Room",0,100,50},
 [P_TEMPO]={"Tempo",40,200,104},[P_ROOT]={"Root",0,11,0},[P_MIDI]={"MIDI out",0,1,1},[P_CYCLE]={"Harmony",0,9,0},[P_KEYS_OCT]={"Keys octave",-1,1,0},[P_SEED]={"Phrase seed",0,32767,1},
 [P_BS_PLUCK]={"Pluck",0,100,62},[P_BS_WOOD]={"Wood",0,100,70},[P_BS_DECAY]={"Decay",0,100,48},[P_BS_DAMP]={"Damping",0,100,58},[P_BS_REVERB]={"Bass reverb",0,100,7}
};
static const en_param_t RESERVED={"",0,0,0};
int en_param_active(int i){return i>=0 && i<P_NPARAMS && PARAMS[i].name!=0;}
const en_param_t *en_param_info(int i){return en_param_active(i)?&PARAMS[i]:&RESERVED;}
static int16_t par[P_NPARAMS];
static const uint8_t LEVEL_PAR[4]={P_DR_LEVEL,P_KEYS_LEVEL,P_BS_LEVEL,P_CH_LEVEL};
static const uint8_t CHORD_BEATS[4]={2,4,8,16};
static const char *const PIECE_NAME[10]={"First steps","Velvet","Close voices","Secondary","Tritone","Two turns","Chromatic","Fine Romance","Romance Forms","After Gone Forms"};
const char *en_piece_name(int i){return PIECE_NAME[(unsigned)i<10u?i:0];}
const char *en_cycle_name(int i){return en_piece_name(i);}
void en_piece(int i,int16_t *p){
 int k;i=(unsigned)i<10u?i:0;
 for(k=0;k<P_NPARAMS;k++)p[k]=en_param_info(k)->def;
 p[P_CYCLE]=(int16_t)i;
 if(i==1)p[P_VOICING]=1;
 if(i>=7){p[P_ROOT]=11;p[P_TEMPO]=160;p[P_CH_RHYTHM]=4;p[P_BS_STYLE]=3;p[P_DR_LEVEL]=36;p[P_CH_LEVEL]=74;p[P_BS_LEVEL]=88;}
 if(i==9){p[P_ROOT]=3;p[P_TEMPO]=140;p[P_CH_LEVEL]=78;p[P_DR_LEVEL]=44;}
}
static uint16_t rot12(uint32_t m, int r)        /* pitch classes moved up r semitones */
{
    r = (r % 12 + 12) % 12;
    m &= 0xFFFu;
    return (uint16_t)(((m << r) | (m >> (12 - r))) & 0xFFFu);
}
static uint32_t lr_next(uint32_t *r)
{
    uint32_t x = *r;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    return *r = x;
}
static uint32_t lr_seed(uint32_t seed) { return seed * 2654435761u + 0x6D2B79F5u; }
static int nearest(int from, int pc, int lo, int hi)    /* the note of class pc nearest from, in lo..hi */
{
    int n = from + ((pc - from) % 12 + 12) % 12;          /* at or above */
    if (n - from > 6)
        n -= 12;
    while (n < lo)
        n += 12;
    while (n > hi)
        n -= 12;
    return n;
}
void en_voice_lead(const int *from, const int *pcs, int nt, int *to, int lo, int hi)
{
    static const uint8_t PERM[24][4] = {
        {0, 1, 2, 3}, {0, 1, 3, 2}, {0, 2, 1, 3}, {0, 2, 3, 1}, {0, 3, 1, 2}, {0, 3, 2, 1},
        {1, 0, 2, 3}, {1, 0, 3, 2}, {1, 2, 0, 3}, {1, 2, 3, 0}, {1, 3, 0, 2}, {1, 3, 2, 0},
        {2, 0, 1, 3}, {2, 0, 3, 1}, {2, 1, 0, 3}, {2, 1, 3, 0}, {2, 3, 0, 1}, {2, 3, 1, 0},
        {3, 0, 1, 2}, {3, 0, 2, 1}, {3, 1, 0, 2}, {3, 1, 2, 0}, {3, 2, 0, 1}, {3, 2, 1, 0}};
    int t[4], p, v, best = 1 << 30;
    for (v = 0; v < 4; v++)
        t[v] = pcs[v < nt ? v : 0];                        /* three tones: the bass doubled */
    for (p = 0; p < 24; p++) {
        int c = 0, n[4], a, b;
        for (v = 0; v < 4; v++) {
            n[v] = nearest(from[v], t[PERM[p][v]], lo, hi);
            c += n[v] > from[v] ? n[v] - from[v] : from[v] - n[v];
        }
        for (a = 0; a < 4; a++)                            /* no two voices on one note */
            for (b = a + 1; b < 4; b++)
                if (n[a] == n[b])
                    c += 40;
        if (c < best) {
            best = c;
            for (v = 0; v < 4; v++)
                to[v] = n[v];
        }
    }
}
static const char *const NAME_SHARP[12] = {"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"};
static const char *const NAME_FLAT[12] = {"C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"};
static const char *spelled[12] = {"C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"};

void en_spell(int root, int minor)
{
    int r = ((root + (minor ? 3 : 0)) % 12 + 12) % 12, i;     /* the major key with the same signature */
    uint16_t sc = rot12(0xAB5u, r);                          /* its scale */
    int sharps = r == 7 || r == 2 || r == 9 || r == 4 || r == 11 || (r == 6 && !minor);   /* F#, but Eb minor */
    for (i = 0; i < 12; i++)
        spelled[i] = (sc >> i & 1u) && sharps ? NAME_SHARP[i] : NAME_FLAT[i];
    if (minor)
        spelled[((root + 11) % 12 + 12) % 12] = NAME_SHARP[((root + 11) % 12 + 12) % 12];   /* the leading tone */
}
const char *en_note_name(int pc) { return spelled[(pc % 12 + 12) % 12]; }

static char *put(char *b, const char *s)
{
    while (*s)
        *b++ = *s++;
    *b = 0;
    return b;
}

static char *itoa_s(int v, char *b)
{
    char t[12];
    int n = 0;
    unsigned u = (unsigned)(v < 0 ? -v : v);
    if (v < 0)
        *b++ = '-';
    do {
        t[n++] = (char)('0' + u % 10u);
        u /= 10u;
    } while (u);
    while (n)
        *b++ = t[--n];
    *b = 0;
    return b;
}

const char *en_chord_name(uint32_t mask, int bass, char *buf)
{
    static const struct {
        uint16_t iv;
        const char *q;
    } NAMES[] = {
        {0x091, ""},    {0x089, "m"},     {0x891, "M7"},    {0x489, "m7"},    {0x491, "7"},  {0x049, "dim"},
        {0x111, "aug"}, {0x085, "sus2"},  {0x0A1, "sus4"},  {0x4A1, "7sus4"}, {0x449, "m7b5"}, {0x249, "dim7"},
        {0x291, "6"},   {0x289, "m6"},    {0x095, "add9"},  {0x08D, "madd9"}, {0x081, "5"},  {0x001, ""},
        {0x895, "M9"}, {0x295, "6/9"}, {0x695, "13"}, {0x493, "7b9"},
        {0x495, "9"}, {0x48D, "m9"}, {0x511, "7#5"}, {0x593, "7b9b13"},
    };
    const int nn = (int)(sizeof NAMES / sizeof NAMES[0]);
    int i, k, r = -1, q = -1;
    char *b = buf;
    mask &= 0xFFFu;
    bass = (bass % 12 + 12) % 12;
    mask |= 1u << bass;
    for (k = 0; k < nn && q < 0; k++)            /* the bass as the root, if a quality fits it ("C6") */
        if (rot12(mask, -bass) == NAMES[k].iv) {
            r = bass;
            q = k;
        }
    for (k = 0; k < nn && q < 0; k++)            /* else the commonest quality on any root ("Am7/G") */
        for (i = 0; i < 12 && q < 0; i++)
            if ((mask >> i & 1u) && rot12(mask, -i) == NAMES[k].iv) {
                r = i;
                q = k;
            }
    if (q < 0) {
        b = put(b, en_note_name(bass));
        put(b, "*");
        return buf;
    }
    b = put(b, en_note_name(r));
    b = put(b, NAMES[q].q);
    if (r != bass) {
        *b++ = '/';
        put(b, en_note_name(bass));
    }
    return buf;
}

enum { C_SET=0,C_PLAY=1,C_NEXT=2,C_SEED=3,C_PANIC=4,C_CLOCK=5,C_REGROW=6,C_PART=11,C_SONG=13,C_NOTE=14 };
#define QN 128u
static uint32_t q[QN];static volatile uint32_t q_w,q_r;
static void post(uint32_t c, int a, int b)
{
    uint32_t w = q_w;
    if (w - q_r >= QN)
        return;                                   /* full: dropped (never, at the UI's rate) */
    q[w % QN] = c << 24 | ((uint32_t)a & 0xFFu) << 16 | ((uint32_t)b & 0xFFFFu);
    BARRIER();
    q_w = w + 1;
}

void en_set(int p,int v){if(en_param_active(p))post(C_SET,p,v);}
void en_play(int on){post(C_PLAY,on,0);} void en_next(void){post(C_NEXT,0,0);}
void en_seed(uint32_t s){post(C_SEED,0,(int)(s&65535u));} void en_panic(void){post(C_PANIC,0,0);}
void en_clock(int msg){post(C_CLOCK,msg,0);} void en_regrow(void){post(C_REGROW,0,0);}
void en_audition(int part,int note,int vel){if(part>PT_DRUMS && part<EN_NPART && note>=21 && note<=108)post(C_NOTE,note,(vel&127)|(part<<8));}
void en_note(int note,int vel){en_audition(PT_KEYS,note,vel);}
void en_part(int p,int on){post(C_PART,p,on!=0);} void en_song_cmd(int w,int p){post(C_SONG,w,p);}
volatile uint8_t en_playing,en_ext,en_cyc_n,en_cyc_pos,en_cyc_rep,en_cyc_reps;
volatile uint16_t en_cyc_mask[EN_CYC_MAX],en_chord_mask;
volatile uint8_t en_cyc_bass[EN_CYC_MAX],en_chord_bass,en_part_on[EN_NPART],en_voices;
volatile float en_chord_t,en_part_glow[EN_NPART];
volatile uint32_t en_beats,en_section,en_notes[EN_NPART];
volatile uint8_t en_song_state,en_song_full;volatile uint32_t en_song_tick;
static uint32_t rng=0x9e3779b9u,nrng=0x2545f491u;
static uint8_t part_inst[EN_NPART];
static uint32_t rnd(void)
{
    rng ^= rng << 13;
    rng ^= rng >> 17;
    rng ^= rng << 5;
    return rng;
}
static float frand(void) { return (float)(rnd() >> 8) * (1.0f / 16777216.0f); }
static uint32_t nrnd(void)
{
    nrng ^= nrng << 13;
    nrng ^= nrng >> 17;
    nrng ^= nrng << 5;
    return nrng;
}
static void midi(uint32_t st, uint32_t d1, uint32_t d2)
{
    if (par[P_MIDI])
        en_midi_out(st, d1, d2);
}
static float mtof(int n) { return 440.0f * fm_exp2f((float)(n - 69) * (1.0f / 12.0f)); }

#define NRES 8
enum { ST_ATT, ST_SUS, ST_REL };
typedef struct {
    uint8_t on, inst, part, note, midi, stage, dry;   /* dry: a modal note damped when its gate ends */
    int32_t gate;                                /* samples until the release (-1: until released) */
    int32_t wait;                                /* reserved for scheduled voice start */
    float lvl;                                   /* how loud it still is, about (the quietest is taken first) */
    uint32_t age;
    float vel, gl, gr, send;
    /* modal */
    uint8_t nres;
    float a1[NRES], a2[NRES], y1[NRES], y2[NRES], pth[NRES];   /* pth: below this the partial is gone */
    float nz, nzd, nlp, nc;                      /* the strike's noise: level, decay, low-pass state, coefficient */
    float damp, dampk;                           /* the pedal: a gain, and its decay a sample once damped */
} voice_t;

#define NV 19
static const uint8_t VB[EN_NPART + 1] = {0, 0, 8, 11, 19};   /* each part's voices: VB[p] .. VB[p + 1] */
static voice_t vc[NV];
static uint32_t vage;
static float pg[EN_NPART], pg_t[EN_NPART];       /* the parts' gains, now and wanted (level, terrace) */
static float damp_k, fade_k, dry_k;              /* the pedal's damping (180 ms), a quick fade (60 ms), a dry
                                                 * note's end (250 ms) */

/* CPU guard shortens inaudible modal partials until load recovers. */
#define GUARD_ON_LAST 90u
#define GUARD_ON_AVG 82u
#define GUARD_OFF 65u
#define GUARD_CALM_FRAMES (3u * 44100u)
static uint8_t guard;
static uint32_t guard_avg_q8, guard_calm;
volatile uint32_t en_guard_count;
volatile uint8_t en_guarding;
void en_load(uint32_t pct, uint32_t frames)
{
    guard_avg_q8 = (guard_avg_q8 * 15u + pct * 256u) / 16u;
    if (!guard) {
        if (pct > GUARD_ON_LAST || guard_avg_q8 > GUARD_ON_AVG * 256u) {
            guard = 1;
            guard_calm = 0;
            en_guard_count++;
        }
    } else if (pct >= GUARD_OFF || guard_avg_q8 >= GUARD_OFF * 256u) {
        guard_calm = 0;
    } else if ((guard_calm += frames) >= GUARD_CALM_FRAMES) {
        guard = 0;
    }
    en_guarding = guard;
}

#define PIANO_GAIN .55f
#define PIANO_SEND .50f
#define UPRIGHT_GAIN .52f
static const float PART_GAIN[4]={1,1,1,.56f};
static void voice_midi_off(voice_t *v)
{
    if (v->midi) {
        midi(0x80u | v->part, v->midi, 0);
        v->midi = 0;
    }
}
static void voice_release(voice_t *v)            /* its gate ends at the next block */
{
    if (v->on && v->stage != ST_REL)
        v->gate = 1;
}
static voice_t *voice_get(int p)                 /* a free voice of the part's, or the one to take */
{
    int i, best = VB[p], end = VB[p + 1];
    uint32_t score = 0;
    (void)vage;
    for (i = VB[p]; i < end; i++)
        if (!vc[i].on)
            return &vc[i];
    for (i = VB[p]; i < end; i++) {             /* released or damped first, then the quietest */
        const voice_t *v = &vc[i];
        float q = v->lvl * v->vel * ((v->stage == ST_REL || v->dampk < 1.0f) ? 0.1f : 1.0f);
        uint32_t s = 0xFFFFFFFFu - (uint32_t)(fm_clampf(q, 0.0f, 1.0f) * 4.0e9f);
        if (s > score || i == VB[p]) {
            score = s;
            best = i;
        }
    }
    voice_midi_off(&vc[best]);
    return &vc[best];
}
static void res_add(voice_t *v, float f, float t60, float a)
{
    float w, r, c, s, y1;
    int i = v->nres;
    if (i >= NRES || f > 0.42f * EN_SR || a <= 0.0f)
        return;
    w = FM_TWO_PI * f * (1.0f / EN_SR);
    r = fm_expf(-6.9078f / (t60 * EN_SR));
    c = fm_cosf(w);
    s = fm_sinf(w);
    y1 = -a * s / r;                             /* y[-1], y[-2] of a r^n sin(w n): the sine starts at 0 */
    v->a1[i] = 2.0f * r * c;
    v->a2[i] = r * r;
    v->y1[i] = y1;
    v->y2[i] = 2.0f * c * y1 / r;
    v->pth[i] = 9e-10f * s * s;                  /* (3e-5 x sin w)^2: the partial's amplitude below 3e-5 */
    v->nres = (uint8_t)(i + 1);
}
static const float LOG2K[7] = {0.0f, 0.0f, 1.0f, 1.5849625f, 2.0f, 2.3219281f, 2.5849625f};
static void piano_on(voice_t *v)
{
    int n = v->note, k;
    float f0 = mtof(n), B = 0.00035f * fm_exp2f((float)(n - 60) * (1.0f / 20.0f)), t1, roll, sum = 0.0f, a[7];
    t1 = fm_clampf(12.0f * fm_exp2f(-(float)(n - 45) * (1.0f / 22.0f)), 0.8f, 16.0f);   /* the fundamental's T60 */
    roll = 1.75f - 0.9f * v->vel;                /* harder: brighter */
    for (k = 1; k <= 6; k++) {
        a[k] = fm_exp2f(-roll * LOG2K[k]);
        sum += a[k];
    }
    v->nres = 0;
    for (k = 1; k <= 6; k++) {
        float f = (float)k * f0 * fm_sqrtf(1.0f + B * (float)(k * k)), t60, ak = a[k] / sum;
        if (f > 10000.0f)
            break;
        t60 = t1 / (1.0f + 0.4f * (float)(k - 1)) / (1.0f + f * (1.0f / 3500.0f));
        if (k <= 2) {
            res_add(v, f, t60 * 0.18f, ak * 0.55f);          /* the prompt sound */
            res_add(v, f * 1.0004f, t60, ak * 0.45f);         /* the aftersound, a hair apart */
        } else {
            res_add(v, f, t60, ak);
        }
    }
    v->nz = 0.08f + 0.2f * v->vel;
    v->nzd = fm_expf(-1.0f / (0.004f * EN_SR));
    v->nc = 1.0f - fm_expf(-FM_TWO_PI * fm_minf(f0 * 5.0f, 5000.0f) * (1.0f / EN_SR));
}

static void upright_on(voice_t *v)
{
    int k; float f=mtof(v->note); v->nres=0;
    for(k=1;k<=5;k++) res_add(v,f*(float)k,1.6f/(float)k,0.9f/((float)k*(float)k));
    v->nz=0.15f; v->nzd=fm_expf(-1.0f/(0.006f*EN_SR)); v->nc=0.12f;
}
static voice_t *note_on(int p,int note,float vel,int32_t gate,float att){
 static const voice_t zero;voice_t *v;int i,inst;float pan;(void)att;
 if(p<=PT_DRUMS || p>=EN_NPART || note<21 || note>108)return 0;
 inst=part_inst[p];
 for(i=VB[p];i<VB[p+1];i++)if(vc[i].on && vc[i].note==note && vc[i].dampk>=1)vc[i].dampk=fade_k;
 v=voice_get(p);*v=zero;v->on=1;v->part=(uint8_t)p;v->inst=(uint8_t)inst;v->note=(uint8_t)note;v->vel=vel;v->gate=gate;v->age=++vage;v->damp=v->dampk=v->lvl=1;v->stage=ST_ATT;
 pan=(fm_clampf((float)(note-62)/36,-.55f,.55f)+1)*FM_PI/4;v->gl=fm_cosf(pan);v->gr=fm_sinf(pan);
 if(inst==I_HYBRID_BASS)upright_note_on((int)(v-vc)-VB[PT_BASS],note,vel,par[P_BS_PLUCK],par[P_BS_WOOD],par[P_BS_DECAY],par[P_BS_DAMP]);
 else if(inst==I_UPRIGHT)upright_on(v);else piano_on(v);
 v->send=p==PT_BASS?.005f*(float)par[P_BS_REVERB]:PIANO_SEND;
 v->midi=(uint8_t)note;midi(0x90u|(uint32_t)p,(uint32_t)note,(uint32_t)(20+107*fm_clampf(vel,0,1)));en_notes[p]++;en_part_glow[p]=1;return v;
}
static void pedal(uint32_t mask){for(int i=0;i<NV;i++){voice_t *v=&vc[i];if(v->on && v->inst==I_PIANO && v->part!=PT_KEYS && !(mask>>(v->note%12)&1u) && v->dampk>=1)v->dampk=damp_k;}}
#define BLK 256u
static float mixl[BLK],mixr[BLK],rsend[BLK],vbuf[BLK],nzb[BLK];
static void gate_step(voice_t *v, uint32_t n)
{
    if (v->gate < 0)
        return;
    v->gate -= (int32_t)n;
    if (v->gate <= 0) {
        v->gate = -1;
        voice_midi_off(v);
        v->stage = ST_REL;
        if (v->dry && v->dampk >= 1.0f)        /* no pedal: the note ends with its gate */
            v->dampk = dry_k;
    }
}
static void modal_render(voice_t *v, uint32_t off, uint32_t n)
{
    uint32_t j;
    int r;
    float e = 0.0f;
    float g = v->vel * pg[v->part] * (v->inst == I_PIANO ? PIANO_GAIN : UPRIGHT_GAIN), d = v->damp;
    const float dk = v->dampk;
    for (j = 0; j < n; j++)
        vbuf[j] = 0.0f;
    for (r = 0; r < v->nres; r++) {
        float a1 = v->a1[r], a2 = v->a2[r], y1 = v->y1[r], y2 = v->y2[r];
        for (j = 0; j < n; j++) {
            float y = a1 * y1 - a2 * y2;
            y2 = y1;
            y1 = y;
            vbuf[j] += y;
        }
        v->y1[r] = y1;
        v->y2[r] = y2;
    }
    for (r = 0; r < v->nres;) {                  /* the partials gone below hearing: dropped */
        float y1 = v->y1[r], y2 = v->y2[r], q = y1 * y1 + y2 * y2 - v->a1[r] * y1 * y2;
        e += q;
        if (q < v->pth[r] * (guard ? 1000.0f : 1.0f)) {
            int l = --v->nres;
            v->a1[r] = v->a1[l];
            v->a2[r] = v->a2[l];
            v->y1[r] = v->y1[l];
            v->y2[r] = v->y2[l];
            v->pth[r] = v->pth[l];
        } else {
            r++;
        }
    }
    if (v->nz > 1e-5f) {                         /* the hammer's or the mallet's thump */
        float nz = v->nz, lp = v->nlp;
        for (j = 0; j < n; j++) {
            lp += v->nc * (nzb[off + j] - lp);
            vbuf[j] += lp * nz;
            nz *= v->nzd;
        }
        v->nz = nz;
        v->nlp = lp;
    }
    for (j = 0; j < n; j++) {
        float o = vbuf[j] * g * d;
        d *= dk;
        mixl[off + j] += o * v->gl;
        mixr[off + j] += o * v->gr;
        rsend[off + j] += o * v->send;
    }
    v->damp = d;
    v->lvl = fm_sqrtf(e) * d * 20.0f;            /* the partials' energy (their sum x sin w, roughly) */
    gate_step(v, n);
    if ((v->nres == 0 && v->nz <= 1e-5f) || d < 1e-4f) {
        voice_midi_off(v);
        v->on = 0;
    }
}
/* ------------------------------------------------- reverb: Dattorro's plate --- */
/* J. Dattorro, "Effect Design, Part 1", JAES 1997 (as in AMB-1 and FoMni): a predelay, four input
 * diffusers, then a figure-eight tank of two halves, each a modulated allpass, a delay, a damping
 * lowpass, an allpass and a delay, feeding the other half. Stereo out from seven taps a side. The
 * paper's lengths are for 29761 Hz; DS() scales them to 44.1 kHz. */
#define DS(n) (((n) * 14818 + 5000) / 10000)
#define PRE_N 1323
#define EXC DS(16)
enum { L_PRE, L_IN1, L_IN2, L_IN3, L_IN4, L_APL, L_D1L, L_AP2L, L_D2L, L_APR, L_D1R, L_AP2R, L_D2R, L_N };
static const int DL_LEN[L_N] = {PRE_N, DS(142), DS(107), DS(379), DS(277), DS(672) + EXC + 2, DS(4453), DS(1800),
                                DS(3720), DS(908) + EXC + 2, DS(4217), DS(2656), DS(3163)};
#define DL_TOTAL (PRE_N + DS(142) + DS(107) + DS(379) + DS(277) + DS(672) + DS(4453) + DS(1800) + DS(3720) + DS(908) + \
                  DS(4217) + DS(2656) + DS(3163) + 2 * (EXC + 2))
static float pl_buf[DL_TOTAL] EN_POOL;
typedef struct {
    float *b;
    int n, i;
} dl_t;
static dl_t dl[L_N];
static float pl_bw, pl_damp_l, pl_damp_r, pl_decay = 0.5f, pl_decay_t = 0.5f, pl_dd2 = 0.5f, lfo_s, lfo_c = 1.0f;
static float rev_send = 0.25f, rev_wet = 1.0f;

static inline float tap(const dl_t *d, int k)
{
    int j = d->i - k;
    return d->b[j < 0 ? j + d->n : j];
}
static inline void push(dl_t *d, float x)
{
    d->b[d->i] = x;
    if (++d->i >= d->n)
        d->i = 0;
}
static inline float allpass(dl_t *d, int len, float x, float g)
{
    float z = tap(d, len), v = x - g * z;
    push(d, fm_flush(v));
    return z + g * v;
}
static inline float allpass_mod(dl_t *d, float len, float x, float g)
{
    int k = (int)len;
    float f = len - (float)k, z = tap(d, k) + (tap(d, k + 1) - tap(d, k)) * f, v = x - g * z;
    push(d, fm_flush(v));
    return z + g * v;
}

static inline void reverb(float in, float *ol, float *or_)
{
    float x, a, b, fb_l = tap(&dl[L_D2R], DS(3163)), fb_r = tap(&dl[L_D2L], DS(3720));
    push(&dl[L_PRE], in);
    x = tap(&dl[L_PRE], PRE_N);
    pl_bw += 0.6f * (x - pl_bw);
    x = allpass(&dl[L_IN1], DS(142), pl_bw, 0.75f);
    x = allpass(&dl[L_IN2], DS(107), x, 0.75f);
    x = allpass(&dl[L_IN3], DS(379), x, 0.625f);
    x = allpass(&dl[L_IN4], DS(277), x, 0.625f);
    {
        float s = lfo_s + 0.0001f * lfo_c, c = lfo_c - 0.0001f * s;
        lfo_s = s;
        lfo_c = c;
    }
    a = allpass_mod(&dl[L_APL], (float)DS(672) + (float)EXC * lfo_s, x + pl_decay * fb_l, -0.7f);
    push(&dl[L_D1L], a);
    b = tap(&dl[L_D1L], DS(4453));
    pl_damp_l += 0.45f * (b - pl_damp_l);
    b = allpass(&dl[L_AP2L], DS(1800), pl_damp_l * pl_decay, pl_dd2);
    push(&dl[L_D2L], b);
    a = allpass_mod(&dl[L_APR], (float)DS(908) + (float)EXC * lfo_c, x + pl_decay * fb_r, -0.7f);
    push(&dl[L_D1R], a);
    b = tap(&dl[L_D1R], DS(4217));
    pl_damp_r += 0.45f * (b - pl_damp_r);
    b = allpass(&dl[L_AP2R], DS(2656), pl_damp_r * pl_decay, pl_dd2);
    push(&dl[L_D2R], b);
    *ol = 0.6f * (tap(&dl[L_D1R], DS(266)) + tap(&dl[L_D1R], DS(2974)) - tap(&dl[L_AP2R], DS(1913)) +
                  tap(&dl[L_D2R], DS(1996)) - tap(&dl[L_D1L], DS(1990)) - tap(&dl[L_AP2L], DS(187)) -
                  tap(&dl[L_D2L], DS(1066)));
    *or_ = 0.6f * (tap(&dl[L_D1L], DS(353)) + tap(&dl[L_D1L], DS(3627)) - tap(&dl[L_AP2L], DS(1228)) +
                   tap(&dl[L_D2L], DS(2673)) - tap(&dl[L_D1R], DS(2111)) - tap(&dl[L_AP2R], DS(335)) -
                   tap(&dl[L_D2R], DS(121)));
}

static void plate_init(void)
{
    float *p = pl_buf;
    int k, i;
    for (k = 0; k < L_N; k++) {
        dl[k].b = p;
        dl[k].n = DL_LEN[k];
        dl[k].i = 0;
        p += DL_LEN[k];
    }
    for (i = 0; i < DL_TOTAL; i++)
        pl_buf[i] = 0.0f;
    pl_bw = pl_damp_l = pl_damp_r = 0.0f;
    lfo_s = 0.0f;
    lfo_c = 1.0f;
}


#include "ensemble.inc"
