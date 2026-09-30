# Windows için yerel kod imzalama

Bu belge, kendi güvenilir Code Signing sertifikası olan geliştiriciler içindir. SignPath Foundation üzerinden GitHub release imzalama süreci için [README.md](README.md#code-signing-policy) dosyasına bakın. Bir TLS/HTTPS sertifikası veya self-signed sertifika, herkese dağıtılan Windows EXE için güvenilir Code Signing sertifikasının yerini tutmaz.

Sertifika Windows sertifika deposunda özel anahtarıyla erişilebilir durumdaysa, PowerShell'de uygun sertifikanın SHA-1 parmak izini bulun:

```powershell
Get-ChildItem Cert:\CurrentUser\My, Cert:\LocalMachine\My |
  Where-Object { $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date) -and
    ($_.EnhancedKeyUsageList | Where-Object ObjectId -eq '1.3.6.1.5.5.7.3.3') } |
  Select-Object Subject, Thumbprint, NotAfter
```

Sonra `CLUTCHUB_SIGN_THUMBPRINT` ortam değişkenini ayarlayıp `npm run package:win:signed` çalıştırın. Dışa aktarılabilir bir PFX kullanılıyorsa `WIN_CSC_LINK` dosya yolunu ve `WIN_CSC_KEY_PASSWORD` parolasını yalnızca yerel ortamda ayarlayın. Sertifika, PFX ve parolayı Git'e, web köküne veya sohbete koymayın.

Betik `dist/ClutchHub-Setup-<sürüm>.exe`, `dist/win-unpacked/ClutchHub.exe` ve `dist/win-unpacked/resources/keys/Clutchub.Keys.exe` dosyalarının Authenticode durumunu `Valid` olarak doğrular. Başarısız doğrulamada işlem hata verir. İmza yayıncıyı ve dosya bütünlüğünü doğrular; SmartScreen dosya itibarı ayrı değerlendirilir.
