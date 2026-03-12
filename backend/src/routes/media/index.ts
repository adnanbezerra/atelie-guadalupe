import { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const mediaImageParamSchema = z.object({
    id: z.string().regex(/^[a-f0-9]{24}$/i, "Id de imagem invalido")
});

const mediaRoutePlugin: FastifyPluginAsync = async (fastify) => {
    fastify.get("/images/:id", async (request, reply) => {
        if (!fastify.mongoBucket) {
            return reply.status(503).send({
                success: false,
                error: {
                    code: "MEDIA_STORAGE_UNAVAILABLE",
                    message: "Storage de imagens nao configurado",
                    details: []
                }
            });
        }

        const params = fastify.validateSchema(mediaImageParamSchema, request.params);

        const files = await fastify.mongoDb!.collection("product-images.files").find({
            _id: fastify.mongoObjectId(params.id)
        }).toArray();

        if (files.length === 0) {
            return reply.status(404).send({
                success: false,
                error: {
                    code: "RESOURCE_NOT_FOUND",
                    message: "Imagem nao encontrada",
                    details: []
                }
            });
        }

        const file = files[0] as { metadata?: { contentType?: string } };
        if (file.metadata?.contentType) {
            reply.type(file.metadata.contentType);
        }

        return reply.send(fastify.mongoBucket.openDownloadStream(fastify.mongoObjectId(params.id)));
    });
};

export default mediaRoutePlugin;
