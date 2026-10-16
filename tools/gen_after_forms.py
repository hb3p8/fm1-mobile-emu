#!/usr/bin/env python3
"""Separate the mixed piano part, then compile After You've Gone phrase grammar.

The source has one mixed piano track, bass and drums. Only confidently
polyphonic lower-hand attacks feed comping forms; right-hand lines, octaves
and block harmonisation are excluded as a unit. No original-playback preset.
"""
from collections import Counter
import hashlib
import pathlib
import struct
import sys
from gen_romance_score import read_notes
from gen_romance_forms import encode, family, SCALES, NOTE_NAMES, ROLE_NAMES

# Analytical 40-bar chart. Roots relative to Eb; all entries verified against
# the lower piano voicings and bass, not the improvising right hand.
# root, chord mask, beats, scale. Index 9 = Locrian natural 2.
BARS = [
 [(5,0x891,4,0)],[(5,0x891,4,0)],[(5,0x489,4,1)],[(10,0x495,4,3)],
 [(0,0x895,4,0)],[(0,0x895,4,0)],[(4,0x489,4,8)],[(9,0x491,4,2)],
 [(2,0x495,4,2)],[(2,0x495,4,2)],[(7,0x695,4,2)],[(7,0x695,4,2)],
 [(0,0x895,4,0)],[(0,0x295,4,0)],[(7,0x48d,4,1)],[(0,0x493,4,4)],
 [(5,0x891,4,0)],[(5,0x891,4,0)],[(5,0x489,4,1)],[(10,0x495,4,3)],
 [(0,0x895,4,0)],[(0,0x895,4,0)],[(4,0x489,4,8)],[(9,0x491,4,2)],
 [(2,0x48d,4,1)],[(9,0x491,4,2)],[(2,0x48d,4,1)],[(5,0x489,2,1),(10,0x495,2,3)],
 [(0,0x895,4,0)],[(11,0x449,2,9),(4,0x493,2,4)],[(9,0x48d,4,7)],[(6,0x249,4,5)],
 [(7,0x495,4,2)],[(9,0x491,4,2)],[(2,0x48d,4,1)],[(7,0x695,4,2)],
 [(0,0x895,4,0)],[(0,0x895,4,0)],[(7,0x48d,4,1)],[(0,0x493,4,4)],
]
CHART=[h for bar in BARS for h in bar]
SCALE_BANK=SCALES+[0x56d]


def split_piano(notes,ppqn):
    """A conservative gesture split, not a fixed high/low pitch threshold.

    Group rolled attacks within 1/8 beat. A gap of >=7 semitones above at
    least two lower notes divides hands. Accept compact, multi-pitch-class
    lower chords below C5; discard single-note runs and octave-only gestures.
    Everything outside accepted low chords belongs to the excluded RH layer.
    """
    groups=[]
    for i,n in enumerate(notes):
        if not groups or n[0]-notes[groups[-1][0]][0]>ppqn//8:
            groups.append([])
        groups[-1].append(i)
    comp=set()
    for g in groups:
        pitches=sorted(set(notes[i][2] for i in g))
        if len(pitches)<2:continue
        candidates=[]
        for k in range(2,len(pitches)):
            low=pitches[:k]
            if pitches[k]-pitches[k-1]>=7 and low[-1]<=72:
                candidates.append(low)
        if candidates:low=max(candidates,key=len)
        elif pitches[-1]<=72 and pitches[-1]-pitches[0]<=24:low=pitches
        else:continue
        # Low melody passages and octave runs remain in the excluded layer.
        if len({p%12 for p in low})<2 or low[0]>=65:continue
        if len(low)==2 and (low[1]-low[0])%12 in (1,2,10,11):continue
        comp.update(i for i in g if notes[i][2] in low)
    return ([n for i,n in enumerate(notes) if i in comp],
            [n for i,n in enumerate(notes) if i not in comp])


def vlq(n):
    out=[n&127];n>>=7
    while n:out.insert(0,128|(n&127));n>>=7
    return bytes(out)


def write_split(path,ppqn,accomp,melody,bass,drums):
    tracks=[]
    conductor=b'\x00\xff\x51\x03\x06\x8a\x1b\x00\xff\x58\x04\x04\x02\x18\x08\x00\xff\x2f\x00'
    tracks.append(conductor)
    for name,notes,ch,program in [('Melody + RH harmony (excluded)',melody,0,0),('Accompaniment (lower chord gestures)',accomp,1,0),('Bass',bass,2,35),('Drums',drums,9,0)]:
        nb=name.encode();raw=b'\x00\xff\x03'+vlq(len(nb))+nb+b'\x00'+bytes([0xc0|ch,program]);ev=[]
        for i,(a,b,n,v) in enumerate(notes):ev.extend([(a,1,i,bytes([0x90|ch,n,v])),(b,2 if b==a else 0,i,bytes([0x80|ch,n,0]))])
        prev=0
        for at,_,_,msg in sorted(ev):raw+=vlq(at-prev)+msg;prev=at
        tracks.append(raw+b'\x00\xff\x2f\x00')
    path.write_bytes(b'MThd'+struct.pack('>IHHH',6,1,len(tracks),ppqn)+b''.join(b'MTrk'+struct.pack('>I',len(t))+t for t in tracks))


def main():
    target=pathlib.Path(sys.argv[1]);target.parent.mkdir(parents=True,exist_ok=True)
    source=pathlib.Path(__file__).resolve().parents[1]/'assets/scores/after_youve_gone_dm.mid'
    data=source.read_bytes();ppqn,tracks=read_notes(data)
    assert ppqn==384 and [len(t) for t in tracks]==[0,2428,683,1332]
    comp,melody=split_piano(tracks[1],ppqn)
    assert sorted(comp+melody)==tracks[1] and not set(comp)&set(melody)
    write_split(target.with_name('after_separated.mid'),ppqn,comp,melody,tracks[2],tracks[3])
    def quant(t):return (t*24+ppqn//2)//ppqn
    events=[]
    for notes,part in ((comp,4),(tracks[2],2),(tracks[3],0)):
        for start,end,note,velocity in notes:
            if 16*ppqn<=start<496*ppqn:
                events.append((quant(start-16*ppqn),max(1,quant(end-start)),note,velocity,part))
    events.sort(key=lambda e:(e[0],e[4],e[2]))
    harmony=[];at=0
    for root,mask,beats,scale in CHART:
        harmony.append((at,root,mask,beats*24,scale));at+=beats*24
    assert at==40*96
    forms=[];seen={};sources=[]
    for chorus in range(3):
        for ci,(start,root,mask,length,scale) in enumerate(harmony):
            absolute=chorus*3840+start;pc=(3+root)%12;base=36+pc
            nh=harmony[(ci+1)%len(harmony)];next_chord=((3+nh[1])%12,nh[2],SCALE_BANK[nh[4]])
            for part in (2,4):
                raw=[e for e in events if e[4]==part and absolute<=e[0]<absolute+length]
                tokens=[]
                for t,gate,note,velocity,_ in raw:
                    dt=t-absolute
                    resolutions=[(e[0]-t,e[2]) for e in raw if 0<e[0]-t<=24 and abs(e[2]-note)==1]
                    role,octv,alter=encode(note,base,mask,SCALE_BANK[scale],next_chord,part==2 and dt>=length-24,min(resolutions)[1] if resolutions else None)
                    tokens.append((dt,min(gate,length-dt+4,255),role,octv,alter,velocity))
                if part==2:
                    pitches=[e[2] for e in raw]
                    kind=1 if any(t[2]&16 for t in tokens) else 2 if pitches and pitches[-1]-pitches[0]>=3 else 3 if pitches and pitches[-1]-pitches[0]<=-3 else 4
                else:
                    groups=Counter((e[0]-absolute+1)//3 for e in raw);poly=max(groups.values(),default=0)
                    kind=0 if not raw else 5 if any(t[4] for t in tokens) else 3 if poly==1 else 2 if poly==2 else 1 if len(groups)<=2 else 4
                first_oct=tokens[0][3] if tokens else 0
                sig=(part,family(mask) if part==4 else -1,length,tuple(((t[0]+1)//3,(t[1]+2)//6,t[2],t[3]-(first_oct if part==2 else 0),t[4]) for t in tokens))
                f=dict(tokens=tokens,part=part,family=family(mask),kind=kind,length=length,bar=chorus*40+start//96+1,first_oct=first_oct,raw=raw,ci=ci,base=base)
                if sig not in seen:seen[sig]=len(forms);forms.append(f)
                sources.append(f)
    # Every chord must have alternatives. Transfer bass between qualities;
    # piano stays in its family. Short 2-beat chords may reuse a cropped first
    # or second half of a real 4-beat gesture if the source offers too few.
    unique_count=len(forms)
    for length in (48,):
        for f in list(forms):
            if f['length']!=96:continue
            for half in (0,48):
                tokens=[(t[0]-half,min(t[1],52-(t[0]-half)),*t[2:]) for t in f['tokens'] if half<=t[0]<half+48]
                if not tokens:continue
                nf=dict(f,tokens=tokens,length=48,first_oct=tokens[0][3])
                if sum(x['part']==f['part'] and x['length']==48 and (f['part']==2 or x['family']==f['family']) for x in forms)<4:forms.append(nf)
    flat=[];rows=[]
    for f in forms:
        rows.append((len(flat),len(f['tokens']),f['length'],f['part'],f['family'],1,f['kind'],f['first_oct'],0,f['bar']))
        flat.extend(f['tokens'])
    for _,_,mask,length,_ in harmony:
        for part in (2,4):
            assert sum(f['part']==part and f['length']==length and (part==2 or f['family']==family(mask)) for f in forms)>=2,(part,mask,length)
    max_notes=max(len(f['tokens']) for f in forms);assert max_notes<=48
    drums=[e for e in events if e[4]==0]
    text=['/* Generated by tools/gen_after_forms.py from user-supplied musical material.',
          ' * Melody/RH separated before accompaniment extraction; no original score preset.',
          ' * Source SHA256: '+hashlib.sha256(data).hexdigest()+' */','#pragma once',
          '#define AFTER_BARS 40u','#define AFTER_CHORUSES 3u','#define AFTER_TICKS (120u*96u)',
          '#define AFTER_CHORDS %du'%len(harmony),'#define AFTER_FORM_COUNT %du'%len(forms),
          '#define AFTER_FORM_MAX %du'%max_notes,'#define AFTER_DRUM_COUNT %du'%len(drums),
          'static const romance_chord_t AFTER_HARMONY[AFTER_CHORDS]={']
    text+=['    {%d,0x%03x,%d,%d,%d},'%(a,mask,root,length//24,sk) for a,root,mask,length,sk in harmony]+['};','static const romance_form_note_t AFTER_FORM_NOTES[]={']
    text+=['    {%d,%d,%d,%d,%d,%d},'%t for t in flat]+['};','static const romance_form_t AFTER_FORMS[AFTER_FORM_COUNT]={']
    text+=['    {%d,%d,%d,%d,%d,%d,%d,%d,%d,%d},'%t for t in rows]+['};','static const romance_note_t AFTER_DRUMS[AFTER_DRUM_COUNT]={']
    text+=['    {%d,%d,%d,%d,%d},'%e for e in drums]+['};','']
    target.write_text('\n'.join(text))
    names={0x891:'maj7',0x895:'maj9',0x295:'6/9',0x489:'m7',0x48d:'m9',0x491:'7',0x495:'9',0x695:'13',0x493:'7b9',0x449:'m7b5',0x249:'dim7'}
    flat_names=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']
    report=["AFTER YOU'VE GONE — РАЗБОР И ГЕНЕРАТИВНЫЙ ПРЕСЕТ",'',
      'Файл: after_youve_gone_dm.mid. Метаданные: After You\'ve Gone — in Eb; контакт автора MIDI dougmck.',
      'Формат 1, PPQN 384, 4/4, действующий темп 140 BPM (в нулевом тике также есть более ранняя запись 100 BPM).',
      'Дорожка 1: 2428 нот пианино, правая и левая рука вместе; дорожка 2: 683 ноты баса; дорожка 3: 1332 ударных.',
      'Структура по повторению гармонии: вступление 4 такта; 3 оборота по 40 тактов (файл: такты 5–124); затем концовка.',
      '', 'РАЗДЕЛЕНИЕ ПИАНИНО — ДО АНАЛИЗА ФОРМ',
      'Это разделение жестов, а не одна граница по высоте. Начала нот группируются в пределах 1/8 доли.',
      'Разрыв от 7 полутонов над нижним многоголосием отделяет правую руку; компактные нижние аккорды сохраняются.',
      'Одноголосные пассажи, чистые октавные линии, высокие блок-аккорды и их гармонизация остаются в исключённом слое.',
      '%d нот — аккомпанемент; %d — мелодия вместе с гармонизацией правой руки.'%(len(comp),len(melody)),
      'Разделение консервативное: часть неоднозначных одиночных нот левой руки исключена. Это не ручная нотная редакция.',
      'after_separated.mid содержит отдельные дорожки для проверки: Melody + RH harmony, Accompaniment, Bass, Drums.',
      '', 'ГАРМОНИЯ', 'Аккорды — аналитическая редукция по басу и нижним голосам, с обобщением надстроек.']
    for i,bar in enumerate(BARS):report.append('%2d: '%(i+1)+' / '.join(flat_names[(3+h[0])%12]+names[h[1]]+(' (%d доли)'%h[2] if h[2]<4 else '') for h in bar))
    report+=['','ФОРМЫ И ВОСПРОИЗВЕДЕНИЕ',
      '%d исходных фраз → %d различных форм + %d выделенных полуфраз = %d форм (%d бас, %d пианино). Максимум %d нот.'%(len(sources),unique_count,len(forms)-unique_count,len(forms),sum(f['part']==2 for f in forms),sum(f['part']==4 for f in forms),max_notes),
      'Бас: четверти, октавные переносы, ход по ступеням и хроматические подводки к следующему корню.',
      'Пианино: нижние аккордовые уколы, синкопы, раскатанные атаки и паузы; исходные пассажи мелодии исключены.',
      'Начала/gate округлены до 24 PPQN (ошибка до 8.93 мс при 140 BPM); velocity исходный.',
      'Сохраняются ритм, gate и velocity. Высоты кодируются функциями 1/3/5/7/9/11/13 и хроматическими соседями.',
      'Двухдольные формы при необходимости дополняются половиной реального четырёхдольного жеста.',
      'На каждом аккорде выбираются новые формы подходящей длины, у пианино также — семейства аккорда.',
      'Гармония повторяется каждые 40 тактов; три оборота исходных ударных образуют 120-тактовый цикл.',
      'В новом пресете нет воспроизведения исходной мелодии, и отдельного исходного пресета не добавляется.',
      'Все материалы музыкального файла остаются материалами пользователя; GPL программного кода не лицензирует аранжировку.','', 'КАТАЛОГ ФОРМ']
    for i,f in enumerate(forms):
        report.append('#%d: %s, %d доли, семейство %d, источник такт %d'%(i+1,'бас' if f['part']==2 else 'пианино',f['length']//24,f['family'],f['bar']))
        report.append('  '+' '.join('%.2f:%s%s(o%+d,v%d)'%(t[0]/24+1,('NEXT:' if t[2]&16 else '')+ROLE_NAMES[t[2]&15],'%+d'%t[4] if t[4] else '',t[3],t[5]) for t in f['tokens']))
    target.with_suffix('.txt').write_text('\n'.join(report)+'\n')
    print('After: split %d comp / %d RH notes; %d chords, %d forms (%d bass/%d piano), max %d, %d drums'%(len(comp),len(melody),len(harmony),len(forms),sum(f['part']==2 for f in forms),sum(f['part']==4 for f in forms),max_notes,len(drums)))

if __name__=='__main__':main()
