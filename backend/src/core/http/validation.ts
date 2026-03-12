import { ZodError } from "zod";

export function formatZodIssues(error: ZodError): Array<Record<string, unknown>> {
    return error.issues.map((issue) => {
        return {
            path: issue.path.join("."),
            message: issue.message,
            code: issue.code
        };
    });
}
