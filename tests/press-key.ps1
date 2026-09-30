Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class KeyboardTest {
  [DllImport("user32.dll")]
  public static extern void keybd_event(byte key, byte scan, uint flags, UIntPtr extra);
}
'@
[KeyboardTest]::keybd_event(0x56, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 1800
[KeyboardTest]::keybd_event(0x56, 0, 2, [UIntPtr]::Zero)
