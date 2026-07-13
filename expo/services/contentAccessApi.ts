import { callAuthenticatedFunction } from '@/services/functionsApi';
import type { LimitedResource } from '@/types/subscription';

export const contentAccessApi = {
  create(resource: LimitedResource, id: string, data: Record<string, unknown>) {
    return callAuthenticatedFunction<{ ok: true; id: string }>('mutateContent', {
      action: 'create',
      resource,
      id,
      data,
    });
  },

  delete(resource: LimitedResource, id: string) {
    return callAuthenticatedFunction<{ ok: true; id: string }>('mutateContent', {
      action: 'delete',
      resource,
      id,
    });
  },

  createProjectTask(projectId: string, id: string, data: Record<string, unknown>) {
    return callAuthenticatedFunction<{ ok: true; id: string }>('mutateContent', {
      action: 'createProjectTask',
      projectId,
      id,
      data,
    });
  },

  deleteProjectTask(projectId: string, id: string) {
    return callAuthenticatedFunction<{ ok: true; id: string }>('mutateContent', {
      action: 'deleteProjectTask',
      projectId,
      id,
    });
  },
};
