export const naturalCompare = (left: string, right: string): number =>
  left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });

export function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stableValue(child)]));
  }
  return value;
}

export const stableJson = (value: unknown): string => `${JSON.stringify(stableValue(value), null, 2)}\n`;

export function csvCell(value: string | number): string {
  const text = typeof value === 'number' ? formatNumber(value) : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const csvRow = (values: readonly (string | number)[]): string => values.map(csvCell).join(',');
export const formatNumber = (value: number, places = 3): string => Number(value.toFixed(places)).toString();
export const round = (value: number, places = 6): number => Number(value.toFixed(places));

// Small synchronous SHA-256 implementation keeps browser and Node artifact bytes identical.
export function sha256(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const data = new Uint8Array(paddedLength);
  data.set(bytes);
  data[bytes.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  const h = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  const k = new Uint32Array(64);
  for (let i = 0; i < 64; i += 1) {
    let primes = 0;
    for (let n = 2; primes <= i; n += 1) {
      let prime = true;
      for (let d = 2; d * d <= n; d += 1) if (n % d === 0) { prime = false; break; }
      if (prime && primes++ === i) k[i] = Math.floor((Math.cbrt(n) % 1) * 0x100000000);
    }
  }
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let offset = 0; offset < data.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i-15],7) ^ rotr(w[i-15],18) ^ (w[i-15] >>> 3);
      const s1 = rotr(w[i-2],17) ^ rotr(w[i-2],19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,hh] = h;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
      const t1 = (hh + s1 + ((e & f) ^ (~e & g)) + k[i] + w[i]) >>> 0;
      const s0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
      const t2 = (s0 + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
    }
    [a,b,c,d,e,f,g,hh].forEach((value, i) => { h[i] = (h[i] + value) >>> 0; });
  }
  return [...h].map((value) => value.toString(16).padStart(8, '0')).join('');
}
