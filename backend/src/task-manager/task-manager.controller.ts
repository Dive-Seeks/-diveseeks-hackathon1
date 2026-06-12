import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskManagerService } from './services/task-manager.service';
import { CreateTaskDto, AddDependencyDto } from './dto/task-manager.dto';

@Controller('task-manager')
@UseGuards(JwtAuthGuard)
export class TaskManagerController {
  constructor(private readonly taskManager: TaskManagerService) {}

  @Post('tasks')
  createTask(@Req() req: any, @Body() dto: CreateTaskDto) {
    return this.taskManager.createTask(dto, req.user.tenantId);
  }

  @Get('tasks')
  listTasks(@Req() req: any, @Query('workflowExecutionId') wfId?: string) {
    return this.taskManager.listTasks(req.user.tenantId, wfId);
  }

  @Get('tasks/:id')
  getTask(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.taskManager.getTask(id, req.user.tenantId);
  }

  @Post('tasks/:id/dependencies')
  addDependency(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddDependencyDto,
  ) {
    return this.taskManager.addDependency(id, dto, req.user.tenantId);
  }

  @Get('tasks/:id/dependencies')
  getDependencies(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskManager.getDependencies(id);
  }

  @Get('tasks/:id/attempts')
  getAttempts(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskManager.getAttempts(id);
  }

  @Post('tasks/:id/complete')
  markComplete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('output') output: Record<string, any>,
  ) {
    return this.taskManager.markComplete(id, output ?? {});
  }

  @Post('tasks/:id/fail')
  markFailed(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('error') error: string,
  ) {
    return this.taskManager.markFailed(id, error ?? 'Unknown error');
  }
}
