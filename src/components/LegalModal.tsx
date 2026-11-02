import React from 'react';
import { X } from 'lucide-react';
import legal from '../data/legal.json';

/** Bump the version in src/data/legal.json whenever any legal text changes. It is saved with every signup. */
export const LEGAL_VERSION: string = legal.version;

/**
 * Set to false once the advocate has signed off on the text in src/data/legal.json.
 * While true, a small "draft" label is shown at the top of every document.
 */
export const LEGAL_IS_DRAFT = true;

export const SUPPORT_EMAIL: string = legal.support_email;

export type LegalDoc = 'terms' | 'privacy' | 'guidelines' | 'merchant';

interface LegalModalProps {
  doc: LegalDoc | null;
  onClose: () => void;
}

interface Section {
  h: string;
  p?: string[];
  li?: string[];
}
interface DocShape {
  title: string;
  intro: string[];
  sections: Section[];
}

export function LegalModal({ doc, onClose }: LegalModalProps) {
  if (!doc) return null;
  const content = (legal.docs as Record<string, DocShape>)[doc];
  if (!content) return null;
  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={content.title}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[88vh] flex flex-col bg-stone-900 text-white rounded-t-3xl sm:rounded-3xl border border-stone-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-stone-800">
          <div>
            <h2 className="text-lg font-black">{content.title}</h2>
            <p className="text-[10px] text-stone-500 font-semibold">
              Version {LEGAL_VERSION}
              {LEGAL_IS_DRAFT ? ' · Draft pending legal review' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-6 pt-3">
          {content.intro.map((t, i) => (
            <p key={i} className="text-xs text-stone-300 leading-relaxed mb-2">{t}</p>
          ))}
          {content.sections.map((s) => (
            <section key={s.h}>
              <h3 className="text-sm font-black text-white mt-5 mb-1.5">{s.h}</h3>
              {s.p?.map((t, i) => (
                <p key={i} className="text-xs text-stone-300 leading-relaxed mb-2">{t}</p>
              ))}
              {s.li && (
                <ul>
                  {s.li.map((t, i) => (
                    <li key={i} className="text-xs text-stone-300 leading-relaxed mb-1 ml-4 list-disc">{t}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
