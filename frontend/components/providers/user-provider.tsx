"use client";

import type { ReactNode } from "react";
import { UserProvider } from "@/hooks/use-user";

export function AppUserProvider({ children }: { children: ReactNode }) {
    return <UserProvider>{children}</UserProvider>;
}
