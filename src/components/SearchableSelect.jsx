import React, { useState, useEffect, useRef } from 'react';

export function SearchableSelect({ options, value, onChange, placeholder = "Search..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);
  
  // Update internal search term when a valid item is selected via props or close
  useEffect(() => {
     if (!isOpen && selectedOption) {
        setSearchTerm(selectedOption.label);
     }
  }, [value, isOpen, selectedOption]);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div 
        className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-lg px-3 py-2.5 flex items-center shadow-sm cursor-text focus-within:ring-2 focus-within:ring-primary/40 transition-shadow"
        onClick={() => setIsOpen(true)}
      >
        <span className="material-symbols-outlined text-primary text-[18px] mr-2">search</span>
        <input 
          type="text"
          value={isOpen ? searchTerm : (selectedOption ? selectedOption.label : searchTerm)}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          onClick={(e) => e.target.select()} // Auto-select text on click for immediate typing
          className="w-full bg-transparent outline-none text-sm font-bold text-on-surface placeholder:font-normal placeholder:text-on-surface-variant/60"
        />
        <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-surface dark:bg-surface-container border border-outline-variant/30 rounded-xl shadow-2xl shadow-black/20 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <ul className="max-h-[280px] overflow-y-auto overscroll-contain">
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-4 text-sm text-on-surface-variant text-center opacity-70">
                No matching user found...
              </li>
            ) : (
              filteredOptions.map((opt) => (
                <li 
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setSearchTerm(opt.label);
                    setIsOpen(false);
                  }}
                  className={`px-4 py-3 text-sm font-medium cursor-pointer transition-colors border-b border-outline-variant/10 last:border-0 hover:bg-primary/5 active:bg-primary/20 ${value === opt.value ? 'bg-primary text-on-primary font-bold' : 'text-on-surface'}`}
                >
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
