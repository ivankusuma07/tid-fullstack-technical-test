import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserOrmEntity } from '../../users/infrastructure/user.orm-entity';
import { SparepartRequestOrmEntity } from '../../sparepart-requests/infrastructure/sparepart-request.orm-entity';
import { WorkOrderStatus } from '../domain/work-order-status.enum';

@Entity('work_orders')
export class WorkOrderOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wo_number', type: 'varchar', length: 30, unique: true })
  woNumber: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({ name: 'fleet_number', type: 'varchar', length: 20 })
  fleetNumber: string;

  @Column({ name: 'breakdown_time', type: 'timestamptz' })
  breakdownTime: Date;

  @Index()
  @Column({ type: 'varchar', length: 30 })
  status: WorkOrderStatus;

  @Column({ name: 'created_by', type: 'uuid' })
  createdById: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdBy?: UserOrmEntity;

  @Index()
  @Column({ name: 'assigned_mechanic_id', type: 'uuid', nullable: true })
  assignedMechanicId: string | null;

  @ManyToOne(() => UserOrmEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'assigned_mechanic_id' })
  assignedMechanic?: UserOrmEntity | null;

  @Column({ name: 'start_date', type: 'timestamptz', nullable: true })
  startDate: Date | null;

  @Column({ name: 'end_date', type: 'timestamptz', nullable: true })
  endDate: Date | null;

  @OneToMany(() => SparepartRequestOrmEntity, (r) => r.workOrder)
  sparepartRequests?: SparepartRequestOrmEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
