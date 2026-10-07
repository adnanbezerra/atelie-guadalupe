import { AdminUsersClient } from "@/components/admin/admin-users-client";
import { ApiError } from "@/lib/api-error";
import { fetchUsers } from "@/lib/server-api";

export default async function AdminUsersPage() {
    const usersResult = await Promise.allSettled([
        fetchUsers({ page: 1, pageSize: 20, role: "SUBADMIN" }),
    ]);
    const initialData =
        usersResult[0].status === "fulfilled"
            ? usersResult[0].value
            : {
                  users: [],
                  pagination: {
                      page: 1,
                      pageSize: 20,
                      total: 0,
                      totalPages: 0,
                  },
              };
    const initialError =
        usersResult[0].status === "rejected"
            ? {
                  message:
                      usersResult[0].reason instanceof Error
                          ? usersResult[0].reason.message
                          : "Não foi possível consultar os usuários.",
                  status:
                      usersResult[0].reason instanceof ApiError
                          ? usersResult[0].reason.status
                          : null,
              }
            : null;

    return (
        <AdminUsersClient
            initialError={initialError}
            initialData={initialData}
        />
    );
}
