// Input:  ReadFile on STD_INPUT_HANDLE (Wine console, echo disabled)
// Output: WriteFile on STD_ERROR_HANDLE (direct to terminal, no console)
// Compile: x86_64-w64-mingw32-gcc -O2 -o windbg/kdwrap.exe kdwrap.c

#include <windows.h>
#include <process.h>
#include <stdio.h>
#include <ctype.h>

static HANDLE g_stdin_wr;
static HANDLE g_stdout_rd;
static HANDLE g_out;   // stderr → terminal
static HANDLE g_in;    // console input

#define LINE_CAP 8192

static unsigned __stdcall pump_stdin(void *unused) {
    (void)unused;
    char c;
    DWORD n, w;
    char line[LINE_CAP];
    size_t line_len = 0;
    int saw_cr = 0;

    for (;;) {
        if (!ReadFile(g_in, &c, 1, &n, NULL) || n == 0)
            break;

        if (c == '\n' && saw_cr) {
            saw_cr = 0;
            continue;
        }
        saw_cr = (c == '\r');

        if (c == '\n' || c == '\r') {
            WriteFile(g_out, "\r\n", 2, &w, NULL);
            if (line_len > 0)
                WriteFile(g_stdin_wr, line, (DWORD)line_len, &w, NULL);
            WriteFile(g_stdin_wr, "\r\n", 2, &w, NULL);
            line_len = 0;
        } else if (c == 0x7f || c == '\b') {
            if (line_len > 0) {
                line_len--;
                WriteFile(g_out, "\b \b", 3, &w, NULL);
            }
        } else if ((unsigned char)c == 0x03) {
            line_len = 0;
            WriteFile(g_stdin_wr, &c, 1, &w, NULL);
        } else if (isprint((unsigned char)c) || c == '\t') {
            if (line_len < sizeof(line)) {
                line[line_len++] = c;
                WriteFile(g_out, &c, 1, &w, NULL);
            }
        } else {
            WriteFile(g_stdin_wr, &c, 1, &w, NULL);
        }
    }
    CloseHandle(g_stdin_wr);
    return 0;
}

static unsigned __stdcall pump_stdout(void *unused) {
    (void)unused;
    char buf[4096];
    DWORD n, w;
    for (;;) {
        if (!ReadFile(g_stdout_rd, buf, sizeof(buf), &n, NULL) || n == 0)
            break;
        WriteFile(g_out, buf, n, &w, NULL);
    }
    return 0;
}

int main(void) {
    char *cl = GetCommandLineA();
    char *p = cl;
    if (*p == '"') { p++; while (*p && *p != '"') p++; if (*p) p++; }
    else { while (*p && *p != ' ') p++; }
    while (*p == ' ') p++;

    if (!*p) {
        fprintf(stderr, "Usage: kdwrap <program> [args...]\n");
        return 1;
    }

    g_in = GetStdHandle(STD_INPUT_HANDLE);
    g_out = GetStdHandle(STD_ERROR_HANDLE);

    // Disable console echo and line buffering so we handle it ourselves
    DWORD mode;
    if (GetConsoleMode(g_in, &mode)) {
        mode &= ~(ENABLE_ECHO_INPUT | ENABLE_LINE_INPUT | ENABLE_PROCESSED_INPUT);
        SetConsoleMode(g_in, mode);
    }

    SECURITY_ATTRIBUTES sa = { sizeof(sa), NULL, TRUE };

    HANDLE stdin_rd;
    if (!CreatePipe(&stdin_rd, &g_stdin_wr, &sa, 0)) return 1;
    SetHandleInformation(g_stdin_wr, HANDLE_FLAG_INHERIT, 0);

    HANDLE stdout_wr;
    if (!CreatePipe(&g_stdout_rd, &stdout_wr, &sa, 0)) return 1;
    SetHandleInformation(g_stdout_rd, HANDLE_FLAG_INHERIT, 0);

    STARTUPINFOA si;
    ZeroMemory(&si, sizeof(si));
    si.cb = sizeof(si);
    si.dwFlags = STARTF_USESTDHANDLES;
    si.hStdInput = stdin_rd;
    si.hStdOutput = stdout_wr;
    si.hStdError = stdout_wr;

    PROCESS_INFORMATION pi;
    if (!CreateProcessA(NULL, p, NULL, NULL, TRUE, DETACHED_PROCESS, NULL, NULL, &si, &pi)) {
        fprintf(stderr, "CreateProcess failed: %lu\n", GetLastError());
        return 1;
    }

    CloseHandle(stdin_rd);
    CloseHandle(stdout_wr);

    HANDLE ht1 = (HANDLE)_beginthreadex(NULL, 0, pump_stdin, NULL, 0, NULL);
    HANDLE ht2 = (HANDLE)_beginthreadex(NULL, 0, pump_stdout, NULL, 0, NULL);

    WaitForSingleObject(pi.hProcess, INFINITE);
    DWORD ec;
    GetExitCodeProcess(pi.hProcess, &ec);

    CloseHandle(g_stdout_rd);
    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
    if (ht1) CloseHandle(ht1);
    if (ht2) CloseHandle(ht2);

    return (int)ec;
}
