package com.mysticai.astrology.service.personalplan;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.mysticai.astrology.service.personalplan.PlanVariant.Audience.PARTNERED;
import static com.mysticai.astrology.service.personalplan.PlanVariant.Audience.SINGLE;
import static com.mysticai.astrology.service.personalplan.PlanVariant.of;
import static com.mysticai.astrology.service.personalplan.PlanetRole.BOND;
import static com.mysticai.astrology.service.personalplan.PlanetRole.DRIVE;
import static com.mysticai.astrology.service.personalplan.PlanetRole.LIMIT;
import static com.mysticai.astrology.service.personalplan.PlanetRole.SCOPE;
import static com.mysticai.astrology.service.personalplan.PlanetRole.WORD;

/**
 * Authored copy for the daily personal plan, indexed by (life area × tone × planet role).
 *
 * Every sentence names a situation and a behaviour. Nothing here assumes a profession,
 * employer, team, client, meeting, project, child or household — the product never collects
 * those, so the copy cannot reference them.
 *
 * Each variant carries a short imperative title alongside its body. The card renders both, so
 * the title is deliberately a compressed label rather than the body's opening sentence —
 * otherwise the same sentence would appear twice on one card.
 */
@Component
public class PersonalPlanCatalog {

    public enum Tone { SUPPORTIVE, CAUTION }

    private final Map<String, List<CatalogEntry>> actions = new LinkedHashMap<>();
    private final Map<String, List<ThemeCopy>> themes = new LinkedHashMap<>();
    private final Map<LifeArea, List<CatalogEntry>> cautions = new LinkedHashMap<>();
    private final Map<LifeArea, List<ReflectionCopy>> reflections = new LinkedHashMap<>();

    /**
     * A variant together with the bucket it was declared in, so every piece of copy carries the
     * full canonical tuple — semanticKey, actionIntent, lifeArea, tone, audience — as data
     * rather than as an implicit map key.
     */
    public record CatalogEntry(LifeArea lifeArea, Tone tone, PlanVariant variant) {
        public String semanticKey() {
            return variant.semanticKey();
        }

        public String actionIntent() {
            return variant.intent();
        }

        public PlanVariant.Audience audience() {
            return variant.audience();
        }

        public PlanetRole role() {
            return variant.role();
        }

        public String text(boolean english) {
            return variant.text(english);
        }

        public String title(boolean english) {
            return variant.title(english);
        }
    }

    /** Headline + supporting sentence for "günün ana teması". */
    public record ThemeCopy(String titleTr, String titleEn, String descriptionTr, String descriptionEn) {
        public String title(boolean english) {
            return english ? titleEn : titleTr;
        }

        public String description(boolean english) {
            return english ? descriptionEn : descriptionTr;
        }
    }

    /** Single evening question, tied to the area the day actually emphasised. */
    public record ReflectionCopy(String turkish, String english) {
        public String text(boolean english) {
            return english ? this.english : turkish;
        }
    }

    public PersonalPlanCatalog() {
        registerActions();
        registerThemes();
        registerCautions();
        registerReflections();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lookup
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Candidate suggestions for an area/tone, ordered so the variant matching the transiting
     * planet's role comes first and the rest act as duplicate-avoidance alternatives.
     */
    public List<CatalogEntry> actionCandidates(LifeArea area, Tone tone, PlanetRole role) {
        List<CatalogEntry> pool = actions.getOrDefault(key(area, tone), List.of());
        if (pool.isEmpty()) {
            return List.of();
        }
        List<CatalogEntry> ordered = new ArrayList<>(pool.stream().filter(e -> e.role() == role).toList());
        pool.stream().filter(e -> e.role() != role).forEach(ordered::add);
        return ordered;
    }

    /** Every action variant in the catalog; used by the coverage report and uniqueness tests. */
    public List<CatalogEntry> allActionEntries() {
        return actions.values().stream().flatMap(List::stream).toList();
    }

    /** Every caution variant in the catalog. */
    public List<CatalogEntry> allCautionEntries() {
        return cautions.values().stream().flatMap(List::stream).toList();
    }

    public List<ThemeCopy> themeCandidates(LifeArea area, Tone tone) {
        return themes.getOrDefault(key(area, tone), List.of());
    }

    public List<CatalogEntry> cautionCandidates(LifeArea area) {
        return cautions.getOrDefault(area, List.of());
    }

    public List<ReflectionCopy> reflectionCandidates(LifeArea area) {
        return reflections.getOrDefault(area, List.of());
    }

    private static String key(LifeArea area, Tone tone) {
        return area.name() + "|" + tone.name();
    }

    private void put(LifeArea area, Tone tone, PlanVariant... variants) {
        actions.put(key(area, tone),
                java.util.Arrays.stream(variants).map(v -> new CatalogEntry(area, tone, v)).toList());
    }

    private void putCautions(LifeArea area, PlanVariant... variants) {
        cautions.put(area,
                java.util.Arrays.stream(variants).map(v -> new CatalogEntry(area, Tone.CAUTION, v)).toList());
    }

    private void putTheme(LifeArea area, Tone tone, ThemeCopy... copies) {
        themes.put(key(area, tone), List.of(copies));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Primary actions
    // ─────────────────────────────────────────────────────────────────────────

    private void registerActions() {
        put(LifeArea.RELATIONSHIP, Tone.SUPPORTIVE,
                of("NAME_SPECIFIC_APPRECIATION", "name_one_specific_appreciation", WORD,
                        "Takdirinizi örnekle söyleyin", "Name one specific thing",
                        "Yakın olduğunuz birine son günlerde beğendiğiniz bir davranışını söyleyin. Genel iltifat değil, tek bir örnek olsun.",
                        "Tell someone close to you about one thing they did recently that you valued. Give a single example, not a general compliment."),
                of("ASK_WHAT_THEY_NEED", "ask_what_they_need", BOND,
                        "Tahmin etmeyin, sorun", "Ask what would help",
                        "Karşınızdakinin ne beklediğini tahmin etmeyin. Doğrudan sorun: şu an ona en çok ne iyi gelir?",
                        "Do not guess what the other person expects from you. Ask directly: what would help them most right now?"),
                of("SET_A_CONCRETE_DATE", "propose_concrete_date", DRIVE,
                        "Somut tarih önerin", "Propose a real date",
                        "Ertelediğiniz bir görüşme için bugün somut bir gün ve saat önerin. \"Yakında buluşalım\" demekle bırakmayın.",
                        "Propose an actual day and time for a meet-up you keep postponing. Do not leave it at \"let's catch up soon\"."),
                of("CLARIFY_ONE_EXPECTATION", "clarify_one_expectation", LIMIT,
                        "Belirsiz beklentiyi netleştirin", "Clear up one expectation",
                        "Uzun süredir belirsiz kalan bir beklentiyi tek cümleyle söyleyin: neyi, ne zamana kadar üstleniyorsunuz?",
                        "Put one long-unclear expectation into a single sentence: what are you taking on, and by when?"),
                of("REDUCE_SCOPE_TO_FIRST_STEP", "open_only_first_step", SCOPE,
                        "Sadece ilk adımı konuşun", "Talk through the first step",
                        "Konuşulmayı bekleyen büyük bir konu varsa tamamını bugün açmayın. Yalnızca ilk adımını konuşmayı önerin.",
                        "If a big unspoken topic is waiting, do not open all of it today. Propose talking through only its first step."),
                // Audience-gated: only surfaced when the profile explicitly states the status.
                of("REBALANCE_SHARED_ROUTINE", "rebalance_shared_routine", PARTNERED, BOND,
                        "Paylaşılan yükü gözden geçirin", "Review who carries what",
                        "Paylaştığınız bir rutinde bugün kimin neyi üstlendiğini konuşun. Alışkanlık hâline gelmiş dağılımı tek cümleyle gözden geçirin.",
                        "Talk today about who currently carries what in a routine you share. Review the habitual split in one sentence."),
                of("PRIORITISE_YOUR_OWN_PLAN", "choose_your_own_plan_first", SINGLE, DRIVE,
                        "Önce kendi planınızı kurun", "Lock your own plan first",
                        "Bugün kendi planınızı önce kesinleştirin. Başkalarının programına göre şekillendirmeyi sonraya bırakın.",
                        "Settle today's plan on your own terms before anyone else's schedule shapes it. Fit the rest around that."));

        put(LifeArea.RELATIONSHIP, Tone.CAUTION,
                of("REQUEST_CLARIFICATION_BEFORE_REACTING", "ask_before_interpreting", WORD,
                        "Cevabı varsayıma dayamayın", "Ask what was meant",
                        "Bugün gelen kısa ya da geç bir mesajı hemen yorumlamayın. Ne kastedildiğini sorun, cevabınızı varsayıma dayamayın.",
                        "Do not interpret a short or delayed message straight away today. Ask what was meant before you build a reply on it."),
                of("DONT_PERSONALISE_SILENCE", "check_their_day_first", BOND,
                        "Mesafeyi kişisel okumayın", "Ask about their day",
                        "Karşınızdakinin bugünkü mesafesini kişisel bir işaret olarak okumayın. Önce gününde ne olduğunu sorun.",
                        "Do not read someone's distance today as a signal about you. Ask first what their day has been like."),
                of("LIMIT_TO_SINGLE_ISSUE", "name_single_behaviour", DRIVE,
                        "Tek davranışı adlandırın", "Name one behaviour only",
                        "Bir gerginlik başlarsa geçmiş örnekleri sıralamayın. Yalnızca bugün sizi rahatsız eden davranışı adlandırın.",
                        "If tension starts, do not list every past example. Name only the one behaviour that bothered you today."),
                of("AVOID_ABSOLUTE_LANGUAGE", "avoid_absolute_sentences", LIMIT,
                        "Kesin cümlelerden kaçının", "Drop never and always",
                        "Bugün \"hiçbir zaman\" veya \"her zaman\" ile başlayan cümleler kurmayın. Konuşmayı tek bir olayla sınırlayın.",
                        "Do not build sentences on \"you never\" or \"you always\" today. Keep the conversation to one specific incident."),
                of("HOLD_DECISION_OVERNIGHT", "delay_big_relationship_call", SCOPE,
                        "Tek konuşmayla karar vermeyin", "Write it down and wait",
                        "İlişkiye dair büyük bir kararı tek konuşmanın duygusuyla vermeyin. Kararı yazın ve en az bir gün bekletin.",
                        "Do not settle a big relationship decision on the feeling of one conversation. Write it down and leave it a day."));

        put(LifeArea.COMMUNICATION, Tone.SUPPORTIVE,
                of("LEAD_WITH_THE_ASK", "write_the_ask_explicitly", WORD,
                        "İsteğinizi ilk cümleye koyun", "Put the ask up front",
                        "Bugün yazacağınız önemli bir mesajda ne istediğinizi ilk cümleye koyun. Açıklamayı arkasına bırakın.",
                        "In an important message today, put what you are asking for in the first sentence. Leave the explanation after it."),
                of("RESTATE_BEFORE_REPLYING", "restate_before_replying", BOND,
                        "Duyduğunuzu özetleyip doğrulatın", "Say back what you heard",
                        "Uzun bir konuşmada cevap vermeden önce duyduğunuzu kendi cümlenizle özetleyin. Doğru anlayıp anlamadığınızı sorun.",
                        "In a long conversation, summarise what you heard in your own words first. Ask whether you got it right."),
                of("REOPEN_STALLED_THREAD", "reopen_stalled_thread", DRIVE,
                        "Duran konuyu tek soruyla açın", "Reopen it with one question",
                        "Cevapsız kalmış bir konuyu bugün tek soruyla yeniden açın. Hangi noktada kaldığını sorun.",
                        "Reopen a thread that went quiet with a single question today. Ask which point it stalled at."),
                of("CONFIRM_TERMS_IN_WRITING", "put_agreement_in_writing", LIMIT,
                        "Sözlü anlaşmayı yazıya dökün", "Put the agreement in writing",
                        "Sözlü olarak anlaştığınız bir konuyu bugün iki satırla yazın. Karşı tarafa da onaylatın.",
                        "Put something you agreed verbally into two written lines today. Have the other side confirm it."),
                of("HANDLE_ONE_TOPIC_AT_A_TIME", "split_message_into_topics", SCOPE,
                        "En önemli konuyu ayırın", "Send one topic alone",
                        "Birden fazla konuyu tek mesaja sıkıştırmayın. En önemli konuyu ayrı bir mesajda gönderin.",
                        "Do not compress several topics into one message. Send the most important one on its own."));

        put(LifeArea.COMMUNICATION, Tone.CAUTION,
                of("VERIFY_WITH_ORIGINAL_SOURCE", "verify_before_forwarding", WORD,
                        "Bilgiyi kaynağından teyit edin", "Check the original source first",
                        "Bugün ikinci elden duyduğunuz bir bilgiyi olduğu gibi iletmeyin. Önce kaynağından teyit edin.",
                        "Do not pass on something you heard second-hand today as it is. Verify it with the original source first."),
                of("DELAY_REACTIVE_MESSAGE", "wait_before_reactive_reply", BOND,
                        "Cevabı bir saat bekletin", "Hold the reply an hour",
                        "Sizi rahatsız eden bir mesaja cevabınızı yazın ama göndermeyin. En az bir saat bekletip yeniden okuyun.",
                        "Write your reply to a message that bothered you, but do not send it. Hold it an hour and read it again."),
                of("SET_A_CONCRETE_DATE", "confirm_deadline_wording", DRIVE,
                        "Net günü teyit edin", "Confirm the exact date",
                        "Bugün konuşulan bir tarihin \"bu hafta\" gibi belirsiz kalmasına izin vermeyin. Net günü aynı konuşmada teyit edin.",
                        "Do not let a date discussed today stay vague like \"this week\". Confirm the exact date in the same conversation."),
                of("AVOID_FINAL_WORDING", "avoid_final_wording_in_text", LIMIT,
                        "Son sözü yazmaktan kaçının", "Keep the question open",
                        "Yazılı iletişimde bugün son sözü söyleyen cümleler kurmayın. Sorunuzu açık uçlu bırakın.",
                        "Do not write final-sounding sentences today. Leave your question open-ended so the thread can continue."),
                of("REDUCE_INPUT_LOAD", "reduce_parallel_threads", SCOPE,
                        "Konuyu tek kanalda toplayın", "Move it to one channel",
                        "Aynı konuyu üç ayrı kanaldan yürütmeyin. Bugün tek kanalda toplayın ve diğerlerinde bunu belirtin.",
                        "Do not run the same topic across three channels. Consolidate it into one today and say so in the others."));

        put(LifeArea.WORK, Tone.SUPPORTIVE,
                of("CONFIRM_TERMS_IN_WRITING", "write_down_scope_before_accepting", WORD,
                        "Kabul etmeden kapsamı yazın", "Write the scope down first",
                        "Yeni bir sorumluluğu kabul etmeden önce teslim zamanını ve beklenen sonucu yazın. Sözlü mutabakatla yetinmeyin.",
                        "Before accepting a new responsibility, write down the delivery time and the expected outcome. Do not settle for a verbal agreement."),
                of("CLARIFY_SUCCESS_DEFINITION", "ask_for_the_success_criteria", BOND,
                        "Bitti sayılma koşulunu sorun", "Ask what counts as done",
                        "Üstlendiğiniz bir işin \"tamamlandı\" sayılması için hangi koşul gerekiyor? Bunu bugün açıkça sorun.",
                        "What condition has to be met for something you took on to count as finished? Ask that explicitly today."),
                of("FINISH_OLDEST_OPEN_ITEM", "close_the_oldest_open_item", DRIVE,
                        "En eski maddeyi bitirin", "Finish the oldest item",
                        "Listenizde en uzun süredir açık duran maddeyi bugün bitirin. Yenisini eklemeden önce onu kapatın.",
                        "Finish the item that has been open longest on your list today. Close it before you add anything new."),
                of("DECLINE_WITH_CONCRETE_ALTERNATIVE", "decline_with_alternative", LIMIT,
                        "Hayır derken tarih verin", "Refuse but offer a date",
                        "Kapasitenizi aşan bir talebe bugün hayır derken hangi tarihte yapabileceğinizi de söyleyin. Talebi boşlukta bırakmayın.",
                        "When you turn down a request beyond your capacity today, also name the date you could do it. Do not leave the request hanging."),
                of("REDUCE_SCOPE_TO_FIRST_STEP", "break_large_item_into_two", SCOPE,
                        "İşi ikiye bölün", "Split the item in two",
                        "Kapsamı büyümüş bir işi bugün ikiye bölün. Yalnızca ilk parçasına tarih verin.",
                        "Split one item whose scope has grown into two today. Commit a date only to the first half."));

        put(LifeArea.WORK, Tone.CAUTION,
                of("CONFIRM_TERMS_IN_WRITING", "request_written_terms", WORD,
                        "Hangi parça size ait?", "Separate what is yours",
                        "Bugün üstünüze bırakılmak istenen bir yük, ilk göründüğünden büyük çıkabilir. Evet demeden önce hangi parçanın size ait olduğunu ayırın.",
                        "A responsibility pushed toward you today may be larger than it first appears. Before saying yes, separate which part genuinely belongs to you."),
                of("CLARIFY_SUCCESS_DEFINITION", "confirm_who_decides", BOND,
                        "Kararı kim veriyor?", "Ask who decides",
                        "Bir konuda son kararı kimin verdiği belirsizse ilerlemeyin. Bunu açıkça sorup netleştirin.",
                        "If it is unclear who makes the final call on something, do not move forward. Ask that explicitly first."),
                of("RESIST_URGENCY_PRESSURE", "avoid_same_day_commitment", DRIVE,
                        "Anında evet demeyin", "Do not say yes now",
                        "Bugün istenen bir teslim tarihine anında evet demeyin. Mevcut yükünüzü gözden geçirip akşam cevap verin.",
                        "Do not say yes immediately to a deadline requested today. Review your current load and answer in the evening."),
                of("AUDIT_EXISTING_COMMITMENT", "check_what_you_signed_up_for", LIMIT,
                        "Kapsam sessizce büyüdü mü?", "Check if the scope grew",
                        "Uzun süredir devam eden bir sorumluluğun kapsamı sessizce büyümüş olabilir. Bugün yazılı olarak kontrol edin.",
                        "A long-running responsibility may have quietly grown beyond what you agreed. Check it in writing today."),
                of("REDUCE_SCOPE_TO_FIRST_STEP", "postpone_scope_expansion", SCOPE,
                        "Önce bitiş tarihini teyit edin", "Confirm the finish date first",
                        "Bugün gündeme gelen kapsam genişletme fikrine hemen karar vermeyin. Mevcut işin bitiş tarihini önce teyit edin.",
                        "Do not decide straight away on a scope expansion raised today. Confirm the finish date of what is already underway."));

        put(LifeArea.MONEY, Tone.SUPPORTIVE,
                of("READ_THE_FINE_PRINT", "read_the_terms_line", WORD,
                        "İptal maddesini okuyun", "Read the cancellation clause",
                        "Bugün karşınıza çıkan bir ödeme veya abonelik koşulunu geçmeyin. İptal ve yenileme maddesini okuyun.",
                        "Do not skip past a payment or subscription term you come across today. Read the cancellation and renewal clause."),
                of("SPLIT_SHARED_COST_EXPLICITLY", "name_the_shared_cost", BOND,
                        "Payları rakamla yazın", "Write the split in numbers",
                        "Paylaşılan bir masrafta kimin neyi üstlendiğini bugün rakamla yazın. \"Sonra hesaplaşırız\" demeyin.",
                        "Write down with actual numbers who covers what in a shared cost today. Do not leave it at \"we'll settle later\"."),
                of("FOLLOW_UP_PENDING_AMOUNT", "collect_one_pending_amount", DRIVE,
                        "Bekleyen alacağı hatırlatın", "Chase one pending amount",
                        "Uzun süredir beklettiğiniz bir alacağı veya iadeyi bugün hatırlatın. Tek bir mesaj yeterli.",
                        "Send one message today about an amount owed to you or a refund you keep postponing. One message is enough."),
                of("SET_SPENDING_CEILING", "set_a_ceiling_before_buying", LIMIT,
                        "Üst sınırı önceden yazın", "Write the ceiling down first",
                        "Bugün düşündüğünüz bir harcama için üst sınırı satın almadan önce yazın. O rakamın üstüne çıkmayın.",
                        "Write down the ceiling for a purchase you are considering before you buy. Stay under that number."),
                of("ITEMISE_BUNDLED_OFFER", "delay_bundled_offer", SCOPE,
                        "Paketi kalem kalem listeleyin", "List the bundle item by item",
                        "Bugün gelen paket veya kampanya teklifini olduğu gibi kabul etmeyin. Tek tek neyi ödediğinizi listeleyin.",
                        "Do not accept a bundled offer today as it stands. List item by item what you would actually be paying for."));

        put(LifeArea.MONEY, Tone.CAUTION,
                of("CONFIRM_TERMS_IN_WRITING", "verify_amount_in_writing", WORD,
                        "Tutarın yazılı teyidini alın", "Get the amount confirmed",
                        "Bugün sözlü olarak konuşulan bir tutarı hemen işleme koymayın. Yazılı teyidini isteyin ve öyle ilerleyin.",
                        "Do not act on an amount discussed only verbally today. Ask for written confirmation before anything moves."),
                of("SPLIT_SHARED_COST_EXPLICITLY", "separate_favor_from_money", BOND,
                        "Tutarı ve dönüşü konuşun", "Agree amount and return date",
                        "Yakın birine para veya kaynak konusunda destek olacaksanız bugün açıkça konuşun. Tutarı ve geri dönüş zamanını birlikte belirleyin.",
                        "If you are helping someone close with money or resources, talk openly today. Agree the amount and the return timing together."),
                of("RESIST_URGENCY_PRESSURE", "avoid_impulse_commitment", DRIVE,
                        "Teklif yarın da geçerli mi?", "Ask if it stands tomorrow",
                        "Bugün süreli olduğu söylenen bir teklife anında karar vermeyin. Teklifin yarın da geçerli olup olmadığını sorun.",
                        "Do not decide immediately on an offer presented as time-limited today. Ask whether it still stands tomorrow."),
                of("REVIEW_RECURRING_CHARGES", "review_recurring_charges", LIMIT,
                        "Otomatik ödemeyi kontrol edin", "Check one auto-renewal",
                        "Otomatik yenilenen ödemelerinizden birini bugün açıp bakın. Hâlâ kullanıp kullanmadığınıza karar verin.",
                        "Open one of your auto-renewing payments today and look at it. Decide whether you still use it."),
                of("HOLD_DECISION_OVERNIGHT", "hold_large_decision_overnight", SCOPE,
                        "Sayıları yazın, yarına bırakın", "Leave the numbers till tomorrow",
                        "Büyük bir maddi kararı bugünkü ruh haliyle kapatmayın. Sayıları yazın ve kararı yarına bırakın.",
                        "Do not close a large financial decision on today's mood. Write the numbers down and leave the decision to tomorrow."));

        put(LifeArea.FAMILY, Tone.SUPPORTIVE,
                of("ASK_WHAT_THEY_NEED", "ask_one_direct_question", WORD,
                        "Genel soruyu somutlaştırın", "Ask something specific",
                        "Ailenizden biriyle bugün genel bir \"nasılsın\" ile yetinmeyin. Tek ve somut bir soru sorun.",
                        "Do not settle for a general \"how are you\" with a family member today. Ask one specific question instead."),
                of("OFFER_CONCRETE_HELP", "offer_practical_help", BOND,
                        "Somut bir yardım önerin", "Offer help you can name",
                        "Bir aile üyesine bugün soyut destek yerine somut bir yardım önerin. Hangi işi ne zaman devralacağınızı söyleyin.",
                        "Offer a family member concrete help today rather than abstract support. Name the task and when you will take it on."),
                of("REOPEN_STALLED_THREAD", "initiate_postponed_call", DRIVE,
                        "Ertelenen görüşmeyi başlatın", "Start the postponed call",
                        "Uzun süredir ertelediğiniz bir aile görüşmesini bugün başlatın. Süresini de baştan belirleyin.",
                        "Start the family conversation you have been postponing today. Agree how long it will run up front."),
                of("STATE_CAPACITY_UPFRONT", "state_your_availability", LIMIT,
                        "Ayırabileceğiniz süreyi söyleyin", "Say how much time you have",
                        "Ailenizden gelen bir talebe bugün ne kadar zaman ayırabileceğinizi baştan söyleyin. Sonradan geri çekilmek zorunda kalmayın.",
                        "Say up front today how much time you can give to a request from your family. That saves you pulling back later."),
                of("HANDLE_ONE_TOPIC_AT_A_TIME", "separate_two_family_topics", SCOPE,
                        "İki konuyu birleştirmeyin", "Take on only one topic",
                        "İki ayrı aile konusunu tek konuşmada birleştirmeyin. Bugün yalnızca birini ele alın.",
                        "Do not merge two separate family topics into one conversation. Take on only one of them today."));

        put(LifeArea.FAMILY, Tone.CAUTION,
                of("DONT_MEDIATE_FOR_OTHERS", "dont_relay_between_people", WORD,
                        "Arada mesaj taşımayın", "Let them talk directly",
                        "Bugün iki aile üyesi arasında mesaj taşımayın. İlgili kişilerin doğrudan konuşmasını önerin.",
                        "Do not carry messages between two family members today. Suggest they speak to each other directly."),
                of("INTERRUPT_RECURRING_PATTERN", "pause_before_old_topic", BOND,
                        "Ne değişti diye sorun", "Ask what has changed",
                        "Tekrarlayan bir aile konusu açıldığında bugün aynı cevabı vermeyin. Önce ne değiştiğini sorun.",
                        "When a recurring family topic comes up today, do not give your usual answer. Ask first what has changed."),
                of("DONT_DECIDE_FOR_OTHERS", "avoid_deciding_for_others", DRIVE,
                        "Onun yerine karar vermeyin", "Let them choose",
                        "Bugün bir aile bireyinin yerine karar vermeyin. Seçeneği ona iletip tercihini sorun.",
                        "Do not decide on a family member's behalf today. Put the option to them and ask what they prefer.")
                ,
                of("SET_AN_END_TIME", "set_end_time_for_visit", LIMIT,
                        "Bitiş saatini baştan söyleyin", "Say the end time up front",
                        "Bugünkü bir aile buluşmasının bitiş saatini baştan söyleyin. Sonradan açıklama yapmak zorunda kalmazsınız.",
                        "Say the end time of a family gathering at the start today. Then you do not have to justify leaving later."),
                of("DONT_SETTLE_OLD_MATTER_TODAY", "dont_settle_old_matter_today", SCOPE,
                        "Eski meseleyi bugün kapatmayın", "Do not close an old matter",
                        "Yıllardır çözülmemiş bir aile meselesini tek konuşmayla kapatmayı hedeflemeyin. Bugün tek bir adım yeterli.",
                        "Do not aim to close a years-old family matter in a single conversation today. One step is enough for now."));

        put(LifeArea.SOCIAL, Tone.SUPPORTIVE,
                of("REOPEN_STALLED_THREAD", "reply_to_one_old_message", WORD,
                        "Eski mesaja dönüş yapın", "Reply to one old message",
                        "Cevapsız bıraktığınız bir mesaja bugün kısa da olsa dönün. Gecikmeyi açıklamanız gerekmiyor.",
                        "Reply today to one message you left unanswered, even briefly. You do not need to explain the delay."),
                of("GIVE_A_CLEAR_ANSWER", "accept_one_invitation", BOND,
                        "Belki değil, evet ya da hayır", "Decide yes or no now",
                        "Bugün gelen bir davete \"belki\" demeyin. Net bir evet ya da net bir hayır verin.",
                        "Do not answer an invitation with \"maybe\" today. Give a clear yes or a clear no instead."),
                of("INTRODUCE_TWO_PEOPLE", "introduce_two_people", DRIVE,
                        "İki kişiyi tanıştırın", "Introduce two people",
                        "Birbirine faydası olabilecek iki kişiyi bugün tanıştırın. Neden tanıştırdığınızı tek cümleyle yazın.",
                        "Introduce two people who could be useful to each other today. Say in one sentence why you did it."),
                of("EXIT_THREAD_EXPLICITLY", "leave_group_thread_cleanly", LIMIT,
                        "Gruptan not bırakarak ayrılın", "Leave the group with a note",
                        "Artık takip etmediğiniz bir grup sohbetinden bugün sessizce çıkmayın. Tek cümlelik bir notla ayrılın.",
                        "Do not leave a group thread you no longer follow silently today. Go with a one-line note instead."),
                of("NARROW_THE_OPTIONS", "commit_to_one_plan_only", SCOPE,
                        "Tek planı kesinleştirin", "Confirm only one plan",
                        "Bu haftaya birden fazla sosyal plan yığıldıysa hepsini onaylamayın. Bugün yalnızca birini kesinleştirin.",
                        "If several social plans have piled up this week, do not confirm them all. Lock in only one of them today."));

        put(LifeArea.SOCIAL, Tone.CAUTION,
                of("READ_FULL_CONTEXT_BEFORE_REPLYING", "check_group_context_first", WORD,
                        "Konuşmanın tamamını okuyun", "Read the whole thread",
                        "Bir grup sohbetinde bugün konuşmanın tamamını okumadan cevap yazmayın. Eksik bağlam yanlış cevap üretir.",
                        "Do not reply in a group thread today before reading the whole conversation. Partial context produces the wrong answer."),
                of("DONT_PERSONALISE_SILENCE", "dont_read_silence_as_rejection", BOND,
                        "Sessizliği ret saymayın", "Silence is not rejection",
                        "Bugün gelmeyen bir cevabı ilgisizlik olarak okumayın. En son ne konuşulduğuna yeniden bakın.",
                        "Do not read a missing reply today as disinterest. Look back at what was last said between you."),
                of("CORRECT_PRIVATELY", "avoid_public_correction", DRIVE,
                        "Düzeltmeyi özelde yapın", "Take the correction private",
                        "Bugün bir kişiyi grup içinde düzeltmeyin. Aynı şeyi özelde tek cümleyle söyleyin.",
                        "Do not correct someone in front of a group today. Say the same thing privately in one sentence."),
                of("RESTATE_DECISION_WITHOUT_JUSTIFYING", "say_no_without_backstory", LIMIT,
                        "Kısa ve net cevap verin", "Answer short and clear",
                        "Katılamayacağınız bir plana bugün uzun gerekçe üretmeyin. Kısa ve net bir cevap yeterli.",
                        "Do not construct a long justification for a plan you cannot join today. A short, clear answer is enough."),
                of("REVIEW_AUTOMATIC_AGREEMENT", "dont_overpromise_in_group", SCOPE,
                        "Takviminize bakmadan söz vermeyin", "Check the week first",
                        "Bugün grup içinde heyecanla verilen bir sözü hemen kesinleştirmeyin. Önce takviminize bakın.",
                        "Do not firm up a promise made enthusiastically in a group today. Check your calendar first."));

        put(LifeArea.BOUNDARIES, Tone.SUPPORTIVE,
                of("STATE_THE_LIMIT_PLAINLY", "say_the_limit_in_one_line", WORD,
                        "Sınırı tek cümlede söyleyin", "Say the limit in one line",
                        "Bugün rahatsız olduğunuz bir durumu tek cümlede söyleyin. Neyin size uymadığını ve neyi tercih ettiğinizi belirtin.",
                        "Say a situation that does not sit well with you in one sentence today. State what does not work and what you would prefer."),
                of("STATE_CAPACITY_UPFRONT", "name_your_capacity", BOND,
                        "Kapasitenizi açıkça söyleyin", "Name the capacity you have",
                        "Size yöneltilen bir talebe bugün cevap verirken önce kapasitenizi söyleyin. Ne kadar enerjiniz olduğunu açıkça belirtin.",
                        "When you answer a request today, say plainly how much capacity you actually have. Do that before you agree to anything."),
                of("FINISH_OLDEST_OPEN_ITEM", "close_one_open_loop", DRIVE,
                        "Bitirin ya da açıkça erteleyin", "Finish or clearly postpone it",
                        "Uzun süredir sizi meşgul eden bir konuyu bugün bitirin. Bitiremiyorsanız ertelediğinizi karşı tarafa açıkça bildirin.",
                        "Finish a matter that has been occupying you today. If you cannot, tell the other side plainly that you are postponing it."),
                of("PROTECT_A_TIME_BLOCK", "protect_one_time_block", LIMIT,
                        "Bir saati kimseye vermeyin", "Keep one hour for yourself",
                        "Bugün bir saatlik bir aralığı kimseye vermeyin. Takviminizde görünür şekilde işaretleyin.",
                        "Keep a one-hour block for yourself today. Mark it visibly in your calendar so it does not get taken."),
                of("DECLINE_WITH_CONCRETE_ALTERNATIVE", "decline_expanding_request", SCOPE,
                        "Talebi ilk haline döndürün", "Bring it back to scope",
                        "Başta küçük görünüp büyüyen bir talebi olduğu gibi kabul etmeyin. Bugün ilk haline geri getirmeyi önerin.",
                        "Do not accept a request that started small and kept growing as it now stands. Propose bringing it back to its original scope today."));

        put(LifeArea.BOUNDARIES, Tone.CAUTION,
                of("RESTATE_DECISION_WITHOUT_JUSTIFYING", "dont_explain_twice", WORD,
                        "İkinci kez açıklamayın", "Repeat your first sentence",
                        "Bugün verdiğiniz bir cevabı ikinci kez açıklamak zorunda hissetmeyin. İlk cümlenizi aynen tekrar edin.",
                        "Do not feel obliged to explain an answer twice today. Simply repeat your first sentence as it was."),
                of("REVIEW_AUTOMATIC_AGREEMENT", "notice_the_yes_you_regret", BOND,
                        "Otomatik evetinizi geri alın", "Revisit an automatic yes",
                        "Bugün bir şeye otomatik olarak \"olur\" derseniz orada bırakmayın. Aynı gün içinde koşullarını yeniden konuşun.",
                        "If you say yes automatically to something today, do not leave it there. Revisit its conditions the same day."),
                of("DONT_TAKE_OVER_OTHERS_TASK", "avoid_taking_over_task", DRIVE,
                        "Gerçekten sizden mi istendi?", "Check who was asked",
                        "Bugün başkasının sorumluluğundaki bir işi hemen devralmayın. Gerçekten sizden mi istendiğini önce sorun.",
                        "Do not take over something that belongs to someone else today. Ask first whether it was actually asked of you."),
                of("DONT_NEGOTIATE_YOUR_NO", "dont_negotiate_your_no", LIMIT,
                        "Yeni gerekçe eklemeyin", "Repeat the decision as it was",
                        "Verdiğiniz bir \"hayır\" bugün yeniden tartışmaya açılırsa gerekçe eklemeyin. Kararınızı aynen tekrar edin.",
                        "If a no you gave is reopened today, do not add more justification. Repeat the decision exactly as it was."),
                of("STATE_CAPACITY_UPFRONT", "limit_new_commitments_today", SCOPE,
                        "Önce mevcut sözlerinizi yazın", "List what you already owe",
                        "Bugün gelen yeni bir talebe hemen cevap vermeyin. Önce hangi sözleri verdiğinizi listeleyin.",
                        "Do not answer a new request that arrives today straight away. List what you have already committed to first."));

        put(LifeArea.EMOTIONAL_BALANCE, Tone.SUPPORTIVE,
                of("NAME_THE_FEELING_PRECISELY", "name_the_feeling_precisely", WORD,
                        "Duyguya tek kelime verin", "Name the feeling in one word",
                        "Bugün hissettiğinizi \"iyi\" veya \"kötü\" diye geçiştirmeyin. Tek ve kesin bir kelimeyle adlandırıp yazın.",
                        "Do not settle for \"good\" or \"bad\" about what you feel today. Write it down with one precise word."),
                of("ASK_WHAT_THEY_NEED", "tell_one_person_what_you_need", BOND,
                        "İhtiyacınızı somut söyleyin", "Say what would help",
                        "Size iyi gelecek şeyi bugün bir kişiye somut olarak söyleyin. Dinlemesini mi, fikir vermesini mi istiyorsunuz?",
                        "Tell one person concretely what would help you today. Do you want them to listen, or to give an opinion?"),
                of("REGULATE_BEFORE_HARD_CONVERSATION", "move_before_the_conversation", DRIVE,
                        "Zor konuşmadan önce yürüyün", "Walk before the hard talk",
                        "Zorlanacağınızı bildiğiniz bir konuşmadan önce bugün on dakika yürüyün. Konuşmaya oradan gidin.",
                        "Take a ten-minute walk before a conversation you expect to be hard today. Go into it straight from there."),
                of("RECORD_THE_TRIGGER", "write_the_trigger_down", LIMIT,
                        "Söyleneni birebir not edin", "Note the exact words",
                        "Bugün tepkinizin sertleştiği anı fark ederseniz durup yazın. O anda ne söylendiğini birebir not edin.",
                        "If you notice your reaction hardening today, stop and write. Note down exactly what was said at that moment."),
                of("REDUCE_INPUT_LOAD", "shorten_the_input", SCOPE,
                        "Akışı iki saat kapatın", "Close the feed two hours",
                        "Duygusal yükü artıran bir içerik akışını bugün iki saat kapatın. Bu aralığı önceden belirleyin.",
                        "Close off a content feed that adds emotional load for two hours today. Decide that window in advance."));

        put(LifeArea.EMOTIONAL_BALANCE, Tone.CAUTION,
                of("DONT_GENERALISE_FROM_TODAY", "dont_conclude_from_today", WORD,
                        "Bugünden genel sonuç çıkarmayın", "Draw no general conclusion",
                        "Bugünkü ruh halinizden yola çıkarak bir ilişki hakkında genel bir sonuç yazmayın. Tek günün verisi yeterli değil.",
                        "Do not draw a general conclusion about a relationship from today's mood. One day is not enough evidence."),
                of("SEPARATE_PAST_FROM_PRESENT", "separate_memory_from_now", BOND,
                        "Eskiyi bugünden ayırın", "Separate then from now",
                        "Bugün canlanan eski bir duygu varsa hepsini bugüne yazmayın. Ne kadarının şu anki olayla ilgili olduğunu ayrı yazın.",
                        "If an old feeling surfaces today, do not assign all of it to today. Write separately how much belongs to the current event."),
                of("DELAY_REACTIVE_MESSAGE", "delay_reactive_message", DRIVE,
                        "Mesajı taslakta bırakın", "Leave the message in drafts",
                        "Duygusal yoğunlukta yazdığınız bir mesajı bugün göndermeyin. Taslakta bırakıp akşam yeniden okuyun.",
                        "Do not send a message written under emotional intensity today. Leave it in drafts and reread it in the evening."),
                of("AVOID_ALL_OR_NOTHING_FRAME", "avoid_all_or_nothing_frame", LIMIT,
                        "Ya hep ya hiç kalıbını kırın", "Find a middle option",
                        "Bugün bir durumu \"ya hep ya hiç\" diye çerçevelediğinizi fark ederseniz durun. Üçüncü bir seçenek yazın.",
                        "If you notice yourself framing something as all-or-nothing today, stop. Write down a third option."),
                of("DONT_STACK_HARD_CONVERSATIONS", "dont_stack_hard_conversations", SCOPE,
                        "Zor konuşmaları yığmayın", "Do not stack hard talks",
                        "Bugün birden fazla zor konuşmayı aynı saatlere yığmayın. Birini başka bir güne alın.",
                        "Do not stack several difficult conversations into the same hours today. Move one of them to another day."));

        put(LifeArea.DECISION, Tone.SUPPORTIVE,
                of("WRITE_DECISION_CRITERIA", "write_the_decision_criteria", WORD,
                        "Kriteri karardan önce yazın", "Write the criteria first",
                        "Bugün vereceğiniz kararın hangi koşulda doğru sayılacağını önce yazın. Kriteri karardan sonra belirlemeyin.",
                        "Write down first what condition would make today's decision the right one. Do not set the criteria after deciding."),
                of("SEEK_DISSENTING_VIEW", "ask_one_person_who_disagrees", BOND,
                        "İtiraz edecek birine anlatın", "Tell someone who disagrees",
                        "Kararınızı bugün size katılmayacağını düşündüğünüz bir kişiye anlatın. İtirazını sonuna kadar dinleyin.",
                        "Explain your decision today to someone you expect to disagree. Listen to their objection all the way through."),
                of("SET_A_CONCRETE_DATE", "set_a_decision_deadline", DRIVE,
                        "Karar tarihini belirleyin", "Set the decision date",
                        "Uzun süredir askıda olan bir konuya bugün karar tarihi verin. Kararı değil, tarihi bugün kesinleştirin.",
                        "Give a long-pending matter a decision date today. Fix the date now, not the decision itself."),
                of("LIST_WHAT_YOU_GIVE_UP", "list_what_you_give_up", LIMIT,
                        "Neyi bıraktığınızı yazın", "List what you give up",
                        "Bugünkü seçeneğin size ne kazandırdığını biliyorsunuz. Neyi bıraktırdığını da aynı yere yazın.",
                        "You already know what today's option gains you. Write down what it makes you give up, in the same place."),
                of("NARROW_THE_OPTIONS", "reduce_options_to_two", SCOPE,
                        "Seçenekleri ikiye indirin", "Cut the options to two",
                        "Elinizdeki seçenekleri bugün ikiye indirin. Elediklerinizi neden elediğinizi tek satırla not edin.",
                        "Narrow your options down to two today. Note in one line why you dropped the rest."));

        put(LifeArea.DECISION, Tone.CAUTION,
                of("IDENTIFY_THE_MISSING_FACT", "get_the_missing_fact", WORD,
                        "Eksik bilgiyi belirleyin", "Name the missing fact",
                        "Kararı vermeden önce hâlâ bilmediğiniz tek bilgiyi belirleyin. Bugün gidip onu sorun.",
                        "Identify the one fact you still do not have before deciding today. Then go and ask for it."),
                of("DONT_DECIDE_TO_END_DISCOMFORT", "dont_decide_to_end_discomfort", BOND,
                        "Belirsizlik için karar vermeyin", "Write the cost of waiting",
                        "Bugün bir kararı yalnızca belirsizlik rahatsız ettiği için kapatmayın. Beklemenin maliyetini yazıp bakın.",
                        "Do not close a decision today just because the uncertainty is uncomfortable. Write down the cost of waiting and look at it."),
                of("RESIST_URGENCY_PRESSURE", "avoid_deciding_under_pressure", DRIVE,
                        "Süre isteyip tarih verin", "Ask for time and a date",
                        "Bugün hızlı cevap beklenen bir konuda hemen karar vermeyin. Süre isteyin ve ne zaman döneceğinizi söyleyin.",
                        "Do not decide on the spot where a fast answer is expected today. Ask for time and say when you will come back."),
                of("CHECK_REVERSIBILITY", "check_reversibility", LIMIT,
                        "Geri dönülebilir mi diye bakın", "Check whether you can undo it",
                        "Bugünkü kararın geri dönülebilir olup olmadığını kontrol edin. Geri dönülemiyorsa bir gün bekletin.",
                        "Check whether today's decision can be undone. If it cannot, hold it for a day before you commit."),
                of("HANDLE_ONE_TOPIC_AT_A_TIME", "dont_bundle_decisions", SCOPE,
                        "İki kararı ayırın", "Separate the two decisions",
                        "Bugün birbirine bağlı görünen iki kararı ayırın. Yalnızca bağımsız olanı bugün verin.",
                        "Separate two decisions that only look linked today. Make just the independent one now."));

        put(LifeArea.REST, Tone.SUPPORTIVE,
                of("PROTECT_A_TIME_BLOCK", "schedule_the_break", WORD,
                        "Molanın saatini yazın", "Write the break time down",
                        "Bugünkü molanızın saatini şimdiden yazın. \"Fırsat bulunca\" diye bırakmayın.",
                        "Write down the time of your break today, now. Do not leave it to \"when I get a chance\"."),
                of("NOTICE_FATIGUE_SIGNAL", "choose_recovery_over_scroll", BOND,
                        "Ekran yerine sessiz ara", "Choose quiet over screen",
                        "Bugün yorgun hissettiğiniz anda telefona uzanmayın. On dakikalık sessiz bir ara verin.",
                        "Do not reach for your phone when you feel tired today. Take ten quiet minutes instead."),
                of("DEFER_ONE_TASK", "move_one_task_to_tomorrow", DRIVE,
                        "Bir maddeyi yarına taşıyın", "Move one item to tomorrow",
                        "Bugünkü listenizden bir maddeyi bilinçli olarak yarına taşıyın. Bunu yazılı olarak not edin.",
                        "Deliberately move one item from today's list to tomorrow. Write that down so it does not drift back."),
                of("PROTECT_SLEEP_WINDOW", "protect_sleep_window", LIMIT,
                        "Yatma saatini önceden seçin", "Set your bedtime in advance",
                        "Bugün yatma saatinizi bir saat önceden belirleyin. O saatte hangi işi bırakacağınızı da yazın.",
                        "Set your bedtime an hour in advance today. Note which task you will drop at that point."),
                of("NARROW_THE_OPTIONS", "shorten_the_evening_list", SCOPE,
                        "Akşam listesini yarıya indirin", "Halve the evening list",
                        "Akşam için planladığınız listeyi bugün yarıya indirin. Kalanını yazılı olarak erteleyin.",
                        "Halve the list you planned for this evening. Postpone the rest in writing so it is not lost."));

        put(LifeArea.REST, Tone.CAUTION,
                of("NOTICE_FATIGUE_SIGNAL", "notice_the_missed_signal", WORD,
                        "Yorgunluğu ertelediğiniz anı yakalayın", "Catch the moment you push on",
                        "Bugün yorgunluk sinyalini ertelediğiniz anı fark edin. O anda ne yapıyor olduğunuzu not edin.",
                        "Notice the moment you postpone a tiredness signal today. Note what you were doing right then."),
                of("DONT_REFILL_FREED_TIME", "dont_fill_the_gap", BOND,
                        "Açılan boşluğu doldurmayın", "Leave the gap empty",
                        "Bugün boşalan bir zaman aralığını hemen yeni bir işle doldurmayın. Olduğu gibi bırakın.",
                        "Do not immediately fill a gap that opens in your day today. Leave it exactly as it is."),
                of("DEFER_ONE_TASK", "avoid_late_start", DRIVE,
                        "Geç saatte başlamayın", "Schedule the start for morning",
                        "Bugün geç saatte yeni bir işe başlamayın. Başlangıcını yarın sabaha yazın.",
                        "Avoid beginning a fresh task late today. Schedule its start for tomorrow morning instead."),
                of("REGULATE_BEFORE_HARD_CONVERSATION", "limit_stimulants_before_talk", LIMIT,
                        "Konuşmayı öne alın", "Move the talk earlier",
                        "Zorlu bir konuşmadan önce bugün uyarıcı tüketimini artırmayın. Konuşmayı daha erken bir saate alın.",
                        "Do not increase stimulants before a demanding conversation today. Move the conversation earlier instead."),
                of("DONT_COMPRESS_RECOVERY", "dont_compress_recovery", SCOPE,
                        "Güne bir ara ekleyin", "Add one break inside the day",
                        "Bugün dinlenmeyi günün sonuna sıkıştırmayın. Günün içine bir ara ekleyin.",
                        "Do not compress recovery into the end of the day today. Add one break inside the day itself."));

        put(LifeArea.CREATIVITY, Tone.SUPPORTIVE,
                of("CAPTURE_RAW_IDEA", "capture_the_raw_idea", WORD,
                        "Fikri geldiği gibi yazın", "Write the idea as it arrives",
                        "Bugün aklınıza gelen fikri düzeltmeden yazın. Düzenlemeyi yarına bırakın.",
                        "Write down the idea that comes to you today exactly as it arrives. Leave the editing to tomorrow."),
                of("SHOW_UNFINISHED_WORK", "show_the_unfinished_version", BOND,
                        "Yarım işi tek kişiye gösterin", "Show it unfinished to one person",
                        "Yarım kalmış bir işinizi bugün tek bir kişiye gösterin. Tamamlanmamış haliyle gösterin, önce bitirmeye çalışmayın.",
                        "Show one unfinished piece of your work to a single person today. Show it as it is, without finishing it first."),
                of("TIMEBOX_THE_WORK", "give_it_thirty_minutes", DRIVE,
                        "Otuz dakika verip bırakın", "Give it thirty minutes",
                        "Ertelediğiniz yaratıcı işe bugün otuz dakika verin. Bitmesini beklemeden bırakın.",
                        "Give the creative work you keep postponing thirty minutes today. Stop when the time is up, finished or not."),
                of("CUT_ONE_ELEMENT", "cut_one_element", LIMIT,
                        "Bir öğe çıkarıp bakın", "Remove one element",
                        "Üzerinde çalıştığınız işten bugün bir öğeyi çıkarın. Çıkardıktan sonra işe yeniden bakın.",
                        "Remove one element from what you are working on today. Look at the piece again afterwards."),
                of("TRY_DIFFERENT_FORMAT", "try_a_different_format", SCOPE,
                        "Aynı fikri başka biçimde deneyin", "Try another format",
                        "Aynı fikri bugün farklı bir biçimde ifade edin. Yazdıysanız çizin, çizdiyseniz anlatın.",
                        "Express the same idea in a different format today. If you wrote it, sketch it; if you sketched it, say it out loud."));

        put(LifeArea.CREATIVITY, Tone.CAUTION,
                of("HOLD_FIRST_DRAFT", "dont_publish_first_draft", WORD,
                        "İlk hali için akşamı bekleyin", "Sleep on the first draft",
                        "Bugün ilk halinden memnun olduğunuz bir işi hemen paylaşmayın. Akşam bir kez daha okuyun.",
                        "Do not share work you are pleased with on first draft today. Read it once more in the evening."),
                of("DISCOUNT_EARLY_FEEDBACK", "ignore_the_early_verdict", BOND,
                        "Yorumu tek noktaya indirin", "Reduce the comment to one point",
                        "Bugün aldığınız erken bir yorumla işin tamamını değiştirmeyin. Yorumu tek bir somut noktaya indirin.",
                        "Do not rewrite everything based on early feedback today. Reduce the comment to one concrete point."),
                of("FINISH_OLDEST_OPEN_ITEM", "avoid_starting_third_thing", DRIVE,
                        "Önce birine tarih verin", "Date one before a third",
                        "Bugün açık duran iki yaratıcı işten birine tarih verin. Üçüncüsünü başlatmadan önce bunu yapın.",
                        "Give one of your two open creative pieces a date today. Do that before you begin a third one."),
                of("STRUCTURE_BEFORE_DETAIL", "stop_polishing_details", LIMIT,
                        "Ana hattı kontrol edin", "Check the structure first",
                        "Bugün ayrıntıları düzeltmeye devam etmeyin. İşin ana hattının doğru olup olmadığını kontrol edin.",
                        "Stop polishing details today. Check whether the main structure of the piece is right instead."),
                of("DONT_COMPARE_TO_FINISHED_WORK", "dont_compare_to_finished_work", SCOPE,
                        "Kendi son sürümünüzle kıyaslayın", "Measure against yourself",
                        "Bugün yarım işinizi başkalarının bitmiş işleriyle karşılaştırmayın. Kendi son sürümünüzle karşılaştırın.",
                        "Do not compare your unfinished work to other people's finished work today. Compare it to your own last version."));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Main theme
    // ─────────────────────────────────────────────────────────────────────────

    private void registerThemes() {
        putTheme(LifeArea.RELATIONSHIP, Tone.SUPPORTIVE,
                new ThemeCopy("Söylenmeyeni söyleme günü", "A day for saying the unsaid",
                        "%s etkisi ilişki alanınızda konuşulmayı bekleyen bir konuyu görünür hale getirebilir.",
                        "The %s influence in your relationship area can make an unspoken topic visible."),
                new ThemeCopy("Yakınlığın somutlaştığı gün", "The day closeness gets specific",
                        "%s hareketi, ilişkilerinizde genel iyi niyetten somut bir jeste geçmeyi kolaylaştırabilir.",
                        "The %s movement can make it easier to move from general goodwill to a specific gesture."));
        putTheme(LifeArea.RELATIONSHIP, Tone.CAUTION,
                new ThemeCopy("Yarım kalan bir konuşmanın sınırlarını belirleme", "Setting the scope of an unfinished conversation",
                        "%s etkisi ilişki alanınızda daha önce tamamlanmamış bir konuyu yeniden gündeme getirebilir.",
                        "The %s influence may bring a previously unfinished topic back into your relationship area."),
                new ThemeCopy("Anlamla niyetin ayrıştığı gün", "The day meaning and intent drift apart",
                        "%s etkisi altında söylenenle anlaşılanın birbirinden ayrılma ihtimali artabilir.",
                        "Under the %s influence, what is said and what is understood can drift apart more easily."));

        putTheme(LifeArea.COMMUNICATION, Tone.SUPPORTIVE,
                new ThemeCopy("Net cümlenin işe yaradığı gün", "The day a clear sentence works",
                        "%s etkisi iletişim alanınızda doğrudan ifadeyi kolaylaştırabilir.",
                        "The %s influence can make direct wording easier in your communication area."),
                new ThemeCopy("Askıda kalanı yeniden açma", "Reopening what was left hanging",
                        "%s hareketi, cevapsız kalmış bir konuya geri dönmek için uygun bir aralık açabilir.",
                        "The %s movement can open a workable window for returning to something left unanswered."));
        putTheme(LifeArea.COMMUNICATION, Tone.CAUTION,
                new ThemeCopy("Varsayım üzerinden cevap verme riski", "The risk of answering from assumption",
                        "%s etkisi eksik bilgiyi tamamlanmış gibi okuma eğilimini artırabilir.",
                        "The %s influence can increase the tendency to read incomplete information as complete."),
                new ThemeCopy("Detayın gözden kaçtığı gün", "The day a detail slips past",
                        "%s etkisi altında yazılı bir ayrıntının atlanma ihtimali yükselebilir.",
                        "Under the %s influence, the chance of a written detail being missed can rise."));

        putTheme(LifeArea.WORK, Tone.SUPPORTIVE,
                new ThemeCopy("Kapsamın netleştiği gün", "The day the scope gets clear",
                        "%s etkisi sorumluluk alanınızda beklentileri açık hale getirmeyi kolaylaştırabilir.",
                        "The %s influence can make it easier to state expectations clearly in your area of responsibility."),
                new ThemeCopy("Uzun süredir açık olanı kapatma", "Closing what has stayed open",
                        "%s hareketi, biriken işlerden birini bitirmek için uygun bir gün yaratabilir.",
                        "The %s movement can make today a workable day to finish one accumulated item."));
        putTheme(LifeArea.WORK, Tone.CAUTION,
                new ThemeCopy("Sessizce büyüyen sorumluluk", "A responsibility that quietly grew",
                        "%s etkisi üstlendiğiniz bir işin sınırlarının belirsizleşmesine zemin hazırlayabilir.",
                        "The %s influence can blur the edges of something you already took on."),
                new ThemeCopy("Hızlı evetin maliyeti", "The cost of a fast yes",
                        "%s etkisi altında hemen cevap verme baskısı artabilir.",
                        "Under the %s influence, pressure to answer immediately can increase."));

        putTheme(LifeArea.MONEY, Tone.SUPPORTIVE,
                new ThemeCopy("Rakamın konuşulduğu gün", "The day the number gets named",
                        "%s etkisi maddi konularda açık konuşmayı kolaylaştırabilir.",
                        "The %s influence can make it easier to talk plainly about money."),
                new ThemeCopy("Bekleyen hesabı kapatma", "Closing a pending account",
                        "%s hareketi, ertelenmiş bir maddi konuyu hatırlatmak için uygun bir aralık açabilir.",
                        "The %s movement can open a good window to follow up on a postponed financial matter."));
        putTheme(LifeArea.MONEY, Tone.CAUTION,
                new ThemeCopy("Koşulların okunmadan kabul edilmesi", "Accepting terms unread",
                        "%s etkisi maddi kararlarda ayrıntıyı atlama eğilimini artırabilir.",
                        "The %s influence can increase the tendency to skip the detail in financial decisions."),
                new ThemeCopy("Süreli teklifin baskısı", "The pressure of a limited-time offer",
                        "%s etkisi altında aciliyet hissi gerçek aciliyetten büyük görünebilir.",
                        "Under the %s influence, a sense of urgency can look larger than the actual urgency."));

        putTheme(LifeArea.FAMILY, Tone.SUPPORTIVE,
                new ThemeCopy("Somut yardımın karşılık bulduğu gün", "The day practical help lands",
                        "%s etkisi aile alanınızda pratik desteği daha görünür kılabilir.",
                        "The %s influence can make practical support more visible in your family area."),
                new ThemeCopy("Ertelenen görüşmeyi başlatma", "Starting the postponed conversation",
                        "%s hareketi, ertelediğiniz bir aile konuşması için uygun bir gün açabilir.",
                        "The %s movement can open a workable day for a family conversation you postponed."));
        putTheme(LifeArea.FAMILY, Tone.CAUTION,
                new ThemeCopy("Tekrarlayan konunun aynı yere gelmesi", "A recurring topic circling back",
                        "%s etkisi aile alanınızda eski bir kalıbın yeniden görünmesine zemin hazırlayabilir.",
                        "The %s influence can bring an old pattern back into view in your family area."),
                new ThemeCopy("Aracı rolüne çekilme", "Being pulled into the middle",
                        "%s etkisi altında başkalarının konusunu taşıma ihtimaliniz artabilir.",
                        "Under the %s influence, you may be more likely to end up carrying other people's issue."));

        putTheme(LifeArea.SOCIAL, Tone.SUPPORTIVE,
                new ThemeCopy("Bağlantının tazelendiği gün", "The day a connection refreshes",
                        "%s etkisi sosyal çevrenizde geri dönüş yapmayı kolaylaştırabilir.",
                        "The %s influence can make it easier to reconnect in your social circle."),
                new ThemeCopy("Net cevabın rahatlattığı gün", "The day a clear answer helps",
                        "%s hareketi, belirsiz kalan sosyal planları netleştirmek için uygun olabilir.",
                        "The %s movement can suit clarifying social plans that stayed vague."));
        putTheme(LifeArea.SOCIAL, Tone.CAUTION,
                new ThemeCopy("Eksik bağlamla cevap verme", "Replying without full context",
                        "%s etkisi grup içinde eksik bilgiyle konuşma ihtimalini artırabilir.",
                        "The %s influence can increase the chance of speaking in a group with partial information."),
                new ThemeCopy("Sessizliğin yanlış okunması", "Misreading a silence",
                        "%s etkisi altında gelmeyen cevabı kişisel okuma eğilimi artabilir.",
                        "Under the %s influence, an absent reply can more easily feel personal."));

        putTheme(LifeArea.BOUNDARIES, Tone.SUPPORTIVE,
                new ThemeCopy("Sınırın tek cümleyle söylendiği gün", "The day a limit fits in one sentence",
                        "%s etkisi kendi alanınızı tanımlamayı bugün daha kolay hale getirebilir.",
                        "The %s influence can make defining your own space easier today."),
                new ThemeCopy("Açık döngüyü kapatma", "Closing an open loop",
                        "%s hareketi, sizi meşgul eden bir konuyu sonuçlandırmak için uygun olabilir.",
                        "The %s movement can suit closing out something that has been occupying you."));
        putTheme(LifeArea.BOUNDARIES, Tone.CAUTION,
                new ThemeCopy("Otomatik evetin bedeli", "The cost of an automatic yes",
                        "%s etkisi düşünmeden onaylama eğilimini artırabilir.",
                        "The %s influence can increase the tendency to agree before thinking."),
                new ThemeCopy("Kapsamı büyüyen talep", "A request that keeps growing",
                        "%s etkisi altında küçük başlayan bir isteğin genişlemesi daha olası hale gelebilir.",
                        "Under the %s influence, a request that started small is more likely to expand."));

        putTheme(LifeArea.EMOTIONAL_BALANCE, Tone.SUPPORTIVE,
                new ThemeCopy("Duyguya doğru adı verme", "Naming the feeling accurately",
                        "%s etkisi iç durumunuzu daha net ifade etmenizi kolaylaştırabilir.",
                        "The %s influence can make it easier to describe your inner state precisely."),
                new ThemeCopy("İhtiyacın söylenebildiği gün", "The day a need can be said",
                        "%s hareketi, ne istediğinizi doğrudan söylemek için uygun bir aralık açabilir.",
                        "The %s movement can open a window for saying directly what you need."));
        putTheme(LifeArea.EMOTIONAL_BALANCE, Tone.CAUTION,
                new ThemeCopy("Eski duygunun bugüne karışması", "An old feeling mixing into today",
                        "%s etkisi geçmiş bir deneyimin bugünkü olayla birlikte hissedilmesine yol açabilir.",
                        "The %s influence can cause a past experience to be felt alongside a current event."),
                new ThemeCopy("Yoğunluğun kararı hızlandırması", "Intensity speeding up a decision",
                        "%s etkisi altında duygusal yoğunluk acele bir sonuca dönüşebilir.",
                        "Under the %s influence, emotional intensity can turn into a hasty conclusion."));

        putTheme(LifeArea.DECISION, Tone.SUPPORTIVE,
                new ThemeCopy("Kriterin yazıldığı gün", "The day the criteria get written",
                        "%s etkisi neyin doğru karar sayılacağını tanımlamayı kolaylaştırabilir.",
                        "The %s influence can make it easier to define what counts as the right call."),
                new ThemeCopy("Seçeneklerin daraldığı gün", "The day options narrow",
                        "%s hareketi, dağılmış seçenekleri sadeleştirmek için uygun olabilir.",
                        "The %s movement can suit reducing scattered options."));
        putTheme(LifeArea.DECISION, Tone.CAUTION,
                new ThemeCopy("Eksik bilgiyle karar baskısı", "Deciding with a fact missing",
                        "%s etkisi elinizde olmayan bilgiyi görmezden gelme eğilimini artırabilir.",
                        "The %s influence can increase the tendency to overlook a fact you do not have."),
                new ThemeCopy("Belirsizliği kapatma isteği", "The urge to end uncertainty",
                        "%s etkisi altında karar vermek, doğru karardan çok rahatlama aracı haline gelebilir.",
                        "Under the %s influence, deciding can become a way to relieve discomfort rather than a good call."));

        putTheme(LifeArea.REST, Tone.SUPPORTIVE,
                new ThemeCopy("Aranın planlandığı gün", "The day the break gets planned",
                        "%s etkisi günlük ritminizi yeniden düzenlemek için uygun bir zemin oluşturabilir.",
                        "The %s influence can create workable ground for resetting your daily rhythm."),
                new ThemeCopy("Listenin kısaldığı gün", "The day the list gets shorter",
                        "%s hareketi, yükü bilinçli olarak azaltmak için uygun olabilir.",
                        "The %s movement can suit deliberately reducing your load."));
        putTheme(LifeArea.REST, Tone.CAUTION,
                new ThemeCopy("Yorgunluk sinyalinin ertelenmesi", "Postponing the tiredness signal",
                        "%s etkisi bedenin verdiği sinyali görmezden gelme ihtimalini artırabilir.",
                        "The %s influence can increase the chance of overriding a signal from your body."),
                new ThemeCopy("Boşluğun hemen dolması", "A gap filled immediately",
                        "%s etkisi altında açılan zamanı yeni işle doldurma eğilimi güçlenebilir.",
                        "Under the %s influence, the pull to fill freed-up time with new work can strengthen."));

        putTheme(LifeArea.CREATIVITY, Tone.SUPPORTIVE,
                new ThemeCopy("Ham fikrin değerli olduğu gün", "The day the raw idea counts",
                        "%s etkisi düzeltmeden önce üretmeyi kolaylaştırabilir.",
                        "The %s influence can make it easier to produce before editing."),
                new ThemeCopy("Yarım işin ilerlediği gün", "The day unfinished work moves",
                        "%s hareketi, beklemedeki bir yaratıcı işe dönmek için uygun olabilir.",
                        "The %s movement can suit returning to a creative piece on hold."));
        putTheme(LifeArea.CREATIVITY, Tone.CAUTION,
                new ThemeCopy("Erken yargının işi durdurması", "An early verdict stalling the work",
                        "%s etkisi ilk tepkiye fazla ağırlık verme eğilimini artırabilir.",
                        "The %s influence can increase the tendency to over-weight a first reaction."),
                new ThemeCopy("Detayda kaybolma", "Getting lost in detail",
                        "%s etkisi altında ana hat yerine ayrıntıya odaklanma ihtimali artabilir.",
                        "Under the %s influence, focusing on detail instead of structure becomes more likely."));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Caution card
    // ─────────────────────────────────────────────────────────────────────────

    private void registerCautions() {
        putCautions(LifeArea.RELATIONSHIP,
                of("DONT_PERSONALISE_SILENCE", "short_reply_overread", WORD,
                        "Kısa cevabı ret sanmayın", "A short reply is not a verdict",
                        "Kısa gelen bir cevabı ilgisizlik veya reddedilme olarak okuma eğiliminiz bugün artabilir. Karşılık vermeden önce ne kastedildiğini sorun.",
                        "You may be more likely today to read a short reply as disinterest or rejection. Ask what was meant before you respond."),
                of("PAST_EXAMPLES_PILEUP", "past_examples_pileup", BOND,
                        "Geçmiş örnekleri sıralamayın", "Do not stack past examples",
                        "Bir gerginlikte geçmiş örnekleri arka arkaya sıralama ihtimaliniz bugün yükselebilir. Konuşmayı bugünkü tek olayla sınırlayın.",
                        "In a tense moment you may be more likely to stack up past examples today. Keep the conversation to today's single incident."));
        putCautions(LifeArea.COMMUNICATION,
                of("REQUEST_CLARIFICATION_BEFORE_REACTING", "assumed_meaning", WORD,
                        "Eksik mesajı tamam sanmayın", "An incomplete message is not complete",
                        "Eksik bir mesajı tamamlanmış gibi okuma ihtimaliniz bugün artabilir. Cevap yazmadan önce eksik olan bilgiyi sorun.",
                        "You may be more likely today to read an incomplete message as complete. Ask for the missing piece before replying."),
                of("SET_A_CONCRETE_DATE", "vague_date_slips", DRIVE,
                        "Tarih belirsiz kalabilir", "The date may stay vague",
                        "Konuşulan bir tarihin belirsiz kalması ihtimali bugün yükselebilir. Net günü aynı konuşmada teyit edin.",
                        "A discussed date is more likely to stay vague today. Confirm the exact day in the same conversation."));
        putCautions(LifeArea.WORK,
                of("AUDIT_EXISTING_COMMITMENT", "scope_creep_unnoticed", LIMIT,
                        "Kapsam fark edilmeden büyüyebilir", "The scope may grow unnoticed",
                        "Üstlendiğiniz bir işin kapsamının fark edilmeden büyümesi ihtimali bugün artabilir. Beklenen sonucu yazılı olarak teyit edin.",
                        "The scope of something you took on is more likely to grow unnoticed today. Confirm the expected outcome in writing."),
                of("RESIST_URGENCY_PRESSURE", "instant_yes_pressure", DRIVE,
                        "Hemen cevap verme baskısı", "Pressure for an instant yes",
                        "Hemen cevap verme baskısı bugün artabilir. Süre isteyip ne zaman döneceğinizi söylemek daha güvenli olur.",
                        "Pressure to answer immediately may increase today. Asking for time and naming when you will reply is safer."));
        putCautions(LifeArea.MONEY,
                of("READ_THE_FINE_PRINT", "terms_skipped", WORD,
                        "Koşulun ayrıntısı atlanabilir", "The detail may get skipped",
                        "Bir ödeme veya abonelik koşulunun ayrıntısını atlama ihtimaliniz bugün yükselebilir. İptal ve yenileme maddesini okuyun.",
                        "You may be more likely today to skip the detail of a payment or subscription term. Read the cancellation and renewal clause."),
                of("RESIST_URGENCY_PRESSURE", "urgency_inflated", SCOPE,
                        "Aciliyet olduğundan büyük görünebilir", "Urgency may look larger",
                        "Aciliyet hissi bugün gerçek aciliyetten büyük görünebilir. Teklifin yarın da geçerli olup olmadığını sorun.",
                        "A sense of urgency may look larger than it is today. Ask whether the offer still stands tomorrow."));
        putCautions(LifeArea.FAMILY,
                of("DONT_MEDIATE_FOR_OTHERS", "middle_role", BOND,
                        "Aracı konumuna geçebilirsiniz", "You may end up in the middle",
                        "İki kişi arasında aracı konumuna geçme ihtimaliniz bugün artabilir. Mesaj taşımak yerine doğrudan konuşmalarını önerin.",
                        "You may be more likely to end up as the go-between today. Suggest they speak directly instead of carrying messages."),
                of("INTERRUPT_RECURRING_PATTERN", "old_pattern_repeat", LIMIT,
                        "Konu aynı yere gelebilir", "The topic may circle back",
                        "Tekrarlayan bir konunun aynı noktaya gelmesi ihtimali bugün yükselebilir. Aynı cevabı vermeden önce ne değiştiğini sorun.",
                        "A recurring topic is more likely to circle back to the same point today. Ask what has changed before repeating your usual answer."));
        putCautions(LifeArea.SOCIAL,
                of("READ_FULL_CONTEXT_BEFORE_REPLYING", "partial_context_reply", WORD,
                        "Eksik bağlamla cevap riski", "Replying without full context",
                        "Grup içinde eksik bağlamla cevap verme ihtimaliniz bugün artabilir. Yazmadan önce konuşmanın tamamını okuyun.",
                        "You may be more likely today to reply in a group with partial context. Read the whole thread before writing."),
                of("DONT_PERSONALISE_SILENCE", "silence_personalised", BOND,
                        "Sessizliği kişisel okuma", "Taking silence personally",
                        "Gelmeyen bir cevabı kişisel okuma eğiliminiz bugün güçlenebilir. En son ne konuşulduğuna tekrar bakın.",
                        "You may be more likely to take an absent reply personally today. Look back at what was last said."));
        putCautions(LifeArea.BOUNDARIES,
                of("REVIEW_AUTOMATIC_AGREEMENT", "automatic_yes", DRIVE,
                        "Düşünmeden onaylama riski", "You may agree too fast",
                        "Düşünmeden onaylama ihtimaliniz bugün artabilir. Cevap vermeden önce mevcut sözlerinizi hatırlayın.",
                        "You may be more likely to agree before thinking today. Recall what you have already committed to before answering."),
                of("RESTATE_DECISION_WITHOUT_JUSTIFYING", "no_gets_renegotiated", LIMIT,
                        "Karar yeniden açılabilir", "The decision may be reopened",
                        "Verdiğiniz bir kararın yeniden tartışmaya açılması ihtimali bugün yükselebilir. Gerekçe eklemek yerine kararı aynen tekrar edin.",
                        "A decision you gave is more likely to be reopened today. Repeat it as it was rather than adding justification."));
        putCautions(LifeArea.EMOTIONAL_BALANCE,
                of("SEPARATE_PAST_FROM_PRESENT", "old_feeling_merges", BOND,
                        "Eski duygu bugüne karışabilir", "An old feeling may merge in",
                        "Eski bir duygunun bugünkü olayla karışması ihtimali bugün artabilir. İkisini ayrı ayrı yazmak ayırt etmenizi kolaylaştırır.",
                        "An old feeling is more likely to merge with today's event. Writing them separately makes them easier to tell apart."),
                of("DELAY_REACTIVE_MESSAGE", "reactive_send", DRIVE,
                        "Tepki mesajı gidebilir", "A reactive message may go out",
                        "Yoğunluk anında yazılan bir mesajın gönderilmesi ihtimali bugün yükselebilir. Taslakta bırakıp akşam yeniden okuyun.",
                        "A message written in an intense moment is more likely to get sent today. Leave it in drafts and reread it in the evening."));
        putCautions(LifeArea.DECISION,
                of("IDENTIFY_THE_MISSING_FACT", "missing_fact_ignored", WORD,
                        "Eksik bilgi göz ardı edilebilir", "A missing fact may be ignored",
                        "Elinizde olmayan bir bilgiyi görmezden gelme ihtimaliniz bugün artabilir. Karardan önce eksik olanı adlandırın.",
                        "You may be more likely today to overlook a fact you do not have. Name the missing piece before deciding."),
                of("DONT_DECIDE_TO_END_DISCOMFORT", "decide_to_relieve", SCOPE,
                        "Rahatlamak için karar verme", "Deciding just to feel better",
                        "Belirsizlikten kurtulmak için erken karar verme eğilimi bugün güçlenebilir. Beklemenin maliyetini yazmak bunu dengeler.",
                        "The pull to decide early just to end uncertainty may strengthen today. Writing down the cost of waiting balances it."));
        putCautions(LifeArea.REST,
                of("NOTICE_FATIGUE_SIGNAL", "signal_overridden", LIMIT,
                        "Yorgunluk sinyali ertelenebilir", "The tiredness signal may be overridden",
                        "Yorgunluk sinyalini erteleme ihtimaliniz bugün artabilir. Molanın saatini önceden belirlemek bunu azaltır.",
                        "You may be more likely to override a tiredness signal today. Fixing the break time in advance reduces that."),
                of("DONT_REFILL_FREED_TIME", "gap_refilled", SCOPE,
                        "Boşluk hemen dolabilir", "The gap may fill straight back",
                        "Açılan zamanı hemen doldurma eğilimi bugün güçlenebilir. Bir aralığı bilinçli olarak boş bırakın.",
                        "The pull to refill freed-up time may strengthen today. Deliberately leave one gap empty."));
        putCautions(LifeArea.CREATIVITY,
                of("DISCOUNT_EARLY_FEEDBACK", "early_feedback_overweighted", BOND,
                        "Erken yoruma fazla ağırlık", "Over-weighting early feedback",
                        "Erken bir yoruma fazla ağırlık verme ihtimaliniz bugün artabilir. Yorumu tek bir somut noktaya indirin.",
                        "You may be more likely to over-weight early feedback today. Reduce the comment to one concrete point."),
                of("STRUCTURE_BEFORE_DETAIL", "detail_over_structure", LIMIT,
                        "Ayrıntıda kaybolma riski", "Detail may crowd out structure",
                        "Ana hat yerine ayrıntıya odaklanma ihtimali bugün yükselebilir. Önce yapının doğru olup olmadığını kontrol edin.",
                        "Focusing on detail instead of structure becomes more likely today. Check whether the structure is right first."));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Evening reflection
    // ─────────────────────────────────────────────────────────────────────────

    private void registerReflections() {
        reflections.put(LifeArea.RELATIONSHIP, List.of(
                new ReflectionCopy("Bugün hangi konuşmada söylenenle sizin anladığınız şey birbirinden ayrıldı?",
                        "In which conversation today did what was said and what you understood come apart?"),
                new ReflectionCopy("Bugün karşınızdakinden ne istediğinizi söylemek yerine tahmin edilmesini beklediğiniz bir an oldu mu?",
                        "Was there a moment today when you waited to be guessed instead of saying what you wanted?")));
        reflections.put(LifeArea.COMMUNICATION, List.of(
                new ReflectionCopy("Bugün hangi mesajı, eksik bilgiyle cevaplamak üzereyken durdunuz?",
                        "Which message did you stop yourself from answering today while information was still missing?"),
                new ReflectionCopy("Bugün belirsiz bıraktığınız hangi tarih veya söz hâlâ netleşmedi?",
                        "Which date or promise did you leave vague today that is still unsettled?")));
        reflections.put(LifeArea.WORK, List.of(
                new ReflectionCopy("Bugün üstlendiğiniz hangi işin sınırları hâlâ yazılı değil?",
                        "Which thing you took on today still has no written boundary?"),
                new ReflectionCopy("Bugün hangi talebe, kapasitenizi kontrol etmeden evet dediniz?",
                        "Which request did you say yes to today without checking your capacity?")));
        reflections.put(LifeArea.MONEY, List.of(
                new ReflectionCopy("Bugün hangi tutar veya koşul konuşuldu ama hiçbir yere yazılmadı?",
                        "Which amount or condition was discussed today but never written down?"),
                new ReflectionCopy("Bugün aciliyet hissi bir maddi kararınızı ne kadar hızlandırdı?",
                        "How much did a sense of urgency speed up a financial decision today?")));
        reflections.put(LifeArea.FAMILY, List.of(
                new ReflectionCopy("Bugün ailenizde kimin konusunu, o kişi adına siz taşıdınız?",
                        "Whose issue in your family did you end up carrying on their behalf today?"),
                new ReflectionCopy("Bugün tekrarlayan bir konuda ilk kez farklı bir şey söylediniz mi?",
                        "Did you say anything different for the first time in a recurring family topic today?")));
        reflections.put(LifeArea.SOCIAL, List.of(
                new ReflectionCopy("Bugün gelmeyen bir cevabı ne kadar kendinizle ilgili okudunuz?",
                        "How much did you read an absent reply today as being about you?"),
                new ReflectionCopy("Bugün hangi davete \"belki\" dediniz ve bu belirsizlik kime yük oldu?",
                        "Which invitation did you answer with \"maybe\" today, and who carried that uncertainty?")));
        reflections.put(LifeArea.BOUNDARIES, List.of(
                new ReflectionCopy("Bugün hangi \"olur\" cevabını, vermeden önce düşünmek isterdiniz?",
                        "Which yes today would you have wanted to think about before giving?"),
                new ReflectionCopy("Bugün kararınızı kaç kez açıklamak zorunda hissettiniz?",
                        "How many times today did you feel you had to explain your decision?")));
        reflections.put(LifeArea.EMOTIONAL_BALANCE, List.of(
                new ReflectionCopy("Bugünkü tepkinizin ne kadarı bugünle, ne kadarı daha eski bir şeyle ilgiliydi?",
                        "How much of your reaction today was about today, and how much about something older?"),
                new ReflectionCopy("Bugün duygusal yoğunluk hangi kararınızı hızlandırmaya çalıştı?",
                        "Which decision did emotional intensity try to speed up today?")));
        reflections.put(LifeArea.DECISION, List.of(
                new ReflectionCopy("Bugün karar verirken hâlâ eksik olan bilgi neydi?",
                        "What information was still missing when you decided today?"),
                new ReflectionCopy("Bugün verdiğiniz karar geri dönülebilir mi, yoksa bunu kontrol etmediniz mi?",
                        "Is the decision you made today reversible, or did you not check?")));
        reflections.put(LifeArea.REST, List.of(
                new ReflectionCopy("Bugün yorgunluk sinyalini ilk ne zaman fark ettiniz ve ne yaptınız?",
                        "When did you first notice a tiredness signal today, and what did you do?"),
                new ReflectionCopy("Bugün açılan boş zamanı neyle doldurdunuz?",
                        "What did you fill today's freed-up time with?")));
        reflections.put(LifeArea.CREATIVITY, List.of(
                new ReflectionCopy("Bugün yarım bıraktığınız işi bitmiş bir işle mi karşılaştırdınız?",
                        "Did you compare your unfinished work to something finished today?"),
                new ReflectionCopy("Bugün hangi fikri düzeltmeden önce yazabildiniz?",
                        "Which idea did you manage to write down today before editing it?")));
    }
}
