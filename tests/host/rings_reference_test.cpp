/* SPDX-License-Identifier: GPL-3.0-only */
// Verify the C signal path against the unmodified Rings/stmlib components.
// Coefficients are shared so this isolates the port from the different control
// curves and sample rate. The acoustic tests separately check absolute tuning.
#include <cstdio>
#include <cmath>
#include "rings/dsp/string.h"
extern "C" {
#include "rings_string.h"
}
int main()
{
    const int notes[]={21,28,40,60,72};
    float buffer[RINGS_STRING_SIZE];double worst=0;
    for(int note:notes)for(float brightness:{.1f,.5f,.9f})for(float t60:{.2f,2.0f,8.0f}) {
        rings_string_t actual;
        const float hz=440.0f*std::pow(2.0f,(float)(note-69)/12.0f);
        rings_string_init(&actual,buffer,hz,brightness,t60);
        stmlib::DelayLine<float,RINGS_STRING_SIZE> delay;delay.Init();
        rings::DampingFilter fir;fir.Init();fir.Configure(actual.gain,brightness*brightness,0);
        stmlib::Svf lowpass;lowpass.Init();lowpass.set_g_r_h(actual.g,2.0f,actual.h);
        uint32_t rng=42;
        for(int i=0;i<44100;i++) {
            rng^=rng<<13;rng^=rng>>17;rng^=rng<<5;
            const float input=i<1800?(float)(int32_t)rng*(.05f/2147483648.0f):0.0f;
            float expected=delay.ReadHermite((float)actual.delay+actual.frac)+input;
            expected=fir.Process(expected);expected=lowpass.Process<stmlib::FILTER_MODE_LOW_PASS>(expected);delay.Write(expected);
            float got=rings_string_tick(&actual,input,1.0f);
            worst=std::max(worst,(double)std::fabs(got-expected));
        }
    }
    std::printf("Rings C port vs upstream Hermite/FIR/SVF: worst absolute difference %.9g\n",worst);
    return worst<.00001?0:1;
}
