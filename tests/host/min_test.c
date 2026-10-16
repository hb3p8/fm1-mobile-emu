/* SPDX-License-Identifier: GPL-3.0-only */
/* Jazz-only integration checks: audio, mute, clock, live polyphony, presets. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "min.h"
static int32_t audio[512];static unsigned played[16];
void en_midi_out(uint32_t st,uint32_t n,uint32_t v){(void)n;if((st&240)==144 && v)played[st&15]++;}
#define OK(x) do{if(!(x)){printf("FAIL %d: %s\n",__LINE__,#x);return 1;}}while(0)
static int render(unsigned frames){int peak=0;while(frames){unsigned n=frames>256?256:frames;en_render(audio,n,2048);for(unsigned j=0;j<n*2;j++)if(abs(audio[j])>peak)peak=abs(audio[j]);frames-=n;}return peak;}
static void start(int piece,int mute){int16_t p[P_NPARAMS];en_init();en_piece(piece,p);if(mute)p[P_DR_LEVEL]=p[P_KEYS_LEVEL]=p[P_BS_LEVEL]=p[P_CH_LEVEL]=0;for(int i=0;i<P_NPARAMS;i++)en_set(i,p[i]);en_play(1);memset(played,0,sizeof played);}
int main(void){
 OK(EN_NPIECES==10 && EN_NPART==4);
 for(int i=0;i<P_NPARAMS;i++)if(!en_param_active(i)){en_init();en_set(i,123);render(1);OK(en_params()[i]==0);}
 for(int p=0;p<10;p++){start(p,0);int peak=render(44100u*8u);OK(peak>10000 && peak<8388608);OK(played[PT_BASS]>0 && played[PT_CHORDS]>0 && played[9]>0);OK(played[PT_KEYS]==0);start(p,1);OK(render(44100u*2u)==0);}
 start(6,0);render(1);uint16_t harmony=en_chord_mask;en_note(60,100);en_note(64,100);en_note(67,100);render(4410);OK(en_notes[PT_KEYS]==3 && en_chord_mask==harmony);en_note(60,0);en_note(64,0);en_note(67,0);
 en_play(0);render(44100);unsigned before=en_notes[PT_KEYS];en_note(72,110);OK(render(4410)>10000 && en_notes[PT_KEYS]==before+1);en_note(72,0);
 en_panic();render(44100*12);OK(render(4410)==0);
 en_load(99,256);OK(en_guarding);for(int i=0;i<600;i++)en_load(10,256);OK(!en_guarding);
 puts("PASS Jazz-only engine: ten recipes, four parts, no retired parameters, finite audio, silence at mute, independent polyphony, panic, overload recovery.");return 0;
}
