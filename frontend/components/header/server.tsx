import { HeaderFrame } from "./header-frame";
import { SearchQueryInput } from "./search-query-input";

type ServerHeaderProps = {
    activeCollection?: "beauty" | "crafts";
    search?: string;
    searchPath?: string;
};

export function ServerHeader({
    activeCollection,
    search = "",
    searchPath,
}: ServerHeaderProps) {
    return (
        <HeaderFrame
            activeCollection={activeCollection}
            searchSlot={
                <SearchQueryInput
                    initialValue={search}
                    searchPath={searchPath}
                />
            }
        />
    );
}
