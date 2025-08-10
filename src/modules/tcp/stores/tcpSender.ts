import { defineStore } from "pinia";
import { ref } from "vue";
import  { type TcpSegment, TcpSenderState } from "../types";


const wait = (ms: number) => new Promise(r => setTimeout(r, ms));


export const useTcpSender = defineStore('tcpSender', () => {
    const connectionState = ref<TcpSenderState>(TcpSenderState.CLOSED)
    const seqNumber = ref(0)
    const ackNumber = ref(0)
    const windowSize = ref(4)

    const packets: TcpSegment[] = ref([])



    return {
        sendPacket
    }
})