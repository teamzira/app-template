import SchedulePage from '@/app/page';
import OpenShiftsPage from '@/app/open-shifts/page';
import AttendanceReportPage from '@/app/reports/attendance/page';
import HoursReportPage from '@/app/reports/hours/page';
import type { PreviewRoutes } from '../entry';

export const routes: PreviewRoutes = {
  '/': SchedulePage,
  '/open-shifts/': OpenShiftsPage,
  '/reports/hours/': HoursReportPage,
  '/reports/attendance/': AttendanceReportPage,
};
