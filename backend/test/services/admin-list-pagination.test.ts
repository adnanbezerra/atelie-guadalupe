import * as assert from "node:assert";
import { test } from "node:test";
import { OrderStatus, RoleName, TestimonialType } from "../../src/generated/prisma/enums";
import { listOrdersQuerySchema } from "../../src/modules/orders/schemas/order-schema";
import { OrderService } from "../../src/modules/orders/services/order-service";
import { listTestimonialsQuerySchema } from "../../src/modules/testimonials/schemas/testimonial-schema";
import { TestimonialService } from "../../src/modules/testimonials/services/testimonial-service";
import { listUsersQuerySchema } from "../../src/modules/users/schemas/user-schema";

test("administrative list schemas apply pagination defaults and reject invalid filters", () => {
    assert.deepEqual(listUsersQuerySchema.parse({}), {
        page: 1,
        pageSize: 20,
        sort: "CREATED_AT_DESC"
    });
    assert.deepEqual(listTestimonialsQuerySchema.parse({ isActive: "false" }), {
        page: 1,
        pageSize: 20,
        isActive: false,
        sort: "CREATED_AT_DESC"
    });
    assert.equal(listOrdersQuerySchema.safeParse({ pageSize: 101 }).success, false);
    assert.equal(listOrdersQuerySchema.safeParse({ paymentStatus: "UNKNOWN" }).success, false);
});

test("testimonial administrative list returns real pagination", async () => {
    const repository = {
        listPaginated: async () => ({ testimonials: [], total: 41 })
    };
    const service = new TestimonialService(repository as never, {} as never);

    const result = await service.listAll({
        page: 2,
        pageSize: 20,
        type: TestimonialType.TEXT,
        sort: "CREATED_AT_DESC"
    });

    assert.equal(result.success, true);
    if (result.success) {
        assert.deepEqual(result.value.pagination, {
            page: 2,
            pageSize: 20,
            total: 41,
            totalPages: 3
        });
    }
});

test("order list keeps user scope while applying filters and pagination", async () => {
    let receivedQuery: Record<string, unknown> | undefined;
    const userRepository = { findByUuid: async () => ({ id: 7 }) };
    const orderRepository = {
        listPaginated: async (query: Record<string, unknown>) => {
            receivedQuery = query;
            return { orders: [], total: 0 };
        }
    };
    const service = new OrderService(
        userRepository as never,
        {} as never,
        {} as never,
        orderRepository as never,
        {} as never,
        {} as never
    );

    const result = await service.list(
        { sub: "user-uuid", role: RoleName.USER },
        {
            page: 1,
            pageSize: 20,
            status: OrderStatus.PAID,
            sort: "TOTAL_DESC"
        }
    );

    assert.equal(result.success, true);
    assert.equal(receivedQuery?.userId, 7);
    assert.equal(receivedQuery?.status, "PAID");
    if (result.success) {
        assert.deepEqual(result.value.pagination, {
            page: 1,
            pageSize: 20,
            total: 0,
            totalPages: 0
        });
    }
});
