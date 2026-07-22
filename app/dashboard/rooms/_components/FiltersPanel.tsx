"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { RoomFilters } from "../page";

interface FiltersPanelProps {
  filters: RoomFilters;
  onChange: (f: RoomFilters) => void;
}

type RadioItem = { label: string; value: string };

function FilterGroup({
  title,
  items,
  value,
  onChange,
}: {
  title: string;
  items: RadioItem[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 font-sans mb-2">{title}</p>
      <div className="space-y-1.5">
        {items.map((item) => (
          <button
            key={item.value}
            onClick={() => onChange(item.value)}
            className="flex items-center gap-2.5 w-full text-left group"
          >
            <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              value === item.value
                ? "border-violet-500 bg-violet-500"
                : "border-neutral-600 group-hover:border-neutral-400"
            }`}>
              {value === item.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <span className={`text-xs font-sans transition-colors ${
              value === item.value ? "text-white font-semibold" : "text-neutral-500 group-hover:text-neutral-300"
            }`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FiltersBody({ filters, onChange }: FiltersPanelProps) {
  return (
    <>
      <FilterGroup
        title="Room Type"
        value={filters.type}
        onChange={(v) => onChange({ ...filters, type: v as RoomFilters["type"] })}
        items={[
          { label: "All types",      value: "all" },
          { label: "Live",           value: "live" },
          { label: "Upcoming",       value: "upcoming" },
          { label: "Friend's Room",  value: "friends" },
          { label: "My Rooms",       value: "mine" },
        ]}
      />

      <FilterGroup
        title="Privacy"
        value={filters.privacy}
        onChange={(v) => onChange({ ...filters, privacy: v as RoomFilters["privacy"] })}
        items={[
          { label: "All",     value: "all" },
          { label: "Public",  value: "public" },
          { label: "Private", value: "private" },
        ]}
      />
    </>
  );
}

// A filter is "active" (worth badging the mobile trigger) when it's not the default
function activeCount(filters: RoomFilters) {
  return (filters.type !== "all" ? 1 : 0) + (filters.privacy !== "all" ? 1 : 0);
}

export function FiltersPanel({ filters, onChange }: FiltersPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = activeCount(filters);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:block w-[200px] shrink-0 h-full overflow-y-auto bg-[#0e0e10] border-l border-neutral-800/60 px-4 py-4 scrollbar-hide">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white font-sans">Filters</h3>
          <button
            onClick={() => onChange({ type: "all", privacy: "all", search: "" })}
            className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold font-sans transition-colors"
          >
            Reset
          </button>
        </div>
        <FiltersBody filters={filters} onChange={onChange} />
      </aside>

      {/* ── Mobile floating trigger — sits just above the bottom tab bar ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed right-4 z-30 flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-full text-xs font-bold text-white shadow-lg shadow-violet-500/30 transition-colors font-sans"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 76px)" }}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
        {active > 0 && (
          <span className="w-4 h-4 rounded-full bg-white text-violet-600 text-[9px] font-bold flex items-center justify-center">{active}</span>
        )}
      </button>

      {/* ── Mobile bottom sheet ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative bg-[#0e0e10] border-t border-neutral-800/60 rounded-t-2xl max-h-[75vh] overflow-y-auto scrollbar-hide px-4 pb-6">
            <div className="w-10 h-1 rounded-full bg-neutral-700 mx-auto mt-3 mb-2" />
            <div className="flex items-center justify-between py-3">
              <h3 className="text-sm font-bold text-white font-sans">Filters</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onChange({ type: "all", privacy: "all", search: "" })}
                  className="text-[11px] text-violet-400 hover:text-violet-300 font-semibold font-sans transition-colors"
                >
                  Reset
                </button>
                <button onClick={() => setMobileOpen(false)}
                  className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors">
                  <X className="w-3.5 h-3.5 text-neutral-400" />
                </button>
              </div>
            </div>
            <FiltersBody filters={filters} onChange={onChange} />
            <button onClick={() => setMobileOpen(false)}
              className="w-full mt-2 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-bold text-white transition-colors font-sans">
              Show Results
            </button>
          </div>
        </div>
      )}
    </>
  );
}
