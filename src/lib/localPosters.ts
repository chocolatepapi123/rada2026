import { titleKey } from './cinemaProviders.ts';

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
  'avengers doomsday': '/posters/avengers-doomsday.jpg',
  'avengers doomsday infinity vision': '/posters/avengers-doomsday.jpg',
  'dune part three': '/posters/dune-part-three.webp',
  'the cat in the hat': '/posters/cat-in-the-hat.png',
  'cat in the hat': '/posters/cat-in-the-hat.png',
  'the mandalorian and grogu': '/posters/mandalorian-grogu.jpg',
  'the super mario galaxy movie': '/posters/super-mario-galaxy.jpg',
  'the fisherman': '/posters/the-fisherman.jpg',
  'the odyssey': '/posters/the-odyssey.jpg',
  'wild horse 9': '/posters/wild-horse-9.jpg',
  'east west love': '/posters/east-west-love.jpg',
  'kibera hustle': '/posters/kibera-hustle.jpg',
  'resident evil': '/posters/resident-evil.jpg',
  'verity': '/posters/verity.jpg',
  'drishyam the conclusion': '/posters/drishyam-conclusion.jpg',
  'drishyam 3': '/posters/drishyam-conclusion.jpg',
};

/** Bundled poster for a film title (or undefined), matching the same way the cinema list does. */
export const localPosterFor = (title?: string): string | undefined =>
  title ? LOCAL_POSTERS[titleKey(title)] : undefined;
