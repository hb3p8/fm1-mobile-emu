/* SPDX-License-Identifier: GPL-3.0-only */
/* Musical regression examples plus the real C audio clock over complete
 * forms. Unity include allows inspection of the private phrase planner. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../../firmware/src/dsp/min.c"
static int32_t audio[512];
typedef struct { uint32_t part[5][128],drums,harmony;unsigned bass,piano,changes;int bad; } result_t;
static result_t *capture;
static uint32_t hash(uint32_t h,uint32_t x) { return (h^x)*16777619u; }
void en_midi_out(uint32_t status,uint32_t note,uint32_t vel)
{
    if(!capture || (status&240u)!=144u || !vel) return;
    unsigned part=(status&15u)==9?0:status&15u,bar=(en_jazz_chorus-1u)*32u+en_jazz_bar-1u;
    if(part>=5 || bar>=128) {capture->bad=1;return;}
    uint32_t v=note|(vel<<8)|(ctick<<16);
    capture->part[part][bar]=hash(capture->part[part][bar],v);
    if((status&15u)==9) capture->drums=hash(capture->drums,v);
    if(part==PT_BASS) {
        capture->bass++;
        if(en_jazz_forms_active() && ctick<=2 && !(en_chord_mask>>(note%12)&1u)) capture->bad=1;
    }
    if(part==PT_CHORDS) capture->piano++;
}
#define OK(x) do{if(!(x)){printf("FAIL %d: %s\n",__LINE__,#x);return 1;}}while(0)
static void start(int piece,int seed)
{
    int16_t p[P_NPARAMS];int k;
    en_init();en_piece(piece,p);p[P_SEED]=(int16_t)seed;
    for(k=0;k<P_NPARAMS;k++)en_set(k,p[k]);
    en_play(1);en_render(audio,1,2048);
}
static void take(int piece,int seed,result_t *r)
{
    unsigned left=192u*44100u-1u;uint16_t last[2]={65535,65535};
    capture=0;start(piece,seed);memset(r,0,sizeof *r);capture=r;
    /* First tick was consumed before capture; compare identical clocks. */
    while(left) {
        unsigned n=left>256?256:left,i;
        en_render(audio,n,2048);left-=n;
        for(i=0;i<n*2;i++) if(abs(audio[i])>=8388608)r->bad=1;
        r->harmony=hash(r->harmony,en_chord_mask|((uint32_t)en_chord_bass<<16));
        if((en_jazz_scale&en_chord_mask)!=en_chord_mask)r->bad=1;
        if(en_jazz_forms_active() && en_jazz_form_bass!=last[0]) {
            if(en_jazz_form_piano==last[1])r->bad=1;
            last[0]=en_jazz_form_bass;last[1]=en_jazz_form_piano;r->changes++;
            for(int p=0;p<2;p++)if(ROMANCE_FORMS[last[p]].len!=48 && ROMANCE_FORMS[last[p]].feel!=en_jazz_walking)r->bad=1;
            if(ROMANCE_FORMS[last[1]].family!=form_family(rot12(cur_mask,-cur_bass)))r->bad=1;
        }
    }
    capture=0;
}
int main(void)
{
    static result_t fixed,a,b,repeat;
    unsigned id,walking=65535,approach=65535,k,changed_bass=0,changed_piano=0;
    /* Exact eligible pool for both banks, both movement settings and every
     * chord: short forms ignore feel, long forms retain it, immediate
     * repeats stay excluded. Exercise picks, not only weight predicates. */
    for(int piece=8;piece<=9;piece++) {
        start(piece,42);
        for(unsigned chord=0;chord<jazz_chart_count();chord++)for(int feel=0;feel<2;feel++)for(int p=0;p<2;p++) {
            if(piece==9 && !feel)continue;
            en_jazz_walking=feel;form_previous[p]=65535;
            unsigned count=0,seen=0;
            for(id=0;id<(unsigned)en_jazz_form_count();id++) {
                const romance_form_t *f=&form_bank()[id];
                int eligible=f->part==(p?PT_CHORDS:PT_BASS) && f->len==jazz_chart()[chord].beats*24 &&
                    (!p || f->family==form_family(jazz_chart()[chord].mask)) && (f->len==48 || f->feel==feel);
                OK((form_weight(id,p,chord)>0)==eligible);count+=eligible;
            }
            OK(count>=2);
            for(unsigned draw=0;draw<512;draw++) {
                unsigned previous=form_previous[p],picked=form_pick(p,chord);
                OK(form_weight(picked,p,chord)>0 && picked!=previous);
                seen|=1u<<form_bank()[picked].feel;
                form_previous[p]=(uint16_t)picked;
            }
            if(piece==8 && jazz_chart()[chord].beats==2)OK(seen==3);
        }
    }
    start(8,42);
    for(id=0;id<ROMANCE_FORM_COUNT;id++) {
        const romance_form_t *f=&ROMANCE_FORMS[id];
        if(f->part==PT_BASS && f->source_bar==33 && f->n==4)walking=id;
        if(f->part==PT_BASS && f->source_bar==4)approach=id;
    }
    OK(walking<ROMANCE_FORM_COUNT && approach<ROMANCE_FORM_COUNT);
    /* Source B C# D# F# (1,9,3,5) becomes G# A# B D# over G#m7. */
    form_bass_last=32;ctick=0;form_materialise(0,walking,1);
    OK(form_n[0]==4);OK(form_play[0][0].note==32);OK(form_play[0][1].note==34);
    OK(form_play[0][2].note==35);OK(form_play[0][3].note==39);
    /* The D->D# approach from source bar 4 resolves to the next B instead
     * when its shape is placed on F#7: the final pitch is A#, not D. */
    form_materialise(0,approach,7);
    OK(form_play[0][form_n[0]-1].note%12==10);
    /* Every eligible form remains playable when reused on every chart chord
     * in all keys, including low transpositions and altered/dim qualities. */
    for(int key=0;key<12;key++) for(unsigned chord=0;chord<ROMANCE_CHORDS;chord++) {
        par[P_ROOT]=(int16_t)key;
        for(id=0;id<ROMANCE_FORM_COUNT;id++) {
            const romance_form_t *f=&ROMANCE_FORMS[id];int p=f->part==PT_CHORDS;
            if(f->len!=ROMANCE_HARMONY[chord].beats*24 || (p && f->family!=form_family(ROMANCE_HARMONY[chord].mask)))continue;
            form_materialise(p,id,chord);OK(form_n[p]<=ROMANCE_FORM_MAX);
            for(unsigned n=0;n<form_n[p];n++) {OK(form_play[p][n].note>=21);OK(form_play[p][n].note<=(p?108:55));}
        }
    }
    take(7,42,&fixed);take(8,42,&a);take(8,43,&b);take(8,42,&repeat);
    OK(!fixed.bad && !a.bad && !b.bad && !repeat.bad);
    OK(a.harmony==fixed.harmony && b.harmony==fixed.harmony);
    OK(a.drums==fixed.drums && b.drums==fixed.drums);
    OK(a.bass>250 && a.piano>500);OK(a.changes==172);
    OK(!memcmp(&a,&repeat,sizeof a));
    for(k=0;k<128;k++) {
        changed_bass+=a.part[PT_BASS][k]!=b.part[PT_BASS][k];
        changed_piano+=a.part[PT_CHORDS][k]!=b.part[PT_CHORDS][k];
    }
    OK(changed_bass>100 && changed_piano>100);
    for(k=0;k<32;k++) {
        changed_bass+=a.part[PT_BASS][k]!=a.part[PT_BASS][64+k];
        changed_piano+=a.part[PT_CHORDS][k]!=a.part[PT_CHORDS][64+k];
    }
    OK(changed_bass>125 && changed_piano>125);
    printf("PASS Romance Forms: %u forms, role/next-root examples, all 12 keys, unchanged harmony/drums, 172 selections, seed repeatability, changing choruses (%u/%u changed bars), finite audio.\n",ROMANCE_FORM_COUNT,changed_bass,changed_piano);
    return 0;
}
