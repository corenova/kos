const PcapParser = require('pcap-ng-parser');
const pcapParser = new PcapParser();
const myFileStream = require('fs').createReadStream('./myfile.pcapng');
//const EtherFrame = require('ether-frame');
const pcap = require('pcap');
const ipv4 = require('pcap/decode/ipv4');

class GAPS {
  constructor(emitter) {
    this.emitter = emitter;
    this.next = undefined;
    this.dst = undefined;
    this.src = undefined;
    this.dict = undefined;
    this.pivot = undefined
    this.len = undefined;
    this.did = undefined;
    this.data = undefined;
  }
  decode(raw, offset) {
    this.next = raw[offset];
    offset += 1;
    this.dst = raw[offset];
    offset += 1;
    this.src = raw[offset];
    offset += 1;
    this.dict = (raw[offset] & 0xfe) >> 3;
    this.pivot = (raw[offset] & 0x07) << 5;
    offset += 1;
    //this.len = (raw.readUInt32BE(offset) >> 21); // first 11-bits
    //this.did = ((raw.readUInt32BE(offset) & 0x001fffff)); // last 21-bits
    console.warn('32-bits:', (raw.readUInt32BE(offset) >>> 0).toString(2).padStart(32,'0'));
    //console.warn((raw.readUInt32BE(offset) >> 21) & 0x7ff, this.len.toString(2));
    //console.warn(raw.readUInt32BE(offset) & 0x001fffff, this.did.toString(2));
    // BELOW is what we WILL eventually update to
    this.len = (raw.readUInt32BE(offset) >> 20) & 0xfff; // first 12-bits
    this.did = ((raw.readUInt32BE(offset) & 0x000fffff));
    offset += 4;
    this.data = raw.slice(offset, offset + this.len);
    return this;
  }
}

ipv4.protocols[253] = GAPS;

let count = 0;
const pcapSession = pcap.createOfflineSession('./myfile.pcapng');
pcapSession.on('packet', (raw) => {
  count += 1;
  if (count > 20) return;
  //console.log(raw);
  try {
    const packet = pcap.decode.packet(raw);
    const gaps = packet.payload.payload.payload;
    console.log(gaps);
    if (gaps.src !== 7)
      console.log(JSON.parse(gaps.data,2));
  } catch (err) {
    console.warn(err.message);
  }
});

// myFileStream.pipe(pcapParser)
//   .on('data', parsedPacket => {
//     console.log(parsedPacket);
//     try {
//       //const ethframe = EtherFrame.fromBuffer(packet.data, pcapParser.endianess);
//       //console.log(ethframe);
//       const pkt = pcap.decode.packet({ buf: parsedPacket.data, header });
//     } catch (err) {
//       console.warn(err.message);
//     }
//   })
//   .on('interface', interfaceInfo => {
//     header = interfaceInfo;
//     console.log('interface');
//     console.log(interfaceInfo)
//   })
