/**
 * Dynamic greeting based on user's local time of day:
 * - Morning (5 AM - 11:59 AM): "Good morning, leo rada ni gani?"
 * - Afternoon (12 PM - 4:59 PM): "Good afternoon, leo rada ni gani?"
 * - Evening/Night (5 PM - 4:59 AM): "Good evening, leo rada ni gani?"
 */
export function getTimeOfDayGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good morning, leo rada ni gani?';
  }
  if (hour >= 12 && hour < 17) {
    return 'Good afternoon, leo rada ni gani?';
  }
  return 'Good evening, leo rada ni gani?';
}
