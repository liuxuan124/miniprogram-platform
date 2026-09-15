/**
 * Demo media URLs — Unsplash 直链（无 302，小程序 <image> 比 picsum.photos 稳）
 * seed 名与 prototypes-warm 保持一致，便于对照。
 */
const SEED_PHOTO = {
  u1: '1507003211169-0a1dd7228f2d',
  u2: '1494790108377-be9c29b29330',
  u3: '1472099645785-5658abf4ff4e',
  u4: '1535713875002-d1d0cf377fde',
  u5: '1544005313-94ddf0286df2',
  u6: '1500648767791-00dcc994a43e',
  u7: '1506794778202-cad84cf45f1d',
  u8: '1534528741775-53994a69daeb',
  ed1: '1560250097-0b93528c311a',
  warmav: '1438761681033-6461ffad8d80',
  warmc1: '1434030216411-0b793f4b4173',
  warmc2: '1454165804606-c3d57bc86b40',
  warmc3: '1516321318423-f06f85e504b3',
  warmfeat: '1486312338219-ce68d2c6f44d',
  warmp1: '1455390582262-044cdead277a',
  warmp2: '1499750310107-5fef28a66643',
  warmp4: '1499750310107-5fef28a66643',
  warmq1: '1522202176988-66273c2fd55f',
  warmq2: '1517245386807-bb43f82c33c4',
  warmg1: '1556761175-b413da4baf72',
  warmg2: '1516321318423-f06f85e504b3',
  warmg3: '1434030216411-0b793f4b4173',
  nt1: '1484480974693-6ca0a78fb36b',
  nt1b: '1497366811353-687086791d93',
  nt1c: '1513694203232-719a280e022f',
  nt1d: '1524754202115-8abdf7d6d8e8',
  nt1e: '1555041469-a586c61ea9bc',
  nt1f: '1493663284031-b7e3aefcae8e',
  nt1g: '1586023492125-27b2c045efd7',
  nt1h: '1616486338812-3dadae4b4ace',
  nt1i: '1507473885761-d6fe1b8d0b4d',
  nt2: '1497366811353-687086791d93',
  nt3: '1513694203232-719a280e022f',
  nt4: '1524754202115-8abdf7d6d8e8',
  nt5: '1555041469-a586c61ea9bc',
  nt6: '1493663284031-b7e3aefcae8e',
  nt7: '1586023492125-27b2c045efd7',
  pp1: '1522202176988-66273c2fd55f',
  pp2: '1517245386807-bb43f82c33c4',
  pp3: '1556761175-b413da4baf72',
  pg1: '1522202176988-66273c2fd55f',
  pg2: '1517245386807-bb43f82c33c4',
  pg3: '1556761175-b413da4baf72',
  pg4: '1486312338219-ce68d2c6f44d',
  pg5: '1454165804606-c3d57bc86b40',
  col1: '1516321497487-e814afdc6b81',
  eb1: '1544947950-fa07a98d237f',
  eb2: '1512820790803-83ca734da794',
  eb3: '1495446815901-a7297e633e8d',
  eb4: '1544947950-fa07a98d237f',
  ebd: '1456513080800-2a8d5e9b6c5d',
  ls1: '1486312338219-ce68d2c6f44d',
  ls2: '1499750310107-5fef28a66643',
  lg1: '1516321318423-f06f85e504b3',
  lg2: '1454165804606-c3d57bc86b40',
  lg3: '1434030216411-0b793f4b4173',
  art1: '1460925895917-afdab827c52f',
  shop1: '1560250097-0b93528c311a',
  pl9: '1522202176988-66273c2fd55f',
  kf1: '1560250097-0b93528c311a',
  scr1: '1516321318423-f06f85e504b3',
  cw1: '1484480974693-6ca0a78fb36b',
  cw2: '1497366811353-687086791d93',
}
const SEED_POOL = Object.values(SEED_PHOTO)

function picsum(seed, w = 400, h = 300) {
  let id = SEED_PHOTO[seed]
  if (!id) {
    let hsh = 0
    const s = String(seed || 'x')
    for (let i = 0; i < s.length; i++) hsh = (hsh * 31 + s.charCodeAt(i)) >>> 0
    id = SEED_POOL[hsh % SEED_POOL.length]
  }
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=80`
}

module.exports = {
  SEED_PHOTO,
  picsum,
}
