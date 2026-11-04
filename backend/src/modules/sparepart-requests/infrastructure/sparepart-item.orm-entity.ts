import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SparepartRequestOrmEntity } from './sparepart-request.orm-entity';

@Entity('sparepart_items')
export class SparepartItemOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sparepart_request_id', type: 'uuid' })
  sparepartRequestId: string;

  @ManyToOne(() => SparepartRequestOrmEntity, (r) => r.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sparepart_request_id' })
  sparepartRequest?: SparepartRequestOrmEntity;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int' })
  qty: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
