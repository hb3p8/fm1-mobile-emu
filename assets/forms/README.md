# Jazz Box form library

`library.json` is the source of truth for both device and WebAssembly builds.
It contains schema 1, two banks (`romance`, `after`), read-only source harmony
and drums, and editable bass/piano forms. Normal builds compile this JSON;
they never re-extract forms from MIDI.

Run `python3 tools/jazz_server.py` from the repository and open
http://127.0.0.1:58049/forms.html. Save writes the JSON. Build compiles it into
the web engine. Reload the instrument tab after building. No device flashing
is performed by the editor.

## Form fields

| Field | Meaning |
| --- | --- |
| id | Stable unique bank-local identifier, 1–64 characters |
| name | Display name, 1–32 printable ASCII characters for the FM-1 font |
| part | `bass` or `piano` |
| family | 0 major, 1 minor, 2 dominant, 3 diminished |
| feel | 0 two-feel, 1 walking |
| length | 48 or 96 ticks: two or four quarter-note beats at 24 PPQN |
| source_bar | Provenance in the extracted accompaniment; 0 for a new form |
| kind | Original analysis category, retained as metadata |
| notes | At most 48 notes, sorted by `at`; an empty form is a rest |

The selector requires a matching part, length and feel. Piano additionally
matches chord family. Bass contours can cross families because their roles
are remapped to the current chord. The Romance arrangement changes between
two-feel and walking; After Gone currently selects walking forms.

## Note fields

| Field | Meaning |
| --- | --- |
| at | Start tick, 0 through length−1 |
| gate | Duration in ticks, 1–255; may overlap the next chord |
| role | 0 root, 1 third, 2 fifth, 3 seventh, 4 ninth, 5 eleventh, 6 thirteenth, 7 colour tone, 16 next root |
| oct | Octave offset from the phrase base, −4 through 5 |
| alter | Chromatic offset after resolving the role: −1, 0, +1 semitone |
| velocity | Original/editable MIDI velocity, 1–127 |

Thirds, fifths and sevenths follow the chord mask; extensions/colour tones
follow its scale. NEXT resolves to the closest next-chord root relative to
the phrase base, before the octave and chromatic offset. Phrases are moved
as a whole by octaves to keep their contour. Bass is folded into MIDI 21–55
before its octave control; piano connects to the running voicing centre.
Coincident unisons at the same tick are played once.

The editor auditions a phrase in isolation (neutral previous bass/voicing),
so register can differ from the same form in an ongoing ensemble. Its note
decoder is checked against the actual C implementation across all bank
notes, keys and preview chord qualities. Sound comes from the same WASM
piano and Rings bass as the instrument.

The validator checks bounds, stable IDs, source-chart continuity and at least
two compatible forms for every required part/length/feel/family combination.
This prevents an edit from silently breaking the random selector. Harmony
and source drum tracks cannot be replaced through form import.

```sh
python3 tools/form_library.py --output build/gen
python3 tests/host/form_library_test.py
node tests/host/forms_editor_test.mjs
```

The last test needs a current `build/emu/min.wasm`. Extractor scripts in
`tools/` are analysis utilities, not the library build path. Source MIDI is
user-supplied; see `assets/scores/README.txt` for musical provenance.
