export type UploadImageInput = {
    filename: string;
    contentType: string;
    buffer: Buffer;
};

export type UploadVideoInput = UploadImageInput;

export interface ImageStorage {
    uploadProductImage(input: UploadImageInput): Promise<string>;
    uploadTestimonialVideo(input: UploadVideoInput): Promise<string>;
    deleteProductImageByUrl(url: string): Promise<void>;
    deleteTestimonialVideoByUrl(url: string): Promise<void>;
    isConfigured(): boolean;
}
