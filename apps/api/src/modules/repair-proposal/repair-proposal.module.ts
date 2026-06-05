import { Module } from '@nestjs/common'
import { RepairProposalController } from './repair-proposal.controller'
import { RepairProposalService } from './repair-proposal.service'

@Module({
  controllers: [RepairProposalController],
  providers: [RepairProposalService],
  exports: [RepairProposalService],
})
export class RepairProposalModule {}
