import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, usernameClient } from "better-auth/client/plugins";
import type { auth } from "./auth";

// No baseURL — better-auth will use window.location.origin at runtime.
// This means it always hits the correct host whether running locally,
// on a Vercel preview URL, or on the production domain.
export const authClient = createAuthClient({
  plugins: [
    usernameClient(),
    inferAdditionalFields<typeof auth>(),
  ],
});

export type Session = typeof authClient.$Infer.Session;
