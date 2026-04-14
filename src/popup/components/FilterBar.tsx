import {
  DATE_RANGE_OPTIONS,
  type DateRange,
  type FilterState,
} from '../../lib/filters';

interface Props {
  state: FilterState;
  repos: string[];
  labels: string[];
  onChange: (state: FilterState) => void;
}

export function FilterBar({ state, repos, labels, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 text-[11px] text-gh-fg-muted">
      <Select
        label="Repo"
        value={state.repo ?? ''}
        options={[{ value: '', label: 'All repos' }, ...repos.map((r) => ({ value: r, label: r }))]}
        onChange={(v) => onChange({ ...state, repo: v || null })}
      />
      <Select
        label="Label"
        value={state.label ?? ''}
        options={[{ value: '', label: 'All labels' }, ...labels.map((l) => ({ value: l, label: l }))]}
        onChange={(v) => onChange({ ...state, label: v || null })}
      />
      <Select
        label="Date"
        value={state.range}
        options={DATE_RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        onChange={(v) => onChange({ ...state, range: v as DateRange })}
      />
    </div>
  );
}

interface SelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function Select({ label, value, options, onChange }: SelectProps) {
  return (
    <label className="flex items-center gap-1">
      <span className="text-gh-fg-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-1 py-0.5 text-[11px] text-gh-fg-default outline-none focus:border-gh-accent-emphasis"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
