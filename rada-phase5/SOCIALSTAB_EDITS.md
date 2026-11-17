# 4 small edits to src/components/SocialsTab.tsx
(Not shipped as a full file, so your Phase 4 changes are not overwritten.)

1. Add under the featureFlags import:
   import GroupsSection from './GroupsSection.tsx';
2. In the subtab useState type, add `'groups'`:
   useState<'discover' | 'queue' | 'chats' | 'groups' | 'search'>
3. In the tab list, add after the Chats entry:
   { id: 'groups', label: 'Groups' },
4. Just before `{subtab === 'chats' && (` add:
   {subtab === 'groups' && (<GroupsSection signedIn={Boolean(myUserId)} showToast={showToast} />)}
