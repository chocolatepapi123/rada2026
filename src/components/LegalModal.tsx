import React from 'react';
import { X } from 'lucide-react';

/** Bump this string whenever the Terms or Privacy Policy text changes. It is saved with every signup. */
export const LEGAL_VERSION = '2026-11-draft-1';

/**
 * Set to false once the advocate has signed off on the text below.
 * While true, a small "draft" label is shown at the top of the document.
 */
export const LEGAL_IS_DRAFT = true;

export const SUPPORT_EMAIL = 'hello.rada.app@gmail.com';

export type LegalDoc = 'terms' | 'privacy';

interface LegalModalProps {
  doc: LegalDoc | null;
  onClose: () => void;
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-black text-white mt-5 mb-1.5">{children}</h3>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs text-stone-300 leading-relaxed mb-2">{children}</p>
);
const LI = ({ children }: { children: React.ReactNode }) => (
  <li className="text-xs text-stone-300 leading-relaxed mb-1 ml-4 list-disc">{children}</li>
);

function Terms() {
  return (
    <>
      <P>These Terms apply when you use RADA, an app for finding places, events and outings in Nairobi and planning them with other people.</P>

      <H>1. Who can use RADA</H>
      <P>RADA is for adults only. You must be 18 or older to create an account. If we find that an account belongs to someone under 18, we will remove it.</P>

      <H>2. Your account</H>
      <ul>
        <LI>Give accurate information and keep your login details private.</LI>
        <LI>One person, one account. You are responsible for what happens on your account.</LI>
        <LI>You can delete your account at any time from Account Settings.</LI>
      </ul>

      <H>3. Behaving well</H>
      <P>Do not harass, threaten, scam, impersonate or discriminate against anyone. Do not post illegal, sexual, hateful or violent content, or content that targets minors. Do not use RADA to sell or promote alcohol to minors. We may remove content and suspend or end accounts that break these rules.</P>

      <H>4. Meeting people safely</H>
      <P>RADA helps people find each other, but we cannot check or control what happens when you meet. Meet in a public place first, tell someone you trust where you are going, and use the SOS and Report tools if something feels wrong. Verified badges show that a step was completed in the app. They are not a guarantee of anyone's behaviour.</P>

      <H>5. Outings, events and businesses</H>
      <P>Outings are organised by their hosts and events by their organisers. Venues, businesses and event organisers are responsible for their own listings, offers, prices, permits and tickets. RADA is not a party to any arrangement between users, hosts, venues or organisers.</P>

      <H>6. Your content</H>
      <P>You keep ownership of what you post. By posting it on RADA you give us permission to show it in the app and in RADA promotions for as long as it is on the platform. Only post content you have the right to share, and only photos or videos of people who agree to appear.</P>

      <H>7. Giveaways and offers</H>
      <P>Any prize, giveaway or competition on RADA is subject to its own rules and any permits required under Kenyan law.</P>

      <H>8. Changes, suspension and ending</H>
      <P>We may change or stop parts of RADA, and we may suspend or end access if these Terms are broken or to keep people safe. We will update the version date when these Terms change.</P>

      <H>9. Liability</H>
      <P>RADA is provided as is. To the extent allowed by Kenyan law, we are not liable for losses that come from meetings between users, events, venues or the information others post. Nothing here limits rights you have under law that cannot be limited.</P>

      <H>10. Law and contact</H>
      <P>These Terms are governed by the laws of Kenya. Questions or complaints: {SUPPORT_EMAIL}.</P>
    </>
  );
}

function Privacy() {
  return (
    <>
      <P>This explains what RADA collects, why, and the choices you have. We handle personal data in line with the Kenya Data Protection Act, 2019.</P>

      <H>1. What we collect</H>
      <ul>
        <LI>Account details: email address, display name, username, profile photo and bio.</LI>
        <LI>What you do in the app: saved places, outings you host or join, messages, match requests, reviews and statuses.</LI>
        <LI>Location, only if you allow it, to show places near you and to send your position if you use SOS.</LI>
        <LI>Business details if you set up a business account.</LI>
        <LI>Basic technical data such as device type and error logs.</LI>
      </ul>

      <H>2. Why we use it</H>
      <P>To run the app, show you relevant places and events, connect you with people you choose to meet, keep the community safe, and improve RADA. We do not sell your personal data.</P>

      <H>3. Who can see it</H>
      <P>Your public username, photo and bio can be seen by other users. Your email and phone number are not shown to other users. Messages are visible only to the people in the chat. We use service providers such as Supabase and Vercel to store and run the app, and they may only use data to provide those services. We may share information if the law requires it or to protect someone's safety.</P>

      <H>4. Location and SOS</H>
      <P>RADA only reads your location when you use a feature that needs it. If you press SOS, your current position is put into a message that you choose to send to your emergency contacts. RADA does not track you in the background.</P>

      <H>5. How long we keep it</H>
      <P>We keep your data while your account is active. When you delete your account we delete your profile and your content, except where we must keep limited records for safety or legal reasons.</P>

      <H>6. Your rights</H>
      <P>You can see, correct and delete your data, object to some uses, and withdraw consent. Most of this is in Account Settings. For anything else write to {SUPPORT_EMAIL}. You can also complain to the Office of the Data Protection Commissioner in Kenya.</P>

      <H>7. Adults only</H>
      <P>RADA is not for people under 18, and we do not knowingly collect their data. If you think a child is using RADA, report the profile or contact us.</P>

      <H>8. Changes</H>
      <P>If we change this policy in a meaningful way we will update the version date and tell you in the app.</P>
    </>
  );
}

export function LegalModal({ doc, onClose }: LegalModalProps) {
  if (!doc) return null;
  const title = doc === 'terms' ? 'Terms of Use' : 'Privacy Policy';
  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[88vh] flex flex-col bg-stone-900 text-white rounded-t-3xl sm:rounded-3xl border border-stone-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-stone-800">
          <div>
            <h2 className="text-lg font-black">{title}</h2>
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
        <div className="overflow-y-auto px-5 pb-6 pt-1">{doc === 'terms' ? <Terms /> : <Privacy />}</div>
      </div>
    </div>
  );
}
