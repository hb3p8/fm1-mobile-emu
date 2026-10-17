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
| enabled | Optional boolean; omitted or `true` includes the form, `false` keeps it in JSON but omits its notes and row from both device and web builds |
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

The editor's **Include in build** checkbox preserves inactive forms for
editing, isolated audition, undo/redo and JSON import/export. The list can
filter included/excluded forms and shows how many will be compiled. Existing
libraries without `enabled` remain fully included.

## Similarity groups in the editor

The default **Similar-form groups** view clusters each bank by attack timing,
chord-relative pitch shapes, voice motion and articulation. Bass and piano,
two/four beats and two-feel/walking stay separate. NEXT-root gestures and
opposing bass contours remain distinct. Piano qualities may share a group
because the same abstract role pattern adapts to multiple chords.

Attacks rolled across three MIDI ticks are treated as one chord. Uniform
octave transposition, velocity, names and inclusion flags do not separate
variants. Complete-link clustering requires every pair in a group to be
close, avoiding a chain of progressively different phrases. This is a
structural heuristic, not a claim that all members sound identical.

Group headers fold/unfold, list the number of members and included forms,
and identify bass/piano groups as B01/P01 etc. Filters show subsets of the
same complete-bank groups. Search accepts group codes/titles as well as
form names/IDs. **Ordinary list** restores the original view.
Groups are computed for display and refresh after note edits. They never
rewrite library order, IDs or notes, change build inclusion, merge/delete
variants, or affect the firmware's random form selector.

```sh
node tests/host/form_groups_test.mjs
```

The validator checks bounds, stable IDs and source-chart continuity. Builds
also require at least two **enabled** compatible forms for every required
part/length/feel/family combination. Drafts may save fewer, so they remain
editable after a restart, but cannot build until coverage is restored.
The compiler never modifies the source JSON. Harmony
and source drum tracks cannot be replaced through form import.

```sh
python3 tools/form_library.py --output build/gen
python3 tests/host/form_library_test.py
node tests/host/forms_editor_test.mjs
```

The last test needs a current `build/emu/min.wasm`. Extractor scripts in
`tools/` are analysis utilities, not the library build path. Source MIDI is
user-supplied; see `assets/scores/README.txt` for musical provenance.
