import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CategoryItem {
  id: string;
  nameKhmer: string;
  nameEnglish?: string;
  parentId?: string | null;
  code?: string;
}

interface CompactCategorySelectProps {
  categories: CategoryItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  allowAllOption?: boolean;
  allOptionLabel?: string;
  className?: string;
  required?: boolean;
}

export const CompactCategorySelect: React.FC<CompactCategorySelectProps> = ({
  categories,
  value,
  onChange,
  placeholder = '-- 📚 ជ្រើសរើសដេប៉ាតឺម៉ង់ --',
  allowAllOption = false,
  allOptionLabel = '-- 📚 គ្រប់ដេប៉ាតឺម៉ង់ទាំងអស់ --',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const faculties = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories]
  );

  const selectedLabel = useMemo(() => {
    if (!value) {
      return allowAllOption ? allOptionLabel : placeholder;
    }
    const found = categories.find((c) => c.id === value);
    if (!found) return placeholder;
    if (!found.parentId) {
      return `🏛️ ${found.nameKhmer} (ទូទៅ)`;
    }
    return `↳ ${found.nameKhmer}`;
  }, [value, categories, allowAllOption, allOptionLabel, placeholder]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white flex items-center justify-between gap-1.5 text-left font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-duc-blue cursor-pointer"
      >
        <span className="truncate text-slate-800">{selectedLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 sm:max-h-72 overflow-y-auto text-[11px] sm:text-xs divide-y divide-slate-100 animate-fadeIn">
          {allowAllOption && (
            <div
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`px-3 py-2 font-bold cursor-pointer hover:bg-blue-50 transition flex items-center justify-between ${
                !value ? 'text-duc-blue bg-blue-50 font-black' : 'text-slate-700'
              }`}
            >
              <span>{allOptionLabel}</span>
              {!value && <Check className="w-3.5 h-3.5 text-duc-blue shrink-0" />}
            </div>
          )}

          {faculties.map((faculty) => {
            const depts = categories.filter((c) => c.parentId === faculty.id);
            const isFacultySelected = value === faculty.id;
            return (
              <div key={faculty.id} className="py-0.5">
                {/* Faculty Header */}
                <div
                  onClick={() => {
                    onChange(faculty.id);
                    setIsOpen(false);
                  }}
                  className={`px-2.5 py-1.5 font-bold cursor-pointer hover:bg-blue-50 transition flex items-center justify-between ${
                    isFacultySelected
                      ? 'text-duc-blue bg-blue-50 font-black'
                      : 'text-slate-800 bg-slate-50/70'
                  }`}
                >
                  <span className="flex items-center gap-1 truncate text-xs">
                    <span>🏛️</span>
                    <span className="truncate">{faculty.nameKhmer}</span>
                    <span className="text-[10px] text-slate-400 font-normal shrink-0">
                      (ទូទៅ)
                    </span>
                  </span>
                  {isFacultySelected && (
                    <Check className="w-3.5 h-3.5 text-duc-blue shrink-0" />
                  )}
                </div>

                {/* Departments */}
                <div className="space-y-0.5">
                  {depts.map((d) => {
                    const isDeptSelected = value === d.id;
                    return (
                      <div
                        key={d.id}
                        onClick={() => {
                          onChange(d.id);
                          setIsOpen(false);
                        }}
                        className={`pl-5 pr-3 py-1 cursor-pointer hover:bg-blue-50 transition flex items-center justify-between text-[11px] sm:text-xs ${
                          isDeptSelected
                            ? 'text-duc-blue bg-blue-50/80 font-bold'
                            : 'text-slate-600'
                        }`}
                      >
                        <span className="truncate">↳ {d.nameKhmer}</span>
                        {isDeptSelected && (
                          <Check className="w-3 h-3 text-duc-blue shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

