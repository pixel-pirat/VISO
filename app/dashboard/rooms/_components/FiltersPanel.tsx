"use client";

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

export function FiltersPanel({ filters, onChange }: FiltersPanelProps) {
  return (
    <aside className="w-[200px] shrink-0 h-full overflow-y-auto bg-[#0e0e10] border-l border-neutral-800/60 px-4 py-4 scrollbar-hide">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white font-sans">Filters</h3>
        <button
          onClick={() => onChange({ type: "all", privacy: "all", search: "" })}
          className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold font-sans transition-colors"
        >
          Reset
        </button>
      </div>

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
    </aside>
  );
}
