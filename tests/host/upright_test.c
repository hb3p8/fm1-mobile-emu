/* SPDX-License-Identifier: GPL-3.0-only */
#include <stdio.h>
#include <math.h>
#include <stdlib.h>
#include "upright.h"
#define SR 44100
#define OK(x) do {if(!(x)){printf("FAIL line %d: %s\n",__LINE__,#x);return 1;}}while(0)
static float buf[256],tone[SR*2];
static double power(double hz)
{
    int i,start=SR/3,end=SR*4/3;double re=0,im=0;
    for(i=start;i<end;i++){
        double w=.5-.5*cos(6.283185307179586*(double)(i-start)/(double)(end-start-1));
        double a=6.283185307179586*hz*(double)i/SR;
        re+=(double)tone[i]*w*cos(a);im+=(double)tone[i]*w*sin(a);
    }
    return re*re+im*im;
}
int main(void)
{
    int notes[]={21,28,34,40,49,60,72},k,j,n,edge;double peak=0;
    for(k=0;k<7;k++) {
        double f=440.*pow(2.,(notes[k]-69)/12.),best=0;int cents,best_cents=999;
        upright_init();upright_note_on(0,notes[k],.8f,62,70,48,58);
        for(n=0;n<SR*2;n+=256) {
            int count=SR*2-n<256?SR*2-n:256;
            upright_render(0,buf,(unsigned)count,0);
            for(j=0;j<count;j++){OK(isfinite(buf[j]));tone[n+j]=buf[j];peak=fmax(peak,fabs((double)buf[j]));}
        }
        for(cents=-50;cents<=50;cents+=5) {
            double p=power(f*pow(2.,cents/1200.));
            if(p>best){best=p;best_cents=cents;}
        }
        printf("pitch %d: %+d cents\n",notes[k],best_cents);OK(abs(best_cents)<=20);
    }
    /* Control extremes and all release tails must stay finite and decay. */
    for(edge=0;edge<16;edge++) {
        float early=0,late=0;
        upright_init();upright_note_on(1,28,.95f,edge&1?100:0,edge&2?100:0,edge&4?100:0,edge&8?100:0);
        for(n=0;n<SR*3;n+=256) {
            upright_render(1,buf,256,n>=SR/2);
            for(j=0;j<256;j++){OK(isfinite(buf[j]));OK(fabsf(buf[j])<2.0f);if(n<SR/2)early+=buf[j]*buf[j];if(n>SR*2)late+=buf[j]*buf[j];}
        }
        OK(early>.01f);OK(late<early*.001f);OK(!upright_active(1));
    }
    printf("Rings hybrid bass: pitch, stability, 16 control extremes and release passed (peak %.3f)\n",peak);return 0;
}
