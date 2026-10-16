import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const GREETING_OLD = "Hi, thanks for calling Usamas Taxi Company, serving Lahore! Can I start with your name? (English ya Urdu mein baat karein)";
const FIELDS = [
  ["customer_name", "Name", "👤"], ["phone", "Phone", "📞"], ["pickup", "Pickup", "📍"],
  ["dropoff", "Drop-off", "🏁"], ["pickup_time", "Time", "🕒"], ["passengers", "Passengers", "👥"], ["notes", "Notes", "📝"],
];
const isUrdu = (t) => /[\u0600-\u06FF]/.test(t || "");

/* React Bits-style: Aurora background */
function Aurora() {
  const blobs = [["#ffb703", "-10%", "-10%"], ["#7b2ff7", "50%", "-15%"], ["#00c2ff", "10%", "45%"], ["#ff2d55", "60%", "50%"]];
  return (<div className="aurora">{blobs.map(([c, x, y], i) => (
    <motion.span key={i} style={{ background: `radial-gradient(circle, ${c} 0%, transparent 65%)`, left: x, top: y }}
      animate={{ x: [0, 80, -60, 0], y: [0, -50, 60, 0], scale: [1, 1.15, 0.9, 1] }}
      transition={{ duration: 18 + i * 4, repeat: Infinity, ease: "easeInOut" }} />))}</div>);
}

/* React Bits-style: BlurText / SplitText */
function BlurText({ text, delay = 0.04 }) {
  return (<span aria-label={text}>{text.split(" ").map((w, i) => (
    <motion.span key={i} style={{ display: "inline-block", marginRight: "0.25em" }}
      initial={{ opacity: 0, filter: "blur(10px)", y: 12 }} animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ delay: i * delay * 3, duration: 0.6, ease: "easeOut" }}>{w}</motion.span>))}</span>);
}

/* Audio-reactive orb */
function Orb({ mode, analyserRef }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, ctx = cv.getContext("2d"); let raf, t = 0;
    const dpr = window.devicePixelRatio || 1; cv.width = 220 * dpr; cv.height = 220 * dpr; ctx.scale(dpr, dpr);
    const buf = new Uint8Array(128);
    const draw = () => {
      t += 0.016; ctx.clearRect(0, 0, 220, 220);
      let level = 0, bins = null; const an = analyserRef.current;
      if (an && (mode === "listening" || mode === "speaking")) { an.getByteFrequencyData(buf); bins = buf; level = buf.slice(2, 60).reduce((a, b) => a + b, 0) / (58 * 255); }
      else if (mode === "speaking") level = 0.25 + 0.2 * Math.abs(Math.sin(t * 7)) * Math.abs(Math.sin(t * 2.3));
      const colors = { idle: ["#ffd60a", "#ff9f0a"], listening: ["#ff375f", "#ff9f0a"], thinking: ["#7b2ff7", "#00c2ff"], speaking: ["#30d158", "#00c2ff"] }[mode];
      const base = 46 + (mode === "idle" ? 4 * Math.sin(t * 1.5) : 0);
      const pts = 96; ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        let r = base + level * 30;
        if (bins) r += (bins[(i % 48) + 4] / 255) * 14 * (mode === "listening" ? 1 : 0.7);
        r += Math.sin(a * 5 + t * (mode === "thinking" ? 6 : 2)) * (mode === "thinking" ? 6 : 3);
        const x = 110 + Math.cos(a) * r, y = 110 + Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      const g = ctx.createRadialGradient(95, 90, 10, 110, 110, 110); g.addColorStop(0, colors[0]); g.addColorStop(1, colors[1]);
      ctx.fillStyle = g; ctx.shadowColor = colors[0]; ctx.shadowBlur = 18 + level * 22; ctx.fill(); ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(98, 94, 16 + level * 8, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    draw(); return () => cancelAnimationFrame(raf);
  }, [mode]);
  return (<div className="orbBox">
    <AnimatePresence>{mode === "thinking" && (
      <motion.div key="ring" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1, rotate: 360 }} exit={{ opacity: 0 }}
        transition={{ rotate: { repeat: Infinity, duration: 1.6, ease: "linear" }, opacity: { duration: 0.3 } }}
        style={{ position: "absolute", inset: 8, borderRadius: "50%", background: "conic-gradient(from 0deg, transparent, #7b2ff7, #00c2ff, transparent 70%)", WebkitMask: "radial-gradient(circle, transparent 62%, #000 64%)", mask: "radial-gradient(circle, transparent 62%, #000 64%)" }} />)}
    </AnimatePresence>
    {(mode === "listening" || mode === "speaking") && [0, 1, 2].map((i) => (
      <motion.div key={mode + i} style={{ position: "absolute", width: 130, height: 130, borderRadius: "50%", border: `2px solid ${mode === "listening" ? "#ff375f" : "#30d158"}` }}
        initial={{ scale: 0.9, opacity: 0.6 }} animate={{ scale: 1.7, opacity: 0 }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.66 }} />))}
    <canvas className="wave" ref={ref} />
  </div>);
}

function Confetti() {
  const cs = ["#ffd60a", "#ff9f0a", "#30d158", "#00c2ff", "#ff375f", "#7b2ff7"];
  return Array.from({ length: 44 }, (_, i) => (
    <motion.span key={i} className="conf" style={{ background: cs[i % cs.length] }}
      initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
      animate={{ x: (Math.random() - 0.5) * 700, y: (Math.random() - 0.7) * 600 + 200, opacity: 0, rotate: Math.random() * 720 }}
      transition={{ duration: 1.8 + Math.random(), ease: "easeOut" }} />));
}

const DEBUG = new URLSearchParams(location.search).get("debug") === "1";
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
const LANGS = [["en", "English"], ["ur", "اردو"]];
const GREET = {
  en: { text: "Hi, thanks for calling Usamas Taxi Company in Lahore! May I have your name, please?", speak: "Hi, thanks for calling Usamas Taxi Company in Lahore! May I have your name, please?" },
  ur: { text: "السلام علیکم! یوسماز ٹیکسی کمپنی لاہور میں خوش آمدید۔ اپنا نام بتا دیں؟", speak: "Assalam o alaikum! Usamas Taxi Company Lahore mein khush aamdeed. Apna naam bata dein?" },
};
const SWITCH = {
  en: { text: "Sure, let's continue in English.", speak: "Sure, let's continue in English." },
  ur: { text: "ٹھیک ہے، اب اردو میں بات کرتے ہیں۔", speak: "Theek hai, ab Urdu mein baat karte hain." },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function getVoices(timeout = 1500) {
  return new Promise((res) => {
    if (!("speechSynthesis" in window)) return res([]);
    const v = speechSynthesis.getVoices(); if (v.length) return res(v);
    const t = setTimeout(() => res(speechSynthesis.getVoices()), timeout);
    speechSynthesis.addEventListener("voiceschanged", () => { clearTimeout(t); res(speechSynthesis.getVoices()); }, { once: true });
  });
}
function chunks(text) { return (String(text).match(/[^.!?۔؟]+[.!?۔؟]*/g) || [text]).map((x) => x.trim()).filter(Boolean); }

export default function App() {
  const [msgs, setMsgs] = useState([]);
  const [mode, setMode] = useState("idle");
  const [fields, setFields] = useState({});
  const [done, setDone] = useState(null);
  const [status, setStatus] = useState("Tap the button and speak, or type below");
  const [input, setInput] = useState("");
  const [langPref, setLangPref] = useState(null);
  const [sessionLang, setSessionLang] = useState(null);
  const [needTap, setNeedTap] = useState(null);
  const [logs, setLogs] = useState([]);
  const st = useRef({ history: [], fields: {}, sessionLang: null, pendingLang: null, awaitingConfirm: false });
  const rec = useRef(null), actx = useRef(null), analyser = useRef(null), chatRef = useRef(null), idc = useRef(1);
  const stLang = useRef("en"); const sid = useRef(""); const newSid = () => (sid.current = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))); const player = useRef(null), playerAnalyser = useRef(null), unlocked = useRef(false), playToken = useRef(0), safety = useRef(null);

  useEffect(() => { chatRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }); }, [msgs, mode]);
  useEffect(() => { getVoices(); }, []);
  const log = (o) => { if (DEBUG) { console.log("[dispatcher]", o); setLogs((l) => [{ t: new Date().toLocaleTimeString(), ...o }, ...l].slice(0, 30)); } };
  const add = (m) => setMsgs((x) => [...x, { id: idc.current++, ...m }]);
  const ac = () => (actx.current ||= new (window.AudioContext || window.webkitAudioContext)());

  // Unlock audio during a user gesture so later async playback is allowed.
  function unlock() {
    try { const c = ac(); if (c.state !== "running") c.resume(); } catch {}
    if (!player.current) {
      const a = new Audio(); a.preload = "auto"; a.playsInline = true; player.current = a;
    }
    if (!unlocked.current) {
      unlocked.current = true;
      const a = player.current; a.src = SILENT_WAV; a.play().catch(() => { unlocked.current = false; });
      try { if ("speechSynthesis" in window) { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); } } catch {}
    }
  }
  useEffect(() => { const h = () => unlock(); window.addEventListener("pointerdown", h, true); window.addEventListener("keydown", h, true); return () => { window.removeEventListener("pointerdown", h, true); window.removeEventListener("keydown", h, true); }; }, []);

  function stopPlayback() {
    playToken.current++; clearTimeout(safety.current);
    try { player.current && player.current.pause(); } catch {}
    try { "speechSynthesis" in window && speechSynthesis.cancel(); } catch {}
  }
  function finished(tok) { if (tok === playToken.current) { clearTimeout(safety.current); setMode((m) => (m === "speaking" ? "idle" : m)); setStatus(stLang.current === "ur" ? "اب آپ بولیں — مائیک دبائیں" : "Your turn — tap to talk"); } }

  async function speakBrowser(m, tok) {
    if (!("speechSynthesis" in window)) return "no-speechSynthesis";
    const voices = await getVoices();
    let text = m.speak || m.text, voice = null, lang = "en-US";
    if (m.lang === "ur") {
      voice = voices.find((v) => /^ur/i.test(v.lang));
      if (voice) { text = m.text; lang = voice.lang; }
      else { voice = voices.find((v) => /^hi/i.test(v.lang)) || voices.find((v) => /^en-(IN|GB|US)/i.test(v.lang)); lang = voice?.lang || "en-US"; text = m.speak || m.text.replace(/[\u0600-\u06FF]+/g, " "); }
    } else voice = voices.find((v) => /^en-IN/i.test(v.lang)) || voices.find((v) => /^en-(GB|US)/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang));
    if (!text || !text.trim()) return "no-text";
    speechSynthesis.cancel(); await sleep(60);
    if (tok !== playToken.current) return "cancelled";
    const parts = chunks(text); let started = false;
    await new Promise((res) => {
      parts.forEach((p, i) => {
        const u = new SpeechSynthesisUtterance(p); u.lang = voice?.lang || lang; if (voice) u.voice = voice; u.rate = 1;
        u.onstart = () => { started = true; };
        if (i === parts.length - 1) u.onend = u.onerror = () => res();
        speechSynthesis.speak(u);
      });
      setTimeout(() => { if (!started) res(); }, 2500);
    });
    return started ? "speechSynthesis:" + (voice ? voice.name + " (" + voice.lang + ")" : lang) : "speechSynthesis-blocked";
  }

  async function play(m, origin = "auto") {
    stopPlayback(); const tok = playToken.current; setNeedTap(null); stLang.current = m.lang; log({ ev: "play-start", msg: m.id, hasAudio: !!m.audio, origin });
    setMode("speaking"); setStatus(m.lang === "ur" ? "جواب سنایا جا رہا ہے…" : "Speaking…");
    const tPlay = performance.now(); const beacon = (path) => { try { navigator.sendBeacon("/api/playlog", JSON.stringify({ sessionId: sid.current, lang: m.lang, path, origin, text: (m.text || "").slice(0, 300), ms: Math.round(performance.now() - tPlay) })); } catch {} };
    const est = 4000 + (m.speak || m.text || "").length * 110; safety.current = setTimeout(() => finished(tok), est + 6000);
    let path = null;
    if (!m.audio && (m.speak || m.text)) {
      try { const r = await (await fetch("/api/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: m.speak || m.text, script: m.lang === "ur" ? m.text : undefined, lang: m.lang }) })).json(); if (r.audio) { m.audio = r.audio; setMsgs((x) => x.map((y) => (y.id === m.id ? { ...y, audio: r.audio } : y))); } } catch {}
      if (tok !== playToken.current) return;
    }
    if (m.audio && player.current) {
      try {
        const a = player.current; a.src = m.audio; analyser.current = null;
        await new Promise((res, rej) => { a.onended = res; a.onerror = () => rej(new Error("media error")); a.play().catch(rej); });
        path = "audio(melotts)";
      } catch (e) { path = "audio-failed:" + (e.name || e.message); }
    } else path = m.audio ? "no-player" : "no-server-audio";
    if (tok !== playToken.current) return;
    if (!path.startsWith("audio(")) {
      analyser.current = null;
      const p2 = await speakBrowser(m, tok);
      path += " → " + p2;
      if (p2.includes("blocked") || p2.startsWith("no-")) {
        setNeedTap(m.id); clearTimeout(safety.current); setMode("idle");
        setStatus(m.lang === "ur" ? "جواب سننے کے لیے 🔊 دبائیں" : "Tap 🔊 on the reply to hear it");
        log({ ev: "playback", origin, msg: m.id, lang: m.lang, path }); beacon(path); return;
      }
    }
    log({ ev: "playback", origin, msg: m.id, lang: m.lang, path }); beacon(path);
    finished(tok);
  }

  async function sayBot(g, lang) {
    const m = { id: idc.current++, role: "bot", text: g.text, speak: g.speak, lang, audio: null };
    setMsgs((x) => [...x, m]); st.current.history = [...st.current.history, { role: "assistant", content: g.text }].slice(-6);
    setMode("thinking"); setStatus(lang === "ur" ? "…" : "Connecting…");
    const ck = "tts2:" + lang + ":" + g.text;
    try { m.audio = localStorage.getItem(ck); } catch {}
    if (m.audio) log({ ev: "tts", ttsPath: "client-cache" });
    else try { const r = await (await fetch("/api/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: g.speak, script: lang === "ur" ? g.text : undefined, lang }) })).json(); m.audio = r.audio; log({ ev: "tts", ttsPath: r.ttsPath }); if (r.audio && (lang !== "ur" || String(r.ttsPath).startsWith("azure"))) { try { localStorage.setItem(ck, r.audio); } catch {} } } catch (e) { log({ ev: "tts-error", error: e.message }); }
    setMsgs((x) => x.map((y) => (y.id === m.id ? { ...y, audio: m.audio } : y)));
    play(m);
  }
  function start(l) {
    unlock(); stopPlayback(); setLangPref(l);
    newSid(); st.current = { history: [], fields: {}, sessionLang: l, pendingLang: null, awaitingConfirm: false };
    setSessionLang(l); setFields({}); setDone(null); setNeedTap(null); setMsgs([]); log({ ev: "start", lang: l });
    sayBot(GREET[l], l);
  }

  async function send(fd, typed) {
    stopPlayback(); setMode("thinking"); setStatus("Dispatcher is thinking…");
    const s = st.current;
    fd.append("history", JSON.stringify(s.history)); fd.append("fields", JSON.stringify(s.fields));
    fd.append("langPref", langPref || "en"); fd.append("sessionId", sid.current || newSid()); fd.append("sessionLang", s.sessionLang || ""); fd.append("pendingLang", s.pendingLang || ""); fd.append("awaitingConfirm", String(s.awaitingConfirm));
    const t0 = performance.now();
    try {
      const res = await fetch("/api/turn", { method: "POST", body: fd });
      const r = await res.json();
      if (r.error) { setStatus("Error: " + r.error); setMode("idle"); log({ ev: "error", error: r.error }); return; }
      if (!typed) add({ role: "user", text: r.transcript || "…" });
      Object.assign(s, { history: r.history || s.history, sessionLang: r.sessionLang, pendingLang: r.pendingLang, awaitingConfirm: !!r.awaitingConfirm });
      setSessionLang(r.sessionLang);
      const f = r.booking || r.fields || {}; s.fields = r.bookingId ? {} : f; setFields(f);
      const m = { id: idc.current++, role: "bot", text: r.reply, speak: r.speak, lang: r.lang, audio: r.audio };
      setMsgs((x) => [...x, m]);
      log({ ev: "turn", ms: Math.round(performance.now() - t0), transcript: r.transcript, lang: r.lang, session: r.sessionLang, pending: r.pendingLang, source: r.source, ttsPath: r.ttsPath, awaitingConfirm: r.awaitingConfirm, ...r.debug });
      if (r.bookingId) setDone({ id: r.bookingId, booking: r.booking });
      play(m);
    } catch (e) { setStatus("Network error: " + e.message); setMode("idle"); log({ ev: "network-error", error: e.message }); }
  }

  async function toggleMic() {
    unlock();
    if (mode === "listening") { rec.current?.stop(); return; }
    if (mode === "thinking") return;
    stopPlayback();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const c = ac(); await c.resume(); const an = c.createAnalyser(); an.fftSize = 256; c.createMediaStreamSource(s).connect(an); analyser.current = an;
      const mt = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => window.MediaRecorder?.isTypeSupported?.(t));
      const parts = []; const m = new MediaRecorder(s, mt ? { mimeType: mt } : undefined); rec.current = m; const t0 = Date.now();
      m.ondataavailable = (e) => e.data.size && parts.push(e.data);
      m.onstop = () => {
        s.getTracks().forEach((t) => t.stop()); analyser.current = null;
        const b = new Blob(parts, { type: m.mimeType || mt || "audio/webm" }); const dur = Date.now() - t0;
        log({ ev: "recorded", ms: dur, bytes: b.size, type: b.type });
        if (dur < 600 || b.size < 1500) { setMode("idle"); setStatus("That was too short — hold on a bit longer and try again"); return; }
        const fd = new FormData(); fd.append("audio", b, "speech." + (b.type.includes("mp4") ? "mp4" : b.type.includes("ogg") ? "ogg" : "webm")); send(fd, false);
      };
      m.start(250); setMode("listening"); setStatus("Listening… tap again when you're done");
    } catch (e) { setMode("idle"); setStatus("Microphone unavailable — please type instead"); log({ ev: "mic-error", error: e.message }); }
  }

  function submit(e) { e.preventDefault(); unlock(); const v = input.trim(); if (!v || mode === "thinking") return; if (mode === "listening") return; setInput(""); add({ role: "user", text: v }); const fd = new FormData(); fd.append("text", v); send(fd, true); }
  function reset() { stopPlayback(); setDone(null); setMsgs([]); setFields({}); setLangPref(null); setMode("idle"); setStatus("Choose a language to start"); }
  function pickLang(l) { if (l === langPref) return; unlock(); if (!langPref) return start(l); setLangPref(l); st.current.sessionLang = l; st.current.pendingLang = null; setSessionLang(l); log({ ev: "lang-switch", lang: l }); sayBot(SWITCH[l], l); }

  const filled = FIELDS.filter(([k]) => fields[k]).length;
  const label = langPref === "ur" ? { idle: "🎤  بولنے کے لیے دبائیں", listening: "⏹  بھیجنے کے لیے دبائیں", thinking: "…سوچ رہا ہے", speaking: "🎤  روک کر بولیں" }[mode] : { idle: "🎤  Tap to talk", listening: "⏹  Tap to send", thinking: "Thinking…", speaking: "🎤  Tap to interrupt & talk" }[mode];
  const langLabel = { en: "English", ur: "اردو" }[langPref] || "";

  return (<>
    <Aurora /><div className="grain" />
    <div className="wrap">
      <header>
        <div className="brand">
          <motion.div className="logo" initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14 }}>🚕</motion.div>
          <div><h1 aria-label="Usamas Taxi Company"><BlurText text="Usamas Taxi Company" /></h1><motion.div className="sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>Lahore · AI voice dispatcher · English & اردو</motion.div></div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className="ghost" onClick={reset}>↺ New call</button><a className="pill" href="/bookings">Bookings →</a></div>
      </header>
      <div className="seg" role="radiogroup" aria-label="Language">
        {LANGS.map(([k, l]) => (<button key={k} role="radio" aria-checked={langPref === k} className={langPref === k ? "on" : ""} onClick={() => pickLang(k)}>
          {langPref === k && <motion.span layoutId="segpill" className="segpill" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}<span style={{ position: "relative" }}>{l}</span></button>))}
        <span className="langnow">{langPref ? <>Call language: <b>{langLabel}</b></> : "Choose a language"}</span>
      </div>
      <div className="grid">
        <motion.section className="card stage" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
          <Orb mode={mode} analyserRef={analyser} />
          <AnimatePresence mode="wait"><motion.div key={status} className="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>{status}</motion.div></AnimatePresence>
          <motion.button className={"shiny" + (mode === "listening" ? " rec" : "")} onClick={toggleMic} disabled={mode === "thinking"}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} animate={mode === "listening" ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={mode === "listening" ? { repeat: Infinity, duration: 1.2 } : {}}>{label}</motion.button>
          <div className="chat" ref={chatRef}>
            <AnimatePresence initial={false}>{msgs.map((m) => (
              <motion.div key={m.id} layout className={"b " + m.role} dir={isUrdu(m.text) ? "rtl" : "auto"}
                initial={{ opacity: 0, y: 16, scale: 0.92, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}>{m.text}
                {m.role === "bot" && (<button className={"replay" + (needTap === m.id ? " pulse" : "")} onClick={() => { unlock(); play(m, "replay"); }} aria-label="Replay reply">🔊{needTap === m.id ? " Tap to hear" : ""}</button>)}
              </motion.div>))}
              {mode === "thinking" && (<motion.div key="typing" className="b bot typing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {[0, 1, 2].map((i) => <motion.i key={i} animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} />)}</motion.div>)}
            </AnimatePresence>
          </div>
          <form className="ti" onSubmit={submit}><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message… / یہاں لکھیں" aria-label="Message" /><button type="submit">Send</button></form>
          <div className="hint">Speak English, Urdu or Roman Urdu. Your mic audio is only used to transcribe this call.</div>
        </motion.section>
        <motion.aside className="card side" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }}>
          <h3>Booking summary</h3><p>Fills in live as the dispatcher collects details</p>
          <div className="prog"><motion.div animate={{ width: `${(filled / FIELDS.length) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} /></div>
          {FIELDS.map(([k, l, ic]) => (
            <motion.div key={k} layout className={"row" + (fields[k] ? " filled" : "")} animate={fields[k] ? { scale: [1, 1.03, 1] } : {}} transition={{ duration: 0.4 }}>
              <div className="ic">{ic}</div>
              <div style={{ minWidth: 0 }}><div className="k">{l}</div>
                <AnimatePresence mode="wait"><motion.div key={fields[k] || "empty"} className="v" dir="auto" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                  style={{ color: fields[k] ? "#fff" : "#5d5d70" }}>{fields[k] || "—"}</motion.div></AnimatePresence></div>
            </motion.div>))}
        </motion.aside>
      </div>
      {DEBUG && (<div className="card dbg"><b>Debug</b> <span style={{ color: "#888" }}>(newest first)</span>{logs.map((l, i) => <pre key={i}>{JSON.stringify(l)}</pre>)}</div>)}
    </div>
    <AnimatePresence>{!langPref && (
      <motion.div className="chooser" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
        <motion.div className="card cbox" initial={{ y: 40, scale: 0.9, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -30, scale: 0.95, opacity: 0 }} transition={{ type: "spring", stiffness: 200, damping: 18 }}>
          <motion.div className="logo big" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.4 }}>🚕</motion.div>
          <h2><BlurText text="Choose your language" /></h2>
          <div className="sub" dir="rtl">زبان منتخب کریں</div>
          <div className="choices">
            <motion.button className="choice" onClick={() => start("en")} whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.96 }} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}><span className="flag">🇬🇧</span>English</motion.button>
            <motion.button className="choice ur" onClick={() => start("ur")} whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.96 }} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}><span className="flag">🇵🇰</span>اردو</motion.button>
          </div>
          <div className="hint">The whole call stays in this language. You can switch anytime from the top bar.</div>
        </motion.div>
      </motion.div>)}
    </AnimatePresence>
    <AnimatePresence>{done && (
      <motion.div className="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDone(null)}>
        <Confetti />
        <motion.div className="card box" initial={{ scale: 0.6, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 220, damping: 16 }} onClick={(e) => e.stopPropagation()}>
          <motion.div className="check" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2, type: "spring" }}>
            <svg width="50" height="50" viewBox="0 0 24 24"><motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.45, duration: 0.5 }} /></svg>
          </motion.div>
          <h2 style={{ margin: "4px 0" }}>Booking confirmed</h2>
          <div style={{ color: "#9a9aae", fontSize: 13 }}>Reference number</div>
          <motion.div className="ref" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>#{done.id}</motion.div>
          <div style={{ fontSize: 14, color: "#cfcfe0", margin: "8px 0 16px" }} dir="auto">{done.booking?.pickup} → {done.booking?.dropoff}<br />{done.booking?.pickup_time}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}><button className="ghost" onClick={reset}>New call</button><a className="pill" href="/bookings">View bookings</a></div>
        </motion.div>
      </motion.div>)}
    </AnimatePresence>
  </>);
}
