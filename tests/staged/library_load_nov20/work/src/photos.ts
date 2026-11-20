const PHOTOS_MAX = 6,
  TILES_MAX = 12,
  ZOOMS = { tl: "top-left", tr: "top-right", bl: "bottom-left", br: "bottom-right", rot: "upside-down" },
  PHOTO_MAX_B64 = 15e5,
  PHOTOS_MAX_B64 = 12e6,
  PHOTO_TOKENS = 1600,
  B64 = /^[A-Za-z0-9+/]+={0,2}$/;
function head(data) {
  const s = atob(data.slice(0, 24));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}
function sniff(b) {
  return b[0] === 255 && b[1] === 216 && b[2] === 255
    ? "image/jpeg"
    : b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71 && b[4] === 13 && b[5] === 10 &&
        b[6] === 26 && b[7] === 10
    ? "image/png"
    : b[0] === 82 && b[1] === 73 && b[2] === 70 && b[3] === 70 && b[8] === 87 && b[9] === 69 &&
        b[10] === 66 && b[11] === 80
    ? "image/webp"
    : null;
}
const BAD = (message) => ({ ok: !1, error: { error: "bad_image", message } });
function readPhotos(raw) {
  if (raw == null) return { ok: !0, photos: [] };
  if (!Array.isArray(raw)) {
    return BAD("Photos came in a form the app doesn’t send. Update the app and try again.");
  }
  const isTile = (p) => p && typeof p == "object" && p.zoom !== void 0;
  if (raw.filter((p) => !isTile(p)).length > 6 || raw.filter(isTile).length > 12) {
    return BAD("Send at most 6 photos in a chat.");
  }
  const photos = [];
  let total = 0;
  for (const p of raw) {
    const mt = String(p?.media_type ?? p?.mediaType ?? ""),
      data = String(p?.data ?? "").replace(/^data:image\/[a-z]+;base64,/, ""),
      turn = Math.max(0, Math.min(20, Math.trunc(Number(p?.turn) || 0)));
    if (!/^image\/(jpeg|png|webp)$/.test(mt)) return BAD("Use a JPG, PNG or WebP photo.");
    if (data.length < 64 || data.length % 4 !== 0 || !B64.test(data)) {
      return BAD("That photo couldn’t be read. Take it again.");
    }
    if (data.length > PHOTO_MAX_B64) {
      return BAD("That photo is too large. Take it again or pick a smaller one.");
    }
    let kind = null;
    try {
      kind = sniff(head(data));
    } catch {
      kind = null;
    }
    if (!kind || kind !== mt) return BAD("Use a JPG, PNG or WebP photo.");
    if (total += data.length, total > PHOTOS_MAX_B64) {
      return BAD("Those photos are too large together. Send fewer or smaller ones.");
    }
    if (isTile(p)) {
      const zoom = String(p.zoom), of = Math.trunc(Number(p.of));
      if (
        !ZOOMS[zoom] || turn !== 0 || !(of >= 0 && of < photos.length) || photos[of].zoom ||
        photos[of].turn !== 0
      ) return BAD("Photos came in a form the app doesn’t send. Update the app and try again.");
      photos.push({ media_type: kind, data, turn: 0, zoom, of, detail: p.detail === !0 });
    } else photos.push({ media_type: kind, data, turn });
  }
  return { ok: !0, photos };
}
function photoBlocks(photos) {
  const out = [], num = new Map();
  let n = 0;
  return photos.forEach((p, i) => {
    p.zoom || num.set(i, ++n);
  }),
    photos.forEach((p, i) => {
      p.zoom ||
        (out.push({
          type: "text",
          text: `PHOTO ${num.get(i)} (${
            p.turn === 0 ? "sent with this question" : "sent earlier in this conversation"
          }):`,
        }),
          out.push({
            type: "image",
            source: { type: "base64", media_type: p.media_type, data: p.data },
          }),
          photos.forEach((t) => {
            !t.zoom || t.of !== i ||
              (out.push({
                type: "text",
                text: t.zoom === "rot" ? `PHOTO ${num.get(i)} turned upside down (writing painted on the ground or on a stake often faces the other way: read it here too and use whichever way reads right):` : `PHOTO ${num.get(i)}, zoomed in: its ${
                  ZOOMS[t.zoom]
                } part (the quarters overlap a little; ${t.detail ? "same photo at full detail: read small handwriting and digits here" : "same sheet, read small text here"}):`,
              }),
                out.push({
                  type: "image",
                  source: { type: "base64", media_type: t.media_type, data: t.data },
                }));
          }));
    }),
    out;
}
const PLAN_RX =
  /\b(plans?|plan sheets?|drawings?|blue ?prints?|dimensions?|foundation|footings?|slab|takeoff|take-off|yardage|cubic yards?|yd3|callouts?|inverts?|IE|stations?|STA|floor plan|site plan|grading plan|cut ?sheet)\b/i;
function isPlanQuestion(photos, texts) {
  return photos.length
    ? photos.some((p) => p.zoom && !p.detail) ? !0 : PLAN_RX.test(String(texts[0] || ""))
    : !1;
}
export {
  isPlanQuestion,
  PHOTO_MAX_B64,
  PHOTO_TOKENS,
  photoBlocks,
  PHOTOS_MAX,
  PHOTOS_MAX_B64,
  PLAN_RX,
  readPhotos,
  TILES_MAX,
  ZOOMS,
};
