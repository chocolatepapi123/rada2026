// Professional (Personal Brand / Creator) account model + local persistence.
// The approval status is meant to be flipped to 'approved' by an admin / backend.
// Until your backend stores it, this keeps the record in localStorage so the UI works end-to-end.

export type ProfessionalStatus = 'none' | 'pending' | 'approved';
export type ProfessionalKind = 'personal_brand' | 'creator';

export interface ProfessionalAccount {
  status: ProfessionalStatus;
  kind: ProfessionalKind;
  category: string;
  brandName: string;
  contactEmail: string;
  website: string;
  appliedAt?: string;
  approvedAt?: string;
}

export const EMPTY_PROFESSIONAL: ProfessionalAccount = {
  status: 'none',
  kind: 'personal_brand',
  category: '',
  brandName: '',
  contactEmail: '',
  website: '',
};

export const PROFESSIONAL_CATEGORIES = [
  'DJ / Artist',
  'Event Host',
  'Content Creator',
  'Photographer / Videographer',
  'Fitness / Outdoors Guide',
  'Food & Lifestyle',
  'Other',
];

const keyFor = (id: string) => `rada_professional_account_${id}`;

export function loadProfessionalAccount(id?: string | null): ProfessionalAccount {
  if (!id || typeof window === 'undefined') return EMPTY_PROFESSIONAL;
  try {
    const raw = localStorage.getItem(keyFor(id));
    return raw ? { ...EMPTY_PROFESSIONAL, ...JSON.parse(raw) } : EMPTY_PROFESSIONAL;
  } catch {
    return EMPTY_PROFESSIONAL;
  }
}

export function saveProfessionalAccount(id: string | null | undefined, data: ProfessionalAccount) {
  if (!id || typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(id), JSON.stringify(data));
  } catch {
    /* storage unavailable */
  }
}
