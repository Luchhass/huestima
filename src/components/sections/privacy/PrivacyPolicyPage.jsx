"use client";

import { useTranslation } from "@/hooks/useLanguage";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";
import { useFooterPageTransition } from "@/hooks/useFooterPageTransition";
import FooterPageShell, {
  FooterPageHeader,
} from "@/components/sections/footer-pages/FooterPageShell";
import CardCloseButton from "@/components/ui/CardCloseButton";

const CONTENT = {
  en: {
    title: "Privacy Policy",
    updated: "Last updated: October 30, 2026",
    back: "Back to Huestima",
    intro:
      "Huestima is a browser-based game. This notice describes the information handled when you use its games, multiplayer rooms, match history, profile, and sharing features. It is written for the current website and may change as the service changes.",
    sections: [
      ["Who operates Huestima", "Huestima is operated by its project owner. For privacy requests and questions, use the contact channel at furkancosar.com. Before an official commercial launch, this notice should identify the responsible operator by their full legal name and provide a direct, monitored contact address and any legally required representative details."],
      ["Information and purposes", "You do not need an account. Huestima does not ask for your legal name, postal address, phone number, precise location, camera, microphone, or payment details. You may choose a display name and room name. The service processes those names, room codes and settings, game choices, guesses, progress, scores, player/session identifiers, and connection state to run games, show rooms and results, reconnect players, prevent abuse, and keep the service secure. Multiplayer names and scores are visible to people in the relevant room and may appear in a result you choose to share."],
      ["Local storage and match history", "The browser stores game history (up to 20 recent matches), profile statistics, active game sessions, room resume information, player-name preference, notification read state, and settings such as language, theme, sound, and music. Match history includes game type and mode, date, scores, round results and game-specific selections; multiplayer history can also contain display names and leaderboard results. This information is kept in your browser's localStorage or sessionStorage and is not uploaded as match history by that feature. Anyone with access to this browser profile may be able to see it. Clear this site's browser storage to remove it; deleting an entry in the history screen removes that entry from the local history."],
      ["Multiplayer processing", "When you use multiplayer, your browser exchanges room and gameplay information with the Huestima game server using Socket.IO. The server keeps room and game state in memory so participants can play and reconnect. Room listings and room participants can see room names, host/display names, settings, and status; room participants can see gameplay and results. A room is normally removed after its configured expiry (one hour by default, refreshed by activity); an empty room normally expires after two minutes. These periods can change with server configuration. A room password, if set, is stored by the server as a password hash rather than plain text. Do not use a real name, contact detail, password you use elsewhere, or other sensitive information as a player or room name."],
      ["Sharing results and URLs", "Sharing is optional. A shared result link contains an encoded copy of match information, which can include game settings, date, round-by-round results, scores, multiplayer display names, and the name you chose to share under. Anyone who receives the link may view or forward its contents. URLs can also be recorded in browser history, server or hosting logs, and shared with a site when the link is opened; avoid putting personal or sensitive information in names or shared results. You can delete your own local copy, but that does not revoke copies or links already received by others."],
      ["Technical logs and security", "The multiplayer server and its hosting or network providers may process connection data such as IP address, socket/session identifiers, request origin, timestamps, and error or security events. The application logs some operational events, including room creation/closure, rejected requests, rate-limit events, and administrator access; admin security logs include IP addresses. These records are used to operate, troubleshoot, and protect the service. The hosting provider may keep infrastructure access logs under its own retention and security practices; the exact provider and retention period depend on the production deployment."],
      ["Analytics", "If Google Analytics is enabled for a deployment, the site loads Google Analytics and sends page views, game start/end and score events, and web performance measurements. Events can include game family, type, mode, difficulty, rounds, and score metrics. Page URLs are sanitized to remove query strings and fragments and to mask six-digit room codes before analytics events are sent. Google may also process device/browser, network (including IP address), approximate location, and cookie or similar identifiers under its own terms. Analytics is not enabled when the deployment has no measurement ID. This site currently does not provide an analytics consent control, so the operator should assess and implement any consent or opt-out mechanism required for the launch jurisdictions before enabling analytics."],
      ["Recipients and international processing", "Information is available to the Huestima operator and, as needed to provide the site, to the multiplayer server, website hosting, infrastructure/network providers, and Google when Analytics is enabled. Their systems may be located in different countries. The production operator must identify the actual providers, locations, transfer mechanism, and safeguards and meet applicable transfer requirements before launch. Each provider may process information under its own terms and applicable law."],
      ["Retention and choices", "Browser data remains until you delete it or the browser removes it. Multiplayer room data is held in server memory until the room expires or is removed; routine logs may persist separately according to actual server and provider settings. Huestima does not currently offer a centralized account-based deletion tool because match history and profile data are stored on your device. You can clear local site data and contact the operator to request access, correction, deletion, or other applicable privacy rights for information associated with a room or shared result. Include the relevant room code or URL, but do not send passwords or unnecessary sensitive information. A request cannot remove copies held by other players or beyond the operator's control."],
      ["Your privacy rights", "Depending on where you live and which laws apply, you may have rights to learn about, access, correct, delete, restrict or object to certain processing, withdraw consent where processing relies on consent, and complain to a regulator. For Türkiye, requests may be made under the applicable rights in Article 11 of Law No. 6698 (KVKK); for the EEA/UK, GDPR rights may apply; and for some US states, consumer privacy rights may apply. Contact the operator using furkancosar.com. The operator may need to verify a request and may retain information where the law permits or requires it. The operator's identity, legal bases for each purpose, response process, and regulator/representative details must be confirmed and published for each applicable market."],
      ["Children", "Huestima is not designed to collect personal information from children under 13. If the service becomes directed to children or the operator learns it has collected a child's personal information where parental consent is required, the operator must follow the applicable child-privacy rules, including required notices, consent, access, and deletion procedures. Do not include a child's real name or contact details in a display name or shared result."],
      ["Changes and contact", "This notice may be updated when the service or applicable requirements change. The revision date appears above. For privacy questions or requests, contact the project owner through furkancosar.com."],
    ],
  },
  tr: {
    title: "Gizlilik Politikası",
    updated: "Son güncelleme: 30 Ekim 2026",
    back: "Huestima'ya dön",
    intro:
      "Huestima tarayıcı üzerinden oynanan bir oyundur. Bu aydınlatma metni oyunlar, multiplayer odaları, maç geçmişi, profil ve paylaşım özelliklerini kullanırken işlenen bilgileri açıklar. Mevcut web sitesi için hazırlanmıştır; hizmet değiştikçe güncellenebilir.",
    sections: [
      ["Hizmetin işletmecisi", "Huestima proje sahibi tarafından işletilir. Gizlilik talepleri ve sorular için furkancosar.com adresindeki iletişim kanalını kullanabilirsiniz. Resmî ve ticari yayından önce bu metinde veri sorumlusunun tam yasal adı, doğrudan ve düzenli takip edilen iletişim adresi ve gerekiyorsa kanuni temsilci bilgileri açıklanmalıdır."],
      ["Bilgiler ve işleme amaçları", "Hesap açmanız gerekmez. Huestima yasal adınızı, posta adresinizi, telefonunuzu, kesin konumunuzu, kameranızı, mikrofonunuzu veya ödeme bilgilerinizi istemez. İsteğe bağlı olarak görünen ad ve oda adı seçebilirsiniz. Oyunları yürütmek, odaları ve sonuçları göstermek, oyuncuların yeniden bağlanmasını sağlamak ve kötüye kullanımı önleyip hizmeti güvenli tutmak için bu adlar; oda kodu ve ayarları; oyun seçimi; tahminler; ilerleme; skor; oyuncu/oturum tanımlayıcıları ve bağlantı durumu işlenir. Multiplayer adları ve skorları ilgili odadaki kişilere görünür ve paylaşmayı seçtiğiniz sonuçta yer alabilir."],
      ["Cihazınızdaki depolama ve maç geçmişi", "Tarayıcınız oyun oturumlarını, en fazla 20 yakın maçı, profil istatistiklerini, oda devam bilgilerini, oyuncu adı tercihini, bildirim okundu bilgisini ve dil, tema, ses ve müzik gibi ayarları saklar. Maç geçmişinde oyun türü/modu, tarih, skorlar, tur sonuçları ve oyuna özgü seçimler bulunur; multiplayer geçmişinde görünen adlar ve skor tablosu da yer alabilir. Bu bilgiler localStorage veya sessionStorage alanında tutulur; maç geçmişi özelliği bunları sunucuya yüklemez. Aynı tarayıcı profiline erişen kişiler bunları görebilir. Tarayıcıdaki bu site verilerini temizleyerek silebilir, geçmiş ekranında bir maçı kaldırabilirsiniz."],
      ["Multiplayer işlemleri", "Multiplayer kullandığınızda tarayıcınız oda ve oyun bilgilerini Socket.IO üzerinden Huestima oyun sunucusuna aktarır. Sunucu, oynama ve yeniden bağlanma için oda ve oyun durumunu bellekte tutar. Oda listelerinde oda adı, host/görünen ad, ayarlar ve durum; oda katılımcıları arasında ise oyun ve sonuç bilgileri görülebilir. Odalar normalde yapılandırılmış süre dolunca silinir (varsayılan olarak bir saat, etkinlikle yenilenir); boş odalar normalde iki dakika içinde silinir. Bu süreler sunucu yapılandırmasıyla değişebilir. Oda parolası varsa sunucuda açık metin yerine parola özeti saklanır. Oyuncu veya oda adı olarak gerçek ad, iletişim bilgisi, başka yerde kullandığınız parola ya da hassas bilgi kullanmayın."],
      ["Sonuç paylaşımı ve bağlantılar", "Sonuç paylaşmak isteğe bağlıdır. Paylaşım bağlantısı; oyun ayarları, tarih, tur sonuçları ve skorlar, multiplayer görünen adları ve paylaşan kişinin seçtiği ad dahil maç bilgilerinin kodlanmış bir kopyasını içerir. Bağlantıyı alan herkes içeriği görüntüleyebilir veya başkasına iletebilir. URL tarayıcı geçmişine, sunucu/hosting kayıtlarına girebilir veya bağlantı açılırken ilgili siteyle paylaşılabilir. Adlarda ya da paylaşılan sonuçlarda kişisel veya hassas bilgi kullanmayın. Yerel kopyanızı silmek, başkalarının elindeki kopyaları veya bağlantıları geri almaz."],
      ["Teknik kayıtlar ve güvenlik", "Multiplayer sunucusu ve hosting/ağ sağlayıcıları IP adresi, socket/oturum tanımlayıcısı, istek kaynağı (Origin), zaman damgası, hata ve güvenlik olayı gibi bağlantı verilerini işleyebilir. Uygulama; oda açma/kapatma, reddedilen istekler, hız sınırı olayları ve yönetici erişimi gibi bazı operasyonel olayları kaydeder; yönetici güvenlik kayıtlarında IP adresi bulunur. Bu kayıtlar hizmeti işletmek, sorun gidermek ve güvenliği korumak için kullanılır. Hosting sağlayıcısı kendi erişim kayıtlarını güvenlik ve saklama uygulamalarına göre tutabilir; kesin sağlayıcı ve saklama süresi canlı sistem yapılandırmasına bağlıdır."],
      ["Analytics", "Deployment ortamında Google Analytics etkinleştirilmişse site Google Analytics'i yükler ve sayfa görüntüleme, oyun başlangıç/bitiş ve skor olayları ile web performans ölçümlerini gönderir. Olaylar oyun ailesi, türü, modu, zorluk, tur sayısı ve skor ölçülerini içerebilir. Analytics'e gönderilmeden önce sayfa URL'lerinin sorgu parametreleri ve parçası çıkarılır, altı haneli oda kodları maskelenir. Google ayrıca kendi koşulları kapsamında cihaz/tarayıcı, ağ (IP adresi dahil), yaklaşık konum ve çerez ya da benzer tanımlayıcıları işleyebilir. Ölçüm kimliği tanımlı değilse Analytics yüklenmez. Mevcut sitede Analytics için bir rıza kontrolü yoktur; işletmeci, hedef pazarlarda gereken rıza veya ret mekanizmasını Analytics'i etkinleştirmeden önce değerlendirmeli ve uygulamalıdır."],
      ["Alıcılar ve yurt dışı işlemler", "Bilgiler Huestima işletmecisi ve hizmeti sunmak gerektiğinde multiplayer sunucusu, web hosting, altyapı/ağ sağlayıcıları ve Analytics etkinse Google tarafından işlenebilir. Bu sistemler farklı ülkelerde bulunabilir. Canlıya geçmeden önce işletmeci gerçek sağlayıcıları, konumları, aktarım mekanizmasını ve güvenceleri belirlemeli ve ilgili aktarım kurallarına uymalıdır. Sağlayıcılar bilgileri kendi koşulları ve tabi oldukları hukuk kapsamında işleyebilir."],
      ["Saklama ve tercihleriniz", "Tarayıcı verileri siz silene veya tarayıcı kaldırana kadar kalır. Multiplayer oda verileri oda sona erene veya silinene kadar sunucu belleğinde tutulur; operasyon kayıtları ayrı saklama ayarlarına bağlı olabilir. Maç geçmişi ve profil cihazınızda tutulduğundan Huestima şu anda hesap tabanlı merkezi silme aracı sunmaz. Yerel site verilerini temizleyebilir; oda veya paylaşılmış sonuçla ilişkili bilgiler için erişim, düzeltme, silme ve uygulanabilir diğer hak taleplerinizi işletmeciye iletebilirsiniz. Talepte ilgili oda kodu ya da bağlantıyı belirtin; parola veya gereksiz hassas bilgi göndermeyin. Başka oyuncuların kopyaları veya işletmecinin kontrolü dışındaki kayıtlar talep üzerine kaldırılamayabilir."],
      ["Gizlilik haklarınız", "Bulunduğunuz yere ve uygulanabilir hukuka bağlı olarak bilgi alma, erişim, düzeltme, silme, işlemenin kısıtlanmasını veya itiraz, işleme rızaya dayanıyorsa rızayı geri çekme ve denetim makamına şikâyet haklarınız olabilir. Türkiye'de 6698 sayılı KVKK'nın 11. maddesindeki haklar; AEA/Birleşik Krallık'ta GDPR hakları; bazı ABD eyaletlerinde tüketici gizliliği hakları uygulanabilir. furkancosar.com üzerinden işletmeciyle iletişime geçin. İşletmeci talebi doğrulamak zorunda kalabilir ve kanunun izin verdiği veya gerektirdiği bilgileri saklayabilir. Her pazar için işletmecinin kimliği, her amaçtaki hukuki sebep, başvuru süreci ve gerekiyorsa temsilci/denetim makamı bilgileri teyit edilip yayımlanmalıdır."],
      ["Çocuklar", "Huestima 13 yaşından küçük çocuklardan kişisel bilgi toplamak üzere tasarlanmamıştır. Hizmet çocuklara yönelik hale gelirse veya işletmeci ebeveyn izninin gerektiği bir durumda çocuğa ait bilgi toplandığını öğrenirse; gerekli bildirim, izin, erişim ve silme süreçleri dahil uygulanabilir çocuk gizliliği kurallarına uymalıdır. Görünen ad veya paylaşılan sonuçlara çocuğun gerçek adını ya da iletişim bilgilerini yazmayın."],
      ["Değişiklikler ve iletişim", "Hizmet veya uygulanabilir gereklilikler değiştikçe bu metin güncellenebilir. Son güncelleme tarihi yukarıda yer alır. Gizlilik soruları ve talepleri için furkancosar.com üzerinden proje sahibiyle iletişime geçin."],
    ],
  },
};

export default function PrivacyPolicyPage() {
  const { locale } = useTranslation();
  const mainRef = useRef(null);
  const searchParams = useSearchParams();
  const content = CONTENT[locale] || CONTENT.en;
  const returnPath = ["color", "flag", "cartoon", "brand"].includes(
    searchParams.get("from"),
  )
    ? `/${searchParams.get("from")}`
    : "/color";

  const leavePage = useFooterPageTransition(mainRef);

  const handleClose = async (event) => {
    event.preventDefault();
    await leavePage(returnPath);
  };
  return (
    <FooterPageShell
      mainRef={mainRef}
      staticLanguage
      action={
        <CardCloseButton href={returnPath} onClick={handleClose} label={content.back} className="absolute right-6 top-6 text-foreground/62 sm:right-10 sm:top-8 lg:right-14" />
      }
    >
      <article data-screen-reveal>
        <FooterPageHeader
          kicker={null}
          title={content.title}
          meta={content.updated}
          metaPlacement="below"
          description={content.intro}
        />
        <div className="max-w-3xl space-y-6 pt-8 sm:pt-10">
          {content.sections.map(([title, body]) => (
            <section key={title}>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-1 max-w-3xl text-[0.98rem] leading-7 text-foreground/68">{body}</p>
            </section>
          ))}
        </div>
      </article>
    </FooterPageShell>
  );
}
