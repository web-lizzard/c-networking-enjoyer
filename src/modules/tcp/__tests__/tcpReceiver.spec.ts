import { setActivePinia, createPinia } from 'pinia'
import { useTcpReceiver } from '../stores/tcpReceiver'
import { describe, beforeEach, expect, vi, it} from 'vitest'
// Mock typu TcpSegment
const mockTcpSegment = {
    sourcePort: 80,
    destinationPort: 2137,
    sequenceNumber: 100,
    acknowledgmentNumber: 43,
    dataOffset: 5,
    flags: {
        urg: false,
        ack: true,
        psh: false,
        rst: false,
        syn: true,
        fin: false,
    },
    checksum: 0,
    windowSize: 4,
    data: new Uint8Array(),
};


describe('useTcpReceiver store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    describe('handshake()', () => {
        it('sends a SYN packet and processes the received segment', async () => {
            const store = useTcpReceiver()

            const waitForSegment = vi.fn().mockImplementation(async (lastSent) => {
                return mockTcpSegment
            })

            await store.handshake(waitForSegment)

            expect(store.sentPackets).toHaveLength(2)
            expect(store.receivedPackets).toHaveLength(2)
            expect(store.receivedPackets[0]).toEqual(mockTcpSegment)

            const expected = mockTcpSegment.sequenceNumber + mockTcpSegment.data.length
            expect(store.expectedSeq).toBe(expected)
        })

        it('throws an error if the received segment does not have the SYN flag', async () => {
            const store = useTcpReceiver()

            const badSegment = {
                ...mockTcpSegment,
                flags: { ...mockTcpSegment.flags, syn: false },
            }

            const waitForSegment = vi.fn().mockResolvedValue(badSegment)

            await expect(store.handshake(waitForSegment)).rejects.toThrow(Error)

            expect(store.receivedPackets).toHaveLength(0)
            expect(store.sentPackets).toHaveLength(0)
        })
    })
})