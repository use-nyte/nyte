import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Video {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	filePath: string;

	@Column()
	fileSize: number;
}
