export declare class Media {
    id: string;
    name: string;
    type: string;
    badge: string;
    badgeColor: string;
    size: string;
    duration: string | null;
    status: string;
    statusColor: string;
    src: string | null;
    resolution: string | null;
    tags: string[];
    isFolder: boolean;
    parentId: string | null;
    isFavorite: boolean;
    isTrash: boolean;
    createdAt: Date;
    updatedAt: Date;
    clientId: string | null;
}
