# Clinical content and safety: how cards are verified

Every card shows one of three statuses.

| Status | Meaning |
|---|---|
| Draft · pending review | Written or imported, not yet checked by a clinician. Studyable, always labelled. |
| Clinically reviewed | Approved by an identified clinician, with reference, year, applicability and date. |
| Needs update | Guidance or evidence has changed. The card must be revised. |

Cards you create or import in the app are always Draft. Nothing is ever marked verified automatically.

## Reviewing cards (clinician)
1. Open Settings, enter your name and designation, and switch Reviewer controls on.
2. Study or browse cards. After the answer shows, use Mark reviewed, Needs update or Reset to draft.
3. In Settings choose Export my reviews to download `reviews.json`.

## Publishing reviews
Copy the exported file over `decks/reviews.json` in this folder and deploy. The file maps a card id to
`{"s":"reviewed"|"update","by":"Name, designation","on":"YYYY-MM-DD","ref":"Guideline","yr":2021,"scope":"Applies to"}`.
Reviews you mark on one device show only on that device until published this way.
