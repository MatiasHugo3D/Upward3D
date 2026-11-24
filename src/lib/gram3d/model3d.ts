/** Parametric keychains & plates (text or SVG logo in relief), in millimetres, Z up for slicers. */
import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

export type ModelMode = "keychain" | "plate";

export interface ModelParams {
  mode: ModelMode;
  source: "text" | "svg";
  text: string;
  svg?: string | undefined;
  /** text: letter height · svg: logo width (mm) */
  size: number;
  base: number;
  relief: number;
  padding: number;
  ringDiameter: number;
  screwHoles: boolean;
}

export interface BuiltModel {
  base: THREE.BufferGeometry;
  relief: THREE.BufferGeometry | null;
  width: number;
  height: number;
  depth: number;
  volumeMm3: number;
}

function reliefFromText(font: Font, p: ModelParams) {
  const t = p.text.trim();
  if (!t) return null;
  return new TextGeometry(t, { font, size: p.size * 1.4, depth: p.relief, curveSegments: 8, bevelEnabled: false });
}

function reliefFromSvg(p: ModelParams) {
  if (!p.svg) return null;
  const data = new SVGLoader().parse(p.svg);
  const shapes = data.paths
    .filter((path) => {
      const fill = (path.userData as { style?: { fill?: string } } | undefined)?.style?.fill;
      return fill !== "none" && fill !== "transparent";
    })
    .flatMap((path) => SVGLoader.createShapes(path));
  if (!shapes.length) throw new Error("Este SVG não tem formas preenchidas");
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: p.relief, bevelEnabled: false, curveSegments: 10 });
  geo.rotateX(Math.PI); // SVG y points down: a rotation (not a mirror) keeps faces outward
  geo.computeBoundingBox();
  const b = geo.boundingBox!;
  const s = p.size / Math.max(1e-6, b.max.x - b.min.x);
  geo.scale(s, s, 1);
  return geo;
}

function roundedShape(x0: number, y0: number, x1: number, y1: number, rl: number, rr: number) {
  const s = new THREE.Shape();
  s.moveTo(x0 + rl, y0);
  s.lineTo(x1 - rr, y0);
  s.quadraticCurveTo(x1, y0, x1, y0 + rr);
  s.lineTo(x1, y1 - rr);
  s.quadraticCurveTo(x1, y1, x1 - rr, y1);
  s.lineTo(x0 + rl, y1);
  if (rl >= (y1 - y0) / 2 - 1e-6) s.absarc(x0 + rl, (y0 + y1) / 2, rl, Math.PI / 2, (Math.PI * 3) / 2, false);
  else {
    s.quadraticCurveTo(x0, y1, x0, y1 - rl);
    s.lineTo(x0, y0 + rl);
    s.quadraticCurveTo(x0, y0, x0 + rl, y0);
  }
  return s;
}

function hole(cx: number, cy: number, r: number) {
  const h = new THREE.Path();
  h.absarc(cx, cy, r, 0, Math.PI * 2, true);
  return h;
}

/** Signed-tetrahedron volume of a closed mesh (mm³). */
export function meshVolume(geo: THREE.BufferGeometry) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.attributes['position']!;
  let v = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    v += a.dot(b.clone().cross(c)) / 6;
  }
  if (g !== geo) g.dispose();
  return Math.abs(v);
}

/** PLA ≈ 1.24 g/cm³; small flat parts print almost solid (walls + top/bottom), so ~85% fill. */
export function estimateGrams(volumeMm3: number, density = 1.24, fill = 0.85) {
  return Math.round(((volumeMm3 / 1000) * density * fill) * 10) / 10;
}

export function buildModel(font: Font | null, p: ModelParams): BuiltModel {
  const relief = p.source === "text" ? (font ? reliefFromText(font, p) : null) : reliefFromSvg(p);
  let w = 0;
  let h = 0;
  if (relief) {
    relief.computeBoundingBox();
    const b = relief.boundingBox!;
    w = b.max.x - b.min.x;
    h = b.max.y - b.min.y;
    // centre on XY, sit on top of the base
    relief.translate(-(b.min.x + w / 2), -(b.min.y + h / 2), p.base - b.min.z);
  } else {
    w = 30;
    h = 12;
  }

  let x0 = -w / 2 - p.padding;
  let x1 = w / 2 + p.padding;
  let H = h + p.padding * 2;
  const holes: THREE.Path[] = [];
  let rl = Math.min(3, H / 4);
  const rr = Math.min(3, H / 4);

  if (p.mode === "keychain") {
    const ringR = p.ringDiameter / 2;
    H = Math.max(H, p.ringDiameter + 5);
    const tab = p.ringDiameter + 3;
    x0 -= tab;
    rl = H / 2;
    holes.push(hole(x0 + Math.max(ringR + 2.5, H / 2 - 0.0001) - (H / 2 - (ringR + 2.5) > 0 ? H / 2 - (ringR + 2.5) : 0), 0, ringR));
  } else if (p.screwHoles) {
    x0 -= 7;
    x1 += 7;
    holes.push(hole(x0 + 3.5, 0, 1.75), hole(x1 - 3.5, 0, 1.75));
  }

  const shape = roundedShape(x0, -H / 2, x1, H / 2, rl, rr);
  shape.holes.push(...holes);
  const base = new THREE.ExtrudeGeometry(shape, { depth: p.base, bevelEnabled: false, curveSegments: 32 });
  base.computeVertexNormals();
  relief?.computeVertexNormals();

  return {
    base,
    relief,
    width: x1 - x0,
    height: H,
    depth: p.base + (relief ? p.relief : 0),
    volumeMm3: meshVolume(base) + (relief ? meshVolume(relief) : 0),
  };
}

export function exportStl(model: BuiltModel, filename: string) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(model.base));
  if (model.relief) group.add(new THREE.Mesh(model.relief));
  const out = new STLExporter().parse(group, { binary: true }) as unknown as DataView;
  const blob = new Blob([out.buffer as ArrayBuffer], { type: "model/stl" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".stl") ? filename : `${filename}.stl`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
