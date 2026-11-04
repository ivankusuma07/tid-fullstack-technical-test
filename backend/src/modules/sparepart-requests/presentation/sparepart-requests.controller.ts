import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../../common/decorators/actor.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../users/domain/role.enum';
import { Actor } from '../../users/domain/user';
import { SparepartRequestsService } from '../application/sparepart-requests.service';
import { ApproveSparepartDto, RejectSparepartDto, RequestSparepartDto } from './sparepart-request.dto';

/** All three endpoints return the updated work order detail (with availableActions). */
@ApiTags('sparepart-requests')
@Controller()
export class SparepartRequestsController {
  constructor(private readonly service: SparepartRequestsService) {}

  @Post('work-orders/:id/request-sparepart')
  @Roles(Role.MECHANIC)
  @ApiOperation({ summary: 'UPDATED -> WAITING_SPAREPART (assigned mechanic, note + items)' })
  request(
    @CurrentActor() actor: Actor,
    @Param('id', new ParseUUIDPipe()) workOrderId: string,
    @Body() dto: RequestSparepartDto,
  ) {
    return this.service.requestSparepart(actor, workOrderId, dto);
  }

  @Post('sparepart-requests/:id/approve')
  @HttpCode(200)
  @Roles(Role.SPV)
  @ApiOperation({ summary: 'PENDING -> APPROVED; work order -> READY_TO_WORK' })
  approve(
    @CurrentActor() actor: Actor,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ApproveSparepartDto,
  ) {
    return this.service.approve(actor, id, dto.note);
  }

  @Post('sparepart-requests/:id/reject')
  @HttpCode(200)
  @Roles(Role.SPV)
  @ApiOperation({ summary: 'PENDING -> REJECTED (note required); work order -> UPDATED' })
  reject(
    @CurrentActor() actor: Actor,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RejectSparepartDto,
  ) {
    return this.service.reject(actor, id, dto.note);
  }
}
