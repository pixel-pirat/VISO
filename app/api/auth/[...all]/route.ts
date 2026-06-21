import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Never cache auth responses
export const dynamic = "force-dynamic";

export const { GET, POST } = toNextJsHandler(auth);
