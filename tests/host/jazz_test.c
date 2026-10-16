/* SPDX-License-Identifier: GPL-3.0-only */
#include <stdio.h>
#include <stdlib.h>
#include "min.h"
static int32_t audio[512];
static unsigned notes[16],manual_off,render_block,piano_block,piano_in_block,piano_max;
static int bass_test=-1;
static unsigned bass_len[3],bass_line[3][64];
void en_midi_out(uint32_t st,uint32_t note,uint32_t velocity) {
    (void)note;
    if(bass_test>=0 && (st&240)==144 && velocity && (st&15)==PT_BASS && bass_len[bass_test]<64)
        bass_line[bass_test][bass_len[bass_test]++]=note;
    if((st&240)==144 && velocity && (st&15)==PT_CHORDS) {
        if(piano_block!=render_block) { piano_block=render_block; piano_in_block=0; }
        if(++piano_in_block>piano_max) piano_max=piano_in_block;
    }
    if((st&240)==144 && velocity) notes[st&15]++;
    if((st&240)==128 && (st&15)==PT_LOWER) manual_off++;
}
#define OK(x) do {if(!(x)){printf("FAIL line %d: %s\n",__LINE__,#x);return 1;}}while(0)
static void render(int frames) {while(frames>0){int n=frames>256?256:frames;render_block++;en_render(audio,(uint32_t)n,2048);frames-=n;}}
static uint16_t rotate(uint16_t m,int x){x%=12;return (uint16_t)(((m<<x)|(m>>(12-x)))&4095);}
int main(void) {
    int key,cycle,k,p; uint16_t m,anchors,scale;uint8_t bass;
    for(key=0;key<12;key++)for(cycle=18;cycle<25;cycle++){
        int n=en_cycle_get(cycle,0,-1,0,0);
        OK(n>=3&&n<=4);
        for(k=0;k<n;k++){
            en_cycle_get(cycle,0,k,&m,&bass);m=rotate(m,key);bass=(uint8_t)((bass+key)%12);
            scale=en_jazz_scale_for(m,bass,key,&anchors);OK((scale&m)==m);OK((anchors&m)==anchors);OK(anchors);
        }
    }
    for(cycle=20;cycle<27;cycle++){
        int16_t par[P_NPARAMS];uint16_t harmony;unsigned before;
        piano_max=piano_in_block=0;piano_block=0;render_block=0;
        en_init();en_piece(cycle,par);OK(par[P_CH_RHYTHM]==2);OK(par[P_ROOM]==50);for(p=0;p<P_NPARAMS;p++)en_set(p,par[p]);en_play(1);render(256);
        OK(en_params()[P_MODEL]==M_JAZZ);OK(en_cyc_n>=3);OK(en_jazz_scale);
        harmony=en_chord_mask;before=en_notes[PT_LOWER];en_note(60,100);en_note(64,100);en_note(67,100);render(4410);
        OK(en_notes[PT_LOWER]==before+3);OK(en_chord_mask==harmony);OK(!en_yours);
        en_note(60,0);en_note(64,0);en_note(67,0);render(44100*7);
        OK(piano_max==1);OK(en_notes[PT_CHORDS]>=32);
        OK(en_notes[PT_BASS]>4);OK(en_notes[PT_CHORDS]>4);OK(en_notes[PT_UPPER]>4);OK(en_notes[PT_LEAD]>0);
        OK(en_jazz_scale);printf("ok %s: chords=%u bass=%u drums=%u solo=%u\n",en_piece_name(cycle),en_notes[4],en_notes[2],en_notes[0],en_notes[3]);
    }
    OK(manual_off>=21);OK(notes[9]>0);
    {
        uint32_t hash[3]={2166136261u,2166136261u,2166136261u};
        int sound,block,sample; int16_t par[P_NPARAMS];
        for(sound=0;sound<3;sound++) {
            char text[16];
            en_init();en_piece(26,par);par[P_BS_SOUND]=(int16_t)sound;
            par[P_UP_LEVEL]=par[P_LO_LEVEL]=par[P_LD_LEVEL]=par[P_CH_LEVEL]=0;
            for(p=0;p<P_NPARAMS;p++)en_set(p,par[p]);
            bass_test=sound;en_play(1);
            for(block=0;block<1034;block++) {
                en_render(audio,256,2048);
                for(sample=0;sample<512;sample++) hash[sound]=(hash[sound]^(uint32_t)audio[sample])*16777619u;
            }
            en_param_text(P_BS_SOUND,sound,text);OK(text[0]==(sound==2?'R':sound?'P':'U'));
        }
        OK(hash[0]!=hash[1]);OK(hash[2]!=hash[0]);OK(hash[2]!=hash[1]);OK(bass_len[2]==bass_len[0]);OK(bass_len[0]>8);OK(bass_len[0]==bass_len[1]);
        for(k=0;k<(int)bass_len[0];k++){OK(bass_line[0][k]==bass_line[1][k]);OK(bass_line[0][k]==bass_line[2][k]);}
        puts("ok bass Rings/Upright/Piano: different audio, identical walking line");
    }
    puts("Jazz Box: all tests passed");return 0;
}
