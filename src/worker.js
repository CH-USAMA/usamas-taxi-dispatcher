const LLM = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const STT = "@cf/openai/whisper-large-v3-turbo";
const TTS = "@cf/myshell-ai/melotts";
const FIELDS = ["customer_name", "phone", "pickup", "dropoff", "pickup_time", "passengers", "notes"];
const REQ = FIELDS.slice(0, 6);
const AR = /[\u0600-\u06FF]/, AR_G = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]+/g, DEV = /[\u0900-\u097F]/;

/* ---------- deterministic language detection ---------- */
const RU_STRONG = new Set("hai hain haan han hanji ji jee mujhe mujhay mera meri mere naam kahan kahaan chahiye chahie chahye kal aaj baje bajay shaam subah raat jana jaana hoon hun nahi nahin theek thik bilkul kya aap aapka aapki apka apki gari gaari gaadi sawari sawariyan log kitne kab yahan wahan acha accha achha shukriya assalam asalam salam alaikum alaikum walaikum sahab sahib karein kijiye kardo chahta chahti hoga hogi abhi jaldi bhai behan rahe raha rahi tak dein".split(" "));
const RU_WEAK = new Set("se ke ki ka ko main mein me hum ham tum ho".split(" "));
const EN_WORDS = new Set("i i'm my me the to from is am are want need would like pick pickup drop dropoff at yes no going go take we our tomorrow today tonight it's that's that correct please and for with what where when how many passengers passenger people hello hi thanks thank you book booking taxi cab airport morning evening name number phone".split(" "));
function detectLang(t) {
  t = String(t || "");
  if (AR.test(t) || DEV.test(t)) return "ur";
  const w = t.toLowerCase().match(/[a-z']+/g) || [];
  let ru = 0, en = 0;
  for (const x of w) { if (RU_STRONG.has(x)) ru += 2; else if (RU_WEAK.has(x)) ru += 1; if (EN_WORDS.has(x)) en += 1; }
  if (ru >= 2 && ru >= en) return "roman";
  if (en >= 2 && en > ru) return "en";
  if (ru >= 2) return "roman";
  return null; // neutral (names, numbers, addresses, single words)
}
function explicitLang(t) {
  t = String(t || "").toLowerCase();
  if (/\b(in|speak|talk|reply)\s+(in\s+)?english\b|english\s+(mein|me|main)\b|انگلش|انگریزی/.test(t)) return "en";
  if (/\b(in|speak|talk|reply)\s+(in\s+)?urdu\b|urdu\s+(mein|me|main)\b|اردو\s+میں/.test(t)) return AR.test(t) ? "ur" : "roman";
  return null;
}
const fam = (l) => (l === "en" ? "en" : "urdu");
function resolveLang({ pref, session, pending, detected, explicit }) {
  if (pref && pref !== "auto") return { lang: pref, session: pref, pending: null, why: "pinned" };
  if (explicit) return { lang: explicit, session: explicit, pending: null, why: "explicit" };
  if (!session) return { lang: detected || "en", session: detected || null, pending: null, why: detected ? "first" : "default" };
  if (!detected || fam(detected) === fam(session)) return { lang: session, session, pending: null, why: "sticky" };
  if (pending === detected) return { lang: detected, session: detected, pending: null, why: "switched-after-2" };
  return { lang: session, session, pending: detected, why: "pending-switch" };
}

/* ---------- templates ---------- */
const L = {
  en: { customer_name: "your name", phone: "your phone number", pickup: "your pickup location", dropoff: "where you are going", pickup_time: "the pickup time", passengers: "how many passengers" },
  roman: { customer_name: "apna naam", phone: "apna phone number", pickup: "pickup ki jagah", dropoff: "kahan jana hai", pickup_time: "kis waqt gaari chahiye", passengers: "kitne log hain" },
  ur: { customer_name: "اپنا نام", phone: "اپنا فون نمبر", pickup: "پک اپ کی جگہ", dropoff: "کہاں جانا ہے", pickup_time: "کس وقت گاڑی چاہیے", passengers: "کتنے لوگ ہیں" },
};
function askNext(lang, m) {
  const k = REQ.find((x) => !m[x]);
  if (!k) return readback(lang, m);
  return { en: { reply: `Could you please tell me ${L.en[k]}?` }, roman: { reply: `Zara ${L.roman[k]} bata dein?` }, ur: { reply: `ذرا ${L.ur[k]} بتا دیں؟`, roman: `Zara ${L.roman[k]} bata dein?` } }[lang];
}
function readback(lang, m) {
  const en = `Let me confirm: ${m.customer_name}, ${m.phone}, from ${m.pickup} to ${m.dropoff}, ${m.pickup_time}, ${m.passengers} passenger${m.passengers == 1 ? "" : "s"}${m.notes ? ", " + m.notes : ""}. Is that correct?`;
  const ro = `Confirm kar dein: ${m.customer_name}, ${m.phone}, ${m.pickup} se ${m.dropoff}, ${m.pickup_time}, ${m.passengers} sawari${m.notes ? ", " + m.notes : ""}. Kya yeh sahi hai?`;
  const ur = `تصدیق کر دیں: ${m.customer_name}، ${m.phone}، ${m.pickup} سے ${m.dropoff}، ${m.pickup_time}، ${m.passengers} سواری۔ کیا یہ درست ہے؟`;
  return { en: { reply: en }, roman: { reply: ro }, ur: { reply: ur, roman: ro } }[lang];
}
function confirmedMsg(lang, id, m) {
  const en = `Your taxi is booked! Your booking reference is ${id}. ${m.pickup} to ${m.dropoff}, ${m.pickup_time}. Thank you for choosing Usamas Taxi Company.`;
  const ro = `Aap ki taxi book ho gayi hai! Aap ka booking number ${id} hai. ${m.pickup} se ${m.dropoff}, ${m.pickup_time}. Usamas Taxi Company ka shukriya.`;
  const ur = `آپ کی ٹیکسی بک ہو گئی ہے! آپ کا بکنگ نمبر ${id} ہے۔ ${m.pickup} سے ${m.dropoff}، ${m.pickup_time}۔ یوسماز ٹیکسی کمپنی کا شکریہ۔`;
  return { en: { reply: en }, roman: { reply: ro }, ur: { reply: ur, roman: ro } }[lang];
}
const REPEAT = { en: { reply: "Sorry, I didn't catch that. Could you please say it again?" }, roman: { reply: "Maaf kijiye, awaaz saaf nahi aayi. Dobara bata dein?" }, ur: { reply: "معاف کیجیے، آواز صاف نہیں آئی۔ دوبارہ بتا دیں؟", roman: "Maaf kijiye, awaaz saaf nahi aayi. Dobara bata dein?" } };

const YES = /^\s*(?:(?:yes|yeah|yep|yup|correct|right|confirm(?:ed)?|sure|ok(?:ay)?|perfect|exactly|haan|han|haanji|hanji|ji|jee|theek|thik|bilkul|sahi|durust|درست|ہاں|ہاں جی|جی|جی ہاں|ٹھیک|بالکل|صحیح|हाँ|हां|जी|ठीक|बिल्कुल|सही)\b|(?:ہاں|جی|ٹھیک|بالکل|درست|صحیح|हाँ|हां|जी|ठीक))/i;
const NO = /\b(no|nope|not|wrong|change|wait|nahi|nahin|galat|badal|badlo)\b|نہیں|غلط|بدل|नहीं|गलत/i;

/* ---------- STT guard ---------- */
const HALLU = /^(thank you|thanks for watching|thank you for watching|thank you very much|please subscribe|subtitles by.*|you|bye|\.+|♪+|شکریہ ادا|سبسکرائب.*)[.!?\s]*$/i;
function sttBad(t) {
  const s = String(t || "").trim();
  if (!s) return "empty";
  const letters = (s.match(/[\p{L}\p{N}]/gu) || []).length;
  if (letters === 0 || (letters === 1 && !/\d/.test(s))) return "no-letters";
  if (HALLU.test(s)) return "hallucination";
  const words = s.toLowerCase().split(/\s+/);
  if (words.length >= 6 && new Set(words).size / words.length < 0.3) return "repetition";
  return null;
}

/* ---------- helpers ---------- */
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clean = (v) => { v = String(v ?? "").trim(); return /^(none|null|unknown|n\/a|-|undefined)$/i.test(v) ? "" : v; };
function b64(buf) { const bytes = new Uint8Array(buf); let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); }
const LANG_RULE = { en: "Reply ONLY in English.", roman: "Reply ONLY in Roman Urdu (Urdu written in English letters, e.g. 'Aap kahan jana chahte hain?'). Never use Urdu script or Hindi script.", ur: "Reply ONLY in Urdu script (اردو). Also put the same reply in Roman Urdu in \"roman\"." };
const SYSTEM = `You are the phone dispatcher for Usamas Taxi Company in Lahore, Pakistan. Max 2 short spoken sentences. Collect: name, phone (PK format), pickup, dropoff (Lahore), pickup_time (absolute date+time PKT), passengers, notes (optional). Ask only for missing items. Fill every field known so far, field values in English/Latin letters. When all are known, read them back and ask to confirm; confirmed=true only if the caller then says yes. Now: {{NOW}} PKT.`;
const SCHEMA = (lang) => ({
  type: "object",
  properties: { reply: { type: "string" }, ...(lang === "ur" ? { roman: { type: "string" } } : {}), ...Object.fromEntries(FIELDS.map((f) => [f, { type: "string", description: "English/Latin letters only" + (f === "pickup_time" ? ", absolute like Oct 16, 2026, 7:00 PM" : f === "phone" ? ", digits only" : "") }])), confirmed: { type: "boolean" } },
  required: ["reply", ...(lang === "ur" ? ["roman"] : []), ...FIELDS, "confirmed"],
});
function langOk(reply, lang) {
  if (!reply || reply.trim().split(/\s+/).length < 3 || reply.trim().startsWith("{") || /confirmed\s*=|\w+=\w+|[a-z]_[a-z]|[\u00C0-\u024F\u1E00-\u1EFF]/.test(reply)) return false;
  const ar = AR.test(reply), dev = DEV.test(reply);
  if (lang === "ur") return ar && !dev;
  if (ar || dev) return false;
  const d = detectLang(reply);
  return lang === "en" ? d !== "roman" : d !== "en";
}
async function llm(env, history, fields, lang, strict) {
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" });
  const sys = SYSTEM.replace("{{NOW}}", now) + " Known: " + JSON.stringify(fields || {}) + " " + LANG_RULE[lang] + (strict ? " IMPORTANT: your last answer used the wrong language. " + LANG_RULE[lang] : "");
  const r = await env.AI.run(LLM, { messages: [{ role: "system", content: sys }, ...history.slice(-6)], response_format: { type: "json_schema", json_schema: SCHEMA(lang) }, max_tokens: lang === "ur" ? 320 : 160 });
  let o = r.response;
  if (typeof o === "string") { try { o = JSON.parse(o.slice(o.indexOf("{"), o.lastIndexOf("}") + 1)); } catch { o = { reply: o }; } }
  return o || {};
}
const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, ek: 1, aik: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, "ایک": 1, "دو": 2, "تین": 3, "چار": 4, "پانچ": 5, "چھ": 6, "सात": 7 };
function paxNum(v) {
  v = String(v ?? "").replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  const n = parseInt(v); if (n > 0 && n < 50) return String(n);
  for (const w of v.toLowerCase().split(/[\s,،]+/)) if (NUMW[w]) return String(NUMW[w]);
  return "";
}
function paxFromText(t) {
  const m = String(t || "").replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).match(/(\d+|one|two|three|four|five|six|ek|aik|do|teen|chaar|char|paanch|ایک|دو|تین|چار|پانچ)\s*(passengers?|people|persons?|pax|log|logg|afraad|sawari|sawariyan|musafir|لوگ|افراد|سواری|سواریاں|مسافر)/i);
  return m ? paxNum(m[1]) : "";
}
function mergeFields(merged, src) {
  for (const k of FIELDS) { let v = clean(src?.[k]); if (k === "passengers") v = paxNum(v); if (v) merged[k] = v; }
  return merged;
}
const isReady = (m) => REQ.every((k) => m[k]);
async function transcribe(env, buf, hint) {
  const base = { audio: b64(buf), task: "transcribe", vad_filter: true, condition_on_previous_text: false };
  if (hint) base.language = hint;
  if (hint === "en") base.initial_prompt = "Taxi booking call in " + PLACES + " Phone numbers like 0300 1234567.";
  try { const r = await env.AI.run(STT, base); return { text: (r.text || "").trim(), info: r.transcription_info || null }; }
  catch (e) { const r = await env.AI.run(STT, { audio: base.audio, ...(hint ? { language: hint } : {}) }); return { text: (r.text || "").trim(), info: null, note: "retry-basic" }; }
}
/* ---------- speech normalizer: numbers spoken deterministically ---------- */
const DW = { en: "zero one two three four five six seven eight nine".split(" "), roman: "sifar ek do teen chaar paanch chhe saat aath nau".split(" ") };
const EN_N = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ");
const EN_T = ["", "", "twenty", "thirty", "forty", "fifty"];
const enNum = (n) => (n < 20 ? EN_N[n] : EN_T[Math.floor(n / 10)] + (n % 10 ? " " + EN_N[n % 10] : ""));
const RO_N = "sifar ek do teen chaar paanch chhe saat aath nau das gyarah barah terah chaudah pandrah solah satrah atharah unnees bees".split(" ");
const RO_H = ["barah", ...RO_N.slice(1, 13)];
const toAscii = (t) => String(t).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
const digitsOf = (s, l) => s.replace(/\D/g, "").split("").map((d) => DW[l][d]).join(" ");
function sayDigitsGrouped(m, l) {
  let out = [], plus = /^\s*\+/.test(m);
  let groups = m.replace(/^\s*\+/, "").split(/[\s-]+/).filter(Boolean);
  if (groups.length === 1) { const d = groups[0]; groups = d.length === 11 && d.startsWith("03") ? [d.slice(0, 4), d.slice(4, 7), d.slice(7)] : d.length === 12 && d.startsWith("92") ? [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8), d.slice(8)] : d.match(/.{1,3}/g); }
  for (const g of groups) { if (g.length > 4) { out.push(digitsOf(g.slice(0, 3), l)); out.push(digitsOf(g.slice(3), l)); } else out.push(digitsOf(g, l)); }
  return (plus ? (l === "en" ? "plus " : "plus ") : "") + out.join(", ");
}
function sayTime(h, mm, ap, l) {
  h = parseInt(h); mm = parseInt(mm || "0"); ap = (ap || "").toLowerCase().replace(/\./g, "");
  if (l === "en") return `${enNum(h % 12 || 12)}${mm === 0 ? (ap ? "" : " o'clock") : mm < 10 ? " oh " + EN_N[mm] : " " + enNum(mm)}${ap ? (ap.startsWith("a") ? " a.m." : " p.m.") : ""}`;
  const H24 = ap.startsWith("p") && h < 12 ? h + 12 : ap.startsWith("a") && h === 12 ? 0 : h;
  const per = !ap && h <= 12 ? "" : H24 < 4 ? "raat" : H24 < 12 ? "subah" : H24 < 16 ? "dopahar" : H24 < 19 ? "shaam" : "raat";
  const hw = RO_H[h % 12], nx = RO_H[(h + 1) % 12];
  let t = mm === 0 ? `${hw} baje` : mm === 30 ? (h % 12 === 1 ? "derh baje" : h % 12 === 2 ? "dhaai baje" : `saadhe ${hw} baje`) : mm === 15 ? `sawa ${hw} baje` : mm === 45 ? `paune ${nx} baje` : `${hw} baj kar ${mm <= 20 ? RO_N[mm] : enNum(mm)} minute`;
  return (per ? per + " " : "") + t;
}
function speechNorm(text, lang) {
  const l = lang === "en" ? "en" : "roman";
  let t = toAscii(text).replace(/\bPKT\b/g, "").replace(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2})(?:st|nd|rd|th)?,?\s+\d{4}\b/gi, "$1");
  t = t.replace(/\b(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)?(?![\w])/gi, (_, h, m, ap) => sayTime(h, m, ap, l));
  t = t.replace(/\b(\d{1,2})\s*([ap]\.?m\.?)(?![\w])/gi, (_, h, ap) => sayTime(h, 0, ap, l));
  t = t.replace(/\+?\d[\d\s-]{3,}\d/g, (m) => (m.replace(/\D/g, "").length >= 5 ? " " + sayDigitsGrouped(m.trim(), l) + " " : m));
  t = t.replace(/((?:booking|reference|ref|number|no\.?|#)\s*(?:is\s*)?)(\d+)/gi, (_, a, n) => a.replace("#", "number ") + digitsOf(n, l));
  t = t.replace(/\b\d+\b/g, (n) => (l === "en" ? (n.length <= 2 ? enNum(parseInt(n)) : digitsOf(n, l)) : parseInt(n) <= 20 && n.length <= 2 ? RO_N[parseInt(n)] : digitsOf(n, l)));
  t = t.replace(/\b(subah|shaam|raat|dopahar)\s+(?:ko\s+)?\1\b/gi, "$1");
  return t.replace(/\s+([,.?!])/g, "$1").replace(/\s+/g, " ").trim();
}
function normPhone(v) {
  let x = toAscii(v).replace(/\D/g, "");
  if (!x) return "";
  if (x.startsWith("0092")) x = "0" + x.slice(4); else if (x.startsWith("92") && x.length === 12) x = "0" + x.slice(2); else if (x.startsWith("3") && x.length === 10) x = "0" + x;
  if (/^03\d{9}$/.test(x)) return x.slice(0, 4) + "-" + x.slice(4);
  if (/^0[1-24-9]\d{8,9}$/.test(x)) return x; // landline e.g. 042xxxxxxxx
  return null;
}
const PHONE_AGAIN = {
  en: { reply: "Sorry, that phone number seems incomplete. Could you say it again, digit by digit? It should be eleven digits, like 0300 1234567." },
  roman: { reply: "Maaf kijiye, phone number poora nahi aaya. Dobara ek ek digit kar ke bata dein? Gyarah digits, jaise 0300 1234567." },
  ur: { reply: "معاف کیجیے، فون نمبر مکمل نہیں آیا۔ دوبارہ ایک ایک ہندسہ کر کے بتا دیں؟ گیارہ ہندسے، جیسے 0300 1234567۔", roman: "Maaf kijiye, phone number poora nahi aaya. Dobara ek ek digit kar ke bata dein? Gyarah digits, jaise 0300 1234567." },
};
const PLACES = "Lahore, Wapda Town, Samanabad, Link Road, Green Town, Gulberg, DHA, Johar Town, Model Town, Iqbal Town, Township, Faisal Town, Bahria Town, Liberty Market, Allama Iqbal Airport, Data Darbar, Anarkali, Mall Road, Thokar Niaz Baig, Valencia, Garden Town, Shadman, Cantt.";

/* ---------- Azure Urdu neural TTS ---------- */
const UR_D = "صفر ایک دو تین چار پانچ چھ سات آٹھ نو".split(" ");
const UR_H = ["بارہ", "ایک", "دو", "تین", "چار", "پانچ", "چھ", "سات", "آٹھ", "نو", "دس", "گیارہ", "بارہ"];
const UR_M = { jan: "جنوری", feb: "فروری", mar: "مارچ", apr: "اپریل", may: "مئی", jun: "جون", jul: "جولائی", aug: "اگست", sep: "ستمبر", oct: "اکتوبر", nov: "نومبر", dec: "دسمبر" };
const urDigits = (s) => s.replace(/\D/g, "").split("").map((d) => UR_D[d]).join(" ");
function urTime(h, mm, ap) {
  h = parseInt(h); mm = parseInt(mm || "0"); ap = (ap || "").toLowerCase().replace(/\./g, "");
  const H24 = ap.startsWith("p") && h < 12 ? h + 12 : ap.startsWith("a") && h === 12 ? 0 : h;
  const per = !ap && h <= 12 ? "" : H24 < 4 ? "رات" : H24 < 12 ? "صبح" : H24 < 16 ? "دوپہر" : H24 < 19 ? "شام" : "رات";
  const hw = UR_H[h % 12], nx = UR_H[(h + 1) % 12];
  const t = mm === 0 ? `${hw} بجے` : mm === 30 ? (h % 12 === 1 ? "ڈیڑھ بجے" : h % 12 === 2 ? "ڈھائی بجے" : `ساڑھے ${hw} بجے`) : mm === 15 ? `سوا ${hw} بجے` : mm === 45 ? `پونے ${nx} بجے` : `${hw} بج کر ${mm} منٹ`;
  return (per ? per + " " : "") + t;
}
function urNorm(text) {
  let t = toAscii(text).replace(/\bPKT\b/g, "");
  t = t.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?(?:\s+\d{4})?\b/gi, (_, m, d) => `${d} ${UR_M[m.toLowerCase().slice(0, 3)]}`);
  t = t.replace(/\b(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)?(?![\w])/gi, (_, h, m, ap) => urTime(h, m, ap));
  t = t.replace(/\b(\d{1,2})\s*([ap]\.?m\.?)(?![\w])/gi, (_, h, ap) => urTime(h, 0, ap));
  t = t.replace(/\+?\d[\d\s-]{3,}\d/g, (m) => (m.replace(/\D/g, "").length >= 5 ? " " + m.trim().split(/[\s-]+/).flatMap((g) => (g.replace(/\D/g, "").length > 4 ? [g.replace(/\D/g, "").slice(0, 3), g.replace(/\D/g, "").slice(3)] : [g])).map(urDigits).join("، ") + " " : m));
  t = t.replace(/((?:بکنگ\s*نمبر|نمبر|booking\s*number|reference)\s*)(\d+)/gi, (_, a, n) => a + urDigits(n));
  t = t.replace(/\b(صبح|شام|رات|دوپہر)\s+\1\b/g, "$1").replace(/(صبح|شام|رات|دوپہر)\s+(?:کو\s+)?(صبح|شام|رات|دوپہر)/g, "$2");
  return t.replace(/\s+/g, " ").trim();
}
let azTok = null, azTokAt = 0;
const AZ_VOICE = "ur-PK-UzmaNeural";
const ttsCache = new Map();
async function azureUrdu(env, text) {
  if (!env.AZURE_SPEECH_KEY || !env.AZURE_TTS_HOST) return { audio: null, path: "azure-not-configured" };
  const key = "az:" + text; if (ttsCache.has(key)) return { audio: ttsCache.get(key), path: "azure-ur(cache)" };
  try {
    if (!azTok || Date.now() - azTokAt > 8 * 60 * 1000) {
      const r = await fetch(`https://${env.AZURE_TTS_HOST}/sts/v1.0/issueToken`, { method: "POST", headers: { "Ocp-Apim-Subscription-Key": env.AZURE_SPEECH_KEY, "Content-Length": "0" } });
      if (r.status !== 200) return { audio: null, path: "azure-token-" + r.status };
      azTok = await r.text(); azTokAt = Date.now();
    }
    const x = text.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c])).slice(0, 700);
    const r = await fetch(`https://${env.AZURE_TTS_HOST}/tts/cognitiveservices/v1`, { method: "POST", headers: { Authorization: "Bearer " + azTok, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3", "User-Agent": "taxi-dispatcher" }, body: `<speak version="1.0" xml:lang="ur-PK"><voice name="${AZ_VOICE}">${x}</voice></speak>` });
    if (r.status === 401) azTok = null;
    if (r.status !== 200) return { audio: null, path: "azure-" + r.status };
    const audio = "data:audio/mpeg;base64," + b64(await r.arrayBuffer());
    if (audio.length < 2000) return { audio: null, path: "azure-empty" };
    if (text.length <= 160) { if (ttsCache.size > 50) ttsCache.delete(ttsCache.keys().next().value); ttsCache.set(key, audio); }
    return { audio, path: "azure-ur(" + AZ_VOICE.replace("ur-PK-", "").replace("Neural", "") + ")" };
  } catch (e) { return { audio: null, path: "azure-error" }; }
}
async function speakTurn(env, lang, out, romanText) {
  if (lang === "ur") {
    const a = await azureUrdu(env, urNorm(out.reply));
    if (a.audio) return a;
    const m = await speak(env, romanText);
    return { audio: m.audio, path: m.path + " (fallback: " + a.path + ")" };
  }
  return speak(env, romanText);
}

function ttsText(lang, out) { const t = ttsTextRaw(lang, out); return t ? speechNorm(t, lang) : t; }
function ttsTextRaw(lang, out) {
  if (lang !== "ur") return out.reply;
  let r = out.roman && !AR.test(out.roman) ? out.roman : String(out.roman || out.reply || "").replace(AR_G, " ");
  r = r.replace(/\s+/g, " ").trim();
  return r.length > 2 ? r : null;
}
async function speak(env, text) {
  if (!text) return { audio: null, path: "no-text" };
  const t = text.slice(0, 600);
  if (ttsCache.has("m:" + t)) return { audio: ttsCache.get("m:" + t), path: "melotts(cache)" };
  for (let i = 0; i < 2; i++) {
    try { const r = await env.AI.run(TTS, { prompt: t, lang: "en" }); if (r && r.audio && r.audio.length > 1000) { const a = `data:audio/mpeg;base64,${r.audio}`; if (t.length <= 160) { if (ttsCache.size > 50) ttsCache.delete(ttsCache.keys().next().value); ttsCache.set("m:" + t, a); } return { audio: a, path: i ? "melotts-retry" : "melotts" }; } }
    catch (e) {}
  }
  return { audio: null, path: "tts-failed" };
}
async function saveBooking(env, b) {
  const r = await env.DB.prepare("INSERT INTO bookings (customer_name, phone, pickup, dropoff, pickup_time, passengers, notes, status) VALUES (?,?,?,?,?,?,?, 'confirmed') RETURNING id")
    .bind(b.customer_name || "", b.phone || "", b.pickup || "", b.dropoff || "", b.pickup_time || "", parseInt(b.passengers) || 1, b.notes || "").first();
  return r.id;
}

async function handleTurn(req, env, ctx) {
  const T0 = Date.now();
  let p = {}, audioFile = null;
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    const f = await req.formData();
    for (const k of ["text", "history", "fields", "langPref", "sessionLang", "pendingLang", "awaitingConfirm", "sessionId"]) p[k] = f.get(k);
    audioFile = f.get("audio");
    p.history = JSON.parse(p.history || "[]"); p.fields = JSON.parse(p.fields || "{}"); p.awaitingConfirm = p.awaitingConfirm === "true";
  } else p = await req.json();
  const history = Array.isArray(p.history) ? p.history.slice(-6) : [];
  const fields = mergeFields({}, p.fields || {});
  if (fields.phone) { const np = normPhone(fields.phone); if (np) fields.phone = np; else delete fields.phone; }
  const pref = ["en", "roman", "ur", "auto"].includes(p.langPref) ? p.langPref : "en";
  const session0 = ["en", "roman", "ur"].includes(p.sessionLang) ? p.sessionLang : null;
  const dbg = { pref, session0 };

  // 1) STT
  let userText = String(p.text || "").trim();
  if (audioFile && audioFile.size) {
    if (audioFile.size < 1500) userText = "";
    else {
      const hint = pref === "en" ? "en" : pref !== "auto" || (session0 && session0 !== "en") ? "ur" : undefined;
      const s = await transcribe(env, await audioFile.arrayBuffer(), hint);
      userText = s.text; dbg.sttHint = hint || "auto"; dbg.sttLang = s.info?.language; dbg.sttNote = s.note;
    }
    dbg.sttGuard = sttBad(userText);
  }
  // 2) language
  const detected = detectLang(userText), explicit = explicitLang(userText);
  const L2 = resolveLang({ pref, session: session0, pending: p.pendingLang || null, detected, explicit });
  const lang = L2.lang;
  Object.assign(dbg, { detected, explicit, why: L2.why });

  let out, bookingId = null, merged = { ...fields }, awaiting = false, source = "llm";
  if (dbg.sttGuard) {
    out = REPEAT[lang]; source = "repeat-guard";
    awaiting = !!p.awaitingConfirm;
  } else {
    history.push({ role: "user", content: userText });
    if (p.awaitingConfirm && isReady(fields) && YES.test(userText) && !NO.test(userText)) {
      // 3a) single yes -> save without LLM
      bookingId = await saveBooking(env, fields);
      out = confirmedMsg(lang, bookingId, fields); source = "confirm-fastpath";
    } else {
      // 3b) LLM with language lock + validation
      let o = await llm(env, history, fields, lang, false);
      const okAll = (o) => langOk(o.reply, lang) && (lang !== "ur" || (o.roman && !AR.test(o.roman) && o.roman.trim().length > 4));
      if (!okAll(o)) { dbg.retry = "lang-mismatch:" + String(o.reply || "").slice(0, 40); o = await llm(env, history, fields, lang, true); source = "llm-retry"; }
      mergeFields(merged, o);
      if (!merged.passengers) { const px = paxFromText(userText); if (px) merged.passengers = px; }
      let badPhone = null;
      if (merged.phone) { const np = normPhone(merged.phone); if (np) merged.phone = np; else { badPhone = merged.phone; delete merged.phone; dbg.badPhone = badPhone; } }
      const ready = isReady(merged);
      const prevBot = [...history].reverse().find((m) => m.role === "assistant")?.content || "";
      const last4 = String(merged.phone || "").replace(/\D/g, "").slice(-4);
      const prevWasReadback = /[?؟]/.test(prevBot) && last4 && prevBot.replace(/\D/g, "").includes(last4);
      if (badPhone) { out = PHONE_AGAIN[lang]; source = "phone-invalid"; }
      else if (ready && !NO.test(userText) && (YES.test(userText) || o.confirmed === true) && (p.awaitingConfirm || prevWasReadback)) {
        bookingId = await saveBooking(env, merged);
        out = confirmedMsg(lang, bookingId, merged); source += "+confirm";
      } else if (!okAll(o)) {
        out = ready ? readback(lang, merged) : askNext(lang, merged); source = "template";
        awaiting = ready;
      } else {
        out = { reply: o.reply.trim(), roman: o.roman };
        if (ready) {
          // make sure the caller is actually asked to confirm, so one "yes" saves
          if (!/\?|؟/.test(out.reply)) { out = readback(lang, merged); source += "+readback"; }
          awaiting = true;
        }
      }
    }
    history.push({ role: "assistant", content: out.reply });
  }
  const speakText = ttsText(lang, out);
  const wantAudio = new URL(req.url).searchParams.get("tts") !== "0";
  const t = wantAudio ? await speakTurn(env, lang, out, speakText) : { audio: null, path: "skipped" };
  ctx.waitUntil(logRow(env, { session: p.sessionId, mode: lang, kind: audioFile && audioFile.size ? "turn-voice" : "turn-text", transcript: userText, reply: out.reply, speak: speakText, tts_path: t.path, source, latency_ms: Date.now() - T0, booking_id: bookingId, debug: dbg }));
  return json({
    transcript: userText, reply: out.reply, speak: speakText, lang, sessionLang: L2.session, pendingLang: L2.pending,
    awaitingConfirm: bookingId ? false : awaiting, bookingId, booking: bookingId ? (source.startsWith("confirm") ? fields : merged) : null,
    fields: bookingId ? {} : merged, audio: t.audio, ttsPath: t.path, source, debug: dbg, history: history.slice(-6),
  });
}

async function logRow(env, r) {
  try {
    await env.DB.prepare("INSERT INTO call_logs (session, mode, kind, transcript, reply, speak, tts_path, source, latency_ms, error, booking_id, debug) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(String(r.session || "").slice(0, 40), r.mode || "", r.kind || "", String(r.transcript || "").slice(0, 1000), String(r.reply || "").slice(0, 1000), String(r.speak || "").slice(0, 1000), String(r.tts_path || "").slice(0, 200), r.source || "", r.latency_ms ?? null, r.error ? String(r.error).slice(0, 500) : null, r.booking_id ?? null, r.debug ? JSON.stringify(r.debug).slice(0, 1500) : null).run();
  } catch (e) {}
}
async function logsPage(env, url) {
  const sess = url.searchParams.get("session");
  const q = sess ? env.DB.prepare("SELECT *, datetime(ts, '+5 hours') AS pkt FROM call_logs WHERE session = ? ORDER BY id DESC LIMIT 500").bind(sess) : env.DB.prepare("SELECT *, datetime(ts, '+5 hours') AS pkt FROM call_logs ORDER BY id DESC LIMIT 300");
  const { results } = await q.all();
  if (url.pathname === "/api/logs") return json(results);
  const tok = encodeURIComponent(url.searchParams.get("token"));
  const rows = results.map((r) => `<tr class="${esc(r.kind)}"><td>${r.id}</td><td>${esc(r.pkt)}</td><td><a href="/logs?token=${tok}&session=${encodeURIComponent(r.session || "")}">${esc((r.session || "").slice(0, 8))}</a></td><td>${esc(r.mode)}</td><td>${esc(r.kind)}</td><td dir="auto">${esc(r.transcript)}</td><td dir="auto">${esc(r.reply)}</td><td>${esc(r.speak)}</td><td>${esc(r.tts_path)}</td><td>${esc(r.source)}</td><td>${r.latency_ms ?? ""}</td><td>${esc(r.error || "")}${r.booking_id ? " ✅#" + r.booking_id : ""}</td><td><details><summary>…</summary><code>${esc(r.debug || "")}</code></details></td></tr>`).join("");
  return new Response(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Call logs</title>
<style>body{font-family:system-ui;margin:16px;background:#f6f7fb}table{border-collapse:collapse;width:100%;background:#fff;font-size:12.5px}td,th{border:1px solid #ddd;padding:5px 6px;text-align:left;vertical-align:top}th{background:#ffcc00;position:sticky;top:0}tr.playback{background:#eef6ff}tr.error{background:#ffecec}code{white-space:pre-wrap;font-size:11px}</style>
<h1>📞 Call logs</h1><p>Times in PKT. ${sess ? `Session ${esc(sess)} · <a href="/logs?token=${tok}">all</a>` : "Latest 300 rows. Click a session to see one call."}</p>
<table><tr><th>#</th><th>Time (PKT)</th><th>Session</th><th>Mode</th><th>Kind</th><th>Caller said</th><th>Reply</th><th>Spoken text</th><th>TTS / playback</th><th>Source</th><th>ms</th><th>Error / booking</th><th>Debug</th></tr>${rows || "<tr><td colspan=13>No logs yet</td></tr>"}</table>`, { headers: { "content-type": "text/html;charset=utf-8", "cache-control": "no-store" } });
}

async function bookingsPage(env) {
  const { results } = await env.DB.prepare("SELECT * FROM bookings ORDER BY id DESC LIMIT 200").all();
  const rows = results.map((b) => `<tr><td>${b.id}</td><td>${esc(b.created_at)}</td><td>${esc(b.customer_name)}</td><td>${esc(b.phone)}</td><td>${esc(b.pickup)}</td><td>${esc(b.dropoff)}</td><td>${esc(b.pickup_time)}</td><td>${esc(b.passengers)}</td><td>${esc(b.notes)}</td><td>${esc(b.status)}</td></tr>`).join("");
  return new Response(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Usamas Taxi Company – Bookings</title>
<style>body{font-family:system-ui;margin:20px;background:#f6f7fb}table{border-collapse:collapse;width:100%;background:#fff}td,th{border:1px solid #ddd;padding:6px 8px;font-size:14px;text-align:left}th{background:#ffcc00}</style>
<h1>🚕 Usamas Taxi Company – Bookings</h1><p><a href="/">← Dispatcher</a> · <a href="/api/bookings">JSON</a></p>
<table><tr><th>ID</th><th>Created (UTC)</th><th>Name</th><th>Phone</th><th>Pickup</th><th>Drop-off</th><th>Time</th><th>Pax</th><th>Notes</th><th>Status</th></tr>${rows || '<tr><td colspan=10>No bookings yet</td></tr>'}</table>`, { headers: { "content-type": "text/html;charset=utf-8" } });
}

import PAGE from "../ui/dist/index.html";

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    try {
      if ((url.pathname === "/logs" || url.pathname === "/api/logs") && req.method === "GET") {
        if (!env.LOGS_TOKEN || url.searchParams.get("token") !== env.LOGS_TOKEN) return new Response("Forbidden", { status: 403 });
        return await logsPage(env, url);
      }
      if (url.pathname === "/api/diag" && url.searchParams.get("token") === env.LOGS_TOKEN && env.LOGS_TOKEN) {
        const k = env.AZURE_SPEECH_KEY || ""; const h = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(k)))).slice(0, 3).map((b) => b.toString(16).padStart(2, "0")).join("");
        const r = await fetch(`https://${env.AZURE_TTS_HOST}/sts/v1.0/issueToken`, { method: "POST", headers: { "Ocp-Apim-Subscription-Key": k, "Content-Length": "0" } });
        return json({ len: k.length, h, trimmedDiffers: k.trim() !== k, host: env.AZURE_TTS_HOST, status: r.status, body: r.status === 200 ? "ok" : (await r.text()).slice(0, 200) });
      }
      if (url.pathname === "/api/playlog" && req.method === "POST") {
        const b = JSON.parse((await req.text()).slice(0, 4000) || "{}");
        ctx.waitUntil(logRow(env, { session: b.sessionId, mode: b.lang, kind: "playback", reply: b.text, tts_path: b.path, source: b.origin, latency_ms: b.ms ?? null, error: /fail|blocked|no-/.test(b.path || "") ? b.path : null }));
        return new Response(null, { status: 204 });
      }
      if (url.pathname === "/" && req.method === "GET") return new Response(PAGE, { headers: { "content-type": "text/html;charset=utf-8", "cache-control": "no-store" } });
      if (url.pathname === "/api/turn" && req.method === "POST") { try { return await handleTurn(req, env, ctx); } catch (e) { ctx.waitUntil(logRow(env, { kind: "error", error: String((e && e.stack) || e) })); throw e; } }
      if (url.pathname === "/bookings") return await bookingsPage(env);
      if (url.pathname === "/api/bookings") return json((await env.DB.prepare("SELECT * FROM bookings ORDER BY id DESC").all()).results);
      if (url.pathname === "/api/tts" && req.method === "POST") { const { text, lang, script } = await req.json(); const roman = speechNorm(String(text || "").replace(AR_G, " ").trim(), lang === "en" ? "en" : "roman"); const t = lang === "ur" && script ? await speakTurn(env, "ur", { reply: String(script).slice(0, 700) }, roman) : await speak(env, roman); return json({ audio: t.audio, ttsPath: t.path }); }
      return new Response("Not found", { status: 404 });
    } catch (e) { return json({ error: String((e && e.message) || e) }, 500); }
  },
};
