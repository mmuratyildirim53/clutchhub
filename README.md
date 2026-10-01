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
dotnet publish native/Keys/Clutchub.Keys.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:PublishTrimmed=false -p:IncludeSourceRevisionInInformationalVersion=false -p:Product=ClutchHub -p:Version=1.0.0.0
npm run check
npm start
```

`npm start` mevcut production sitesini açar. Yerel geliştirme için Next.js arayüzünü ve ona bağlı yerel API/LiveKit servislerini ayrıca başlatın; ardından `npm run dev` çalıştırın. Bu komut varsayılan olarak `http://localhost:3000` sitesini açar. Yerel arayüz başka porttaysa yalnızca yerel bir HTTP adresi olacak şekilde `CLUTCHUB_DEV_SITE_URL` ortam değişkenini ayarlayabilirsiniz. Yerel arayüzün API ve ses sunucusu bağlantıları da kendi geliştirme ortamında yapılandırılmalıdır. Paketlenen Windows EXE, geliştirme değişkenleri ayarlansa bile her zaman `https://clutchhub.net` adresini kullanır. Sunucu parolaları ve LiveKit özel anahtarları istemciye eklenmez.

Kurulum paketi üretmek için `npm run build:win` çalıştırın. Çıktı `dist/ClutchHub-Setup-<sürüm>.exe` olur. Sürüm, `package.json` içindeki `version` alanından gelir. `native/Keys` yardımcısı önce yayımlanmış olmalıdır. Yerel build, geçerli bir kod imzalama sertifikası yapılandırılmadıkça **imzasızdır**. Mevcut yerel sertifika ile imzalama yöntemi için [IMZALAMA.md](IMZALAMA.md) ve `npm run package:win:signed` kullanılabilir.

## Windows kurulumu

İmzalı sürümler için GitHub **Releases** sayfasındaki `ClutchHub-Setup-<sürüm>.exe` dosyasını indirin. SignPath henüz yapılandırılmadıysa kurulum dosyası yalnızca ilgili GitHub Actions çalıştırmasının **clutchhub-unsigned** artifact'ında bulunur; bu dosya imzasızdır. Kurulum dosyasını çalıştırıp hedef klasörü seçebilirsiniz; masaüstü kısayolu oluşturulur. Uygulamayı açıp bir kullanıcı adı seçin, odaya katılın ve bas-konuş tuşunu ayarlayın. Doğrulanmış imza, dosyanın yayıncısını ve bütünlüğünü gösterir; yeni bir sürüm için Windows SmartScreen itibar uyarısının hemen kaybolmasını garanti etmez.

## Code signing policy

Free code signing provided by SignPath.io, certificate by SignPath Foundation.

Kaynak kodu ve release iş akışı herkese açıktır. Yalnızca bu deponun yetkili bakımcısı tarafından oluşturulan, incelenen ve sürümü `package.json` ile eşleşen Git tag'leri release sürecini başlatır. [Windows release iş akışı](.github/workflows/windows-release.yml) Windows üzerinde kaynak koddan build alır ve imzasız kurulum dosyasını her zaman workflow artifact'ı olarak yükler. SignPath yapılandırması yoksa imzalama atlanır ve başarılı build sonunda imzasız artifact kalır; otomatik GitHub Release oluşturulmaz. SignPath yapılandırması varsa iş akışı uygulama ile bas-konuş yardımcısını imzalatır, imzalarını doğrular, kurulum EXE'sini yeniden oluşturup imzalatır ve Authenticode doğrulamasından sonra yalnızca imzalı kurulum dosyasını GitHub Release'e yayımlar.

SignPath Foundation ile imzalama, Foundation'ın projeyi kabul etmesine ve gerekli kimlik/hesap yapılandırmasının tamamlanmasına bağlıdır. Bu depoda özel anahtar, sertifika, PFX veya API token tutulmaz. GitHub **Settings → Secrets and variables → Actions** alanında `SIGNPATH_API_TOKEN` secret'ı ve `SIGNPATH_ORGANIZATION_ID`, `SIGNPATH_PROJECT_SLUG`, `SIGNPATH_SIGNING_POLICY_SLUG`, `SIGNPATH_ARTIFACT_CONFIGURATION_SLUG` değişkenleri tanımlanmalıdır. SignPath projesindeki artifact configuration, [artifact-configuration.xml](signpath/artifact-configuration.xml) ile uyumlu olmalıdır. İmzalama isteğinin SignPath tarafında ayrıca onaylanması gerekebilir.

Sürüm yayınlamak için önce `package.json` sürümünü artırıp değişikliği `main` dalına gönderin; sonra aynı sürüm için `v<sürüm>` tag'ini gönderin. Örneğin 1.0.0 sürümü için:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Code signing, SmartScreen dosya itibarından farklıdır; geçerli Authenticode imzası tek başına itibar uyarısını kaldırmaz.

## Lisans

[MIT License](LICENSE).
