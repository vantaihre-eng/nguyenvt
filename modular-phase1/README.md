# Modular Phase 1

Subproject scaffold for phase 1 refactor.

Goals:
- keep the current root site untouched
- create a separate app shell for modular migration
- isolate core concerns before moving features

Scope of phase 1:
- app bootstrap
- shared config
- app state
- local storage access
- DOM helpers
- utility helpers
- minimal shell preview

Not included yet:
- router migration
- CMS migration
- Firestore/API migration
- feature modules

Suggested next step after review:
1. move loader + 404 + router into `src/features`
2. move post public rendering into `src/features/posts`
3. connect this shell to the real page templates gradually
