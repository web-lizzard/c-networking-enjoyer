import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { TcpSegment } from "../types";
import { calculateAck, createTcpSegment } from "../helpers/tcp";


export const useTcpReceiver = defineStore('tcpReceiver', () => {
    const sentPackets = ref<TcpSegment[]>([])
    const receivedPackets = ref<TcpSegment[]>([])
    const senderBuffer = ref<Uint8Array>(new Uint8Array(8))
    const expectedSeq = ref(0)
    const currentWindowSize = ref(0)

    const lastSentPacket = computed(() => sentPackets.value[sentPackets.value.length - 1])
    const isFinished = computed(() => receivedPackets.value.some((segment) => segment.flags.fin))

    async function handshake(
        waitForSegment:  (segment: TcpSegment) => Promise<TcpSegment>,
    ) {
        const synPacket = createTcpSegment({
            flags: {syn: true}
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
            data: senderBuffer.value.slice(0, currentWindowSize.value)
        })
          
        recvSegment = await sent(ackPacket, waitForSegment)
        receive(recvSegment)
    }


    function receive(segment: TcpSegment) {
        receivedPackets.value.push(segment)
        expectedSeq.value = calculateAck(segment)
        currentWindowSize.value = segment.windowSize
    }


    async function sent(segment: TcpSegment, callback: (segment: TcpSegment) => Promise<TcpSegment>) {
        sentPackets.value.push(segment)
        return callback(segment)
    }


    
    return {
        handshake,
        expectedSeq,
        lastSentPacket,
        receivedPackets,
        sentPackets,
    }
})