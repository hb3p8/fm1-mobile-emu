/* SPDX-License-Identifier: GPL-3.0-only */
#pragma once
#include <stdint.h>

/* Three bounded voices: a sounding note and its overlapping release tails.
 * All controls are 0..100. Output is mono, 44.1 kHz, without mixer gain. */
#define UPRIGHT_VOICES 3
#define UPRIGHT_DELAY 2048
void upright_init(void);
void upright_note_on(int voice, int note, float velocity, int pluck, int wood, int decay, int damping);
void upright_render(int voice, float *out, uint32_t frames, int release);
int upright_active(int voice);
float upright_level(int voice);
