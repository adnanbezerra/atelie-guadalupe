import { AdminUsersClient } from "@/components/admin/admin-users-client";
import { fetchUsers } from "@/lib/server-api";

export default async function AdminUsersPage() {
    const usersResult = await Promise.allSettled([fetchUsers()]);
    const initialUsers =
        usersResult[0].status === "fulfilled" ? usersResult[0].value.users : [];

    return <AdminUsersClient initialUsers={initialUsers} />;
}
