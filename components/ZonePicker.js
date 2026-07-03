import { useState, useEffect, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ZonePicker({ value, onChange, placeholder = 'Select city / zone' }) {
  const [options, setOptions] = useState([]);
  const [search, setSearch] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    fetchOptions();
    // Close dropdown on outside click
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setSearch(value || '');
  }, [value]);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/zones`);
      const data = await r.json();
      setOptions(data);
    } catch {} finally { setLoading(false); }
  };

  const filtered = options.filter(o =>
    (o.label || '').toLowerCase().includes(search.toLowerCase())
  );

  const select = (label) => {
    setSearch(label);
    onChange(label);
    setOpen(false);
  };

  const handleInput = (e) => {
    setSearch(e.target.value);
    onChange(e.target.value); // allow free text too
    setOpen(true);
  };

  return (
    <div className="relative" ref={ref}>
      <input
        className="input"
        value={search}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {loading && <p className="text-xs text-gray-400 px-3 py-2">Loading…</p>}
          {!loading && filtered.length === 0 && (
            <div className="px-3 py-2">
              <p className="text-xs text-gray-400 mb-1">No match — you can type your own:</p>
              <button onClick={() => select(search)}
                className="text-sm text-primary font-medium hover:underline">
                Use "{search}"
              </button>
            </div>
          )}
          {filtered.map(opt => (
            <button key={opt.id} onClick={() => select(opt.label)}
              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-purple-50 hover:text-primary transition-colors
                ${search === opt.label ? 'bg-purple-50 text-primary font-medium' : 'text-gray-700'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}