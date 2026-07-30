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
                        "Yakın olduğunuz birine son günlerde takdir ettiğiniz somut bir davranışı, genel bir iltifat yerine tek bir örnekle söyleyin.",
                        "Tell someone close to you about one specific thing they did recently that you valued — a single example, not a general compliment."),
                of("ASK_WHAT_THEY_NEED", "ask_what_they_need", BOND,
                        "Karşınızdaki kişinin sizden ne beklediğini tahmin etmek yerine doğrudan sorun: şu an ona en çok ne iyi gelir?",
                        "Instead of guessing what the other person expects from you, ask directly: what would actually help them right now?"),
                of("SET_A_CONCRETE_DATE", "propose_concrete_date", DRIVE,
                        "Ertelediğiniz bir görüşme için bugün somut bir gün ve saat önerin; \"yakında buluşalım\" cümlesiyle bırakmayın.",
                        "Propose an actual day and time for a meet-up you have been postponing, instead of leaving it at \"let's catch up soon\"."),
                of("CLARIFY_ONE_EXPECTATION", "clarify_one_expectation", LIMIT,
                        "Uzun süredir belirsiz kalan bir beklentiyi tek cümleyle netleştirin: neyi, ne zamana kadar üstlendiğinizi söyleyin.",
                        "Put one long-unclear expectation into a single sentence: say what you are taking on, and by when."),
                of("REDUCE_SCOPE_TO_FIRST_STEP", "open_only_first_step", SCOPE,
                        "Konuşulmayı bekleyen büyük bir konu varsa bugün tamamını değil, yalnızca ilk adımını konuşmayı önerin.",
                        "If a big unspoken topic is waiting, propose talking through only its first step today rather than the whole thing."),
                // Audience-gated: only surfaced when the profile explicitly states the status.
                of("REBALANCE_SHARED_ROUTINE", "rebalance_shared_routine", PARTNERED, BOND,
                        "Paylaştığınız bir rutinde bugün kimin neyi üstlendiğini konuşun; alışkanlık hâline gelmiş dağılımı tek cümleyle gözden geçirin.",
                        "Talk today about who currently carries what in a routine you share, and review the habitual split in one sentence."),
                of("PRIORITISE_YOUR_OWN_PLAN", "choose_your_own_plan_first", SINGLE, DRIVE,
                        "Bugün kendi planınızı başkalarının programına göre şekillendirmeden önce kesinleştirin.",
                        "Lock in your own plan today before shaping it around anyone else's schedule."));

        put(LifeArea.RELATIONSHIP, Tone.CAUTION,
                of("REQUEST_CLARIFICATION_BEFORE_REACTING", "ask_before_interpreting", WORD,
                        "Bugün gelen kısa ya da geç bir mesajı yorumlamadan önce ne kastedildiğini sorun; cevabınızı varsayımın üzerine kurmayın.",
                        "Before you interpret a short or delayed message today, ask what was meant — do not build your reply on the assumption."),
                of("DONT_PERSONALISE_SILENCE", "check_their_day_first", BOND,
                        "Karşınızdaki kişinin bugünkü mesafesini kişisel bir işaret olarak okumadan önce, gününde ne olduğunu sorun.",
                        "Before reading someone's distance today as being about you, ask what their day has been like."),
                of("LIMIT_TO_SINGLE_ISSUE", "name_single_behaviour", DRIVE,
                        "Bir gerginlik başlarsa geçmişteki bütün örnekleri sıralamak yerine yalnızca bugün sizi rahatsız eden tek davranışı adlandırın.",
                        "If tension starts, name only the single behaviour that bothered you today instead of listing every past example."),
                of("AVOID_ABSOLUTE_LANGUAGE", "avoid_absolute_sentences", LIMIT,
                        "Bugün \"hiçbir zaman\" veya \"her zaman\" ile başlayan kesin cümlelerden kaçının; konuşmayı tek bir olayla sınırlayın.",
                        "Avoid sentences that start with \"you never\" or \"you always\" today; keep the conversation to one specific incident."),
                of("HOLD_DECISION_OVERNIGHT", "delay_big_relationship_call", SCOPE,
                        "İlişkiye dair büyük bir kararı tek bir konuşmanın duygusuyla vermeyin; kararı yazın ve en az bir gün bekletin.",
                        "Do not settle a big relationship decision on the feeling of one conversation; write it down and leave it at least a day."));

        put(LifeArea.COMMUNICATION, Tone.SUPPORTIVE,
                of("LEAD_WITH_THE_ASK", "write_the_ask_explicitly", WORD,
                        "Bugün yazacağınız önemli bir mesajda ne istediğinizi ilk cümlede yazın; açıklamayı arkasına bırakın.",
                        "In an important message today, put what you are asking for in the first sentence and leave the explanation after it."),
                of("RESTATE_BEFORE_REPLYING", "restate_before_replying", BOND,
                        "Uzun bir konuşmada cevap vermeden önce duyduğunuzu kendi cümlenizle özetleyip doğrulatın.",
                        "In a long conversation, summarise what you heard in your own words and have it confirmed before you reply."),
                of("REOPEN_STALLED_THREAD", "reopen_stalled_thread", DRIVE,
                        "Cevapsız kalmış bir konuyu bugün tek soruyla yeniden açın: hangi noktada kaldığını sorun.",
                        "Reopen a thread that went quiet with a single question: ask which point it stalled at."),
                of("CONFIRM_TERMS_IN_WRITING", "put_agreement_in_writing", LIMIT,
                        "Sözlü olarak anlaştığınız bir konuyu bugün iki satırla yazılı hale getirin ve karşı tarafa onaylatın.",
                        "Put something you agreed verbally into two written lines today and have the other side confirm it."),
                of("HANDLE_ONE_TOPIC_AT_A_TIME", "split_message_into_topics", SCOPE,
                        "Birden fazla konuyu tek mesaja sıkıştırmak yerine, en önemli konuyu ayrı bir mesajda gönderin.",
                        "Rather than compressing several topics into one message, send the most important one on its own."));

        put(LifeArea.COMMUNICATION, Tone.CAUTION,
                of("VERIFY_WITH_ORIGINAL_SOURCE", "verify_before_forwarding", WORD,
                        "Bugün ikinci elden duyduğunuz bir bilgiyi iletmeden önce kaynağına doğrulatın.",
                        "Before you pass on something you heard second-hand today, verify it with the original source."),
                of("DELAY_REACTIVE_MESSAGE", "wait_before_reactive_reply", BOND,
                        "Sizi rahatsız eden bir mesaja cevabı yazın ama göndermeden önce en az bir saat bekletin.",
                        "Write your reply to a message that bothered you, but hold it for at least an hour before sending."),
                of("SET_A_CONCRETE_DATE", "confirm_deadline_wording", DRIVE,
                        "Bugün konuşulan bir tarihin \"bu hafta\" gibi belirsiz kalmasına izin vermeyin; net günü teyit edin.",
                        "Do not let a date discussed today stay vague like \"this week\" — confirm the exact day."),
                of("AVOID_FINAL_WORDING", "avoid_final_wording_in_text", LIMIT,
                        "Yazılı iletişimde bugün son sözü söyleyen cümleler kurmaktan kaçının; sorunuzu açık uçlu bırakın.",
                        "Avoid writing final-sounding sentences today; keep your question open-ended."),
                of("REDUCE_INPUT_LOAD", "reduce_parallel_threads", SCOPE,
                        "Aynı konuyu üç ayrı kanaldan yürütmek yerine bugün tek kanalda toplayın ve diğerlerinde bunu belirtin.",
                        "Instead of running the same topic across three channels, consolidate it into one today and say so in the others."));

        put(LifeArea.WORK, Tone.SUPPORTIVE,
                of("CONFIRM_TERMS_IN_WRITING", "write_down_scope_before_accepting", WORD,
                        "Sizden beklenen yeni bir sorumluluğu kabul etmeden önce teslim zamanını ve beklenen sonucu yazılı olarak netleştirin.",
                        "Before accepting a new responsibility, get the delivery time and expected outcome stated in writing."),
                of("CLARIFY_SUCCESS_DEFINITION", "ask_for_the_success_criteria", BOND,
                        "Üstlendiğiniz bir işin \"tamamlandı\" sayılması için hangi koşulun gerektiğini bugün açıkça sorun.",
                        "Ask explicitly today what condition has to be met for something you took on to count as finished."),
                of("FINISH_OLDEST_OPEN_ITEM", "close_the_oldest_open_item", DRIVE,
                        "Listenizde en uzun süredir açık duran maddeyi bugün bitirin; yenisini eklemeden önce onu kapatın.",
                        "Finish the item that has been open longest on your list today, and close it before adding anything new."),
                of("DECLINE_WITH_CONCRETE_ALTERNATIVE", "decline_with_alternative", LIMIT,
                        "Bugün kapasitenizi aşan bir talebe \"hayır\" derken hangi tarihte yapabileceğinizi de söyleyin.",
                        "When you turn down a request beyond your capacity today, also state the date on which you could do it."),
                of("REDUCE_SCOPE_TO_FIRST_STEP", "break_large_item_into_two", SCOPE,
                        "Kapsamı büyümüş bir işi bugün ikiye bölün ve yalnızca ilk parçasına tarih verin.",
                        "Split one item whose scope has grown into two today, and commit a date only to the first half."));

        put(LifeArea.WORK, Tone.CAUTION,
                of("CONFIRM_TERMS_IN_WRITING", "request_written_terms", WORD,
                        "Bugün size sunulan bir sorumluluk veya koşula aynı konuşmada cevap vermeyin; önce şartların yazılı halini isteyin.",
                        "Do not answer a responsibility or condition put to you today in the same conversation; ask for the terms in writing first."),
                of("CLARIFY_SUCCESS_DEFINITION", "confirm_who_decides", BOND,
                        "Bir konuda son kararı kimin verdiği belirsizse, ilerlemeden önce bunu açıkça sorun.",
                        "If it is unclear who makes the final call on something, ask that explicitly before moving forward."),
                of("RESIST_URGENCY_PRESSURE", "avoid_same_day_commitment", DRIVE,
                        "Bugün istenen bir teslim tarihine anında evet demek yerine, önce mevcut yükünüzü gözden geçirip akşam cevap verin.",
                        "Rather than saying yes immediately to a deadline requested today, review your current load and answer in the evening."),
                of("AUDIT_EXISTING_COMMITMENT", "check_what_you_signed_up_for", LIMIT,
                        "Uzun süredir devam eden bir sorumluluğun kapsamının sessizce büyüyüp büyümediğini bugün yazılı olarak kontrol edin.",
                        "Check in writing today whether a long-running responsibility has quietly grown beyond what you agreed."),
                of("REDUCE_SCOPE_TO_FIRST_STEP", "postpone_scope_expansion", SCOPE,
                        "Bugün gündeme gelen kapsam genişletme fikrine karar vermeden önce mevcut işin bitiş tarihini teyit edin.",
                        "Before deciding on a scope expansion raised today, confirm the finish date of what is already underway."));

        put(LifeArea.MONEY, Tone.SUPPORTIVE,
                of("READ_THE_FINE_PRINT", "read_the_terms_line", WORD,
                        "Bugün karşınıza çıkan bir ödeme veya abonelik koşulunun iptal ve yenileme maddesini okuyun.",
                        "Read the cancellation and renewal clause of any payment or subscription term you come across today."),
                of("SPLIT_SHARED_COST_EXPLICITLY", "name_the_shared_cost", BOND,
                        "Paylaşılan bir masrafta kimin neyi üstlendiğini bugün rakamla yazın; \"sonra hesaplaşırız\" demeyin.",
                        "Write down with actual numbers who covers what in a shared cost today, instead of \"we'll settle later\"."),
                of("FOLLOW_UP_PENDING_AMOUNT", "collect_one_pending_amount", DRIVE,
                        "Uzun süredir beklettiğiniz bir alacağı veya iadeyi bugün tek mesajla hatırlatın.",
                        "Send one message today about an amount owed to you or a refund you have been postponing."),
                of("SET_SPENDING_CEILING", "set_a_ceiling_before_buying", LIMIT,
                        "Bugün düşündüğünüz bir harcama için üst sınırı satın almadan önce yazın ve o rakamın üstüne çıkmayın.",
                        "Write down the ceiling for a purchase you are considering today before you buy, and stay under it."),
                of("ITEMISE_BUNDLED_OFFER", "delay_bundled_offer", SCOPE,
                        "Bugün gelen paket veya kampanya teklifini kabul etmeden önce tek tek neyi ödediğinizi listeleyin.",
                        "Before accepting a bundled offer today, list item by item what you would actually be paying for."));

        put(LifeArea.MONEY, Tone.CAUTION,
                of("CONFIRM_TERMS_IN_WRITING", "verify_amount_in_writing", WORD,
                        "Bugün sözlü olarak konuşulan bir tutarı işleme koymadan önce yazılı teyidini isteyin.",
                        "Ask for written confirmation of any amount discussed verbally today before acting on it."),
                of("SPLIT_SHARED_COST_EXPLICITLY", "separate_favor_from_money", BOND,
                        "Yakın birine para veya kaynak konusunda destek olacaksanız, tutarı ve geri dönüş zamanını bugün açıkça konuşun.",
                        "If you are helping someone close with money or resources, agree the amount and the return timing openly today."),
                of("RESIST_URGENCY_PRESSURE", "avoid_impulse_commitment", DRIVE,
                        "Bugün süreli olduğu söylenen bir teklife anında karar vermeyin; teklifin yarın da geçerli olup olmadığını sorun.",
                        "Do not decide immediately on an offer presented as time-limited today; ask whether it still stands tomorrow."),
                of("REVIEW_RECURRING_CHARGES", "review_recurring_charges", LIMIT,
                        "Otomatik yenilenen ödemelerinizden birini bugün kontrol edin ve hâlâ kullanıp kullanmadığınıza karar verin.",
                        "Check one of your auto-renewing payments today and decide whether you still use it."),
                of("HOLD_DECISION_OVERNIGHT", "hold_large_decision_overnight", SCOPE,
                        "Büyük bir maddi kararı bugünkü ruh haliyle kapatmayın; sayıları yazıp kararı yarına bırakın.",
                        "Do not close a large financial decision on today's mood; write the numbers down and leave the decision to tomorrow."));

        put(LifeArea.FAMILY, Tone.SUPPORTIVE,
                of("ASK_WHAT_THEY_NEED", "ask_one_direct_question", WORD,
                        "Ailenizden biriyle bugün genel bir \"nasılsın\" yerine tek ve somut bir soru sorun.",
                        "Ask one specific question of a family member today instead of a general \"how are you\"."),
                of("OFFER_CONCRETE_HELP", "offer_practical_help", BOND,
                        "Bir aile üyesine bugün soyut destek yerine somut bir yardım önerin: hangi işi, ne zaman devralacağınızı söyleyin.",
                        "Offer a family member concrete help today rather than abstract support: name the task and when you will take it on."),
                of("REOPEN_STALLED_THREAD", "initiate_postponed_call", DRIVE,
                        "Uzun süredir ertelediğiniz bir aile görüşmesini bugün başlatın ve süresini baştan belirleyin.",
                        "Start the family conversation you have been postponing today, and agree its length up front."),
                of("STATE_CAPACITY_UPFRONT", "state_your_availability", LIMIT,
                        "Ailenizden gelen bir talebe bugün ne kadar zaman ayırabileceğinizi baştan söyleyin.",
                        "State up front today how much time you can give to a request coming from your family."),
                of("HANDLE_ONE_TOPIC_AT_A_TIME", "separate_two_family_topics", SCOPE,
                        "İki ayrı aile konusunu tek konuşmada birleştirmek yerine bugün yalnızca birini ele alın.",
                        "Rather than merging two separate family topics into one conversation, take on only one of them today."));

        put(LifeArea.FAMILY, Tone.CAUTION,
                of("DONT_MEDIATE_FOR_OTHERS", "dont_relay_between_people", WORD,
                        "Bugün iki aile üyesi arasında mesaj taşımak yerine, ilgili kişinin doğrudan konuşmasını önerin.",
                        "Rather than carrying messages between two family members today, suggest they speak directly."),
                of("INTERRUPT_RECURRING_PATTERN", "pause_before_old_topic", BOND,
                        "Tekrarlayan bir aile konusu açıldığında bugün aynı cevabı vermeden önce ne değiştiğini sorun.",
                        "When a recurring family topic comes up today, ask what has changed before giving your usual answer."),
                of("DONT_DECIDE_FOR_OTHERS", "avoid_deciding_for_others", DRIVE,
                        "Bugün bir aile bireyinin yerine karar vermek yerine, seçeneği ona iletip tercihini sorun.",
                        "Instead of deciding on a family member's behalf today, put the option to them and ask what they prefer.")
                ,
                of("SET_AN_END_TIME", "set_end_time_for_visit", LIMIT,
                        "Bugünkü bir aile buluşmasının bitiş saatini baştan söyleyin; sonradan açıklamak zorunda kalmayın.",
                        "Say the end time of a family gathering at the start today, so you do not have to justify it later."),
                of("DONT_SETTLE_OLD_MATTER_TODAY", "dont_settle_old_matter_today", SCOPE,
                        "Yıllardır çözülmemiş bir aile meselesini bugünkü tek konuşmayla kapatmayı hedeflemeyin.",
                        "Do not aim to close a years-old family matter in a single conversation today."));

        put(LifeArea.SOCIAL, Tone.SUPPORTIVE,
                of("REOPEN_STALLED_THREAD", "reply_to_one_old_message", WORD,
                        "Cevapsız bıraktığınız bir mesaja bugün kısa da olsa dönüş yapın ve gecikmeyi açıklamayın.",
                        "Reply today to one message you left unanswered — briefly is fine, and skip explaining the delay."),
                of("GIVE_A_CLEAR_ANSWER", "accept_one_invitation", BOND,
                        "Bugün gelen bir davete karar verirken \"belki\" demek yerine net bir evet veya hayır verin.",
                        "When responding to an invitation today, give a clear yes or no rather than \"maybe\"."),
                of("INTRODUCE_TWO_PEOPLE", "introduce_two_people", DRIVE,
                        "Birbirine faydası olabilecek iki kişiyi bugün tanıştırın ve neden tanıştırdığınızı tek cümleyle yazın.",
                        "Introduce two people who could be useful to each other today, and say in one sentence why."),
                of("EXIT_THREAD_EXPLICITLY", "leave_group_thread_cleanly", LIMIT,
                        "Artık takip etmediğiniz bir grup sohbetinden bugün sessizce değil, tek cümlelik bir notla ayrılın.",
                        "Leave a group thread you no longer follow with a one-line note today rather than silently."),
                of("NARROW_THE_OPTIONS", "commit_to_one_plan_only", SCOPE,
                        "Bu haftaya birden fazla sosyal plan yığıldıysa bugün yalnızca birini kesinleştirin.",
                        "If several social plans have piled up this week, confirm only one of them today."));

        put(LifeArea.SOCIAL, Tone.CAUTION,
                of("READ_FULL_CONTEXT_BEFORE_REPLYING", "check_group_context_first", WORD,
                        "Bir grup sohbetinde bugün konuşmanın tamamını okumadan cevap yazmayın.",
                        "Do not reply in a group thread today before reading the whole conversation."),
                of("DONT_PERSONALISE_SILENCE", "dont_read_silence_as_rejection", BOND,
                        "Bugün gelmeyen bir cevabı ilgisizlik olarak okumadan önce, en son ne konuşulduğunu tekrar bakın.",
                        "Before reading a missing reply today as disinterest, look back at what was last said."),
                of("CORRECT_PRIVATELY", "avoid_public_correction", DRIVE,
                        "Bugün bir kişiyi grup içinde düzeltmek yerine, aynı şeyi özelde tek cümleyle söyleyin.",
                        "Instead of correcting someone in a group today, say the same thing privately in one sentence."),
                of("RESTATE_DECISION_WITHOUT_JUSTIFYING", "say_no_without_backstory", LIMIT,
                        "Katılamayacağınız bir plana bugün uzun gerekçe üretmeden kısa ve net cevap verin.",
                        "Give a short, clear answer to a plan you cannot join today, without constructing a long justification."),
                of("REVIEW_AUTOMATIC_AGREEMENT", "dont_overpromise_in_group", SCOPE,
                        "Bugün grup içinde heyecanla verilen bir sözü kesinleştirmeden önce takviminizi kontrol edin.",
                        "Check your calendar before firming up a promise made enthusiastically in a group today."));

        put(LifeArea.BOUNDARIES, Tone.SUPPORTIVE,
                of("STATE_THE_LIMIT_PLAINLY", "say_the_limit_in_one_line", WORD,
                        "Bugün rahatsız olduğunuz bir durumu tek cümlede söyleyin: neyin size uymadığını ve neyi tercih ettiğinizi.",
                        "Say a situation that does not sit well with you in one sentence today: what does not work, and what you would prefer."),
                of("STATE_CAPACITY_UPFRONT", "name_your_capacity", BOND,
                        "Size yöneltilen bir talebe bugün cevap verirken önce ne kadar enerjiniz olduğunu açıkça söyleyin.",
                        "When answering a request today, first say plainly how much capacity you actually have."),
                of("FINISH_OLDEST_OPEN_ITEM", "close_one_open_loop", DRIVE,
                        "Uzun süredir sizi meşgul eden bir konuyu bugün ya bitirin ya da açıkça ertelediğinizi bildirin.",
                        "Either finish a matter that has been occupying you or explicitly tell the other side you are postponing it today."),
                of("PROTECT_A_TIME_BLOCK", "protect_one_time_block", LIMIT,
                        "Bugün bir saatlik bir aralığı kimseye vermeyin ve bunu takviminizde görünür şekilde işaretleyin.",
                        "Keep a one-hour block for yourself today and mark it visibly in your calendar."),
                of("DECLINE_WITH_CONCRETE_ALTERNATIVE", "decline_expanding_request", SCOPE,
                        "Başta küçük görünüp büyüyen bir talebi bugün ilk haline geri getirmeyi önerin.",
                        "Propose bringing a request that started small and kept growing back to its original scope today."));

        put(LifeArea.BOUNDARIES, Tone.CAUTION,
                of("RESTATE_DECISION_WITHOUT_JUSTIFYING", "dont_explain_twice", WORD,
                        "Bugün verdiğiniz bir cevabı ikinci kez açıklamak zorunda hissetmeyin; ilk cümlenizi tekrar edin.",
                        "Do not feel obliged to explain an answer twice today; simply repeat your first sentence."),
                of("REVIEW_AUTOMATIC_AGREEMENT", "notice_the_yes_you_regret", BOND,
                        "Bugün otomatik olarak \"olur\" dediğiniz bir şey olursa, aynı gün içinde koşullarını yeniden konuşun.",
                        "If you say yes automatically to something today, revisit its conditions the same day."),
                of("DONT_TAKE_OVER_OTHERS_TASK", "avoid_taking_over_task", DRIVE,
                        "Bugün başkasının sorumluluğundaki bir işi devralmadan önce, gerçekten sizden mi istendiğini sorun.",
                        "Before taking over something that belongs to someone else today, ask whether it was actually asked of you."),
                of("DONT_NEGOTIATE_YOUR_NO", "dont_negotiate_your_no", LIMIT,
                        "Verdiğiniz bir \"hayır\" bugün tartışmaya açılırsa, gerekçe eklemek yerine kararınızı aynen tekrar edin.",
                        "If a \"no\" you gave is reopened today, repeat the decision as-is rather than adding more justification."),
                of("STATE_CAPACITY_UPFRONT", "limit_new_commitments_today", SCOPE,
                        "Bugün gelen yeni bir talebe cevabınızı mevcut sözlerinizi listeledikten sonra verin.",
                        "Answer any new request that arrives today only after listing what you have already committed to."));

        put(LifeArea.EMOTIONAL_BALANCE, Tone.SUPPORTIVE,
                of("NAME_THE_FEELING_PRECISELY", "name_the_feeling_precisely", WORD,
                        "Bugün hissettiğiniz şeyi \"iyi\" veya \"kötü\" yerine tek ve kesin bir kelimeyle adlandırıp yazın.",
                        "Write down what you feel today with one precise word instead of \"good\" or \"bad\"."),
                of("ASK_WHAT_THEY_NEED", "tell_one_person_what_you_need", BOND,
                        "Size iyi gelecek şeyi bugün bir kişiye somut olarak söyleyin: dinlemesini mi, fikir vermesini mi istiyorsunuz?",
                        "Tell one person concretely what would help today: do you want them to listen, or to give an opinion?"),
                of("REGULATE_BEFORE_HARD_CONVERSATION", "move_before_the_conversation", DRIVE,
                        "Zorlanacağınızı bildiğiniz bir konuşmadan önce bugün on dakika yürüyün ve konuşmaya oradan gidin.",
                        "Take a ten-minute walk before a conversation you expect to be hard today, and go into it from there."),
                of("RECORD_THE_TRIGGER", "write_the_trigger_down", LIMIT,
                        "Bugün tepkinizin sertleştiği anı fark ederseniz, o anda ne söylendiğini birebir not edin.",
                        "If you notice your reaction hardening today, note down exactly what was said at that moment."),
                of("REDUCE_INPUT_LOAD", "shorten_the_input", SCOPE,
                        "Bugün duygusal yükü artıran bir içerik akışını iki saat kapatın ve bu aralığı önceden belirleyin.",
                        "Close off a content feed that adds emotional load for two hours today, and decide that window in advance."));

        put(LifeArea.EMOTIONAL_BALANCE, Tone.CAUTION,
                of("DONT_GENERALISE_FROM_TODAY", "dont_conclude_from_today", WORD,
                        "Bugünkü ruh halinizden yola çıkarak bir ilişki ya da durum hakkında genel bir sonuç yazmayın.",
                        "Do not draw a general conclusion about a relationship or situation from today's mood."),
                of("SEPARATE_PAST_FROM_PRESENT", "separate_memory_from_now", BOND,
                        "Bugün canlanan eski bir duygu varsa, bunun şu anki olayla ne kadar ilgili olduğunu ayrı ayrı yazın.",
                        "If an old feeling surfaces today, write separately how much of it belongs to the current event."),
                of("DELAY_REACTIVE_MESSAGE", "delay_reactive_message", DRIVE,
                        "Duygusal yoğunlukta yazdığınız bir mesajı bugün göndermeden önce taslakta bırakın ve akşam yeniden okuyun.",
                        "Leave a message written under emotional intensity in drafts today and reread it in the evening."),
                of("AVOID_ALL_OR_NOTHING_FRAME", "avoid_all_or_nothing_frame", LIMIT,
                        "Bugün bir durumu \"ya hep ya hiç\" olarak çerçevelediğinizi fark ederseniz, üçüncü bir seçenek yazın.",
                        "If you notice yourself framing something as all-or-nothing today, write down a third option."),
                of("DONT_STACK_HARD_CONVERSATIONS", "dont_stack_hard_conversations", SCOPE,
                        "Bugün birden fazla zor konuşmayı aynı saatlere yığmayın; birini başka bir güne alın.",
                        "Do not stack several difficult conversations into the same hours today; move one to another day."));

        put(LifeArea.DECISION, Tone.SUPPORTIVE,
                of("WRITE_DECISION_CRITERIA", "write_the_decision_criteria", WORD,
                        "Bugün vereceğiniz kararın hangi koşulda doğru sayılacağını karardan önce yazın.",
                        "Before making a decision today, write down the condition under which it would count as the right one."),
                of("SEEK_DISSENTING_VIEW", "ask_one_person_who_disagrees", BOND,
                        "Kararınızı bugün size katılmayacağını düşündüğünüz bir kişiye anlatın ve itirazını dinleyin.",
                        "Explain your decision today to someone you expect to disagree, and listen to their objection."),
                of("SET_A_CONCRETE_DATE", "set_a_decision_deadline", DRIVE,
                        "Uzun süredir askıda olan bir konuya bugün karar tarihi verin; kararı değil, tarihi bugün kesinleştirin.",
                        "Give a long-pending matter a decision date today — fix the date now, not the decision."),
                of("LIST_WHAT_YOU_GIVE_UP", "list_what_you_give_up", LIMIT,
                        "Bugünkü seçeneğin size ne kazandırdığını değil, neyi bıraktırdığını da yazın.",
                        "Write down not only what today's option gains you, but also what it makes you give up."),
                of("NARROW_THE_OPTIONS", "reduce_options_to_two", SCOPE,
                        "Elinizdeki seçenekleri bugün ikiye indirin ve elediklerinizi neden elediğinizi tek satırla not edin.",
                        "Narrow your options down to two today and note in one line why you dropped the rest."));

        put(LifeArea.DECISION, Tone.CAUTION,
                of("IDENTIFY_THE_MISSING_FACT", "get_the_missing_fact", WORD,
                        "Kararı vermeden önce bugün hâlâ bilmediğiniz tek bilgiyi belirleyin ve onu sorun.",
                        "Identify the one fact you still do not have before deciding today, and go ask for it."),
                of("DONT_DECIDE_TO_END_DISCOMFORT", "dont_decide_to_end_discomfort", BOND,
                        "Bugün bir kararı yalnızca belirsizlik rahatsız ettiği için kapatmayın; kararı beklemenin maliyetini yazın.",
                        "Do not close a decision today merely because the uncertainty is uncomfortable; write down the cost of waiting."),
                of("RESIST_URGENCY_PRESSURE", "avoid_deciding_under_pressure", DRIVE,
                        "Bugün hızlı cevap beklenen bir konuda süre isteyin ve ne zaman döneceğinizi söyleyin.",
                        "Ask for time on something where a fast answer is expected today, and say when you will come back."),
                of("CHECK_REVERSIBILITY", "check_reversibility", LIMIT,
                        "Bugünkü kararın geri dönülebilir olup olmadığını kontrol edin; geri dönülemezse bir gün bekletin.",
                        "Check whether today's decision is reversible; if it is not, hold it for a day."),
                of("HANDLE_ONE_TOPIC_AT_A_TIME", "dont_bundle_decisions", SCOPE,
                        "Bugün birbirine bağlı görünen iki kararı ayırın ve yalnızca bağımsız olanı verin.",
                        "Separate two decisions that look linked today, and make only the independent one."));

        put(LifeArea.REST, Tone.SUPPORTIVE,
                of("PROTECT_A_TIME_BLOCK", "schedule_the_break", WORD,
                        "Bugünkü molanızın saatini önceden yazın; \"fırsat bulunca\" bırakmayın.",
                        "Write down the time of your break today rather than leaving it to \"when I get a chance\"."),
                of("NOTICE_FATIGUE_SIGNAL", "choose_recovery_over_scroll", BOND,
                        "Bugün yorgun hissettiğiniz anda ekran yerine on dakikalık sessiz bir ara seçin.",
                        "When you feel tired today, choose ten quiet minutes over a screen."),
                of("DEFER_ONE_TASK", "move_one_task_to_tomorrow", DRIVE,
                        "Bugünkü listenizden bir maddeyi bilinçli olarak yarına taşıyın ve bunu not edin.",
                        "Deliberately move one item from today's list to tomorrow and write that down."),
                of("PROTECT_SLEEP_WINDOW", "protect_sleep_window", LIMIT,
                        "Bugün yatma saatinizi bir saat önceden belirleyin ve o saatte hangi işi bırakacağınızı yazın.",
                        "Set your bedtime an hour in advance today and note which task you will drop at that point."),
                of("NARROW_THE_OPTIONS", "shorten_the_evening_list", SCOPE,
                        "Akşam için planladığınız listeyi bugün yarıya indirin ve kalanını yazılı olarak erteleyin.",
                        "Halve the list you planned for this evening and postpone the rest in writing."));

        put(LifeArea.REST, Tone.CAUTION,
                of("NOTICE_FATIGUE_SIGNAL", "notice_the_missed_signal", WORD,
                        "Bugün yorgunluk sinyalini ertelediğiniz anı fark edin ve o anda ne yapıyor olduğunuzu not edin.",
                        "Notice the moment you postpone a tiredness signal today and note what you were doing."),
                of("DONT_REFILL_FREED_TIME", "dont_fill_the_gap", BOND,
                        "Bugün boşalan bir zaman aralığını hemen yeni bir işle doldurmayın; olduğu gibi bırakın.",
                        "Do not immediately fill a gap that opens in your day today; leave it as it is."),
                of("DEFER_ONE_TASK", "avoid_late_start", DRIVE,
                        "Bugün geç saatte yeni bir işe başlamak yerine, başlangıcını yarın sabaha yazın.",
                        "Rather than starting something new late today, schedule its start for tomorrow morning."),
                of("REGULATE_BEFORE_HARD_CONVERSATION", "limit_stimulants_before_talk", LIMIT,
                        "Zorlu bir konuşmadan önce bugün uyarıcı tüketimini artırmayın; konuşmayı daha erken saate alın.",
                        "Do not increase stimulants before a demanding conversation today; move the conversation earlier instead."),
                of("DONT_COMPRESS_RECOVERY", "dont_compress_recovery", SCOPE,
                        "Bugün dinlenmeyi günün sonuna sıkıştırmak yerine, güne bir ara ekleyin.",
                        "Rather than compressing recovery into the end of the day, add one break inside the day."));

        put(LifeArea.CREATIVITY, Tone.SUPPORTIVE,
                of("CAPTURE_RAW_IDEA", "capture_the_raw_idea", WORD,
                        "Bugün aklınıza gelen fikri düzeltmeden, geldiği haliyle yazın; düzenlemeyi yarına bırakın.",
                        "Write down the idea that comes to you today exactly as it arrives, and leave editing to tomorrow."),
                of("SHOW_UNFINISHED_WORK", "show_the_unfinished_version", BOND,
                        "Yarım kalmış bir işinizi bugün tek bir kişiye tamamlanmamış haliyle gösterin.",
                        "Show one unfinished piece of your work to a single person today, in its unfinished state."),
                of("TIMEBOX_THE_WORK", "give_it_thirty_minutes", DRIVE,
                        "Ertelediğiniz yaratıcı işe bugün otuz dakika verin ve bitmesini beklemeden bırakın.",
                        "Give the creative work you keep postponing thirty minutes today and stop without finishing it."),
                of("CUT_ONE_ELEMENT", "cut_one_element", LIMIT,
                        "Üzerinde çalıştığınız işten bugün bir öğeyi çıkarın ve çıkardıktan sonra tekrar bakın.",
                        "Remove one element from what you are working on today and look at it again afterwards."),
                of("TRY_DIFFERENT_FORMAT", "try_a_different_format", SCOPE,
                        "Aynı fikri bugün farklı bir biçimde ifade edin: yazdıysanız çizin, çizdiyseniz anlatın.",
                        "Express the same idea in a different format today: if you wrote it, sketch it; if you sketched it, say it out loud."));

        put(LifeArea.CREATIVITY, Tone.CAUTION,
                of("HOLD_FIRST_DRAFT", "dont_publish_first_draft", WORD,
                        "Bugün ilk halinden memnun olduğunuz bir işi hemen paylaşmayın; akşam bir kez daha okuyun.",
                        "Do not share work you are pleased with on first draft today; read it once more in the evening."),
                of("DISCOUNT_EARLY_FEEDBACK", "ignore_the_early_verdict", BOND,
                        "Bugün aldığınız erken bir yorumla işin tamamını değiştirmeyin; yorumu tek bir noktaya indirgeyin.",
                        "Do not rewrite everything based on early feedback today; reduce the comment to one specific point."),
                of("FINISH_OLDEST_OPEN_ITEM", "avoid_starting_third_thing", DRIVE,
                        "Bugün açık duran iki yaratıcı işten birine tarih verin; üçüncüsünü başlatmadan önce bunu yapın.",
                        "Give one of your two open creative pieces a date today, before starting a third."),
                of("STRUCTURE_BEFORE_DETAIL", "stop_polishing_details", LIMIT,
                        "Bugün ayrıntıları düzeltmeye devam etmek yerine, işin ana hattının doğru olup olmadığını kontrol edin.",
                        "Rather than continuing to polish details today, check whether the main structure is right."),
                of("DONT_COMPARE_TO_FINISHED_WORK", "dont_compare_to_finished_work", SCOPE,
                        "Bugün yarım işinizi başkalarının bitmiş işleriyle karşılaştırmayın; kendi son sürümünüzle karşılaştırın.",
                        "Do not compare your unfinished work to other people's finished work today; compare it to your own last version."));
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
                        "Kısa gelen bir cevabı ilgisizlik veya reddedilme olarak yorumlama eğiliminiz artabilir. Karşılık vermeden önce neyin kastedildiğini sorun.",
                        "You may be more likely to read a short reply as disinterest or rejection. Ask what was meant before you respond."),
                of("PAST_EXAMPLES_PILEUP", "past_examples_pileup", BOND,
                        "Bir gerginlikte geçmiş örnekleri arka arkaya sıralama ihtimaliniz yükselebilir. Konuşmayı bugünkü tek olayla sınırlayın.",
                        "In a tense moment you may be more likely to stack up past examples. Keep the conversation to today's single incident."));
        putCautions(LifeArea.COMMUNICATION,
                of("REQUEST_CLARIFICATION_BEFORE_REACTING", "assumed_meaning", WORD,
                        "Eksik bir mesajı tamamlanmış gibi okuma ihtimaliniz artabilir. Cevap yazmadan önce eksik olan bilgiyi sorun.",
                        "You may be more likely to read an incomplete message as complete. Ask for the missing piece before replying."),
                of("SET_A_CONCRETE_DATE", "vague_date_slips", DRIVE,
                        "Konuşulan bir tarihin belirsiz kalması ihtimali yükselebilir. Net günü aynı konuşmada teyit edin.",
                        "A discussed date is more likely to stay vague. Confirm the exact day in the same conversation."));
        putCautions(LifeArea.WORK,
                of("AUDIT_EXISTING_COMMITMENT", "scope_creep_unnoticed", LIMIT,
                        "Üstlendiğiniz bir işin kapsamının fark edilmeden büyümesi ihtimali artabilir. Bugün beklenen sonucu yazılı olarak teyit edin.",
                        "The scope of something you took on is more likely to grow unnoticed. Confirm the expected outcome in writing today."),
                of("RESIST_URGENCY_PRESSURE", "instant_yes_pressure", DRIVE,
                        "Hemen cevap verme baskısı artabilir. Süre isteyip ne zaman döneceğinizi söylemek daha güvenli olur.",
                        "Pressure to answer immediately may increase. Asking for time and naming when you will reply is safer."));
        putCautions(LifeArea.MONEY,
                of("READ_THE_FINE_PRINT", "terms_skipped", WORD,
                        "Bir ödeme veya abonelik koşulunun ayrıntısını atlama ihtimaliniz yükselebilir. İptal ve yenileme maddesini okuyun.",
                        "You may be more likely to skip the detail of a payment or subscription term. Read the cancellation and renewal clause."),
                of("RESIST_URGENCY_PRESSURE", "urgency_inflated", SCOPE,
                        "Aciliyet hissi gerçek aciliyetten büyük görünebilir. Teklifin yarın da geçerli olup olmadığını sorun.",
                        "A sense of urgency may look larger than it is. Ask whether the offer still stands tomorrow."));
        putCautions(LifeArea.FAMILY,
                of("DONT_MEDIATE_FOR_OTHERS", "middle_role", BOND,
                        "İki kişi arasında aracı konumuna geçme ihtimaliniz artabilir. Mesaj taşımak yerine doğrudan konuşmalarını önerin.",
                        "You may be more likely to end up as the go-between. Suggest they speak directly instead of carrying messages."),
                of("INTERRUPT_RECURRING_PATTERN", "old_pattern_repeat", LIMIT,
                        "Tekrarlayan bir konunun aynı noktaya gelmesi ihtimali yükselebilir. Aynı cevabı vermeden önce ne değiştiğini sorun.",
                        "A recurring topic is more likely to circle back to the same point. Ask what has changed before repeating your usual answer."));
        putCautions(LifeArea.SOCIAL,
                of("READ_FULL_CONTEXT_BEFORE_REPLYING", "partial_context_reply", WORD,
                        "Grup içinde eksik bağlamla cevap verme ihtimaliniz artabilir. Yazmadan önce konuşmanın tamamını okuyun.",
                        "You may be more likely to reply in a group with partial context. Read the whole thread before writing."),
                of("DONT_PERSONALISE_SILENCE", "silence_personalised", BOND,
                        "Gelmeyen bir cevabı kişisel okuma eğiliminiz güçlenebilir. En son ne konuşulduğuna tekrar bakın.",
                        "You may be more likely to take an absent reply personally. Look back at what was last said."));
        putCautions(LifeArea.BOUNDARIES,
                of("REVIEW_AUTOMATIC_AGREEMENT", "automatic_yes", DRIVE,
                        "Düşünmeden onaylama ihtimaliniz artabilir. Cevap vermeden önce mevcut sözlerinizi hatırlayın.",
                        "You may be more likely to agree before thinking. Recall what you have already committed to before answering."),
                of("RESTATE_DECISION_WITHOUT_JUSTIFYING", "no_gets_renegotiated", LIMIT,
                        "Verdiğiniz bir kararın yeniden tartışmaya açılması ihtimali yükselebilir. Gerekçe eklemek yerine kararı aynen tekrar edin.",
                        "A decision you gave is more likely to be reopened. Repeat it as-is rather than adding justification."));
        putCautions(LifeArea.EMOTIONAL_BALANCE,
                of("SEPARATE_PAST_FROM_PRESENT", "old_feeling_merges", BOND,
                        "Eski bir duygunun bugünkü olayla karışması ihtimali artabilir. İkisini ayrı ayrı yazmak ayırt etmenizi kolaylaştırır.",
                        "An old feeling is more likely to merge with today's event. Writing them separately makes them easier to tell apart."),
                of("DELAY_REACTIVE_MESSAGE", "reactive_send", DRIVE,
                        "Yoğunluk anında yazılan bir mesajın gönderilmesi ihtimali yükselebilir. Taslakta bırakıp akşam yeniden okuyun.",
                        "A message written in an intense moment is more likely to get sent. Leave it in drafts and reread it in the evening."));
        putCautions(LifeArea.DECISION,
                of("IDENTIFY_THE_MISSING_FACT", "missing_fact_ignored", WORD,
                        "Elinizde olmayan bir bilgiyi görmezden gelme ihtimaliniz artabilir. Karardan önce eksik olanı adlandırın.",
                        "You may be more likely to overlook a fact you do not have. Name the missing piece before deciding."),
                of("DONT_DECIDE_TO_END_DISCOMFORT", "decide_to_relieve", SCOPE,
                        "Belirsizlikten kurtulmak için erken karar verme eğilimi güçlenebilir. Beklemenin maliyetini yazmak bunu dengeler.",
                        "The pull to decide early just to end uncertainty may strengthen. Writing down the cost of waiting balances it."));
        putCautions(LifeArea.REST,
                of("NOTICE_FATIGUE_SIGNAL", "signal_overridden", LIMIT,
                        "Yorgunluk sinyalini erteleme ihtimaliniz artabilir. Molanın saatini önceden belirlemek bunu azaltır.",
                        "You may be more likely to override a tiredness signal. Fixing the break time in advance reduces that."),
                of("DONT_REFILL_FREED_TIME", "gap_refilled", SCOPE,
                        "Açılan zamanı hemen doldurma eğilimi güçlenebilir. Bir aralığı bilinçli olarak boş bırakın.",
                        "The pull to refill freed-up time may strengthen. Deliberately leave one gap empty."));
        putCautions(LifeArea.CREATIVITY,
                of("DISCOUNT_EARLY_FEEDBACK", "early_feedback_overweighted", BOND,
                        "Erken bir yoruma fazla ağırlık verme ihtimaliniz artabilir. Yorumu tek bir somut noktaya indirgeyin.",
                        "You may be more likely to over-weight early feedback. Reduce the comment to one concrete point."),
                of("STRUCTURE_BEFORE_DETAIL", "detail_over_structure", LIMIT,
                        "Ana hat yerine ayrıntıya odaklanma ihtimali yükselebilir. Önce yapının doğru olup olmadığını kontrol edin.",
                        "Focusing on detail instead of structure becomes more likely. Check whether the structure is right first."));
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
