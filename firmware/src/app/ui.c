/* SPDX-License-Identifier: GPL-3.0-only */
/* Jazz Box controls. Original screen bands, lane positions and four knobs
 * stay in place; retired settings/pages/buttons have no behaviour. */
#include "../dsp/fastmath.h"
#define K_BG RGB(22,27,21)
#define K_PANEL RGB(33,40,29)
#define K_LINE RGB(60,74,49)
#define K_DIM RGB(149,165,130)
#define K_TEXT RGB(233,237,217)
#define K_ACC RGB(206,237,125)
#define K_YOURS RGB(233,168,211)
static const uint16_t PART_COL[4]={RGB(190,220,134),RGB(235,170,216),RGB(145,186,160),RGB(165,201,113)};
static const uint16_t PART_TINT[4]={RGB(51,65,37),RGB(69,45,61),RGB(37,60,48),RGB(45,61,32)};
enum {V_FORM,V_DRUMS,V_KEYS,V_BASS,V_PIANO,V_SETUP,V_SYSTEM,V_BASS_TONE,V_BASS_FX,NVIEWS};
enum {K_LEDS=100,K_CPU,K_NONE};
enum {MODE_LIVE,MODE_SONGS};
static const char *const VIEW_NAME[NVIEWS]={"Form","Drums","Keys","Bass","Piano","Setup","System","Bass tone","Bass FX"};
static const uint8_t VIEW_BTN[NVIEWS]={B_HOME,B_ENV,B_ARP,B_LFO,B_FX,B_GLO,B_GLO,B_LFO,B_LFO};
static const uint8_t PART_BTN[4]={B_ENV,B_ARP,B_LFO,B_FX};
static const uint8_t PART_LEVEL[4]={P_DR_LEVEL,P_KEYS_LEVEL,P_BS_LEVEL,P_CH_LEVEL};
static const uint8_t VIEW_KNOB[NVIEWS][4]={
 {P_VARIATION,K_NONE,P_SWING,P_BEATS},{P_DR_LEVEL,K_NONE,K_NONE,K_NONE},
 {P_KEYS_LEVEL,K_NONE,K_NONE,K_NONE},{P_BS_LEVEL,P_BS_SOUND,P_BS_STYLE,P_BS_OCT},
 {P_CH_LEVEL,P_VOICING,P_CH_RHYTHM,P_ROOM},{P_TEMPO,P_ROOT,K_NONE,K_NONE},
 {K_NONE,P_MIDI,K_LEDS,K_CPU},{P_BS_PLUCK,P_BS_WOOD,P_BS_DECAY,P_BS_DAMP},
 {P_BS_REVERB,K_NONE,K_NONE,K_NONE}
};
static const char *const KNOB_LABEL[NVIEWS][4]={{"Variation","","Swing","Chord"},{"Drums","","",""},{"Keys","","",""},{"Bass","Sound","Style","Octave"},{"Piano","Voicing","Rhythm","Room"},{"Tempo","Root","",""},{"","MIDI out","Lights","CPU"},{"Pluck","Wood","Decay","Damping"},{"Reverb","","",""}};
static struct {
 uint8_t view,mode,dirty,reset_done,rec_slot,song_was,song_dirty;
 int8_t touched,blob_slot;
 uint32_t btn,keys,used,down_t[NB],act_t,touch_until,msg_until,frame,sig[3],midi[16][4];
 uint8_t held[128],velocity[128];
 int16_t undo_seed;uint8_t undo_n;
 char msg[2][24];
} ui;
static int song_playing(void){return en_song_state==SONG_PLAYING;}
static int view_knob(int view,int i){
 int k=VIEW_KNOB[view][i];
 if(k==P_VARIATION && !en_jazz_forms_active())return K_NONE;
 if((k==P_SWING || k==P_BEATS) && en_jazz_score_active())return K_NONE;
 if(view==V_BASS_TONE && proj.par[P_BS_SOUND]!=2)return K_NONE;
 return k;
}
static void say(const char *a,const char *b){snprintf(ui.msg[0],sizeof ui.msg[0],"%s",a?a:"");snprintf(ui.msg[1],sizeof ui.msg[1],"%s",b?b:"");ui.msg_until=plat_ms()+1300u;}
void ui_say(const char *a,const char *b){say(a,b);}int ui_dirty(void){return ui.dirty!=0;}
static int knob_get(int k){return k<P_NPARAMS?(song_playing()?en_params()[k]:proj.par[k]):k==K_LEDS?proj.leds:k==K_CPU?(int)plat_cpu_pct():0;}
static void knob_range(int k,int *lo,int *hi){if(k<P_NPARAMS){const en_param_t *p=en_param_info(k);*lo=p->lo;*hi=p->hi;if(k==P_BS_STYLE && !en_jazz_score_active())*hi=2;}else{*lo=0;*hi=k==K_LEDS?2:k==K_CPU?100:0;}}
static void knob_text(int k,char *b){if(k<P_NPARAMS)en_param_text(k,knob_get(k),b);else if(k==K_LEDS)strcpy(b,proj.leds==2?"Keys":proj.leds?"On":"Off");else if(k==K_CPU)snprintf(b,16,"%u%%",(unsigned)plat_cpu_pct());else b[0]=0;}
static void knob_set(int k,int v){
 if(k==K_NONE || k==K_CPU || (k<P_NPARAMS && !en_param_active(k)))return;
 int lo,hi;knob_range(k,&lo,&hi);v=v<lo?lo:v>hi?hi:v;if(k==P_CH_RHYTHM && v==1)v=3;
 if(v==knob_get(k))return;
 if(k==K_LEDS)proj.leds=(uint8_t)v;else{en_set(k,v);if(song_playing())return;proj.par[k]=(int16_t)v;}
 ui.dirty=1;ui.act_t=plat_ms();
}
static void sync_keys(void){
 uint32_t desired[4]={0};for(int ch=0;ch<16;ch++)for(int i=0;i<4;i++)desired[i]|=ui.midi[ch][i];
 for(int k=0;k<27;k++)if(ui.keys>>k&1u){int n=53+k+12*proj.par[P_KEYS_OCT];if(n>=21 && n<=108)desired[n>>5]|=1u<<(n&31);}
 for(int n=21;n<=108;n++){int on=(desired[n>>5]>>(n&31))&1u;if(on!=ui.held[n]){ui.held[n]=(uint8_t)on;en_note(n,on?(ui.velocity[n]?ui.velocity[n]:110):0);}}
}
static void set_piece(int i){
 if(song_playing())en_song_cmd(EN_SONG_STOP,0);project_piece(i);project_apply();en_regrow();ui.mode=MODE_LIVE;ui.undo_n=0;ui.dirty=1;ui.act_t=plat_ms();sync_keys();
}
static void set_cycle(int c){c=(c%10+10)%10;knob_set(P_CYCLE,c);if(c>=7){knob_set(P_CH_RHYTHM,4);knob_set(P_BS_STYLE,3);}else{if(proj.par[P_CH_RHYTHM]==4)knob_set(P_CH_RHYTHM,2);if(proj.par[P_BS_STYLE]==3)knob_set(P_BS_STYLE,2);}en_regrow();}
static void save(void){int rc=project_save();if(!rc && ui.song_dirty && ui.blob_slot>=0)rc=song_save(ui.blob_slot);if(rc)say("SAVE ERROR","");else{ui.dirty=ui.song_dirty=0;say("SAVED","");}}
static void songs_watch(void){
 int state=en_song_state;
 if(ui.song_was==SONG_RECORDING && state!=SONG_RECORDING){en_song_t *s=en_song();song_info_t *info=&proj.songs[ui.rec_slot];info->used=1;info->piece=s->piece;info->tempo=(uint16_t)s->par[P_TEMPO];info->ticks=s->end;ui.song_dirty=ui.dirty=1;ui.blob_slot=(int8_t)ui.rec_slot;ui.mode=MODE_SONGS;say("TAKE KEPT","");}
 if(ui.song_was==SONG_PLAYING && state!=SONG_PLAYING)project_apply();ui.song_was=(uint8_t)state;
}
static void button(int b){
 if(ui.btn>>B_SEL&1u){
  for(int p=0;p<4;p++)if(b==PART_BTN[p]){en_part(p,!en_part_on[p]);return;}
  if(b==B_PLAY){if(song_playing())en_song_cmd(EN_SONG_STOP,0);ui.mode=(uint8_t)!ui.mode;say(ui.mode?"SONGS":"LIVE","");return;}
  if(b==B_EDIT && ui.undo_n){knob_set(P_SEED,ui.undo_seed);ui.undo_n=0;return;}
  return;
 }
 if(b==B_LFO){ui.view=ui.view==V_BASS?V_BASS_TONE:ui.view==V_BASS_TONE?V_BASS_FX:V_BASS;return;}
 if(b==B_GLO){ui.view=ui.view==V_SETUP?V_SYSTEM:V_SETUP;return;}
 for(int v=0;v<NVIEWS;v++)if(VIEW_BTN[v]==b){ui.view=(uint8_t)v;return;}
 if(b==B_PLAY){
  if(ui.mode==MODE_SONGS && en_song_state!=SONG_RECORDING){if(song_playing())en_song_cmd(EN_SONG_STOP,0);else if(proj.songs[proj.song].used && (ui.blob_slot==(int)proj.song || !song_load(proj.song))){ui.blob_slot=(int8_t)proj.song;en_song_cmd(EN_SONG_PLAY,0);}else say("EMPTY SONG","");}
  else en_play(!en_playing);
 }else if(b==B_EDIT){if(en_jazz_forms_active()){ui.undo_seed=proj.par[P_SEED];ui.undo_n=1;knob_set(P_SEED,(int)((plat_ms()*2654435761u+(uint32_t)proj.par[P_SEED]+1u)&32767u));say("NEW PHRASES","");}}
 else if(b==B_REC){if(en_song_state==SONG_RECORDING)en_song_cmd(EN_SONG_STOP,0);else{ui.rec_slot=proj.song;en_song_cmd(EN_SONG_REC,proj.piece);}}
 else if(b==B_SAVE)save();
 else if(b==B_OCTDN || b==B_OCTUP){knob_set(P_KEYS_OCT,proj.par[P_KEYS_OCT]+(b==B_OCTUP?1:-1));sync_keys();}
}
static void midi_in(void){
 uint32_t pkt;int changed=0;while(plat_midi_in(&pkt)){uint32_t st=pkt>>8&255u,n=pkt>>16&127u,v=pkt>>24&127u,ch=st&15u,hi=st&240u;
  if(st==0xf8 || st==0xfa || st==0xfb || st==0xfc)en_clock(st==0xf8?EN_CLK_TICK:st==0xfa?EN_CLK_START:st==0xfb?EN_CLK_CONTINUE:EN_CLK_STOP);
  else if(hi==0x90 && v){ui.midi[ch][n>>5]|=1u<<(n&31);ui.velocity[n]=(uint8_t)v;changed=1;}
  else if(hi==0x80 || hi==0x90){ui.midi[ch][n>>5]&=~(1u<<(n&31));changed=1;}
  else if(hi==0xb0 && (n==120 || n==123)){memset(ui.midi[ch],0,sizeof ui.midi[ch]);changed=1;}
 }if(changed)sync_keys();
}
static void input(void){
 uint32_t b=plat_buttons(),keys=plat_keys(),changed=b^ui.btn;int32_t e;ui.btn=b;
 for(int i=0;i<NB;i++)if(changed>>i&1u){if(b>>i&1u){ui.down_t[i]=plat_ms();ui.used&=~(1u<<i);if(i==B_SAVE)ui.reset_done=0;if(i==B_PLAY){ui.used|=1u<<i;button(i);}}else if(!(ui.used>>i&1u) && i!=B_SEL && i!=B_PLAY)button(i);}
 if(keys!=ui.keys){ui.keys=keys;sync_keys();}if(b||keys||changed)ui.act_t=plat_ms();midi_in();
 if((e=plat_enc(EN_SELECT))){if(b>>B_HOME&1u){knob_set(P_TEMPO,knob_get(P_TEMPO)+e);ui.used|=1u<<B_HOME;}else ui.view=(uint8_t)(((int)ui.view+(e>0?1:NVIEWS-1))%NVIEWS);}
 if((e=plat_enc(EN_ALGO)))set_cycle(proj.par[P_CYCLE]+(e>0?1:-1));
 if((e=plat_enc(EN_PRESET))){if(ui.mode==MODE_SONGS){if(song_playing())en_song_cmd(EN_SONG_STOP,0);proj.song=(uint8_t)((proj.song+(e>0?1:NSONGS-1))%NSONGS);}else set_piece(proj.piece+(e>0?1:-1));}
 for(int i=0;i<4;i++)if((e=plat_enc(EN_K1+i))){int k=view_knob(ui.view,i),v=knob_get(k)+(int)e;if(k==P_CH_RHYTHM){if(v==1)v=e>0?2:0;if(v==4 && !en_jazz_score_active())v=3;}knob_set(k,v);ui.touched=(int8_t)i;ui.touch_until=plat_ms()+1200;ui.act_t=plat_ms();}
 if((b>>B_SAVE&1u) && !ui.reset_done && plat_ms()-ui.down_t[B_SAVE]>1500){ui.reset_done=1;ui.used|=1u<<B_SAVE;if(ui.mode==MODE_LIVE){project_piece_reset();project_apply();en_regrow();ui.dirty=1;say("PRESET RESET","");}else{proj.songs[proj.song].used=0;ui.dirty=1;say("SONG CLEARED","");}}
}
#include "ui_graphics.inc"
static void draw_header(void){
 uint32_t h=hash(hash(hash(2166136261u,proj.piece|ui.mode<<8|proj.song<<12|ui.dirty<<20|en_playing<<21|en_song_state<<22),knob_get(P_TEMPO)),(plat_ms()<ui.msg_until?ui.msg_until:0)+(en_beats&1u));
 if(h==ui.sig[0])return;ui.sig[0]=h;cv_begin(240,HDR_H,K_BG);char t[40];
 if(plat_ms()<ui.msg_until){cv_text(10,6,&FONT_B,ui.msg[0],K_TEXT);cv_text(120,6,&FONT_XS,ui.msg[1],K_ACC);}
 else{const char *title=piece_name(proj.piece);if(ui.mode==MODE_SONGS){snprintf(t,sizeof t,"Song %u",proj.song+1u);title=t;}
  int w=text_w(&FONT_B,title)+12;cv_round(4,4,w,20,6,ui.mode?K_YOURS:K_TEXT);cv_text(10,6,&FONT_B,title,K_BG);cv_text(w+10,8,&FONT_XS,en_note_name(knob_get(P_ROOT)),K_TEXT);
  snprintf(t,sizeof t,"%d",knob_get(P_TEMPO));cv_text(210,6,&FONT_S,t,K_TEXT);if(en_playing)cv_disc(199,14,4,(en_beats&1u)?K_LINE:K_ACC);else cv_text(191,6,&FONT_XS,">",K_DIM);if(ui.dirty)cv_disc(235,23,2,K_ACC);
 }cv_blit(0,0);
}
static void draw_main(void){
 if(ui.frame%2u)return;uint32_t h=hash(2166136261u,en_playing|en_cyc_pos<<4|en_jazz_bar<<8|en_jazz_chorus<<16);
 for(int i=0;i<en_cyc_n;i++)h=hash(h,en_cyc_mask[i]);for(int p=0;p<4;p++)h=hash(h,(uint32_t)q16(en_part_glow[p])|en_part_on[p]<<5|knob_get(PART_LEVEL[p])<<8);
 h=hash(h,(uint32_t)(en_chord_t*32));h=hash(h,en_jazz_form_bass|((uint32_t)en_jazz_form_piano<<16));h=hash(h,ui.btn&(1u<<B_SEL));
 if(h==ui.sig[1])return;ui.sig[1]=h;cv_begin(240,MAIN_H,K_BG);
 if(ui.btn>>B_SEL&1u){cv_round(8,4,224,136,6,K_PANEL);cv_text(16,12,&FONT_B,"SEL: BY HAND",K_ACC);cv_text(16,40,&FONT_XS,"ENV ARP LFO FX: MUTE / UNMUTE",K_TEXT);cv_text(16,64,&FONT_XS,"PLAY: SONGS / LIVE",K_TEXT);cv_text(16,88,&FONT_XS,"EDIT: PREVIOUS PHRASE SEED",K_TEXT);cv_blit(0,MAIN_Y);return;}
 int n=en_cyc_n?en_cyc_n:1,w=(232-4*(n-1))/n;
 for(int i=0;i<n;i++){char name[24];en_chord_name(en_cyc_mask[i],en_cyc_bass[i],name);const felucca_font_t *f=text_w(&FONT_S,name)<=w-4?&FONT_S:&FONT_XS;
  if(text_w(f,name)>w-2)name[name[1]=='b'||name[1]=='#'?2:1]=0;
  int cur=i==en_cyc_pos;cv_round(4+i*(w+4),4,w,24,5,cur&&en_playing?K_ACC:K_PANEL);text_c(4+i*(w+4)+w/2,9,f,name,cur&&en_playing?K_BG:K_TEXT);if(cur)cv_rect(4+i*(w+4),30,(int)(en_chord_t*w),2,K_ACC);
 }
 char t[48];if(en_jazz_score_active())snprintf(t,sizeof t,"BAR %u/%u  TAKE %u  %s",en_jazz_bar,proj.par[P_CYCLE]==9?40:32,en_jazz_chorus,en_jazz_walking?"WALK":"2-FEEL");else snprintf(t,sizeof t,"MELODY: %s",en_jazz_scale_name());cv_text(6,34,&FONT_XS,t,K_ACC);
 static const uint8_t lane[4]={0,1,2,4}; /* Keep the removed lane empty; no layout change. */
 for(int p=0;p<4;p++){int y=52+lane[p]*18;caps(t,EN_PART_NAME[p],sizeof t);cv_text(6,y,&FONT_XS,t,en_part_on[p]?PART_COL[p]:K_DIM);cv_disc(56,y+7,2+q16(en_part_glow[p])/6,en_part_on[p]?PART_COL[p]:K_LINE);
  const char *way=p==PT_DRUMS?"X0X 909":p==PT_KEYS?"PLAY THE GREEN KEYS":p==PT_BASS?(proj.par[P_BS_SOUND]==2?"RINGS + SAMPLE":proj.par[P_BS_SOUND]==1?"PIANO":"UPRIGHT"):"PIANO COMP";
  if(en_jazz_forms_active() && (p==PT_BASS || p==PT_CHORDS))way=en_jazz_form_name(p);
  cv_text(66,y,&FONT_XS,knob_get(PART_LEVEL[p])?way:"OFF",en_part_on[p]?K_TEXT:K_DIM);
 }cv_blit(0,MAIN_Y);
}
static void leds(void){
 uint32_t b=1u<<VIEW_BTN[ui.view],keys=0;for(int k=0;k<27;k++)if(en_jazz_scale>>((53+k)%12)&1u)keys|=1u<<k;
 if(en_playing)b|=1u<<B_PLAY;if(en_song_state==SONG_RECORDING)b|=1u<<B_REC;
 if(ui.btn>>B_SEL&1u){b=1u<<B_SEL;for(int p=0;p<4;p++)if(en_part_on[p])b|=1u<<PART_BTN[p];}
 plat_glow(proj.leds==1);plat_play_red(en_song_state==SONG_RECORDING);plat_leds(proj.leds?b:0,proj.leds?keys:0);
}
void ui_init(void){memset(&ui,0,sizeof ui);ui.touched=ui.blob_slot=-1;lcd_fill(0,0,240,240,K_BG);en_play(1);}
void ui_frame(void){input();songs_watch();if(ui.dirty && !en_playing && !ui.btn && !ui.keys && !en_voices && plat_ms()-ui.act_t>2000)save();en_spell(knob_get(P_ROOT),0);draw_header();draw_main();draw_knobs();leds();ui.frame++;}
void ui_input_only(void){input();}
