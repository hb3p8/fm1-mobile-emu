/* SPDX-License-Identifier: GPL-3.0-only */
#include <stdio.h>
#include <stdlib.h>
#include "../../firmware/src/dsp/min.c"
void en_midi_out(uint32_t a,uint32_t b,uint32_t c) {(void)a;(void)b;(void)c;}
#define OK(x) do{if(!(x)){printf("FAIL %d: %s\n",__LINE__,#x);return 1;}}while(0)
static int32_t audio[512];
static double sample[2][3];
int main(void)
{
    int sound,wet,p,i,j;int16_t params[P_NPARAMS];
    for(sound=0;sound<3;sound++)for(wet=0;wet<2;wet++) {
        voice_t *bass,*piano;
        en_init();en_piece(8,params);
        for(p=0;p<P_NPARAMS;p++)apply(p,params[p]);
        apply(P_BS_SOUND,sound);apply(P_BS_REVERB,wet?100:0);
        bass=note_on(PT_BASS,40,.8f,4410,0);
        OK(fm_fabsf(bass->send-(wet?.5f:0))<.00001f);
        /* An already ringing bass follows the control, while piano stays put. */
        piano=note_on(PT_KEYS,60,.8f,4410,0);
        apply(P_BS_REVERB,31);OK(fm_fabsf(bass->send-.155f)<.00001f);OK(piano->send==PIANO_SEND);
        apply(P_BS_REVERB,wet?100:0);piano->on=0;
        /* Leave playback stopped: just this one bass note and its effect tail. */
        for(i=0;i<700;i++) {
            if(i==200)bass->on=0; /* Only the plate tail remains. */
            en_render(audio,256,2048);
            if(i>=500)for(j=0;j<512;j++){double x=audio[j];sample[wet][sound]+=x*x;}
        }
        OK(sample[wet][sound]>=0);
    }
    for(sound=0;sound<3;sound++){printf("bass %d tail dry %.0f wet %.0f\n",sound,sample[0][sound],sample[1][sound]);OK(sample[0][sound]==0);OK(sample[1][sound]>0);}
    puts("PASS all bass timbres: zero send, live adjustment, independent piano, audible reverb tail.");return 0;
}
