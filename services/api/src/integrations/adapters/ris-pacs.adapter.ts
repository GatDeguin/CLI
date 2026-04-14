import { Injectable } from '@nestjs/common';
import { BaseIntegrationAdapter } from './base.adapter';

export interface ImagingStudyInput {
  readonly patientId: string;
  readonly modality: 'XR' | 'CT' | 'MR' | 'US';
  readonly accessionNumber: string;
}

@Injectable()
export class RisPacsAdapter extends BaseIntegrationAdapter {
  constructor() {
    super('ris-pacs', process.env.RIS_PACS_API_URL ?? '', process.env.RIS_PACS_API_KEY ?? '');
  }

  async registerStudy(study: ImagingStudyInput, correlationId: string): Promise<{ studyUid: string }> {
    return this.request<{ studyUid: string }>('/api/v1/studies', 'POST', study, correlationId);
  }
}
