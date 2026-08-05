"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const PRODUCT_IMAGE_FALLBACK = "/empty-product.webp";

type ProductImageProps = Omit<ImageProps, "src" | "alt"> & {
    alt: string;
    src?: string | null;
};

export function ProductImage({
    alt,
    height = 800,
    src,
    width = 800,
    ...props
}: ProductImageProps) {
    const imageSrc = src?.trim() || PRODUCT_IMAGE_FALLBACK;
    const [currentSrc, setCurrentSrc] = useState(imageSrc);
    const { className, ...imageProps } = props;

    useEffect(() => {
        setCurrentSrc(imageSrc);
    }, [imageSrc]);

    return (
        <Image
            alt={alt}
            className={cn("aspect-square object-cover", className)}
            height={height}
            {...imageProps}
            onError={() => {
                if (currentSrc !== PRODUCT_IMAGE_FALLBACK) {
                    setCurrentSrc(PRODUCT_IMAGE_FALLBACK);
                }
            }}
            src={currentSrc}
            width={width}
        />
    );
}
