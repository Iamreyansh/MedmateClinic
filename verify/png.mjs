/**
 * A PNG codec, in Node, with no dependencies.
 *
 * The pixel-diff harness has to run from the root `npm run fidelity:pixels`
 * script, and the root package is owned by another agent — its dependency
 * list cannot grow. `pngjs` and `pixelmatch` are therefore not available, so
 * the few hundred lines it takes to read and write a PNG live here.
 *
 * What is supported: 8-bit channels, greyscale / RGB / palette / greyscale+alpha /
 * RGBA, no interlacing. Anything else is refused loudly, because a silently
 * mis-decoded baseline is worse than a missing one.
 */
import { inflateSync, deflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** CRC-32, as PNG defines it. */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** @typedef {{ width: number, height: number, data: Buffer }} RgbaImage */

/**
 * Read a PNG into straight RGBA8.
 *
 * @param {Buffer} buffer
 * @returns {RgbaImage}
 */
export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error("not a PNG file (bad signature)");
  }

  let offset = 8;
  let header = null;
  let palette = null;
  let transparency = null;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length; // length + type + body + crc

    if (type === "IHDR") {
      header = {
        width: body.readUInt32BE(0),
        height: body.readUInt32BE(4),
        bitDepth: body[8],
        colorType: body[9],
        compression: body[10],
        filter: body[11],
        interlace: body[12],
      };
    } else if (type === "PLTE") {
      palette = Buffer.from(body);
    } else if (type === "tRNS") {
      transparency = Buffer.from(body);
    } else if (type === "IDAT") {
      idat.push(Buffer.from(body));
    } else if (type === "IEND") {
      break;
    }
  }

  if (!header) throw new Error("PNG has no IHDR chunk");
  if (header.interlace !== 0) throw new Error("interlaced PNGs are not supported");
  if (header.bitDepth !== 8) throw new Error(`PNG bit depth ${header.bitDepth} is not supported (only 8)`);
  if (header.compression !== 0 || header.filter !== 0) {
    throw new Error("unsupported PNG compression or filter method");
  }

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[header.colorType];
  if (!channels) throw new Error(`PNG colour type ${header.colorType} is not supported`);

  const raw = inflateSync(Buffer.concat(idat));
  const { width, height } = header;
  const bpp = channels;
  const stride = width * bpp;
  const out = Buffer.alloc(stride * height);

  let source = 0;
  for (let row = 0; row < height; row += 1) {
    const filter = raw[source];
    source += 1;
    const line = raw.subarray(source, source + stride);
    source += stride;
    const current = out.subarray(row * stride, row * stride + stride);
    const previous = row > 0 ? out.subarray((row - 1) * stride, row * stride) : null;

    for (let x = 0; x < stride; x += 1) {
      const rawByte = line[x];
      const left = x >= bpp ? current[x - bpp] : 0;
      const up = previous ? previous[x] : 0;
      const upLeft = previous && x >= bpp ? previous[x - bpp] : 0;
      let value;
      switch (filter) {
        case 0:
          value = rawByte;
          break;
        case 1:
          value = rawByte + left;
          break;
        case 2:
          value = rawByte + up;
          break;
        case 3:
          value = rawByte + ((left + up) >> 1);
          break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          value = rawByte + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
          break;
        }
        default:
          throw new Error(`unknown PNG filter ${filter}`);
      }
      current[x] = value & 0xff;
    }
  }

  // Normalise whatever colour type we read into straight RGBA.
  const rgba = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const source_ = pixel * bpp;
    const target = pixel * 4;
    switch (header.colorType) {
      case 0:
        rgba[target] = rgba[target + 1] = rgba[target + 2] = out[source_];
        rgba[target + 3] = 255;
        break;
      case 2:
        rgba[target] = out[source_];
        rgba[target + 1] = out[source_ + 1];
        rgba[target + 2] = out[source_ + 2];
        rgba[target + 3] = 255;
        break;
      case 3: {
        const index = out[source_];
        rgba[target] = palette[index * 3];
        rgba[target + 1] = palette[index * 3 + 1];
        rgba[target + 2] = palette[index * 3 + 2];
        rgba[target + 3] = transparency && index < transparency.length ? transparency[index] : 255;
        break;
      }
      case 4:
        rgba[target] = rgba[target + 1] = rgba[target + 2] = out[source_];
        rgba[target + 3] = out[source_ + 1];
        break;
      case 6:
        rgba[target] = out[source_];
        rgba[target + 1] = out[source_ + 1];
        rgba[target + 2] = out[source_ + 2];
        rgba[target + 3] = out[source_ + 3];
        break;
      default:
        throw new Error(`unsupported colour type ${header.colorType}`);
    }
  }

  return { width, height, data: rgba };
}

function chunk(type, body) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length, 0);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed), 0);
  return Buffer.concat([length, typed, crc]);
}

/**
 * Write straight RGBA8 out as a PNG.
 *
 * @param {{ width: number, height: number, data: Buffer }} image
 * @returns {Buffer}
 */
export function encodePng(image) {
  const { width, height, data } = image;
  if (data.length !== width * height * 4) {
    throw new Error(`pixel buffer is ${data.length} bytes, expected ${width * height * 4}`);
  }

  const stride = width * 4;
  const bpp = 4;
  const raw = Buffer.alloc((stride + 1) * height);
  const prior = Buffer.alloc(stride);
  const current = Buffer.alloc(stride);
  const candidate = Buffer.alloc(stride);

  for (let row = 0; row < height; row += 1) {
    data.copy(current, 0, row * stride, row * stride + stride);

    let bestFilter = 0;
    let bestSum = Infinity;
    let bestLine = null;

    for (let filter = 0; filter <= 4; filter += 1) {
      let sum = 0;
      for (let x = 0; x < stride; x += 1) {
        const left = x >= bpp ? current[x - bpp] : 0;
        const up = prior[x];
        const upLeft = x >= bpp ? prior[x - bpp] : 0;
        let value;
        switch (filter) {
          case 0:
            value = current[x];
            break;
          case 1:
            value = current[x] - left;
            break;
          case 2:
            value = current[x] - up;
            break;
          case 3:
            value = current[x] - ((left + up) >> 1);
            break;
          default: {
            const p = left + up - upLeft;
            const pa = Math.abs(p - left);
            const pb = Math.abs(p - up);
            const pc = Math.abs(p - upLeft);
            value = current[x] - (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
            break;
          }
        }
        value &= 0xff;
        candidate[x] = value;
        sum += value < 128 ? value : 256 - value;
      }
      if (sum < bestSum) {
        bestSum = sum;
        bestFilter = filter;
        bestLine = Buffer.from(candidate);
      }
    }

    raw[row * (stride + 1)] = bestFilter;
    bestLine.copy(raw, row * (stride + 1) + 1);
    current.copy(prior);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Shrink an image by an integer factor, with a box filter.
 *
 * A baseline stored at half size is still a baseline: the harness captures the
 * app at the design size and shrinks it the same way before comparing, so the
 * comparison is like for like.
 *
 * @param {{ width: number, height: number, data: Buffer }} image
 * @param {number} factor
 * @returns {{ width: number, height: number, data: Buffer }}
 */
export function downscale(image, factor) {
  if (factor === 1) return image;
  if (!Number.isInteger(factor) || factor < 1) {
    throw new Error(`the downscale factor must be a whole number, got ${factor}`);
  }
  const width = Math.floor(image.width / factor);
  const height = Math.floor(image.height / factor);
  const out = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let dy = 0; dy < factor; dy += 1) {
        for (let dx = 0; dx < factor; dx += 1) {
          const index = ((y * factor + dy) * image.width + (x * factor + dx)) * 4;
          r += image.data[index];
          g += image.data[index + 1];
          b += image.data[index + 2];
          a += image.data[index + 3];
        }
      }
      const count = factor * factor;
      const target = (y * width + x) * 4;
      out[target] = Math.round(r / count);
      out[target + 1] = Math.round(g / count);
      out[target + 2] = Math.round(b / count);
      out[target + 3] = Math.round(a / count);
    }
  }

  return { width, height, data: out };
}
