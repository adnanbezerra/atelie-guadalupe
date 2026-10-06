import { Prisma, PrismaClient, Testimonial } from "../../../generated/prisma/client";
import { TestimonialType } from "../../../generated/prisma/enums";

type ListTestimonialsInput = {
    page: number;
    pageSize: number;
    type?: TestimonialType;
    isActive?: boolean;
    sort: "CREATED_AT_DESC" | "CREATED_AT_ASC";
};

export class TestimonialRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public listAll() {
        return this.prisma.testimonial.findMany({
            orderBy: {
                createdAt: "desc"
            }
        });
    }

    public async listPaginated(query: ListTestimonialsInput) {
        const where: Prisma.TestimonialWhereInput = {
            ...(query.type ? { type: query.type } : {}),
            ...(typeof query.isActive === "boolean" ? { isActive: query.isActive } : {})
        };
        const [testimonials, total] = await this.prisma.$transaction([
            this.prisma.testimonial.findMany({
                where,
                orderBy: { createdAt: query.sort === "CREATED_AT_ASC" ? "asc" : "desc" },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize
            }),
            this.prisma.testimonial.count({ where })
        ]);
        return { testimonials, total };
    }

    public listActive() {
        return this.prisma.testimonial.findMany({
            where: {
                isActive: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });
    }

    public findByUuid(uuid: string): Promise<Testimonial | null> {
        return this.prisma.testimonial.findUnique({
            where: {
                uuid
            }
        });
    }

    public upsert(input: {
        uuid: string;
        create: Prisma.TestimonialUncheckedCreateInput;
        update: Prisma.TestimonialUncheckedUpdateInput;
    }) {
        return this.prisma.testimonial.upsert({
            where: {
                uuid: input.uuid
            },
            create: input.create,
            update: input.update
        });
    }

    public deactivateByUuid(uuid: string) {
        return this.prisma.testimonial.update({
            where: {
                uuid
            },
            data: {
                isActive: false
            }
        });
    }

    public deleteByUuid(uuid: string) {
        return this.prisma.testimonial.delete({
            where: {
                uuid
            }
        });
    }
}
