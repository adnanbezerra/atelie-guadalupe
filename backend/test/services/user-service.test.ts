import * as assert from "node:assert";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "../../src/core/security/password";
import { RoleName } from "../../src/generated/prisma/enums";
import { UserService } from "../../src/modules/users/services/user-service";

function makeUser(passwordHash: string) {
    return {
        uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b101",
        name: "Maria da Silva",
        email: "maria@email.com",
        document: "12345678900",
        passwordHash,
        isActive: true,
        createdAt: new Date(),
        role: {
            name: RoleName.USER
        },
        addresses: []
    };
}

test("change my password accepts current password that does not match new password rules", async () => {
    const oldPassword = "old";
    const oldPasswordHash = await hashPassword(oldPassword);
    const user = makeUser(oldPasswordHash);
    const updatedUsers: Array<Record<string, unknown>> = [];

    const userRepository = {
        findByEmail: async (email: string) => (email === user.email ? user : null),
        updateByUuid: async (_uuid: string, input: Record<string, unknown>) => {
            const updatedUser = {
                ...user,
                ...input
            };
            updatedUsers.push(updatedUser);
            return updatedUser;
        }
    };

    const service = new UserService(userRepository as never, {} as never);
    const result = await service.changePassword({
        email: "MARIA@email.com",
        currentPassword: oldPassword,
        newPassword: "NovaSenha@123"
    });

    assert.equal(result.success, true);
    assert.equal(updatedUsers.length, 1);
    assert.equal(
        await verifyPassword(updatedUsers[0].passwordHash as string, "NovaSenha@123"),
        true
    );
});

test("change my password rejects wrong current password", async () => {
    const user = makeUser(await hashPassword("Senha@123"));
    let updateCalled = false;

    const userRepository = {
        findByEmail: async () => user,
        updateByUuid: async () => {
            updateCalled = true;
            return user;
        }
    };

    const service = new UserService(userRepository as never, {} as never);
    const result = await service.changePassword({
        email: user.email,
        currentPassword: "errada",
        newPassword: "NovaSenha@123"
    });

    assert.equal(result.success, false);
    assert.equal(updateCalled, false);

    if (!result.success) {
        assert.equal(result.value.code, "UNAUTHORIZED");
    }
});

test("change password rejects unknown email with the same credentials error", async () => {
    let updateCalled = false;

    const userRepository = {
        findByEmail: async () => null,
        updateByUuid: async () => {
            updateCalled = true;
        }
    };

    const service = new UserService(userRepository as never, {} as never);
    const result = await service.changePassword({
        email: "nao-existe@email.com",
        currentPassword: "Senha@123",
        newPassword: "NovaSenha@123"
    });

    assert.equal(result.success, false);
    assert.equal(updateCalled, false);

    if (!result.success) {
        assert.equal(result.value.code, "UNAUTHORIZED");
        assert.equal(result.value.message, "Email ou senha invalidos");
    }
});
