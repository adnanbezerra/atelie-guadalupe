import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

const TOKEN_COOKIE_NAMES = [
    AUTH_COOKIE_NAME,
    "auth_token",
    "auth-token",
    "atelie_token",
    "token",
    "jwt",
    "access_token",
];

export async function getAuthTokenFromCookies() {
    const store = await cookies();

    for (const name of TOKEN_COOKIE_NAMES) {
        const token = store.get(name)?.value;

        if (token) {
            return token;
        }
    }

    return null;
}
