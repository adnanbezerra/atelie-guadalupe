"use client";

import { useApiResource } from "./use-api-resource";
import { useApiToken } from "@/hooks/use-api-token";
import {
    deactivateTestimonial as deactivateTestimonialRequest,
    deleteTestimonial as deleteTestimonialRequest,
    getTestimonials,
    upsertTestimonial,
} from "@/lib/api";
import type {
    CreateTestimonialInput,
    TestimonialsPayload,
    UpdateTestimonialInput,
} from "@/lib/types";

type UploadProgressOptions = {
    onUploadProgress?: (progress: number) => void;
};

export function useAdminTestimonials(initialData: TestimonialsPayload) {
    const token = useApiToken();
    const resource = useApiResource(initialData, () => getTestimonials(token));

    return {
        ...resource,
        async createTestimonial(
            payload: CreateTestimonialInput,
            options: UploadProgressOptions = {},
        ) {
            if (!token) {
                throw new Error("Faça login para criar testemunhos.");
            }

            await upsertTestimonial(token, payload, options);
            await resource.refresh();
        },
        async updateTestimonial(
            payload: UpdateTestimonialInput,
            options: UploadProgressOptions = {},
        ) {
            if (!token) {
                throw new Error("Faça login para editar testemunhos.");
            }

            await upsertTestimonial(token, payload, options);
            await resource.refresh();
        },
        async deactivateTestimonial(testimonialUuid: string) {
            if (!token) {
                throw new Error("Faça login para desativar testemunhos.");
            }

            await deactivateTestimonialRequest(token, testimonialUuid);
            await resource.refresh();
        },
        async deleteTestimonial(testimonialUuid: string) {
            if (!token) {
                throw new Error("Faça login para remover testemunhos.");
            }

            await deleteTestimonialRequest(token, testimonialUuid);
            await resource.refresh();
        },
    };
}
