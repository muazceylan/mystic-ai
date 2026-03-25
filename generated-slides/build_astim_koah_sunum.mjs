import PptxGenJS from "/tmp/slide-builder/node_modules/pptxgenjs/dist/pptxgen.cjs.js";

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "OpenAI Codex";
pptx.company = "SDÜ Aile Hekimliği ABD";
pptx.subject = "Birinci basamakta astım ve KOAH yönetimi";
pptx.title = "Birinci Basamakta Astım ve KOAH Yönetimi";
pptx.lang = "tr-TR";
pptx.theme = {
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  lang: "tr-TR",
};

const OUT =
  "/Users/solvia/Documents/mystcai/mystic-ai/generated-slides/Birinci_Basamakta_Astim_ve_KOAH_Yonetimi_Unal_Erdogan.pptx";

const TOTAL = 29;
const C = {
  navy: "13304C",
  blue: "24577A",
  teal: "2B6F77",
  gold: "A77C2C",
  ink: "17212B",
  gray: "5B6673",
  light: "F4F7FA",
  line: "D7DEE6",
  white: "FFFFFF",
  red: "B54747",
  green: "2F6B4F",
  paleBlue: "EAF1F7",
  paleGold: "F8F1E2",
  paleRed: "FBEAEA",
  paleGreen: "EAF5EE",
};

function cell(text, options = {}) {
  return { text, options };
}

function addFooter(slide, source) {
  slide.addShape(pptx.ShapeType.line, {
    x: 0.72,
    y: 6.63,
    w: 11.88,
    h: 0,
    line: { color: C.line, pt: 1 },
  });
  slide.addText(source, {
    x: 0.74,
    y: 6.73,
    w: 10.85,
    h: 0.18,
    fontFace: "Calibri",
    fontSize: 8.5,
    italic: true,
    color: C.gray,
    margin: 0,
  });
}

function addHeader(slide, no, section, title, subtitle = "") {
  slide.background = { color: C.white };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 0.16,
    line: { color: C.navy, transparency: 100 },
    fill: { color: C.navy },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.74,
    y: 0.48,
    w: 0.08,
    h: 0.86,
    line: { color: C.gold, transparency: 100 },
    fill: { color: C.gold },
  });
  slide.addText(section.toUpperCase(), {
    x: 0.95,
    y: 0.36,
    w: 2.8,
    h: 0.18,
    fontFace: "Calibri",
    fontSize: 9,
    bold: true,
    color: C.blue,
    margin: 0,
  });
  slide.addText(title, {
    x: 0.95,
    y: 0.58,
    w: 10.3,
    h: 0.38,
    fontFace: "Cambria",
    fontSize: 24,
    bold: true,
    color: C.navy,
    margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.96,
      y: 0.99,
      w: 10.3,
      h: 0.22,
      fontFace: "Calibri",
      fontSize: 10.5,
      color: C.gray,
      margin: 0,
    });
  }
  slide.addText(`${no} / ${TOTAL}`, {
    x: 11.8,
    y: 0.44,
    w: 0.8,
    h: 0.18,
    fontFace: "Calibri",
    fontSize: 9,
    color: C.gray,
    align: "right",
    margin: 0,
  });
}

function addBullets(slide, items, opts = {}) {
  slide.addText(
    items.map((item) => `• ${item}`).join("\n"),
    {
      x: 0.95,
      y: 1.55,
      w: 11.3,
      h: 4.7,
      fontFace: "Calibri",
      fontSize: 17.5,
      color: C.ink,
      margin: 0.02,
      breakLine: false,
      paraSpaceAfterPt: 10,
      valign: "top",
      ...opts,
    }
  );
}

function addNoteBox(slide, text, y, fill = C.paleBlue, line = C.blue, textColor = C.ink) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.92,
    y,
    w: 11.55,
    h: 0.66,
    rectRadius: 0.04,
    line: { color: line, pt: 0.8 },
    fill: { color: fill },
  });
  slide.addText(text, {
    x: 1.1,
    y: y + 0.17,
    w: 11.15,
    h: 0.18,
    fontFace: "Calibri",
    fontSize: 11.5,
    bold: true,
    color: textColor,
    margin: 0,
  });
}

function addAcademicTable(slide, rows, options = {}) {
  slide.addTable(rows, {
    x: 0.95,
    y: 1.55,
    w: 11.3,
    fontFace: "Calibri",
    fontSize: 12.5,
    color: C.ink,
    border: { pt: 0.8, color: C.line },
    margin: 0.05,
    valign: "middle",
    autoPage: false,
    ...options,
  });
}

function head(text, bg = C.navy) {
  return cell(text, {
    bold: true,
    color: C.white,
    fill: { color: bg },
    align: "center",
    valign: "middle",
    margin: 0.05,
  });
}

function body(text, fill = C.white, align = "left") {
  return cell(text, {
    fill: { color: fill },
    color: C.ink,
    align,
    valign: "middle",
    margin: 0.05,
  });
}

function addTitleSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: C.white };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 2.15,
    h: 7.5,
    line: { color: C.navy, transparency: 100 },
    fill: { color: C.navy },
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 2.55,
    y: 1.15,
    w: 1.35,
    h: 0,
    line: { color: C.gold, pt: 2.1 },
  });
  slide.addText("Birinci Basamakta\nAstım ve KOAH Yönetimi", {
    x: 2.55,
    y: 1.42,
    w: 8.0,
    h: 1.2,
    fontFace: "Cambria",
    fontSize: 26,
    bold: true,
    color: C.navy,
    margin: 0,
  });
  slide.addText("Akademik slayt sunumu", {
    x: 2.57,
    y: 2.8,
    w: 3.3,
    h: 0.2,
    fontFace: "Calibri",
    fontSize: 15,
    color: C.gray,
    margin: 0,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 2.55,
    y: 4.95,
    w: 4.95,
    h: 1.08,
    rectRadius: 0.05,
    line: { color: C.line, pt: 0.9 },
    fill: { color: C.light },
  });
  slide.addText("SDÜ Aile Hekimliği ABD\nArş. Gör. Dr. Ünal Erdoğan", {
    x: 2.82,
    y: 5.22,
    w: 4.3,
    h: 0.42,
    fontFace: "Calibri",
    fontSize: 17,
    bold: true,
    color: C.navy,
    margin: 0,
  });
  slide.addText("İçerik temeli: kullanıcı tarafından sağlanan yerel kaynaklar, resmi GINA ve resmi GOLD çerçevesi", {
    x: 2.58,
    y: 6.78,
    w: 8.7,
    h: 0.16,
    fontFace: "Calibri",
    fontSize: 8.5,
    color: C.gray,
    margin: 0,
  });
}

function addAgenda() {
  const slide = pptx.addSlide();
  addHeader(slide, 2, "Sunum Planı", "Sunum Akışı");
  addAcademicTable(
    slide,
    [
      [head("Bölüm"), head("İçerik")],
      [body("1"), body("Giriş, yük ve öğrenim hedefleri")],
      [body("2", C.light), body("Tanı, ilk değerlendirme ve spirometri", C.light)],
      [body("3"), body("Derecelendirme, izlem ve tedavi ilkeleri")],
      [body("4", C.light), body("Astım ve KOAH’ta acil durumlar ile sevk kriterleri", C.light)],
      [body("5"), body("Aile hekiminin görevleri, eğitim ve sonuç göstergeleri")],
    ],
    { colW: [1.3, 10.0], rowH: [0.48, 0.52, 0.52, 0.52, 0.52, 0.52], y: 1.7, fontSize: 14 }
  );
  addNoteBox(slide, "Akış, birinci basamak hekiminin günlük karar basamaklarına göre yapılandırılmıştır.", 5.45);
  addFooter(slide, "Kaynak temeli: Sağlık Bakanlığı Eğitimci Rehberi 2011; verilen astım ve KOAH sunum dosyaları.");
}

function addWhyImportant() {
  const slide = pptx.addSlide();
  addHeader(slide, 3, "Giriş", "Birinci Basamak Açısından Neden Kritik?");
  addBullets(slide, [
    "Astım ve KOAH; sık görülen, alevlenme nedeniyle acil başvurulara ve işlev kaybına yol açan kronik hava yolu hastalıklarıdır.",
    "Gecikmiş tanı; gereksiz antibiyotik, yetersiz inhaler tedavi ve geç sevk gibi zincir hatalara neden olabilir.",
    "Aile hekimi; semptom örüntüsünü fark eden, spirometriyi yönlendiren, tedaviyi başlatan ve uzunlamasına izlem sağlayan merkez aktördür.",
    "Başarılı birinci basamak yönetimi; alevlenmeleri, hastane yatışlarını ve yaşam kalitesindeki kaybı azaltır.",
  ]);
  addNoteBox(slide, "Erken tanı + doğru inhaler tedavi + düzenli izlem = en yüksek klinik kazanç", 5.72, C.paleGold, C.gold);
  addFooter(slide, "Kaynak: Sağlık Bakanlığı Astım/KOAH Eğitimci Rehberi 2011 ön söz ve rehber tanıtımı.");
}

function addObjectives() {
  const slide = pptx.addSlide();
  addHeader(slide, 4, "Öğrenim Hedefleri", "Sunum sonunda");
  addBullets(slide, [
    "Astım ve KOAH’ta tanıyı düşündüren klinik örüntüyü ayırt edebilmek.",
    "Astımda değişken, KOAH’ta kalıcı hava yolu obstrüksiyonunu spirometri ile ilişkilendirebilmek.",
    "İlk değerlendirmede semptom, maruziyet, komorbidite ve alarm bulgularını birlikte ele alabilmek.",
    "Astımda kontrol temelli, KOAH’ta semptom ve alevlenme yükü temelli derecelendirmeyi yorumlayabilmek.",
    "Acil durumları ve sevk gerektiren tabloları gecikmeden tanıyabilmek.",
    "Aile hekimliğinde eğitim, inhaler teknik kontrolü, risk azaltma ve izlem sorumluluklarını yapılandırabilmek.",
  ]);
  addFooter(slide, "Kaynak: Sağlık Bakanlığı Eğitimci Rehberi 2011 öğrenim hedefleri; GINA 2024; GOLD resmi çerçevesi.");
}

function addComparison() {
  const slide = pptx.addSlide();
  addHeader(slide, 5, "Temel Çerçeve", "Astım ve KOAH: Klinik Karşılaştırma");
  addAcademicTable(
    slide,
    [
      [head("Başlık"), head("Astım"), head("KOAH")],
      [body("Semptom örüntüsü"), body("Değişken; ataklar, gece uyanması ve tetikleyici ilişkisi belirgin"), body("Daha kalıcı; kronik öksürük, balgam ve efor dispnesi ön planda"),],
      [body("Obstrüksiyon"), body("Genellikle değişken ve reversibl"), body("Post-bronkodilatör dönemde kalıcı"),],
      [body("Risk profili"), body("Atopi, allerjenler, viral enfeksiyonlar, irritanlar"), body("Sigara, biyokütle, mesleki toz-gaz, ileri yaş"),],
      [body("Tedavi odağı"), body("Kontrol ve alevlenme riskini azaltmak"), body("Semptom yükü, alevlenme ve işlev kaybını azaltmak"),],
    ],
    {
      colW: [2.3, 4.4, 4.6],
      rowH: [0.48, 0.8, 0.62, 0.72, 0.7],
      fontSize: 12.6,
      y: 1.72,
    }
  );
  addFooter(slide, "Kaynak: Verilen astım sunumu; verilen KOAH sunumu; Sağlık Bakanlığı Eğitimci Rehberi 2011.");
}

function addRiskFactors() {
  const slide = pptx.addSlide();
  addHeader(slide, 6, "Korunma", "Risk Faktörleri ve Koruyucu Yaklaşım");
  addBullets(slide, [
    "Astımda: atopi, allerjen maruziyeti, sigara dumanı, hava kirliliği, mesleki irritanlar, viral enfeksiyonlar ve bazı ilaçlar.",
    "KOAH’ta: sigara en güçlü etkendir; ayrıca biyokütle, mesleki toz/gaz, dış ortam kirliliği, yaşlanma ve alfa-1 antitripsin eksikliği önemlidir.",
    "Birinci basamakta ilk görev; maruziyeti görünür hale getirmek, paket-yıl hesabı yapmak ve bırakma motivasyonunu her temasta yinelemektir.",
    "Aşı, fiziksel aktivite, çevresel tetikleyici azaltma ve komorbidite yönetimi ilaç dışı korumanın ana bileşenleridir.",
  ]);
  addNoteBox(slide, "Risk faktörünü azaltmadan yalnız ilaç yoğunlaştırmak kalıcı başarı sağlamaz.", 5.72, C.paleRed, C.red);
  addFooter(slide, "Kaynak: Sağlık Bakanlığı 2011 rehberi; verilen astım ve KOAH sunumları.");
}

function addDiagnosticApproach() {
  const slide = pptx.addSlide();
  addHeader(slide, 7, "Tanı", "Klinik Şüpheyi Ne Oluşturur?");
  addBullets(slide, [
    "Tekrarlayan nefes darlığı, hışıltı, gece uyanması veya göğüste baskı hissi astımı düşündürür.",
    "Kronik öksürük, balgam, efor dispnesi ve sigara/biyokütle maruziyeti erişkinde KOAH lehinedir.",
    "Semptomların zamanı, tetikleyicileri, başlangıç yaşı, önceki alevlenme ve acil başvuru öyküsü mutlaka sorgulanmalıdır.",
    "Normal fizik muayene astımı dışlatmaz; KOAH tanısı ise spirometri olmadan kesinleştirilmemelidir.",
  ]);
  addFooter(slide, "Kaynak: Sağlık Bakanlığı Eğitimci Rehberi 2011; verilen astım sunumu; verilen KOAH sunumu.");
}

function addAsthmaDiagnosis() {
  const slide = pptx.addSlide();
  addHeader(slide, 8, "Tanı", "Astım Tanısı");
  addAcademicTable(
    slide,
    [
      [head("Bileşen"), head("Klinik yorum")],
      [body("Değişken solunumsal semptomlar"), body("Nefes darlığı, wheezing, öksürük ve göğüs rahatsızlığının zaman ve yoğunluk bakımından değişken olması beklenir.")],
      [body("Objektif değişkenlik"), body("Spirometri, bronkodilatör sonrası düzelme veya seri PEF değişkenliği tanıyı destekler.")],
      [body("Test zamanlaması"), body("Ciddi atak veya viral enfeksiyon sırasında reversibilite gösterilemeyebilir; gerekirse test tekrarlanmalıdır.")],
      [body("Muayene"), body("Normal solunum sesleri astım tanısını reddettirmez; öykü ve tekrarlı değerlendirme önemlidir.")],
    ],
    { colW: [2.6, 8.7], rowH: [0.48, 0.64, 0.64, 0.7, 0.62], y: 1.75, fontSize: 13 }
  );
  addNoteBox(slide, "GINA çerçevesi: değişken semptom + değişken ekspiratuvar hava akımı kısıtlanması", 5.55, C.paleBlue, C.blue);
  addFooter(slide, "Kaynak: Verilen astım sunumu (GINA 2023); GINA 2024 rapor sayfası; Sağlık Bakanlığı 2011.");
}

function addCopdDiagnosis() {
  const slide = pptx.addSlide();
  addHeader(slide, 9, "Tanı", "KOAH Tanısı");
  addBullets(slide, [
    "Kronik öksürük, balgam, dispne ve risk faktörü maruziyeti olan erişkinde KOAH düşünülmelidir.",
    "Tanı, post-bronkodilatör spirometride FEV1/FVC < 0,70 ile kalıcı hava akımı kısıtlanmasının gösterilmesiyle doğrulanır.",
    "Akciğer grafisi tanıyı koydurmaz; pnömoni, kalp yetersizliği, bronşektazi ve diğer alternatifleri değerlendirmede yardımcıdır.",
    "Semptom yoğunluğu ile obstrüksiyon derecesi her zaman paralel değildir; bu nedenle fonksiyon, semptom ve alevlenme öyküsü birlikte yorumlanmalıdır.",
  ]);
  addFooter(slide, "Kaynak: Sağlık Bakanlığı 2011 KOAH tanı ve takip bölümü; GOLD resmi doküman çerçevesi.");
}

function addSpirometry() {
  const slide = pptx.addSlide();
  addHeader(slide, 10, "Tanı", "Spirometriyi Yorumlama");
  addAcademicTable(
    slide,
    [
      [head("Adım"), head("Birinci basamak yorumu")],
      [body("1. Test kalitesi"), body("Manevra uygun mu, tekrar edilebilir mi, hasta kooperasyonu yeterli mi?")],
      [body("2. Obstrüksiyon"), body("FEV1/FVC düşüklüğü obstrüktif paterni gösterir; KOAH’ta kalıcılık, astımda değişkenlik aranır.")],
      [body("3. Klinik bağlam"), body("Semptomlar, maruziyet, PEF değişkenliği ve komorbiditeler eşleştirilmeden sonuç tek başına yorumlanmamalıdır.")],
      [body("4. İzlem değeri"), body("KOAH’ta seyrin nesnel takibinde; astımda ise tanı destekleme ve kontrol değerlendirmesinde yararlıdır.")],
    ],
    { colW: [2.2, 9.1], rowH: [0.48, 0.58, 0.62, 0.74, 0.62], y: 1.72, fontSize: 12.8 }
  );
  addFooter(slide, "Kaynak: Sağlık Bakanlığı 2011 SFT temel kavramlar ve tanı bölümleri.");
}

function addInitialAssessmentHistory() {
  const slide = pptx.addSlide();
  addHeader(slide, 11, "İlk Değerlendirme", "Anamnezde Mutlaka Sorulması Gerekenler");
  addBullets(slide, [
    "Semptomların başlangıcı, süresi, gün içi/gece değişkenliği ve tetikleyicileri.",
    "Sigara öyküsü, biyokütle ve mesleki maruziyet, ev içi irritanlar.",
    "Son 12 aydaki alevlenme, sistemik steroid, acil servis başvurusu ve yatış öyküsü.",
    "Mevcut ilaçlar, inhaler cihaz tipi, kullanım tekniği ve tedavi uyumu.",
    "Rinit, atopi, reflü, kalp hastalığı, diyabet, depresyon/anksiyete gibi komorbiditeler.",
  ]);
  addFooter(slide, "Kaynak: Sağlık Bakanlığı 2011 astım anamnez/fizik muayene ve KOAH tanı-takip bölümleri.");
}

function addInitialAssessmentExam() {
  const slide = pptx.addSlide();
  addHeader(slide, 12, "İlk Değerlendirme", "Muayene ve Alarm Bulguları");
  addAcademicTable(
    slide,
    [
      [head("Değerlendirme alanı"), head("Klinik önemi")],
      [body("SpO2, konuşma kapasitesi, bilinç"), body("Acil müdahale ve sevk hızını belirler; tam cümle kuramama ve bilinç değişikliği alarm bulgusudur.")],
      [body("Solunum eforu"), body("Yardımcı kas kullanımı, takipne, paradoksal solunum ve sessiz akciğer ciddi tabloyu düşündürür.")],
      [body("Sistemik bulgular"), body("Siyanoz, aritmi, periferik ödem, kaşeksi ve hemodinamik instabilite riski artırır.")],
      [body("Unutulmaması gereken nokta"), body("Normal muayene özellikle astımda tanıyı dışlatmaz; muayene daha çok ciddiyet değerlendirmesi sağlar.")],
    ],
    { colW: [2.8, 8.5], rowH: [0.48, 0.8, 0.68, 0.68, 0.68], y: 1.72, fontSize: 12.7 }
  );
  addFooter(slide, "Kaynak: Sağlık Bakanlığı 2011 rehberi; verilen KOAH sunumu fizik muayene slaytları.");
}

function addAsthmaGrading() {
  const slide = pptx.addSlide();
  addHeader(slide, 13, "Derecelendirme", "Astımda Klinik Ağırlık Sınıflaması ve Kontrol");
  addAcademicTable(
    slide,
    [
      [head("Sınıf"), head("Gündüz semptom"), head("Gece"), head("FEV1 / PEF")],
      [body("İntermittan"), body("Haftada 1’den az"), body("Ayda 2’den az"), body("≥ %80")],
      [body("Hafif persistan", C.light), body("Haftada >1, günde <1", C.light), body("Ayda >2", C.light), body("≥ %80", C.light)],
      [body("Orta persistan"), body("Günlük"), body("Haftada >1"), body("%60-80")],
      [body("Ağır persistan", C.light), body("Sürekli / sık alevlenme", C.light), body("Sık", C.light), body("≤ %60", C.light)],
    ],
    { colW: [2.1, 3.4, 2.6, 3.2], rowH: [0.46, 0.52, 0.56, 0.56, 0.56], y: 1.72, fontSize: 12.3 }
  );
  addNoteBox(slide, "Güncel klinik yaklaşımda tedavi kararı, yalnız ağırlığa değil semptom kontrolü ve alevlenme riskine göre verilir.", 5.35, C.paleGold, C.gold);
  addFooter(slide, "Kaynak: Sağlık Bakanlığı 2011 astım tedavisi ve izlemi bölümü; GINA 2024 yaklaşımı.");
}

function addCopdGrading() {
  const slide = pptx.addSlide();
  addHeader(slide, 14, "Derecelendirme", "KOAH’ta Ciddiyet Değerlendirmesi");
  addAcademicTable(
    slide,
    [
      [head("Spirometrik evre"), head("Tanım")],
      [body("GOLD 1"), body("FEV1 ≥ %80")],
      [body("GOLD 2", C.light), body("FEV1 %50-79", C.light)],
      [body("GOLD 3"), body("FEV1 %30-49")],
      [body("GOLD 4", C.light), body("FEV1 < %30", C.light)],
    ],
    { colW: [3.2, 8.1], rowH: [0.48, 0.56, 0.56, 0.56, 0.56], y: 1.72, fontSize: 13.1 }
  );
  addBullets(
    slide,
    [
      "Güncel GOLD yaklaşımında başlangıç tedavisi; semptom düzeyi ile geçmiş alevlenme/yatış öyküsünün birlikte değerlendirilmesine dayanır.",
      "Bu nedenle spirometri biyolojik ciddiyeti, semptom ve alevlenme öyküsü ise bakım ihtiyacını gösterir.",
    ],
    { x: 0.98, y: 5.05, w: 11.25, h: 1.1, fontSize: 15.2 }
  );
  addFooter(slide, "Kaynak: Sağlık Bakanlığı 2011 KOAH tanı-takip bölümü; GOLD 2025 pocket guide resmi çerçevesi.");
}

function addFollowup() {
  const slide = pptx.addSlide();
  addHeader(slide, 15, "İzlem", "Birinci Basamak İzlem Döngüsü");
  addAcademicTable(
    slide,
    [
      [head("Adım"), head("Soru")],
      [body("Doğrula"), body("Tanı klinik olarak ve gerektiğinde objektif testlerle net mi?")],
      [body("Değerlendir", C.light), body("Semptom, alevlenme, SpO2, komorbidite ve sosyal destek durumu ne? ", C.light)],
      [body("Düzelt"), body("İnhaler teknik, uyum, tetikleyici ve risk faktörleri kontrol edildi mi?")],
      [body("Ayarlama", C.light), body("Step-up, step-down, acil yaklaşım veya sevk kararı gerekli mi?", C.light)],
      [body("Yeniden gözden geçir"), body("4-12 hafta içinde yanıt ve güvenlik tekrar değerlendirildi mi?")],
    ],
    { colW: [2.7, 8.6], rowH: [0.48, 0.62, 0.62, 0.62, 0.62, 0.62], y: 1.7, fontSize: 12.8 }
  );
  addFooter(slide, "Kaynak: Rehber içeriklerinden uyarlanmış bütünleşik birinci basamak izlem yaklaşımı.");
}

function addAsthmaTreatmentPrinciples() {
  const slide = pptx.addSlide();
  addHeader(slide, 16, "Tedavi", "Astım Tedavisinin Temel Bileşenleri");
  addBullets(slide, [
    "Hasta eğitimi ve hasta-hekim işbirliği tedavinin çekirdeğidir.",
    "Risk faktörlerine maruziyetin azaltılması, ilaç gereksinimini ve alevlenme riskini azaltır.",
    "Tedavi; kontrol düzeyi, alevlenme riski, inhaler teknik ve uyum üzerinden düzenli olarak yeniden değerlendirilmelidir.",
    "Yazılı eylem planı, özellikle kötüleşmeyi erken fark etmeyen hastalarda belirgin yarar sağlar.",
  ]);
  addNoteBox(slide, "Astım yönetimi yalnız ilaç yazmak değil; kontrolü öğretmek ve izlemektir.", 5.72);
  addFooter(slide, "Kaynak: Sağlık Bakanlığı 2011 astım tedavisi ve izlemi bölümü.");
}

function addAsthmaPharmacology() {
  const slide = pptx.addSlide();
  addHeader(slide, 17, "Tedavi", "Astımda Farmakolojik Yaklaşım");
  addAcademicTable(
    slide,
    [
      [head("Basamak"), head("Kontrol edici yaklaşım"), head("Rahatlatıcı"), head("Kısa not")],
      [body("1-2"), body("Düşük doz İKS içeren yaklaşım"), body("Tercihen ICS-formoterol veya uygun alternatif"), body("Yalnız SABA yaklaşımı tercih edilmez")],
      [body("3", C.light), body("Düşük doz idame ICS-formoterol / ICS-LABA", C.light), body("Gerektiğinde düşük doz ICS-formoterol", C.light), body("Kontrolsüzlükte teknik ve uyum önce kontrol edilir", C.light)],
      [body("4"), body("Orta doz idame ICS-formoterol / ICS-LABA"), body("Gerektiğinde aynı rahatlatıcı strateji"), body("Risk yüksekse yakın izlem gerekir")],
      [body("5", C.light), body("Yüksek doz ve ek tedaviler; fenotip değerlendirmesi", C.light), body("Uzmanlık düzeyi planlanır", C.light), body("Şiddetli astım açısından sevk gerekir", C.light)],
    ],
    { colW: [1.2, 4.0, 2.7, 3.4], rowH: [0.46, 0.72, 0.8, 0.72, 0.8], y: 1.72, fontSize: 11.3 }
  );
  addFooter(slide, "Kaynak: Verilen astım sunumu GINA basamak şeması; GINA 2024 resmi rapor sayfası.");
}

function addAsthmaEmergency() {
  const slide = pptx.addSlide();
  addHeader(slide, 18, "Acil Durumlar", "Astım Atağında İlk Yaklaşım");
  addAcademicTable(
    slide,
    [
      [head("Başlık"), head("Birinci basamak yaklaşımı")],
      [body("Hızlı değerlendirme"), body("Konuşma kapasitesi, bilinç, vital bulgular, SpO2 ve mümkünse PEF ölçülür.")],
      [body("İlk tedavi", C.light), body("Oksijen, tekrarlayan kısa etkili beta agonist inhalasyonu ve erken sistemik steroid", C.light)],
      [body("Yanıt değerlendirmesi"), body("Klinik düzelme ve objektif ölçümlerin güvenli sınıra ulaşıp ulaşmadığı birlikte değerlendirilir.")],
      [body("Yapılmaması gerekenler", C.light), body("Rutin antibiyotik, antihistaminik, sedatif ve inhaler mukolitik kullanımı", C.light)],
    ],
    { colW: [2.8, 8.5], rowH: [0.48, 0.62, 0.62, 0.72, 0.62], y: 1.72, fontSize: 12.6 }
  );
  addNoteBox(slide, "Tam cümle kuramama, belirgin hipoksemi ve kötü genel durum ağır atak lehinedir.", 5.55, C.paleRed, C.red);
  addFooter(slide, "Kaynak: Sağlık Bakanlığı 2011 astım atak tedavisi bölümü.");
}

function addAsthmaReferral() {
  const slide = pptx.addSlide();
  addHeader(slide, 19, "Sevk", "Astımda Üst Basamağa Sevk Endikasyonları");
  addBullets(slide, [
    "İlk bronkodilatör tedavilerine 1-2 saat içinde yeterli yanıt alınamaması.",
    "Tam cümle kuramama, bilinç değişikliği, belirgin hipoksemi veya kötüleşen genel durum.",
    "PEF ve klinik bulguların güvenli taburculuk sınırlarına ulaşmaması.",
    "Önceki entübasyon/yoğun bakım öyküsü, sık ağır atak veya açıklanamayan kontrolsüzlük.",
    "Tanıda belirsizlik, mesleksel astım kuşkusu veya ileri allerjik/uzman değerlendirme gereksinimi.",
  ]);
  addFooter(slide, "Kaynak: Sağlık Bakanlığı 2011 rehberi; verilen astım sunumu ağır atak ve acil sevk vurguları.");
}

function addCopdStable() {
  const slide = pptx.addSlide();
  addHeader(slide, 20, "Tedavi", "Stabil KOAH Yönetimi");
  addBullets(slide, [
    "Sigara bırakma, hastalığın doğal seyrine etkisi olan en güçlü müdahalelerden biridir.",
    "Bronkodilatör tedavi semptom kontrolünün temelidir; seçim semptom düzeyi ve alevlenme öyküsüne göre yapılır.",
    "İnhaler teknik, aşı, fiziksel aktivite, beslenme ve komorbidite yönetimi ilaç dışı tedavi kadar önemlidir.",
    "Pulmoner rehabilitasyon; egzersiz kapasitesini, yaşam kalitesini ve günlük aktivite toleransını artırır.",
  ]);
  addFooter(slide, "Kaynak: Sağlık Bakanlığı 2011 KOAH stabil tedavi ve rehabilitasyon bölümleri.");
}

function addCopdPharmacology() {
  const slide = pptx.addSlide();
  addHeader(slide, 21, "Tedavi", "KOAH’da Farmakolojik Yaklaşım");
  addAcademicTable(
    slide,
    [
      [head("Hasta örüntüsü"), head("Başlangıç yaklaşımı"), head("Not")],
      [body("Düşük semptom / düşük alevlenme"), body("İhtiyaca göre veya tek uzun etkili bronkodilatör"), body("Hedef: semptom kontrolü ve aktivite korunması")],
      [body("Yüksek semptom", C.light), body("Uzun etkili bronkodilatör; gerekirse çift bronkodilatör", C.light), body("Kısa etkili ilaçlara aşırı bağımlılık yetersiz kontroldür", C.light)],
      [body("Sık alevlenme"), body("Bronkodilatör tedaviyi güçlendir; uygun hastada İKS eklenmesini değerlendir"), body("Alevlenme öyküsü ve eşlik eden astım önemli belirleyicilerdir")],
    ],
    { colW: [3.3, 4.1, 3.9], rowH: [0.46, 0.7, 0.74, 0.78], y: 1.72, fontSize: 11.9 }
  );
  addFooter(slide, "Kaynak: Sağlık Bakanlığı 2011 KOAH tedavi bölümü; GOLD resmi strateji çerçevesi.");
}

function addCopdNonPharm() {
  const slide = pptx.addSlide();
  addHeader(slide, 22, "Tedavi", "KOAH’da Nonfarmakolojik Yaklaşım");
  addBullets(slide, [
    "Pulmoner rehabilitasyon; semptomu olan ve günlük aktivitesi azalmış hastalarda kanıta dayalı yarar sağlar.",
    "İnfluenza ve pnömokok başta olmak üzere aşı stratejileri düzenli takip edilmelidir.",
    "Beslenme durumu, kas kaybı, depresyon/anksiyete ve sosyal izolasyon sorgulanmalıdır.",
    "Kronik hipoksemisi olan seçilmiş hastalarda oksijen tedavisi ileri değerlendirme ile planlanır.",
  ]);
  addFooter(slide, "Kaynak: Sağlık Bakanlığı 2011 KOAH’da nonfarmakolojik tedavi bölümü.");
}

function addCopdExacerbation() {
  const slide = pptx.addSlide();
  addHeader(slide, 23, "Acil Durumlar", "KOAH Alevlenmesinde Ayaktan Yönetim");
  addAcademicTable(
    slide,
    [
      [head("Başlık"), head("Birinci basamak uygulaması")],
      [body("Tanım"), body("Günlük olağan değişimin ötesinde, dispne, öksürük ve/veya balgamda artış ile giden akut kötüleşme.")],
      [body("Bronkodilatör", C.light), body("Kısa etkili bronkodilatör dozu ve sıklığı artırılır; gerekirse kısa etkili antikolinerjik eklenir.", C.light)],
      [body("Sistemik steroid"), body("Seçilmiş olguda kısa süreli oral steroid iyileşme süresini kısaltır ve erken nüksü azaltır.")],
      [body("Antibiyotik", C.light), body("Dispne artışı, balgam miktarı artışı ve pürülan balgam varlığında değerlendirilir.", C.light)],
      [body("İzlem"), body("SpO2, genel durum, eşlik eden pnömoni/kalp hastalığı ve sosyal destek tekrar gözden geçirilir.")],
    ],
    { colW: [2.7, 8.6], rowH: [0.46, 0.62, 0.72, 0.7, 0.68, 0.7], y: 1.7, fontSize: 12.2 }
  );
  addFooter(slide, "Kaynak: Sağlık Bakanlığı 2011 KOAH alevlenmelerinde tanı ve tedavi yaklaşımı bölümü.");
}

function addCopdReferral() {
  const slide = pptx.addSlide();
  addHeader(slide, 24, "Sevk", "KOAH’da Sevk Gerektiren Durumlar");
  addBullets(slide, [
    "Yeni siyanoz, periferik ödem, bilinç değişikliği, aritmi veya belirgin istirahat dispnesi.",
    "Başlangıç tedavisine yanıt vermeyen alevlenme ya da ağır KOAH / evde uzun süreli oksijen tedavisi öyküsü.",
    "Pnömoni, kalp hastalığı, diyabet gibi yüksek riskli eşlik eden durumların bulunması.",
    "Tanıda belirsizlik, ileri yaş, yalnız yaşama veya evde bakım koşullarının yetersizliği.",
    "pH < 7,35, PaO2 < 60 mmHg veya SaO2 < %90 gibi ciddi gaz değişim bozuklukları.",
  ]);
  addFooter(slide, "Kaynak: Sağlık Bakanlığı 2011 KOAH alevlenmelerinde sevk kriterleri.");
}

function addFamilyPhysicianRole() {
  const slide = pptx.addSlide();
  addHeader(slide, 25, "Aile Hekiminin Görevleri", "Birinci Basamakta Merkez Rol");
  addAcademicTable(
    slide,
    [
      [head("Alan"), head("Sorumluluk")],
      [body("Tanı"), body("Riskli hastayı fark etmek, spirometriyi yönlendirmek ve ayırıcı tanıyı korumak.")],
      [body("Tedavi", C.light), body("Kılavuza uygun başlangıç tedavisini başlatmak ve inhaler tekniği göstermek.", C.light)],
      [body("İzlem"), body("Kontrol, alevlenme, komorbidite, aşı ve sigara bırakma sürecini düzenli değerlendirmek.")],
      [body("Sevk ve koordinasyon", C.light), body("Üst basamak gereksinimini zamanında belirlemek ve geri bildirim akışını sürdürmek.", C.light)],
      [body("Eğitim"), body("Yazılı eylem planı, cihaz kullanımı ve öz-yönetim becerisini her kontrolde pekiştirmek.")],
    ],
    { colW: [2.8, 8.5], rowH: [0.46, 0.62, 0.62, 0.68, 0.68, 0.68], y: 1.72, fontSize: 12.5 }
  );
  addFooter(slide, "Kaynak: Sağlık Bakanlığı 2011 rehberinin birinci basamak vurguları temel alınarak düzenlenmiştir.");
}

function addEducation() {
  const slide = pptx.addSlide();
  addHeader(slide, 26, "Eğitim", "Hasta Eğitimi ve İnhaler Teknik");
  addBullets(slide, [
    "Her kontrolde inhaler cihaz hastaya uygulatılmalı; hatalar aynı görüşmede düzeltilmelidir.",
    "Kontrol edici ilaç ile rahatlatıcı ilaç ayrımı açık bir dille anlatılmalıdır.",
    "Astımda yazılı eylem planı, KOAH’ta alevlenmeyi tanıma ve erken başvuru eğitimi verilmelidir.",
    "Sigara bırakma, aşı, fiziksel aktivite ve çevresel tetikleyici azaltma; sürekli eğitim başlıklarıdır.",
  ]);
  addNoteBox(slide, "Göster → Uygulat → Düzelt yaklaşımı, inhaler eğitiminde en pratik çerçevedir.", 5.72, C.paleGreen, C.green);
  addFooter(slide, "Kaynak: Sağlık Bakanlığı 2011 inhaler kullanım teknikleri ve tedavi/izlem bölümleri.");
}

function addOutcomes() {
  const slide = pptx.addSlide();
  addHeader(slide, 27, "Sonuçlar", "Başarılı Yönetimde Beklenen Sonuçlar");
  addAcademicTable(
    slide,
    [
      [head("Alan"), head("Beklenen sonuç")],
      [body("Semptom kontrolü"), body("Gündüz/gece yakınmalarında ve rahatlatıcı ilaç gereksiniminde azalma")],
      [body("Alevlenme", C.light), body("Acil başvuru, sistemik steroid ihtiyacı ve yatışlarda azalma", C.light)],
      [body("Fonksiyon"), body("Egzersiz kapasitesi, günlük aktivite ve solunum fonksiyonunda iyileşme")],
      [body("Yaşam kalitesi", C.light), body("Uyku, işlevsellik, hasta memnuniyeti ve öz-yönetim becerisinde artış", C.light)],
      [body("Güvenlik"), body("Yan etki, yanlış inhaler kullanımı ve gecikmiş sevk riskinde azalma")],
    ],
    { colW: [2.8, 8.5], rowH: [0.46, 0.56, 0.56, 0.56, 0.56, 0.56], y: 1.72, fontSize: 12.8 }
  );
  addFooter(slide, "Kaynak: Sağlık Bakanlığı 2011 rehberi; verilen astım sunumu kontrol odaklı yaklaşım; resmi GINA/GOLD çerçevesi.");
}

function addKeyMessages() {
  const slide = pptx.addSlide();
  addHeader(slide, 28, "Kapanış", "Kilit Mesajlar");
  addBullets(slide, [
    "Birinci basamakta doğru tanı; semptom örüntüsü, maruziyet öyküsü ve spirometrik doğrulamanın birlikte ele alınmasına dayanır.",
    "Astım ve KOAH’ta tedavi başarısı, ilaç seçiminden çok eğitim, inhaler teknik ve düzenli izlem kalitesi ile belirlenir.",
    "Acil durum ve sevk kararını geciktirmemek, mortaliteyi azaltan temel hekimlik sorumluluğudur.",
    "Akademik olarak güçlü bir sunumun klinik karşılığı; karar anında uygulanabilir, sade ve güvenilir bir yönetim çerçevesidir.",
  ]);
  addFooter(slide, "Sunum; verilen yerel kaynaklar ile resmi GINA ve GOLD yaklaşımı sentezlenerek hazırlanmıştır.");
}

function addReferences() {
  const slide = pptx.addSlide();
  addHeader(slide, 29, "Kaynaklar", "Temel başvuru kaynakları");
  slide.addText(
    [
      "1. T.C. Sağlık Bakanlığı Temel Sağlık Hizmetleri Genel Müdürlüğü. Astım ve Kronik Obstrüktif Akciğer Hastalığı (KOAH) Tanı ve Tedavisinde Birinci Basamak Hekimler İçin Eğitim Modülü, Eğitimci Rehberi. Ankara, Mart 2011.",
      "2. Kullanıcı tarafından sağlanan dosya: /Users/solvia/Downloads/Astim_KOAH_Egitimci_Rehberi.pdf",
      "3. Kullanıcı tarafından sağlanan dosya: /Users/solvia/Downloads/koah.pptx",
      "4. Kullanıcı tarafından sağlanan dosya: /Users/solvia/Downloads/astimtanvetedavisi-ailehekimlii-251029202315-7d4432dc.pdf",
      "5. Global Initiative for Asthma (GINA). 2024 Global Strategy for Asthma Management and Prevention. https://ginasthma.org/2024-report/",
      "6. Global Initiative for Chronic Obstructive Lung Disease (GOLD). Official strategy resources. https://goldcopd.org/program/",
    ].join("\n"),
    {
      x: 0.95,
      y: 1.62,
      w: 11.25,
      h: 4.8,
      fontFace: "Calibri",
      fontSize: 14,
      color: C.ink,
      margin: 0.02,
      breakLine: false,
      paraSpaceAfterPt: 10,
    }
  );
  addFooter(slide, "Not: Telif uyumu amacıyla kaynak içerik doğrudan kopyalanmamış, akademik slayt diliyle sentezlenmiştir.");
}

addTitleSlide();
addAgenda();
addWhyImportant();
addObjectives();
addComparison();
addRiskFactors();
addDiagnosticApproach();
addAsthmaDiagnosis();
addCopdDiagnosis();
addSpirometry();
addInitialAssessmentHistory();
addInitialAssessmentExam();
addAsthmaGrading();
addCopdGrading();
addFollowup();
addAsthmaTreatmentPrinciples();
addAsthmaPharmacology();
addAsthmaEmergency();
addAsthmaReferral();
addCopdStable();
addCopdPharmacology();
addCopdNonPharm();
addCopdExacerbation();
addCopdReferral();
addFamilyPhysicianRole();
addEducation();
addOutcomes();
addKeyMessages();
addReferences();

await pptx.writeFile({ fileName: OUT });
console.log(OUT);
