export type PartnerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export const PARTNER_STATUS_LABEL: Record<PartnerStatus, string> = {
  PENDING: '승인 대기',
  APPROVED: '승인 완료',
  REJECTED: '승인 반려',
  SUSPENDED: '이용 정지',
};

export const canSellAsPartner = (status: PartnerStatus) => status === 'APPROVED';
