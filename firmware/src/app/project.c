/* SPDX-License-Identifier: GPL-3.0-only */
/* MIN-1 project: one flash object (OBJ_PROJ), and the songs: a take each in up to SONG_OBJS objects.
 * A project of another format, or none, gives the defaults. Part of the unity build, after app.h. (AMB-1's.)
 *
 * The pieces (their recipes are the engine's, en_piece): each keeps its own settings as you leave it,
 * and its own Mine (the cycle learned with LEARN); Keys, Hold and MIDI out are global. */
project_t proj;

const char *piece_name(int i) { return en_piece_name(i); }

static int global_par(int p) { return p == P_MIDI || p == P_KEYS || p == P_HOLD; }

static void recipe(int i, slot_t *s) { en_piece(i, s->par); }

static void take(const slot_t *s)                /* a piece's settings into play, the globals kept */
{
    int p;
    for (p = 0; p < P_NPARAMS; p++)
        if (!global_par(p))
            proj.par[p] = s->par[p];
}

static void keep(void)                           /* the piece playing, into its slot */
{
    int p;
    for (p = 0; p < P_NPARAMS; p++)
        proj.slot[proj.piece].par[p] = proj.par[p];
}

void project_defaults(void)
{
    int i;
    memset(&proj, 0, sizeof proj);
    proj.magic = PROJ_MAGIC;
    proj.format = PROJ_FORMAT;
    for (i = 0; i < NPIECES; i++)
        recipe(i, &proj.slot[i]);
    for (i = 0; i < P_NPARAMS; i++)
        proj.par[i] = en_param_info(i)->def;
    proj.piece=EN_NPIECES-1;
    take(&proj.slot[proj.piece]);
    proj.leds = 1;
}

static int pars_ok(const int16_t *par)
{
    int i;
    for (i = 0; i < P_NPARAMS; i++) {
        const en_param_t *p = en_param_info(i);
        if (par[i] < p->lo || par[i] > p->hi)
            return 0;
    }
    return 1;
}

static int mine_ok(const slot_t *s)
{
    int k;
    if (s->mine_n > EN_CYC_MAX)
        return 0;
    for (k = 0; k < s->mine_n; k++)
        if ((s->mine_mask[k] >> 12) || s->mine_bass[k] > 11u)
            return 0;
    return 1;
}

static int project_valid(void)
{
    int i;
    if (proj.magic != PROJ_MAGIC || proj.format != PROJ_FORMAT || proj.piece >= NPIECES || proj.leds > 2u ||
        proj.song >= NSONGS || !pars_ok(proj.par))
        return 0;
    for (i = 0; i < NPIECES; i++)
        if (!pars_ok(proj.slot[i].par) || !mine_ok(&proj.slot[i]))
            return 0;
    return 1;
}

static int16_t old_bass_send(const int16_t *p);

/* Version 3 had the same parts and slots, but only the first 36 parameters.
 * Preserve the user's presets, learned cycles and song catalogue on upgrade. */
typedef struct {
    int16_t par[36];uint8_t mine_n,rsv;uint16_t mine_mask[EN_CYC_MAX];uint8_t mine_bass[EN_CYC_MAX];
} slot_v3_t;
typedef struct {
    uint32_t magic,format;int16_t par[36];uint8_t leds,piece,song,rsv0;
    slot_v3_t slot[27];song_info_t songs[NSONGS];uint8_t rsv[16];
} project_v3_t;
static int migrate_v3(void)
{
    project_v3_t old;int i,p;
    if(plat_store_load(OBJ_PROJ,&old,sizeof old)!=(int)sizeof old || old.magic!=PROJ_MAGIC || old.format!=3u)return 0;
    project_defaults();
    for(p=0;p<36;p++)proj.par[p]=old.par[p];
    proj.par[P_BS_REVERB]=old_bass_send(proj.par);
    proj.leds=old.leds;proj.piece=old.piece;proj.song=old.song;
    for(i=0;i<27;i++) {
        for(p=0;p<36;p++)proj.slot[i].par[p]=old.slot[i].par[p];
        for(p=36;p<P_NPARAMS;p++)proj.slot[i].par[p]=(int16_t)en_param_info(p)->def;
        proj.slot[i].par[P_BS_REVERB]=old_bass_send(proj.slot[i].par);
        proj.slot[i].mine_n=old.slot[i].mine_n;
        memcpy(proj.slot[i].mine_mask,old.slot[i].mine_mask,sizeof old.slot[i].mine_mask);
        memcpy(proj.slot[i].mine_bass,old.slot[i].mine_bass,sizeof old.slot[i].mine_bass);
    }
    memcpy(proj.songs,old.songs,sizeof old.songs);
    return project_valid();
}
/* Versions 4/5/6 had forty parameters and 27/28/29 slots. Freeze those
 * layouts rather than letting today's parameter count change old offsets. */
typedef struct {
    int16_t par[40];uint8_t mine_n,rsv;uint16_t mine_mask[EN_CYC_MAX];uint8_t mine_bass[EN_CYC_MAX];
} slot_v40_t;
static int16_t old_bass_send(const int16_t *p)
{
    return (int16_t)(p[P_BS_SOUND]==1?100:p[P_BS_SOUND]==2?7:16);
}
static int migrate_v40(int version,int count)
{
    /* Flash objects are aligned to four bytes; the catalogue follows the slots. */
    uint8_t old[3248];uint32_t magic,format;unsigned size=(92u+106u*(unsigned)count+3u)&~3u;
    int i;size+=sizeof proj.songs+16u;
    if(plat_store_load(OBJ_PROJ,old,size)!=(int)size)return 0;
    memcpy(&magic,old,4);memcpy(&format,old+4,4);
    if(magic!=PROJ_MAGIC || format!=(uint32_t)version)return 0;
    project_defaults();memcpy(proj.par,old+8,80);
    proj.par[P_BS_REVERB]=old_bass_send(proj.par);
    proj.leds=old[88];proj.piece=old[89];proj.song=old[90];
    for(i=0;i<count;i++) {
        slot_v40_t slot;memcpy(&slot,old+92+106*i,sizeof slot);
        memcpy(proj.slot[i].par,slot.par,sizeof slot.par);
        proj.slot[i].par[P_BS_REVERB]=old_bass_send(slot.par);
        proj.slot[i].mine_n=slot.mine_n;
        memcpy(proj.slot[i].mine_mask,slot.mine_mask,sizeof slot.mine_mask);
        memcpy(proj.slot[i].mine_bass,slot.mine_bass,sizeof slot.mine_bass);
    }
    memcpy(proj.songs,old+size-sizeof proj.songs-16u,sizeof proj.songs);
    return project_valid();
}
typedef struct {
    uint32_t magic,format;int16_t par[41];uint8_t leds,piece,song,rsv0;
    slot_t slot[29];song_info_t songs[NSONGS];uint8_t rsv[16];
} project_v7_t;
static int migrate_v7(void)
{
    project_v7_t old;
    if(plat_store_load(OBJ_PROJ,&old,sizeof old)!=(int)sizeof old || old.magic!=PROJ_MAGIC || old.format!=7u)return 0;
    project_defaults();memcpy(proj.par,old.par,sizeof old.par);
    proj.leds=old.leds;proj.piece=old.piece;proj.song=old.song;
    memcpy(proj.slot,old.slot,sizeof old.slot);memcpy(proj.songs,old.songs,sizeof old.songs);
    return project_valid();
}
int project_load(void)
{
    int n;
    memset(&proj, 0, sizeof proj);
    n = plat_store_load(OBJ_PROJ, &proj, sizeof proj);
    if (n == (int)sizeof proj && project_valid())
        return 0;
    if(migrate_v7() || migrate_v40(6,29) || migrate_v40(5,28) || migrate_v40(4,27) || migrate_v3())return 0;
    project_defaults();
    return -1;
}

int project_save(void)
{
    keep();
    return plat_store_save(OBJ_PROJ, &proj, sizeof proj);
}

void project_piece(int i)
{
    keep();
    proj.piece = (uint8_t)((i % NPIECES + NPIECES) % NPIECES);
    take(&proj.slot[proj.piece]);
}

void project_piece_reset(void)
{
    slot_t s;
    recipe(proj.piece, &s);
    take(&s);
}

void project_mine(int n, const uint16_t *mask, const uint8_t *bass)
{
    slot_t *s = &proj.slot[proj.piece];
    int k;
    s->mine_n = (uint8_t)(n < 0 ? 0 : n > EN_CYC_MAX ? EN_CYC_MAX : n);
    for (k = 0; k < EN_CYC_MAX; k++) {
        s->mine_mask[k] = k < s->mine_n ? (uint16_t)(mask[k] & 0xFFFu) : 0;
        s->mine_bass[k] = k < s->mine_n ? (uint8_t)(bass[k] % 12u) : 0;
    }
}

void project_apply(void)
{
    const slot_t *s = &proj.slot[proj.piece];
    int i;
    en_mine(s->mine_n, s->mine_mask, s->mine_bass);  /* Mine before the Cycle, which may ask for it */
    for (i = 0; i < P_NPARAMS; i++)
        en_set(i, proj.par[i]);
}

/* a take: the header and its commands, cut into objects of PLAT_STORE_MAX bytes */
int song_save(int k)
{
    const uint8_t *b = (const uint8_t *)en_song();
    uint32_t bytes = EN_SONG_BYTES(en_song()->n), off;
    int c, rc;
    if (k < 0 || k >= NSONGS || en_song()->magic != EN_SONG_MAGIC || bytes > SONG_OBJS * PLAT_STORE_MAX)
        return -1;
    for (c = 0, off = 0; off < bytes; c++, off += PLAT_STORE_MAX)
        if ((rc = plat_store_save(OBJ_SONG0 + (uint32_t)(k * SONG_OBJS + c), b + off,
                                  bytes - off > PLAT_STORE_MAX ? PLAT_STORE_MAX : bytes - off)) != 0)
            return rc;
    return 0;
}

int song_load(int k)
{
    en_song_t *s = en_song();
    uint8_t *b = (uint8_t *)s;
    uint32_t bytes, off;
    int c, n, legacy;
    if (k < 0 || k >= NSONGS)
        return -1;
    n = plat_store_load(OBJ_SONG0 + (uint32_t)(k * SONG_OBJS), b, PLAT_STORE_MAX);
    legacy=s->magic==0x31474E53u;
    if (n < (int)(legacy?124u:EN_SONG_BYTES(0)) || (!legacy && s->magic != EN_SONG_MAGIC) || s->n > EN_SONG_MAX) {
        s->magic = 0;
        return -1;
    }
    bytes = legacy?124u+8u*s->n:EN_SONG_BYTES(s->n);
    if(n<(int)(bytes>PLAT_STORE_MAX?PLAT_STORE_MAX:bytes)) {s->magic=0;return -1;}
    for (c = 1, off = PLAT_STORE_MAX; off < bytes; c++, off += PLAT_STORE_MAX) {
        uint32_t want = bytes - off > PLAT_STORE_MAX ? PLAT_STORE_MAX : bytes - off;
        if (plat_store_load(OBJ_SONG0 + (uint32_t)(k * SONG_OBJS + c), b + off, want) != (int)want) {
            s->magic = 0;
            return -1;
        }
    }
    if(legacy) {
        uint8_t meta[28];int16_t send;
        memcpy(meta,b+96,sizeof meta);
        send=old_bass_send(s->par);
        memmove(s->ev,b+124,8u*s->n);
        s->par[P_BS_REVERB]=send;
        memcpy(b+98,meta,sizeof meta);
        s->magic=EN_SONG_MAGIC;
    }
    return 0;
}
