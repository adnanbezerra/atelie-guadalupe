import { cookies } from "next/headers";
import { AUTH_TOKEN_KEYS } from "@/lib/constants";

export async function getAuthTokenFromCookies() {
    const store = await cookies();

    for (const name of AUTH_TOKEN_KEYS) {
        const token = store.get(name)?.value;

        if (token) {
            return token;
        }
    }

    return null;
}
