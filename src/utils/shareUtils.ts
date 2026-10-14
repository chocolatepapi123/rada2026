/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Universal Social Sharing Helper
 * Utilizes the native Web Share API where available,
 * and gracefully falls back to copying a rich link/summary to the clipboard.
 */
export async function shareContent(params: {
  title: string;
  text: string;
  url?: string;
  onSuccess?: (msg: string) => void;
  onError?: (err: string) => void;
}): Promise<boolean> {
  const { title, text, onSuccess, onError } = params;
  const url = params.url || window.location.href;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      if (onSuccess) onSuccess('Shared successfully!');
      return true;
    } catch (err: any) {
      // If user deliberately cancelled the native share sheet, do not error
      if (err.name === 'AbortError') {
        return false;
      }
    }
  }

  // Fallback to Clipboard copy
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${title}\n${text}\n${url}`);
      if (onSuccess) onSuccess('Link & details copied to clipboard!');
      return true;
    }
  } catch (clipErr) {
    // Legacy fallback using textarea
    try {
      const textarea = document.createElement('textarea');
      textarea.value = `${title}\n${text}\n${url}`;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      if (onSuccess) onSuccess('Link copied to clipboard!');
      return true;
    } catch (e) {
      if (onError) onError('Unable to copy or share link.');
      return false;
    }
  }

  return false;
}
