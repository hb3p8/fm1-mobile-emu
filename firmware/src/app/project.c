/* SPDX-License-Identifier: GPL-3.0-only */
/* Ten Jazz Box recipes. Old Jazz settings are translated at the storage
 * boundary; original MIN-1 recipes/modes cannot be loaded or executed. */
project_t proj;
const char *piece_name(int i){return en_piece_name(i);}
static void keep(void){memcpy(proj.slot[proj.piece].par,proj.par,sizeof proj.par);}
static void take(const slot_t *s){int midi=proj.par[P_MIDI];memcpy(proj.par,s->par,sizeof proj.par);proj.par[P_MIDI]=(int16_t)midi;}
void project_defaults(void){
 memset(&proj,0,sizeof proj);proj.magic=PROJ_MAGIC;proj.format=PROJ_FORMAT;proj.leds=1;proj.piece=9;
 for(int i=0;i<NPIECES;i++)en_piece(i,proj.slot[i].par);
 memcpy(proj.par,proj.slot[9].par,sizeof proj.par);
}
static int pars_ok(const int16_t *p){for(int i=0;i<P_NPARAMS;i++){const en_param_t *x=en_param_info(i);if(p[i]<x->lo || p[i]>x->hi)return 0;}return 1;}
static int project_valid(void){
 if(proj.magic!=PROJ_MAGIC || proj.format!=PROJ_FORMAT || proj.piece>=NPIECES || proj.song>=NSONGS || proj.leds>2 || !pars_ok(proj.par))return 0;
 for(int i=0;i<NPIECES;i++)if(!pars_ok(proj.slot[i].par))return 0;
 for(int i=0;i<NSONGS;i++)if(proj.songs[i].used && proj.songs[i].piece>=NPIECES)return 0;
 return 1;
}
static int old_cycle(int c,int fallback){return c>=18 && c<=24?c-18:c>=27 && c<=29?c-20:fallback;}
static void old_params(int16_t *dst,const int16_t *old,int np,int piece){
 en_piece(piece,dst);
 for(int p=0;p<np;p++)if(en_param_active(p)){const en_param_t *x=en_param_info(p);int v=old[p];if(p==P_CYCLE)v=old_cycle(v,piece);if(p==P_CH_RHYTHM && v==1)v=3;if(p==P_BS_STYLE && v==3 && piece<7)v=2;dst[p]=(int16_t)(v<x->lo?x->lo:v>x->hi?x->hi:v);}
 if(np<=40)dst[P_BS_REVERB]=(int16_t)(old[P_BS_SOUND]==1?100:old[P_BS_SOUND]==2?7:16);
}
static int migrate_project(void){
 uint8_t raw[PLAT_STORE_MAX];uint32_t magic,version;int n=plat_store_load(OBJ_PROJ,raw,sizeof raw);
 if(n<8)return 0;memcpy(&magic,raw,4);memcpy(&version,raw+4,4);
 if(magic!=PROJ_MAGIC || version<3 || version>8)return 0;
 int np=version==3?36:version<=6?40:41,count=version<=4?27:version==5?28:version<=7?29:30;
 int header=12+2*np,stride=2*np+26,songs=(header+count*stride+3)&~3;
 if(n!=songs+(int)sizeof proj.songs+16)return 0;
 project_defaults();int old_piece=raw[8+2*np+1];proj.piece=(uint8_t)(old_piece>=20 && old_piece<count?old_piece-20:9);
 proj.leds=raw[8+2*np];proj.song=raw[8+2*np+2];
 if(old_piece>=20){int16_t values[41]={0};memcpy(values,raw+8,2u*(unsigned)np);old_params(proj.par,values,np,proj.piece);}
 for(int i=20;i<count;i++){int16_t values[41]={0};memcpy(values,raw+header+i*stride,2u*(unsigned)np);old_params(proj.slot[i-20].par,values,np,i-20);}
 memcpy(proj.songs,raw+songs,sizeof proj.songs);
 for(int i=0;i<NSONGS;i++){song_info_t *s=&proj.songs[i];if(s->piece>=20 && s->piece<count)s->piece-=20;else s->used=0;}
 return project_valid();
}
int project_load(void){memset(&proj,0,sizeof proj);if(plat_store_load(OBJ_PROJ,&proj,sizeof proj)==(int)sizeof proj && project_valid())return 0;if(migrate_project())return 0;project_defaults();return -1;}
int project_save(void){keep();return plat_store_save(OBJ_PROJ,&proj,sizeof proj);}
void project_piece(int i){keep();proj.piece=(uint8_t)((i%NPIECES+NPIECES)%NPIECES);take(&proj.slot[proj.piece]);}
void project_piece_reset(void){slot_t s;en_piece(proj.piece,s.par);take(&s);}
void project_apply(void){for(int p=0;p<P_NPARAMS;p++)if(en_param_active(p))en_set(p,proj.par[p]);}
int song_save(int k){
 const en_song_t *s=en_song();const uint8_t *b=(const uint8_t*)s;uint32_t bytes=EN_SONG_BYTES(s->n);
 if(k<0 || k>=NSONGS || s->magic!=EN_SONG_MAGIC || s->n>EN_SONG_MAX || bytes>SONG_OBJS*PLAT_STORE_MAX)return -1;
 for(uint32_t off=0,c=0;off<bytes;off+=PLAT_STORE_MAX,c++){uint32_t want=bytes-off>PLAT_STORE_MAX?PLAT_STORE_MAX:bytes-off;if(plat_store_save(OBJ_SONG0+(uint32_t)k*SONG_OBJS+c,b+off,want))return -1;}return 0;
}
int song_load(int k){
 en_song_t *s=en_song();uint8_t *b=(uint8_t*)s;int n;if(k<0 || k>=NSONGS)return -1;
 n=plat_store_load(OBJ_SONG0+(uint32_t)k*SONG_OBJS,b,PLAT_STORE_MAX);
 int legacy=s->magic==0x31474e53u || s->magic==0x32474e53u,np=s->magic==0x31474e53u?40:41;
 uint32_t header=legacy?(np==40?124u:128u):EN_SONG_BYTES(0),bytes=header+8u*s->n;
 if(n<(int)header || (!legacy && s->magic!=EN_SONG_MAGIC) || s->n>EN_SONG_MAX || n<(int)(bytes>PLAT_STORE_MAX?PLAT_STORE_MAX:bytes))goto bad;
 for(uint32_t off=PLAT_STORE_MAX,c=1;off<bytes;off+=PLAT_STORE_MAX,c++){uint32_t want=bytes-off>PLAT_STORE_MAX?PLAT_STORE_MAX:bytes-off;if(plat_store_load(OBJ_SONG0+(uint32_t)k*SONG_OBJS+c,b+off,want)!=(int)want)goto bad;}
 if(legacy){
  int piece=b[16+2*np+1];int16_t old[41]={0};if(piece<20 || piece>=30)goto bad;piece-=20;
  memcpy(old,b+16,2u*(unsigned)np);memmove(s->ev,b+header,s->n*8u);old_params(s->par,old,np,piece);s->piece=(uint8_t)piece;s->magic=EN_SONG_MAGIC;
  uint32_t kept=0;for(uint32_t i=0;i<s->n;i++){uint32_t cmd=s->ev[i][1],type=cmd>>24,arg=cmd>>16&255u;int value=(int)(int16_t)cmd;
   if(type==0){if(!en_param_active((int)arg))continue;if(arg==P_CYCLE)value=old_cycle(value,piece);cmd=(cmd&0xffff0000u)|((uint32_t)value&65535u);}
   else if(type==11){if(arg==3)continue;if(arg==4)cmd=(cmd&0xff00ffffu)|(3u<<16);}
   else if(type==14)cmd|=(uint32_t)PT_KEYS<<8;
   else if(type>6 && type!=13)continue;
   s->ev[kept][0]=s->ev[i][0];s->ev[kept++][1]=cmd;
  }s->n=kept;
 }
 if(s->piece>=NPIECES || !pars_ok(s->par))goto bad;return 0;
 bad:s->magic=0;return -1;
}
