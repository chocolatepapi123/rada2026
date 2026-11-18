/**
 * Real posters shipped with the app (public/posters). Keys are titleKey() of the film title,
 * so "Moana", "Moana (2026)" and "MOANA 3D" all match. Used when a listing has no poster of its own
 * (and as a backup if its poster link fails to load).
 */
export const LOCAL_POSTERS: Record<string, string> = {
  'project hail mary': '/posters/project-hail-mary.jpg',
  'toy story 5': '/posters/toy-story-5.jpg',
  'moana': '/posters/moana.jpg',
  'reminders of him': '/posters/reminders-of-him.jpg',
};
