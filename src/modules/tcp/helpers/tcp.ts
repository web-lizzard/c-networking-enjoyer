import type { TcpSegment, TcpSegmentOverrides } from "../types";

const RECEIVER_PORT = 2137

function getRandomInt(max: number) {
    return Math.floor(Math.random() * (max + 1))
}

export function calculateAck(segment: TcpSegment) {
    return segment.sequenceNumber + segment.data.length
}


export function createTcpSegment(overrides: Partial<TcpSegmentOverrides> = {}): TcpSegment {
    const defaultSegment = {
      sourcePort: RECEIVER_PORT,
      destinationPort: 80,
      sequenceNumber: getRandomInt(1000),
      dataOffset: 5,
      flags: {
        urg: false,
        ack: false,
        psh: false,
        rst: false,
        syn: false,
        fin: false,
      },
      checksum: 0,
      windowSize: 4,
      data: new Uint8Array(0),
    };
  
    return {
      ...defaultSegment,
      ...overrides,
      flags: {
        ...defaultSegment.flags,
        ...(overrides.flags || {}),
      },
    };
  }
