"use client";

import { useTranslation } from "@/hooks/useLanguage";
import { X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";
import { useFooterPageTransition } from "@/hooks/useFooterPageTransition";
import FooterPageShell, {
  FooterPageAction,
  FooterPageHeader,
} from "@/components/sections/footer-pages/FooterPageShell";

const CONTENT = {
  en: {
    title: "Privacy Policy",
    updated: "Last updated: August 23, 2026",
    back: "Back to Huestima",
    intro:
      "Huestima is a browser-based color memory and guessing game. This policy explains what information the project handles, why it is handled, and what choices you have.",
    sections: [
      ["Information we handle", "Huestima does not require an account and does not ask for your real name, address, phone number, precise location, camera, microphone, or payment information. If you enter a player name for multiplayer, that name is used for the room and may be included in a shared match link."],
      ["Storage on your device", "Game sessions, recent match history, player-name preferences, language, theme, sound, music, fullscreen, and intro preferences may be stored in your browser's localStorage or sessionStorage. This keeps the game functional and lets you resume a game. You can remove this information by clearing site data in your browser."],
      ["Multiplayer and rooms", "Multiplayer uses Socket.IO to send room membership, player names, game settings, game progress, guesses, scores, and connection events between participants and the game server. Room codes and shared links are intended to be used by people who have access to them. Do not enter sensitive personal information as a player name."],
      ["Match history and sharing", "Completed matches can be saved locally on your device. When you choose to share a result, the generated URL may contain an encoded copy of match details and an optional display name. Anyone with that URL may be able to view the information it contains."],
      ["Analytics and technical data", "Google Analytics is loaded only when the deployment provides a NEXT_PUBLIC_GA_MEASUREMENT_ID. If enabled, Google may receive standard analytics and technical information such as page views, device or browser information, approximate location, and network identifiers according to Google's policies. Huestima itself does not sell personal information or use it for advertising profiles."],
      ["Third-party services and assets", "The project may use Google Analytics, the Socket.IO multiplayer server, hosting infrastructure, browser APIs such as clipboard sharing, and static game assets. Those services may process technical data necessary to provide their functions and have their own privacy terms."],
      ["Retention and deletion", "Local data remains on your device until you clear it, the relevant session expires, or the application removes it. Multiplayer room data is handled for the duration of the room and its operational needs. To request deletion of information you submitted through a multiplayer room or shared result, contact the project owner with the relevant room or link."],
      ["Children", "Huestima is a general-audience game and is not directed at children under the age where parental consent is required by applicable law. Do not submit personal information through player names or shared results."],
      ["Changes and contact", "This policy may be updated when the project changes. The latest version will be published on this page. For privacy questions or deletion requests, contact the project owner through furkancosar.com."],
    ],
  },
  tr: {
    title: "Gizlilik Politikası",
    updated: "Son güncelleme: 23 Ağustos 2026",
    back: "Huestima'ya dön",
    intro:
      "Huestima tarayıcı üzerinden oynanan bir renk hafızası ve tahmin oyunudur. Bu politika projenin hangi bilgileri işlediğini, neden işlediğini ve hangi seçeneklere sahip olduğunuzu açıklar.",
    sections: [
      ["İşlediğimiz bilgiler", "Huestima hesap gerektirmez; gerçek adınızı, adresinizi, telefonunuzu, kesin konumunuzu, kameranızı, mikrofonunuzu veya ödeme bilgilerinizi istemez. Multiplayer için bir oyuncu adı girerseniz bu ad odada kullanılır ve paylaşılan maç bağlantısında yer alabilir."],
      ["Cihazınızdaki depolama", "Oyun oturumları, son maç geçmişi, oyuncu adı tercihi, dil, tema, ses, müzik, tam ekran ve intro tercihleri tarayıcınızın localStorage veya sessionStorage alanında tutulabilir. Bu veriler oyunun çalışmasını ve oyuna devam etmenizi sağlar. Tarayıcı ayarlarından site verilerini temizleyerek silebilirsiniz."],
      ["Multiplayer ve odalar", "Multiplayer, oda üyeliği, oyuncu adları, oyun ayarları, ilerleme, tahminler, skorlar ve bağlantı olaylarını oyuncular ile oyun sunucusu arasında Socket.IO üzerinden aktarır. Oda kodları ve paylaşım bağlantıları erişimi olan kişiler tarafından kullanılabilir. Oyuncu adı olarak hassas kişisel bilgi girmeyin."],
      ["Maç geçmişi ve paylaşım", "Tamamlanan maçlar cihazınıza yerel olarak kaydedilebilir. Sonuç paylaştığınızda oluşturulan URL, maç ayrıntılarının kodlanmış bir kopyasını ve isteğe bağlı görünen adı içerebilir. Bu bağlantıya sahip olan kişiler içerdiği bilgileri görebilir."],
      ["Analytics ve teknik veriler", "Google Analytics yalnızca deployment ortamında NEXT_PUBLIC_GA_MEASUREMENT_ID tanımlıysa yüklenir. Etkinse Google; sayfa görüntüleme, cihaz veya tarayıcı bilgisi, yaklaşık konum ve ağ tanımlayıcıları gibi standart analytics/teknik bilgileri kendi politikalarına göre alabilir. Huestima kişisel bilgileri satmaz ve reklam profili oluşturmaz."],
      ["Üçüncü taraf hizmetler ve varlıklar", "Proje Google Analytics, Socket.IO multiplayer sunucusu, hosting altyapısı, paylaşım için clipboard gibi tarayıcı API'leri ve statik oyun varlıklarını kullanabilir. Bu servisler kendi işlevlerini sunmak için gerekli teknik verileri işleyebilir ve kendi gizlilik koşullarına sahip olabilir."],
      ["Saklama ve silme", "Yerel veriler siz temizleyene, ilgili oturum sona erene veya uygulama kaldırana kadar cihazınızda kalabilir. Multiplayer oda verileri odanın süresi ve operasyonel ihtiyaçları boyunca işlenir. Multiplayer odasında veya paylaşılmış sonuçta gönderdiğiniz bilgilerin silinmesi için ilgili oda ya da bağlantıyla proje sahibine ulaşabilirsiniz."],
      ["Çocuklar", "Huestima genel kullanıcı kitlesine yönelik bir oyundur ve ilgili hukuka göre ebeveyn izni gereken yaşın altındaki çocuklara yönelik tasarlanmamıştır. Oyuncu adları veya paylaşılmış sonuçlar üzerinden kişisel bilgi göndermeyin."],
      ["Değişiklikler ve iletişim", "Proje değiştikçe bu politika güncellenebilir. Güncel sürüm bu sayfada yayınlanır. Gizlilik soruları veya silme talepleri için furkancosar.com üzerinden proje sahibine ulaşabilirsiniz."],
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
        <FooterPageAction
          href={returnPath}
          onClick={handleClose}
          aria-label={content.back}
          className="size-11 p-0 text-foreground/62"
        >
          <X size={24} strokeWidth={1.8} aria-hidden="true" />
        </FooterPageAction>
      }
    >
      <article>
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
