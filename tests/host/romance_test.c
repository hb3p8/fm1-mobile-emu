/* SPDX-License-Identifier: GPL-3.0-only */
/* Exercise the complete 128-bar score, loop and live keyboard through the
 * audio clock. Counts/first phrases below come from the input MIDI analysis,
 * independently of the compiled score header. */
#include <stdio.h>
#include <stdlib.h>
#include "min.h"
static int32_t audio[512];
static unsigned count[16],bass[16],nbass;
static int bad,peak;
void en_midi_out(uint32_t status,uint32_t note,uint32_t velocity)
{
    if((status&240u)==144u && velocity) {
        unsigned ch=status&15u;
        count[ch]++;
        if(ch==PT_BASS && nbass<16) bass[nbass++]=note;
    }
}
#define OK(x) do { if(!(x)) { printf("FAIL %d: %s\n",__LINE__,#x); return 1; } } while(0)
static void render(unsigned frames)
{
    while(frames) {
        unsigned n=frames>256?256:frames,i;
        en_render(audio,n,2048);
        for(i=0;i<n*2;i++) { int a=abs(audio[i]); if(a>peak)peak=a; }
        if((en_jazz_scale&en_chord_mask)!=en_chord_mask || (en_jazz_anchor&en_chord_mask)!=en_jazz_anchor) bad=1;
        frames-=n;
    }
}
static void start(int root)
{
    int16_t par[P_NPARAMS];int i;
    en_init();en_piece(7,par);par[P_ROOT]=(int16_t)root;
    for(i=0;i<P_NPARAMS;i++)en_set(i,par[i]);
    for(i=0;i<16;i++)count[i]=0;
    nbass=0;en_play(1);
}
int main(void)
{
    uint16_t mask;int key;
    start(11);render(100);
    OK(en_jazz_score_active());OK(en_params()[P_BS_OCT]==0);
    OK(en_jazz_bar==1 && en_jazz_chorus==1 && !en_jazz_walking);
    mask=en_chord_mask;
    en_note(60,100);en_note(64,100);en_note(67,100);render(4310);
    OK(en_notes[PT_KEYS]==3);OK(en_chord_mask==mask);
    en_note(60,0);en_note(64,0);en_note(67,0);
    render(44100u*48u);OK(en_jazz_chorus==2 && en_jazz_bar==1 && en_jazz_walking);
    /* The source's low B1,F#2,B0,G#2,Eb2 register, without an octave shift. */
    OK(bass[0]==35 && bass[1]==42 && bass[2]==23 && bass[3]==44 && bass[4]==39);
    render(44100u*24u);OK(en_jazz_chorus==2 && en_jazz_bar==17 && !en_jazz_walking);
    render(44100u*119u+39690u); /* 191.999... seconds total, before the loop */
    OK(en_jazz_chorus==4 && en_jazz_bar==32);
    OK(count[PT_BASS]==456);OK(count[PT_CHORDS]==1187);OK(count[9]==1328);
    OK(!bad);OK(peak>10000 && peak<8388608);
    render(4410);OK(en_jazz_chorus==1 && en_jazz_bar==1 && !en_jazz_walking);
    OK(count[PT_BASS]==457 && count[PT_CHORDS]==1191 && count[9]==1330);
    for(key=0;key<12;key++) {
        int transpose=(key+1)%12;if(transpose>6)transpose-=12;
        int pickup=23+transpose;if(pickup<21)pickup+=12;
        start(key);render(44100u*2u);OK(bass[0]==(unsigned)(35+transpose));OK(bass[2]==(unsigned)pickup);OK(!bad);
    }
    en_set(P_CYCLE,6);render(4410);OK(!en_jazz_score_active());
    puts("PASS Fine Romance: all 2971 MIDI events, 128 bars, loop, section feel, 12 keys, scale masks, independent live piano, finite audio.");
    return 0;
}
