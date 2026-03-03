import React, { useEffect, useMemo, useRef, useState } from "react";

const PRIZES = [
  "A pampering massage evening 💆",
  "A jacuzzi evening 🛁",
  "Purim costume party night 🎭",
  "Homemade sushi evening 🍣",
  "Elegant cooking evening 👩‍🍳",
  "A movie evening — but fully invested 🎬",
  "Recreating the last night in Jerusalem ✨",
  "A pampering massage evening 💆",
  "A jacuzzi evening 🛁",
];

const MAX_ATTEMPTS = 3;
const STORAGE_KEY = "romantic-scratch-board-v1";

// Replace this with your own webhook URL if you want a message/email after every reveal.
// The website will POST JSON like:
// { prize, attempt, isFinal, history, usedAt }
const NOTIFICATION_ENDPOINT = "";

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
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

async function notifyOwner(payload) {
  if (!NOTIFICATION_ENDPOINT) return;
  try {
    await fetch(NOTIFICATION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Notification failed", error);
  }
}

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
    for (let i = 0; i < 8; i += 1) {
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
    ctx.font = "700 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Scratch me", rect.width / 2, rect.height / 2 - 10);
    ctx.font = "500 12px sans-serif";
    ctx.fillText("🪙 Use your finger like a coin", rect.width / 2, rect.height / 2 + 16);
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
    ctx.arc(x, y, 22, 0, Math.PI * 2);
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
        if (alpha < 80) transparent += 1;
        total += 1;
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
      className={`relative aspect-square overflow-hidden rounded-3xl border border-white/60 bg-white shadow-lg transition ${
        isChosen ? "ring-4 ring-pink-300" : ""
      } ${disabled && !isChosen ? "opacity-60" : ""}`}
    >
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 p-3 text-center">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-rose-400">
            Surprise prize
          </div>
          <div className="text-sm font-bold leading-5 text-slate-800">{prize}</div>
        </div>
      </div>

      {!alreadyRevealedRef.current && (
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full touch-none ${disabled ? "pointer-events-none" : ""}`}
          onPointerDown={(e) => {
            if (disabled) return;
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
          onPointerLeave={() => {
            if (!isScratchingRef.current) return;
            isScratchingRef.current = false;
            maybeReveal();
          }}
        />
      )}
    </div>
  );
}

export default function ScratchPrizeSite() {
  const [state, setState] = useState(() => loadState());
  const [resetToken, setResetToken] = useState(0);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const subtitle = useMemo(() => {
    if (state.locked) return "Used already — refreshing will not change the result.";
    return `Attempt ${state.attempt} of ${MAX_ATTEMPTS}. Scratch just one square.`;
  }, [state.attempt, state.locked]);

  const handleReveal = async (index) => {
    if (state.roundComplete || state.locked) return;

    const prize = state.board[index];
    const nextHistory = [...state.history, prize];
    const isFinal = state.attempt >= MAX_ATTEMPTS;

    const nextState = {
      ...state,
      roundComplete: true,
      revealedIndex: index,
      revealedPrize: prize,
      history: nextHistory,
      locked: isFinal,
    };

    setState(nextState);

    await notifyOwner({
      prize,
      attempt: state.attempt,
      isFinal,
      history: nextHistory,
      usedAt: new Date().toISOString(),
    });
  };

  const goToNextAttempt = () => {
    if (!state.roundComplete || state.locked) return;
    setState({
      ...state,
      attempt: state.attempt + 1,
      board: shuffle(PRIZES),
      roundComplete: false,
      revealedIndex: null,
      revealedPrize: null,
    });
    setResetToken((x) => x + 1);
  };

  const startOverForTesting = () => {
    const fresh = createFreshBoard();
    setState(fresh);
    setResetToken((x) => x + 1);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-100 via-orange-50 to-white text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-10 pt-6">
        <div className="mb-4 rounded-[28px] border border-white/70 bg-white/75 p-5 shadow-xl backdrop-blur">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-2xl shadow-md">
              🪙
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Scratch & Reveal</h1>
              <p className="text-sm text-slate-600">{subtitle}</p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-slate-700">
            Pick one square, scratch it, and reveal your surprise. After the third reveal, the final result is locked.
          </div>
        </div>

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

        <div className="mt-5 rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur">
          <div className="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-rose-400">
            Reveal history
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            {state.history.length === 0 ? (
              <div>No prizes revealed yet.</div>
            ) : (
              state.history.map((item, idx) => (
                <div key={`${item}-${idx}`} className="rounded-2xl bg-slate-50 px-3 py-2">
                  <span className="font-semibold">Try {idx + 1}:</span> {item}
                </div>
              ))
            )}
          </div>

          {!NOTIFICATION_ENDPOINT && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Notifications are not connected yet. Add your webhook URL at the top of the file to receive a message or email after each reveal.
            </div>
          )}
        </div>

        {state.roundComplete && (
          <div className="fixed inset-0 z-30 flex items-end justify-center bg-slate-900/45 px-4 pb-4 pt-10 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[32px] bg-white p-6 shadow-2xl">
              <div className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-rose-400">
                {state.locked ? "Final prize" : "You revealed"}
              </div>
              <div className="text-2xl font-extrabold leading-tight text-slate-900">
                {state.revealedPrize}
              </div>

              <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-slate-700">
                {state.locked
                  ? "This is the final prize. Do not try to refresh — the site already saved that it was used."
                  : `Nice. You still have ${MAX_ATTEMPTS - state.attempt} attempt${
                      MAX_ATTEMPTS - state.attempt === 1 ? "" : "s"
                    } left.`}
              </div>

              <div className="mt-5 flex flex-col gap-3">
                {!state.locked ? (
                  <button
                    onClick={goToNextAttempt}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-md active:scale-[0.99]"
                  >
                    Reset board for attempt {state.attempt + 1}
                  </button>
                ) : (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                    Used already ✅
                  </div>
                )}

                <button
                  onClick={startOverForTesting}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  Reset everything (testing only)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
