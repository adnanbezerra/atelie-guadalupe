import * as assert from "node:assert";
import { test } from "node:test";
import { verifyPassword } from "../../src/core/security/password";
import { EmailJobStatus } from "../../src/generated/prisma/enums";
import { PasswordResetService } from "../../src/modules/auth/services/password-reset-service";

type Challenge = {
    id: number;
    uuid: string;
    userId: number;
    emailJobId: number | null;
    codeDigest: string;
    expiresAt: Date;
    attempts: number;
    lastSentAt: Date;
    consumedAt: Date | null;
};

function createFixture(isActive = true) {
    const user = {
        id: 1,
        uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b101",
        name: "Maria da Silva",
        email: "maria@email.com",
        passwordHash: "old-hash",
        authVersion: 0,
        isActive
    };
    let challenge: Challenge | null = null;
    const emailJobs: Array<Record<string, unknown>> = [];

    const transaction = {
        user: {
            findUnique: async ({ where }: { where: { email: string } }) =>
                where.email === user.email ? { ...user, passwordResetChallenge: challenge } : null,
            update: async ({ data }: { data: Record<string, unknown> }) => {
                user.passwordHash = data.passwordHash as string;
                if (data.authVersion) user.authVersion += 1;
                return user;
            }
        },
        passwordResetChallenge: {
            findUnique: async () => challenge,
            upsert: async ({
                create,
                update
            }: {
                create: Record<string, unknown>;
                update: Record<string, unknown>;
            }) => {
                challenge = challenge
                    ? ({ ...challenge, ...update } as Challenge)
                    : ({ id: 1, ...create, consumedAt: null } as Challenge);
                return challenge;
            },
            update: async ({ data }: { data: Record<string, unknown> }) => {
                challenge = { ...challenge!, ...data } as Challenge;
                return challenge;
            }
        },
        emailJob: {
            create: async ({ data }: { data: Record<string, unknown> }) => {
                const job = { id: emailJobs.length + 1, ...data };
                emailJobs.push(job);
                return job;
            },
            updateMany: async ({
                where,
                data
            }: {
                where: { id: number; status: { in: string[] } };
                data: Record<string, unknown>;
            }) => {
                const job = emailJobs.find((candidate) => candidate.id === where.id);
                if (
                    !job ||
                    !where.status.in.includes(String(job.status ?? EmailJobStatus.PENDING))
                ) {
                    return { count: 0 };
                }
                Object.assign(job, data);
                return { count: 1 };
            }
        }
    };

    const prisma = {
        user: {
            findUnique: async ({ where }: { where: { email: string } }) =>
                where.email === user.email ? user : null
        },
        $transaction: async (operation: (client: typeof transaction) => Promise<unknown>) =>
            operation(transaction)
    };

    return {
        user,
        emailJobs,
        prisma,
        getChallenge: () => challenge,
        expireChallenge: () => {
            if (challenge) challenge.expiresAt = new Date(Date.now() - 1);
        },
        passCooldown: () => {
            if (challenge) challenge.lastSentAt = new Date(Date.now() - 61_000);
        }
    };
}

function resetCode(emailJob: Record<string, unknown>) {
    return (emailJob.payload as Record<string, unknown>).resetCode as string;
}

test("password reset request is generic for unknown and inactive accounts", async () => {
    const unknown = createFixture();
    const inactive = createFixture(false);
    const unknownService = new PasswordResetService(unknown.prisma as never, "test-secret");
    const inactiveService = new PasswordResetService(inactive.prisma as never, "test-secret");

    const first = await unknownService.request({ email: "unknown@email.com" });
    const second = await inactiveService.request({ email: "MARIA@EMAIL.COM" });

    assert.equal(first.success, true);
    assert.equal(second.success, true);
    assert.deepEqual(first, second);
    assert.equal(unknown.emailJobs.length, 0);
    assert.equal(inactive.emailJobs.length, 0);
});

test("password reset request enforces cooldown and replaces the previous code", async () => {
    const fixture = createFixture();
    const service = new PasswordResetService(fixture.prisma as never, "test-secret");

    await service.request({ email: "MARIA@EMAIL.COM" });
    const firstCode = resetCode(fixture.emailJobs[0]);
    const firstDigest = fixture.getChallenge()?.codeDigest;
    assert.match(firstCode, /^\d{6}$/);
    assert.notEqual(fixture.getChallenge()?.codeDigest, firstCode);

    await service.request({ email: "maria@email.com" });
    assert.equal(fixture.emailJobs.length, 1);

    fixture.passCooldown();
    await service.request({ email: "maria@email.com" });
    assert.equal(fixture.emailJobs.length, 2);
    assert.equal(fixture.emailJobs[0].status, EmailJobStatus.CANCELLED);
    assert.deepEqual(fixture.emailJobs[0].payload, {});
    assert.notEqual(fixture.getChallenge()?.codeDigest, firstDigest);
});

test("password reset confirmation consumes the code and revokes old tokens", async () => {
    const fixture = createFixture();
    const service = new PasswordResetService(fixture.prisma as never, "test-secret");
    await service.request({ email: fixture.user.email });
    const code = resetCode(fixture.emailJobs[0]);

    const result = await service.confirm({
        email: fixture.user.email,
        code,
        newPassword: "NovaSenha@123"
    });

    assert.equal(result.success, true);
    assert.equal(await verifyPassword(fixture.user.passwordHash, "NovaSenha@123"), true);
    assert.equal(fixture.user.authVersion, 1);
    assert.ok(fixture.getChallenge()?.consumedAt);

    const reused = await service.confirm({
        email: fixture.user.email,
        code,
        newPassword: "OutraSenha@123"
    });
    assert.equal(reused.success, false);
});

test("password reset invalidates a challenge after five wrong attempts", async () => {
    const fixture = createFixture();
    const service = new PasswordResetService(fixture.prisma as never, "test-secret");
    await service.request({ email: fixture.user.email });
    const code = resetCode(fixture.emailJobs[0]);
    const wrongCode = code === "000000" ? "000001" : "000000";

    for (let attempt = 0; attempt < 5; attempt += 1) {
        const result = await service.confirm({
            email: fixture.user.email,
            code: wrongCode,
            newPassword: "NovaSenha@123"
        });
        assert.equal(result.success, false);
    }

    assert.equal(fixture.getChallenge()?.attempts, 5);
    assert.ok(fixture.getChallenge()?.consumedAt);
});

test("password reset rejects an expired code", async () => {
    const fixture = createFixture();
    const service = new PasswordResetService(fixture.prisma as never, "test-secret");
    await service.request({ email: fixture.user.email });
    const code = resetCode(fixture.emailJobs[0]);
    fixture.expireChallenge();

    const result = await service.confirm({
        email: fixture.user.email,
        code,
        newPassword: "NovaSenha@123"
    });

    assert.equal(result.success, false);
    if (!result.success) assert.equal(result.value.message, "Codigo invalido ou expirado");
});

test("password reset confirmation is generic for an unknown account", async () => {
    const fixture = createFixture();
    const service = new PasswordResetService(fixture.prisma as never, "test-secret");

    const result = await service.confirm({
        email: "unknown@email.com",
        code: "123456",
        newPassword: "NovaSenha@123"
    });

    assert.equal(result.success, false);
    if (!result.success) assert.equal(result.value.message, "Codigo invalido ou expirado");
});
