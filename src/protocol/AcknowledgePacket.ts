import BinaryStream from '@jsprismarine/jsbinaryutils';
import Packet from './Packet';

// const MAX_ACK_PACKETS = 4096;
export default class AcknowledgePacket extends Packet {
  // Array containing all sequence numbers of received (ACK)
  // or lost (NACK) packets
  packets: number[] = [];

  public decode(): void {
    super.decode()
    // Clear old cached decoded packets
    this.packets = [];

    const recordCount = this.readShort();
    for (let i = 0; i < recordCount; i++) {
      const notRange = this.readBool();

      if (notRange) {
        this.packets.push(this.readLTriad());
      } else {
        const start = this.readLTriad();
        const end = this.readLTriad();

        for (let i = start; i <= end; i++) {
          this.packets.push(i);
        }
      }
    }
  }

  public encode(): void {
    super.encode()
    this.packets.sort((a, b) => a - b);

    let records = 0
    // We have to create a stream because the encoding is records + buffer
    // but we need to send records first and to compute them we have to decode the packet
    // and as we need to write first of all records, we cannot write decoded data so
    // we keep them in a temporary stream that will be appended later on
    let stream = new BinaryStream()
    // Sort packets to ensure a correct encoding
    let count = this.packets.length

    if (count > 0) {
      let pointer = 1
      let start = this.packets[0]
      let last = this.packets[0]

      while (pointer < count) {
        let current = this.packets[pointer++]
        let diff = current - last
        if (diff === 1) {
          last = current
        } else if (diff > 1) {
          if (start === last) {
            stream.writeByte(1)
            stream.writeLTriad(start)
            start = last = current
          } else {
            stream.writeByte(0)
            stream.writeLTriad(start)
            stream.writeLTriad(last)
            start = last = current
          }
          records++
        }
      }

      if (start === last) {
        stream.writeByte(1)
        stream.writeLTriad(start)
      } else {
        stream.writeByte(0)
        stream.writeLTriad(start)
        stream.writeLTriad(last)
      }
      records++
    }

    this.writeShort(records)
    this.append(stream.getBuffer())

  }
}