# kd-linux

windows kernel debugging from linux. kd.exe running under wine with full kdnet support, symbols, the whole thing.

everyone says this is impossible. they're wrong, it just requires actually sitting down and figuring out why it breaks.

---

## what this is

kd.exe (microsoft's kernel debugger) running on a bare linux host under wine 11.8, debugging a windows 11 vm over kdnet. not a vm running the debugger. not some serial port hack from 2011. actual kdnet, actual pdb symbols downloading from msdl.microsoft.com, actual interactive session.

---

## why it was "impossible"

two things kill it. i found both by running wine with debug output:

```
WINEDEBUG=+winsock,+dbgeng wine windbg/kd.exe -k net:port=50000,key=...
```

**killer 1 — dbgeng.dll:**
wine's builtin dbgeng.dll has `SetOutputCallbacksWide` stubbed as `E_NOTIMPL`. kd dies before it even touches the network.

```
fixme:dbgeng:debugclient_SetOutputCallbacksWide ...
Unable to set engine callbacks, HRESULT 0x80004001
```

fix is simple — load the real microsoft dll instead of wine's stub.

**killer 2 — ws2_32.dll:**
two socket option calls fail during kdnet socket initialization. both `IPPROTO_IPV6 optname 0x16` and `IP_RECEIVE_BROADCAST (optname 0x16)` return -1 with `WSAENOPROTOOPT`. kd closes both sockets, gives up.

```
fixme:winsock:setsockopt Unknown IPPROTO_IPV6 optname 0x00000016
Failed to initialize IPv6 socket.  Error 0n-2147467259
fixme:winsock:setsockopt Unknown IPPROTO_IP optname 0x00000016
Failed to initialize IPv4 socket.  Error 0n-2147467259
Kernel debugger failed initialization, HRESULT 0x80004005
```

by the way — `SIO_ENABLE_CIRCULAR_QUEUEING` (the thing wine bug #47233 talks about) is NOT the killer. it stubs but returns success and kd continues past it. that bug report sent people on the wrong trail for years.

---

## the ws2_32 patch

the two socket option calls fall through to the shared error sink in `getsockopt`/`setsockopt`. in ghidra it shows up as `switchD_1800114f7_caseD_c`. stock code:

```asm
mov rax, gs:[0x30]           ; load TEB
mov [rax+0x68], 0x273a       ; LastError = WSAENOPROTOOPT
jmp <error return>
```

patched version replaces those instructions with `xor eax, eax` + jump to the success path instead. two patch sites:

- `0x000115f0` — inside getsockopt (18 bytes changed)
- `0x00013d05` — inside setsockopt (21 bytes changed)

both options are advisory hints. returning success is correct behavior — the socket works identically either way.

patch script:

```python
#!/usr/bin/env python3
import shutil, hashlib

TARGET = '/usr/lib/wine/x86_64-windows/ws2_32.dll'
STOCK  = '15d782d44ee2d6af8dce7bbb0787895ecc153a21a07b4864e1050e76c14bdc8f'

with open(TARGET, 'rb') as f: data = f.read()
assert hashlib.sha256(data).hexdigest() == STOCK, 'wrong wine version, offsets wont match'

shutil.copy(TARGET, TARGET + '.bak')

with open(TARGET, 'r+b') as f:
    # patch 1: getsockopt unknown optname → return 0
    f.seek(0x000115f0)
    f.write(bytes([0x31,0xc0, 0xeb,0xb6, *([0x90]*14)]))
    # patch 2: setsockopt unknown optname → return 0
    f.seek(0x00013d05)
    f.write(bytes([0x31,0xc0, 0xe9,0x66,0xff,0xff,0xff, *([0x90]*19)]))

print('done')
# patched hash: dedc6027039fd288572a86adfe1b0fcec1bc97573d97675c5fadc70087dbbdcc
```

**these offsets are wine 11.8 specific.** if you upgrade wine, the offsets will be wrong. verify the stock hash before patching, keep the .bak.

---

## getting the windbg files on linux

you don't need windows or the microsoft store. the download is just an msix which is just a zip.

```bash
# step 1 — get the appinstaller manifest (it's xml with the actual bundle url)
curl -sL "https://aka.ms/windbg/download" -o windbg.appinstaller

# step 2 — download the msixbundle (url is inside the manifest xml)
curl -L "https://windbg.download.prss.microsoft.com/dbazure/prod/1-2603-20001-0/windbg.msixbundle" \
     -o windbg.msixbundle

# step 3 — extract (it's just a zip)
unzip windbg.msixbundle windbg_win-x64.msix
mkdir windbg_x64
unzip windbg_win-x64.msix -d windbg_x64/

# step 4 — copy into project
cp -r windbg_x64/amd64/* /path/to/kd-linux/windbg/
cp windbg_x64/*.dll /path/to/kd-linux/windbg/
```

the version number in the msixbundle url changes with updates. check the appinstaller xml for the current one, it always has the latest url.

---

## kdwrap

running kd directly under wine produces garbage output. wine's console cursor tracking breaks completely in raw terminal mode — output at wrong positions, echo doubled, backspace corrupts everything.

`kdwrap.exe` fixes this. it's a small windows exe (compiled with mingw, runs under wine) that sits between your terminal and kd:

- kd's stdout/stderr → pipe → kdwrap reads → writes to its own stderr → goes directly to the unix terminal fd, bypasses wine's broken console renderer
- unix terminal (raw mode) → kdwrap reads char by char → manual line editor (echo, backspace, enter) → kd's stdin pipe

kd gets spawned with `DETACHED_PROCESS` so it never acquires a real console. two threads pump each direction.

compile it:

```bash
x86_64-w64-mingw32-gcc -O2 -o windbg/kdwrap.exe kdwrap.c
```

**known issue:** ctrl+c doesn't trigger a kd breakin properly. linux's tty layer intercepts `0x03` as SIGINT before kdwrap sees it, you can use ctrl+f instead to break.
---

## project layout

```
kd-linux/
├── kd                    # bash launcher, run this
├── kdwrap.c              # i/o wrapper source
├── ws2_32_patch.py       # patch script
└── windbg/
    ├── kd.exe            # microsoft kd
    ├── kdwrap.exe        # compiled wrapper
    ├── dbgeng.dll        # real microsoft dll (not wine's stub)
    ├── dbghelp.dll
    ├── dbgmodel.dll
    ├── dbgcore.dll
    ├── symsrv.dll
    ├── srcsrv.dll
    ├── msdia140.dll
    ├── ws2_32.dll        # patched copy (also lives at /usr/lib/wine/x86_64-windows/)
    ├── ws2_32_stock.dll  # original backup
    └── ... (rest of windbg bundle)
```

---

## setup, start to finish

**1. get wine 11.8**

```bash
# arch
yay -S wine
wine --version  # make sure it's 11.8, offsets are version specific
```

**2. get the windbg files**

follow the extraction steps above. copy into `windbg/`.

**3. patch ws2_32.dll**

WARNING: IF YOU DO THE PATCH FOR WS2_32 YOU WILL REPLACE THE ORIGINAL ONE, MAKE SURE YOU HAVE BACKUP
```bash
sudo python3 ws2_32_patch.py
# verify:
sha256sum /usr/lib/wine/x86_64-windows/ws2_32.dll
# should be: dedc6027...
```

**4. compile kdwrap**

```bash
x86_64-w64-mingw32-gcc -O2 -o windbg/kdwrap.exe kdwrap.c
```

**5. configure the windows vm**

Make sure you have bridge network and just run these 3 commands:
```
bcdedit /debug on
bcdedit /dbgsettings net hostip:w.x.y.z port:n key:1.2.3.4
shutdown /r /t 0
```

**7. connect**

```bash
./kd <port> <key>
```

wait for the guest to boot. kd will print `Waiting to reconnect...` until the handshake completes. the `-b` flag in the launcher breaks in automatically on connect. (If it doesn't, just press Ctrl + F)

**8. symbols**

```
kd> .sympath srv*C:\Symbols*https://msdl.microsoft.com/download/symbols
kd> .reload /f ntoskrnl.exe
kd> !lmi nt
```

if it says `Symbol Type: PDB - Symbols loaded successfully` you're good. the pdb guid in the output is a fingerprint match between the running kernel and the downloaded symbols — if it matches, all struct offsets and symbol addresses are accurate.

---

## limitations

- wine 11.8 specific patch offsets. upgrade wine = redo the patch
- windbg gui doesn't work, only kd (console)
- ctrl+c broken (see kdwrap section)

---

## references

- wine bug #47233 (the wrong trail everyone followed): https://bugs.winehq.org/show_bug.cgi?id=47233
- osr on kdnet + qemu hyper-v issue: https://www.osr.com/blog/2021/10/05/using-windbg-over-kdnet-on-qemu-kvm/
- 2011 serial port attempt (barely worked, com transport only): http://polytechnitis.blogspot.com/2011/04/kernel-debugging-qemu-windows-vm-from.html
