import type { CompassStatus } from './model';

export function statusColors(status: CompassStatus, isDark: boolean) {
  switch (status) {
    case 'STRONG':
      return isDark
        ? {
            bg: 'rgba(188, 160, 255, 0.18)',
            text: '#F0E7FF',
            soft: 'rgba(188, 160, 255, 0.10)',
            ring: ['#E1CBFF', '#CDAFFF'] as [string, string],
            pill: ['rgba(214, 194, 255, 0.28)', 'rgba(183, 153, 244, 0.16)'] as [string, string],
          }
        : {
            bg: 'rgba(198, 168, 255, 0.18)',
            text: '#6B40C5',
            soft: 'rgba(198, 168, 255, 0.10)',
            ring: ['#F0DBFF', '#D6B6FF'] as [string, string],
            pill: ['#F5E9FF', '#EBD8FF'] as [string, string],
          };
    case 'SUPPORTIVE':
      return isDark
        ? {
            bg: 'rgba(171, 190, 255, 0.16)',
            text: '#E5EBFF',
            soft: 'rgba(171, 190, 255, 0.09)',
            ring: ['#D5E1FF', '#BFD0FF'] as [string, string],
            pill: ['rgba(196, 212, 255, 0.24)', 'rgba(150, 171, 238, 0.15)'] as [string, string],
          }
        : {
            bg: 'rgba(182, 200, 255, 0.18)',
            text: '#4D62BF',
            soft: 'rgba(182, 200, 255, 0.09)',
            ring: ['#E2EAFF', '#C5D5FF'] as [string, string],
            pill: ['#EEF3FF', '#E3EBFF'] as [string, string],
          };
    case 'BALANCED':
      return isDark
        ? {
            bg: 'rgba(235, 230, 246, 0.12)',
            text: '#E6E0F3',
            soft: 'rgba(235, 230, 246, 0.08)',
            ring: ['#EFEAF7', '#D3C9E8'] as [string, string],
            pill: ['rgba(255, 255, 255, 0.14)', 'rgba(224, 214, 246, 0.10)'] as [string, string],
          }
        : {
            bg: 'rgba(218, 209, 236, 0.22)',
            text: '#6E6784',
            soft: 'rgba(218, 209, 236, 0.12)',
            ring: ['#F1ECF8', '#DDD2EE'] as [string, string],
            pill: ['#F5F0FB', '#EEE7F7'] as [string, string],
          };
    case 'CAUTION':
      return isDark
        ? {
            bg: 'rgba(255, 192, 221, 0.16)',
            text: '#FFE5F2',
            soft: 'rgba(255, 192, 221, 0.08)',
            ring: ['#FFD8EA', '#F4B7D5'] as [string, string],
            pill: ['rgba(255, 213, 234, 0.24)', 'rgba(232, 175, 207, 0.14)'] as [string, string],
          }
        : {
            bg: 'rgba(255, 214, 233, 0.24)',
            text: '#A5527E',
            soft: 'rgba(255, 214, 233, 0.12)',
            ring: ['#FFE6F1', '#F6C9DD'] as [string, string],
            pill: ['#FFF0F6', '#FBE2EC'] as [string, string],
          };
    case 'HOLD':
      return isDark
        ? {
            bg: 'rgba(255, 206, 222, 0.16)',
            text: '#FFE8F0',
            soft: 'rgba(255, 206, 222, 0.08)',
            ring: ['#FFE5EE', '#F7C7D8'] as [string, string],
            pill: ['rgba(255, 226, 237, 0.22)', 'rgba(236, 183, 205, 0.14)'] as [string, string],
          }
        : {
            bg: 'rgba(255, 226, 236, 0.24)',
            text: '#A65878',
            soft: 'rgba(255, 226, 236, 0.12)',
            ring: ['#FFF0F5', '#F5D2E0'] as [string, string],
            pill: ['#FFF3F7', '#FCE6EE'] as [string, string],
          };
    default:
      return isDark
        ? {
            bg: 'rgba(235, 230, 246, 0.12)',
            text: '#E6E0F3',
            soft: 'rgba(235, 230, 246, 0.08)',
            ring: ['#EFEAF7', '#D3C9E8'] as [string, string],
            pill: ['rgba(255, 255, 255, 0.14)', 'rgba(224, 214, 246, 0.10)'] as [string, string],
          }
        : {
            bg: 'rgba(218, 209, 236, 0.22)',
            text: '#6E6784',
            soft: 'rgba(218, 209, 236, 0.12)',
            ring: ['#F1ECF8', '#DDD2EE'] as [string, string],
            pill: ['#F5F0FB', '#EEE7F7'] as [string, string],
          };
  }
}
