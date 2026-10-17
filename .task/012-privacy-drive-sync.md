# 012 The legal notice says what Learn's Google Drive sync uses

status: building · rank: 2 · level: simple · type: docs · request: user, 2026-10-17 («ajoute la partie privacy dans les mentions légales») · light path

## Summary
Rank: difficulty 1 (one paragraph in en and fr), impact 2 (the privacy text Google's consent screen links to, palicanon.app/privacy, before learn's sync goes to prod) → 2.
learn-pali 050 (merged 2026-10-17) lets a learner sync their progress through their own Google Drive. The legal notice's Privacy section says only "This site sets no cookie and collects no personal data". It gains a paragraph for learn.palicanon.app and the PaliCanon app: optional, only when the learner signs in with Google; the scope drive.appdata (a hidden folder of the learner's Drive that only PaliCanon can read); what is stored there (their learning progress, the same file as Export); the token kept in the browser's memory only (the site) or in the macOS Keychain (the app), never on a PaliCanon server; PaliCanon has no server copy; Sign out revokes the access, and access can be removed at https://myaccount.google.com/connections; Google's privacy policy applies to Google's processing. Also Google's Limited Use wording: the data from Google APIs is used only to provide the sync.

## Log
| Step | Result | Output |
| --- | --- | --- |
| Build | done | 4b5f17e; build exit 0, check exit 0, dist tests exit 0 |
| Correction | done | 357c664; build exit 0, check exit 0, dist tests exit 0 |
| Check | done | orchestrator, 2026-10-17: the paragraph read in en (and the sign-out sentence corrected to say exactly when revoke happens); build, check, dist tests exit 0 per the lane |
