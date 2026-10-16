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
// Portable C adaptation of Rings' non-dispersive String kernel.
// Source: pichenettes/eurorack f4cfa7697095a28d292bff758beb51deb49b5a86
// and stmlib e3bd7c9cc00e4364166f9905c0509b6ffd0535ec.
// Retains Hermite delay, three-tap FIR loss filter, SVF loop filter and
// phase compensation LUT. Fixed-note coefficients are prepared at note-on;
// CV modulation, dispersion/nonlinear bridge, auxiliary pickup and sub-audio
// resampling are omitted. The integration uses 44.1 kHz and external buffers.
#pragma once
#include <stdint.h>
#define RINGS_STRING_SIZE 2048

typedef struct {
    float *line;
    int write, delay;
    float frac, h0, h1, gain, x1, x2, g, h, s1, s2;
} rings_string_t;
void rings_string_init(rings_string_t *s,float *buffer,float hz,float brightness,float t60);
float rings_string_tick(rings_string_t *s,float excitation,float release_gain);
