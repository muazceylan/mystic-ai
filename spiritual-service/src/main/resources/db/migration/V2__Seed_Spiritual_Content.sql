INSERT INTO prayers (
    slug, title, category, source_label, source_note, arabic_text, transliteration_tr, meaning_tr,
    recommended_repeat_count, estimated_read_seconds, is_favoritable, disclaimer_text, difficulty_level, active
) VALUES
    (
        'sabah-huzur-kisa-01',
        'Sabah Huzur Duasi (Kisa)',
        'SABAH_AKSAM',
        'GELENEKSEL',
        'Kaynak notu: Placeholder icerik; uretim oncesi editoryal dogrulama gerekir.',
        '<ARAPCA_METIN_PLACEHOLDER>',
        '<TURKCE_OKUNUS_PLACEHOLDER>',
        '<TURKCE_MEAL_PLACEHOLDER>',
        33,
        25,
        TRUE,
        'Bu icerik bilgilendirme amaclidir.',
        1,
        TRUE
    ),
    (
        'sukur-kisa-01',
        'Sukur Duasi (Kisa)',
        'SUKUR',
        'GELENEKSEL',
        'Kaynak notu: Placeholder icerik.',
        '<ARAPCA_METIN_PLACEHOLDER>',
        '<TURKCE_OKUNUS_PLACEHOLDER>',
        '<TURKCE_MEAL_PLACEHOLDER>',
        7,
        20,
        TRUE,
        'Bu icerik bilgilendirme amaclidir.',
        1,
        TRUE
    ),
    (
        'korunma-orta-01',
        'Korunma Duasi (Orta)',
        'KORUNMA',
        'GELENEKSEL',
        'Kaynak notu: Placeholder icerik.',
        '<ARAPCA_METIN_PLACEHOLDER>',
        '<TURKCE_OKUNUS_PLACEHOLDER>',
        '<TURKCE_MEAL_PLACEHOLDER>',
        3,
        55,
        TRUE,
        'Bu icerik bilgilendirme amaclidir.',
        2,
        TRUE
    ),
    (
        'huzur-kisa-01',
        'Huzur Duasi (Kisa)',
        'HUZUR',
        'GELENEKSEL',
        'Kaynak notu: Placeholder icerik.',
        '<ARAPCA_METIN_PLACEHOLDER>',
        '<TURKCE_OKUNUS_PLACEHOLDER>',
        '<TURKCE_MEAL_PLACEHOLDER>',
        11,
        18,
        TRUE,
        'Bu icerik bilgilendirme amaclidir.',
        1,
        TRUE
    ),
    (
        'bereket-orta-01',
        'Bereket Duasi (Orta)',
        'BEREKET',
        'GELENEKSEL',
        'Kaynak notu: Placeholder icerik.',
        '<ARAPCA_METIN_PLACEHOLDER>',
        '<TURKCE_OKUNUS_PLACEHOLDER>',
        '<TURKCE_MEAL_PLACEHOLDER>',
        3,
        60,
        TRUE,
        'Bu icerik bilgilendirme amaclidir.',
        2,
        TRUE
    )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO asmaul_husna (
    order_no, arabic_name, transliteration_tr, meaning_tr, reflection_text_tr, theme, source_note, recommended_dhikr_count, active
) VALUES
    (
        1,
        '<ARAPCA_ESMA_PLACEHOLDER>',
        '<ESMA_OKUNUS_PLACEHOLDER>',
        '<KISA_ANLAM_PLACEHOLDER>',
        '<TEFEKKUR_NIYET_CUMLESI_PLACEHOLDER>',
        'RAHMET',
        'Kaynak notu: Placeholder icerik; yayina almadan once editoryal onay gereklidir.',
        33,
        TRUE
    )
ON CONFLICT (order_no) DO NOTHING;

INSERT INTO meditation_exercises (
    slug, title, type, focus_theme, duration_sec, steps_json, breathing_pattern_json, animation_mode,
    background_audio_enabled_by_default, disclaimer_text, difficulty_level, active
) VALUES
    (
        'box-breathing-4-4-4-4-2min',
        'Kutusal Nefes 4-4-4-4',
        'BREATHING',
        'SAKINLESME',
        120,
        '[{"order":1,"text":"Dik otur, omuzlarini gevset."},{"order":2,"text":"4 sn nefes al."},{"order":3,"text":"4 sn tut."},{"order":4,"text":"4 sn ver."},{"order":5,"text":"4 sn bekle."}]',
        '{"inhale":4,"hold1":4,"exhale":4,"hold2":4}',
        'BOX',
        FALSE,
        'Bu egzersiz nefes ve farkindalik amaclidir; tibbi tavsiye degildir.',
        1,
        TRUE
    )
ON CONFLICT (slug) DO NOTHING;

