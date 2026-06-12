import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentSkill } from './skills/skill.entity';
import { SkillService } from './skills/skill.service';
import { SkillController } from './skills/skill.controller';
import { AgentRule } from './rules/rule.entity';
import { RuleService } from './rules/rule.service';
import { RuleController } from './rules/rule.controller';
import { AgentPlugin } from './plugins/plugin.entity';
import { PluginService } from './plugins/plugin.service';
import { PluginController } from './plugins/plugin.controller';
import { WorkforceController } from './workforce.controller';
import { TenantPluginLoader } from './tenant-plugin-loader.service';
import { SandboxModule } from '../sandbox/sandbox.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentSkill, AgentRule, AgentPlugin]),
    SandboxModule,
  ],
  controllers: [
    SkillController,
    RuleController,
    PluginController,
    WorkforceController,
  ],
  providers: [SkillService, RuleService, PluginService, TenantPluginLoader],
  exports: [SkillService, RuleService, PluginService, TenantPluginLoader],
})
export class WorkforceModule {}
