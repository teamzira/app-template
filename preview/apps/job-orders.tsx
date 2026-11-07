import JobOrdersPage from '@/app/page';
import PlacementsPage from '@/app/placements/page';
import type { PreviewRoutes } from '../entry';

export const routes: PreviewRoutes = { '/': JobOrdersPage, '/placements/': PlacementsPage };
