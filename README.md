# ClassLink — front-end (Angular 20)

| Part | Path | Tech |
|------|------|------|
| Front-end | `d:\classlink_ftd` | Angular 20, Tailwind, Firebase Auth |
| Back-end  | `d:\classLink`     | Spring Boot 3.4, Spring Security (Firebase ID-token JWT), Firestore (Admin SDK) |

Angular --(Firebase Auth ID token)--> Spring Boot REST API --(Admin SDK)--> Firestore

## Prerequisites (Firebase console, project claink-b3eb5)
1. Authentication > Sign-in method > enable **Email/Password**.
2. Firestore Database > create the database.
3. Project settings > Service accounts > **Generate new private key**; save it as
   `d:\classLink\firebase-service-account.json` (git-ignored) or set `FIREBASE_SERVICE_ACCOUNT_PATH`.

## Run
- Back-end: `mvn spring-boot:run` (port 8080, JDK 17+). `mvn test` runs the API tests (in-memory store).
- Front-end: `npm install && npm start` -> http://localhost:4200

## Routes
`/login`, `/home`, `/classes`, `/classes/:id`, `/calendar`, `/notifications`, `/settings`