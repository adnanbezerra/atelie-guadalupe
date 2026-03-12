export type UploadImageInput = {
    filename: string;
    contentType: string;
    base64: string;
};

export interface ImageStorage {
    uploadProductImage(input: UploadImageInput): Promise<string>;
    deleteProductImageByUrl(url: string): Promise<void>;
    isConfigured(): boolean;
}
