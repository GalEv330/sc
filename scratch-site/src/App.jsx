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
const FLIP_MS = 600; // card flip animation duration

// ── Repo usage logger ─────────────────────────────────────────────────────────
const GITHUB_TOKEN = "YOUR_GITHUB_TOKEN";
const GITHUB_OWNER = "GalEv330";
const GITHUB_REPO  = "sc";
const LOG_FILE     = "usage-log.txt";
// ─────────────────────────────────────────────────────────────────────────────

function b64Encode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))));
}
function b64Decode(b64) {
  return decodeURIComponent(atob(b64).split("").map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(""));
}

async function logToRepo({ prize, attempt, isFinal, history, usedAt }) {
  if (GITHUB_TOKEN === "YOUR_GITHUB_TOKEN") {
    console.log("📝 Logger not configured:", { attempt, prize, isFinal, history, usedAt });
    return;
  }
  const timestamp = new Date(usedAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
  const entry =
    `\n${"─".repeat(48)}\n` +
    `Attempt ${attempt} of ${MAX_ATTEMPTS}  •  ${timestamp}\n` +
    `Prize:   ${prize}\n` +
    `Final:   ${isFinal ? "YES ✅ — locked result" : "No"}\n` +
    `History: ${history.join("  →  ")}\n`;

  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${LOG_FILE}`;
  try {
    let current = "", sha;
    const getRes = await fetch(url, { headers });
    if (getRes.ok) {
      const data = await getRes.json();
      current = b64Decode(data.content.replace(/\n/g, ""));
      sha = data.sha;
    } else if (getRes.status !== 404) {
      throw new Error(`GET ${getRes.status}`);
    }
    const putRes = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `log: attempt ${attempt}${isFinal ? " (final)" : ""}`,
        content: b64Encode(current + entry),
        ...(sha && { sha }),
      }),
    });
    if (!putRes.ok) throw new Error(`PUT ${putRes.status}`);
    console.log("✅ Logged to repo");
  } catch (err) {
    console.error("❌ Repo log failed:", err);
  }
}

function fireConfettiBurst() {
  const colors = ["#f6d365", "#fda085", "#ff6b9d", "#c44dff", "#ffd700", "#6bcb77"];
  const end = Date.now() + CONFETTI_MS;
  const shoot = () => {
    confetti({ particleCount: 9, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors });
    confetti({ particleCount: 9, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors });
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

// ── FlipCard ──────────────────────────────────────────────────────────────────
function FlipCard({ prize, disabled, onReveal, resetToken, isChosen }) {
  const [flipped, setFlipped] = useState(false);

  // Reset when a new round starts
  useEffect(() => {
    setFlipped(false);
  }, [resetToken]);

  const handleTap = () => {
    if (disabled || flipped) return;
    setFlipped(true);
    onReveal();
  };

  return (
    <div
      onClick={handleTap}
      style={{ perspective: "700px" }}
      className={[
        "aspect-square select-none",
        disabled && !isChosen ? "opacity-30 pointer-events-none" : "cursor-pointer",
        !disabled && !flipped ? "active:scale-95" : "",
        "transition-transform duration-100",
      ].join(" ")}
    >
      {/* 3-D container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: flipped ? `transform ${FLIP_MS}ms cubic-bezier(0.4,0.15,0.2,1)` : "none",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ── Front face (gold) ── */}
        <div
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          className="absolute inset-0 rounded-2xl overflow-hidden flex items-center justify-center
                     bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 shadow-md"
        >
          <div className="card-shimmer" />
          <div className="relative z-10 flex flex-col items-center gap-1.5 px-2 text-center">
            <span className="text-3xl drop-shadow">🪙</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/90 drop-shadow-sm leading-tight">
              Tap to reveal
            </span>
          </div>
        </div>

        {/* ── Back face (prize) ── */}
        <div
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          className={[
            "absolute inset-0 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-2 text-center shadow-md border-2",
            isChosen
              ? "bg-gradient-to-br from-rose-50 via-white to-amber-50 border-rose-300"
              : "bg-white border-slate-100",
          ].join(" ")}
        >
          <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-rose-400 mb-1.5">
            Prize ✨
          </span>
          <span className="text-[10.5px] font-bold leading-[1.35] text-slate-800">
            {prize}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ScratchPrizeSite() {
  const [state, setState] = useState(() => loadState());
  const [resetToken, setResetToken] = useState(0);
  const [showingConfetti, setShowingConfetti] = useState(false);

  const isLockedRef = useRef(state.locked);
  isLockedRef.current = state.locked;

  // Don't fire confetti on initial page load (only on new reveals)
  const isFirstMount = useRef(true);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    // Skip the very first render so reloading the page doesn't replay confetti
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (!state.roundComplete) return;

    // Wait for the flip animation to finish, then show confetti
    const flipWait = setTimeout(() => {
      fireConfettiBurst();
      setShowingConfetti(true);
    }, FLIP_MS + 50);

    // After confetti, advance to next attempt (or stay on locked screen)
    const advance = setTimeout(() => {
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
    }, FLIP_MS + 50 + CONFETTI_MS);

    return () => {
      clearTimeout(flipWait);
      clearTimeout(advance);
    };
  }, [state.roundComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReveal = (index) => {
    if (state.roundComplete || state.locked) return;
    const prize = state.board[index];
    const nextHistory = [...state.history, prize];
    const isFinal = state.attempt >= MAX_ATTEMPTS;
    setState({ ...state, roundComplete: true, revealedIndex: index, revealedPrize: prize, history: nextHistory, locked: isFinal });
    logToRepo({ prize, attempt: state.attempt, isFinal, history: nextHistory, usedAt: new Date().toISOString() });
  };

  const startOverForTesting = () => {
    confetti.reset();
    setShowingConfetti(false);
    isFirstMount.current = false;
    const fresh = createFreshBoard();
    setState(fresh);
    setResetToken((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-100 via-orange-50 to-white">

      {/* ── Header ── */}
      <div className="max-w-md mx-auto px-4 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center text-xl shadow-md">
            🪙
          </div>
          <div>
            <h1 className="text-[17px] font-extrabold tracking-tight leading-tight text-slate-900">
              Scratch & Reveal
            </h1>
            <p className="text-[11px] text-slate-500 leading-tight">
              {state.locked
                ? "Prize locked 💝"
                : `Attempt ${state.attempt} of ${MAX_ATTEMPTS} — tap a card`}
            </p>
          </div>
        </div>
        <div className={`text-xs font-bold rounded-full px-3 py-1 shrink-0 ${
          state.locked ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-700"
        }`}>
          {state.locked ? "Done ✅" : `${state.attempt} / ${MAX_ATTEMPTS}`}
        </div>
      </div>

      {/* ── Card grid ── */}
      <div className="max-w-md mx-auto px-3">
        <div className="grid grid-cols-3 gap-2">
          {state.board.map((prize, index) => (
            <FlipCard
              key={`${resetToken}-${index}`}
              prize={prize}
              resetToken={resetToken}
              isChosen={state.revealedIndex === index}
              disabled={state.roundComplete && state.revealedIndex !== index}
              onReveal={() => handleReveal(index)}
            />
          ))}
        </div>
      </div>

      {/* ── Reveal history ── */}
      {state.history.length > 0 && (
        <div className="max-w-md mx-auto px-3 mt-4">
          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400 mb-2">
              Reveal history
            </p>
            {state.history.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0"
              >
                <span className="text-[11px] font-bold text-slate-300 shrink-0 mt-px">#{idx + 1}</span>
                <span className="text-[12px] text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Testing reset ── */}
      <div className="max-w-md mx-auto px-3 mt-3 pb-8 text-center">
        <button
          onClick={startOverForTesting}
          className="text-[11px] text-slate-300 py-2 bg-transparent border-none shadow-none active:text-slate-400"
        >
          Reset everything (testing only)
        </button>
      </div>

      {/* ── Confetti overlay — appears after flip, lasts 3 s ── */}
      {showingConfetti && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/85 px-6 text-center backdrop-blur-sm">
          <div className="text-7xl mb-5 animate-bounce">
            {state.locked ? "🎉" : "✨"}
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-rose-300 mb-3">
            {state.locked ? "Your final prize!" : `Attempt ${state.attempt} of ${MAX_ATTEMPTS}`}
          </p>
          <p className="text-3xl font-extrabold text-white leading-snug max-w-[280px]">
            {state.revealedPrize}
          </p>
          <p className="mt-8 text-[12px] text-white/40">
            {state.locked ? "Saved forever 💝" : "Next attempt coming up…"}
          </p>
        </div>
      )}

      {/* ── Final locked screen ── */}
      {state.locked && !showingConfetti && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[340px] rounded-[32px] bg-white p-8 text-center shadow-2xl">
            <div className="text-5xl mb-4">🎁</div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-rose-400 mb-2">
              Your final prize
            </p>
            <p className="text-2xl font-extrabold leading-tight text-slate-900 mb-5">
              {state.revealedPrize}
            </p>
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-[13px] text-slate-600 mb-5">
              This prize has been saved. Refreshing won't change it.
            </p>
            <button
              onClick={startOverForTesting}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-[13px] font-semibold text-slate-500 bg-white active:scale-[0.98] transition-transform"
            >
              Reset everything (testing only)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
