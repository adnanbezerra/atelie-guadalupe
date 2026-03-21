import { AdminUsersClient } from "@/components/admin/admin-users-client";
import { fetchCurrentUser } from "@/lib/server-api";

export default async function AdminUsersPage() {
    const userResult = await Promise.allSettled([fetchCurrentUser()]);
    const initialUser =
        userResult[0].status === "fulfilled" ? userResult[0].value.user : null;

    return <AdminUsersClient initialUser={initialUser} />;
}
