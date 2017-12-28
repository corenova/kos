# snmp reactor

This reactor provides reactions to SNMP client/server connections.

Source code is [here](./snmp.js).

## Usage

```js
const SnmpReactor = require('kos/reactor/snmp')
```

## kos --show ws

```
snmp: reactions to SNMP GET/SET commands
├─ id: e9de34ed-fda0-4bf2-908c-5859dd6c057b
├─ passive: false
├─ enabled: true
├─ depends
│  ├─ module/net-snmp
│  └─ module/url
├─ reactions
│  ├─ ƒ(connect)
│  ├─ ƒ(request)
│  ├─ ƒ(snmpget)
│  ├─ ƒ(snmpset)
│  └─ ƒ(connectByUrl)
└──┐
   ├┬╼ module/net-snmp  ╾┬╼ ƒ(connect)      ╾┬╼ snmp/session
   │└╼ snmp/connect     ╾┘                   └╼ snmp/connect/url
   │┌╼ module/net-snmp  ╾┐
   ├┼╼ snmp/request     ╾┼╼ ƒ(request)      ╾─╼ snmp/response
   │└╼ snmp/session     ╾┘
   ├─╼ snmp/get         ╾─╼ ƒ(snmpget)      ╾─╼ snmp/request
   ├─╼ snmp/set         ╾─╼ ƒ(snmpset)      ╾─╼ snmp/request
   └┬╼ module/url       ╾┬╼ ƒ(connectByUrl) ╾─╼ snmp/connect
    └╼ snmp/connect/url ╾┘
```
