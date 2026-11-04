// RADA milestones: earned from things the app already knows about the person.
// Edit this list to add, remove or re-tune milestones. Nothing here is stored: it is recomputed each time.
export interface MilestoneInput {
  signedIn: boolean;
  hasAvatar: boolean;
  hasBio: boolean;
  hasUsername: boolean;
  savedCount: number;
  hostedCount: number;
  ticketCount: number;
  businessCount: number;
  isVerified: boolean;
  isCreator: boolean;
}

export type MilestoneIcon =
  | 'sparkles' | 'user' | 'bookmark' | 'trophy' | 'ticket' | 'store' | 'shield' | 'crown' | 'calendar';

export interface Milestone {
  id: string;
  title: string;
  hint: string;
  icon: MilestoneIcon;
  color: string; // pastel circle behind the icon
  progress: number; // 0..1
  current: number;
  target: number;
  earned: boolean;
}

const make = (
  id: string, title: string, hint: string, icon: MilestoneIcon, color: string, current: number, target: number,
): Milestone => ({
  id, title, hint, icon, color,
  current: Math.min(current, target),
  target,
  progress: Math.max(0, Math.min(1, current / target)),
  earned: current >= target,
});

export const computeMilestones = (i: MilestoneInput): Milestone[] => [
  make('joined', 'Joined RADA', 'Sign in to your account', 'sparkles', '#F9D6CE', i.signedIn ? 1 : 0, 1),
  make('profile', 'Profile pro', 'Add a photo, @username and bio', 'user', '#D9EFE3',
    [i.hasAvatar, i.hasBio, i.hasUsername].filter(Boolean).length, 3),
  make('first-save', 'First save', 'Save your first spot or event', 'bookmark', '#FBEBC4', i.savedCount, 1),
  make('collector', 'Collector', 'Save 10 spots or events', 'trophy', '#E4DAF7', i.savedCount, 10),
  make('vault', 'Ticket keeper', 'Keep a ticket in your Vault', 'ticket', '#D6E6FA', i.ticketCount, 1),
  make('host', 'Outing host', 'Host your first outing', 'calendar', '#FAD9E4', i.hostedCount, 1),
  make('verified', 'Verified', 'Complete liveness verification', 'shield', '#CDEFEA', i.isVerified ? 1 : 0, 1),
  make('merchant', 'Business owner', 'Create a business on RADA', 'store', '#F6E2C8', i.businessCount, 1),
  make('creator', 'Creator', 'Switch to a professional account', 'crown', '#F9E3A8', i.isCreator ? 1 : 0, 1),
];
