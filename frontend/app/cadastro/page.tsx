import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth/auth-screen";

export const metadata: Metadata = {
    title: "Cadastro | Ateliê Guadalupe",
};

export default function CadastroPage() {
    return <AuthScreen mode="register" />;
}
