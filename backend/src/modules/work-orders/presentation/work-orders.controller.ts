import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../../common/decorators/actor.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../users/domain/role.enum';
import { Actor } from '../../users/domain/user';
import { WorkOrdersService } from '../application/work-orders.service';
import {
  AddNoteDto,
  AssignMechanicDto,
  CompleteWorkOrderDto,
  CreateWorkOrderDto,
  EditDraftDto,
  ListWorkOrdersQueryDto,
  UpdateWorkOrderDto,
} from './work-order.dto';

const IdParam = () => Param('id', new ParseUUIDPipe());

/**
 * Thin HTTP layer: validate input (DTOs), call the use case, return its result.
 * Every response includes `availableActions` for the current actor.
 */
@ApiTags('work-orders')
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly service: WorkOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List work orders (mechanics only see the ones assigned to them)' })
  list(@CurrentActor() actor: Actor, @Query() q: ListWorkOrdersQueryDto) {
    return this.service.list(actor, q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Work order detail with sparepart requests' })
  get(@CurrentActor() actor: Actor, @IdParam() id: string) {
    return this.service.getById(actor, id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a work order (DRAFT)' })
  create(@CurrentActor() actor: Actor, @Body() dto: CreateWorkOrderDto) {
    return this.service.create(actor, {
      title: dto.title,
      description: dto.description,
      vehicleId: dto.vehicleId,
      breakdownTime: new Date(dto.breakdownTime),
    });
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Edit a DRAFT work order' })
  editDraft(@CurrentActor() actor: Actor, @IdParam() id: string, @Body() dto: EditDraftDto) {
    return this.service.editDraft(actor, id, {
      ...dto,
      breakdownTime: dto.breakdownTime ? new Date(dto.breakdownTime) : undefined,
    });
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a DRAFT work order' })
  deleteDraft(@CurrentActor() actor: Actor, @IdParam() id: string) {
    return this.service.deleteDraft(actor, id);
  }

  @Post(':id/submit')
  @HttpCode(200)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'DRAFT -> SUBMITTED' })
  submit(@CurrentActor() actor: Actor, @IdParam() id: string) {
    return this.service.submit(actor, id);
  }

  @Post(':id/assign')
  @HttpCode(200)
  @Roles(Role.SPV)
  @ApiOperation({ summary: 'SUBMITTED/ASSIGNED -> ASSIGNED' })
  assign(@CurrentActor() actor: Actor, @IdParam() id: string, @Body() dto: AssignMechanicDto) {
    return this.service.assign(actor, id, dto.mechanicId);
  }

  @Post(':id/update')
  @HttpCode(200)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update (lanjutan): ASSIGNED -> UPDATED' })
  update(@CurrentActor() actor: Actor, @IdParam() id: string, @Body() dto: UpdateWorkOrderDto) {
    return this.service.update(actor, id, dto);
  }

  @Post(':id/start')
  @HttpCode(200)
  @Roles(Role.MECHANIC)
  @ApiOperation({ summary: 'UPDATED/READY_TO_WORK -> WORKING (assigned mechanic only)' })
  start(@CurrentActor() actor: Actor, @IdParam() id: string) {
    return this.service.start(actor, id);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add a note to the activity timeline (anyone who can see the work order)' })
  addNote(@CurrentActor() actor: Actor, @IdParam() id: string, @Body() dto: AddNoteDto) {
    return this.service.addNote(actor, id, dto.note);
  }

  @Post(':id/complete')
  @HttpCode(200)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'WORKING -> COMPLETED with end date' })
  complete(@CurrentActor() actor: Actor, @IdParam() id: string, @Body() dto: CompleteWorkOrderDto) {
    return this.service.complete(actor, id, new Date(dto.endDate));
  }
}
