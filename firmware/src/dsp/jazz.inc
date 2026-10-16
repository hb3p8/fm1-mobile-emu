/* SPDX-License-Identifier: GPL-3.0-only
 * Jazz Box orchestration. Included by min.c so native and WASM share the same
 * voices, sample clock, command queue and MIDI recorder. X0X's 909 is linked
 * separately, unchanged. All generation happens on the 24 PPQN grid. */
static drum909_t jazz_kit;
static float jd_l[BLK], jd_r[BLK], jd_rev[BLK], jd_dly[BLK];
static int16_t jazz_manual_voice[128];
static uint8_t jazz_held_note[128];
static int jazz_bass[4];
volatile uint16_t en_jazz_scale, en_jazz_anchor;
volatile uint8_t en_jazz_bass_note;
volatile uint8_t en_jazz_bar, en_jazz_chorus, en_jazz_walking;
static uint32_t romance_origin, romance_last=0xffffffffu;
static unsigned romance_i, romance_at;
static int romance_kind;
static int jazz_scale_kind;
static const char *const J_SCALE_NAMES[10]={"Ionian","Dorian","Mixolydian","Lydian b7","Phryg dom","Diminished","Altered","Aeolian","Phrygian","Locrian nat2"};
static const uint16_t J_SCALE[10]={0xAB5,0x6AD,0x6B5,0x6D5,0x5B3,0xB6D,0x55B,0x5AD,0x5AB,0x56D};
/* Masks above: Ionian 0,2,4,5,7,9,11; Dorian 0,2,3,5,7,9,10;
 * Mixolydian 0,2,4,5,7,9,10; Lydian dominant 0,2,4,6,7,9,10;
 * Phrygian dominant 0,1,4,5,7,8,10. */
static int jazz_kind(uint16_t mask,int bass,int key)
{
    uint16_t rel=rot12(mask,-bass); int off=(bass-key+12)%12;
    if((rel&0x249)==0x249) return 5;
    if((rel&0x511)==0x511) return 6;
    if((rel&0x408)==0x408) return 1;
    if((rel&0x410)==0x410) return off==1||off==3?3:off==9?4:2;
    return (rel&8)?1:0;
}
uint16_t en_jazz_scale_for(uint16_t mask,int bass,int key,uint16_t *anchors)
{
    uint16_t rel=rot12(mask,-bass), a=0; int kind=jazz_kind(mask,bass,key);
    if(rel&8) a|=8; else if(rel&16) a|=16;
    if(rel&1024) a|=1024; else if(rel&2048) a|=2048; else if(rel&512) a|=512; else if(rel&128) a|=128;
    if(anchors) *anchors=rot12(a,bass);
    return rot12(J_SCALE[kind],bass);
}
const char *en_jazz_scale_name(void) { return J_SCALE_NAMES[jazz_scale_kind]; }
int en_jazz_forms_active(void) { return (par[P_CYCLE]==EN_CYC_ROMANCE_FORMS || par[P_CYCLE]==EN_CYC_AFTER_FORMS); }
int en_jazz_score_active(void) { return (par[P_CYCLE]==EN_CYC_ROMANCE || par[P_CYCLE]==EN_CYC_ROMANCE_FORMS || par[P_CYCLE]==EN_CYC_AFTER_FORMS); }
static int jazz_after(void) {return par[P_CYCLE]==EN_CYC_AFTER_FORMS;}
static const romance_chord_t *jazz_chart(void) {return jazz_after()?AFTER_HARMONY:ROMANCE_HARMONY;}
static unsigned jazz_chart_count(void) {return jazz_after()?AFTER_CHORDS:ROMANCE_CHORDS;}
static unsigned jazz_chart_bars(void) {return jazz_after()?AFTER_BARS:32u;}
static unsigned jazz_chart_choruses(void) {return jazz_after()?AFTER_CHORUSES:4u;}
static void jazz_forms_reset(void);
static void jazz_score_reset(void)
{
    romance_origin=ticks; romance_last=0xffffffffu; romance_i=romance_at=0;
    en_jazz_bar=en_jazz_chorus=1; en_jazz_walking=0;
    jazz_forms_reset();
}
static void jazz_init(void)
{
    int i; drum909_init(&jazz_kit);
    /* Short, restrained cymbals and little distortion: a small-room jazz kit. */
    for(i=0;i<drum909_nparams(DR_RD);i++) {
        const x0x_param_t *p=drum909_param(DR_RD,i);
        if(p->name[0]=='D' && p->name[1]=='e') drum909_set(&jazz_kit,DR_RD,i,40);
    }
    for(i=0;i<128;i++) { jazz_manual_voice[i]=-1; jazz_held_note[i]=0; }
    en_jazz_scale=en_jazz_anchor=0; en_jazz_bass_note=0;
    jazz_score_reset();
}
static void jazz_manual(int note,int velocity){
 int idx;if(note<21 || note>108)return;idx=jazz_manual_voice[note];
 if(!velocity){jazz_held_note[note]=0;if(idx>=0 && vc[idx].on && vc[idx].part==PT_KEYS && vc[idx].note==note)voice_release(&vc[idx]);jazz_manual_voice[note]=-1;}
 else if(!jazz_held_note[note]){jazz_held_note[note]=1;voice_t *v=note_on(PT_KEYS,note,(float)velocity/127,-1,0);jazz_manual_voice[note]=(int16_t)(v?v-vc:-1);}
}
static int jabs(int x) { return x<0?-x:x; }
static int jmove(int a,int b) { int d=jabs(a-b); return d+(d>5?(d-5)*2:0)+(a==b?9:0); }
static void jazz_plan_bass(void)
{
    uint16_t next_m; uint8_t next_b; int root=nearest(bass_note,cur_bass,35,51),target,b,c,d,best=10000;
    cycle_chord((cyc_pos+1)%tpl_n,&next_m,&next_b);
    if(ctick+96u<chord_ticks) next_b=cur_bass;
    target=nearest(root,next_b,35,53); jazz_bass[0]=root;
    for(b=35;b<=55;b++) if(en_jazz_scale>>(b%12)&1u)
    for(c=35;c<=55;c++) if(cur_mask>>(c%12)&1u)
    for(d=target-1;d<=target+1;d+=2) {
        int cost=jmove(root,b)+jmove(b,c)+jmove(c,d)+jmove(d,target)+(c==root?6:0);
        if(cost<best) { best=cost; jazz_bass[1]=b; jazz_bass[2]=c; jazz_bass[3]=d; }
    }
    bass_note=root;
}
static void jazz_chord(void)
{
    jazz_scale_kind=en_jazz_score_active()?romance_kind:jazz_kind(cur_mask,cur_bass,key_root());
    en_jazz_scale=rot12(J_SCALE[jazz_scale_kind],cur_bass);
    { uint16_t a; en_jazz_scale_for(cur_mask,cur_bass,key_root(),&a); en_jazz_anchor=a; }
    if(!en_jazz_score_active() || par[P_BS_STYLE]!=3) jazz_plan_bass();
}
static void jazz_hit(int voice,int gm,float vel)
{
    if(!en_part_on[PT_DRUMS]) return;
    drum909_trigger(&jazz_kit,voice,vel); en_part_glow[PT_DRUMS]=1.0f; en_notes[PT_DRUMS]++;
    midi(0x99u,(uint32_t)gm,(uint32_t)(vel*(en_jazz_score_active()?127.0f:100.0f)+(en_jazz_score_active()?.5f:0.0f)));
}
static void jazz_drum(int voice,float vel)
{
    jazz_hit(voice,voice==DR_BD?36:voice==DR_SD?38:voice==DR_CH?42:51,vel);
}
#include "romance_forms.inc"
/* Score harmony has its own 32-bar chart and 2/4-beat chord lengths. The
 * ordinary eight-chord library and saved learned cycles remain unchanged.
 * The screen displays the current eight-event window of the full chart. */
static void chord_set(uint16_t m,uint8_t b,int mid);
static int jazz_score_prepare(void)
{
    unsigned bars=jazz_chart_bars(),count=jazz_chart_count();
    unsigned at=(ticks-romance_origin)%(jazz_after()?AFTER_TICKS:ROMANCE_TICKS),local=at%(bars*96u),k=0,start,n,i;
    const romance_chord_t *chart=jazz_chart();
    const romance_chord_t *h;
    while(k+1<count && chart[k+1].at<=local) k++;
    h=&chart[k];
    if(at<romance_last) romance_i=0;
    romance_last=romance_at=at;
    en_jazz_bar=(uint8_t)(local/96u+1u); en_jazz_chorus=(uint8_t)(at/(bars*96u)+1u);
    en_jazz_walking=(uint8_t)(jazz_after()?1u:at/(96u*16u)%4u==2u);
    ctick=local-h->at; chord_ticks=(uint32_t)h->beats*24u;
    if(ctick!=0u && !chord_dirty) return 0;
    chord_dirty=0; romance_kind=h->scale;
    chord_set(rot12(h->mask,h->root+par[P_ROOT]),(uint8_t)((h->root+par[P_ROOT])%12),0);
    if(en_jazz_forms_active()) jazz_forms_plan(k,ctick==0u);
    start=k/EN_CYC_MAX*EN_CYC_MAX; n=count-start;
    if(n>EN_CYC_MAX) n=EN_CYC_MAX;
    for(i=0;i<n;i++) {
        const romance_chord_t *v=&chart[start+i];
        en_cyc_mask[i]=rot12(v->mask,v->root+par[P_ROOT]);
        en_cyc_bass[i]=(uint8_t)((v->root+par[P_ROOT])%12);
    }
    en_cyc_n=(uint8_t)n; en_cyc_pos=(uint8_t)(k-start);
    en_cyc_rep=en_jazz_chorus-1; en_cyc_reps=(uint8_t)jazz_chart_choruses();
    return 1;
}
static void jazz_score_tick(void)
{
    int transpose=(par[P_ROOT]+1)%12;
    unsigned count=jazz_after()?AFTER_DRUM_COUNT:ROMANCE_COUNT;
    const romance_note_t *notes=jazz_after()?AFTER_DRUMS:ROMANCE_NOTES;
    if(transpose>6) transpose-=12;
    while(romance_i<count && notes[romance_i].at<=romance_at) {
        const romance_note_t *e=&notes[romance_i++];
        int part=e->part,note=e->note;
        if(!en_part_on[part]) continue;
        if(part==PT_DRUMS) {
            int voice;
            switch(note) {
            case 35: case 36: voice=DR_BD; break; case 37: voice=DR_RS; break;
            case 38: case 40: voice=DR_SD; break; case 42: case 44: voice=DR_CH; break;
            case 46: voice=DR_OH; break; case 49: case 57: voice=DR_CR; break;
            case 41: voice=DR_LT; break; case 50: voice=DR_HT; break;
            default: voice=DR_RD; break;
            }
            jazz_hit(voice,note,(float)e->velocity/127.0f);
        } else {
            if(en_jazz_forms_active()) continue;
            if(part==PT_CHORDS && par[P_CH_RHYTHM]!=4) continue;
            if(part==PT_BASS && par[P_BS_STYLE]!=3) continue;
            note+=transpose+(part==PT_BASS?12*par[P_BS_OCT]:0);
            /* Retain the pitch class when transposition reaches below the
             * engine's lowest note, rather than dropping a bass pickup. */
            while(note<21) note+=12;
            while(note>108) note-=12;
            note_on(part,note,(float)e->velocity/127.0f,(int32_t)(tick_len*(float)e->gate),0.0f);
            if(part==PT_BASS) en_jazz_bass_note=(uint8_t)note;
        }
    }
}
static void jazz_tick(void)
{
    const int swing=12+(par[P_SWING]*6+50)/100;
    const int score=en_jazz_score_active();
    int beat=(int)(ticks%96u),bar=(int)(ticks/96u),qbeat=(int)(ctick/24u)%4,off=(int)(ticks%24u),i;
    static const uint8_t comp[4][4]={{0,1,2,3},{1,2,3,255},{0,1,3,255},{0,1,2,3}};
    static const uint8_t late[4][4]={{0,1,1,1},{1,0,1,0},{0,1,0,0},{1,1,1,1}};
    if(score) jazz_score_tick();
    if(en_jazz_forms_active()) jazz_forms_tick();
    if(off==0) {
        if(!score) {
            jazz_drum(DR_RD,(ticks/24u)%2u?0.52f:0.38f);
            jazz_drum(DR_BD,0.13f);
            if((ticks/24u)%2u) jazz_drum(DR_CH,0.42f);
        }
        if(en_part_on[PT_BASS] && (!score || par[P_BS_STYLE]!=3)) {
            int n;
            if(qbeat==0) jazz_plan_bass();
            n=jazz_bass[ctick+24u>=chord_ticks?3:qbeat]+12*par[P_BS_OCT];
            if(par[P_BS_STYLE]==0) n=jazz_bass[0]+12*par[P_BS_OCT];
            if(par[P_BS_STYLE]!=0 || ctick==0) {
                if(par[P_BS_STYLE]!=1 || qbeat%2==0) {
                    static const float touch[4]={.86f,.76f,.82f,.69f};
                    note_on(PT_BASS,n,touch[qbeat]+.025f*frand(),(int32_t)(tick_len*(par[P_BS_STYLE]==0?(float)chord_ticks:par[P_BS_STYLE]==1?44.0f:21.0f)),0.0f);
                    en_jazz_bass_note=(uint8_t)n;
                }
            }
        }
    }
    if(!score && ((beat==24+swing)||(beat==72+swing))) jazz_drum(DR_RD,0.28f);
    if(!score && beat==((bar&1)?swing:48+swing)) jazz_drum(DR_SD,0.18f);
    if(en_part_on[PT_CHORDS] && (!score || par[P_CH_RHYTHM]!=4)) {
        if(par[P_CH_RHYTHM]==0) { if(ctick==0) chords_strike(.75f,(int32_t)(tick_len*(float)chord_ticks*.95f),0,0); }
        else if(par[P_CH_RHYTHM]==2) {
            /* One piano attack per sixteenth, rather than four at once.
             * The modal piano's velocity curve and ringing decay are retained. */
            static const uint8_t figure[6]={0,1,2,3,2,1};
            if(ticks%6u==0u) {
                int tones[4]; float vel=(off==0?.95f:.74f)+.06f*frand();
                chords_voicing(tones);
                for(i=0;i<4;i++) chn[i]=tones[i];
                note_on(PT_CHORDS,tones[figure[(ctick/6u)%6u]],vel,(int32_t)(tick_len*6.0f),0.0f);
            }
        }
        else for(i=0;i<4;i++) if(comp[bar%4][i]!=255 && beat==comp[bar%4][i]*24+late[bar%4][i]*swing)
            chords_strike(i%2?.58f:.75f,(int32_t)(tick_len*(i==3?6.0f:14.0f)),0,0);
    }
}
static void jazz_render(uint32_t n)
{
    uint32_t i; float g=pg[PT_DRUMS]*0.25f;
    if(!drum909_active(&jazz_kit)) return;
    for(i=0;i<n;i++) jd_l[i]=jd_r[i]=jd_rev[i]=jd_dly[i]=0;
    drum909_render_st(&jazz_kit,jd_l,jd_r,jd_rev,jd_dly,(int)n);
    for(i=0;i<n;i++) { mixl[i]+=jd_l[i]*g; mixr[i]+=jd_r[i]*g; }
}
