/* SPDX-License-Identifier: GPL-3.0-only */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../../firmware/src/dsp/min.c"
static int32_t audio[512];
static FILE *wave;
static uint32_t notes_hash,drum_hash,note_count[5];
void en_midi_out(uint32_t status,uint32_t note,uint32_t vel)
{
    if((status&240u)!=144u || !vel)return;
    unsigned part=(status&15u)==9?0:status&15u;
    if(part>=5)return;
    note_count[part]++;
    uint32_t x=note|(vel<<8)|(ticks<<16);
    if(part==0)drum_hash=(drum_hash^x)*16777619u;
    else notes_hash=(notes_hash^x)*16777619u;
}
#define OK(x) do{if(!(x)){printf("FAIL %d: %s\n",__LINE__,#x);return 1;}}while(0)
static void start(int seed)
{
    int16_t p[P_NPARAMS];
    en_init();en_piece(9,p);p[P_SEED]=(int16_t)seed;
    for(int k=0;k<P_NPARAMS;k++)en_set(k,p[k]);
    en_play(1);en_render(audio,1,2048);
    notes_hash=drum_hash=2166136261u;memset(note_count,0,sizeof note_count);
}
static int take(int seed,uint32_t *nh,uint32_t *dh)
{
    start(seed);uint16_t old[2]={65535,65535};unsigned changes=0;uint32_t harmony=2166136261u;
    unsigned left=(unsigned)(120.*4.*60./140.*44100.)-1u;
    while(left){
        unsigned n=left>256?256:left;
        en_render(audio,n,2048);left-=n;
        if(wave)for(unsigned i=0;i<n*2;i++){int16_t a=(int16_t)(audio[i]>>8);fwrite(&a,2,1,wave);}
        OK((en_jazz_scale&en_chord_mask)==en_chord_mask);
        OK(en_jazz_bar>=1 && en_jazz_bar<=40 && en_jazz_chorus>=1 && en_jazz_chorus<=3);
        for(unsigned i=0;i<n*2;i++)OK(abs(audio[i])<8388608);
        if(en_jazz_form_bass!=old[0]){
            OK(en_jazz_form_piano!=old[1]);old[0]=en_jazz_form_bass;old[1]=en_jazz_form_piano;changes++;
            OK(old[0]<AFTER_FORM_COUNT && old[1]<AFTER_FORM_COUNT);
            OK(form_bank()[old[0]].part==PT_BASS && form_bank()[old[1]].part==PT_CHORDS);
            OK(form_bank()[old[1]].family==form_family(rot12(cur_mask,-cur_bass)));
        }
        harmony=(harmony^en_chord_mask^en_chord_bass)*16777619u;
    }
    OK(changes==126);OK(note_count[PT_BASS]>400);OK(note_count[PT_CHORDS]>500);OK(note_count[PT_DRUMS]>1100);
    OK(note_count[PT_KEYS]==0);
    *nh=notes_hash;*dh=drum_hash;
    return (int)harmony;
}
int main(int argc,char **argv)
{
    uint32_t n[3],d[3];int h[3];start(42);
    OK(en_params()[P_CYCLE]==EN_CYC_AFTER_FORMS && en_jazz_form_count()==256);
    OK(en_params()[P_TEMPO]==140 && en_params()[P_ROOT]==3);
    /* Verify every reusable form against every eligible chart chord in all keys. */
    for(int key=0;key<12;key++)for(unsigned c=0;c<AFTER_CHORDS;c++){
        par[P_ROOT]=(int16_t)key;ctick=0;
        for(unsigned id=0;id<AFTER_FORM_COUNT;id++){
            const romance_form_t *f=&AFTER_FORMS[id];int p=f->part==PT_CHORDS;
            if(f->len!=AFTER_HARMONY[c].beats*24 || (p && f->family!=form_family(AFTER_HARMONY[c].mask)))continue;
            form_materialise(p,id,c);OK(form_n[p]<=AFTER_FORM_MAX);
            for(unsigned j=0;j<form_n[p];j++){OK(form_play[p][j].note>=21);OK(form_play[p][j].note<=(p?108:55));}
        }
    }
    if(argc>1)wave=fopen(argv[1],"wb");
    h[0]=take(42,&n[0],&d[0]);if(wave){fclose(wave);wave=0;}
    h[1]=take(43,&n[1],&d[1]);h[2]=take(42,&n[2],&d[2]);
    OK(h[0]!=1 && h[1]!=1 && h[2]!=1);
    OK(h[0]==h[1] && h[0]==h[2]);OK(d[0]==d[1] && d[0]==d[2]);
    OK(n[0]!=n[1] && n[0]==n[2]);
    puts("PASS After Gone Forms: 256 forms, all keys, three full 120-bar takes, 126 selections, unchanged harmony/drums, seed repeatability, finite audio, no source melody.");
    return 0;
}
