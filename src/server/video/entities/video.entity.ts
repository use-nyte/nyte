import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Video {
	@Column()
	filePath: string;

	@Column()
	fileSize: number;

	@PrimaryGeneratedColumn()
	id: number;
}
