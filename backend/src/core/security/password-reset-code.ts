import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const TEST_SECRET = "password-reset-test-secret-32-bytes";

export function generatePasswordResetCode() {
    return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function passwordResetSecret(environment: NodeJS.ProcessEnv = process.env) {
    const secret = environment.PASSWORD_RESET_SECRET;
    if (secret) return secret;
    if (environment.NODE_ENV === "test") return TEST_SECRET;
    throw new Error("PASSWORD_RESET_SECRET nao configurada");
}

export function digestPasswordResetCode(challengeUuid: string, code: string, secret: string) {
    return createHmac("sha256", secret).update(`${challengeUuid}:${code}`).digest("hex");
}

export function passwordResetCodeMatches(expectedDigest: string, actualDigest: string) {
    const expected = Buffer.from(expectedDigest, "hex");
    const actual = Buffer.from(actualDigest, "hex");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
}
