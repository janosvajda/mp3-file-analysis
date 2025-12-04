# MP3 File Analysis App

Speedy and tiny API that accepts an MP3 upload at `/file-upload` and responds with the MPEG Version 1 Layer III frame count.

## Setup
```bash
npm install
npm run dev   # start with tsx watch
# or
npm run build && npm start
```

## Endpoint
- `POST /file-upload` with `multipart/form-data` and a single MP3 file field.
- Success response: `{"frameCount": <number>}`
- Error response (400): `{"error": "<reason>"}`

Example:
```bash
curl -F "file=@samples/sample.mp3" http://localhost:3000/file-upload
```

## Tests
```bash
npm test
```
Tests include a synthetic frame counter check. If you place a real sample at `samples/sample.mp3`, the test will also verify it returns a positive frame count.

## MP3 Frame Header (MPEG-1 Layer III)
- 4 bytes total; starts with 11-bit sync `11111111111`.
- Key fields:
  - Version (2 bits): `11` = MPEG Version 1 (supported).
  - Layer (2 bits): `01` = Layer III (supported).
  - Protection bit (1): `1` = no CRC in this implementation.
  - Bitrate index (4): maps to kbps (`free`/`bad` values rejected).
  - Sample rate index (2): 44.1/48/32 kHz (`reserved` rejected).
  - Padding (1): adds 1 byte to frame size when set.
  - Channel mode (2): parsed but not used in sizing here.
- Frame size formula (MPEG-1 Layer III): `floor((144000 * bitrateKbps) / sampleRate) + padding`.
- References:
  - http://www.mp3-tech.org/programmer/frame_header.html (field summary)
  - https://www.datavoyage.com/mpgscript/mpeghdr.htm (public breakdown of MPEG audio frame headers)

Tiny ASCII view of the 32-bit header layout (MSB → LSB):
```
AAAAAAAA AAABBCCD EEEEFFGH IIJJKLMM
A: sync (11)   B: version (2)  C: layer (2)   D: protection (1)
E: bitrate (4) F: sample rate (2) G: padding (1) H: private (1)
I: channel mode (2) J: mode ext (2) K: copyright (1) L: original (1) M: emphasis (2)
```

## Tasks / Future Work
- Exercise the parser against a wider variety of MP3s produced by different encoders/tools to harden validation.
- Make upload handling more flexible: configurable field name, allowed mime types, and tightened size limits.
- Add more error detail/typing for client responses (e.g., distinguish unsupported format vs. corrupt file).
- Consider reporting additional metadata (duration estimate, bitrate mode) if needed.
- Add CI to run tests/build on pushes; optional lint/format steps.
