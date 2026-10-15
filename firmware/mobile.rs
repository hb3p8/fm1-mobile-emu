// SPDX-License-Identifier: MIT
// Flash access for FM-1 Mobile. Called between render quanta; no firmware code is patched.
#[no_mangle]
pub extern "C" fn fm1_flash() -> *mut u8 {
    machine().map_or(std::ptr::null_mut(), |m| m.soc.flash.mem.as_mut_ptr())
}

#[no_mangle]
pub extern "C" fn fm1_flash_size() -> u32 {
    machine().map_or(0, |m| m.soc.flash.mem.len() as u32)
}

#[no_mangle]
pub extern "C" fn fm1_flash_revision() -> u32 {
    machine().map_or(0, |m| m.soc.flash.revision)
}

// JS restores a sector through fm1_flash(), then refreshes its XIP view. The app area in
// XIP is initially unscrambled by the package loader; restore only changed data sectors.
#[no_mangle]
pub extern "C" fn fm1_flash_restored(off: u32, len: u32) {
    if let Some(m) = machine() {
        let a = (off as usize).max(fm1_soc::XIP_FLASH_OFFSET);
        let b = (off as usize).saturating_add(len as usize).min(m.soc.flash.mem.len());
        for i in a..b {
            if let Some(v) = m.soc.xip.get_mut(i - fm1_soc::XIP_FLASH_OFFSET) {
                *v = m.soc.flash.mem[i];
            }
        }
    }
}

// A real chip's random source is fresh on each boot, including MAKU's world seed.
#[no_mangle]
pub extern "C" fn fm1_seed(seed: u32) {
    if let Some(m) = machine() {
        m.soc.seed_random(u64::from(seed).wrapping_mul(0x9e37_79b9_7f4a_7c15));
    }
}
