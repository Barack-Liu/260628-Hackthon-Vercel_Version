export interface Job {
  id: string;
  status: 'parsing' | 'generating' | 'assembling' | 'delivering' | 'done' | 'error';
  statusText: string;
  vnUrl: string | null;
  vnHtml?: string;
}

export const jobs = new Map<string, Job>();
