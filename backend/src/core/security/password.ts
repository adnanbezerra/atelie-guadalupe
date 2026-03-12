import * as bcrypt from "bcrypt";

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}
