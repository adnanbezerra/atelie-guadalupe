export type JwtUserPayload = {
    sub: string;
    email: string;
    role: "ADMIN" | "SUBADMIN" | "USER";
    name: string;
};
