type AppErrorDetails = Array<Record<string, unknown>>;

export class AppError extends Error {
    public readonly code: string;
    public readonly statusCode: number;
    public readonly details?: AppErrorDetails;

    public constructor(
        code: string,
        statusCode: number,
        message: string,
        details?: AppErrorDetails
    ) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
    }

    public static validation(message: string, details?: AppErrorDetails): AppError {
        return new AppError("VALIDATION_ERROR", 422, message, details);
    }

    public static unauthorized(message: string): AppError {
        return new AppError("UNAUTHORIZED", 401, message);
    }

    public static forbidden(message: string): AppError {
        return new AppError("FORBIDDEN", 403, message);
    }

    public static notFound(message: string): AppError {
        return new AppError("RESOURCE_NOT_FOUND", 404, message);
    }

    public static conflict(message: string, details?: AppErrorDetails): AppError {
        return new AppError("CONFLICT", 409, message, details);
    }

    public static business(message: string, details?: AppErrorDetails): AppError {
        return new AppError("BUSINESS_RULE_ERROR", 400, message, details);
    }
}
