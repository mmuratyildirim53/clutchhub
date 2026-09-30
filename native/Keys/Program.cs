using System.Runtime.InteropServices;
using System.Text.Json;

// Runs only while Clutchub is open. It observes keyboard transitions without
// consuming them, so the game still receives its normal key events.
internal static class Program
{
    private const int WhKeyboardLl = 13;
    private const int WmKeyDown = 0x0100;
    private const int WmKeyUp = 0x0101;
    private const int WmSysKeyDown = 0x0104;
    private const int WmSysKeyUp = 0x0105;
    private const int WmQuit = 0x0012;
    private static readonly HashSet<uint> Down = new();
    private static readonly LowLevelKeyboardProc Callback = HandleKey;
    private static readonly object OutputLock = new();
    private static IntPtr _hook;
    private static uint _threadId;

    private static int Main()
    {
        _threadId = GetCurrentThreadId();
        _hook = SetWindowsHookEx(WhKeyboardLl, Callback, GetModuleHandle(null), 0);
        if (_hook == IntPtr.Zero)
        {
            Console.Error.WriteLine($"keyboard hook failed: {Marshal.GetLastWin32Error()}");
            return 1;
        }

        Console.WriteLine("READY");
        _ = Task.Run(() =>
        {
            // Parent owns stdin. Closing it also releases the hook.
            while (Console.ReadLine() is { } line)
                if (line == "QUIT") break;
            PostThreadMessage(_threadId, WmQuit, IntPtr.Zero, IntPtr.Zero);
        });

        try
        {
            while (GetMessage(out var message, IntPtr.Zero, 0, 0) > 0)
            {
                TranslateMessage(ref message);
                DispatchMessage(ref message);
            }
        }
        finally
        {
            foreach (var vk in Down) WriteKey(vk, false);
            Down.Clear();
            UnhookWindowsHookEx(_hook);
        }
        return 0;
    }

    private static IntPtr HandleKey(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0)
        {
            var code = Marshal.PtrToStructure<KbdLlHookStruct>(lParam).VkCode;
            var message = wParam.ToInt32();
            if (IsAllowed(code))
            {
                if (message is WmKeyDown or WmSysKeyDown && Down.Add(code)) WriteKey(code, true);
                else if (message is WmKeyUp or WmSysKeyUp && Down.Remove(code)) WriteKey(code, false);
            }
        }
        return CallNextHookEx(_hook, nCode, wParam, lParam);
    }

    private static bool IsAllowed(uint vk) => vk is >= 0x41 and <= 0x5A or >= 0x30 and <= 0x39 or 0x20;

    private static void WriteKey(uint vk, bool pressed)
    {
        var code = vk switch
        {
            0x20 => "Space",
            >= 0x41 and <= 0x5A => $"Key{(char)vk}",
            _ => $"Digit{(char)vk}"
        };
        var data = new
        {
            code,
            down = pressed,
            ctrl = IsDown(0x11),
            alt = IsDown(0x12),
            shift = IsDown(0x10),
            meta = IsDown(0x5B) || IsDown(0x5C)
        };
        lock (OutputLock) Console.WriteLine(JsonSerializer.Serialize(data));
    }

    private static bool IsDown(int vk) => (GetAsyncKeyState(vk) & 0x8000) != 0;

    private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);
    [StructLayout(LayoutKind.Sequential)]
    private struct KbdLlHookStruct { public uint VkCode, ScanCode, Flags, Time; public IntPtr ExtraInfo; }
    [StructLayout(LayoutKind.Sequential)]
    private struct Point { public int X, Y; }
    [StructLayout(LayoutKind.Sequential)]
    private struct Message { public IntPtr Hwnd; public uint Msg; public IntPtr WParam, LParam; public uint Time; public Point Pt; public uint Private; }

    [DllImport("user32.dll", SetLastError = true)] private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc proc, IntPtr module, uint threadId);
    [DllImport("user32.dll")] private static extern bool UnhookWindowsHookEx(IntPtr hook);
    [DllImport("user32.dll")] private static extern IntPtr CallNextHookEx(IntPtr hook, int code, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] private static extern int GetMessage(out Message msg, IntPtr hwnd, uint min, uint max);
    [DllImport("user32.dll")] private static extern bool TranslateMessage(ref Message msg);
    [DllImport("user32.dll")] private static extern IntPtr DispatchMessage(ref Message msg);
    [DllImport("user32.dll", SetLastError = true)] private static extern bool PostThreadMessage(uint threadId, int msg, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] private static extern short GetAsyncKeyState(int key);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] private static extern IntPtr GetModuleHandle(string? name);
    [DllImport("kernel32.dll")] private static extern uint GetCurrentThreadId();
}
