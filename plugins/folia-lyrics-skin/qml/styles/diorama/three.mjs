// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
var xs,
  vs,
  ys,
  Ii,
  Ms,
  Ss,
  Pi,
  xn,
  Li,
  ts,
  es,
  ke,
  ns,
  Ge,
  is,
  zn,
  Vn,
  kn,
  Gn,
  Hn,
  Wn,
  ae,
  Xn,
  qn,
  Yn,
  Zn,
  hi,
  ss,
  rs,
  ui,
  di,
  fi,
  pi,
  mi,
  gi,
  _i,
  xi,
  as,
  vi,
  os,
  Jn,
  ie,
  $n,
  ls,
  cs,
  hs,
  us,
  ds,
  oe,
  He,
  ze,
  Kn,
  Qn,
  jn,
  ti,
  yi,
  $,
  ei,
  ni,
  Ve,
  Pt,
  ii,
  si,
  Yt,
  ri,
  Di,
  We,
  Es,
  Mt,
  W,
  Ni,
  se,
  le,
  ps,
  Ai,
  B,
  rt,
  Ei,
  g,
  vn,
  Ui,
  wi,
  E,
  yn,
  Fi,
  Oi,
  tt,
  Ft,
  Xe,
  Ws,
  qe,
  Xs,
  Sn,
  Dt,
  Ci,
  Nt,
  _n,
  H,
  Ot,
  nt,
  qs,
  Ys,
  pt,
  xe,
  Z,
  Bi,
  zi,
  St,
  Ye,
  Zs,
  Vi,
  Bt,
  lt,
  ve,
  jt,
  Js,
  $s,
  ki,
  Gi,
  Hi,
  Wi,
  Ks,
  zt,
  bn,
  et,
  Ze,
  ms,
  mt,
  ye,
  U,
  X,
  Je,
  $e,
  it,
  ct,
  An,
  ht,
  Vt,
  kt,
  Xi,
  En,
  wn,
  Cn,
  Rn,
  In,
  Pn,
  yt,
  bt,
  ut,
  st,
  Me,
  Gt,
  Ht,
  Wt,
  gt,
  _t,
  Ct,
  te,
  Se,
  be,
  Rt,
  V,
  Te,
  Qs,
  ot,
  Ke,
  Qe,
  Lt,
  js,
  ee,
  Dn,
  $t,
  tr,
  j,
  Nn,
  Xt,
  J,
  ne,
  G,
  Ut,
  er,
  Kt,
  dt,
  Un,
  Ae,
  xt,
  Fn,
  Ee,
  On,
  ce,
  he,
  qi,
  It,
  we,
  Yi,
  Ce,
  Re,
  Ie,
  Bn,
  Pe,
  Zi,
  Le,
  je,
  ue,
  Ji,
  oi,
  Ne,
  Ue,
  tn,
  en,
  nn,
  sr,
  rr,
  sn,
  Tt,
  rn,
  an,
  on,
  ln,
  K,
  At,
  cn,
  hn,
  un,
  de,
  Et,
  dn,
  fn,
  gs,
  pn,
  Oe,
  Be,
  at,
  mn,
  vt,
  Qi,
  ji,
  gn,
  bi,
  ar,
  Ti,
  or,
  lr,
  cr,
  hr,
  ur,
  dr,
  fr,
  li,
  N,
  Qo,
  Ri,
  ci,
  pr,
  mr,
  gr,
  _r,
  xr,
  vr,
  yr,
  Mr,
  Sr,
  br,
  Tr,
  Ar,
  Er,
  wr,
  Cr,
  Rr,
  Ir,
  Pr,
  Lr,
  Dr,
  Nr,
  Ur,
  Fr,
  Or,
  Br,
  zr,
  Vr,
  kr,
  Gr,
  Hr,
  Wr,
  Xr,
  qr,
  Yr,
  Zr,
  Jr,
  $r,
  Kr,
  Qr,
  jr,
  ta,
  ea,
  na,
  ia,
  sa,
  ra,
  aa,
  oa,
  la,
  ca,
  ha,
  ua,
  da,
  fa,
  pa,
  ma,
  ga,
  _a,
  xa,
  va,
  ya,
  Ma,
  Sa,
  ba,
  Ta,
  Aa,
  Ea,
  wa,
  Ca,
  Ra,
  Ia,
  Pa,
  La,
  Da,
  Na,
  Ua,
  Fa,
  Oa,
  Ba,
  za,
  Va,
  ka,
  Ga,
  Ha,
  Wa,
  Xa,
  qa,
  Ya,
  Za,
  Ja,
  $a,
  Ka,
  Qa,
  ja,
  to,
  eo,
  no,
  io,
  so,
  ro,
  ao,
  oo,
  lo,
  co,
  ho,
  uo,
  fo,
  po,
  mo,
  go,
  _o,
  xo,
  vo,
  yo,
  Mo,
  So,
  bo,
  To,
  Ao,
  Eo,
  wo,
  Co,
  Ro,
  Io,
  Po,
  Lo,
  Do,
  No,
  Uo,
  Fo,
  Oo,
  Bo,
  zo,
  Vo,
  ko,
  Go,
  Ho,
  Wo,
  Xo,
  qo,
  Yo,
  Zo,
  R,
  v,
  _s,
  Jo,
  ep,
  np,
  ip,
  sp,
  rp,
  ap,
  op,
  lp,
  cp,
  $o,
  hp,
  xs = Object.defineProperty,
  vs = Object.defineProperties,
  ys = Object.getOwnPropertyDescriptors,
  Ii = Object.getOwnPropertySymbols,
  Ms = Object.prototype.hasOwnProperty,
  Ss = Object.prototype.propertyIsEnumerable,
  Pi = (h9, t, e) =>
    t in h9 ? xs(h9, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : (h9[t] = e),
  xn = (h9, t) => {
    for (var e in t || (t = {})) Ms.call(t, e) && Pi(h9, e, t[e]);
    if (Ii) for (var e of Ii(t)) Ss.call(t, e) && Pi(h9, e, t[e]);
    return h9;
  },
  Li = (h9, t) => vs(h9, ys(t)),
  ts = 1,
  es = 3,
  ke = 0,
  ns = 1,
  Ge = 1,
  is = 2,
  zn = 100,
  Vn = 204,
  kn = 205,
  Gn = 0,
  Hn = 1,
  Wn = 2,
  ae = 3,
  Xn = 4,
  qn = 5,
  Yn = 6,
  Zn = 7,
  hi = 0,
  ss = 1,
  rs = 2,
  ui = 1,
  di = 2,
  fi = 3,
  pi = 4,
  mi = 5,
  gi = 6,
  _i = 7,
  xi = 300,
  as = 301,
  vi = 302,
  os = 306,
  Jn = 1e3,
  ie = 1001,
  $n = 1002,
  ls = 1006,
  cs = 1008,
  hs = 1009,
  us = 1015,
  ds = 1023,
  oe = 2300,
  He = 2301,
  ze = 2302,
  Kn = 2303,
  Qn = 2400,
  jn = 2401,
  ti = 2402,
  yi = '',
  $ = 'srgb',
  ei = 'srgb-linear',
  ni = 'linear',
  Ve = 'srgb',
  Pt = 7680,
  ii = 519,
  si = 35044,
  Yt = 2e3,
  ri = 2001;
function Ts(h9) {
  for (let t = h9.length - 1; t >= 0; --t) if (h9[t] >= 65535) return !0;
  return !1;
}
function As(h9) {
  return ArrayBuffer.isView(h9) && !(h9 instanceof DataView);
}
function ai(h9) {
  return document.createElementNS('http://www.w3.org/1999/xhtml', h9);
}
var Di = {},
  We = null;
function fs(h9) {
  let t = h9[0];
  if (typeof t == 'string' && t.startsWith('TSL:')) {
    let e = h9[1];
    e && e.isStackTrace
      ? (h9[0] += ' ' + e.getLocation())
      : (h9[1] =
          'Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.');
  }
  return h9;
}
function z(...h9) {
  h9 = fs(h9);
  let t = 'THREE.' + h9.shift();
  if (We) We('warn', t, ...h9);
  else {
    let e = h9[0];
    e && e.isStackTrace ? console.warn(e.getError(t)) : console.warn(t, ...h9);
  }
}
function O(...h9) {
  h9 = fs(h9);
  let t = 'THREE.' + h9.shift();
  if (We) We('error', t, ...h9);
  else {
    let e = h9[0];
    e && e.isStackTrace ? console.error(e.getError(t)) : console.error(t, ...h9);
  }
}
function Zt(...h9) {
  let t = h9.join(' ');
  t in Di || ((Di[t] = !0), z(...h9));
}
var Es = { [Gn]: Hn, [Wn]: Yn, [Xn]: Zn, [ae]: qn, [Hn]: Gn, [Yn]: Wn, [Zn]: Xn, [qn]: ae },
  Mt = class {
    addEventListener(t, e) {
      this._listeners === void 0 && (this._listeners = {});
      let n = this._listeners;
      (n[t] === void 0 && (n[t] = []), n[t].indexOf(e) === -1 && n[t].push(e));
    }
    hasEventListener(t, e) {
      let n = this._listeners;
      return n === void 0 ? !1 : n[t] !== void 0 && n[t].indexOf(e) !== -1;
    }
    removeEventListener(t, e) {
      let n = this._listeners;
      if (n === void 0) return;
      let i = n[t];
      if (i !== void 0) {
        let s = i.indexOf(e);
        s !== -1 && i.splice(s, 1);
      }
    }
    dispatchEvent(t) {
      let e = this._listeners;
      if (e === void 0) return;
      let n = e[t.type];
      if (n !== void 0) {
        t.target = this;
        let i = n.slice(0);
        for (let s = 0, r = i.length; s < r; s++) i[s].call(this, t);
        t.target = null;
      }
    }
  },
  W = [
    '00',
    '01',
    '02',
    '03',
    '04',
    '05',
    '06',
    '07',
    '08',
    '09',
    '0a',
    '0b',
    '0c',
    '0d',
    '0e',
    '0f',
    '10',
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
    '19',
    '1a',
    '1b',
    '1c',
    '1d',
    '1e',
    '1f',
    '20',
    '21',
    '22',
    '23',
    '24',
    '25',
    '26',
    '27',
    '28',
    '29',
    '2a',
    '2b',
    '2c',
    '2d',
    '2e',
    '2f',
    '30',
    '31',
    '32',
    '33',
    '34',
    '35',
    '36',
    '37',
    '38',
    '39',
    '3a',
    '3b',
    '3c',
    '3d',
    '3e',
    '3f',
    '40',
    '41',
    '42',
    '43',
    '44',
    '45',
    '46',
    '47',
    '48',
    '49',
    '4a',
    '4b',
    '4c',
    '4d',
    '4e',
    '4f',
    '50',
    '51',
    '52',
    '53',
    '54',
    '55',
    '56',
    '57',
    '58',
    '59',
    '5a',
    '5b',
    '5c',
    '5d',
    '5e',
    '5f',
    '60',
    '61',
    '62',
    '63',
    '64',
    '65',
    '66',
    '67',
    '68',
    '69',
    '6a',
    '6b',
    '6c',
    '6d',
    '6e',
    '6f',
    '70',
    '71',
    '72',
    '73',
    '74',
    '75',
    '76',
    '77',
    '78',
    '79',
    '7a',
    '7b',
    '7c',
    '7d',
    '7e',
    '7f',
    '80',
    '81',
    '82',
    '83',
    '84',
    '85',
    '86',
    '87',
    '88',
    '89',
    '8a',
    '8b',
    '8c',
    '8d',
    '8e',
    '8f',
    '90',
    '91',
    '92',
    '93',
    '94',
    '95',
    '96',
    '97',
    '98',
    '99',
    '9a',
    '9b',
    '9c',
    '9d',
    '9e',
    '9f',
    'a0',
    'a1',
    'a2',
    'a3',
    'a4',
    'a5',
    'a6',
    'a7',
    'a8',
    'a9',
    'aa',
    'ab',
    'ac',
    'ad',
    'ae',
    'af',
    'b0',
    'b1',
    'b2',
    'b3',
    'b4',
    'b5',
    'b6',
    'b7',
    'b8',
    'b9',
    'ba',
    'bb',
    'bc',
    'bd',
    'be',
    'bf',
    'c0',
    'c1',
    'c2',
    'c3',
    'c4',
    'c5',
    'c6',
    'c7',
    'c8',
    'c9',
    'ca',
    'cb',
    'cc',
    'cd',
    'ce',
    'cf',
    'd0',
    'd1',
    'd2',
    'd3',
    'd4',
    'd5',
    'd6',
    'd7',
    'd8',
    'd9',
    'da',
    'db',
    'dc',
    'dd',
    'de',
    'df',
    'e0',
    'e1',
    'e2',
    'e3',
    'e4',
    'e5',
    'e6',
    'e7',
    'e8',
    'e9',
    'ea',
    'eb',
    'ec',
    'ed',
    'ee',
    'ef',
    'f0',
    'f1',
    'f2',
    'f3',
    'f4',
    'f5',
    'f6',
    'f7',
    'f8',
    'f9',
    'fa',
    'fb',
    'fc',
    'fd',
    'fe',
    'ff',
  ],
  Ni = 1234567,
  se = Math.PI / 180,
  le = 180 / Math.PI;
function Qt() {
  let h9 = (Math.random() * 4294967295) | 0,
    t = (Math.random() * 4294967295) | 0,
    e = (Math.random() * 4294967295) | 0,
    n = (Math.random() * 4294967295) | 0;
  return (
    W[h9 & 255] +
    W[(h9 >> 8) & 255] +
    W[(h9 >> 16) & 255] +
    W[(h9 >> 24) & 255] +
    '-' +
    W[t & 255] +
    W[(t >> 8) & 255] +
    '-' +
    W[((t >> 16) & 15) | 64] +
    W[(t >> 24) & 255] +
    '-' +
    W[(e & 63) | 128] +
    W[(e >> 8) & 255] +
    '-' +
    W[(e >> 16) & 255] +
    W[(e >> 24) & 255] +
    W[n & 255] +
    W[(n >> 8) & 255] +
    W[(n >> 16) & 255] +
    W[(n >> 24) & 255]
  ).toLowerCase();
}
function C(h9, t, e) {
  return Math.max(t, Math.min(e, h9));
}
function Mi(h9, t) {
  return ((h9 % t) + t) % t;
}
function ws(h9, t, e, n, i) {
  return n + ((h9 - t) * (i - n)) / (e - t);
}
function Cs(h9, t, e) {
  return h9 !== t ? (e - h9) / (t - h9) : 0;
}
function re(h9, t, e) {
  return (1 - e) * h9 + e * t;
}
function Rs(h9, t, e, n) {
  return re(h9, t, 1 - Math.exp(-e * n));
}
function Is(h9, t = 1) {
  return t - Math.abs(Mi(h9, t * 2) - t);
}
function Ps(h9, t, e) {
  return h9 <= t ? 0 : h9 >= e ? 1 : ((h9 = (h9 - t) / (e - t)), h9 * h9 * (3 - 2 * h9));
}
function Ls(h9, t, e) {
  return h9 <= t
    ? 0
    : h9 >= e
      ? 1
      : ((h9 = (h9 - t) / (e - t)), h9 * h9 * h9 * (h9 * (h9 * 6 - 15) + 10));
}
function Ds(h9, t) {
  return h9 + Math.floor(Math.random() * (t - h9 + 1));
}
function Ns(h9, t) {
  return h9 + Math.random() * (t - h9);
}
function Us(h9) {
  return h9 * (0.5 - Math.random());
}
function Fs(h9) {
  h9 !== void 0 && (Ni = h9);
  let t = (Ni += 1831565813);
  return (
    (t = Math.imul(t ^ (t >>> 15), t | 1)),
    (t ^= t + Math.imul(t ^ (t >>> 7), t | 61)),
    ((t ^ (t >>> 14)) >>> 0) / 4294967296
  );
}
function Os(h9) {
  return h9 * se;
}
function Bs(h9) {
  return h9 * le;
}
function zs(h9) {
  return (h9 & (h9 - 1)) === 0 && h9 !== 0;
}
function Vs(h9) {
  return Math.pow(2, Math.ceil(Math.log(h9) / Math.LN2));
}
function ks(h9) {
  return Math.pow(2, Math.floor(Math.log(h9) / Math.LN2));
}
function Gs(h9, t, e, n, i) {
  let s = Math.cos,
    r = Math.sin,
    a = s(e / 2),
    o = r(e / 2),
    l = s((t + n) / 2),
    c = r((t + n) / 2),
    u = s((t - n) / 2),
    d = r((t - n) / 2),
    f = s((n - t) / 2),
    p = r((n - t) / 2);
  switch (i) {
    case 'XYX':
      h9.set(a * c, o * u, o * d, a * l);
      break;
    case 'YZY':
      h9.set(o * d, a * c, o * u, a * l);
      break;
    case 'ZXZ':
      h9.set(o * u, o * d, a * c, a * l);
      break;
    case 'XZX':
      h9.set(a * c, o * p, o * f, a * l);
      break;
    case 'YXY':
      h9.set(o * f, a * c, o * p, a * l);
      break;
    case 'ZYZ':
      h9.set(o * p, o * f, a * c, a * l);
      break;
    default:
      z('MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: ' + i);
  }
}
function qt(h9, t) {
  switch (t.constructor) {
    case Float32Array:
      return h9;
    case Uint32Array:
      return h9 / 4294967295;
    case Uint16Array:
      return h9 / 65535;
    case Uint8Array:
      return h9 / 255;
    case Int32Array:
      return Math.max(h9 / 2147483647, -1);
    case Int16Array:
      return Math.max(h9 / 32767, -1);
    case Int8Array:
      return Math.max(h9 / 127, -1);
    default:
      throw new Error('THREE.MathUtils: Invalid component type.');
  }
}
function q(h9, t) {
  switch (t.constructor) {
    case Float32Array:
      return h9;
    case Uint32Array:
      return Math.round(h9 * 4294967295);
    case Uint16Array:
      return Math.round(h9 * 65535);
    case Uint8Array:
      return Math.round(h9 * 255);
    case Int32Array:
      return Math.round(h9 * 2147483647);
    case Int16Array:
      return Math.round(h9 * 32767);
    case Int8Array:
      return Math.round(h9 * 127);
    default:
      throw new Error('THREE.MathUtils: Invalid component type.');
  }
}
var ps = {
    DEG2RAD: se,
    RAD2DEG: le,
    generateUUID: Qt,
    clamp: C,
    euclideanModulo: Mi,
    mapLinear: ws,
    inverseLerp: Cs,
    lerp: re,
    damp: Rs,
    pingpong: Is,
    smoothstep: Ps,
    smootherstep: Ls,
    randInt: Ds,
    randFloat: Ns,
    randFloatSpread: Us,
    seededRandom: Fs,
    degToRad: Os,
    radToDeg: Bs,
    isPowerOfTwo: zs,
    ceilPowerOfTwo: Vs,
    floorPowerOfTwo: ks,
    setQuaternionFromProperEuler: Gs,
    normalize: q,
    denormalize: qt,
  },
  Ai = class {
    constructor(t = 0, e = 0) {
      ((this.x = t), (this.y = e));
    }
    get width() {
      return this.x;
    }
    set width(t) {
      this.x = t;
    }
    get height() {
      return this.y;
    }
    set height(t) {
      this.y = t;
    }
    set(t, e) {
      return ((this.x = t), (this.y = e), this);
    }
    setScalar(t) {
      return ((this.x = t), (this.y = t), this);
    }
    setX(t) {
      return ((this.x = t), this);
    }
    setY(t) {
      return ((this.y = t), this);
    }
    setComponent(t, e) {
      switch (t) {
        case 0:
          this.x = e;
          break;
        case 1:
          this.y = e;
          break;
        default:
          throw new Error('THREE.Vector2: index is out of range: ' + t);
      }
      return this;
    }
    getComponent(t) {
      switch (t) {
        case 0:
          return this.x;
        case 1:
          return this.y;
        default:
          throw new Error('THREE.Vector2: index is out of range: ' + t);
      }
    }
    clone() {
      return new this.constructor(this.x, this.y);
    }
    copy(t) {
      return ((this.x = t.x), (this.y = t.y), this);
    }
    add(t) {
      return ((this.x += t.x), (this.y += t.y), this);
    }
    addScalar(t) {
      return ((this.x += t), (this.y += t), this);
    }
    addVectors(t, e) {
      return ((this.x = t.x + e.x), (this.y = t.y + e.y), this);
    }
    addScaledVector(t, e) {
      return ((this.x += t.x * e), (this.y += t.y * e), this);
    }
    sub(t) {
      return ((this.x -= t.x), (this.y -= t.y), this);
    }
    subScalar(t) {
      return ((this.x -= t), (this.y -= t), this);
    }
    subVectors(t, e) {
      return ((this.x = t.x - e.x), (this.y = t.y - e.y), this);
    }
    multiply(t) {
      return ((this.x *= t.x), (this.y *= t.y), this);
    }
    multiplyScalar(t) {
      return ((this.x *= t), (this.y *= t), this);
    }
    divide(t) {
      return ((this.x /= t.x), (this.y /= t.y), this);
    }
    divideScalar(t) {
      return this.multiplyScalar(1 / t);
    }
    applyMatrix3(t) {
      let e = this.x,
        n = this.y,
        i = t.elements;
      return ((this.x = i[0] * e + i[3] * n + i[6]), (this.y = i[1] * e + i[4] * n + i[7]), this);
    }
    min(t) {
      return ((this.x = Math.min(this.x, t.x)), (this.y = Math.min(this.y, t.y)), this);
    }
    max(t) {
      return ((this.x = Math.max(this.x, t.x)), (this.y = Math.max(this.y, t.y)), this);
    }
    clamp(t, e) {
      return ((this.x = C(this.x, t.x, e.x)), (this.y = C(this.y, t.y, e.y)), this);
    }
    clampScalar(t, e) {
      return ((this.x = C(this.x, t, e)), (this.y = C(this.y, t, e)), this);
    }
    clampLength(t, e) {
      let n = this.length();
      return this.divideScalar(n || 1).multiplyScalar(C(n, t, e));
    }
    floor() {
      return ((this.x = Math.floor(this.x)), (this.y = Math.floor(this.y)), this);
    }
    ceil() {
      return ((this.x = Math.ceil(this.x)), (this.y = Math.ceil(this.y)), this);
    }
    round() {
      return ((this.x = Math.round(this.x)), (this.y = Math.round(this.y)), this);
    }
    roundToZero() {
      return ((this.x = Math.trunc(this.x)), (this.y = Math.trunc(this.y)), this);
    }
    negate() {
      return ((this.x = -this.x), (this.y = -this.y), this);
    }
    dot(t) {
      return this.x * t.x + this.y * t.y;
    }
    cross(t) {
      return this.x * t.y - this.y * t.x;
    }
    lengthSq() {
      return this.x * this.x + this.y * this.y;
    }
    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    manhattanLength() {
      return Math.abs(this.x) + Math.abs(this.y);
    }
    normalize() {
      return this.divideScalar(this.length() || 1);
    }
    angle() {
      return Math.atan2(-this.y, -this.x) + Math.PI;
    }
    angleTo(t) {
      let e = Math.sqrt(this.lengthSq() * t.lengthSq());
      if (e === 0) return Math.PI / 2;
      let n = this.dot(t) / e;
      return Math.acos(C(n, -1, 1));
    }
    distanceTo(t) {
      return Math.sqrt(this.distanceToSquared(t));
    }
    distanceToSquared(t) {
      let e = this.x - t.x,
        n = this.y - t.y;
      return e * e + n * n;
    }
    manhattanDistanceTo(t) {
      return Math.abs(this.x - t.x) + Math.abs(this.y - t.y);
    }
    setLength(t) {
      return this.normalize().multiplyScalar(t);
    }
    lerp(t, e) {
      return ((this.x += (t.x - this.x) * e), (this.y += (t.y - this.y) * e), this);
    }
    lerpVectors(t, e, n) {
      return ((this.x = t.x + (e.x - t.x) * n), (this.y = t.y + (e.y - t.y) * n), this);
    }
    equals(t) {
      return t.x === this.x && t.y === this.y;
    }
    fromArray(t, e = 0) {
      return ((this.x = t[e]), (this.y = t[e + 1]), this);
    }
    toArray(t = [], e = 0) {
      return ((t[e] = this.x), (t[e + 1] = this.y), t);
    }
    fromBufferAttribute(t, e) {
      return ((this.x = t.getX(e)), (this.y = t.getY(e)), this);
    }
    rotateAround(t, e) {
      let n = Math.cos(e),
        i = Math.sin(e),
        s = this.x - t.x,
        r = this.y - t.y;
      return ((this.x = s * n - r * i + t.x), (this.y = s * i + r * n + t.y), this);
    }
    random() {
      return ((this.x = Math.random()), (this.y = Math.random()), this);
    }
    *[Symbol.iterator]() {
      (yield this.x, yield this.y);
    }
  };
Ai.prototype.isVector2 = !0;
var B = Ai,
  rt = class {
    constructor(t = 0, e = 0, n = 0, i = 1) {
      ((this.isQuaternion = !0), (this._x = t), (this._y = e), (this._z = n), (this._w = i));
    }
    static slerpFlat(t, e, n, i, s, r, a) {
      let o = n[i + 0],
        l = n[i + 1],
        c = n[i + 2],
        u = n[i + 3],
        d = s[r + 0],
        f = s[r + 1],
        p = s[r + 2],
        m = s[r + 3];
      if (u !== m || o !== d || l !== f || c !== p) {
        let _ = o * d + l * f + c * p + u * m;
        _ < 0 && ((d = -d), (f = -f), (p = -p), (m = -m), (_ = -_));
        let x = 1 - a;
        if (_ < 0.9995) {
          let y = Math.acos(_),
            S = Math.sin(y);
          ((x = Math.sin(x * y) / S),
            (a = Math.sin(a * y) / S),
            (o = o * x + d * a),
            (l = l * x + f * a),
            (c = c * x + p * a),
            (u = u * x + m * a));
        } else {
          ((o = o * x + d * a), (l = l * x + f * a), (c = c * x + p * a), (u = u * x + m * a));
          let y = 1 / Math.sqrt(o * o + l * l + c * c + u * u);
          ((o *= y), (l *= y), (c *= y), (u *= y));
        }
      }
      ((t[e] = o), (t[e + 1] = l), (t[e + 2] = c), (t[e + 3] = u));
    }
    static multiplyQuaternionsFlat(t, e, n, i, s, r) {
      let a = n[i],
        o = n[i + 1],
        l = n[i + 2],
        c = n[i + 3],
        u = s[r],
        d = s[r + 1],
        f = s[r + 2],
        p = s[r + 3];
      return (
        (t[e] = a * p + c * u + o * f - l * d),
        (t[e + 1] = o * p + c * d + l * u - a * f),
        (t[e + 2] = l * p + c * f + a * d - o * u),
        (t[e + 3] = c * p - a * u - o * d - l * f),
        t
      );
    }
    get x() {
      return this._x;
    }
    set x(t) {
      ((this._x = t), this._onChangeCallback());
    }
    get y() {
      return this._y;
    }
    set y(t) {
      ((this._y = t), this._onChangeCallback());
    }
    get z() {
      return this._z;
    }
    set z(t) {
      ((this._z = t), this._onChangeCallback());
    }
    get w() {
      return this._w;
    }
    set w(t) {
      ((this._w = t), this._onChangeCallback());
    }
    set(t, e, n, i) {
      return (
        (this._x = t),
        (this._y = e),
        (this._z = n),
        (this._w = i),
        this._onChangeCallback(),
        this
      );
    }
    clone() {
      return new this.constructor(this._x, this._y, this._z, this._w);
    }
    copy(t) {
      return (
        (this._x = t.x),
        (this._y = t.y),
        (this._z = t.z),
        (this._w = t.w),
        this._onChangeCallback(),
        this
      );
    }
    setFromEuler(t, e = !0) {
      let n = t._x,
        i = t._y,
        s = t._z,
        r = t._order,
        a = Math.cos,
        o = Math.sin,
        l = a(n / 2),
        c = a(i / 2),
        u = a(s / 2),
        d = o(n / 2),
        f = o(i / 2),
        p = o(s / 2);
      switch (r) {
        case 'XYZ':
          ((this._x = d * c * u + l * f * p),
            (this._y = l * f * u - d * c * p),
            (this._z = l * c * p + d * f * u),
            (this._w = l * c * u - d * f * p));
          break;
        case 'YXZ':
          ((this._x = d * c * u + l * f * p),
            (this._y = l * f * u - d * c * p),
            (this._z = l * c * p - d * f * u),
            (this._w = l * c * u + d * f * p));
          break;
        case 'ZXY':
          ((this._x = d * c * u - l * f * p),
            (this._y = l * f * u + d * c * p),
            (this._z = l * c * p + d * f * u),
            (this._w = l * c * u - d * f * p));
          break;
        case 'ZYX':
          ((this._x = d * c * u - l * f * p),
            (this._y = l * f * u + d * c * p),
            (this._z = l * c * p - d * f * u),
            (this._w = l * c * u + d * f * p));
          break;
        case 'YZX':
          ((this._x = d * c * u + l * f * p),
            (this._y = l * f * u + d * c * p),
            (this._z = l * c * p - d * f * u),
            (this._w = l * c * u - d * f * p));
          break;
        case 'XZY':
          ((this._x = d * c * u - l * f * p),
            (this._y = l * f * u - d * c * p),
            (this._z = l * c * p + d * f * u),
            (this._w = l * c * u + d * f * p));
          break;
        default:
          z('Quaternion: .setFromEuler() encountered an unknown order: ' + r);
      }
      return (e === !0 && this._onChangeCallback(), this);
    }
    setFromAxisAngle(t, e) {
      let n = e / 2,
        i = Math.sin(n);
      return (
        (this._x = t.x * i),
        (this._y = t.y * i),
        (this._z = t.z * i),
        (this._w = Math.cos(n)),
        this._onChangeCallback(),
        this
      );
    }
    setFromRotationMatrix(t) {
      let e = t.elements,
        n = e[0],
        i = e[4],
        s = e[8],
        r = e[1],
        a = e[5],
        o = e[9],
        l = e[2],
        c = e[6],
        u = e[10],
        d = n + a + u;
      if (d > 0) {
        let f = 0.5 / Math.sqrt(d + 1);
        ((this._w = 0.25 / f),
          (this._x = (c - o) * f),
          (this._y = (s - l) * f),
          (this._z = (r - i) * f));
      } else if (n > a && n > u) {
        let f = 2 * Math.sqrt(1 + n - a - u);
        ((this._w = (c - o) / f),
          (this._x = 0.25 * f),
          (this._y = (i + r) / f),
          (this._z = (s + l) / f));
      } else if (a > u) {
        let f = 2 * Math.sqrt(1 + a - n - u);
        ((this._w = (s - l) / f),
          (this._x = (i + r) / f),
          (this._y = 0.25 * f),
          (this._z = (o + c) / f));
      } else {
        let f = 2 * Math.sqrt(1 + u - n - a);
        ((this._w = (r - i) / f),
          (this._x = (s + l) / f),
          (this._y = (o + c) / f),
          (this._z = 0.25 * f));
      }
      return (this._onChangeCallback(), this);
    }
    setFromUnitVectors(t, e) {
      let n = t.dot(e) + 1;
      return (
        n < 1e-8
          ? ((n = 0),
            Math.abs(t.x) > Math.abs(t.z)
              ? ((this._x = -t.y), (this._y = t.x), (this._z = 0), (this._w = n))
              : ((this._x = 0), (this._y = -t.z), (this._z = t.y), (this._w = n)))
          : ((this._x = t.y * e.z - t.z * e.y),
            (this._y = t.z * e.x - t.x * e.z),
            (this._z = t.x * e.y - t.y * e.x),
            (this._w = n)),
        this.normalize()
      );
    }
    angleTo(t) {
      return 2 * Math.acos(Math.abs(C(this.dot(t), -1, 1)));
    }
    rotateTowards(t, e) {
      let n = this.angleTo(t);
      if (n === 0) return this;
      let i = Math.min(1, e / n);
      return (this.slerp(t, i), this);
    }
    identity() {
      return this.set(0, 0, 0, 1);
    }
    invert() {
      return this.conjugate();
    }
    conjugate() {
      return ((this._x *= -1), (this._y *= -1), (this._z *= -1), this._onChangeCallback(), this);
    }
    dot(t) {
      return this._x * t._x + this._y * t._y + this._z * t._z + this._w * t._w;
    }
    lengthSq() {
      return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w;
    }
    length() {
      return Math.sqrt(
        this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w
      );
    }
    normalize() {
      let t = this.length();
      return (
        t === 0
          ? ((this._x = 0), (this._y = 0), (this._z = 0), (this._w = 1))
          : ((t = 1 / t),
            (this._x = this._x * t),
            (this._y = this._y * t),
            (this._z = this._z * t),
            (this._w = this._w * t)),
        this._onChangeCallback(),
        this
      );
    }
    multiply(t) {
      return this.multiplyQuaternions(this, t);
    }
    premultiply(t) {
      return this.multiplyQuaternions(t, this);
    }
    multiplyQuaternions(t, e) {
      let n = t._x,
        i = t._y,
        s = t._z,
        r = t._w,
        a = e._x,
        o = e._y,
        l = e._z,
        c = e._w;
      return (
        (this._x = n * c + r * a + i * l - s * o),
        (this._y = i * c + r * o + s * a - n * l),
        (this._z = s * c + r * l + n * o - i * a),
        (this._w = r * c - n * a - i * o - s * l),
        this._onChangeCallback(),
        this
      );
    }
    slerp(t, e) {
      let n = t._x,
        i = t._y,
        s = t._z,
        r = t._w,
        a = this.dot(t);
      a < 0 && ((n = -n), (i = -i), (s = -s), (r = -r), (a = -a));
      let o = 1 - e;
      if (a < 0.9995) {
        let l = Math.acos(a),
          c = Math.sin(l);
        ((o = Math.sin(o * l) / c),
          (e = Math.sin(e * l) / c),
          (this._x = this._x * o + n * e),
          (this._y = this._y * o + i * e),
          (this._z = this._z * o + s * e),
          (this._w = this._w * o + r * e),
          this._onChangeCallback());
      } else
        ((this._x = this._x * o + n * e),
          (this._y = this._y * o + i * e),
          (this._z = this._z * o + s * e),
          (this._w = this._w * o + r * e),
          this.normalize());
      return this;
    }
    slerpQuaternions(t, e, n) {
      return this.copy(t).slerp(e, n);
    }
    random() {
      let t = 2 * Math.PI * Math.random(),
        e = 2 * Math.PI * Math.random(),
        n = Math.random(),
        i = Math.sqrt(1 - n),
        s = Math.sqrt(n);
      return this.set(i * Math.sin(t), i * Math.cos(t), s * Math.sin(e), s * Math.cos(e));
    }
    equals(t) {
      return t._x === this._x && t._y === this._y && t._z === this._z && t._w === this._w;
    }
    fromArray(t, e = 0) {
      return (
        (this._x = t[e]),
        (this._y = t[e + 1]),
        (this._z = t[e + 2]),
        (this._w = t[e + 3]),
        this._onChangeCallback(),
        this
      );
    }
    toArray(t = [], e = 0) {
      return (
        (t[e] = this._x),
        (t[e + 1] = this._y),
        (t[e + 2] = this._z),
        (t[e + 3] = this._w),
        t
      );
    }
    fromBufferAttribute(t, e) {
      return (
        (this._x = t.getX(e)),
        (this._y = t.getY(e)),
        (this._z = t.getZ(e)),
        (this._w = t.getW(e)),
        this._onChangeCallback(),
        this
      );
    }
    toJSON() {
      return this.toArray();
    }
    _onChange(t) {
      return ((this._onChangeCallback = t), this);
    }
    _onChangeCallback() {}
    *[Symbol.iterator]() {
      (yield this._x, yield this._y, yield this._z, yield this._w);
    }
  },
  Ei = class {
    constructor(t = 0, e = 0, n = 0) {
      ((this.x = t), (this.y = e), (this.z = n));
    }
    set(t, e, n) {
      return (n === void 0 && (n = this.z), (this.x = t), (this.y = e), (this.z = n), this);
    }
    setScalar(t) {
      return ((this.x = t), (this.y = t), (this.z = t), this);
    }
    setX(t) {
      return ((this.x = t), this);
    }
    setY(t) {
      return ((this.y = t), this);
    }
    setZ(t) {
      return ((this.z = t), this);
    }
    setComponent(t, e) {
      switch (t) {
        case 0:
          this.x = e;
          break;
        case 1:
          this.y = e;
          break;
        case 2:
          this.z = e;
          break;
        default:
          throw new Error('THREE.Vector3: index is out of range: ' + t);
      }
      return this;
    }
    getComponent(t) {
      switch (t) {
        case 0:
          return this.x;
        case 1:
          return this.y;
        case 2:
          return this.z;
        default:
          throw new Error('THREE.Vector3: index is out of range: ' + t);
      }
    }
    clone() {
      return new this.constructor(this.x, this.y, this.z);
    }
    copy(t) {
      return ((this.x = t.x), (this.y = t.y), (this.z = t.z), this);
    }
    add(t) {
      return ((this.x += t.x), (this.y += t.y), (this.z += t.z), this);
    }
    addScalar(t) {
      return ((this.x += t), (this.y += t), (this.z += t), this);
    }
    addVectors(t, e) {
      return ((this.x = t.x + e.x), (this.y = t.y + e.y), (this.z = t.z + e.z), this);
    }
    addScaledVector(t, e) {
      return ((this.x += t.x * e), (this.y += t.y * e), (this.z += t.z * e), this);
    }
    sub(t) {
      return ((this.x -= t.x), (this.y -= t.y), (this.z -= t.z), this);
    }
    subScalar(t) {
      return ((this.x -= t), (this.y -= t), (this.z -= t), this);
    }
    subVectors(t, e) {
      return ((this.x = t.x - e.x), (this.y = t.y - e.y), (this.z = t.z - e.z), this);
    }
    multiply(t) {
      return ((this.x *= t.x), (this.y *= t.y), (this.z *= t.z), this);
    }
    multiplyScalar(t) {
      return ((this.x *= t), (this.y *= t), (this.z *= t), this);
    }
    multiplyVectors(t, e) {
      return ((this.x = t.x * e.x), (this.y = t.y * e.y), (this.z = t.z * e.z), this);
    }
    applyEuler(t) {
      return this.applyQuaternion(Ui.setFromEuler(t));
    }
    applyAxisAngle(t, e) {
      return this.applyQuaternion(Ui.setFromAxisAngle(t, e));
    }
    applyMatrix3(t) {
      let e = this.x,
        n = this.y,
        i = this.z,
        s = t.elements;
      return (
        (this.x = s[0] * e + s[3] * n + s[6] * i),
        (this.y = s[1] * e + s[4] * n + s[7] * i),
        (this.z = s[2] * e + s[5] * n + s[8] * i),
        this
      );
    }
    applyNormalMatrix(t) {
      return this.applyMatrix3(t).normalize();
    }
    applyMatrix4(t) {
      let e = this.x,
        n = this.y,
        i = this.z,
        s = t.elements,
        r = 1 / (s[3] * e + s[7] * n + s[11] * i + s[15]);
      return (
        (this.x = (s[0] * e + s[4] * n + s[8] * i + s[12]) * r),
        (this.y = (s[1] * e + s[5] * n + s[9] * i + s[13]) * r),
        (this.z = (s[2] * e + s[6] * n + s[10] * i + s[14]) * r),
        this
      );
    }
    applyQuaternion(t) {
      let e = this.x,
        n = this.y,
        i = this.z,
        s = t.x,
        r = t.y,
        a = t.z,
        o = t.w,
        l = 2 * (r * i - a * n),
        c = 2 * (a * e - s * i),
        u = 2 * (s * n - r * e);
      return (
        (this.x = e + o * l + r * u - a * c),
        (this.y = n + o * c + a * l - s * u),
        (this.z = i + o * u + s * c - r * l),
        this
      );
    }
    project(t) {
      return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix);
    }
    unproject(t) {
      return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld);
    }
    transformDirection(t) {
      let e = this.x,
        n = this.y,
        i = this.z,
        s = t.elements;
      return (
        (this.x = s[0] * e + s[4] * n + s[8] * i),
        (this.y = s[1] * e + s[5] * n + s[9] * i),
        (this.z = s[2] * e + s[6] * n + s[10] * i),
        this.normalize()
      );
    }
    divide(t) {
      return ((this.x /= t.x), (this.y /= t.y), (this.z /= t.z), this);
    }
    divideScalar(t) {
      return this.multiplyScalar(1 / t);
    }
    min(t) {
      return (
        (this.x = Math.min(this.x, t.x)),
        (this.y = Math.min(this.y, t.y)),
        (this.z = Math.min(this.z, t.z)),
        this
      );
    }
    max(t) {
      return (
        (this.x = Math.max(this.x, t.x)),
        (this.y = Math.max(this.y, t.y)),
        (this.z = Math.max(this.z, t.z)),
        this
      );
    }
    clamp(t, e) {
      return (
        (this.x = C(this.x, t.x, e.x)),
        (this.y = C(this.y, t.y, e.y)),
        (this.z = C(this.z, t.z, e.z)),
        this
      );
    }
    clampScalar(t, e) {
      return (
        (this.x = C(this.x, t, e)),
        (this.y = C(this.y, t, e)),
        (this.z = C(this.z, t, e)),
        this
      );
    }
    clampLength(t, e) {
      let n = this.length();
      return this.divideScalar(n || 1).multiplyScalar(C(n, t, e));
    }
    floor() {
      return (
        (this.x = Math.floor(this.x)),
        (this.y = Math.floor(this.y)),
        (this.z = Math.floor(this.z)),
        this
      );
    }
    ceil() {
      return (
        (this.x = Math.ceil(this.x)),
        (this.y = Math.ceil(this.y)),
        (this.z = Math.ceil(this.z)),
        this
      );
    }
    round() {
      return (
        (this.x = Math.round(this.x)),
        (this.y = Math.round(this.y)),
        (this.z = Math.round(this.z)),
        this
      );
    }
    roundToZero() {
      return (
        (this.x = Math.trunc(this.x)),
        (this.y = Math.trunc(this.y)),
        (this.z = Math.trunc(this.z)),
        this
      );
    }
    negate() {
      return ((this.x = -this.x), (this.y = -this.y), (this.z = -this.z), this);
    }
    dot(t) {
      return this.x * t.x + this.y * t.y + this.z * t.z;
    }
    lengthSq() {
      return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    manhattanLength() {
      return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z);
    }
    normalize() {
      return this.divideScalar(this.length() || 1);
    }
    setLength(t) {
      return this.normalize().multiplyScalar(t);
    }
    lerp(t, e) {
      return (
        (this.x += (t.x - this.x) * e),
        (this.y += (t.y - this.y) * e),
        (this.z += (t.z - this.z) * e),
        this
      );
    }
    lerpVectors(t, e, n) {
      return (
        (this.x = t.x + (e.x - t.x) * n),
        (this.y = t.y + (e.y - t.y) * n),
        (this.z = t.z + (e.z - t.z) * n),
        this
      );
    }
    cross(t) {
      return this.crossVectors(this, t);
    }
    crossVectors(t, e) {
      let n = t.x,
        i = t.y,
        s = t.z,
        r = e.x,
        a = e.y,
        o = e.z;
      return ((this.x = i * o - s * a), (this.y = s * r - n * o), (this.z = n * a - i * r), this);
    }
    projectOnVector(t) {
      let e = t.lengthSq();
      if (e === 0) return this.set(0, 0, 0);
      let n = t.dot(this) / e;
      return this.copy(t).multiplyScalar(n);
    }
    projectOnPlane(t) {
      return (vn.copy(this).projectOnVector(t), this.sub(vn));
    }
    reflect(t) {
      return this.sub(vn.copy(t).multiplyScalar(2 * this.dot(t)));
    }
    angleTo(t) {
      let e = Math.sqrt(this.lengthSq() * t.lengthSq());
      if (e === 0) return Math.PI / 2;
      let n = this.dot(t) / e;
      return Math.acos(C(n, -1, 1));
    }
    distanceTo(t) {
      return Math.sqrt(this.distanceToSquared(t));
    }
    distanceToSquared(t) {
      let e = this.x - t.x,
        n = this.y - t.y,
        i = this.z - t.z;
      return e * e + n * n + i * i;
    }
    manhattanDistanceTo(t) {
      return Math.abs(this.x - t.x) + Math.abs(this.y - t.y) + Math.abs(this.z - t.z);
    }
    setFromSpherical(t) {
      return this.setFromSphericalCoords(t.radius, t.phi, t.theta);
    }
    setFromSphericalCoords(t, e, n) {
      let i = Math.sin(e) * t;
      return (
        (this.x = i * Math.sin(n)),
        (this.y = Math.cos(e) * t),
        (this.z = i * Math.cos(n)),
        this
      );
    }
    setFromCylindrical(t) {
      return this.setFromCylindricalCoords(t.radius, t.theta, t.y);
    }
    setFromCylindricalCoords(t, e, n) {
      return ((this.x = t * Math.sin(e)), (this.y = n), (this.z = t * Math.cos(e)), this);
    }
    setFromMatrixPosition(t) {
      let e = t.elements;
      return ((this.x = e[12]), (this.y = e[13]), (this.z = e[14]), this);
    }
    setFromMatrixScale(t) {
      let e = this.setFromMatrixColumn(t, 0).length(),
        n = this.setFromMatrixColumn(t, 1).length(),
        i = this.setFromMatrixColumn(t, 2).length();
      return ((this.x = e), (this.y = n), (this.z = i), this);
    }
    setFromMatrixColumn(t, e) {
      return this.fromArray(t.elements, e * 4);
    }
    setFromMatrix3Column(t, e) {
      return this.fromArray(t.elements, e * 3);
    }
    setFromEuler(t) {
      return ((this.x = t._x), (this.y = t._y), (this.z = t._z), this);
    }
    setFromColor(t) {
      return ((this.x = t.r), (this.y = t.g), (this.z = t.b), this);
    }
    equals(t) {
      return t.x === this.x && t.y === this.y && t.z === this.z;
    }
    fromArray(t, e = 0) {
      return ((this.x = t[e]), (this.y = t[e + 1]), (this.z = t[e + 2]), this);
    }
    toArray(t = [], e = 0) {
      return ((t[e] = this.x), (t[e + 1] = this.y), (t[e + 2] = this.z), t);
    }
    fromBufferAttribute(t, e) {
      return ((this.x = t.getX(e)), (this.y = t.getY(e)), (this.z = t.getZ(e)), this);
    }
    random() {
      return ((this.x = Math.random()), (this.y = Math.random()), (this.z = Math.random()), this);
    }
    randomDirection() {
      let t = Math.random() * Math.PI * 2,
        e = Math.random() * 2 - 1,
        n = Math.sqrt(1 - e * e);
      return ((this.x = n * Math.cos(t)), (this.y = e), (this.z = n * Math.sin(t)), this);
    }
    *[Symbol.iterator]() {
      (yield this.x, yield this.y, yield this.z);
    }
  };
Ei.prototype.isVector3 = !0;
var g = Ei,
  vn = new g(),
  Ui = new rt(),
  wi = class {
    constructor(t, e, n, i, s, r, a, o, l) {
      ((this.elements = [1, 0, 0, 0, 1, 0, 0, 0, 1]),
        t !== void 0 && this.set(t, e, n, i, s, r, a, o, l));
    }
    set(t, e, n, i, s, r, a, o, l) {
      let c = this.elements;
      return (
        (c[0] = t),
        (c[1] = i),
        (c[2] = a),
        (c[3] = e),
        (c[4] = s),
        (c[5] = o),
        (c[6] = n),
        (c[7] = r),
        (c[8] = l),
        this
      );
    }
    identity() {
      return (this.set(1, 0, 0, 0, 1, 0, 0, 0, 1), this);
    }
    copy(t) {
      let e = this.elements,
        n = t.elements;
      return (
        (e[0] = n[0]),
        (e[1] = n[1]),
        (e[2] = n[2]),
        (e[3] = n[3]),
        (e[4] = n[4]),
        (e[5] = n[5]),
        (e[6] = n[6]),
        (e[7] = n[7]),
        (e[8] = n[8]),
        this
      );
    }
    extractBasis(t, e, n) {
      return (
        t.setFromMatrix3Column(this, 0),
        e.setFromMatrix3Column(this, 1),
        n.setFromMatrix3Column(this, 2),
        this
      );
    }
    setFromMatrix4(t) {
      let e = t.elements;
      return (this.set(e[0], e[4], e[8], e[1], e[5], e[9], e[2], e[6], e[10]), this);
    }
    multiply(t) {
      return this.multiplyMatrices(this, t);
    }
    premultiply(t) {
      return this.multiplyMatrices(t, this);
    }
    multiplyMatrices(t, e) {
      let n = t.elements,
        i = e.elements,
        s = this.elements,
        r = n[0],
        a = n[3],
        o = n[6],
        l = n[1],
        c = n[4],
        u = n[7],
        d = n[2],
        f = n[5],
        p = n[8],
        m = i[0],
        _ = i[3],
        x = i[6],
        y = i[1],
        S = i[4],
        M = i[7],
        b = i[2],
        w = i[5],
        A = i[8];
      return (
        (s[0] = r * m + a * y + o * b),
        (s[3] = r * _ + a * S + o * w),
        (s[6] = r * x + a * M + o * A),
        (s[1] = l * m + c * y + u * b),
        (s[4] = l * _ + c * S + u * w),
        (s[7] = l * x + c * M + u * A),
        (s[2] = d * m + f * y + p * b),
        (s[5] = d * _ + f * S + p * w),
        (s[8] = d * x + f * M + p * A),
        this
      );
    }
    multiplyScalar(t) {
      let e = this.elements;
      return (
        (e[0] *= t),
        (e[3] *= t),
        (e[6] *= t),
        (e[1] *= t),
        (e[4] *= t),
        (e[7] *= t),
        (e[2] *= t),
        (e[5] *= t),
        (e[8] *= t),
        this
      );
    }
    determinant() {
      let t = this.elements,
        e = t[0],
        n = t[1],
        i = t[2],
        s = t[3],
        r = t[4],
        a = t[5],
        o = t[6],
        l = t[7],
        c = t[8];
      return e * r * c - e * a * l - n * s * c + n * a * o + i * s * l - i * r * o;
    }
    invert() {
      let t = this.elements,
        e = t[0],
        n = t[1],
        i = t[2],
        s = t[3],
        r = t[4],
        a = t[5],
        o = t[6],
        l = t[7],
        c = t[8],
        u = c * r - a * l,
        d = a * o - c * s,
        f = l * s - r * o,
        p = e * u + n * d + i * f;
      if (p === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0);
      let m = 1 / p;
      return (
        (t[0] = u * m),
        (t[1] = (i * l - c * n) * m),
        (t[2] = (a * n - i * r) * m),
        (t[3] = d * m),
        (t[4] = (c * e - i * o) * m),
        (t[5] = (i * s - a * e) * m),
        (t[6] = f * m),
        (t[7] = (n * o - l * e) * m),
        (t[8] = (r * e - n * s) * m),
        this
      );
    }
    transpose() {
      let t,
        e = this.elements;
      return (
        (t = e[1]),
        (e[1] = e[3]),
        (e[3] = t),
        (t = e[2]),
        (e[2] = e[6]),
        (e[6] = t),
        (t = e[5]),
        (e[5] = e[7]),
        (e[7] = t),
        this
      );
    }
    getNormalMatrix(t) {
      return this.setFromMatrix4(t).invert().transpose();
    }
    transposeIntoArray(t) {
      let e = this.elements;
      return (
        (t[0] = e[0]),
        (t[1] = e[3]),
        (t[2] = e[6]),
        (t[3] = e[1]),
        (t[4] = e[4]),
        (t[5] = e[7]),
        (t[6] = e[2]),
        (t[7] = e[5]),
        (t[8] = e[8]),
        this
      );
    }
    setUvTransform(t, e, n, i, s, r, a) {
      let o = Math.cos(s),
        l = Math.sin(s);
      return (
        this.set(
          n * o,
          n * l,
          -n * (o * r + l * a) + r + t,
          -i * l,
          i * o,
          -i * (-l * r + o * a) + a + e,
          0,
          0,
          1
        ),
        this
      );
    }
    scale(t, e) {
      return (
        Zt('Matrix3: .scale() is deprecated. Use .makeScale() instead.'),
        this.premultiply(yn.makeScale(t, e)),
        this
      );
    }
    rotate(t) {
      return (
        Zt('Matrix3: .rotate() is deprecated. Use .makeRotation() instead.'),
        this.premultiply(yn.makeRotation(-t)),
        this
      );
    }
    translate(t, e) {
      return (
        Zt('Matrix3: .translate() is deprecated. Use .makeTranslation() instead.'),
        this.premultiply(yn.makeTranslation(t, e)),
        this
      );
    }
    makeTranslation(t, e) {
      return (
        t.isVector2 ? this.set(1, 0, t.x, 0, 1, t.y, 0, 0, 1) : this.set(1, 0, t, 0, 1, e, 0, 0, 1),
        this
      );
    }
    makeRotation(t) {
      let e = Math.cos(t),
        n = Math.sin(t);
      return (this.set(e, -n, 0, n, e, 0, 0, 0, 1), this);
    }
    makeScale(t, e) {
      return (this.set(t, 0, 0, 0, e, 0, 0, 0, 1), this);
    }
    equals(t) {
      let e = this.elements,
        n = t.elements;
      for (let i = 0; i < 9; i++) if (e[i] !== n[i]) return !1;
      return !0;
    }
    fromArray(t, e = 0) {
      for (let n = 0; n < 9; n++) this.elements[n] = t[n + e];
      return this;
    }
    toArray(t = [], e = 0) {
      let n = this.elements;
      return (
        (t[e] = n[0]),
        (t[e + 1] = n[1]),
        (t[e + 2] = n[2]),
        (t[e + 3] = n[3]),
        (t[e + 4] = n[4]),
        (t[e + 5] = n[5]),
        (t[e + 6] = n[6]),
        (t[e + 7] = n[7]),
        (t[e + 8] = n[8]),
        t
      );
    }
    clone() {
      return new this.constructor().fromArray(this.elements);
    }
  };
wi.prototype.isMatrix3 = !0;
var E = wi,
  yn = new E(),
  Fi = new E().set(
    0.4123908,
    0.3575843,
    0.1804808,
    0.212639,
    0.7151687,
    0.0721923,
    0.0193308,
    0.1191948,
    0.9505322
  ),
  Oi = new E().set(
    3.2409699,
    -1.5373832,
    -0.4986108,
    -0.9692436,
    1.8759675,
    0.0415551,
    0.0556301,
    -0.203977,
    1.0569715
  );
function Hs() {
  let h9 = {
      enabled: !0,
      workingColorSpace: ei,
      spaces: {},
      convert: function (i, s, r) {
        return (
          this.enabled === !1 ||
            s === r ||
            !s ||
            !r ||
            (this.spaces[s].transfer === Ve && ((i.r = ft(i.r)), (i.g = ft(i.g)), (i.b = ft(i.b))),
            this.spaces[s].primaries !== this.spaces[r].primaries &&
              (i.applyMatrix3(this.spaces[s].toXYZ), i.applyMatrix3(this.spaces[r].fromXYZ)),
            this.spaces[r].transfer === Ve && ((i.r = Jt(i.r)), (i.g = Jt(i.g)), (i.b = Jt(i.b)))),
          i
        );
      },
      workingToColorSpace: function (i, s) {
        return this.convert(i, this.workingColorSpace, s);
      },
      colorSpaceToWorking: function (i, s) {
        return this.convert(i, s, this.workingColorSpace);
      },
      getPrimaries: function (i) {
        return this.spaces[i].primaries;
      },
      getTransfer: function (i) {
        return i === yi ? ni : this.spaces[i].transfer;
      },
      getToneMappingMode: function (i) {
        return this.spaces[i].outputColorSpaceConfig.toneMappingMode || 'standard';
      },
      getLuminanceCoefficients: function (i, s = this.workingColorSpace) {
        return i.fromArray(this.spaces[s].luminanceCoefficients);
      },
      define: function (i) {
        Object.assign(this.spaces, i);
      },
      _getMatrix: function (i, s, r) {
        return i.copy(this.spaces[s].toXYZ).multiply(this.spaces[r].fromXYZ);
      },
      _getDrawingBufferColorSpace: function (i) {
        return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace;
      },
      _getUnpackColorSpace: function (i = this.workingColorSpace) {
        return this.spaces[i].workingColorSpaceConfig.unpackColorSpace;
      },
      fromWorkingColorSpace: function (i, s) {
        return (
          Zt(
            'ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace().'
          ),
          h9.workingToColorSpace(i, s)
        );
      },
      toWorkingColorSpace: function (i, s) {
        return (
          Zt('ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking().'),
          h9.colorSpaceToWorking(i, s)
        );
      },
    },
    t = [0.64, 0.33, 0.3, 0.6, 0.15, 0.06],
    e = [0.2126, 0.7152, 0.0722],
    n = [0.3127, 0.329];
  return (
    h9.define({
      [ei]: {
        primaries: t,
        whitePoint: n,
        transfer: ni,
        toXYZ: Fi,
        fromXYZ: Oi,
        luminanceCoefficients: e,
        workingColorSpaceConfig: { unpackColorSpace: $ },
        outputColorSpaceConfig: { drawingBufferColorSpace: $ },
      },
      [$]: {
        primaries: t,
        whitePoint: n,
        transfer: Ve,
        toXYZ: Fi,
        fromXYZ: Oi,
        luminanceCoefficients: e,
        outputColorSpaceConfig: { drawingBufferColorSpace: $ },
      },
    }),
    h9
  );
}
var tt = Hs();
function ft(h9) {
  return h9 < 0.04045 ? h9 * 0.0773993808 : Math.pow(h9 * 0.9478672986 + 0.0521327014, 2.4);
}
function Jt(h9) {
  return h9 < 31308e-7 ? h9 * 12.92 : 1.055 * Math.pow(h9, 0.41666) - 0.055;
}
var Ft,
  Xe = class {
    static getDataURL(t, e = 'image/png') {
      if (/^data:/i.test(t.src) || typeof HTMLCanvasElement == 'undefined') return t.src;
      let n;
      if (t instanceof HTMLCanvasElement) n = t;
      else {
        (Ft === void 0 && (Ft = ai('canvas')), (Ft.width = t.width), (Ft.height = t.height));
        let i = Ft.getContext('2d');
        (t instanceof ImageData ? i.putImageData(t, 0, 0) : i.drawImage(t, 0, 0, t.width, t.height),
          (n = Ft));
      }
      return n.toDataURL(e);
    }
    static sRGBToLinear(t) {
      if (
        (typeof HTMLImageElement != 'undefined' && t instanceof HTMLImageElement) ||
        (typeof HTMLCanvasElement != 'undefined' && t instanceof HTMLCanvasElement) ||
        (typeof ImageBitmap != 'undefined' && t instanceof ImageBitmap)
      ) {
        let e = ai('canvas');
        ((e.width = t.width), (e.height = t.height));
        let n = e.getContext('2d');
        n.drawImage(t, 0, 0, t.width, t.height);
        let i = n.getImageData(0, 0, t.width, t.height),
          s = i.data;
        for (let r = 0; r < s.length; r++) s[r] = ft(s[r] / 255) * 255;
        return (n.putImageData(i, 0, 0), e);
      } else if (t.data) {
        let e = t.data.slice(0);
        for (let n = 0; n < e.length; n++)
          e instanceof Uint8Array || e instanceof Uint8ClampedArray
            ? (e[n] = Math.floor(ft(e[n] / 255) * 255))
            : (e[n] = ft(e[n]));
        return { data: e, width: t.width, height: t.height };
      } else
        return (
          z(
            'ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied.'
          ),
          t
        );
    }
  },
  Ws = 0,
  qe = class {
    constructor(t = null) {
      ((this.isSource = !0),
        Object.defineProperty(this, 'id', { value: Ws++ }),
        (this.uuid = Qt()),
        (this.data = t),
        (this.dataReady = !0),
        (this.version = 0));
    }
    getSize(t) {
      let e = this.data;
      return (
        typeof HTMLVideoElement != 'undefined' && e instanceof HTMLVideoElement
          ? t.set(e.videoWidth, e.videoHeight, 0)
          : typeof VideoFrame != 'undefined' && e instanceof VideoFrame
            ? t.set(e.displayWidth, e.displayHeight, 0)
            : e !== null
              ? t.set(e.width, e.height, e.depth || 0)
              : t.set(0, 0, 0),
        t
      );
    }
    set needsUpdate(t) {
      t === !0 && this.version++;
    }
    toJSON(t) {
      let e = t === void 0 || typeof t == 'string';
      if (!e && t.images[this.uuid] !== void 0) return t.images[this.uuid];
      let n = { uuid: this.uuid, url: '' },
        i = this.data;
      if (i !== null) {
        let s;
        if (Array.isArray(i)) {
          s = [];
          for (let r = 0, a = i.length; r < a; r++)
            i[r].isDataTexture ? s.push(Mn(i[r].image)) : s.push(Mn(i[r]));
        } else s = Mn(i);
        n.url = s;
      }
      return (e || (t.images[this.uuid] = n), n);
    }
  };
function Mn(h9) {
  return (typeof HTMLImageElement != 'undefined' && h9 instanceof HTMLImageElement) ||
    (typeof HTMLCanvasElement != 'undefined' && h9 instanceof HTMLCanvasElement) ||
    (typeof ImageBitmap != 'undefined' && h9 instanceof ImageBitmap)
    ? Xe.getDataURL(h9)
    : h9.data
      ? {
          data: Array.from(h9.data),
          width: h9.width,
          height: h9.height,
          type: h9.data.constructor.name,
        }
      : (z('Texture: Unable to serialize Texture.'), {});
}
var Xs = 0,
  Sn = new g(),
  Dt = class h extends Mt {
    constructor(
      t = h.DEFAULT_IMAGE,
      e = h.DEFAULT_MAPPING,
      n = ie,
      i = ie,
      s = ls,
      r = cs,
      a = ds,
      o = hs,
      l = h.DEFAULT_ANISOTROPY,
      c = yi
    ) {
      (super(),
        (this.isTexture = !0),
        Object.defineProperty(this, 'id', { value: Xs++ }),
        (this.uuid = Qt()),
        (this.name = ''),
        (this.source = new qe(t)),
        (this.mipmaps = []),
        (this.mapping = e),
        (this.channel = 0),
        (this.wrapS = n),
        (this.wrapT = i),
        (this.magFilter = s),
        (this.minFilter = r),
        (this.anisotropy = l),
        (this.format = a),
        (this.internalFormat = null),
        (this.type = o),
        (this.offset = new B(0, 0)),
        (this.repeat = new B(1, 1)),
        (this.center = new B(0, 0)),
        (this.rotation = 0),
        (this.matrixAutoUpdate = !0),
        (this.matrix = new E()),
        (this.generateMipmaps = !0),
        (this.premultiplyAlpha = !1),
        (this.flipY = !0),
        (this.unpackAlignment = 4),
        (this.colorSpace = c),
        (this.userData = {}),
        (this.updateRanges = []),
        (this.version = 0),
        (this.onUpdate = null),
        (this.renderTarget = null),
        (this.isRenderTargetTexture = !1),
        (this.isArrayTexture = !!(t && t.depth && t.depth > 1)),
        (this.pmremVersion = 0),
        (this.normalized = !1));
    }
    get width() {
      return this.source.getSize(Sn).x;
    }
    get height() {
      return this.source.getSize(Sn).y;
    }
    get depth() {
      return this.source.getSize(Sn).z;
    }
    get image() {
      return this.source.data;
    }
    set image(t) {
      this.source.data = t;
    }
    updateMatrix() {
      this.matrix.setUvTransform(
        this.offset.x,
        this.offset.y,
        this.repeat.x,
        this.repeat.y,
        this.rotation,
        this.center.x,
        this.center.y
      );
    }
    addUpdateRange(t, e) {
      this.updateRanges.push({ start: t, count: e });
    }
    clearUpdateRanges() {
      this.updateRanges.length = 0;
    }
    clone() {
      return new this.constructor().copy(this);
    }
    copy(t) {
      return (
        (this.name = t.name),
        (this.source = t.source),
        (this.mipmaps = t.mipmaps.slice(0)),
        (this.mapping = t.mapping),
        (this.channel = t.channel),
        (this.wrapS = t.wrapS),
        (this.wrapT = t.wrapT),
        (this.magFilter = t.magFilter),
        (this.minFilter = t.minFilter),
        (this.anisotropy = t.anisotropy),
        (this.format = t.format),
        (this.internalFormat = t.internalFormat),
        (this.type = t.type),
        (this.normalized = t.normalized),
        this.offset.copy(t.offset),
        this.repeat.copy(t.repeat),
        this.center.copy(t.center),
        (this.rotation = t.rotation),
        (this.matrixAutoUpdate = t.matrixAutoUpdate),
        this.matrix.copy(t.matrix),
        (this.generateMipmaps = t.generateMipmaps),
        (this.premultiplyAlpha = t.premultiplyAlpha),
        (this.flipY = t.flipY),
        (this.unpackAlignment = t.unpackAlignment),
        (this.colorSpace = t.colorSpace),
        (this.renderTarget = t.renderTarget),
        (this.isRenderTargetTexture = t.isRenderTargetTexture),
        (this.isArrayTexture = t.isArrayTexture),
        (this.userData = JSON.parse(JSON.stringify(t.userData))),
        (this.needsUpdate = !0),
        this
      );
    }
    setValues(t) {
      for (let e in t) {
        let n = t[e];
        if (n === void 0) {
          z(`Texture.setValues(): parameter '${e}' has value of undefined.`);
          continue;
        }
        let i = this[e];
        if (i === void 0) {
          z(`Texture.setValues(): property '${e}' does not exist.`);
          continue;
        }
        (i && n && i.isVector2 && n.isVector2) ||
        (i && n && i.isVector3 && n.isVector3) ||
        (i && n && i.isMatrix3 && n.isMatrix3)
          ? i.copy(n)
          : (this[e] = n);
      }
    }
    toJSON(t) {
      let e = t === void 0 || typeof t == 'string';
      if (!e && t.textures[this.uuid] !== void 0) return t.textures[this.uuid];
      let n = {
        metadata: { version: 4.7, type: 'Texture', generator: 'Texture.toJSON' },
        uuid: this.uuid,
        name: this.name,
        image: this.source.toJSON(t).uuid,
        mapping: this.mapping,
        channel: this.channel,
        repeat: [this.repeat.x, this.repeat.y],
        offset: [this.offset.x, this.offset.y],
        center: [this.center.x, this.center.y],
        rotation: this.rotation,
        wrap: [this.wrapS, this.wrapT],
        format: this.format,
        internalFormat: this.internalFormat,
        type: this.type,
        normalized: this.normalized,
        colorSpace: this.colorSpace,
        minFilter: this.minFilter,
        magFilter: this.magFilter,
        anisotropy: this.anisotropy,
        flipY: this.flipY,
        generateMipmaps: this.generateMipmaps,
        premultiplyAlpha: this.premultiplyAlpha,
        unpackAlignment: this.unpackAlignment,
      };
      return (
        Object.keys(this.userData).length > 0 && (n.userData = this.userData),
        e || (t.textures[this.uuid] = n),
        n
      );
    }
    dispose() {
      this.dispatchEvent({ type: 'dispose' });
    }
    transformUv(t) {
      if (this.mapping !== xi) return t;
      if ((t.applyMatrix3(this.matrix), t.x < 0 || t.x > 1))
        switch (this.wrapS) {
          case Jn:
            t.x = t.x - Math.floor(t.x);
            break;
          case ie:
            t.x = t.x < 0 ? 0 : 1;
            break;
          case $n:
            Math.abs(Math.floor(t.x) % 2) === 1
              ? (t.x = Math.ceil(t.x) - t.x)
              : (t.x = t.x - Math.floor(t.x));
            break;
        }
      if (t.y < 0 || t.y > 1)
        switch (this.wrapT) {
          case Jn:
            t.y = t.y - Math.floor(t.y);
            break;
          case ie:
            t.y = t.y < 0 ? 0 : 1;
            break;
          case $n:
            Math.abs(Math.floor(t.y) % 2) === 1
              ? (t.y = Math.ceil(t.y) - t.y)
              : (t.y = t.y - Math.floor(t.y));
            break;
        }
      return (this.flipY && (t.y = 1 - t.y), t);
    }
    set needsUpdate(t) {
      t === !0 && (this.version++, (this.source.needsUpdate = !0));
    }
    set needsPMREMUpdate(t) {
      t === !0 && this.pmremVersion++;
    }
  };
((Dt.DEFAULT_IMAGE = null), (Dt.DEFAULT_MAPPING = xi), (Dt.DEFAULT_ANISOTROPY = 1));
var Ci = class {
  constructor(t = 0, e = 0, n = 0, i = 1) {
    ((this.x = t), (this.y = e), (this.z = n), (this.w = i));
  }
  get width() {
    return this.z;
  }
  set width(t) {
    this.z = t;
  }
  get height() {
    return this.w;
  }
  set height(t) {
    this.w = t;
  }
  set(t, e, n, i) {
    return ((this.x = t), (this.y = e), (this.z = n), (this.w = i), this);
  }
  setScalar(t) {
    return ((this.x = t), (this.y = t), (this.z = t), (this.w = t), this);
  }
  setX(t) {
    return ((this.x = t), this);
  }
  setY(t) {
    return ((this.y = t), this);
  }
  setZ(t) {
    return ((this.z = t), this);
  }
  setW(t) {
    return ((this.w = t), this);
  }
  setComponent(t, e) {
    switch (t) {
      case 0:
        this.x = e;
        break;
      case 1:
        this.y = e;
        break;
      case 2:
        this.z = e;
        break;
      case 3:
        this.w = e;
        break;
      default:
        throw new Error('THREE.Vector4: index is out of range: ' + t);
    }
    return this;
  }
  getComponent(t) {
    switch (t) {
      case 0:
        return this.x;
      case 1:
        return this.y;
      case 2:
        return this.z;
      case 3:
        return this.w;
      default:
        throw new Error('THREE.Vector4: index is out of range: ' + t);
    }
  }
  clone() {
    return new this.constructor(this.x, this.y, this.z, this.w);
  }
  copy(t) {
    return (
      (this.x = t.x),
      (this.y = t.y),
      (this.z = t.z),
      (this.w = t.w !== void 0 ? t.w : 1),
      this
    );
  }
  add(t) {
    return ((this.x += t.x), (this.y += t.y), (this.z += t.z), (this.w += t.w), this);
  }
  addScalar(t) {
    return ((this.x += t), (this.y += t), (this.z += t), (this.w += t), this);
  }
  addVectors(t, e) {
    return (
      (this.x = t.x + e.x),
      (this.y = t.y + e.y),
      (this.z = t.z + e.z),
      (this.w = t.w + e.w),
      this
    );
  }
  addScaledVector(t, e) {
    return (
      (this.x += t.x * e),
      (this.y += t.y * e),
      (this.z += t.z * e),
      (this.w += t.w * e),
      this
    );
  }
  sub(t) {
    return ((this.x -= t.x), (this.y -= t.y), (this.z -= t.z), (this.w -= t.w), this);
  }
  subScalar(t) {
    return ((this.x -= t), (this.y -= t), (this.z -= t), (this.w -= t), this);
  }
  subVectors(t, e) {
    return (
      (this.x = t.x - e.x),
      (this.y = t.y - e.y),
      (this.z = t.z - e.z),
      (this.w = t.w - e.w),
      this
    );
  }
  multiply(t) {
    return ((this.x *= t.x), (this.y *= t.y), (this.z *= t.z), (this.w *= t.w), this);
  }
  multiplyScalar(t) {
    return ((this.x *= t), (this.y *= t), (this.z *= t), (this.w *= t), this);
  }
  applyMatrix4(t) {
    let e = this.x,
      n = this.y,
      i = this.z,
      s = this.w,
      r = t.elements;
    return (
      (this.x = r[0] * e + r[4] * n + r[8] * i + r[12] * s),
      (this.y = r[1] * e + r[5] * n + r[9] * i + r[13] * s),
      (this.z = r[2] * e + r[6] * n + r[10] * i + r[14] * s),
      (this.w = r[3] * e + r[7] * n + r[11] * i + r[15] * s),
      this
    );
  }
  divide(t) {
    return ((this.x /= t.x), (this.y /= t.y), (this.z /= t.z), (this.w /= t.w), this);
  }
  divideScalar(t) {
    return this.multiplyScalar(1 / t);
  }
  setAxisAngleFromQuaternion(t) {
    this.w = 2 * Math.acos(t.w);
    let e = Math.sqrt(1 - t.w * t.w);
    return (
      e < 1e-4
        ? ((this.x = 1), (this.y = 0), (this.z = 0))
        : ((this.x = t.x / e), (this.y = t.y / e), (this.z = t.z / e)),
      this
    );
  }
  setAxisAngleFromRotationMatrix(t) {
    let e,
      n,
      i,
      s,
      o = t.elements,
      l = o[0],
      c = o[4],
      u = o[8],
      d = o[1],
      f = o[5],
      p = o[9],
      m = o[2],
      _ = o[6],
      x = o[10];
    if (Math.abs(c - d) < 0.01 && Math.abs(u - m) < 0.01 && Math.abs(p - _) < 0.01) {
      if (
        Math.abs(c + d) < 0.1 &&
        Math.abs(u + m) < 0.1 &&
        Math.abs(p + _) < 0.1 &&
        Math.abs(l + f + x - 3) < 0.1
      )
        return (this.set(1, 0, 0, 0), this);
      e = Math.PI;
      let S = (l + 1) / 2,
        M = (f + 1) / 2,
        b = (x + 1) / 2,
        w = (c + d) / 4,
        A = (u + m) / 4,
        T = (p + _) / 4;
      return (
        S > M && S > b
          ? S < 0.01
            ? ((n = 0), (i = 0.707106781), (s = 0.707106781))
            : ((n = Math.sqrt(S)), (i = w / n), (s = A / n))
          : M > b
            ? M < 0.01
              ? ((n = 0.707106781), (i = 0), (s = 0.707106781))
              : ((i = Math.sqrt(M)), (n = w / i), (s = T / i))
            : b < 0.01
              ? ((n = 0.707106781), (i = 0.707106781), (s = 0))
              : ((s = Math.sqrt(b)), (n = A / s), (i = T / s)),
        this.set(n, i, s, e),
        this
      );
    }
    let y = Math.sqrt((_ - p) * (_ - p) + (u - m) * (u - m) + (d - c) * (d - c));
    return (
      Math.abs(y) < 1e-3 && (y = 1),
      (this.x = (_ - p) / y),
      (this.y = (u - m) / y),
      (this.z = (d - c) / y),
      (this.w = Math.acos((l + f + x - 1) / 2)),
      this
    );
  }
  setFromMatrixPosition(t) {
    let e = t.elements;
    return ((this.x = e[12]), (this.y = e[13]), (this.z = e[14]), (this.w = e[15]), this);
  }
  min(t) {
    return (
      (this.x = Math.min(this.x, t.x)),
      (this.y = Math.min(this.y, t.y)),
      (this.z = Math.min(this.z, t.z)),
      (this.w = Math.min(this.w, t.w)),
      this
    );
  }
  max(t) {
    return (
      (this.x = Math.max(this.x, t.x)),
      (this.y = Math.max(this.y, t.y)),
      (this.z = Math.max(this.z, t.z)),
      (this.w = Math.max(this.w, t.w)),
      this
    );
  }
  clamp(t, e) {
    return (
      (this.x = C(this.x, t.x, e.x)),
      (this.y = C(this.y, t.y, e.y)),
      (this.z = C(this.z, t.z, e.z)),
      (this.w = C(this.w, t.w, e.w)),
      this
    );
  }
  clampScalar(t, e) {
    return (
      (this.x = C(this.x, t, e)),
      (this.y = C(this.y, t, e)),
      (this.z = C(this.z, t, e)),
      (this.w = C(this.w, t, e)),
      this
    );
  }
  clampLength(t, e) {
    let n = this.length();
    return this.divideScalar(n || 1).multiplyScalar(C(n, t, e));
  }
  floor() {
    return (
      (this.x = Math.floor(this.x)),
      (this.y = Math.floor(this.y)),
      (this.z = Math.floor(this.z)),
      (this.w = Math.floor(this.w)),
      this
    );
  }
  ceil() {
    return (
      (this.x = Math.ceil(this.x)),
      (this.y = Math.ceil(this.y)),
      (this.z = Math.ceil(this.z)),
      (this.w = Math.ceil(this.w)),
      this
    );
  }
  round() {
    return (
      (this.x = Math.round(this.x)),
      (this.y = Math.round(this.y)),
      (this.z = Math.round(this.z)),
      (this.w = Math.round(this.w)),
      this
    );
  }
  roundToZero() {
    return (
      (this.x = Math.trunc(this.x)),
      (this.y = Math.trunc(this.y)),
      (this.z = Math.trunc(this.z)),
      (this.w = Math.trunc(this.w)),
      this
    );
  }
  negate() {
    return ((this.x = -this.x), (this.y = -this.y), (this.z = -this.z), (this.w = -this.w), this);
  }
  dot(t) {
    return this.x * t.x + this.y * t.y + this.z * t.z + this.w * t.w;
  }
  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
  }
  manhattanLength() {
    return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z) + Math.abs(this.w);
  }
  normalize() {
    return this.divideScalar(this.length() || 1);
  }
  setLength(t) {
    return this.normalize().multiplyScalar(t);
  }
  lerp(t, e) {
    return (
      (this.x += (t.x - this.x) * e),
      (this.y += (t.y - this.y) * e),
      (this.z += (t.z - this.z) * e),
      (this.w += (t.w - this.w) * e),
      this
    );
  }
  lerpVectors(t, e, n) {
    return (
      (this.x = t.x + (e.x - t.x) * n),
      (this.y = t.y + (e.y - t.y) * n),
      (this.z = t.z + (e.z - t.z) * n),
      (this.w = t.w + (e.w - t.w) * n),
      this
    );
  }
  equals(t) {
    return t.x === this.x && t.y === this.y && t.z === this.z && t.w === this.w;
  }
  fromArray(t, e = 0) {
    return ((this.x = t[e]), (this.y = t[e + 1]), (this.z = t[e + 2]), (this.w = t[e + 3]), this);
  }
  toArray(t = [], e = 0) {
    return ((t[e] = this.x), (t[e + 1] = this.y), (t[e + 2] = this.z), (t[e + 3] = this.w), t);
  }
  fromBufferAttribute(t, e) {
    return (
      (this.x = t.getX(e)),
      (this.y = t.getY(e)),
      (this.z = t.getZ(e)),
      (this.w = t.getW(e)),
      this
    );
  }
  random() {
    return (
      (this.x = Math.random()),
      (this.y = Math.random()),
      (this.z = Math.random()),
      (this.w = Math.random()),
      this
    );
  }
  *[Symbol.iterator]() {
    (yield this.x, yield this.y, yield this.z, yield this.w);
  }
};
Ci.prototype.isVector4 = !0;
var Nt = Ci,
  _n = class _n2 {
    constructor(t, e, n, i, s, r, a, o, l, c, u, d, f, p, m, _) {
      ((this.elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
        t !== void 0 && this.set(t, e, n, i, s, r, a, o, l, c, u, d, f, p, m, _));
    }
    set(t, e, n, i, s, r, a, o, l, c, u, d, f, p, m, _) {
      let x = this.elements;
      return (
        (x[0] = t),
        (x[4] = e),
        (x[8] = n),
        (x[12] = i),
        (x[1] = s),
        (x[5] = r),
        (x[9] = a),
        (x[13] = o),
        (x[2] = l),
        (x[6] = c),
        (x[10] = u),
        (x[14] = d),
        (x[3] = f),
        (x[7] = p),
        (x[11] = m),
        (x[15] = _),
        this
      );
    }
    identity() {
      return (this.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1), this);
    }
    clone() {
      return new _n2().fromArray(this.elements);
    }
    copy(t) {
      let e = this.elements,
        n = t.elements;
      return (
        (e[0] = n[0]),
        (e[1] = n[1]),
        (e[2] = n[2]),
        (e[3] = n[3]),
        (e[4] = n[4]),
        (e[5] = n[5]),
        (e[6] = n[6]),
        (e[7] = n[7]),
        (e[8] = n[8]),
        (e[9] = n[9]),
        (e[10] = n[10]),
        (e[11] = n[11]),
        (e[12] = n[12]),
        (e[13] = n[13]),
        (e[14] = n[14]),
        (e[15] = n[15]),
        this
      );
    }
    copyPosition(t) {
      let e = this.elements,
        n = t.elements;
      return ((e[12] = n[12]), (e[13] = n[13]), (e[14] = n[14]), this);
    }
    setFromMatrix3(t) {
      let e = t.elements;
      return (
        this.set(e[0], e[3], e[6], 0, e[1], e[4], e[7], 0, e[2], e[5], e[8], 0, 0, 0, 0, 1),
        this
      );
    }
    extractBasis(t, e, n) {
      return this.determinantAffine() === 0
        ? (t.set(1, 0, 0), e.set(0, 1, 0), n.set(0, 0, 1), this)
        : (t.setFromMatrixColumn(this, 0),
          e.setFromMatrixColumn(this, 1),
          n.setFromMatrixColumn(this, 2),
          this);
    }
    makeBasis(t, e, n) {
      return (this.set(t.x, e.x, n.x, 0, t.y, e.y, n.y, 0, t.z, e.z, n.z, 0, 0, 0, 0, 1), this);
    }
    extractRotation(t) {
      if (t.determinantAffine() === 0) return this.identity();
      let e = this.elements,
        n = t.elements,
        i = 1 / Ot.setFromMatrixColumn(t, 0).length(),
        s = 1 / Ot.setFromMatrixColumn(t, 1).length(),
        r = 1 / Ot.setFromMatrixColumn(t, 2).length();
      return (
        (e[0] = n[0] * i),
        (e[1] = n[1] * i),
        (e[2] = n[2] * i),
        (e[3] = 0),
        (e[4] = n[4] * s),
        (e[5] = n[5] * s),
        (e[6] = n[6] * s),
        (e[7] = 0),
        (e[8] = n[8] * r),
        (e[9] = n[9] * r),
        (e[10] = n[10] * r),
        (e[11] = 0),
        (e[12] = 0),
        (e[13] = 0),
        (e[14] = 0),
        (e[15] = 1),
        this
      );
    }
    makeRotationFromEuler(t) {
      let e = this.elements,
        n = t.x,
        i = t.y,
        s = t.z,
        r = Math.cos(n),
        a = Math.sin(n),
        o = Math.cos(i),
        l = Math.sin(i),
        c = Math.cos(s),
        u = Math.sin(s);
      if (t.order === 'XYZ') {
        let d = r * c,
          f = r * u,
          p = a * c,
          m = a * u;
        ((e[0] = o * c),
          (e[4] = -o * u),
          (e[8] = l),
          (e[1] = f + p * l),
          (e[5] = d - m * l),
          (e[9] = -a * o),
          (e[2] = m - d * l),
          (e[6] = p + f * l),
          (e[10] = r * o));
      } else if (t.order === 'YXZ') {
        let d = o * c,
          f = o * u,
          p = l * c,
          m = l * u;
        ((e[0] = d + m * a),
          (e[4] = p * a - f),
          (e[8] = r * l),
          (e[1] = r * u),
          (e[5] = r * c),
          (e[9] = -a),
          (e[2] = f * a - p),
          (e[6] = m + d * a),
          (e[10] = r * o));
      } else if (t.order === 'ZXY') {
        let d = o * c,
          f = o * u,
          p = l * c,
          m = l * u;
        ((e[0] = d - m * a),
          (e[4] = -r * u),
          (e[8] = p + f * a),
          (e[1] = f + p * a),
          (e[5] = r * c),
          (e[9] = m - d * a),
          (e[2] = -r * l),
          (e[6] = a),
          (e[10] = r * o));
      } else if (t.order === 'ZYX') {
        let d = r * c,
          f = r * u,
          p = a * c,
          m = a * u;
        ((e[0] = o * c),
          (e[4] = p * l - f),
          (e[8] = d * l + m),
          (e[1] = o * u),
          (e[5] = m * l + d),
          (e[9] = f * l - p),
          (e[2] = -l),
          (e[6] = a * o),
          (e[10] = r * o));
      } else if (t.order === 'YZX') {
        let d = r * o,
          f = r * l,
          p = a * o,
          m = a * l;
        ((e[0] = o * c),
          (e[4] = m - d * u),
          (e[8] = p * u + f),
          (e[1] = u),
          (e[5] = r * c),
          (e[9] = -a * c),
          (e[2] = -l * c),
          (e[6] = f * u + p),
          (e[10] = d - m * u));
      } else if (t.order === 'XZY') {
        let d = r * o,
          f = r * l,
          p = a * o,
          m = a * l;
        ((e[0] = o * c),
          (e[4] = -u),
          (e[8] = l * c),
          (e[1] = d * u + m),
          (e[5] = r * c),
          (e[9] = f * u - p),
          (e[2] = p * u - f),
          (e[6] = a * c),
          (e[10] = m * u + d));
      }
      return (
        (e[3] = 0),
        (e[7] = 0),
        (e[11] = 0),
        (e[12] = 0),
        (e[13] = 0),
        (e[14] = 0),
        (e[15] = 1),
        this
      );
    }
    makeRotationFromQuaternion(t) {
      return this.compose(qs, t, Ys);
    }
    lookAt(t, e, n) {
      let i = this.elements;
      return (
        Z.subVectors(t, e),
        Z.lengthSq() === 0 && (Z.z = 1),
        Z.normalize(),
        pt.crossVectors(n, Z),
        pt.lengthSq() === 0 &&
          (Math.abs(n.z) === 1 ? (Z.x += 1e-4) : (Z.z += 1e-4),
          Z.normalize(),
          pt.crossVectors(n, Z)),
        pt.normalize(),
        xe.crossVectors(Z, pt),
        (i[0] = pt.x),
        (i[4] = xe.x),
        (i[8] = Z.x),
        (i[1] = pt.y),
        (i[5] = xe.y),
        (i[9] = Z.y),
        (i[2] = pt.z),
        (i[6] = xe.z),
        (i[10] = Z.z),
        this
      );
    }
    multiply(t) {
      return this.multiplyMatrices(this, t);
    }
    premultiply(t) {
      return this.multiplyMatrices(t, this);
    }
    multiplyMatrices(t, e) {
      let n = t.elements,
        i = e.elements,
        s = this.elements,
        r = n[0],
        a = n[4],
        o = n[8],
        l = n[12],
        c = n[1],
        u = n[5],
        d = n[9],
        f = n[13],
        p = n[2],
        m = n[6],
        _ = n[10],
        x = n[14],
        y = n[3],
        S = n[7],
        M = n[11],
        b = n[15],
        w = i[0],
        A = i[4],
        T = i[8],
        L = i[12],
        I = i[1],
        P = i[5],
        k = i[9],
        D = i[13],
        Q = i[2],
        F = i[6],
        wt = i[10],
        fe = i[14],
        pe = i[3],
        me = i[7],
        ge = i[11],
        _e = i[15];
      return (
        (s[0] = r * w + a * I + o * Q + l * pe),
        (s[4] = r * A + a * P + o * F + l * me),
        (s[8] = r * T + a * k + o * wt + l * ge),
        (s[12] = r * L + a * D + o * fe + l * _e),
        (s[1] = c * w + u * I + d * Q + f * pe),
        (s[5] = c * A + u * P + d * F + f * me),
        (s[9] = c * T + u * k + d * wt + f * ge),
        (s[13] = c * L + u * D + d * fe + f * _e),
        (s[2] = p * w + m * I + _ * Q + x * pe),
        (s[6] = p * A + m * P + _ * F + x * me),
        (s[10] = p * T + m * k + _ * wt + x * ge),
        (s[14] = p * L + m * D + _ * fe + x * _e),
        (s[3] = y * w + S * I + M * Q + b * pe),
        (s[7] = y * A + S * P + M * F + b * me),
        (s[11] = y * T + S * k + M * wt + b * ge),
        (s[15] = y * L + S * D + M * fe + b * _e),
        this
      );
    }
    multiplyScalar(t) {
      let e = this.elements;
      return (
        (e[0] *= t),
        (e[4] *= t),
        (e[8] *= t),
        (e[12] *= t),
        (e[1] *= t),
        (e[5] *= t),
        (e[9] *= t),
        (e[13] *= t),
        (e[2] *= t),
        (e[6] *= t),
        (e[10] *= t),
        (e[14] *= t),
        (e[3] *= t),
        (e[7] *= t),
        (e[11] *= t),
        (e[15] *= t),
        this
      );
    }
    determinant() {
      let t = this.elements,
        e = t[0],
        n = t[4],
        i = t[8],
        s = t[12],
        r = t[1],
        a = t[5],
        o = t[9],
        l = t[13],
        c = t[2],
        u = t[6],
        d = t[10],
        f = t[14],
        p = t[3],
        m = t[7],
        _ = t[11],
        x = t[15],
        y = o * f - l * d,
        S = a * f - l * u,
        M = a * d - o * u,
        b = r * f - l * c,
        w = r * d - o * c,
        A = r * u - a * c;
      return (
        e * (m * y - _ * S + x * M) -
        n * (p * y - _ * b + x * w) +
        i * (p * S - m * b + x * A) -
        s * (p * M - m * w + _ * A)
      );
    }
    determinantAffine() {
      let t = this.elements,
        e = t[0],
        n = t[4],
        i = t[8],
        s = t[1],
        r = t[5],
        a = t[9],
        o = t[2],
        l = t[6],
        c = t[10];
      return e * (r * c - a * l) - n * (s * c - a * o) + i * (s * l - r * o);
    }
    transpose() {
      let t = this.elements,
        e;
      return (
        (e = t[1]),
        (t[1] = t[4]),
        (t[4] = e),
        (e = t[2]),
        (t[2] = t[8]),
        (t[8] = e),
        (e = t[6]),
        (t[6] = t[9]),
        (t[9] = e),
        (e = t[3]),
        (t[3] = t[12]),
        (t[12] = e),
        (e = t[7]),
        (t[7] = t[13]),
        (t[13] = e),
        (e = t[11]),
        (t[11] = t[14]),
        (t[14] = e),
        this
      );
    }
    setPosition(t, e, n) {
      let i = this.elements;
      return (
        t.isVector3
          ? ((i[12] = t.x), (i[13] = t.y), (i[14] = t.z))
          : ((i[12] = t), (i[13] = e), (i[14] = n)),
        this
      );
    }
    invert() {
      let t = this.elements,
        e = t[0],
        n = t[1],
        i = t[2],
        s = t[3],
        r = t[4],
        a = t[5],
        o = t[6],
        l = t[7],
        c = t[8],
        u = t[9],
        d = t[10],
        f = t[11],
        p = t[12],
        m = t[13],
        _ = t[14],
        x = t[15],
        y = e * a - n * r,
        S = e * o - i * r,
        M = e * l - s * r,
        b = n * o - i * a,
        w = n * l - s * a,
        A = i * l - s * o,
        T = c * m - u * p,
        L = c * _ - d * p,
        I = c * x - f * p,
        P = u * _ - d * m,
        k = u * x - f * m,
        D = d * x - f * _,
        Q = y * D - S * k + M * P + b * I - w * L + A * T;
      if (Q === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      let F = 1 / Q;
      return (
        (t[0] = (a * D - o * k + l * P) * F),
        (t[1] = (i * k - n * D - s * P) * F),
        (t[2] = (m * A - _ * w + x * b) * F),
        (t[3] = (d * w - u * A - f * b) * F),
        (t[4] = (o * I - r * D - l * L) * F),
        (t[5] = (e * D - i * I + s * L) * F),
        (t[6] = (_ * M - p * A - x * S) * F),
        (t[7] = (c * A - d * M + f * S) * F),
        (t[8] = (r * k - a * I + l * T) * F),
        (t[9] = (n * I - e * k - s * T) * F),
        (t[10] = (p * w - m * M + x * y) * F),
        (t[11] = (u * M - c * w - f * y) * F),
        (t[12] = (a * L - r * P - o * T) * F),
        (t[13] = (e * P - n * L + i * T) * F),
        (t[14] = (m * S - p * b - _ * y) * F),
        (t[15] = (c * b - u * S + d * y) * F),
        this
      );
    }
    scale(t) {
      let e = this.elements,
        n = t.x,
        i = t.y,
        s = t.z;
      return (
        (e[0] *= n),
        (e[4] *= i),
        (e[8] *= s),
        (e[1] *= n),
        (e[5] *= i),
        (e[9] *= s),
        (e[2] *= n),
        (e[6] *= i),
        (e[10] *= s),
        (e[3] *= n),
        (e[7] *= i),
        (e[11] *= s),
        this
      );
    }
    getMaxScaleOnAxis() {
      let t = this.elements,
        e = t[0] * t[0] + t[1] * t[1] + t[2] * t[2],
        n = t[4] * t[4] + t[5] * t[5] + t[6] * t[6],
        i = t[8] * t[8] + t[9] * t[9] + t[10] * t[10];
      return Math.sqrt(Math.max(e, n, i));
    }
    makeTranslation(t, e, n) {
      return (
        t.isVector3
          ? this.set(1, 0, 0, t.x, 0, 1, 0, t.y, 0, 0, 1, t.z, 0, 0, 0, 1)
          : this.set(1, 0, 0, t, 0, 1, 0, e, 0, 0, 1, n, 0, 0, 0, 1),
        this
      );
    }
    makeRotationX(t) {
      let e = Math.cos(t),
        n = Math.sin(t);
      return (this.set(1, 0, 0, 0, 0, e, -n, 0, 0, n, e, 0, 0, 0, 0, 1), this);
    }
    makeRotationY(t) {
      let e = Math.cos(t),
        n = Math.sin(t);
      return (this.set(e, 0, n, 0, 0, 1, 0, 0, -n, 0, e, 0, 0, 0, 0, 1), this);
    }
    makeRotationZ(t) {
      let e = Math.cos(t),
        n = Math.sin(t);
      return (this.set(e, -n, 0, 0, n, e, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1), this);
    }
    makeRotationAxis(t, e) {
      let n = Math.cos(e),
        i = Math.sin(e),
        s = 1 - n,
        r = t.x,
        a = t.y,
        o = t.z,
        l = s * r,
        c = s * a;
      return (
        this.set(
          l * r + n,
          l * a - i * o,
          l * o + i * a,
          0,
          l * a + i * o,
          c * a + n,
          c * o - i * r,
          0,
          l * o - i * a,
          c * o + i * r,
          s * o * o + n,
          0,
          0,
          0,
          0,
          1
        ),
        this
      );
    }
    makeScale(t, e, n) {
      return (this.set(t, 0, 0, 0, 0, e, 0, 0, 0, 0, n, 0, 0, 0, 0, 1), this);
    }
    makeShear(t, e, n, i, s, r) {
      return (this.set(1, n, s, 0, t, 1, r, 0, e, i, 1, 0, 0, 0, 0, 1), this);
    }
    compose(t, e, n) {
      let i = this.elements,
        s = e._x,
        r = e._y,
        a = e._z,
        o = e._w,
        l = s + s,
        c = r + r,
        u = a + a,
        d = s * l,
        f = s * c,
        p = s * u,
        m = r * c,
        _ = r * u,
        x = a * u,
        y = o * l,
        S = o * c,
        M = o * u,
        b = n.x,
        w = n.y,
        A = n.z;
      return (
        (i[0] = (1 - (m + x)) * b),
        (i[1] = (f + M) * b),
        (i[2] = (p - S) * b),
        (i[3] = 0),
        (i[4] = (f - M) * w),
        (i[5] = (1 - (d + x)) * w),
        (i[6] = (_ + y) * w),
        (i[7] = 0),
        (i[8] = (p + S) * A),
        (i[9] = (_ - y) * A),
        (i[10] = (1 - (d + m)) * A),
        (i[11] = 0),
        (i[12] = t.x),
        (i[13] = t.y),
        (i[14] = t.z),
        (i[15] = 1),
        this
      );
    }
    decompose(t, e, n) {
      let i = this.elements;
      ((t.x = i[12]), (t.y = i[13]), (t.z = i[14]));
      let s = this.determinantAffine();
      if (s === 0) return (n.set(1, 1, 1), e.identity(), this);
      let r = Ot.set(i[0], i[1], i[2]).length(),
        a = Ot.set(i[4], i[5], i[6]).length(),
        o = Ot.set(i[8], i[9], i[10]).length();
      (s < 0 && (r = -r), nt.copy(this));
      let l = 1 / r,
        c = 1 / a,
        u = 1 / o;
      return (
        (nt.elements[0] *= l),
        (nt.elements[1] *= l),
        (nt.elements[2] *= l),
        (nt.elements[4] *= c),
        (nt.elements[5] *= c),
        (nt.elements[6] *= c),
        (nt.elements[8] *= u),
        (nt.elements[9] *= u),
        (nt.elements[10] *= u),
        e.setFromRotationMatrix(nt),
        (n.x = r),
        (n.y = a),
        (n.z = o),
        this
      );
    }
    makePerspective(t, e, n, i, s, r, a = Yt, o = !1) {
      let l = this.elements,
        c = (2 * s) / (e - t),
        u = (2 * s) / (n - i),
        d = (e + t) / (e - t),
        f = (n + i) / (n - i),
        p,
        m;
      if (o) ((p = s / (r - s)), (m = (r * s) / (r - s)));
      else if (a === Yt) ((p = -(r + s) / (r - s)), (m = (-2 * r * s) / (r - s)));
      else if (a === ri) ((p = -r / (r - s)), (m = (-r * s) / (r - s)));
      else throw new Error('THREE.Matrix4.makePerspective(): Invalid coordinate system: ' + a);
      return (
        (l[0] = c),
        (l[4] = 0),
        (l[8] = d),
        (l[12] = 0),
        (l[1] = 0),
        (l[5] = u),
        (l[9] = f),
        (l[13] = 0),
        (l[2] = 0),
        (l[6] = 0),
        (l[10] = p),
        (l[14] = m),
        (l[3] = 0),
        (l[7] = 0),
        (l[11] = -1),
        (l[15] = 0),
        this
      );
    }
    makeOrthographic(t, e, n, i, s, r, a = Yt, o = !1) {
      let l = this.elements,
        c = 2 / (e - t),
        u = 2 / (n - i),
        d = -(e + t) / (e - t),
        f = -(n + i) / (n - i),
        p,
        m;
      if (o) ((p = 1 / (r - s)), (m = r / (r - s)));
      else if (a === Yt) ((p = -2 / (r - s)), (m = -(r + s) / (r - s)));
      else if (a === ri) ((p = -1 / (r - s)), (m = -s / (r - s)));
      else throw new Error('THREE.Matrix4.makeOrthographic(): Invalid coordinate system: ' + a);
      return (
        (l[0] = c),
        (l[4] = 0),
        (l[8] = 0),
        (l[12] = d),
        (l[1] = 0),
        (l[5] = u),
        (l[9] = 0),
        (l[13] = f),
        (l[2] = 0),
        (l[6] = 0),
        (l[10] = p),
        (l[14] = m),
        (l[3] = 0),
        (l[7] = 0),
        (l[11] = 0),
        (l[15] = 1),
        this
      );
    }
    equals(t) {
      let e = this.elements,
        n = t.elements;
      for (let i = 0; i < 16; i++) if (e[i] !== n[i]) return !1;
      return !0;
    }
    fromArray(t, e = 0) {
      for (let n = 0; n < 16; n++) this.elements[n] = t[n + e];
      return this;
    }
    toArray(t = [], e = 0) {
      let n = this.elements;
      return (
        (t[e] = n[0]),
        (t[e + 1] = n[1]),
        (t[e + 2] = n[2]),
        (t[e + 3] = n[3]),
        (t[e + 4] = n[4]),
        (t[e + 5] = n[5]),
        (t[e + 6] = n[6]),
        (t[e + 7] = n[7]),
        (t[e + 8] = n[8]),
        (t[e + 9] = n[9]),
        (t[e + 10] = n[10]),
        (t[e + 11] = n[11]),
        (t[e + 12] = n[12]),
        (t[e + 13] = n[13]),
        (t[e + 14] = n[14]),
        (t[e + 15] = n[15]),
        t
      );
    }
  };
_n.prototype.isMatrix4 = !0;
var H = _n,
  Ot = new g(),
  nt = new H(),
  qs = new g(0, 0, 0),
  Ys = new g(1, 1, 1),
  pt = new g(),
  xe = new g(),
  Z = new g(),
  Bi = new H(),
  zi = new rt(),
  St = class h2 {
    constructor(t = 0, e = 0, n = 0, i = h2.DEFAULT_ORDER) {
      ((this.isEuler = !0), (this._x = t), (this._y = e), (this._z = n), (this._order = i));
    }
    get x() {
      return this._x;
    }
    set x(t) {
      ((this._x = t), this._onChangeCallback());
    }
    get y() {
      return this._y;
    }
    set y(t) {
      ((this._y = t), this._onChangeCallback());
    }
    get z() {
      return this._z;
    }
    set z(t) {
      ((this._z = t), this._onChangeCallback());
    }
    get order() {
      return this._order;
    }
    set order(t) {
      ((this._order = t), this._onChangeCallback());
    }
    set(t, e, n, i = this._order) {
      return (
        (this._x = t),
        (this._y = e),
        (this._z = n),
        (this._order = i),
        this._onChangeCallback(),
        this
      );
    }
    clone() {
      return new this.constructor(this._x, this._y, this._z, this._order);
    }
    copy(t) {
      return (
        (this._x = t._x),
        (this._y = t._y),
        (this._z = t._z),
        (this._order = t._order),
        this._onChangeCallback(),
        this
      );
    }
    setFromRotationMatrix(t, e = this._order, n = !0) {
      let i = t.elements,
        s = i[0],
        r = i[4],
        a = i[8],
        o = i[1],
        l = i[5],
        c = i[9],
        u = i[2],
        d = i[6],
        f = i[10];
      switch (e) {
        case 'XYZ':
          ((this._y = Math.asin(C(a, -1, 1))),
            Math.abs(a) < 0.9999999
              ? ((this._x = Math.atan2(-c, f)), (this._z = Math.atan2(-r, s)))
              : ((this._x = Math.atan2(d, l)), (this._z = 0)));
          break;
        case 'YXZ':
          ((this._x = Math.asin(-C(c, -1, 1))),
            Math.abs(c) < 0.9999999
              ? ((this._y = Math.atan2(a, f)), (this._z = Math.atan2(o, l)))
              : ((this._y = Math.atan2(-u, s)), (this._z = 0)));
          break;
        case 'ZXY':
          ((this._x = Math.asin(C(d, -1, 1))),
            Math.abs(d) < 0.9999999
              ? ((this._y = Math.atan2(-u, f)), (this._z = Math.atan2(-r, l)))
              : ((this._y = 0), (this._z = Math.atan2(o, s))));
          break;
        case 'ZYX':
          ((this._y = Math.asin(-C(u, -1, 1))),
            Math.abs(u) < 0.9999999
              ? ((this._x = Math.atan2(d, f)), (this._z = Math.atan2(o, s)))
              : ((this._x = 0), (this._z = Math.atan2(-r, l))));
          break;
        case 'YZX':
          ((this._z = Math.asin(C(o, -1, 1))),
            Math.abs(o) < 0.9999999
              ? ((this._x = Math.atan2(-c, l)), (this._y = Math.atan2(-u, s)))
              : ((this._x = 0), (this._y = Math.atan2(a, f))));
          break;
        case 'XZY':
          ((this._z = Math.asin(-C(r, -1, 1))),
            Math.abs(r) < 0.9999999
              ? ((this._x = Math.atan2(d, l)), (this._y = Math.atan2(a, s)))
              : ((this._x = Math.atan2(-c, f)), (this._y = 0)));
          break;
        default:
          z('Euler: .setFromRotationMatrix() encountered an unknown order: ' + e);
      }
      return ((this._order = e), n === !0 && this._onChangeCallback(), this);
    }
    setFromQuaternion(t, e, n) {
      return (Bi.makeRotationFromQuaternion(t), this.setFromRotationMatrix(Bi, e, n));
    }
    setFromVector3(t, e = this._order) {
      return this.set(t.x, t.y, t.z, e);
    }
    reorder(t) {
      return (zi.setFromEuler(this), this.setFromQuaternion(zi, t));
    }
    equals(t) {
      return t._x === this._x && t._y === this._y && t._z === this._z && t._order === this._order;
    }
    fromArray(t) {
      return (
        (this._x = t[0]),
        (this._y = t[1]),
        (this._z = t[2]),
        t[3] !== void 0 && (this._order = t[3]),
        this._onChangeCallback(),
        this
      );
    }
    toArray(t = [], e = 0) {
      return (
        (t[e] = this._x),
        (t[e + 1] = this._y),
        (t[e + 2] = this._z),
        (t[e + 3] = this._order),
        t
      );
    }
    _onChange(t) {
      return ((this._onChangeCallback = t), this);
    }
    _onChangeCallback() {}
    *[Symbol.iterator]() {
      (yield this._x, yield this._y, yield this._z, yield this._order);
    }
  };
St.DEFAULT_ORDER = 'XYZ';
var Ye = class {
    constructor() {
      this.mask = 1;
    }
    set(t) {
      this.mask = ((1 << t) | 0) >>> 0;
    }
    enable(t) {
      this.mask |= (1 << t) | 0;
    }
    enableAll() {
      this.mask = -1;
    }
    toggle(t) {
      this.mask ^= (1 << t) | 0;
    }
    disable(t) {
      this.mask &= ~((1 << t) | 0);
    }
    disableAll() {
      this.mask = 0;
    }
    test(t) {
      return (this.mask & t.mask) !== 0;
    }
    isEnabled(t) {
      return (this.mask & ((1 << t) | 0)) !== 0;
    }
  },
  Zs = 0,
  Vi = new g(),
  Bt = new rt(),
  lt = new H(),
  ve = new g(),
  jt = new g(),
  Js = new g(),
  $s = new rt(),
  ki = new g(1, 0, 0),
  Gi = new g(0, 1, 0),
  Hi = new g(0, 0, 1),
  Wi = { type: 'added' },
  Ks = { type: 'removed' },
  zt = { type: 'childadded', child: null },
  bn = { type: 'childremoved', child: null },
  et = class h3 extends Mt {
    constructor() {
      (super(),
        (this.isObject3D = !0),
        Object.defineProperty(this, 'id', { value: Zs++ }),
        (this.uuid = Qt()),
        (this.name = ''),
        (this.type = 'Object3D'),
        (this.parent = null),
        (this.children = []),
        (this.up = h3.DEFAULT_UP.clone()));
      let t = new g(),
        e = new St(),
        n = new rt(),
        i = new g(1, 1, 1);
      function s() {
        n.setFromEuler(e, !1);
      }
      function r() {
        e.setFromQuaternion(n, void 0, !1);
      }
      (e._onChange(s),
        n._onChange(r),
        Object.defineProperties(this, {
          position: { configurable: !0, enumerable: !0, value: t },
          rotation: { configurable: !0, enumerable: !0, value: e },
          quaternion: { configurable: !0, enumerable: !0, value: n },
          scale: { configurable: !0, enumerable: !0, value: i },
          modelViewMatrix: { value: new H() },
          normalMatrix: { value: new E() },
        }),
        (this.matrix = new H()),
        (this.matrixWorld = new H()),
        (this.matrixAutoUpdate = h3.DEFAULT_MATRIX_AUTO_UPDATE),
        (this.matrixWorldAutoUpdate = h3.DEFAULT_MATRIX_WORLD_AUTO_UPDATE),
        (this.matrixWorldNeedsUpdate = !1),
        (this.layers = new Ye()),
        (this.visible = !0),
        (this.castShadow = !1),
        (this.receiveShadow = !1),
        (this.frustumCulled = !0),
        (this.renderOrder = 0),
        (this.animations = []),
        (this.customDepthMaterial = void 0),
        (this.customDistanceMaterial = void 0),
        (this.static = !1),
        (this.userData = {}),
        (this.pivot = null));
    }
    onBeforeShadow() {}
    onAfterShadow() {}
    onBeforeRender() {}
    onAfterRender() {}
    applyMatrix4(t) {
      (this.matrixAutoUpdate && this.updateMatrix(),
        this.matrix.premultiply(t),
        this.matrix.decompose(this.position, this.quaternion, this.scale));
    }
    applyQuaternion(t) {
      return (this.quaternion.premultiply(t), this);
    }
    setRotationFromAxisAngle(t, e) {
      this.quaternion.setFromAxisAngle(t, e);
    }
    setRotationFromEuler(t) {
      this.quaternion.setFromEuler(t, !0);
    }
    setRotationFromMatrix(t) {
      this.quaternion.setFromRotationMatrix(t);
    }
    setRotationFromQuaternion(t) {
      this.quaternion.copy(t);
    }
    rotateOnAxis(t, e) {
      return (Bt.setFromAxisAngle(t, e), this.quaternion.multiply(Bt), this);
    }
    rotateOnWorldAxis(t, e) {
      return (Bt.setFromAxisAngle(t, e), this.quaternion.premultiply(Bt), this);
    }
    rotateX(t) {
      return this.rotateOnAxis(ki, t);
    }
    rotateY(t) {
      return this.rotateOnAxis(Gi, t);
    }
    rotateZ(t) {
      return this.rotateOnAxis(Hi, t);
    }
    translateOnAxis(t, e) {
      return (
        Vi.copy(t).applyQuaternion(this.quaternion),
        this.position.add(Vi.multiplyScalar(e)),
        this
      );
    }
    translateX(t) {
      return this.translateOnAxis(ki, t);
    }
    translateY(t) {
      return this.translateOnAxis(Gi, t);
    }
    translateZ(t) {
      return this.translateOnAxis(Hi, t);
    }
    localToWorld(t) {
      return (this.updateWorldMatrix(!0, !1), t.applyMatrix4(this.matrixWorld));
    }
    worldToLocal(t) {
      return (this.updateWorldMatrix(!0, !1), t.applyMatrix4(lt.copy(this.matrixWorld).invert()));
    }
    lookAt(t, e, n) {
      t.isVector3 ? ve.copy(t) : ve.set(t, e, n);
      let i = this.parent;
      (this.updateWorldMatrix(!0, !1),
        jt.setFromMatrixPosition(this.matrixWorld),
        this.isCamera || this.isLight ? lt.lookAt(jt, ve, this.up) : lt.lookAt(ve, jt, this.up),
        this.quaternion.setFromRotationMatrix(lt),
        i &&
          (lt.extractRotation(i.matrixWorld),
          Bt.setFromRotationMatrix(lt),
          this.quaternion.premultiply(Bt.invert())));
    }
    add(t) {
      if (arguments.length > 1) {
        for (let e = 0; e < arguments.length; e++) this.add(arguments[e]);
        return this;
      }
      return t === this
        ? (O("Object3D.add: object can't be added as a child of itself.", t), this)
        : (t && t.isObject3D
            ? (t.removeFromParent(),
              (t.parent = this),
              this.children.push(t),
              t.dispatchEvent(Wi),
              (zt.child = t),
              this.dispatchEvent(zt),
              (zt.child = null))
            : O('Object3D.add: object not an instance of THREE.Object3D.', t),
          this);
    }
    remove(t) {
      if (arguments.length > 1) {
        for (let n = 0; n < arguments.length; n++) this.remove(arguments[n]);
        return this;
      }
      let e = this.children.indexOf(t);
      return (
        e !== -1 &&
          ((t.parent = null),
          this.children.splice(e, 1),
          t.dispatchEvent(Ks),
          (bn.child = t),
          this.dispatchEvent(bn),
          (bn.child = null)),
        this
      );
    }
    removeFromParent() {
      let t = this.parent;
      return (t !== null && t.remove(this), this);
    }
    clear() {
      return this.remove(...this.children);
    }
    attach(t) {
      return (
        this.updateWorldMatrix(!0, !1),
        lt.copy(this.matrixWorld).invert(),
        t.parent !== null &&
          (t.parent.updateWorldMatrix(!0, !1), lt.multiply(t.parent.matrixWorld)),
        t.applyMatrix4(lt),
        t.removeFromParent(),
        (t.parent = this),
        this.children.push(t),
        t.updateWorldMatrix(!1, !0),
        t.dispatchEvent(Wi),
        (zt.child = t),
        this.dispatchEvent(zt),
        (zt.child = null),
        this
      );
    }
    getObjectById(t) {
      return this.getObjectByProperty('id', t);
    }
    getObjectByName(t) {
      return this.getObjectByProperty('name', t);
    }
    getObjectByProperty(t, e) {
      if (this[t] === e) return this;
      for (let n = 0, i = this.children.length; n < i; n++) {
        let r = this.children[n].getObjectByProperty(t, e);
        if (r !== void 0) return r;
      }
    }
    getObjectsByProperty(t, e, n = []) {
      this[t] === e && n.push(this);
      let i = this.children;
      for (let s = 0, r = i.length; s < r; s++) i[s].getObjectsByProperty(t, e, n);
      return n;
    }
    getWorldPosition(t) {
      return (this.updateWorldMatrix(!0, !1), t.setFromMatrixPosition(this.matrixWorld));
    }
    getWorldQuaternion(t) {
      return (this.updateWorldMatrix(!0, !1), this.matrixWorld.decompose(jt, t, Js), t);
    }
    getWorldScale(t) {
      return (this.updateWorldMatrix(!0, !1), this.matrixWorld.decompose(jt, $s, t), t);
    }
    getWorldDirection(t) {
      this.updateWorldMatrix(!0, !1);
      let e = this.matrixWorld.elements;
      return t.set(e[8], e[9], e[10]).normalize();
    }
    raycast() {}
    traverse(t) {
      t(this);
      let e = this.children;
      for (let n = 0, i = e.length; n < i; n++) e[n].traverse(t);
    }
    traverseVisible(t) {
      if (this.visible === !1) return;
      t(this);
      let e = this.children;
      for (let n = 0, i = e.length; n < i; n++) e[n].traverseVisible(t);
    }
    traverseAncestors(t) {
      let e = this.parent;
      e !== null && (t(e), e.traverseAncestors(t));
    }
    updateMatrix() {
      this.matrix.compose(this.position, this.quaternion, this.scale);
      let t = this.pivot;
      if (t !== null) {
        let e = t.x,
          n = t.y,
          i = t.z,
          s = this.matrix.elements;
        ((s[12] += e - s[0] * e - s[4] * n - s[8] * i),
          (s[13] += n - s[1] * e - s[5] * n - s[9] * i),
          (s[14] += i - s[2] * e - s[6] * n - s[10] * i));
      }
      this.matrixWorldNeedsUpdate = !0;
    }
    updateMatrixWorld(t) {
      (this.matrixAutoUpdate && this.updateMatrix(),
        (this.matrixWorldNeedsUpdate || t) &&
          (this.matrixWorldAutoUpdate === !0 &&
            (this.parent === null
              ? this.matrixWorld.copy(this.matrix)
              : this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)),
          (this.matrixWorldNeedsUpdate = !1),
          (t = !0)));
      let e = this.children;
      for (let n = 0, i = e.length; n < i; n++) e[n].updateMatrixWorld(t);
    }
    updateWorldMatrix(t, e, n = !1) {
      let i = this.parent;
      if (
        (t === !0 && i !== null && i.updateWorldMatrix(!0, !1),
        this.matrixAutoUpdate && this.updateMatrix(),
        (this.matrixWorldNeedsUpdate || n) &&
          (this.matrixWorldAutoUpdate === !0 &&
            (this.parent === null
              ? this.matrixWorld.copy(this.matrix)
              : this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)),
          (this.matrixWorldNeedsUpdate = !1),
          (n = !0)),
        e === !0)
      ) {
        let s = this.children;
        for (let r = 0, a = s.length; r < a; r++) s[r].updateWorldMatrix(!1, !0, n);
      }
    }
    toJSON(t) {
      let e = t === void 0 || typeof t == 'string',
        n = {};
      e &&
        ((t = {
          geometries: {},
          materials: {},
          textures: {},
          images: {},
          shapes: {},
          skeletons: {},
          animations: {},
          nodes: {},
        }),
        (n.metadata = { version: 4.7, type: 'Object', generator: 'Object3D.toJSON' }));
      let i = {};
      ((i.uuid = this.uuid),
        (i.type = this.type),
        this.name !== '' && (i.name = this.name),
        this.castShadow === !0 && (i.castShadow = !0),
        this.receiveShadow === !0 && (i.receiveShadow = !0),
        this.visible === !1 && (i.visible = !1),
        this.frustumCulled === !1 && (i.frustumCulled = !1),
        this.renderOrder !== 0 && (i.renderOrder = this.renderOrder),
        this.static !== !1 && (i.static = this.static),
        Object.keys(this.userData).length > 0 && (i.userData = this.userData),
        (i.layers = this.layers.mask),
        (i.matrix = this.matrix.toArray()),
        (i.up = this.up.toArray()),
        this.pivot !== null && (i.pivot = this.pivot.toArray()),
        this.matrixAutoUpdate === !1 && (i.matrixAutoUpdate = !1),
        this.morphTargetDictionary !== void 0 &&
          (i.morphTargetDictionary = Object.assign({}, this.morphTargetDictionary)),
        this.morphTargetInfluences !== void 0 &&
          (i.morphTargetInfluences = this.morphTargetInfluences.slice()),
        this.isInstancedMesh &&
          ((i.type = 'InstancedMesh'),
          (i.count = this.count),
          (i.instanceMatrix = this.instanceMatrix.toJSON()),
          this.instanceColor !== null && (i.instanceColor = this.instanceColor.toJSON())),
        this.isBatchedMesh &&
          ((i.type = 'BatchedMesh'),
          (i.perObjectFrustumCulled = this.perObjectFrustumCulled),
          (i.sortObjects = this.sortObjects),
          (i.drawRanges = this._drawRanges),
          (i.reservedRanges = this._reservedRanges),
          (i.geometryInfo = this._geometryInfo.map((a) =>
            Li(xn({}, a), {
              boundingBox: a.boundingBox ? a.boundingBox.toJSON() : void 0,
              boundingSphere: a.boundingSphere ? a.boundingSphere.toJSON() : void 0,
            })
          )),
          (i.instanceInfo = this._instanceInfo.map((a) => xn({}, a))),
          (i.availableInstanceIds = this._availableInstanceIds.slice()),
          (i.availableGeometryIds = this._availableGeometryIds.slice()),
          (i.nextIndexStart = this._nextIndexStart),
          (i.nextVertexStart = this._nextVertexStart),
          (i.geometryCount = this._geometryCount),
          (i.maxInstanceCount = this._maxInstanceCount),
          (i.maxVertexCount = this._maxVertexCount),
          (i.maxIndexCount = this._maxIndexCount),
          (i.geometryInitialized = this._geometryInitialized),
          (i.matricesTexture = this._matricesTexture.toJSON(t)),
          (i.indirectTexture = this._indirectTexture.toJSON(t)),
          this._colorsTexture !== null && (i.colorsTexture = this._colorsTexture.toJSON(t)),
          this.boundingSphere !== null && (i.boundingSphere = this.boundingSphere.toJSON()),
          this.boundingBox !== null && (i.boundingBox = this.boundingBox.toJSON())));
      function s(a, o) {
        return (a[o.uuid] === void 0 && (a[o.uuid] = o.toJSON(t)), o.uuid);
      }
      if (this.isScene)
        (this.background &&
          (this.background.isColor
            ? (i.background = this.background.toJSON())
            : this.background.isTexture && (i.background = this.background.toJSON(t).uuid)),
          this.environment &&
            this.environment.isTexture &&
            this.environment.isRenderTargetTexture !== !0 &&
            (i.environment = this.environment.toJSON(t).uuid));
      else if (this.isMesh || this.isLine || this.isPoints) {
        i.geometry = s(t.geometries, this.geometry);
        let a = this.geometry.parameters;
        if (a !== void 0 && a.shapes !== void 0) {
          let o = a.shapes;
          if (Array.isArray(o))
            for (let l = 0, c = o.length; l < c; l++) {
              let u = o[l];
              s(t.shapes, u);
            }
          else s(t.shapes, o);
        }
      }
      if (
        (this.isSkinnedMesh &&
          ((i.bindMode = this.bindMode),
          (i.bindMatrix = this.bindMatrix.toArray()),
          this.skeleton !== void 0 &&
            (s(t.skeletons, this.skeleton), (i.skeleton = this.skeleton.uuid))),
        this.material !== void 0)
      )
        if (Array.isArray(this.material)) {
          let a = [];
          for (let o = 0, l = this.material.length; o < l; o++)
            a.push(s(t.materials, this.material[o]));
          i.material = a;
        } else i.material = s(t.materials, this.material);
      if (this.children.length > 0) {
        i.children = [];
        for (let a = 0; a < this.children.length; a++)
          i.children.push(this.children[a].toJSON(t).object);
      }
      if (this.animations.length > 0) {
        i.animations = [];
        for (let a = 0; a < this.animations.length; a++) {
          let o = this.animations[a];
          i.animations.push(s(t.animations, o));
        }
      }
      if (e) {
        let a = r(t.geometries),
          o = r(t.materials),
          l = r(t.textures),
          c = r(t.images),
          u = r(t.shapes),
          d = r(t.skeletons),
          f = r(t.animations),
          p = r(t.nodes);
        (a.length > 0 && (n.geometries = a),
          o.length > 0 && (n.materials = o),
          l.length > 0 && (n.textures = l),
          c.length > 0 && (n.images = c),
          u.length > 0 && (n.shapes = u),
          d.length > 0 && (n.skeletons = d),
          f.length > 0 && (n.animations = f),
          p.length > 0 && (n.nodes = p));
      }
      return ((n.object = i), n);
      function r(a) {
        let o = [];
        for (let l in a) {
          let c = a[l];
          (delete c.metadata, o.push(c));
        }
        return o;
      }
    }
    clone(t) {
      return new this.constructor().copy(this, t);
    }
    copy(t, e = !0) {
      if (
        ((this.name = t.name),
        this.up.copy(t.up),
        this.position.copy(t.position),
        (this.rotation.order = t.rotation.order),
        this.quaternion.copy(t.quaternion),
        this.scale.copy(t.scale),
        (this.pivot = t.pivot !== null ? t.pivot.clone() : null),
        this.matrix.copy(t.matrix),
        this.matrixWorld.copy(t.matrixWorld),
        (this.matrixAutoUpdate = t.matrixAutoUpdate),
        (this.matrixWorldAutoUpdate = t.matrixWorldAutoUpdate),
        (this.matrixWorldNeedsUpdate = t.matrixWorldNeedsUpdate),
        (this.layers.mask = t.layers.mask),
        (this.visible = t.visible),
        (this.castShadow = t.castShadow),
        (this.receiveShadow = t.receiveShadow),
        (this.frustumCulled = t.frustumCulled),
        (this.renderOrder = t.renderOrder),
        (this.static = t.static),
        (this.animations = t.animations.slice()),
        (this.userData = JSON.parse(JSON.stringify(t.userData))),
        e === !0)
      )
        for (let n = 0; n < t.children.length; n++) {
          let i = t.children[n];
          this.add(i.clone());
        }
      return this;
    }
  };
((et.DEFAULT_UP = new g(0, 1, 0)),
  (et.DEFAULT_MATRIX_AUTO_UPDATE = !0),
  (et.DEFAULT_MATRIX_WORLD_AUTO_UPDATE = !0));
var Ze = class extends et {
    constructor() {
      (super(), (this.isGroup = !0), (this.type = 'Group'));
    }
  },
  ms = {
    aliceblue: 15792383,
    antiquewhite: 16444375,
    aqua: 65535,
    aquamarine: 8388564,
    azure: 15794175,
    beige: 16119260,
    bisque: 16770244,
    black: 0,
    blanchedalmond: 16772045,
    blue: 255,
    blueviolet: 9055202,
    brown: 10824234,
    burlywood: 14596231,
    cadetblue: 6266528,
    chartreuse: 8388352,
    chocolate: 13789470,
    coral: 16744272,
    cornflowerblue: 6591981,
    cornsilk: 16775388,
    crimson: 14423100,
    cyan: 65535,
    darkblue: 139,
    darkcyan: 35723,
    darkgoldenrod: 12092939,
    darkgray: 11119017,
    darkgreen: 25600,
    darkgrey: 11119017,
    darkkhaki: 12433259,
    darkmagenta: 9109643,
    darkolivegreen: 5597999,
    darkorange: 16747520,
    darkorchid: 10040012,
    darkred: 9109504,
    darksalmon: 15308410,
    darkseagreen: 9419919,
    darkslateblue: 4734347,
    darkslategray: 3100495,
    darkslategrey: 3100495,
    darkturquoise: 52945,
    darkviolet: 9699539,
    deeppink: 16716947,
    deepskyblue: 49151,
    dimgray: 6908265,
    dimgrey: 6908265,
    dodgerblue: 2003199,
    firebrick: 11674146,
    floralwhite: 16775920,
    forestgreen: 2263842,
    fuchsia: 16711935,
    gainsboro: 14474460,
    ghostwhite: 16316671,
    gold: 16766720,
    goldenrod: 14329120,
    gray: 8421504,
    green: 32768,
    greenyellow: 11403055,
    grey: 8421504,
    honeydew: 15794160,
    hotpink: 16738740,
    indianred: 13458524,
    indigo: 4915330,
    ivory: 16777200,
    khaki: 15787660,
    lavender: 15132410,
    lavenderblush: 16773365,
    lawngreen: 8190976,
    lemonchiffon: 16775885,
    lightblue: 11393254,
    lightcoral: 15761536,
    lightcyan: 14745599,
    lightgoldenrodyellow: 16448210,
    lightgray: 13882323,
    lightgreen: 9498256,
    lightgrey: 13882323,
    lightpink: 16758465,
    lightsalmon: 16752762,
    lightseagreen: 2142890,
    lightskyblue: 8900346,
    lightslategray: 7833753,
    lightslategrey: 7833753,
    lightsteelblue: 11584734,
    lightyellow: 16777184,
    lime: 65280,
    limegreen: 3329330,
    linen: 16445670,
    magenta: 16711935,
    maroon: 8388608,
    mediumaquamarine: 6737322,
    mediumblue: 205,
    mediumorchid: 12211667,
    mediumpurple: 9662683,
    mediumseagreen: 3978097,
    mediumslateblue: 8087790,
    mediumspringgreen: 64154,
    mediumturquoise: 4772300,
    mediumvioletred: 13047173,
    midnightblue: 1644912,
    mintcream: 16121850,
    mistyrose: 16770273,
    moccasin: 16770229,
    navajowhite: 16768685,
    navy: 128,
    oldlace: 16643558,
    olive: 8421376,
    olivedrab: 7048739,
    orange: 16753920,
    orangered: 16729344,
    orchid: 14315734,
    palegoldenrod: 15657130,
    palegreen: 10025880,
    paleturquoise: 11529966,
    palevioletred: 14381203,
    papayawhip: 16773077,
    peachpuff: 16767673,
    peru: 13468991,
    pink: 16761035,
    plum: 14524637,
    powderblue: 11591910,
    purple: 8388736,
    rebeccapurple: 6697881,
    red: 16711680,
    rosybrown: 12357519,
    royalblue: 4286945,
    saddlebrown: 9127187,
    salmon: 16416882,
    sandybrown: 16032864,
    seagreen: 3050327,
    seashell: 16774638,
    sienna: 10506797,
    silver: 12632256,
    skyblue: 8900331,
    slateblue: 6970061,
    slategray: 7372944,
    slategrey: 7372944,
    snow: 16775930,
    springgreen: 65407,
    steelblue: 4620980,
    tan: 13808780,
    teal: 32896,
    thistle: 14204888,
    tomato: 16737095,
    turquoise: 4251856,
    violet: 15631086,
    wheat: 16113331,
    white: 16777215,
    whitesmoke: 16119285,
    yellow: 16776960,
    yellowgreen: 10145074,
  },
  mt = { h: 0, s: 0, l: 0 },
  ye = { h: 0, s: 0, l: 0 };
function Tn(h9, t, e) {
  return (
    e < 0 && (e += 1),
    e > 1 && (e -= 1),
    e < 1 / 6
      ? h9 + (t - h9) * 6 * e
      : e < 1 / 2
        ? t
        : e < 2 / 3
          ? h9 + (t - h9) * 6 * (2 / 3 - e)
          : h9
  );
}
var U = class {
    constructor(t, e, n) {
      return ((this.isColor = !0), (this.r = 1), (this.g = 1), (this.b = 1), this.set(t, e, n));
    }
    set(t, e, n) {
      if (e === void 0 && n === void 0) {
        let i = t;
        i && i.isColor
          ? this.copy(i)
          : typeof i == 'number'
            ? this.setHex(i)
            : typeof i == 'string' && this.setStyle(i);
      } else this.setRGB(t, e, n);
      return this;
    }
    setScalar(t) {
      return ((this.r = t), (this.g = t), (this.b = t), this);
    }
    setHex(t, e = $) {
      return (
        (t = Math.floor(t)),
        (this.r = ((t >> 16) & 255) / 255),
        (this.g = ((t >> 8) & 255) / 255),
        (this.b = (t & 255) / 255),
        tt.colorSpaceToWorking(this, e),
        this
      );
    }
    setRGB(t, e, n, i = tt.workingColorSpace) {
      return ((this.r = t), (this.g = e), (this.b = n), tt.colorSpaceToWorking(this, i), this);
    }
    setHSL(t, e, n, i = tt.workingColorSpace) {
      if (((t = Mi(t, 1)), (e = C(e, 0, 1)), (n = C(n, 0, 1)), e === 0))
        this.r = this.g = this.b = n;
      else {
        let s = n <= 0.5 ? n * (1 + e) : n + e - n * e,
          r = 2 * n - s;
        ((this.r = Tn(r, s, t + 1 / 3)), (this.g = Tn(r, s, t)), (this.b = Tn(r, s, t - 1 / 3)));
      }
      return (tt.colorSpaceToWorking(this, i), this);
    }
    setStyle(t, e = $) {
      function n(s) {
        s !== void 0 &&
          parseFloat(s) < 1 &&
          z('Color: Alpha component of ' + t + ' will be ignored.');
      }
      let i;
      if ((i = /^(\w+)\(([^\)]*)\)/.exec(t))) {
        let s,
          r = i[1],
          a = i[2];
        switch (r) {
          case 'rgb':
          case 'rgba':
            if ((s = /^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a)))
              return (
                n(s[4]),
                this.setRGB(
                  Math.min(255, parseInt(s[1], 10)) / 255,
                  Math.min(255, parseInt(s[2], 10)) / 255,
                  Math.min(255, parseInt(s[3], 10)) / 255,
                  e
                )
              );
            if ((s = /^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a)))
              return (
                n(s[4]),
                this.setRGB(
                  Math.min(100, parseInt(s[1], 10)) / 100,
                  Math.min(100, parseInt(s[2], 10)) / 100,
                  Math.min(100, parseInt(s[3], 10)) / 100,
                  e
                )
              );
            break;
          case 'hsl':
          case 'hsla':
            if (
              (s =
                /^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(
                  a
                ))
            )
              return (
                n(s[4]),
                this.setHSL(
                  parseFloat(s[1]) / 360,
                  parseFloat(s[2]) / 100,
                  parseFloat(s[3]) / 100,
                  e
                )
              );
            break;
          default:
            z('Color: Unknown color model ' + t);
        }
      } else if ((i = /^\#([A-Fa-f\d]+)$/.exec(t))) {
        let s = i[1],
          r = s.length;
        if (r === 3)
          return this.setRGB(
            parseInt(s.charAt(0), 16) / 15,
            parseInt(s.charAt(1), 16) / 15,
            parseInt(s.charAt(2), 16) / 15,
            e
          );
        if (r === 6) return this.setHex(parseInt(s, 16), e);
        z('Color: Invalid hex color ' + t);
      } else if (t && t.length > 0) return this.setColorName(t, e);
      return this;
    }
    setColorName(t, e = $) {
      let n = ms[t.toLowerCase()];
      return (n !== void 0 ? this.setHex(n, e) : z('Color: Unknown color ' + t), this);
    }
    clone() {
      return new this.constructor(this.r, this.g, this.b);
    }
    copy(t) {
      return ((this.r = t.r), (this.g = t.g), (this.b = t.b), this);
    }
    copySRGBToLinear(t) {
      return ((this.r = ft(t.r)), (this.g = ft(t.g)), (this.b = ft(t.b)), this);
    }
    copyLinearToSRGB(t) {
      return ((this.r = Jt(t.r)), (this.g = Jt(t.g)), (this.b = Jt(t.b)), this);
    }
    convertSRGBToLinear() {
      return (this.copySRGBToLinear(this), this);
    }
    convertLinearToSRGB() {
      return (this.copyLinearToSRGB(this), this);
    }
    getHex(t = $) {
      return (
        tt.workingToColorSpace(X.copy(this), t),
        Math.round(C(X.r * 255, 0, 255)) * 65536 +
          Math.round(C(X.g * 255, 0, 255)) * 256 +
          Math.round(C(X.b * 255, 0, 255))
      );
    }
    getHexString(t = $) {
      return ('000000' + this.getHex(t).toString(16)).slice(-6);
    }
    getHSL(t, e = tt.workingColorSpace) {
      tt.workingToColorSpace(X.copy(this), e);
      let n = X.r,
        i = X.g,
        s = X.b,
        r = Math.max(n, i, s),
        a = Math.min(n, i, s),
        o,
        l,
        c = (a + r) / 2;
      if (a === r) ((o = 0), (l = 0));
      else {
        let u = r - a;
        switch (((l = c <= 0.5 ? u / (r + a) : u / (2 - r - a)), r)) {
          case n:
            o = (i - s) / u + (i < s ? 6 : 0);
            break;
          case i:
            o = (s - n) / u + 2;
            break;
          case s:
            o = (n - i) / u + 4;
            break;
        }
        o /= 6;
      }
      return ((t.h = o), (t.s = l), (t.l = c), t);
    }
    getRGB(t, e = tt.workingColorSpace) {
      return (tt.workingToColorSpace(X.copy(this), e), (t.r = X.r), (t.g = X.g), (t.b = X.b), t);
    }
    getStyle(t = $) {
      tt.workingToColorSpace(X.copy(this), t);
      let e = X.r,
        n = X.g,
        i = X.b;
      return t !== $
        ? `color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`
        : `rgb(${Math.round(e * 255)},${Math.round(n * 255)},${Math.round(i * 255)})`;
    }
    offsetHSL(t, e, n) {
      return (this.getHSL(mt), this.setHSL(mt.h + t, mt.s + e, mt.l + n));
    }
    add(t) {
      return ((this.r += t.r), (this.g += t.g), (this.b += t.b), this);
    }
    addColors(t, e) {
      return ((this.r = t.r + e.r), (this.g = t.g + e.g), (this.b = t.b + e.b), this);
    }
    addScalar(t) {
      return ((this.r += t), (this.g += t), (this.b += t), this);
    }
    sub(t) {
      return (
        (this.r = Math.max(0, this.r - t.r)),
        (this.g = Math.max(0, this.g - t.g)),
        (this.b = Math.max(0, this.b - t.b)),
        this
      );
    }
    multiply(t) {
      return ((this.r *= t.r), (this.g *= t.g), (this.b *= t.b), this);
    }
    multiplyScalar(t) {
      return ((this.r *= t), (this.g *= t), (this.b *= t), this);
    }
    lerp(t, e) {
      return (
        (this.r += (t.r - this.r) * e),
        (this.g += (t.g - this.g) * e),
        (this.b += (t.b - this.b) * e),
        this
      );
    }
    lerpColors(t, e, n) {
      return (
        (this.r = t.r + (e.r - t.r) * n),
        (this.g = t.g + (e.g - t.g) * n),
        (this.b = t.b + (e.b - t.b) * n),
        this
      );
    }
    lerpHSL(t, e) {
      (this.getHSL(mt), t.getHSL(ye));
      let n = re(mt.h, ye.h, e),
        i = re(mt.s, ye.s, e),
        s = re(mt.l, ye.l, e);
      return (this.setHSL(n, i, s), this);
    }
    setFromVector3(t) {
      return ((this.r = t.x), (this.g = t.y), (this.b = t.z), this);
    }
    applyMatrix3(t) {
      let e = this.r,
        n = this.g,
        i = this.b,
        s = t.elements;
      return (
        (this.r = s[0] * e + s[3] * n + s[6] * i),
        (this.g = s[1] * e + s[4] * n + s[7] * i),
        (this.b = s[2] * e + s[5] * n + s[8] * i),
        this
      );
    }
    equals(t) {
      return t.r === this.r && t.g === this.g && t.b === this.b;
    }
    fromArray(t, e = 0) {
      return ((this.r = t[e]), (this.g = t[e + 1]), (this.b = t[e + 2]), this);
    }
    toArray(t = [], e = 0) {
      return ((t[e] = this.r), (t[e + 1] = this.g), (t[e + 2] = this.b), t);
    }
    fromBufferAttribute(t, e) {
      return ((this.r = t.getX(e)), (this.g = t.getY(e)), (this.b = t.getZ(e)), this);
    }
    toJSON() {
      return this.getHex();
    }
    *[Symbol.iterator]() {
      (yield this.r, yield this.g, yield this.b);
    }
  },
  X = new U();
U.NAMES = ms;
var Je = class h4 {
    constructor(t, e = 1, n = 1e3) {
      ((this.isFog = !0),
        (this.name = ''),
        (this.color = new U(t)),
        (this.near = e),
        (this.far = n));
    }
    clone() {
      return new h4(this.color, this.near, this.far);
    }
    toJSON() {
      return {
        type: 'Fog',
        name: this.name,
        color: this.color.getHex(),
        near: this.near,
        far: this.far,
      };
    }
  },
  $e = class extends et {
    constructor() {
      (super(),
        (this.isScene = !0),
        (this.type = 'Scene'),
        (this.background = null),
        (this.environment = null),
        (this.fog = null),
        (this.backgroundBlurriness = 0),
        (this.backgroundIntensity = 1),
        (this.backgroundRotation = new St()),
        (this.environmentIntensity = 1),
        (this.environmentRotation = new St()),
        (this.overrideMaterial = null),
        typeof __THREE_DEVTOOLS__ != 'undefined' &&
          __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent('observe', { detail: this })));
    }
    copy(t, e) {
      return (
        super.copy(t, e),
        t.background !== null && (this.background = t.background.clone()),
        t.environment !== null && (this.environment = t.environment.clone()),
        t.fog !== null && (this.fog = t.fog.clone()),
        (this.backgroundBlurriness = t.backgroundBlurriness),
        (this.backgroundIntensity = t.backgroundIntensity),
        this.backgroundRotation.copy(t.backgroundRotation),
        (this.environmentIntensity = t.environmentIntensity),
        this.environmentRotation.copy(t.environmentRotation),
        t.overrideMaterial !== null && (this.overrideMaterial = t.overrideMaterial.clone()),
        (this.matrixAutoUpdate = t.matrixAutoUpdate),
        this
      );
    }
    toJSON(t) {
      let e = super.toJSON(t);
      return (
        this.fog !== null && (e.object.fog = this.fog.toJSON()),
        this.backgroundBlurriness > 0 &&
          (e.object.backgroundBlurriness = this.backgroundBlurriness),
        this.backgroundIntensity !== 1 && (e.object.backgroundIntensity = this.backgroundIntensity),
        (e.object.backgroundRotation = this.backgroundRotation.toArray()),
        this.environmentIntensity !== 1 &&
          (e.object.environmentIntensity = this.environmentIntensity),
        (e.object.environmentRotation = this.environmentRotation.toArray()),
        e
      );
    }
  },
  it = new g(),
  ct = new g(),
  An = new g(),
  ht = new g(),
  Vt = new g(),
  kt = new g(),
  Xi = new g(),
  En = new g(),
  wn = new g(),
  Cn = new g(),
  Rn = new Nt(),
  In = new Nt(),
  Pn = new Nt(),
  yt = class h5 {
    constructor(t = new g(), e = new g(), n = new g()) {
      ((this.a = t), (this.b = e), (this.c = n));
    }
    static getNormal(t, e, n, i) {
      (i.subVectors(n, e), it.subVectors(t, e), i.cross(it));
      let s = i.lengthSq();
      return s > 0 ? i.multiplyScalar(1 / Math.sqrt(s)) : i.set(0, 0, 0);
    }
    static getBarycoord(t, e, n, i, s) {
      (it.subVectors(i, e), ct.subVectors(n, e), An.subVectors(t, e));
      let r = it.dot(it),
        a = it.dot(ct),
        o = it.dot(An),
        l = ct.dot(ct),
        c = ct.dot(An),
        u = r * l - a * a;
      if (u === 0) return (s.set(0, 0, 0), null);
      let d = 1 / u,
        f = (l * o - a * c) * d,
        p = (r * c - a * o) * d;
      return s.set(1 - f - p, p, f);
    }
    static containsPoint(t, e, n, i) {
      return this.getBarycoord(t, e, n, i, ht) === null
        ? !1
        : ht.x >= 0 && ht.y >= 0 && ht.x + ht.y <= 1;
    }
    static getInterpolation(t, e, n, i, s, r, a, o) {
      return this.getBarycoord(t, e, n, i, ht) === null
        ? ((o.x = 0), (o.y = 0), 'z' in o && (o.z = 0), 'w' in o && (o.w = 0), null)
        : (o.setScalar(0),
          o.addScaledVector(s, ht.x),
          o.addScaledVector(r, ht.y),
          o.addScaledVector(a, ht.z),
          o);
    }
    static getInterpolatedAttribute(t, e, n, i, s, r) {
      return (
        Rn.setScalar(0),
        In.setScalar(0),
        Pn.setScalar(0),
        Rn.fromBufferAttribute(t, e),
        In.fromBufferAttribute(t, n),
        Pn.fromBufferAttribute(t, i),
        r.setScalar(0),
        r.addScaledVector(Rn, s.x),
        r.addScaledVector(In, s.y),
        r.addScaledVector(Pn, s.z),
        r
      );
    }
    static isFrontFacing(t, e, n, i) {
      return (it.subVectors(n, e), ct.subVectors(t, e), it.cross(ct).dot(i) < 0);
    }
    set(t, e, n) {
      return (this.a.copy(t), this.b.copy(e), this.c.copy(n), this);
    }
    setFromPointsAndIndices(t, e, n, i) {
      return (this.a.copy(t[e]), this.b.copy(t[n]), this.c.copy(t[i]), this);
    }
    setFromAttributeAndIndices(t, e, n, i) {
      return (
        this.a.fromBufferAttribute(t, e),
        this.b.fromBufferAttribute(t, n),
        this.c.fromBufferAttribute(t, i),
        this
      );
    }
    clone() {
      return new this.constructor().copy(this);
    }
    copy(t) {
      return (this.a.copy(t.a), this.b.copy(t.b), this.c.copy(t.c), this);
    }
    getArea() {
      return (
        it.subVectors(this.c, this.b),
        ct.subVectors(this.a, this.b),
        it.cross(ct).length() * 0.5
      );
    }
    getMidpoint(t) {
      return t
        .addVectors(this.a, this.b)
        .add(this.c)
        .multiplyScalar(1 / 3);
    }
    getNormal(t) {
      return h5.getNormal(this.a, this.b, this.c, t);
    }
    getPlane(t) {
      return t.setFromCoplanarPoints(this.a, this.b, this.c);
    }
    getBarycoord(t, e) {
      return h5.getBarycoord(t, this.a, this.b, this.c, e);
    }
    getInterpolation(t, e, n, i, s) {
      return h5.getInterpolation(t, this.a, this.b, this.c, e, n, i, s);
    }
    containsPoint(t) {
      return h5.containsPoint(t, this.a, this.b, this.c);
    }
    isFrontFacing(t) {
      return h5.isFrontFacing(this.a, this.b, this.c, t);
    }
    intersectsBox(t) {
      return t.intersectsTriangle(this);
    }
    closestPointToPoint(t, e) {
      let n = this.a,
        i = this.b,
        s = this.c,
        r,
        a;
      (Vt.subVectors(i, n), kt.subVectors(s, n), En.subVectors(t, n));
      let o = Vt.dot(En),
        l = kt.dot(En);
      if (o <= 0 && l <= 0) return e.copy(n);
      wn.subVectors(t, i);
      let c = Vt.dot(wn),
        u = kt.dot(wn);
      if (c >= 0 && u <= c) return e.copy(i);
      let d = o * u - c * l;
      if (d <= 0 && o >= 0 && c <= 0) return ((r = o / (o - c)), e.copy(n).addScaledVector(Vt, r));
      Cn.subVectors(t, s);
      let f = Vt.dot(Cn),
        p = kt.dot(Cn);
      if (p >= 0 && f <= p) return e.copy(s);
      let m = f * l - o * p;
      if (m <= 0 && l >= 0 && p <= 0) return ((a = l / (l - p)), e.copy(n).addScaledVector(kt, a));
      let _ = c * p - f * u;
      if (_ <= 0 && u - c >= 0 && f - p >= 0)
        return (
          Xi.subVectors(s, i),
          (a = (u - c) / (u - c + (f - p))),
          e.copy(i).addScaledVector(Xi, a)
        );
      let x = 1 / (_ + m + d);
      return ((r = m * x), (a = d * x), e.copy(n).addScaledVector(Vt, r).addScaledVector(kt, a));
    }
    equals(t) {
      return t.a.equals(this.a) && t.b.equals(this.b) && t.c.equals(this.c);
    }
  },
  bt = class {
    constructor(t = new g(1 / 0, 1 / 0, 1 / 0), e = new g(-1 / 0, -1 / 0, -1 / 0)) {
      ((this.isBox3 = !0), (this.min = t), (this.max = e));
    }
    set(t, e) {
      return (this.min.copy(t), this.max.copy(e), this);
    }
    setFromArray(t) {
      this.makeEmpty();
      for (let e = 0, n = t.length; e < n; e += 3) this.expandByPoint(st.fromArray(t, e));
      return this;
    }
    setFromBufferAttribute(t) {
      this.makeEmpty();
      for (let e = 0, n = t.count; e < n; e++) this.expandByPoint(st.fromBufferAttribute(t, e));
      return this;
    }
    setFromPoints(t) {
      this.makeEmpty();
      for (let e = 0, n = t.length; e < n; e++) this.expandByPoint(t[e]);
      return this;
    }
    setFromCenterAndSize(t, e) {
      let n = st.copy(e).multiplyScalar(0.5);
      return (this.min.copy(t).sub(n), this.max.copy(t).add(n), this);
    }
    setFromObject(t, e = !1) {
      return (this.makeEmpty(), this.expandByObject(t, e));
    }
    clone() {
      return new this.constructor().copy(this);
    }
    copy(t) {
      return (this.min.copy(t.min), this.max.copy(t.max), this);
    }
    makeEmpty() {
      return (
        (this.min.x = this.min.y = this.min.z = 1 / 0),
        (this.max.x = this.max.y = this.max.z = -1 / 0),
        this
      );
    }
    isEmpty() {
      return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
    }
    getCenter(t) {
      return this.isEmpty() ? t.set(0, 0, 0) : t.addVectors(this.min, this.max).multiplyScalar(0.5);
    }
    getSize(t) {
      return this.isEmpty() ? t.set(0, 0, 0) : t.subVectors(this.max, this.min);
    }
    expandByPoint(t) {
      return (this.min.min(t), this.max.max(t), this);
    }
    expandByVector(t) {
      return (this.min.sub(t), this.max.add(t), this);
    }
    expandByScalar(t) {
      return (this.min.addScalar(-t), this.max.addScalar(t), this);
    }
    expandByObject(t, e = !1) {
      t.updateWorldMatrix(!1, !1);
      let n = t.geometry;
      if (n !== void 0) {
        let s = n.getAttribute('position');
        if (e === !0 && s !== void 0 && t.isInstancedMesh !== !0)
          for (let r = 0, a = s.count; r < a; r++)
            (t.isMesh === !0 ? t.getVertexPosition(r, st) : st.fromBufferAttribute(s, r),
              st.applyMatrix4(t.matrixWorld),
              this.expandByPoint(st));
        else
          (t.boundingBox !== void 0
            ? (t.boundingBox === null && t.computeBoundingBox(), Me.copy(t.boundingBox))
            : (n.boundingBox === null && n.computeBoundingBox(), Me.copy(n.boundingBox)),
            Me.applyMatrix4(t.matrixWorld),
            this.union(Me));
      }
      let i = t.children;
      for (let s = 0, r = i.length; s < r; s++) this.expandByObject(i[s], e);
      return this;
    }
    containsPoint(t) {
      return (
        t.x >= this.min.x &&
        t.x <= this.max.x &&
        t.y >= this.min.y &&
        t.y <= this.max.y &&
        t.z >= this.min.z &&
        t.z <= this.max.z
      );
    }
    containsBox(t) {
      return (
        this.min.x <= t.min.x &&
        t.max.x <= this.max.x &&
        this.min.y <= t.min.y &&
        t.max.y <= this.max.y &&
        this.min.z <= t.min.z &&
        t.max.z <= this.max.z
      );
    }
    getParameter(t, e) {
      return e.set(
        (t.x - this.min.x) / (this.max.x - this.min.x),
        (t.y - this.min.y) / (this.max.y - this.min.y),
        (t.z - this.min.z) / (this.max.z - this.min.z)
      );
    }
    intersectsBox(t) {
      return (
        t.max.x >= this.min.x &&
        t.min.x <= this.max.x &&
        t.max.y >= this.min.y &&
        t.min.y <= this.max.y &&
        t.max.z >= this.min.z &&
        t.min.z <= this.max.z
      );
    }
    intersectsSphere(t) {
      return (this.clampPoint(t.center, st), st.distanceToSquared(t.center) <= t.radius * t.radius);
    }
    intersectsPlane(t) {
      let e, n;
      return (
        t.normal.x > 0
          ? ((e = t.normal.x * this.min.x), (n = t.normal.x * this.max.x))
          : ((e = t.normal.x * this.max.x), (n = t.normal.x * this.min.x)),
        t.normal.y > 0
          ? ((e += t.normal.y * this.min.y), (n += t.normal.y * this.max.y))
          : ((e += t.normal.y * this.max.y), (n += t.normal.y * this.min.y)),
        t.normal.z > 0
          ? ((e += t.normal.z * this.min.z), (n += t.normal.z * this.max.z))
          : ((e += t.normal.z * this.max.z), (n += t.normal.z * this.min.z)),
        e <= -t.constant && n >= -t.constant
      );
    }
    intersectsTriangle(t) {
      if (this.isEmpty()) return !1;
      (this.getCenter(te),
        Se.subVectors(this.max, te),
        Gt.subVectors(t.a, te),
        Ht.subVectors(t.b, te),
        Wt.subVectors(t.c, te),
        gt.subVectors(Ht, Gt),
        _t.subVectors(Wt, Ht),
        Ct.subVectors(Gt, Wt));
      let e = [
        0,
        -gt.z,
        gt.y,
        0,
        -_t.z,
        _t.y,
        0,
        -Ct.z,
        Ct.y,
        gt.z,
        0,
        -gt.x,
        _t.z,
        0,
        -_t.x,
        Ct.z,
        0,
        -Ct.x,
        -gt.y,
        gt.x,
        0,
        -_t.y,
        _t.x,
        0,
        -Ct.y,
        Ct.x,
        0,
      ];
      return !Ln(e, Gt, Ht, Wt, Se) || ((e = [1, 0, 0, 0, 1, 0, 0, 0, 1]), !Ln(e, Gt, Ht, Wt, Se))
        ? !1
        : (be.crossVectors(gt, _t), (e = [be.x, be.y, be.z]), Ln(e, Gt, Ht, Wt, Se));
    }
    clampPoint(t, e) {
      return e.copy(t).clamp(this.min, this.max);
    }
    distanceToPoint(t) {
      return this.clampPoint(t, st).distanceTo(t);
    }
    getBoundingSphere(t) {
      return (
        this.isEmpty()
          ? t.makeEmpty()
          : (this.getCenter(t.center), (t.radius = this.getSize(st).length() * 0.5)),
        t
      );
    }
    intersect(t) {
      return (this.min.max(t.min), this.max.min(t.max), this.isEmpty() && this.makeEmpty(), this);
    }
    union(t) {
      return (this.min.min(t.min), this.max.max(t.max), this);
    }
    applyMatrix4(t) {
      return this.isEmpty()
        ? this
        : (ut[0].set(this.min.x, this.min.y, this.min.z).applyMatrix4(t),
          ut[1].set(this.min.x, this.min.y, this.max.z).applyMatrix4(t),
          ut[2].set(this.min.x, this.max.y, this.min.z).applyMatrix4(t),
          ut[3].set(this.min.x, this.max.y, this.max.z).applyMatrix4(t),
          ut[4].set(this.max.x, this.min.y, this.min.z).applyMatrix4(t),
          ut[5].set(this.max.x, this.min.y, this.max.z).applyMatrix4(t),
          ut[6].set(this.max.x, this.max.y, this.min.z).applyMatrix4(t),
          ut[7].set(this.max.x, this.max.y, this.max.z).applyMatrix4(t),
          this.setFromPoints(ut),
          this);
    }
    translate(t) {
      return (this.min.add(t), this.max.add(t), this);
    }
    equals(t) {
      return t.min.equals(this.min) && t.max.equals(this.max);
    }
    toJSON() {
      return { min: this.min.toArray(), max: this.max.toArray() };
    }
    fromJSON(t) {
      return (this.min.fromArray(t.min), this.max.fromArray(t.max), this);
    }
  },
  ut = [new g(), new g(), new g(), new g(), new g(), new g(), new g(), new g()],
  st = new g(),
  Me = new bt(),
  Gt = new g(),
  Ht = new g(),
  Wt = new g(),
  gt = new g(),
  _t = new g(),
  Ct = new g(),
  te = new g(),
  Se = new g(),
  be = new g(),
  Rt = new g();
function Ln(h9, t, e, n, i) {
  for (let s = 0, r = h9.length - 3; s <= r; s += 3) {
    Rt.fromArray(h9, s);
    let a = i.x * Math.abs(Rt.x) + i.y * Math.abs(Rt.y) + i.z * Math.abs(Rt.z),
      o = t.dot(Rt),
      l = e.dot(Rt),
      c = n.dot(Rt);
    if (Math.max(-Math.max(o, l, c), Math.min(o, l, c)) > a) return !1;
  }
  return !0;
}
var V = new g(),
  Te = new B(),
  Qs = 0,
  ot = class extends Mt {
    constructor(t, e, n = !1) {
      if ((super(), Array.isArray(t)))
        throw new TypeError('THREE.BufferAttribute: array should be a Typed Array.');
      ((this.isBufferAttribute = !0),
        Object.defineProperty(this, 'id', { value: Qs++ }),
        (this.name = ''),
        (this.array = t),
        (this.itemSize = e),
        (this.count = t !== void 0 ? t.length / e : 0),
        (this.normalized = n),
        (this.usage = si),
        (this.updateRanges = []),
        (this.gpuType = us),
        (this.version = 0));
    }
    onUploadCallback() {}
    set needsUpdate(t) {
      t === !0 && this.version++;
    }
    setUsage(t) {
      return ((this.usage = t), this);
    }
    addUpdateRange(t, e) {
      this.updateRanges.push({ start: t, count: e });
    }
    clearUpdateRanges() {
      this.updateRanges.length = 0;
    }
    copy(t) {
      return (
        (this.name = t.name),
        (this.array = new t.array.constructor(t.array)),
        (this.itemSize = t.itemSize),
        (this.count = t.count),
        (this.normalized = t.normalized),
        (this.usage = t.usage),
        (this.gpuType = t.gpuType),
        this
      );
    }
    copyAt(t, e, n) {
      ((t *= this.itemSize), (n *= e.itemSize));
      for (let i = 0, s = this.itemSize; i < s; i++) this.array[t + i] = e.array[n + i];
      return this;
    }
    copyArray(t) {
      return (this.array.set(t), this);
    }
    applyMatrix3(t) {
      if (this.itemSize === 2)
        for (let e = 0, n = this.count; e < n; e++)
          (Te.fromBufferAttribute(this, e), Te.applyMatrix3(t), this.setXY(e, Te.x, Te.y));
      else if (this.itemSize === 3)
        for (let e = 0, n = this.count; e < n; e++)
          (V.fromBufferAttribute(this, e), V.applyMatrix3(t), this.setXYZ(e, V.x, V.y, V.z));
      return this;
    }
    applyMatrix4(t) {
      for (let e = 0, n = this.count; e < n; e++)
        (V.fromBufferAttribute(this, e), V.applyMatrix4(t), this.setXYZ(e, V.x, V.y, V.z));
      return this;
    }
    applyNormalMatrix(t) {
      for (let e = 0, n = this.count; e < n; e++)
        (V.fromBufferAttribute(this, e), V.applyNormalMatrix(t), this.setXYZ(e, V.x, V.y, V.z));
      return this;
    }
    transformDirection(t) {
      for (let e = 0, n = this.count; e < n; e++)
        (V.fromBufferAttribute(this, e), V.transformDirection(t), this.setXYZ(e, V.x, V.y, V.z));
      return this;
    }
    set(t, e = 0) {
      return (this.array.set(t, e), this);
    }
    getComponent(t, e) {
      let n = this.array[t * this.itemSize + e];
      return (this.normalized && (n = qt(n, this.array)), n);
    }
    setComponent(t, e, n) {
      return (
        this.normalized && (n = q(n, this.array)),
        (this.array[t * this.itemSize + e] = n),
        this
      );
    }
    getX(t) {
      let e = this.array[t * this.itemSize];
      return (this.normalized && (e = qt(e, this.array)), e);
    }
    setX(t, e) {
      return (this.normalized && (e = q(e, this.array)), (this.array[t * this.itemSize] = e), this);
    }
    getY(t) {
      let e = this.array[t * this.itemSize + 1];
      return (this.normalized && (e = qt(e, this.array)), e);
    }
    setY(t, e) {
      return (
        this.normalized && (e = q(e, this.array)),
        (this.array[t * this.itemSize + 1] = e),
        this
      );
    }
    getZ(t) {
      let e = this.array[t * this.itemSize + 2];
      return (this.normalized && (e = qt(e, this.array)), e);
    }
    setZ(t, e) {
      return (
        this.normalized && (e = q(e, this.array)),
        (this.array[t * this.itemSize + 2] = e),
        this
      );
    }
    getW(t) {
      let e = this.array[t * this.itemSize + 3];
      return (this.normalized && (e = qt(e, this.array)), e);
    }
    setW(t, e) {
      return (
        this.normalized && (e = q(e, this.array)),
        (this.array[t * this.itemSize + 3] = e),
        this
      );
    }
    setXY(t, e, n) {
      return (
        (t *= this.itemSize),
        this.normalized && ((e = q(e, this.array)), (n = q(n, this.array))),
        (this.array[t + 0] = e),
        (this.array[t + 1] = n),
        this
      );
    }
    setXYZ(t, e, n, i) {
      return (
        (t *= this.itemSize),
        this.normalized && ((e = q(e, this.array)), (n = q(n, this.array)), (i = q(i, this.array))),
        (this.array[t + 0] = e),
        (this.array[t + 1] = n),
        (this.array[t + 2] = i),
        this
      );
    }
    setXYZW(t, e, n, i, s) {
      return (
        (t *= this.itemSize),
        this.normalized &&
          ((e = q(e, this.array)),
          (n = q(n, this.array)),
          (i = q(i, this.array)),
          (s = q(s, this.array))),
        (this.array[t + 0] = e),
        (this.array[t + 1] = n),
        (this.array[t + 2] = i),
        (this.array[t + 3] = s),
        this
      );
    }
    onUpload(t) {
      return ((this.onUploadCallback = t), this);
    }
    clone() {
      return new this.constructor(this.array, this.itemSize).copy(this);
    }
    toJSON() {
      let t = {
        itemSize: this.itemSize,
        type: this.array.constructor.name,
        array: Array.from(this.array),
        normalized: this.normalized,
      };
      return (
        this.name !== '' && (t.name = this.name),
        this.usage !== si && (t.usage = this.usage),
        t
      );
    }
    dispose() {
      this.dispatchEvent({ type: 'dispose' });
    }
  },
  Ke = class extends ot {
    constructor(t, e, n) {
      super(new Uint16Array(t), e, n);
    }
  },
  Qe = class extends ot {
    constructor(t, e, n) {
      super(new Uint32Array(t), e, n);
    }
  },
  Lt = class extends ot {
    constructor(t, e, n) {
      super(new Float32Array(t), e, n);
    }
  },
  js = new bt(),
  ee = new g(),
  Dn = new g(),
  $t = class {
    constructor(t = new g(), e = -1) {
      ((this.isSphere = !0), (this.center = t), (this.radius = e));
    }
    set(t, e) {
      return (this.center.copy(t), (this.radius = e), this);
    }
    setFromPoints(t, e) {
      let n = this.center;
      e !== void 0 ? n.copy(e) : js.setFromPoints(t).getCenter(n);
      let i = 0;
      for (let s = 0, r = t.length; s < r; s++) i = Math.max(i, n.distanceToSquared(t[s]));
      return ((this.radius = Math.sqrt(i)), this);
    }
    copy(t) {
      return (this.center.copy(t.center), (this.radius = t.radius), this);
    }
    isEmpty() {
      return this.radius < 0;
    }
    makeEmpty() {
      return (this.center.set(0, 0, 0), (this.radius = -1), this);
    }
    containsPoint(t) {
      return t.distanceToSquared(this.center) <= this.radius * this.radius;
    }
    distanceToPoint(t) {
      return t.distanceTo(this.center) - this.radius;
    }
    intersectsSphere(t) {
      let e = this.radius + t.radius;
      return t.center.distanceToSquared(this.center) <= e * e;
    }
    intersectsBox(t) {
      return t.intersectsSphere(this);
    }
    intersectsPlane(t) {
      return Math.abs(t.distanceToPoint(this.center)) <= this.radius;
    }
    clampPoint(t, e) {
      let n = this.center.distanceToSquared(t);
      return (
        e.copy(t),
        n > this.radius * this.radius &&
          (e.sub(this.center).normalize(), e.multiplyScalar(this.radius).add(this.center)),
        e
      );
    }
    getBoundingBox(t) {
      return this.isEmpty()
        ? (t.makeEmpty(), t)
        : (t.set(this.center, this.center), t.expandByScalar(this.radius), t);
    }
    applyMatrix4(t) {
      return (
        this.center.applyMatrix4(t),
        (this.radius = this.radius * t.getMaxScaleOnAxis()),
        this
      );
    }
    translate(t) {
      return (this.center.add(t), this);
    }
    expandByPoint(t) {
      if (this.isEmpty()) return (this.center.copy(t), (this.radius = 0), this);
      ee.subVectors(t, this.center);
      let e = ee.lengthSq();
      if (e > this.radius * this.radius) {
        let n = Math.sqrt(e),
          i = (n - this.radius) * 0.5;
        (this.center.addScaledVector(ee, i / n), (this.radius += i));
      }
      return this;
    }
    union(t) {
      return t.isEmpty()
        ? this
        : this.isEmpty()
          ? (this.copy(t), this)
          : (this.center.equals(t.center) === !0
              ? (this.radius = Math.max(this.radius, t.radius))
              : (Dn.subVectors(t.center, this.center).setLength(t.radius),
                this.expandByPoint(ee.copy(t.center).add(Dn)),
                this.expandByPoint(ee.copy(t.center).sub(Dn))),
            this);
    }
    equals(t) {
      return t.center.equals(this.center) && t.radius === this.radius;
    }
    clone() {
      return new this.constructor().copy(this);
    }
    toJSON() {
      return { radius: this.radius, center: this.center.toArray() };
    }
    fromJSON(t) {
      return ((this.radius = t.radius), this.center.fromArray(t.center), this);
    }
  },
  tr = 0,
  j = new H(),
  Nn = new et(),
  Xt = new g(),
  J = new bt(),
  ne = new bt(),
  G = new g(),
  Ut = class h6 extends Mt {
    constructor() {
      (super(),
        (this.isBufferGeometry = !0),
        Object.defineProperty(this, 'id', { value: tr++ }),
        (this.uuid = Qt()),
        (this.name = ''),
        (this.type = 'BufferGeometry'),
        (this.index = null),
        (this.indirect = null),
        (this.indirectOffset = 0),
        (this.attributes = {}),
        (this.morphAttributes = {}),
        (this.morphTargetsRelative = !1),
        (this.groups = []),
        (this.boundingBox = null),
        (this.boundingSphere = null),
        (this.drawRange = { start: 0, count: 1 / 0 }),
        (this.userData = {}),
        (this._transformed = !1));
    }
    getIndex() {
      return this.index;
    }
    setIndex(t) {
      return (
        Array.isArray(t) ? (this.index = new (Ts(t) ? Qe : Ke)(t, 1)) : (this.index = t),
        this
      );
    }
    setIndirect(t, e = 0) {
      return ((this.indirect = t), (this.indirectOffset = e), this);
    }
    getIndirect() {
      return this.indirect;
    }
    getAttribute(t) {
      return this.attributes[t];
    }
    setAttribute(t, e) {
      return ((this.attributes[t] = e), this);
    }
    deleteAttribute(t) {
      return (delete this.attributes[t], this);
    }
    hasAttribute(t) {
      return this.attributes[t] !== void 0;
    }
    addGroup(t, e, n = 0) {
      this.groups.push({ start: t, count: e, materialIndex: n });
    }
    clearGroups() {
      this.groups = [];
    }
    setDrawRange(t, e) {
      ((this.drawRange.start = t), (this.drawRange.count = e));
    }
    applyMatrix4(t) {
      let e = this.attributes.position;
      e !== void 0 && (e.applyMatrix4(t), (e.needsUpdate = !0));
      let n = this.attributes.normal;
      if (n !== void 0) {
        let s = new E().getNormalMatrix(t);
        (n.applyNormalMatrix(s), (n.needsUpdate = !0));
      }
      let i = this.attributes.tangent;
      return (
        i !== void 0 && (i.transformDirection(t), (i.needsUpdate = !0)),
        this.boundingBox !== null && this.computeBoundingBox(),
        this.boundingSphere !== null && this.computeBoundingSphere(),
        (this._transformed = !0),
        this
      );
    }
    applyQuaternion(t) {
      return (j.makeRotationFromQuaternion(t), this.applyMatrix4(j), this);
    }
    rotateX(t) {
      return (j.makeRotationX(t), this.applyMatrix4(j), this);
    }
    rotateY(t) {
      return (j.makeRotationY(t), this.applyMatrix4(j), this);
    }
    rotateZ(t) {
      return (j.makeRotationZ(t), this.applyMatrix4(j), this);
    }
    translate(t, e, n) {
      return (j.makeTranslation(t, e, n), this.applyMatrix4(j), this);
    }
    scale(t, e, n) {
      return (j.makeScale(t, e, n), this.applyMatrix4(j), this);
    }
    lookAt(t) {
      return (Nn.lookAt(t), Nn.updateMatrix(), this.applyMatrix4(Nn.matrix), this);
    }
    center() {
      return (
        this.computeBoundingBox(),
        this.boundingBox.getCenter(Xt).negate(),
        this.translate(Xt.x, Xt.y, Xt.z),
        this
      );
    }
    setFromPoints(t) {
      let e = this.getAttribute('position');
      if (e === void 0) {
        let n = [];
        for (let i = 0, s = t.length; i < s; i++) {
          let r = t[i];
          n.push(r.x, r.y, r.z || 0);
        }
        this.setAttribute('position', new Lt(n, 3));
      } else {
        let n = Math.min(t.length, e.count);
        for (let i = 0; i < n; i++) {
          let s = t[i];
          e.setXYZ(i, s.x, s.y, s.z || 0);
        }
        (t.length > e.count &&
          z(
            'BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.'
          ),
          (e.needsUpdate = !0));
      }
      return this;
    }
    computeBoundingBox() {
      this.boundingBox === null && (this.boundingBox = new bt());
      let t = this.attributes.position,
        e = this.morphAttributes.position;
      if (t && t.isGLBufferAttribute) {
        (O(
          'BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.',
          this
        ),
          this.boundingBox.set(new g(-1 / 0, -1 / 0, -1 / 0), new g(1 / 0, 1 / 0, 1 / 0)));
        return;
      }
      if (t !== void 0) {
        if ((this.boundingBox.setFromBufferAttribute(t), e))
          for (let n = 0, i = e.length; n < i; n++) {
            let s = e[n];
            (J.setFromBufferAttribute(s),
              this.morphTargetsRelative
                ? (G.addVectors(this.boundingBox.min, J.min),
                  this.boundingBox.expandByPoint(G),
                  G.addVectors(this.boundingBox.max, J.max),
                  this.boundingBox.expandByPoint(G))
                : (this.boundingBox.expandByPoint(J.min), this.boundingBox.expandByPoint(J.max)));
          }
      } else this.boundingBox.makeEmpty();
      (isNaN(this.boundingBox.min.x) ||
        isNaN(this.boundingBox.min.y) ||
        isNaN(this.boundingBox.min.z)) &&
        O(
          'BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',
          this
        );
    }
    computeBoundingSphere() {
      this.boundingSphere === null && (this.boundingSphere = new $t());
      let t = this.attributes.position,
        e = this.morphAttributes.position;
      if (t && t.isGLBufferAttribute) {
        (O(
          'BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.',
          this
        ),
          this.boundingSphere.set(new g(), 1 / 0));
        return;
      }
      if (t) {
        let n = this.boundingSphere.center;
        if ((J.setFromBufferAttribute(t), e))
          for (let s = 0, r = e.length; s < r; s++) {
            let a = e[s];
            (ne.setFromBufferAttribute(a),
              this.morphTargetsRelative
                ? (G.addVectors(J.min, ne.min),
                  J.expandByPoint(G),
                  G.addVectors(J.max, ne.max),
                  J.expandByPoint(G))
                : (J.expandByPoint(ne.min), J.expandByPoint(ne.max)));
          }
        J.getCenter(n);
        let i = 0;
        for (let s = 0, r = t.count; s < r; s++)
          (G.fromBufferAttribute(t, s), (i = Math.max(i, n.distanceToSquared(G))));
        if (e)
          for (let s = 0, r = e.length; s < r; s++) {
            let a = e[s],
              o = this.morphTargetsRelative;
            for (let l = 0, c = a.count; l < c; l++)
              (G.fromBufferAttribute(a, l),
                o && (Xt.fromBufferAttribute(t, l), G.add(Xt)),
                (i = Math.max(i, n.distanceToSquared(G))));
          }
        ((this.boundingSphere.radius = Math.sqrt(i)),
          isNaN(this.boundingSphere.radius) &&
            O(
              'BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',
              this
            ));
      }
    }
    computeTangents() {
      let t = this.index,
        e = this.attributes;
      if (t === null || e.position === void 0 || e.normal === void 0 || e.uv === void 0) {
        O(
          'BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)'
        );
        return;
      }
      let n = e.position,
        i = e.normal,
        s = e.uv,
        r = this.getAttribute('tangent');
      (r === void 0 || r.count !== n.count) &&
        ((r = new ot(new Float32Array(4 * n.count), 4)), this.setAttribute('tangent', r));
      let a = [],
        o = [];
      for (let T = 0; T < n.count; T++) ((a[T] = new g()), (o[T] = new g()));
      let l = new g(),
        c = new g(),
        u = new g(),
        d = new B(),
        f = new B(),
        p = new B(),
        m = new g(),
        _ = new g();
      function x(T, L, I) {
        (l.fromBufferAttribute(n, T),
          c.fromBufferAttribute(n, L),
          u.fromBufferAttribute(n, I),
          d.fromBufferAttribute(s, T),
          f.fromBufferAttribute(s, L),
          p.fromBufferAttribute(s, I),
          c.sub(l),
          u.sub(l),
          f.sub(d),
          p.sub(d));
        let P = 1 / (f.x * p.y - p.x * f.y);
        isFinite(P) &&
          (m.copy(c).multiplyScalar(p.y).addScaledVector(u, -f.y).multiplyScalar(P),
          _.copy(u).multiplyScalar(f.x).addScaledVector(c, -p.x).multiplyScalar(P),
          a[T].add(m),
          a[L].add(m),
          a[I].add(m),
          o[T].add(_),
          o[L].add(_),
          o[I].add(_));
      }
      let y = this.groups;
      y.length === 0 && (y = [{ start: 0, count: t.count }]);
      for (let T = 0, L = y.length; T < L; ++T) {
        let I = y[T],
          P = I.start,
          k = I.count;
        for (let D = P, Q = P + k; D < Q; D += 3) x(t.getX(D + 0), t.getX(D + 1), t.getX(D + 2));
      }
      let S = new g(),
        M = new g(),
        b = new g(),
        w = new g();
      function A(T) {
        (b.fromBufferAttribute(i, T), w.copy(b));
        let L = a[T];
        (S.copy(L), S.sub(b.multiplyScalar(b.dot(L))).normalize(), M.crossVectors(w, L));
        let P = M.dot(o[T]) < 0 ? -1 : 1;
        r.setXYZW(T, S.x, S.y, S.z, P);
      }
      for (let T = 0, L = y.length; T < L; ++T) {
        let I = y[T],
          P = I.start,
          k = I.count;
        for (let D = P, Q = P + k; D < Q; D += 3)
          (A(t.getX(D + 0)), A(t.getX(D + 1)), A(t.getX(D + 2)));
      }
      this._transformed = !0;
    }
    computeVertexNormals() {
      let t = this.index,
        e = this.getAttribute('position');
      if (e !== void 0) {
        let n = this.getAttribute('normal');
        if (n === void 0 || n.count !== e.count)
          ((n = new ot(new Float32Array(e.count * 3), 3)), this.setAttribute('normal', n));
        else for (let d = 0, f = n.count; d < f; d++) n.setXYZ(d, 0, 0, 0);
        let i = new g(),
          s = new g(),
          r = new g(),
          a = new g(),
          o = new g(),
          l = new g(),
          c = new g(),
          u = new g();
        if (t)
          for (let d = 0, f = t.count; d < f; d += 3) {
            let p = t.getX(d + 0),
              m = t.getX(d + 1),
              _ = t.getX(d + 2);
            (i.fromBufferAttribute(e, p),
              s.fromBufferAttribute(e, m),
              r.fromBufferAttribute(e, _),
              c.subVectors(r, s),
              u.subVectors(i, s),
              c.cross(u),
              a.fromBufferAttribute(n, p),
              o.fromBufferAttribute(n, m),
              l.fromBufferAttribute(n, _),
              a.add(c),
              o.add(c),
              l.add(c),
              n.setXYZ(p, a.x, a.y, a.z),
              n.setXYZ(m, o.x, o.y, o.z),
              n.setXYZ(_, l.x, l.y, l.z));
          }
        else
          for (let d = 0, f = e.count; d < f; d += 3)
            (i.fromBufferAttribute(e, d + 0),
              s.fromBufferAttribute(e, d + 1),
              r.fromBufferAttribute(e, d + 2),
              c.subVectors(r, s),
              u.subVectors(i, s),
              c.cross(u),
              n.setXYZ(d + 0, c.x, c.y, c.z),
              n.setXYZ(d + 1, c.x, c.y, c.z),
              n.setXYZ(d + 2, c.x, c.y, c.z));
        (this.normalizeNormals(), (n.needsUpdate = !0));
      }
    }
    normalizeNormals() {
      let t = this.attributes.normal;
      for (let e = 0, n = t.count; e < n; e++)
        (G.fromBufferAttribute(t, e), G.normalize(), t.setXYZ(e, G.x, G.y, G.z));
    }
    toNonIndexed() {
      function t(a, o) {
        let l = a.array,
          c = a.itemSize,
          u = a.normalized,
          d = new l.constructor(o.length * c),
          f = 0,
          p = 0;
        for (let m = 0, _ = o.length; m < _; m++) {
          a.isInterleavedBufferAttribute ? (f = o[m] * a.data.stride + a.offset) : (f = o[m] * c);
          for (let x = 0; x < c; x++) d[p++] = l[f++];
        }
        return new ot(d, c, u);
      }
      if (this.index === null)
        return (z('BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed.'), this);
      let e = new h6(),
        n = this.index.array,
        i = this.attributes;
      for (let a in i) {
        let o = i[a],
          l = t(o, n);
        e.setAttribute(a, l);
      }
      let s = this.morphAttributes;
      for (let a in s) {
        let o = [],
          l = s[a];
        for (let c = 0, u = l.length; c < u; c++) {
          let d = l[c],
            f = t(d, n);
          o.push(f);
        }
        e.morphAttributes[a] = o;
      }
      e.morphTargetsRelative = this.morphTargetsRelative;
      let r = this.groups;
      for (let a = 0, o = r.length; a < o; a++) {
        let l = r[a];
        e.addGroup(l.start, l.count, l.materialIndex);
      }
      return e;
    }
    toJSON() {
      let t = {
        metadata: { version: 4.7, type: 'BufferGeometry', generator: 'BufferGeometry.toJSON' },
      };
      if (
        ((t.uuid = this.uuid),
        (t.type =
          this.parameters !== void 0 && this._transformed === !0 ? 'BufferGeometry' : this.type),
        this.name !== '' && (t.name = this.name),
        Object.keys(this.userData).length > 0 && (t.userData = this.userData),
        this.parameters !== void 0 && this._transformed !== !0)
      ) {
        let o = this.parameters;
        for (let l in o) o[l] !== void 0 && (t[l] = o[l]);
        return t;
      }
      t.data = { attributes: {} };
      let e = this.index;
      e !== null &&
        (t.data.index = {
          type: e.array.constructor.name,
          array: Array.prototype.slice.call(e.array),
        });
      let n = this.attributes;
      for (let o in n) {
        let l = n[o];
        t.data.attributes[o] = l.toJSON(t.data);
      }
      let i = {},
        s = !1;
      for (let o in this.morphAttributes) {
        let l = this.morphAttributes[o],
          c = [];
        for (let u = 0, d = l.length; u < d; u++) {
          let f = l[u];
          c.push(f.toJSON(t.data));
        }
        c.length > 0 && ((i[o] = c), (s = !0));
      }
      s &&
        ((t.data.morphAttributes = i), (t.data.morphTargetsRelative = this.morphTargetsRelative));
      let r = this.groups;
      r.length > 0 && (t.data.groups = JSON.parse(JSON.stringify(r)));
      let a = this.boundingSphere;
      return (a !== null && (t.data.boundingSphere = a.toJSON()), t);
    }
    clone() {
      return new this.constructor().copy(this);
    }
    copy(t) {
      ((this.index = null),
        (this.attributes = {}),
        (this.morphAttributes = {}),
        (this.groups = []),
        (this.boundingBox = null),
        (this.boundingSphere = null));
      let e = {};
      this.name = t.name;
      let n = t.index;
      n !== null && this.setIndex(n.clone());
      let i = t.attributes;
      for (let l in i) {
        let c = i[l];
        this.setAttribute(l, c.clone(e));
      }
      let s = t.morphAttributes;
      for (let l in s) {
        let c = [],
          u = s[l];
        for (let d = 0, f = u.length; d < f; d++) c.push(u[d].clone(e));
        this.morphAttributes[l] = c;
      }
      this.morphTargetsRelative = t.morphTargetsRelative;
      let r = t.groups;
      for (let l = 0, c = r.length; l < c; l++) {
        let u = r[l];
        this.addGroup(u.start, u.count, u.materialIndex);
      }
      let a = t.boundingBox;
      a !== null && (this.boundingBox = a.clone());
      let o = t.boundingSphere;
      return (
        o !== null && (this.boundingSphere = o.clone()),
        (this.drawRange.start = t.drawRange.start),
        (this.drawRange.count = t.drawRange.count),
        (this.userData = t.userData),
        (this._transformed = t._transformed),
        this
      );
    }
    dispose() {
      this.dispatchEvent({ type: 'dispose' });
    }
  },
  er = 0,
  Kt = class extends Mt {
    constructor() {
      (super(),
        (this.isMaterial = !0),
        Object.defineProperty(this, 'id', { value: er++ }),
        (this.uuid = Qt()),
        (this.name = ''),
        (this.type = 'Material'),
        (this.blending = Ge),
        (this.side = ke),
        (this.vertexColors = !1),
        (this.opacity = 1),
        (this.transparent = !1),
        (this.alphaHash = !1),
        (this.blendSrc = Vn),
        (this.blendDst = kn),
        (this.blendEquation = zn),
        (this.blendSrcAlpha = null),
        (this.blendDstAlpha = null),
        (this.blendEquationAlpha = null),
        (this.blendColor = new U(0, 0, 0)),
        (this.blendAlpha = 0),
        (this.depthFunc = ae),
        (this.depthTest = !0),
        (this.depthWrite = !0),
        (this.stencilWriteMask = 255),
        (this.stencilFunc = ii),
        (this.stencilRef = 0),
        (this.stencilFuncMask = 255),
        (this.stencilFail = Pt),
        (this.stencilZFail = Pt),
        (this.stencilZPass = Pt),
        (this.stencilWrite = !1),
        (this.clippingPlanes = null),
        (this.clipIntersection = !1),
        (this.clipShadows = !1),
        (this.shadowSide = null),
        (this.colorWrite = !0),
        (this.precision = null),
        (this.polygonOffset = !1),
        (this.polygonOffsetFactor = 0),
        (this.polygonOffsetUnits = 0),
        (this.dithering = !1),
        (this.alphaToCoverage = !1),
        (this.premultipliedAlpha = !1),
        (this.forceSinglePass = !1),
        (this.allowOverride = !0),
        (this.visible = !0),
        (this.toneMapped = !0),
        (this.userData = {}),
        (this.version = 0),
        (this._alphaTest = 0));
    }
    get alphaTest() {
      return this._alphaTest;
    }
    set alphaTest(t) {
      (this._alphaTest > 0 != t > 0 && this.version++, (this._alphaTest = t));
    }
    onBeforeRender() {}
    onBeforeCompile() {}
    customProgramCacheKey() {
      return this.onBeforeCompile.toString();
    }
    setValues(t) {
      if (t !== void 0)
        for (let e in t) {
          let n = t[e];
          if (n === void 0) {
            z(`Material: parameter '${e}' has value of undefined.`);
            continue;
          }
          let i = this[e];
          if (i === void 0) {
            z(`Material: '${e}' is not a property of THREE.${this.type}.`);
            continue;
          }
          i && i.isColor
            ? i.set(n)
            : (i && i.isVector2 && n && n.isVector2) ||
                (i && i.isEuler && n && n.isEuler) ||
                (i && i.isVector3 && n && n.isVector3)
              ? i.copy(n)
              : (this[e] = n);
        }
    }
    toJSON(t) {
      let e = t === void 0 || typeof t == 'string';
      e && (t = { textures: {}, images: {} });
      let n = { metadata: { version: 4.7, type: 'Material', generator: 'Material.toJSON' } };
      ((n.uuid = this.uuid),
        (n.type = this.type),
        this.name !== '' && (n.name = this.name),
        this.color && this.color.isColor && (n.color = this.color.getHex()),
        this.roughness !== void 0 && (n.roughness = this.roughness),
        this.metalness !== void 0 && (n.metalness = this.metalness),
        this.sheen !== void 0 && (n.sheen = this.sheen),
        this.sheenColor && this.sheenColor.isColor && (n.sheenColor = this.sheenColor.getHex()),
        this.sheenRoughness !== void 0 && (n.sheenRoughness = this.sheenRoughness),
        this.emissive && this.emissive.isColor && (n.emissive = this.emissive.getHex()),
        this.emissiveIntensity !== void 0 &&
          this.emissiveIntensity !== 1 &&
          (n.emissiveIntensity = this.emissiveIntensity),
        this.specular && this.specular.isColor && (n.specular = this.specular.getHex()),
        this.specularIntensity !== void 0 && (n.specularIntensity = this.specularIntensity),
        this.specularColor &&
          this.specularColor.isColor &&
          (n.specularColor = this.specularColor.getHex()),
        this.shininess !== void 0 && (n.shininess = this.shininess),
        this.clearcoat !== void 0 && (n.clearcoat = this.clearcoat),
        this.clearcoatRoughness !== void 0 && (n.clearcoatRoughness = this.clearcoatRoughness),
        this.clearcoatMap &&
          this.clearcoatMap.isTexture &&
          (n.clearcoatMap = this.clearcoatMap.toJSON(t).uuid),
        this.clearcoatRoughnessMap &&
          this.clearcoatRoughnessMap.isTexture &&
          (n.clearcoatRoughnessMap = this.clearcoatRoughnessMap.toJSON(t).uuid),
        this.clearcoatNormalMap &&
          this.clearcoatNormalMap.isTexture &&
          ((n.clearcoatNormalMap = this.clearcoatNormalMap.toJSON(t).uuid),
          (n.clearcoatNormalScale = this.clearcoatNormalScale.toArray())),
        this.sheenColorMap &&
          this.sheenColorMap.isTexture &&
          (n.sheenColorMap = this.sheenColorMap.toJSON(t).uuid),
        this.sheenRoughnessMap &&
          this.sheenRoughnessMap.isTexture &&
          (n.sheenRoughnessMap = this.sheenRoughnessMap.toJSON(t).uuid),
        this.dispersion !== void 0 && (n.dispersion = this.dispersion),
        this.iridescence !== void 0 && (n.iridescence = this.iridescence),
        this.iridescenceIOR !== void 0 && (n.iridescenceIOR = this.iridescenceIOR),
        this.iridescenceThicknessRange !== void 0 &&
          (n.iridescenceThicknessRange = this.iridescenceThicknessRange),
        this.iridescenceMap &&
          this.iridescenceMap.isTexture &&
          (n.iridescenceMap = this.iridescenceMap.toJSON(t).uuid),
        this.iridescenceThicknessMap &&
          this.iridescenceThicknessMap.isTexture &&
          (n.iridescenceThicknessMap = this.iridescenceThicknessMap.toJSON(t).uuid),
        this.anisotropy !== void 0 && (n.anisotropy = this.anisotropy),
        this.anisotropyRotation !== void 0 && (n.anisotropyRotation = this.anisotropyRotation),
        this.anisotropyMap &&
          this.anisotropyMap.isTexture &&
          (n.anisotropyMap = this.anisotropyMap.toJSON(t).uuid),
        this.map && this.map.isTexture && (n.map = this.map.toJSON(t).uuid),
        this.matcap && this.matcap.isTexture && (n.matcap = this.matcap.toJSON(t).uuid),
        this.alphaMap && this.alphaMap.isTexture && (n.alphaMap = this.alphaMap.toJSON(t).uuid),
        this.lightMap &&
          this.lightMap.isTexture &&
          ((n.lightMap = this.lightMap.toJSON(t).uuid),
          (n.lightMapIntensity = this.lightMapIntensity)),
        this.aoMap &&
          this.aoMap.isTexture &&
          ((n.aoMap = this.aoMap.toJSON(t).uuid), (n.aoMapIntensity = this.aoMapIntensity)),
        this.bumpMap &&
          this.bumpMap.isTexture &&
          ((n.bumpMap = this.bumpMap.toJSON(t).uuid), (n.bumpScale = this.bumpScale)),
        this.normalMap &&
          this.normalMap.isTexture &&
          ((n.normalMap = this.normalMap.toJSON(t).uuid),
          (n.normalMapType = this.normalMapType),
          (n.normalScale = this.normalScale.toArray())),
        this.displacementMap &&
          this.displacementMap.isTexture &&
          ((n.displacementMap = this.displacementMap.toJSON(t).uuid),
          (n.displacementScale = this.displacementScale),
          (n.displacementBias = this.displacementBias)),
        this.roughnessMap &&
          this.roughnessMap.isTexture &&
          (n.roughnessMap = this.roughnessMap.toJSON(t).uuid),
        this.metalnessMap &&
          this.metalnessMap.isTexture &&
          (n.metalnessMap = this.metalnessMap.toJSON(t).uuid),
        this.emissiveMap &&
          this.emissiveMap.isTexture &&
          (n.emissiveMap = this.emissiveMap.toJSON(t).uuid),
        this.specularMap &&
          this.specularMap.isTexture &&
          (n.specularMap = this.specularMap.toJSON(t).uuid),
        this.specularIntensityMap &&
          this.specularIntensityMap.isTexture &&
          (n.specularIntensityMap = this.specularIntensityMap.toJSON(t).uuid),
        this.specularColorMap &&
          this.specularColorMap.isTexture &&
          (n.specularColorMap = this.specularColorMap.toJSON(t).uuid),
        this.envMap &&
          this.envMap.isTexture &&
          ((n.envMap = this.envMap.toJSON(t).uuid),
          this.combine !== void 0 && (n.combine = this.combine)),
        this.envMapRotation !== void 0 && (n.envMapRotation = this.envMapRotation.toArray()),
        this.envMapIntensity !== void 0 && (n.envMapIntensity = this.envMapIntensity),
        this.reflectivity !== void 0 && (n.reflectivity = this.reflectivity),
        this.refractionRatio !== void 0 && (n.refractionRatio = this.refractionRatio),
        this.gradientMap &&
          this.gradientMap.isTexture &&
          (n.gradientMap = this.gradientMap.toJSON(t).uuid),
        this.transmission !== void 0 && (n.transmission = this.transmission),
        this.transmissionMap &&
          this.transmissionMap.isTexture &&
          (n.transmissionMap = this.transmissionMap.toJSON(t).uuid),
        this.thickness !== void 0 && (n.thickness = this.thickness),
        this.thicknessMap &&
          this.thicknessMap.isTexture &&
          (n.thicknessMap = this.thicknessMap.toJSON(t).uuid),
        this.attenuationDistance !== void 0 &&
          this.attenuationDistance !== 1 / 0 &&
          (n.attenuationDistance = this.attenuationDistance),
        this.attenuationColor !== void 0 && (n.attenuationColor = this.attenuationColor.getHex()),
        this.size !== void 0 && (n.size = this.size),
        this.shadowSide !== null && (n.shadowSide = this.shadowSide),
        this.sizeAttenuation !== void 0 && (n.sizeAttenuation = this.sizeAttenuation),
        this.blending !== Ge && (n.blending = this.blending),
        this.side !== ke && (n.side = this.side),
        this.vertexColors === !0 && (n.vertexColors = !0),
        this.opacity < 1 && (n.opacity = this.opacity),
        this.transparent === !0 && (n.transparent = !0),
        this.blendSrc !== Vn && (n.blendSrc = this.blendSrc),
        this.blendDst !== kn && (n.blendDst = this.blendDst),
        this.blendEquation !== zn && (n.blendEquation = this.blendEquation),
        this.blendSrcAlpha !== null && (n.blendSrcAlpha = this.blendSrcAlpha),
        this.blendDstAlpha !== null && (n.blendDstAlpha = this.blendDstAlpha),
        this.blendEquationAlpha !== null && (n.blendEquationAlpha = this.blendEquationAlpha),
        this.blendColor && this.blendColor.isColor && (n.blendColor = this.blendColor.getHex()),
        this.blendAlpha !== 0 && (n.blendAlpha = this.blendAlpha),
        this.depthFunc !== ae && (n.depthFunc = this.depthFunc),
        this.depthTest === !1 && (n.depthTest = this.depthTest),
        this.depthWrite === !1 && (n.depthWrite = this.depthWrite),
        this.colorWrite === !1 && (n.colorWrite = this.colorWrite),
        this.stencilWriteMask !== 255 && (n.stencilWriteMask = this.stencilWriteMask),
        this.stencilFunc !== ii && (n.stencilFunc = this.stencilFunc),
        this.stencilRef !== 0 && (n.stencilRef = this.stencilRef),
        this.stencilFuncMask !== 255 && (n.stencilFuncMask = this.stencilFuncMask),
        this.stencilFail !== Pt && (n.stencilFail = this.stencilFail),
        this.stencilZFail !== Pt && (n.stencilZFail = this.stencilZFail),
        this.stencilZPass !== Pt && (n.stencilZPass = this.stencilZPass),
        this.stencilWrite === !0 && (n.stencilWrite = this.stencilWrite),
        this.rotation !== void 0 && this.rotation !== 0 && (n.rotation = this.rotation),
        this.polygonOffset === !0 && (n.polygonOffset = !0),
        this.polygonOffsetFactor !== 0 && (n.polygonOffsetFactor = this.polygonOffsetFactor),
        this.polygonOffsetUnits !== 0 && (n.polygonOffsetUnits = this.polygonOffsetUnits),
        this.linewidth !== void 0 && this.linewidth !== 1 && (n.linewidth = this.linewidth),
        this.dashSize !== void 0 && (n.dashSize = this.dashSize),
        this.gapSize !== void 0 && (n.gapSize = this.gapSize),
        this.scale !== void 0 && (n.scale = this.scale),
        this.dithering === !0 && (n.dithering = !0),
        this.alphaTest > 0 && (n.alphaTest = this.alphaTest),
        this.alphaHash === !0 && (n.alphaHash = !0),
        this.alphaToCoverage === !0 && (n.alphaToCoverage = !0),
        this.premultipliedAlpha === !0 && (n.premultipliedAlpha = !0),
        this.forceSinglePass === !0 && (n.forceSinglePass = !0),
        this.allowOverride === !1 && (n.allowOverride = !1),
        this.wireframe === !0 && (n.wireframe = !0),
        this.wireframeLinewidth > 1 && (n.wireframeLinewidth = this.wireframeLinewidth),
        this.wireframeLinecap !== 'round' && (n.wireframeLinecap = this.wireframeLinecap),
        this.wireframeLinejoin !== 'round' && (n.wireframeLinejoin = this.wireframeLinejoin),
        this.flatShading === !0 && (n.flatShading = !0),
        this.visible === !1 && (n.visible = !1),
        this.toneMapped === !1 && (n.toneMapped = !1),
        this.fog === !1 && (n.fog = !1),
        Object.keys(this.userData).length > 0 && (n.userData = this.userData));
      function i(s) {
        let r = [];
        for (let a in s) {
          let o = s[a];
          (delete o.metadata, r.push(o));
        }
        return r;
      }
      if (e) {
        let s = i(t.textures),
          r = i(t.images);
        (s.length > 0 && (n.textures = s), r.length > 0 && (n.images = r));
      }
      return n;
    }
    fromJSON(t, e) {
      if (
        (t.uuid !== void 0 && (this.uuid = t.uuid),
        t.name !== void 0 && (this.name = t.name),
        t.color !== void 0 && this.color !== void 0 && this.color.setHex(t.color),
        t.roughness !== void 0 && (this.roughness = t.roughness),
        t.metalness !== void 0 && (this.metalness = t.metalness),
        t.sheen !== void 0 && (this.sheen = t.sheen),
        t.sheenColor !== void 0 && (this.sheenColor = new U().setHex(t.sheenColor)),
        t.sheenRoughness !== void 0 && (this.sheenRoughness = t.sheenRoughness),
        t.emissive !== void 0 && this.emissive !== void 0 && this.emissive.setHex(t.emissive),
        t.specular !== void 0 && this.specular !== void 0 && this.specular.setHex(t.specular),
        t.specularIntensity !== void 0 && (this.specularIntensity = t.specularIntensity),
        t.specularColor !== void 0 &&
          this.specularColor !== void 0 &&
          this.specularColor.setHex(t.specularColor),
        t.shininess !== void 0 && (this.shininess = t.shininess),
        t.clearcoat !== void 0 && (this.clearcoat = t.clearcoat),
        t.clearcoatRoughness !== void 0 && (this.clearcoatRoughness = t.clearcoatRoughness),
        t.dispersion !== void 0 && (this.dispersion = t.dispersion),
        t.iridescence !== void 0 && (this.iridescence = t.iridescence),
        t.iridescenceIOR !== void 0 && (this.iridescenceIOR = t.iridescenceIOR),
        t.iridescenceThicknessRange !== void 0 &&
          (this.iridescenceThicknessRange = t.iridescenceThicknessRange),
        t.transmission !== void 0 && (this.transmission = t.transmission),
        t.thickness !== void 0 && (this.thickness = t.thickness),
        t.attenuationDistance !== void 0 && (this.attenuationDistance = t.attenuationDistance),
        t.attenuationColor !== void 0 &&
          this.attenuationColor !== void 0 &&
          this.attenuationColor.setHex(t.attenuationColor),
        t.anisotropy !== void 0 && (this.anisotropy = t.anisotropy),
        t.anisotropyRotation !== void 0 && (this.anisotropyRotation = t.anisotropyRotation),
        t.fog !== void 0 && (this.fog = t.fog),
        t.flatShading !== void 0 && (this.flatShading = t.flatShading),
        t.blending !== void 0 && (this.blending = t.blending),
        t.combine !== void 0 && (this.combine = t.combine),
        t.side !== void 0 && (this.side = t.side),
        t.shadowSide !== void 0 && (this.shadowSide = t.shadowSide),
        t.opacity !== void 0 && (this.opacity = t.opacity),
        t.transparent !== void 0 && (this.transparent = t.transparent),
        t.alphaTest !== void 0 && (this.alphaTest = t.alphaTest),
        t.alphaHash !== void 0 && (this.alphaHash = t.alphaHash),
        t.depthFunc !== void 0 && (this.depthFunc = t.depthFunc),
        t.depthTest !== void 0 && (this.depthTest = t.depthTest),
        t.depthWrite !== void 0 && (this.depthWrite = t.depthWrite),
        t.colorWrite !== void 0 && (this.colorWrite = t.colorWrite),
        t.blendSrc !== void 0 && (this.blendSrc = t.blendSrc),
        t.blendDst !== void 0 && (this.blendDst = t.blendDst),
        t.blendEquation !== void 0 && (this.blendEquation = t.blendEquation),
        t.blendSrcAlpha !== void 0 && (this.blendSrcAlpha = t.blendSrcAlpha),
        t.blendDstAlpha !== void 0 && (this.blendDstAlpha = t.blendDstAlpha),
        t.blendEquationAlpha !== void 0 && (this.blendEquationAlpha = t.blendEquationAlpha),
        t.blendColor !== void 0 &&
          this.blendColor !== void 0 &&
          this.blendColor.setHex(t.blendColor),
        t.blendAlpha !== void 0 && (this.blendAlpha = t.blendAlpha),
        t.stencilWriteMask !== void 0 && (this.stencilWriteMask = t.stencilWriteMask),
        t.stencilFunc !== void 0 && (this.stencilFunc = t.stencilFunc),
        t.stencilRef !== void 0 && (this.stencilRef = t.stencilRef),
        t.stencilFuncMask !== void 0 && (this.stencilFuncMask = t.stencilFuncMask),
        t.stencilFail !== void 0 && (this.stencilFail = t.stencilFail),
        t.stencilZFail !== void 0 && (this.stencilZFail = t.stencilZFail),
        t.stencilZPass !== void 0 && (this.stencilZPass = t.stencilZPass),
        t.stencilWrite !== void 0 && (this.stencilWrite = t.stencilWrite),
        t.wireframe !== void 0 && (this.wireframe = t.wireframe),
        t.wireframeLinewidth !== void 0 && (this.wireframeLinewidth = t.wireframeLinewidth),
        t.wireframeLinecap !== void 0 && (this.wireframeLinecap = t.wireframeLinecap),
        t.wireframeLinejoin !== void 0 && (this.wireframeLinejoin = t.wireframeLinejoin),
        t.rotation !== void 0 && (this.rotation = t.rotation),
        t.linewidth !== void 0 && (this.linewidth = t.linewidth),
        t.dashSize !== void 0 && (this.dashSize = t.dashSize),
        t.gapSize !== void 0 && (this.gapSize = t.gapSize),
        t.scale !== void 0 && (this.scale = t.scale),
        t.polygonOffset !== void 0 && (this.polygonOffset = t.polygonOffset),
        t.polygonOffsetFactor !== void 0 && (this.polygonOffsetFactor = t.polygonOffsetFactor),
        t.polygonOffsetUnits !== void 0 && (this.polygonOffsetUnits = t.polygonOffsetUnits),
        t.dithering !== void 0 && (this.dithering = t.dithering),
        t.alphaToCoverage !== void 0 && (this.alphaToCoverage = t.alphaToCoverage),
        t.premultipliedAlpha !== void 0 && (this.premultipliedAlpha = t.premultipliedAlpha),
        t.forceSinglePass !== void 0 && (this.forceSinglePass = t.forceSinglePass),
        t.allowOverride !== void 0 && (this.allowOverride = t.allowOverride),
        t.visible !== void 0 && (this.visible = t.visible),
        t.toneMapped !== void 0 && (this.toneMapped = t.toneMapped),
        t.userData !== void 0 && (this.userData = t.userData),
        t.vertexColors !== void 0 &&
          (typeof t.vertexColors == 'number'
            ? (this.vertexColors = t.vertexColors > 0)
            : (this.vertexColors = t.vertexColors)),
        t.size !== void 0 && (this.size = t.size),
        t.sizeAttenuation !== void 0 && (this.sizeAttenuation = t.sizeAttenuation),
        t.map !== void 0 && (this.map = e[t.map] || null),
        t.matcap !== void 0 && (this.matcap = e[t.matcap] || null),
        t.alphaMap !== void 0 && (this.alphaMap = e[t.alphaMap] || null),
        t.bumpMap !== void 0 && (this.bumpMap = e[t.bumpMap] || null),
        t.bumpScale !== void 0 && (this.bumpScale = t.bumpScale),
        t.normalMap !== void 0 && (this.normalMap = e[t.normalMap] || null),
        t.normalMapType !== void 0 && (this.normalMapType = t.normalMapType),
        t.normalScale !== void 0)
      ) {
        let n = t.normalScale;
        (Array.isArray(n) === !1 && (n = [n, n]), (this.normalScale = new B().fromArray(n)));
      }
      return (
        t.displacementMap !== void 0 && (this.displacementMap = e[t.displacementMap] || null),
        t.displacementScale !== void 0 && (this.displacementScale = t.displacementScale),
        t.displacementBias !== void 0 && (this.displacementBias = t.displacementBias),
        t.roughnessMap !== void 0 && (this.roughnessMap = e[t.roughnessMap] || null),
        t.metalnessMap !== void 0 && (this.metalnessMap = e[t.metalnessMap] || null),
        t.emissiveMap !== void 0 && (this.emissiveMap = e[t.emissiveMap] || null),
        t.emissiveIntensity !== void 0 && (this.emissiveIntensity = t.emissiveIntensity),
        t.specularMap !== void 0 && (this.specularMap = e[t.specularMap] || null),
        t.specularIntensityMap !== void 0 &&
          (this.specularIntensityMap = e[t.specularIntensityMap] || null),
        t.specularColorMap !== void 0 && (this.specularColorMap = e[t.specularColorMap] || null),
        t.envMap !== void 0 && (this.envMap = e[t.envMap] || null),
        t.envMapRotation !== void 0 && this.envMapRotation.fromArray(t.envMapRotation),
        t.envMapIntensity !== void 0 && (this.envMapIntensity = t.envMapIntensity),
        t.reflectivity !== void 0 && (this.reflectivity = t.reflectivity),
        t.refractionRatio !== void 0 && (this.refractionRatio = t.refractionRatio),
        t.lightMap !== void 0 && (this.lightMap = e[t.lightMap] || null),
        t.lightMapIntensity !== void 0 && (this.lightMapIntensity = t.lightMapIntensity),
        t.aoMap !== void 0 && (this.aoMap = e[t.aoMap] || null),
        t.aoMapIntensity !== void 0 && (this.aoMapIntensity = t.aoMapIntensity),
        t.gradientMap !== void 0 && (this.gradientMap = e[t.gradientMap] || null),
        t.clearcoatMap !== void 0 && (this.clearcoatMap = e[t.clearcoatMap] || null),
        t.clearcoatRoughnessMap !== void 0 &&
          (this.clearcoatRoughnessMap = e[t.clearcoatRoughnessMap] || null),
        t.clearcoatNormalMap !== void 0 &&
          (this.clearcoatNormalMap = e[t.clearcoatNormalMap] || null),
        t.clearcoatNormalScale !== void 0 &&
          (this.clearcoatNormalScale = new B().fromArray(t.clearcoatNormalScale)),
        t.iridescenceMap !== void 0 && (this.iridescenceMap = e[t.iridescenceMap] || null),
        t.iridescenceThicknessMap !== void 0 &&
          (this.iridescenceThicknessMap = e[t.iridescenceThicknessMap] || null),
        t.transmissionMap !== void 0 && (this.transmissionMap = e[t.transmissionMap] || null),
        t.thicknessMap !== void 0 && (this.thicknessMap = e[t.thicknessMap] || null),
        t.anisotropyMap !== void 0 && (this.anisotropyMap = e[t.anisotropyMap] || null),
        t.sheenColorMap !== void 0 && (this.sheenColorMap = e[t.sheenColorMap] || null),
        t.sheenRoughnessMap !== void 0 && (this.sheenRoughnessMap = e[t.sheenRoughnessMap] || null),
        this
      );
    }
    clone() {
      return new this.constructor().copy(this);
    }
    copy(t) {
      ((this.name = t.name),
        (this.blending = t.blending),
        (this.side = t.side),
        (this.vertexColors = t.vertexColors),
        (this.opacity = t.opacity),
        (this.transparent = t.transparent),
        (this.blendSrc = t.blendSrc),
        (this.blendDst = t.blendDst),
        (this.blendEquation = t.blendEquation),
        (this.blendSrcAlpha = t.blendSrcAlpha),
        (this.blendDstAlpha = t.blendDstAlpha),
        (this.blendEquationAlpha = t.blendEquationAlpha),
        this.blendColor.copy(t.blendColor),
        (this.blendAlpha = t.blendAlpha),
        (this.depthFunc = t.depthFunc),
        (this.depthTest = t.depthTest),
        (this.depthWrite = t.depthWrite),
        (this.stencilWriteMask = t.stencilWriteMask),
        (this.stencilFunc = t.stencilFunc),
        (this.stencilRef = t.stencilRef),
        (this.stencilFuncMask = t.stencilFuncMask),
        (this.stencilFail = t.stencilFail),
        (this.stencilZFail = t.stencilZFail),
        (this.stencilZPass = t.stencilZPass),
        (this.stencilWrite = t.stencilWrite));
      let e = t.clippingPlanes,
        n = null;
      if (e !== null) {
        let i = e.length;
        n = new Array(i);
        for (let s = 0; s !== i; ++s) n[s] = e[s].clone();
      }
      return (
        (this.clippingPlanes = n),
        (this.clipIntersection = t.clipIntersection),
        (this.clipShadows = t.clipShadows),
        (this.shadowSide = t.shadowSide),
        (this.colorWrite = t.colorWrite),
        (this.precision = t.precision),
        (this.polygonOffset = t.polygonOffset),
        (this.polygonOffsetFactor = t.polygonOffsetFactor),
        (this.polygonOffsetUnits = t.polygonOffsetUnits),
        (this.dithering = t.dithering),
        (this.alphaTest = t.alphaTest),
        (this.alphaHash = t.alphaHash),
        (this.alphaToCoverage = t.alphaToCoverage),
        (this.premultipliedAlpha = t.premultipliedAlpha),
        (this.forceSinglePass = t.forceSinglePass),
        (this.allowOverride = t.allowOverride),
        (this.visible = t.visible),
        (this.toneMapped = t.toneMapped),
        (this.userData = JSON.parse(JSON.stringify(t.userData))),
        this
      );
    }
    dispose() {
      this.dispatchEvent({ type: 'dispose' });
    }
    set needsUpdate(t) {
      t === !0 && this.version++;
    }
  },
  dt = new g(),
  Un = new g(),
  Ae = new g(),
  xt = new g(),
  Fn = new g(),
  Ee = new g(),
  On = new g(),
  ce = class {
    constructor(t = new g(), e = new g(0, 0, -1)) {
      ((this.origin = t), (this.direction = e));
    }
    set(t, e) {
      return (this.origin.copy(t), this.direction.copy(e), this);
    }
    copy(t) {
      return (this.origin.copy(t.origin), this.direction.copy(t.direction), this);
    }
    at(t, e) {
      return e.copy(this.origin).addScaledVector(this.direction, t);
    }
    lookAt(t) {
      return (this.direction.copy(t).sub(this.origin).normalize(), this);
    }
    recast(t) {
      return (this.origin.copy(this.at(t, dt)), this);
    }
    closestPointToPoint(t, e) {
      e.subVectors(t, this.origin);
      let n = e.dot(this.direction);
      return n < 0 ? e.copy(this.origin) : e.copy(this.origin).addScaledVector(this.direction, n);
    }
    distanceToPoint(t) {
      return Math.sqrt(this.distanceSqToPoint(t));
    }
    distanceSqToPoint(t) {
      let e = dt.subVectors(t, this.origin).dot(this.direction);
      return e < 0
        ? this.origin.distanceToSquared(t)
        : (dt.copy(this.origin).addScaledVector(this.direction, e), dt.distanceToSquared(t));
    }
    distanceSqToSegment(t, e, n, i) {
      (Un.copy(t).add(e).multiplyScalar(0.5),
        Ae.copy(e).sub(t).normalize(),
        xt.copy(this.origin).sub(Un));
      let s = t.distanceTo(e) * 0.5,
        r = -this.direction.dot(Ae),
        a = xt.dot(this.direction),
        o = -xt.dot(Ae),
        l = xt.lengthSq(),
        c = Math.abs(1 - r * r),
        u,
        d,
        f,
        p;
      if (c > 0)
        if (((u = r * o - a), (d = r * a - o), (p = s * c), u >= 0))
          if (d >= -p)
            if (d <= p) {
              let m = 1 / c;
              ((u *= m), (d *= m), (f = u * (u + r * d + 2 * a) + d * (r * u + d + 2 * o) + l));
            } else ((d = s), (u = Math.max(0, -(r * d + a))), (f = -u * u + d * (d + 2 * o) + l));
          else ((d = -s), (u = Math.max(0, -(r * d + a))), (f = -u * u + d * (d + 2 * o) + l));
        else
          d <= -p
            ? ((u = Math.max(0, -(-r * s + a))),
              (d = u > 0 ? -s : Math.min(Math.max(-s, -o), s)),
              (f = -u * u + d * (d + 2 * o) + l))
            : d <= p
              ? ((u = 0), (d = Math.min(Math.max(-s, -o), s)), (f = d * (d + 2 * o) + l))
              : ((u = Math.max(0, -(r * s + a))),
                (d = u > 0 ? s : Math.min(Math.max(-s, -o), s)),
                (f = -u * u + d * (d + 2 * o) + l));
      else
        ((d = r > 0 ? -s : s), (u = Math.max(0, -(r * d + a))), (f = -u * u + d * (d + 2 * o) + l));
      return (
        n && n.copy(this.origin).addScaledVector(this.direction, u),
        i && i.copy(Un).addScaledVector(Ae, d),
        f
      );
    }
    intersectSphere(t, e) {
      dt.subVectors(t.center, this.origin);
      let n = dt.dot(this.direction),
        i = dt.dot(dt) - n * n,
        s = t.radius * t.radius;
      if (i > s) return null;
      let r = Math.sqrt(s - i),
        a = n - r,
        o = n + r;
      return o < 0 ? null : a < 0 ? this.at(o, e) : this.at(a, e);
    }
    intersectsSphere(t) {
      return t.radius < 0 ? !1 : this.distanceSqToPoint(t.center) <= t.radius * t.radius;
    }
    distanceToPlane(t) {
      let e = t.normal.dot(this.direction);
      if (e === 0) return t.distanceToPoint(this.origin) === 0 ? 0 : null;
      let n = -(this.origin.dot(t.normal) + t.constant) / e;
      return n >= 0 ? n : null;
    }
    intersectPlane(t, e) {
      let n = this.distanceToPlane(t);
      return n === null ? null : this.at(n, e);
    }
    intersectsPlane(t) {
      let e = t.distanceToPoint(this.origin);
      return e === 0 || t.normal.dot(this.direction) * e < 0;
    }
    intersectBox(t, e) {
      let n,
        i,
        s,
        r,
        a,
        o,
        l = 1 / this.direction.x,
        c = 1 / this.direction.y,
        u = 1 / this.direction.z,
        d = this.origin;
      return (
        l >= 0
          ? ((n = (t.min.x - d.x) * l), (i = (t.max.x - d.x) * l))
          : ((n = (t.max.x - d.x) * l), (i = (t.min.x - d.x) * l)),
        c >= 0
          ? ((s = (t.min.y - d.y) * c), (r = (t.max.y - d.y) * c))
          : ((s = (t.max.y - d.y) * c), (r = (t.min.y - d.y) * c)),
        n > r ||
        s > i ||
        ((s > n || isNaN(n)) && (n = s),
        (r < i || isNaN(i)) && (i = r),
        u >= 0
          ? ((a = (t.min.z - d.z) * u), (o = (t.max.z - d.z) * u))
          : ((a = (t.max.z - d.z) * u), (o = (t.min.z - d.z) * u)),
        n > o || a > i) ||
        ((a > n || n !== n) && (n = a), (o < i || i !== i) && (i = o), i < 0)
          ? null
          : this.at(n >= 0 ? n : i, e)
      );
    }
    intersectsBox(t) {
      return this.intersectBox(t, dt) !== null;
    }
    intersectTriangle(t, e, n, i, s) {
      (Fn.subVectors(e, t), Ee.subVectors(n, t), On.crossVectors(Fn, Ee));
      let r = this.direction.dot(On),
        a;
      if (r > 0) {
        if (i) return null;
        a = 1;
      } else if (r < 0) ((a = -1), (r = -r));
      else return null;
      xt.subVectors(this.origin, t);
      let o = a * this.direction.dot(Ee.crossVectors(xt, Ee));
      if (o < 0) return null;
      let l = a * this.direction.dot(Fn.cross(xt));
      if (l < 0 || o + l > r) return null;
      let c = -a * xt.dot(On);
      return c < 0 ? null : this.at(c / r, s);
    }
    applyMatrix4(t) {
      return (this.origin.applyMatrix4(t), this.direction.transformDirection(t), this);
    }
    equals(t) {
      return t.origin.equals(this.origin) && t.direction.equals(this.direction);
    }
    clone() {
      return new this.constructor().copy(this);
    }
  },
  he = class extends Kt {
    constructor(t) {
      (super(),
        (this.isMeshBasicMaterial = !0),
        (this.type = 'MeshBasicMaterial'),
        (this.color = new U(16777215)),
        (this.map = null),
        (this.lightMap = null),
        (this.lightMapIntensity = 1),
        (this.aoMap = null),
        (this.aoMapIntensity = 1),
        (this.specularMap = null),
        (this.alphaMap = null),
        (this.envMap = null),
        (this.envMapRotation = new St()),
        (this.combine = hi),
        (this.reflectivity = 1),
        (this.refractionRatio = 0.98),
        (this.wireframe = !1),
        (this.wireframeLinewidth = 1),
        (this.wireframeLinecap = 'round'),
        (this.wireframeLinejoin = 'round'),
        (this.fog = !0),
        this.setValues(t));
    }
    copy(t) {
      return (
        super.copy(t),
        this.color.copy(t.color),
        (this.map = t.map),
        (this.lightMap = t.lightMap),
        (this.lightMapIntensity = t.lightMapIntensity),
        (this.aoMap = t.aoMap),
        (this.aoMapIntensity = t.aoMapIntensity),
        (this.specularMap = t.specularMap),
        (this.alphaMap = t.alphaMap),
        (this.envMap = t.envMap),
        this.envMapRotation.copy(t.envMapRotation),
        (this.combine = t.combine),
        (this.reflectivity = t.reflectivity),
        (this.refractionRatio = t.refractionRatio),
        (this.wireframe = t.wireframe),
        (this.wireframeLinewidth = t.wireframeLinewidth),
        (this.wireframeLinecap = t.wireframeLinecap),
        (this.wireframeLinejoin = t.wireframeLinejoin),
        (this.fog = t.fog),
        this
      );
    }
  },
  qi = new H(),
  It = new ce(),
  we = new $t(),
  Yi = new g(),
  Ce = new g(),
  Re = new g(),
  Ie = new g(),
  Bn = new g(),
  Pe = new g(),
  Zi = new g(),
  Le = new g(),
  je = class extends et {
    constructor(t = new Ut(), e = new he()) {
      (super(),
        (this.isMesh = !0),
        (this.type = 'Mesh'),
        (this.geometry = t),
        (this.material = e),
        (this.morphTargetDictionary = void 0),
        (this.morphTargetInfluences = void 0),
        (this.count = 1),
        this.updateMorphTargets());
    }
    copy(t, e) {
      return (
        super.copy(t, e),
        t.morphTargetInfluences !== void 0 &&
          (this.morphTargetInfluences = t.morphTargetInfluences.slice()),
        t.morphTargetDictionary !== void 0 &&
          (this.morphTargetDictionary = Object.assign({}, t.morphTargetDictionary)),
        (this.material = Array.isArray(t.material) ? t.material.slice() : t.material),
        (this.geometry = t.geometry),
        this
      );
    }
    updateMorphTargets() {
      let e = this.geometry.morphAttributes,
        n = Object.keys(e);
      if (n.length > 0) {
        let i = e[n[0]];
        if (i !== void 0) {
          ((this.morphTargetInfluences = []), (this.morphTargetDictionary = {}));
          for (let s = 0, r = i.length; s < r; s++) {
            let a = i[s].name || String(s);
            (this.morphTargetInfluences.push(0), (this.morphTargetDictionary[a] = s));
          }
        }
      }
    }
    getVertexPosition(t, e) {
      let n = this.geometry,
        i = n.attributes.position,
        s = n.morphAttributes.position,
        r = n.morphTargetsRelative;
      e.fromBufferAttribute(i, t);
      let a = this.morphTargetInfluences;
      if (s && a) {
        Pe.set(0, 0, 0);
        for (let o = 0, l = s.length; o < l; o++) {
          let c = a[o],
            u = s[o];
          c !== 0 &&
            (Bn.fromBufferAttribute(u, t),
            r ? Pe.addScaledVector(Bn, c) : Pe.addScaledVector(Bn.sub(e), c));
        }
        e.add(Pe);
      }
      return e;
    }
    raycast(t, e) {
      let n = this.geometry,
        i = this.material,
        s = this.matrixWorld;
      i !== void 0 &&
        (n.boundingSphere === null && n.computeBoundingSphere(),
        we.copy(n.boundingSphere),
        we.applyMatrix4(s),
        It.copy(t.ray).recast(t.near),
        !(
          we.containsPoint(It.origin) === !1 &&
          (It.intersectSphere(we, Yi) === null ||
            It.origin.distanceToSquared(Yi) > (t.far - t.near) ** 2)
        ) &&
          (qi.copy(s).invert(),
          It.copy(t.ray).applyMatrix4(qi),
          !(n.boundingBox !== null && It.intersectsBox(n.boundingBox) === !1) &&
            this._computeIntersections(t, e, It)));
    }
    _computeIntersections(t, e, n) {
      let i,
        s = this.geometry,
        r = this.material,
        a = s.index,
        o = s.attributes.position,
        l = s.attributes.uv,
        c = s.attributes.uv1,
        u = s.attributes.normal,
        d = s.groups,
        f = s.drawRange;
      if (a !== null)
        if (Array.isArray(r))
          for (let p = 0, m = d.length; p < m; p++) {
            let _ = d[p],
              x = r[_.materialIndex],
              y = Math.max(_.start, f.start),
              S = Math.min(a.count, Math.min(_.start + _.count, f.start + f.count));
            for (let M = y, b = S; M < b; M += 3) {
              let w = a.getX(M),
                A = a.getX(M + 1),
                T = a.getX(M + 2);
              ((i = De(this, x, t, n, l, c, u, w, A, T)),
                i &&
                  ((i.faceIndex = Math.floor(M / 3)),
                  (i.face.materialIndex = _.materialIndex),
                  e.push(i)));
            }
          }
        else {
          let p = Math.max(0, f.start),
            m = Math.min(a.count, f.start + f.count);
          for (let _ = p, x = m; _ < x; _ += 3) {
            let y = a.getX(_),
              S = a.getX(_ + 1),
              M = a.getX(_ + 2);
            ((i = De(this, r, t, n, l, c, u, y, S, M)),
              i && ((i.faceIndex = Math.floor(_ / 3)), e.push(i)));
          }
        }
      else if (o !== void 0)
        if (Array.isArray(r))
          for (let p = 0, m = d.length; p < m; p++) {
            let _ = d[p],
              x = r[_.materialIndex],
              y = Math.max(_.start, f.start),
              S = Math.min(o.count, Math.min(_.start + _.count, f.start + f.count));
            for (let M = y, b = S; M < b; M += 3) {
              let w = M,
                A = M + 1,
                T = M + 2;
              ((i = De(this, x, t, n, l, c, u, w, A, T)),
                i &&
                  ((i.faceIndex = Math.floor(M / 3)),
                  (i.face.materialIndex = _.materialIndex),
                  e.push(i)));
            }
          }
        else {
          let p = Math.max(0, f.start),
            m = Math.min(o.count, f.start + f.count);
          for (let _ = p, x = m; _ < x; _ += 3) {
            let y = _,
              S = _ + 1,
              M = _ + 2;
            ((i = De(this, r, t, n, l, c, u, y, S, M)),
              i && ((i.faceIndex = Math.floor(_ / 3)), e.push(i)));
          }
        }
    }
  };
function nr(h9, t, e, n, i, s, r, a) {
  let o;
  if (
    (t.side === ns
      ? (o = n.intersectTriangle(r, s, i, !0, a))
      : (o = n.intersectTriangle(i, s, r, t.side === ke, a)),
    o === null)
  )
    return null;
  (Le.copy(a), Le.applyMatrix4(h9.matrixWorld));
  let l = e.ray.origin.distanceTo(Le);
  return l < e.near || l > e.far ? null : { distance: l, point: Le.clone(), object: h9 };
}
function De(h9, t, e, n, i, s, r, a, o, l) {
  (h9.getVertexPosition(a, Ce), h9.getVertexPosition(o, Re), h9.getVertexPosition(l, Ie));
  let c = nr(h9, t, e, n, Ce, Re, Ie, Zi);
  if (c) {
    let u = new g();
    (yt.getBarycoord(Zi, Ce, Re, Ie, u),
      i && (c.uv = yt.getInterpolatedAttribute(i, a, o, l, u, new B())),
      s && (c.uv1 = yt.getInterpolatedAttribute(s, a, o, l, u, new B())),
      r &&
        ((c.normal = yt.getInterpolatedAttribute(r, a, o, l, u, new g())),
        c.normal.dot(n.direction) > 0 && c.normal.multiplyScalar(-1)));
    let d = { a, b: o, c: l, normal: new g(), materialIndex: 0 };
    (yt.getNormal(Ce, Re, Ie, d.normal), (c.face = d), (c.barycoord = u));
  }
  return c;
}
var ue = class extends Kt {
    constructor(t) {
      (super(),
        (this.isPointsMaterial = !0),
        (this.type = 'PointsMaterial'),
        (this.color = new U(16777215)),
        (this.map = null),
        (this.alphaMap = null),
        (this.size = 1),
        (this.sizeAttenuation = !0),
        (this.fog = !0),
        this.setValues(t));
    }
    copy(t) {
      return (
        super.copy(t),
        this.color.copy(t.color),
        (this.map = t.map),
        (this.alphaMap = t.alphaMap),
        (this.size = t.size),
        (this.sizeAttenuation = t.sizeAttenuation),
        (this.fog = t.fog),
        this
      );
    }
  },
  Ji = new H(),
  oi = new ce(),
  Ne = new $t(),
  Ue = new g(),
  tn = class extends et {
    constructor(t = new Ut(), e = new ue()) {
      (super(),
        (this.isPoints = !0),
        (this.type = 'Points'),
        (this.geometry = t),
        (this.material = e),
        (this.morphTargetDictionary = void 0),
        (this.morphTargetInfluences = void 0),
        this.updateMorphTargets());
    }
    copy(t, e) {
      return (
        super.copy(t, e),
        (this.material = Array.isArray(t.material) ? t.material.slice() : t.material),
        (this.geometry = t.geometry),
        this
      );
    }
    raycast(t, e) {
      let n = this.geometry,
        i = this.matrixWorld,
        s = t.params.Points.threshold,
        r = n.drawRange;
      if (
        (n.boundingSphere === null && n.computeBoundingSphere(),
        Ne.copy(n.boundingSphere),
        Ne.applyMatrix4(i),
        (Ne.radius += s),
        t.ray.intersectsSphere(Ne) === !1)
      )
        return;
      (Ji.copy(i).invert(), oi.copy(t.ray).applyMatrix4(Ji));
      let a = s / ((this.scale.x + this.scale.y + this.scale.z) / 3),
        o = a * a,
        l = n.index,
        u = n.attributes.position;
      if (l !== null) {
        let d = Math.max(0, r.start),
          f = Math.min(l.count, r.start + r.count);
        for (let p = d, m = f; p < m; p++) {
          let _ = l.getX(p);
          (Ue.fromBufferAttribute(u, _), $i(Ue, _, o, i, t, e, this));
        }
      } else {
        let d = Math.max(0, r.start),
          f = Math.min(u.count, r.start + r.count);
        for (let p = d, m = f; p < m; p++)
          (Ue.fromBufferAttribute(u, p), $i(Ue, p, o, i, t, e, this));
      }
    }
    updateMorphTargets() {
      let e = this.geometry.morphAttributes,
        n = Object.keys(e);
      if (n.length > 0) {
        let i = e[n[0]];
        if (i !== void 0) {
          ((this.morphTargetInfluences = []), (this.morphTargetDictionary = {}));
          for (let s = 0, r = i.length; s < r; s++) {
            let a = i[s].name || String(s);
            (this.morphTargetInfluences.push(0), (this.morphTargetDictionary[a] = s));
          }
        }
      }
    }
  };
function $i(h9, t, e, n, i, s, r) {
  let a = oi.distanceSqToPoint(h9);
  if (a < e) {
    let o = new g();
    (oi.closestPointToPoint(h9, o), o.applyMatrix4(n));
    let l = i.ray.origin.distanceTo(o);
    if (l < i.near || l > i.far) return;
    s.push({
      distance: l,
      distanceToRay: Math.sqrt(a),
      point: o,
      index: t,
      face: null,
      faceIndex: null,
      barycoord: null,
      object: r,
    });
  }
}
var en = class extends Dt {
    constructor(t, e, n, i, s, r, a, o, l) {
      (super(t, e, n, i, s, r, a, o, l), (this.isCanvasTexture = !0), (this.needsUpdate = !0));
    }
  },
  nn = class h7 extends Ut {
    constructor(t = 1, e = 1, n = 1, i = 1) {
      (super(),
        (this.type = 'PlaneGeometry'),
        (this.parameters = { width: t, height: e, widthSegments: n, heightSegments: i }));
      let s = t / 2,
        r = e / 2,
        a = Math.floor(n),
        o = Math.floor(i),
        l = a + 1,
        c = o + 1,
        u = t / a,
        d = e / o,
        f = [],
        p = [],
        m = [],
        _ = [];
      for (let x = 0; x < c; x++) {
        let y = x * d - r;
        for (let S = 0; S < l; S++) {
          let M = S * u - s;
          (p.push(M, -y, 0), m.push(0, 0, 1), _.push(S / a), _.push(1 - x / o));
        }
      }
      for (let x = 0; x < o; x++)
        for (let y = 0; y < a; y++) {
          let S = y + l * x,
            M = y + l * (x + 1),
            b = y + 1 + l * (x + 1),
            w = y + 1 + l * x;
          (f.push(S, M, w), f.push(M, b, w));
        }
      (this.setIndex(f),
        this.setAttribute('position', new Lt(p, 3)),
        this.setAttribute('normal', new Lt(m, 3)),
        this.setAttribute('uv', new Lt(_, 2)));
    }
    copy(t) {
      return (super.copy(t), (this.parameters = Object.assign({}, t.parameters)), this);
    }
    static fromJSON(t) {
      return new h7(t.width, t.height, t.widthSegments, t.heightSegments);
    }
  };
function Si(h9) {
  let t = {};
  for (let e in h9) {
    t[e] = {};
    for (let n in h9[e]) {
      let i = h9[e][n];
      if (Ki(i))
        i.isRenderTargetTexture
          ? (z(
              'UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms().'
            ),
            (t[e][n] = null))
          : (t[e][n] = i.clone());
      else if (Array.isArray(i))
        if (Ki(i[0])) {
          let s = [];
          for (let r = 0, a = i.length; r < a; r++) s[r] = i[r].clone();
          t[e][n] = s;
        } else t[e][n] = i.slice();
      else t[e][n] = i;
    }
  }
  return t;
}
function Y(h9) {
  let t = {};
  for (let e = 0; e < h9.length; e++) {
    let n = Si(h9[e]);
    for (let i in n) t[i] = n[i];
  }
  return t;
}
function Ki(h9) {
  return (
    h9 &&
    (h9.isColor ||
      h9.isMatrix3 ||
      h9.isMatrix4 ||
      h9.isVector2 ||
      h9.isVector3 ||
      h9.isVector4 ||
      h9.isTexture ||
      h9.isQuaternion)
  );
}
function ir(h9) {
  let t = [];
  for (let e = 0; e < h9.length; e++) t.push(h9[e].clone());
  return t;
}
var sr = `void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,
  rr = `void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,
  sn = class extends Kt {
    constructor(t) {
      (super(),
        (this.isShaderMaterial = !0),
        (this.type = 'ShaderMaterial'),
        (this.defines = {}),
        (this.uniforms = {}),
        (this.uniformsGroups = []),
        (this.vertexShader = sr),
        (this.fragmentShader = rr),
        (this.linewidth = 1),
        (this.wireframe = !1),
        (this.wireframeLinewidth = 1),
        (this.fog = !1),
        (this.lights = !1),
        (this.clipping = !1),
        (this.forceSinglePass = !0),
        (this.extensions = { clipCullDistance: !1, multiDraw: !1 }),
        (this.defaultAttributeValues = { color: [1, 1, 1], uv: [0, 0], uv1: [0, 0] }),
        (this.index0AttributeName = void 0),
        (this.uniformsNeedUpdate = !1),
        (this.glslVersion = null),
        t !== void 0 && this.setValues(t));
    }
    copy(t) {
      return (
        super.copy(t),
        (this.fragmentShader = t.fragmentShader),
        (this.vertexShader = t.vertexShader),
        (this.uniforms = Si(t.uniforms)),
        (this.uniformsGroups = ir(t.uniformsGroups)),
        (this.defines = Object.assign({}, t.defines)),
        (this.wireframe = t.wireframe),
        (this.wireframeLinewidth = t.wireframeLinewidth),
        (this.fog = t.fog),
        (this.lights = t.lights),
        (this.clipping = t.clipping),
        (this.extensions = Object.assign({}, t.extensions)),
        (this.glslVersion = t.glslVersion),
        (this.defaultAttributeValues = Object.assign({}, t.defaultAttributeValues)),
        (this.index0AttributeName = t.index0AttributeName),
        (this.uniformsNeedUpdate = t.uniformsNeedUpdate),
        this
      );
    }
    toJSON(t) {
      let e = super.toJSON(t);
      ((e.glslVersion = this.glslVersion), (e.uniforms = {}));
      for (let i in this.uniforms) {
        let r = this.uniforms[i].value;
        r && r.isTexture
          ? (e.uniforms[i] = { type: 't', value: r.toJSON(t).uuid })
          : r && r.isColor
            ? (e.uniforms[i] = { type: 'c', value: r.getHex() })
            : r && r.isVector2
              ? (e.uniforms[i] = { type: 'v2', value: r.toArray() })
              : r && r.isVector3
                ? (e.uniforms[i] = { type: 'v3', value: r.toArray() })
                : r && r.isVector4
                  ? (e.uniforms[i] = { type: 'v4', value: r.toArray() })
                  : r && r.isMatrix3
                    ? (e.uniforms[i] = { type: 'm3', value: r.toArray() })
                    : r && r.isMatrix4
                      ? (e.uniforms[i] = { type: 'm4', value: r.toArray() })
                      : (e.uniforms[i] = { value: r });
      }
      (Object.keys(this.defines).length > 0 && (e.defines = this.defines),
        (e.vertexShader = this.vertexShader),
        (e.fragmentShader = this.fragmentShader),
        (e.lights = this.lights),
        (e.clipping = this.clipping));
      let n = {};
      for (let i in this.extensions) this.extensions[i] === !0 && (n[i] = !0);
      return (Object.keys(n).length > 0 && (e.extensions = n), e);
    }
    fromJSON(t, e) {
      if ((super.fromJSON(t, e), t.uniforms !== void 0))
        for (let n in t.uniforms) {
          let i = t.uniforms[n];
          switch (((this.uniforms[n] = {}), i.type)) {
            case 't':
              this.uniforms[n].value = e[i.value] || null;
              break;
            case 'c':
              this.uniforms[n].value = new U().setHex(i.value);
              break;
            case 'v2':
              this.uniforms[n].value = new B().fromArray(i.value);
              break;
            case 'v3':
              this.uniforms[n].value = new g().fromArray(i.value);
              break;
            case 'v4':
              this.uniforms[n].value = new Nt().fromArray(i.value);
              break;
            case 'm3':
              this.uniforms[n].value = new E().fromArray(i.value);
              break;
            case 'm4':
              this.uniforms[n].value = new H().fromArray(i.value);
              break;
            default:
              this.uniforms[n].value = i.value;
          }
        }
      if (
        (t.defines !== void 0 && (this.defines = t.defines),
        t.vertexShader !== void 0 && (this.vertexShader = t.vertexShader),
        t.fragmentShader !== void 0 && (this.fragmentShader = t.fragmentShader),
        t.glslVersion !== void 0 && (this.glslVersion = t.glslVersion),
        t.extensions !== void 0)
      )
        for (let n in t.extensions) this.extensions[n] = t.extensions[n];
      return (
        t.lights !== void 0 && (this.lights = t.lights),
        t.clipping !== void 0 && (this.clipping = t.clipping),
        this
      );
    }
  };
function Fe(h9, t) {
  return !h9 || h9.constructor === t
    ? h9
    : typeof t.BYTES_PER_ELEMENT == 'number'
      ? new t(h9)
      : Array.prototype.slice.call(h9);
}
var Tt = class {
    constructor(t, e, n, i) {
      ((this.parameterPositions = t),
        (this._cachedIndex = 0),
        (this.resultBuffer = i !== void 0 ? i : new e.constructor(n)),
        (this.sampleValues = e),
        (this.valueSize = n),
        (this.settings = null),
        (this.DefaultSettings_ = {}));
    }
    evaluate(t) {
      let e = this.parameterPositions,
        n = this._cachedIndex,
        i = e[n],
        s = e[n - 1];
      n: {
        t: {
          let r;
          e: {
            i: if (!(t < i)) {
              for (let a = n + 2; ;) {
                if (i === void 0) {
                  if (t < s) break i;
                  return ((n = e.length), (this._cachedIndex = n), this.copySampleValue_(n - 1));
                }
                if (n === a) break;
                if (((s = i), (i = e[++n]), t < i)) break t;
              }
              r = e.length;
              break e;
            }
            if (!(t >= s)) {
              let a = e[1];
              t < a && ((n = 2), (s = a));
              for (let o = n - 2; ;) {
                if (s === void 0) return ((this._cachedIndex = 0), this.copySampleValue_(0));
                if (n === o) break;
                if (((i = s), (s = e[--n - 1]), t >= s)) break t;
              }
              ((r = n), (n = 0));
              break e;
            }
            break n;
          }
          for (; n < r;) {
            let a = (n + r) >>> 1;
            t < e[a] ? (r = a) : (n = a + 1);
          }
          if (((i = e[n]), (s = e[n - 1]), s === void 0))
            return ((this._cachedIndex = 0), this.copySampleValue_(0));
          if (i === void 0)
            return ((n = e.length), (this._cachedIndex = n), this.copySampleValue_(n - 1));
        }
        ((this._cachedIndex = n), this.intervalChanged_(n, s, i));
      }
      return this.interpolate_(n, s, t, i);
    }
    getSettings_() {
      return this.settings || this.DefaultSettings_;
    }
    copySampleValue_(t) {
      let e = this.resultBuffer,
        n = this.sampleValues,
        i = this.valueSize,
        s = t * i;
      for (let r = 0; r !== i; ++r) e[r] = n[s + r];
      return e;
    }
    interpolate_() {
      throw new Error('THREE.Interpolant: Call to abstract method.');
    }
    intervalChanged_() {}
  },
  rn = class extends Tt {
    constructor(t, e, n, i) {
      (super(t, e, n, i),
        (this._weightPrev = -0),
        (this._offsetPrev = -0),
        (this._weightNext = -0),
        (this._offsetNext = -0),
        (this.DefaultSettings_ = { endingStart: Qn, endingEnd: Qn }));
    }
    intervalChanged_(t, e, n) {
      let i = this.parameterPositions,
        s = t - 2,
        r = t + 1,
        a = i[s],
        o = i[r];
      if (a === void 0)
        switch (this.getSettings_().endingStart) {
          case jn:
            ((s = t), (a = 2 * e - n));
            break;
          case ti:
            ((s = i.length - 2), (a = e + i[s] - i[s + 1]));
            break;
          default:
            ((s = t), (a = n));
        }
      if (o === void 0)
        switch (this.getSettings_().endingEnd) {
          case jn:
            ((r = t), (o = 2 * n - e));
            break;
          case ti:
            ((r = 1), (o = n + i[1] - i[0]));
            break;
          default:
            ((r = t - 1), (o = e));
        }
      let l = (n - e) * 0.5,
        c = this.valueSize;
      ((this._weightPrev = l / (e - a)),
        (this._weightNext = l / (o - n)),
        (this._offsetPrev = s * c),
        (this._offsetNext = r * c));
    }
    interpolate_(t, e, n, i) {
      let s = this.resultBuffer,
        r = this.sampleValues,
        a = this.valueSize,
        o = t * a,
        l = o - a,
        c = this._offsetPrev,
        u = this._offsetNext,
        d = this._weightPrev,
        f = this._weightNext,
        p = (n - e) / (i - e),
        m = p * p,
        _ = m * p,
        x = -d * _ + 2 * d * m - d * p,
        y = (1 + d) * _ + (-1.5 - 2 * d) * m + (-0.5 + d) * p + 1,
        S = (-1 - f) * _ + (1.5 + f) * m + 0.5 * p,
        M = f * _ - f * m;
      for (let b = 0; b !== a; ++b)
        s[b] = x * r[c + b] + y * r[l + b] + S * r[o + b] + M * r[u + b];
      return s;
    }
  },
  an = class extends Tt {
    constructor(t, e, n, i) {
      super(t, e, n, i);
    }
    interpolate_(t, e, n, i) {
      let s = this.resultBuffer,
        r = this.sampleValues,
        a = this.valueSize,
        o = t * a,
        l = o - a,
        c = (n - e) / (i - e),
        u = 1 - c;
      for (let d = 0; d !== a; ++d) s[d] = r[l + d] * u + r[o + d] * c;
      return s;
    }
  },
  on = class extends Tt {
    constructor(t, e, n, i) {
      super(t, e, n, i);
    }
    interpolate_(t) {
      return this.copySampleValue_(t - 1);
    }
  },
  ln = class extends Tt {
    interpolate_(t, e, n, i) {
      let s = this.resultBuffer,
        r = this.sampleValues,
        a = this.valueSize,
        o = t * a,
        l = o - a,
        c = this.inTangents,
        u = this.outTangents;
      if (!c || !u) {
        let p = (n - e) / (i - e),
          m = 1 - p;
        for (let _ = 0; _ !== a; ++_) s[_] = r[l + _] * m + r[o + _] * p;
        return s;
      }
      let d = a * 2,
        f = t - 1;
      for (let p = 0; p !== a; ++p) {
        let m = r[l + p],
          _ = r[o + p],
          x = f * d + p * 2,
          y = u[x],
          S = u[x + 1],
          M = t * d + p * 2,
          b = c[M],
          w = c[M + 1],
          A = (n - e) / (i - e),
          T,
          L,
          I,
          P,
          k;
        for (let D = 0; D < 8; D++) {
          ((T = A * A), (L = T * A), (I = 1 - A), (P = I * I), (k = P * I));
          let F = k * e + 3 * P * A * y + 3 * I * T * b + L * i - n;
          if (Math.abs(F) < 1e-10) break;
          let wt = 3 * P * (y - e) + 6 * I * A * (b - y) + 3 * T * (i - b);
          if (Math.abs(wt) < 1e-10) break;
          ((A = A - F / wt), (A = Math.max(0, Math.min(1, A))));
        }
        s[p] = k * m + 3 * P * A * S + 3 * I * T * w + L * _;
      }
      return s;
    }
  },
  K = class {
    constructor(t, e, n, i) {
      if (t === void 0) throw new Error('THREE.KeyframeTrack: track name is undefined');
      if (e === void 0 || e.length === 0)
        throw new Error('THREE.KeyframeTrack: no keyframes in track named ' + t);
      ((this.name = t),
        (this.times = Fe(e, this.TimeBufferType)),
        (this.values = Fe(n, this.ValueBufferType)),
        this.setInterpolation(i || this.DefaultInterpolation));
    }
    static toJSON(t) {
      let e = t.constructor,
        n;
      if (e.toJSON !== this.toJSON) n = e.toJSON(t);
      else {
        n = { name: t.name, times: Fe(t.times, Array), values: Fe(t.values, Array) };
        let i = t.getInterpolation();
        i !== t.DefaultInterpolation && (n.interpolation = i);
      }
      return ((n.type = t.ValueTypeName), n);
    }
    InterpolantFactoryMethodDiscrete(t) {
      return new on(this.times, this.values, this.getValueSize(), t);
    }
    InterpolantFactoryMethodLinear(t) {
      return new an(this.times, this.values, this.getValueSize(), t);
    }
    InterpolantFactoryMethodSmooth(t) {
      return new rn(this.times, this.values, this.getValueSize(), t);
    }
    InterpolantFactoryMethodBezier(t) {
      let e = new ln(this.times, this.values, this.getValueSize(), t);
      return (
        this.settings &&
          ((e.inTangents = this.settings.inTangents), (e.outTangents = this.settings.outTangents)),
        e
      );
    }
    setInterpolation(t) {
      let e;
      switch (t) {
        case oe:
          e = this.InterpolantFactoryMethodDiscrete;
          break;
        case He:
          e = this.InterpolantFactoryMethodLinear;
          break;
        case ze:
          e = this.InterpolantFactoryMethodSmooth;
          break;
        case Kn:
          e = this.InterpolantFactoryMethodBezier;
          break;
      }
      if (e === void 0) {
        let n =
          'unsupported interpolation for ' +
          this.ValueTypeName +
          ' keyframe track named ' +
          this.name;
        if (this.createInterpolant === void 0)
          if (t !== this.DefaultInterpolation) this.setInterpolation(this.DefaultInterpolation);
          else throw new Error(n);
        return (z('KeyframeTrack:', n), this);
      }
      return ((this.createInterpolant = e), this);
    }
    getInterpolation() {
      switch (this.createInterpolant) {
        case this.InterpolantFactoryMethodDiscrete:
          return oe;
        case this.InterpolantFactoryMethodLinear:
          return He;
        case this.InterpolantFactoryMethodSmooth:
          return ze;
        case this.InterpolantFactoryMethodBezier:
          return Kn;
      }
    }
    getValueSize() {
      return this.values.length / this.times.length;
    }
    shift(t) {
      if (t !== 0) {
        let e = this.times;
        for (let n = 0, i = e.length; n !== i; ++n) e[n] += t;
      }
      return this;
    }
    scale(t) {
      if (t !== 1) {
        let e = this.times;
        for (let n = 0, i = e.length; n !== i; ++n) e[n] *= t;
      }
      return this;
    }
    trim(t, e) {
      let n = this.times,
        i = n.length,
        s = 0,
        r = i - 1;
      for (; s !== i && n[s] < t;) ++s;
      for (; r !== -1 && n[r] > e;) --r;
      if ((++r, s !== 0 || r !== i)) {
        s >= r && ((r = Math.max(r, 1)), (s = r - 1));
        let a = this.getValueSize();
        ((this.times = n.slice(s, r)), (this.values = this.values.slice(s * a, r * a)));
      }
      return this;
    }
    validate() {
      let t = !0,
        e = this.getValueSize();
      e - Math.floor(e) !== 0 && (O('KeyframeTrack: Invalid value size in track.', this), (t = !1));
      let n = this.times,
        i = this.values,
        s = n.length;
      s === 0 && (O('KeyframeTrack: Track is empty.', this), (t = !1));
      let r = null;
      for (let a = 0; a !== s; a++) {
        let o = n[a];
        if (typeof o == 'number' && isNaN(o)) {
          (O('KeyframeTrack: Time is not a valid number.', this, a, o), (t = !1));
          break;
        }
        if (r !== null && r > o) {
          (O('KeyframeTrack: Out of order keys.', this, a, o, r), (t = !1));
          break;
        }
        r = o;
      }
      if (i !== void 0 && As(i))
        for (let a = 0, o = i.length; a !== o; ++a) {
          let l = i[a];
          if (isNaN(l)) {
            (O('KeyframeTrack: Value is not a valid number.', this, a, l), (t = !1));
            break;
          }
        }
      return t;
    }
    optimize() {
      let t = this.times.slice(),
        e = this.values.slice(),
        n = this.getValueSize(),
        i = this.getInterpolation() === ze,
        s = t.length - 1,
        r = 1;
      for (let a = 1; a < s; ++a) {
        let o = !1,
          l = t[a],
          c = t[a + 1];
        if (l !== c && (a !== 1 || l !== t[0]))
          if (i) o = !0;
          else {
            let u = a * n,
              d = u - n,
              f = u + n;
            for (let p = 0; p !== n; ++p) {
              let m = e[u + p];
              if (m !== e[d + p] || m !== e[f + p]) {
                o = !0;
                break;
              }
            }
          }
        if (o) {
          if (a !== r) {
            t[r] = t[a];
            let u = a * n,
              d = r * n;
            for (let f = 0; f !== n; ++f) e[d + f] = e[u + f];
          }
          ++r;
        }
      }
      if (s > 0) {
        t[r] = t[s];
        for (let a = s * n, o = r * n, l = 0; l !== n; ++l) e[o + l] = e[a + l];
        ++r;
      }
      return (
        r !== t.length
          ? ((this.times = t.slice(0, r)), (this.values = e.slice(0, r * n)))
          : ((this.times = t), (this.values = e)),
        this
      );
    }
    clone() {
      let t = this.times.slice(),
        e = this.values.slice(),
        n = this.constructor,
        i = new n(this.name, t, e);
      return ((i.createInterpolant = this.createInterpolant), i);
    }
  };
((K.prototype.ValueTypeName = ''),
  (K.prototype.TimeBufferType = Float32Array),
  (K.prototype.ValueBufferType = Float32Array),
  (K.prototype.DefaultInterpolation = He));
var At = class extends K {
  constructor(t, e, n) {
    super(t, e, n);
  }
};
((At.prototype.ValueTypeName = 'bool'),
  (At.prototype.ValueBufferType = Array),
  (At.prototype.DefaultInterpolation = oe),
  (At.prototype.InterpolantFactoryMethodLinear = void 0),
  (At.prototype.InterpolantFactoryMethodSmooth = void 0));
var cn = class extends K {
  constructor(t, e, n, i) {
    super(t, e, n, i);
  }
};
cn.prototype.ValueTypeName = 'color';
var hn = class extends K {
  constructor(t, e, n, i) {
    super(t, e, n, i);
  }
};
hn.prototype.ValueTypeName = 'number';
var un = class extends Tt {
    constructor(t, e, n, i) {
      super(t, e, n, i);
    }
    interpolate_(t, e, n, i) {
      let s = this.resultBuffer,
        r = this.sampleValues,
        a = this.valueSize,
        o = (n - e) / (i - e),
        l = t * a;
      for (let c = l + a; l !== c; l += 4) rt.slerpFlat(s, 0, r, l - a, r, l, o);
      return s;
    }
  },
  de = class extends K {
    constructor(t, e, n, i) {
      super(t, e, n, i);
    }
    InterpolantFactoryMethodLinear(t) {
      return new un(this.times, this.values, this.getValueSize(), t);
    }
  };
((de.prototype.ValueTypeName = 'quaternion'),
  (de.prototype.InterpolantFactoryMethodSmooth = void 0));
var Et = class extends K {
  constructor(t, e, n) {
    super(t, e, n);
  }
};
((Et.prototype.ValueTypeName = 'string'),
  (Et.prototype.ValueBufferType = Array),
  (Et.prototype.DefaultInterpolation = oe),
  (Et.prototype.InterpolantFactoryMethodLinear = void 0),
  (Et.prototype.InterpolantFactoryMethodSmooth = void 0));
var dn = class extends K {
  constructor(t, e, n, i) {
    super(t, e, n, i);
  }
};
dn.prototype.ValueTypeName = 'vector';
var fn = class {
    constructor(t, e, n) {
      let i = this,
        s = !1,
        r = 0,
        a = 0,
        o,
        l = [];
      ((this.onStart = void 0),
        (this.onLoad = t),
        (this.onProgress = e),
        (this.onError = n),
        (this._abortController = null),
        (this.itemStart = function (c) {
          (a++, s === !1 && i.onStart !== void 0 && i.onStart(c, r, a), (s = !0));
        }),
        (this.itemEnd = function (c) {
          (r++,
            i.onProgress !== void 0 && i.onProgress(c, r, a),
            r === a && ((s = !1), i.onLoad !== void 0 && i.onLoad()));
        }),
        (this.itemError = function (c) {
          i.onError !== void 0 && i.onError(c);
        }),
        (this.resolveURL = function (c) {
          return ((c = c.normalize('NFC')), o ? o(c) : c);
        }),
        (this.setURLModifier = function (c) {
          return ((o = c), this);
        }),
        (this.addHandler = function (c, u) {
          return (l.push(c, u), this);
        }),
        (this.removeHandler = function (c) {
          let u = l.indexOf(c);
          return (u !== -1 && l.splice(u, 2), this);
        }),
        (this.getHandler = function (c) {
          for (let u = 0, d = l.length; u < d; u += 2) {
            let f = l[u],
              p = l[u + 1];
            if ((f.global && (f.lastIndex = 0), f.test(c))) return p;
          }
          return null;
        }),
        (this.abort = function () {
          return (this.abortController.abort(), (this._abortController = null), this);
        }));
    }
    get abortController() {
      return (
        this._abortController || (this._abortController = new AbortController()),
        this._abortController
      );
    }
  },
  gs = new fn(),
  pn = class {
    constructor(t) {
      ((this.manager = t !== void 0 ? t : gs),
        (this.crossOrigin = 'anonymous'),
        (this.withCredentials = !1),
        (this.path = ''),
        (this.resourcePath = ''),
        (this.requestHeader = {}),
        typeof __THREE_DEVTOOLS__ != 'undefined' &&
          __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent('observe', { detail: this })));
    }
    load() {}
    loadAsync(t, e) {
      let n = this;
      return new Promise(function (i, s) {
        n.load(t, i, e, s);
      });
    }
    parse() {}
    setCrossOrigin(t) {
      return ((this.crossOrigin = t), this);
    }
    setWithCredentials(t) {
      return ((this.withCredentials = t), this);
    }
    setPath(t) {
      return ((this.path = t), this);
    }
    setResourcePath(t) {
      return ((this.resourcePath = t), this);
    }
    setRequestHeader(t) {
      return ((this.requestHeader = t), this);
    }
    abort() {
      return this;
    }
  };
pn.DEFAULT_MATERIAL_NAME = '__DEFAULT';
var Oe = new g(),
  Be = new rt(),
  at = new g(),
  mn = class extends et {
    constructor() {
      (super(),
        (this.isCamera = !0),
        (this.type = 'Camera'),
        (this.matrixWorldInverse = new H()),
        (this.projectionMatrix = new H()),
        (this.projectionMatrixInverse = new H()),
        (this.coordinateSystem = Yt),
        (this._reversedDepth = !1));
    }
    get reversedDepth() {
      return this._reversedDepth;
    }
    copy(t, e) {
      return (
        super.copy(t, e),
        this.matrixWorldInverse.copy(t.matrixWorldInverse),
        this.projectionMatrix.copy(t.projectionMatrix),
        this.projectionMatrixInverse.copy(t.projectionMatrixInverse),
        (this.coordinateSystem = t.coordinateSystem),
        this
      );
    }
    getWorldDirection(t) {
      return super.getWorldDirection(t).negate();
    }
    updateMatrixWorld(t) {
      (super.updateMatrixWorld(t),
        this.matrixWorld.decompose(Oe, Be, at),
        at.x === 1 && at.y === 1 && at.z === 1
          ? this.matrixWorldInverse.copy(this.matrixWorld).invert()
          : this.matrixWorldInverse.compose(Oe, Be, at.set(1, 1, 1)).invert());
    }
    updateWorldMatrix(t, e, n = !1) {
      (super.updateWorldMatrix(t, e, n),
        this.matrixWorld.decompose(Oe, Be, at),
        at.x === 1 && at.y === 1 && at.z === 1
          ? this.matrixWorldInverse.copy(this.matrixWorld).invert()
          : this.matrixWorldInverse.compose(Oe, Be, at.set(1, 1, 1)).invert());
    }
    clone() {
      return new this.constructor().copy(this);
    }
  },
  vt = new g(),
  Qi = new B(),
  ji = new B(),
  gn = class extends mn {
    constructor(t = 50, e = 1, n = 0.1, i = 2e3) {
      (super(),
        (this.isPerspectiveCamera = !0),
        (this.type = 'PerspectiveCamera'),
        (this.fov = t),
        (this.zoom = 1),
        (this.near = n),
        (this.far = i),
        (this.focus = 10),
        (this.aspect = e),
        (this.view = null),
        (this.filmGauge = 35),
        (this.filmOffset = 0),
        this.updateProjectionMatrix());
    }
    copy(t, e) {
      return (
        super.copy(t, e),
        (this.fov = t.fov),
        (this.zoom = t.zoom),
        (this.near = t.near),
        (this.far = t.far),
        (this.focus = t.focus),
        (this.aspect = t.aspect),
        (this.view = t.view === null ? null : Object.assign({}, t.view)),
        (this.filmGauge = t.filmGauge),
        (this.filmOffset = t.filmOffset),
        this
      );
    }
    setFocalLength(t) {
      let e = (0.5 * this.getFilmHeight()) / t;
      ((this.fov = le * 2 * Math.atan(e)), this.updateProjectionMatrix());
    }
    getFocalLength() {
      let t = Math.tan(se * 0.5 * this.fov);
      return (0.5 * this.getFilmHeight()) / t;
    }
    getEffectiveFOV() {
      return le * 2 * Math.atan(Math.tan(se * 0.5 * this.fov) / this.zoom);
    }
    getFilmWidth() {
      return this.filmGauge * Math.min(this.aspect, 1);
    }
    getFilmHeight() {
      return this.filmGauge / Math.max(this.aspect, 1);
    }
    getViewBounds(t, e, n) {
      (vt.set(-1, -1, 0.5).applyMatrix4(this.projectionMatrixInverse),
        e.set(vt.x, vt.y).multiplyScalar(-t / vt.z),
        vt.set(1, 1, 0.5).applyMatrix4(this.projectionMatrixInverse),
        n.set(vt.x, vt.y).multiplyScalar(-t / vt.z));
    }
    getViewSize(t, e) {
      return (this.getViewBounds(t, Qi, ji), e.subVectors(ji, Qi));
    }
    setViewOffset(t, e, n, i, s, r) {
      ((this.aspect = t / e),
        this.view === null &&
          (this.view = {
            enabled: !0,
            fullWidth: 1,
            fullHeight: 1,
            offsetX: 0,
            offsetY: 0,
            width: 1,
            height: 1,
          }),
        (this.view.enabled = !0),
        (this.view.fullWidth = t),
        (this.view.fullHeight = e),
        (this.view.offsetX = n),
        (this.view.offsetY = i),
        (this.view.width = s),
        (this.view.height = r),
        this.updateProjectionMatrix());
    }
    clearViewOffset() {
      (this.view !== null && (this.view.enabled = !1), this.updateProjectionMatrix());
    }
    updateProjectionMatrix() {
      let t = this.near,
        e = (t * Math.tan(se * 0.5 * this.fov)) / this.zoom,
        n = 2 * e,
        i = this.aspect * n,
        s = -0.5 * i,
        r = this.view;
      if (this.view !== null && this.view.enabled) {
        let o = r.fullWidth,
          l = r.fullHeight;
        ((s += (r.offsetX * i) / o),
          (e -= (r.offsetY * n) / l),
          (i *= r.width / o),
          (n *= r.height / l));
      }
      let a = this.filmOffset;
      (a !== 0 && (s += (t * a) / this.getFilmWidth()),
        this.projectionMatrix.makePerspective(
          s,
          s + i,
          e,
          e - n,
          t,
          this.far,
          this.coordinateSystem,
          this.reversedDepth
        ),
        this.projectionMatrixInverse.copy(this.projectionMatrix).invert());
    }
    toJSON(t) {
      let e = super.toJSON(t);
      return (
        (e.object.fov = this.fov),
        (e.object.zoom = this.zoom),
        (e.object.near = this.near),
        (e.object.far = this.far),
        (e.object.focus = this.focus),
        (e.object.aspect = this.aspect),
        this.view !== null && (e.object.view = Object.assign({}, this.view)),
        (e.object.filmGauge = this.filmGauge),
        (e.object.filmOffset = this.filmOffset),
        e
      );
    }
  },
  bi = '\\[\\]\\.:\\/',
  ar = new RegExp('[' + bi + ']', 'g'),
  Ti = '[^' + bi + ']',
  or = '[^' + bi.replace('\\.', '') + ']',
  lr = /((?:WC+[\/:])*)/.source.replace('WC', Ti),
  cr = /(WCOD+)?/.source.replace('WCOD', or),
  hr = /(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace('WC', Ti),
  ur = /\.(WC+)(?:\[(.+)\])?/.source.replace('WC', Ti),
  dr = new RegExp('^' + lr + cr + hr + ur + '$'),
  fr = ['material', 'materials', 'bones', 'map'],
  li = class {
    constructor(t, e, n) {
      let i = n || N.parseTrackName(e);
      ((this._targetGroup = t), (this._bindings = t.subscribe_(e, i)));
    }
    getValue(t, e) {
      this.bind();
      let n = this._targetGroup.nCachedObjects_,
        i = this._bindings[n];
      i !== void 0 && i.getValue(t, e);
    }
    setValue(t, e) {
      let n = this._bindings;
      for (let i = this._targetGroup.nCachedObjects_, s = n.length; i !== s; ++i)
        n[i].setValue(t, e);
    }
    bind() {
      let t = this._bindings;
      for (let e = this._targetGroup.nCachedObjects_, n = t.length; e !== n; ++e) t[e].bind();
    }
    unbind() {
      let t = this._bindings;
      for (let e = this._targetGroup.nCachedObjects_, n = t.length; e !== n; ++e) t[e].unbind();
    }
  },
  N = class h8 {
    constructor(t, e, n) {
      ((this.path = e),
        (this.parsedPath = n || h8.parseTrackName(e)),
        (this.node = h8.findNode(t, this.parsedPath.nodeName)),
        (this.rootNode = t),
        (this.getValue = this._getValue_unbound),
        (this.setValue = this._setValue_unbound));
    }
    static create(t, e, n) {
      return t && t.isAnimationObjectGroup ? new h8.Composite(t, e, n) : new h8(t, e, n);
    }
    static sanitizeNodeName(t) {
      return t.replace(/\s/g, '_').replace(ar, '');
    }
    static parseTrackName(t) {
      let e = dr.exec(t);
      if (e === null) throw new Error('THREE.PropertyBinding: Cannot parse trackName: ' + t);
      let n = {
          nodeName: e[2],
          objectName: e[3],
          objectIndex: e[4],
          propertyName: e[5],
          propertyIndex: e[6],
        },
        i = n.nodeName && n.nodeName.lastIndexOf('.');
      if (i !== void 0 && i !== -1) {
        let s = n.nodeName.substring(i + 1);
        fr.indexOf(s) !== -1 && ((n.nodeName = n.nodeName.substring(0, i)), (n.objectName = s));
      }
      if (n.propertyName === null || n.propertyName.length === 0)
        throw new Error('THREE.PropertyBinding: can not parse propertyName from trackName: ' + t);
      return n;
    }
    static findNode(t, e) {
      if (e === void 0 || e === '' || e === '.' || e === -1 || e === t.name || e === t.uuid)
        return t;
      if (t.skeleton) {
        let n = t.skeleton.getBoneByName(e);
        if (n !== void 0) return n;
      }
      if (t.children) {
        let n = function (s) {
            for (let r = 0; r < s.length; r++) {
              let a = s[r];
              if (a.name === e || a.uuid === e) return a;
              let o = n(a.children);
              if (o) return o;
            }
            return null;
          },
          i = n(t.children);
        if (i) return i;
      }
      return null;
    }
    _getValue_unavailable() {}
    _setValue_unavailable() {}
    _getValue_direct(t, e) {
      t[e] = this.targetObject[this.propertyName];
    }
    _getValue_array(t, e) {
      let n = this.resolvedProperty;
      for (let i = 0, s = n.length; i !== s; ++i) t[e++] = n[i];
    }
    _getValue_arrayElement(t, e) {
      t[e] = this.resolvedProperty[this.propertyIndex];
    }
    _getValue_toArray(t, e) {
      this.resolvedProperty.toArray(t, e);
    }
    _setValue_direct(t, e) {
      this.targetObject[this.propertyName] = t[e];
    }
    _setValue_direct_setNeedsUpdate(t, e) {
      ((this.targetObject[this.propertyName] = t[e]), (this.targetObject.needsUpdate = !0));
    }
    _setValue_direct_setMatrixWorldNeedsUpdate(t, e) {
      ((this.targetObject[this.propertyName] = t[e]),
        (this.targetObject.matrixWorldNeedsUpdate = !0));
    }
    _setValue_array(t, e) {
      let n = this.resolvedProperty;
      for (let i = 0, s = n.length; i !== s; ++i) n[i] = t[e++];
    }
    _setValue_array_setNeedsUpdate(t, e) {
      let n = this.resolvedProperty;
      for (let i = 0, s = n.length; i !== s; ++i) n[i] = t[e++];
      this.targetObject.needsUpdate = !0;
    }
    _setValue_array_setMatrixWorldNeedsUpdate(t, e) {
      let n = this.resolvedProperty;
      for (let i = 0, s = n.length; i !== s; ++i) n[i] = t[e++];
      this.targetObject.matrixWorldNeedsUpdate = !0;
    }
    _setValue_arrayElement(t, e) {
      this.resolvedProperty[this.propertyIndex] = t[e];
    }
    _setValue_arrayElement_setNeedsUpdate(t, e) {
      ((this.resolvedProperty[this.propertyIndex] = t[e]), (this.targetObject.needsUpdate = !0));
    }
    _setValue_arrayElement_setMatrixWorldNeedsUpdate(t, e) {
      ((this.resolvedProperty[this.propertyIndex] = t[e]),
        (this.targetObject.matrixWorldNeedsUpdate = !0));
    }
    _setValue_fromArray(t, e) {
      this.resolvedProperty.fromArray(t, e);
    }
    _setValue_fromArray_setNeedsUpdate(t, e) {
      (this.resolvedProperty.fromArray(t, e), (this.targetObject.needsUpdate = !0));
    }
    _setValue_fromArray_setMatrixWorldNeedsUpdate(t, e) {
      (this.resolvedProperty.fromArray(t, e), (this.targetObject.matrixWorldNeedsUpdate = !0));
    }
    _getValue_unbound(t, e) {
      (this.bind(), this.getValue(t, e));
    }
    _setValue_unbound(t, e) {
      (this.bind(), this.setValue(t, e));
    }
    bind() {
      let t = this.node,
        e = this.parsedPath,
        n = e.objectName,
        i = e.propertyName,
        s = e.propertyIndex;
      if (
        (t || ((t = h8.findNode(this.rootNode, e.nodeName)), (this.node = t)),
        (this.getValue = this._getValue_unavailable),
        (this.setValue = this._setValue_unavailable),
        !t)
      ) {
        z('PropertyBinding: No target node found for track: ' + this.path + '.');
        return;
      }
      if (n) {
        let l = e.objectIndex;
        switch (n) {
          case 'materials':
            if (!t.material) {
              O(
                'PropertyBinding: Can not bind to material as node does not have a material.',
                this
              );
              return;
            }
            if (!t.material.materials) {
              O(
                'PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.',
                this
              );
              return;
            }
            t = t.material.materials;
            break;
          case 'bones':
            if (!t.skeleton) {
              O('PropertyBinding: Can not bind to bones as node does not have a skeleton.', this);
              return;
            }
            t = t.skeleton.bones;
            for (let c = 0; c < t.length; c++)
              if (t[c].name === l) {
                l = c;
                break;
              }
            break;
          case 'map':
            if ('map' in t) {
              t = t.map;
              break;
            }
            if (!t.material) {
              O(
                'PropertyBinding: Can not bind to material as node does not have a material.',
                this
              );
              return;
            }
            if (!t.material.map) {
              O(
                'PropertyBinding: Can not bind to material.map as node.material does not have a map.',
                this
              );
              return;
            }
            t = t.material.map;
            break;
          default:
            if (t[n] === void 0) {
              O('PropertyBinding: Can not bind to objectName of node undefined.', this);
              return;
            }
            t = t[n];
        }
        if (l !== void 0) {
          if (t[l] === void 0) {
            O(
              'PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.',
              this,
              t
            );
            return;
          }
          t = t[l];
        }
      }
      let r = t[i];
      if (r === void 0) {
        let l = e.nodeName;
        O(
          'PropertyBinding: Trying to update property for track: ' +
            l +
            '.' +
            i +
            " but it wasn't found.",
          t
        );
        return;
      }
      let a = this.Versioning.None;
      ((this.targetObject = t),
        t.isMaterial === !0
          ? (a = this.Versioning.NeedsUpdate)
          : t.isObject3D === !0 && (a = this.Versioning.MatrixWorldNeedsUpdate));
      let o = this.BindingType.Direct;
      if (s !== void 0) {
        if (i === 'morphTargetInfluences') {
          if (!t.geometry) {
            O(
              'PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.',
              this
            );
            return;
          }
          if (!t.geometry.morphAttributes) {
            O(
              'PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.',
              this
            );
            return;
          }
          t.morphTargetDictionary[s] !== void 0 && (s = t.morphTargetDictionary[s]);
        }
        ((o = this.BindingType.ArrayElement),
          (this.resolvedProperty = r),
          (this.propertyIndex = s));
      } else
        r.fromArray !== void 0 && r.toArray !== void 0
          ? ((o = this.BindingType.HasFromToArray), (this.resolvedProperty = r))
          : Array.isArray(r)
            ? ((o = this.BindingType.EntireArray), (this.resolvedProperty = r))
            : (this.propertyName = i);
      ((this.getValue = this.GetterByBindingType[o]),
        (this.setValue = this.SetterByBindingTypeAndVersioning[o][a]));
    }
    unbind() {
      ((this.node = null),
        (this.getValue = this._getValue_unbound),
        (this.setValue = this._setValue_unbound));
    }
  };
((N.Composite = li),
  (N.prototype.BindingType = { Direct: 0, EntireArray: 1, ArrayElement: 2, HasFromToArray: 3 }),
  (N.prototype.Versioning = { None: 0, NeedsUpdate: 1, MatrixWorldNeedsUpdate: 2 }),
  (N.prototype.GetterByBindingType = [
    N.prototype._getValue_direct,
    N.prototype._getValue_array,
    N.prototype._getValue_arrayElement,
    N.prototype._getValue_toArray,
  ]),
  (N.prototype.SetterByBindingTypeAndVersioning = [
    [
      N.prototype._setValue_direct,
      N.prototype._setValue_direct_setNeedsUpdate,
      N.prototype._setValue_direct_setMatrixWorldNeedsUpdate,
    ],
    [
      N.prototype._setValue_array,
      N.prototype._setValue_array_setNeedsUpdate,
      N.prototype._setValue_array_setMatrixWorldNeedsUpdate,
    ],
    [
      N.prototype._setValue_arrayElement,
      N.prototype._setValue_arrayElement_setNeedsUpdate,
      N.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate,
    ],
    [
      N.prototype._setValue_fromArray,
      N.prototype._setValue_fromArray_setNeedsUpdate,
      N.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate,
    ],
  ]));
var Qo = new Float32Array(1),
  Ri = class {
    constructor(t, e, n, i) {
      ((this.elements = [1, 0, 0, 1]), t !== void 0 && this.set(t, e, n, i));
    }
    identity() {
      return (this.set(1, 0, 0, 1), this);
    }
    fromArray(t, e = 0) {
      for (let n = 0; n < 4; n++) this.elements[n] = t[n + e];
      return this;
    }
    set(t, e, n, i) {
      let s = this.elements;
      return ((s[0] = t), (s[2] = e), (s[1] = n), (s[3] = i), this);
    }
  };
Ri.prototype.isMatrix2 = !0;
var ci = Ri;
(typeof __THREE_DEVTOOLS__ != 'undefined' &&
  __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent('register', { detail: { revision: '185' } })),
  typeof window != 'undefined' &&
    (window.__THREE__
      ? z('WARNING: Multiple instances of Three.js being imported.')
      : (window.__THREE__ = '185')));
var pr = `#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,
  mr = `#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,
  gr = `#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,
  _r = `#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,
  xr = `#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,
  vr = `#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,
  yr = `#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,
  Mr = `#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,
  Sr = `#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,
  br = `#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,
  Tr = `vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,
  Ar = `vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,
  Er = `float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,
  wr = `#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,
  Cr = `#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,
  Rr = `#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,
  Ir = `#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,
  Pr = `#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,
  Lr = `#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,
  Dr = `#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,
  Nr = `#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,
  Ur = `#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,
  Fr = `#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,
  Or = `#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,
  Br = `#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,
  zr = `vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,
  Vr = `#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,
  kr = `#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,
  Gr = `#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,
  Hr = `#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,
  Wr = 'gl_FragColor = linearToOutputTexel( gl_FragColor );',
  Xr = `vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,
  qr = `#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,
  Yr = `#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,
  Zr = `#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,
  Jr = `#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,
  $r = `#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,
  Kr = `#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,
  Qr = `#ifdef USE_FOG
	varying float vFogDepth;
#endif`,
  jr = `#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,
  ta = `#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,
  ea = `#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,
  na = `#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,
  ia = `LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,
  sa = `varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,
  ra = `uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,
  aa = `#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,
  oa = `ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,
  la = `varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,
  ca = `BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,
  ha = `varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,
  ua = `PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,
  da = `uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,
  fa = `
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,
  pa = `#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,
  ma = `#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,
  ga = `#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,
  _a = `#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,
  xa = `#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,
  va = `#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,
  ya = `#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,
  Ma = `#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,
  Sa = `#ifdef USE_MAP
	uniform sampler2D map;
#endif`,
  ba = `#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,
  Ta = `#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,
  Aa = `float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,
  Ea = `#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,
  wa = `#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,
  Ca = `#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,
  Ra = `#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,
  Ia = `#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,
  Pa = `#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,
  La = `float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,
  Da = `#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,
  Na = `#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,
  Ua = `#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,
  Fa = `#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,
  Oa = `#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,
  Ba = `#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,
  za = `#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,
  Va = `#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,
  ka = `#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,
  Ga = `#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,
  Ha = `vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,
  Wa = `#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,
  Xa = `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,
  qa = `#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,
  Ya = `#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,
  Za = `float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,
  Ja = `#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,
  $a = `#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,
  Ka = `#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,
  Qa = `#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,
  ja = `float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,
  to = `#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,
  eo = `#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,
  no = `#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,
  io = `#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,
  so = `float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,
  ro = `#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,
  ao = `#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,
  oo = `#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,
  lo = `#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,
  co = `#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,
  ho = `#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,
  uo = `#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,
  fo = `#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,
  po = `#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,
  mo = `varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,
  go = `uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,
  _o = `varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,
  xo = `#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,
  vo = `varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,
  yo = `uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,
  Mo = `#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,
  So = `#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,
  bo = `#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,
  To = `#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,
  Ao = `varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,
  Eo = `uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,
  wo = `uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,
  Co = `uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,
  Ro = `#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,
  Io = `uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,
  Po = `#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,
  Lo = `#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,
  Do = `#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,
  No = `#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,
  Uo = `#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,
  Fo = `#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,
  Oo = `#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,
  Bo = `#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,
  zo = `#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,
  Vo = `#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,
  ko = `#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,
  Go = `#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,
  Ho = `uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,
  Wo = `uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,
  Xo = `#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,
  qo = `uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,
  Yo = `uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,
  Zo = `uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,
  R = {
    alphahash_fragment: pr,
    alphahash_pars_fragment: mr,
    alphamap_fragment: gr,
    alphamap_pars_fragment: _r,
    alphatest_fragment: xr,
    alphatest_pars_fragment: vr,
    aomap_fragment: yr,
    aomap_pars_fragment: Mr,
    batching_pars_vertex: Sr,
    batching_vertex: br,
    begin_vertex: Tr,
    beginnormal_vertex: Ar,
    bsdfs: Er,
    iridescence_fragment: wr,
    bumpmap_pars_fragment: Cr,
    clipping_planes_fragment: Rr,
    clipping_planes_pars_fragment: Ir,
    clipping_planes_pars_vertex: Pr,
    clipping_planes_vertex: Lr,
    color_fragment: Dr,
    color_pars_fragment: Nr,
    color_pars_vertex: Ur,
    color_vertex: Fr,
    common: Or,
    cube_uv_reflection_fragment: Br,
    defaultnormal_vertex: zr,
    displacementmap_pars_vertex: Vr,
    displacementmap_vertex: kr,
    emissivemap_fragment: Gr,
    emissivemap_pars_fragment: Hr,
    colorspace_fragment: Wr,
    colorspace_pars_fragment: Xr,
    envmap_fragment: qr,
    envmap_common_pars_fragment: Yr,
    envmap_pars_fragment: Zr,
    envmap_pars_vertex: Jr,
    envmap_physical_pars_fragment: aa,
    envmap_vertex: $r,
    fog_vertex: Kr,
    fog_pars_vertex: Qr,
    fog_fragment: jr,
    fog_pars_fragment: ta,
    gradientmap_pars_fragment: ea,
    lightmap_pars_fragment: na,
    lights_lambert_fragment: ia,
    lights_lambert_pars_fragment: sa,
    lights_pars_begin: ra,
    lights_toon_fragment: oa,
    lights_toon_pars_fragment: la,
    lights_phong_fragment: ca,
    lights_phong_pars_fragment: ha,
    lights_physical_fragment: ua,
    lights_physical_pars_fragment: da,
    lights_fragment_begin: fa,
    lights_fragment_maps: pa,
    lights_fragment_end: ma,
    lightprobes_pars_fragment: ga,
    logdepthbuf_fragment: _a,
    logdepthbuf_pars_fragment: xa,
    logdepthbuf_pars_vertex: va,
    logdepthbuf_vertex: ya,
    map_fragment: Ma,
    map_pars_fragment: Sa,
    map_particle_fragment: ba,
    map_particle_pars_fragment: Ta,
    metalnessmap_fragment: Aa,
    metalnessmap_pars_fragment: Ea,
    morphinstance_vertex: wa,
    morphcolor_vertex: Ca,
    morphnormal_vertex: Ra,
    morphtarget_pars_vertex: Ia,
    morphtarget_vertex: Pa,
    normal_fragment_begin: La,
    normal_fragment_maps: Da,
    normal_pars_fragment: Na,
    normal_pars_vertex: Ua,
    normal_vertex: Fa,
    normalmap_pars_fragment: Oa,
    clearcoat_normal_fragment_begin: Ba,
    clearcoat_normal_fragment_maps: za,
    clearcoat_pars_fragment: Va,
    iridescence_pars_fragment: ka,
    opaque_fragment: Ga,
    packing: Ha,
    premultiplied_alpha_fragment: Wa,
    project_vertex: Xa,
    dithering_fragment: qa,
    dithering_pars_fragment: Ya,
    roughnessmap_fragment: Za,
    roughnessmap_pars_fragment: Ja,
    shadowmap_pars_fragment: $a,
    shadowmap_pars_vertex: Ka,
    shadowmap_vertex: Qa,
    shadowmask_pars_fragment: ja,
    skinbase_vertex: to,
    skinning_pars_vertex: eo,
    skinning_vertex: no,
    skinnormal_vertex: io,
    specularmap_fragment: so,
    specularmap_pars_fragment: ro,
    tonemapping_fragment: ao,
    tonemapping_pars_fragment: oo,
    transmission_fragment: lo,
    transmission_pars_fragment: co,
    uv_pars_fragment: ho,
    uv_pars_vertex: uo,
    uv_vertex: fo,
    worldpos_vertex: po,
    background_vert: mo,
    background_frag: go,
    backgroundCube_vert: _o,
    backgroundCube_frag: xo,
    cube_vert: vo,
    cube_frag: yo,
    depth_vert: Mo,
    depth_frag: So,
    distance_vert: bo,
    distance_frag: To,
    equirect_vert: Ao,
    equirect_frag: Eo,
    linedashed_vert: wo,
    linedashed_frag: Co,
    meshbasic_vert: Ro,
    meshbasic_frag: Io,
    meshlambert_vert: Po,
    meshlambert_frag: Lo,
    meshmatcap_vert: Do,
    meshmatcap_frag: No,
    meshnormal_vert: Uo,
    meshnormal_frag: Fo,
    meshphong_vert: Oo,
    meshphong_frag: Bo,
    meshphysical_vert: zo,
    meshphysical_frag: Vo,
    meshtoon_vert: ko,
    meshtoon_frag: Go,
    points_vert: Ho,
    points_frag: Wo,
    shadow_vert: Xo,
    shadow_frag: qo,
    sprite_vert: Yo,
    sprite_frag: Zo,
  },
  v = {
    common: {
      diffuse: { value: new U(16777215) },
      opacity: { value: 1 },
      map: { value: null },
      mapTransform: { value: new E() },
      alphaMap: { value: null },
      alphaMapTransform: { value: new E() },
      alphaTest: { value: 0 },
    },
    specularmap: { specularMap: { value: null }, specularMapTransform: { value: new E() } },
    envmap: {
      envMap: { value: null },
      envMapRotation: { value: new E() },
      reflectivity: { value: 1 },
      ior: { value: 1.5 },
      refractionRatio: { value: 0.98 },
      dfgLUT: { value: null },
    },
    aomap: {
      aoMap: { value: null },
      aoMapIntensity: { value: 1 },
      aoMapTransform: { value: new E() },
    },
    lightmap: {
      lightMap: { value: null },
      lightMapIntensity: { value: 1 },
      lightMapTransform: { value: new E() },
    },
    bumpmap: {
      bumpMap: { value: null },
      bumpMapTransform: { value: new E() },
      bumpScale: { value: 1 },
    },
    normalmap: {
      normalMap: { value: null },
      normalMapTransform: { value: new E() },
      normalScale: { value: new B(1, 1) },
    },
    displacementmap: {
      displacementMap: { value: null },
      displacementMapTransform: { value: new E() },
      displacementScale: { value: 1 },
      displacementBias: { value: 0 },
    },
    emissivemap: { emissiveMap: { value: null }, emissiveMapTransform: { value: new E() } },
    metalnessmap: { metalnessMap: { value: null }, metalnessMapTransform: { value: new E() } },
    roughnessmap: { roughnessMap: { value: null }, roughnessMapTransform: { value: new E() } },
    gradientmap: { gradientMap: { value: null } },
    fog: {
      fogDensity: { value: 25e-5 },
      fogNear: { value: 1 },
      fogFar: { value: 2e3 },
      fogColor: { value: new U(16777215) },
    },
    lights: {
      ambientLightColor: { value: [] },
      lightProbe: { value: [] },
      directionalLights: { value: [], properties: { direction: {}, color: {} } },
      directionalLightShadows: {
        value: [],
        properties: {
          shadowIntensity: 1,
          shadowBias: {},
          shadowNormalBias: {},
          shadowRadius: {},
          shadowMapSize: {},
        },
      },
      directionalShadowMatrix: { value: [] },
      spotLights: {
        value: [],
        properties: {
          color: {},
          position: {},
          direction: {},
          distance: {},
          coneCos: {},
          penumbraCos: {},
          decay: {},
        },
      },
      spotLightShadows: {
        value: [],
        properties: {
          shadowIntensity: 1,
          shadowBias: {},
          shadowNormalBias: {},
          shadowRadius: {},
          shadowMapSize: {},
        },
      },
      spotLightMap: { value: [] },
      spotLightMatrix: { value: [] },
      pointLights: { value: [], properties: { color: {}, position: {}, decay: {}, distance: {} } },
      pointLightShadows: {
        value: [],
        properties: {
          shadowIntensity: 1,
          shadowBias: {},
          shadowNormalBias: {},
          shadowRadius: {},
          shadowMapSize: {},
          shadowCameraNear: {},
          shadowCameraFar: {},
        },
      },
      pointShadowMatrix: { value: [] },
      hemisphereLights: { value: [], properties: { direction: {}, skyColor: {}, groundColor: {} } },
      rectAreaLights: { value: [], properties: { color: {}, position: {}, width: {}, height: {} } },
      ltc_1: { value: null },
      ltc_2: { value: null },
      probesSH: { value: null },
      probesMin: { value: new g() },
      probesMax: { value: new g() },
      probesResolution: { value: new g() },
    },
    points: {
      diffuse: { value: new U(16777215) },
      opacity: { value: 1 },
      size: { value: 1 },
      scale: { value: 1 },
      map: { value: null },
      alphaMap: { value: null },
      alphaMapTransform: { value: new E() },
      alphaTest: { value: 0 },
      uvTransform: { value: new E() },
    },
    sprite: {
      diffuse: { value: new U(16777215) },
      opacity: { value: 1 },
      center: { value: new B(0.5, 0.5) },
      rotation: { value: 0 },
      map: { value: null },
      mapTransform: { value: new E() },
      alphaMap: { value: null },
      alphaMapTransform: { value: new E() },
      alphaTest: { value: 0 },
    },
  },
  _s = {
    basic: {
      uniforms: Y([v.common, v.specularmap, v.envmap, v.aomap, v.lightmap, v.fog]),
      vertexShader: R.meshbasic_vert,
      fragmentShader: R.meshbasic_frag,
    },
    lambert: {
      uniforms: Y([
        v.common,
        v.specularmap,
        v.envmap,
        v.aomap,
        v.lightmap,
        v.emissivemap,
        v.bumpmap,
        v.normalmap,
        v.displacementmap,
        v.fog,
        v.lights,
        { emissive: { value: new U(0) }, envMapIntensity: { value: 1 } },
      ]),
      vertexShader: R.meshlambert_vert,
      fragmentShader: R.meshlambert_frag,
    },
    phong: {
      uniforms: Y([
        v.common,
        v.specularmap,
        v.envmap,
        v.aomap,
        v.lightmap,
        v.emissivemap,
        v.bumpmap,
        v.normalmap,
        v.displacementmap,
        v.fog,
        v.lights,
        {
          emissive: { value: new U(0) },
          specular: { value: new U(1118481) },
          shininess: { value: 30 },
          envMapIntensity: { value: 1 },
        },
      ]),
      vertexShader: R.meshphong_vert,
      fragmentShader: R.meshphong_frag,
    },
    standard: {
      uniforms: Y([
        v.common,
        v.envmap,
        v.aomap,
        v.lightmap,
        v.emissivemap,
        v.bumpmap,
        v.normalmap,
        v.displacementmap,
        v.roughnessmap,
        v.metalnessmap,
        v.fog,
        v.lights,
        {
          emissive: { value: new U(0) },
          roughness: { value: 1 },
          metalness: { value: 0 },
          envMapIntensity: { value: 1 },
        },
      ]),
      vertexShader: R.meshphysical_vert,
      fragmentShader: R.meshphysical_frag,
    },
    toon: {
      uniforms: Y([
        v.common,
        v.aomap,
        v.lightmap,
        v.emissivemap,
        v.bumpmap,
        v.normalmap,
        v.displacementmap,
        v.gradientmap,
        v.fog,
        v.lights,
        { emissive: { value: new U(0) } },
      ]),
      vertexShader: R.meshtoon_vert,
      fragmentShader: R.meshtoon_frag,
    },
    matcap: {
      uniforms: Y([
        v.common,
        v.bumpmap,
        v.normalmap,
        v.displacementmap,
        v.fog,
        { matcap: { value: null } },
      ]),
      vertexShader: R.meshmatcap_vert,
      fragmentShader: R.meshmatcap_frag,
    },
    points: {
      uniforms: Y([v.points, v.fog]),
      vertexShader: R.points_vert,
      fragmentShader: R.points_frag,
    },
    dashed: {
      uniforms: Y([
        v.common,
        v.fog,
        { scale: { value: 1 }, dashSize: { value: 1 }, totalSize: { value: 2 } },
      ]),
      vertexShader: R.linedashed_vert,
      fragmentShader: R.linedashed_frag,
    },
    depth: {
      uniforms: Y([v.common, v.displacementmap]),
      vertexShader: R.depth_vert,
      fragmentShader: R.depth_frag,
    },
    normal: {
      uniforms: Y([v.common, v.bumpmap, v.normalmap, v.displacementmap, { opacity: { value: 1 } }]),
      vertexShader: R.meshnormal_vert,
      fragmentShader: R.meshnormal_frag,
    },
    sprite: {
      uniforms: Y([v.sprite, v.fog]),
      vertexShader: R.sprite_vert,
      fragmentShader: R.sprite_frag,
    },
    background: {
      uniforms: {
        uvTransform: { value: new E() },
        t2D: { value: null },
        backgroundIntensity: { value: 1 },
      },
      vertexShader: R.background_vert,
      fragmentShader: R.background_frag,
    },
    backgroundCube: {
      uniforms: {
        envMap: { value: null },
        backgroundBlurriness: { value: 0 },
        backgroundIntensity: { value: 1 },
        backgroundRotation: { value: new E() },
      },
      vertexShader: R.backgroundCube_vert,
      fragmentShader: R.backgroundCube_frag,
    },
    cube: {
      uniforms: { tCube: { value: null }, tFlip: { value: -1 }, opacity: { value: 1 } },
      vertexShader: R.cube_vert,
      fragmentShader: R.cube_frag,
    },
    equirect: {
      uniforms: { tEquirect: { value: null } },
      vertexShader: R.equirect_vert,
      fragmentShader: R.equirect_frag,
    },
    distance: {
      uniforms: Y([
        v.common,
        v.displacementmap,
        {
          referencePosition: { value: new g() },
          nearDistance: { value: 1 },
          farDistance: { value: 1e3 },
        },
      ]),
      vertexShader: R.distance_vert,
      fragmentShader: R.distance_frag,
    },
    shadow: {
      uniforms: Y([v.lights, v.fog, { color: { value: new U(0) }, opacity: { value: 1 } }]),
      vertexShader: R.shadow_vert,
      fragmentShader: R.shadow_frag,
    },
  };
_s.physical = {
  uniforms: Y([
    _s.standard.uniforms,
    {
      clearcoat: { value: 0 },
      clearcoatMap: { value: null },
      clearcoatMapTransform: { value: new E() },
      clearcoatNormalMap: { value: null },
      clearcoatNormalMapTransform: { value: new E() },
      clearcoatNormalScale: { value: new B(1, 1) },
      clearcoatRoughness: { value: 0 },
      clearcoatRoughnessMap: { value: null },
      clearcoatRoughnessMapTransform: { value: new E() },
      dispersion: { value: 0 },
      iridescence: { value: 0 },
      iridescenceMap: { value: null },
      iridescenceMapTransform: { value: new E() },
      iridescenceIOR: { value: 1.3 },
      iridescenceThicknessMinimum: { value: 100 },
      iridescenceThicknessMaximum: { value: 400 },
      iridescenceThicknessMap: { value: null },
      iridescenceThicknessMapTransform: { value: new E() },
      sheen: { value: 0 },
      sheenColor: { value: new U(0) },
      sheenColorMap: { value: null },
      sheenColorMapTransform: { value: new E() },
      sheenRoughness: { value: 1 },
      sheenRoughnessMap: { value: null },
      sheenRoughnessMapTransform: { value: new E() },
      transmission: { value: 0 },
      transmissionMap: { value: null },
      transmissionMapTransform: { value: new E() },
      transmissionSamplerSize: { value: new B() },
      transmissionSamplerMap: { value: null },
      thickness: { value: 0 },
      thicknessMap: { value: null },
      thicknessMapTransform: { value: new E() },
      attenuationDistance: { value: 0 },
      attenuationColor: { value: new U(0) },
      specularColor: { value: new U(1, 1, 1) },
      specularColorMap: { value: null },
      specularColorMapTransform: { value: new E() },
      specularIntensity: { value: 1 },
      specularIntensityMap: { value: null },
      specularIntensityMapTransform: { value: new E() },
      anisotropyVector: { value: new B() },
      anisotropyMap: { value: null },
      anisotropyMapTransform: { value: new E() },
    },
  ]),
  vertexShader: R.meshphysical_vert,
  fragmentShader: R.meshphysical_frag,
};
var Jo = new E();
Jo.set(-1, 0, 0, 0, 1, 0, 0, 0, 1);
var ep = {
    [ui]: 'LINEAR_TONE_MAPPING',
    [di]: 'REINHARD_TONE_MAPPING',
    [fi]: 'CINEON_TONE_MAPPING',
    [pi]: 'ACES_FILMIC_TONE_MAPPING',
    [gi]: 'AGX_TONE_MAPPING',
    [_i]: 'NEUTRAL_TONE_MAPPING',
    [mi]: 'CUSTOM_TONE_MAPPING',
  },
  np = new Float32Array(16),
  ip = new Float32Array(9),
  sp = new Float32Array(4),
  rp = {
    [ui]: 'Linear',
    [di]: 'Reinhard',
    [fi]: 'Cineon',
    [pi]: 'ACESFilmic',
    [gi]: 'AgX',
    [_i]: 'Neutral',
    [mi]: 'Custom',
  },
  ap = { [ts]: 'SHADOWMAP_TYPE_PCF', [es]: 'SHADOWMAP_TYPE_VSM' },
  op = { [as]: 'ENVMAP_TYPE_CUBE', [vi]: 'ENVMAP_TYPE_CUBE', [os]: 'ENVMAP_TYPE_CUBE_UV' },
  lp = { [vi]: 'ENVMAP_MODE_REFRACTION' },
  cp = {
    [hi]: 'ENVMAP_BLENDING_MULTIPLY',
    [ss]: 'ENVMAP_BLENDING_MIX',
    [rs]: 'ENVMAP_BLENDING_ADD',
  },
  $o = new E();
$o.set(-1, 0, 0, 0, 1, 0, 0, 0, 1);
var hp = new Uint16Array([
  12469, 15057, 12620, 14925, 13266, 14620, 13807, 14376, 14323, 13990, 14545, 13625, 14713, 13328,
  14840, 12882, 14931, 12528, 14996, 12233, 15039, 11829, 15066, 11525, 15080, 11295, 15085, 10976,
  15082, 10705, 15073, 10495, 13880, 14564, 13898, 14542, 13977, 14430, 14158, 14124, 14393, 13732,
  14556, 13410, 14702, 12996, 14814, 12596, 14891, 12291, 14937, 11834, 14957, 11489, 14958, 11194,
  14943, 10803, 14921, 10506, 14893, 10278, 14858, 9960, 14484, 14039, 14487, 14025, 14499, 13941,
  14524, 13740, 14574, 13468, 14654, 13106, 14743, 12678, 14818, 12344, 14867, 11893, 14889, 11509,
  14893, 11180, 14881, 10751, 14852, 10428, 14812, 10128, 14765, 9754, 14712, 9466, 14764, 13480,
  14764, 13475, 14766, 13440, 14766, 13347, 14769, 13070, 14786, 12713, 14816, 12387, 14844, 11957,
  14860, 11549, 14868, 11215, 14855, 10751, 14825, 10403, 14782, 10044, 14729, 9651, 14666, 9352,
  14599, 9029, 14967, 12835, 14966, 12831, 14963, 12804, 14954, 12723, 14936, 12564, 14917, 12347,
  14900, 11958, 14886, 11569, 14878, 11247, 14859, 10765, 14828, 10401, 14784, 10011, 14727, 9600,
  14660, 9289, 14586, 8893, 14508, 8533, 15111, 12234, 15110, 12234, 15104, 12216, 15092, 12156,
  15067, 12010, 15028, 11776, 14981, 11500, 14942, 11205, 14902, 10752, 14861, 10393, 14812, 9991,
  14752, 9570, 14682, 9252, 14603, 8808, 14519, 8445, 14431, 8145, 15209, 11449, 15208, 11451,
  15202, 11451, 15190, 11438, 15163, 11384, 15117, 11274, 15055, 10979, 14994, 10648, 14932, 10343,
  14871, 9936, 14803, 9532, 14729, 9218, 14645, 8742, 14556, 8381, 14461, 8020, 14365, 7603, 15273,
  10603, 15272, 10607, 15267, 10619, 15256, 10631, 15231, 10614, 15182, 10535, 15118, 10389, 15042,
  10167, 14963, 9787, 14883, 9447, 14800, 9115, 14710, 8665, 14615, 8318, 14514, 7911, 14411, 7507,
  14279, 7198, 15314, 9675, 15313, 9683, 15309, 9712, 15298, 9759, 15277, 9797, 15229, 9773, 15166,
  9668, 15084, 9487, 14995, 9274, 14898, 8910, 14800, 8539, 14697, 8234, 14590, 7790, 14479, 7409,
  14367, 7067, 14178, 6621, 15337, 8619, 15337, 8631, 15333, 8677, 15325, 8769, 15305, 8871, 15264,
  8940, 15202, 8909, 15119, 8775, 15022, 8565, 14916, 8328, 14804, 8009, 14688, 7614, 14569, 7287,
  14448, 6888, 14321, 6483, 14088, 6171, 15350, 7402, 15350, 7419, 15347, 7480, 15340, 7613, 15322,
  7804, 15287, 7973, 15229, 8057, 15148, 8012, 15046, 7846, 14933, 7611, 14810, 7357, 14682, 7069,
  14552, 6656, 14421, 6316, 14251, 5948, 14007, 5528, 15356, 5942, 15356, 5977, 15353, 6119, 15348,
  6294, 15332, 6551, 15302, 6824, 15249, 7044, 15171, 7122, 15070, 7050, 14949, 6861, 14818, 6611,
  14679, 6349, 14538, 6067, 14398, 5651, 14189, 5311, 13935, 4958, 15359, 4123, 15359, 4153, 15356,
  4296, 15353, 4646, 15338, 5160, 15311, 5508, 15263, 5829, 15188, 6042, 15088, 6094, 14966, 6001,
  14826, 5796, 14678, 5543, 14527, 5287, 14377, 4985, 14133, 4586, 13869, 4257, 15360, 1563, 15360,
  1642, 15358, 2076, 15354, 2636, 15341, 3350, 15317, 4019, 15273, 4429, 15203, 4732, 15105, 4911,
  14981, 4932, 14836, 4818, 14679, 4621, 14517, 4386, 14359, 4156, 14083, 3795, 13808, 3437, 15360,
  122, 15360, 137, 15358, 285, 15355, 636, 15344, 1274, 15322, 2177, 15281, 2765, 15215, 3223,
  15120, 3451, 14995, 3569, 14846, 3567, 14681, 3466, 14511, 3305, 14344, 3121, 14037, 2800, 13753,
  2467, 15360, 0, 15360, 1, 15359, 21, 15355, 89, 15346, 253, 15325, 479, 15287, 796, 15225, 1148,
  15133, 1492, 15008, 1749, 14856, 1882, 14685, 1886, 14506, 1783, 14324, 1608, 13996, 1398, 13702,
  1183,
]);
export {
  is as AdditiveBlending,
  ot as BufferAttribute,
  Ut as BufferGeometry,
  en as CanvasTexture,
  U as Color,
  Je as Fog,
  Ze as Group,
  ps as MathUtils,
  H as Matrix4,
  je as Mesh,
  he as MeshBasicMaterial,
  Ge as NormalBlending,
  gn as PerspectiveCamera,
  nn as PlaneGeometry,
  tn as Points,
  ue as PointsMaterial,
  rt as Quaternion,
  $ as SRGBColorSpace,
  $e as Scene,
  sn as ShaderMaterial,
  B as Vector2,
  g as Vector3,
};
