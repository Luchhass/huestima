import { APP_NAME } from "./constants";

export const DEFAULT_LOCALE = "en";
export const LOCALES = ["en", "tr"];

export const DICTIONARIES = {
  en: {
    app: {
      homeAria: `${APP_NAME} home`,
      createdBy: "created by",
    },
    common: {
      backHome: "Back home",
      loading: "loading",
      lobby: "lobby",
      yes: "Yes",
      no: "No",
    },
    toggles: {
      language: "Switch language",
      languageTo: "Switch to {language}",
      soundOn: "Turn sound on",
      soundOff: "Turn sound off",
      soundToggle: "Toggle sound",
      themeLight: "Switch to light mode",
      themeDark: "Switch to dark mode",
      themeToggle: "Toggle theme",
      fullscreenEnter: "Enter fullscreen layout",
      fullscreenExit: "Exit fullscreen layout",
      fullscreenToggle: "Toggle fullscreen",
    },
    home: {
      paragraphs: [
        "A color appears for five seconds. Memorize the shade, estimate its hue, and keep the tone in your head before it disappears.",
        "Recreate it from memory with hue, saturation, and brightness controls. Play five rounds of this free color guessing game to test your eye.",
      ],
      modeDefault: "Solo or multiplayer",
      modeSingle: "Lets go it alone",
      modeMulti: "Lets crush your friends",
      singleAria: "Start singleplayer",
      multiAria: "Start multiplayer",
      singleTitle: "Singleplayer",
      multiTitle: "Multiplayer",
    },
    player: {
      nameAria: "Player name",
      namePlaceholder: "Enter your name",
      nameRequired: "Enter your name first.",
      nameTooShort: "Use at least {min} characters.",
      nameTooLong: "Keep it under {max} characters.",
    },
    difficulty: {
      label: "Difficulty",
      easy: "Easy",
      normal: "Normal",
      hard: "Hard",
    },
    gameMode: {
      label: "Game mode",
      normal: "Normal",
      flash: "Flash",
      sequence: "Sequence",
    },
    gameModeDescription: {
      normal: "Five seconds to memorize each color.",
      flash: "One second to catch each color.",
      sequence: "Five colors appear back-to-back, three seconds each.",
    },
    setup: {
      singleplayer: "singleplayer",
      multiplayer: "multiplayer",
      play: "Play",
      createLobby: "Create a lobby",
      creating: "Creating",
      couldNotCreate: "Could not create a lobby.",
      singleCopy: {
        normal: "Memorize each color for five seconds, then rebuild it across five rounds.",
        flash: "Catch each one-second flash, then trust your first read.",
        sequence: "Study five colors in order, then recreate the sequence one by one.",
      },
      multiCopy: {
        normal: "Everyone sees the same five-second colors. Closest guesses climb the room.",
        flash: "Everyone gets the same one-second flashes. Fast eyes win.",
        sequence: "Everyone studies the same five-color sequence, then rebuilds it in order.",
      },
      difficultyCopy: {
        easy: "Easy keeps saturation and brightness fixed, so you only tune hue.",
        normal: "Normal adds saturation while brightness stays fixed.",
        hard: "Hard unlocks hue, saturation, and brightness for the full match.",
      },
    },
    room: {
      joinLobby: "join lobby",
      joinLobbyCopy:
        "Enter your name for room {roomCode} on {gameMode} mode with {difficulty} difficulty.",
      join: "Join lobby",
      joining: "Joining",
      lobby: "lobby",
      players: "Players",
      joinedCount: "{count} joined",
      lobbySummary: "{count} players here. {gameMode} mode and {difficulty} difficulty are selected.",
      host: "Host",
      copyInvite: "Copy invite link",
      copyLink: "Copy link",
      copied: "Copied",
      linkCopied: "Link copied. Share it.",
      startGame: "Start game",
      starting: "Starting",
      waitingLobbyReturn: "Waiting for everyone",
      waitingForHost: "Waiting for the host to start.",
      findingLobby: "Finding your private lobby.",
      lobbyNotFound: "Lobby not found or expired.",
      couldNotJoin: "Could not join this lobby.",
      couldNotCopy: "Could not copy automatically. Copy the URL from the address bar.",
      couldNotStart: "Could not start the game.",
      couldNotUpdateSettings: "Could not update lobby settings.",
      couldNotReturnToLobby: "Could not return to the lobby.",
      couldNotReachServer: "Could not reach the multiplayer server.",
      kicked: "removed",
      kickedMessage: "You were removed from the lobby.",
      closedMessage: "This lobby has closed.",
      kickPlayer: "Remove {name}",
      automaticResults: "Results will appear here automatically.",
      backLobby: "Back to lobby",
      returningLobby: "Returning",
      editSettings: "Edit lobby settings",
      closeSettings: "Close lobby settings",
      doneTitleA: "done",
      doneTitleB: "for now",
      doneWaiting: "You're done. Waiting for the other players to finish.",
      takesRoom: "takes the room.",
      you: "You",
      roundTitle: "Round {round}: target {target}, guess {guess}",
    },
    game: {
      ready: "ready",
      set: "set",
      go: "go",
      secondsToRemember: "Seconds to remember",
      secondsInSequence: "Seconds in sequence",
      memorizingSequenceColor: "Memorizing sequence color {index}: {color}",
      submitColorGuess: "Submit color guess",
      level: "level",
      goNextRound: "Go to next round",
      showFinalScore: "Show final score",
      yourSelection: "Your selection",
      original: "Original",
      playAgain: "Play again",
      waitingError: "Could not load the next color.",
      submitError: "Could not submit this guess.",
      resultLine: {
        perfect: "Perfect. Your eye barely blinked.",
        excellent: "Excellent. That memory held strong.",
        veryClose: "Very close. The shade almost stayed with you.",
        solid: "A solid 'meh'. And 'meh' isn't a compliment.",
        off: "Not quite. The color slipped away.",
        wayOff: "Way off. That shade escaped cleanly.",
      },
      assessment: {
        rare: "A rare eye for subtle color. That was sharp.",
        excellent: "Excellent memory with only a few shades drifting away.",
        steady: "A steady run. Your eye stayed close more often than not.",
        mixed: "Some colors stuck, some slipped. Worth another pass.",
        chase: "The spectrum kept moving. Try again and chase the closer match.",
      },
    },
    colorPicker: {
      controls: "HSV color controls",
      hue: "Hue",
      saturation: "Sat",
      brightness: "Value",
      degrees: "{value} degrees",
      saturationPercent: "{value} percent saturation",
      brightnessPercent: "{value} percent brightness",
    },
  },
  tr: {
    app: {
      homeAria: `${APP_NAME} ana sayfa`,
      createdBy: "oluşturan",
    },
    common: {
      backHome: "Ana sayfaya dön",
      loading: "yükleniyor",
      lobby: "lobi",
      yes: "Evet",
      no: "Hayır",
    },
    toggles: {
      language: "Dili değiştir",
      languageTo: "{language} diline geç",
      soundOn: "Sesi aç",
      soundOff: "Sesi kapat",
      soundToggle: "Sesi değiştir",
      themeLight: "Açık moda geç",
      themeDark: "Koyu moda geç",
      themeToggle: "Temayı değiştir",
      fullscreenEnter: "Tam ekran tasarıma geç",
      fullscreenExit: "Tam ekran tasarımdan çık",
      fullscreenToggle: "Tam ekran tasarımı değiştir",
    },
    home: {
      paragraphs: [
        "Bir renk beş saniye görünür. Kaybolmadan önce tonu ezberle, hue değerini tahmin et ve aklında tut.",
        "Rengi hue, saturation ve brightness kontrolleriyle hafızandan yeniden kur. Gözünü test etmek için beş turluk bu renk tahmin oyununu oyna.",
      ],
      modeDefault: "Solo ya da multiplayer",
      modeSingle: "Tek başına başla",
      modeMulti: "Arkadaşlarınla kapış",
      singleAria: "Singleplayer başlat",
      multiAria: "Multiplayer başlat",
      singleTitle: "Singleplayer",
      multiTitle: "Multiplayer",
    },
    player: {
      nameAria: "Oyuncu adı",
      namePlaceholder: "Adını gir",
      nameRequired: "Önce adını gir.",
      nameTooShort: "En az {min} karakter kullan.",
      nameTooLong: "{max} karakterin altında tut.",
    },
    difficulty: {
      label: "Zorluk",
      easy: "Kolay",
      normal: "Normal",
      hard: "Zor",
    },
    gameMode: {
      label: "Oyun modu",
      normal: "Normal",
      flash: "Flash",
      sequence: "Sequence",
    },
    gameModeDescription: {
      normal: "Her rengi ezberlemek için beş saniye.",
      flash: "Her rengi yakalamak için bir saniye.",
      sequence: "Beş renk arka arkaya, her biri üç saniye görünür.",
    },
    setup: {
      singleplayer: "singleplayer",
      multiplayer: "multiplayer",
      play: "Oyna",
      createLobby: "Lobi oluştur",
      creating: "Oluşturuluyor",
      couldNotCreate: "Lobi oluşturulamadı.",
      singleCopy: {
        normal: "Her rengi beş saniye ezberle, sonra beş tur boyunca yeniden kur.",
        flash: "Bir saniyelik parlamayı yakala, sonra ilk hissine güven.",
        sequence: "Beş rengi sırayla çalış, sonra diziyi tek tek yeniden oluştur.",
      },
      multiCopy: {
        normal: "Herkes aynı beş saniyelik renkleri görür. En yakın tahminler lobide yükselir.",
        flash: "Herkes aynı bir saniyelik parlamaları görür. Hızlı göz kazanır.",
        sequence: "Herkes aynı beş renkli diziyi çalışır, sonra sırayla yeniden kurar.",
      },
      difficultyCopy: {
        easy: "Kolayda saturation ve brightness sabit kalır; sadece hue ayarlanır.",
        normal: "Normalde hue ve saturation ayarlanır, brightness sabit kalır.",
        hard: "Zorda hue, saturation ve brightness tamamen açılır.",
      },
    },
    room: {
      joinLobby: "lobiye katıl",
      joinLobbyCopy:
        "{roomCode} odasına {gameMode} modunda ve {difficulty} zorlukta katılmak için adını gir.",
      join: "Lobiye katıl",
      joining: "Katılıyor",
      lobby: "lobi",
      players: "Oyuncular",
      joinedCount: "{count} katıldı",
      lobbySummary: "{count} oyuncu var. {gameMode} mod ve {difficulty} zorluk seçili.",
      host: "Host",
      copyInvite: "Davet linkini kopyala",
      copyLink: "Linki kopyala",
      copied: "Kopyalandı",
      linkCopied: "Link kopyalandı. Paylaşabilirsin.",
      startGame: "Oyunu başlat",
      starting: "Başlatılıyor",
      waitingLobbyReturn: "Herkesin lobiye dönmesi bekleniyor",
      waitingForHost: "Hostun oyunu başlatması bekleniyor.",
      findingLobby: "Özel lobin aranıyor.",
      lobbyNotFound: "Lobi bulunamadı ya da süresi doldu.",
      couldNotJoin: "Bu lobiye katılınamadı.",
      couldNotCopy: "Otomatik kopyalanamadı. Linki adres çubuğundan kopyala.",
      couldNotStart: "Oyun başlatılamadı.",
      couldNotUpdateSettings: "Lobi ayarları güncellenemedi.",
      couldNotReturnToLobby: "Lobiye dönülemedi.",
      couldNotReachServer: "Multiplayer sunucusuna ulaşılamadı.",
      kicked: "çıkarıldın",
      kickedMessage: "Lobiden çıkarıldın.",
      closedMessage: "Bu lobi kapandı.",
      kickPlayer: "{name} oyuncusunu çıkar",
      automaticResults: "Sonuçlar burada otomatik görünecek.",
      backLobby: "Lobiye dön",
      returningLobby: "Dönülüyor",
      editSettings: "Lobi ayarlarını düzenle",
      closeSettings: "Lobi ayarlarını kapat",
      doneTitleA: "şimdilik",
      doneTitleB: "bitti",
      doneWaiting: "Senin turun bitti. Diğer oyuncuların bitirmesi bekleniyor.",
      takesRoom: "lobiyi aldı.",
      you: "Sen",
      roundTitle: "Tur {round}: hedef {target}, tahmin {guess}",
    },
    game: {
      ready: "hazır",
      set: "dikkat",
      go: "başla",
      secondsToRemember: "Hatırlamak için saniye",
      secondsInSequence: "Dizide kalan saniye",
      memorizingSequenceColor: "Dizi rengi ezberleniyor {index}: {color}",
      submitColorGuess: "Renk tahminini gönder",
      level: "seviye",
      goNextRound: "Sonraki tura geç",
      showFinalScore: "Final skorunu göster",
      yourSelection: "Seçimin",
      original: "Orijinal",
      playAgain: "Tekrar oyna",
      waitingError: "Sonraki renk yüklenemedi.",
      submitError: "Bu tahmin gönderilemedi.",
      resultLine: {
        perfect: "Mükemmel. Gözün neredeyse hiç kırpmadı.",
        excellent: "Harika. Hafıza çok sağlam tuttu.",
        veryClose: "Çok yakın. Ton neredeyse aklında kalmış.",
        solid: "Fena değil. Ama övgü sayılmaz.",
        off: "Pek olmadı. Renk biraz kayıp gitti.",
        wayOff: "Epey uzak. O ton temizce kaçmış.",
      },
      assessment: {
        rare: "İnce renkler için nadir bir göz. Keskin oynadın.",
        excellent: "Harika hafıza; sadece birkaç ton uzaklaşmış.",
        steady: "İstikrarlı bir seri. Gözün çoğu turda yakın kaldı.",
        mixed: "Bazı renkler tuttu, bazıları kaydı. Bir tur daha değer.",
        chase: "Spektrum yerinde durmadı. Tekrar dene ve daha yakını kovala.",
      },
    },
    colorPicker: {
      controls: "HSV renk kontrolleri",
      hue: "Hue",
      saturation: "Sat",
      brightness: "Value",
      degrees: "{value} derece",
      saturationPercent: "%{value} saturation",
      brightnessPercent: "%{value} brightness",
    },
  },
};

function getPathValue(source, key) {
  return key.split(".").reduce((value, segment) => value?.[segment], source);
}

function interpolate(message, values = {}) {
  if (typeof message !== "string") return message;

  return message.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(values, name) ? values[name] : match,
  );
}

export function normalizeLocale(locale) {
  return LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

export function translate(locale, key, values) {
  const cleanLocale = normalizeLocale(locale);
  const dictionary = DICTIONARIES[cleanLocale];
  const fallbackDictionary = DICTIONARIES[DEFAULT_LOCALE];
  const message =
    getPathValue(dictionary, key) ?? getPathValue(fallbackDictionary, key) ?? key;

  return interpolate(message, values);
}

export function getResultLineKey(score) {
  if (score >= 9.5) return "perfect";
  if (score >= 8.5) return "excellent";
  if (score >= 7) return "veryClose";
  if (score >= 5) return "solid";
  if (score >= 2.5) return "off";
  return "wayOff";
}

export function getFinalAssessmentKey(averageScore) {
  if (averageScore >= 9) return "rare";
  if (averageScore >= 7.5) return "excellent";
  if (averageScore >= 6) return "steady";
  if (averageScore >= 4) return "mixed";
  return "chase";
}
