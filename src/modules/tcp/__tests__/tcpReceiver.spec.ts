import { setActivePinia, createPinia } from 'pinia'
import { useTcpReceiver } from '../stores/tcpReceiver'
import { describe, beforeEach, expect, vi, it} from 'vitest'
import { calculateAck, createTcpSegment } from '../helpers/tcp';
import type { TcpSegment } from '../types';
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
    windowSize: 2,
    data: new Uint8Array(),
};




describe('useTcpReceiver store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    describe('handshake()', () => {
        it('creates ACK with proper slice of senderBuffer', async () => {
    const store = useTcpReceiver()
    store.senderBuffer = new TextEncoder().encode("ABCD")

    const firstResponse = createTcpSegment({flags: {syn: true}, windowSize: 2})
    const secondResponse = createTcpSegment({flags: {ack: true}})

    const waitForSegment = vi.fn()
        .mockResolvedValueOnce(firstResponse) // response na SYN
        .mockResolvedValueOnce(secondResponse) // response na ACK

    await store.handshake(waitForSegment)

    const ackPacket = store.sentPackets[1]

    // weryfikujemy flage + slice danych
    expect(ackPacket.flags.ack).toBe(true)
    expect(ackPacket.data).toEqual(new TextEncoder().encode("AB")) // slice(0,2)
})

it('works when senderBuffer is empty (sends ACK with empty data)', async () => {
    const store = useTcpReceiver()
    store.senderBuffer = new Uint8Array() // pusty buffer
    store.currentWindowSize = 10

    const firstResponse = createTcpSegment({flags: {syn: true}, windowSize: 2})
    const secondResponse = createTcpSegment({flags: {ack: true}})


    const waitForSegment = vi.fn()
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse)

    await store.handshake(waitForSegment)

    const ackPacket = store.sentPackets[1]
    expect(ackPacket.data).toEqual(new Uint8Array()) // pusty payload
})

it('limits ACK data slice to senderBuffer length if window > buffer', async () => {
    const store = useTcpReceiver()
    store.senderBuffer = new TextEncoder().encode("123")
    store.currentWindowSize = 10

    const firstResponse = createTcpSegment({flags: {syn: true}, windowSize: 12})
    const secondResponse = createTcpSegment({flags: {ack: true}, windowSize: 10})

    const waitForSegment = vi.fn()
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse)

    await store.handshake(waitForSegment)

    const ackPacket = store.sentPackets[1]
    expect(ackPacket.data).toEqual(new TextEncoder().encode("123"))
})

it('throws error if SYN is missing in first response', async () => {
    const store = useTcpReceiver()
    store.senderBuffer = new TextEncoder().encode("HELLO")

    const firstResponse = createTcpSegment({flags: {ack: true}, windowSize: 4})
    const waitForSegment = vi.fn().mockResolvedValueOnce(firstResponse)

    await expect(store.handshake(waitForSegment)).rejects.toThrow()
    expect(store.sentPackets).toEqual([])
})

it('sends ACK with empty data if server windowSize is zero', async () => {
    const store = useTcpReceiver()
    store.senderBuffer = new TextEncoder().encode("DATA")
    store.currentWindowSize = 0

    const firstResponse = createTcpSegment({flags: {syn: true}, windowSize: 0})
    const secondResponse = createTcpSegment({flags: {ack: true}, windowSize: 0})

    const waitForSegment = vi.fn()
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse)

    await store.handshake(waitForSegment)
    const ackPacket = store.sentPackets[1]
    expect(ackPacket.flags.ack).toBe(true)
    expect(ackPacket.data.length).toEqual(new Uint8Array().length) // brak przesyłanych bajtów
})

it('updates expectedSeq and currentWindowSize correctly from first response', async () => {
    const store = useTcpReceiver()
    store.senderBuffer = new TextEncoder().encode("GPT")


    const firstResponse = createTcpSegment({flags: {syn: true}, windowSize: 7, sequenceNumber: 1111})
    const secondResponse = createTcpSegment({flags: {ack: true}, windowSize: 6})

    const waitForSegment = vi.fn()
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse)

    await store.handshake(waitForSegment)
    expect(store.currentWindowSize).toBe(secondResponse.windowSize)
    expect(store.expectedSeq).toBe(calculateAck(secondResponse))
})

it('ACK contains only windowSize bytes if window smaller than buffer', async () => {
    const store = useTcpReceiver()
    store.senderBuffer = new TextEncoder().encode("ABCDEFGH")

    const firstResponse = createTcpSegment({flags: {syn: true}, windowSize: 3})
    const secondResponse = createTcpSegment({flags: {ack: true}, windowSize: 2})

    const waitForSegment = vi.fn()
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse)

    await store.handshake(waitForSegment)
    const ackPacket = store.sentPackets[1]
    expect(ackPacket.data).toEqual(new TextEncoder().encode("ABC")) // tylko 3 bajty
})

it('sends ACK with empty data when both buffer and windowSize are zero', async () => {
    const store = useTcpReceiver()
    store.senderBuffer = new Uint8Array()
    store.currentWindowSize = 0

    const firstResponse = createTcpSegment({flags: {syn: true}, windowSize: 0})
    const secondResponse = createTcpSegment({flags: {ack: true}, windowSize: 0})

    const waitForSegment = vi.fn()
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse)

    await store.handshake(waitForSegment)
    const ackPacket = store.sentPackets[1]
    expect(ackPacket.data).toEqual(new Uint8Array())
})
})

describe('sendRequest()', () => {
    it('sends segments while there is space in the window', async () => {
    const store = useTcpReceiver()
    const sendPacket = vi.fn().mockResolvedValue(null)

    const initialSeqNumber = store.lastByteSent
    store.senderBuffer = new Uint8Array([1,2,3])
    store.currentWindowSize = 4

    const waitForSegment = vi.fn()
        .mockResolvedValueOnce(createTcpSegment({
            acknowledgmentNumber: store.lastByteSent + 2, windowSize: 4}))
            .mockResolvedValueOnce(createTcpSegment({
                acknowledgmentNumber: store.lastByteSent + 4, windowSize: 4}))

    await store.sendRequest(waitForSegment, sendPacket)

    expect(sendPacket).toHaveBeenCalled()
    expect(store.sentPackets.length).toBeGreaterThan(0)
    expect(store.lastByteAcked).toBeGreaterThan(initialSeqNumber)
})


})

})