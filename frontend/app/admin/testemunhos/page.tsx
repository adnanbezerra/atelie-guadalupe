import { AdminTestimonialsClient } from "@/components/admin/admin-testimonials-client";
import { ApiError } from "@/lib/api-error";
import { fetchTestimonials } from "@/lib/server-api";

export default async function AdminTestimonialsPage() {
    const testimonialsResult = await Promise.allSettled([fetchTestimonials()]);
    const initialTestimonials =
        testimonialsResult[0].status === "fulfilled"
            ? testimonialsResult[0].value
            : { testimonials: [] };
    const initialError =
        testimonialsResult[0].status === "rejected"
            ? {
                  message:
                      testimonialsResult[0].reason instanceof Error
                          ? testimonialsResult[0].reason.message
                          : "Não foi possível consultar os testemunhos.",
                  status:
                      testimonialsResult[0].reason instanceof ApiError
                          ? testimonialsResult[0].reason.status
                          : null,
              }
            : null;

    return (
        <AdminTestimonialsClient
            initialData={initialTestimonials}
            initialError={initialError}
        />
    );
}
