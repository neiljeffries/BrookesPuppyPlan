# BrookesPuppyPlan

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.


## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Firebase Hosting

This project is configured for deployment to [Firebase Hosting](https://firebase.google.com/docs/hosting).

### 1. Initialize Firebase in your project

If you haven't already, install the Firebase CLI globally:

```bash
npm install -g firebase-tools
```

Then, in your project root, run:

```bash
firebase login
firebase init
```

- Select **Hosting** (and optionally other features).
- Choose your Firebase project or create a new one.
- Set the public directory to `public` (or your preferred output folder).
- Configure as a single-page app (rewrite all URLs to /index.html): **Yes**
- Do **not** overwrite your `index.html` if prompted (unless you want a blank one).

### 2. Build and Deploy

1. To build your Angular app and deploy to Firebase Hosting:

```bash
ng build --configuration production
```

2. Copy the contents of `dist/brookes_puppy_plan/browser` to your `firebase-website` folder **or use the deployment script build-deploy-firebase.bat**.

3. Then deploy:

```bash
firebase deploy
```

### 3. Useful Firebase Info

- **Firebase config** is in `src/app/firebase.ts` and is safe for client-side use.
- See [Firebase Hosting Docs](https://firebase.google.com/docs/hosting) for advanced configuration (rewrites, redirects, custom domains, etc.).

---

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
