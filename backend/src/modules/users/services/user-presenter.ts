type UserWithRole = {
    uuid: string;
    name: string;
    email: string;
    document: string | null;
    phone?: string | null;
    birthDate?: Date | null;
    isActive: boolean;
    createdAt: Date;
    role: {
        name: "ADMIN" | "SUBADMIN" | "USER";
    };
};

type AddressEntity = {
    uuid: string;
    label: string | null;
    zipCode: string;
    street: string;
    number: string;
    apartmentNumber: string | null;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
    country: string;
    reference: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export function presentUser(user: UserWithRole) {
    return {
        uuid: user.uuid,
        name: user.name,
        email: user.email,
        document: user.document,
        phone: user.phone ?? null,
        birthDate: user.birthDate ?? null,
        role: user.role.name,
        isActive: user.isActive,
        createdAt: user.createdAt
    };
}

export function presentAddress(address: AddressEntity) {
    return {
        uuid: address.uuid,
        label: address.label,
        zipCode: address.zipCode,
        street: address.street,
        number: address.number,
        apartmentNumber: address.apartmentNumber,
        complement: address.complement,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        country: address.country,
        reference: address.reference,
        createdAt: address.createdAt,
        updatedAt: address.updatedAt
    };
}
