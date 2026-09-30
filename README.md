# ClutchHub

ClutchHub, Windows 10/11 için Electron tabanlı bir sesli sohbet istemcisidir. Oyun oynarken [clutchhub.net](https://clutchhub.net) ses odalarına masaüstünden bağlanır. Arayüz ve oda hizmeti canlı site üzerinden yüklenir; bu depo Windows istemcisini ve bas-konuş klavye yardımcısını içerir. İstemciyi kullanmak için internet bağlantısı gerekir.

## Temel özellikler

- Açılışta kullanıcı adı seçimi ve ses odalarına katılım
- Uygulama arka planda veya sistem tepsisindeyken çalışan bas-konuş kısayolu
- Oda katılımcıları, metin sohbeti ve kullanıcı ses düzeyi gibi canlı site özellikleri
- Yetkili hesaplar için kanal ve kullanıcı yönetimi (sunucu yetkisine bağlı)
- Windows için NSIS kurulum paketi

## Geliştirme ve build

Windows, Node.js 22+, npm ve .NET 9 SDK gerekir. Depo kökünde PowerShell ile:

```powershell
npm ci
dotnet publish native/Keys/Clutchub.Keys.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:PublishTrimmed=false -p:Product=ClutchHub -p:Version=0.4.0.0
npm run check
npm start
```

Kurulum paketi üretmek için `npm run build:win` çalıştırın. Çıktı `dist/ClutchHub-Setup-<sürüm>.exe` olur. Sürüm, `package.json` içindeki `version` alanından gelir. `native/Keys` yardımcısı önce yayımlanmış olmalıdır. Yerel build, geçerli bir kod imzalama sertifikası yapılandırılmadıkça **imzasızdır**. Mevcut yerel sertifika ile imzalama yöntemi için [IMZALAMA.md](IMZALAMA.md) ve `npm run package:win:signed` kullanılabilir.

## Windows kurulumu

Yayımlanan sürümler için GitHub **Releases** sayfasındaki `ClutchHub-Setup-<sürüm>.exe` dosyasını indirin ve çalıştırın. Kurulumda hedef klasörü seçebilirsiniz; masaüstü kısayolu oluşturulur. Uygulamayı açıp bir kullanıcı adı seçin, odaya katılın ve bas-konuş tuşunu ayarlayın. Doğrulanmış imza, dosyanın yayıncısını ve bütünlüğünü gösterir; yeni bir sürüm için Windows SmartScreen itibar uyarısının hemen kaybolmasını garanti etmez.

## Code signing policy

Free code signing provided by SignPath.io, certificate by SignPath Foundation.

Kaynak kodu ve release iş akışı herkese açıktır. Yalnızca bu deponun yetkili bakımcısı tarafından oluşturulan, incelenen ve sürümü `package.json` ile eşleşen Git tag'leri release sürecini başlatır. [Windows release iş akışı](.github/workflows/windows-release.yml) Windows üzerinde kaynak koddan build alır, SignPath'e imzalama isteği gönderir, uygulama ve bas-konuş yardımcısının imzalarını doğrular, ardından kurulum EXE'sini imzalatıp Authenticode doğrulamasından geçirir. GitHub Release'e yalnızca doğrulanmış imzalı kurulum dosyası yayımlanır. SignPath yapılandırması yoksa tag release'i başarısız olur ve imzasız kurulum yayımlanmaz.

SignPath Foundation ile imzalama, Foundation'ın projeyi kabul etmesine ve gerekli kimlik/hesap yapılandırmasının tamamlanmasına bağlıdır. Bu depoda özel anahtar, sertifika, PFX veya API token tutulmaz. GitHub **Settings → Secrets and variables → Actions** alanında `SIGNPATH_API_TOKEN` secret'ı ve `SIGNPATH_ORGANIZATION_ID`, `SIGNPATH_PROJECT_SLUG`, `SIGNPATH_SIGNING_POLICY_SLUG`, `SIGNPATH_ARTIFACT_CONFIGURATION_SLUG` değişkenleri tanımlanmalıdır. SignPath projesindeki artifact configuration, [artifact-configuration.xml](signpath/artifact-configuration.xml) ile uyumlu olmalıdır. İmzalama isteğinin SignPath tarafında ayrıca onaylanması gerekebilir.

Sürüm yayınlamak için önce `package.json` sürümünü artırıp değişikliği `main` dalına gönderin; sonra aynı sürüm için `v<sürüm>` tag'ini gönderin. Örneğin 0.4.0 sürümü için:

```bash
git tag v0.4.0
git push origin v0.4.0
```

Code signing, SmartScreen dosya itibarından farklıdır; geçerli Authenticode imzası tek başına itibar uyarısını kaldırmaz.

## Lisans

[MIT License](LICENSE).
