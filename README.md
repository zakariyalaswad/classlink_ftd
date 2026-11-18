# ClassLink (Angular + Firebase)

Classroom-style learning platform prototype converted from the Figma Make / React design into Angular 20.

## Run (demo mode)

```bash
npm start
```

Open `http://localhost:4200`. Demo mode uses localStorage — no Firebase keys required.

Use the **Mode démo** switch (Enseignant / Étudiant) in the top bar to test both roles.

## Enable Firebase

1. Create a Firebase project with Auth (Email/Password), Firestore, and Storage.
2. Paste your web config into:
   - `src/environments/environment.development.ts`
   - `src/environments/environment.ts`
3. Set `useFirebase: true`.
4. See the smoke-test example: `src/app/examples/firebase-usage.example.ts`

## Suggested Firestore paths

- `users/{uid}`
- `classes/{classId}`
- `classes/{classId}/assignments/{assignmentId}`
- `classes/{classId}/assignments/{assignmentId}/submissions/{studentId}`
- `classMembers/{classId}/users/{uid}`
- `notifications/{uid}/items/{noticeId}`

## Stack

- Angular 20 (standalone, zoneless)
- Firebase JS SDK (Auth / Firestore / Storage)
- Demo fallback when `useFirebase` is `false`
