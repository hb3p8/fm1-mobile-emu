/* SPDX-License-Identifier: GPL-3.0-only */
/* Jazz harmony, transport, queue and audio mixing. No alternate music models. */
static uint16_t tpl_mask[EN_CYC_MAX],cur_mask=0x091;
static uint8_t tpl_bass[EN_CYC_MAX],cur_bass,chord_dirty;
static int tpl_n=3,cyc_pos,bass_note=40;
static uint32_t ticks,ctick,chord_ticks=96,stick,ext_age;
static float tick_len=1000,tick_left;
static int chn[4]={57,61,65,69};
static uint8_t present[4]={1,1,1,1},part_req[4],next_pending;
static union {en_song_t data;uint8_t upgrade[128u+8u*EN_SONG_MAX];} song_store EN_POOL;
#define song song_store.data
static uint32_t song_i;
en_song_t *en_song(void){return &song;}const int16_t *en_params(void){return par;}
static int key_root(void){return par[P_ROOT];}
int en_cycle_get(int c,int seed,int k,uint16_t *mask,uint8_t *bass){
 static const uint8_t n[7]={3,3,3,4,3,4,4};
 static const uint8_t root[7][4]={{2,7,0},{2,7,0},{2,7,0},{9,2,7,0},{2,1,0},{9,2,1,0},{3,2,1,0}};
 static const uint16_t quality[7][4]={{0x89,0x91,0x91},{0x489,0x491,0x891},{0x489,0x491,0x891},{0x491,0x489,0x491,0x891},{0x489,0x491,0x891},{0x491,0x489,0x491,0x891},{0x491,0x489,0x491,0x891}};
 (void)seed;c=(unsigned)c<10u?c:0;
 if(c>=7){const romance_chord_t *h=c==9?AFTER_HARMONY:ROMANCE_HARMONY;if(k>=0 && k<8 && mask && bass){*bass=h[k].root;*mask=rot12(h[k].mask,h[k].root);}return 8;}
 if(k>=0 && k<n[c] && mask && bass){*bass=root[c][k];*mask=rot12(quality[c][k],*bass);}return n[c];
}
static void cycle_chord(int k,uint16_t *m,uint8_t *b){k=(k%tpl_n+tpl_n)%tpl_n;*b=(uint8_t)((tpl_bass[k]+par[P_ROOT])%12);*m=rot12(tpl_mask[k],par[P_ROOT]);}
static void cycle_load(void){
 tpl_n=en_cycle_get(par[P_CYCLE],0,-1,0,0);
 for(int k=0;k<tpl_n;k++){en_cycle_get(par[P_CYCLE],0,k,&tpl_mask[k],&tpl_bass[k]);cycle_chord(k,(uint16_t*)&en_cyc_mask[k],(uint8_t*)&en_cyc_bass[k]);}
 en_cyc_n=(uint8_t)tpl_n;chord_dirty=1;
}
static void chords_voicing(int *to){
 int pcs[4],n=0;
 for(int i=0;i<12 && n<4;i++){int pc=(cur_bass+i)%12;if(cur_mask>>pc&1u)pcs[n++]=pc;}
 if(par[P_VOICING]==1){int base=nearest(60,cur_bass,55,67),k=0;for(int off=0;off<12 && k<4;off++)if(cur_mask>>((cur_bass+off)%12)&1u)to[k++]=base+off;while(k<4){to[k]=to[k-n]+12;k++;}return;}
 if(par[P_VOICING]==2){n=0;for(int i=0;i<12;i++)if(en_jazz_anchor>>i&1u)pcs[n++]=i;}
 en_voice_lead(chn,pcs,n,to,52,74);
}
static void chords_strike(float vel,int32_t gate,float att,int keep){int to[4];(void)keep;chords_voicing(to);for(int i=0;i<4;i++){chn[i]=to[i];note_on(PT_CHORDS,to[i],vel,gate,att);}}
#include "jazz.inc"
static void chord_set(uint16_t m,uint8_t b,int mid){(void)mid;cur_mask=(uint16_t)(m|(1u<<b));cur_bass=b;en_chord_mask=cur_mask;en_chord_bass=b;pedal(cur_mask);jazz_chord();}
static void parts_publish(void){for(int p=0;p<4;p++)en_part_on[p]=(uint8_t)(present[p] && par[LEVEL_PAR[p]]>0);}
static void gains_target(void){for(int p=0;p<4;p++){float l=(float)par[LEVEL_PAR[p]]*.01f;pg_t[p]=l*l*1.36f*PART_GAIN[p];}}
static void apply(int p,int v){
 if(!en_param_active(p))return;const en_param_t *info=en_param_info(p);v=v<info->lo?info->lo:v>info->hi?info->hi:v;
 if(p==P_CH_RHYTHM && v==1)v=3;
 par[p]=(int16_t)v;
 if(p==P_TEMPO)tick_len=EN_SR*60/((float)v*EN_PPQN);
 if(p==P_BEATS)chord_ticks=(uint32_t)CHORD_BEATS[v]*24u;
 if(p==P_ROOM){rev_send=(float)(v*v)*.00012f;pl_decay_t=.45f+.0045f*(float)v;rev_wet=.8f+.004f*(float)v;}
 if(p==P_BS_SOUND)part_inst[PT_BASS]=(uint8_t)(v==2?I_HYBRID_BASS:v==1?I_PIANO:I_UPRIGHT);
 if(p==P_BS_REVERB)for(int i=VB[PT_BASS];i<VB[PT_BASS+1];i++)vc[i].send=.005f*(float)v;
 if(p==P_CYCLE){cycle_load();jazz_score_reset();ctick=0;cyc_pos=0;chord_ticks=(uint32_t)CHORD_BEATS[par[P_BEATS]]*24u;}
 if(p==P_ROOT){cycle_load();chord_dirty=1;}
 if(p==P_SEED){jazz_forms_seed(v);chord_dirty=1;}
 for(int i=0;i<4;i++)if(p==LEVEL_PAR[i] && v>0)present[i]=1;
 parts_publish();gains_target();
}
const char *en_param_label(int p){return en_param_info(p)->name;}
void en_param_text(int p,int v,char *b){
 if(!en_param_active(p)){b[0]=0;return;}
 switch(p){
 case P_ROOT:put(b,en_note_name(v));return;
 case P_CYCLE:put(b,en_cycle_name(v));return;
 case P_BS_SOUND:put(b,v==2?"Rings":v==1?"Piano":"Upright");return;
 case P_BS_STYLE:put(b,v==3?(en_jazz_forms_active()?"Forms":"Score"):v==0?"Root":v==1?"Two feel":"Walking");return;
 case P_CH_RHYTHM:put(b,v==4?(en_jazz_forms_active()?"Forms":"Score"):v==0?"Hold":v==2?"16ths arp":"Syncopes");return;
 case P_VOICING:put(b,v==1?"Root stack":v==2?"Shells":"Close");return;
 case P_BEATS:put(b,en_jazz_score_active()?"From score":v==0?"2 beats":v==1?"1 bar":v==2?"2 bars":"4 bars");return;
 case P_MIDI:put(b,v?"On":"Off");return;
 default:itoa_s(v,b);return;
 }
}
static void notes_off(void){for(int p=0;p<4;p++)midi(0xb0u|(uint32_t)p,123,0);midi(0xb9,123,0);}
static void quiet(void){for(int i=0;i<NV;i++)vc[i].on=0;jazz_init();notes_off();}
static void form_restart(void){ticks=ctick=0;cyc_pos=0;tick_left=0;en_beats=en_section=en_cyc_pos=en_cyc_rep=0;en_cyc_reps=4;chord_dirty=1;cycle_load();jazz_score_reset();parts_publish();}
static void play_start(int top){if(top)form_restart();tick_left=0;en_playing=1;if(!en_ext)midi(top?0xfa:0xfb,0,0);}
static void play_stop(void){en_playing=0;for(int i=0;i<NV;i++)if(vc[i].on && vc[i].part!=PT_KEYS)voice_release(&vc[i]);if(!en_ext)midi(0xfc,0,0);notes_off();}
static void song_begin(void){
 rng=song.seed?song.seed:1;quiet();for(int p=0;p<P_NPARAMS;p++)if(p!=P_MIDI)apply(p,song.par[p]);
 stick=song_i=0;en_song_tick=0;play_start(1);
}
static void song_cmd(int what,int piece){
 if(what==EN_SONG_REC){song.magic=EN_SONG_MAGIC;song.n=song.end=0;song.seed=rnd()|1u;song.piece=(uint8_t)piece;for(int p=0;p<P_NPARAMS;p++)song.par[p]=par[p];song_begin();en_song_state=SONG_RECORDING;en_song_full=0;}
 else if(what==EN_SONG_PLAY){if(song.magic==EN_SONG_MAGIC && song.n<=EN_SONG_MAX && song.end){song_begin();en_song_state=SONG_PLAYING;}}
 else{if(en_song_state==SONG_RECORDING)song.end=stick;else if(en_song_state==SONG_PLAYING)play_stop();en_song_state=SONG_IDLE;}
}
static void exec(uint32_t c);
static void tick(void){
 if(en_song_state==SONG_PLAYING){while(song_i<song.n && song.ev[song_i][0]<=stick)exec(song.ev[song_i++][1]);if(stick>=song.end){en_song_state=SONG_IDLE;play_stop();return;}}
 int score=en_jazz_score_active();
 if(score){if(jazz_score_prepare()){if(next_pending){next_pending=0;jazz_score_reset();jazz_score_prepare();}for(int p=0;p<4;p++)if(part_req[p]){present[p]=(uint8_t)(part_req[p]-1);part_req[p]=0;}parts_publish();}}
 else if(ctick==0 || chord_dirty){
  uint16_t m;uint8_t b;cycle_chord(cyc_pos,&m,&b);chord_set(m,b,0);chord_dirty=0;en_cyc_pos=(uint8_t)cyc_pos;
  for(int p=0;p<4;p++)if(part_req[p]){present[p]=(uint8_t)(part_req[p]-1);part_req[p]=0;}parts_publish();
 }
 jazz_tick();if(!en_ext)midi(0xf8,0,0);en_beats=ticks/24u;ticks++;stick++;en_song_tick=stick;
 if(++ctick>=chord_ticks && !score){ctick=0;if(next_pending){next_pending=0;cyc_pos=0;}else if(++cyc_pos>=tpl_n){cyc_pos=0;en_cyc_rep=(uint8_t)((en_cyc_rep+1)%4);en_section++;}}
 en_chord_t=(float)ctick/(float)chord_ticks;
}
static void audition(int part,int note,int velocity){
 if(part==PT_KEYS){jazz_manual(note,velocity);return;}
 if(part!=PT_BASS && part!=PT_CHORDS)return;
 if(velocity)note_on(part,note,(float)velocity/127,-1,0);
 else for(int i=VB[part];i<VB[part+1];i++)if(vc[i].on && vc[i].note==note)voice_release(&vc[i]);
}
static void exec(uint32_t c){
 int a=(int)(c>>16&255u),b=(int)(int16_t)c;
 switch(c>>24){
 case C_SET:apply(a,b);break;
 case C_PLAY:if(a && !en_playing)play_start(1);else if(!a && en_playing){if(en_song_state==SONG_RECORDING)song.end=stick;en_song_state=SONG_IDLE;play_stop();}break;
 case C_NEXT:next_pending=1;break;
 case C_SEED:rng^=(uint32_t)(b&65535)*2654435761u;if(!rng)rng=1;break;
 case C_PANIC:quiet();break;
 case C_REGROW:cycle_load();if(en_playing)form_restart();break;
 case C_CLOCK:en_ext=1;ext_age=0;if(a==EN_CLK_TICK){if(en_playing)tick();}else if(a==EN_CLK_START)play_start(1);else if(a==EN_CLK_CONTINUE)play_start(0);else play_stop();break;
 case C_PART:if(a<4){if(en_playing)part_req[a]=(uint8_t)(b?2:1);else{present[a]=(uint8_t)(b!=0);parts_publish();}}break;
 case C_NOTE:audition((b>>8)&3,a,b&127);break;
 case C_SONG:song_cmd(a,b);break;
 }
}
static void drain(void){
 while(q_r!=q_w){uint32_t c=q[q_r++%QN],t=c>>24,a=c>>16&255u;
  if(en_song_state==SONG_RECORDING && ((t==C_SET && a!=P_MIDI)||t==C_NOTE||t==C_NEXT||t==C_SEED||t==C_PART)){
   if(song.n<EN_SONG_MAX){song.ev[song.n][0]=stick;song.ev[song.n++][1]=c;}else{song.end=stick;en_song_state=SONG_IDLE;en_song_full=1;}
  }exec(c);
 }
}
static void control(uint32_t n){
 gains_target();float k=fm_minf((float)n/1300,1),gd=fm_maxf(1-(float)n/5000,0);int nv=0;
 for(int p=0;p<4;p++){pg[p]+=(pg_t[p]-pg[p])*k;en_part_glow[p]*=gd;}
 pl_decay+=(pl_decay_t-pl_decay)*.002f;pl_dd2=fm_clampf(pl_decay+.15f,.25f,.5f);
 for(int i=0;i<NV;i++)nv+=vc[i].on;en_voices=(uint8_t)nv;
}
static void render_chunk(int32_t *out,uint32_t n,float gain){
 for(uint32_t j=0;j<n;j++){mixl[j]=mixr[j]=rsend[j]=0;nzb[j]=(float)(int32_t)nrnd()/2147483648.0f;}
 for(int i=0;i<NV;i++){voice_t *v=&vc[i];if(!v->on)continue;
  if(v->inst==I_HYBRID_BASS){int slot=i-VB[PT_BASS];float g=pg[v->part];upright_render(slot,vbuf,n,v->stage==ST_REL);
   for(uint32_t j=0;j<n;j++){float x=vbuf[j]*g;mixl[j]+=x*v->gl;mixr[j]+=x*v->gr;rsend[j]+=x*v->send;}
   v->lvl=upright_level(slot);gate_step(v,n);if(!upright_active(slot)){voice_midi_off(v);v->on=0;}
  }else modal_render(v,0,n);
 }
 jazz_render(n);
 for(uint32_t j=0;j<n;j++){float wl,wr;reverb(rsend[j]*rev_send,&wl,&wr);out[2*j]=(int32_t)(fm_tanhf((mixl[j]+rev_wet*wl)*gain)*8300000);out[2*j+1]=(int32_t)(fm_tanhf((mixr[j]+rev_wet*wr)*gain)*8300000);}
}
void en_render(int32_t *out,uint32_t n,uint32_t gain_q12){
 float gain=(float)gain_q12/2048;drain();
 if(en_ext && ++ext_age>100u)en_ext=0;
 while(n){uint32_t k=n>BLK?BLK:n;int timed=en_playing && !en_ext;if(timed){if(tick_left<=0){tick();tick_left+=tick_len;}if((float)k>tick_left)k=(uint32_t)tick_left+1u;}if(k>n)k=n;if(timed)tick_left-=(float)k;control(k);render_chunk(out,k,gain);out+=2*k;n-=k;}
}
void en_init(void){
 for(int p=0;p<P_NPARAMS;p++)par[p]=en_param_info(p)->def;
 plate_init();upright_init();for(int i=0;i<NV;i++)vc[i].on=0;
 for(int p=0;p<4;p++){part_inst[p]=I_PIANO;present[p]=1;part_req[p]=0;en_notes[p]=0;en_part_glow[p]=0;}
 rng=0x9e3779b9u;nrng=0x2545f491u;vage=guard=0;guard_avg_q8=guard_calm=en_guard_count=0;en_guarding=0;
 damp_k=fm_expf(-6.9078f/(.18f*EN_SR));fade_k=fm_expf(-6.9078f/(.06f*EN_SR));dry_k=fm_expf(-6.9078f/(.25f*EN_SR));
 q_w=q_r=ticks=ctick=stick=ext_age=0;en_ext=en_playing=en_song_state=en_song_full=0;en_song_tick=0;song.magic=song.n=song_i=0;next_pending=0;
 jazz_init();for(int p=0;p<P_NPARAMS;p++)if(en_param_active(p))apply(p,par[p]);form_restart();for(int p=0;p<4;p++)pg[p]=pg_t[p];
}
