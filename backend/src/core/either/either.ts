export type Left<L> = {
    readonly success: false;
    readonly value: L;
};

export type Right<R> = {
    readonly success: true;
    readonly value: R;
};

export type Either<L, R> = Left<L> | Right<R>;

export function left<L>(value: L): Left<L> {
    return {
        success: false,
        value
    };
}

export function right<R>(value: R): Right<R> {
    return {
        success: true,
        value
    };
}

export function isLeft<L, R>(result: Either<L, R>): result is Left<L> {
    return result.success === false;
}

export function isRight<L, R>(result: Either<L, R>): result is Right<R> {
    return result.success === true;
}
