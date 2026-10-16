// Copyright 2015 Emilie Gillet.
//
// Author: Emilie Gillet (emilie.o.gillet@gmail.com)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
// 
// See http://creativecommons.org/licenses/MIT/ for more information.
//
// See rings_string.h for provenance and the intentionally retained DSP path.
#include "rings_string.h"
#include "fastmath.h"
#include <string.h>
static const float svf_shift[] = {
   2.500000000e-01f,  2.408119579e-01f,  2.316544611e-01f,  2.225575501e-01f,
   2.135502761e-01f,  2.046602549e-01f,  1.959132760e-01f,  1.873329789e-01f,
   1.789406032e-01f,  1.707548172e-01f,  1.627916233e-01f,  1.550643347e-01f,
   1.475836177e-01f,  1.403575876e-01f,  1.333919506e-01f,  1.266901772e-01f,
   1.202537001e-01f,  1.140821254e-01f,  1.081734480e-01f,  1.025242668e-01f,
   9.712999179e-02f,  9.198504051e-02f,  8.708302003e-02f,  8.241689360e-02f,
   7.797913038e-02f,  7.376183852e-02f,  6.975688172e-02f,  6.595598018e-02f,
   6.235079694e-02f,  5.893301078e-02f,  5.569437701e-02f,  5.262677742e-02f,
   4.972226058e-02f,  4.697307381e-02f,  4.437168789e-02f,  4.191081545e-02f,
   3.958342416e-02f,  3.738274529e-02f,  3.530227864e-02f,  3.333579426e-02f,
   3.147733169e-02f,  2.972119704e-02f,  2.806195849e-02f,  2.649444041e-02f,
   2.501371653e-02f,  2.361510230e-02f,  2.229414676e-02f,  2.104662398e-02f,
   1.986852431e-02f,  1.875604550e-02f,  1.770558386e-02f,  1.671372543e-02f,
   1.577723728e-02f,  1.489305906e-02f,  1.405829467e-02f,  1.327020425e-02f,
   1.252619642e-02f,  1.182382076e-02f,  1.116076060e-02f,  1.053482614e-02f,
   9.943947824e-03f,  9.386169992e-03f,  8.859644866e-03f,  8.362626781e-03f,
   7.893466717e-03f,  7.450607078e-03f,  7.032576744e-03f,  6.637986365e-03f,
   6.265523903e-03f,  5.913950392e-03f,  5.582095932e-03f,  5.268855886e-03f,
   4.973187279e-03f,  4.694105394e-03f,  4.430680542e-03f,  4.182035018e-03f,
   3.947340207e-03f,  3.725813861e-03f,  3.516717519e-03f,  3.319354065e-03f,
   3.133065427e-03f,  2.957230396e-03f,  2.791262569e-03f,  2.634608406e-03f,
   2.486745394e-03f,  2.347180309e-03f,  2.215447582e-03f,  2.091107747e-03f,
   1.973745986e-03f,  1.862970740e-03f,  1.758412418e-03f,  1.659722154e-03f,
   1.566570656e-03f,  1.478647104e-03f,  1.395658114e-03f,  1.317326764e-03f,
   1.243391669e-03f,  1.173606108e-03f,  1.107737206e-03f,  1.045565155e-03f,
   9.868824789e-04f,  9.314933471e-04f,  8.792129165e-04f,  8.298667176e-04f,
   7.832900713e-04f,  7.393275405e-04f,  6.978324110e-04f,  6.586662024e-04f,
   6.216982059e-04f,  5.868050482e-04f,  5.538702800e-04f,  5.227839874e-04f,
   4.934424252e-04f,  4.657476707e-04f,  4.396072968e-04f,  4.149340639e-04f,
   3.916456285e-04f,  3.696642688e-04f,  3.489166247e-04f,  3.293334538e-04f,
   3.108493994e-04f,  2.934027734e-04f,  2.769353496e-04f,  2.613921700e-04f,
   2.467213608e-04f,  2.328739600e-04f,  2.198037532e-04f,  2.074671201e-04f,
   1.958228884e-04f,  1.848321967e-04f,  1.744583648e-04f,  1.646667709e-04f,
   1.554247368e-04f,  1.467014179e-04f,  1.384677010e-04f,  1.306961070e-04f,
   1.233606989e-04f,  1.164369956e-04f,  1.099018897e-04f,  1.037335710e-04f,
   9.791145345e-05f,  9.241610615e-05f,  8.722918894e-05f,  8.233339098e-05f,
   7.771237301e-05f,  7.335071282e-05f,  6.923385378e-05f,  6.534805627e-05f,
   6.168035179e-05f,  5.821849973e-05f,  5.495094649e-05f,  5.186678690e-05f,
   4.895572788e-05f,  4.620805405e-05f,  4.361459529e-05f,  4.116669618e-05f,
   3.885618709e-05f,  3.667535690e-05f,  3.461692730e-05f,  3.267402848e-05f,
   3.084017618e-05f,  2.910925011e-05f,  2.747547345e-05f,  2.593339362e-05f,
   2.447786409e-05f,  2.310402715e-05f,  2.180729775e-05f,  2.058334818e-05f,
   1.942809362e-05f,  1.833767851e-05f,  1.730846370e-05f,  1.633701428e-05f,
   1.542008813e-05f,  1.455462508e-05f,  1.373773675e-05f,  1.296669683e-05f,
   1.223893206e-05f,  1.155201359e-05f,  1.090364889e-05f,  1.029167410e-05f,
   9.714046817e-06f,  9.168839263e-06f,  8.654231857e-06f,  8.168507146e-06f,
   7.710044069e-06f,  7.277312546e-06f,  6.868868378e-06f,  6.483348419e-06f,
   6.119466033e-06f,  5.776006796e-06f,  5.451824445e-06f,  5.145837051e-06f,
   4.857023409e-06f,  4.584419632e-06f,  4.327115929e-06f,  4.084253574e-06f,
   3.855022035e-06f,  3.638656274e-06f,  3.434434189e-06f,  3.241674210e-06f,
   3.059733017e-06f,  2.888003398e-06f,  2.725912223e-06f,  2.572918525e-06f,
   2.428511705e-06f,  2.292209816e-06f,  2.163557965e-06f,  2.042126787e-06f,
   1.927511018e-06f,  1.819328137e-06f,  1.717217095e-06f,  1.620837105e-06f,
   1.529866508e-06f,  1.444001699e-06f,  1.362956111e-06f,  1.286459263e-06f,
   1.214255852e-06f,  1.146104908e-06f,  1.081778982e-06f,  1.021063394e-06f,
   9.637555088e-07f,  9.096640684e-07f,  8.586085474e-07f,  8.104185525e-07f,
   7.649332542e-07f,  7.220008496e-07f,  6.814780557e-07f,  6.432296314e-07f,
   6.071279262e-07f,  5.730524541e-07f,  5.408894912e-07f,  5.105316968e-07f,
   4.818777544e-07f,  4.548320342e-07f,  4.293042737e-07f,  4.052092763e-07f,
   3.824666271e-07f,  3.610004248e-07f,  3.407390278e-07f,  3.216148157e-07f,
   3.035639631e-07f,  2.865262270e-07f,  2.704447456e-07f,  2.552658484e-07f,
   2.409388772e-07f,  2.274160171e-07f,  2.146521368e-07f,  2.026046381e-07f,
   1.912333136e-07f,  1.805002124e-07f,  1.703695139e-07f,  1.608074078e-07f,
   1.517819816e-07f,  1.432631135e-07f,  1.352223728e-07f,  1.276329242e-07f,
   1.204694386e-07f,
};

void rings_string_init(rings_string_t *s,float *buffer,float hz,float brightness,float t60)
{
    float period=44100.0f/hz, lf, damping, cutoff, f, comp, delay;
    int i;
    memset(s,0,sizeof *s);memset(buffer,0,RINGS_STRING_SIZE*sizeof *buffer);s->line=buffer;
    /* Invert Rings' T60 control curve to retain time units in Jazz Box. */
    lf=fm_clampf(fm_log2f(t60/.07f)*.125f,0.0f,.99f);
    damping=1.0f-fm_sqrtf(1.0f-lf);
    cutoff=fm_minf(24.0f+damping*damping*48.0f+brightness*brightness*24.0f,84.0f);
    f=fm_minf(hz/44100.0f*fm_exp2f(cutoff*(1.0f/12.0f)),.499f);
    i=(int)cutoff;
    comp=1.0f-(svf_shift[i]+(cutoff-(float)i)*(svf_shift[i+1]-svf_shift[i]));
    delay=fm_clampf(period*comp-1.0f,4.0f,(float)(RINGS_STRING_SIZE-4));
    s->delay=(int)delay;s->frac=delay-(float)s->delay;
    s->gain=fm_exp2f(-10.0f/(hz*t60));
    brightness*=brightness;
    s->h0=(1.0f+brightness)*.5f;s->h1=(1.0f-brightness)*.25f;
    /* stmlib OnePole::tan<FREQUENCY_ACCURATE>, same polynomial as upstream. */
    {
        float p=FM_PI,p2=p*p,f2=f*f;
        float a=.3333314036f*p*p2,b=.1333923995f*p*p2*p2,c=.0533740603f*p*p2*p2*p2;
        float d=.002900525f*p*p2*p2*p2*p2,e=.0095168091f*p*p2*p2*p2*p2*p2;
        s->g=f*(p+f2*(a+f2*(b+f2*(c+f2*(d+f2*e)))));
    }
    s->h=1.0f/(1.0f+2.0f*s->g+s->g*s->g);
}
float rings_string_tick(rings_string_t *s,float excitation,float release_gain)
{
    int t=s->write+s->delay;float f=s->frac;
    float xm1=s->line[(t-1)&(RINGS_STRING_SIZE-1)],x0=s->line[t&(RINGS_STRING_SIZE-1)];
    float x1=s->line[(t+1)&(RINGS_STRING_SIZE-1)],x2=s->line[(t+2)&(RINGS_STRING_SIZE-1)];
    float c=(x1-xm1)*.5f,v=x0-x1,w=c+v,a=w+v+(x2-x0)*.5f,b_neg=w+a;
    float in=(((a*f)-b_neg)*f+c)*f+x0+excitation;
    float loss=s->gain*release_gain*(s->h0*s->x1+s->h1*(in+s->x2));
    float hp,bp,lp;
    s->x2=s->x1;s->x1=in;
    hp=(loss-2.0f*s->s1-s->g*s->s1-s->s2)*s->h;
    bp=s->g*hp+s->s1;s->s1=fm_flush(s->g*hp+bp);
    lp=s->g*bp+s->s2;s->s2=fm_flush(s->g*bp+lp);
    s->line[s->write]=fm_flush(lp);s->write=(s->write-1)&(RINGS_STRING_SIZE-1);
    return lp;
}
