/* SPDX-License-Identifier: GPL-3.0-only
 * Rings hybrid pizzicato: CC0 VSCO 2 recordings excite the ported Rings
 * string kernel. There is no independent synthetic pluck or dry attack mix.
 * Single precision, bounded memory, no allocation or libm in the audio path. */
#include "upright.h"
#include "fastmath.h"
#include "rings_string.h"
#include "upright_attacks.h"
#include <string.h>

#ifdef EN_HOST
#define UB_POOL
#else
#define UB_POOL __attribute__((section(".pool")))
#endif
static float strings[UPRIGHT_VOICES][UPRIGHT_DELAY] UB_POOL;
typedef struct { float b, a1, a2, z1, z2; } body_t;
typedef struct {
    uint32_t age;
    int active, attack, release;
    float rel_gain, release_gain, level, velocity, wood;
    float sample_pos, sample_step, excitation_gain, dc_x, dc_y;
    rings_string_t string;
    body_t body[3];
} upright_t;
static upright_t state[UPRIGHT_VOICES];
static uint32_t articulation;

static void body_init(body_t *b,float hz,float q)
{
    float w=FM_TWO_PI*hz/44100.0f, a=fm_sinf(w)/(2.0f*q), scale=1.0f/(1.0f+a);
    b->b=a*scale;b->a1=-2.0f*fm_cosf(w)*scale;b->a2=(1.0f-a)*scale;b->z1=b->z2=0;
}
static float body_tick(body_t *b,float x)
{
    float y=b->b*x+b->z1;
    b->z1=-b->a1*y+b->z2;b->z2=-b->b*x-b->a2*y;
    return y;
}
void upright_init(void) { memset(state,0,sizeof state);articulation=0; }
void upright_note_on(int voice,int note,float velocity,int pluck,int wood,int decay,int damping)
{
    upright_t *v;float f,source_f,brightness,t60;
    int j,zone=0;float best=1.0e9f;
    if(voice<0 || voice>=UPRIGHT_VOICES) return;
    v=&state[voice];memset(v,0,sizeof *v);v->active=1;
    v->velocity=fm_clampf(velocity,0.0f,1.0f);
    f=440.0f*fm_exp2f((float)(note-69)*(1.0f/12.0f));
    brightness=.22f+.48f*(float)pluck*.01f*(.5f+.5f*v->velocity);
    t60=.8f+4.5f*(float)decay*.01f;
    rings_string_init(&v->string,strings[voice],f,brightness,t60);
    v->rel_gain=fm_exp2f(-10.0f/(f*(.30f-.24f*(float)damping*.01f)));
    v->release_gain=1.0f;v->wood=(float)wood*.01f;
    for(j=0;j<UPRIGHT_ATTACK_ZONES;j++) {
        float distance=fm_fabsf((float)(note-UPRIGHT_ATTACK_ROOT[j]));
        if(distance<best){best=distance;zone=j;}
    }
    v->attack=zone*2+(int)((++articulation)&1u);
    v->sample_step=.5f*fm_exp2f((float)(note-UPRIGHT_ATTACK_ROOT[zone])*(1.0f/12.0f));
    source_f=440.0f*fm_exp2f((float)(UPRIGHT_ATTACK_ROOT[zone]-69)*(1.0f/12.0f));
    /* Equalise build-up across source registers (different cycle counts).
     * The recorded transient is the sole excitation, fed inside the loop. */
    v->excitation_gain=.70f/(1.0f+.5f*(float)UPRIGHT_ATTACK_LEN/22050.0f*source_f);
    body_init(&v->body[0],108.0f,.9f);body_init(&v->body[1],310.0f,1.15f);body_init(&v->body[2],780.0f,1.3f);
}
void upright_render(int voice,float *out,uint32_t frames,int release)
{
    upright_t *v;uint32_t i;float peak=0;
    if(voice<0 || voice>=UPRIGHT_VOICES){memset(out,0,frames*sizeof *out);return;}
    v=&state[voice];
    if(!v->active){memset(out,0,frames*sizeof *out);return;}
    if(release) v->release=1;
    for(i=0;i<frames;i++) {
        float attack=0,signal,body,dc;
        if(v->sample_pos<(float)(UPRIGHT_ATTACK_LEN-1)) {
            int p=(int)v->sample_pos;float frac=v->sample_pos-(float)p;
            const int16_t *sample=UPRIGHT_ATTACK[v->attack];
            attack=((float)sample[p]+frac*(float)(sample[p+1]-sample[p]))*(1.0f/32768.0f);
            v->sample_pos+=v->sample_step;
        }
        v->release_gain+=.008f*((v->release?v->rel_gain:1.0f)-v->release_gain);
        signal=rings_string_tick(&v->string,v->excitation_gain*attack,v->release_gain);
        body=.85f*body_tick(&v->body[0],signal)+.55f*body_tick(&v->body[1],signal)+.25f*body_tick(&v->body[2],signal);
        signal=(signal+.95f*v->wood*body)*v->velocity;
        /* Suppress delay-line DC without removing the low E fundamental. */
        dc=signal-v->dc_x+.9985f*v->dc_y;v->dc_x=signal;v->dc_y=fm_flush(dc);
        out[i]=1.2f*dc;peak=fm_maxf(peak,fm_fabsf(out[i]));v->age++;
    }
    v->level=.7f*peak+.3f*v->level;
    if((v->age>4410u && v->release && v->level<.00003f) || v->age>44100u*12u)v->active=0;
}
int upright_active(int voice) { return voice>=0&&voice<UPRIGHT_VOICES?state[voice].active:0; }
float upright_level(int voice) { return voice>=0&&voice<UPRIGHT_VOICES?state[voice].level:0; }
