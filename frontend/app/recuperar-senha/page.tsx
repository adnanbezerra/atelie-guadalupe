import type { Metadata } from "next";
import { PasswordResetScreen } from "@/components/auth/password-reset-screen";

export const metadata: Metadata = {
    title: "Recuperar senha | Ateliê Guadalupe",
};

export default function PasswordResetPage() {
    return <PasswordResetScreen />;
}
