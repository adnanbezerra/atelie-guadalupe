import { AdminTestimonialsClient } from "@/components/admin/admin-testimonials-client";
import { fetchTestimonials } from "@/lib/server-api";

export default async function AdminTestimonialsPage() {
    const testimonialsResult = await Promise.allSettled([fetchTestimonials()]);
    const initialTestimonials =
        testimonialsResult[0].status === "fulfilled"
            ? testimonialsResult[0].value
            : { testimonials: [] };

    return <AdminTestimonialsClient initialData={initialTestimonials} />;
}
