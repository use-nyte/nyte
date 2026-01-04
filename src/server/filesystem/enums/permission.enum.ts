import { constants } from "fs";

export const Permission = {
	VISIBLE: constants.F_OK,
	READABLE: constants.R_OK,
	WRITABLE: constants.W_OK,
	EXECUTABLE: constants.X_OK
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];
export type Permissions = number;
