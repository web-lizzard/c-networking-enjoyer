import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { TcpSegment } from "../types";
import { calculateAck, createTcpSegment, getRandomInt } from "../helpers/tcp";


export const useTcpReceiver = defineStore('tcpReceiver', () => {
    const sentPackets = ref<TcpSegment[]>([])
    const receivedPackets = ref<TcpSegment[]>([])
    const senderBuffer = ref<Uint8Array>(new Uint8Array(8))
    const expectedSeq = ref(0)
    const currentWindowSize = ref(0)
    const initialSeqNumber = getRandomInt(1000)

    const lastByteAcked = ref(initialSeqNumber)
    const lastByteSent = ref(initialSeqNumber)
    const lastByteWritten = computed(() => initialSeqNumber + senderBuffer.value.length)
    const isWindowOpen = computed(() => lastByteSent.value - lastByteAcked.value < currentWindowSize.value)

    const lastSentPacket = computed(() => sentPackets.value[sentPackets.value.length - 1])
    const isFinished = computed(() => receivedPackets.value.some((segment) => segment.flags.fin))

    async function handshake(
        waitForSegment:  (segment: TcpSegment) => Promise<TcpSegment>,
    ) {
        lastByteSent.value = initialSeqNumber + 1
        const synPacket = createTcpSegment({
            flags: {syn: true},
            sequenceNumber: lastByteSent.value
        });
        
        let recvSegment = await sent(synPacket, waitForSegment)

        if (!recvSegment.flags.syn) {
            sentPackets.value = []
            throw Error()
        }

        receive(recvSegment)
        const ackPacket = createTcpSegment({
            flags: {
                ack: true
            },
            data: calculateData()
        })
        recvSegment = await sent(ackPacket, waitForSegment)
        receive(recvSegment)
    }

    async function sendRequest(waitForSegment: () => Promise<TcpSegment>, sendPacket: (segment: TcpSegment) => Promise<void>) {
        while (lastByteAcked.value < lastByteWritten.value) {
            while(isWindowOpen.value) {

                const segment = createTcpSegment({
                    sequenceNumber: lastByteSent.value + 1,
                    data: calculateData()
                })
                
                sentPackets.value.push(segment)
                await sendPacket(segment)
            }
        const ackPacket = await waitForSegment()
        receive(ackPacket)
        }

    }


    function receive(segment: TcpSegment) {
        if (segment.acknowledgmentNumber && segment.acknowledgmentNumber > lastByteAcked.value) {
            lastByteAcked.value = segment.acknowledgmentNumber
        }

        receivedPackets.value.push(segment)
        expectedSeq.value = calculateAck(segment)
        currentWindowSize.value = segment.windowSize
    }


    async function sent(segment: TcpSegment, callback: (segment: TcpSegment) => Promise<TcpSegment>) {
        sentPackets.value.push(segment)
        return callback(segment)
    }

    function calculateData(): Uint8Array {
        const maxSend = currentWindowSize.value - (lastByteSent.value - lastByteAcked.value)
        const start = lastByteSent.value - initialSeqNumber - 1
        const end = start + maxSend + 1
        lastByteSent.value = maxSend + lastByteSent.value
        return senderBuffer.value.slice(start, end)
    }


    
    return {
        handshake,
        sendRequest,
        expectedSeq,
        lastSentPacket,
        receivedPackets,
        sentPackets,
        currentWindowSize,
        senderBuffer,
        lastByteAcked,
        lastByteSent,
        lastByteWritten
    }
})