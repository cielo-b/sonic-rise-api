export declare class Portfolio {
    id: string;
    title: string;
    category: string;
    mediaUrl: string;
    thumbnailUrl: string | null;
    description: string | null;
    isFeatured: boolean;
    sortOrder: number;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}
