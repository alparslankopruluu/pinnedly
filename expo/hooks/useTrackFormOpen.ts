import { useEffect } from 'react';
import { trackFormOpen } from '@/lib/analytics';

type FormType = 'bookmark' | 'note' | 'project' | 'todo' | 'list';

export function useTrackFormOpen(form: FormType, source?: string): void {
  useEffect(() => {
    trackFormOpen(form, source);
  }, [form, source]);
}