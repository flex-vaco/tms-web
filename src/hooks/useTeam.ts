import { useQuery } from '@tanstack/react-query';
import { teamService } from '../services/team.service';

export function useMyReports() {
  return useQuery({
    queryKey: ['team', 'my-reports'],
    queryFn: teamService.getMyReports,
  });
}

export function useMyManagers() {
  return useQuery({
    queryKey: ['team', 'my-managers'],
    queryFn: teamService.getMyManagers,
  });
}
