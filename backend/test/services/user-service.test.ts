import * as assert from "node:assert";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "../../src/core/security/password";
import { RoleName } from "../../src/generated/prisma/enums";
import { updateMeSchema } from "../../src/modules/users/schemas/user-schema";
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
        address: null
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

test("list users returns presented users with address aliases", async () => {
    const address = {
        uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b301",
        label: "Casa",
        zipCode: "01001000",
        street: "Praca da Se",
        number: "100",
        apartmentNumber: "42",
        complement: null,
        neighborhood: "Se",
        city: "Sao Paulo",
        state: "SP",
        country: "Brasil",
        reference: null,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    const user = {
        ...makeUser(await hashPassword("Senha@123")),
        address
    };

    const userRepository = {
        findAll: async () => [user]
    };

    const service = new UserService(userRepository as never, {} as never);
    const result = await service.listUsers();

    assert.equal(result.success, true);
    if (result.success) {
        assert.equal(result.value.users.length, 1);
        assert.equal(result.value.users[0].uuid, user.uuid);
        assert.deepEqual(result.value.users[0].address, address);
        assert.deepEqual(result.value.users[0].addresses, [address]);
    }
});

test("update me schema accepts partial payload without phone", () => {
    const input = updateMeSchema.parse({
        name: "Maria Atualizada"
    });

    assert.deepEqual(input, {
        name: "Maria Atualizada"
    });
});

test("update me schema ignores empty optional profile fields", () => {
    const input = updateMeSchema.parse({
        name: "Maria Atualizada",
        phone: ""
    });

    assert.deepEqual(input, {
        name: "Maria Atualizada"
    });
});

test("update me schema accepts empty document to clear it", () => {
    const input = updateMeSchema.parse({
        document: ""
    });

    assert.deepEqual(input, {
        document: null
    });
});

test("update me updates personal data and upserts address", async () => {
    const user = makeUser(await hashPassword("Senha@123"));
    const updatedUsers: Array<Record<string, unknown>> = [];
    const createdAddresses: Array<Record<string, unknown>> = [];

    const userRepository = {
        findByUuid: async () => ({
            ...user,
            ...updatedUsers.at(-1),
            address: createdAddresses[0] ?? null
        }),
        findByEmail: async () => null,
        findByDocument: async () => null,
        updateByUuid: async (_uuid: string, input: Record<string, unknown>) => {
            updatedUsers.push(input);
            return {
                ...user,
                ...input,
                address: null
            };
        }
    };
    const addressRepository = {
        findByUserId: async () => null,
        findByUuid: async () => null,
        create: async (input: Record<string, unknown>) => {
            createdAddresses.push(input);
            return input;
        },
        updateByUuid: async () => null
    };

    const service = new UserService(
        userRepository as never,
        {} as never,
        addressRepository as never
    );
    const result = await service.updateMe(user.uuid, {
        name: "Maria Atualizada",
        email: "MARIA.NOVA@email.com",
        document: "123.456.789-01",
        phone: "(11) 98765-4321",
        birthDate: "1988-08-12",
        address: {
            document: "123.456.789-01",
            zipCode: "01001-000",
            street: "Praca da Se",
            number: "100",
            apartmentNumber: "42",
            neighborhood: "Se",
            city: "Sao Paulo",
            state: "SP",
            country: "Brasil"
        }
    });

    assert.equal(result.success, true);
    assert.equal(updatedUsers.length, 1);
    assert.equal(updatedUsers[0].name, "Maria Atualizada");
    assert.equal(updatedUsers[0].email, "maria.nova@email.com");
    assert.equal(updatedUsers[0].document, "12345678901");
    assert.equal(updatedUsers[0].phone, "(11) 98765-4321");
    assert.ok(updatedUsers[0].birthDate instanceof Date);
    assert.equal(createdAddresses.length, 1);
    assert.equal(createdAddresses[0].document, "12345678901");
    assert.equal(createdAddresses[0].apartmentNumber, "42");
});

test("update me clears document without duplicate lookup", async () => {
    const user = makeUser(await hashPassword("Senha@123"));
    const updatedUsers: Array<Record<string, unknown>> = [];
    let findByDocumentCalled = false;

    const userRepository = {
        findByUuid: async () => ({
            ...user,
            ...updatedUsers.at(-1)
        }),
        findByDocument: async () => {
            findByDocumentCalled = true;
            return null;
        },
        updateByUuid: async (_uuid: string, input: Record<string, unknown>) => {
            updatedUsers.push(input);
            return {
                ...user,
                ...input
            };
        }
    };

    const service = new UserService(userRepository as never, {} as never);
    const result = await service.updateMe(user.uuid, {
        document: null
    });

    assert.equal(result.success, true);
    assert.equal(findByDocumentCalled, false);
    assert.equal(updatedUsers.length, 1);
    assert.equal(updatedUsers[0].document, null);
});

test("update me rejects duplicated email", async () => {
    const user = makeUser(await hashPassword("Senha@123"));
    let updateCalled = false;

    const userRepository = {
        findByUuid: async () => user,
        findByEmail: async () => ({
            ...user,
            uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b999"
        }),
        updateByUuid: async () => {
            updateCalled = true;
            return user;
        }
    };

    const service = new UserService(userRepository as never, {} as never, {} as never);
    const result = await service.updateMe(user.uuid, {
        email: "existente@email.com"
    });

    assert.equal(result.success, false);
    assert.equal(updateCalled, false);

    if (!result.success) {
        assert.equal(result.value.code, "CONFLICT");
    }
});

test("update me rejects duplicated document", async () => {
    const user = makeUser(await hashPassword("Senha@123"));
    let updateCalled = false;

    const userRepository = {
        findByUuid: async () => user,
        findByDocument: async () => ({
            ...user,
            uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b999"
        }),
        updateByUuid: async () => {
            updateCalled = true;
            return user;
        }
    };

    const service = new UserService(userRepository as never, {} as never, {} as never);
    const result = await service.updateMe(user.uuid, {
        document: "98765432100"
    });

    assert.equal(result.success, false);
    assert.equal(updateCalled, false);

    if (!result.success) {
        assert.equal(result.value.code, "CONFLICT");
    }
});

test("update me rejects address from another user", async () => {
    const user = makeUser(await hashPassword("Senha@123"));
    let updateCalled = false;

    const userRepository = {
        findByUuid: async () => ({
            ...user,
            id: 1
        }),
        updateByUuid: async () => {
            updateCalled = true;
            return user;
        }
    };
    const addressRepository = {
        findByUuid: async () => ({
            uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b301",
            userId: 2
        })
    };

    const service = new UserService(
        userRepository as never,
        {} as never,
        addressRepository as never
    );
    const result = await service.updateMe(user.uuid, {
        address: {
            uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b301",
            zipCode: "01001000",
            street: "Praca da Se",
            number: "100",
            neighborhood: "Se",
            city: "Sao Paulo",
            state: "SP",
            country: "Brasil"
        }
    });

    assert.equal(result.success, false);
    assert.equal(updateCalled, false);

    if (!result.success) {
        assert.equal(result.value.code, "RESOURCE_NOT_FOUND");
    }
});

test("update me accepts partial address update when address exists", async () => {
    const user = makeUser(await hashPassword("Senha@123"));
    const updatedAddresses: Array<Record<string, unknown>> = [];
    let createCalled = false;

    const userRepository = {
        findByUuid: async () => ({
            ...user,
            id: 1,
            address: updatedAddresses[0] ?? null
        }),
        updateByUuid: async () => user
    };
    const addressRepository = {
        findByUserId: async () => ({
            uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b301",
            userId: 1
        }),
        updateByUuid: async (_uuid: string, input: Record<string, unknown>) => {
            updatedAddresses.push(input);
            return input;
        },
        create: async () => {
            createCalled = true;
        }
    };

    const service = new UserService(
        userRepository as never,
        {} as never,
        addressRepository as never
    );
    const result = await service.updateMe(user.uuid, {
        address: {
            complement: "Casa 2"
        }
    });

    assert.equal(result.success, true);
    assert.equal(createCalled, false);
    assert.equal(updatedAddresses.length, 1);
    assert.equal(updatedAddresses[0].complement, "Casa 2");
});
