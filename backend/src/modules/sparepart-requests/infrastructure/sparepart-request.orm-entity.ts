import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserOrmEntity } from '../../users/infrastructure/user.orm-entity';
import { WorkOrderOrmEntity } from '../../work-orders/infrastructure/work-order.orm-entity';
import { SparepartRequestStatus } from '../domain/sparepart-request-status.enum';
import { SparepartItemOrmEntity } from './sparepart-item.orm-entity';

@Entity('sparepart_requests')
export class SparepartRequestOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'work_order_id', type: 'uuid' })
  workOrderId: string;

  @ManyToOne(() => WorkOrderOrmEntity, (wo) => wo.sparepartRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder?: WorkOrderOrmEntity;

  @Column({ type: 'varchar', length: 20 })
  status: SparepartRequestStatus;

  @Column({ name: 'request_note', type: 'text' })
  requestNote: string;

  @Column({ name: 'requested_by', type: 'uuid' })
  requestedById: string;

  @ManyToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'requested_by' })
  requestedBy?: UserOrmEntity;

  /** The SPV who reviewed the request (approve or reject). ERD column name kept. */
  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedById: string | null;

  @ManyToOne(() => UserOrmEntity, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedBy?: UserOrmEntity | null;

  @Column({ name: 'approval_note', type: 'text', nullable: true })
  approvalNote: string | null;

  @OneToMany(() => SparepartItemOrmEntity, (item) => item.sparepartRequest, { cascade: ['insert'] })
  items?: SparepartItemOrmEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
