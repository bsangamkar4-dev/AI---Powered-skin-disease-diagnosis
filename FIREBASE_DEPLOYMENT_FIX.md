# Firebase Hosting Fix

This project uses React Router with BrowserRouter. Firebase Hosting must rewrite application routes to the built `index.html`.

## If deploying from the project root

```bash
cd client
npm install
npm run build
cd ..
firebase deploy --only hosting
```

The root `firebase.json` uses `client/dist` as the hosting directory.

## If deploying from the `client` folder

```bash
cd client
npm install
npm run build
firebase deploy --only hosting
```

The `client/firebase.json` uses `dist` as the hosting directory.

Do not deploy the `client/src` folder directly. Firebase must deploy the Vite build output (`client/dist`).
