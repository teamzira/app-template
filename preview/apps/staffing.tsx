import CandidatesPage from '@/app/candidates/page';
import JobOrdersPage from '@/app/page';
import PlacementsPage from '@/app/placements/page';
import FillReportPage from '@/app/reports/fill/page';
import PipelineReportPage from '@/app/reports/stages/page';
import type { PreviewRoutes } from '../entry';

export const routes: PreviewRoutes = {
  '/': JobOrdersPage,
  '/candidates/': CandidatesPage,
  '/placements/': PlacementsPage,
  '/reports/fill/': FillReportPage,
  '/reports/stages/': PipelineReportPage,
};
