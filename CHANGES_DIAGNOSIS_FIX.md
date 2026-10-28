# DermX-AI diagnosis fixes

## Included in this build

- Diagnosis persistence uses the canonical Firebase UID (`req.user.uid`).
- Missing MongoDB user profiles are created automatically before saving a diagnosis.
- Diagnosis history/detail routes now use the Firebase UID consistently.
- Mock-token UID parsing is corrected.
- ML inference timing is logged clearly.
- Hugging Face Space warm-up runs in the background while the backend is active to reduce cold-start delays.
- Remote ML requests have a 240-second safety timeout and clearer error handling.
- Optional local inference is supported with `USE_LOCAL_ML=true` when the trained model files and Python dependencies are available.
- No `.env` secrets are included in this package.
