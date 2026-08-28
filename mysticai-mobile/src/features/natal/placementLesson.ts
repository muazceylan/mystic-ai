import {
  getHouseGlossary,
  getPlanetGlossary,
  getSignGlossary,
} from '../../constants/astrology-glossary';
import type { PlacementLesson } from './types';
import type { NatalChartContext } from './types';

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

/**
 * Builds the "how do you read a placement?" lesson from the reader's own chart.
 *
 * The teaching model is fixed — planet = what, sign = how, house = where in life — and the lesson
 * always uses a real placement rather than a textbook example. The Moon is chosen by default
 * because emotional patterns are the easiest thing for a beginner to recognise in themselves,
 * which makes the synthesis land instead of reading as trivia.
 *
 * Returns null when there is nothing to teach with, so the caller hides the section rather than
 * rendering a lesson with blanks in it.
 */
export function buildMoonLesson(
  context: NatalChartContext | null | undefined,
  locale: string,
  t: TranslateFn,
): PlacementLesson | null {
  if (!context) return null;
  const moon = context.moon ?? (context.planets ?? []).find((p) => p.planet === 'Moon');
  if (!moon) return null;

  return buildLessonForPlanet(context, moon.planet, locale, t);
}

export function buildLessonForPlanet(
  context: NatalChartContext | null | undefined,
  planetName: string,
  locale: string,
  t: TranslateFn,
): PlacementLesson | null {
  if (!context) return null;
  const planet = (context.planets ?? []).find((p) => p.planet === planetName);
  if (!planet) return null;

  const planetGlossary = getPlanetGlossary(planet.planet, locale);
  const signGlossary = getSignGlossary(planet.sign, locale);
  // Houses only exist as a real fact when the birth time is known.
  const houseGlossary =
    context.birthTimeKnown && planet.house ? getHouseGlossary(planet.house, locale) : undefined;

  if (!planetGlossary || !signGlossary) return null;

  const planetLabel = planetGlossary.term;
  const signLabel = signGlossary.term;
  const houseLabel = planet.house ? t('natalPortrait.houseLabel', { number: planet.house }) : null;

  return {
    planetName: planetLabel,
    planetMeaning: planetGlossary.shortDesc,
    signName: signLabel,
    signMeaning: signGlossary.shortDesc,
    houseName: houseGlossary ? houseLabel : null,
    houseMeaning: houseGlossary ? houseGlossary.shortDesc : null,
    synthesis: buildSynthesis({
      planetLabel,
      planetMeaning: planetGlossary.shortDesc,
      signLabel,
      signMeaning: signGlossary.shortDesc,
      houseLabel,
      houseMeaning: houseGlossary?.shortDesc ?? null,
      t,
    }),
  };
}

/**
 * Joins the three parts into a single statement about the reader.
 *
 * This is the payoff of the card. Stacking three definitions teaches nothing; naming what the
 * combination produces is the skill being taught, so the sentence is assembled from the actual
 * placement rather than pulled from a lookup table of pre-written combinations.
 */
function buildSynthesis(input: {
  planetLabel: string;
  planetMeaning: string;
  signLabel: string;
  signMeaning: string;
  houseLabel: string | null;
  houseMeaning: string | null;
  t: TranslateFn;
}): string {
  const { planetLabel, planetMeaning, signLabel, signMeaning, houseLabel, houseMeaning, t } = input;

  if (houseLabel && houseMeaning) {
    return t('natalPortrait.learnSynthesisWithHouse', {
      planet: planetLabel,
      planetMeaning: lowerFirst(planetMeaning),
      sign: signLabel,
      signMeaning: lowerFirst(signMeaning),
      house: houseLabel,
      houseMeaning: lowerFirst(houseMeaning),
    });
  }

  return t('natalPortrait.learnSynthesisNoHouse', {
    planet: planetLabel,
    planetMeaning: lowerFirst(planetMeaning),
    sign: signLabel,
    signMeaning: lowerFirst(signMeaning),
  });
}

function lowerFirst(value: string): string {
  if (!value) return '';
  return value.charAt(0).toLocaleLowerCase() + value.slice(1);
}
