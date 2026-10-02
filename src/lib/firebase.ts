/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Explicitly ensure consistent, hardcoded Firebase project auth domain
// without any dynamic window.location or path prefix overrides for reliable Render & multi-platform operation
const appConfig = {
  ...firebaseConfig,
  authDomain: "mess-managing.firebaseapp.com"
};

const app = initializeApp(appConfig);
export const auth = getAuth(app);

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account'
});

