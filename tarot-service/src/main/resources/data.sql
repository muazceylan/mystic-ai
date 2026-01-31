-- ===========================================
-- Mystic AI - Tarot Cards (78 Cards)
-- Major Arcana (22) + Minor Arcana (56)
-- ===========================================

-- ==========================================
-- MAJOR ARCANA (22 Cards)
-- ==========================================
INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('The Fool', 'MAJOR', NULL, 0, 'New beginnings, innocence, spontaneity, free spirit', 'Recklessness, risk-taking, foolishness, naivety')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('The Magician', 'MAJOR', NULL, 1, 'Manifestation, resourcefulness, power, inspired action', 'Manipulation, poor planning, untapped talents, deception')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('The High Priestess', 'MAJOR', NULL, 2, 'Intuition, mystery, inner knowledge, divine feminine', 'Secrets, withdrawal, silence, repressed feelings')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('The Empress', 'MAJOR', NULL, 3, 'Femininity, beauty, abundance, nurturing, nature', 'Dependence, smothering, emptiness, creative block')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('The Emperor', 'MAJOR', NULL, 4, 'Authority, structure, control, fatherhood, stability', 'Tyranny, rigidity, coldness, domination')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('The Hierophant', 'MAJOR', NULL, 5, 'Tradition, conformity, spiritual wisdom, institutions', 'Rebellion, subversiveness, new approaches, freedom')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('The Lovers', 'MAJOR', NULL, 6, 'Love, harmony, relationships, choices, alignment', 'Disharmony, imbalance, misalignment, bad choices')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('The Chariot', 'MAJOR', NULL, 7, 'Willpower, determination, success, ambition, control', 'Lack of control, aggression, obstacles, lack of direction')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Strength', 'MAJOR', NULL, 8, 'Courage, patience, inner strength, compassion, influence', 'Self-doubt, weakness, insecurity, low energy')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('The Hermit', 'MAJOR', NULL, 9, 'Soul-searching, introspection, guidance, inner wisdom', 'Isolation, loneliness, withdrawal, lost')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Wheel of Fortune', 'MAJOR', NULL, 10, 'Change, cycles, destiny, turning point, luck', 'Bad luck, resistance to change, breaking cycles')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Justice', 'MAJOR', NULL, 11, 'Fairness, truth, law, cause and effect, clarity', 'Unfairness, dishonesty, lack of accountability')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('The Hanged Man', 'MAJOR', NULL, 12, 'Surrender, letting go, new perspective, sacrifice', 'Stalling, resistance, indecision, delays')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Death', 'MAJOR', NULL, 13, 'Transformation, endings, change, transition, release', 'Resistance to change, fear, stagnation, decay')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Temperance', 'MAJOR', NULL, 14, 'Balance, moderation, patience, purpose, meaning', 'Imbalance, excess, lack of long-term vision')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('The Devil', 'MAJOR', NULL, 15, 'Shadow self, attachment, addiction, materialism', 'Release, breaking free, power reclaimed, detachment')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('The Tower', 'MAJOR', NULL, 16, 'Sudden change, upheaval, revelation, awakening', 'Avoidance, fear of change, delaying the inevitable')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('The Star', 'MAJOR', NULL, 17, 'Hope, faith, renewal, serenity, inspiration', 'Lack of faith, despair, disconnection, discouragement')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('The Moon', 'MAJOR', NULL, 18, 'Illusion, fear, subconscious, intuition, dreams', 'Release of fear, repressed emotions, clarity')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('The Sun', 'MAJOR', NULL, 19, 'Joy, success, vitality, positivity, confidence', 'Negativity, depression, sadness, unrealistic expectations')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Judgement', 'MAJOR', NULL, 20, 'Rebirth, inner calling, absolution, reflection', 'Self-doubt, refusal of self-examination, blame')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('The World', 'MAJOR', NULL, 21, 'Completion, integration, accomplishment, travel', 'Incompletion, lack of closure, emptiness')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- MINOR ARCANA - WANDS (14 Cards)
-- ==========================================
INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Ace of Wands', 'MINOR', 'WANDS', 1, 'Inspiration, new opportunities, growth, potential', 'Delays, lack of motivation, weighed down')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Two of Wands', 'MINOR', 'WANDS', 2, 'Planning, decisions, discovery, future planning', 'Fear of unknown, lack of planning, bad planning')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Three of Wands', 'MINOR', 'WANDS', 3, 'Progress, expansion, foresight, overseas opportunities', 'Obstacles, delays, lack of foresight, frustration')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Four of Wands', 'MINOR', 'WANDS', 4, 'Celebration, harmony, homecoming, relaxation', 'Transition, lack of support, home conflicts')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Five of Wands', 'MINOR', 'WANDS', 5, 'Competition, conflict, tension, diversity', 'Avoiding conflict, inner conflict, peace')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Six of Wands', 'MINOR', 'WANDS', 6, 'Victory, success, recognition, public reward', 'Lack of recognition, delayed success, fall from grace')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Seven of Wands', 'MINOR', 'WANDS', 7, 'Perseverance, defense, maintaining control', 'Giving up, overwhelmed, defensive, exhaustion')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Eight of Wands', 'MINOR', 'WANDS', 8, 'Speed, action, movement, quick decisions', 'Delays, frustration, waiting, slow progress')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Nine of Wands', 'MINOR', 'WANDS', 9, 'Resilience, courage, persistence, boundaries', 'Exhaustion, fatigue, overwhelmed, giving up')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Ten of Wands', 'MINOR', 'WANDS', 10, 'Burden, responsibility, hard work, achievement', 'Inability to delegate, overstressed, burnt out')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Page of Wands', 'MINOR', 'WANDS', 11, 'Exploration, excitement, freedom, discovery', 'Lack of direction, procrastination, hasty decisions')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Knight of Wands', 'MINOR', 'WANDS', 12, 'Energy, passion, adventure, impulsiveness', 'Haste, scattered energy, delays, frustration')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Queen of Wands', 'MINOR', 'WANDS', 13, 'Courage, confidence, independence, warmth', 'Selfishness, jealousy, insecurity, demanding')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('King of Wands', 'MINOR', 'WANDS', 14, 'Leadership, vision, entrepreneur, honor', 'Impulsiveness, haste, ruthless, high expectations')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- MINOR ARCANA - CUPS (14 Cards)
-- ==========================================
INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Ace of Cups', 'MINOR', 'CUPS', 1, 'New love, compassion, creativity, emotional beginning', 'Blocked emotions, emptiness, emotional loss')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Two of Cups', 'MINOR', 'CUPS', 2, 'Partnership, unity, attraction, connection', 'Disharmony, distrust, imbalance, tension')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Three of Cups', 'MINOR', 'CUPS', 3, 'Celebration, friendship, community, creativity', 'Overindulgence, gossip, isolation, excess')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Four of Cups', 'MINOR', 'CUPS', 4, 'Apathy, contemplation, disconnection, meditation', 'Awareness, acceptance, moving on, motivation')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Five of Cups', 'MINOR', 'CUPS', 5, 'Loss, grief, disappointment, regret', 'Acceptance, moving on, finding peace, forgiveness')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Six of Cups', 'MINOR', 'CUPS', 6, 'Nostalgia, memories, innocence, reunion', 'Stuck in the past, unrealistic, naivety')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Seven of Cups', 'MINOR', 'CUPS', 7, 'Fantasy, illusion, choices, wishful thinking', 'Clarity, reality check, overwhelmed, confusion')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Eight of Cups', 'MINOR', 'CUPS', 8, 'Walking away, disillusionment, leaving behind', 'Fear of change, stagnation, avoidance, fear')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Nine of Cups', 'MINOR', 'CUPS', 9, 'Contentment, satisfaction, gratitude, wish fulfilled', 'Dissatisfaction, greed, materialism, shallowness')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Ten of Cups', 'MINOR', 'CUPS', 10, 'Harmony, family, fulfillment, happiness, alignment', 'Broken home, family conflict, disharmony')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Page of Cups', 'MINOR', 'CUPS', 11, 'Creativity, intuition, new feelings, dreamer', 'Emotional immaturity, creative block, insecurity')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Knight of Cups', 'MINOR', 'CUPS', 12, 'Romance, charm, imagination, beauty', 'Moodiness, jealousy, unrealistic, overemotional')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Queen of Cups', 'MINOR', 'CUPS', 13, 'Compassion, calm, comfort, intuitive, loving', 'Insecurity, dependency, martyrdom, codependency')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('King of Cups', 'MINOR', 'CUPS', 14, 'Emotional balance, diplomacy, compassion, wisdom', 'Moodiness, manipulation, coldness, selfishness')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- MINOR ARCANA - SWORDS (14 Cards)
-- ==========================================
INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Ace of Swords', 'MINOR', 'SWORDS', 1, 'Clarity, truth, breakthrough, new ideas', 'Confusion, chaos, lack of clarity, misinformation')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Two of Swords', 'MINOR', 'SWORDS', 2, 'Stalemate, difficult choices, denial, blocked emotions', 'Indecision, confusion, information overload')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Three of Swords', 'MINOR', 'SWORDS', 3, 'Heartbreak, sorrow, grief, separation', 'Recovery, forgiveness, moving on, healing')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Four of Swords', 'MINOR', 'SWORDS', 4, 'Rest, restoration, contemplation, recuperation', 'Restlessness, burnout, stagnation, exhaustion')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Five of Swords', 'MINOR', 'SWORDS', 5, 'Conflict, disagreements, competition, defeat', 'Reconciliation, making amends, past resentment')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Six of Swords', 'MINOR', 'SWORDS', 6, 'Transition, change, rite of passage, moving on', 'Resistance, unfinished business, stagnation')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Seven of Swords', 'MINOR', 'SWORDS', 7, 'Deception, strategy, resourcefulness, stealth', 'Coming clean, confession, conscience, regret')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Eight of Swords', 'MINOR', 'SWORDS', 8, 'Restriction, imprisonment, powerlessness, victim', 'Freedom, release, new perspective, taking control')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Nine of Swords', 'MINOR', 'SWORDS', 9, 'Anxiety, worry, fear, nightmares, despair', 'Hope, recovery, facing fears, releasing worry')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Ten of Swords', 'MINOR', 'SWORDS', 10, 'Betrayal, endings, crisis, rock bottom', 'Recovery, regeneration, fear of ruin, survival')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Page of Swords', 'MINOR', 'SWORDS', 11, 'Curiosity, new ideas, thirst for knowledge', 'Deception, manipulation, all talk, scattered')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Knight of Swords', 'MINOR', 'SWORDS', 12, 'Ambitious, action-oriented, driven, fast thinking', 'Restless, unfocused, burnout, impulsive')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Queen of Swords', 'MINOR', 'SWORDS', 13, 'Independent, perceptive, clear thinker, direct', 'Cold, cruel, bitterness, pessimistic')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('King of Swords', 'MINOR', 'SWORDS', 14, 'Mental clarity, authority, truth, integrity', 'Manipulation, cruelty, oppression, tyranny')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- MINOR ARCANA - PENTACLES (14 Cards)
-- ==========================================
INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Ace of Pentacles', 'MINOR', 'PENTACLES', 1, 'New financial opportunity, manifestation, prosperity', 'Lost opportunity, lack of planning, scarcity')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Two of Pentacles', 'MINOR', 'PENTACLES', 2, 'Balance, adaptability, time management, priorities', 'Imbalance, disorganization, overwhelmed')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Three of Pentacles', 'MINOR', 'PENTACLES', 3, 'Teamwork, collaboration, learning, implementation', 'Lack of teamwork, disregard for skills, conflict')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Four of Pentacles', 'MINOR', 'PENTACLES', 4, 'Security, conservation, frugality, control', 'Greed, materialism, self-protection, hoarding')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Five of Pentacles', 'MINOR', 'PENTACLES', 5, 'Hardship, poverty, isolation, worry, insecurity', 'Recovery, charity, improvement, positive changes')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Six of Pentacles', 'MINOR', 'PENTACLES', 6, 'Generosity, charity, sharing wealth, prosperity', 'Debt, selfishness, one-sided charity, strings attached')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Seven of Pentacles', 'MINOR', 'PENTACLES', 7, 'Long-term view, perseverance, investment, patience', 'Lack of growth, impatience, bad investment')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Eight of Pentacles', 'MINOR', 'PENTACLES', 8, 'Apprenticeship, education, quality, mastery', 'Perfectionism, lack of ambition, uninspired')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Nine of Pentacles', 'MINOR', 'PENTACLES', 9, 'Abundance, luxury, self-sufficiency, independence', 'Financial setbacks, over-investment in work')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Ten of Pentacles', 'MINOR', 'PENTACLES', 10, 'Wealth, inheritance, family, legacy, establishment', 'Financial failure, loneliness, family disputes')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Page of Pentacles', 'MINOR', 'PENTACLES', 11, 'Ambition, desire, diligence, new venture', 'Lack of progress, procrastination, laziness')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Knight of Pentacles', 'MINOR', 'PENTACLES', 12, 'Efficiency, routine, conservatism, methodical', 'Boredom, laziness, feeling stuck, perfectionism')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('Queen of Pentacles', 'MINOR', 'PENTACLES', 13, 'Nurturing, practical, financial security, homebody', 'Self-centeredness, jealousy, insecurity, smothering')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tarot_cards (name, arcana, suit, card_number, upright_keywords, reversed_keywords) VALUES
('King of Pentacles', 'MINOR', 'PENTACLES', 14, 'Abundance, prosperity, security, leadership', 'Greed, materialism, wastefulness, stubborn')
ON CONFLICT (name) DO NOTHING;
