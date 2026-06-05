import { ObjectId, GridFSBucket } from "mongodb";
import { AppError } from "../errors/app-error";
import { ImageStorage, UploadImageInput } from "./image-storage";

const allowedContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedVideoContentTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export class MongoImageStorage implements ImageStorage {
    private readonly mediaBaseUrl: string;

    public constructor(
        private readonly bucket: GridFSBucket | null,
        private readonly videoBucket: GridFSBucket | null,
        mediaBaseUrl: string
    ) {
        this.mediaBaseUrl = mediaBaseUrl.replace(/\/+$/, "");
    }

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

        const uploadStream = this.bucket.openUploadStream(input.filename, {
            metadata: {
                kind: "product-image",
                contentType: input.contentType
            }
        });

        await new Promise<void>((resolve, reject) => {
            uploadStream.once("finish", () => resolve());
            uploadStream.once("error", (error) => reject(error));
            uploadStream.end(input.buffer);
        });

        return this.mediaUrl("images", uploadStream.id.toString());
    }

    public async uploadTestimonialVideo(input: UploadImageInput): Promise<string> {
        if (!this.videoBucket) {
            throw AppError.business("Storage de videos nao configurado");
        }

        if (!allowedVideoContentTypes.has(input.contentType)) {
            throw AppError.validation("Tipo de video nao suportado");
        }

        const uploadStream = this.videoBucket.openUploadStream(input.filename, {
            metadata: {
                kind: "testimonial-video",
                contentType: input.contentType
            }
        });

        await new Promise<void>((resolve, reject) => {
            uploadStream.once("finish", () => resolve());
            uploadStream.once("error", (error) => reject(error));
            uploadStream.end(input.buffer);
        });

        return this.mediaUrl("videos", uploadStream.id.toString());
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

    public async deleteTestimonialVideoByUrl(url: string): Promise<void> {
        if (!this.videoBucket) {
            return;
        }

        const videoId = this.extractMediaId(url, "videos");
        if (!videoId) {
            return;
        }

        await this.videoBucket.delete(new ObjectId(videoId)).catch(() => undefined);
    }

    private extractImageId(url: string): string | null {
        return this.extractMediaId(url, "images");
    }

    private extractMediaId(url: string, mediaType: "images" | "videos"): string | null {
        const match = url.match(new RegExp(`/media/${mediaType}/([a-f0-9]{24})$`, "i"));
        return match?.[1] ?? null;
    }

    private mediaUrl(mediaType: "images" | "videos", id: string): string {
        return `${this.mediaBaseUrl}/media/${mediaType}/${id}`;
    }
}
