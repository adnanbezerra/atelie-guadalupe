type UserWithRole = {
    uuid: string;
    name: string;
    email: string;
    document: string;
    isActive: boolean;
    createdAt: Date;
    role: {
        name: "ADMIN" | "SUBADMIN" | "USER";
    };
};

type AddressEntity = {
    uuid: string;
    label: string | null;
    recipient: string;
    zipCode: string;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
    country: string;
    reference: string | null;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export function presentUser(user: UserWithRole) {
    return {
        uuid: user.uuid,
        name: user.name,
        email: user.email,
        document: user.document,
        role: user.role.name,
        isActive: user.isActive,
        createdAt: user.createdAt
    };
}

export function presentAddress(address: AddressEntity) {
    return {
        uuid: address.uuid,
        label: address.label,
        recipient: address.recipient,
        zipCode: address.zipCode,
        street: address.street,
        number: address.number,
        complement: address.complement,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        country: address.country,
        reference: address.reference,
        isDefault: address.isDefault,
        createdAt: address.createdAt,
        updatedAt: address.updatedAt
    };
}
