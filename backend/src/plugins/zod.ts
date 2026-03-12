import fp from "fastify-plugin";
import { ZodType } from "zod";

export default fp(async (fastify) => {
    fastify.decorate("validateSchema", function <TOutput>(schema: ZodType<TOutput>, data: unknown): TOutput {
        return schema.parse(data);
    });
});

declare module "fastify" {
    export interface FastifyInstance {
        validateSchema<TOutput>(schema: ZodType<TOutput>, data: unknown): TOutput;
    }
}
