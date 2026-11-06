/**
 * Pure room code parser and mapper according to Section 4 rules.
 * No network or model calls.
 */

export type RoomStatus = 'confirmed' | 'inferred' | 'unknown';

export interface RoomCodeResolution {
  rawCode: string;
  blockCode: string | null;
  blockName: string | null;
  floor: number | null; // 0 for ground, 1 for 1st floor, etc. null if unknown
  floorLabel: string | null;
  roomNumber: string | null;
  status: RoomStatus;
  isNonRoomSlot: boolean;
  notes?: string;
}

const BLOCK_NAMES: Record<string, string> = {
  A: 'Vignan Bhavan',
  H: 'H Block',
  U: 'Aryabhata Bhavan',
  N: 'Nagarjuna Bhavan',
  P: 'P Block'
};

const BARE_NUMBERS_UNKNOWN = new Set([
  '604', '607', '617', '618', '611', '612', '615', '214', '215', '217', '218',
  '514-A', '514-B', '516', '518', '601', '605', '606', '608', '613', '614', '616', '619'
]);

export function parseRoomCode(rawCodeInput: string): RoomCodeResolution {
  const rawCode = (rawCodeInput || '').trim();
  const normalized = rawCode.replace(/\s+/g, ' ');

  if (!normalized) {
    return {
      rawCode,
      blockCode: null,
      blockName: null,
      floor: null,
      floorLabel: null,
      roomNumber: null,
      status: 'unknown',
      isNonRoomSlot: false,
      notes: 'Empty room code'
    };
  }

  // Check Library / non-room slots
  const upper = normalized.toUpperCase();
  if (
    upper.includes('LAB-1(LIB)') ||
    upper.includes('LAB-1 (LIB)') ||
    upper.includes('LIBRARY') ||
    upper.startsWith('LIB-')
  ) {
    return {
      rawCode,
      blockCode: null,
      blockName: null,
      floor: null,
      floorLabel: 'Library',
      roomNumber: normalized,
      status: 'confirmed',
      isNonRoomSlot: true,
      notes: 'Library slot, non-room resource'
    };
  }

  // Bare numbers known to be unconfirmed
  if (BARE_NUMBERS_UNKNOWN.has(normalized) || BARE_NUMBERS_UNKNOWN.has(upper)) {
    return {
      rawCode,
      blockCode: null,
      blockName: null,
      floor: null,
      floorLabel: null,
      roomNumber: normalized,
      status: 'unknown',
      isNonRoomSlot: false,
      notes: 'Bare number requiring department confirmation'
    };
  }

  // Special AFTF prefix known to be unknown
  if (upper.startsWith('AFTF-') || upper.startsWith('AFTF')) {
    return {
      rawCode,
      blockCode: null,
      blockName: null,
      floor: null,
      floorLabel: null,
      roomNumber: normalized,
      status: 'unknown',
      isNonRoomSlot: false,
      notes: 'AFTF scheme requiring department confirmation'
    };
  }

  // Seminar Hall check: e.g. "Seminar Hall N-110", "N-110 Seminar Hall", "Seminar Hall"
  if (upper.includes('SEMINAR HALL') || upper.includes('SEMINAR')) {
    const hallMatch = normalized.match(/N-?(\d{3})/i);
    if (hallMatch) {
      const roomNum = `N-${hallMatch[1]}`;
      const firstDigit = parseInt(hallMatch[1][0], 10);
      return {
        rawCode,
        blockCode: 'N',
        blockName: BLOCK_NAMES.N,
        floor: firstDigit,
        floorLabel: `Floor ${firstDigit}`,
        roomNumber: roomNum,
        status: 'confirmed',
        isNonRoomSlot: false,
        notes: 'Seminar Hall in Nagarjuna Bhavan'
      };
    }
    return {
      rawCode,
      blockCode: 'N',
      blockName: BLOCK_NAMES.N,
      floor: 1,
      floorLabel: 'Floor 1',
      roomNumber: 'N-110',
      status: 'inferred',
      isNonRoomSlot: false,
      notes: 'Seminar Hall inferred as N-110'
    };
  }

  // Block A rules
  // VBFF-nn, VBFF -> Floor 1
  if (/^VBFF-?(\d+)?$/i.test(normalized) || /^VBFF\s+(\d+)$/i.test(normalized)) {
    const match = normalized.match(/^VBFF[- ]?(\d+)?$/i);
    const roomNum = match && match[1] ? match[1] : '1';
    return {
      rawCode,
      blockCode: 'A',
      blockName: BLOCK_NAMES.A,
      floor: 1,
      floorLabel: 'Floor 1',
      roomNumber: `A-${roomNum}`,
      status: 'confirmed',
      isNonRoomSlot: false
    };
  }

  // VBSF-nn, VBSF -> Floor 2
  if (/^VBSF-?(\d+)?$/i.test(normalized) || /^VBSF\s+(\d+)$/i.test(normalized)) {
    const match = normalized.match(/^VBSF[- ]?(\d+)?$/i);
    const roomNum = match && match[1] ? match[1] : '2';
    return {
      rawCode,
      blockCode: 'A',
      blockName: BLOCK_NAMES.A,
      floor: 2,
      floorLabel: 'Floor 2',
      roomNumber: `A-${roomNum}`,
      status: 'confirmed',
      isNonRoomSlot: false
    };
  }

  // VBTF-nn, VBT-nn, VBTF nn -> Floor 3
  if (/^VBTF?-?(\d+)?$/i.test(normalized) || /^VBTF?\s+(\d+)$/i.test(normalized)) {
    const match = normalized.match(/^VBTF?[- ]?(\d+)?$/i);
    const roomNum = match && match[1] ? match[1] : '3';
    return {
      rawCode,
      blockCode: 'A',
      blockName: BLOCK_NAMES.A,
      floor: 3,
      floorLabel: 'Floor 3',
      roomNumber: `A-${roomNum}`,
      status: 'confirmed',
      isNonRoomSlot: false
    };
  }

  // VBFTF-nn, VBFTTF-nn -> Floor 4
  if (/^VBFTT?F-?(\d+)?$/i.test(normalized) || /^VBFTT?F\s+(\d+)$/i.test(normalized)) {
    const match = normalized.match(/^VBFTT?F[- ]?(\d+)?$/i);
    const roomNum = match && match[1] ? match[1] : '4';
    return {
      rawCode,
      blockCode: 'A',
      blockName: BLOCK_NAMES.A,
      floor: 4,
      floorLabel: 'Floor 4',
      roomNumber: `A-${roomNum}`,
      status: 'confirmed',
      isNonRoomSlot: false
    };
  }

  // VBFFTF-nn -> Floor 5 (confirmed)
  if (/^VBFFTF-?(\d+)?$/i.test(normalized) || /^VBFFTF\s+(\d+)$/i.test(normalized)) {
    const match = normalized.match(/^VBFFTF[- ]?(\d+)?$/i);
    const roomNum = match && match[1] ? match[1] : '5';
    return {
      rawCode,
      blockCode: 'A',
      blockName: BLOCK_NAMES.A,
      floor: 5,
      floorLabel: 'Floor 5',
      roomNumber: `A-${roomNum}`,
      status: 'confirmed',
      isNonRoomSlot: false
    };
  }

  // VBFFT-nn -> Floor 5 (inferred: VBFFT read as VBFFTF)
  if (/^VBFFT-?(\d+)?$/i.test(normalized) || /^VBFFT\s+(\d+)$/i.test(normalized)) {
    const match = normalized.match(/^VBFFT[- ]?(\d+)?$/i);
    const roomNum = match && match[1] ? match[1] : '5';
    return {
      rawCode,
      blockCode: 'A',
      blockName: BLOCK_NAMES.A,
      floor: 5,
      floorLabel: 'Floor 5',
      roomNumber: `A-${roomNum}`,
      status: 'inferred',
      isNonRoomSlot: false,
      notes: 'VBFFT read as VBFFTF (floor 5 inferred)'
    };
  }

  // Block H rules
  // VFF-nn -> Block H, Floor 1
  if (/^VFF-?(\d+)?$/i.test(normalized)) {
    const match = normalized.match(/^VFF-?(\d+)?$/i);
    const roomNum = match && match[1] ? match[1] : '101';
    return {
      rawCode,
      blockCode: 'H',
      blockName: BLOCK_NAMES.H,
      floor: 1,
      floorLabel: 'Floor 1',
      roomNumber: `H-${roomNum}`,
      status: 'confirmed',
      isNonRoomSlot: false
    };
  }

  // VGF-nn -> Block H, Ground floor
  if (/^VGF-?(\d+)?$/i.test(normalized)) {
    const match = normalized.match(/^VGF-?(\d+)?$/i);
    const roomNum = match && match[1] ? match[1] : '001';
    return {
      rawCode,
      blockCode: 'H',
      blockName: BLOCK_NAMES.H,
      floor: 0,
      floorLabel: 'Ground Floor',
      roomNumber: `H-${roomNum}`,
      status: 'confirmed',
      isNonRoomSlot: false
    };
  }

  // Block U rules
  // AFF-nn -> Block U, Floor 1
  if (/^AFF-?(\d+)?$/i.test(normalized)) {
    const match = normalized.match(/^AFF-?(\d+)?$/i);
    const roomNum = match && match[1] ? match[1] : '101';
    return {
      rawCode,
      blockCode: 'U',
      blockName: BLOCK_NAMES.U,
      floor: 1,
      floorLabel: 'Floor 1',
      roomNumber: `U-${roomNum}`,
      status: 'confirmed',
      isNonRoomSlot: false
    };
  }

  // Block P rules (inferred floors 2, 3, 4)
  // VPSF-nn -> Floor 2
  if (/^VPSF-?(\d+)?$/i.test(normalized)) {
    const match = normalized.match(/^VPSF-?(\d+)?$/i);
    const roomNum = match && match[1] ? match[1] : '201';
    return {
      rawCode,
      blockCode: 'P',
      blockName: BLOCK_NAMES.P,
      floor: 2,
      floorLabel: 'Floor 2',
      roomNumber: `P-${roomNum}`,
      status: 'inferred',
      isNonRoomSlot: false,
      notes: 'P-Block Floor 2 (inferred)'
    };
  }

  // VPTF-nn -> Floor 3
  if (/^VPTF-?(\d+)?$/i.test(normalized)) {
    const match = normalized.match(/^VPTF-?(\d+)?$/i);
    const roomNum = match && match[1] ? match[1] : '301';
    return {
      rawCode,
      blockCode: 'P',
      blockName: BLOCK_NAMES.P,
      floor: 3,
      floorLabel: 'Floor 3',
      roomNumber: `P-${roomNum}`,
      status: 'inferred',
      isNonRoomSlot: false,
      notes: 'P-Block Floor 3 (inferred)'
    };
  }

  // VPFTF-nn -> Floor 4
  if (/^VPFTF-?(\d+)?$/i.test(normalized)) {
    const match = normalized.match(/^VPFTF-?(\d+)?$/i);
    const roomNum = match && match[1] ? match[1] : '401';
    return {
      rawCode,
      blockCode: 'P',
      blockName: BLOCK_NAMES.P,
      floor: 4,
      floorLabel: 'Floor 4',
      roomNumber: `P-${roomNum}`,
      status: 'inferred',
      isNonRoomSlot: false,
      notes: 'P-Block Floor 4 (inferred)'
    };
  }

  // Block N rules
  // Pattern: NB-nnn, NBnnn, N-nnn, N-nnnA, [N-nnn]
  const nBlockMatch = normalized.match(/^(?:\[)?(?:NB-?|N-)(\d{3}[A-Z]?)(?:\])?$/i);
  if (nBlockMatch) {
    const digits = nBlockMatch[1];
    const firstDigit = parseInt(digits[0], 10);
    const isFloorConfirmed = firstDigit >= 1 && firstDigit <= 5;
    return {
      rawCode,
      blockCode: 'N',
      blockName: BLOCK_NAMES.N,
      floor: isFloorConfirmed ? firstDigit : null,
      floorLabel: isFloorConfirmed ? `Floor ${firstDigit}` : 'Unknown Floor',
      roomNumber: `N-${digits}`,
      status: isFloorConfirmed ? 'confirmed' : 'inferred',
      isNonRoomSlot: false,
      notes: isFloorConfirmed ? undefined : `N-Block floor inferred from first digit: ${digits[0]}`
    };
  }

  // Bare number not in unknown set (inferred)
  const bareMatch = normalized.match(/^(\d{3})(-[A-Z])?$/i);
  if (bareMatch) {
    const firstDigit = parseInt(bareMatch[1][0], 10);
    return {
      rawCode,
      blockCode: null,
      blockName: null,
      floor: firstDigit,
      floorLabel: `Floor ${firstDigit} (Unconfirmed)`,
      roomNumber: normalized,
      status: 'unknown',
      isNonRoomSlot: false,
      notes: 'Bare room code requiring department confirmation'
    };
  }

  // Fallback: completely unknown code
  return {
    rawCode,
    blockCode: null,
    blockName: null,
    floor: null,
    floorLabel: null,
    roomNumber: normalized,
    status: 'unknown',
    isNonRoomSlot: false,
    notes: 'Unrecognized room code format'
  };
}

