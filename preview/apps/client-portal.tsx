import OverviewPage from '@/app/page';
import SchedulePage from '@/app/schedule/page';
import StaffPage from '@/app/staff/page';
import type { PreviewRoutes } from '../entry';

export const routes: PreviewRoutes = { '/': OverviewPage, '/schedule/': SchedulePage, '/staff/': StaffPage };
