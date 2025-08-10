export type TcpSegment = {
    sourcePort: number;           // 16 bits - source application port
    destinationPort: number;      // 16 bits - destination application port
    sequenceNumber: number;       // 32 bits - sequence number for ordering
    acknowledgmentNumber?: number; // 32 bits - next expected byte (if ACK flag is set)
    dataOffset: number;           // 4 bits - header length in 32-bit words
    reserved?: number;            // typically 3-6 bits, reserved for future use, usually zero
    flags: {
      urg: boolean;               // Urgent flag
      ack: boolean;               // Acknowledgment flag
      psh: boolean;               // Push function flag
      rst: boolean;               // Reset connection flag
      syn: boolean;               // Synchronize sequence numbers flag
      fin: boolean;               // No more data from sender flag
    };
    windowSize: number;           // 16 bits - flow control window size
    checksum: number;             // 16 bits - checksum for error-checking
    urgentPointer?: number;       // 16 bits - urgent data pointer (if URG flag set)
    options?: Uint8Array;         // 0-40 bytes - optional header fields
    data: Uint8Array;             // payload data carried by the segment
  };
  