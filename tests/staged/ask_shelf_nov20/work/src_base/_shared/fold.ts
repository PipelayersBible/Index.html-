const CONFUSABLE = {
    "\u0410": "A",
    "\u0412": "B",
    "\u0415": "E",
    "\u041a": "K",
    "\u041c": "M",
    "\u041d": "H",
    "\u041e": "O",
    "\u0420": "P",
    "\u0421": "C",
    "\u0422": "T",
    "\u0425": "X",
    "\u0406": "I",
    "\u0408": "J",
    "\u0405": "S",
    "\u04ae": "Y",
    "\u0430": "a",
    "\u0435": "e",
    "\u043e": "o",
    "\u0440": "p",
    "\u0441": "c",
    "\u0443": "y",
    "\u0445": "x",
    "\u0456": "i",
    "\u0458": "j",
    "\u0455": "s",
    "\u04cf": "l",
    "\u0391": "A",
    "\u0392": "B",
    "\u0395": "E",
    "\u0396": "Z",
    "\u0397": "H",
    "\u0399": "I",
    "\u039a": "K",
    "\u039c": "M",
    "\u039d": "N",
    "\u039f": "O",
    "\u03a1": "P",
    "\u03a4": "T",
    "\u03a5": "Y",
    "\u03a7": "X",
    "\u03bf": "o",
    "\u03b9": "i",
    "\u03bd": "v",
    "\u0131": "i",
  },
  CONF_RX = new RegExp("[" + Object.keys(CONFUSABLE).join("") + "]", "g");
function decodeEntities(s) {
  return s.replace(/&(lt|gt|amp|quot|apos|#x?[0-9a-f]+);?/gi, (m, e) => {
    const k = e.toLowerCase();
    if (k === "lt") return "<";
    if (k === "gt") return ">";
    if (k === "amp") return "&";
    if (k === "quot") return '"';
    if (k === "apos") return "'";
    const n = k.startsWith("#x") ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
    return Number.isFinite(n) && n > 0 && n < 1114112 ? String.fromCodePoint(n) : " ";
  });
}
function foldText(s) {
  let t = String(s ?? "");
  for (let i = 0; i < 2; i++) t = decodeEntities(t);
  return t.normalize("NFKD").replace(/\p{M}+/gu, "").normalize("NFKC").replace(
    /[\u3010\u3016\u300c\u300e\u3014\u3008\u300a\uff62]/g,
    "[",
  ).replace(/[\u3011\u3017\u300d\u300f\u3015\u3009\u300b\uff63]/g, "]").replace(
    /[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff\uffa0]/g,
    "",
  ).replace(/\p{Cf}/gu, "").replace(
    CONF_RX,
    (c) => CONFUSABLE[c] || c,
  );
}
export { decodeEntities, foldText };
