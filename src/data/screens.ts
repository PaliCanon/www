import type { ImageMetadata } from 'astro';
import searchLight from '../assets/screens/search/light.jpg';
import searchFrench from '../assets/screens/search/french.jpg';
import searchHome from '../assets/screens/search/home.jpg';
import searchResults from '../assets/screens/search/results.jpg';
import searchWords from '../assets/screens/search/words.jpg';
import appGraph from '../assets/screens/tipitaka/concept-graph.jpg';
import appMain from '../assets/screens/tipitaka/main.jpg';
import appNotes from '../assets/screens/tipitaka/notes.jpg';
import appReader from '../assets/screens/tipitaka/reader.jpg';
import appSearch from '../assets/screens/tipitaka/search.jpg';
import vizCluster from '../assets/screens/viz/cluster.jpg';
import vizMeaning from '../assets/screens/viz/meaning.jpg';
import vizParallels from '../assets/screens/viz/parallels.jpg';
import vizPhone from '../assets/screens/viz/phone.jpg';
import learnHome from '../assets/screens/learn/home.jpg';
import learnTerms from '../assets/screens/learn/terms.jpg';
import learnMeaning from '../assets/screens/learn/meaning.jpg';
import learnAnswer from '../assets/screens/learn/answer.jpg';
import learnRecall from '../assets/screens/learn/recall.jpg';
import type { Lang } from '../lib/languages';

/**
 * The screenshots of the services that have them, in the order of their
 * captions, and the slider's own words. Team-owned data, not the author's
 * copy. Search v0.1.16, Map v0.2.10 and Learn v0.1.26 were captured from
 * their production sites on 2026-11-15, at 390 × 844 CSS pixels / 2×.
 * Learn uses a separate browser profile and real cards, with no fabricated
 * progress. Dark is the primary theme; Search also shows its light theme.
 * Tipiṭaka's original images remain from search-front 6d370b4's Support page
 * (`app/public/support/` and the AppBlock alts in `content_{en,fr,vi}.rs`).
 */
export type ScreensProject = 'search' | 'tipitaka' | 'viz' | 'learn';

export const SCREENS: Record<ScreensProject, ImageMetadata[]> = {
  search: [searchHome, searchResults, searchWords, searchFrench, searchLight],
  tipitaka: [appMain, appReader, appSearch, appGraph, appNotes],
  viz: [vizParallels, vizMeaning, vizCluster, vizPhone],
  learn: [learnHome, learnTerms, learnMeaning, learnAnswer, learnRecall],
};

export const CAPTIONS: Record<ScreensProject, Record<Lang, string[]>> = {
  learn: {
    en: [
      'The home of Learn Pāli',
      'Adding new terms to the deck',
      'A card asking the meaning of a Pāli word',
      'The answer, with a line from a sutta',
      'A sutta line with a word to find',
    ],
    fr: [
      'L’accueil d’Apprendre le pāli',
      'L’ajout de nouveaux termes au jeu',
      'Une carte qui demande le sens d’un mot pāli',
      'La réponse, avec une ligne d’un sutta',
      'Une ligne de sutta dont il faut retrouver un mot',
    ],
    vi: [
      'Trang chủ của phần học tiếng Pāli',
      'Thêm từ mới vào bộ thẻ',
      'Một thẻ hỏi nghĩa của một từ Pāli',
      'Đáp án, kèm một dòng kinh',
      'Một dòng kinh có từ cần tìm',
    ],
  },
  search: {
    en: [
      "The search's home",
      'Results for a question',
      'Results by exact words',
      'A search in French',
      'The light theme',
    ],
    fr: [
      'L’accueil de la recherche',
      'Résultats pour une question',
      'Résultats par mots exacts',
      'Une recherche en français',
      'Le thème clair',
    ],
    vi: [
      'Trang chủ của công cụ tìm kiếm',
      'Kết quả cho một câu hỏi',
      'Kết quả theo từ chính xác',
      'Một lượt tìm bằng tiếng Pháp',
      'Giao diện sáng',
    ],
  },
  tipitaka: {
    en: [
      'Home screen of the Tipiṭaka app',
      'Reading a sutta, Pāli and translation side by side',
      'Searching the Canon by word or by meaning',
      'Concept graph linking related passages',
      'Taking notes on a passage',
    ],
    fr: [
      'Écran d’accueil de l’application Tipiṭaka',
      'Lecture d’un sutta, pali et traduction côte à côte',
      'Recherche dans le Canon par mot ou par sens',
      'Graphe de concepts reliant les passages proches',
      'Prise de notes sur un passage',
    ],
    vi: [
      'Màn hình chính của ứng dụng Tipiṭaka',
      'Đọc một bài kinh, Pāli và bản dịch song song',
      'Tìm kiếm trong Tam Tạng theo từ hoặc theo ý nghĩa',
      'Sơ đồ khái niệm liên kết các đoạn kinh liên quan',
      'Ghi chú trên một đoạn kinh',
    ],
  },
  viz: {
    en: [
      'The parallels view, after SuttaCentral',
      'The meaning view, by embeddings',
      'A sutta and its parallel passages',
      'The collections and the similarity threshold',
    ],
    fr: [
      'La vue des parallèles, d’après SuttaCentral',
      'La vue par le sens, par embeddings',
      'Un sutta et ses passages parallèles',
      'Les collections et le seuil de similarité',
    ],
    vi: [
      'Cách nhìn theo kinh tương đương, theo SuttaCentral',
      'Cách nhìn theo ý nghĩa, bằng embeddings',
      'Một bài kinh và các đoạn kinh tương đương',
      'Các bộ kinh và ngưỡng tương đồng',
    ],
  },
};

/** The slider's words: the name of its region, its two buttons. */
export const SLIDER_WORDS: Record<Lang, { region: string; previous: string; next: string }> = {
  en: { region: 'Screenshots', previous: 'Previous screenshot', next: 'Next screenshot' },
  fr: { region: "Captures d'écran", previous: 'Capture précédente', next: 'Capture suivante' },
  vi: { region: 'Ảnh chụp màn hình', previous: 'Ảnh trước', next: 'Ảnh tiếp theo' },
};
