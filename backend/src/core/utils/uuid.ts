import { v7 as uuidv7 } from "uuid";

export function createUuid(): string {
    return uuidv7();
}
