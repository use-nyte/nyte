export const MediaType = {
	VIDEO: "video"
} as const;

export type MediaType = (typeof MediaType)[keyof typeof MediaType];
