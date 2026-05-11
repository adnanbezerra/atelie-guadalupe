import { Prisma, PrismaClient, Testimonial } from "../../../generated/prisma/client";

export class TestimonialRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public listAll() {
        return this.prisma.testimonial.findMany({
            orderBy: {
                createdAt: "desc"
            }
        });
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
