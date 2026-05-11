export type UploadImageInput = {
    filename: string;
    contentType: string;
    buffer: Buffer;
};

export interface ImageStorage {
    uploadProductImage(input: UploadImageInput): Promise<string>;
    deleteProductImageByUrl(url: string): Promise<void>;
    isConfigured(): boolean;
}
