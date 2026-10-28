# DermX-AI Performance & Authentication Fixes

- Reused verified Firebase ID-token claims in authenticated requests instead of calling Firebase Admin `getUser()` repeatedly.
- Optimized `/api/users/profile` to avoid a second Firebase network lookup.
- Removed the duplicate `/api/auth/signup-complete` route.
- Added a 60-second client-side verification-email resend cooldown.
- Added friendly handling for Firebase `auth/too-many-requests`.
- Kept verification status checks explicit rather than continuously polling.
- Existing ML warm-up and image-compression optimizations are preserved.
- No secrets are included; keep your local `client/.env` and `server/.env`.
