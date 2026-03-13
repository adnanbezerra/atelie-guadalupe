import * as assert from "node:assert";
import { test } from "node:test";
import { RoleName } from "../../src/generated/prisma/enums";
import {
    LoginService,
    RegisterUserService
} from "../../src/modules/auth/services/register-user-service";

test("register user service creates a default USER account", async () => {
    const roleRepository = {
        findByName: async (name: string) => {
            return name === RoleName.USER ? { id: 3, name: RoleName.USER } : null;
        }
    };

    const createdUsers: Array<Record<string, unknown>> = [];
    const userRepository = {
        findByEmail: async () => null,
        findByDocument: async () => null,
        create: async (input: Record<string, unknown>) => {
            const createdUser = {
                ...input,
                createdAt: new Date(),
                isActive: true,
                role: {
                    name: RoleName.USER
                }
            };
            createdUsers.push(createdUser);
            return createdUser;
        }
    };

    const service = new RegisterUserService(roleRepository as never, userRepository as never);
    const result = await service.execute({
        name: "Maria da Silva",
        email: "MARIA@email.com",
        document: "123.456.789-00",
        password: "Senha@123"
    });

    assert.equal(result.success, true);

    if (result.success) {
        assert.equal(result.value.user.role, RoleName.USER);
        assert.equal(result.value.user.email, "maria@email.com");
        assert.equal(result.value.user.document, "12345678900");
    }

    assert.equal(createdUsers.length, 1);
});

test("login service blocks inactive users", async () => {
    const userRepository = {
        findByEmail: async () => ({
            uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b101",
            name: "Maria da Silva",
            email: "maria@email.com",
            document: "12345678900",
            passwordHash: "ignored",
            isActive: false,
            createdAt: new Date(),
            role: {
                name: RoleName.USER
            }
        })
    };

    const service = new LoginService(userRepository as never);
    const result = await service.execute({
        email: "maria@email.com",
        password: "Senha@123"
    });

    assert.equal(result.success, false);
});
