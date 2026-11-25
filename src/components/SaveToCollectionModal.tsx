import React, { useState } from 'react';
import { X, Bookmark, Folder, Plus, Check, Trash2 } from 'lucide-react';
import { CollectionFolder } from '../types.ts';
import { CategoryIcon, FOLDER_ICON_KEYS } from './CategoryIcon';

export interface SaveTargetInfo {
  item: any;
  kind: 'spot' | 'event' | 'offer' | 'thrift';
  title: string;
  subtitle?: string;
  image?: string;
}

interface SaveToCollectionModalProps {
  target: SaveTargetInfo | null;
  isAlreadySaved: boolean;
  currentFolderId?: string;
  folders: CollectionFolder[];
  onClose: () => void;
  onSaveToFolder: (folderId: string | undefined) => void;
  onCreateAndSave: (name: string, emoji: string) => void;
  onRemoveFromSaved: () => void;
}

export const SaveToCollectionModal: React.FC<SaveToCollectionModalProps> = ({
  target,
  isAlreadySaved,
  currentFolderId,
  folders,
  onClose,
  onSaveToFolder,
  onCreateAndSave,
  onRemoveFromSaved,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(currentFolderId);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState<string>('heart');

  if (!target) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingNew) {
      if (!newName.trim()) return;
      onCreateAndSave(newName.trim(), newEmoji);
    } else {
      onSaveToFolder(selectedFolderId);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[180] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-[#1C1A1E] text-slate-900 dark:text-slate-100 rounded-t-[2rem] sm:rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {target.image ? (
              <img src={target.image} alt="" className="w-11 h-11 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-[#E0533C]/10 text-[#E0533C] flex items-center justify-center shrink-0">
                <Bookmark className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#E0533C]">
                {isAlreadySaved ? 'Update Collection' : 'Save to Collection'}
              </p>
              <h3 className="text-sm font-black truncate">{target.title}</h3>
              {target.subtitle && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{target.subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-5 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Choose a collection folder
              </span>
              <button
                type="button"
                onClick={() => setCreatingNew((v) => !v)}
                className="text-xs font-black text-[#E0533C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{creatingNew ? 'Use existing' : 'New collection'}</span>
              </button>
            </div>

            {!creatingNew ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(undefined)}
                  className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                    selectedFolderId === undefined
                      ? 'bg-[#E0533C]/10 border-[#E0533C] text-slate-900 dark:text-white'
                      : 'bg-[#F8F8F6] dark:bg-[#121113] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 flex items-center justify-center shrink-0">
                      <Bookmark className="w-4 h-4 text-[#E0533C]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-black">All Saved (No Folder)</span>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400">Save to your general list</span>
                    </span>
                  </span>
                  {selectedFolderId === undefined && <Check className="w-4 h-4 text-[#E0533C] shrink-0" />}
                </button>

                {folders.map((folder) => {
                  const active = selectedFolderId === folder.id;
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                        active
                          ? 'bg-[#E0533C]/10 border-[#E0533C] text-slate-900 dark:text-white'
                          : 'bg-[#F8F8F6] dark:bg-[#121113] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#E0533C]/40'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 flex items-center justify-center shrink-0">
                          <CategoryIcon name={folder.emoji} className="w-4 h-4 text-amber-500" />
                        </span>
                        <span className="text-xs font-black truncate">{folder.name}</span>
                      </span>
                      {active && <Check className="w-4 h-4 text-[#E0533C] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[#F8F8F6] dark:bg-[#121113] border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-10 h-10 rounded-xl bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                    <CategoryIcon name={newEmoji} className="w-5 h-5 text-[#E0533C]" />
                  </span>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Sunday Chill, Date Nights"
                    className="flex-1 min-h-[44px] px-3 py-2 text-xs font-semibold bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#E0533C]"
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
                  {FOLDER_ICON_KEYS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setNewEmoji(em)}
                      className={`p-2 rounded-xl transition shrink-0 cursor-pointer ${
                        newEmoji === em
                          ? 'bg-orange-100 dark:bg-orange-950 ring-2 ring-[#E0533C]'
                          : 'bg-white dark:bg-[#1C1A1E] hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <CategoryIcon name={em} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            {isAlreadySaved && (
              <button
                type="button"
                onClick={() => {
                  onRemoveFromSaved();
                  onClose();
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove</span>
              </button>
            )}
            <button
              type="submit"
              disabled={creatingNew && !newName.trim()}
              className="flex-1 min-h-[44px] py-2.5 px-4 rounded-2xl bg-[#E0533C] hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-black shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Folder className="w-4 h-4" />
              <span>{creatingNew ? 'Create & Save' : isAlreadySaved ? 'Save Changes' : 'Save Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
