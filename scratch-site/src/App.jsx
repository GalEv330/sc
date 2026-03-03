import React, { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";

const PRIZES = [
  "A home spa evening 💆",
  "A jacuzzi evening 🛁",
  "Purim costume party night 🎭",
  "Homemade sushi evening 🍣",
  "Elegant cooking evening 👩‍🍳",
  "A movie evening - but fully invested 🎬",
  "Recreating the last night in Jerusalem ✨",
  "Creative couple date night 🎨",
  "Gal chooses! (last minute 😈)",
];

const MAX_ATTEMPTS = 3;
const STORAGE_KEY = "romantic-scratch-board-v1";
const CONFETTI_MS = 3000;

// ── GitHub Gist logger ────────────────────────────────────────────────────────
// After every scratch, a line is appended to a private Gist file you own.
// You can always open the Gist URL and see the full history.
//
// One-time setup (2 minutes):
//   1. github.com → Settings → Developer settings → Personal access tokens
//      → Fine-grained tokens → Generate new token
//      • Repository access: "Only public repositories" (or none)
//      • Permissions: Gists → Read and Write
//      Copy the token below.
//   2. gist.github.com → "+ New gist"
//      • Filename: scratch-log.txt   Content: (leave blank or type a header)
//      • Choose "Create secret gist"
//      Copy the Gist ID from the URL (the long hash at the end).
const GITHUB_TOKEN  = "YOUR_GITHUB_TOKEN";   // ghp_...
const GIST_ID       = "YOUR_GIST_ID";        // 32-char hash from the Gist URL
const GIST_FILENAME = "scratch-log.txt";
// ─────────────────────────────────────────────────────────────────────────────

// Safely base64-encode a string that may contain emojis / non-ASCII
function b64Encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64Decode(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

async function logToGist({ prize, attempt, isFinal, history, usedAt }) {
  if (GITHUB_TOKEN === "YOUR_GITHUB_TOKEN") {
    console.log("📝 Gist not configured — logging to console instead:", {
      attempt, prize, isFinal, history, usedAt,
    });
    return;
  }

  const timestamp = new Date(usedAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
  const separator = "─".repeat(48);
  const entry =
    `\n${separator}\n` +
    `Attempt ${attempt} of ${MAX_ATTEMPTS}  •  ${timestamp}\n` +
    `Prize:   ${prize}\n` +
    `Final:   ${isFinal ? "YES ✅ — this is the locked result" : "No"}\n` +
    `History: ${history.join("  →  ")}\n`;

  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
  const url = `https://api.github.com/gists/${GIST_ID}`;

  try {
    // Read current content
    const getRes = await fetch(url, { headers });
    if (!getRes.ok) throw new Error(`GET failed: ${getRes.status}`);
    const gist = await getRes.json();
    const current = gist.files[GIST_FILENAME]?.content ?? "";

    // Append and write back
    const patchRes = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        files: { [GIST_FILENAME]: { content: current + entry } },
      }),
    });
    if (!patchRes.ok) throw new Error(`PATCH failed: ${patchRes.status}`);
    console.log("✅ Logged to Gist");
  } catch (err) {
    console.error("❌ Gist log failed:", err);
  }
}

function fireConfettiBurst() {
  const colors = ["#f6d365", "#fda085", "#ff6b9d", "#c44dff", "#ffd700", "#6bcb77"];
  const end = Date.now() + CONFETTI_MS;
  const shoot = () => {
    confetti({ particleCount: 8, angle: 60, spread: 65, origin: { x: 0, y: 0.75 }, colors });
    confetti({ particleCount: 8, angle: 120, spread: 65, origin: { x: 1, y: 0.75 }, colors });
    if (Date.now() < end) requestAnimationFrame(shoot);
  };
  requestAnimationFrame(shoot);
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createFreshBoard() {
  return {
    version: 1,
    attempt: 1,
    board: shuffle(PRIZES),
    roundComplete: false,
    revealedIndex: null,
    revealedPrize: null,
    history: [],
    locked: false,
  };
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createFreshBoard();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return createFreshBoard();
    return parsed;
  } catch {
    return createFreshBoard();
  }
}

// ── ScratchCard ───────────────────────────────────────────────────────────────
function ScratchCard({ prize, disabled, onReveal, resetToken, isChosen }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const isScratchingRef = useRef(false);
  const alreadyRevealedRef = useRef(false);

  const drawOverlay = () => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, "#f6d365");
    gradient.addColorStop(1, "#fda085");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * rect.width,
        Math.random() * rect.height,
        18 + Math.random() * 30,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = `700 ${Math.max(12, rect.width * 0.13)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Scratch me", rect.width / 2, rect.height / 2 - rect.height * 0.1);
    ctx.font = `500 ${Math.max(9, rect.width * 0.095)}px sans-serif`;
    ctx.fillText("🪙 finger like a coin", rect.width / 2, rect.height / 2 + rect.height * 0.13);
  };

  useEffect(() => {
    alreadyRevealedRef.current = false;
    const timer = setTimeout(drawOverlay, 20);
    window.addEventListener("resize", drawOverlay);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", drawOverlay);
    };
  }, [resetToken]);

  const scratchAt = (clientX, clientY) => {
    if (disabled || alreadyRevealedRef.current) return;
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const maybeReveal = () => {
    if (disabled || alreadyRevealedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;

    let transparent = 0;
    let total = 0;
    const step = 12;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha < 80) transparent++;
        total++;
      }
    }

    if (transparent / total > 0.38) {
      alreadyRevealedRef.current = true;
      onReveal();
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative aspect-square overflow-hidden rounded-2xl border border-white/60 bg-white shadow-md transition-shadow ${
        isChosen ? "ring-4 ring-pink-300 shadow-lg" : ""
      } ${disabled && !isChosen ? "opacity-50" : ""}`}
    >
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 p-2 text-center">
        <div>
          <div className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-rose-400">
            Surprise
          </div>
          <div className="text-xs font-bold leading-4 text-slate-800">{prize}</div>
        </div>
      </div>

      {!alreadyRevealedRef.current && (
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full touch-none ${
            disabled ? "pointer-events-none" : "cursor-pointer"
          }`}
          onPointerDown={(e) => {
            if (disabled) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            isScratchingRef.current = true;
            scratchAt(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (!isScratchingRef.current || disabled) return;
            scratchAt(e.clientX, e.clientY);
          }}
          onPointerUp={() => {
            isScratchingRef.current = false;
            maybeReveal();
          }}
          onPointerCancel={() => {
            isScratchingRef.current = false;
          }}
        />
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ScratchPrizeSite() {
  const [state, setState] = useState(() => loadState());
  const [resetToken, setResetToken] = useState(0);
  const [showingConfetti, setShowingConfetti] = useState(false);

  // Keep a ref so the setTimeout closure always reads the latest value
  const isLockedRef = useRef(state.locked);
  isLockedRef.current = state.locked;

  // Persist to localStorage
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Fire confetti and auto-advance after CONFETTI_MS
  useEffect(() => {
    if (!state.roundComplete) return;

    fireConfettiBurst();
    setShowingConfetti(true);

    const timer = setTimeout(() => {
      setShowingConfetti(false);
      if (!isLockedRef.current) {
        setState((prev) => ({
          ...prev,
          attempt: prev.attempt + 1,
          board: shuffle(PRIZES),
          roundComplete: false,
          revealedIndex: null,
          revealedPrize: null,
        }));
        setResetToken((prev) => prev + 1);
      }
    }, CONFETTI_MS);

    return () => clearTimeout(timer);
  }, [state.roundComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReveal = (index) => {
    if (state.roundComplete || state.locked) return;

    const prize = state.board[index];
    const nextHistory = [...state.history, prize];
    const isFinal = state.attempt >= MAX_ATTEMPTS;

    setState({
      ...state,
      roundComplete: true,
      revealedIndex: index,
      revealedPrize: prize,
      history: nextHistory,
      locked: isFinal,
    });

    // Fire-and-forget — no await, so it doesn't block the UI
    logToGist({
      prize,
      attempt: state.attempt,
      isFinal,
      history: nextHistory,
      usedAt: new Date().toISOString(),
    });
  };

  const startOverForTesting = () => {
    confetti.reset();
    setShowingConfetti(false);
    const fresh = createFreshBoard();
    setState(fresh);
    setResetToken((prev) => prev + 1);
  };

  const logConfigured = GITHUB_TOKEN !== "YOUR_GITHUB_TOKEN";

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-100 via-orange-50 to-white text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-10 pt-6">

        {/* Header */}
        <div className="mb-4 rounded-[28px] border border-white/70 bg-white/75 p-5 shadow-xl backdrop-blur">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-2xl shadow-md">
              🪙
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Scratch & Reveal</h1>
              <p className="text-sm text-slate-600">
                {state.locked
                  ? "Prize is locked — enjoy! 💝"
                  : `Attempt ${state.attempt} of ${MAX_ATTEMPTS}. Scratch one square.`}
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-slate-700">
            Pick one square, scratch it with your finger, and reveal your surprise.
            After three reveals, the final result is locked.
          </div>
        </div>

        {/* Scratch grid */}
        <div className="grid grid-cols-3 gap-3">
          {state.board.map((prize, index) => (
            <ScratchCard
              key={`${resetToken}-${index}`}
              prize={prize}
              resetToken={resetToken}
              isChosen={state.revealedIndex === index}
              disabled={state.roundComplete && state.revealedIndex !== index}
              onReveal={() => handleReveal(index)}
            />
          ))}
        </div>

        {/* History */}
        <div className="mt-5 rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur">
          <div className="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-rose-400">
            Reveal history
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            {state.history.length === 0 ? (
              <div className="text-slate-400">No prizes revealed yet.</div>
            ) : (
              state.history.map((item, idx) => (
                <div key={`${item}-${idx}`} className="rounded-2xl bg-slate-50 px-3 py-2">
                  <span className="font-semibold">Try {idx + 1}:</span> {item}
                </div>
              ))
            )}
          </div>

          {!logConfigured && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Logging not connected yet — fill in GITHUB_TOKEN and GIST_ID at the top of App.jsx.
            </div>
          )}
        </div>

        {/* Testing reset */}
        <button
          onClick={startOverForTesting}
          className="mt-4 rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm font-semibold text-slate-400 backdrop-blur active:scale-[0.98]"
        >
          Reset everything (testing only)
        </button>
      </div>

      {/* ── Confetti overlay — auto-shown for 3 s after any scratch ── */}
      {showingConfetti && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 px-6 text-center backdrop-blur-sm">
          <div className="mb-4 text-6xl animate-bounce">
            {state.locked ? "🎉" : "✨"}
          </div>
          <div className="mb-3 text-sm font-semibold uppercase tracking-widest text-rose-300">
            {state.locked ? "Final prize!" : `Attempt ${state.attempt} of ${MAX_ATTEMPTS}`}
          </div>
          <div className="max-w-xs text-3xl font-extrabold leading-snug text-white">
            {state.revealedPrize}
          </div>
          <div className="mt-8 text-sm text-white/50">
            {state.locked ? "Your prize has been saved 💝" : "Next attempt starting in a moment…"}
          </div>
        </div>
      )}

      {/* ── Final locked screen — shown after confetti on the last attempt ── */}
      {state.locked && !showingConfetti && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[32px] bg-white p-8 text-center shadow-2xl">
            <div className="mb-4 text-5xl">🎁</div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-rose-400">
              Your final prize
            </div>
            <div className="mb-5 text-2xl font-extrabold leading-tight text-slate-900">
              {state.revealedPrize}
            </div>
            <div className="mb-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-slate-600">
              This prize has been saved. Refreshing or closing won't change it.
            </div>
            <button
              onClick={startOverForTesting}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500 active:scale-[0.98]"
            >
              Reset everything (testing only)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
