"""Protect the meaningful hand separation cases, not just output counts."""
import pathlib
import sys
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[2]/'tools'))
from gen_after_forms import split_piano, write_split
import tempfile
from gen_romance_score import read_notes
# A real low chord with G4 on top remains accompaniment; concurrent high
# melody/octave/block voices do not contaminate it.
notes=[(0,150,45,70),(2,150,63,70),(4,150,67,70),
       (5,150,79,80),(6,150,86,75),(7,150,91,80),
       (400,500,60,90),(600,700,62,90), # melody descends below the usual split point
       (800,900,48,80),(802,900,60,80), # octave unison line
       (1000,1100,58,70),(1002,1100,60,70)] # close grace-note run
comp,rh=split_piano(notes,384)
assert [n[2] for n in comp]==[45,63,67]
assert sorted(comp+rh)==notes
src=pathlib.Path(__file__).resolve().parents[2]/'assets/scores/after_youve_gone_dm.mid'
q,tracks=read_notes(src.read_bytes());comp,rh=split_piano(tracks[1],q)
assert len(comp)==1182 and len(rh)==1246
assert sorted(comp+rh)==tracks[1] and not set(comp)&set(rh)
# The excluded layer contains high block harmonisation and low single notes,
# proving that the partition is not a static octave threshold.
assert max(n[2] for n in comp)==72 and min(n[2] for n in rh)<60
print('PASS mixed-piano separation: lower chords, high harmonisation, low melody runs, octave lines; disjoint lossless source partition.')

with tempfile.TemporaryDirectory() as tmp:
    target=pathlib.Path(tmp)/'separated.mid'
    write_split(target,q,comp,rh,tracks[2],tracks[3])
    sq,st=read_notes(target.read_bytes())
    assert sq==q and st==[[],rh,comp,tracks[2],tracks[3]]
print('PASS separated MIDI export: exact note onsets/gates/velocities, zero-length notes, simultaneous drum attacks.')
