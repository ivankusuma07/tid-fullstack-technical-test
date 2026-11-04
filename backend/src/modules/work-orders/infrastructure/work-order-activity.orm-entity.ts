import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserOrmEntity } from '../../users/infrastructure/user.orm-entity';
import { ActivityAction } from '../domain/work-order-activity';
import { WorkOrderStatus } from '../domain/work-order-status.enum';
import { WorkOrderOrmEntity } from './work-order.orm-entity';

@Entity('work_order_activities')
export class WorkOrderActivityOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'work_order_id', type: 'uuid' })
  workOrderId: string;

  @ManyToOne(() => WorkOrderOrmEntity, (wo) => wo.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder?: WorkOrderOrmEntity;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId: string;

  @ManyToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'actor_id' })
  actor?: UserOrmEntity;

  @Column({ type: 'varchar', length: 30 })
  action: ActivityAction;

  @Column({ name: 'from_status', type: 'varchar', length: 30, nullable: true })
  fromStatus: WorkOrderStatus | null;

  @Column({ name: 'to_status', type: 'varchar', length: 30, nullable: true })
  toStatus: WorkOrderStatus | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
