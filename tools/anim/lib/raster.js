'use strict';
/**
 * Tiny dependency-free 2D rasterizer.
 *
 * Shapes are drawn from signed distance functions with analytic
 * anti-aliasing, straight into an RGB24 buffer that ffmpeg can read as
 * rawvideo. All coordinates here are in PIXELS (y down).
 *
 * Shape kinds:
 *   cone    { a:[x,y], b:[x,y], ra, rb }  rounded limb, different radius per end
 *                                          (a == b gives a circle)
 *   ellipse { c:[x,y], rx, ry }
 *   poly    { pts:[[x,y],...], r }         filled polygon, optionally grown by r (rounded corners)
 *   ring    { c:[x,y], r, w }              circle outline: centre-line radius r, half-width w
 * Common fields:
 *   color [r,g,b]   alpha 0..1 (default 1)
 *   soft  edge width in px (default 1 = crisp anti-aliased edge)
 *   clip  { p:[x,y], n:[x,y] }  keep only the side where dot(q - p, n) <= 0
 */

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Bad color: ${hex}`);
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function mix(c1, c2, t) {
  return [0, 1, 2].map((i) => Math.round(c1[i] + (c2[i] - c1[i]) * t));
}

// Signed distance to a "round cone" (two circles + their hull).
function sdRoundCone(px, py, ax, ay, bx, by, r1, r2) {
  const bax = bx - ax, bay = by - ay;
  const l2 = bax * bax + bay * bay;
  const pax = px - ax, pay = py - ay;
  if (l2 < 1e-9) return Math.hypot(pax, pay) - Math.max(r1, r2);
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const y = pax * bax + pay * bay;
  const z = y - l2;
  const qx = pax * l2 - bax * y, qy = pay * l2 - bay * y;
  const x2 = qx * qx + qy * qy;
  const y2 = y * y * l2;
  const z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

// Signed distance to a simple polygon (negative inside).
function sdPolygon(px, py, pts) {
  const n = pts.length;
  let d = Infinity, sign = 1;
  for (let i = 0, k = n - 1; i < n; k = i, i++) {
    const vi = pts[i], vk = pts[k];
    const ex = vk[0] - vi[0], ey = vk[1] - vi[1];
    const wx = px - vi[0], wy = py - vi[1];
    let t = (wx * ex + wy * ey) / (ex * ex + ey * ey || 1);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const bx = wx - ex * t, by = wy - ey * t;
    const dd = bx * bx + by * by;
    if (dd < d) d = dd;
    const c1 = py >= vi[1], c2 = py < vk[1], c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) sign = -sign;
  }
  return sign * Math.sqrt(d);
}

class Canvas {
  constructor(width, height) {
    this.w = width;
    this.h = height;
    this.buf = Buffer.alloc(width * height * 3);
  }

  copyFrom(other) {
    other.buf.copy(this.buf);
  }

  fillRect(x0, y0, x1, y1, color) {
    x0 = Math.max(0, Math.round(x0)); y0 = Math.max(0, Math.round(y0));
    x1 = Math.min(this.w, Math.round(x1)); y1 = Math.min(this.h, Math.round(y1));
    for (let y = y0; y < y1; y++) {
      let i = (y * this.w + x0) * 3;
      for (let x = x0; x < x1; x++) {
        this.buf[i++] = color[0]; this.buf[i++] = color[1]; this.buf[i++] = color[2];
      }
    }
  }

  draw(s) {
    const soft = s.soft || 1;
    const alpha = s.alpha == null ? 1 : s.alpha;
    let minX, maxX, minY, maxY, dist;
    if (s.kind === 'cone') {
      const r = Math.max(s.ra, s.rb);
      minX = Math.min(s.a[0], s.b[0]) - r; maxX = Math.max(s.a[0], s.b[0]) + r;
      minY = Math.min(s.a[1], s.b[1]) - r; maxY = Math.max(s.a[1], s.b[1]) + r;
      dist = (x, y) => sdRoundCone(x, y, s.a[0], s.a[1], s.b[0], s.b[1], s.ra, s.rb);
    } else if (s.kind === 'ellipse') {
      minX = s.c[0] - s.rx; maxX = s.c[0] + s.rx;
      minY = s.c[1] - s.ry; maxY = s.c[1] + s.ry;
      const rmin = Math.min(s.rx, s.ry);
      dist = (x, y) => (Math.hypot((x - s.c[0]) / s.rx, (y - s.c[1]) / s.ry) - 1) * rmin;
    } else if (s.kind === 'poly') {
      const r = s.r || 0;
      minX = minY = Infinity; maxX = maxY = -Infinity;
      for (const p of s.pts) {
        minX = Math.min(minX, p[0] - r); maxX = Math.max(maxX, p[0] + r);
        minY = Math.min(minY, p[1] - r); maxY = Math.max(maxY, p[1] + r);
      }
      dist = (x, y) => sdPolygon(x, y, s.pts) - r;
    } else if (s.kind === 'ring') {
      const o = s.r + s.w;
      minX = s.c[0] - o; maxX = s.c[0] + o; minY = s.c[1] - o; maxY = s.c[1] + o;
      dist = (x, y) => Math.abs(Math.hypot(x - s.c[0], y - s.c[1]) - s.r) - s.w;
    } else {
      throw new Error(`Unknown shape kind: ${s.kind}`);
    }
    const x0 = Math.max(0, Math.floor(minX - soft)), x1 = Math.min(this.w - 1, Math.ceil(maxX + soft));
    const y0 = Math.max(0, Math.floor(minY - soft)), y1 = Math.min(this.h - 1, Math.ceil(maxY + soft));
    const [cr, cg, cb] = s.color;
    const clip = s.clip;
    for (let y = y0; y <= y1; y++) {
      const py = y + 0.5;
      let i = (y * this.w + x0) * 3;
      for (let x = x0; x <= x1; x++, i += 3) {
        const px = x + 0.5;
        let d = dist(px, py);
        if (clip) {
          const dc = (px - clip.p[0]) * clip.n[0] + (py - clip.p[1]) * clip.n[1];
          if (dc > d) d = dc;
        }
        let cov = 0.5 - d / soft;
        if (cov <= 0) continue;
        if (cov > 1) cov = 1;
        const a = cov * alpha;
        this.buf[i] += (cr - this.buf[i]) * a;
        this.buf[i + 1] += (cg - this.buf[i + 1]) * a;
        this.buf[i + 2] += (cb - this.buf[i + 2]) * a;
      }
    }
  }
}

module.exports = { Canvas, hexToRgb, mix };
