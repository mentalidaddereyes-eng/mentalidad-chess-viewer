import React from "react";

type Props = {
  title?: string;
};

export default function ChessComHeader({ title = "GM Trainer – Mentalidad de Reyes" }: Props) {
  return (
    <header
      className="w-full sticky top-0 z-40 border-b border-black/40 bg-[#0f1a17]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0f1a17]/75"
      role="banner"
    >
      <div className="mx-auto max-w-[1400px] px-4 h-14 flex items-center gap-3">
        <img
          src="/src/styles/assets/logo reducido.jpg"
          alt="Mentalidad de Reyes"
          className="h-10 w-10 rounded-lg object-contain ring-1 ring-black/30 shadow"
          draggable={false}
        />
        <h1 className="text-[15px] font-semibold tracking-wide text-[#e4e2cf]">
          {title}
        </h1>

        <div className="ml-auto flex items-center gap-2">
          {/* Botón de mute/voz (placeholder; se conectará al hook si aplica) */}
          <button
            id="voice-toggle"
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-black/30 text-[#e4e2cf] hover:bg-black/40 transition"
            aria-pressed="false"
          >
            Silenciar Coach
          </button>
        </div>
      </div>
    </header>
  );
}
