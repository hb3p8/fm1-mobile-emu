Fine Romance Trio — user-supplied musical material

a_fine_romance_mw.mid is the original file supplied for this local Jazz Box
adaptation. The file credits the MIDI arrangement/orchestration to Mel Webb.
Its own metadata describes a copyright tune; no open licence is asserted for
the composition or arrangement. GPL notices for the software do not license
this musical material.

tools/gen_romance_score.py compiles tracks 6 (acoustic bass), 7 (acoustic piano
accompaniment), and 11 (GM percussion). The separate melody, guitar and strings
are excluded. The first two bars and two-bar ending are excluded, producing a
128-bar loop at 160 BPM. The bass octave shift is a runtime parameter, 0 by
default after listening feedback; the screenshot label is not used as a
transposition instruction.

All note starts, note lengths and velocities are retained on the 24 PPQN
engine grid. Starts and lengths are rounded separately with maximum error
1/48 of a quarter note (7.8125 ms at 160 BPM). No random humanisation is added.
Pedal/controllers and source GM timbres are not imported: FM-1's own voices,
harmonic piano damping, reverb and X0X 909 drums are used.

The analytical 32-bar chord chart in the compiler provides guide tones and
scales; it repeats across the four performed choruses, which retain their
individual note variations. Bass/drum feel changes at bars 33–48 and 97–112.

The generated table is const data (about 24 KiB), not an audio recording.
No file I/O, dynamic allocation or MIDI parsing runs on the FM-1.

Romance Forms is a separate generative preset using the same chart and drums.
tools/gen_romance_forms.py splits bass and piano at the 172 performed chord
spans (2/4 beats), and abstracts 344 source phrases into 164 forms: 59 bass,
105 piano. Bass patterns are deduplicated across roots, qualities and absolute
registers; their functional pitch/relative octave/rhythm contours distinguish
the forms. Piano forms additionally keep their chord-family compatibility.

Every form stores onset, gate, velocity, harmonic role, relative octave and
chromatic offset. Late bass semitones/anticipations can reference the next
chord root. Piano role mapping retains inversions/contours; whole forms move
by octaves to reduce register jumps. Phrase gates are bounded at the next
chord plus four ticks. Two short queues (max 20 notes each) are materialised;
the bank is read-only. The 32-bar harmony, drum score and section feel remain
fixed; only the bass/piano phrase choices change. The RNG has its own state,
independent of human key presses and mixer settings.

The generated romance_forms.txt documents the automatic functional analysis
and all form IDs/source bars. Musical ownership is unchanged by this analysis.

After You've Gone Forms — user-supplied after_youve_gone_dm.mid

The mixed piano track (SMF index 1, channel 1) is split before extracting
forms: 1182 notes in compact polyphonic lower-hand gestures; 1246 notes in
the excluded right-hand melody/harmonisation layer. The split is conservative
and automatic, documented in tools/gen_after_forms.py. Monophonic low-register
runs and octave-only lines are excluded as well as high right-hand lines.
The generated after_separated.mid permits inspection of both disjoint parts.

The analytical 40-bar chart is inferred from the bass and lower piano voices.
Four intro bars and the ending are omitted; file bars 5–124 supply three
40-bar choruses at 140 BPM in Eb. The 256-form bank contains 125 bass and
131 accompaniment forms. Rare 2-beat slots are supplemented by halves of
actual 4-beat gestures. Runtime picks a new length/family-compatible form,
preserving rhythm/gate/velocity and adapting harmonic functions/approaches.

Only a generative preset is exposed, no fixed original take or source melody.
1213 source drum events provide the 120-bar kit loop (GM mapped to X0X voices).
The source metadata identifies dougmck; no open licence for this musical
arrangement is asserted. Software GPL notices do not license the music.
