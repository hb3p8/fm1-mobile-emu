/* SPDX-License-Identifier: GPL-3.0-only
 * Phrase grammar derived from the user's MIDI. Data live in const tables;
 * only the current two short phrases are materialised, without allocation. */
typedef struct { uint8_t at,gate,note,velocity; } form_play_t;
#define FORM_MAX (ROMANCE_FORM_MAX>AFTER_FORM_MAX?ROMANCE_FORM_MAX:AFTER_FORM_MAX)
#define FORM_CHORDS (ROMANCE_CHORDS>AFTER_CHORDS?ROMANCE_CHORDS:AFTER_CHORDS)
static form_play_t form_play[2][FORM_MAX];
static uint8_t form_n[2],form_i[2];
static uint16_t form_previous[2],form_place[2][FORM_CHORDS];
static uint32_t form_rng;
static int form_bass_last,form_piano_center;
volatile uint16_t en_jazz_form_bass,en_jazz_form_piano;
int en_jazz_form_count(void) { return jazz_after()?AFTER_FORM_COUNT:ROMANCE_FORM_COUNT; }
static const romance_form_t *form_bank(void) {return jazz_after()?AFTER_FORMS:ROMANCE_FORMS;}
static const romance_form_note_t *form_notes(void) {return jazz_after()?AFTER_FORM_NOTES:ROMANCE_FORM_NOTES;}
const char *en_jazz_form_name(int part){unsigned id=part==PT_BASS?en_jazz_form_bass:en_jazz_form_piano;return en_jazz_forms_active() && id<(unsigned)en_jazz_form_count()?form_bank()[id].name:"";}
static void jazz_forms_seed(int seed)
{
    form_rng=lr_seed((uint32_t)seed);
}
static void jazz_forms_reset(void)
{
    int p,k;
    jazz_forms_seed(par[P_SEED]);
    if(en_jazz_forms_active()) form_rng^=rnd();
    if(!form_rng) form_rng=1;
    for(p=0;p<2;p++) {
        form_n[p]=form_i[p]=0;form_previous[p]=65535;
        for(k=0;k<(int)FORM_CHORDS;k++) form_place[p][k]=65535;
    }
    en_jazz_form_bass=en_jazz_form_piano=65535;
    form_bass_last=35;form_piano_center=65;
}
static int form_family(uint16_t mask)
{
    if((mask&0x249)==0x249) return 3;
    if(mask&8) return 1;
    return (mask&1024)?2:0;
}
static void form_roles(uint16_t mask,uint16_t scale,int *r)
{
    int family=form_family(mask);
    r[0]=0;r[1]=(mask&8)?3:4;
    r[2]=(mask&128)?7:(mask&64)?6:8;
    r[3]=(mask&2048)?11:(mask&1024)?10:family==3?9:11;
    r[4]=(scale&4)?2:1;r[5]=(scale&32)?5:6;
    r[6]=(scale&512) && family!=3?9:8;
    r[7]=family==3?11:r[1]==4 && (scale&8)?3:r[5];
}
static unsigned form_weight(unsigned id,int p,unsigned chord)
{
    const romance_form_t *f=&form_bank()[id];
    const romance_chord_t *h=&jazz_chart()[chord];
    if(f->part!=(p?PT_CHORDS:PT_BASS) || f->len!=h->beats*24) return 0;
    if(p && f->family!=form_family(h->mask)) return 0;
    if(f->feel!=en_jazz_walking || id==form_previous[p]) return 0;
    return id==form_place[p][chord]?(unsigned)((100-par[P_VARIATION])/20+1):6u;
}
static unsigned form_pick(int p,unsigned chord)
{
    unsigned id,total=0,draw,weight;
    for(id=0;id<(unsigned)en_jazz_form_count();id++) total+=form_weight(id,p,chord);
    if(!total) return 0; /* compiler validates coverage of every chord/length */
    draw=lr_next(&form_rng)%total;
    for(id=0;id<(unsigned)en_jazz_form_count();id++) {
        weight=form_weight(id,p,chord);
        if(draw<weight) return id;
        draw-=weight;
    }
    return 0;
}
static int form_decode(const romance_form_note_t *e,int base,const int *roles,int next_pc)
{
    int target=(e->role&16)?nearest(base,next_pc,base-6,base+6):base+roles[e->role&15];
    return target+12*e->oct+e->alter;
}
/* Shared by the editor regression test and the firmware planner. */
int en_form_decode(int role,int octave,int alter,int base,uint16_t mask,uint16_t scale,int next_pc){
 if(((role<0 || role>7) && role!=16) || octave< -4 || octave>5 || alter< -1 || alter>1 || base<0 || base>127 || next_pc<0 || next_pc>11)return -1;
 int r[8];form_roles(mask,scale,r);romance_form_note_t e={0,1,(uint8_t)role,(int8_t)octave,(int8_t)alter,1};return form_decode(&e,base,r,next_pc);
}
static void form_materialise(int p,unsigned id,unsigned chord)
{
    const romance_form_t *f=&form_bank()[id];
    const romance_chord_t *h=&jazz_chart()[chord];
    const romance_chord_t *next=&jazz_chart()[(chord+1)%jazz_chart_count()];
    int roles[8],pc=(h->root+par[P_ROOT])%12,next_pc=(next->root+par[P_ROOT])%12;
    int octave,best=0x7fffffff,best_base=36+pc,base,k;
    form_roles(h->mask,J_SCALE[h->scale],roles);
    /* Keep a whole phrase's contour and inversions. Move the whole form by
     * octaves to connect registers, instead of independently snapping notes. */
    for(octave=-1;octave<=1;octave++) {
        int cost=0,first=0,last=0,sum=0;
        base=36+pc+12*octave-(p?0:12*f->first_oct);
        for(k=0;k<f->n;k++) {
            const romance_form_note_t *e=&form_notes()[f->offset+k];
            int note=form_decode(e,base,roles,next_pc),lo=p?28:21,hi=p?96:55;
            if(k==0) first=note;
            last=note;sum+=note;
            if(note<lo) cost+=(lo-note)*20;
            if(note>hi) cost+=(note-hi)*20;
        }
        if(p) cost+=2*jabs((f->n?sum/f->n:65)-form_piano_center)+12*jabs(octave);
        else {
            cost+=3*jabs(first-form_bass_last)+jabs(first-36);
            cost+=jabs(nearest(last,next_pc,28,52)-last);
            if(first<28) cost+=(28-first)*10;
            if(first>48) cost+=(first-48)*10;
        }
        if(cost<best) {best=cost;best_base=base;}
    }
    form_n[p]=form_i[p]=0;
    for(k=0;k<f->n;k++) {
        const romance_form_note_t *e=&form_notes()[f->offset+k];
        int note=form_decode(e,best_base,roles,next_pc),i,duplicate=0;
        if(!p) {
            while(note<21) note+=12;
            while(note>55) note-=12;
            note+=12*par[P_BS_OCT];
        }
        while(note<21) note+=12;
        while(note>108) note-=12;
        /* Altered fifth/13th can coincide when a dominant form changes its
         * colour. Do not retrigger a unison twice in the same attack. */
        for(i=0;i<form_n[p];i++) if(form_play[p][i].note==note && form_play[p][i].at==e->at) duplicate=1;
        if(!duplicate) {
            form_play_t *v=&form_play[p][form_n[p]++];
            v->at=e->at;v->gate=e->gate;v->note=(uint8_t)note;v->velocity=e->velocity;
        }
    }
    /* A key change in mid-phrase remaps only notes still due. */
    while(form_i[p]<form_n[p] && form_play[p][form_i[p]].at<ctick) form_i[p]++;
}
static void jazz_forms_plan(unsigned chord,int fresh)
{
    int p;
    for(p=0;p<2;p++) {
        unsigned id=p?en_jazz_form_piano:en_jazz_form_bass;
        if(fresh || id>=(unsigned)en_jazz_form_count()) {
            id=form_pick(p,chord);
            form_previous[p]=form_place[p][chord]=(uint16_t)id;
            if(p) en_jazz_form_piano=(uint16_t)id;else en_jazz_form_bass=(uint16_t)id;
        }
        form_materialise(p,id,chord);
    }
}
static void jazz_forms_tick(void)
{
    int p;
    for(p=0;p<2;p++) while(form_i[p]<form_n[p] && form_play[p][form_i[p]].at<=ctick) {
        const form_play_t *e=&form_play[p][form_i[p]++];
        int part=p?PT_CHORDS:PT_BASS;
        if(!en_part_on[part] || (p?par[P_CH_RHYTHM]!=4:par[P_BS_STYLE]!=3)) continue;
        note_on(part,e->note,(float)e->velocity/127.0f,(int32_t)(tick_len*(float)e->gate),0.0f);
        if(p) form_piano_center=(form_piano_center*3+e->note)/4;
        else {form_bass_last=e->note-12*par[P_BS_OCT];en_jazz_bass_note=e->note;}
    }
}
