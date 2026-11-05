import { describe, it, expect } from 'vitest';
import { parseRoomCode } from '../roomCodes';

describe('Room Code Parser (Section 4 rules)', () => {
  it('parses A-Block VBFF (Floor 1) confirmed', () => {
    const res = parseRoomCode('VBFF-1');
    expect(res.blockCode).toBe('A');
    expect(res.floor).toBe(1);
    expect(res.status).toBe('confirmed');
    expect(res.isNonRoomSlot).toBe(false);
  });

  it('parses A-Block VBSF (Floor 2) confirmed', () => {
    const res = parseRoomCode('VBSF-3');
    expect(res.blockCode).toBe('A');
    expect(res.floor).toBe(2);
    expect(res.status).toBe('confirmed');
  });

  it('parses A-Block VBTF (Floor 3) confirmed', () => {
    const res = parseRoomCode('VBTF-5');
    expect(res.blockCode).toBe('A');
    expect(res.floor).toBe(3);
    expect(res.status).toBe('confirmed');
  });

  it('parses A-Block VBFTF and VBFTTF as Floor 4 confirmed', () => {
    const res1 = parseRoomCode('VBFTF-1');
    expect(res1.blockCode).toBe('A');
    expect(res1.floor).toBe(4);
    expect(res1.status).toBe('confirmed');

    const res2 = parseRoomCode('VBFTTF-2');
    expect(res2.blockCode).toBe('A');
    expect(res2.floor).toBe(4);
    expect(res2.status).toBe('confirmed');
  });

  it('parses A-Block VBFFTF and VBFFT as Floor 5', () => {
    const res1 = parseRoomCode('VBFFTF-1');
    expect(res1.blockCode).toBe('A');
    expect(res1.floor).toBe(5);
    expect(res1.status).toBe('confirmed');

    const res2 = parseRoomCode('VBFFT-2');
    expect(res2.blockCode).toBe('A');
    expect(res2.floor).toBe(5);
    expect(res2.status).toBe('inferred');
  });

  it('parses H-Block VGF as Ground floor and VFF as Floor 1', () => {
    const rG = parseRoomCode('VGF-8');
    expect(rG.blockCode).toBe('H');
    expect(rG.floor).toBe(0);
    expect(rG.status).toBe('confirmed');

    const r1 = parseRoomCode('VFF-2');
    expect(r1.blockCode).toBe('H');
    expect(r1.floor).toBe(1);
    expect(r1.status).toBe('confirmed');
  });

  it('parses U-Block AFF as Floor 1 confirmed', () => {
    const res = parseRoomCode('AFF-06');
    expect(res.blockCode).toBe('U');
    expect(res.floor).toBe(1);
    expect(res.status).toBe('confirmed');
  });

  it('parses P-Block VPSF (Floor 2), VPTF (Floor 3), VPFTF (Floor 4) as inferred', () => {
    const r2 = parseRoomCode('VPSF-01');
    expect(r2.blockCode).toBe('P');
    expect(r2.floor).toBe(2);
    expect(r2.status).toBe('inferred');

    const r3 = parseRoomCode('VPTF-09');
    expect(r3.blockCode).toBe('P');
    expect(r3.floor).toBe(3);
    expect(r3.status).toBe('inferred');

    const r4 = parseRoomCode('VPFTF-02');
    expect(r4.blockCode).toBe('P');
    expect(r4.floor).toBe(4);
    expect(r4.status).toBe('inferred');
  });

  it('identifies library and non-room slots without dropping them', () => {
    const res = parseRoomCode('LAB-1(LIB)');
    expect(res.isNonRoomSlot).toBe(true);
    expect(res.status).toBe('confirmed');
  });

  it('flags unmapped / unknown room codes as unknown', () => {
    const res1 = parseRoomCode('604');
    expect(res1.status).toBe('unknown');

    const res2 = parseRoomCode('AFTF-13');
    expect(res2.status).toBe('unknown');
  });
});
