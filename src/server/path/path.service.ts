import { Injectable } from "@nestjs/common";
import path from "path";

@Injectable()
export class PathService {
	private readonly cwd: string;

	constructor() {
		this.cwd = process.cwd();
	}

	public join(...paths: string[]): string {
		return path.join(...paths);
	}

	public joinFromCwd(...paths: string[]): string {
		return path.join(this.cwd, ...paths);
	}
}
