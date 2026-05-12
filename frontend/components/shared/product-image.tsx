"use client";

import type { ImgHTMLAttributes } from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const PRODUCT_IMAGE_FALLBACK = "/empty-product.webp";

type ProductImageProps = Omit<
    ImgHTMLAttributes<HTMLImageElement>,
    "src" | "alt"
> & {
    alt: string;
    src?: string | null;
};

export function ProductImage({ alt, src, ...props }: ProductImageProps) {
    const imageSrc = src?.trim() || PRODUCT_IMAGE_FALLBACK;
    const [currentSrc, setCurrentSrc] = useState(imageSrc);
    const { className, ...imageProps } = props;

    useEffect(() => {
        setCurrentSrc(imageSrc);
    }, [imageSrc]);

    return (
        <img
            alt={alt}
            className={cn("aspect-square object-cover", className)}
            {...imageProps}
            onError={() => {
                if (currentSrc !== PRODUCT_IMAGE_FALLBACK) {
                    setCurrentSrc(PRODUCT_IMAGE_FALLBACK);
                }
            }}
            src={currentSrc}
        />
    );
}
