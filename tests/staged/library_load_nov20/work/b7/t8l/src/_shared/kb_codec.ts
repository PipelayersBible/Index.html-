const KB_FMT = 1, KB_MAX_JSON = 50331648;
async function pipe(bytes, stream, max = 1 / 0) {
  const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader(), parts = [];
  let n = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (n += value.length, n > max) {
      try {
        await reader.cancel();
      } catch {}
      throw new Error("kb blob: too large");
    }
    parts.push(value);
  }
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) out.set(p, o), o += p.length;
  return out;
}
function toB64(u) {
  let s = "";
  for (let i = 0; i < u.length; i += 32768) {
    s += String.fromCharCode.apply(null, Array.from(u.subarray(i, i + 32768)));
  }
  return btoa(s);
}
function fromB64(b) {
  const s = atob(b), u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}
async function sha256Hex(u) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", u));
  return Array.from(h, (x) => x.toString(16).padStart(2, "0")).join("");
}
async function encodeIndex(ix) {
  const json = new TextEncoder().encode(JSON.stringify(ix)),
    gz = await pipe(json, new globalThis.CompressionStream("gzip"));
  return { fmt: 1, n: ix.N, sha: await sha256Hex(json), data: toB64(gz) };
}
async function decodeIndex(b, wantN) {
  if (!b || b.fmt !== 1 || typeof b.data != "string" || typeof b.sha != "string") {
    throw new Error("kb blob: bad header");
  }
  const json = await pipe(fromB64(b.data), new globalThis.DecompressionStream("gzip"), 50331648);
  if (await sha256Hex(json) !== b.sha) throw new Error("kb blob: checksum");
  const ix = JSON.parse(new TextDecoder().decode(json));
  if (
    !ix || ix.v !== 1 || ix.N !== wantN || !Array.isArray(ix.docs) || ix.docs.length !== wantN ||
    !ix.t
  ) throw new Error("kb blob: count");
  return ix;
}
export { decodeIndex, encodeIndex, KB_FMT, KB_MAX_JSON };
