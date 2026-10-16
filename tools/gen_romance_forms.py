#!/usr/bin/env python3
"""Extract reusable chord-relative forms, not randomly reordered MIDI pitches."""
from collections import Counter

SCALES = [0xAB5,0x6AD,0x6B5,0x6D5,0x5B3,0xB6D,0x55B,0x5AD,0x5AB]
ROLE_NAMES = ['1','3','5','7','9','11','13','colour']
FAMILY_NAMES = ['major','minor','dominant','diminished']
BASS_NAMES = ['Root + fifth','Approach next','Ascending line','Descending line','Turn / arch']
PIANO_NAMES = ['Rest','Chord punctuation','Two-note reply','Single-note reply','Chord + fill','Chromatic turn']
NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']


def family(mask):
    if mask & 0x249 == 0x249:
        return 3
    if mask & 8:
        return 1
    return 2 if mask & 1024 else 0


def roles(mask, scale):
    """Root, quality-aware 3/5/7, then contextual 9/11/13 and extra colour."""
    third = 3 if mask & 8 else 4
    fifth = 7 if mask & 128 else 6 if mask & 64 else 8
    seventh = 11 if mask & 2048 else 10 if mask & 1024 else 9 if family(mask) == 3 else 11
    ninth = 2 if scale & 4 else 1
    eleventh = 5 if scale & 32 else 6
    thirteenth = 9 if scale & 512 and family(mask) != 3 else 8
    extra = 11 if family(mask) == 3 else 3 if third == 4 and scale & 8 else eleventh
    return [0,third,fifth,seventh,ninth,eleventh,thirteenth,extra]


def near_root(base, pc):
    return base + ((pc - base + 6) % 12 - 6)


def encode(note, base, mask, scale, next_chord, closing=False, resolution=None):
    intervals = roles(mask, scale)
    # A late bass semitone/anticipation is addressed to the next root. Its
    # destination is recalculated at playback, not shifted as a literal note.
    if closing:
        target = near_root(note, next_chord[0])
        if abs(note - target) <= 1:
            next_base = near_root(base, next_chord[0])
            return (16, (target-next_base)//12, note-target)
    choices = []
    for role, iv in enumerate(intervals):
        target = near_root(note, base+iv)
        alter = note-target
        if abs(alter) <= 1:
            # Exact chord/scale roles first; recognise semitone resolutions
            # before an arbitrary equally close chromatic neighbour.
            priority = abs(alter)*10 + (0 if target == resolution else 2) + role/10
            choices.append((priority, role, (target-base-iv)//12, alter))
    assert choices
    _, role, octv, alter = min(choices)
    assert base + intervals[role] + 12*octv + alter == note
    return role, octv, alter


def write_forms(events, chart, target):
    harmony, at = [], 0
    for root, mask, beats, scale in chart:
        harmony.append((at, root, mask, beats*24, scale))
        at += beats*24
    forms, seen, sources = [], {}, []
    role_counts, chromatic, next_targets = Counter(), 0, 0
    for chorus in range(4):
        for ci, (start, root, mask, length, sk) in enumerate(harmony):
            absolute = chorus*3072+start
            pc, base = (11+root)%12, 36+(11+root)%12
            nh = harmony[(ci+1)%len(harmony)]
            next_chord = ((11+nh[1])%12,nh[2],SCALES[nh[4]])
            feel = int(absolute//(96*16)%4 == 2)
            for part in (2,4):
                raw = [e for e in events if e[4] == part and absolute <= e[0] < absolute+length]
                tokens = []
                for at, gate, note, velocity, _ in raw:
                    dt = at-absolute
                    resolutions = [(e[0]-at,e[2]) for e in raw if 0 < e[0]-at <= 24 and abs(e[2]-note) == 1]
                    resolution = min(resolutions)[1] if resolutions else None
                    role, octv, alter = encode(note,base,mask,SCALES[sk],next_chord,
                                               part == 2 and dt >= length-24,resolution)
                    tokens.append((dt,min(gate,length-dt+4,255),role,octv,alter,velocity))
                    role_counts[ROLE_NAMES[role & 15]] += 1
                    chromatic += alter != 0
                    next_targets += bool(role & 16)
                if part == 2:
                    pitches = [e[2] for e in raw]
                    kind = 1 if any(t[2]&16 for t in tokens) else 0 if not feel else 2 if pitches[-1]-pitches[0] >= 3 else 3 if pitches[-1]-pitches[0] <= -3 else 4
                else:
                    groups = Counter((e[0]-absolute+1)//3 for e in raw)
                    poly = max(groups.values(),default=0)
                    kind = 0 if not raw else 5 if any(t[4] for t in tokens) else 3 if poly == 1 else 2 if poly == 2 else 1 if len(groups) <= 2 else 4
                # Collapse small timing/gate/velocity variations, retaining a
                # real performed representative of each contour/rhythm.
                first_oct = tokens[0][3] if tokens else 0
                signature = (part,family(mask) if part==4 else -1,length,feel,
                             tuple(((t[0]+1)//3,(t[1]+2)//6,t[2],t[3]-(first_oct if part==2 else 0),t[4]) for t in tokens))
                bar = chorus*32+start//96+1
                source = {'part':part,'bar':bar,'beat':start%96/24+1,'chord_pc':pc,
                          'mask':mask,'notes':raw,'tokens':tokens,'family':family(mask),
                          'feel':feel,'kind':kind,'len':length,'base':base}
                if signature not in seen:
                    seen[signature] = len(forms)
                    forms.append(source)
                source['id'] = seen[signature]
                sources.append(source)
    flat, rows = [], []
    for f in forms:
        offset = len(flat)
        flat.extend(f['tokens'])
        first_oct = f['tokens'][0][3] if f['tokens'] else 0
        center = round(sum(e[2]-f['base'] for e in f['notes'])/len(f['notes'])) if f['notes'] else 24
        rows.append((offset,len(f['tokens']),f['len'],f['part'],f['family'],f['feel'],f['kind'],first_oct,center,f['bar']))
    max_notes = max(len(f['tokens']) for f in forms)
    assert max_notes <= 48
    for _, _, mask, length, _ in harmony:
        for part in (2,4):
            for feel in (0,1):
                assert sum(f['part']==part and f['len']==length and f['feel']==feel and
                           (part==2 or f['family']==family(mask)) for f in forms) >= 2
    text = ['/* Generated from the user-supplied Mel Webb MIDI; musical data is not GPL.',
            ' * See assets/scores/README.txt and tools/gen_romance_forms.py. */','#pragma once',
            '#define ROMANCE_FORM_COUNT %du' % len(forms),
            '#define ROMANCE_BASS_FORMS %du' % sum(f['part']==2 for f in forms),
            '#define ROMANCE_PIANO_FORMS %du' % sum(f['part']==4 for f in forms),
            '#define ROMANCE_FORM_MAX %d' % max_notes,
            'typedef struct { uint8_t at,gate,role; int8_t oct,alter; uint8_t velocity; } romance_form_note_t;',
            'typedef struct { uint16_t offset; uint8_t n,len,part,family,feel,kind; int8_t first_oct,center; uint8_t source_bar; } romance_form_t;',
            'static const romance_form_note_t ROMANCE_FORM_NOTES[] = {']
    text += ['    {%d,%d,%d,%d,%d,%d},' % t for t in flat]
    text += ['};','static const romance_form_t ROMANCE_FORMS[ROMANCE_FORM_COUNT] = {']
    text += ['    {%d,%d,%d,%d,%d,%d,%d,%d,%d,%d},' % row for row in rows]
    text += ['};','']
    target.write_text('\n'.join(text))
    report = ['FINE ROMANCE — РАЗБОР ФРАЗ ДЛЯ ПРЕСЕТА FORMS','',
              'Источник: a_fine_romance_mw.mid, MIDI-аранжировка Mel Webb.',
              'Бас — дорожка 6; аккомпанирующее пианино — дорожка 7.',
              'Границы фразы: один аккорд, 2 или 4 доли. Анализируется весь 128-тактовый дубль.',
              'Нумерация тактов начинается со вступления баса (без двух начальных тактов файла).','',
              'АНАТОМИЯ',
              'Бас: 1 и 5 задают опору; 3/7 уточняют качество аккорда; 9/11/13 образуют',
              'ступенное движение. Последняя нота часто подводит к тонике следующего аккорда',
              'на полтона сверху/снизу либо заранее играет её. Октавные жесты сохраняются.',
              'Пианино: аккордовые уколы, одно-/двухголосные ответы,',
              'сочетание аккорда с заполнением и хроматические соседние ноты с разрешением.',
              'Ритм, длительности и динамика принадлежат форме, высоты — функции в аккорде.','',
              'В каталоге октавная опора — корень в диапазоне C2–B2; o−1 означает октаву',
              'ниже этой опоры. При воспроизведении регистр подбирается к предыдущей фразе.','',
              'КАК РАБОТАЕТ НОВЫЙ ПРЕСЕТ',
              'Гармония, её длительности, ударные и участки two-feel/walking сохранены.',
              'На каждом аккорде независимо выбираются басовая и фортепианная формы.',
              'Длина и feel должны совпасть; пианино также выбирается по семейству аккорда.',
              'Басовые ступени можно переносить между качествами аккордов: 3/5/7 меняются',
              'по текущему аккорду, 9/11/13 — по его гамме. Хроматический подход к следующей',
              'тонике вычисляется заново. У пианино учитываются регистр и плавность переходов.',
              'Соседние повторы формы запрещены, форма прошлого оборота на том же месте',
              'получает меньший вес. Очередной оборот выбирает новые формы.','',
              'СТАТИСТИКА',
              '%d исходных фраз → %d форм (%d бас, %d пианино).' % (len(sources),len(forms),sum(f['part']==2 for f in forms),sum(f['part']==4 for f in forms)),
              'Нот в формах максимум: %d. Хроматических токенов до дедупликации: %d; адресованных следующему аккорду: %d.' % (max_notes,chromatic,next_targets),'']
    for part, names in ((2,BASS_NAMES),(4,PIANO_NAMES)):
        report.append('БАС' if part==2 else 'ПИАНИНО')
        for kind, name in enumerate(names):
            subset = [f for f in forms if f['part']==part and f['kind']==kind]
            report.append('  %s: %d форм' % (name,len(subset)))
            if subset:
                f = subset[0]
                def fmt(t):
                    role = ('NEXT:' if t[2]&16 else '')+ROLE_NAMES[t[2]&15]
                    if t[4]: role += '%+d' % t[4]
                    return '%.2f:%s(o%+d)' % (t[0]/24+1,role,t[3])
                pitches=' '.join(NOTE_NAMES[e[2]%12]+str(e[2]//12-1) for e in f['notes'])
                report.append('    Пример #%d: такт %d, доля %.1f, корень %s, %s, %s' % (forms.index(f),f['bar'],f['beat'],NOTE_NAMES[f['chord_pc']],FAMILY_NAMES[f['family']],'walking' if f['feel'] else 'two-feel'))
                report.append('    Ноты: '+pitches)
                report.append('    Функции (доля:ступень, o = октава относительно корня): '+' '.join(fmt(t) for t in f['tokens']))
        report.append('')
    report += ['Система тонов: 1,3,5,7 — функции аккорда; 9,11,13 — контекстная гамма.',
               'Для diminished/altered добавлен восьмой цветовой тон. ±1 — хроматический',
               'сосед выбранной функции. NEXT:1±1 — полутоновый подход к следующему корню.',
               'Все формы получены из MIDI; это автоматический структурный разбор,',
               'а не авторская нотная разметка каждого голоса.','']
    report += ['КАТАЛОГ ВСЕХ ФОРМ (номера на веб-панели начинаются с 1)','']
    for i,f in enumerate(forms):
        label = BASS_NAMES[f['kind']] if f['part']==2 else PIANO_NAMES[f['kind']]
        report.append('#%d / %d: %s, %s, %d доли, %s; источник: такт %d, доля %.1f' %
                      (i,i+1,'бас' if f['part']==2 else 'пианино',label,f['len']//24,'walking' if f['feel'] else 'two-feel',f['bar'],f['beat']))
        report.append('  '+' '.join(fmt(t) for t in f['tokens']))
    report.append('')
    target.with_suffix('.txt').write_text('\n'.join(report))
    print('forms: %d source phrases -> %d forms (%d bass / %d piano), max %d notes' % (len(sources),len(forms),sum(f['part']==2 for f in forms),sum(f['part']==4 for f in forms),max_notes))
