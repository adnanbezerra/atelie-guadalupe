import { ObjectId, GridFSBucket } from "mongodb";
import { AppError } from "../errors/app-error";
import { ImageStorage, UploadImageInput } from "./image-storage";

const allowedContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export class MongoImageStorage implements ImageStorage {
    public constructor(
        private readonly bucket: GridFSBucket | null,
        private readonly mediaBaseUrl: string
    ) {}

    public isConfigured(): boolean {
        return this.bucket !== null;
    }

    public async uploadProductImage(input: UploadImageInput): Promise<string> {
        if (!this.bucket) {
            throw AppError.business("Storage de imagens nao configurado");
        }

        if (!allowedContentTypes.has(input.contentType)) {
            throw AppError.validation("Tipo de imagem nao suportado");
        }

        const buffer = this.decodeBase64(input.base64);
        const uploadStream = this.bucket.openUploadStream(input.filename, {
            metadata: {
                kind: "product-image",
                contentType: input.contentType
            }
        });

        await new Promise<void>((resolve, reject) => {
            uploadStream.once("finish", () => resolve());
            uploadStream.once("error", (error) => reject(error));
            uploadStream.end(buffer);
        });

        return `${this.mediaBaseUrl}/media/images/${uploadStream.id.toString()}`;
    }

    public async deleteProductImageByUrl(url: string): Promise<void> {
        if (!this.bucket) {
            return;
        }

        const imageId = this.extractImageId(url);
        if (!imageId) {
            return;
        }

        await this.bucket.delete(new ObjectId(imageId)).catch(() => undefined);
    }

    private decodeBase64(value: string): Buffer {
        try {
            return Buffer.from(value, "base64");
        } catch {
            throw AppError.validation("Imagem em base64 invalida");
        }
    }

    private extractImageId(url: string): string | null {
        const match = url.match(/\/media\/images\/([a-f0-9]{24})$/i);
        return match?.[1] ?? null;
    }
}
